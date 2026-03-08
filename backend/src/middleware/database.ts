import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export const requireDatabaseConnection = (_req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database is not connected. Start MongoDB and retry.',
    });
  }

  next();
};
