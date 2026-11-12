import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJob extends Document {
  title: string;
  company: string;
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  pay: string;
  description: string;
  categoryId?: mongoose.Types.ObjectId;
  companyVideoUrl?: string;
  freelancerVideoUrl?: string;
  shortVideoUrl?: string;
  videoGenStatus?: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  videoGenProgress?: number;
  videoGenStage?: string;
  postedBy: mongoose.Types.ObjectId;
  maxSlots: number;
  filledSlots: number;
  status: 'Open' | 'Full' | 'Closed';
  likes: number;
  comments: number;
  shares: number;
  postedAgo?: string;
  source?: 'simplify' | 'zapply';
  externalId?: string;
  applyUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Remote', 'On-site', 'Hybrid'],
    },
    pay: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    companyVideoUrl: {
      type: String,
    },
    freelancerVideoUrl: {
      type: String,
    },
    shortVideoUrl: {
      type: String,
    },
    videoGenStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Pending',
    },
    videoGenProgress: {
      type: Number,
      default: 0,
    },
    videoGenStage: {
      type: String,
      default: '',
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    maxSlots: {
      type: Number,
      default: 1,
      min: 1,
    },
    filledSlots: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Open', 'Full', 'Closed'],
      default: 'Open',
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    postedAgo: {
      type: String,
    },
    // Set only on jobs imported from public internship lists (apply happens on the company site).
    source: {
      type: String,
      enum: ['simplify', 'zapply'],
    },
    externalId: {
      type: String,
    },
    applyUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

JobSchema.index({ postedBy: 1, createdAt: -1 });
JobSchema.index({ categoryId: 1, status: 1, createdAt: -1 });
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ source: 1, externalId: 1 }, { unique: true, partialFilterExpression: { source: { $exists: true } } });

export const Job: Model<IJob> = mongoose.model<IJob>('Job', JobSchema);

