'use server';

import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import OrgMembership from '@/models/OrgMembership';
import Invitation from '@/models/Invitation';
import { z } from 'zod';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(64),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
});

export async function createOrganization(formData: { name: string; slug: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = createOrgSchema.safeParse(formData);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const { name, slug } = validation.data;

    await dbConnect();

    // Check if slug is unique
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return { success: false, error: 'An organization with this slug already exists' };
    }

    // Create the organization
    const org = await Organization.create({
      name,
      slug,
      ownerId: session.user.id,
      billingEmail: session.user.email!,
    });

    // Create the membership as Owner
    await OrgMembership.create({
      orgId: org._id,
      userId: session.user.id,
      role: 'owner',
    });

    return { success: true, orgId: org._id.toString() };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal server error' };
  }
}

export async function getPendingInvitations() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: true, invitations: [] };
    }

    await dbConnect();

    const invitations = await Invitation.find({
      email: session.user.email.toLowerCase(),
      acceptedAt: null,
    }).populate({ path: 'orgId', select: 'name slug' });

    return {
      success: true,
      invitations: invitations.map((invite) => ({
        id: invite._id.toString(),
        role: invite.role,
        orgName: (invite.orgId as any).name,
        orgSlug: (invite.orgId as any).slug,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal server error' };
  }
}

export async function acceptInvitation(invitationId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const invite = await Invitation.findById(invitationId);
    if (!invite || invite.acceptedAt || invite.email !== session.user.email.toLowerCase()) {
      return { success: false, error: 'Invitation not found or already accepted' };
    }

    // Double check if membership already exists (to prevent duplicate primary keys)
    const existingMembership = await OrgMembership.findOne({
      orgId: invite.orgId,
      userId: session.user.id,
    });

    if (!existingMembership) {
      // Create membership
      await OrgMembership.create({
        orgId: invite.orgId,
        userId: session.user.id,
        role: invite.role,
      });
    }

    // Mark invitation as accepted
    invite.acceptedAt = new Date();
    invite.acceptedBy = session.user.id as any;
    await invite.save();

    return { success: true, orgId: invite.orgId.toString() };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal server error' };
  }
}
