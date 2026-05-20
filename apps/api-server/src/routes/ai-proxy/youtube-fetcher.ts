/**
 * YouTube content fetcher for /api/ai/url-to-blocks
 * WO-O4O-AI-URL-TO-BLOCKS-YOUTUBE-SUPPORT-V1
 *
 * 일반 web URL 의 fetch + stripHtml 흐름은 YouTube SPA 에 동작하지 않으므로
 * (실제 영상 제목/설명/자막을 가져오지 못함) 별도 fetcher 가 필요하다.
 *
 * 본 모듈은 다음을 제공한다.
 *   - isYouTubeUrl(url)          : 호스트 매칭으로 YouTube 여부 판정
 *   - extractVideoId(url)        : watch?v= / shorts/ / embed/ / v/ / youtu.be/ 모두 처리
 *   - fetchYouTubeOEmbed(url)    : public oEmbed (title / author / thumbnail)
 *   - fetchYouTubeTranscript(id) : transcript 추출 (실패 graceful → null)
 *   - fetchYouTubeContent(url)   : 위 셋을 합쳐 plain text 반환 (Gemini 입력용)
 *
 * 모든 함수는 throw 하지 않는다 — 실패하면 null 또는 fallback string 반환.
 * 호출 측(fetchUrlText)은 fetchYouTubeContent 결과 길이만 검증하면 된다.
 */

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

export function isYouTubeUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    return YOUTUBE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/**
 * 모든 흔한 YouTube URL 형태에서 11자리 videoId 추출.
 * 지원: watch?v= / shorts/ / embed/ / v/ / youtu.be/ID
 * 시간 파라미터(t/start) 등은 무시한다.
 */
export function extractVideoId(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }

  // youtu.be/<id>
  if (u.hostname === 'youtu.be') {
    const id = u.pathname.split('/').filter(Boolean)[0];
    return id || null;
  }

  if (!YOUTUBE_HOSTS.has(u.hostname)) return null;

  // /watch?v=<id>
  const v = u.searchParams.get('v');
  if (v) return v;

  // /shorts/<id> | /embed/<id> | /v/<id> | /live/<id>
  const segs = u.pathname.split('/').filter(Boolean);
  if (segs.length >= 2 && ['shorts', 'embed', 'v', 'live'].includes(segs[0])) {
    return segs[1] || null;
  }

  return null;
}

export interface YouTubeOEmbed {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  provider_name?: string;
}

/**
 * YouTube oEmbed (public, key 불필요).
 * 실패 시 null — 호출 측 graceful 처리.
 */
export async function fetchYouTubeOEmbed(rawUrl: string): Promise<YouTubeOEmbed | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; O4O-AI-Bot/1.0)' },
    });
    if (!r.ok) return null;
    const json = (await r.json()) as YouTubeOEmbed;
    return json;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * transcript 추출.
 * youtube-transcript npm 패키지를 동적 import 하여 사용 — 라이브러리 자체 실패도
 * graceful 하게 null 반환 (의존성이 없거나, YouTube 가 자막 API 를 변경한 경우 등).
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // 동적 import — 패키지가 없거나 깨졌을 때도 throw 하지 않게
    const mod = await import('youtube-transcript').catch(() => null);
    if (!mod) return null;
    const Transcript = (mod as any).YoutubeTranscript ?? (mod as any).default ?? mod;
    if (!Transcript || typeof Transcript.fetchTranscript !== 'function') return null;

    // 10s timeout — fetchTranscript can hang (never-reject) if YouTube blocks the request,
    // which would stall the entire Promise.all in fetchYouTubeContent indefinitely.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('transcript timeout')), 10000),
    );
    const items: Array<{ text?: string }> = await Promise.race([
      Transcript.fetchTranscript(videoId),
      timeoutPromise,
    ]).catch(() => []);
    if (!Array.isArray(items) || items.length === 0) return null;

    const merged = items
      .map((i) => (typeof i?.text === 'string' ? i.text : ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return merged.length > 0 ? merged : null;
  } catch {
    return null;
  }
}

/**
 * Gemini 입력용 결합 텍스트.
 * - 자막이 있으면 oEmbed metadata + 자막
 * - 자막이 없으면 oEmbed metadata 만 + 명시적 안내
 * - oEmbed/transcript 둘 다 실패하면 URL 만 반환 (fetchUrlText 의 50자 게이트에 걸리도록)
 *
 * 자막은 토큰 초과 방지용으로 6000자 컷.
 */
export async function fetchYouTubeContent(rawUrl: string): Promise<string> {
  const videoId = extractVideoId(rawUrl);
  const [oembed, transcript] = await Promise.all([
    fetchYouTubeOEmbed(rawUrl),
    videoId ? fetchYouTubeTranscript(videoId) : Promise.resolve<string | null>(null),
  ]);

  const lines: string[] = [];
  if (oembed?.title) lines.push(`제목: ${oembed.title}`);
  if (oembed?.author_name) lines.push(`채널: ${oembed.author_name}`);
  if (oembed?.thumbnail_url) lines.push(`썸네일: ${oembed.thumbnail_url}`);
  lines.push(`원본 URL: ${rawUrl}`);

  if (transcript) {
    const clipped = transcript.slice(0, 6000);
    lines.push('', '=== 자막 ===', clipped);
  } else if (oembed) {
    lines.push('', '(자막을 가져올 수 없습니다. 영상 제목과 채널 정보를 바탕으로 정리합니다.)');
  } else {
    // oEmbed/transcript 모두 실패 — URL 만 가지고는 의미 있는 콘텐츠 생성 불가
    // fetchUrlText 의 50자 게이트가 정상적으로 422 를 내도록 짧게 유지
    return `원본 URL: ${rawUrl}`;
  }

  return lines.join('\n');
}
