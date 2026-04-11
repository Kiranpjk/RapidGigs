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
      "visualPrompt": "Detailed cinematic prompt for AI video generator (day-to-day work). 4K, ultra-realistic.",
      "overlayText": "Short, punchy text to burn onto the video"
    },
    ...
  ]
}

Instructions for the 3 segments: 
Segment 1 (0-10s): 
- visualPrompt: Cinematic establishing shot of the workplace/professional showing the environment. Ultra-realistic, 4K, golden hour lighting.
- overlayText: The Job Title, Company Name, Location, and Salary (if available). Clean and punchy. Include line breaks (\\n).

Segment 2 (10-20s): 
- visualPrompt: Close up, dynamic shot of the core day-to-day work tasks being performed with intense focus.
- overlayText: 2 short bullet points summarizing the main day-to-day responsibilities. Start with "Day-to-day:" and use \\n.

Segment 3 (20-30s): 
- visualPrompt: Wide shot of success, teamwork, impact, or satisfaction in the role.
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
  try {
    // Strip markdown formatting if the model still returns it
    const cleanJson = jsonString.replace(/^[\s\S]*?```json/i, '').replace(/```[\s\S]*?$/i, '').trim() || jsonString;
    const parsed = JSON.parse(cleanJson);
    if (parsed.segments && Array.isArray(parsed.segments) && parsed.segments.length === 3) {
      return parsed as VideoScript;
    }
    return null;
  } catch (e) {
    console.error("Failed to parse JSON Script from AI:", String(e));
    return null;
  }
}

function buildDefaultScript(jobDescription: string): VideoScript {
  return {
    segments: [
      { visualPrompt: "Cinematic ultra-realistic establishing shot of a modern professional workplace.", overlayText: "Job Opportunity" },
      { visualPrompt: "Close up dynamic shot of a professional focusing on their day to day work.", overlayText: "Join an exciting team" },
      { visualPrompt: "Wide shot of a successful team celebrating in the office.", overlayText: "Apply now" }
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
