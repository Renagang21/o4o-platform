/**
 * StoreProductQrModal — 상품별(이미 등록된) 다국어 QR 출력(읽기 전용)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCT-ACTIONS-AND-MULTILINGUAL-DESCRIPTION-V1
 *
 * 신규 작성 화면으로 이동하지 않는다. 이미 등록된 상품별 다국어 콘텐츠(group)의
 * 고객용 QR 을 조회·미리보기·다운로드·인쇄한다. 본문 작성/수정 불가.
 * - publicKey 는 기존 콘텐츠에 대한 접근키 발급(idempotent) — 본문 저작이 아님.
 * - QR SVG 는 백엔드 생성(프론트 QR 의존성 없음).
 * - 상품별 다국어 콘텐츠(group) 자체가 없으면 안내만 하고 신규 작성 흐름을 만들지 않는다.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { X, QrCode, Download, Printer, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ensureMlcPublicKey, getMlcQr, STORE_MLC_LOCALE_LABELS, type StoreMlcLocale } from '../../api/multilingualProductContentStore';
import { colors } from '../../styles/theme';

export interface StoreProductQrTarget {
  name: string;
  /** store_multilingual_product_content_groups.id — 없으면 등록된 QR 콘텐츠 없음 */
  groupId: string | null;
  /** 제공(등록) 언어 */
  locales: string[];
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

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setQr(null);
    setError(null);
    if (!target.groupId) {
      // 등록된 다국어 QR 콘텐츠 없음 — 안내만(신규 작성 흐름 없음).
      setLoading(false);
      return;
    }
    setLoading(true);
    // 기존 콘텐츠 접근키 발급(idempotent) → QR SVG 조회.
    ensureMlcPublicKey(target.groupId)
      .then(() => getMlcQr(target.groupId as string))
      .then((res) => {
        if (!cancelled) setQr({ svg: res.svg, url: res.url, publicKey: res.publicKey });
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

  const noContent = !target.groupId;

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
          {noContent ? (
            <div style={styles.emptyBox}>
              <QrCode size={28} style={{ color: colors.neutral300 }} />
              <p style={styles.emptyText}>이 상품에 등록된 다국어 QR 콘텐츠가 없습니다.</p>
              <p style={styles.emptySub}>
                다국어 안내 콘텐츠가 등록되면 이 화면에서 고객용 QR 을 출력할 수 있습니다.
              </p>
            </div>
          ) : loading ? (
            <div style={styles.stateBox}><Loader2 size={18} className="animate-spin" /><span>QR 을 불러오는 중…</span></div>
          ) : error ? (
            <div style={{ ...styles.stateBox, color: '#DC2626' }}>{error}</div>
          ) : qr ? (
            <>
              {/* 제공 언어 표시 */}
              {target.locales.length > 0 && (
                <div style={styles.langRow}>
                  <span style={styles.langLabel}>제공 언어</span>
                  <div style={styles.langChips}>
                    {target.locales.map((l) => (
                      <span key={l} style={styles.langChip}>{localeLabel(l)}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={styles.qrBox} dangerouslySetInnerHTML={{ __html: qr.svg }} />
              <p style={styles.url}>{qr.url}</p>
              <p style={styles.hint}>외국인 고객이 스캔하면 다국어 상품 안내 페이지가 열립니다. (읽기 전용 — 본문 작성·수정은 콘텐츠 메뉴에서)</p>
            </>
          ) : null}
        </div>

        <footer style={styles.footer}>
          {qr && !noContent && (
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
  body: { padding: 18, overflowY: 'auto', flex: 1, textAlign: 'center' },
  stateBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0', color: colors.neutral500, fontSize: 13 },
  emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '44px 16px', textAlign: 'center' },
  emptyText: { margin: 0, fontSize: 14, fontWeight: 600, color: colors.neutral700 },
  emptySub: { margin: 0, fontSize: 12, lineHeight: 1.7, color: colors.neutral400, maxWidth: 340 },
  langRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'center', flexWrap: 'wrap' },
  langLabel: { fontSize: 12, color: colors.neutral500 },
  langChips: { display: 'inline-flex', gap: 6, flexWrap: 'wrap' },
  langChip: { fontSize: 11, fontWeight: 600, color: '#6D28D9', background: '#F5F3FF', border: '1px solid #C4B5FD', padding: '2px 8px', borderRadius: 999 },
  qrBox: { width: 240, height: 240, margin: '0 auto', background: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: 10, padding: 10 },
  url: { fontSize: 11, color: colors.neutral400, wordBreak: 'break-all', maxWidth: 320, margin: '12px auto 0' },
  hint: { fontSize: 11, color: colors.neutral400, lineHeight: 1.6, margin: '10px auto 0', maxWidth: 340 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: `1px solid ${colors.neutral100}`, flexShrink: 0, flexWrap: 'wrap' },
  actionBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
