import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    uri: process.env.MONGO_URL || 'mongodb://localhost:27017/rapidgigs',
  },
};

// Debug logs OUTSIDE the config object
console.log("MONGO_URL:", process.env.MONGO_URL ? "Set" : "Not Set");
console.log("Using DB URI:", config.db.uri);
console.log("----------------------");
