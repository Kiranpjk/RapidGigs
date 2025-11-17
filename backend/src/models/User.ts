import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
  bannerUrl?: string;
  title?: string;
  isStudent: boolean;
  isRecruiter: boolean;
  role: string; // 'student', 'recruiter', 'admin', 'moderator'
  permissions: string[];
  isActive: boolean;
  googleId?: string; // Google OAuth ID
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    bannerUrl: {
      type: String,
    },
    title: {
      type: String,
    },
    isStudent: {
      type: Boolean,
      default: false,
    },
    isRecruiter: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['student', 'recruiter', 'admin', 'moderator'],
      default: 'student',
    },
    permissions: [{
      type: String,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    googleId: {
      type: String,
      sparse: true, // Allows multiple null values but unique non-null values
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

// Helper functions for backward compatibility
export const UserModel = {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  },

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  },

  async create(data: {
    email: string;
    password: string;
    name: string;
    isStudent?: boolean;
    isRecruiter?: boolean;
    avatarUrl?: string;
    title?: string;
    role?: string;
    permissions?: string[];
    isActive?: boolean;
    googleId?: string;
  }): Promise<IUser> {
    const user = new User(data);
    return user.save();
  },

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true });
  },
};
