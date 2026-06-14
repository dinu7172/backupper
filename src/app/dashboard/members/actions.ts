'use server';

import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import OrgMembership from '@/models/OrgMembership';
import Invitation from '@/models/Invitation';
import User from '@/models/User';
import Project from '@/models/Project';
import Server from '@/models/Server';
import Credential from '@/models/Credential';
import { z } from 'zod';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Validation Schemas
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'developer', 'operator', 'viewer']),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
  timezone: z.string().default('UTC'),
  notifyOnBackupFail: z.boolean().default(true),
  notifyOnBackupSuccess: z.boolean().default(false),
});

const updateOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
});

const updateProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  environment: z.enum(['production', 'staging', 'development']),
});

// Helper check
async function getMembership(orgId: string, userId: string) {
  const membership = await OrgMembership.findOne({ orgId, userId });
  if (!membership) throw new Error('You are not a member of this organization.');
  return membership;
}

/**
 * Fetches all organizations the current user belongs to.
 * Used for the workspace selector dropdown in the sidebar.
 */
export async function getUserOrganizations() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // Find all memberships for this user
    const memberships = await OrgMembership.find({ userId: session.user.id });
    const orgIds = memberships.map((m) => m.orgId);

    // Fetch details of those organizations
    const orgs = await Organization.find({ _id: { $in: orgIds } }).sort({ name: 1 });

    return {
      success: true,
      organizations: orgs.map((org) => {
        const mem = memberships.find((m) => m.orgId.toString() === org._id.toString());
        return {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          role: mem ? mem.role : 'viewer',
        };
      }),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch organizations' };
  }
}

/**
 * Gets members and pending invites for the active organization.
 */
export async function getOrgMembers() {
  try {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // 1. Fetch active memberships
    const memberships = await OrgMembership.find({ orgId: session.user.activeOrgId });
    const userIds = memberships.map((m) => m.userId);

    const users = await User.find({ _id: { $in: userIds } });

    const activeMembers = memberships.map((m) => {
      const u = users.find((usr) => usr._id.toString() === m.userId.toString());
      return {
        membershipId: m._id.toString(),
        userId: m.userId.toString(),
        name: u ? u.name : 'Unknown User',
        email: u ? u.email : 'unknown@domain.com',
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      };
    });

    // 2. Fetch pending invites
    const pendingInvites = await Invitation.find({
      orgId: session.user.activeOrgId,
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
    });

    const invites = pendingInvites.map((i) => ({
      id: i._id.toString(),
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    }));

    return {
      success: true,
      members: activeMembers,
      invitations: invites,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch organization members' };
  }
}

/**
 * Invites a user to the active organization by email.
 */
export async function inviteUser(data: z.infer<typeof inviteUserSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = inviteUserSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();

    // Verify inviter has permissions
    const membership = await getMembership(session.user.activeOrgId, session.user.id);
    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions. Only Owner and Admin can invite.' };
    }

    // Check if target is already a member
    const targetUser = await User.findOne({ email: validation.data.email.toLowerCase() });
    if (targetUser) {
      const existingMem = await OrgMembership.findOne({
        orgId: session.user.activeOrgId,
        userId: targetUser._id,
      });
      if (existingMem) {
        return { success: false, error: 'User is already a member of this organization.' };
      }
    }

    // Check for existing pending invitation
    const existingInvite = await Invitation.findOne({
      orgId: session.user.activeOrgId,
      email: validation.data.email.toLowerCase(),
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return { success: false, error: 'A pending invitation already exists for this email.' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Create invitation (7 days expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Invitation.create({
      orgId: session.user.activeOrgId,
      email: validation.data.email.toLowerCase(),
      role: validation.data.role,
      tokenHash,
      expiresAt,
      invitedBy: session.user.id,
    });

    // In a fully developed application, we would email this link
    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/accept?token=${token}`;
    console.log(`✉️ Simulated SMTP Email sent to ${validation.data.email}. Invite Link: ${inviteLink}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send invitation' };
  }
}

/**
 * Removes a member or invitation from the active organization.
 */
export async function removeMember(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // Verify requester has permissions
    const membership = await getMembership(session.user.activeOrgId, session.user.id);
    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions.' };
    }

    // Fetch member to delete
    const targetMembership = await OrgMembership.findOne({
      orgId: session.user.activeOrgId,
      userId,
    });

    if (!targetMembership) {
      return { success: false, error: 'Member not found.' };
    }

    // Prevent removing the owner
    if (targetMembership.role === 'owner') {
      return { success: false, error: 'Cannot remove the organization Owner.' };
    }

    // Prevent removing self if not owner
    if (userId === session.user.id) {
      return { success: false, error: 'You cannot remove yourself. Use Leave Organization settings.' };
    }

    await OrgMembership.deleteOne({ _id: targetMembership._id });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove member' };
  }
}

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation(inviteId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const membership = await getMembership(session.user.activeOrgId, session.user.id);
    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions.' };
    }

    await Invitation.deleteOne({ _id: inviteId, orgId: session.user.activeOrgId });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke invitation' };
  }
}

/**
 * Updates organization settings (name, slug).
 */
export async function updateOrganizationAction(data: z.infer<typeof updateOrgSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = updateOrgSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();

    // Verify Owner role
    const membership = await getMembership(session.user.activeOrgId, session.user.id);
    if (membership.role !== 'owner') {
      return { success: false, error: 'Only the organization Owner can modify settings.' };
    }

    // Check slug uniqueness if changed
    const currentOrg = await Organization.findById(session.user.activeOrgId);
    if (!currentOrg) return { success: false, error: 'Organization not found' };

    if (validation.data.slug !== currentOrg.slug) {
      const existing = await Organization.findOne({ slug: validation.data.slug });
      if (existing) {
        return { success: false, error: 'This URL slug is already taken by another organization' };
      }
    }

    currentOrg.name = validation.data.name;
    currentOrg.slug = validation.data.slug;
    await currentOrg.save();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update organization' };
  }
}

/**
 * Deletes organization (and all nested projects/servers/credentials/memberships).
 */
export async function deleteOrganizationAction() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // Only owner can delete org
    const membership = await getMembership(session.user.activeOrgId, session.user.id);
    if (membership.role !== 'owner') {
      return { success: false, error: 'Only the organization Owner can delete it.' };
    }

    const orgId = session.user.activeOrgId;

    // Delete nested records
    await Promise.all([
      OrgMembership.deleteMany({ orgId }),
      Invitation.deleteMany({ orgId }),
      Project.deleteMany({ orgId }),
      Server.deleteMany({ orgId }),
      Credential.deleteMany({ orgId }),
      Organization.deleteOne({ _id: orgId }),
    ]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete organization' };
  }
}

/**
 * Fetches user profile settings.
 */
export async function getUserProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) return { success: false, error: 'User not found' };

    return {
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        timezone: user.preferences?.timezone || 'UTC',
        notifyOnBackupFail: user.preferences?.notifyOnBackupFail !== false,
        notifyOnBackupSuccess: user.preferences?.notifyOnBackupSuccess === true,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve profile' };
  }
}

/**
 * Updates user profile and notification preferences.
 */
export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = updateProfileSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();

    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        name: validation.data.name,
        'preferences.timezone': validation.data.timezone,
        'preferences.notifyOnBackupFail': validation.data.notifyOnBackupFail,
        'preferences.notifyOnBackupSuccess': validation.data.notifyOnBackupSuccess,
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

/**
 * Updates project settings.
 */
export async function updateProject(projectId: string, data: z.infer<typeof updateProjectSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = updateProjectSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();

    const membership = await getMembership(session.user.activeOrgId, session.user.id);
    if (!['owner', 'admin', 'developer'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Verify slug uniqueness
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: session.user.activeOrgId,
    });
    if (!project) return { success: false, error: 'Project not found' };

    if (validation.data.slug !== project.slug) {
      const existing = await Project.findOne({
        orgId: session.user.activeOrgId,
        slug: validation.data.slug,
      });
      if (existing) {
        return { success: false, error: 'Project slug already exists in this organization' };
      }
    }

    project.name = validation.data.name;
    project.slug = validation.data.slug;
    project.environment = validation.data.environment;
    await project.save();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update project' };
  }
}

/**
 * Deletes a project.
 */
export async function deleteProject(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const membership = await getMembership(session.user.activeOrgId, session.user.id);
    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Only Owners and Admins can delete projects.' };
    }

    const pId = new mongoose.Types.ObjectId(projectId);

    // Clean up servers and configurations under this project
    await Promise.all([
      Server.deleteMany({ projectId: pId, orgId: session.user.activeOrgId }),
      Project.deleteOne({ _id: pId, orgId: session.user.activeOrgId }),
      // In a full app, delete backup configs/jobs too
    ]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete project' };
  }
}
