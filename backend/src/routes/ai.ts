import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { huggingfaceService } from '../services/huggingface';

const router = express.Router();

// Generate enhanced video prompt from text
router.post('/enhance-prompt', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const enhanced = await huggingfaceService.enhancePrompt(text);
    res.json({ prompt: enhanced });
  } catch (error: any) {
    console.error('Enhance prompt error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate text completion
router.post('/generate-text', authenticate, async (req: AuthRequest, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await huggingfaceService.generateText(prompt);
    res.json({ text: result });
  } catch (error: any) {
    console.error('Text generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
