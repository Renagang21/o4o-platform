/**
 * SelectContentsForProductionModal — production-materials 페이지의 콘텐츠/강의 선택 모달
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1
 *
 * `/store/library/production-materials` 의 "새 제작 자료 만들기" CTA 클릭 시 페이지 이동 대신
 * 본 모달을 연다. 모달 안에서 `/store/library/contents` 와 동일한 canonical selector 를
 * 그대로 사용 (StoreContentsSelector mode='modal').
 *
 * 선택 완료 → onConfirm(items) → 호출 측이 StartProductionModal 로 전달.
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1:
 *   기존 콘텐츠/강의 선택은 유지하되, 모달 상단에 "처음부터 만들기" 액션을 추가한다.
 *   원본 콘텐츠가 0건이어도 매장 경영자가 빈 제작 자료를 바로 작성할 수 있도록 onCreateBlank 를 노출.
 */

import { type CSSProperties } from 'react';
import { X, PenLine } from 'lucide-react';
import { colors } from '../../styles/theme';
import { StoreContentsSelector } from './StoreContentsSelector';
import type { ProductionSourceItem } from './productionTargets';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 선택 완료 → 부모가 StartProductionModal 로 전달 */
  onConfirm: (items: ProductionSourceItem[]) => void;
  /**
   * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1:
   * "빈 제작 자료 만들기" 클릭 → 부모가 제작 자료 편집기(빈 상태)로 이동.
   */
  onCreateBlank: () => void;
}

export function SelectContentsForProductionModal({ open, onClose, onConfirm, onCreateBlank }: Props) {
  if (!open) return null;

  const handleStartProduction = (items: ProductionSourceItem[]) => {
    if (items.length === 0) return;
    onConfirm(items);
  };

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div>
            <h2 style={styles.title}>새 제작 자료 만들기</h2>
            <p style={styles.subtitle}>
              처음부터 직접 작성하거나, 콘텐츠·강의를 원본으로 선택해 제작을 시작할 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div style={styles.body}>
          {/* WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1: 처음부터 만들기 */}
          <div style={styles.blankCard}>
            <div style={{ minWidth: 0 }}>
              <div style={styles.blankTitle}>처음부터 만들기</div>
              <div style={styles.blankDesc}>빈 POP · QR · 블로그 제작 자료를 직접 작성합니다.</div>
            </div>
            <button type="button" onClick={onCreateBlank} style={styles.blankBtn}>
              <PenLine size={14} />
              빈 제작 자료 만들기
            </button>
          </div>

          <div style={styles.divider}>
            <span style={styles.dividerText}>또는 콘텐츠·강의에서 시작</span>
          </div>

          <StoreContentsSelector
            mode="modal"
            onStartProduction={handleStartProduction}
            startButtonLabel="선택 완료"
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 960,
    maxHeight: '90vh',
    background: colors.white,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: colors.neutral800,
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: colors.neutral500,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.neutral500,
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px 24px',
  },
  // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1
  blankCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 16px',
    background: '#EFF6FF',
    border: `1px solid #DBEAFE`,
    borderRadius: 10,
  },
  blankTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.neutral800,
  },
  blankDesc: {
    margin: '2px 0 0',
    fontSize: 12,
    color: colors.neutral500,
  },
  blankBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    padding: '8px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: colors.white,
    cursor: 'pointer',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '18px 0 14px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  dividerText: {
    transform: 'translateY(-50%)',
    background: colors.white,
    padding: '0 10px',
    fontSize: 12,
    color: colors.neutral400,
  },
};
