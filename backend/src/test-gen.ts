import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { generateStitchedVideo } from './services/videoStitcher';

async function testVideoGen() {
  console.log('🚀 Starting Test Video Generation...');
  console.log('Cookies used:', {
    datr: process.env.META_AI_COOKIE_DATR?.substring(0, 10) + '...',
    ecto1: process.env.META_AI_ECTO_1_SESS?.substring(0, 10) + '...',
  });

  const dummyScript = {
    segments: [
      {
        visualPrompt: "Cinematic professional workspace scene in a modern tech company, golden hour lighting, ultra-realistic.",
        overlayText: "Frontend Developer Role\n$120,000 - $150,000"
      }
    ]
  };

  try {
    const result = await generateStitchedVideo({
      script: dummyScript,
      onProgress: (step, progress) => {
        console.log(`[PROG] ${Math.round(progress * 100)}% - ${step}`);
      }
    });

    console.log('\n✅ TEST SUCCESS!');
    console.log('Video URL:', result.videoUrl);
    console.log('Providers used:', result.providers);
  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
  }
}

// Create uploads/temp if not exists
const tempDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

testVideoGen();
