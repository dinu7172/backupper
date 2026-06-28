'use server';

import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Server from '@/models/Server';
import Credential from '@/models/Credential';
import BackupJob from '@/models/BackupJob';
import OrgMembership from '@/models/OrgMembership';
import { decryptCredential } from '@/lib/vault';
import { listRemoteDirectory, runFileBackupJob } from '@/lib/ssh';
import { z } from 'zod';
import mongoose from 'mongoose';

// Validation Schema for saving Backup Jobs
const saveBackupJobSchema = z.object({
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
  serverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid server ID'),
  sourcePath: z.string().min(1, 'Source folder path is required').max(512),
  destinationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid destination ID'),
  destinationPath: z.string().min(1, 'Destination path is required').max(256),
  schedule: z.enum(['daily', 'weekly', 'monthly']),
});

async function checkWritePermission(orgId: string, userId: string) {
  const membership = await OrgMembership.findOne({ orgId, userId });
  if (!membership || !['owner', 'admin', 'developer'].includes(membership.role)) {
    throw new Error('Insufficient permissions to modify settings.');
  }
  return membership;
}

/**
 * Retrieves all file backup jobs configured for a specific project.
 */
export async function getBackupJobs(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const jobs = await BackupJob.find({
      orgId: session.user.activeOrgId,
      projectId: new mongoose.Types.ObjectId(projectId),
    })
      .sort({ createdAt: -1 })
      .populate('serverId', 'name hostname')
      .populate('destinationId', 'name type')
      .lean();

    return {
      success: true,
      jobs: jobs.map((j: any) => ({
        id: j._id.toString(),
        name: j.name,
        serverId: j.serverId?._id?.toString() || '',
        serverName: j.serverId?.name || 'Deleted Server',
        serverHost: j.serverId?.hostname || '',
        sourcePath: j.sourcePath,
        destinationId: j.destinationId?._id?.toString() || '',
        destinationName: j.destinationId?.name || 'Deleted Destination',
        destinationType: j.destinationId?.type || 'unknown',
        destinationPath: j.destinationPath,
        schedule: j.schedule,
        status: j.status,
        lastRunAt: j.lastRunAt ? j.lastRunAt.toISOString() : null,
        lastRunStatus: j.lastRunStatus,
        lastRunError: j.lastRunError,
        createdAt: j.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve backup jobs' };
  }
}

/**
 * Creates or updates a backup job.
 */
export async function saveBackupJob(formData: z.infer<typeof saveBackupJobSchema>, jobId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = saveBackupJobSchema.safeParse(formData);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();
    await checkWritePermission(session.user.activeOrgId, session.user.id);

    // Verify Server exists
    const server = await Server.findOne({
      _id: new mongoose.Types.ObjectId(validation.data.serverId),
      orgId: session.user.activeOrgId,
    });
    if (!server) {
      return { success: false, error: 'Target server not found' };
    }

    // Verify Destination credential exists
    const dest = await Credential.findOne({
      _id: new mongoose.Types.ObjectId(validation.data.destinationId),
      orgId: session.user.activeOrgId,
      type: { $in: ['aws_s3', 'cloudflare_r2'] },
    });
    if (!dest) {
      return { success: false, error: 'Storage destination credential not found' };
    }

    if (jobId) {
      // Update
      const updated = await BackupJob.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(jobId), orgId: session.user.activeOrgId },
        {
          $set: {
            name: validation.data.name,
            serverId: server._id,
            sourcePath: validation.data.sourcePath,
            destinationId: dest._id,
            destinationPath: validation.data.destinationPath,
            schedule: validation.data.schedule,
          },
        },
        { new: true }
      );
      if (!updated) return { success: false, error: 'Backup job not found' };
    } else {
      // Create
      await BackupJob.create({
        orgId: session.user.activeOrgId,
        projectId: new mongoose.Types.ObjectId(validation.data.projectId),
        name: validation.data.name,
        serverId: server._id,
        sourcePath: validation.data.sourcePath,
        destinationId: dest._id,
        destinationPath: validation.data.destinationPath,
        schedule: validation.data.schedule,
        status: 'active',
        createdBy: session.user.id,
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save backup job' };
  }
}

/**
 * Toggles a job status (active/paused).
 */
export async function toggleJobStatus(jobId: string, currentStatus: 'active' | 'paused') {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();
    await checkWritePermission(session.user.activeOrgId, session.user.id);

    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    const updated = await BackupJob.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(jobId), orgId: session.user.activeOrgId },
      { $set: { status: nextStatus } },
      { new: true }
    );

    if (!updated) return { success: false, error: 'Backup job not found' };
    return { success: true, status: updated.status };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to toggle status' };
  }
}

/**
 * Deletes a backup job config.
 */
export async function deleteBackupJob(jobId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();
    await checkWritePermission(session.user.activeOrgId, session.user.id);

    const deleted = await BackupJob.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(jobId),
      orgId: session.user.activeOrgId,
    });

    if (!deleted) return { success: false, error: 'Backup job not found' };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete backup job' };
  }
}

/**
 * lists files/directories of a target server dynamically over SFTP
 */
export async function listServerDirectoryAction(
  serverId: string,
  path: string
): Promise<{ success: boolean; files?: { name: string; isDirectory: boolean; size: number }[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // 1. Fetch server target
    const server = await Server.findOne({
      _id: new mongoose.Types.ObjectId(serverId),
      orgId: session.user.activeOrgId,
    });
    if (!server) {
      return { success: false, error: 'Server not found' };
    }

    // 2. Fetch and decrypt Server SSH credential
    const serverCred = await Credential.findOne({
      _id: server.credentialId,
      orgId: session.user.activeOrgId,
    });
    if (!serverCred) {
      return { success: false, error: 'Server SSH credentials not found' };
    }
    const decryptedSsh = decryptCredential(serverCred.encryptedPayload);

    // 3. Connect and execute listing
    const sshConfig = {
      host: server.hostname,
      port: server.port,
      username: server.sshUser,
      authMethod: server.authMethod,
      privateKey: decryptedSsh.privateKey,
      passphrase: decryptedSsh.passphrase,
      password: decryptedSsh.password,
      expectedFingerprint: server.fingerprint,
    };

    const result = await listRemoteDirectory(sshConfig, path);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to read server directory', files: undefined };
  }
}

/**
 * Triggers a file backup job immediately.
 */
export async function triggerFileBackupAction(jobId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // 1. Fetch Job
    const job = await BackupJob.findOne({
      _id: new mongoose.Types.ObjectId(jobId),
      orgId: session.user.activeOrgId,
    });
    if (!job) {
      return { success: false, error: 'Backup job configuration not found' };
    }

    // 2. Fetch target Server
    const server = await Server.findOne({
      _id: job.serverId,
      orgId: session.user.activeOrgId,
    });
    if (!server) {
      return { success: false, error: 'Target server not found' };
    }

    // 3. Fetch and decrypt SSH credentials
    const serverCred = await Credential.findOne({
      _id: server.credentialId,
      orgId: session.user.activeOrgId,
    });
    if (!serverCred) {
      return { success: false, error: 'Server SSH credentials not found' };
    }
    const decryptedSsh = decryptCredential(serverCred.encryptedPayload);

    const sshConfig = {
      host: server.hostname,
      port: server.port,
      username: server.sshUser,
      authMethod: server.authMethod,
      privateKey: decryptedSsh.privateKey,
      passphrase: decryptedSsh.passphrase,
      password: decryptedSsh.password,
      expectedFingerprint: server.fingerprint,
    };

    // 4. Execute Backup Job Runner (executes real SSH tar checks + mock S3 transfer)
    const backupResult = await runFileBackupJob(sshConfig, job.sourcePath);

    // 5. Save logs and update stats in DB
    const updateData: Record<string, any> = {
      lastRunAt: new Date(),
      lastRunStatus: backupResult.success ? 'success' : 'failed',
      lastRunError: backupResult.success ? null : (backupResult.error || 'Unknown runner error'),
    };

    await BackupJob.findByIdAndUpdate(job._id, { $set: updateData });

    // Track usage stats on credential
    await Credential.findByIdAndUpdate(job.destinationId, {
      $set: { lastUsedAt: new Date(), lastUsedBy: session.user.id },
      $inc: { usageCount: 1 },
    });

    return {
      success: backupResult.success,
      error: backupResult.error,
      logOutput: backupResult.logOutput,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal runner failure' };
  }
}
