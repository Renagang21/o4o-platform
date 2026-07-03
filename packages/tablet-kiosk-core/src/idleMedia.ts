/**
 * idleMedia — Tablet idle 화면 미디어 타입 판별 + YouTube/Vimeo embed 변환
 *
 * WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1
 *
 * tablet-kiosk-core 는 서비스(web-kpa-society)의 videoEmbed 유틸을 import 할 수 없으므로
 * (공유 패키지 → 서비스 역참조 금지), 대기화면 전용 최소 embed 헬퍼를 여기에 둔다.
 *
 * 정책:
 * - 저장값은 사용자가 입력한 원본 URL. runtime 에서 embed URL 로 변환(수정/표시 용이).
 * - 대기화면 = 무음 자동재생 + 반복재생(loop). YouTube/Vimeo player 정책 영향은 완전 제거 불가.
 * - id 추출 실패 시 null → 호출부가 안전 처리(미표시).
 */

export type IdleMediaType = 'image' | 'video' | 'youtube' | 'vimeo';

const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/i;
const VIMEO_RE = /vimeo\.com/i;
const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

/** URL 로부터 대기화면 미디어 타입 자동 판별. */
export function detectIdleMediaType(url: string): IdleMediaType {
  const u = (url || '').trim();
  if (!u) return 'image';
  if (YOUTUBE_RE.test(u)) return 'youtube';
  if (VIMEO_RE.test(u)) return 'vimeo';
  if (VIDEO_EXT_RE.test(u.toLowerCase())) return 'video';
  return 'image';
}

function extractYouTubeId(url: string): string | null {
  let m = url.match(/youtu\.be\/([\w-]{6,})/);
  if (m) return m[1];
  m = url.match(/[?&]v=([\w-]{6,})/);
  if (m) return m[1];
  m = url.match(/youtube\.com\/(?:shorts|embed)\/([\w-]{6,})/);
  if (m) return m[1];
  return null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  return m ? m[1] : null;
}

/**
 * YouTube/Vimeo 원본 URL → 대기화면 embed URL.
 * autoplay(기본 true) + mute + loop + playsinline + controls 최소화.
 * 인식 실패 시 null.
 */
export function toIdleEmbedUrl(url: string, opts: { autoplay?: boolean } = {}): string | null {
  const autoplay = opts.autoplay !== false;
  const u = (url || '').trim();
  if (!u) return null;

  if (YOUTUBE_RE.test(u)) {
    const id = extractYouTubeId(u);
    if (!id) return null;
    const p = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: '1',
      loop: '1',
      playlist: id, // 단일 영상 loop 를 위해 playlist=자기 자신 필요
      controls: '0',
      playsinline: '1',
      rel: '0',
      modestbranding: '1',
    });
    return `https://www.youtube.com/embed/${id}?${p.toString()}`;
  }

  if (VIMEO_RE.test(u)) {
    const id = extractVimeoId(u);
    if (!id) return null;
    const p = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      muted: '1',
      loop: '1',
      background: '1', // 컨트롤/UI 최소화 + 자동재생
      playsinline: '1',
    });
    return `https://player.vimeo.com/video/${id}?${p.toString()}`;
  }

  return null;
}
