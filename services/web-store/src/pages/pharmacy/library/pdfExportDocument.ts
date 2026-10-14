import { sanitizeRichHtml } from '@o4o/content-editor';

export interface PdfOptions {
  title: boolean;
  pharmacyName: boolean;
  phone: boolean;
  address: boolean;
  consult: boolean;
  printDate: boolean;
}

// WO §9: 1차 상담 안내 기본 문구(직접 편집은 2차)
export const DEFAULT_CONSULT_TEXT = '궁금한 점은 약사에게 문의하세요.';

// WO-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1:
//   화면(QR/태블릿)용 스타일이 그대로 인쇄되면 글자·줄간격·여백이 커서 페이지 수가 과도하다.
//   PDF 전용 밀도 프리셋을 두어 출력 형식을 선택한다(콘텐츠 원본 HTML 은 변경하지 않음 —
//   본문 inline 디자인은 보존하고, 기본 스타일의 heading/line-height/여백/이미지 높이만 조정).
export type PdfDensity = 'standard' | 'compact' | 'large';

interface DensityPreset {
  page: string;       // @page margin
  body: string;       // 본문 글자
  lh: number;         // line-height
  h1: string;
  h2: string;
  h3: string;
  pGap: string;       // 문단/목록 아래 여백
  imgMax: string;     // 이미지 최대 높이 추가 규칙(절약형 페이지 절약)
}

const DENSITY_PRESETS: Record<PdfDensity, DensityPreset> = {
  standard: { page: '14mm 14mm', body: '11pt', lh: 1.45, h1: '19pt', h2: '15pt', h3: '13pt', pGap: '7px', imgMax: '' },
  compact:  { page: '11mm 12mm', body: '10pt', lh: 1.3,  h1: '16pt', h2: '13pt', h3: '12pt', pGap: '5px', imgMax: 'max-height: 95mm;' },
  large:    { page: '15mm 15mm', body: '13pt', lh: 1.6,  h1: '22pt', h2: '17pt', h3: '14pt', pGap: '9px', imgMax: '' },
};

export const DENSITY_OPTIONS: { key: PdfDensity; label: string; desc: string }[] = [
  { key: 'standard', label: '표준형', desc: '일반 고객 설명자료' },
  { key: 'compact', label: '절약형', desc: '페이지 절약 · 보관/내부용' },
  { key: 'large', label: '큰 글씨형', desc: '고령 고객 · 카운터 비치' },
];

// ─── 본문 HTML 추출 (contentJson) ─────────────────────────────────────────────

// /store-library/contents 피드의 contentJson 에서 본문 HTML 을 추출한다.
// 우선순위: html(direct/execution + 일부 snapshot) → blocks[] → body/content → imageUrl.
export function contentJsonToHtml(json: Record<string, unknown> | undefined, origin: 'snapshot' | 'direct' | 'execution-asset'): string {
  if (!json) return '';
  // Snapshot overrides save body, including an intentionally empty body.
  if (origin === 'snapshot' && typeof json.body === 'string') return json.body;

  // 1) html 키 — execution-asset(html_content) / direct(content_json.html) / RichText snapshot
  if (typeof json.html === 'string' && json.html.trim()) {
    return json.html;
  }

  // 2) blocks[] — 구조화 콘텐츠(PrintContentPage parseBlocks 와 동일 해석)
  const blocks = Array.isArray(json.blocks) ? (json.blocks as Array<Record<string, unknown>>) : null;
  if (blocks && blocks.length > 0) {
    return blocks
      .map((b) => {
        const type = (b.type as string) || 'text';
        const value = String(b.value ?? b.content ?? b.url ?? '');
        if (type === 'list' && Array.isArray(b.items)) return `<ul>${b.items.map(item => `<li>${escHtml(String(item))}</li>`).join('')}</ul>`;
        if (type === 'image' && value) {
          return `<div class="pdf-img"><img src="${escAttr(value)}" alt="" /></div>`;
        }
        if (type === 'link' && value) {
          const label = (b.label as string) || value;
          return `<p class="pdf-link">${escHtml(label)}: ${escHtml(value)}</p>`;
        }
        return `<p class="pdf-text">${escHtml(String(value))}</p>`;
      })
      .join('\n');
  }

  // 3) body/content RichText HTML + 단일 imageUrl
  const body =
    typeof json.body === 'string' ? json.body : typeof json.content === 'string' ? json.content : '';
  let html = body || '';
  if (typeof json.imageUrl === 'string' && json.imageUrl) {
    html += `<div class="pdf-img"><img src="${escAttr(json.imageUrl)}" alt="" /></div>`;
  }
  return html;
}

// ─── A4 인쇄용 HTML 조판 ──────────────────────────────────────────────────────

export function buildPrintHtml(args: {
  contentTitle: string;
  bodyHtml: string;
  opts: PdfOptions;
  density: PdfDensity;
  storeName: string;
  phone: string;
  address: string;
  consultText: string;
}): string {
  const { contentTitle, bodyHtml, opts, density, storeName, phone, address, consultText } = args;
  const d = DENSITY_PRESETS[density];

  const titleBlock = opts.title
    ? `<h1 class="pdf-title">${escHtml(contentTitle)}</h1>`
    : '';

  const bodyBlock = `<div class="pdf-body">${sanitizeRichHtml(bodyHtml) || '<p class="pdf-empty">본문 내용이 없습니다.</p>'}</div>`;

  const footerRows: string[] = [];
  if (opts.pharmacyName && storeName) footerRows.push(`<div class="pdf-store-name">${escHtml(storeName)}</div>`);
  const contactParts: string[] = [];
  if (opts.phone && phone) contactParts.push(escHtml(phone));
  if (opts.address && address) contactParts.push(escHtml(address));
  if (contactParts.length) footerRows.push(`<div class="pdf-store-contact">${contactParts.join(' · ')}</div>`);
  if (opts.consult && consultText) footerRows.push(`<div class="pdf-consult">${escHtml(consultText)}</div>`);
  if (opts.printDate) footerRows.push(`<div class="pdf-date">출력일: ${escHtml(formatToday())}</div>`);

  const footerBlock = footerRows.length
    ? `<footer class="pdf-footer">${footerRows.join('\n')}</footer>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escHtml(opts.title ? contentTitle : '인쇄용 PDF')}</title>
<style>
  /* WO-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1: 밀도 프리셋(${density}) */
  @page { size: A4 portrait; margin: ${d.page}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Noto Sans KR", "Malgun Gothic", -apple-system, sans-serif;
    color: #1f2937;
    line-height: ${d.lh};
  }
  /* WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1: 본문 디자인 보존.
     콘텐츠 본문 HTML 의 배경색·글자색·카드 박스가 인쇄/PDF 에 그대로 출력되도록 강제한다.
     (브라우저는 기본적으로 배경색/배경이미지를 인쇄에서 생략하므로 모든 요소에 적용) */
  html, body, .pdf-sheet, .pdf-sheet * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pdf-sheet { max-width: 800px; margin: 0 auto; padding: 24px; }
  .pdf-title { font-size: ${d.h1}; font-weight: 700; color: #0f172a; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
  /* 본문 영역: 콘텐츠 제작자가 넣은 inline 디자인(색/배경/박스/정렬)을 덮어쓰지 않는다.
     색/배경 강제 없음 — inline style 또는 body 기본색 그대로. 단 인쇄 밀도(글자/줄간격/여백/제목 크기)는
     PDF 전용 기본값으로 조정해 페이지 수를 줄인다. inline font-size 가 있는 요소는 그 값이 우선한다. */
  .pdf-body { font-size: ${d.body}; line-height: ${d.lh}; }
  /* 본문 내 기본 제목 — 화면 기본(대형) 대신 인쇄용 크기. inline 지정 시 inline 우선. */
  .pdf-body h1 { font-size: ${d.h1}; line-height: 1.25; margin: 14px 0 8px; }
  .pdf-body h2 { font-size: ${d.h2}; line-height: 1.3; margin: 14px 0 6px; }
  .pdf-body h3 { font-size: ${d.h3}; line-height: 1.3; margin: 10px 0 5px; }
  .pdf-body p { margin: 0 0 ${d.pGap}; }
  .pdf-body ul, .pdf-body ol { margin: 0 0 ${d.pGap}; padding-left: 1.4em; }
  .pdf-body li { margin: 0 0 2px; }
  .pdf-body img, .pdf-img img { max-width: 100%; height: auto; ${d.imgMax} }
  .pdf-body table { border-collapse: collapse; max-width: 100%; }
  .pdf-text { white-space: pre-wrap; margin: 0 0 ${d.pGap}; }
  .pdf-link { font-size: ${d.h3}; color: #2563eb; margin: 0 0 6px; }
  .pdf-empty { color: #94a3b8; }
  .pdf-footer { margin-top: 22px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
  .pdf-store-name { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 2px; }
  .pdf-store-contact { margin-bottom: 4px; }
  .pdf-consult { margin-top: 6px; color: #475569; }
  .pdf-date { margin-top: 6px; color: #94a3b8; }
  .no-print { text-align: center; margin: 16px 0; }
  .no-print button { padding: 8px 18px; font-size: 13px; font-weight: 500; color: #fff; background: #2563eb; border: none; border-radius: 6px; cursor: pointer; }
  @media print { .no-print { display: none !important; } .pdf-sheet { max-width: none; padding: 0; } }
</style>
</head>
<body>
  <div class="no-print"><button type="button" onclick="window.print()">인쇄 / PDF로 저장</button></div>
  <div class="pdf-sheet">
    ${titleBlock}
    ${bodyBlock}
    ${footerBlock}
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 350);
    });
  </script>
</body>
</html>`;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(s: string): string {
  return escHtml(s);
}

function formatToday(): string {
  const d = new Date();
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}
