import axios from 'axios';

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  pay: string;
  category: string;
  description: string;
  requirements: string[];
}

const PARSER_SYSTEM = `You are an expert recruitment assistant. 
Your task is to take an unstructured, messy job description and extract the key fields into a structured JSON object.

Output ONLY valid JSON matching this schema:
{
  "title": "Clear job title",
  "company": "Company name",
  "location": "City, State or Remote",
  "type": "Remote" | "On-site" | "Hybrid",
  "pay": "Salary range or hourly rate (e.g. $40-60/hr)",
  "category": "One of: Web Development, Mobile Development, UI/UX Design, Data Science, Marketing, Other",
  "description": "A clean, professional 2-3 paragraph summary of the role",
  "requirements": ["requirement 1", "requirement 2", ...]
}

If a field is not found, take your best guess based on context or use an empty string.
CRITICAL: Output absolutely NOTHING except the raw JSON object.`;

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
        temperature: 0.1, // Low temperature for extraction
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
    console.warn(`Cerebras Job Parser failed: ${err.message}`);
    return null;
  }
}

export async function parseJobDescription(rawText: string): Promise<ParsedJob | null> {
  console.log('[AI Parser] Extracting fields from raw text...');
  
  const rawJson = await cerebrasChatCompletion(PARSER_SYSTEM, `Extract job details from this text:\n\n${rawText}`);
  
  if (!rawJson) return null;

  try {
    const cleanJson = rawJson.replace(/^[\s\S]*?```json/i, '').replace(/```[\s\S]*?$/i, '').trim() || rawJson;
    const parsed = JSON.parse(cleanJson);
    return parsed as ParsedJob;
  } catch (e) {
    console.error("[AI Parser] Failed to parse JSON from AI:", String(e));
    return null;
  }
}
