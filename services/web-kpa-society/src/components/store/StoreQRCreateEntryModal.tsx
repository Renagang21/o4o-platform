/**
 * StoreQRCreateEntryModal — 자료 추가 방식 선택 모달
 *
 * WO-STORE-QR-UX-RESTRUCTURE-V1
 * WO-STORE-POP-ASSET-INTEGRATION-V1
 *
 * 2-choice 진입점:
 *   1) 기존 자료 선택 → StoreLibrarySelectorModal
 *   2) 새 자산 만들기 → StoreLibraryNewPage
 *
 * 사용처: QR 생성, POP 자료 추가 (title prop으로 구분)
 */

import { X, FolderOpen, PenSquare } from 'lucide-react';
import { colors } from '../../styles/theme';

interface StoreQRCreateEntryModalProps {
  open: boolean;
  onSelectExisting: () => void;
  onCreateNew: () => void;
  onClose: () => void;
  title?: string;
}

export function StoreQRCreateEntryModal({
  open,
  onSelectExisting,
  onCreateNew,
  onClose,
  title = '자료 추가 방식 선택',
}: StoreQRCreateEntryModalProps) {
  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {/* Choices */}
        <div style={styles.body}>
          <button style={styles.choiceCard} onClick={onSelectExisting}>
            <div style={styles.iconWrap}>
              <FolderOpen size={32} style={{ color: colors.primary }} />
            </div>
            <div style={styles.choiceText}>
              <p style={styles.choiceTitle}>기존 자료 선택</p>
              <p style={styles.choiceDesc}>이미 등록된 자료에서 선택합니다</p>
            </div>
          </button>

          <button style={styles.choiceCard} onClick={onCreateNew}>
            <div style={styles.iconWrap}>
              <PenSquare size={32} style={{ color: '#16a34a' }} />
            </div>
            <div style={styles.choiceText}>
              <p style={styles.choiceTitle}>새 자산 만들기</p>
              <p style={styles.choiceDesc}>새 자료를 등록한 후 사용합니다</p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>취소</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '480px',
    maxWidth: '95vw',
    backgroundColor: '#fff',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: '6px',
  },
  body: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
  },
  choiceCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: colors.neutral50,
  },
  choiceText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  choiceTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  choiceDesc: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: 0,
    lineHeight: '1.4',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 24px 20px',
  },
  cancelBtn: {
    padding: '8px 20px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
};
