/**
 * SupplierOrdersPage - 주문/배송 작업 진입점
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4
 *
 * 중요: Neture가 주문을 처리하지는 않지만,
 * 공급자가 "어디서 주문이 왔는지"를 확인하는 곳은 필요하다.
 *
 * 표시:
 * - 서비스별 주문 요약
 * - 승인된 판매자 수
 *
 * 허용 액션:
 * - "해당 서비스로 이동" 링크
 *
 * 금지:
 * - Neture 내 주문 처리
 * - 송장 입력
 * - 반품 처리
 */

import { useState, useEffect } from 'react';
import { ShoppingBag, ExternalLink, AlertTriangle, Users } from 'lucide-react';
import { supplierApi, type OrderSummary } from '../../lib/api';

const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
  glucoseview: '📊',
};

export default function SupplierOrdersPage() {
  const [summary, setSummary] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const data = await supplierApi.getOrdersSummary();
      setSummary(data);
      setLoading(false);
    };
    fetchSummary();
  }, []);

  const totalSellers = summary.reduce((sum, s) => sum + s.approvedSellerCount, 0);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>주문/배송 현황</h1>
        <p style={styles.subtitle}>
          각 서비스에서 발생하는 주문 현황을 확인하고, 해당 서비스로 이동합니다.
        </p>
      </div>

      {/* Important Notice */}
      <div style={styles.warningBox}>
        <AlertTriangle size={20} style={{ color: '#b45309', flexShrink: 0 }} />
        <div>
          <p style={styles.warningTitle}>Neture는 주문을 직접 처리하지 않습니다</p>
          <p style={styles.warningText}>
            주문 확인, 송장 입력, 배송 처리, 반품 승인 등 모든 주문 관련 작업은
            각 서비스(GlycoPharm, K-Cosmetics 등)에서 직접 수행합니다.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <ShoppingBag size={24} style={{ color: '#3b82f6' }} />
          <div>
            <p style={styles.statValue}>{summary.length}</p>
            <p style={styles.statLabel}>연결된 서비스</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Users size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{totalSellers}</p>
            <p style={styles.statLabel}>승인된 판매자</p>
          </div>
        </div>
      </div>

      {/* Service List */}
      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : summary.length === 0 ? (
        <div style={styles.emptyState}>
          <ShoppingBag size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p>연결된 서비스가 없습니다.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>
            판매자 신청을 승인하면 해당 서비스가 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={styles.serviceList}>
          {summary.map((svc) => (
            <div key={svc.serviceId} style={styles.serviceCard}>
              <div style={styles.serviceInfo}>
                <span style={styles.serviceIcon}>
                  {SERVICE_ICONS[svc.serviceId] || '📦'}
                </span>
                <div>
                  <h3 style={styles.serviceName}>{svc.serviceName}</h3>
                  <p style={styles.serviceStats}>
                    <Users size={14} />
                    {svc.approvedSellerCount}명의 판매자가 제품을 판매 중
                  </p>
                </div>
              </div>

              <div style={styles.serviceActions}>
                <p style={styles.serviceMessage}>{svc.message}</p>
                {svc.serviceUrl ? (
                  <a
                    href={svc.serviceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.serviceLink}
                  >
                    서비스로 이동
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span style={styles.serviceLinkDisabled}>URL 미설정</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>주문 관리 안내</h3>
        <ul style={styles.infoList}>
          <li>각 서비스에서 주문이 발생하면, 해당 서비스 관리자 페이지에서 처리합니다.</li>
          <li>Neture는 공급자-판매자 매칭과 승인만 담당합니다.</li>
          <li>주문 현황 통계는 추후 업데이트될 예정입니다.</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  warningBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  warningTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#92400e',
    margin: '0 0 4px 0',
  },
  warningText: {
    fontSize: '13px',
    color: '#a16207',
    margin: 0,
    lineHeight: 1.5,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
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
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#94a3b8',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  serviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  serviceCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
  },
  serviceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  serviceIcon: {
    fontSize: '32px',
  },
  serviceName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  serviceStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  serviceActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  serviceMessage: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  serviceLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    padding: '8px 14px',
    borderRadius: '6px',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
  },
  serviceLinkDisabled: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 12px 0',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.8,
  },
};
