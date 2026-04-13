import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShortVideo extends Document {
  userId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  categoryId?: mongoose.Types.ObjectId;
  views: number;
  likes: number;
  duration?: string;
  createdAt: Date;
}

const ShortVideoSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    duration: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

ShortVideoSchema.index({ userId: 1, createdAt: -1 });

export const ShortVideo: Model<IShortVideo> = mongoose.model<IShortVideo>('ShortVideo', ShortVideoSchema);

