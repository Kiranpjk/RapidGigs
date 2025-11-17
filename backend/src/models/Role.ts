import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    permissions: [{
      type: String,
      required: true,
    }],
  },
  {
    timestamps: true,
  }
);

export const Role: Model<IRole> = mongoose.model<IRole>('Role', RoleSchema);
