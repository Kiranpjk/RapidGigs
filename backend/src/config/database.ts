import mongoose from 'mongoose';
import { config } from './env';
import * as fs from 'fs';
import * as path from 'path';
import { getPermissionsForRole } from './permissions';

// Optionally use in-memory MongoDB for development when no external URI provided
let mongoMemoryServer: any = null;
let usingInMemory = false;
try {
  // Lazy require to avoid adding dependency at runtime when not needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongoMemoryServer = MongoMemoryServer;
} catch (err) {
  // mongodb-memory-server not installed or not available; that's fine
}

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
    try {
      await mongoose.connect(config.db.uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB at', config.db.uri);
    } catch (e) {
      // If connect fails and mongodb-memory-server is available, start an in-memory DB
      if (!process.env.MONGO_URI && mongoMemoryServer) {
        console.warn('Failed to connect to external MongoDB, starting in-memory MongoDB for development');
        try {
          const mongod = await mongoMemoryServer.create();
          const uri = mongod.getUri();
          usingInMemory = true;
          await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
          console.log('Connected to in-memory MongoDB');
        } catch (memoryError) {
          if (config.nodeEnv === 'development') {
            console.warn('In-memory MongoDB failed to start. Continuing without database in development mode.');
            console.warn(memoryError);
            return;
          }
          throw memoryError;
        }
      } else if (config.nodeEnv === 'development') {
        console.warn('MongoDB is unavailable. Continuing without database in development mode.');
        console.warn(e);
        return;
      } else {
        throw e;
      }
    }

    // Initialize default categories
    await initializeDefaultCategories();
    
      // Create a default admin user for development (only when in-memory DB or when explicitly requested)
      const ensureDevAdmin = async () => {
        // NEVER create dev admin in production
        if (config.isProduction) return;
        try {
          const { User } = await import('../models/User');
          const { hashPassword } = await import('../utils/password');
        
          const shouldCreate = usingInMemory || process.env.CREATE_DEV_ADMIN === 'true';
          if (!shouldCreate) return;
        
          const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@local';
          const existing = await User.findOne({ email: adminEmail.toLowerCase() });
          if (existing) return;
        
          const pwd = process.env.DEV_ADMIN_PASSWORD || 'adminpass';
          const hashed = await hashPassword(pwd);
          const permissions = getPermissionsForRole('admin');
          const admin = new User({
            email: adminEmail,
            password: hashed,
            name: 'Dev Admin',
            role: 'admin',
            permissions,
            isActive: true,
            isRecruiter: false,
            isStudent: false,
          });
          await admin.save();
          console.log('Created development admin:', adminEmail);
        } catch (error) {
          // ignore errors
        }
      };
    
      // Optionally create dev admin
      await ensureDevAdmin();

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
    if (usingInMemory && mongoMemoryServer) {
      try {
        // stop the in-memory server if it was used
        const instance = await mongoMemoryServer.getInstance?.();
        if (instance && typeof instance.stop === 'function') await instance.stop();
      } catch (e) {
        // ignore
      }
    }
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

export default mongoose;
