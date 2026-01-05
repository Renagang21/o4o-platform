/**
 * AIInsightDetailPanel - AI 분석 결과 상세 패널
 *
 * 용도: "자세히 보기" 클릭 시 표시
 *
 * 표시 순서 고정: Scope → KeyFindings → Evidence → Caution → Suggestion
 * 표현 규칙: 불확실성 문장형 유지 ("~경향", "~로 보입니다")
 */

import type { AIAnalysisResult, AIAnalysisResultType, ParticipantRole } from '../../types';

interface AIInsightDetailPanelProps {
  result: AIAnalysisResult;
  onClose: () => void;
}

const TYPE_LABELS: Record<AIAnalysisResultType, string> = {
  SUMMARY: '요약 분석',
  COMPARISON: '비교 분석',
  INSIGHT: '인사이트',
  ANOMALY: '특이점 발견',
  RECOMMENDATION: '제안',
};

const ROLE_LABELS: Record<ParticipantRole, string> = {
  pharmacy: '약국',
  general: '일반 사업자',
  medical: '의료기관',
  supplier: '공급자',
};

export function AIInsightDetailPanel({ result, onClose }: AIInsightDetailPanelProps) {
  const formatScope = () => {
    const parts: string[] = [];
    if (result.scope.serviceId) parts.push(`서비스: ${result.scope.serviceId}`);
    if (result.scope.productId) parts.push(`상품: ${result.scope.productId}`);
    if (result.scope.categoryId) parts.push(`카테고리: ${result.scope.categoryId}`);
    if (result.scope.participantRoles?.length) {
      const roles = result.scope.participantRoles.map(r => ROLE_LABELS[r]).join(', ');
      parts.push(`대상: ${roles}`);
    }
    if (result.scope.dateRange) {
      parts.push(`기간: ${result.scope.dateRange.from} ~ ${result.scope.dateRange.to}`);
    }
    return parts;
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <span style={styles.typeLabel}>{TYPE_LABELS[result.type]}</span>
            <span style={styles.aiLabel}>AI 분석</span>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <h2 style={styles.title}>{result.title}</h2>

        {/* Scope */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>분석 범위</h3>
          <div style={styles.scopeList}>
            {formatScope().map((item, index) => (
              <span key={index} style={styles.scopeItem}>{item}</span>
            ))}
          </div>
        </div>

        {/* Key Findings */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>주요 발견</h3>
          <ul style={styles.findingsList}>
            {result.keyFindings.map((finding, index) => (
              <li key={index} style={styles.findingItem}>
                {finding}
              </li>
            ))}
          </ul>
        </div>

        {/* Evidence */}
        {result.evidence.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>근거</h3>
            <div style={styles.evidenceList}>
              {result.evidence.map((ev, index) => (
                <div key={index} style={styles.evidenceItem}>
                  <span style={styles.evidenceType}>{ev.type}</span>
                  <span style={styles.evidenceDesc}>{ev.description}</span>
                  {ev.value !== undefined && (
                    <span style={styles.evidenceValue}>
                      {ev.value}{ev.unit || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caution */}
        {result.caution && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>주의사항</h3>
            <p style={styles.cautionText}>{result.caution}</p>
          </div>
        )}

        {/* Suggestion */}
        {result.suggestion && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>다음 액션 제안</h3>
            <p style={styles.suggestionText}>{result.suggestion}</p>
          </div>
        )}

        <p style={styles.timestamp}>
          {new Date(result.generatedAt).toLocaleString('ko-KR')} 생성
        </p>

        <p style={styles.disclaimer}>
          이 분석은 참고용이며, 최종 판단은 사용자의 몫입니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '28px',
    width: '560px',
    maxWidth: '90%',
    maxHeight: '85vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  typeLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '6px 12px',
    borderRadius: '6px',
    marginRight: '8px',
  },
  aiLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  closeButton: {
    fontSize: '18px',
    color: '#64748b',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 20px 0',
    lineHeight: 1.4,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#64748b',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  scopeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  scopeItem: {
    fontSize: '13px',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: '6px 10px',
    borderRadius: '4px',
  },
  findingsList: {
    margin: 0,
    padding: '0 0 0 18px',
  },
  findingItem: {
    fontSize: '15px',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '8px',
  },
  evidenceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  evidenceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
  },
  evidenceType: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  evidenceDesc: {
    fontSize: '14px',
    color: '#334155',
    flex: 1,
  },
  evidenceValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
  },
  cautionText: {
    fontSize: '14px',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '12px',
    borderRadius: '6px',
    margin: 0,
    lineHeight: 1.6,
  },
  suggestionText: {
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#f0fdf4',
    padding: '12px',
    borderRadius: '6px',
    margin: 0,
    lineHeight: 1.6,
  },
  timestamp: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '16px 0 8px 0',
  },
  disclaimer: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
    fontStyle: 'italic',
  },
};
