/**
 * metaAiVideo.ts — Direct Meta AI video generation (no Python server needed)
 *
 * Calls meta.ai GraphQL endpoints directly using cookie-based auth.
 * Supports TEXT_TO_VIDEO via the GenerationAPI pattern from the Python SDK.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const META_GRAPHQL_URL = 'https://www.meta.ai/api/graphql';

// Doc IDs captured from browser (March 2026)
const TEXT_TO_VIDEO_DOC_ID = 'd4e29678d29dc9703db0df437793864c';
const POLL_MEDIA_DOC_ID = '10b7bd5aa8b7537e573e49d701a5b21b';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

interface MetaAiSession {
  session: ReturnType<typeof axios.create>;
  datr: string;
  ecto1: string;
}

function getSession(): MetaAiSession | null {
  const datr = process.env.META_AI_COOKIE_DATR;
  const ecto1 = process.env.META_AI_COOKIE_ECTO;
  if (!datr || !ecto1) {
    console.warn('[MetaAiVideo] Missing META_AI_COOKIE_DATR or META_AI_COOKIE_ECTO env vars');
    return null;
  }

  const session = axios.create({
    headers: {
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
      'Origin': 'https://www.meta.ai',
      'Referer': 'https://www.meta.ai/',
      'User-Agent': USER_AGENT,
      'Sec-Ch-Ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Microsoft Edge";v="144"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Baggage': `sentry-environment=production,sentry-release=9325c294e118b82669ecf8f28353672eb76d1e14,sentry-public_key=2cb2a7b32f5c43f4e020eb1ef6dfc066,sentry-trace_id=02f3fcc3375aece921c1c6289495b904,sentry-org_id=4509963614355457,sentry-sampled=false,sentry-sample_rand=0.6497181742593875,sentry-sample_rate=0.001`,
      'Sentry-Trace': '02f3fcc3375aece921c1c6289495b904-bda44fc7e92d0b23-0',
    },
    timeout: 120_000,
  });

  session.defaults.headers['Cookie'] = `datr=${datr}; ecto_1_sess=${ecto1}`;
  return { session, datr, ecto1 };
}

function buildVariables(prompt: string, conversationId: string): Record<string, unknown> {
  const userMessageId = uuidv4();
  const assistantMessageId = uuidv4();
  const turnId = uuidv4();
  const promptSessionId = uuidv4();

  return {
    conversationId,
    content: `Animate ${prompt}`,
    userMessageId,
    assistantMessageId,
    userUniqueMessageId: Date.now() * 1000000 % 10 ** 13,
    turnId,
    mode: 'create',
    rewriteOptions: null,
    attachments: null,
    attachmentsV2: [],
    mentions: null,
    clippyIp: null,
    isNewConversation: true,
    imagineOperationRequest: {
      operation: 'TEXT_TO_VIDEO',
      textToVideoParams: { prompt },
    },
    qplJoinId: null,
    clientTimezone: 'UTC',
    developerOverridesForMessage: null,
    clientLatitude: null,
    clientLongitude: null,
    devicePixelRatio: 1.25,
    entryPoint: null,
    promptSessionId,
    promptType: null,
    conversationStarterId: null,
    userAgent: USER_AGENT,
    currentBranchPath: null,
    promptEditType: 'new_message',
    userLocale: 'en-US',
    userEventId: null,
    requestedToolCall: null,
  };
}

interface VideoGenerationResult {
  videoUrl: string;
  conversationId: string;
  mediaIds: string[];
}

/**
 * Generate a single video via Meta AI GraphQL.
 * Auto-polls until URLs are ready.
 */
export async function generateVideo(
  prompt: string,
  onProgress?: (step: string, progress: number) => void
): Promise<VideoGenerationResult | null> {
  const sessionData = getSession();
  if (!sessionData) return null;

  const { session } = sessionData;
  const conversationId = uuidv4();
  const variables = buildVariables(prompt, conversationId);

  onProgress?.('Sending request to Meta AI...', 0.05);

  let sseData: string | undefined;
  let mediaIds: string[] = [];

  // ── Step 1: POST to GraphQL ───────────────────────────────────────────
  try {
    const payload = {
      doc_id: TEXT_TO_VIDEO_DOC_ID,
      variables,
    };

    const response = await session.post(META_GRAPHQL_URL, payload, {
      timeout: 30_000,
    });

    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    // Parse SSE
    const lines = text.split('\n');
    let streamingState: string | undefined;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || !jsonStr.startsWith('{')) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const stream = parsed?.data?.sendMessageStream;
        if (!stream) continue;

        streamingState = stream.streaming_state || stream.streamingState;

        // Extract video objects
        const videos = stream.videos || [];
        for (const v of videos) {
          if (v?.id && !v.id.startsWith('pending:')) {
            mediaIds.push(v.id);
          }
          // Some responses include URLs directly
          if (v?.url) {
            onProgress?.('Video ready!', 1.0);
            return { videoUrl: v.url, conversationId, mediaIds };
          }
        }
      } catch {
        // skip malformed SSE lines
      }
    }

    onProgress?.(`Meta AI accepted request (state: ${streamingState || 'unknown'})`, 0.15);
    console.log(`  [MetaAiVideo] SSE processed — streamingState=${streamingState}, mediaIds=${mediaIds.length}`);
  } catch (e: any) {
    const msg = e.response?.data || e.message;
    console.error('  [MetaAiVideo] GraphQL request failed:', typeof msg === 'string' ? msg : JSON.stringify(msg).slice(0, 500));
    return null;
  }

  // ── Step 2: Poll for video URLs ───────────────────────────────────────
  if (mediaIds.length === 0) {
    console.warn('  [MetaAiVideo] No media IDs from initial response');
    return null;
  }

  const maxAttempts = 30;
  const waitMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    onProgress?.(`Polling attempt ${attempt + 1}/${maxAttempts}...`, 0.2 + (attempt / maxAttempts) * 0.7);

    await new Promise(r => setTimeout(r, waitMs));

    try {
      const pollPayload = {
        doc_id: POLL_MEDIA_DOC_ID,
        variables: {
          mediaId: mediaIds[0],
          mediaIdIsNull: false,
        },
      };

      const pollResp = await session.post(META_GRAPHQL_URL, pollPayload, {
        timeout: 15_000,
      });

      const pollText = typeof pollResp.data === 'string' ? pollResp.data : JSON.stringify(pollResp.data);

      // Search for video URLs in the response
      const urls: string[] = [];

      // Try parsing as JSON
      try {
        const pollJson = JSON.parse(pollText);
        const data = pollJson?.data;
        if (data) {
          const feed = data.mediaLibraryFeed?.edges || [];
          const createMedia = data.createRouteMedia || {};

          const allMedia = [...feed.map((e: any) => e.node), createMedia];

          for (const node of allMedia) {
            if (!node) continue;
            // Check if it's one of our videos
            const id = node.id;
            const url = node.url || node.fallbackUrl;
            if (id && mediaIds.includes(id) && url) {
              urls.push(url);
            }
            // Check nested videos
            if (node.videos) {
              for (const vid of node.videos) {
                if (vid?.id && mediaIds.includes(vid.id) && vid.url) {
                  urls.push(vid.url);
                }
              }
            }
          }
        }
      } catch {
        // Raw text search for URLs
        const match = pollText.match(/https:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/);
        if (match) {
          urls.push(match[0]);
        }
      }

      if (urls.length > 0) {
        onProgress?.('Video generation complete!', 1.0);
        console.log(`  [MetaAiVideo] ✅ Got ${urls.length} video URL(s)`);
        return { videoUrl: urls[0], conversationId, mediaIds };
      }

      if (attempt % 5 === 0) {
        console.log(`  [MetaAiVideo] Attempt ${attempt + 1}: not ready yet, polling...`);
      }
    } catch (e: any) {
      console.warn(`  [MetaAiVideo] Poll attempt ${attempt + 1} failed: ${e.message}`);
    }
  }

  console.warn('  [MetaAiVideo] ⚠️ Timed out after 30 attempts');
  return null;
}
