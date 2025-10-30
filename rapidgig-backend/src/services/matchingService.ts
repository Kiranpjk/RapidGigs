import pool from '../config/database';
import { Job } from '../models/Job';

export class MatchingService {
  // Calculate skill match score between user skills and job requirements
  static calculateSkillMatchScore(userSkills: string[], jobSkills: string[]): number {
    if (!userSkills || !jobSkills || userSkills.length === 0 || jobSkills.length === 0) {
      return 0;
    }

    const userSkillsLower = userSkills.map(skill => skill.toLowerCase());
    const jobSkillsLower = jobSkills.map(skill => skill.toLowerCase());
    
    const matchingSkills = userSkillsLower.filter(skill => 
      jobSkillsLower.some(jobSkill => 
        jobSkill.includes(skill) || skill.includes(jobSkill)
      )
    );
    
    return matchingSkills.length / jobSkillsLower.length;
  }

  // Get personalized job recommendations for a student
  static async getPersonalizedRecommendations(studentId: string, limit: number = 20): Promise<Job[]> {
    // Get user profile and preferences
    const userQuery = `
      SELECT u.skills, u.university, u.graduation_year,
             up.preferred_job_types, up.preferred_locations, 
             up.salary_range_min, up.salary_range_max
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `;
    
    const userResult = await pool.query(userQuery, [studentId]);
    const userProfile = userResult.rows[0];
    
    if (!userProfile) {
      return [];
    }

    // Get jobs with scoring
    let jobQuery = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo,
             -- Calculate base score
             CASE 
               WHEN j.required_skills && $2 THEN 
                 (SELECT COUNT(*) FROM unnest(j.required_skills) AS skill 
                  WHERE skill = ANY($2))::float / array_length(j.required_skills, 1)
               ELSE 0
             END as skill_match_score,
             -- Boost recent jobs
             CASE 
               WHEN j.created_at > NOW() - INTERVAL '7 days' THEN 0.2
               WHEN j.created_at > NOW() - INTERVAL '30 days' THEN 0.1
               ELSE 0
             END as recency_boost,
             -- Boost jobs with fewer applicants (less competition)
             CASE 
               WHEN j.applications_count < 5 THEN 0.15
               WHEN j.applications_count < 10 THEN 0.1
               WHEN j.applications_count < 20 THEN 0.05
               ELSE 0
             END as competition_boost
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE j.status = 'active'
        AND j.id NOT IN (
          SELECT job_id FROM applications WHERE student_id = $1
        )
    `;
    
    const values = [studentId, userProfile.skills || []];
    let paramCount = 3;

    // Filter by preferred locations if specified
    if (userProfile.preferred_locations && userProfile.preferred_locations.length > 0) {
      jobQuery += ` AND (j.work_type = 'remote' OR j.location = ANY($${paramCount}))`;
      values.push(userProfile.preferred_locations);
      paramCount++;
    }

    // Filter by salary range if specified
    if (userProfile.salary_range_min) {
      jobQuery += ` AND j.pay_rate >= $${paramCount}`;
      values.push(userProfile.salary_range_min);
      paramCount++;
    }

    if (userProfile.salary_range_max) {
      jobQuery += ` AND j.pay_rate <= $${paramCount}`;
      values.push(userProfile.salary_range_max);
      paramCount++;
    }

    // Order by combined score
    jobQuery += `
      ORDER BY (skill_match_score + recency_boost + competition_boost) DESC,
               j.views DESC,
               j.created_at DESC
      LIMIT $${paramCount}
    `;
    values.push(limit);

    const result = await pool.query(jobQuery, values);
    return result.rows;
  }

  // Get jobs similar to a given job (for "similar jobs" feature)
  static async getSimilarJobs(jobId: string, limit: number = 10): Promise<Job[]> {
    const jobQuery = 'SELECT * FROM jobs WHERE id = $1';
    const jobResult = await pool.query(jobQuery, [jobId]);
    const referenceJob = jobResult.rows[0];
    
    if (!referenceJob) {
      return [];
    }

    const similarQuery = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo,
             -- Calculate similarity score
             CASE 
               WHEN j.category = $2 THEN 0.3 ELSE 0
             END +
             CASE 
               WHEN j.work_type = $3 THEN 0.2 ELSE 0
             END +
             CASE 
               WHEN j.required_skills && $4 THEN 
                 (SELECT COUNT(*) FROM unnest(j.required_skills) AS skill 
                  WHERE skill = ANY($4))::float / array_length($4, 1) * 0.4
               ELSE 0
             END +
             CASE 
               WHEN ABS(j.pay_rate - $5) < ($5 * 0.2) THEN 0.1 ELSE 0
             END as similarity_score
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE j.status = 'active' 
        AND j.id != $1
      ORDER BY similarity_score DESC, j.created_at DESC
      LIMIT $6
    `;
    
    const result = await pool.query(similarQuery, [
      jobId,
      referenceJob.category,
      referenceJob.work_type,
      referenceJob.required_skills,
      referenceJob.pay_rate,
      limit
    ]);
    
    return result.rows;
  }

  // Get job recommendations based on user's application history
  static async getRecommendationsBasedOnHistory(studentId: string, limit: number = 15): Promise<Job[]> {
    // Get categories and skills from jobs the user has applied to
    const historyQuery = `
      SELECT j.category, j.required_skills, j.work_type, j.pay_type
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.student_id = $1
      ORDER BY a.applied_at DESC
      LIMIT 20
    `;
    
    const historyResult = await pool.query(historyQuery, [studentId]);
    const applicationHistory = historyResult.rows;
    
    if (applicationHistory.length === 0) {
      return [];
    }

    // Extract patterns from application history
    const categoryFreq: { [key: string]: number } = {};
    const skillFreq: { [key: string]: number } = {};
    const workTypeFreq: { [key: string]: number } = {};
    
    applicationHistory.forEach(app => {
      // Count categories
      categoryFreq[app.category] = (categoryFreq[app.category] || 0) + 1;
      
      // Count skills
      if (app.required_skills) {
        app.required_skills.forEach((skill: string) => {
          skillFreq[skill] = (skillFreq[skill] || 0) + 1;
        });
      }
      
      // Count work types
      workTypeFreq[app.work_type] = (workTypeFreq[app.work_type] || 0) + 1;
    });

    // Get top preferences
    const topCategories = Object.entries(categoryFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
    
    const topSkills = Object.entries(skillFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([skill]) => skill);

    // Find similar jobs
    const recommendationQuery = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo,
             -- Score based on historical preferences
             CASE 
               WHEN j.category = ANY($2) THEN 0.4 ELSE 0
             END +
             CASE 
               WHEN j.required_skills && $3 THEN 
                 (SELECT COUNT(*) FROM unnest(j.required_skills) AS skill 
                  WHERE skill = ANY($3))::float / array_length(j.required_skills, 1) * 0.5
               ELSE 0
             END +
             CASE 
               WHEN j.created_at > NOW() - INTERVAL '7 days' THEN 0.1
               ELSE 0
             END as preference_score
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE j.status = 'active'
        AND j.id NOT IN (
          SELECT job_id FROM applications WHERE student_id = $1
        )
        AND (j.category = ANY($2) OR j.required_skills && $3)
      ORDER BY preference_score DESC, j.created_at DESC
      LIMIT $4
    `;
    
    const result = await pool.query(recommendationQuery, [
      studentId,
      topCategories,
      topSkills,
      limit
    ]);
    
    return result.rows;
  }

  // Get nearby jobs based on location
  static async getNearbyJobs(location: string, radius: number = 50, limit: number = 20): Promise<Job[]> {
    const query = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE j.status = 'active'
        AND (j.work_type = 'remote' OR j.location ILIKE $1)
      ORDER BY 
        CASE WHEN j.work_type = 'remote' THEN 0 ELSE 1 END,
        j.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [`%${location}%`, limit]);
    return result.rows;
  }

  // Get trending jobs in specific categories
  static async getTrendingJobsByCategory(category: string, limit: number = 10): Promise<Job[]> {
    const query = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo,
             COUNT(jv.id) as recent_views,
             j.applications_count
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      LEFT JOIN job_views jv ON j.id = jv.job_id 
        AND jv.viewed_at > NOW() - INTERVAL '7 days'
      WHERE j.status = 'active' 
        AND j.category = $1
      GROUP BY j.id, u.full_name, u.profile_picture, u.company_name, u.company_logo
      ORDER BY recent_views DESC, j.applications_count DESC, j.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [category, limit]);
    return result.rows;
  }

  // Get job recommendations for new users (no history)
  static async getRecommendationsForNewUsers(limit: number = 20): Promise<Job[]> {
    const query = `
      SELECT j.*, 
             u.full_name as recruiter_name,
             u.profile_picture as recruiter_avatar,
             u.company_name,
             u.company_logo,
             -- Score based on general popularity and recency
             (j.views::float / GREATEST(j.applications_count, 1)) as view_to_application_ratio,
             CASE 
               WHEN j.created_at > NOW() - INTERVAL '3 days' THEN 0.3
               WHEN j.created_at > NOW() - INTERVAL '7 days' THEN 0.2
               WHEN j.created_at > NOW() - INTERVAL '14 days' THEN 0.1
               ELSE 0
             END as recency_score
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE j.status = 'active'
        AND j.applications_count < 50  -- Not too competitive
        AND j.views > 0  -- Has some interest
      ORDER BY (view_to_application_ratio + recency_score) DESC,
               j.created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Update user preferences based on job interactions
  static async updateUserPreferencesFromInteractions(studentId: string): Promise<void> {
    // Analyze user's job views, applications, and saved jobs to update preferences
    const interactionQuery = `
      SELECT 
        j.category,
        j.work_type,
        j.required_skills,
        'application' as interaction_type,
        a.applied_at as interaction_date
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.student_id = $1
        AND a.applied_at > NOW() - INTERVAL '90 days'
      
      UNION ALL
      
      SELECT 
        j.category,
        j.work_type,
        j.required_skills,
        'saved' as interaction_type,
        sj.saved_at as interaction_date
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      WHERE sj.student_id = $1
        AND sj.saved_at > NOW() - INTERVAL '90 days'
      
      UNION ALL
      
      SELECT 
        j.category,
        j.work_type,
        j.required_skills,
        'view' as interaction_type,
        jv.viewed_at as interaction_date
      FROM job_views jv
      JOIN jobs j ON jv.job_id = j.id
      WHERE jv.user_id = $1
        AND jv.viewed_at > NOW() - INTERVAL '30 days'
      
      ORDER BY interaction_date DESC
      LIMIT 100
    `;
    
    const result = await pool.query(interactionQuery, [studentId]);
    const interactions = result.rows;
    
    if (interactions.length === 0) {
      return;
    }

    // Analyze patterns with weighted scoring
    const categoryScores: { [key: string]: number } = {};
    const skillScores: { [key: string]: number } = {};
    
    interactions.forEach(interaction => {
      const weight = interaction.interaction_type === 'application' ? 3 : 
                    interaction.interaction_type === 'saved' ? 2 : 1;
      
      // Score categories
      categoryScores[interaction.category] = (categoryScores[interaction.category] || 0) + weight;
      
      // Score skills
      if (interaction.required_skills) {
        interaction.required_skills.forEach((skill: string) => {
          skillScores[skill] = (skillScores[skill] || 0) + weight;
        });
      }
    });

    // Get top preferences
    const topCategories = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    // Update user preferences (this would be implemented based on your preference system)
    const updateQuery = `
      INSERT INTO user_preferences (user_id, preferred_job_types)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        preferred_job_types = $2,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await pool.query(updateQuery, [studentId, topCategories]);
  }
}