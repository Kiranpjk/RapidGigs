import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { Message, TypingIndicator } from '../types/index';

// DEBUG: SocketContext loaded
console.log('DEBUG: SocketContext - imports loaded');

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (data: {
    conversationId: string;
    receiverId: string;
    content: string;
    messageType?: 'text' | 'file' | 'image';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) => void;
  markMessagesAsRead: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  getOnlineUsers: (userIds: string[]) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  // token isn't provided by useAuth; read from localStorage to avoid runtime errors
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      // Online users
      newSocket.on('online_users', (users: string[]) => {
        setOnlineUsers(users);
      });

      newSocket.on('user_offline', (data: { userId: string }) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket when user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
    }
  }, [user, token]);

  const joinConversation = (conversationId: string) => {
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  };

  const sendMessage = (data: {
    conversationId: string;
    receiverId: string;
    content: string;
    messageType?: 'text' | 'file' | 'image';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  };

  const markMessagesAsRead = (conversationId: string) => {
    if (socket) {
      socket.emit('mark_messages_read', { conversationId });
    }
  };

  const startTyping = (conversationId: string) => {
    if (socket) {
      socket.emit('typing_start', { conversationId });
    }
  };

  const stopTyping = (conversationId: string) => {
    if (socket) {
      socket.emit('typing_stop', { conversationId });
    }
  };

  const getOnlineUsers = (userIds: string[]) => {
    if (socket) {
      socket.emit('get_online_users', userIds);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    markMessagesAsRead,
    startTyping,
    stopTyping,
    getOnlineUsers,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};