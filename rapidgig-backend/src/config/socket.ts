import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { MessageService } from '../services/messageService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class SocketManager {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  
  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }
  
  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }
  
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket & { userId?: string; userRole?: string }) => {
      console.log(`User ${socket.userId} connected with socket ${socket.id}`);
      
      // Store user socket mapping
      if (socket.userId) {
        this.userSockets.set(socket.userId, socket.id);
        
        // Update user presence
        MessageService.updateUserPresence(socket.userId, true, socket.id);
        
        // Join user to their personal room
        socket.join(`user:${socket.userId}`);
      }
      
      // Handle joining conversation rooms
      socket.on('join_conversation', async (conversationId: string) => {
        try {
          socket.join(`conversation:${conversationId}`);
          console.log(`User ${socket.userId} joined conversation ${conversationId}`);
        } catch (error) {
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });
      
      // Handle leaving conversation rooms
      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} left conversation ${conversationId}`);
      });
      
      // Handle sending messages
      socket.on('send_message', async (data: {
        conversationId: string;
        receiverId: string;
        content: string;
        messageType?: 'text' | 'file' | 'image';
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
      }) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }
          
          const message = await MessageService.sendMessage(socket.userId, {
            conversation_id: data.conversationId,
            receiver_id: data.receiverId,
            content: data.content,
            message_type: data.messageType,
            file_url: data.fileUrl,
            file_name: data.fileName,
            file_size: data.fileSize
          });
          
          // Emit to conversation room
          this.io.to(`conversation:${data.conversationId}`).emit('new_message', message);
          
          // Emit to receiver's personal room for notifications
          this.io.to(`user:${data.receiverId}`).emit('message_notification', {
            conversationId: data.conversationId,
            senderId: socket.userId,
            senderName: message.sender_name,
            content: data.content,
            messageType: data.messageType
          });
          
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });
      
      // Handle marking messages as read
      socket.on('mark_messages_read', async (data: { conversationId: string }) => {
        try {
          if (!socket.userId) return;
          
          await MessageService.markMessagesAsRead(data.conversationId, socket.userId);
          
          // Notify other participants that messages were read
          socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
            conversationId: data.conversationId,
            readBy: socket.userId
          });
          
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });
      
      // Handle typing indicators
      socket.on('typing_start', async (data: { conversationId: string }) => {
        try {
          if (!socket.userId) return;
          
          await MessageService.setTypingIndicator(data.conversationId, socket.userId, true);
          
          socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
            conversationId: data.conversationId,
            userId: socket.userId,
            isTyping: true
          });
          
        } catch (error) {
          console.error('Error setting typing indicator:', error);
        }
      });
      
      socket.on('typing_stop', async (data: { conversationId: string }) => {
        try {
          if (!socket.userId) return;
          
          await MessageService.setTypingIndicator(data.conversationId, socket.userId, false);
          
          socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
            conversationId: data.conversationId,
            userId: socket.userId,
            isTyping: false
          });
          
        } catch (error) {
          console.error('Error stopping typing indicator:', error);
        }
      });
      
      // Handle getting online users
      socket.on('get_online_users', (userIds: string[]) => {
        const onlineUsers = userIds.filter(userId => this.userSockets.has(userId));
        socket.emit('online_users', onlineUsers);
      });
      
      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`User ${socket.userId} disconnected`);
        
        if (socket.userId) {
          // Remove from user socket mapping
          this.userSockets.delete(socket.userId);
          
          // Update user presence
          await MessageService.updateUserPresence(socket.userId, false);
          
          // Notify other users that this user went offline
          socket.broadcast.emit('user_offline', { userId: socket.userId });
        }
      });
      
      // Handle connection errors
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });
    });
  }
  
  // Public methods for sending messages from other parts of the application
  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  public sendToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }
  
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
  
  public getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
  
  public getSocketServer(): SocketIOServer {
    return this.io;
  }
}

// Global socket manager instance
let socketManager: SocketManager | null = null;

export const initializeSocket = (server: HTTPServer): SocketManager => {
  if (!socketManager) {
    socketManager = new SocketManager(server);
  }
  return socketManager;
};

export const getSocketManager = (): SocketManager | null => {
  return socketManager;
};