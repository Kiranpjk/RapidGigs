export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender_name: string;
  sender_avatar?: string;
}

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_id?: string;
  last_message_at?: string;
  participant_1_unread_count: number;
  participant_2_unread_count: number;
  created_at: string;
  updated_at: string;
  other_participant_id: string;
  other_participant_name: string;
  other_participant_avatar?: string;
  last_message_content?: string;
  last_message_sender_id?: string;
  unread_count: number;
}

export interface CreateMessageData {
  conversationId: string;
  receiverId: string;
  content: string;
  messageType?: 'text' | 'file' | 'image';
  file?: File;
}

export interface UserPresence {
  is_online: boolean;
  last_seen: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}