'use server';

import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Organization from '@/models/Organization';
import OrgMembership from '@/models/OrgMembership';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(64),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  environment: z.enum(['production', 'staging', 'development']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color hex code'),
  description: z.string().max(200).optional(),
});

export async function getProjects() {
  try {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const projects = await Project.find({
      orgId: session.user.activeOrgId,
    }).sort({ 'stats.lastBackupAt': -1, createdAt: -1 });

    return {
      success: true,
      projects: projects.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        description: p.description,
        environment: p.environment,
        color: p.color,
        status: p.status,
        stats: {
          totalBackups: p.stats.totalBackups,
          successfulBackups: p.stats.successfulBackups,
          failedBackups: p.stats.failedBackups,
          totalSizeBytes: p.stats.totalSizeBytes,
          lastBackupAt: p.stats.lastBackupAt ? p.stats.lastBackupAt.toISOString() : null,
          lastSuccessAt: p.stats.lastSuccessAt ? p.stats.lastSuccessAt.toISOString() : null,
        },
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal server error' };
  }
}

export async function getOrgStats() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const org = await Organization.findById(session.user.activeOrgId);
    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    const projectCount = await Project.countDocuments({ orgId: org._id });

    // In a fully developed application, these would query the respective collections
    const serverCount = 0; // Placeholder until server model exists
    const storageUsedBytes = 0; // Placeholder until backup artifacts exist

    return {
      success: true,
      stats: {
        orgName: org.name,
        orgSlug: org.slug,
        plan: org.plan,
        projectCount,
        maxProjects: org.limits.maxProjects,
        serverCount,
        maxServers: org.limits.maxServers,
        storageUsedBytes,
        maxStorageBytes: org.limits.maxStorageGB * 1024 * 1024 * 1024,
        healthScore: 100, // Placeholder health score
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal server error' };
  }
}

export async function createProject(formData: z.infer<typeof createProjectSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = createProjectSchema.safeParse(formData);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();

    // Verify membership role permissions (Owner, Admin, or Developer roles can create projects)
    const membership = await OrgMembership.findOne({
      orgId: session.user.activeOrgId,
      userId: session.user.id,
    });

    if (!membership || !['owner', 'admin', 'developer'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions to create projects' };
    }

    // Verify organization project quota limits
    const org = await Organization.findById(session.user.activeOrgId);
    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    const currentProjectCount = await Project.countDocuments({ orgId: org._id });
    if (currentProjectCount >= org.limits.maxProjects) {
      return {
        success: false,
        error: `Quota exceeded: You have reached the limit of ${org.limits.maxProjects} projects for your ${org.plan} plan. Please upgrade your subscription to create more.`,
      };
    }

    // Verify slug uniqueness within organization
    const existingProject = await Project.findOne({
      orgId: org._id,
      slug: validation.data.slug,
    });
    if (existingProject) {
      return { success: false, error: 'A project with this slug already exists in this organization' };
    }

    // Create the project document
    const project = await Project.create({
      orgId: org._id,
      name: validation.data.name,
      slug: validation.data.slug,
      environment: validation.data.environment,
      color: validation.data.color,
      description: validation.data.description || null,
      createdBy: session.user.id,
    });

    return { success: true, projectId: project._id.toString() };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal server error' };
  }
}
