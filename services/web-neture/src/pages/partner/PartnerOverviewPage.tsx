/**
 * PartnerOverviewPage - 파트너 Overview
 *
 * 파트너 역할:
 * - 공급자와의 협업 상태 확인
 * - 연결된 서비스/캠페인 확인
 * - 요약된 방향성(Recommendation) 확인
 *
 * 파트너는 분석·판단의 주체가 아님:
 * - AI 인사이트 상세 접근 ❌
 * - 공급자 식별 ❌
 */

import { Link } from 'react-router-dom';

// Mock 방향성 요약 (RECOMMENDATION 타입에서 추출된 1개 문장)
const mockRecommendationSummary: string | null =
  '약국 대상 콘텐츠 확대 방향이 관찰됩니다.';

export function PartnerOverviewPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>파트너 Overview</h1>
        <p style={styles.subtitle}>
          이 화면은 공급자와의 협업 및 연결 상태를 요약해 보여줍니다.
        </p>
        <p style={styles.subtitleNote}>
          상세 분석은 공급자 영역에서 수행됩니다.
        </p>
      </div>

      {/* 요약 카드 (최대 3개) */}
      <div style={styles.statsGrid}>
        {/* 1. 활성 협업 수 */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🤝</div>
          <div style={styles.statValue}>8</div>
          <div style={styles.statLabel}>연결된 공급자</div>
        </div>

        {/* 2. 진행 중 캠페인 */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📢</div>
          <div style={styles.statValue}>3</div>
          <div style={styles.statLabel}>진행 중 캠페인</div>
        </div>

        {/* 3. 최근 방향성 요약 (RECOMMENDATION) */}
        <div style={styles.recommendationCard}>
          <div style={styles.recommendationIcon}>💡</div>
          {mockRecommendationSummary ? (
            <p style={styles.recommendationText}>{mockRecommendationSummary}</p>
          ) : (
            <p style={styles.recommendationEmpty}>
              현재 표시할 정보가 없습니다.
            </p>
          )}
          <span style={styles.recommendationNote}>최근 방향성 요약</span>
        </div>
      </div>

      {/* 상태 알림 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>확인이 필요한 항목</h2>
        <div style={styles.alertList}>
          <div style={{ ...styles.alertItem, ...styles.alertInfo }}>
            <span style={styles.alertIcon}>📬</span>
            <span style={styles.alertText}>신규 협업 요청 2건</span>
            <Link to="/partner/collaboration?status=pending" style={styles.alertAction}>검토하기</Link>
          </div>
          <div style={{ ...styles.alertItem, ...styles.alertSuccess }}>
            <span style={styles.alertIcon}>💰</span>
            <span style={styles.alertText}>정산 완료: ₩850,000</span>
            <Link to="/partner/commission" style={styles.alertAction}>상세 보기</Link>
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 시작</h2>
        <div style={styles.actionGrid}>
          <Link to="/partner/collaboration" style={styles.actionCard}>
            <span style={styles.actionIcon}>🤝</span>
            <span style={styles.actionLabel}>협업 관리</span>
            <span style={styles.actionDesc}>공급자 연결 및 계약 관리</span>
          </Link>
          <Link to="/partner/promotion" style={styles.actionCard}>
            <span style={styles.actionIcon}>📢</span>
            <span style={styles.actionLabel}>프로모션 관리</span>
            <span style={styles.actionDesc}>진행 중인 프로모션 확인</span>
          </Link>
          <Link to="/partner/commission" style={styles.actionCard}>
            <span style={styles.actionIcon}>💳</span>
            <span style={styles.actionLabel}>정산 내역</span>
            <span style={styles.actionDesc}>커미션 및 정산 현황</span>
          </Link>
        </div>
      </div>
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
  alertInfo: {
    backgroundColor: '#DBEAFE',
    border: '1px solid #93C5FD',
  },
  alertSuccess: {
    backgroundColor: '#D1FAE5',
    border: '1px solid #6EE7B7',
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
};
