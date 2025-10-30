import pool from '../config/database';

export const createVideosTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      tags TEXT[],
      category VARCHAR(100) NOT NULL,
      duration INTEGER NOT NULL, -- Duration in seconds
      file_url TEXT NOT NULL,
      thumbnail_url TEXT,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      views INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
    CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
    CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
    CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
    CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views);
    CREATE INDEX IF NOT EXISTS idx_videos_tags ON videos USING GIN(tags);
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
    CREATE TRIGGER update_videos_updated_at
        BEFORE UPDATE ON videos
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Videos table created successfully');
  } catch (error) {
    console.error('❌ Error creating videos table:', error);
    throw error;
  }
};

export const createVideoViewsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS video_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ip_address INET,
      user_agent TEXT,
      viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      view_duration INTEGER DEFAULT 0 -- Duration watched in seconds
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
    CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON video_views(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_views_viewed_at ON video_views(viewed_at);
    CREATE INDEX IF NOT EXISTS idx_video_views_ip ON video_views(ip_address);
    
    -- Prevent duplicate views from same user/IP within short time
    CREATE UNIQUE INDEX IF NOT EXISTS idx_video_views_unique 
    ON video_views(video_id, COALESCE(user_id::text, ip_address::text), DATE_TRUNC('hour', viewed_at));
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Video views table created successfully');
  } catch (error) {
    console.error('❌ Error creating video views table:', error);
    throw error;
  }
};

export const createVideoLikesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS video_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      like_type VARCHAR(10) NOT NULL CHECK (like_type IN ('like', 'dislike')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(video_id, user_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
    CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON video_likes(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_likes_type ON video_likes(like_type);
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Video likes table created successfully');
  } catch (error) {
    console.error('❌ Error creating video likes table:', error);
    throw error;
  }
};

export const createVideoCommentsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS video_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES video_comments(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
    CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON video_comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_comments_parent_id ON video_comments(parent_id);
    CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON video_comments(created_at);
    
    -- Create trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_video_comments_updated_at ON video_comments;
    CREATE TRIGGER update_video_comments_updated_at
        BEFORE UPDATE ON video_comments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Video comments table created successfully');
  } catch (error) {
    console.error('❌ Error creating video comments table:', error);
    throw error;
  }
};

export const runVideoMigrations = async () => {
  console.log('🚀 Running video-related database migrations...');
  
  try {
    await createVideosTable();
    await createVideoViewsTable();
    await createVideoLikesTable();
    await createVideoCommentsTable();
    console.log('✅ All video migrations completed successfully');
  } catch (error) {
    console.error('❌ Video migration failed:', error);
    throw error;
  }
};