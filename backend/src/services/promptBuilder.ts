import axios from 'axios';

export interface VideoSegment {
  visualPrompt: string;
  overlayText: string;
}

export interface VideoScript {
  segments: VideoSegment[];
}

const PROMPT_SYSTEM = `You are an expert AI video director and copywriter summarizing job descriptions for TikTok/Reels style vertical videos.

You MUST convert the provided job description into a structured 3-part video script.
Output ONLY valid JSON matching this exact schema:
{
  "segments": [
    {
      "visualPrompt": "Natural, realistic prompt for AI video generator (day-to-day work). Shot like iPhone footage, documentary feel.",
      "overlayText": "Short, punchy text to burn onto the video"
    },
    ...
  ]
}

Global style rules (VERY IMPORTANT):
- Default look must be natural and realistic, like handheld/steady iPhone footage in a real workplace.
- Prefer authentic human expressions, practical lighting, normal office/home/worksite environments.
- Avoid artificial CGI, fantasy, surreal, overly glossy ad-style visuals unless the job explicitly requires that style.
- Keep camera language simple: natural motion, mild depth of field, believable textures and skin tones.
- If the role is in a creative field that requires stylization (e.g. VFX, game art, motion design), then moderate stylization is allowed.

Instructions for the 3 segments: 
Segment 1 (0-10s): 
- visualPrompt: Natural establishing shot of the workplace/professional showing the real environment. Smartphone-quality realism, authentic lighting.
- overlayText: The Job Title, Company Name, Location, and Salary (if available). Clean and punchy. Include line breaks (\\n).

Segment 2 (10-20s): 
- visualPrompt: Close-up realistic shot of day-to-day tasks being performed naturally (no dramatic cinematic effects).
- overlayText: 2 short bullet points summarizing the main day-to-day responsibilities. Start with "Day-to-day:" and use \\n.

Segment 3 (20-30s): 
- visualPrompt: Wide realistic shot of teamwork, impact, or satisfaction in the role; natural interactions and expressions.
- overlayText: Key requirements (e.g. Years of Exp) and/or top perks. Start with "Requirements/Perks:" and use \\n.

CRITICAL: Output absolutely NOTHING except the raw JSON object. Do not wrap it in markdown block quotes (e.g. \`\`\`json). Just the raw {}.`;

function buildPromptUserMsg(jobDescription: string): string {
  return `Convert this job description into the 3-part JSON video script:\n\n${jobDescription}`;
}

async function openRouterChatCompletion(model: string, system: string, user: string): Promise<string | null> {
  const sk = process.env.OPENROUTER_API_KEY;
  if (!sk) return null;

  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${sk}`,
          'HTTP-Referer': 'https://rapidgigs.com',
          'X-Title': 'RapidGigs',
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      }
    );
    const content = res.data.choices[0]?.message?.content?.trim();
    if (content) return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return null;
  } catch (err: any) {
    if (err.response) {
      console.warn(`OpenRouter (${model}) failed: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else {
      console.warn(`OpenRouter (${model}) failed: ${err.message}`);
    }
    return null;
  }
}

async function cerebrasChatCompletion(system: string, user: string): Promise<string | null> {
  const sk = process.env.CEREBRAS_API_KEY;
  if (!sk) return null;

  try {
    const res = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama3.1-8b',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${sk}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    );
    return res.data.choices[0]?.message?.content?.trim() || null;
  } catch (err: any) {
    console.warn(`Cerebras failed: ${err.message}`);
    return null;
  }
}

async function ollamaChatCompletion(model: string, system: string, user: string): Promise<string | null> {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) return null;

  try {
    const res = await axios.post(
      `${ollamaUrl}/api/chat`,
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
      },
      { timeout: 60_000 }
    );
    const content = res.data.message?.content?.trim();
    if (content) return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return null;
  } catch (err: any) {
    console.warn(`Ollama (${model}) failed: ${err.message}`);
    return null;
  }
}

function parseVideoScript(jsonString: string): VideoScript | null {
  if (!jsonString) return null;

  // Debug: log first 200 chars of raw response to help diagnose issues
  console.log(`[parseVideoScript] Raw input (first 200): ${jsonString.slice(0, 200)}...`);

  // 1. Strip markdown formatting if the model wraps in ```json ... ```
  let cleanJson = jsonString
    .replace(/^[\s\S]*?```(?:json)?/i, '')
    .replace(/```[\s\S]*?$/i, '')
    .trim() || jsonString;

  // 2. Strip <think>...</think> tags some models add
  cleanJson = cleanJson.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 3. Extract the JSON object: find first { and last }
  const firstBrace = cleanJson.indexOf('{');
  const lastBrace = cleanJson.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
  }

  // 4. Try direct parse first (works for well-formed JSON including pretty-printed)
  try {
    const parsed = JSON.parse(cleanJson);
    if (parsed.segments && Array.isArray(parsed.segments)) {
      return parsed as VideoScript;
    }
    console.warn('[parseVideoScript] Parsed OK but no segments array found');
    return null;
  } catch (directErr: any) {
    console.warn(`[parseVideoScript] Direct parse failed: ${directErr.message}`);
  }

  // 5. Fallback: escape control characters ONLY inside JSON string values
  //    (don't touch structural whitespace like newlines between keys)
  try {
    // Remove only truly illegal control chars (not \n, \r, \t which are valid JSON whitespace)
    let escaped = cleanJson.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, (c) => {
      return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
    });
    const parsed = JSON.parse(escaped);
    if (parsed.segments && Array.isArray(parsed.segments)) {
      return parsed as VideoScript;
    }
    return null;
  } catch (fallbackErr: any) {
    console.warn(`[parseVideoScript] Fallback parse also failed: ${fallbackErr.message}`);
  }

  // 6. Last resort: try to fix unescaped newlines inside string values
  try {
    // Replace literal newlines inside quoted strings with \\n
    let fixed = cleanJson.replace(/"([^"]*?)"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    const parsed = JSON.parse(fixed);
    if (parsed.segments && Array.isArray(parsed.segments)) {
      return parsed as VideoScript;
    }
    return null;
  } catch (lastErr: any) {
    console.warn('[parseVideoScript] All parse attempts failed:', lastErr.message);
    return null;
  }
}

function buildDefaultScript(jobDescription: string): VideoScript {
  return {
    segments: [
      { visualPrompt: "Natural smartphone-style establishing shot of a real modern workplace, authentic lighting and people.", overlayText: "Job Opportunity" },
      { visualPrompt: "Realistic close-up of a professional doing normal day-to-day work tasks, documentary style.", overlayText: "Join an exciting team" },
      { visualPrompt: "Realistic wide shot of a team collaborating and celebrating outcomes in a real office setting.", overlayText: "Apply now" }
    ]
  };
}

export async function buildVideoPrompt(jobDescription: string): Promise<VideoScript> {
  console.log('Generating structured Video Script...');

  // Step 1: Cerebras
  let rawJson = await cerebrasChatCompletion(PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script) {
      console.log(`✅ Cerebras Script generated successfully`);
      return script;
    }
  }

  // Step 2: OpenRouter
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free';
  rawJson = await openRouterChatCompletion(OPENROUTER_MODEL, PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script) {
      console.log(`✅ OpenRouter Script generated successfully`);
      return script;
    }
  }

  // Step 3: Ollama
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:latest';
  rawJson = await ollamaChatCompletion(OLLAMA_MODEL, PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script) {
      console.log(`✅ Ollama Script generated successfully`);
      return script;
    }
  }

  console.warn("⚠️ All LLM providers failed to return valid JSON. Falling back to default script.");
  return buildDefaultScript(jobDescription);
}

/**
 * Legacy/Simple wrapper to get a single cinematic prompt string
 */
export async function enhanceAsVideoPrompt(text: string): Promise<string> {
  const script = await buildVideoPrompt(text);
  return script.segments[0].visualPrompt;
}

