import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

import fs from 'fs';
import { generateStitchedVideo } from './services/videoStitcher';

async function testVeo() {
  console.log('🚀 Starting Standalone 3-Part Parallel VeoAiFree Pipeline Test...');
  
  const script = {
    companyName: 'RapidGigs',
    jobTitle: 'Senior Backend Engineer',
    workType: 'Remote-First',
    segments: [
      {
        visualPrompt: `Extreme close-up shot of a human hand holding a black marker, drawing arrows and database cylinder icons on a frosted glass whiteboard, shallow depth of field with background bokeh showing blurred monitor screens, natural diffused daylight from left side window, slight lens flare catching the marker tip, micro-detail of ink spreading on glass surface, handheld camera with subtle organic shake, color grade cool blue-white tones, photorealistic 4K, cinematic 24fps`,
        overlayText: 'RapidGigs | Senior Backend Engineer',
        caption: '🚀 Rebuilding the payment core. Ship features week 1.'
      },
      {
        visualPrompt: `Medium shot of a dual ultrawide monitor setup on a standing desk, left monitor showing VS Code with TypeScript code syntax highlighted in deep blue and orange, right monitor showing a Kubernetes dashboard with green metrics, RGB keyboard with subtle blue underglow on dark wooden desk surface, mechanical keyboard partially in foreground sharp focus, background showing open plan office with soft bokeh of other desks and plants, overhead diffused lighting with warm color temperature 3200K, slow dolly left to right movement covering 15cm over 4 seconds, shallow depth of field f/1.8, micro-detail of cable management visible, color grade desaturated with slight film grain, photorealistic 4K, cinematic 24fps`,
        overlayText: 'Node.js • PostgreSQL | System Design',
        caption: '💻 Build features used by 500k+ students daily.'
      },
      {
        visualPrompt: `Wide shot of a minimal home office at golden hour, a laptop open on a clean white desk showing a GitHub pull request marked merged in green, ceramic coffee mug with steam rising catching warm window light, indoor plant in soft focus background, no people visible, dust particles visible in sunbeam from left window, camera completely static on tripod, micro-detail of wood grain on desk surface and condensation ring from previous coffee mug, color grade warm golden tones desaturated 20 percent, photorealistic 4K, cinematic 24fps. After 2 seconds, fade to clean black background with centered white text showing "RapidGigs | Senior Backend Engineer", "₹40L - ₹60L CTC" in amber color below.`,
        overlayText: '₹40L - ₹60L CTC | Remote First',
        caption: '💰 ₹40L - ₹60L CTC • Remote First • Apply Now on RapidGigs.'
      }
    ]
  };
  
  console.log('Provider: veoaifree');
  console.log('Targeting 28 seconds total (3 parallel segments)');

  try {
    const result = await generateStitchedVideo({
      script: script as any,
      provider: 'veoaifree',
      jobId: `test_cinematic_final_${Date.now()}`,
      onProgress: (step, progress) => {
        console.log(`[PROG] ${Math.round(progress * 100)}% - ${step}`);
      }
    });

    if (result) {
      console.log('\n✅ 3-PART PARALLEL TEST SUCCESS!');
      console.log('Final Video URL:', result.videoUrl);
      console.log('Duration:', result.duration);
      console.log('Clips:', result.clips);
    } else {
      console.error('\n❌ 3-PART PARALLEL TEST FAILED');
    }
  } catch (error: any) {
    console.error('\n❌ 3-PART PARALLEL TEST CRITICAL ERROR');
    console.error('Error:', error.message);
  }
}

// Ensure uploads/tmp directory exists
const tmpDir = path.join(__dirname, '../uploads/tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

testVeo();
