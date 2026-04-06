
import { buildVideoPrompt } from '../services/promptBuilder';
import { generateStitchedVideo } from '../services/videoStitcher';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const jobDescription = `
Role: Senior Software Engineer (Backend)
Company: FinTech Flow
Location: Bangalore, India
Salary: 25 - 40 LPA
About the Role:
We are looking for a Senior Backend Engineer to join our core team. You will be responsible for designing and implementing high-throughput payment processing systems.
Required Skills: Node.js, TypeScript, PostgreSQL, Redis, AWS, Kubernetes.
Experience: 5+ years.
Culture: Fast-paced startup environment, remote-friendly but has a premium office in Indiranagar.
`;

async function main() {
  try {
    console.log('--- Step 1: Generating Prompt from Job Description ---');
    const prompt = await buildVideoPrompt(jobDescription);
    console.log('\nGenerated Prompt:');
    console.log(prompt);

    console.log('\n--- Step 2: Generating Video from Prompt ---');
    console.log('(This may take several minutes depending on provider capacity)');
    
    // We only generate 2 segments for the demo to save time and credits
    const videoResult = await generateStitchedVideo({
      prompt,
      segments: 2,
      segmentDuration: 5,
      onProgress: (step, progress) => {
        console.log(`[Progress ${Math.round(progress * 100)}%] ${step}`);
      }
    });

    console.log('\n--- Success! ---');
    console.log('Video URL:', videoResult.videoUrl);
    console.log('Providers used:', videoResult.providers.join(' -> '));
  } catch (error: any) {
    console.error('\n--- Error ---');
    console.error(error.message);
  }
}

main();
