import express from 'express';
import { body, validationResult } from 'express-validator';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const router = express.Router();

// Get message threads for user
router.get('/threads', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    // Get all unique conversation partners
    const sentMessages = await Message.find({ senderId: userId }).distinct('receiverId');
    const receivedMessages = await Message.find({ receiverId: userId }).distinct('senderId');
    const sentIds = sentMessages.map(id => id.toString());
    const receivedIds = receivedMessages.map(id => id.toString());
    const allPartnersSet = new Set([...sentIds, ...receivedIds]);
    const allPartners = Array.from(allPartnersSet);

    const threads = await Promise.all(
      allPartners.map(async (partnerId) => {
        const partner = await User.findById(partnerId);
        if (!partner) return null;

        const lastMessage = await Message.findOne({
          $or: [
            { senderId: userId, receiverId: new mongoose.Types.ObjectId(partnerId) },
            { senderId: new mongoose.Types.ObjectId(partnerId), receiverId: userId },
          ],
        }).sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          senderId: new mongoose.Types.ObjectId(partnerId),
          receiverId: userId,
          isRead: false,
        });

        return {
          id: partner._id.toString(),
          user: {
            id: partner._id.toString(),
            name: partner.name,
            avatarUrl: partner.avatarUrl,
          },
          lastMessage: lastMessage?.message || '',
          timestamp: lastMessage?.createdAt || new Date(),
          unreadCount,
        };
      })
    );

    const validThreads = threads.filter(thread => thread !== null) as any[];
    // Sort by timestamp (most recent first) and format timestamps
    const sortedThreads = validThreads.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    }).map(thread => ({
      ...thread,
      timestamp: formatTimestamp(thread.timestamp),
    }));
    
    res.json(sortedThreads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages in a thread
router.get('/threads/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = new mongoose.Types.ObjectId(req.user!.userId);
    const otherUserId = new mongoose.Types.ObjectId(userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    })
      .populate('senderId', 'name avatarUrl')
      .sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      { isRead: true }
    );

    res.json(messages.map(msg => ({
      id: msg._id.toString(),
      sender: msg.senderId.toString() === req.user!.userId ? 'me' : 'them',
      text: msg.message,
      time: formatTimestamp(msg.createdAt),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post(
  '/',
  authenticate,
  [
    body('receiverId').notEmpty(),
    body('message').trim().notEmpty(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { receiverId, message } = req.body;

      if (!mongoose.Types.ObjectId.isValid(receiverId)) {
        return res.status(400).json({ error: 'Invalid receiver ID' });
      }

      const threadId = uuidv4();

      const newMessage = new Message({
        threadId,
        senderId: new mongoose.Types.ObjectId(req.user!.userId),
        receiverId: new mongoose.Types.ObjectId(receiverId),
        message,
      });

      await newMessage.save();

      res.status(201).json({
        id: newMessage._id.toString(),
        sender: 'me',
        text: newMessage.message,
        time: formatTimestamp(newMessage.createdAt),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export default router;
