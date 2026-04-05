import express from 'express';
import { geminiService } from '../services/gemini';
import { authenticate } from '../middleware/auth';

// Hash a string to a positive integer (for deterministic avatar/banner selection)
const hashCode = (s: string): number =>
  Math.abs([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));

const router = express.Router();

/**
 * @route   GET /api/images/avatar/:userId
 * @desc    Generate avatar for user
 * @access  Public
 */
router.get('/avatar/:userId', async (req, res) => {
  try {
    const userId = hashCode(req.params.userId);
    const userName = req.query.name as string || 'User';
    
    const avatarUrl = await geminiService.generateAvatar(userName, userId);
    
    res.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    console.error('Error generating avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate avatar',
    });
  }
});

/**
 * @route   GET /api/images/banner/:userId
 * @desc    Generate banner gradient for user
 * @access  Public
 */
router.get('/banner/:userId', async (req, res) => {
  try {
    const userId = hashCode(req.params.userId);
    
    const bannerGradient = geminiService.generateBannerGradient(userId);
    
    res.json({
      success: true,
      bannerGradient,
    });
  } catch (error) {
    console.error('Error generating banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate banner',
    });
  }
});

/**
 * @route   POST /api/images/generate-prompt
 * @desc    Generate image description using Gemini AI
 * @access  Private
 */
router.post('/generate-prompt', authenticate, async (req, res) => {
  try {
    const { type, userName } = req.body;
    
    if (!type || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Type and userName are required',
      });
    }
    
    if (type !== 'avatar' && type !== 'banner') {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "avatar" or "banner"',
      });
    }
    
    const prompt = await geminiService.generateImagePrompt(type, userName);
    
    res.json({
      success: true,
      prompt,
    });
  } catch (error) {
    console.error('Error generating prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prompt',
    });
  }
});

export default router;
