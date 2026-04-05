import axios from 'axios';
import { config } from '../config/env';

const HF_API_URL = 'https://api-inference.huggingface.co/models';

const getHeaders = () => ({
  Authorization: `Bearer ${config.huggingface.token}`,
  'Content-Type': 'application/json',
});

/**
 * Retry wrapper for Hugging Face API calls.
 * HF free tier models go to sleep after inactivity and return 503 while loading.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 10000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err.response?.status;
      const isLoading = status === 503 || err.response?.data?.error?.includes?.('loading');
      if (isLoading && i < retries - 1) {
        const estimatedTime = err.response?.data?.estimated_time || delayMs / 1000;
        console.log(`Model loading, retrying in ${estimatedTime}s... (attempt ${i + 2}/${retries})`);
        await new Promise(r => setTimeout(r, estimatedTime * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export const huggingfaceService = {
  /**
   * Text generation using a free Hugging Face model (replaces Gemini).
   */
  async generateText(prompt: string): Promise<string> {
    if (!config.huggingface.enabled) {
      throw new Error('Hugging Face token not configured');
    }

    const model = config.huggingface.textModel;
    const response = await withRetry(() =>
      axios.post(
        `${HF_API_URL}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.7,
            return_full_text: false,
          },
        },
        { headers: getHeaders(), timeout: 60000 }
      )
    );

    const result = response.data;
    if (Array.isArray(result) && result[0]?.generated_text) {
      return result[0].generated_text.trim();
    }
    return typeof result === 'string' ? result : JSON.stringify(result);
  },

  /**
   * Text-to-video generation using Hugging Face model (replaces fal.ai).
   * Returns raw video buffer.
   */
  async generateVideo(prompt: string): Promise<Buffer> {
    if (!config.huggingface.enabled) {
      throw new Error('Hugging Face token not configured');
    }

    const model = config.huggingface.videoModel;
    const response = await withRetry(
      () =>
        axios.post(
          `${HF_API_URL}/${model}`,
          { inputs: prompt },
          {
            headers: getHeaders(),
            responseType: 'arraybuffer',
            timeout: 300000, // 5 minutes - video gen is slow
          }
        ),
      3,
      30000 // longer delay for video models (they take time to load)
    );

    return Buffer.from(response.data);
  },

  /**
   * Enhance a text into a cinematic video prompt.
   * Delegates to the shared promptBuilder service.
   */
  async enhancePrompt(text: string): Promise<string> {
    try {
      const { buildVideoPrompt } = await import('./promptBuilder');
      return await buildVideoPrompt(text);
    } catch {
      // Fallback: use a trimmed version of the text itself
      return `Professional workplace scene: ${text.slice(0, 150)}`;
    }
  },
};
