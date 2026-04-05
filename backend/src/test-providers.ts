import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import { fal } from '@fal-ai/client';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prompt = "A futuristic city in Bangalore at sunset, cinematic lighting, 4k";

async function testPollinations() {
  console.log('--- Testing Pollinations ---');
  try {
    const videoUrl = `https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}?model=seedance&duration=5`;
    const res = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 });
    console.log('Pollinations OK, length:', res.data.byteLength);
  } catch (e: any) {
    console.error('Pollinations failed:', e.message);
  }
}

async function testReplicate() {
  console.log('--- Testing Replicate ---');
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) { console.log('No Replicate Token'); return; }
  try {
    const res = await axios.post(
      'https://api.replicate.com/v1/models/minimax/video-01/predictions',
      { input: { prompt } },
      { headers: { Authorization: `Token ${token}` } }
    );
    console.log('Replicate OK, ID:', res.data.id);
  } catch (e: any) {
    console.error('Replicate failed:', e.response?.data || e.message);
  }
}

async function testHF() {
  console.log('--- Testing HF Router ---');
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) { console.log('No HF Token'); return; }
  try {
    const url = 'https://router.huggingface.co/fal-ai/models/fal-ai/fast-animatediff/text-to-video';
    const res = await axios.post(
      url,
      { inputs: "A cat running" },
      { headers: { Authorization: `Bearer ${token}` }, responseType: 'arraybuffer' }
    );
    console.log('HF OK, length:', res.data.byteLength);
  } catch (e: any) {
    console.error('HF failed:', e.response?.data ? Buffer.from(e.response.data as any).toString('utf-8') : e.message);
  }
}

async function testFal() {
  console.log('--- Testing fal.ai ---');
  const key = process.env.FAL_KEY;
  if (!key) { console.log('No Fal Key'); return; }
  try {
    fal.config({ credentials: key });
    const result: any = await fal.subscribe('fal-ai/kling-video/v3/standard/text-to-video', {
      input: { prompt, duration: '5' }
    });
    console.log('Fal OK:', result?.data?.video?.url || result?.video?.url);
  } catch (e: any) {
    console.error('Fal failed:', e.message);
  }
}

async function runAll() {
  await testPollinations();
  console.log('\n');
  await testReplicate();
  console.log('\n');
  await testHF();
  console.log('\n');
  await testFal();
}

runAll();
