import pool from '../config/database';

export const createJobsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      duration VARCHAR(100) NOT NULL,
      pay_rate DECIMAL(10,2) NOT NULL,
      pay_type VARCHAR(20) NOT NULL CHECK (pay_type IN ('hourly', 'fixed', 'negotiable')),
      location VARCHAR(255) NOT NULL,
      work_type VARCHAR(20) NOT NULL CHECK (work_type IN ('remote', 'onsite', 'hybrid')),
      required_skills TEXT[] NOT NULL,
      recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
      applications_count INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_work_type ON jobs(work_type);
    CREATE INDEX IF NOT EXISTS idx_jobs_pay_type ON jobs(pay_type);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_required_skills ON jobs USING GIN(required_skills);
    CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
    
    -- Full text search index
    CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs USING GIN(to_tsvector('english', title || ' ' || description));
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
    CREATE TRIGGER update_jobs_updated_at
        BEFORE UPDATE ON jobs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Jobs table created successfully');
  } catch (error) {
    console.error('❌ Error creating jobs table:', error);
    throw error;
  }
};

export const createApplicationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'withdrawn')),
      cover_letter TEXT,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(job_id, student_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at);
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
    CREATE TRIGGER update_applications_updated_at
        BEFORE UPDATE ON applications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Applications table created successfully');
  } catch (error) {
    console.error('❌ Error creating applications table:', error);
    throw error;
  }
};

export const createJobViewsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS job_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ip_address INET,
      viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_views_user_id ON job_views(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);
    CREATE INDEX IF NOT EXISTS idx_job_views_ip ON job_views(ip_address);
    
    -- Prevent duplicate views from same user/IP within short time
    CREATE UNIQUE INDEX IF NOT EXISTS idx_job_views_unique 
    ON job_views(job_id, COALESCE(user_id::text, ip_address::text), DATE_TRUNC('hour', viewed_at));
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Job views table created successfully');
  } catch (error) {
    console.error('❌ Error creating job views table:', error);
    throw error;
  }
};

export const createSavedJobsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS saved_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(job_id, student_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs(job_id);
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_student_id ON saved_jobs(student_id);
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_saved_at ON saved_jobs(saved_at);
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Saved jobs table created successfully');
  } catch (error) {
    console.error('❌ Error creating saved jobs table:', error);
    throw error;
  }
};

export const createJobCategoriesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS job_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      color VARCHAR(7), -- Hex color code
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Insert default categories
    INSERT INTO job_categories (name, description, icon, color) VALUES
    ('Technology', 'Software development, IT, and tech roles', '💻', '#3B82F6'),
    ('Design', 'UI/UX, graphic design, and creative roles', '🎨', '#8B5CF6'),
    ('Marketing', 'Digital marketing, content, and promotion', '📢', '#EF4444'),
    ('Business', 'Consulting, strategy, and business development', '💼', '#059669'),
    ('Education', 'Teaching, tutoring, and educational content', '📚', '#F59E0B'),
    ('Healthcare', 'Medical, wellness, and health-related roles', '🏥', '#EC4899'),
    ('Finance', 'Accounting, financial analysis, and fintech', '💰', '#10B981'),
    ('Engineering', 'Mechanical, civil, and engineering roles', '⚙️', '#6366F1'),
    ('Creative', 'Writing, photography, and artistic work', '✨', '#F97316'),
    ('Other', 'Miscellaneous and unique opportunities', '🔧', '#6B7280')
    ON CONFLICT (name) DO NOTHING;
    
    CREATE INDEX IF NOT EXISTS idx_job_categories_name ON job_categories(name);
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Job categories table created successfully');
  } catch (error) {
    console.error('❌ Error creating job categories table:', error);
    throw error;
  }
};

export const createApplicationStatusHistoryTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS application_status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      old_status VARCHAR(20),
      new_status VARCHAR(20) NOT NULL,
      changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON application_status_history(application_id);
    CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at ON application_status_history(changed_at);
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Application status history table created successfully');
  } catch (error) {
    console.error('❌ Error creating application status history table:', error);
    throw error;
  }
};

export const runJobMigrations = async () => {
  console.log('🚀 Running job-related database migrations...');
  
  try {
    await createJobsTable();
    await createApplicationsTable();
    await createJobViewsTable();
    await createSavedJobsTable();
    await createJobCategoriesTable();
    await createApplicationStatusHistoryTable();
    console.log('✅ All job migrations completed successfully');
  } catch (error) {
    console.error('❌ Job migration failed:', error);
    throw error;
  }
};