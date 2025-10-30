import pool from '../config/database';

export const createMessageTables = async () => {
  try {
    // Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participant_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_message_id UUID,
        last_message_at TIMESTAMP WITH TIME ZONE,
        participant_1_unread_count INTEGER DEFAULT 0,
        participant_2_unread_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(participant_1_id, participant_2_id),
        CHECK (participant_1_id != participant_2_id)
      )
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image')),
        file_url TEXT,
        file_name TEXT,
        file_size INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_participants 
      ON conversations(participant_1_id, participant_2_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
      ON conversations(last_message_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
      ON messages(conversation_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender 
      ON messages(sender_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_receiver 
      ON messages(receiver_id, is_read, created_at DESC)
    `);

    // Create trigger to update conversation last_message_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_conversation_last_message()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE conversations 
        SET 
          last_message_id = NEW.id,
          last_message_at = NEW.created_at,
          participant_1_unread_count = CASE 
            WHEN participant_1_id = NEW.receiver_id THEN participant_1_unread_count + 1
            ELSE participant_1_unread_count
          END,
          participant_2_unread_count = CASE 
            WHEN participant_2_id = NEW.receiver_id THEN participant_2_unread_count + 1
            ELSE participant_2_unread_count
          END,
          updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
      CREATE TRIGGER trigger_update_conversation_last_message
        AFTER INSERT ON messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_last_message();
    `);

    // Create trigger to update unread counts when messages are read
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_conversation_unread_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
          UPDATE conversations 
          SET 
            participant_1_unread_count = CASE 
              WHEN participant_1_id = NEW.receiver_id THEN GREATEST(participant_1_unread_count - 1, 0)
              ELSE participant_1_unread_count
            END,
            participant_2_unread_count = CASE 
              WHEN participant_2_id = NEW.receiver_id THEN GREATEST(participant_2_unread_count - 1, 0)
              ELSE participant_2_unread_count
            END,
            updated_at = NOW()
          WHERE id = NEW.conversation_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_conversation_unread_count ON messages;
      CREATE TRIGGER trigger_update_conversation_unread_count
        AFTER UPDATE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_unread_count();
    `);

    // Create user presence table for online status
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_presence (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        socket_id TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create typing indicators table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_typing BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(conversation_id, user_id)
      )
    `);

    console.log('✅ Message tables created successfully');
  } catch (error) {
    console.error('❌ Error creating message tables:', error);
    throw error;
  }
};

export const dropMessageTables = async () => {
  try {
    await pool.query('DROP TABLE IF EXISTS typing_indicators CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_presence CASCADE');
    await pool.query('DROP TABLE IF EXISTS messages CASCADE');
    await pool.query('DROP TABLE IF EXISTS conversations CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_conversation_last_message() CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_conversation_unread_count() CASCADE');
    
    console.log('✅ Message tables dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping message tables:', error);
    throw error;
  }
};