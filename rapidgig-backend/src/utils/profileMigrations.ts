import pool from '../config/database';

export const createUserPreferencesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email_notifications BOOLEAN DEFAULT TRUE,
      push_notifications BOOLEAN DEFAULT TRUE,
      job_alerts BOOLEAN DEFAULT TRUE,
      marketing_emails BOOLEAN DEFAULT FALSE,
      preferred_job_types TEXT[],
      preferred_locations TEXT[],
      salary_range_min INTEGER,
      salary_range_max INTEGER,
      availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'not_looking')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(user_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_availability ON user_preferences(availability_status);
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
    CREATE TRIGGER update_user_preferences_updated_at
        BEFORE UPDATE ON user_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ User preferences table created successfully');
  } catch (error) {
    console.error('❌ Error creating user preferences table:', error);
    throw error;
  }
};

export const createUserConnectionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS user_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(requester_id, addressee_id),
      CHECK (requester_id != addressee_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_user_connections_requester ON user_connections(requester_id);
    CREATE INDEX IF NOT EXISTS idx_user_connections_addressee ON user_connections(addressee_id);
    CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_user_connections_updated_at ON user_connections;
    CREATE TRIGGER update_user_connections_updated_at
        BEFORE UPDATE ON user_connections
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ User connections table created successfully');
  } catch (error) {
    console.error('❌ Error creating user connections table:', error);
    throw error;
  }
};

export const createUserStatsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS user_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_views INTEGER DEFAULT 0,
      jobs_applied INTEGER DEFAULT 0,
      jobs_completed INTEGER DEFAULT 0,
      total_earnings DECIMAL(10,2) DEFAULT 0.00,
      average_rating DECIMAL(3,2) DEFAULT 0.00,
      total_reviews INTEGER DEFAULT 0,
      videos_uploaded INTEGER DEFAULT 0,
      videos_views INTEGER DEFAULT 0,
      connections_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(user_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_rating ON user_stats(average_rating);
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
    CREATE TRIGGER update_user_stats_updated_at
        BEFORE UPDATE ON user_stats
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ User stats table created successfully');
  } catch (error) {
    console.error('❌ Error creating user stats table:', error);
    throw error;
  }
};

export const createFileUploadsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS file_uploads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('profile_picture', 'company_logo', 'video', 'document', 'other')),
      upload_status VARCHAR(20) DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_file_type ON file_uploads(file_type);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(upload_status);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_file_uploads_updated_at ON file_uploads;
    CREATE TRIGGER update_file_uploads_updated_at
        BEFORE UPDATE ON file_uploads
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ File uploads table created successfully');
  } catch (error) {
    console.error('❌ Error creating file uploads table:', error);
    throw error;
  }
};

export const runProfileMigrations = async () => {
  console.log('🚀 Running profile-related database migrations...');
  
  try {
    await createUserPreferencesTable();
    await createUserConnectionsTable();
    await createUserStatsTable();
    await createFileUploadsTable();
    console.log('✅ All profile migrations completed successfully');
  } catch (error) {
    console.error('❌ Profile migration failed:', error);
    throw error;
  }
};