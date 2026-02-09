/**
 * SupplierOverviewPage - 공급자 Overview
 * 현황 요약 + 다음 행동 유도 + AI 인사이트
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AIInsightCard, AIInsightDetailPanel } from '../../components/ai-insight';
import type { AIAnalysisResult } from '../../types';

// TODO: API 연동 필요 - 현재 빈 배열
const mockAIResults: AIAnalysisResult[] = [];

// 인사이트 정렬: RECOMMENDATION 우선, 그 다음 최신순
function sortInsights(results: AIAnalysisResult[]): AIAnalysisResult[] {
  return [...results].sort((a, b) => {
    if (a.type === 'RECOMMENDATION' && b.type !== 'RECOMMENDATION') return -1;
    if (a.type !== 'RECOMMENDATION' && b.type === 'RECOMMENDATION') return 1;
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });
}

// 상태: 인사이트 있음 / 데이터 부족 / 없음
type InsightStatus = 'available' | 'insufficient_data' | 'none';
const mockInsightStatus: InsightStatus = 'available';

export function SupplierOverviewPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AIAnalysisResult | null>(null);
  const [showAllInsights, setShowAllInsights] = useState(false);

  // 정렬된 인사이트 (최대 2개 표시, 확장 시 전체)
  const sortedInsights = sortInsights(mockAIResults);
  const displayInsights = showAllInsights ? sortedInsights : sortedInsights.slice(0, 2);
  const hasMoreInsights = sortedInsights.length > 2;
  const insightStatus = mockInsightStatus;

  const handleOpenDetail = (result: AIAnalysisResult) => {
    setSelectedResult(result);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedResult(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>공급자 Overview</h1>
        <p style={styles.subtitle}>현재 상태를 확인하고 다음 작업을 시작하세요</p>
      </div>

      {/* 요약 카드 - TODO: API 연동 필요 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statValue}>0</div>
          <div style={styles.statLabel}>등록 상품</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🧪</div>
          <div style={styles.statValue}>0</div>
          <div style={styles.statLabel}>진행 중 Trial</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📋</div>
          <div style={styles.statValue}>0</div>
          <div style={styles.statLabel}>활성 주문</div>
        </div>
      </div>

      {/* 상태 알림 - TODO: API 연동 필요 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>확인이 필요한 항목</h2>
        <div style={styles.emptyAlerts}>
          <p style={styles.emptyAlertsText}>확인이 필요한 항목이 없습니다.</p>
        </div>
      </div>

      {/* AI 인사이트 - 상태별 처리 */}
      {insightStatus !== 'none' && (
        <div style={styles.section}>
          <div style={styles.insightHeader}>
            <h2 style={styles.sectionTitle}>AI 인사이트</h2>
            <span style={styles.insightNote}>최근 30일간 수집된 참여 데이터를 기반으로 한 요약입니다</span>
          </div>

          {insightStatus === 'available' ? (
            <>
              <div style={styles.insightList}>
                {displayInsights.map((result) => (
                  <AIInsightCard
                    key={result.id}
                    result={result}
                    onOpenDetail={() => handleOpenDetail(result)}
                  />
                ))}
              </div>
              {hasMoreInsights && !showAllInsights && (
                <button
                  style={styles.showMoreButton}
                  onClick={() => setShowAllInsights(true)}
                >
                  모든 인사이트 보기 ({sortedInsights.length}개)
                </button>
              )}
              {showAllInsights && (
                <button
                  style={styles.showMoreButton}
                  onClick={() => setShowAllInsights(false)}
                >
                  접기
                </button>
              )}
            </>
          ) : (
            <div style={styles.insufficientData}>
              <p style={styles.insufficientText}>
                분석 가능한 데이터가 충분하지 않습니다.
              </p>
              <p style={styles.insufficientSubText}>
                응답이 수집되면 인사이트가 생성됩니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 빠른 액션 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 시작</h2>
        <div style={styles.actionGrid}>
          <Link to="/supplier/products" style={styles.actionCard}>
            <span style={styles.actionIcon}>📦</span>
            <span style={styles.actionLabel}>상품 관리</span>
            <span style={styles.actionDesc}>등록된 상품 확인 및 수정</span>
          </Link>
          <Link to="/trials" style={styles.actionCard}>
            <span style={styles.actionIcon}>🧪</span>
            <span style={styles.actionLabel}>Trial 생성</span>
            <span style={styles.actionDesc}>새로운 상품 검증 시작</span>
          </Link>
          <Link to="/supplier/orders" style={styles.actionCard}>
            <span style={styles.actionIcon}>📋</span>
            <span style={styles.actionLabel}>주문 관리</span>
            <span style={styles.actionDesc}>주문 현황 및 출고 처리</span>
          </Link>
        </div>
      </div>

      {/* AI 상세 패널 */}
      {showDetail && selectedResult && (
        <AIInsightDetailPanel
          result={selectedResult}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748B',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  statIcon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: PRIMARY_COLOR,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748B',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '16px',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderRadius: '8px',
    gap: '12px',
  },
  alertWarning: {
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
  },
  alertInfo: {
    backgroundColor: '#DBEAFE',
    border: '1px solid #93C5FD',
  },
  alertIcon: {
    fontSize: '18px',
  },
  alertText: {
    flex: 1,
    fontSize: '14px',
    color: '#1a1a1a',
  },
  alertAction: {
    fontSize: '13px',
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontWeight: 500,
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    textDecoration: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  actionIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  actionLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '4px',
  },
  actionDesc: {
    fontSize: '12px',
    color: '#64748B',
    textAlign: 'center',
  },
  insightHeader: {
    marginBottom: '16px',
  },
  insightNote: {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  insightList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  showMoreButton: {
    marginTop: '12px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#6366f1',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
  },
  insufficientData: {
    padding: '32px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
    textAlign: 'center',
  },
  insufficientText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  insufficientSubText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
  emptyAlerts: {
    padding: '32px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
    textAlign: 'center' as const,
  },
  emptyAlertsText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
};
