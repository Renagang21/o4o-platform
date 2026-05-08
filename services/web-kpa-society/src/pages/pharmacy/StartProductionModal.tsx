/**
 * StartProductionModal — "내 자료함"에서 제작 시작 진입
 *
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1
 * WO-O4O-KPA-POP-PRODUCTION-FLOW-CANONICAL-CORRECTION-V1:
 *   - placeholder/mock 정리: 템플릿 선택 단계 제거 (모든 target에 default 1개만 있던 mock 흐름 제거)
 *   - dead flag 제거: aiPrefillRequested (수신측에서 누구도 사용 안 함)
 *   - 제작 흐름: 자료 선택 → 본 modal에서 제작 대상 선택 → 편집기 route 이동
 *
 * 본 단계 범위 외 (후속 WO):
 *   - multi-template 시스템
 *   - AI 변환 wizard 단계
 *   - 결과물 lifecycle / entity
 */

import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, QrCode, BookOpen, FileText, X, ArrowRight } from 'lucide-react';
import { colors } from '../../styles/theme';

export type ProductionTarget = 'pop' | 'qr' | 'blog' | 'product-description';

export interface ProductionSourceItem {
  id: string;
  title: string;
  description?: string | null;
  /** 원본 종류: snapshot(asset_snapshots) | direct(kpa_store_contents) | library(store_execution_assets) */
  origin: 'snapshot' | 'direct' | 'library';
}

export interface ProductionSource {
  fromLibrary: 'contents' | 'resources';
  items: ProductionSourceItem[];
}

const TARGETS: Array<{ key: ProductionTarget; label: string; Icon: typeof Megaphone; color: string; route: string }> = [
  { key: 'pop',                 label: 'POP',          Icon: Megaphone, color: '#f59e0b', route: '/store/marketing/pop' },
  { key: 'qr',                  label: 'QR 코드',      Icon: QrCode,    color: '#0ea5e9', route: '/store/marketing/qr' },
  { key: 'blog',                label: '블로그',        Icon: BookOpen,  color: '#16a34a', route: '/store/content/blog' },
  { key: 'product-description', label: '상품 상세설명', Icon: FileText,  color: '#2563EB', route: '/store/marketing/product-descriptions' },
];

interface Props {
  open: boolean;
  source: ProductionSource | null;
  onClose: () => void;
}

export function StartProductionModal({ open, source, onClose }: Props) {
  const navigate = useNavigate();
  const [selectedTarget, setSelectedTarget] = useState<ProductionTarget | null>(null);

  if (!open || !source) return null;

  const itemsCount = source.items.length;
  const targetMeta = selectedTarget ? TARGETS.find((t) => t.key === selectedTarget)! : null;

  const handleConfirm = () => {
    if (!selectedTarget || !targetMeta) return;
    navigate(targetMeta.route, {
      state: {
        production: {
          source,
          target: selectedTarget,
        },
      },
    });
    handleClose();
  };

  const handleClose = () => {
    setSelectedTarget(null);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>제작 시작</h2>
            <p style={styles.subtitle}>
              선택한 자료 {itemsCount}개를 기반으로 제작을 시작합니다.
            </p>
          </div>
          <button onClick={handleClose} style={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>제작 대상</h3>
            <div style={styles.targetGrid}>
              {TARGETS.map((t) => {
                const active = selectedTarget === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTarget(t.key)}
                    style={{
                      ...styles.targetCard,
                      ...(active ? styles.targetCardActive : {}),
                    }}
                  >
                    <t.Icon size={20} style={{ color: t.color }} />
                    <span style={styles.targetLabel}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div style={styles.footer}>
          <button onClick={handleClose} style={styles.cancelBtn}>
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTarget}
            style={{ ...styles.confirmBtn, opacity: selectedTarget ? 1 : 0.5 }}
          >
            편집기로 이동
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: colors.white,
    borderRadius: '12px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.neutral400,
    cursor: 'pointer',
    padding: '4px',
  },
  body: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    margin: 0,
  },
  targetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  targetCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  targetCardActive: {
    background: '#EFF6FF',
    borderColor: colors.primary,
    color: colors.primary,
    fontWeight: 500,
  },
  targetLabel: {
    fontSize: '14px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 24px',
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
  confirmBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
