import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MessageService } from '../services/messageService';
import { getSocketManager } from '../config/socket';

export class MessageController {
  /**
   * Get or create conversation between two users
   */
  static async getOrCreateConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { otherUserId } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Other user ID is required'
          }
        });
      }
      
      if (userId === otherUserId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Cannot create conversation with yourself'
          }
        });
      }
      
      const conversation = await MessageService.getOrCreateConversation(userId, otherUserId);
      
      res.json({
        success: true,
        data: conversation
      });
      
    } catch (error) {
      console.error('Get/create conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONVERSATION_CREATION_FAILED',
          message: 'Failed to get or create conversation'
        }
      });
    }
  }
  
  /**
   * Get user's conversations
   */
  static async getUserConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      const conversations = await MessageService.getUserConversations(userId);
      
      res.json({
        success: true,
        data: conversations
      });
      
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_CONVERSATIONS_FAILED',
          message: 'Failed to retrieve conversations'
        }
      });
    }
  }
  
  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      const result = await MessageService.getConversationMessages(
        conversationId,
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Get messages error:', error);
      
      if (error instanceof Error && error.message.includes('not found or access denied')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found or access denied'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_MESSAGES_FAILED',
          message: 'Failed to retrieve messages'
        }
      });
    }
  }
  
  /**
   * Send a message (HTTP endpoint - mainly for file uploads)
   */
  static async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { conversationId, receiverId, content, messageType = 'text' } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      if (!conversationId || !receiverId || !content) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Conversation ID, receiver ID, and content are required'
          }
        });
      }
      
      // Handle file upload if present
      let fileUrl, fileName, fileSize;
      if (req.file) {
        fileUrl = `/uploads/messages/${req.file.filename}`;
        fileName = req.file.originalname;
        fileSize = req.file.size;
      }
      
      const message = await MessageService.sendMessage(userId, {
        conversation_id: conversationId,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize
      });
      
      // Emit real-time message via Socket.io
      const socketManager = getSocketManager();
      if (socketManager) {
        socketManager.sendToConversation(`conversation:${conversationId}`, 'new_message', message);
        socketManager.sendToUser(receiverId, 'message_notification', {
          conversationId,
          senderId: userId,
          senderName: message.sender_name,
          content,
          messageType
        });
      }
      
      res.json({
        success: true,
        data: message
      });
      
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEND_MESSAGE_FAILED',
          message: 'Failed to send message'
        }
      });
    }
  }
  
  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      await MessageService.markMessagesAsRead(conversationId, userId);
      
      // Emit real-time update via Socket.io
      const socketManager = getSocketManager();
      if (socketManager) {
        socketManager.sendToConversation(`conversation:${conversationId}`, 'messages_read', {
          conversationId,
          readBy: userId
        });
      }
      
      res.json({
        success: true,
        message: 'Messages marked as read'
      });
      
    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_READ_FAILED',
          message: 'Failed to mark messages as read'
        }
      });
    }
  }
  
  /**
   * Delete a message
   */
  static async deleteMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { messageId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      await MessageService.deleteMessage(messageId, userId);
      
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete message error:', error);
      
      if (error instanceof Error && error.message.includes('not found or access denied')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found or access denied'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_MESSAGE_FAILED',
          message: 'Failed to delete message'
        }
      });
    }
  }
  
  /**
   * Search messages
   */
  static async searchMessages(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { q: searchTerm, conversationId } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SEARCH_TERM',
            message: 'Search term is required'
          }
        });
      }
      
      const messages = await MessageService.searchMessages(
        userId,
        searchTerm as string,
        conversationId as string
      );
      
      res.json({
        success: true,
        data: messages
      });
      
    } catch (error) {
      console.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search messages'
        }
      });
    }
  }
  
  /**
   * Get unread message count
   */
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      const count = await MessageService.getUnreadMessageCount(userId);
      
      res.json({
        success: true,
        data: { unread_count: count }
      });
      
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_UNREAD_COUNT_FAILED',
          message: 'Failed to get unread message count'
        }
      });
    }
  }
  
  /**
   * Get user presence
   */
  static async getUserPresence(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      
      const presence = await MessageService.getUserPresence(userId);
      
      res.json({
        success: true,
        data: presence
      });
      
    } catch (error) {
      console.error('Get user presence error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PRESENCE_FAILED',
          message: 'Failed to get user presence'
        }
      });
    }
  }
}