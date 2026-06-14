'use server';

import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import argon2 from 'argon2';
import mongoose from 'mongoose';

// Helper to ensure user is platform admin
async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.platformRole !== 'admin') {
    throw new Error('Unauthorized. Platform admin permissions required.');
  }
  return session;
}

export async function getAdminUsers(searchQuery?: string) {
  try {
    await ensureAdmin();
    await dbConnect();

    const query: any = {};
    if (searchQuery) {
      const cleanSearch = searchQuery.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    return {
      success: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        mfaEnabled: !!u.mfaEnabled,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        lastLoginIp: u.lastLoginIp || null,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch users' };
  }
}

export async function toggleUserRole(targetUserId: string) {
  try {
    const session = await ensureAdmin();
    await dbConnect();

    if (session.user.id === targetUserId) {
      return { success: false, error: 'You cannot change your own platform role.' };
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    user.role = newRole;
    await user.save();

    return { success: true, newRole };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user role' };
  }
}

export async function resetUserPassword(targetUserId: string, newPasswordStr: string) {
  try {
    await ensureAdmin();

    if (newPasswordStr.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    await dbConnect();

    const user = await User.findById(targetUserId);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    // Hash the password using Argon2id with OWASP-recommended parameters
    const passwordHash = await argon2.hash(newPasswordStr, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4, // 4 lanes
    });

    user.passwordHash = passwordHash;
    await user.save();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reset password' };
  }
}

export async function deleteUser(targetUserId: string) {
  try {
    const session = await ensureAdmin();
    await dbConnect();

    if (session.user.id === targetUserId) {
      return { success: false, error: 'You cannot delete your own admin account.' };
    }

    const deleted = await User.findByIdAndDelete(targetUserId);
    if (!deleted) {
      return { success: false, error: 'User not found.' };
    }

    // Optionally delete workspace memberships of this user
    const OrgMembership = (await import('@/models/OrgMembership')).default;
    await OrgMembership.deleteMany({ userId: new mongoose.Types.ObjectId(targetUserId) });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}
