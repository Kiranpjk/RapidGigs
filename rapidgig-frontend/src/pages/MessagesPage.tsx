import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { MessageService } from '../services/messageService';
import type { Conversation, Message } from '../types/index';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message]);

        // Update conversation list
        setConversations(prev =>
          prev.map(conv =>
            conv.id === message.conversation_id
              ? {
                ...conv,
                last_message_content: message.content,
                last_message_sender_id: message.sender_id,
                last_message_at: message.created_at,
                unread_count: message.sender_id !== user?.id ? conv.unread_count + 1 : conv.unread_count
              }
              : conv
          )
        );
      });

      // Listen for message notifications
      socket.on('message_notification', (notification: any) => {
        // Update conversation unread count
        setConversations(prev =>
          prev.map(conv =>
            conv.id === notification.conversationId
              ? { ...conv, unread_count: conv.unread_count + 1 }
              : conv
          )
        );
      });

      // Listen for messages read
      socket.on('messages_read', (data: { conversationId: string; readBy: string }) => {
        if (selectedConversation?.id === data.conversationId) {
          setMessages(prev =>
            prev.map(msg =>
              msg.receiver_id === data.readBy ? { ...msg, is_read: true } : msg
            )
          );
        }
      });

      return () => {
        socket.off('new_message');
        socket.off('message_notification');
        socket.off('messages_read');
      };
    }
  }, [socket, selectedConversation, user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await MessageService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, page: number = 1) => {
    try {
      setMessagesLoading(true);
      const data = await MessageService.getConversationMessages(conversationId, page);

      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }

      setHasMoreMessages(data.hasMore);
      setMessagesPage(page);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setMessagesPage(1);

    // Join conversation room
    socket?.emit('join_conversation', conversation.id);

    // Load messages
    await loadMessages(conversation.id);

    // Mark messages as read
    if (conversation.unread_count > 0) {
      await MessageService.markMessagesAsRead(conversation.id);
      socket?.emit('mark_messages_read', { conversationId: conversation.id });

      // Update local conversation state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
        )
      );
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!selectedConversation || !user) return;

    try {
      const messageData = {
        conversationId: selectedConversation.id,
        receiverId: selectedConversation.other_participant_id,
        content,
        messageType: file ? (file.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file' : 'text' as const,
        file
      };

      // Send via HTTP for file uploads, Socket.io for text messages
      if (file) {
        await MessageService.sendMessage(messageData);
      } else {
        socket?.emit('send_message', {
          conversationId: selectedConversation.id,
          receiverId: selectedConversation.other_participant_id,
          content,
          messageType: 'text'
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleLoadMoreMessages = () => {
    if (selectedConversation && hasMoreMessages && !messagesLoading) {
      loadMessages(selectedConversation.id, messagesPage + 1);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to access messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">Messages</h1>
          <div className="flex items-center space-x-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="text-gray-600 font-inter">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)]">
          <div className="flex h-full">
            {/* Conversation List */}
            <div className="w-1/3 border-r border-gray-200">
              <ConversationList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onConversationSelect={handleConversationSelect}
                loading={loading}
              />
            </div>

            {/* Chat Window */}
            <div className="flex-1">
              {selectedConversation ? (
                <ChatWindow
                  conversation={selectedConversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onLoadMore={handleLoadMoreMessages}
                  hasMore={hasMoreMessages}
                  loading={messagesLoading}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-poppins">Select a conversation</h3>
                    <p className="text-gray-500 font-inter">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;