/**
 * SupplierServiceStatusBoard - 서비스별 상태판
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P2
 *
 * 표시 항목 (서비스별):
 * - 승인 상태 요약 (대기 / 승인 / 거절)
 * - 주문 상태 요약 (진행 / 완료)
 * - ACTIVE_SALES 제품 수
 * - 링크: "이 서비스에서 상품 보기" → 외부 읽기 전용 링크
 *
 * 원칙 (WO-SUPPLIER-PARTNER-SPACE-SPLIT-V1):
 * - "센터에서 관리" / "이 서비스에서 관리" 등 관리 개념 금지
 * - 정보 조회용 외부 링크만 허용
 * - 상태 변경 버튼 금지
 * - 직접 수정 기능 금지
 */

import { ExternalLink, Clock, CheckCircle, XCircle, Package } from 'lucide-react';

export interface ServiceStatus {
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  serviceUrl: string;
  requests: {
    pending: number;
    approved: number;
    rejected: number;
  };
  orders: {
    active: number;
    completed: number;
  };
  activeProducts: number;
}

interface Props {
  services: ServiceStatus[];
  loading?: boolean;
}

export function SupplierServiceStatusBoard({ services, loading }: Props) {
  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>제품·콘텐츠가 활용되는 서비스</h2>
        <p style={styles.sectionSubtitle}>연결된 서비스의 현황을 확인하세요</p>
        <div style={styles.grid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ ...styles.card, opacity: 0.5 }}>
              <div style={styles.skeleton} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>제품·콘텐츠가 활용되는 서비스</h2>
        <p style={styles.sectionSubtitle}>연결된 서비스의 현황을 확인하세요</p>
        <div style={styles.emptyState}>
          <p>연결된 서비스가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>제품·콘텐츠가 활용되는 서비스</h2>
      <p style={styles.sectionSubtitle}>연결된 서비스의 현황을 확인하세요</p>
      <div style={styles.grid}>
        {services.map((service) => (
          <div key={service.serviceId} style={styles.card}>
            {/* Header */}
            <div style={styles.cardHeader}>
              <span style={styles.serviceIcon}>{service.serviceIcon}</span>
              <span style={styles.serviceName}>{service.serviceName}</span>
            </div>

            {/* Request Status - WO-O4O-ICON-SYSTEM-MODERNIZATION-V1: 무채색 아이콘 */}
            <div style={styles.statusSection}>
              <p style={styles.statusLabel}>신청 상태</p>
              <div style={styles.statusRow}>
                <div style={styles.statusItem}>
                  <Clock size={14} style={{ color: '#64748b' }} />
                  <span style={styles.statusValue}>{service.requests.pending}</span>
                  <span style={styles.statusText}>대기</span>
                </div>
                <div style={styles.statusItem}>
                  <CheckCircle size={14} style={{ color: '#64748b' }} />
                  <span style={styles.statusValue}>{service.requests.approved}</span>
                  <span style={styles.statusText}>승인</span>
                </div>
                <div style={styles.statusItem}>
                  <XCircle size={14} style={{ color: '#64748b' }} />
                  <span style={styles.statusValue}>{service.requests.rejected}</span>
                  <span style={styles.statusText}>거절</span>
                </div>
              </div>
            </div>

            {/* Order Status */}
            <div style={styles.statusSection}>
              <p style={styles.statusLabel}>주문 상태</p>
              <div style={styles.statusRow}>
                <div style={styles.statusChip}>
                  진행 중 <strong>{service.orders.active}</strong>
                </div>
                <div style={styles.statusChip}>
                  완료 <strong>{service.orders.completed}</strong>
                </div>
              </div>
            </div>

            {/* Active Products */}
            <div style={styles.productSection}>
              <Package size={16} style={{ color: '#64748b' }} />
              <span style={styles.productText}>
                판매 중 제품 <strong>{service.activeProducts}</strong>개
              </span>
            </div>

            {/* 읽기 전용 외부 링크 */}
            <a
              href={service.serviceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.actionButton}
            >
              이 서비스에서 상품 보기
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  serviceIcon: {
    fontSize: '24px',
  },
  serviceName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  statusSection: {
    marginBottom: '16px',
  },
  statusLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#94a3b8',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
    letterSpacing: '0.5px',
  },
  statusRow: {
    display: 'flex',
    gap: '12px',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  statusText: {
    fontSize: '12px',
    color: '#64748b',
  },
  statusChip: {
    fontSize: '13px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  productSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  productText: {
    fontSize: '14px',
    color: '#64748b',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  skeleton: {
    width: '100%',
    height: '200px',
    backgroundColor: '#e2e8f0',
    borderRadius: '8px',
  },
};

export default SupplierServiceStatusBoard;
