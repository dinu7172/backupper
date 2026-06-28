import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBackupJob extends Document {
  orgId: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  serverId: Types.ObjectId;
  sourcePath: string;
  destinationId: Types.ObjectId;
  destinationPath: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'paused';
  lastRunAt: Date | null;
  lastRunStatus: 'success' | 'failed' | null;
  lastRunError: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BackupJobSchema = new Schema<IBackupJob>(
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
    serverId: {
      type: Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
    },
    sourcePath: {
      type: String,
      required: true,
      trim: true,
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Credential',
      required: true,
    },
    destinationPath: {
      type: String,
      required: true,
      trim: true,
      default: 'backups/files/',
    },
    schedule: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      default: 'daily',
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      required: true,
      default: 'active',
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastRunStatus: {
      type: String,
      enum: ['success', 'failed', null],
      default: null,
    },
    lastRunError: {
      type: String,
      default: null,
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

BackupJobSchema.index({ orgId: 1, projectId: 1 });

const BackupJob =
  mongoose.models.BackupJob ||
  mongoose.model<IBackupJob>('BackupJob', BackupJobSchema);

export default BackupJob;
