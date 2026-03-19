import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  coverLetter?: string;
  resumeUrl?: string;
  videoUrl?: string;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'interviewing' | 'accepted' | 'rejected';
  dateApplied: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverLetter: {
      type: String,
    },
    resumeUrl: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'shortlisted', 'interviewing', 'accepted', 'rejected'],
      default: 'pending',
    },
    dateApplied: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one application per user per job
ApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export const Application: Model<IApplication> = mongoose.model<IApplication>('Application', ApplicationSchema);

