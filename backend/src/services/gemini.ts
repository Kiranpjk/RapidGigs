import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export const geminiService = {
  /**
   * Generate a text-based description for avatar/banner
   * Note: Gemini Pro doesn't generate images directly, but we can use it to generate
   * creative descriptions or use Imagen API separately
   */
  async generateImagePrompt(type: 'avatar' | 'banner', userName: string): Promise<string> {
    try {
      const prompt = type === 'avatar' 
        ? `Generate a creative, professional description for a user avatar for ${userName}. Focus on colors, shapes, and abstract patterns that would look good as a profile picture. Keep it under 50 words.`
        : `Generate a creative, professional description for a profile banner for ${userName}. Focus on gradients, colors, and abstract patterns that would look good as a cover image. Keep it under 50 words.`;

      const response = await axios.post<GeminiResponse>(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const generatedText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      return generatedText;
    } catch (error) {
      console.error('Error generating image prompt with Gemini:', error);
      throw error;
    }
  },

  /**
   * Generate avatar using external service (placeholder)
   * In production, you would use Imagen API or another image generation service
   */
  async generateAvatar(userName: string, userId: number): Promise<string> {
    // For now, return a deterministic avatar URL
    // In production, you could use Gemini's Imagen API or another service
    const colors = ['6366f1', '3b82f6', '8b5cf6', '10b981', 'f59e0b', 'ef4444', 'ec4899', '14b8a6'];
    const color = colors[userId % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=256&background=${color}&color=fff&bold=true`;
  },

  /**
   * Generate banner gradient class
   */
  generateBannerGradient(userId: number): string {
    const gradients = [
      'from-indigo-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-purple-500 to-pink-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-yellow-500 to-orange-600',
      'from-pink-500 to-rose-600',
      'from-teal-500 to-green-600',
    ];
    return gradients[userId % gradients.length];
  }
};
