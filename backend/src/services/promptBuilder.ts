import axios from 'axios';

export interface VideoSegment {
  visualPrompt: string;
  overlayText: string;
  caption: string; // Instagram-style caption for this segment
}

export interface VideoScript {
  segments: VideoSegment[];
  companyName?: string;
}

const PROMPT_SYSTEM = `You are an expert AI video director and copywriter for short-form vertical recruiting videos.

You MUST convert the provided job description into a THREE-PART video concept (3 segments, each ~8 seconds).
Each segment must flow naturally into the next, like a continuous cinematic story.

Return JSON using this EXACT schema:
{
  "companyName": "The company name from the job description",
  "segments": [
    {
      "visualPrompt": "Detailed prompt for Part 1: INTRO (~8s). Show company brand, office environment, the role title. Cinematic establishing shot.",
      "overlayText": "Short overlay text",
      "caption": "🚀 Hiring: [Role Title]\\n@ [Company], [Location]"
    },
    {
      "visualPrompt": "Detailed prompt for Part 2: DETAILS (~8s). Show the day-to-day work, tech stack in action, team collaboration. Mid-shot interviews, screens, whiteboards.",
      "overlayText": "Short overlay text",
      "caption": "[Key Tech] • [Responsibilities]\\n[Team Culture]"
    },
    {
      "visualPrompt": "Detailed prompt for Part 3: CTA (~8s). Show salary/growth opportunity, closing call-to-action shot. Inspiring final moments.",
      "overlayText": "Short overlay text",
      "caption": "💰 [Pay]\\nApply Now on RapidGig!"
    }
  ]
}

CRITICAL RULES:
1. Each visualPrompt must be 80-150 words describing ultra-realistic, cinematic video content.
2. Visual prompts must FLOW — Part 1 sets the scene, Part 2 dives deeper, Part 3 wraps up with CTA.
3. Think of it like a documentary trailer: establish → explore → inspire action.
4. Photorealistic, hyper-detailed, 8K, natural workplace visuals.
5. Vertical 9:16 framing intended for professional short-video feeds.
6. Authentic camera work: smooth cinematic motion, practical lighting, high-fidelity textures.
7. Each caption should be 2 lines max, punchy, Instagram-style with emojis.
8. The overlayText is a very short (3-5 words) overlay for the video.

CRITICAL: Output absolutely NOTHING except the raw JSON object. Do not wrap it in markdown block quotes. Just the raw {}.`;

function buildPromptUserMsg(jobDescription: string): string {
  return `Convert this job description into a 3-part cinematic video script JSON:\n\n${jobDescription}`;
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
      // Ensure each segment has caption field
      parsed.segments = parsed.segments.map((s: any, i: number) => ({
        ...s,
        caption: s.caption || s.overlayText || getDefaultCaption(i),
      }));
      return parsed as VideoScript;
    }
    console.warn('[parseVideoScript] Parsed OK but no segments array found');
    return null;
  } catch (directErr: any) {
    console.warn(`[parseVideoScript] Direct parse failed: ${directErr.message}`);
  }

  // 5. Fallback: escape control characters ONLY inside JSON string values
  try {
    let escaped = cleanJson.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, (c) => {
      return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
    });
    const parsed = JSON.parse(escaped);
    if (parsed.segments && Array.isArray(parsed.segments)) {
      parsed.segments = parsed.segments.map((s: any, i: number) => ({
        ...s,
        caption: s.caption || s.overlayText || getDefaultCaption(i),
      }));
      return parsed as VideoScript;
    }
    return null;
  } catch (fallbackErr: any) {
    console.warn(`[parseVideoScript] Fallback parse also failed: ${fallbackErr.message}`);
  }

  // 6. Last resort: try to fix unescaped newlines inside string values
  try {
    let fixed = cleanJson.replace(/"([^"]*?)"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    const parsed = JSON.parse(fixed);
    if (parsed.segments && Array.isArray(parsed.segments)) {
      parsed.segments = parsed.segments.map((s: any, i: number) => ({
        ...s,
        caption: s.caption || s.overlayText || getDefaultCaption(i),
      }));
      return parsed as VideoScript;
    }
    return null;
  } catch (lastErr: any) {
    console.warn('[parseVideoScript] All parse attempts failed:', lastErr.message);
    return null;
  }
}

function getDefaultCaption(index: number): string {
  const defaults = [
    '🚀 We\'re Hiring!\nJoin Our Team',
    '💻 Build Amazing Things\nWith Great People',
    '💰 Great Pay & Growth\nApply Now on RapidGig!',
  ];
  return defaults[index] || defaults[0];
}

function buildDefaultScript(jobDescription: string): VideoScript {
  // Extract company name from description if possible
  const companyMatch = jobDescription.match(/Company:\s*(.+)/i);
  const titleMatch = jobDescription.match(/Role:\s*(.+)/i);
  const payMatch = jobDescription.match(/(?:Salary|Pay):\s*(.+)/i);
  
  const company = companyMatch?.[1]?.trim() || 'Our Company';
  const title = titleMatch?.[1]?.trim() || 'this exciting role';
  const pay = payMatch?.[1]?.trim() || 'Competitive Pay';

  return {
    companyName: company,
    segments: [
      {
        visualPrompt:
          `Ultra-realistic 8K vertical video (9:16). Cinematic establishing shot of a modern tech office building exterior, ` +
          `then smoothly transitioning inside to reveal a sleek open-plan workspace. Natural morning light streams through floor-to-ceiling windows. ` +
          `The camera glides past standing desks, multiple monitors showing code and dashboards. Company branding visible on walls. ` +
          `Professional team members greet each other. Documentary style, authentic workplace feel.`,
        overlayText: `Now Hiring`,
        caption: `🚀 Hiring: ${title}\n@ ${company}`,
      },
      {
        visualPrompt:
          `Ultra-realistic 8K vertical video (9:16). Continuation of the office scene — camera follows a developer sitting at their dual-monitor setup, ` +
          `writing code with syntax-highlighted IDE visible. Cut to a collaborative whiteboard session where team members discuss architecture diagrams. ` +
          `Close-up of hands sketching on tablet, pointing at Figma designs. Candid footage of pair programming, slack messages on screens. ` +
          `Natural indoor lighting, shallow depth of field, authentic tech workplace energy.`,
        overlayText: `Day in the Life`,
        caption: `💻 Build Amazing Things\nWith A World-Class Team`,
      },
      {
        visualPrompt:
          `Ultra-realistic 8K vertical video (9:16). Inspiring closing sequence — team celebration moment, high-fives after sprint demo. ` +
          `Zoom out to show the full team gathered in a modern meeting room with screens showing growth charts. ` +
          `Final shot: confident professional looking directly at camera with warm smile, inviting gesture. ` +
          `Text-friendly composition with clean lower-third area. Golden hour warm lighting, cinematic color grade, aspirational energy.`,
        overlayText: `Apply Now`,
        caption: `💰 ${pay}\nApply Now on RapidGig!`,
      }
    ]
  };
}

export async function buildVideoPrompt(jobDescription: string): Promise<VideoScript> {
  console.log('Generating structured 3-part Video Script...');

  // Step 1: Cerebras
  let rawJson = await cerebrasChatCompletion(PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script && script.segments.length >= 3) {
      console.log(`✅ Cerebras Script generated successfully (${script.segments.length} segments)`);
      return script;
    }
  }

  // Step 2: OpenRouter
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free';
  rawJson = await openRouterChatCompletion(OPENROUTER_MODEL, PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script && script.segments.length >= 3) {
      console.log(`✅ OpenRouter Script generated successfully (${script.segments.length} segments)`);
      return script;
    }
  }

  // Step 3: Ollama
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:latest';
  rawJson = await ollamaChatCompletion(OLLAMA_MODEL, PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script && script.segments.length >= 3) {
      console.log(`✅ Ollama Script generated successfully (${script.segments.length} segments)`);
      return script;
    }
  }

  console.warn("⚠️ All LLM providers failed to return valid JSON. Falling back to default 3-part script.");
  return buildDefaultScript(jobDescription);
}

/**
 * Legacy/Simple wrapper to get a single cinematic prompt string
 */
export async function enhanceAsVideoPrompt(text: string): Promise<string> {
  const script = await buildVideoPrompt(text);
  return script.segments[0].visualPrompt;
}
