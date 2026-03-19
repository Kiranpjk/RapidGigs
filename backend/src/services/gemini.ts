import { huggingfaceService } from './huggingface';

export const geminiService = {
  /**
   * Generate a text-based description for avatar/banner using Hugging Face.
   * Falls back to a static description if the AI service is unavailable.
   */
  async generateImagePrompt(type: 'avatar' | 'banner', userName: string): Promise<string> {
    try {
      const prompt = type === 'avatar'
        ? `Generate a creative, professional description for a user avatar for ${userName}. Focus on colors, shapes, and abstract patterns. Keep it under 50 words.`
        : `Generate a creative, professional description for a profile banner for ${userName}. Focus on gradients, colors, and abstract patterns. Keep it under 50 words.`;

      return await huggingfaceService.generateText(prompt);
    } catch (error) {
      console.error('Error generating image prompt:', error);
      return type === 'avatar'
        ? `Professional avatar for ${userName} with abstract geometric patterns in corporate colors`
        : `Modern banner for ${userName} with gradient design and professional aesthetic`;
    }
  },

  /**
   * Generate a deterministic avatar URL (no external API call needed).
   */
  async generateAvatar(userName: string, userId: number): Promise<string> {
    const colors = ['6366f1', '3b82f6', '8b5cf6', '10b981', 'f59e0b', 'ef4444', 'ec4899', '14b8a6'];
    const color = colors[userId % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=256&background=${color}&color=fff&bold=true`;
  },

  /**
   * Generate a deterministic banner gradient class (no external API call needed).
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
