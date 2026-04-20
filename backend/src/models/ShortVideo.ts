import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShortVideoCaption {
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

const CaptionSchema = new Schema({
  text: { type: String, required: true },
  startTime: { type: Number, required: true, default: 0 },
  endTime: { type: Number, required: true, default: 5 }
}, { _id: false });

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
  shares: number;
  saves: number;
  applications: number;
  impressions: number;
  captions: IShortVideoCaption[];
  companyLogoUrl?: string;
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
    shares: {
      type: Number,
      default: 0,
    },
    saves: {
      type: Number,
      default: 0,
    },
    applications: {
      type: Number,
      default: 0,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    captions: [CaptionSchema],
    companyLogoUrl: {
      type: String,
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
