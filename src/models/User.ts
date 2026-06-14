import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  emailVerified: Date | null;
  passwordHash: string | null;
  name: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  mfaEnabled: boolean;
  mfaSecret: string | null;
  recoveryCodes: string[];
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      default: null,
    },
    recoveryCodes: {
      type: [String],
      default: [],
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent compiling model twice during hot reloads
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
