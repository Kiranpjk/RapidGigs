import pool from '../config/database';
import { Video, CreateVideoData, UpdateVideoData } from '../models/Video';
import { ProfileService } from './profileService';

export class VideoService {
  static async createVideo(data: CreateVideoData): Promise<Video> {
    const query = `
      INSERT INTO videos (
        title, description, tags, category, duration, 
        file_url, thumbnail_url, user_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      data.title,
      data.description,
      data.tags,
      data.category,
      data.duration,
      data.file_url,
      data.thumbnail_url || null,
      data.user_id,
      data.status || 'processing'
    ];
    
    const result = await pool.query(query, values);
    const video = result.rows[0];
    
    // Update user stats
    await ProfileService.incrementUserStat(data.user_id, 'videos_uploaded');
    
    return video;
  }

  static async getVideoById(id: string): Promise<Video | null> {
    const query = `
      SELECT v.*, u.full_name as user_name, u.profile_picture as user_avatar
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getUserVideos(userId: string, limit: number = 20, offset: number = 0): Promise<Video[]> {
    const query = `
      SELECT * FROM videos 
      WHERE user_id = $1 AND status = 'ready'
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  static async getVideosFeed(limit: number = 20, offset: number = 0, category?: string): Promise<Video[]> {
    let query = `
      SELECT v.*, u.full_name as user_name, u.profile_picture as user_avatar
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.status = 'ready'
    `;
    
    const values: any[] = [];
    let paramCount = 1;
    
    if (category) {
      query += ` AND v.category = $${paramCount}`;
      values.push(category);
      paramCount++;
    }
    
    query += ` ORDER BY v.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async searchVideos(searchQuery: string, filters: {
    category?: string;
    tags?: string[];
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Video[]> {
    let query = `
      SELECT v.*, u.full_name as user_name, u.profile_picture as user_avatar
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.status = 'ready'
    `;
    
    const values: any[] = [];
    let paramCount = 1;
    
    if (searchQuery) {
      query += ` AND (v.title ILIKE $${paramCount} OR v.description ILIKE $${paramCount})`;
      values.push(`%${searchQuery}%`);
      paramCount++;
    }
    
    if (filters.category) {
      query += ` AND v.category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query += ` AND v.tags && $${paramCount}`;
      values.push(filters.tags);
      paramCount++;
    }
    
    if (filters.userId) {
      query += ` AND v.user_id = $${paramCount}`;
      values.push(filters.userId);
      paramCount++;
    }
    
    query += ` ORDER BY v.views DESC, v.created_at DESC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(filters.limit || 20, filters.offset || 0);
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateVideo(id: string, data: UpdateVideoData): Promise<Video | null> {
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
    
    values.push(id);
    const query = `
      UPDATE videos 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteVideo(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM videos WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    
    if (result.rowCount > 0) {
      // Update user stats
      await ProfileService.incrementUserStat(userId, 'videos_uploaded', -1);
      return true;
    }
    
    return false;
  }

  static async incrementViews(videoId: string, userId?: string, ipAddress?: string): Promise<void> {
    try {
      // Record the view
      const viewQuery = `
        INSERT INTO video_views (video_id, user_id, ip_address)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `;
      
      await pool.query(viewQuery, [videoId, userId || null, ipAddress || null]);
      
      // Increment view count
      const updateQuery = `
        UPDATE videos 
        SET views = views + 1 
        WHERE id = $1
      `;
      
      await pool.query(updateQuery, [videoId]);
      
      // Update user stats if we have the video owner
      const videoQuery = 'SELECT user_id FROM videos WHERE id = $1';
      const videoResult = await pool.query(videoQuery, [videoId]);
      
      if (videoResult.rows[0]) {
        await ProfileService.incrementUserStat(videoResult.rows[0].user_id, 'videos_views');
      }
    } catch (error) {
      // Ignore duplicate view errors
      console.log('View already recorded or error:', error);
    }
  }

  static async likeVideo(videoId: string, userId: string, likeType: 'like' | 'dislike'): Promise<void> {
    const query = `
      INSERT INTO video_likes (video_id, user_id, like_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (video_id, user_id) 
      DO UPDATE SET like_type = $3
    `;
    
    await pool.query(query, [videoId, userId, likeType]);
  }

  static async removeLike(videoId: string, userId: string): Promise<void> {
    const query = 'DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2';
    await pool.query(query, [videoId, userId]);
  }

  static async getVideoLikes(videoId: string): Promise<{ likes: number; dislikes: number }> {
    const query = `
      SELECT 
        COUNT(CASE WHEN like_type = 'like' THEN 1 END) as likes,
        COUNT(CASE WHEN like_type = 'dislike' THEN 1 END) as dislikes
      FROM video_likes 
      WHERE video_id = $1
    `;
    
    const result = await pool.query(query, [videoId]);
    const row = result.rows[0];
    
    return {
      likes: parseInt(row.likes) || 0,
      dislikes: parseInt(row.dislikes) || 0
    };
  }

  static async addComment(videoId: string, userId: string, content: string, parentId?: string): Promise<any> {
    const query = `
      INSERT INTO video_comments (video_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [videoId, userId, content, parentId || null]);
    return result.rows[0];
  }

  static async getVideoComments(videoId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const query = `
      SELECT 
        vc.*,
        u.full_name as user_name,
        u.profile_picture as user_avatar
      FROM video_comments vc
      JOIN users u ON vc.user_id = u.id
      WHERE vc.video_id = $1
      ORDER BY vc.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [videoId, limit, offset]);
    return result.rows;
  }

  static async getVideoCategories(): Promise<string[]> {
    const query = `
      SELECT DISTINCT category 
      FROM videos 
      WHERE status = 'ready' 
      ORDER BY category
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => row.category);
  }

  static async getTrendingVideos(limit: number = 20): Promise<Video[]> {
    // Get videos with high view counts in the last 7 days
    const query = `
      SELECT v.*, u.full_name as user_name, u.profile_picture as user_avatar,
             COUNT(vv.id) as recent_views
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN video_views vv ON v.id = vv.video_id 
        AND vv.viewed_at > NOW() - INTERVAL '7 days'
      WHERE v.status = 'ready'
      GROUP BY v.id, u.full_name, u.profile_picture
      ORDER BY recent_views DESC, v.views DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}