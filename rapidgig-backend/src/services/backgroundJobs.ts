import { MatchingService } from './matchingService';
import { EmailService } from './emailService';
import pool from '../config/database';

export class BackgroundJobService {
  private static intervals: NodeJS.Timeout[] = [];
  
  /**
   * Start all background jobs
   */
  static startAll() {
    console.log('🚀 Starting background jobs...');
    
    // Update user preferences based on interactions every hour
    const matchingInterval = setInterval(async () => {
      try {
        // Get all active students and update their preferences
        const studentsQuery = 'SELECT id FROM users WHERE role = $1 AND is_active = true';
        const studentsResult = await pool.query(studentsQuery, ['student']);
        
        for (const student of studentsResult.rows) {
          await MatchingService.updateUserPreferencesFromInteractions(student.id);
        }
        
        console.log(`✅ Updated preferences for ${studentsResult.rows.length} students`);
      } catch (error) {
        console.error('Error updating user preferences:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    this.intervals.push(matchingInterval);
    
    // Clean up expired jobs every day
    const cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredJobs();
      } catch (error) {
        console.error('Error cleaning up expired jobs:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    this.intervals.push(cleanupInterval);
    
    // Process email queue every 30 seconds
    const emailInterval = setInterval(async () => {
      try {
        await EmailService.processEmailQueue();
      } catch (error) {
        console.error('Error processing email queue:', error);
      }
    }, 30 * 1000); // 30 seconds
    
    this.intervals.push(emailInterval);
    
    console.log('✅ Background jobs started');
  }
  
  /**
   * Stop all background jobs
   */
  static stopAll() {
    console.log('🛑 Stopping background jobs...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('✅ Background jobs stopped');
  }
  
  /**
   * Clean up expired jobs
   */
  private static async cleanupExpiredJobs() {
    console.log('🧹 Cleaning up expired jobs...');
    
    const query = `
      UPDATE jobs 
      SET status = 'closed' 
      WHERE status = 'active' 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW()
    `;
    
    const result = await pool.query(query);
    console.log(`✅ Closed ${result.rowCount} expired jobs`);
  }
}