import axios from 'axios';

interface JDVideoInput {
  title: string;
  company: string;
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  pay: string;
  description: string;
}

interface ScenePlan {
  order: number;
  durationSec: number;
  caption: string;
  visualPrompt: string;
}

export interface JDVideoResult {
  narrationScript: string;
  scenes: ScenePlan[];
  shortVideoUrl: string | null;
  status: 'generated' | 'pending' | 'failed';
  provider: 'webhook' | 'heuristic';
  error?: string;
}

const IMPORTANT_KEYWORDS = [
  'required',
  'must',
  'experience',
  'skills',
  'responsibilities',
  'role',
  'benefits',
  'salary',
  'pay',
  'remote',
  'hybrid',
  'onsite',
];

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

const splitSentences = (text: string): string[] => {
  return normalize(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const pickImportantSentences = (description: string, max = 4): string[] => {
  const sentences = splitSentences(description);
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const keywordScore = IMPORTANT_KEYWORDS.reduce((acc, keyword) => acc + (lower.includes(keyword) ? 2 : 0), 0);
    const lengthScore = sentence.length > 40 && sentence.length < 180 ? 1 : 0;
    return { sentence, score: keywordScore + lengthScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.sentence);
};

const clampWords = (text: string, maxWords: number): string => {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const buildHeuristicVideoPlan = (input: JDVideoInput) => {
  const highlights = pickImportantSentences(input.description, 4);

  const scenes: ScenePlan[] = [
    {
      order: 1,
      durationSec: 6,
      caption: `${input.company} is hiring: ${input.title}`,
      visualPrompt: `Modern recruiting promo card for ${input.company} hiring a ${input.title}`,
    },
    {
      order: 2,
      durationSec: 6,
      caption: clampWords(highlights[0] || 'Fast-paced role with meaningful impact.', 14),
      visualPrompt: 'Professional team collaboration visual, energetic and modern',
    },
    {
      order: 3,
      durationSec: 6,
      caption: clampWords(highlights[1] || `Location: ${input.location} | Type: ${input.type}`, 14),
      visualPrompt: `${input.type} work environment visual with location ${input.location}`,
    },
    {
      order: 4,
      durationSec: 6,
      caption: clampWords(highlights[2] || `Compensation: ${input.pay}`, 14),
      visualPrompt: 'Compensation and growth focused visual with clean UI overlays',
    },
    {
      order: 5,
      durationSec: 6,
      caption: clampWords(highlights[3] || 'Apply now and get started quickly.', 14),
      visualPrompt: 'Call-to-action recruiting end card with apply now text',
    },
  ];

  const narrationScript = clampWords(
    `New opportunity at ${input.company}. We're hiring a ${input.title} in ${input.location} for a ${input.type} role. ${highlights.join(' ')} Compensation is ${input.pay}. If this matches your skills and goals, apply now to join the team.`,
    78,
  );

  return { scenes, narrationScript };
};

export const generateJobVideoFromJD = async (input: JDVideoInput): Promise<JDVideoResult> => {
  const { scenes, narrationScript } = buildHeuristicVideoPlan(input);
  const webhook = process.env.JD_VIDEO_WEBHOOK_URL;

  if (!webhook) {
    return {
      narrationScript,
      scenes,
      shortVideoUrl: null,
      status: 'pending',
      provider: 'heuristic',
    };
  }

  try {
    const payload = {
      durationSec: 30,
      title: input.title,
      company: input.company,
      narrationScript,
      scenes,
      metadata: {
        location: input.location,
        type: input.type,
        pay: input.pay,
      },
    };

    const response = await axios.post(webhook, payload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.JD_VIDEO_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.JD_VIDEO_WEBHOOK_TOKEN}` } : {}),
      },
    });

    const videoUrl = response.data?.videoUrl || response.data?.url || null;

    return {
      narrationScript,
      scenes,
      shortVideoUrl: videoUrl,
      status: videoUrl ? 'generated' : 'pending',
      provider: 'webhook',
    };
  } catch (error: any) {
    return {
      narrationScript,
      scenes,
      shortVideoUrl: null,
      status: 'failed',
      provider: 'webhook',
      error: error?.message || 'Video generation failed',
    };
  }
};
