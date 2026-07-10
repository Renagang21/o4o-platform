/**
 * StoreProductQrModal — 상품 기준 고정 QR 출력(읽기 전용, 항상 사용 가능)
 *
 * WO-O4O-KPA-STORE-PRODUCT-QR-ALWAYS-AVAILABLE-V1
 * WO-O4O-KPA-STORE-PRODUCT-QR-DOWNLOAD-AND-PRINT-SIZE-V1:
 *   - 다운로드 형식 선택(PNG/SVG/PDF). 파일명에 상품명 반영.
 *   - 인쇄 크기 선택(30/50/80mm/사용자지정) + 미리보기 + 구성(QR·상품명·제공 언어·안내).
 *   - PDF/브라우저 인쇄 모두 선택한 실제 mm 크기로 출력(데이터 재생성/URL 변경 없음).
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { X, Download, Printer, Loader2, ChevronDown, ArrowLeft } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  fetchHandledProductQr,
  fetchHandledProductQrFile,
  type HandledProductSource,
} from '../../api/handledProducts';
import { STORE_MLC_LOCALE_LABELS, type StoreMlcLocale } from '../../api/multilingualProductContentStore';
import { colors } from '../../styles/theme';

export interface StoreProductQrTarget {
  name: string;
  sourceType: HandledProductSource;
  sourceId: string;
}

interface Props {
  open: boolean;
  target: StoreProductQrTarget | null;
  onClose: () => void;
}

const PRINT_HINT = '스캔하여 상품 안내 보기';

type SizePreset = 'small' | 'medium' | 'large' | 'custom';
const PRESET_MM: Record<Exclude<SizePreset, 'custom'>, number> = { small: 30, medium: 50, large: 80 };
const PRESET_LABEL: Record<SizePreset, string> = { small: '소형 30mm', medium: '중형 50mm', large: '대형 80mm', custom: '사용자 지정' };

function localeLabel(l: string): string {
  return STORE_MLC_LOCALE_LABELS[l as StoreMlcLocale] || l.toUpperCase();
}

function safeFileName(name: string, ext: string): string {
  const base = (name || 'product').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '-').slice(0, 80);
  return `${base}-QR.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function StoreProductQrModal({ open, target, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ svg: string; url: string; publicKey: string } | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);

  const [view, setView] = useState<'main' | 'size'>('main');
  const [dlMenu, setDlMenu] = useState(false);
  const [busy, setBusy] = useState<null | 'png' | 'svg' | 'pdf' | 'print'>(null);
  const [preset, setPreset] = useState<SizePreset>('medium');
  const [customMm, setCustomMm] = useState(50);

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setQr(null);
    setError(null);
    setLanguages([]);
    setView('main');
    setDlMenu(false);
    setPreset('medium');
    setLoading(true);
    fetchHandledProductQr(target.sourceType, target.sourceId)
      .then((res) => {
        if (cancelled) return;
        if (res.qr) setQr(res.qr);
        else setError('이 상품은 QR을 발급할 수 없습니다(기준 상품 정보 없음).');
        setLanguages(res.languages ?? []);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'QR 을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target]);

  const sizeMm = preset === 'custom' ? Math.min(Math.max(customMm || 50, 15), 200) : PRESET_MM[preset];
  const langText = languages.map(localeLabel).join(', ');

  // ── 다운로드: png/svg 즉시, pdf 는 크기 화면 경유 ──
  const doDownloadImage = async (format: 'png' | 'svg') => {
    if (!target || busy) return;
    setDlMenu(false);
    setBusy(format);
    try {
      const blob = await fetchHandledProductQrFile(target.sourceType, target.sourceId, format);
      downloadBlob(blob, safeFileName(target.name, format));
    } catch (e: any) {
      toast.error(e?.message || '다운로드에 실패했습니다');
    } finally {
      setBusy(null);
    }
  };

  const doDownloadPdf = async () => {
    if (!target || busy) return;
    setBusy('pdf');
    try {
      const blob = await fetchHandledProductQrFile(target.sourceType, target.sourceId, 'pdf', sizeMm);
      downloadBlob(blob, safeFileName(target.name, 'pdf'));
    } catch (e: any) {
      toast.error(e?.message || 'PDF 저장에 실패했습니다');
    } finally {
      setBusy(null);
    }
  };

  // ── 인쇄: 선택한 mm 로 QR(벡터 svg) + 상품명 + 제공 언어 + 안내를 인쇄(브라우저 미리보기 제공) ──
  const doPrint = () => {
    if (!qr || !target || busy) return;
    const w = window.open('', '_blank', 'width=520,height=680');
    if (!w) {
      toast.error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.');
      return;
    }
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const langLine = langText ? `<p class="lang">제공 언어: ${esc(langText)}</p>` : '';
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(target.name)} QR</title>` +
        `<style>` +
        `@page{margin:8mm}` +
        `*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;text-align:center;margin:0;padding:6mm;color:#111}` +
        `.qr{width:${sizeMm}mm;height:${sizeMm}mm;margin:0 auto}.qr svg{width:100%;height:100%;display:block}` +
        `.name{font-size:11pt;font-weight:700;margin:4mm auto 0;max-width:${Math.max(sizeMm, 60)}mm;word-break:keep-all}` +
        `.lang{font-size:8pt;color:#555;margin:1.5mm 0 0}.hint{font-size:8pt;color:#888;margin:1.5mm 0 0}` +
        `</style></head><body>` +
        `<div class="qr">${qr.svg}</div>` +
        `<p class="name">${esc(target.name)}</p>${langLine}` +
        `<p class="hint">${esc(PRINT_HINT)}</p>` +
        `<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>` +
        `</body></html>`,
    );
    w.document.close();
  };

  if (!open || !target) return null;

  const previewLangChips = languages.map((l) => (
    <span key={l} style={styles.langChip}>{localeLabel(l)}</span>
  ));

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.eyebrow}>{view === 'size' ? '인쇄 · PDF 크기' : '상품 QR 출력'}</div>
            <h2 style={styles.title} title={target.name}>{target.name}</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기"><X size={18} /></button>
        </header>

        {/* svg 를 컨테이너에 꽉 맞춤 */}
        <style>{`.store-product-qr-svg svg{width:100%;height:100%;display:block}`}</style>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.stateBox}><Loader2 size={18} className="animate-spin" /><span>QR 을 불러오는 중…</span></div>
          ) : error ? (
            <div style={{ ...styles.stateBox, color: '#DC2626' }}>{error}</div>
          ) : qr && view === 'main' ? (
            <>
              {languages.length > 0 ? (
                <div style={styles.langRow}>
                  <span style={styles.langLabel}>제공 언어</span>
                  <div style={styles.langChips}>{previewLangChips}</div>
                </div>
              ) : (
                <div style={styles.noticeBox}>
                  현재 등록된 다국어 안내 콘텐츠는 없습니다.
                  <br />QR은 사용할 수 있으며, 콘텐츠가 등록되면 같은 QR에 반영됩니다.
                </div>
              )}
              <div style={styles.qrBox} className="store-product-qr-svg" dangerouslySetInnerHTML={{ __html: qr.svg }} />
              <p style={styles.url}>{qr.url}</p>
              <p style={styles.hint}>고객이 스캔하면 상품 안내 페이지가 열립니다.</p>
            </>
          ) : qr && view === 'size' ? (
            <>
              {/* 크기 선택 */}
              <div style={styles.sizeRow}>
                {(['small', 'medium', 'large', 'custom'] as SizePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    style={{ ...styles.sizeBtn, ...(preset === p ? styles.sizeBtnOn : styles.sizeBtnOff) }}
                  >
                    {PRESET_LABEL[p]}
                  </button>
                ))}
              </div>
              {preset === 'custom' && (
                <div style={styles.customRow}>
                  <label style={styles.customLabel}>
                    한 변
                    <input
                      type="number"
                      min={15}
                      max={200}
                      value={customMm}
                      onChange={(e) => setCustomMm(Number(e.target.value))}
                      style={styles.customInput}
                    />
                    mm (정사각형)
                  </label>
                </div>
              )}

              {/* 미리보기(구성: QR + 상품명 + 제공 언어 + 안내) */}
              <div style={styles.previewLabel}>미리보기 (실제 인쇄 크기: {sizeMm}×{sizeMm}mm)</div>
              <div style={styles.previewCard}>
                <div style={styles.previewQr} className="store-product-qr-svg" dangerouslySetInnerHTML={{ __html: qr.svg }} />
                <div style={styles.previewName}>{target.name}</div>
                {languages.length > 0 && <div style={styles.previewLang}>제공 언어: {langText}</div>}
                <div style={styles.previewHint}>{PRINT_HINT}</div>
              </div>
            </>
          ) : null}
        </div>

        <footer style={styles.footer}>
          {qr && view === 'main' && (
            <>
              {/* 다운로드 형식 선택 */}
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setDlMenu((v) => !v)} style={styles.actionBtn} disabled={!!busy}>
                  {busy === 'png' || busy === 'svg' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  다운로드
                  <ChevronDown size={13} />
                </button>
                {dlMenu && (
                  <div style={styles.menu}>
                    <button type="button" style={styles.menuItem} onClick={() => doDownloadImage('png')}>PNG (이미지)</button>
                    <button type="button" style={styles.menuItem} onClick={() => doDownloadImage('svg')}>SVG (벡터)</button>
                    <button type="button" style={styles.menuItem} onClick={() => { setDlMenu(false); setView('size'); }}>PDF (인쇄용 · 크기 선택)</button>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setView('size')} style={styles.primaryBtn}>
                <Printer size={14} /> 인쇄
              </button>
            </>
          )}
          {qr && view === 'size' && (
            <>
              <button type="button" onClick={() => setView('main')} style={styles.actionBtn} disabled={!!busy}>
                <ArrowLeft size={14} /> 뒤로
              </button>
              <button type="button" onClick={doDownloadPdf} style={styles.actionBtn} disabled={!!busy}>
                {busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF 저장
              </button>
              <button type="button" onClick={doPrint} style={styles.primaryBtn} disabled={!!busy}>
                <Printer size={14} /> 인쇄
              </button>
            </>
          )}
          <button type="button" onClick={onClose} style={styles.secondaryBtn}>닫기</button>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { width: '100%', maxWidth: 460, maxHeight: '92vh', background: colors.white, borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  eyebrow: { fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 700, color: colors.neutral800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', color: colors.neutral500, cursor: 'pointer', borderRadius: 6, flexShrink: 0 },
  body: { padding: 16, overflowY: 'auto', flex: 1, textAlign: 'center' },
  stateBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0', color: colors.neutral500, fontSize: 13 },
  langRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center', flexWrap: 'wrap' },
  langLabel: { fontSize: 12, color: colors.neutral500 },
  langChips: { display: 'inline-flex', gap: 6, flexWrap: 'wrap' },
  langChip: { fontSize: 11, fontWeight: 600, color: '#6D28D9', background: '#F5F3FF', border: '1px solid #C4B5FD', padding: '2px 8px', borderRadius: 999 },
  noticeBox: { marginBottom: 14, padding: '9px 12px', fontSize: 12, lineHeight: 1.6, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, textAlign: 'left' },
  qrBox: { width: 200, height: 200, boxSizing: 'border-box', margin: '0 auto', background: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: 10, padding: 8, flexShrink: 0 },
  url: { fontSize: 11, color: colors.neutral400, wordBreak: 'break-all', maxWidth: 320, margin: '10px auto 0' },
  hint: { fontSize: 11, color: colors.neutral400, lineHeight: 1.5, margin: '8px auto 0', maxWidth: 340 },
  // size view
  sizeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  sizeBtn: { padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer' },
  sizeBtnOn: { background: '#6D28D9', color: '#fff', border: '1px solid #6D28D9' },
  sizeBtnOff: { background: colors.white, color: colors.neutral600, border: `1px solid ${colors.neutral300}` },
  customRow: { marginBottom: 10 },
  customLabel: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: colors.neutral600 },
  customInput: { width: 68, padding: '5px 8px', border: `1px solid ${colors.neutral300}`, borderRadius: 6, fontSize: 12, textAlign: 'center' },
  previewLabel: { fontSize: 11, color: colors.neutral500, margin: '4px 0 8px' },
  previewCard: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 18px', border: `1px dashed ${colors.neutral300}`, borderRadius: 10, background: '#FAFAFA', maxWidth: 260 },
  previewQr: { width: 128, height: 128 },
  previewName: { fontSize: 13, fontWeight: 700, color: colors.neutral800, marginTop: 6, wordBreak: 'keep-all', textAlign: 'center' },
  previewLang: { fontSize: 11, color: colors.neutral500 },
  previewHint: { fontSize: 11, color: colors.neutral400 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: `1px solid ${colors.neutral100}`, flexShrink: 0, flexWrap: 'wrap' },
  actionBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 13px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  menu: { position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, minWidth: 180, background: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 4, zIndex: 10, display: 'flex', flexDirection: 'column' },
  menuItem: { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 6, fontSize: 13, color: colors.neutral700, cursor: 'pointer' },
};
