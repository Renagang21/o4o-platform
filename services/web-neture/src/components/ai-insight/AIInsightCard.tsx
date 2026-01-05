/**
 * AIInsightCard - AI 분석 결과 카드
 *
 * 용도: Supplier Overview, 콘텐츠/상품 상세 상단
 *
 * 원칙:
 * - 숫자보다 문장이 먼저
 * - "판단"이 아니라 "관찰 + 제안"
 * - 점수/랭킹/그래프 금지
 */

import type { AIAnalysisResult, AIAnalysisResultType } from '../../types';

interface AIInsightCardProps {
  result: AIAnalysisResult;
  onOpenDetail?: () => void;
}

const TYPE_CONFIG: Record<AIAnalysisResultType, { label: string; icon: string }> = {
  SUMMARY: { label: '요약', icon: '📊' },
  COMPARISON: { label: '비교', icon: '⚖️' },
  INSIGHT: { label: '인사이트', icon: '💡' },
  ANOMALY: { label: '특이점', icon: '🔍' },
  RECOMMENDATION: { label: '제안', icon: '✨' },
};

export function AIInsightCard({ result, onOpenDetail }: AIInsightCardProps) {
  const typeConfig = TYPE_CONFIG[result.type];
  const displayFindings = result.keyFindings.slice(0, 3);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.typeInfo}>
          <span style={styles.icon}>{typeConfig.icon}</span>
          <span style={styles.badge}>{typeConfig.label}</span>
        </div>
        <span style={styles.aiLabel}>AI 분석</span>
      </div>

      <h3 style={styles.title}>{result.title}</h3>

      <ul style={styles.findings}>
        {displayFindings.map((finding, index) => (
          <li key={index} style={styles.findingItem}>
            {finding}
          </li>
        ))}
      </ul>

      {result.suggestion && (
        <p style={styles.suggestion}>
          <span style={styles.suggestionIcon}>→</span>
          {result.suggestion}
        </p>
      )}

      {onOpenDetail && (
        <button style={styles.detailButton} onClick={onOpenDetail}>
          자세히 보기
        </button>
      )}

      <p style={styles.timestamp}>
        {new Date(result.generatedAt).toLocaleDateString('ko-KR')} 분석
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '20px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  typeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '16px',
  },
  badge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  aiLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  findings: {
    margin: '0 0 12px 0',
    padding: '0 0 0 16px',
    listStyle: 'disc',
  },
  findingItem: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: '4px',
  },
  suggestion: {
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  suggestionIcon: {
    marginRight: '6px',
    color: '#6366f1',
  },
  detailButton: {
    fontSize: '13px',
    color: '#6366f1',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    fontWeight: 500,
    marginBottom: '8px',
  },
  timestamp: {
    fontSize: '11px',
    color: '#94a3b8',
    margin: 0,
  },
};
