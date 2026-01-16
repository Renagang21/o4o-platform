/**
 * CollaborationPage - 파트너 협업 관리
 *
 * Work Order: WO-NETURE-PARTNER-DASHBOARD-HUB
 *
 * 파트너 협업 현황:
 * - 연결된 공급자 목록
 * - 협업 상태 확인
 * - 계약 정보 (읽기 전용)
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Building2, CheckCircle, Clock, FileText } from 'lucide-react';

// Mock 데이터: 협업 공급자 목록
const collaborations = [
  {
    id: '1',
    supplierName: 'GlycoPharm 강남점',
    service: 'GlycoPharm',
    status: 'active',
    contractDate: '2025-01-01',
    productCount: 12,
    lastActivity: '2시간 전',
  },
  {
    id: '2',
    supplierName: 'K-Beauty 본사',
    service: 'K-Cosmetics',
    status: 'active',
    contractDate: '2024-12-15',
    productCount: 35,
    lastActivity: '1일 전',
  },
  {
    id: '3',
    supplierName: 'Health Plus',
    service: 'GlycoPharm',
    status: 'pending',
    contractDate: null,
    productCount: 0,
    lastActivity: '협업 요청 대기 중',
  },
];

export function CollaborationPage() {
  const activeCount = collaborations.filter(c => c.status === 'active').length;
  const pendingCount = collaborations.filter(c => c.status === 'pending').length;

  return (
    <div style={styles.container}>
      {/* Back Link */}
      <Link to="/partner" style={styles.backLink}>
        <ArrowLeft size={18} />
        파트너 허브로 돌아가기
      </Link>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Users size={28} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 style={styles.title}>협업 관리</h1>
          <p style={styles.subtitle}>
            공급자와의 협업 현황을 확인하고 관리합니다
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <CheckCircle size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{activeCount}</p>
            <p style={styles.statLabel}>활성 협업</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{pendingCount}</p>
            <p style={styles.statLabel}>대기 중</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Building2 size={24} style={{ color: '#2563eb' }} />
          <div>
            <p style={styles.statValue}>{collaborations.length}</p>
            <p style={styles.statLabel}>전체 공급자</p>
          </div>
        </div>
      </div>

      {/* Collaboration List */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>협업 공급자 목록</h2>
        <div style={styles.list}>
          {collaborations.map((collab) => (
            <div key={collab.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardInfo}>
                  <div style={styles.cardIcon}>
                    <Building2 size={20} style={{ color: '#64748b' }} />
                  </div>
                  <div>
                    <h3 style={styles.cardTitle}>{collab.supplierName}</h3>
                    <p style={styles.cardService}>{collab.service}</p>
                  </div>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: collab.status === 'active' ? '#dcfce7' : '#fef3c7',
                  color: collab.status === 'active' ? '#166534' : '#92400e',
                }}>
                  {collab.status === 'active' ? '활성' : '대기'}
                </span>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.cardMeta}>
                  {collab.contractDate && (
                    <span style={styles.metaItem}>
                      <FileText size={14} />
                      계약일: {collab.contractDate}
                    </span>
                  )}
                  <span style={styles.metaItem}>
                    <Clock size={14} />
                    {collab.lastActivity}
                  </span>
                </div>
                {collab.status === 'active' && (
                  <p style={styles.productCount}>
                    협업 제품: <strong>{collab.productCount}개</strong>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Notice */}
      <div style={styles.infoCard}>
        <p style={styles.infoText}>
          협업 요청 및 계약 관리는 각 서비스에서 직접 처리됩니다.<br />
          상세 내용은 해당 서비스의 파트너 페이지에서 확인해 주세요.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 16px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  cardInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 2px 0',
  },
  cardService: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '6px',
  },
  cardBody: {
    padding: '14px 20px',
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '8px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#64748b',
  },
  productCount: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
  },
  infoText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
};
