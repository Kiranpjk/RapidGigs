import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { buildVideoPrompt, enhanceAsVideoPrompt } from '../services/promptBuilder';

const router = express.Router();

// Generate enhanced cinematic video prompt from text
router.post('/enhance-prompt', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    if (typeof text !== 'string' || text.length > 2000) {
      return res.status(400).json({ error: 'Text must be a string under 2000 characters' });
    }
    const enhanced = await enhanceAsVideoPrompt(text);
    res.json({ prompt: enhanced });
  } catch (error: any) {
    console.error('Enhance prompt error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate text completion using Cerebras → OpenRouter → Ollama chain
router.post('/generate-text', authenticate, async (req: AuthRequest, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (typeof prompt !== 'string' || prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt must be a string under 2000 characters' });
    }
    // Reuse buildVideoPrompt which tries Ollama → Groq → OpenRouter
    const result = await buildVideoPrompt(prompt);
    res.json({ text: result });
  } catch (error: any) {
    console.error('Text generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
