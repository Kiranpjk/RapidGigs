import pool from '../config/database';
import { Application } from '../models/Job';

export class ApplicationWorkflowService {
  // Get application with full history and timeline
  static async getApplicationWithHistory(applicationId: string): Promise<any> {
    const query = `
      SELECT 
        a.*,
        u.full_name as student_name,
        u.profile_picture as student_avatar,
        u.skills as student_skills,
        u.university,
        u.graduation_year,
        j.title as job_title,
        j.company_name,
        j.pay_rate,
        j.pay_type,
        j.location,
        j.work_type,
        r.full_name as recruiter_name,
        r.company_name as recruiter_company
      FROM applications a
      JOIN users u ON a.student_id = u.id
      JOIN jobs j ON a.job_id = j.id
      JOIN users r ON j.recruiter_id = r.id
      WHERE a.id = $1
    `;
    
    const applicationResult = await pool.query(query, [applicationId]);
    const application = applicationResult.rows[0];
    
    if (!application) {
      return null;
    }
    
    // Get status history
    const historyQuery = `
      SELECT 
        ash.*,
        u.full_name as changed_by_name
      FROM application_status_history ash
      LEFT JOIN users u ON ash.changed_by = u.id
      WHERE ash.application_id = $1
      ORDER BY ash.changed_at ASC
    `;
    
    const historyResult = await pool.query(historyQuery, [applicationId]);
    
    return {
      ...application,
      status_history: historyResult.rows
    };
  }

  // Get application statistics for a recruiter
  static async getRecruiterApplicationStats(recruiterId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END) as reviewed_count,
        COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN a.applied_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_applications,
        AVG(EXTRACT(EPOCH FROM (
          CASE 
            WHEN a.status != 'pending' THEN a.updated_at - a.applied_at
            ELSE NULL
          END
        )) / 3600) as avg_response_time_hours
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.recruiter_id = $1
    `;
    
    const result = await pool.query(query, [recruiterId]);
    return result.rows[0];
  }

  // Get application statistics for a student
  static async getStudentApplicationStats(studentId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END) as reviewed_count,
        COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN a.status = 'withdrawn' THEN 1 END) as withdrawn_count,
        COUNT(CASE WHEN a.applied_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_applications,
        ROUND(
          COUNT(CASE WHEN a.status = 'accepted' THEN 1 END)::numeric / 
          NULLIF(COUNT(CASE WHEN a.status IN ('accepted', 'rejected') THEN 1 END), 0) * 100, 
          2
        ) as success_rate
      FROM applications a
      WHERE a.student_id = $1
    `;
    
    const result = await pool.query(query, [studentId]);
    return result.rows[0];
  }

  // Bulk update application statuses
  static async bulkUpdateApplicationStatus(
    applicationIds: string[], 
    newStatus: string, 
    recruiterId: string,
    notes?: string
  ): Promise<Application[]> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify all applications belong to recruiter's jobs
      const verifyQuery = `
        SELECT a.id, a.status as current_status
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = ANY($1) AND j.recruiter_id = $2
      `;
      
      const verifyResult = await client.query(verifyQuery, [applicationIds, recruiterId]);
      
      if (verifyResult.rows.length !== applicationIds.length) {
        throw new Error('Some applications not found or access denied');
      }
      
      // Update applications
      const updateQuery = `
        UPDATE applications 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($2)
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [newStatus, applicationIds]);
      
      // Record status history for each application
      for (const app of verifyResult.rows) {
        const historyQuery = `
          INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, notes)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        await client.query(historyQuery, [
          app.id,
          app.current_status,
          newStatus,
          recruiterId,
          notes || `Bulk status update to ${newStatus}`
        ]);
      }
      
      await client.query('COMMIT');
      return updateResult.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get applications requiring attention (pending for too long)
  static async getApplicationsRequiringAttention(recruiterId: string): Promise<Application[]> {
    const query = `
      SELECT 
        a.*,
        u.full_name as student_name,
        u.profile_picture as student_avatar,
        j.title as job_title,
        EXTRACT(EPOCH FROM (NOW() - a.applied_at)) / 3600 as hours_pending
      FROM applications a
      JOIN users u ON a.student_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE j.recruiter_id = $1
        AND a.status = 'pending'
        AND a.applied_at < NOW() - INTERVAL '48 hours'
      ORDER BY a.applied_at ASC
    `;
    
    const result = await pool.query(query, [recruiterId]);
    return result.rows;
  }

  // Get application timeline for display
  static async getApplicationTimeline(applicationId: string): Promise<any[]> {
    const query = `
      SELECT 
        'status_change' as event_type,
        ash.old_status,
        ash.new_status,
        ash.notes,
        ash.changed_at as event_date,
        u.full_name as actor_name,
        u.role as actor_role
      FROM application_status_history ash
      LEFT JOIN users u ON ash.changed_by = u.id
      WHERE ash.application_id = $1
      
      UNION ALL
      
      SELECT 
        'application_submitted' as event_type,
        NULL as old_status,
        'pending' as new_status,
        'Application submitted' as notes,
        a.applied_at as event_date,
        u.full_name as actor_name,
        u.role as actor_role
      FROM applications a
      JOIN users u ON a.student_id = u.id
      WHERE a.id = $1
      
      ORDER BY event_date ASC
    `;
    
    const result = await pool.query(query, [applicationId]);
    return result.rows;
  }

  // Auto-update old pending applications
  static async autoUpdateStaleApplications(): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Find applications pending for more than 30 days
      const staleQuery = `
        SELECT a.id, a.student_id, j.recruiter_id
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.status = 'pending'
          AND a.applied_at < NOW() - INTERVAL '30 days'
      `;
      
      const staleResult = await client.query(staleQuery);
      
      if (staleResult.rows.length > 0) {
        const applicationIds = staleResult.rows.map(row => row.id);
        
        // Update to 'expired' status
        const updateQuery = `
          UPDATE applications 
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1)
        `;
        
        await client.query(updateQuery, [applicationIds]);
        
        // Record status history
        for (const app of staleResult.rows) {
          const historyQuery = `
            INSERT INTO application_status_history (application_id, old_status, new_status, notes)
            VALUES ($1, 'pending', 'expired', 'Auto-expired after 30 days')
          `;
          
          await client.query(historyQuery, [app.id]);
        }
        
        console.log(`Auto-expired ${applicationIds.length} stale applications`);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error auto-updating stale applications:', error);
    } finally {
      client.release();
    }
  }

  // Get application conversion funnel data
  static async getApplicationFunnelData(recruiterId: string, timeframe: string = '30 days'): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END) as reviewed,
        COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected,
        ROUND(
          COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 2
        ) as review_rate,
        ROUND(
          COUNT(CASE WHEN a.status = 'accepted' THEN 1 END)::numeric / 
          NULLIF(COUNT(CASE WHEN a.status IN ('accepted', 'rejected') THEN 1 END), 0) * 100, 2
        ) as acceptance_rate
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.recruiter_id = $1
        AND a.applied_at > NOW() - INTERVAL '${timeframe}'
    `;
    
    const result = await pool.query(query, [recruiterId]);
    return result.rows[0];
  }

  // Send application status notifications (placeholder for notification system)
  static async sendApplicationStatusNotification(
    applicationId: string, 
    oldStatus: string, 
    newStatus: string
  ): Promise<void> {
    // This would integrate with your notification system
    // For now, just log the notification
    console.log(`Application ${applicationId} status changed from ${oldStatus} to ${newStatus}`);
    
    // TODO: Implement actual notification sending
    // - Email notifications
    // - In-app notifications
    // - Push notifications
  }

  // Get recommended next actions for applications
  static async getRecommendedActions(recruiterId: string): Promise<any[]> {
    const query = `
      SELECT 
        'review_pending' as action_type,
        'Review pending applications' as action_title,
        COUNT(*) as count,
        'Applications waiting for your review' as description
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.recruiter_id = $1 AND a.status = 'pending'
      HAVING COUNT(*) > 0
      
      UNION ALL
      
      SELECT 
        'follow_up_reviewed' as action_type,
        'Follow up on reviewed applications' as action_title,
        COUNT(*) as count,
        'Applications reviewed but no final decision made' as description
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.recruiter_id = $1 
        AND a.status = 'reviewed' 
        AND a.updated_at < NOW() - INTERVAL '7 days'
      HAVING COUNT(*) > 0
      
      UNION ALL
      
      SELECT 
        'update_stale' as action_type,
        'Update stale applications' as action_title,
        COUNT(*) as count,
        'Applications pending for more than 2 weeks' as description
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.recruiter_id = $1 
        AND a.status = 'pending' 
        AND a.applied_at < NOW() - INTERVAL '14 days'
      HAVING COUNT(*) > 0
    `;
    
    const result = await pool.query(query, [recruiterId]);
    return result.rows;
  }
}