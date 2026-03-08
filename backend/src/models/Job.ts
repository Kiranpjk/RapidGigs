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
  shortVideoScript?: string;
  shortVideoScenes?: Array<{
    order: number;
    durationSec: number;
    caption: string;
    visualPrompt: string;
  }>;
  shortVideoStatus?: 'pending' | 'generated' | 'failed';
  postedBy: mongoose.Types.ObjectId;
  likes: number;
  comments: number;
  shares: number;
  postedAgo?: string;
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
    shortVideoScript: {
      type: String,
    },
    shortVideoScenes: [
      {
        order: { type: Number, required: true },
        durationSec: { type: Number, required: true },
        caption: { type: String, required: true },
        visualPrompt: { type: String, required: true },
      },
    ],
    shortVideoStatus: {
      type: String,
      enum: ['pending', 'generated', 'failed'],
      default: 'pending',
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
  },
  {
    timestamps: true,
  }
);

export const Job: Model<IJob> = mongoose.model<IJob>('Job', JobSchema);
