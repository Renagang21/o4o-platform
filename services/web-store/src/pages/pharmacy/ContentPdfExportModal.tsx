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

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Printer, X } from 'lucide-react';
import { useLibraryScope } from './library/useLibraryScope';
import { LibraryDialog } from './library/LibraryDialog';
import { buildPrintHtml, contentJsonToHtml, DENSITY_OPTIONS, DEFAULT_CONSULT_TEXT, type PdfOptions, type PdfDensity } from './library/pdfExportDocument';
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

interface PdfExportProps { open: boolean; content: PdfExportContent | null; onClose: () => void }
export function ContentPdfExportModal(props: PdfExportProps) {
  const { scope } = useLibraryScope();
  if (!props.open || !props.content) return null;
  return <PdfExportSession key={`${scope}:${props.content.origin}:${props.content.id}`} content={props.content} onClose={props.onClose} />;
}
function PdfExportSession({ content, onClose }: { content: PdfExportContent; onClose: () => void }) {
  const { organizationId, isCurrent } = useLibraryScope();
  const [infoError, setInfoError] = useState(false), [attempt, setAttempt] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const lock = useRef(false);
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
    if (!isCurrent()) { setInfoError(true); return; }
    setInfo(null); setInfoError(false);
    let cancelled = false;
    setInfoLoading(true);
    getPharmacyInfo()
      .then((d) => {
        if (!cancelled && isCurrent()) {
          if (d && d.organizationId !== organizationId) { setInfoError(true); return; }
          setInfo(d);
        }
      })
      .catch(() => {
        if (!cancelled && isCurrent()) { setInfo(null); setInfoError(true); }
      })
      .finally(() => {
        if (!cancelled && isCurrent()) setInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, organizationId, isCurrent]);


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

  const handleGenerate = () => {
    if (!isCurrent() || lock.current) return;
    lock.current = true; setGenerating(true); setExportError(null);
    let win: Window | null = null;
    try {
      // Keep window.open in the user gesture; no asynchronous fetch belongs here.
      win = window.open('', '_blank', 'width=900,height=1000');
      if (!win) throw new Error('POPUP_BLOCKED');
      win.opener = null;
      const printHtml = buildPrintHtml({ contentTitle: content.title,
        bodyHtml: contentJsonToHtml(content.contentJson, content.origin), opts, density,
        storeName, phone, address, consultText: DEFAULT_CONSULT_TEXT });
      win.document.open(); win.document.write(printHtml); win.document.close();
      onClose();
    } catch (error) {
      try { win?.close(); } catch { /* closed window */ }
      if (isCurrent()) setExportError(error instanceof Error && error.message === 'POPUP_BLOCKED'
        ? '팝업이 차단되었습니다. 브라우저 팝업을 허용한 뒤 다시 시도하세요.'
        : 'PDF를 준비하지 못했습니다. 옵션을 유지한 채 다시 시도해 주세요.');
    } finally {
      lock.current = false;
      if (isCurrent()) setGenerating(false);
    }
  };

  return (
    <LibraryDialog label="인쇄용 PDF 만들기" onClose={onClose}>
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
          {exportError && <p role="alert" className="mb-3 text-sm text-red-700">{exportError}</p>}
          {infoLoading && <p role="status" className="mb-3 text-sm text-slate-500">매장 정보를 불러오는 중…</p>}
          {infoError && <div role="alert" className="mb-3 text-sm text-amber-700">
            매장 정보를 불러오지 못했습니다. 매장 정보 없이 본문을 출력할 수 있습니다.
            <button type="button" onClick={() => setAttempt(n => n + 1)} className="ml-2 underline">매장 정보 다시 시도</button>
          </div>}
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
    </LibraryDialog>
  );
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
    borderWidth: '1px', borderStyle: 'solid', borderColor: colors.neutral300,
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
