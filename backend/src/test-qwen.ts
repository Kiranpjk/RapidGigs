import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { buildVideoPrompt } from './services/promptBuilder';
import { generateJobVideo } from './services/videoEngine';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testQwenPipeline() {
  console.log('🚀 Starting ULTIMATE QWEN PIPELINE TEST (Qwen-Max -> WaveSpeed/Wan-2.5)');
  
  const jobDescription = `
    Job Title: Senior Software Engineer (Generative AI)
    Company: Google
    Location: Bengaluru, India
    Salary: $150,000 - $220,000
    Required Skills: Python, PyTorch, LLMs, Distributed Systems.
    Description: We are building the future of AI in our state-of-the-art Bengaluru office. 
    Looking for pioneers who want to define the next generation of Google Search.
  `;

  try {
    // 1. Generate Script using Qwen
    console.log('\n--- STEP 1: Qwen-Max Script Generation ---');
    const script = await buildVideoPrompt(jobDescription);
    console.log('✅ Script Generated:', JSON.stringify(script, null, 2));

    // 2. Generate Video using WaveSpeed (Wan-2.5)
    console.log('\n--- STEP 2: WaveSpeed Video Generation (Wan-2.5) ---');
    const result = await generateJobVideo({
      prompt: script.segments[0].visualPrompt,
      jobId: 'qwen_test_run',
      provider: 'wavespeed'
    }, (step, progress) => {
      console.log(`[PROG] ${Math.round(progress * 100)}% - ${step}`);
    });

    if (result) {
      console.log('\n✅ PIPELINE SUCCESS!');
      console.log('Final Cloudinary URL:', result.videoUrl);
      console.log('Provider:', result.provider);
    } else {
      console.error('\n❌ PIPELINE FAILED at Video Generation');
    }
  } catch (error: any) {
    console.error('\n❌ PIPELINE CRITICAL ERROR');
    console.error('Error:', error.message);
  }
}

testQwenPipeline();
