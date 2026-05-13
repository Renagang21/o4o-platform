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
 */

import { type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { colors } from '../../styles/theme';
import { StoreContentsSelector } from './StoreContentsSelector';
import type { ProductionSourceItem } from './productionTargets';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 선택 완료 → 부모가 StartProductionModal 로 전달 */
  onConfirm: (items: ProductionSourceItem[]) => void;
}

export function SelectContentsForProductionModal({ open, onClose, onConfirm }: Props) {
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
            <h2 style={styles.title}>콘텐츠/강의 선택</h2>
            <p style={styles.subtitle}>
              매장 제작 자료의 원본이 될 콘텐츠 또는 강의를 선택하세요. 선택 완료 시 제작 시작 흐름으로 이어집니다.
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div style={styles.body}>
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
};
