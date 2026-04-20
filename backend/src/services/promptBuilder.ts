import axios from 'axios';

export interface VideoSegment {
  visualPrompt: string;
  overlayText: string;
  caption: string; // Instagram-style caption for this segment
}

export interface VideoScript {
  segments: VideoSegment[];
  companyName?: string;
  jobTitle?: string;
  location?: string;
  workType?: string;
}

const PROMPT_SYSTEM = `You are a professional Cinematographer and Creative Director. Your goal is to produce ultra-realistic, high-fidelity film briefs for AI video generators (Veo/Giz.ai). 

We absolute avoid "AI-looking" stock footage. We want visceral, physical reality with imperfections, authentic textures, and cinematic lighting.

Every segment visual prompt MUST follow this exact Master Structure:
[SHOT TYPE] [SUBJECT] [ACTION/STATE], [LIGHTING], [CAMERA MOVEMENT], [LENS DETAIL], [TEXTURE/MATERIAL DETAIL], [ATMOSPHERE], [COLOR GRADE]

GLOBAL RULES (APPLY TO EVERY SEGMENT):
ALWAYS generate:
- Real environments with physical imperfections (dust, wood grain, condensation).
- Specific branded tools (VS Code, GitHub, Figma, terminal).
- Natural lighting with a clear single light source direction.
- Shallow depth of field (f/1.8) with realistic bokeh.
- Micro-details that prove physical reality (reflections, textures, wear).
- Cinematic 24fps with subtle organic camera movement (organic shake, slow dolly).

NEVER generate:
- Groups of people smiling at camera.
- People shaking hands or high-fiving.
- Stock photo style diverse team lunches.
- Overly bright corporate meeting rooms.
- People looking directly at camera.
- Obviously AI-generated faces.

STRUCTURE (MANDATORY 3 SEGMENTS):

1. SEGMENT 1 — THE HOOK (0-3s): 
   - CATEGORY: Hook the viewer with the specific CRAFT.
   - For Backend/Eng: Extreme close-up of marker on glass whiteboard, drawing system diagrams, shallow DOF.
   - For Frontend/Design: Extreme close-up of fingertips on high-res monitor, Figma prototype, reflections in glasses.
   - For Data/AI: Close-up of scrolling terminal logs, screen glow on desk, macro lens detail.
   - OVERLAY: [Company Name] | [Job Title]

2. SEGMENT 2 — THE ROLE (3-7s):
   - CATEGORY: Show the real environment and tools.
   - For all Eng: Medium shot of dual ultrawide monitors, VS Code with specific syntax colors, RGB underglow, slow dolly movement.
   - OVERLAY: [Top Skills]

3. SEGMENT 3 — THE OFFER (7-10s):
   - CATEGORY: Success and the offer.
   - For Remote: Minimal home office at golden hour, laptop with GitHub merged PR, steam rising from coffee.
   - For On-site: Empty workstation at dusk, ergonomic chair with hoodie, bokeh city lights through floor-to-ceiling windows.
   - NEGATIVE CONSTRAINT: Absolutely no text, letters, or characters from the AI itself. This is a pure cinematic background.
   - OVERLAY: [Salary] | Apply Now

Return JSON:
{
  "companyName": "The EXACT company name",
  "jobTitle": "The EXACT role or job title",
  "location": "The EXACT city/location",
  "segments": [
    {
      "visualPrompt": "The ultra-realistic cinematography brief (following the Master Structure).",
      "overlayText": "Short text\\nMax 2-3 words",
      "caption": "Specific, high-intent social media caption"
    }
  ]
}

CAPTION RULES:
1. overlayText MUST be VERY SHORT (max 15 characters per line).
2. Use \\n to split into 2 lines if needed.
3. Example: "Full Stack Dev\\nAgile & Cloud" is perfect. "Experienced Software Engineer with Cloud Knowledge" is BAD.

CRITICAL: Output ONLY the raw JSON object. No markdown, no explanation.`;

async function siliconFlowChatCompletion(system: string, user: string): Promise<string | null> {
  const sk = process.env.QWEN_API_KEY;
  if (!sk) return null;

  try {
    const res = await axios.post(
      'https://api.siliconflow.cn/v1/chat/completions',
      {
        model: 'deepseek-ai/DeepSeek-V3', // Common on SiliconFlow, but can use others
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
        timeout: 20_000,
      }
    );
    return res.data.choices[0]?.message?.content?.trim() || null;
  } catch (err: any) {
    console.warn(`SiliconFlow failed: ${err.message}`);
    return null;
  }
}

async function qwenChatCompletion(system: string, user: string): Promise<string | null> {
  const sk = process.env.QWEN_API_KEY;
  if (!sk) return null;

  try {
    const res = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-max',
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
        timeout: 20_000,
      }
    );
    return res.data.choices[0]?.message?.content?.trim() || null;
  } catch (err: any) {
    console.warn(`Qwen failed: ${err.message}`);
    return null;
  }
}

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

function chunkText(text: string, maxLen: number = 20): string {
  if (!text) return "";
  const words = text.split(/\s+/);
  let lines: string[] = [];
  let currentLine = "";

  words.forEach(word => {
    if ((currentLine + word).length > maxLen) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  });
  if (currentLine) lines.push(currentLine.trim());
  
  // Return only first 2 lines to keep it clean in vertical video
  return lines.slice(0, 2).join('\n');
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
      // Ensure each segment has caption field and clean overlay text
      parsed.segments = parsed.segments.map((s: any, i: number) => {
        // If the caption is too long, we chunk it for vertical video
        const cleanOverlay = chunkText(s.overlayText || s.caption || getDefaultCaption(i));
        return {
          ...s,
          overlayText: cleanOverlay,
          caption: s.caption || s.overlayText || getDefaultCaption(i),
        };
      });
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
  const locationMatch = jobDescription.match(/Location:\s*(.+)/i);
  
  const company = companyMatch?.[1]?.trim() || 'Our Company';
  const title = titleMatch?.[1]?.trim() || 'this exciting role';
  let pay = payMatch?.[1]?.trim() || 'Competitive Pay';
  const location = locationMatch?.[1]?.trim() || 'Remote';
  
  // Extract work type (Remote/On-site/Hybrid)
  const typeMatch = jobDescription.match(/(?:Type|Work Type):\s*(Remote|On-site|Hybrid|In-Person|Office)/i);
  const workType = typeMatch?.[1] || 'Remote';

  // FIX: Replace ₹ with Rs. for FFmpeg compatibility
  pay = pay.replace(/₹/g, 'Rs.');

  return {
    companyName: company,
    jobTitle: title,
    location: location,
    workType: workType,
    segments: [
      {
        visualPrompt: `Extreme close-up shot of a human hand holding a black marker, drawing arrows and database cylinder icons on a frosted glass whiteboard, shallow depth of field with background bokeh showing blurred monitor screens, natural diffused daylight from left side window, slight lens flare catching the marker tip, micro-detail of ink spreading on glass surface, handheld camera with subtle organic shake, color grade cool blue-white tones, photorealistic 4K, cinematic 24fps`,
        overlayText: `${company} | ${title}`,
        caption: `🚀 Hiring: ${title} @ ${company}. Ship features week 1.`,
      },
      {
        visualPrompt: `Medium shot of a dual ultrawide monitor setup on a standing desk, left monitor showing VS Code with TypeScript code syntax highlighted in deep blue and orange, right monitor showing a Kubernetes dashboard with green metrics, RGB keyboard with subtle blue underglow on dark wooden desk surface, mechanical keyboard partially in foreground sharp focus, background showing open plan office with soft bokeh of other desks and plants, overhead diffused lighting with warm color temperature 3200K, slow dolly left to right movement covering 15cm over 4 seconds, shallow depth of field f/1.8, micro-detail of cable management visible, color grade desaturated with slight film grain, photorealistic 4K, cinematic 24fps`,
        overlayText: `React • Node.js\nSystem Design`,
        caption: `💻 Build apps used by 2M+ users with an elite team.`,
      },
      {
        visualPrompt: `Wide shot of a minimal home office at golden hour, a laptop open on a clean white desk showing a GitHub pull request marked merged in green, ceramic coffee mug with steam rising catching warm window light, indoor plant in soft focus background, no people visible, dust particles visible in sunbeam from left window, camera completely static on tripod, micro-detail of wood grain on desk surface and condensation ring from previous coffee mug, color grade warm golden tones desaturated 20 percent, photorealistic 4K, cinematic 24fps. Pure cinematic background only. Absolutely no text, letters, words, numbers, or characters of any kind anywhere in the frame. If any text appears the shot is rejected.`,
        overlayText: `${pay} | Apply Now`,
        caption: `💰 ${pay} • Remote First • Apply Now on RapidGigs.`,
      }
    ]
  };
}

export async function buildVideoPrompt(jobDescription: string): Promise<VideoScript> {
  // Step -1: SiliconFlow
  let rawJson = await siliconFlowChatCompletion(PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script && script.segments.length >= 1) {
      console.log(`✅ SiliconFlow Script generated successfully`);
      return script;
    }
  }

  // Step 0: Qwen (New Priority)
  rawJson = await qwenChatCompletion(PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  if (rawJson) {
    const script = parseVideoScript(rawJson);
    if (script && script.segments.length >= 1) {
      console.log(`✅ Qwen (Alibaba) Script generated successfully`);
      return script;
    }
  }

  // Step 1: Cerebras
  rawJson = await cerebrasChatCompletion(PROMPT_SYSTEM, buildPromptUserMsg(jobDescription));
  
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
