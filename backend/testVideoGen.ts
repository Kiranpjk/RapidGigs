import dotenv from 'dotenv';
dotenv.config();

import { generateStitchedVideo } from './src/services/videoStitcher';
import { buildVideoPrompt } from './src/services/promptBuilder';

async function main() {
  console.log("--- Starting Video Generation Test ---");
  
  const sampleJobDescription = `
    Company: TestCorp Inc.
    Role: Senior Software Engineer
    Salary: $140,000 - $180,000
    We are looking for an amazing engineer to join our fast-paced team and build state-of-the-art platforms!
  `;

  console.log("1. Generating Script from Job Description...");
  const script = await buildVideoPrompt(sampleJobDescription);
  console.log("Script Result:", JSON.stringify(script, null, 2));

  console.log("\n2. Generating Final Video via VeoAiFree & FFmpeg...");
  try {
    const result = await generateStitchedVideo({
      script,
      provider: 'veoaifree', // Uses the veoaifree provider just like the real app
      coverImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/512px-Google_2015_logo.svg.png',
      onProgress: (step, progress) => {
        console.log(`[Progress: ${Math.round(progress * 100)}%] ${step}`);
      }
    });

    console.log("\n✅ Video successfully generated and stitched!");
    console.log("Result details:", result);
  } catch (error) {
    console.error("\n❌ Video generation failed:", error);
  }
}

main().catch(console.error);
