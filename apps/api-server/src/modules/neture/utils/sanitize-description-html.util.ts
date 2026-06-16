/**
 * Backend-safe HTML sanitizer (jsdom + DOMPurify)
 *
 * WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2
 *
 * `shared_product_descriptions` write-path 의 1차 방어선.
 * - api-server 는 브라우저 DOM 이 없으므로 jsdom 으로 window 를 구성해 DOMPurify 를 실행한다.
 * - 정책은 frontend `@o4o/content-editor` 의 `sanitizeHtml` 과 동일하게 DOMPurify **기본 정책**을 사용한다
 *   (별도 whitelist 신규 정의 없음). render 단계(ContentRenderer)의 2차 방어선은 그대로 유지된다.
 */

import DOMPurify, { type WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';

// 모듈 로드 시 1회만 jsdom window + DOMPurify 인스턴스 구성 (요청마다 재생성하지 않음).
const { window } = new JSDOM('');
const purify = DOMPurify(window as unknown as WindowLike);

/**
 * HTML 문자열을 backend 에서 sanitize 한다.
 * null/undefined 는 빈 문자열로 처리하며 결과는 trim 한다.
 */
export function sanitizeDescriptionHtml(value?: string | null): string {
  return purify.sanitize(value ?? '').trim();
}
