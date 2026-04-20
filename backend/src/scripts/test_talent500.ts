
import { buildVideoPrompt } from '../services/promptBuilder';
import { generateStitchedVideo } from '../services/videoStitcher';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const talent500JD = `
Role: Frontend Developer - React / Angular [T500-24769]
Company: Talent500
Location: Thiruvananthapuram, Kerala, India
Salary: 40k per month
Perks: Free Coffee, Free Meals, Flexible Hours
About: We are looking for a skilled Frontend Developer with hands-on experience in modern JavaScript frameworks such as React and/or Angular.
Required Skills: HTML, CSS, JavaScript, React.js, Angular, Responsive Design, RESTful APIs, Git, Webpack, Vite, TypeScript.
`;

async function main() {
  try {
    console.log('--- Step 1: Generating High-Intent Script from Talent500 JD ---');
    const script = await buildVideoPrompt(talent500JD);
    
    console.log('\n--- Script Structure Check ---');
    script.segments.forEach((seg, i) => {
      console.log(`Segment ${i+1} Captions:\n${seg.overlayText}`);
      console.log('---');
    });

    console.log('\n--- Step 2: Starting Parallel Generation & Stitching ---');
    const videoResult = await generateStitchedVideo({
      script: script,
      jobId: 'test_talent500_multi',
      onProgress: (step, progress) => {
        console.log(`[${Math.round(progress * 100)}%] ${step}`);
      }
    });

    console.log('\n--- Success! ---');
    console.log('Final Video URL:', videoResult.videoUrl);
    console.log('Duration:', videoResult.duration, 'seconds');
  } catch (error: any) {
    console.error('\n--- Error ---');
    console.error(error.message);
  }
}

main();
