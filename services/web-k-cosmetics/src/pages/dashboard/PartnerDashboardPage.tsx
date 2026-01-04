/**
 * PartnerDashboardPage - K-Cosmetics 파트너 대시보드
 */

import { Link } from 'react-router-dom';

export function PartnerDashboardPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>파트너 대시보드</h1>
        <p style={styles.subtitle}>협력 현황과 성과를 확인하세요</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🤝</div>
          <div style={styles.statValue}>8</div>
          <div style={styles.statLabel}>활성 계약</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✈️</div>
          <div style={styles.statValue}>1,234</div>
          <div style={styles.statLabel}>추천 관광객</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💎</div>
          <div style={styles.statValue}>Gold</div>
          <div style={styles.statLabel}>파트너 등급</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statValue}>₩3.5M</div>
          <div style={styles.statLabel}>이번달 커미션</div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 관리</h2>
        <div style={styles.menuGrid}>
          <Link to="/partner/referrals" style={styles.menuCard}>
            <span style={styles.menuIcon}>🔗</span>
            <span style={styles.menuLabel}>추천 현황</span>
          </Link>
          <Link to="/partner/tourists" style={styles.menuCard}>
            <span style={styles.menuIcon}>✈️</span>
            <span style={styles.menuLabel}>관광객 관리</span>
          </Link>
          <Link to="/partner/commission" style={styles.menuCard}>
            <span style={styles.menuIcon}>💰</span>
            <span style={styles.menuLabel}>커미션 내역</span>
          </Link>
          <Link to="/partner/materials" style={styles.menuCard}>
            <span style={styles.menuIcon}>📁</span>
            <span style={styles.menuLabel}>마케팅 자료</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#FF6B9D';

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
};
