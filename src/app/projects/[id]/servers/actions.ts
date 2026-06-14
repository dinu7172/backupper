'use server';

import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Server from '@/models/Server';
import Credential, { CredentialType } from '@/models/Credential';
import OrgMembership from '@/models/OrgMembership';
import { encryptCredential, decryptCredential } from '@/lib/vault';
import { testSshConnection, inspectDatabases } from '@/lib/ssh';
import { z } from 'zod';
import mongoose from 'mongoose';

// Validation Schemas
const saveServerSchema = z.object({
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
  hostname: z.string().min(1, 'Hostname or IP is required').max(255),
  port: z.number().int().min(1).max(65535).default(22),
  sshUser: z.string().min(1, 'SSH Username is required').max(128),
  authMethod: z.enum(['key', 'password']),
  credentialId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid credential ID'),
});

const saveCredentialSchema = z.object({
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID').nullable(),
  name: z.string().min(2, 'Credential name must be at least 2 characters').max(64),
  type: z.enum(['ssh_key', 'ssh_password', 'mysql', 'postgresql', 'mongodb']),
  description: z.string().max(200).optional(),
  payload: z.record(z.string(), z.any()), // e.g. { privateKey: "...", password: "..." }
  meta: z.object({
    sshPublicKey: z.string().nullable().optional(),
    sshKeyType: z.string().nullable().optional(),
    dbUser: z.string().nullable().optional(),
    dbPort: z.number().nullable().optional(),
    dbName: z.string().nullable().optional(),
    dbHost: z.string().nullable().optional(),
  }).optional(),
});

// Helper to check user organization membership
async function checkWritePermission(orgId: string, userId: string) {
  const membership = await OrgMembership.findOne({ orgId, userId });
  if (!membership || !['owner', 'admin', 'developer'].includes(membership.role)) {
    throw new Error('Insufficient permissions to modify settings.');
  }
  return membership;
}

/**
 * Retrieves the list of target servers registered under a specific project.
 */
export async function getServers(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const servers = await Server.find({
      orgId: session.user.activeOrgId,
      projectId: new mongoose.Types.ObjectId(projectId),
    }).sort({ createdAt: -1 }).lean();

    return {
      success: true,
      servers: servers.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        hostname: s.hostname,
        ipAddress: s.ipAddress,
        port: s.port,
        sshUser: s.sshUser,
        authMethod: s.authMethod,
        credentialId: s.credentialId.toString(),
        fingerprint: s.fingerprint,
        status: s.status,
        lastPingAt: s.lastPingAt ? s.lastPingAt.toISOString() : null,
        lastPingStatus: s.lastPingStatus,
        osInfo: s.osInfo ? {
          distro: s.osInfo.distro ?? null,
          arch: s.osInfo.arch ?? null,
          kernel: s.osInfo.kernel ?? null,
        } : { distro: null, arch: null, kernel: null },
        diskInfo: s.diskInfo ? {
          totalGB: s.diskInfo.totalGB ?? null,
          freeGB: s.diskInfo.freeGB ?? null,
          lastCheckedAt: s.diskInfo.lastCheckedAt ? s.diskInfo.lastCheckedAt.toISOString() : null,
        } : { totalGB: null, freeGB: null, lastCheckedAt: null },
        createdAt: s.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve servers' };
  }
}

/**
 * Retrieves lists of credentials for display dropdowns (filtered by type)
 */
export async function getCredentials(projectId: string, types?: CredentialType[]) {
  try {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    const query: Record<string, any> = {
      orgId: session.user.activeOrgId,
      $or: [
        { projectId: null },
        { projectId: new mongoose.Types.ObjectId(projectId) },
      ],
    };

    if (types && types.length > 0) {
      query.type = { $in: types };
    }

    const credentials = await Credential.find(query).sort({ name: 1 }).lean();

    return {
      success: true,
      credentials: credentials.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        type: c.type,
        description: c.description,
        meta: c.meta ? {
          sshPublicKey: c.meta.sshPublicKey ?? null,
          sshKeyType: c.meta.sshKeyType ?? null,
          dbUser: c.meta.dbUser ?? null,
          dbPort: c.meta.dbPort ?? null,
          dbName: c.meta.dbName ?? null,
          dbHost: c.meta.dbHost ?? null,
        } : {
          sshPublicKey: null,
          sshKeyType: null,
          dbUser: null,
          dbPort: null,
          dbName: null,
          dbHost: null,
        },
        createdAt: c.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve credentials' };
  }
}

/**
 * Creates or saves a secure, envelope-encrypted credential
 */
export async function saveCredential(formData: z.infer<typeof saveCredentialSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = saveCredentialSchema.safeParse(formData);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();
    await checkWritePermission(session.user.activeOrgId, session.user.id);

    // 1. Perform Envelope Encryption using the Vault
    const encrypted = encryptCredential(validation.data.payload);

    // 2. Save credential record
    const credential = await Credential.create({
      orgId: session.user.activeOrgId,
      projectId: validation.data.projectId ? new mongoose.Types.ObjectId(validation.data.projectId) : null,
      name: validation.data.name,
      type: validation.data.type,
      description: validation.data.description || null,
      encryptedPayload: encrypted,
      meta: {
        sshPublicKey: validation.data.meta?.sshPublicKey || null,
        sshKeyType: validation.data.meta?.sshKeyType || null,
        dbUser: validation.data.meta?.dbUser || null,
        dbPort: validation.data.meta?.dbPort || null,
        dbName: validation.data.meta?.dbName || null,
        dbHost: validation.data.meta?.dbHost || null,
      },
      createdBy: session.user.id,
    });

    return {
      success: true,
      credentialId: credential._id.toString(),
      name: credential.name,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save credential' };
  }
}

/**
 * Tests connection to a server target instantly (can test unsaved or saved server)
 */
export async function testConnectionAction(data: {
  serverId?: string;
  hostname: string;
  port: number;
  sshUser: string;
  authMethod: 'key' | 'password';
  credentialId?: string;
  rawCredentialPayload?: Record<string, any>;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // 1. Resolve Credentials
    let decryptedPayload: Record<string, any> = {};
    if (data.credentialId) {
      const cred = await Credential.findOne({
        _id: new mongoose.Types.ObjectId(data.credentialId),
        orgId: session.user.activeOrgId,
      });
      if (!cred) {
        return { success: false, error: 'Credential not found' };
      }
      decryptedPayload = decryptCredential(cred.encryptedPayload);
    } else if (data.rawCredentialPayload) {
      decryptedPayload = data.rawCredentialPayload;
    } else {
      return { success: false, error: 'Connection test requires credentials' };
    }

    // 2. Fetch server fingerprint if server already exists and is pinned
    let expectedFingerprint: string | null = null;
    let serverDoc: any = null;
    if (data.serverId) {
      serverDoc = await Server.findOne({
        _id: new mongoose.Types.ObjectId(data.serverId),
        orgId: session.user.activeOrgId,
      });
      if (serverDoc) {
        expectedFingerprint = serverDoc.fingerprint;
      }
    }

    // 3. Trigger SSH Connection Runner
    const sshResult = await testSshConnection({
      host: data.hostname,
      port: data.port,
      username: data.sshUser,
      authMethod: data.authMethod,
      privateKey: decryptedPayload.privateKey,
      passphrase: decryptedPayload.passphrase,
      password: decryptedPayload.password,
      expectedFingerprint,
    });

    // 4. Update the Server state in database if server exists
    if (serverDoc) {
      const updateData: Record<string, any> = {
        lastPingAt: new Date(),
        lastPingStatus: sshResult.success ? 'ok' : 'fail',
      };

      if (sshResult.success) {
        updateData.status = 'connected';
        updateData.ipAddress = sshResult.ip || serverDoc.ipAddress;
        if (sshResult.fingerprint && !serverDoc.fingerprint) {
          updateData.fingerprint = sshResult.fingerprint;
        }
        if (sshResult.osInfo) {
          updateData.osInfo = sshResult.osInfo;
        }
        if (sshResult.diskInfo) {
          updateData.diskInfo = {
            ...sshResult.diskInfo,
            lastCheckedAt: new Date(),
          };
        }
      } else {
        if (sshResult.error?.includes('Authentication failed')) {
          updateData.status = 'auth_failed';
        } else if (sshResult.error?.includes('Security Alert')) {
          updateData.status = 'unreachable'; // Host key changed alert
        } else {
          updateData.status = 'unreachable';
        }
      }

      await Server.findByIdAndUpdate(serverDoc._id, { $set: updateData });
    }

    return sshResult;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection test failed due to internal error',
      fingerprint: undefined,
      osInfo: undefined,
      diskInfo: undefined,
    };
  }
}

/**
 * Creates or updates a target server document
 */
export async function saveServer(formData: z.infer<typeof saveServerSchema>, serverId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validation = saveServerSchema.safeParse(formData);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    await dbConnect();
    await checkWritePermission(session.user.activeOrgId, session.user.id);

    // Verify credential existence and scope
    const cred = await Credential.findOne({
      _id: new mongoose.Types.ObjectId(validation.data.credentialId),
      orgId: session.user.activeOrgId,
    });
    if (!cred) {
      return { success: false, error: 'Associated credential not found' };
    }

    let server;
    if (serverId) {
      // Update existing server
      server = await Server.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(serverId), orgId: session.user.activeOrgId },
        {
          $set: {
            name: validation.data.name,
            hostname: validation.data.hostname,
            port: validation.data.port,
            sshUser: validation.data.sshUser,
            authMethod: validation.data.authMethod,
            credentialId: cred._id,
          },
        },
        { new: true }
      );
      if (!server) return { success: false, error: 'Server not found' };
    } else {
      // Create new server (initiates as pending)
      server = await Server.create({
        orgId: session.user.activeOrgId,
        projectId: new mongoose.Types.ObjectId(validation.data.projectId),
        name: validation.data.name,
        hostname: validation.data.hostname,
        port: validation.data.port,
        sshUser: validation.data.sshUser,
        authMethod: validation.data.authMethod,
        credentialId: cred._id,
        createdBy: session.user.id,
        status: 'pending',
      });
    }

    // Proactively trigger connection testing in background to retrieve fingerprint and specs
    // Does not block returning success to the user
    testConnectionAction({
      serverId: server._id.toString(),
      hostname: server.hostname,
      port: server.port,
      sshUser: server.sshUser,
      authMethod: server.authMethod,
      credentialId: server.credentialId.toString(),
    }).catch((e) => console.error(`Background server initial sync failed: ${e.message}`));

    return { success: true, serverId: server._id.toString() };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save server target' };
  }
}

/**
 * Deletes a server target
 */
export async function deleteServer(serverId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();
    await checkWritePermission(session.user.activeOrgId, session.user.id);

    const deleted = await Server.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(serverId),
      orgId: session.user.activeOrgId,
    });

    if (!deleted) {
      return { success: false, error: 'Server not found or already deleted' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete server' };
  }
}

/**
 * Inspects remote server and discovers databases matching the selected configuration
 */
export async function inspectDatabasesAction(
  serverId: string,
  dbType: 'mysql' | 'postgresql' | 'mongodb',
  dbCredentialId: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.activeOrgId) {
      return { success: false, error: 'Unauthorized' };
    }

    await dbConnect();

    // 1. Fetch and verify Server target
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

    // 3. Fetch and decrypt Database credential
    const dbCred = await Credential.findOne({
      _id: new mongoose.Types.ObjectId(dbCredentialId),
      orgId: session.user.activeOrgId,
    });
    if (!dbCred) {
      return { success: false, error: 'Database credentials not found' };
    }
    const decryptedDb = decryptCredential(dbCred.encryptedPayload);

    // 4. Build configs and execute discovery helper
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

    const dbCreds = {
      user: dbCred.meta?.dbUser || decryptedDb.username || 'root',
      password: decryptedDb.password,
      authSource: dbCred.meta?.dbName || decryptedDb.authSource || undefined,
      host: dbCred.meta?.dbHost || undefined,
      port: dbCred.meta?.dbPort || undefined,
    };

    const result = await inspectDatabases(sshConfig, dbType, dbCreds);

    if (result.success) {
      // Log audit action if needed
      await Credential.findByIdAndUpdate(dbCredentialId, {
        $set: { lastUsedAt: new Date(), lastUsedBy: session.user.id },
        $inc: { usageCount: 1 },
      });
      await Server.findByIdAndUpdate(serverId, {
        $set: { lastPingAt: new Date(), lastPingStatus: 'ok' },
      });
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Database discovery execution failed', databases: undefined };
  }
}
