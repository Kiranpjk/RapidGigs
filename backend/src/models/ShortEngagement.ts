import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShortEngagement extends Document {
  userId: mongoose.Types.ObjectId;
  shortId: mongoose.Types.ObjectId;
  action: 'view' | 'like' | 'unlike' | 'share' | 'save' | 'unsave' | 'apply_click';
  watchTimeMs?: number;
  completionRate?: number; // 0.0 to 1.0
  createdAt: Date;
}

const ShortEngagementSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shortId: {
      type: Schema.Types.ObjectId,
      ref: 'ShortVideo',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['view', 'like', 'unlike', 'share', 'save', 'unsave', 'apply_click'],
    },
    watchTimeMs: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups
ShortEngagementSchema.index({ userId: 1, shortId: 1, action: 1 });
ShortEngagementSchema.index({ shortId: 1, action: 1 });
ShortEngagementSchema.index({ userId: 1, createdAt: -1 });

export const ShortEngagement: Model<IShortEngagement> = mongoose.model<IShortEngagement>(
  'ShortEngagement',
  ShortEngagementSchema
);
