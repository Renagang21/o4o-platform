/**
 * HTML Sanitization Utility
 *
 * DOMPurify 기반 HTML 새니타이즈.
 * dangerouslySetInnerHTML 사용 시 반드시 이 함수를 통해 정화.
 */

import DOMPurify from 'dompurify';

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
