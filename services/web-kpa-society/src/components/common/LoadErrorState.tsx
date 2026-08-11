/**
 * LoadErrorState — 조회 실패 안내 (4상태 계약: loading / error / empty / ready)
 *
 * WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1
 *   API 실패를 빈 목록으로 위장하던 화면에서 "데이터 없음(EmptyState)" 과
 *   "불러오지 못함(LoadErrorState)" 을 구분하기 위한 최소 구현이다.
 *   공통 패키지 승격은 이번 배치 범위 밖 — CHECK 에 공통화 후보로 기록한다.
 *
 * 표시 원칙: raw stack trace / HTML 응답 / secret 노출 금지.
 *           detail 에는 endpoint 나 status 정도만 넣는다.
 */

import { colors, typography } from '../../styles/theme';

interface LoadErrorStateProps {
  onRetry?: () => void;
  detail?: string;
  compact?: boolean;
}

export function LoadErrorState({ onRetry, detail, compact }: LoadErrorStateProps) {
  return (
    <div style={{ ...styles.container, ...(compact ? styles.containerCompact : null) }} role="alert">
      <span style={styles.icon}>⚠️</span>
      <p style={styles.title}>데이터를 불러오지 못했습니다.</p>
      <p style={styles.description}>잠시 후 다시 시도해 주세요.</p>
      {detail && <p style={styles.detail}>{detail}</p>}
      {onRetry && (
        <button type="button" style={styles.button} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    textAlign: 'center',
    border: '1px solid #fde68a',
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
  },
  containerCompact: {
    padding: '20px 16px',
  },
  icon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  title: {
    ...typography.bodyM,
    fontWeight: 600,
    color: colors.neutral700,
    margin: 0,
  },
  description: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginTop: '4px',
    marginBottom: 0,
  },
  detail: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '8px',
    marginBottom: 0,
    wordBreak: 'break-all',
  },
  button: {
    marginTop: '16px',
    padding: '8px 18px',
    backgroundColor: colors.white,
    color: colors.neutral700,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default LoadErrorState;
