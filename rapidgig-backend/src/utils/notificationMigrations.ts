import pool from '../config/database';

export const createNotificationTables = async () => {
  try {
    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN (
          'job_application', 'application_status', 'new_message', 
          'job_match', 'profile_view', 'video_like', 'system', 'reminder'
        )),
        data JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create notification preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        job_applications BOOLEAN DEFAULT TRUE,
        application_updates BOOLEAN DEFAULT TRUE,
        new_messages BOOLEAN DEFAULT TRUE,
        job_matches BOOLEAN DEFAULT TRUE,
        profile_activity BOOLEAN DEFAULT TRUE,
        marketing_emails BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create email templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT NOT NULL,
        variables TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create email queue table for reliable email delivery
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        to_email VARCHAR(255) NOT NULL,
        to_name VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        template_name VARCHAR(100),
        template_data JSONB,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retry')),
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error_message TEXT,
        scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
      ON notifications(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_unread 
      ON notifications(user_id, is_read, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type 
      ON notifications(type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status 
      ON email_queue(status, scheduled_at)
    `);

    // Create trigger to update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
      CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE ON notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
      CREATE TRIGGER update_notification_preferences_updated_at
        BEFORE UPDATE ON notification_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;
      CREATE TRIGGER update_email_queue_updated_at
        BEFORE UPDATE ON email_queue
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Insert default email templates
    await pool.query(`
      INSERT INTO email_templates (name, subject, html_content, text_content, variables)
      VALUES 
        (
          'job_application_received',
          'New Application for {{job_title}}',
          '<h2>New Job Application</h2><p>You have received a new application for <strong>{{job_title}}</strong> from {{applicant_name}}.</p><p><a href="{{application_url}}">View Application</a></p>',
          'New Job Application\n\nYou have received a new application for {{job_title}} from {{applicant_name}}.\n\nView Application: {{application_url}}',
          ARRAY['job_title', 'applicant_name', 'application_url']
        ),
        (
          'application_status_update',
          'Application Status Update - {{job_title}}',
          '<h2>Application Status Update</h2><p>Your application for <strong>{{job_title}}</strong> has been {{status}}.</p><p><a href="{{job_url}}">View Job</a></p>',
          'Application Status Update\n\nYour application for {{job_title}} has been {{status}}.\n\nView Job: {{job_url}}',
          ARRAY['job_title', 'status', 'job_url']
        ),
        (
          'new_message',
          'New Message from {{sender_name}}',
          '<h2>New Message</h2><p>You have received a new message from <strong>{{sender_name}}</strong>.</p><p>{{message_preview}}</p><p><a href="{{message_url}}">View Message</a></p>',
          'New Message\n\nYou have received a new message from {{sender_name}}.\n\n{{message_preview}}\n\nView Message: {{message_url}}',
          ARRAY['sender_name', 'message_preview', 'message_url']
        ),
        (
          'job_match',
          'New Job Match - {{job_title}}',
          '<h2>New Job Match</h2><p>We found a job that matches your skills: <strong>{{job_title}}</strong> at {{company_name}}.</p><p><a href="{{job_url}}">View Job</a></p>',
          'New Job Match\n\nWe found a job that matches your skills: {{job_title}} at {{company_name}}.\n\nView Job: {{job_url}}',
          ARRAY['job_title', 'company_name', 'job_url']
        ),
        (
          'welcome',
          'Welcome to RapidGig!',
          '<h2>Welcome to RapidGig!</h2><p>Hi {{user_name}},</p><p>Welcome to RapidGig! We''re excited to have you join our community.</p><p><a href="{{platform_url}}">Get Started</a></p>',
          'Welcome to RapidGig!\n\nHi {{user_name}},\n\nWelcome to RapidGig! We''re excited to have you join our community.\n\nGet Started: {{platform_url}}',
          ARRAY['user_name', 'platform_url']
        )
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('✅ Notification tables created successfully');
  } catch (error) {
    console.error('❌ Error creating notification tables:', error);
    throw error;
  }
};

export const dropNotificationTables = async () => {
  try {
    await pool.query('DROP TABLE IF EXISTS email_queue CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_templates CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS notifications CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    
    console.log('✅ Notification tables dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping notification tables:', error);
    throw error;
  }
};