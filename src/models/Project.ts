import mongoose, { Schema, Document, Types } from 'mongoose';

export type ProjectEnvironment = 'production' | 'staging' | 'development';
export type ProjectStatus = 'active' | 'archived' | 'suspended';

export interface IProject extends Document {
  orgId: Types.ObjectId;
  name: string;
  slug: string;
  description: string | null;
  environment: ProjectEnvironment;
  tags: string[];
  status: ProjectStatus;
  color: string;
  stats: {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSizeBytes: number;
    lastBackupAt: Date | null;
    lastSuccessAt: Date | null;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    environment: {
      type: String,
      enum: ['production', 'staging', 'development'],
      default: 'production',
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'suspended'],
      default: 'active',
      index: true,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    stats: {
      totalBackups: { type: Number, default: 0 },
      successfulBackups: { type: Number, default: 0 },
      failedBackups: { type: Number, default: 0 },
      totalSizeBytes: { type: Number, default: 0 },
      lastBackupAt: { type: Date, default: null },
      lastSuccessAt: { type: Date, default: null },
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

// Enforce unique slug *within* the same organization
ProjectSchema.index({ orgId: 1, slug: 1 }, { unique: true });
// Compound index for sorting projects by last backup activity
ProjectSchema.index({ orgId: 1, 'stats.lastBackupAt': -1 });

const Project =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
