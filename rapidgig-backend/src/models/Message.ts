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
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_id?: string;
  last_message_at?: Date;
  participant_1_unread_count: number;
  participant_2_unread_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageData {
  conversation_id: string;
  receiver_id: string;
  content: string;
  message_type?: 'text' | 'file' | 'image';
  file_url?: string;
  file_name?: string;
  file_size?: number;
}

export interface ConversationWithParticipants extends Conversation {
  participant_1_name: string;
  participant_1_avatar?: string;
  participant_2_name: string;
  participant_2_avatar?: string;
  last_message_content?: string;
  last_message_sender_id?: string;
}

export interface MessageWithSender extends Message {
  sender_name: string;
  sender_avatar?: string;
}