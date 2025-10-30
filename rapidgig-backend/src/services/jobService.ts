import pool from '../config/database';
import { Job, Application, CreateJobData, UpdateJobData, CreateApplicationData, UpdateApplicationData } from '../models/Job';
import { ProfileService } from './profileService';

export class JobService {
  // Job CRUD Operations
  static async createJob(data: CreateJobData): Promise<Job> {
    const query = `
      INSERT INTO jobs (
        title, description, category, duration, pay_rate, pay_type,
        location, work_type, required_skills, recruiter_id, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      data.title,
      data.description,
      data.category,
      data.duration,
      data.pay_rate,
      data.pay_type,
      data.location,
      data.work_type,
      data.required_skills,
      data.recruiter_id,
      data.expires_at || null
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getJobById(id: string): Promise<Job | null> {
    const query = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE j.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getJobs(filters: {
    category?: string;
    work_type?: string;
    pay_type?: string;
    location?: string;
    required_skills?: string[];
    min_pay?: number;
    max_pay?: number;
    recruiter_id?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Job[]> {
    let query = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;
    
    // Add filters
    if (filters.status) {
      query += ` AND j.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    } else {
      query += ` AND j.status = 'active'`;
    }
    
    if (filters.category) {
      query += ` AND j.category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }
    
    if (filters.work_type) {
      query += ` AND j.work_type = $${paramCount}`;
      values.push(filters.work_type);
      paramCount++;
    }
    
    if (filters.pay_type) {
      query += ` AND j.pay_type = $${paramCount}`;
      values.push(filters.pay_type);
      paramCount++;
    }
    
    if (filters.location) {
      query += ` AND j.location ILIKE $${paramCount}`;
      values.push(`%${filters.location}%`);
      paramCount++;
    }
    
    if (filters.required_skills && filters.required_skills.length > 0) {
      query += ` AND j.required_skills && $${paramCount}`;
      values.push(filters.required_skills);
      paramCount++;
    }
    
    if (filters.min_pay) {
      query += ` AND j.pay_rate >= $${paramCount}`;
      values.push(filters.min_pay);
      paramCount++;
    }
    
    if (filters.max_pay) {
      query += ` AND j.pay_rate <= $${paramCount}`;
      values.push(filters.max_pay);
      paramCount++;
    }
    
    if (filters.recruiter_id) {
      query += ` AND j.recruiter_id = $${paramCount}`;
      values.push(filters.recruiter_id);
      paramCount++;
    }
    
    if (filters.search) {
      query += ` AND (j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }
    
    // Add ordering and pagination
    query += ` ORDER BY j.created_at DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
      
      if (filters.offset) {
        query += ` OFFSET $${paramCount}`;
        values.push(filters.offset);
        paramCount++;
      }
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateJob(id: string, data: UpdateJobData): Promise<Job | null> {
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
      UPDATE jobs 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteJob(id: string, recruiterId: string): Promise<boolean> {
    const query = 'DELETE FROM jobs WHERE id = $1 AND recruiter_id = $2';
    const result = await pool.query(query, [id, recruiterId]);
    return result.rowCount > 0;
  }

  static async incrementViews(jobId: string, userId?: string, ipAddress?: string): Promise<void> {
    try {
      // Record the view
      const viewQuery = `
        INSERT INTO job_views (job_id, user_id, ip_address)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `;
      
      await pool.query(viewQuery, [jobId, userId || null, ipAddress || null]);
      
      // Increment view count
      const updateQuery = `
        UPDATE jobs 
        SET views = views + 1 
        WHERE id = $1
      `;
      
      await pool.query(updateQuery, [jobId]);
    } catch (error) {
      // Ignore duplicate view errors
      console.log('View already recorded or error:', error);
    }
  }

  // Application Operations
  static async createApplication(data: CreateApplicationData): Promise<Application> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create application
      const applicationQuery = `
        INSERT INTO applications (job_id, student_id, cover_letter)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const applicationResult = await client.query(applicationQuery, [
        data.job_id,
        data.student_id,
        data.cover_letter || null
      ]);
      
      // Increment applications count on job
      const updateJobQuery = `
        UPDATE jobs 
        SET applications_count = applications_count + 1 
        WHERE id = $1
      `;
      
      await client.query(updateJobQuery, [data.job_id]);
      
      // Update user stats
      await ProfileService.incrementUserStat(data.student_id, 'jobs_applied');
      
      await client.query('COMMIT');
      return applicationResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getApplicationById(id: string): Promise<Application | null> {
    const query = `
      SELECT a.*, 
             u.full_name as student_name,
             u.profile_picture as student_avatar,
             u.skills as student_skills,
             j.title as job_title
      FROM applications a
      JOIN users u ON a.student_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getJobApplications(jobId: string, status?: string): Promise<Application[]> {
    let query = `
      SELECT a.*, 
             u.full_name as student_name,
             u.profile_picture as student_avatar,
             u.skills as student_skills
      FROM applications a
      JOIN users u ON a.student_id = u.id
      WHERE a.job_id = $1
    `;
    
    const values = [jobId];
    
    if (status) {
      query += ` AND a.status = $2`;
      values.push(status);
    }
    
    query += ` ORDER BY a.applied_at DESC`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getStudentApplications(studentId: string, status?: string): Promise<Application[]> {
    let query = `
      SELECT a.*, 
             j.title as job_title,
             j.company_name,
             j.pay_rate,
             j.pay_type,
             j.location,
             j.work_type
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.student_id = $1
    `;
    
    const values = [studentId];
    
    if (status) {
      query += ` AND a.status = $2`;
      values.push(status);
    }
    
    query += ` ORDER BY a.applied_at DESC`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateApplication(id: string, data: UpdateApplicationData, changedBy?: string): Promise<Application | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current application
      const currentQuery = 'SELECT * FROM applications WHERE id = $1';
      const currentResult = await client.query(currentQuery, [id]);
      const currentApp = currentResult.rows[0];
      
      if (!currentApp) {
        throw new Error('Application not found');
      }
      
      // Update application
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
      const updateQuery = `
        UPDATE applications 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, values);
      
      // Record status change if status was updated
      if (data.status && data.status !== currentApp.status) {
        const historyQuery = `
          INSERT INTO application_status_history (application_id, old_status, new_status, changed_by)
          VALUES ($1, $2, $3, $4)
        `;
        
        await client.query(historyQuery, [
          id,
          currentApp.status,
          data.status,
          changedBy || null
        ]);
      }
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async withdrawApplication(applicationId: string, studentId: string): Promise<boolean> {
    const query = `
      UPDATE applications 
      SET status = 'withdrawn' 
      WHERE id = $1 AND student_id = $2 AND status = 'pending'
      RETURNING id
    `;
    
    const result = await pool.query(query, [applicationId, studentId]);
    return result.rowCount > 0;
  }

  // Saved Jobs Operations
  static async saveJob(jobId: string, studentId: string): Promise<void> {
    const query = `
      INSERT INTO saved_jobs (job_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT (job_id, student_id) DO NOTHING
    `;
    
    await pool.query(query, [jobId, studentId]);
  }

  static async unsaveJob(jobId: string, studentId: string): Promise<void> {
    const query = 'DELETE FROM saved_jobs WHERE job_id = $1 AND student_id = $2';
    await pool.query(query, [jobId, studentId]);
  }

  static async getSavedJobs(studentId: string): Promise<Job[]> {
    const query = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo,
             sj.saved_at
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      JOIN users u ON j.recruiter_id = u.id
      WHERE sj.student_id = $1
      ORDER BY sj.saved_at DESC
    `;
    
    const result = await pool.query(query, [studentId]);
    return result.rows;
  }

  static async isJobSaved(jobId: string, studentId: string): Promise<boolean> {
    const query = 'SELECT id FROM saved_jobs WHERE job_id = $1 AND student_id = $2';
    const result = await pool.query(query, [jobId, studentId]);
    return result.rowCount > 0;
  }

  // Utility Methods
  static async getJobCategories(): Promise<any[]> {
    const query = 'SELECT * FROM job_categories ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getRecommendedJobs(studentId: string, limit: number = 10): Promise<Job[]> {
    const { MatchingService } = await import('./matchingService');
    
    // Try personalized recommendations first
    let recommendations = await MatchingService.getPersonalizedRecommendations(studentId, limit);
    
    // If not enough personalized recommendations, supplement with history-based
    if (recommendations.length < limit) {
      const historyBased = await MatchingService.getRecommendationsBasedOnHistory(
        studentId, 
        limit - recommendations.length
      );
      recommendations = [...recommendations, ...historyBased];
    }
    
    // If still not enough, add general recommendations for new users
    if (recommendations.length < limit) {
      const newUserRecs = await MatchingService.getRecommendationsForNewUsers(
        limit - recommendations.length
      );
      recommendations = [...recommendations, ...newUserRecs];
    }
    
    // Remove duplicates and limit results
    const uniqueRecommendations = recommendations.filter((job, index, self) => 
      index === self.findIndex(j => j.id === job.id)
    );
    
    return uniqueRecommendations.slice(0, limit);
  }

  static async getTrendingJobs(limit: number = 10): Promise<Job[]> {
    const query = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo,
             COUNT(jv.id) as recent_views
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      LEFT JOIN job_views jv ON j.id = jv.job_id 
        AND jv.viewed_at > NOW() - INTERVAL '7 days'
      WHERE j.status = 'active'
      GROUP BY j.id, u.full_name, u.profile_picture, u.company_name, u.company_logo
      ORDER BY recent_views DESC, j.applications_count DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}