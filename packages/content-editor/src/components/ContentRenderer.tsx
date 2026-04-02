/**
 * ContentRenderer — 안전한 HTML 콘텐츠 렌더러
 *
 * WO-O4O-CONTENT-RENDERER-UNIFICATION-V1
 *
 * 모든 HTML 콘텐츠 출력에 사용하는 단일 컴포넌트.
 * 내부에서 sanitizeHtml 적용 — 외부 sanitize 불필요.
 *
 * variant="product-detail" — 상품 상세설명 전용 래퍼
 *   WO-NETURE-PRODUCT-DESCRIPTION-CONTENT-WIDTH-STANDARDIZATION-V1
 *   max-width 720px, 가운데 정렬, 이미지 반응형(width:100%, height:auto, display:block)
 */

import { sanitizeHtml } from '../sanitize';

interface ContentRendererProps {
  /** 렌더링할 HTML 콘텐츠 */
  html?: string;
  /** CSS 클래스명 */
  className?: string;
  /** 인라인 스타일 */
  style?: React.CSSProperties;
  /**
   * 렌더링 변형. 'product-detail' 지정 시 상품 상세설명 전용 폭/이미지 규칙 적용.
   * 다른 편집기 확장 시 variant를 추가하여 재사용 가능.
   */
  variant?: 'product-detail';
}

/** 상품 상세설명 전용 스타일 — 이미지 반응형 + 컨텐츠 폭 제한 */
const productDetailStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
};

const productDetailCss = `
.product-detail-content img {
  max-width: 100%;
  height: auto;
  display: block;
}
`;

let productDetailCssInjected = false;

function injectProductDetailCss() {
  if (productDetailCssInjected) return;
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = productDetailCss;
  document.head.appendChild(style);
  productDetailCssInjected = true;
}

export function ContentRenderer({ html = '', className, style, variant }: ContentRendererProps) {
  if (variant === 'product-detail') {
    injectProductDetailCss();
    return (
      <div
        className={`product-detail-content ${className || ''}`}
        style={{ ...productDetailStyle, ...style }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    );
  }

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
