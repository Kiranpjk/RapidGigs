import axios from 'axios';

export async function generateVideoWaveSpeed(
  prompt: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ videoUrl: string } | null> {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) return null;

  try {
    console.log('[WaveSpeed] Submitting task...');
    onProgress?.('WaveSpeed: Submitting task...', 0.1);

    // Using the V3 endpoint as per documentation
    const baseUrl = 'https://api.wavespeed.ai/api/v3/kling-video/standard/text-to-video';
    
    const response = await axios.post(
      baseUrl,
      {
        prompt,
        duration: 5,
        resolution: '720p',
        aspect_ratio: '9:16'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const taskData = response.data?.data;
    if (!taskData?.id) {
      console.error('[WaveSpeed] No task ID in response:', JSON.stringify(response.data));
      return null;
    }

    const taskId = taskData.id;
    const pollUrl = taskData.urls?.get || `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`;

    // Polling
    const maxAttempts = 60; // 5 mins
    for (let i = 0; i < maxAttempts; i++) {
      onProgress?.(`WaveSpeed: Generating (${i + 1}/${maxAttempts})...`, 0.2 + (i / maxAttempts) * 0.7);
      
      const pollRes = await axios.get(pollUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      const data = pollRes.data?.data;
      const status = data?.status;
      const videoUrl = data?.urls?.mp4 || data?.video_url;

      if (status === 'completed' && videoUrl) {
        console.log('[WaveSpeed] ✅ Generation complete:', videoUrl);
        return { videoUrl };
      }

      if (status === 'failed') {
        console.error('[WaveSpeed] Generation failed:', JSON.stringify(pollRes.data));
        return null;
      }

      await new Promise(r => setTimeout(r, 5000));
    }

    console.warn('[WaveSpeed] Polling timed out');
    return null;
  } catch (err: any) {
    console.error('[WaveSpeed] Error:', err.message);
    if (err.response?.data) {
       console.error('[WaveSpeed] Response Body:', JSON.stringify(err.response.data));
    }
    return null;
  }
}
