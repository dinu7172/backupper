import mongoose, { Schema, Document, Types } from 'mongoose';

export type OrgRole = 'owner' | 'admin' | 'developer' | 'operator' | 'viewer';

export interface IOrgMembership extends Document {
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
}

const OrgMembershipSchema = new Schema<IOrgMembership>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'developer', 'operator', 'viewer'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique compound index so a user cannot have multiple roles in the same organization
OrgMembershipSchema.index({ orgId: 1, userId: 1 }, { unique: true });

const OrgMembership =
  mongoose.models.OrgMembership ||
  mongoose.model<IOrgMembership>('OrgMembership', OrgMembershipSchema);

export default OrgMembership;
