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
