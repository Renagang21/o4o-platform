/**
 * AIInsightBadge - AI 인사이트 유무 표시 배지
 *
 * 용도: 콘텐츠 리스트, 상품 리스트
 *
 * 역할: 클릭 유도만, 정보 전달 X
 * 표시: 작은 AI 아이콘 + 간단한 텍스트
 */

interface AIInsightBadgeProps {
  hasInsight: boolean;
  label?: '인사이트 있음' | '최근 분석됨';
  onClick?: () => void;
}

export function AIInsightBadge({
  hasInsight,
  label = '인사이트 있음',
  onClick,
}: AIInsightBadgeProps) {
  if (!hasInsight) return null;

  return (
    <span
      style={styles.badge}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span style={styles.icon}>✨</span>
      <span style={styles.label}>{label}</span>
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#eef2ff',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  icon: {
    fontSize: '12px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#6366f1',
  },
};
