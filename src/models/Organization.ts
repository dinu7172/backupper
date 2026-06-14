import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrganization extends Document {
  slug: string;
  name: string;
  ownerId: Types.ObjectId;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  billingEmail: string;
  stripeCustomerId: string | null;
  stripeSubId: string | null;
  limits: {
    maxProjects: number;
    maxServers: number;
    maxStorageGB: number;
    maxTeamMembers: number;
    retentionDays: number;
  };
  settings: {
    mfaRequired: boolean;
    allowedEmailDomains: string[];
    defaultTimezone: string;
    auditLogRetentionDays: number;
  };
  encryptionKeyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    billingEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubId: {
      type: String,
      default: null,
    },
    limits: {
      maxProjects: { type: Number, default: 2 },
      maxServers: { type: Number, default: 3 },
      maxStorageGB: { type: Number, default: 5 },
      maxTeamMembers: { type: Number, default: 1 },
      retentionDays: { type: Number, default: 7 },
    },
    settings: {
      mfaRequired: { type: Boolean, default: false },
      allowedEmailDomains: { type: [String], default: [] },
      defaultTimezone: { type: String, default: 'UTC' },
      auditLogRetentionDays: { type: Number, default: 90 },
    },
    encryptionKeyId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Organization =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
