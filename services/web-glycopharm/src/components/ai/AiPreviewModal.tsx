/**
 * AiPreviewModal - AI 요약 Preview 모달
 *
 * Work Order: WO-AI-PREVIEW-SUMMARY-V1
 *
 * 목적:
 * - AI 기능이 준비 중임을 사용자에게 일관된 UX로 안내
 * - 실제 AI 호출 없이 Preview만 제공
 * - 모든 서비스에서 공통 사용
 *
 * 구조:
 * - 헤더: "AI 요약 (Preview)" + 서브텍스트
 * - 본문: 더미 요약 영역 + 제공 예정 기능 체크리스트 + 안내 메시지
 * - 푸터: 닫기 버튼
 */

import { SparklesIcon, CloseIcon, CheckIcon } from './icons';

interface AiPreviewModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 모달 제목 (기본: "AI 요약 (Preview)") */
  title?: string;
  /** 컨텍스트 라벨 (예: "대시보드 요약", "상품 요약") */
  contextLabel?: string;
}

// 제공 예정 기능 목록
const upcomingFeatures = [
  '핵심 지표 요약',
  '변화 포인트 설명',
  '주의 사항 및 인사이트',
  '다음 행동 제안',
];

export function AiPreviewModal({
  open,
  onClose,
  title = 'AI 요약 (Preview)',
  contextLabel,
}: AiPreviewModalProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <SparklesIcon size={22} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <h2 style={styles.title}>{title}</h2>
              <p style={styles.subtitle}>현재는 미리보기 단계입니다.</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeButton} aria-label="닫기">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Context Label */}
          {contextLabel && (
            <div style={styles.contextBadge}>
              {contextLabel}
            </div>
          )}

          {/* 더미 요약 영역 */}
          <div style={styles.summaryCard}>
            <p style={styles.summaryText}>
              최근 데이터 기준으로 이 영역의 주요 흐름과 변화를 AI가 요약해 드립니다.
            </p>
          </div>

          {/* 제공 예정 기능 안내 */}
          <div style={styles.featuresSection}>
            <p style={styles.featuresTitle}>제공 예정 기능</p>
            <ul style={styles.featuresList}>
              {upcomingFeatures.map((feature) => (
                <li key={feature} style={styles.featureItem}>
                  <CheckIcon size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 안내 메시지 */}
          <div style={styles.noticeBox}>
            <p style={styles.noticeText}>
              AI 요약 기능은 현재 준비 중이며,<br />
              곧 실제 데이터 기반으로 제공될 예정입니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.closeBtn}>
            닫기
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
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    zIndex: 1001,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
    fontSize: '17px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '2px 0 0 0',
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
    padding: '24px',
  },
  contextBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '16px',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  summaryText: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: '20px',
  },
  featuresTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#64748b',
    margin: '0 0 12px 0',
  },
  featuresList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#334155',
  },
  noticeBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '16px',
  },
  noticeText: {
    fontSize: '13px',
    color: '#1e40af',
    margin: 0,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  footer: {
    padding: '16px 24px 24px',
    display: 'flex',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: '12px 40px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default AiPreviewModal;
