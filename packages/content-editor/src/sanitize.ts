/**
 * HTML Sanitization Utility
 *
 * DOMPurify 기반 HTML 새니타이즈.
 * dangerouslySetInnerHTML 사용 시 반드시 이 함수를 통해 정화.
 */

import DOMPurify from 'dompurify';

/**
 * "빈 본문" 판정 — HTML 직접 입력 모드의 placeholder/공백 정규화.
 * WO-O4O-STANDARD-EDITOR-HTML-DIRECT-INPUT-PREVIEW-SAVE-FIX-V1 §4.2
 *
 * `<p></p>`, `<p><br></p>`, `<div></div>`, `<br>`, 공백만 있는 경우 빈 본문으로 간주.
 * 단, 텍스트가 없어도 img/iframe/video/hr 등 미디어가 있으면 본문 있음으로 본다.
 *
 * 에디터(미리보기·저장 분기)와 소비처(저장 전 본문 존재 여부 검사)가
 * 동일한 정의를 공유하도록 단일 출처로 export 한다.
 */
export function isBlankHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const stripped = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, '');
  if (stripped.length > 0) return false;
  return !/<(img|iframe|video|hr)\b/i.test(html);
}

/**
 * HTML 문자열을 새니타이즈하여 XSS 공격을 방지합니다.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}

/**
 * 리치 콘텐츠(이미지·YouTube/Vimeo) 용 새니타이즈.
 *
 * sanitizeHtml 대비 추가 허용:
 * - <iframe> — YouTube/Vimeo embed URL만 허용 (그 외 src는 제거)
 * - <img> — 기본 DOMPurify 허용 범위 유지
 *
 * 계속 차단:
 * - <script>, inline JS, 임의 iframe src
 */
export function sanitizeRichHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow', 'width', 'height'],
  });

  // 브라우저 환경에서만 iframe src 후처리 (YouTube/Vimeo 외 제거)
  if (typeof document === 'undefined' || !clean.includes('<iframe')) {
    return clean;
  }

  const div = document.createElement('div');
  div.innerHTML = clean;
  div.querySelectorAll('iframe').forEach((iframe) => {
    const src = iframe.getAttribute('src') || '';
    const allowed =
      src.startsWith('https://www.youtube.com/embed/') ||
      src.startsWith('https://player.vimeo.com/video/');
    if (!allowed) iframe.remove();
  });
  return div.innerHTML;
}
