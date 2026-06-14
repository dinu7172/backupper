import mongoose, { Schema, Document, Types } from 'mongoose';
import { OrgRole } from './OrgMembership';

export interface IInvitation extends Document {
  orgId: Types.ObjectId;
  email: string;
  role: OrgRole;
  tokenHash: string;
  expiresAt: Date;
  invitedBy: Types.ObjectId;
  acceptedAt: Date | null;
  acceptedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'developer', 'operator', 'viewer'],
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove expired invitations
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<IInvitation>('Invitation', InvitationSchema);

export default Invitation;
