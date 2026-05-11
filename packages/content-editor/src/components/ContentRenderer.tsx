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

import { sanitizeHtml, sanitizeRichHtml } from '../sanitize';

interface ContentRendererProps {
  /** 렌더링할 HTML 콘텐츠 */
  html?: string;
  /** CSS 클래스명 */
  className?: string;
  /** 인라인 스타일 */
  style?: React.CSSProperties;
  /**
   * 렌더링 변형.
   * - 'product-detail': 상품 상세설명 전용 폭/이미지 규칙 적용
   * - 'guide': 가이드/온보딩 콘텐츠 렌더링 (YouTube iframe + 이미지 + 리치 블록)
   */
  variant?: 'product-detail' | 'guide';
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
  margin-left: auto;
  margin-right: auto;
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

/** 가이드/온보딩 콘텐츠 렌더링 CSS — YouTube iframe + 이미지 + 리치 블록 */
const guideCss = `
.guide-rich-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; display: block; }
.guide-rich-content iframe { width: 100%; max-width: 640px; aspect-ratio: 16/9; border: none; border-radius: 6px; margin: 8px 0; display: block; }
.guide-rich-content h2 { font-size: 1.25em; font-weight: 700; margin: 1em 0 0.4em; }
.guide-rich-content h3 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.3em; }
.guide-rich-content ul, .guide-rich-content ol { padding-left: 1.5em; margin: 0.4em 0; }
.guide-rich-content li { margin: 0.2em 0; }
.guide-rich-content a { color: #2563eb; text-decoration: underline; }
.guide-rich-content p { margin: 0 0 0.5em; }
`;

let guideCssInjected = false;

function injectGuideCss() {
  if (guideCssInjected) return;
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = guideCss;
  document.head.appendChild(style);
  guideCssInjected = true;
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

  if (variant === 'guide') {
    injectGuideCss();
    return (
      <div
        className={`guide-rich-content ${className || ''}`}
        style={{ lineHeight: 1.7, ...style }}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
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
