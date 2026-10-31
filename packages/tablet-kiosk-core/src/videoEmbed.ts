/**
 * videoEmbed — 외부 동영상 URL → embed URL 변환 (최소 구현)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * YouTube / Vimeo 의 일반 시청 URL 을 iframe embed URL 로 변환한다.
 * V1 범위 고정: 자체 업로드/스트리밍·고급 도메인 정책 없음 — embed 변환만.
 * 인식하지 못하는 URL 은 그대로 반환(직접 임베드 시도) → 호출부에서 fallback 처리.
 *
 * 지원:
 *   - youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
 *   - vimeo.com/ID, player.vimeo.com/video/ID
 */

export interface VideoEmbed {
  /** iframe src (embeddable). 인식 실패 시 원본 URL. */
  embedUrl: string;
  /** 인식된 제공자. 인식 실패 시 'unknown'. */
  provider: "youtube" | "vimeo" | "unknown";
}

/** A video address, never a channel/playlist address or an arbitrary iframe host. */
export function hostedVideo(value: string): { provider: 'youtube' | 'vimeo'; id: string; url: string } | null {
  try {
    const u = new URL(value.trim());
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return null;
    const host = u.hostname.toLowerCase(), parts = u.pathname.split('/').filter(Boolean);
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
      const pathId = ['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null;
      const id = host.endsWith('youtu.be') ? parts[0] : u.searchParams.get('v') || pathId;
      return id && /^[\w-]{11}$/.test(id) ? { provider: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = parts.find(part => /^\d+$/.test(part));
      return id ? { provider: 'vimeo', id, url: `https://vimeo.com/${id}` } : null;
    }
  } catch { /* Keep invalid input in its editor for correction. */ }
  return null;
}

export function extractYouTubeId(url: string): string | null {
  // youtu.be/ID
  let m = url.match(/youtu\.be\/([\w-]{6,})/);
  if (m) return m[1];
  // youtube.com/watch?v=ID
  m = url.match(/[?&]v=([\w-]{6,})/);
  if (m) return m[1];
  // youtube.com/shorts/ID or /embed/ID
  m = url.match(/youtube\.com\/(?:shorts|embed)\/([\w-]{6,})/);
  if (m) return m[1];
  return null;
}

export function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  return m ? m[1] : null;
}

/**
 * 외부 동영상 URL 을 embed 정보로 변환한다.
 */
export function toVideoEmbed(rawUrl: string): VideoEmbed {
  const url = (rawUrl || "").trim();
  if (!url) return { embedUrl: "", provider: "unknown" };

  if (/youtube\.com|youtu\.be/.test(url)) {
    const id = extractYouTubeId(url);
    if (id) {
      return {
        embedUrl: `https://www.youtube.com/embed/${id}`,
        provider: "youtube",
      };
    }
  }

  if (/vimeo\.com/.test(url)) {
    const id = extractVimeoId(url);
    if (id) {
      return {
        embedUrl: `https://player.vimeo.com/video/${id}`,
        provider: "vimeo",
      };
    }
  }

  return { embedUrl: url, provider: "unknown" };
}
