import mongoose from 'mongoose';
import { config } from './env';
import * as fs from 'fs';
import * as path from 'path';

// Ensure upload directories exist
const ensureDirectories = () => {
  const dirs = [
    path.join(config.upload.dir, 'videos'),
    path.join(config.upload.dir, 'resumes'),
    path.join(config.upload.dir, 'avatars'),
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

// Connect to MongoDB
export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.db.uri);
    console.log('Connected to MongoDB');

    // Initialize default categories
    await initializeDefaultCategories();

    // Initialize roles and permissions
    // await initializeRolesAndPermissions(); // Disabled for performance
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Initialize default categories
const initializeDefaultCategories = async () => {
  try {
    const { Category } = await import('../models/Category');
    const categories = [
      'Web Development', 'Mobile Development', 'UI/UX Design',
      'Data Science', 'Digital Marketing', 'Content Creation',
      'Video Editing', 'Project Management', 'Customer Support',
      'Virtual Assistant', 'Graphic Design', 'Machine Learning'
    ];

    for (const categoryName of categories) {
      await Category.findOneAndUpdate(
        { name: categoryName },
        { name: categoryName },
        { upsert: true, new: true }
      );
    }
    console.log('Default categories initialized');
  } catch (error) {
    console.error('Error initializing categories:', error);
  }
};

// Initialize roles and permissions
const initializeRolesAndPermissions = async () => {
  try {
    const { getPermissionsForRole } = await import('./permissions');
    const { User } = await import('../models/User');

    // Update all existing users with permissions based on their role
    const users = await User.find();

    for (const user of users) {
      // Determine role if not set
      if (!user.role) {
        if (user.isRecruiter) {
          user.role = 'recruiter';
        } else if (user.isStudent) {
          user.role = 'student';
        } else {
          user.role = 'student'; // default
        }
      }

      // Set permissions based on role
      user.permissions = getPermissionsForRole(user.role);

      // Set isActive if not set
      if (user.isActive === undefined) {
        user.isActive = true;
      }

      await user.save();
    }

    console.log('Roles and permissions initialized');
  } catch (error) {
    console.error('Error initializing roles and permissions:', error);
  }
};

// Disconnect from MongoDB
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

export default mongoose;
