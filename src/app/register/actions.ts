'use server';

import dbConnect from '@/lib/db';
import User from '@/models/User';
import { z } from 'zod';
import argon2 from 'argon2';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export async function registerUser(formData: z.infer<typeof registerSchema>) {
  try {
    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const { name, email, password } = validation.data;

    await dbConnect();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Hash the password using Argon2id with OWASP-recommended parameters
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4, // 4 lanes
    });

    // Create new user (MFA is disabled by default)
    await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal server error' };
  }
}
