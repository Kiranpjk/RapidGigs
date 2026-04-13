import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.WAVESPEED_API_KEY;

async function listModels() {
  if (!apiKey) {
    console.error('No WAVESPEED_API_KEY found');
    return;
  }

  try {
    console.log('Fetching WaveSpeed models...');
    const response = await axios.get('https://api.wavespeed.ai/api/v3/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    console.log('Models:', JSON.stringify(response.data, null, 2));
  } catch (err: any) {
    console.error('Failed to list models:', err.response?.data || err.message);
  }
}

listModels();
