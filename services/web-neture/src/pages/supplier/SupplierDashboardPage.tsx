/**
 * SupplierDashboardPage - 공급자 대시보드 메인
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0
 * API: WO-NETURE-SUPPLIER-REQUEST-API-V1
 *
 * 표시 기능:
 * - 대기 중 신청 수
 * - 최근 신청 목록 미리보기
 * - 빠른 액션 링크
 *
 * 금지사항:
 * - 주문/배송/정산 통계 (P0 범위 외)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supplierApi, type SupplierRequest } from '../../lib/api';

// 서비스 아이콘 맵핑
const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
  glucoseview: '📊',
};

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const data = await supplierApi.getRequests();
      setRequests(data);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const stats = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending').slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>공급자 대시보드</h1>
        <p style={styles.subtitle}>
          안녕하세요, <strong>{user?.name}</strong>님.
          여러 서비스의 판매자 신청을 한 곳에서 관리하세요.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderColor: '#fbbf24' }}>
          <Clock size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{stats.pending}</p>
            <p style={styles.statLabel}>대기 중 신청</p>
          </div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
          <CheckCircle size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{stats.approved}</p>
            <p style={styles.statLabel}>승인됨</p>
          </div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#ef4444' }}>
          <XCircle size={24} style={{ color: '#dc2626' }} />
          <div>
            <p style={styles.statValue}>{stats.rejected}</p>
            <p style={styles.statLabel}>거절됨</p>
          </div>
        </div>
      </div>

      {/* Pending Requests Preview */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            <FileCheck size={20} />
            대기 중인 신청
          </h2>
          <Link to="/supplier/requests" style={styles.viewAllLink}>
            전체 보기 <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <p style={styles.loading}>로딩 중...</p>
        ) : pendingRequests.length === 0 ? (
          <div style={styles.emptyState}>
            <p>현재 대기 중인 신청이 없습니다.</p>
          </div>
        ) : (
          <div style={styles.requestList}>
            {pendingRequests.map((req) => (
              <Link
                key={req.id}
                to={`/supplier/requests/${req.id}`}
                style={styles.requestCard}
              >
                <div style={styles.requestHeader}>
                  <span style={styles.serviceIcon}>{SERVICE_ICONS[req.serviceId] || '📦'}</span>
                  <span style={styles.serviceName}>{req.serviceName}</span>
                  <span style={styles.pendingBadge}>대기 중</span>
                </div>
                <div style={styles.requestBody}>
                  <p style={styles.sellerName}>{req.sellerName}</p>
                  <p style={styles.productName}>{req.productName}</p>
                </div>
                <div style={styles.requestFooter}>
                  <span style={styles.timestamp}>
                    {new Date(req.requestedAt).toLocaleDateString('ko-KR')}
                  </span>
                  <ArrowRight size={16} style={{ color: '#94a3b8' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>Neture 공급자 대시보드 안내</h3>
        <ul style={styles.infoList}>
          <li>모든 서비스(GlycoPharm, K-Cosmetics, GlucoseView)의 판매자 신청을 한 곳에서 관리합니다.</li>
          <li>신청 승인/거절은 공급자만 가능합니다.</li>
          <li>승인된 판매자는 해당 서비스에서 제품 판매를 시작할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    borderLeftWidth: '4px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  viewAllLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
  loading: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  requestCard: {
    display: 'block',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  requestHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  serviceIcon: {
    fontSize: '18px',
  },
  serviceName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748b',
    flex: 1,
  },
  pendingBadge: {
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#fef3c7',
    color: '#b45309',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  requestBody: {
    marginBottom: '12px',
  },
  sellerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  productName: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  requestFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    padding: '20px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 12px 0',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: 1.8,
  },
};
