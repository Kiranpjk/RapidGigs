import mongoose, { Schema, Document } from 'mongoose';

export interface IInterview extends Document {
  applicationId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  recruiterId: mongoose.Types.ObjectId;
  timeSlots: Date[];
  meetingType: 'Google Meet' | 'Zoom' | 'Phone' | 'In-person' | 'External';
  meetingLink?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled';
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema({
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  candidateId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  recruiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timeSlots: [{ type: Date, required: true }],
  meetingType: { type: String, enum: ['Google Meet', 'Zoom', 'Phone', 'In-person', 'External'], required: true },
  meetingLink: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'canceled'], default: 'pending' }
}, {
  timestamps: true
});

export default mongoose.model<IInterview>('Interview', InterviewSchema);
