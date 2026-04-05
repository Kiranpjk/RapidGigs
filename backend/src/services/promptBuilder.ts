/**
 * promptBuilder.ts — Cinematic video prompt generation
 *
 * Converts job descriptions into richly detailed cinematic video prompts.
 * Chain: OpenRouter (multi-model) → Groq → Ollama → raw fallback
 *
 * OpenRouter retries: qwen3.6-plus:free → nemotron-3-nano-30b-a3b:free → glm-4.5-air:free
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

// ── OpenRouter models to try in fallback order ──────────────────────────────
// Ranked by prompt quality for video generation (tested empirically):
//   1. qwen3.6-plus — excellent cinematic detail, concrete nouns
//   2. glm-4.5-air   — decent, follows format well
//   3. minimax-m2.5  — long context, good fallback
const OPENROUTER_MODELS = [
  'qwen/qwen3.6-plus:free',
  'z-ai/glm-4.5-air:free',
  'minimax/minimax-m2.5:free',
];

// ── Step 1: OpenRouter with multi-model retry ───────────────────────────────
async function buildVideoPromptOpenRouter(jobDescription: string): Promise<string | null> {
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_KEY) return null;

  for (const model of OPENROUTER_MODELS) {
    // Try up to 3 times per model (rate limits clear on retry)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const label = `OpenRouter ${model} (attempt ${attempt + 1})`;
        console.log(`Trying ${label}...`);
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
            timeout: 45_000,
          }
        );
        let prompt = res.data.choices[0]?.message?.content?.trim();
        if (!prompt) break;

        // Clean any thinking tags
        prompt = prompt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        // Remove quote wrapping
        prompt = prompt.replace(/^["""']|["""]$/g, '').trim();

        if (prompt.length < 50) break; // Too short = bad output

        console.log(`${model} → "${prompt.slice(0, 100)}..."`);
        return prompt;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        const isRateLimit = msg.includes('rate-limited') || err.response?.status === 429;
        const isNotFound = err.response?.status === 404;

        if (isNotFound) break;
        if (isRateLimit && attempt < 2) {
          const delay = 3000 + attempt * 2000; // 3s → 5s → 7s
          console.warn(`${model} rate-limited, retrying in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        if (isRateLimit) console.warn(`${model} still rate-limited after retries.`);
        else console.warn(`${model} failed: ${msg}`);
        break; // Try next model
      }
    }
  }
  return null;
}

// ── Step 2: Groq fallback ───────────────────────────────────────────────────
async function buildVideoPromptGroq(jobDescription: string): Promise<string | null> {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return null;

  try {
    console.log('Trying Groq for prompt enhancement...');
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.8,
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
      console.log(`Groq prompt: "${prompt.slice(0, 100)}..."`);
      return prompt;
    }
    return null;
  } catch (err: any) {
    console.warn('Groq prompt generation failed:', err.message);
    return null;
  }
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
          { role: 'assistant', content: '<think>\n\n</think>\n' },
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
      console.log(`Ollama prompt: "${prompt.slice(0, 100)}..."`);
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
  // 1. OpenRouter (multi-model retry: qwen3.6-plus → nemotron-30b → glm-4.5-air → minimax-m2.5)
  const openRouterPrompt = await buildVideoPromptOpenRouter(jobDescription);
  if (openRouterPrompt) return openRouterPrompt;

  // 2. Groq
  const groqPrompt = await buildVideoPromptGroq(jobDescription);
  if (groqPrompt) return groqPrompt;

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
