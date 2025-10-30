import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for message file uploads
const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/messages';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `message-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const messageUpload = multer({
  storage: messageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and other common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Conversation management
router.post('/conversations', MessageController.getOrCreateConversation);
router.get('/conversations', MessageController.getUserConversations);

// Message management
router.get('/conversations/:conversationId/messages', MessageController.getConversationMessages);
router.post('/conversations/:conversationId/messages', messageUpload.single('file'), MessageController.sendMessage);
router.put('/conversations/:conversationId/read', MessageController.markMessagesAsRead);
router.delete('/messages/:messageId', MessageController.deleteMessage);

// Search and utilities
router.get('/search', MessageController.searchMessages);
router.get('/unread-count', MessageController.getUnreadCount);
router.get('/users/:userId/presence', MessageController.getUserPresence);

export default router;