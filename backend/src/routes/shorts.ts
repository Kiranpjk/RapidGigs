/**
 * shorts.ts — AI Video Generation Routes
 *
 * Video provider priority:
 *   1. Pollinations.ai (needs API key + balance)
 *   2. HuggingFace Inference Providers (via router.huggingface.co — fal-ai / wavespeed-ai)
 *   3. Modal.com (serverless GPU, if MODAL_ENDPOINT set)
 *   4. Helios (local GPU, if HELIOS_SERVICE_URL set)
 *   5. fal.ai (pay-per-use direct, if FAL_KEY set)
 *
 * Prompt enhancement:
 *   1. Ollama + Qwen 3.5 (local, free, no rate limits)
 *   2. Groq (cloud, free tier)
 *   3. Raw description fallback
 *
 * Flow:
 *   Job description → Ollama/Groq → cinematic prompt → video provider → MP4
 *
 * NOTE: HuggingFace changed its API in 2025.
 *   - Old:  https://api-inference.huggingface.co  ← DEPRECATED (410)
 *   - New:  https://router.huggingface.co/<provider>/models/<model>
 *   Video models (ali-vilab, cogvideox, etc.) are hosted by inference
 *   PROVIDERS (fal-ai, wavespeed-ai) — NOT by HF's own servers.
 *   Use router.huggingface.co/fal-ai/... or /wavespeed-ai/... with your HF token.
 */

import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { fal } from '@fal-ai/client';
import { ShortVideo } from '../models/ShortVideo';
import { authenticate, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ── In-memory job store (single instance — fine for Render free tier) ─────────
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface VideoJob {
  id: string;
  status: JobStatus;
  videoUrl?: string;
  error?: string;
  prompt: string;
  userId: string;
  createdAt: Date;
  provider?: string;
}

const jobStore = new Map<string, VideoJob>();

// Clean up jobs older than 2 hours
setInterval(() => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  for (const [id, job] of jobStore.entries()) {
    if (job.createdAt < twoHoursAgo) jobStore.delete(id);
  }
}, 30 * 60 * 1000);

const generateJobId = () =>
  `vj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ── Prompt system message (shared between Ollama and Groq) ────────────────────
const PROMPT_SYSTEM = `You are an expert at converting job descriptions into vivid, specific cinematic video prompts for text-to-video AI models.

Rules:
- Output ONLY the video prompt. No explanation, no quotes, no headers, no thinking tags.
- 2-3 sentences maximum.
- Be SPECIFIC to the actual job role — not generic. A nurse job should show medical settings, a developer job should show the specific tech stack or product, a chef job should show the kitchen, etc.
- Reflect seniority/experience level through the scene (junior = learning/collaborative, senior = leading/confident).
- Reflect salary/prestige through environment quality (entry-level = coworking space, senior/high-pay = premium office or specialized lab).
- Include the core skill or activity the job involves as the central visual action.
- No text overlays, no subtitles, no UI mockups. Pure visual cinematic scene only.
- Professional, inspiring, realistic mood.`;

function buildPromptUserMsg(jobDescription: string): string {
  return `Convert this job description into a specific cinematic video prompt that visually represents what this job ACTUALLY LOOKS LIKE day-to-day — the work environment, the core activity, and the seniority/calibre of the person doing it. Extract key details: role title, required skills, experience level, and salary if mentioned — use these to drive the visual scene.

Job Description:
"""
${jobDescription.slice(0, 600)}
"""

Output only the video prompt (2-3 sentences, visuals only, no text overlays):`;
}

// ── Step 1a: Use Ollama + Qwen 3.5 (local, free) ─────────────────────────────
async function buildVideoPromptOllama(jobDescription: string): Promise<string | null> {
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  try {
    // Quick health check first (1s timeout) to avoid waiting 90s if Ollama is down
    try {
      await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2_000 });
    } catch {
      console.warn('Ollama not reachable, skipping...');
      return null;
    }

    console.log('Trying Ollama (Qwen 3.5) for prompt enhancement...');
    const res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: process.env.OLLAMA_MODEL || 'qwen3.5',
        messages: [
          { role: 'system', content: PROMPT_SYSTEM },
          { role: 'user', content: buildPromptUserMsg(jobDescription) },
          // Prefill assistant with empty think block to skip reasoning
          { role: 'assistant', content: '<think>\n\n</think>\n' },
        ],
        stream: false,
        options: { temperature: 0.7, num_predict: 150, think: false },
      },
      { timeout: 90_000 } // 90s — generous for cold start + model loading
    );
    let prompt = res.data?.message?.content?.trim();
    // Strip any <think>...</think> tags Qwen might still add
    if (prompt) {
      prompt = prompt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }
    if (prompt) {
      console.log(`Ollama prompt: "${prompt}"`);
      return prompt;
    }
    console.warn('Ollama returned empty content');
    return null;
  } catch (err: any) {
    console.warn('Ollama prompt generation failed:', err.message);
    return null;
  }
}

// ── Step 1b: Groq fallback ────────────────────────────────────────────────────
async function buildVideoPromptGroq(jobDescription: string): Promise<string | null> {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return null;

  try {
    console.log('Trying Groq for prompt enhancement...');
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 120,
        temperature: 0.7,
        messages: [
          { role: 'system', content: PROMPT_SYSTEM },
          { role: 'user', content: buildPromptUserMsg(jobDescription) },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );
    const prompt = res.data.choices[0]?.message?.content?.trim();
    if (prompt) {
      console.log(`Groq prompt: "${prompt}"`);
      return prompt;
    }
    return null;
  } catch (err: any) {
    console.warn('Groq prompt generation failed:', err.message);
    return null;
  }
}

// ── Combined prompt builder: Ollama → Groq → raw fallback ────────────────────
async function buildVideoPrompt(jobDescription: string): Promise<string> {
  // Try Ollama first (local, free, no rate limits)
  const ollamaPrompt = await buildVideoPromptOllama(jobDescription);
  if (ollamaPrompt) return ollamaPrompt;

  // Fallback to Groq (cloud, free tier)
  const groqPrompt = await buildVideoPromptGroq(jobDescription);
  if (groqPrompt) return groqPrompt;

  console.log('All prompt enhancers failed — using raw description');
  return jobDescription;
}


// ── Step 2: Try each video provider in order ──────────────────────────────────
async function generateVideoUrl(
  prompt: string,
  jobId: string,
  callbackUrl?: string
): Promise<{ videoUrl: string; provider: string } | null> {

  const HELIOS_URL   = process.env.HELIOS_SERVICE_URL;
  const MODAL_URL    = process.env.MODAL_ENDPOINT;
  const FAL_KEY      = process.env.FAL_KEY;
  const POLLINATIONS_KEY = process.env.POLLINATIONS_KEY; // optional

  // ── Provider 1: Pollinations.ai ────────────────────────────────────────────
  {
    // Try video models in order (seedance and veo are newer, higher quality)
    const videoModels = ['seedance', 'wan-fast', 'veo', 'ltx-2', 'nova-reel'];

    // Try WITHOUT key first (free tier), then WITH key as fallback
    // This avoids 401 errors when the account balance is depleted
    const authModes: Array<{ label: string; key?: string }> = [
      { label: 'free (no key)' },
      ...(POLLINATIONS_KEY ? [{ label: 'with API key', key: POLLINATIONS_KEY }] : []),
    ];

    for (const auth of authModes) {
      for (const model of videoModels) {
        try {
          console.log(`Trying Pollinations.ai (${model}, ${auth.label})...`);
          const encodedPrompt = encodeURIComponent(prompt);
          const params = new URLSearchParams({
            model,
            duration: '5',
            aspectRatio: '16:9',
          });
          if (auth.key) params.set('key', auth.key);

          const videoUrl = `https://gen.pollinations.ai/video/${encodedPrompt}?${params.toString()}`;

          const headers: Record<string, string> = {};
          if (auth.key) headers['Authorization'] = `Bearer ${auth.key}`;

          const res = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 180_000, // 3 min timeout for video gen
            headers,
          });

          if (res.status === 200 && res.data.byteLength > 1000) {
            // Save the video locally
            const uploadsDir = process.env.UPLOAD_DIR || './uploads';
            const videosDir = path.join(uploadsDir, 'videos');
            if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

            const filename = `${jobId}.mp4`;
            const filepath = path.join(videosDir, filename);
            fs.writeFileSync(filepath, Buffer.from(res.data));

            const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
            const savedUrl = `${baseUrl}/uploads/videos/${filename}`;
            console.log(`✅ Pollinations (${model}) video saved: ${savedUrl}`);
            return { videoUrl: savedUrl, provider: `pollinations-${model}` };
          }
        } catch (e: any) {
          const status = e.response?.status || 'no response';
          console.warn(`Pollinations (${model}, ${auth.label}) failed [${status}]:`, e.message);
          // If we get 401/403 with this auth mode, skip remaining models for this mode
          if (e.response?.status === 401 || e.response?.status === 403) {
            console.warn(`  → Auth mode "${auth.label}" rejected, skipping remaining models for this mode`);
            break;
          }
        }
      }
    }
  }

  // ── Provider 2: Replicate (free credits for new accounts) ────────────────────
  {
    const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (REPLICATE_TOKEN) {
      // Models to try in order — all support text-to-video on Replicate
      const replicateModels: Array<{ owner: string; name: string; inputKey: string }> = [
        { owner: 'minimax',      name: 'video-01',            inputKey: 'prompt' },
        { owner: 'wavespeed-ai', name: 'wan-2.1-t2v-480p',   inputKey: 'prompt' },
        { owner: 'lucataco',     name: 'cogvideox-5b',        inputKey: 'prompt' },
      ];

      for (const model of replicateModels) {
        try {
          console.log(`Trying Replicate (${model.owner}/${model.name})...`);

          // Step 1: Create prediction
          const createRes = await axios.post(
            `https://api.replicate.com/v1/models/${model.owner}/${model.name}/predictions`,
            { input: { [model.inputKey]: prompt } },
            {
              headers: {
                Authorization: `Token ${REPLICATE_TOKEN}`,
                'Content-Type': 'application/json',
              },
              timeout: 30_000,
            }
          );

          const predictionId: string = createRes.data.id;
          const pollUrl: string = createRes.data.urls?.get;
          if (!predictionId || !pollUrl) throw new Error('No prediction ID returned');

          console.log(`  Replicate prediction ${predictionId} started, polling...`);

          // Step 2: Poll until completed (max 10 min)
          let videoUrl: string | null = null;
          for (let i = 0; i < 72; i++) {
            await new Promise(r => setTimeout(r, 8_000)); // 8s between polls

            const pollRes = await axios.get(pollUrl, {
              headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
              timeout: 15_000,
            });

            const { status, output, error } = pollRes.data;
            console.log(`  Replicate status [${i + 1}/72]: ${status}`);

            if (status === 'succeeded') {
              // output can be a string URL or array of URLs
              videoUrl = Array.isArray(output) ? output[0] : output;
              break;
            }
            if (status === 'failed' || error) {
              throw new Error(`Replicate generation failed: ${error || 'unknown'}`);
            }
          }

          if (!videoUrl) throw new Error('Replicate polling timed out');

          // Step 3: Download and save locally
          const videoRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 120_000,
          });

          if (videoRes.data.byteLength > 1000) {
            const uploadsDir = process.env.UPLOAD_DIR || './uploads';
            const videosDir = path.join(uploadsDir, 'videos');
            if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

            const filename = `${jobId}.mp4`;
            const filepath = path.join(videosDir, filename);
            fs.writeFileSync(filepath, Buffer.from(videoRes.data));

            const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
            const savedUrl = `${baseUrl}/uploads/videos/${filename}`;
            console.log(`✅ Replicate (${model.owner}/${model.name}) video saved: ${savedUrl}`);
            return { videoUrl: savedUrl, provider: `replicate-${model.owner}-${model.name}` };
          }
        } catch (e: any) {
          const status = e.response?.status || 'no response';
          console.warn(`Replicate (${model.owner}/${model.name}) failed [${status}]:`, e.message);
          if (e.response?.status === 402) {
            console.warn('  → Replicate credits exhausted. Top up at https://replicate.com/account/billing');
            break; // No point trying other models if credits are gone
          }
        }
      }
    } else {
      console.log('Replicate skipped — no REPLICATE_API_TOKEN set');
    }
  }

  // ── Provider 3: HuggingFace Inference Providers (via router.huggingface.co) ─
  //
  // HF's own servers don't host video models — they're on third-party providers.
  // We route through fal-ai and wavespeed-ai using the HF token.
  // Provider URL format: https://router.huggingface.co/<provider>/models/<model>
  {
    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

    if (HF_TOKEN) {
      // Models proven to work via HF inference providers (as of 2025)
      // Each entry: [provider-slug, model-id, display-name]
      const hfProviderModels: Array<[string, string, string]> = [
        ['fal-ai',      'fal-ai/fast-animatediff/text-to-video', 'AnimateDiff (fal-ai)'],
        ['fal-ai',      'wan-ai/Wan2.1-T2V-14B',                 'Wan2.1-T2V (fal-ai)'],
        ['wavespeed-ai', 'wan-ai/Wan2.1-T2V-14B',                'Wan2.1-T2V (wavespeed)'],
        ['fal-ai',      'tencent/HunyuanVideo',                  'HunyuanVideo (fal-ai)'],
      ];

      for (const [providerSlug, modelId, label] of hfProviderModels) {
        try {
          console.log(`Trying HuggingFace router → ${label}...`);
          const url = `https://router.huggingface.co/${providerSlug}/models/${modelId}`;
          const res = await axios.post(
            url,
            { inputs: prompt },
            {
              headers: {
                Authorization: `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
              },
              responseType: 'arraybuffer',
              timeout: 300_000, // 5 min — video gen can be slow
            }
          );

          if (res.status === 200 && res.data.byteLength > 1000) {
            const uploadsDir = process.env.UPLOAD_DIR || './uploads';
            const videosDir = path.join(uploadsDir, 'videos');
            if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

            const filename = `${jobId}.mp4`;
            const filepath = path.join(videosDir, filename);
            fs.writeFileSync(filepath, Buffer.from(res.data));

            const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
            const savedUrl = `${baseUrl}/uploads/videos/${filename}`;
            console.log(`✅ HuggingFace router (${label}) video saved: ${savedUrl}`);
            return { videoUrl: savedUrl, provider: `hf-router-${providerSlug}` };
          }
        } catch (e: any) {
          const status = e.response?.status || 'no response';
          const detail = e.response?.data
            ? Buffer.from(e.response.data).toString('utf-8').slice(0, 300)
            : e.message;
          console.warn(`HuggingFace router (${label}) failed [${status}]:`, detail);

          if (e.response?.status === 503) {
            console.warn(`  → Model loading — may need a retry in a few minutes`);
          } else if (e.response?.status === 402) {
            console.warn(`  → Insufficient HF credits for this provider, trying next...`);
          }
          // Continue to next model/provider
        }
      }

      console.warn('All HuggingFace router providers failed.');
    } else {
      console.log('HuggingFace skipped — no HUGGINGFACE_TOKEN set');
    }
  }

  // ── Provider 3: Modal.com (serverless GPU — best for production) ──────────
  if (MODAL_URL) {
    try {
      console.log('Trying Modal.com...');
      const res = await axios.post(MODAL_URL, {
        prompt,
        num_frames: 73,
        height: 384,
        width: 640,
        job_id: jobId,
        callback_url: callbackUrl,
      }, { timeout: 660_000 });

      if (res.data.video_url && !res.data.video_url.startsWith('data:')) {
        return { videoUrl: res.data.video_url, provider: 'modal' };
      }

      if (res.data.video_url?.startsWith('data:')) {
        return { videoUrl: res.data.video_url, provider: 'modal' };
      }
    } catch (e: any) {
      console.warn('Modal failed:', e.message);
    }
  }

  // ── Provider 4: Self-hosted Helios (local GPU via Cloudflare tunnel) ──────
  if (HELIOS_URL) {
    try {
      console.log('Trying self-hosted Helios at', HELIOS_URL);
      const res = await axios.post(
        `${HELIOS_URL}/generate`,
        { prompt, num_frames: 73, job_id: jobId },
        { timeout: 660_000 }
      );
      let videoUrl = res.data.video_url;
      if (videoUrl?.startsWith('/')) videoUrl = `${HELIOS_URL}${videoUrl}`;
      return { videoUrl, provider: 'helios-local' };
    } catch (e: any) {
      console.warn('Local Helios failed:', e.message);
    }
  }

  // ── Provider 5: fal.ai (pay-per-use cloud fallback) ───────────────────────
  if (FAL_KEY) {
    try {
      console.log('Trying fal.ai (Hunyuan Video)...');
      fal.config({ credentials: FAL_KEY });

      const { request_id } = await fal.queue.submit('fal-ai/hunyuan-video', {
        input: {
          prompt,
          num_frames: '85',
          resolution: '480p',
          aspect_ratio: '16:9',
        }
      });

      console.log('fal.ai request_id:', request_id);

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const status = await fal.queue.status('fal-ai/hunyuan-video', {
          requestId: request_id,
          logs: false,
        });

        console.log('fal.ai status:', status.status);

        if (status.status === 'COMPLETED') {
          const result = await fal.queue.result('fal-ai/hunyuan-video', {
            requestId: request_id,
          });
          const videoUrl = (result.data as any)?.video?.url;
          if (videoUrl) return { videoUrl, provider: 'fal.ai' };
          throw new Error('No video URL in result');
        }

        if ((status as any).status === 'FAILED' || (status as any).error) {
          throw new Error('fal.ai generation failed');
        }
      }
      throw new Error('fal.ai polling timeout after 5 minutes');

    } catch (e: any) {
      console.warn('fal.ai failed:', e.message);
    }
  }

  // ── All providers exhausted ───────────────────────────────────────────────
  console.error('❌ All video providers failed. Diagnostics:');
  console.error(`   Pollinations:  balance depleted or API requires auth`);
  console.error(`   Replicate:     ${process.env.REPLICATE_API_TOKEN ? 'token set — credits may be exhausted' : 'NO token — sign up free at https://replicate.com'}`);
  console.error(`   HuggingFace:   ${process.env.HUGGINGFACE_TOKEN ? 'token set — providers (fal-ai/wavespeed) may have insufficient credits' : 'NO token — get free one at https://huggingface.co/settings/tokens'}`);
  console.error(`   Modal:         ${MODAL_URL ? 'endpoint set' : 'not configured'}`);
  console.error(`   Helios:        ${HELIOS_URL ? 'endpoint set' : 'not configured'}`);
  console.error(`   fal.ai direct: ${FAL_KEY ? 'key set (may be expired)' : 'not configured'}`);
  console.error(`   Tip: Add HUGGINGFACE_TOKEN credits at https://huggingface.co/settings/billing`);

  return null;
}


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/generate
// Kicks off async generation, returns jobId immediately
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate', authenticate, async (req: AuthRequest, res) => {
  const { prompt, title, description } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt (job description) is required' });
  }

  const jobId = generateJobId();
  const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;
  const callbackUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/shorts/callback`;

  // ── Option A: Delegate to n8n (recommended for production) ────────────────
  if (N8N_WEBHOOK) {
    try {
      await axios.post(N8N_WEBHOOK, {
        job_id: jobId,
        job_description: prompt,
        title: title || 'AI Generated Short',
        description: description || prompt,
        user_id: req.user!.userId,
        callback_url: callbackUrl,
      }, { timeout: 10_000 });

      jobStore.set(jobId, {
        id: jobId,
        status: 'pending',
        prompt,
        userId: req.user!.userId,
        createdAt: new Date(),
        provider: 'n8n',
      });

      return res.status(202).json({
        message: 'Video generation queued via n8n',
        jobId,
        pollUrl: `/api/shorts/status/${jobId}`,
      });
    } catch (e: any) {
      console.warn('n8n webhook failed, falling back to direct generation:', e.message);
    }
  }

  // ── Option B: Direct generation (background, non-blocking) ────────────────
  jobStore.set(jobId, {
    id: jobId,
    status: 'processing',
    prompt,
    userId: req.user!.userId,
    createdAt: new Date(),
  });

  // Respond immediately — generation happens in background
  res.status(202).json({
    message: 'Video generation started',
    jobId,
    pollUrl: `/api/shorts/status/${jobId}`,
  });

  // Background processing (don't await)
  (async () => {
    try {
      // Step 1: Enhance prompt with Groq
      const videoPrompt = await buildVideoPrompt(prompt);

      // Step 2: Generate video
      const result = await generateVideoUrl(videoPrompt, jobId, callbackUrl);

      if (!result) {
        jobStore.set(jobId, {
          ...jobStore.get(jobId)!,
          status: 'failed',
          error: 'All video providers unavailable. Set MODAL_ENDPOINT, HELIOS_SERVICE_URL, or FAL_KEY.',
        });
        return;
      }

      // Step 3: Save to MongoDB
      const newShort = new ShortVideo({
        userId: req.user!.userId,
        title: title || 'AI Generated Short',
        description: description || prompt,
        videoUrl: result.videoUrl,
        likes: 0,
        views: 0,
      });
      await newShort.save();

      jobStore.set(jobId, {
        ...jobStore.get(jobId)!,
        status: 'completed',
        videoUrl: result.videoUrl,
        provider: result.provider,
      });

      console.log(`Job ${jobId} completed via ${result.provider}`);
    } catch (err: any) {
      console.error(`Job ${jobId} failed:`, err.message);
      jobStore.set(jobId, {
        ...jobStore.get(jobId)!,
        status: 'failed',
        error: err.message,
      });
    }
  })();
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/from-job/:jobId
// Reads a saved Job from DB, builds a rich prompt, generates video in background
// and patches the job's shortVideoUrl when done
// ─────────────────────────────────────────────────────────────────────────────
router.post('/from-job/:jobId', authenticate, async (req: AuthRequest, res) => {
  try {
    const jobDoc = await Job.findById(req.params.jobId);
    if (!jobDoc) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only the job owner can trigger video gen
    if (jobDoc.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the job poster can generate a video' });
    }

    // Build a rich context string from ALL job fields
    const richDescription = [
      `Role: ${jobDoc.title}`,
      `Company: ${jobDoc.company}`,
      `Location: ${jobDoc.location}`,
      `Work Type: ${jobDoc.type}`,
      `Salary/Pay: ${jobDoc.pay}`,
      jobDoc.description ? `Description: ${jobDoc.description}` : '',
    ].filter(Boolean).join('\n');

    const videoJobId = generateJobId();
    const callbackUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/shorts/callback`;

    // Store in job tracker
    jobStore.set(videoJobId, {
      id: videoJobId,
      status: 'processing',
      prompt: richDescription,
      userId: req.user!.userId,
      createdAt: new Date(),
    });

    // Respond immediately — video generates in the background
    res.status(202).json({
      message: 'Video generation started from job details',
      jobId: videoJobId,
      mongoJobId: jobDoc._id.toString(),
      pollUrl: `/api/shorts/status/${videoJobId}`,
    });

    // ── Background processing ──────────────────────────────────────────────
    (async () => {
      try {
        // Step 1: Enhance prompt using Ollama/Groq with full job context
        const videoPrompt = await buildVideoPrompt(richDescription);
        console.log(`[from-job] Enhanced prompt for "${jobDoc.title}": "${videoPrompt}"`);

        // Step 2: Generate video
        const result = await generateVideoUrl(videoPrompt, videoJobId, callbackUrl);

        if (!result) {
          jobStore.set(videoJobId, {
            ...jobStore.get(videoJobId)!,
            status: 'failed',
            error: 'All video providers unavailable.',
          });
          return;
        }

        // Step 3: Save as ShortVideo in DB
        const newShort = new ShortVideo({
          userId: req.user!.userId,
          title: `${jobDoc.title} @ ${jobDoc.company}`,
          description: jobDoc.description,
          videoUrl: result.videoUrl,
          likes: 0,
          views: 0,
        });
        await newShort.save();

        // Step 4: Patch the original Job's shortVideoUrl so it appears on the feed
        await Job.findByIdAndUpdate(jobDoc._id, { shortVideoUrl: result.videoUrl });
        console.log(`[from-job] Job ${jobDoc._id} shortVideoUrl updated to ${result.videoUrl}`);

        // Step 5: Mark job as completed
        jobStore.set(videoJobId, {
          ...jobStore.get(videoJobId)!,
          status: 'completed',
          videoUrl: result.videoUrl,
          provider: result.provider,
        });

        console.log(`[from-job] Job ${videoJobId} completed via ${result.provider}`);
      } catch (err: any) {
        console.error(`[from-job] Job ${videoJobId} failed:`, err.message);
        jobStore.set(videoJobId, {
          ...jobStore.get(videoJobId)!,
          status: 'failed',
          error: err.message,
        });
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shorts/status/:jobId
// Frontend polls this every 5 seconds
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status/:jobId', authenticate, async (req: AuthRequest, res) => {
  const job = jobStore.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  if (job.userId !== req.user!.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    videoUrl: job.videoUrl || null,
    error: job.error || null,
    provider: job.provider || null,
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/callback
// Called by Modal, n8n, or Helios when async generation completes
// ─────────────────────────────────────────────────────────────────────────────
router.post('/callback', async (req, res) => {
  const { job_id, status, video_url, user_id, title, description } = req.body;

  if (!job_id) return res.status(400).json({ error: 'job_id required' });

  try {
    if (status === 'completed' && video_url) {
      // Save to DB if not already saved (n8n path)
      const existing = await ShortVideo.findOne({ videoUrl: video_url });
      if (!existing && user_id) {
        const newShort = new ShortVideo({
          userId: user_id,
          title: title || 'AI Generated Short',
          description: description || '',
          videoUrl: video_url,
          likes: 0,
          views: 0,
        });
        await newShort.save();
      }

      // Update job store
      const existingJob = jobStore.get(job_id);
      if (existingJob) {
        jobStore.set(job_id, {
          ...existingJob,
          status: 'completed',
          videoUrl: video_url,
        });
      }
    } else if (status === 'failed') {
      const existingJob = jobStore.get(job_id);
      if (existingJob) {
        jobStore.set(job_id, {
          ...existingJob,
          status: 'failed',
          error: req.body.error || 'Generation failed',
        });
      }
    }

    res.json({ message: 'Callback received' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// Shorts feed (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
import { Job } from '../models/Job';
import { User } from '../models/User';

router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId);
    const isStudent = user?.role === 'student' || user?.isStudent;
    const isRecruiter = user?.role === 'recruiter' || user?.isRecruiter;
    let feedItems: any[] = [];

    if (isStudent) {
      const jobsWithVideos = await Job.find({ shortVideoUrl: { $exists: true, $ne: '' } })
        .populate('postedBy', 'name avatarUrl role')
        .sort({ updatedAt: -1 })
        .limit(20);

      feedItems = jobsWithVideos.map(job => ({
        type: 'job',
        id: job._id.toString(),
        title: job.title,
        company: job.company,
        description: job.description,
        videoUrl: job.shortVideoUrl,
        likes: job.likes || 10,
        views: (job.likes || 0) * 5 + 50,
        comments: job.comments || 0,
        shares: job.shares || 0,
        pay: job.pay,
        createdAt: job.createdAt,
        author: {
          name: job.company,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}`,
        }
      }));
    } else if (isRecruiter) {
      const candidateVideos = await ShortVideo.find()
        .populate({ path: 'userId', match: { role: 'student' }, select: 'name avatarUrl title' })
        .sort({ createdAt: -1 })
        .limit(40);

      feedItems = candidateVideos
        .filter(v => v.userId !== null)
        .map(v => ({
          type: 'candidate_intro',
          id: v._id.toString(),
          title: v.title,
          description: v.description || '',
          videoUrl: v.videoUrl,
          likes: v.likes || 0,
          views: v.views || 0,
          createdAt: v.createdAt,
          author: {
            name: (v.userId as any).name,
            avatar: (v.userId as any).avatarUrl,
          }
        }));
    }

    const now = new Date();
    feedItems = feedItems
      .map(item => {
        const hoursOld = Math.max(0.5, (now.getTime() - new Date(item.createdAt).getTime()) / 3_600_000);
        const score = ((item.likes || 0) * 2 + (item.views || 0)) / Math.pow(hoursOld + 2, 1.2);
        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score);

    res.json(feedItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
