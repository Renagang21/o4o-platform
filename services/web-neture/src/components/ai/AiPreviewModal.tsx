/**
 * AiPreviewModal - AI 기능 안내 모달
 *
 * Work Order: WO-AI-DASHBOARD-PREVIEW-V1
 *
 * 목적:
 * - AI 요약 버튼 클릭 시 표시되는 공통 모달
 * - 실제 AI 기능은 없음 (테스트 안내 UI만)
 * - 모든 대시보드에서 공통 사용
 */

import { Sparkles, X } from 'lucide-react';

interface AiPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiPreviewModal({ isOpen, onClose }: AiPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <Sparkles size={24} style={{ color: '#2563eb' }} />
          </div>
          <h2 style={styles.title}>AI 기능 안내</h2>
          <button onClick={onClose} style={styles.closeButton} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <p style={styles.mainText}>
            AI 요약 기능은 현재 테스트 중입니다.
          </p>
          <p style={styles.subText}>
            대시보드 분석 기능은 준비되는 대로 제공될 예정입니다.
          </p>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.confirmButton}>
            확인
          </button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    zIndex: 1001,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  headerIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '32px 24px',
    textAlign: 'center',
  },
  mainText: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1e293b',
    margin: '0 0 8px 0',
    lineHeight: 1.6,
  },
  subText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  footer: {
    padding: '16px 24px 24px',
    display: 'flex',
    justifyContent: 'center',
  },
  confirmButton: {
    padding: '12px 32px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default AiPreviewModal;
