/**
 * ContentPdfExportModal — 선택 콘텐츠 인쇄용 PDF 만들기 옵션 모달
 *
 * WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1
 *
 * `/store/library/contents` 에서 콘텐츠 1개 선택 → 선택 작업 영역 [인쇄용 PDF 만들기] → 본 모달.
 *
 * 정책:
 * - 1차는 단일 콘텐츠만 지원(호출 측에서 1개 선택 시에만 진입).
 * - 본문은 필수(해제 불가). 제목/약국명/전화/주소/상담문구/출력일은 선택 체크.
 * - 약국 정보(명/전화/주소)는 매장 기본정보(getPharmacyInfo)에서 가져온다. 값이 없으면 체크 불가.
 * - QR 코드는 1차에서 자동 생성하지 않으므로 비활성 + 안내(WO §8).
 * - PDF 결과물은 DB에 저장하지 않는다. 새 창에 A4 조판 HTML 을 작성하고 window.print() 로
 *   브라우저 인쇄(= "PDF 로 저장")한다. 기존 PrintContentPage 인쇄 패턴과 동일.
 * - 기존 콘텐츠 원본을 수정하지 않으며, 결과물을 콘텐츠 목록에 다시 노출하지 않는다.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { Printer, X } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { getPharmacyInfo, type PharmacyInfoData } from '../../api/pharmacyInfo';
import { colors } from '../../styles/theme';

// 호출 측에서 전달하는 선택 콘텐츠 (StoreContentsSelector DocumentRow 의 부분 집합)
//
// WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1:
//   본문은 /store-library/contents 피드가 origin별로 contentJson 에 이미 포함한다.
//   - execution-asset: contentJson.html (= store_execution_assets.html_content)
//   - direct          : contentJson.html (kpa_store_contents.content_json 의 html 키)
//   - snapshot        : o4o_asset_snapshots.content_json 원본 (html/body/content/blocks)
//   따라서 별도 단건 API 호출 없이 목록 contentJson 에서 본문을 추출한다.
export interface PdfExportContent {
  id: string;
  title: string;
  origin: 'snapshot' | 'direct' | 'execution-asset';
  contentJson: Record<string, unknown>;
}

interface PdfOptions {
  title: boolean;
  pharmacyName: boolean;
  phone: boolean;
  address: boolean;
  consult: boolean;
  printDate: boolean;
}

// WO §9: 1차 상담 안내 기본 문구(직접 편집은 2차)
const DEFAULT_CONSULT_TEXT = '궁금한 점은 약사에게 문의하세요.';

// WO-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1:
//   화면(QR/태블릿)용 스타일이 그대로 인쇄되면 글자·줄간격·여백이 커서 페이지 수가 과도하다.
//   PDF 전용 밀도 프리셋을 두어 출력 형식을 선택한다(콘텐츠 원본 HTML 은 변경하지 않음 —
//   본문 inline 디자인은 보존하고, 기본 스타일의 heading/line-height/여백/이미지 높이만 조정).
type PdfDensity = 'standard' | 'compact' | 'large';

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

const DENSITY_OPTIONS: { key: PdfDensity; label: string; desc: string }[] = [
  { key: 'standard', label: '표준형', desc: '일반 고객 설명자료' },
  { key: 'compact', label: '절약형', desc: '페이지 절약 · 보관/내부용' },
  { key: 'large', label: '큰 글씨형', desc: '고령 고객 · 카운터 비치' },
];

export function ContentPdfExportModal({
  open,
  content,
  onClose,
}: {
  open: boolean;
  content: PdfExportContent | null;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<PharmacyInfoData | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [opts, setOpts] = useState<PdfOptions>({
    title: true,
    pharmacyName: false,
    phone: false,
    address: false,
    consult: false,
    printDate: false,
  });
  // WO-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1: 출력 밀도(기본 표준형)
  const [density, setDensity] = useState<PdfDensity>('standard');

  // 모달 열릴 때 매장 기본정보 로드 + 옵션 초기화
  useEffect(() => {
    if (!open) return;
    setOpts({
      title: true,
      pharmacyName: false,
      phone: false,
      address: false,
      consult: false,
      printDate: false,
    });
    setDensity('standard');
    let cancelled = false;
    setInfoLoading(true);
    getPharmacyInfo()
      .then((d) => {
        if (!cancelled) setInfo(d);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open || !content) return null;

  const storeName = info?.name?.trim() || '';
  const phone = info?.phone?.trim() || '';
  const address =
    info?.address?.trim() ||
    [info?.addressDetail?.baseAddress, info?.addressDetail?.detailAddress]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    '';

  const hasName = storeName.length > 0;
  const hasPhone = phone.length > 0;
  const hasAddress = address.length > 0;

  const handleGenerate = async () => {
    if (!content) return;
    // 팝업 차단 회피: 클릭 동기 컨텍스트에서 창을 먼저 연다(본문 fetch await 이후에 열면 차단될 수 있음).
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      toast.error('팝업이 차단되었습니다. 브라우저 팝업을 허용한 뒤 다시 시도하세요.');
      return;
    }
    win.document.write(
      '<!doctype html><html lang="ko"><head><meta charset="utf-8" /><title>인쇄용 PDF 준비 중…</title></head>' +
        '<body style="font-family:sans-serif;padding:40px;color:#475569">인쇄용 PDF를 준비 중입니다…</body></html>',
    );
    setGenerating(true);
    try {
      const bodyHtml = contentJsonToHtml(content.contentJson);
      const printHtml = buildPrintHtml({
        contentTitle: content.title,
        bodyHtml,
        opts,
        density,
        storeName,
        phone,
        address,
        consultText: DEFAULT_CONSULT_TEXT,
      });
      win.document.open();
      win.document.write(printHtml);
      win.document.close();
      onClose();
    } catch (e: any) {
      try {
        win.close();
      } catch {
        /* noop */
      }
      toast.error(e?.message || 'PDF 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="인쇄용 PDF 만들기">
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>
            <Printer size={18} style={{ color: colors.primary }} />
            인쇄용 PDF 만들기
          </h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.contentName} title={content.title}>
            대상 콘텐츠: <strong>{content.title}</strong>
          </p>

          {/* WO-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1: 출력 형식(밀도) 선택 */}
          <p style={styles.sectionLabel}>출력 형식</p>
          <div style={styles.densityRow}>
            {DENSITY_OPTIONS.map((d) => {
              const active = density === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDensity(d.key)}
                  style={{ ...styles.densityBtn, ...(active ? styles.densityBtnActive : {}) }}
                  aria-pressed={active}
                >
                  <span style={{ ...styles.densityLabel, color: active ? colors.primary : colors.neutral700 }}>
                    {d.label}
                  </span>
                  <span style={styles.densityDesc}>{d.desc}</span>
                </button>
              );
            })}
          </div>

          <p style={styles.sectionLabel}>PDF에 포함할 항목</p>

          <div style={styles.optionList}>
            {/* 본문 — 필수(해제 불가) */}
            <label style={{ ...styles.option, ...styles.optionDisabled }}>
              <input type="checkbox" checked readOnly disabled />
              <span style={styles.optionText}>
                본문 <span style={styles.required}>필수</span>
              </span>
            </label>

            {/* 제목 */}
            <label style={styles.option}>
              <input
                type="checkbox"
                checked={opts.title}
                onChange={(e) => setOpts((p) => ({ ...p, title: e.target.checked }))}
              />
              <span style={styles.optionText}>제목</span>
            </label>

            {/* 약국명 */}
            <label style={{ ...styles.option, ...(hasName ? {} : styles.optionDisabled) }}>
              <input
                type="checkbox"
                checked={opts.pharmacyName && hasName}
                disabled={!hasName}
                onChange={(e) => setOpts((p) => ({ ...p, pharmacyName: e.target.checked }))}
              />
              <span style={styles.optionText}>
                약국명
                {!hasName && !infoLoading && <span style={styles.hint}>등록된 매장명 없음</span>}
              </span>
            </label>

            {/* 약국 전화번호 */}
            <label style={{ ...styles.option, ...(hasPhone ? {} : styles.optionDisabled) }}>
              <input
                type="checkbox"
                checked={opts.phone && hasPhone}
                disabled={!hasPhone}
                onChange={(e) => setOpts((p) => ({ ...p, phone: e.target.checked }))}
              />
              <span style={styles.optionText}>
                약국 전화번호
                {!hasPhone && !infoLoading && <span style={styles.hint}>등록된 전화번호 없음</span>}
              </span>
            </label>

            {/* 약국 주소 */}
            <label style={{ ...styles.option, ...(hasAddress ? {} : styles.optionDisabled) }}>
              <input
                type="checkbox"
                checked={opts.address && hasAddress}
                disabled={!hasAddress}
                onChange={(e) => setOpts((p) => ({ ...p, address: e.target.checked }))}
              />
              <span style={styles.optionText}>
                약국 주소
                {!hasAddress && !infoLoading && <span style={styles.hint}>등록된 주소 없음</span>}
              </span>
            </label>

            {/* QR 코드 — 1차 비활성(WO §8) */}
            <label style={{ ...styles.option, ...styles.optionDisabled }}>
              <input type="checkbox" checked={false} disabled readOnly />
              <span style={styles.optionText}>
                QR 코드
                <span style={styles.hint}>QR 코드 생성 후 PDF에 포함할 수 있습니다.</span>
              </span>
            </label>

            {/* 상담 안내 문구 */}
            <label style={styles.option}>
              <input
                type="checkbox"
                checked={opts.consult}
                onChange={(e) => setOpts((p) => ({ ...p, consult: e.target.checked }))}
              />
              <span style={styles.optionText}>
                상담 안내 문구
                <span style={styles.hintMuted}>“{DEFAULT_CONSULT_TEXT}”</span>
              </span>
            </label>

            {/* 출력일 */}
            <label style={styles.option}>
              <input
                type="checkbox"
                checked={opts.printDate}
                onChange={(e) => setOpts((p) => ({ ...p, printDate: e.target.checked }))}
              />
              <span style={styles.optionText}>출력일</span>
            </label>
          </div>

          <p style={styles.note}>
            A4 세로로 새 창에 미리보기가 열리며, 브라우저 인쇄에서 “PDF로 저장”을 선택할 수 있습니다.
          </p>
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={generating}>
            취소
          </button>
          <button type="button" onClick={handleGenerate} style={styles.primaryBtn} disabled={generating}>
            <Printer size={14} />
            {generating ? '생성 중…' : '인쇄용 PDF 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 본문 HTML 추출 (contentJson) ─────────────────────────────────────────────

// /store-library/contents 피드의 contentJson 에서 본문 HTML 을 추출한다.
// 우선순위: html(direct/execution + 일부 snapshot) → blocks[] → body/content → imageUrl.
function contentJsonToHtml(json: Record<string, unknown> | undefined): string {
  if (!json) return '';

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
        const value = (b.value as string) || '';
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

function buildPrintHtml(args: {
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

  const bodyBlock = `<div class="pdf-body">${bodyHtml || '<p class="pdf-empty">본문 내용이 없습니다.</p>'}</div>`;

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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    width: '100%',
    maxWidth: '460px',
    background: colors.white,
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  headerTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  closeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    background: 'transparent',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: '6px',
  },
  body: {
    padding: '18px',
    overflowY: 'auto',
  },
  contentName: {
    fontSize: '13px',
    color: colors.neutral600,
    margin: '0 0 16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    margin: '0 0 10px',
  },
  // WO-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1: 출력 형식 선택
  densityRow: {
    display: 'flex',
    gap: '8px',
    margin: '0 0 18px',
  },
  densityBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '8px 10px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  densityBtnActive: {
    borderColor: colors.primary,
    background: '#EFF6FF',
  },
  densityLabel: {
    fontSize: '13px',
    fontWeight: 600,
  },
  densityDesc: {
    fontSize: '11px',
    color: colors.neutral500,
    lineHeight: 1.3,
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  optionDisabled: {
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  optionText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: colors.neutral800,
    flexWrap: 'wrap',
  },
  required: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#D97706',
    background: '#FEF3C7',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  hint: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  hintMuted: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  note: {
    fontSize: '12px',
    color: colors.neutral500,
    lineHeight: 1.6,
    margin: '16px 0 0',
    padding: '10px 12px',
    background: colors.neutral100,
    borderRadius: '6px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '14px 18px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelBtn: {
    padding: '8px 16px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.white,
    cursor: 'pointer',
  },
};
