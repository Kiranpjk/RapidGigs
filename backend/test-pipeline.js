/**
 * test-pipeline.js — Full end-to-end test of the video generation pipeline
 * Usage: node test-pipeline.js
 *
 * 1. Tests Cerebras prompt generation (Llama 3.3 70B)
 * 2. Tests Replicate video generation (MiniMax video-01)
 */

const axios = require('axios');
require('dotenv').config();

const JOB_DESCRIPTION = `ON CAMPUS Drive for ALTRODAV TECHNOLOGIES PVT LTD
Sales and Marketing Executive / Strategic Growth Associate
CTC Rs.12 LPA (Rs.6L Fixed + Rs.6L Performance Variable)
Location: Bangalore | 2026 Batch | Good Communication Skills Required

Altrodav Technologies Pvt. Ltd. is an IT startup incorporated April 2024 in Bengaluru.
Role: Drive user/customer acquisition through direct sales and strategic outreach.
Manage end-to-end sales cycle from lead generation to conversion.
Build and maintain relationships with clients and stakeholders.
Meet weekly/bi-weekly/monthly targets. Performance-driven culture.`;

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;

async function testCerebras() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Cerebras Prompt Enhancement (llama-3.3-70b)');
  console.log('='.repeat(60));

  if (!CEREBRAS_KEY) { console.log('SKIP: No CEREBRAS_API_KEY'); return null; }

  try {
    console.log('  Trying Cerebras llama-3.3-70b...');
    const res = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama-3.3-70b',
        max_tokens: 600,
        temperature: 0.8,
        messages: [
          { role: 'system', content: PROMPT_SYSTEM },
          { role: 'user', content: buildUserMsg(JOB_DESCRIPTION) },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${CEREBRAS_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    let prompt = res.data.choices[0]?.message?.content?.trim();
    if (!prompt) { console.log('  Empty response'); return null; }
    prompt = prompt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    prompt = prompt.replace(/^["""]|["""]$/g, '').trim();
    if (prompt.length < 50) { console.log('  Response too short'); return null; }

    const sentences = prompt.split(/(?<=[.!?])\s+/).filter(s => s.length > 5);
    console.log(`  SUCCESS! ${sentences.length} sentences, ${prompt.length} chars`);
    console.log(`\n--- ENHANCED PROMPT ---\n${prompt}\n--- END ---\n`);
    return prompt;
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.log(`  Failed: ${msg}`);
    return null;
  }
}

const PROMPT_SYSTEM = `You are an award-winning cinematic director who converts job descriptions into hyper-realistic video prompts for AI text-to-video models like Kling 3.0, Wan 2.1, and Seedance.

OUTPUT FORMAT: A SINGLE paragraph — EXACTLY 5-7 sentences — of pure visual description. NO explanations, NO headers, NO quotes, NO meta-commentary.

EVERY prompt MUST weave in: company name, specific role, salary (workspace quality), location/city, required skills/tools, seniority level.

MANDATORY:
1. ENVIRONMENT: Exact workspace (architecture, furniture, lighting, window views, city skyline)
2. THE PERSON: Clothing style, posture, energy, age range matching role
3. CORE ACTIVITY: Show actual work — presenting, using tools, typing, meeting clients
4. TOOLS & ARTIFACTS: Real physical tools — monitors, screens, whiteboards, documents
5. ATMOSPHERE: Precise lighting, time of day, color temperature, ambient sounds
6. CAMERA DIRECTION: Shot type + camera movement (wide establishing, slow dolly, tracking, rack focus)

NEVER: text overlays, subtitles, floating screens, narrator, brand logos. ONLY real physical visual scenes.`;

function buildUserMsg(desc) {
  return `Convert this job posting into a hyper-realistic cinematic video prompt.\nJob Description:\n"""\n${desc.slice(0, 1500)}\n"""\nWrite exactly 5-7 sentences of pure cinematic visual description. Be extremely specific to THIS role.`;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── TEST: OpenRouter fallback (1 attempt per model, no retries) ────────────────
async function testOpenRouterFallback() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: OpenRouter Fallback (glm-4.5-air → minimax-m2.5)');
  console.log('='.repeat(60));

  if (!OPENROUTER_KEY) { console.log('SKIP: No OPENROUTER_API_KEY'); return null; }

  for (const model of ['z-ai/glm-4.5-air:free', 'minimax/minimax-m2.5:free']) {
    try {
      console.log(`  Trying ${model}...`);
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          max_tokens: 600,
          temperature: 0.8,
          messages: [
            { role: 'system', content: PROMPT_SYSTEM },
            { role: 'user', content: buildUserMsg(JOB_DESCRIPTION) },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'RapidGigs',
          },
          timeout: 30000,
        }
      );
      let prompt = res.data.choices[0]?.message?.content?.trim();
      if (!prompt) continue;
      prompt = prompt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      prompt = prompt.replace(/^["""]|["""]$/g, '').trim();
      if (prompt.length < 50) continue;

      const sentences = prompt.split(/(?<=[.!?])\s+/).filter(s => s.length > 5);
      console.log(`  SUCCESS! ${sentences.length} sentences, ${prompt.length} chars`);
      console.log(`\n--- ENHANCED PROMPT ---\n${prompt}\n--- END ---\n`);
      return prompt;
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      console.log(`  Failed: ${msg}`);
    }
  }
  return null;
}

// ── TEST 2: Replicate Video Generation (MiniMax video-01) ────────────────────
async function testReplicateVideo(videoPrompt) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Replicate Video Generation (minimax/video-01)');
  console.log('='.repeat(60));

  if (!REPLICATE_TOKEN) { console.log('SKIP: No REPLICATE_API_TOKEN'); return null; }

  const startTime = Date.now();
  console.log(`  Creating prediction for MiniMax video-01...`);

  // Create prediction
  const createRes = await axios.post(
    'https://api.replicate.com/v1/models/minimax/video-01/predictions',
    { input: { prompt: videoPrompt } },
    {
      headers: {
        Authorization: `Token ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const predictionId = createRes.data.id;
  const pollUrl = createRes.data.urls?.get;
  console.log(`  Prediction ID: ${predictionId}`);
  console.log(`  Polling every 10s...`);

  // Poll until done (max 10 min)
  for (let i = 0; i < 60; i++) {
    await sleep(10000);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const pollRes = await axios.get(pollUrl, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
      timeout: 15000,
    });

    const { status, output, error } = pollRes.data;
    console.log(`  [${elapsed}s] Status: ${status}`);

    if (status === 'succeeded') {
      const videoUrl = Array.isArray(output) ? output[0] : output;
      console.log(`\n  SUCCESS! Video generated in ${elapsed}s`);
      console.log(`  Video URL: ${videoUrl}`);

      // Quick download test
      const resp = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      const sizeMB = (resp.data.byteLength / 1024 / 1024).toFixed(2);
      console.log(`  Video size: ${sizeMB} MB`);
      return videoUrl;
    }
    if (status === 'failed') {
      console.log(`  FAILED: ${error || 'unknown error'}`);
      return null;
    }
  }
  console.log('  TIMEOUT after 10 minutes');
  return null;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  RapidGigs Pipeline Test — Prompt → Video Generation      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nJob: ALTRODAV TECHNOLOGIES — Sales and Marketing Executive`);

  // Step 1: Prompt enhancement — Cerebras → OpenRouter fallback
  let enhancedPrompt = await testCerebras();
  if (!enhancedPrompt) {
    enhancedPrompt = await testOpenRouterFallback();
  }
  if (!enhancedPrompt) {
    console.log('\nAll prompt enhancers failed. Using raw description.');
  }

  const videoPrompt = enhancedPrompt || JOB_DESCRIPTION.slice(0, 500);

  // Step 2: Video generation (takes 2-5 min)
  const videoUrl = await testReplicateVideo(videoPrompt);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('PIPELINE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Prompt Enhancement: ${enhancedPrompt ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Video Generation:   ${videoUrl ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Final Video:      ${videoUrl || 'N/A'}`);
  process.exit(videoUrl ? 0 : 1);
})();
