import pool from '../config/database';
import { 
  UserPreferences, 
  UserStats, 
  FileUpload,
  CreateUserPreferencesData,
  UpdateUserPreferencesData,
  CreateFileUploadData
} from '../models/Profile';

export class ProfileService {
  // User Preferences Methods
  static async createUserPreferences(data: CreateUserPreferencesData): Promise<UserPreferences> {
    const query = `
      INSERT INTO user_preferences (
        user_id, email_notifications, push_notifications, job_alerts, 
        marketing_emails, preferred_job_types, preferred_locations, 
        salary_range_min, salary_range_max, availability_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      data.user_id,
      data.email_notifications ?? true,
      data.push_notifications ?? true,
      data.job_alerts ?? true,
      data.marketing_emails ?? false,
      data.preferred_job_types || null,
      data.preferred_locations || null,
      data.salary_range_min || null,
      data.salary_range_max || null,
      data.availability_status || 'available'
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const query = 'SELECT * FROM user_preferences WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async updateUserPreferences(userId: string, data: UpdateUserPreferencesData): Promise<UserPreferences | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(userId);
    const query = `
      UPDATE user_preferences 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // User Stats Methods
  static async createUserStats(userId: string): Promise<UserStats> {
    const query = `
      INSERT INTO user_stats (user_id)
      VALUES ($1)
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async getUserStats(userId: string): Promise<UserStats | null> {
    const query = 'SELECT * FROM user_stats WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async updateUserStats(userId: string, updates: Partial<UserStats>): Promise<UserStats | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(userId);
    const query = `
      UPDATE user_stats 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async incrementUserStat(userId: string, statField: string, increment: number = 1): Promise<void> {
    const query = `
      UPDATE user_stats 
      SET ${statField} = ${statField} + $1
      WHERE user_id = $2
    `;
    
    await pool.query(query, [increment, userId]);
  }

  // File Upload Methods
  static async createFileUpload(data: CreateFileUploadData): Promise<FileUpload> {
    const query = `
      INSERT INTO file_uploads (
        user_id, file_name, original_name, file_path, 
        file_size, mime_type, file_type, upload_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      data.user_id,
      data.file_name,
      data.original_name,
      data.file_path,
      data.file_size,
      data.mime_type,
      data.file_type,
      data.upload_status || 'completed'
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getFileUpload(fileId: string): Promise<FileUpload | null> {
    const query = 'SELECT * FROM file_uploads WHERE id = $1';
    const result = await pool.query(query, [fileId]);
    return result.rows[0] || null;
  }

  static async getUserFiles(userId: string, fileType?: string): Promise<FileUpload[]> {
    let query = 'SELECT * FROM file_uploads WHERE user_id = $1';
    const values = [userId];
    
    if (fileType) {
      query += ' AND file_type = $2';
      values.push(fileType);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateFileUploadStatus(fileId: string, status: 'uploading' | 'completed' | 'failed'): Promise<FileUpload | null> {
    const query = `
      UPDATE file_uploads 
      SET upload_status = $1
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, fileId]);
    return result.rows[0] || null;
  }

  static async deleteFileUpload(fileId: string): Promise<boolean> {
    const query = 'DELETE FROM file_uploads WHERE id = $1';
    const result = await pool.query(query, [fileId]);
    return (result.rowCount || 0) > 0;
  }

  // Helper method to initialize user profile data
  static async initializeUserProfile(userId: string): Promise<void> {
    try {
      // Create default preferences
      await this.createUserPreferences({ user_id: userId });
      
      // Create initial stats
      await this.createUserStats(userId);
    } catch (error) {
      console.error('Error initializing user profile:', error);
      // Don't throw error if records already exist
    }
  }
}