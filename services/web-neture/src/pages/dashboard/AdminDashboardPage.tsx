/**
 * AdminDashboardPage - 관리자 대시보드
 */

import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>관리자 대시보드</h1>
        <p style={styles.subtitle}>플랫폼 전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statValue}>1,234</div>
          <div style={styles.statLabel}>전체 사용자</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statValue}>5,678</div>
          <div style={styles.statLabel}>등록 상품</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🛒</div>
          <div style={styles.statValue}>892</div>
          <div style={styles.statLabel}>오늘 주문</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statValue}>₩12.5M</div>
          <div style={styles.statLabel}>오늘 매출</div>
        </div>
      </div>

      {/* 퀵 메뉴 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 관리</h2>
        <div style={styles.menuGrid}>
          <Link to="/admin/users" style={styles.menuCard}>
            <span style={styles.menuIcon}>👤</span>
            <span style={styles.menuLabel}>사용자 관리</span>
          </Link>
          <Link to="/admin/products" style={styles.menuCard}>
            <span style={styles.menuIcon}>📦</span>
            <span style={styles.menuLabel}>상품 관리</span>
          </Link>
          <Link to="/admin/orders" style={styles.menuCard}>
            <span style={styles.menuIcon}>📋</span>
            <span style={styles.menuLabel}>주문 관리</span>
          </Link>
          <Link to="/admin/suppliers" style={styles.menuCard}>
            <span style={styles.menuIcon}>🏭</span>
            <span style={styles.menuLabel}>공급자 관리</span>
          </Link>
          <Link to="/admin/sellers" style={styles.menuCard}>
            <span style={styles.menuIcon}>🏪</span>
            <span style={styles.menuLabel}>판매자 관리</span>
          </Link>
          <Link to="/admin/settings" style={styles.menuCard}>
            <span style={styles.menuIcon}>⚙️</span>
            <span style={styles.menuLabel}>시스템 설정</span>
          </Link>
        </div>
      </div>

      {/* 최근 활동 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>최근 활동</h2>
        <div style={styles.activityList}>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>새 판매자 가입: 서울스토어</span>
            <span style={styles.activityTime}>5분 전</span>
          </div>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>신규 상품 등록: K-뷰티 세럼 50종</span>
            <span style={styles.activityTime}>15분 전</span>
          </div>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>대량 주문 접수: 500건</span>
            <span style={styles.activityTime}>30분 전</span>
          </div>
          <div style={styles.activityItem}>
            <span style={styles.activityDot} />
            <span style={styles.activityText}>공급자 승인 완료: 코스메틱팜</span>
            <span style={styles.activityTime}>1시간 전</span>
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
