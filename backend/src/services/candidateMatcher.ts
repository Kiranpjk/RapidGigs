/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AI Candidate Matching Engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Generates match scores (0–100), top strength, risk/weakness, match reason,
 * and AI insights by analyzing candidate applications against job descriptions.
 *
 * Scoring Formula (Video-first):
 *   MATCH = Communication(40%) + Skills(30%) + Projects(20%) + Resume(10%)
 *
 * All AI extraction uses the Cerebras API (Llama 3.1 8B, ~200ms latency)
 * already configured in this project.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MatchSubScores {
  skillsMatch: number;       // 0–100
  projectRelevance: number;  // 0–100
  communication: number;     // 0–100
  resumeQuality: number;     // 0–100
}

export interface SignalAvailability {
  hasVideo: boolean;
  hasResume: boolean;
  hasProjectLinks: boolean;
  projectLinksCount: number;
}

export interface MatchResult {
  matchScore: number;           // 0–100 weighted composite
  subScores: MatchSubScores;
  matchReason: string;          // 2-3 sentences transparently explaining the score
  topStrength: string;          // 1-line
  risk: string;                 // 1-line
  insights: string[];           // 3–4 bullet points
  signalAvailability: SignalAvailability;
  computedAt: string;           // ISO timestamp
  latencyMs: number;
}

// ─── Weights ────────────────────────────────────────────────────────────────

const WEIGHTS = {
  skillsMatch: 0.30,
  projectRelevance: 0.20,
  communication: 0.40,
  resumeQuality: 0.10,
} as const;

// ─── Cerebras LLM Helper ───────────────────────────────────────────────────

async function cerebrasChat(
  system: string,
  user: string,
  temperature = 0.2,
  maxTokens = 800
): Promise<string | null> {
  const sk = process.env.CEREBRAS_API_KEY;
  if (!sk) {
    console.warn('[CandidateMatcher] CEREBRAS_API_KEY not set, falling back to OpenRouter');
    return openRouterChat(system, user, temperature, maxTokens);
  }

  try {
    const res = await axios.post(
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama3.1-8b',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${sk}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );
    return res.data.choices[0]?.message?.content?.trim() || null;
  } catch (err: any) {
    console.warn(`[CandidateMatcher] Cerebras failed: ${err.message}, trying OpenRouter`);
    return openRouterChat(system, user, temperature, maxTokens);
  }
}

async function openRouterChat(
  system: string,
  user: string,
  temperature = 0.2,
  maxTokens = 800
): Promise<string | null> {
  const sk = process.env.OPENROUTER_API_KEY;
  if (!sk) return null;

  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
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
    console.warn(`[CandidateMatcher] OpenRouter also failed: ${err.message}`);
    return null;
  }
}

// ─── Utility: Extract URLs from Text ────────────────────────────────────────

function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s,)]+/g) || [];
  return [...new Set(matches)];
}

// ─── Utility: Classify URL Domain ───────────────────────────────────────────

function classifyUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('gitlab.com')) return 'gitlab';
    if (hostname.includes('bitbucket.org')) return 'bitbucket';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('behance.net')) return 'behance';
    if (hostname.includes('dribbble.com')) return 'dribbble';
    if (hostname.includes('figma.com')) return 'figma';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('vercel.app') || hostname.includes('netlify.app') || hostname.includes('herokuapp.com')) return 'deployed_project';
    return 'other_link';
  } catch {
    return 'other_link';
  }
}

// ─── Step 1: Skills Extraction & Matching ───────────────────────────────────

const SKILLS_EXTRACTION_SYSTEM = `You are an expert ATS (Applicant Tracking System) analyzer.

Given a job description OR candidate profile, extract a flat JSON array of technical/professional skills.

Rules:
- Extract ONLY concrete, nameable skills (e.g., "React", "Python", "Figma", "SQL", "Project Management").
- Normalize names (e.g., "JS" → "JavaScript", "ML" → "Machine Learning").
- Return 5–20 skills, ordered by importance.
- Output NOTHING except a valid JSON array of strings.

Example output: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"]`;

async function extractSkills(text: string): Promise<string[]> {
  if (!text || text.trim().length < 10) return [];

  const raw = await cerebrasChat(
    SKILLS_EXTRACTION_SYSTEM,
    `Extract skills from this text:\n\n${text.slice(0, 2000)}`
  );

  if (!raw) return [];

  try {
    // Find the JSON array in the response
    const jsonMatch = raw.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: any) => typeof s === 'string').slice(0, 20);
      }
    }
  } catch {
    console.warn('[CandidateMatcher] Failed to parse skills JSON');
  }

  return [];
}

/**
 * Compute skills match score using direct overlap + semantic similarity.
 */
function computeSkillsMatchScore(
  jdSkills: string[],
  candidateSkills: string[]
): number {
  if (jdSkills.length === 0) return 50; // No JD skills extracted → neutral

  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9+#.]/g, '');

  const jdNorm = jdSkills.map(normalize);
  const candNorm = candidateSkills.map(normalize);

  // Direct match
  let directMatches = 0;
  for (const skill of jdNorm) {
    if (candNorm.some(c => c === skill || c.includes(skill) || skill.includes(c))) {
      directMatches++;
    }
  }

  // Semantic similarity map (common aliases/related skills)
  const SEMANTIC_MAP: Record<string, string[]> = {
    'react': ['reactjs', 'react.js', 'nextjs', 'next.js', 'frontend'],
    'node': ['nodejs', 'node.js', 'express', 'expressjs', 'backend'],
    'python': ['django', 'flask', 'fastapi'],
    'javascript': ['js', 'typescript', 'ts'],
    'typescript': ['ts', 'javascript', 'js'],
    'sql': ['postgresql', 'mysql', 'sqlite', 'database', 'mongodb'],
    'css': ['tailwind', 'tailwindcss', 'sass', 'scss', 'styled-components'],
    'aws': ['cloud', 'gcp', 'azure', 'devops'],
    'machinelearning': ['ml', 'deeplearning', 'ai', 'tensorflow', 'pytorch'],
    'design': ['figma', 'sketch', 'adobexd', 'uiux', 'ui/ux'],
  };

  // Partial credit for semantic overlap
  let semanticMatches = 0;
  for (const skill of jdNorm) {
    if (candNorm.some(c => c === skill || c.includes(skill) || skill.includes(c))) {
      continue; // Already counted as direct
    }
    const related = SEMANTIC_MAP[skill] || [];
    if (related.some(r => candNorm.some(c => c === r || c.includes(r)))) {
      semanticMatches += 0.5; // Half credit for related skills
    }
  }

  const totalCredit = directMatches + semanticMatches;
  const score = Math.min(100, Math.round((totalCredit / jdSkills.length) * 100));

  return score;
}

// ─── Step 2: Project Relevance ──────────────────────────────────────────────

const PROJECT_SCORING_SYSTEM = `You are evaluating how relevant a candidate's project links are to a job.

Given:
- The job description / key requirements
- A list of project links with their domains

Score the project relevance from 0 to 100:
- 90–100: Projects directly demonstrate the exact skills required (e.g., deployed React app for a React job)
- 70–89: Projects show related skills and technology alignment
- 50–69: Some overlap but different domain/stack
- 30–49: Minimal relevance
- 0–29: No relevance or no projects

Output ONLY a JSON object:
{
  "score": <number 0-100>,
  "reasoning": "<1 sentence explanation>"
}`;

async function scoreProjectRelevance(
  jobDescription: string,
  projectLinks: string[]
): Promise<{ score: number; reasoning: string }> {
  if (projectLinks.length === 0) {
    return { score: 0, reasoning: 'No project links were provided by the candidate.' };
  }

  const classified = projectLinks.map(url => ({
    url,
    type: classifyUrl(url),
  }));

  const raw = await cerebrasChat(
    PROJECT_SCORING_SYSTEM,
    `Job Description:\n${jobDescription.slice(0, 1000)}\n\nCandidate's Project Links:\n${classified.map(c => `- [${c.type}] ${c.url}`).join('\n')}`
  );

  if (!raw) {
    // Fallback: score based on link quality heuristics
    const hasCodeLinks = classified.some(c => ['github', 'gitlab', 'bitbucket'].includes(c.type));
    const hasDeployed = classified.some(c => c.type === 'deployed_project');
    const hasDesign = classified.some(c => ['behance', 'dribbble', 'figma'].includes(c.type));

    let fallbackScore = 30;
    if (hasCodeLinks) fallbackScore += 20;
    if (hasDeployed) fallbackScore += 20;
    if (hasDesign) fallbackScore += 10;

    return {
      score: Math.min(70, fallbackScore),
      reasoning: `Heuristic score: ${hasCodeLinks ? 'has code repos' : 'no code repos'}, ${hasDeployed ? 'has deployed projects' : 'no deployed projects'}.`,
    };
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        reasoning: String(parsed.reasoning || ''),
      };
    }
  } catch {}

  return { score: 40, reasoning: 'Could not fully analyze project links.' };
}

// ─── Step 3: Communication Score (Video Analysis) ───────────────────────────

const COMMUNICATION_SCORING_SYSTEM = `You are evaluating a candidate's video pitch quality based on whether a video was submitted and any available metadata.

Since we cannot transcribe the video directly, evaluate based on:
- Did the candidate submit a video? (Shows initiative and confidence)
- Is the video URL from a professional platform?

Score from 0 to 100:
- 80–100: Video submitted, professional platform, shows proactive communication
- 50–70: Video submitted from any source
- 30–49: No video but strong written communication in cover letter
- 0–29: No video and poor/no written communication

Output ONLY a JSON object:
{
  "score": <number 0-100>,
  "reasoning": "<1 sentence>"
}`;

function scoreCommunication(
  hasVideo: boolean,
  coverLetter: string | undefined
): { score: number; reasoning: string } {
  // Deterministic scoring for speed (no LLM call needed)
  if (hasVideo && coverLetter && coverLetter.length > 50) {
    return {
      score: 82,
      reasoning: 'Candidate submitted both a video pitch and detailed written notes — strong communicator.',
    };
  }
  if (hasVideo) {
    return {
      score: 70,
      reasoning: 'Candidate submitted a video pitch, demonstrating initiative and communication confidence.',
    };
  }
  if (coverLetter && coverLetter.length > 200) {
    return {
      score: 55,
      reasoning: 'No video submitted, but detailed written notes show good written communication.',
    };
  }
  if (coverLetter && coverLetter.length > 50) {
    return {
      score: 40,
      reasoning: 'No video submitted; brief cover letter provides limited communication signal.',
    };
  }
  return {
    score: 20,
    reasoning: 'No video and no substantial written communication provided.',
  };
}

// ─── Step 4: Resume Quality ─────────────────────────────────────────────────

function scoreResumeQuality(
  hasResume: boolean,
  coverLetter: string | undefined,
  candidateSkills: string[]
): { score: number; reasoning: string } {
  // Since we can't parse PDF content in real-time, score based on presence + other signals
  if (hasResume && candidateSkills.length >= 5) {
    return {
      score: 78,
      reasoning: 'Resume uploaded with strong skill set demonstrated in application materials.',
    };
  }
  if (hasResume && candidateSkills.length >= 2) {
    return {
      score: 65,
      reasoning: 'Resume uploaded with moderate skill evidence in application.',
    };
  }
  if (hasResume) {
    return {
      score: 55,
      reasoning: 'Resume uploaded but limited additional skill evidence in application text.',
    };
  }
  if (candidateSkills.length >= 5) {
    return {
      score: 45,
      reasoning: 'No resume uploaded, but candidate demonstrated skills through other materials.',
    };
  }
  return {
    score: 25,
    reasoning: 'No resume uploaded and limited skill evidence in application.',
  };
}

// ─── Step 5: AI Synthesis — Strength, Risk, Insights ────────────────────────

const SYNTHESIS_SYSTEM = `You are a senior recruiter's AI assistant for RapidGig, a video-first hiring platform.

Given a candidate's match analysis, generate a concise hiring assessment.

Output ONLY valid JSON:
{
  "matchReason": "<1-2 sentences explaining exactly why they got their score. Highlight their video pitch/communication specifically, and be completely transparent that this is just an AI screening guide, not a final decision>",
  "topStrength": "<1 sentence — the candidate's strongest selling point for THIS specific role>",
  "risk": "<1 sentence — the biggest concern or gap for THIS specific role>",
  "insights": [
    "<insight 1: specific, actionable observation>",
    "<insight 2: about their project work or portfolio>",
    "<insight 3: about communication or engagement style>",
    "<insight 4: recommendation or red flag — optional>"
  ]
}

Rules:
- Be transparent and explain the exact logic (e.g. 'Scored high because of excellent video communication and 80% skills overlap').
- Be specific, not generic. Reference actual skills, projects, or gaps.
- Avoid filler phrases like "This candidate..." — be direct.
- Each insight must be distinct and non-overlapping.
- insights array must have 3 or 4 items.`;

async function synthesizeInsights(input: {
  jobTitle: string;
  jobDescription: string;
  candidateName: string;
  subScores: MatchSubScores;
  matchScore: number;
  jdSkills: string[];
  candidateSkills: string[];
  projectLinks: string[];
  hasVideo: boolean;
  hasResume: boolean;
  coverLetter: string;
}): Promise<{
  matchReason: string;
  topStrength: string;
  risk: string;
  insights: string[];
}> {
  const matchedSkills = input.jdSkills.filter(s =>
    input.candidateSkills.some(c =>
      c.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(c.toLowerCase())
    )
  );
  const missingSkills = input.jdSkills.filter(s =>
    !input.candidateSkills.some(c =>
      c.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(c.toLowerCase())
    )
  );

  const userPrompt = `
Job: ${input.jobTitle}
Job Description: ${input.jobDescription.slice(0, 800)}

Candidate: ${input.candidateName}
Match Score: ${input.matchScore}/100
Sub-scores: Skills ${input.subScores.skillsMatch}, Projects ${input.subScores.projectRelevance}, Communication ${input.subScores.communication}, Resume ${input.subScores.resumeQuality}

Skills Required by JD: ${input.jdSkills.join(', ') || 'Not extracted'}
Candidate Skills Found: ${input.candidateSkills.join(', ') || 'Not found'}
Matched Skills: ${matchedSkills.join(', ') || 'None'}
Missing Skills: ${missingSkills.join(', ') || 'None'}

Project Links: ${input.projectLinks.length > 0 ? input.projectLinks.join(', ') : 'None provided'}
Video Submitted: ${input.hasVideo ? 'Yes' : 'No'}
Resume Uploaded: ${input.hasResume ? 'Yes' : 'No'}
Cover Letter / Notes: ${(input.coverLetter || 'None').slice(0, 500)}

Generate the assessment.`;

  const raw = await cerebrasChat(SYNTHESIS_SYSTEM, userPrompt, 0.3, 600);

  if (!raw) {
    // Deterministic fallback
    return {
      matchReason: `Candidate scored ${input.matchScore} mainly driven by ${input.hasVideo ? 'their video pitch' : 'their text profile'}. This is an AI assistive score — please review manually.`,
      topStrength: matchedSkills.length > 0
        ? `Demonstrates ${matchedSkills.slice(0, 3).join(', ')} skills matching the ${input.jobTitle} requirements.`
        : `Applied with ${input.hasVideo ? 'a video pitch' : 'written notes'} showing interest in the role.`,
      risk: missingSkills.length > 0
        ? `Missing key skills: ${missingSkills.slice(0, 3).join(', ')}.`
        : `Limited signal to evaluate — consider requesting additional materials.`,
      insights: [
        `Skills coverage: ${matchedSkills.length}/${input.jdSkills.length} required skills matched.`,
        input.projectLinks.length > 0
          ? `Provided ${input.projectLinks.length} project link(s) for portfolio review.`
          : `No project links shared — consider asking for portfolio examples.`,
        input.hasVideo
          ? `Submitted a video pitch — demonstrates communication confidence.`
          : `No video pitch — this is a video-first platform, candidate may lack engagement.`,
      ],
    };
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        matchReason: String(parsed.matchReason || `Scored ${input.matchScore} based on available signals. Review manually.`),
        topStrength: String(parsed.topStrength || 'Strong potential for this role.'),
        risk: String(parsed.risk || 'Limited data available for full assessment.'),
        insights: Array.isArray(parsed.insights)
          ? parsed.insights.filter((i: any) => typeof i === 'string').slice(0, 4)
          : ['Assessment details unavailable.'],
      };
    }
  } catch (err) {
    console.warn('[CandidateMatcher] Failed to parse synthesis JSON:', err);
  }

  return {
    matchReason: `Scored ${input.matchScore} but AI analysis could not fully complete.`,
    topStrength: 'Candidate shows potential for this role.',
    risk: 'Insufficient data for complete risk assessment.',
    insights: ['Full AI analysis could not be completed — review application materials manually.'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: Compute Match Score
// ═══════════════════════════════════════════════════════════════════════════

export interface MatchInput {
  // Job data
  jobTitle: string;
  jobDescription: string;

  // Candidate data
  candidateName: string;
  coverLetter?: string;   // Contains skills, project links, notes
  resumeUrl?: string;     // Presence check only (no PDF parsing at runtime)
  videoUrl?: string;      // Presence check for communication scoring
}

export async function computeMatchScore(input: MatchInput): Promise<MatchResult> {
  const start = Date.now();

  console.log(`[CandidateMatcher] Computing match for "${input.candidateName}" → "${input.jobTitle}"`);

  // ── Extract signals in parallel ──────────────────────────────────────────
  const projectLinks = extractUrls(input.coverLetter || '');
  const hasVideo = !!input.videoUrl;
  const hasResume = !!input.resumeUrl;

  const candidateText = [
    input.coverLetter || '',
    input.candidateName || '',
  ].join('\n');

  const [jdSkills, candidateSkills] = await Promise.all([
    extractSkills(input.jobDescription),
    extractSkills(candidateText),
  ]);

  console.log(`[CandidateMatcher] JD Skills: [${jdSkills.join(', ')}]`);
  console.log(`[CandidateMatcher] Candidate Skills: [${candidateSkills.join(', ')}]`);

  // ── Compute sub-scores ───────────────────────────────────────────────────
  const skillsScore = computeSkillsMatchScore(jdSkills, candidateSkills);

  const [projectResult, commResult, resumeResult] = await Promise.all([
    scoreProjectRelevance(input.jobDescription, projectLinks),
    Promise.resolve(scoreCommunication(hasVideo, input.coverLetter)),
    Promise.resolve(scoreResumeQuality(hasResume, input.coverLetter, candidateSkills)),
  ]);

  const subScores: MatchSubScores = {
    skillsMatch: skillsScore,
    projectRelevance: projectResult.score,
    communication: commResult.score,
    resumeQuality: resumeResult.score,
  };

  // ── Weighted score ───────────────────────────────────────────────────────
  const matchScore = Math.round(
    subScores.skillsMatch * WEIGHTS.skillsMatch +
    subScores.projectRelevance * WEIGHTS.projectRelevance +
    subScores.communication * WEIGHTS.communication +
    subScores.resumeQuality * WEIGHTS.resumeQuality
  );

  console.log(`[CandidateMatcher] Sub-scores: ${JSON.stringify(subScores)}`);
  console.log(`[CandidateMatcher] Weighted score: ${matchScore}`);

  // ── AI Synthesis ─────────────────────────────────────────────────────────
  const synthesis = await synthesizeInsights({
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
    candidateName: input.candidateName,
    subScores,
    matchScore,
    jdSkills,
    candidateSkills,
    projectLinks,
    hasVideo,
    hasResume,
    coverLetter: input.coverLetter || '',
  });

  const latencyMs = Date.now() - start;
  console.log(`[CandidateMatcher] Completed in ${latencyMs}ms`);

  return {
    matchScore,
    subScores,
    matchReason: synthesis.matchReason,
    topStrength: synthesis.topStrength,
    risk: synthesis.risk,
    insights: synthesis.insights,
    signalAvailability: {
      hasVideo,
      hasResume,
      hasProjectLinks: projectLinks.length > 0,
      projectLinksCount: projectLinks.length,
    },
    computedAt: new Date().toISOString(),
    latencyMs,
  };
}
