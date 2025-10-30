import pool from '../config/database';
import { Message, Conversation, CreateMessageData, ConversationWithParticipants, MessageWithSender } from '../models/Message';

export class MessageService {
  /**
   * Create or get existing conversation between two users
   */
  static async getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
    // Ensure consistent ordering of participant IDs
    const [participant1, participant2] = [userId1, userId2].sort();
    
    // Try to find existing conversation
    const existingQuery = `
      SELECT * FROM conversations 
      WHERE (participant_1_id = $1 AND participant_2_id = $2)
         OR (participant_1_id = $2 AND participant_2_id = $1)
    `;
    
    const existingResult = await pool.query(existingQuery, [participant1, participant2]);
    
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0];
    }
    
    // Create new conversation
    const createQuery = `
      INSERT INTO conversations (participant_1_id, participant_2_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const createResult = await pool.query(createQuery, [participant1, participant2]);
    return createResult.rows[0];
  }
  
  /**
   * Send a message
   */
  static async sendMessage(senderId: string, data: CreateMessageData): Promise<MessageWithSender> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the message
      const messageQuery = `
        INSERT INTO messages (
          conversation_id, sender_id, receiver_id, content, 
          message_type, file_url, file_name, file_size
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const messageResult = await client.query(messageQuery, [
        data.conversation_id,
        senderId,
        data.receiver_id,
        data.content,
        data.message_type || 'text',
        data.file_url,
        data.file_name,
        data.file_size
      ]);
      
      const message = messageResult.rows[0];
      
      // Get sender information
      const senderQuery = `
        SELECT full_name, profile_picture FROM users WHERE id = $1
      `;
      
      const senderResult = await client.query(senderQuery, [senderId]);
      const sender = senderResult.rows[0];
      
      await client.query('COMMIT');
      
      return {
        ...message,
        sender_name: sender.full_name,
        sender_avatar: sender.profile_picture
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get messages for a conversation with pagination
   */
  static async getConversationMessages(
    conversationId: string, 
    userId: string,
    page: number = 1, 
    limit: number = 50
  ): Promise<{ messages: MessageWithSender[]; hasMore: boolean }> {
    // Verify user is part of the conversation
    const conversationQuery = `
      SELECT * FROM conversations 
      WHERE id = $1 AND (participant_1_id = $2 OR participant_2_id = $2)
    `;
    
    const conversationResult = await pool.query(conversationQuery, [conversationId, userId]);
    
    if (conversationResult.rows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }
    
    const offset = (page - 1) * limit;
    
    const messagesQuery = `
      SELECT 
        m.*,
        u.full_name as sender_name,
        u.profile_picture as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const messagesResult = await pool.query(messagesQuery, [conversationId, limit + 1, offset]);
    const messages = messagesResult.rows;
    
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra message used for pagination check
    }
    
    // Reverse to show oldest first
    return {
      messages: messages.reverse(),
      hasMore
    };
  }
  
  /**
   * Get user's conversations
   */
  static async getUserConversations(userId: string): Promise<ConversationWithParticipants[]> {
    const query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.participant_1_id = $1 THEN u2.full_name 
          ELSE u1.full_name 
        END as other_participant_name,
        CASE 
          WHEN c.participant_1_id = $1 THEN u2.profile_picture 
          ELSE u1.profile_picture 
        END as other_participant_avatar,
        CASE 
          WHEN c.participant_1_id = $1 THEN u2.id 
          ELSE u1.id 
        END as other_participant_id,
        CASE 
          WHEN c.participant_1_id = $1 THEN c.participant_1_unread_count 
          ELSE c.participant_2_unread_count 
        END as unread_count,
        m.content as last_message_content,
        m.sender_id as last_message_sender_id,
        m.message_type as last_message_type
      FROM conversations c
      JOIN users u1 ON c.participant_1_id = u1.id
      JOIN users u2 ON c.participant_2_id = u2.id
      LEFT JOIN messages m ON c.last_message_id = m.id
      WHERE c.participant_1_id = $1 OR c.participant_2_id = $1
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      participant_1_id: row.participant_1_id,
      participant_2_id: row.participant_2_id,
      last_message_id: row.last_message_id,
      last_message_at: row.last_message_at,
      participant_1_unread_count: row.participant_1_unread_count,
      participant_2_unread_count: row.participant_2_unread_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
      participant_1_name: row.participant_1_id === userId ? 'You' : row.other_participant_name,
      participant_1_avatar: row.participant_1_id === userId ? null : row.other_participant_avatar,
      participant_2_name: row.participant_2_id === userId ? 'You' : row.other_participant_name,
      participant_2_avatar: row.participant_2_id === userId ? null : row.other_participant_avatar,
      last_message_content: row.last_message_content,
      last_message_sender_id: row.last_message_sender_id,
      unread_count: row.unread_count,
      other_participant_id: row.other_participant_id,
      other_participant_name: row.other_participant_name,
      other_participant_avatar: row.other_participant_avatar
    }));
  }
  
  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Mark messages as read
      const updateQuery = `
        UPDATE messages 
        SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
        WHERE conversation_id = $1 
          AND receiver_id = $2 
          AND is_read = FALSE
      `;
      
      await client.query(updateQuery, [conversationId, userId]);
      
      // Reset unread count for this user
      const resetUnreadQuery = `
        UPDATE conversations 
        SET 
          participant_1_unread_count = CASE 
            WHEN participant_1_id = $2 THEN 0 
            ELSE participant_1_unread_count 
          END,
          participant_2_unread_count = CASE 
            WHEN participant_2_id = $2 THEN 0 
            ELSE participant_2_unread_count 
          END,
          updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(resetUnreadQuery, [conversationId, userId]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Delete a message (soft delete by setting content to empty)
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    const query = `
      UPDATE messages 
      SET content = '[Message deleted]', updated_at = NOW()
      WHERE id = $1 AND sender_id = $2
    `;
    
    const result = await pool.query(query, [messageId, userId]);
    
    if (result.rowCount === 0) {
      throw new Error('Message not found or access denied');
    }
  }
  
  /**
   * Search messages
   */
  static async searchMessages(
    userId: string, 
    searchTerm: string, 
    conversationId?: string
  ): Promise<MessageWithSender[]> {
    let query = `
      SELECT 
        m.*,
        u.full_name as sender_name,
        u.profile_picture as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.participant_1_id = $1 OR c.participant_2_id = $1)
        AND m.content ILIKE $2
    `;
    
    const params = [userId, `%${searchTerm}%`];
    
    if (conversationId) {
      query += ' AND m.conversation_id = $3';
      params.push(conversationId);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT 50';
    
    const result = await pool.query(query, params);
    return result.rows;
  }
  
  /**
   * Get unread message count for user
   */
  static async getUnreadMessageCount(userId: string): Promise<number> {
    const query = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN participant_1_id = $1 THEN participant_1_unread_count 
            ELSE participant_2_unread_count 
          END
        ), 0) as total_unread
      FROM conversations 
      WHERE participant_1_id = $1 OR participant_2_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].total_unread) || 0;
  }
  
  /**
   * Update user presence
   */
  static async updateUserPresence(userId: string, isOnline: boolean, socketId?: string): Promise<void> {
    const query = `
      INSERT INTO user_presence (user_id, is_online, last_seen, socket_id, updated_at)
      VALUES ($1, $2, NOW(), $3, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        is_online = $2,
        last_seen = CASE WHEN $2 = FALSE THEN NOW() ELSE user_presence.last_seen END,
        socket_id = $3,
        updated_at = NOW()
    `;
    
    await pool.query(query, [userId, isOnline, socketId]);
  }
  
  /**
   * Get user presence
   */
  static async getUserPresence(userId: string): Promise<{ is_online: boolean; last_seen: Date } | null> {
    const query = 'SELECT is_online, last_seen FROM user_presence WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Set typing indicator
   */
  static async setTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const query = `
      INSERT INTO typing_indicators (conversation_id, user_id, is_typing, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (conversation_id, user_id)
      DO UPDATE SET is_typing = $3, updated_at = NOW()
    `;
    
    await pool.query(query, [conversationId, userId, isTyping]);
  }
  
  /**
   * Get typing indicators for conversation
   */
  static async getTypingIndicators(conversationId: string): Promise<{ user_id: string; user_name: string }[]> {
    const query = `
      SELECT ti.user_id, u.full_name as user_name
      FROM typing_indicators ti
      JOIN users u ON ti.user_id = u.id
      WHERE ti.conversation_id = $1 
        AND ti.is_typing = TRUE 
        AND ti.updated_at > NOW() - INTERVAL '10 seconds'
    `;
    
    const result = await pool.query(query, [conversationId]);
    return result.rows;
  }
}