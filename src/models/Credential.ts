import mongoose, { Schema, Document, Types } from 'mongoose';

export type CredentialType =
  | 'ssh_key'
  | 'ssh_password'
  | 'mysql'
  | 'postgresql'
  | 'mongodb'
  | 'redis'
  | 'aws_s3'
  | 'cloudflare_r2';

export interface ICredential extends Document {
  orgId: Types.ObjectId;
  projectId: Types.ObjectId | null;
  name: string;
  type: CredentialType;
  description: string | null;
  tags: string[];
  encryptedPayload: {
    ciphertext: string;
    iv: string;
    authTag: string;
    encryptedDek: string;
    keyId: string;
  };
  meta: {
    sshPublicKey: string | null;
    sshKeyType: string | null;
    dbUser: string | null;
    dbPort: number | null;
    dbName: string | null;
    dbHost: string | null;
  };
  lastUsedAt: Date | null;
  lastUsedBy: Types.ObjectId | null;
  usageCount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialSchema = new Schema<ICredential>(
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
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'ssh_key',
        'ssh_password',
        'mysql',
        'postgresql',
        'mongodb',
        'redis',
        'aws_s3',
        'cloudflare_r2',
      ],
      required: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    encryptedPayload: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      encryptedDek: { type: String, required: true },
      keyId: { type: String, required: true },
    },
    meta: {
      sshPublicKey: { type: String, default: null },
      sshKeyType: { type: String, default: null },
      dbUser: { type: String, default: null },
      dbPort: { type: Number, default: null },
      dbName: { type: String, default: null },
      dbHost: { type: String, default: null },
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    lastUsedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
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

// Compound index for tenant isolation and listing
CredentialSchema.index({ orgId: 1, projectId: 1, type: 1 });

const Credential =
  mongoose.models.Credential ||
  mongoose.model<ICredential>('Credential', CredentialSchema);

export default Credential;
