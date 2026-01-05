/**
 * PartnerDashboardPage - 파트너 대시보드
 */

import { Link } from 'react-router-dom';

export function PartnerDashboardPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>파트너 대시보드</h1>
        <p style={styles.subtitle}>협력 현황을 관리하세요</p>
        <div style={styles.roleGuide}>
          <span style={styles.roleGuideText}>
            이 화면은 파트너의 협업 관리를 위한 공간입니다.
          </span>
          <Link to="/partner/overview" style={styles.roleGuideLink}>
            협업 현황 요약 보기 →
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🤝</div>
          <div style={styles.statValue}>12</div>
          <div style={styles.statLabel}>활성 계약</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📈</div>
          <div style={styles.statValue}>156</div>
          <div style={styles.statLabel}>추천 판매</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💎</div>
          <div style={styles.statValue}>Gold</div>
          <div style={styles.statLabel}>파트너 등급</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statValue}>₩2.4M</div>
          <div style={styles.statLabel}>이번달 커미션</div>
        </div>
      </div>

      {/* 협력사 현황 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>협력 현황</h2>
        <div style={styles.partnershipGrid}>
          <div style={styles.partnershipCard}>
            <div style={styles.partnershipHeader}>
              <span style={styles.partnershipIcon}>🏭</span>
              <div style={styles.partnershipInfo}>
                <span style={styles.partnershipName}>코스메틱팜</span>
                <span style={styles.partnershipType}>공급 파트너</span>
              </div>
            </div>
            <div style={styles.partnershipMeta}>
              <span style={{ ...styles.partnershipStatus, ...styles.statusActive }}>활성</span>
              <span style={styles.partnershipDate}>2024.01 ~</span>
            </div>
          </div>
          <div style={styles.partnershipCard}>
            <div style={styles.partnershipHeader}>
              <span style={styles.partnershipIcon}>🚚</span>
              <div style={styles.partnershipInfo}>
                <span style={styles.partnershipName}>퀵배송</span>
                <span style={styles.partnershipType}>물류 파트너</span>
              </div>
            </div>
            <div style={styles.partnershipMeta}>
              <span style={{ ...styles.partnershipStatus, ...styles.statusActive }}>활성</span>
              <span style={styles.partnershipDate}>2023.06 ~</span>
            </div>
          </div>
          <div style={styles.partnershipCard}>
            <div style={styles.partnershipHeader}>
              <span style={styles.partnershipIcon}>💳</span>
              <div style={styles.partnershipInfo}>
                <span style={styles.partnershipName}>페이먼트코리아</span>
                <span style={styles.partnershipType}>결제 파트너</span>
              </div>
            </div>
            <div style={styles.partnershipMeta}>
              <span style={{ ...styles.partnershipStatus, ...styles.statusActive }}>활성</span>
              <span style={styles.partnershipDate}>2023.03 ~</span>
            </div>
          </div>
        </div>
      </div>

      {/* 퀵 메뉴 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 관리</h2>
        <div style={styles.menuGrid}>
          <Link to="/partner/contracts" style={styles.menuCard}>
            <span style={styles.menuIcon}>📝</span>
            <span style={styles.menuLabel}>계약 관리</span>
          </Link>
          <Link to="/partner/referrals" style={styles.menuCard}>
            <span style={styles.menuIcon}>🔗</span>
            <span style={styles.menuLabel}>추천 현황</span>
          </Link>
          <Link to="/partner/commission" style={styles.menuCard}>
            <span style={styles.menuIcon}>💰</span>
            <span style={styles.menuLabel}>커미션 내역</span>
          </Link>
          <Link to="/partner/activity" style={styles.menuCard}>
            <span style={styles.menuIcon}>📊</span>
            <span style={styles.menuLabel}>활동 내역</span>
          </Link>
          <Link to="/partner/materials" style={styles.menuCard}>
            <span style={styles.menuIcon}>📁</span>
            <span style={styles.menuLabel}>자료실</span>
          </Link>
          <Link to="/partner/support" style={styles.menuCard}>
            <span style={styles.menuIcon}>💬</span>
            <span style={styles.menuLabel}>파트너 지원</span>
          </Link>
        </div>
      </div>

      {/* 최근 활동 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>최근 활동</h2>
        <div style={styles.activityList}>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>새 추천 판매 등록: K-뷰티 세럼 25건</span>
            <span style={styles.activityTime}>2시간 전</span>
          </div>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>커미션 정산 완료: ₩850,000</span>
            <span style={styles.activityTime}>1일 전</span>
          </div>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>파트너 등급 승급: Silver → Gold</span>
            <span style={styles.activityTime}>3일 전</span>
          </div>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>신규 협력사 계약: 스킨케어랩</span>
            <span style={styles.activityTime}>1주 전</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748B',
    margin: 0,
  },
  roleGuide: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  roleGuideText: {
    fontSize: '13px',
    color: '#64748b',
  },
  roleGuideLink: {
    fontSize: '13px',
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontWeight: 500,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: PRIMARY_COLOR,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748B',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '20px',
  },
  partnershipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  partnershipCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  partnershipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  partnershipIcon: {
    fontSize: '32px',
  },
  partnershipInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  partnershipName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  partnershipType: {
    fontSize: '13px',
    color: '#64748B',
  },
  partnershipMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  partnershipStatus: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  partnershipDate: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
  },
  menuCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  menuIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  menuLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1a1a1a',
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  activityDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: PRIMARY_COLOR,
    marginRight: '12px',
  },
  activityText: {
    flex: 1,
    fontSize: '14px',
    color: '#1a1a1a',
  },
  activityTime: {
    fontSize: '12px',
    color: '#94a3b8',
  },
};
