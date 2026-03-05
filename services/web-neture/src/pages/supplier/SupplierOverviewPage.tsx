/**
 * SupplierOverviewPage - 공급자 Overview
 * 현황 요약 + 다음 행동 유도
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1: mock 제거, empty state 적용
 */

import { Link } from 'react-router-dom';

const PRIMARY_COLOR = '#2563EB';

export function SupplierOverviewPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>공급자 Overview</h1>
        <p style={styles.subtitle}>현재 상태를 확인하고 다음 작업을 시작하세요</p>
      </div>

      {/* 요약 카드 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statValue}>-</div>
          <div style={styles.statLabel}>등록 상품</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🧪</div>
          <div style={styles.statValue}>-</div>
          <div style={styles.statLabel}>진행 중 Trial</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📋</div>
          <div style={styles.statValue}>-</div>
          <div style={styles.statLabel}>활성 주문</div>
        </div>
      </div>

      {/* 상태 알림 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>확인이 필요한 항목</h2>
        <div style={styles.emptyAlerts}>
          <p style={styles.emptyAlertsText}>확인이 필요한 항목이 없습니다.</p>
        </div>
      </div>

      {/* AI 인사이트 - 데이터 준비 중 */}
      <div style={styles.section}>
        <div style={styles.insightHeader}>
          <h2 style={styles.sectionTitle}>AI 인사이트</h2>
        </div>
        <div style={styles.insufficientData}>
          <p style={styles.insufficientText}>
            분석 데이터 준비 중입니다.
          </p>
          <p style={styles.insufficientSubText}>
            데이터가 수집되면 인사이트가 자동으로 생성됩니다.
          </p>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 시작</h2>
        <div style={styles.actionGrid}>
          <Link to="/workspace/supplier/products" style={styles.actionCard}>
            <span style={styles.actionIcon}>📦</span>
            <span style={styles.actionLabel}>상품 관리</span>
            <span style={styles.actionDesc}>등록된 상품 확인 및 수정</span>
          </Link>
          <Link to="/workspace/supplier/products/new" style={styles.actionCard}>
            <span style={styles.actionIcon}>➕</span>
            <span style={styles.actionLabel}>상품 등록</span>
            <span style={styles.actionDesc}>새 상품 등록하기</span>
          </Link>
          <Link to="/workspace/supplier/orders" style={styles.actionCard}>
            <span style={styles.actionIcon}>📋</span>
            <span style={styles.actionLabel}>주문 관리</span>
            <span style={styles.actionDesc}>주문 현황 및 출고 처리</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

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
