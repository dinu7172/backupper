import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IServer extends Document {
  orgId: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  hostname: string;
  ipAddress: string | null;
  port: number;
  sshUser: string;
  authMethod: 'key' | 'password';
  credentialId: Types.ObjectId;
  fingerprint: string | null;
  status: 'connected' | 'unreachable' | 'auth_failed' | 'pending';
  lastPingAt: Date | null;
  lastPingStatus: 'ok' | 'fail' | null;
  osInfo: {
    distro: string | null;
    arch: string | null;
    kernel: string | null;
  };
  diskInfo: {
    totalGB: number | null;
    freeGB: number | null;
    lastCheckedAt: Date | null;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServerSchema = new Schema<IServer>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    hostname: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },
    port: {
      type: Number,
      required: true,
      default: 22,
    },
    sshUser: {
      type: String,
      required: true,
      trim: true,
    },
    authMethod: {
      type: String,
      enum: ['key', 'password'],
      required: true,
    },
    credentialId: {
      type: Schema.Types.ObjectId,
      ref: 'Credential',
      required: true,
    },
    fingerprint: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ['connected', 'unreachable', 'auth_failed', 'pending'],
      default: 'pending',
    },
    lastPingAt: {
      type: Date,
      default: null,
    },
    lastPingStatus: {
      type: String,
      enum: ['ok', 'fail', null],
      default: null,
    },
    osInfo: {
      distro: { type: String, default: null },
      arch: { type: String, default: null },
      kernel: { type: String, default: null },
    },
    diskInfo: {
      totalGB: { type: Number, default: null },
      freeGB: { type: Number, default: null },
      lastCheckedAt: { type: Date, default: null },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast tenant query checks
ServerSchema.index({ orgId: 1, projectId: 1 });

const Server =
  mongoose.models.Server ||
  mongoose.model<IServer>('Server', ServerSchema);

export default Server;
