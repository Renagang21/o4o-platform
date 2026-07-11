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

// WO-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1: sanitize 단일화(모든 variant sanitizeRichHtml)
import { sanitizeRichHtml } from '../sanitize';
// WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1: 이미지 표시 폭/정렬 CSS (편집기와 동일)
import { IMAGE_DISPLAY_STYLES } from '../extensions/displayImage';
// WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1: 표 표시 CSS (편집기와 동일 — §5.5)
import { TABLE_STYLES } from '../extensions/tableKit';
// WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1: <video> 표시 CSS (편집기와 동일)
import { VIDEO_STYLES } from '../extensions/videoNode';

let imageDisplayCssInjected = false;
function injectImageDisplayCss() {
  if (imageDisplayCssInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = IMAGE_DISPLAY_STYLES;
  document.head.appendChild(style);
  imageDisplayCssInjected = true;
}

let tableCssInjected = false;
function injectTableCss() {
  if (tableCssInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = TABLE_STYLES;
  document.head.appendChild(style);
  tableCssInjected = true;
}

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
   * - 'store-description': 매장용 상품 설명서 디자인 시스템 (반응형 @container, 시맨틱 sd-* 클래스)
   */
  variant?: 'product-detail' | 'guide' | 'store-description';
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

/**
 * 임베드(YouTube/Vimeo iframe) 표시 CSS — WO-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1.
 * TipTap Youtube 확장이 직렬화한 iframe(class="editor-youtube")을 모든 variant 소비 표면에서
 * 반응형(16:9)으로 표시. 편집기와 동일 출력 정합.
 */
const embedCss = `
iframe.editor-youtube { width: 100%; max-width: 640px; height: auto; aspect-ratio: 16 / 9; border: none; border-radius: 6px; display: block; margin: 12px 0; }
div[data-youtube-video] { max-width: 640px; margin: 12px 0; }
div[data-youtube-video] iframe { width: 100%; height: auto; aspect-ratio: 16 / 9; border: none; border-radius: 6px; display: block; }
${VIDEO_STYLES}
`;
let embedCssInjected = false;
function injectEmbedCss() {
  if (embedCssInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = embedCss;
  document.head.appendChild(style);
  embedCssInjected = true;
}

/**
 * 매장용 상품 설명서(STORE/B2B `shared_product_descriptions`) 디자인 시스템.
 *
 * WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1
 *   콘텐츠는 <style> 없이 시맨틱 HTML(sd-* 클래스)만 저장한다(write-sanitizer 무손실 통과).
 *   반응형은 렌더러가 주입하는 이 스코프 스타일시트가 담당한다.
 *   - 모든 규칙은 `.store-desc-content` 하위로 스코프(호스트 페이지 오염 없음).
 *   - 래퍼에 container-type:inline-size → @container 로 폰(1열)·태블릿(2~3열) 반응형.
 *   - 라이트/다크 토큰(prefers-color-scheme + :root[data-theme]).
 */
const storeDescriptionCss = `
.store-desc-content{
  --sd-bg:#eaf0f7; --sd-card:#ffffff; --sd-ink:#1a2735; --sd-sub:#5b7085;
  --sd-blue:#1f6fbf; --sd-blue-deep:#17356b; --sd-navy:#13263f;
  --sd-line:#e4ebf3; --sd-chip:#eaf1fb; --sd-chip-line:#cfdff2; --sd-gold:#c79a3e;
  --sd-shadow:0 6px 22px rgba(23,53,107,.10);
  container-type:inline-size; background:var(--sd-bg); color:var(--sd-ink);
  font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased; padding:24px 14px 50px;
}
@media (prefers-color-scheme:dark){.store-desc-content{
  --sd-bg:#0e1620; --sd-card:#16212f; --sd-ink:#e7eef6; --sd-sub:#9fb3c6;
  --sd-blue:#5b9be0; --sd-blue-deep:#bcd6f2; --sd-navy:#e7eef6;
  --sd-line:#263647; --sd-chip:#1b2a3c; --sd-chip-line:#2c4056; --sd-gold:#d8b662;
  --sd-shadow:0 6px 22px rgba(0,0,0,.4);}}
:root[data-theme="dark"] .store-desc-content{
  --sd-bg:#0e1620; --sd-card:#16212f; --sd-ink:#e7eef6; --sd-sub:#9fb3c6;
  --sd-blue:#5b9be0; --sd-blue-deep:#bcd6f2; --sd-navy:#e7eef6;
  --sd-line:#263647; --sd-chip:#1b2a3c; --sd-chip-line:#2c4056; --sd-gold:#d8b662;
  --sd-shadow:0 6px 22px rgba(0,0,0,.4);}
:root[data-theme="light"] .store-desc-content{
  --sd-bg:#eaf0f7; --sd-card:#ffffff; --sd-ink:#1a2735; --sd-sub:#5b7085;
  --sd-blue:#1f6fbf; --sd-blue-deep:#17356b; --sd-navy:#13263f;
  --sd-line:#e4ebf3; --sd-chip:#eaf1fb; --sd-chip-line:#cfdff2; --sd-gold:#c79a3e;
  --sd-shadow:0 6px 22px rgba(23,53,107,.10);}
.store-desc-content *{box-sizing:border-box}
.store-desc-content .sd-card{max-width:860px;margin:0 auto;background:var(--sd-card);border:1px solid var(--sd-line);border-radius:20px;overflow:hidden;box-shadow:var(--sd-shadow)}
.store-desc-content .sd-scan{display:block;text-align:center;font-size:12.5px;letter-spacing:.1em;color:var(--sd-sub);margin:0 auto 12px;max-width:860px}
.store-desc-content .sd-hero{padding:28px 22px 24px;text-align:center;background:linear-gradient(180deg,var(--sd-chip),transparent)}
.store-desc-content .sd-badges{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}
.store-desc-content .sd-badge{font-size:12.5px;font-weight:700;border-radius:999px;padding:5px 12px;line-height:1;background:transparent;border:1px solid var(--sd-chip-line);color:var(--sd-blue)}
.store-desc-content .sd-badge.is-solid{background:var(--sd-blue-deep);color:#fff;border-color:transparent}
.store-desc-content .sd-hero h1{margin:0;font-size:32px;font-weight:800;letter-spacing:-.01em;color:var(--sd-navy);text-wrap:balance}
.store-desc-content .sd-hero h1 small{display:block;font-size:15px;font-weight:600;color:var(--sd-blue);letter-spacing:.01em;margin-top:9px}
.store-desc-content .sd-meta{margin:12px 0 0;font-size:13px;color:var(--sd-sub)}
.store-desc-content .sd-body{padding:6px 22px 26px}
.store-desc-content .sd-intro{font-size:15.5px;line-height:1.75;color:var(--sd-ink);margin:20px 2px 0}
.store-desc-content .sd-intro b{color:var(--sd-blue);font-weight:700}
.store-desc-content .sd-body h2{font-size:18px;letter-spacing:-.005em;color:var(--sd-navy);font-weight:800;text-align:center;margin:34px 0 16px}
.store-desc-content .sd-body h2::after{content:"";display:block;width:26px;height:3px;border-radius:3px;background:var(--sd-blue);margin:10px auto 0}
.store-desc-content .sd-why,.store-desc-content .sd-who{list-style:none;margin:0;padding:0}
.store-desc-content .sd-why li,.store-desc-content .sd-who li{position:relative;padding:11px 0 11px 22px;font-size:15.5px;color:var(--sd-ink);border-bottom:1px solid var(--sd-line);line-height:1.5}
.store-desc-content .sd-why li::before{content:"";position:absolute;left:2px;top:18px;width:7px;height:7px;border-radius:50%;background:var(--sd-blue)}
.store-desc-content .sd-who li::before{content:"";position:absolute;left:2px;top:18px;width:7px;height:7px;border-radius:50%;background:var(--sd-gold)}
.store-desc-content .sd-core{display:flex;flex-direction:column;gap:11px}
.store-desc-content .sd-item{background:var(--sd-chip);border:1px solid var(--sd-line);border-left:3px solid var(--sd-blue);border-radius:14px;padding:15px 16px 14px}
.store-desc-content .sd-item .sd-tag{display:inline-block;font-size:12px;font-weight:700;color:#fff;background:var(--sd-blue);border-radius:6px;padding:3px 10px;margin-bottom:8px}
.store-desc-content .sd-item h3{margin:0 0 6px;font-size:18px;font-weight:800;color:var(--sd-navy)}
.store-desc-content .sd-item p{margin:0;font-size:15px;line-height:1.64;color:var(--sd-sub)}
.store-desc-content .sd-intake{font-size:15.5px;color:var(--sd-ink);text-align:center;margin:0 2px;line-height:1.6}
.store-desc-content .sd-intake small{display:block;color:var(--sd-sub);font-size:13px;margin-top:5px}
.store-desc-content .sd-chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:2px;padding:0;list-style:none}
.store-desc-content .sd-chips span,.store-desc-content .sd-chips li{font-size:12.5px;font-weight:600;color:var(--sd-blue);background:var(--sd-chip);border:1px solid var(--sd-chip-line);border-radius:999px;padding:6px 12px}
.store-desc-content .sd-spec{text-align:center;font-size:13.5px;color:var(--sd-sub);font-weight:600;margin:20px 0 0}
.store-desc-content .sd-cta{margin-top:28px;background:linear-gradient(180deg,var(--sd-chip),transparent);border:1px solid var(--sd-line);border-radius:16px;padding:22px 18px;text-align:center}
.store-desc-content .sd-cta .sd-cta-k{font-size:12.5px;letter-spacing:.1em;color:var(--sd-blue);font-weight:800;margin-bottom:9px}
.store-desc-content .sd-cta p{margin:0;font-size:15px;line-height:1.64;color:var(--sd-ink)}
.store-desc-content .sd-cta b{color:var(--sd-blue)}
.store-desc-content .sd-foot{text-align:center;font-size:12px;color:var(--sd-sub);margin-top:18px;letter-spacing:.02em}
@container (min-width:640px){
  .store-desc-content .sd-hero{padding:40px 34px 32px}
  .store-desc-content .sd-hero h1{font-size:44px}
  .store-desc-content .sd-hero h1 small{font-size:17px;margin-top:11px}
  .store-desc-content .sd-meta{font-size:14.5px}
  .store-desc-content .sd-badge{font-size:13.5px;padding:6px 14px}
  .store-desc-content .sd-body{padding:8px 40px 40px}
  .store-desc-content .sd-intro{font-size:17px;line-height:1.8;max-width:68ch;margin-left:auto;margin-right:auto;text-align:center}
  .store-desc-content .sd-body h2{font-size:21px;margin:44px 0 20px}
  .store-desc-content .sd-core{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .store-desc-content .sd-why,.store-desc-content .sd-who{display:grid;grid-template-columns:1fr 1fr;column-gap:28px}
  .store-desc-content .sd-why li,.store-desc-content .sd-who li{font-size:16.5px}
  .store-desc-content .sd-item h3{font-size:19px}
  .store-desc-content .sd-item p{font-size:15.5px}
  .store-desc-content .sd-intake{font-size:17px}
  .store-desc-content .sd-chips span,.store-desc-content .sd-chips li{font-size:13.5px;padding:7px 14px}
  .store-desc-content .sd-cta{padding:28px 24px}
  .store-desc-content .sd-cta p{font-size:16px;max-width:62ch;margin:0 auto}
}
@container (min-width:900px){.store-desc-content .sd-core{grid-template-columns:1fr 1fr 1fr}}
`;

let storeDescriptionCssInjected = false;
function injectStoreDescriptionCss() {
  if (storeDescriptionCssInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = storeDescriptionCss;
  document.head.appendChild(style);
  storeDescriptionCssInjected = true;
}

export function ContentRenderer({ html = '', className, style, variant }: ContentRendererProps) {
  // WO-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1: 이미지·표·임베드 CSS 를 모든 variant 공통 주입.
  injectImageDisplayCss();
  injectTableCss();
  injectEmbedCss();
  // WO-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1: sanitize 단일화 —
  //   모든 variant 에서 sanitizeRichHtml 사용(iframe = youtube/vimeo 호스트 allowlist 보존).
  //   기존 기본/product-detail variant 는 sanitizeHtml 로 iframe 을 제거해 소비 표면에서 YouTube 가
  //   드롭됐다(LMS/상품상세/공지/자료실). variant 는 이제 CSS/레이아웃만 좌우하고 sanitize 는 항상 동일.
  if (variant === 'product-detail') {
    injectProductDetailCss();
    return (
      <div
        className={`product-detail-content ${className || ''}`}
        style={{ ...productDetailStyle, ...style }}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
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

  // WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1: 매장용 설명서 반응형 디자인 시스템.
  //   콘텐츠는 시맨틱 sd-* 클래스만 담고, 반응형 CSS 는 이 variant 가 스코프 주입한다.
  if (variant === 'store-description') {
    injectStoreDescriptionCss();
    return (
      <div
        className={`store-desc-content ${className || ''}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
      />
    );
  }

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}
