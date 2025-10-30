import api from './api';
import type { Message, Conversation, CreateMessageData, UserPresence } from '../types/index';

// DEBUG: MessageService loaded
console.log('DEBUG: MessageService - imports loaded');

export class MessageService {
  /**
   * Get or create conversation with another user
   */
  static async getOrCreateConversation(otherUserId: string): Promise<Conversation> {
    const response = await api.post('/messages/conversations', { otherUserId });
    return response.data.data;
  }

  /**
   * Get user's conversations
   */
  static async getConversations(): Promise<Conversation[]> {
    const response = await api.get('/messages/conversations');
    return response.data.data;
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const response = await api.get(`/messages/conversations/${conversationId}/messages`, {
      params: { page, limit }
    });
    return response.data.data;
  }

  /**
   * Send a message
   */
  static async sendMessage(data: CreateMessageData): Promise<Message> {
    const formData = new FormData();
    formData.append('conversationId', data.conversationId);
    formData.append('receiverId', data.receiverId);
    formData.append('content', data.content);
    
    if (data.messageType) {
      formData.append('messageType', data.messageType);
    }
    
    if (data.file) {
      formData.append('file', data.file);
    }

    const response = await api.post(`/messages/conversations/${data.conversationId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(conversationId: string): Promise<void> {
    await api.put(`/messages/conversations/${conversationId}/read`);
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/messages/${messageId}`);
  }

  /**
   * Search messages
   */
  static async searchMessages(searchTerm: string, conversationId?: string): Promise<Message[]> {
    const params: any = { q: searchTerm };
    if (conversationId) {
      params.conversationId = conversationId;
    }
    
    const response = await api.get('/messages/search', { params });
    return response.data.data;
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(): Promise<number> {
    const response = await api.get('/messages/unread-count');
    return response.data.data.unread_count;
  }

  /**
   * Get user presence
   */
  static async getUserPresence(userId: string): Promise<UserPresence | null> {
    const response = await api.get(`/messages/users/${userId}/presence`);
    return response.data.data;
  }
}