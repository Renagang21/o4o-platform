/**
 * FlowNavigator - 단계 네비게이션 사이드바
 *
 * 핵심 원칙:
 * - 현재 위치와 진행 상태를 표시
 * - 단계 간 이동을 지원
 * - 완료/이수가 아닌 '본 단계' 표시
 */

import type { FlowWithSteps } from '../types/LearningTypes.js';

interface FlowNavigatorProps {
  flow: FlowWithSteps;
  currentStepIndex: number;
  viewedSteps: number[];
  onStepSelect: (index: number) => void;
  onClose: () => void;
}

export function FlowNavigator({
  flow,
  currentStepIndex,
  viewedSteps,
  onStepSelect,
  onClose,
}: FlowNavigatorProps) {
  const progressPercent = ((currentStepIndex + 1) / flow.steps.length) * 100;

  return (
    <aside style={styles.sidebar}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.closeButton} onClick={onClose}>
          ← 흐름으로
        </button>
        <h2 style={styles.flowTitle}>{flow.title}</h2>
      </div>

      {/* 진행 표시 */}
      <div style={styles.progressSection}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progressPercent}%`,
            }}
          />
        </div>
        <span style={styles.progressText}>
          {currentStepIndex + 1} / {flow.steps.length} 단계
        </span>
      </div>

      {/* 단계 목록 */}
      <div style={styles.stepList}>
        {flow.steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isViewed = viewedSteps.includes(index);

          return (
            <button
              key={index}
              style={{
                ...styles.stepItem,
                ...(isActive ? styles.stepItemActive : {}),
              }}
              onClick={() => onStepSelect(index)}
            >
              <span
                style={{
                  ...styles.stepNumber,
                  ...(isViewed ? styles.stepNumberViewed : {}),
                  ...(isActive ? styles.stepNumberActive : {}),
                }}
              >
                {isViewed ? '✓' : index + 1}
              </span>
              <span style={styles.stepTitle}>
                {step.title || step.content?.title || `단계 ${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* 안내 */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          콘텐츠를 순서대로 확인하세요
        </p>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '280px',
    backgroundColor: '#1e293b',
    color: '#fff',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '12px',
  },
  flowTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    margin: 0,
    lineHeight: 1.4,
  },
  progressSection: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  stepList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
  },
  stepItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '4px',
  },
  stepItemActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  stepNumberViewed: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
  },
  stepNumberActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
  },
  stepTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
    textAlign: 'center',
  },
};

export default FlowNavigator;
