/**
 * promptBuilder.ts — Cinematic video prompt generation
 *
 * Converts job descriptions into richly detailed cinematic video prompts.
 * Chain: Cerebras (wafer-scale, fast) → OpenRouter (1 model, 1 retry) → Ollama → raw fallback
 */

import axios from 'axios';

// ── System message (shared across all LLM providers) ────────────────────────
const PROMPT_SYSTEM = `You are an award-winning cinematic director who converts job descriptions into hyper-realistic video prompts for AI text-to-video models like Kling 3.0, Wan 2.1, and Seedance.

OUTPUT FORMAT: A SINGLE paragraph — EXACTLY 5-7 sentences — of pure visual description. NO explanations, NO headers, NO quotes, NO meta-commentary.

EVERY prompt MUST weave in these details from the job description:
- COMPANY NAME — visible as real workplace branding (signs, letterhead, wall murals)
- SPECIFIC ROLE — the actual work activity being performed (not generic)
- SALARY LEVEL — reflected in workspace quality and environment prestige
- LOCATION/CITY — architecture, skyline, cultural cues of that city
- REQUIRED SKILLS — tools, software, instruments visibly in use
- SENIORITY LEVEL — fresh grad = younger, eager; senior = confident, seasoned

MANDATORY elements for each prompt:
1. ENVIRONMENT: Exact workspace — architecture style, furniture, lighting type, wall colors, window views, ambient details. Use the job's city to set architecture, skyline, cultural context.
2. THE PERSON: Clothing style (smart-casual/formal/traditional), posture, energy level, age range. Match the company culture (startup = relaxed creative; corporate = polished professional).
3. CORE ACTIVITY: Show the actual work — typing code, presenting to clients, using design tablets, reviewing financial spreadsheets, conducting interviews, operating machinery, conducting medical examinations. Be specific to the role.
4. TOOLS & ARTIFACTS: Real physical tools — laptop with visible code IDE, dual monitors with dashboard UIs, whiteboards with strategy diagrams, medical equipment, engineering tools, financial charts, CRM printouts on desk.
5. ATMOSPHERE: Precise lighting (golden hour, blue dawn, warm desk lamp, cool overhead LED), time of day, color temperature (warm amber, cool blue), implied ambient sounds (keyboard clatter, phone ringing, coffee machine).
6. CAMERA DIRECTION: Shot type (wide establishing, slow dolly push-in, tracking lateral, medium close-up with rack focus, crane pull-back) AND camera movement quality (smooth, handheld, gimbal-steady).

Environment prestige matching salary:
- Under 5 LPA: Basic shared workspace, fluorescent lighting, simple desks
- 5-12 LPA: Modern startup loft, exposed brick, colorful walls, standing desks, bean bags
- 12-25 LPA: Premium corporate office, glass-walled meeting rooms, city skyline windows, ergonomic furniture
- 25+ LPA: Executive corner office, mahogany desk, leather seating, panoramic glass walls, designer interiors

CRITICAL: Every sentence must paint a visual that AI video generators can render. Use concrete nouns (mahogany desk, dual monitors, VS Code editor, glass conference table) not abstract concepts (professional atmosphere, dynamic environment).

ABSOLUTELY NEVER: text overlays, subtitles, floating UI screens in mid-air, narrator descriptions, brand logos, voiceover, speech bubbles, captions. ONLY real physical visual scenes.`;

function buildPromptUserMsg(jobDescription: string): string {
  return `Convert this job posting into a hyper-realistic cinematic video prompt. Extract: company name, role title, core daily activities, required skills/tools, salary level, city/location, company culture type (startup/corporate/MNC), and seniority level — then paint a vivid, specific visual scene.

Job Description:
"""
${jobDescription.slice(0, 1500)}
"""

Write exactly 5-7 sentences of pure cinematic visual description. Every sentence must be visually renderable by an AI video model. Be extremely specific to THIS role and company — NOT generic.`;
}

// ── OpenRouter fallback models (1 attempt each, no retries) ─────────────────
const OPENROUTER_MODELS = [
  'z-ai/glm-4.5-air:free',
  'minimax/minimax-m2.5:free',
];

// ── Step 1: Cerebras (wafer-scale, fast, 30 RPM / 14,400 RPD) ─────────────
async function buildVideoPromptCerebras(jobDescription: string): Promise<string | null> {
  const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
  if (!CEREBRAS_KEY) return null;

  try {
    console.log('Trying Cerebras for prompt enhancement...');
    const res = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'qwen-3-235b-a22b-instruct-2507',
        max_tokens: 600,
        temperature: 0.8,
        messages: [
          { role: 'system', content: PROMPT_SYSTEM },
          { role: 'user', content: buildPromptUserMsg(jobDescription) },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${CEREBRAS_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );
    const prompt = res.data.choices[0]?.message?.content?.trim();
    if (prompt) {
      console.log(`Cerebras: "${prompt.slice(0, 100)}..."`);
      return prompt;
    }
    return null;
  } catch (err: any) {
    console.warn('Cerebras prompt generation failed:', err.message);
    return null;
  }
}

// ── Step 2: OpenRouter fallback (1 attempt per model, no retries) ─────────────
async function buildVideoPromptOpenRouter(jobDescription: string): Promise<string | null> {
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_KEY) return null;

  for (const model of OPENROUTER_MODELS) {
    try {
      console.log(`Trying OpenRouter ${model}...`);
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          max_tokens: 600,
          temperature: 0.8,
          messages: [
            { role: 'system', content: PROMPT_SYSTEM },
            { role: 'user', content: buildPromptUserMsg(jobDescription) },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'RapidGigs',
          },
          timeout: 30_000,
        }
      );
      let prompt = res.data.choices[0]?.message?.content?.trim();
      if (!prompt) continue;

      // Clean any thinking tags
      prompt = prompt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      // Remove quote wrapping
      prompt = prompt.replace(/^["""']|["""]$/g, '').trim();

      if (prompt.length < 50) continue;

      console.log(`${model} → "${prompt.slice(0, 100)}..."`);
      return prompt;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`OpenRouter ${model} failed: ${msg}`);
    }
  }
  return null;
}

// ── Step 3: Ollama (local) ──────────────────────────────────────────────────
async function buildVideoPromptOllama(jobDescription: string): Promise<string | null> {
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  try {
    try {
      await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2_000 });
    } catch {
      return null;
    }

    console.log('Trying Ollama for prompt enhancement...');
    const res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: process.env.OLLAMA_MODEL || 'qwen3.5',
        messages: [
          { role: 'system', content: PROMPT_SYSTEM },
          { role: 'user', content: buildPromptUserMsg(jobDescription) },
        ],
        stream: false,
        options: { temperature: 0.7, num_predict: 600, think: false },
      },
      { timeout: 90_000 }
    );
    let prompt = res.data?.message?.content?.trim();
    if (prompt) {
      prompt = prompt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      prompt = prompt.replace(/^[""]|[""]$/g, '').trim();
      console.log(`Ollama: "${prompt.slice(0, 100)}..."`);
      return prompt;
    }
    return null;
  } catch (err: any) {
    console.warn('Ollama prompt generation failed:', err.message);
    return null;
  }
}

// ── Exported public API ─────────────────────────────────────────────────────
export async function buildVideoPrompt(jobDescription: string): Promise<string> {
  // 1. Cerebras (wafer-scale, fast — 30 RPM / 14,400 RPD, Llama 3.3 70B)
  const cerebrasPrompt = await buildVideoPromptCerebras(jobDescription);
  if (cerebrasPrompt) return cerebrasPrompt;

  // 2. OpenRouter (glm-4.5-air → minimax-m2.5, 1 attempt each, no retries)
  const openRouterPrompt = await buildVideoPromptOpenRouter(jobDescription);
  if (openRouterPrompt) return openRouterPrompt;

  // 3. Ollama (local backup)
  const ollamaPrompt = await buildVideoPromptOllama(jobDescription);
  if (ollamaPrompt) return ollamaPrompt;

  console.log('All prompt enhancers failed — using raw description');
  return jobDescription;
}

/**
 * Enhance any text into a cinematic video prompt.
 * Used by ai.ts /enhance-prompt endpoint.
 */
export async function enhanceAsVideoPrompt(text: string): Promise<string> {
  return buildVideoPrompt(text);
}
