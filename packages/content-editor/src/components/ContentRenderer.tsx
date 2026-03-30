/**
 * ContentRenderer — 안전한 HTML 콘텐츠 렌더러
 *
 * WO-O4O-CONTENT-RENDERER-UNIFICATION-V1
 *
 * 모든 HTML 콘텐츠 출력에 사용하는 단일 컴포넌트.
 * 내부에서 sanitizeHtml 적용 — 외부 sanitize 불필요.
 */

import { sanitizeHtml } from '../sanitize';

interface ContentRendererProps {
  /** 렌더링할 HTML 콘텐츠 */
  html?: string;
  /** CSS 클래스명 */
  className?: string;
  /** 인라인 스타일 */
  style?: React.CSSProperties;
}

export function ContentRenderer({ html = '', className, style }: ContentRendererProps) {
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
