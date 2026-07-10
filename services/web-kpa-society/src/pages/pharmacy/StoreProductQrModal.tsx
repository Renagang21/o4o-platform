/**
 * StoreProductQrModal — 상품 기준 고정 QR 출력(읽기 전용, 항상 사용 가능)
 *
 * WO-O4O-KPA-STORE-PRODUCT-QR-ALWAYS-AVAILABLE-V1
 *
 * QR 은 ProductMaster 기준 고정 Landing(/p/{publicKey}) — 다국어 콘텐츠 존재 여부와 무관하게 항상 발급/조회.
 *   같은 상품이면 콘텐츠가 바뀌어도 동일 QR 유지(listing 재등록으로 id 가 바뀌어도 master 기준이라 안정).
 * - QR 미리보기 · 다운로드(SVG) · 인쇄. 본문 작성/수정 불가(콘텐츠 메뉴 소관).
 * - 다국어 콘텐츠(제공 언어)는 QR 랜딩에 연결되는 별도 정보로 표시만 한다(없어도 QR 사용).
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { fetchHandledProductQr, type HandledProductSource } from '../../api/handledProducts';
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

function localeLabel(l: string): string {
  return STORE_MLC_LOCALE_LABELS[l as StoreMlcLocale] || l.toUpperCase();
}

export function StoreProductQrModal({ open, target, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ svg: string; url: string; publicKey: string } | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setQr(null);
    setError(null);
    setLanguages([]);
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

  const handleDownload = () => {
    if (!qr || !target) return;
    try {
      const blob = new Blob([qr.svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(target.name || 'product').replace(/[\\/:*?"<>|]+/g, '_')}-QR.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('다운로드에 실패했습니다');
    }
  };

  const handlePrint = () => {
    if (!qr || !target) return;
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) {
      toast.error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.');
      return;
    }
    const safeName = (target.name || '상품 QR').replace(/</g, '&lt;');
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${safeName} QR</title>` +
        `<style>body{font-family:system-ui,sans-serif;text-align:center;padding:24px;margin:0}` +
        `h1{font-size:16px;margin:0 0 16px}.qr{width:320px;height:320px;margin:0 auto}` +
        `.qr svg{width:100%;height:100%}p{font-size:11px;color:#666;word-break:break-all;max-width:340px;margin:14px auto 0}</style></head>` +
        `<body><h1>${safeName}</h1><div class="qr">${qr.svg}</div><p>${qr.url}</p>` +
        `<script>window.onload=function(){setTimeout(function(){window.print();},200);};</script></body></html>`,
    );
    w.document.close();
  };

  if (!open || !target) return null;

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.eyebrow}>상품 QR 출력</div>
            <h2 style={styles.title} title={target.name}>{target.name}</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기"><X size={18} /></button>
        </header>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.stateBox}><Loader2 size={18} className="animate-spin" /><span>QR 을 불러오는 중…</span></div>
          ) : error ? (
            <div style={{ ...styles.stateBox, color: '#DC2626' }}>{error}</div>
          ) : qr ? (
            <>
              {/* 제공 언어(다국어 콘텐츠) — 있으면 표시, 없으면 QR 사용 가능 안내. QR 은 항상 노출. */}
              {languages.length > 0 ? (
                <div style={styles.langRow}>
                  <span style={styles.langLabel}>제공 언어</span>
                  <div style={styles.langChips}>
                    {languages.map((l) => (
                      <span key={l} style={styles.langChip}>{localeLabel(l)}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.noticeBox}>
                  현재 등록된 다국어 안내 콘텐츠는 없습니다.
                  <br />QR은 사용할 수 있으며, 콘텐츠가 등록되면 같은 QR에 반영됩니다.
                </div>
              )}
              {/* svg 가 컨테이너에 꽉 맞도록 강제(고유 크기로 넘쳐 잘리는 문제 방지). */}
              <style>{`.store-product-qr-svg svg{width:100%;height:100%;display:block}`}</style>
              <div style={styles.qrBox} className="store-product-qr-svg" dangerouslySetInnerHTML={{ __html: qr.svg }} />
              <p style={styles.url}>{qr.url}</p>
              <p style={styles.hint}>고객이 스캔하면 상품 안내 페이지가 열립니다.</p>
            </>
          ) : null}
        </div>

        <footer style={styles.footer}>
          {qr && (
            <>
              <button type="button" onClick={handleDownload} style={styles.actionBtn}>
                <Download size={14} /> 다운로드
              </button>
              <button type="button" onClick={handlePrint} style={styles.primaryBtn}>
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
  modal: { width: '100%', maxWidth: 440, maxHeight: '90vh', background: colors.white, borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  eyebrow: { fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 700, color: colors.neutral800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', color: colors.neutral500, cursor: 'pointer', borderRadius: 6, flexShrink: 0 },
  body: { padding: 16, overflowY: 'auto', flex: 1, textAlign: 'center' },
  stateBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0', color: colors.neutral500, fontSize: 13 },
  langRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'center', flexWrap: 'wrap' },
  langLabel: { fontSize: 12, color: colors.neutral500 },
  langChips: { display: 'inline-flex', gap: 6, flexWrap: 'wrap' },
  langChip: { fontSize: 11, fontWeight: 600, color: '#6D28D9', background: '#F5F3FF', border: '1px solid #C4B5FD', padding: '2px 8px', borderRadius: 999 },
  noticeBox: { marginBottom: 14, padding: '9px 12px', fontSize: 12, lineHeight: 1.6, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, textAlign: 'left' },
  qrBox: { width: 200, height: 200, boxSizing: 'border-box', margin: '0 auto', background: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: 10, padding: 8, flexShrink: 0 },
  url: { fontSize: 11, color: colors.neutral400, wordBreak: 'break-all', maxWidth: 320, margin: '10px auto 0' },
  hint: { fontSize: 11, color: colors.neutral400, lineHeight: 1.5, margin: '8px auto 0', maxWidth: 340 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: `1px solid ${colors.neutral100}`, flexShrink: 0, flexWrap: 'wrap' },
  actionBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
