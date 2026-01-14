/**
 * SupplierOrdersPage - 주문/배송 작업 진입점
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4, P1 §3.3
 *
 * 중요: Neture가 주문을 처리하지는 않지만,
 * 공급자가 "어디서 주문이 왔는지"를 확인하는 곳은 필요하다.
 *
 * P1 §3.3 정밀화:
 * - 최근 승인 발생 시점
 * - 서비스별 상세 정보
 * - 최근 활동 내역
 */

import { useState, useEffect } from 'react';
import { ShoppingBag, ExternalLink, AlertTriangle, Users, Clock, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { supplierApi, type OrderSummaryResponse, type ServiceSummary } from '../../lib/api';

const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
  glucoseview: '📊',
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDate(dateStr);
};

export default function SupplierOrdersPage() {
  const [data, setData] = useState<OrderSummaryResponse>({
    services: [],
    totalApprovedSellers: 0,
    totalPendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const result = await supplierApi.getOrdersSummary();
      setData(result);
      setLoading(false);
    };
    fetchSummary();
  }, []);

  const toggleExpand = (serviceId: string) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

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
            <p style={styles.statValue}>{data.services.length}</p>
            <p style={styles.statLabel}>연결된 서비스</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Users size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{data.totalApprovedSellers}</p>
            <p style={styles.statLabel}>승인된 판매자</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{data.totalPendingRequests}</p>
            <p style={styles.statLabel}>대기 중인 신청</p>
          </div>
        </div>
      </div>

      {/* Service List */}
      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : data.services.length === 0 ? (
        <div style={styles.emptyState}>
          <ShoppingBag size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p>연결된 서비스가 없습니다.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>
            판매자 신청을 승인하면 해당 서비스가 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={styles.serviceList}>
          {data.services.map((svc) => (
            <ServiceCard
              key={svc.serviceId}
              service={svc}
              expanded={expandedService === svc.serviceId}
              onToggle={() => toggleExpand(svc.serviceId)}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>주문 관리 안내</h3>
        <ul style={styles.infoList}>
          <li>각 서비스에서 주문이 발생하면, 해당 서비스 관리자 페이지에서 처리합니다.</li>
          <li>Neture는 공급자-판매자 매칭과 승인만 담당합니다.</li>
          <li>최근 활동 내역은 승인/거절 이벤트를 보여줍니다.</li>
        </ul>
      </div>
    </div>
  );
}

// Service Card Component
function ServiceCard({
  service,
  expanded,
  onToggle,
}: {
  service: ServiceSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={styles.serviceCard}>
      {/* Main Row */}
      <div style={styles.serviceMainRow}>
        <div style={styles.serviceInfo}>
          <span style={styles.serviceIcon}>
            {SERVICE_ICONS[service.serviceId] || '📦'}
          </span>
          <div>
            <h3 style={styles.serviceName}>{service.serviceName}</h3>
            <div style={styles.serviceStatsRow}>
              <span style={styles.serviceStat}>
                <Users size={14} />
                {service.summary.approvedSellerCount}명 판매 중
              </span>
              {service.summary.pendingRequestCount > 0 && (
                <span style={styles.serviceStatPending}>
                  <Clock size={14} />
                  {service.summary.pendingRequestCount}건 대기
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.serviceActions}>
          {service.summary.lastApprovedAt && (
            <p style={styles.lastApproved}>
              최근 승인: {formatRelativeTime(service.summary.lastApprovedAt)}
            </p>
          )}
          <div style={styles.actionButtons}>
            {service.navigation.ordersUrl ? (
              <a
                href={service.navigation.ordersUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.serviceLink}
              >
                주문 관리
                <ExternalLink size={14} />
              </a>
            ) : (
              <span style={styles.serviceLinkDisabled}>URL 미설정</span>
            )}
            <button onClick={onToggle} style={styles.expandButton}>
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={styles.expandedContent}>
          {/* Features */}
          {service.features.length > 0 && (
            <div style={styles.featuresSection}>
              <p style={styles.sectionLabel}>지원 기능</p>
              <div style={styles.featureTags}>
                {service.features.map((f, i) => (
                  <span key={i} style={styles.featureTag}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {service.navigation.supportEmail && (
            <div style={styles.contactSection}>
              <Mail size={14} style={{ color: '#64748b' }} />
              <a href={`mailto:${service.navigation.supportEmail}`} style={styles.emailLink}>
                {service.navigation.supportEmail}
              </a>
            </div>
          )}

          {/* Recent Activity */}
          {service.recentActivity.length > 0 && (
            <div style={styles.activitySection}>
              <p style={styles.sectionLabel}>최근 활동</p>
              <div style={styles.activityList}>
                {service.recentActivity.map((act, i) => (
                  <div key={i} style={styles.activityItem}>
                    <span style={{
                      ...styles.activityBadge,
                      backgroundColor: act.eventType === 'approved' ? '#dcfce7' : '#fee2e2',
                      color: act.eventType === 'approved' ? '#166534' : '#991b1b',
                    }}>
                      {act.eventType === 'approved' ? '승인' : '거절'}
                    </span>
                    <span style={styles.activityText}>
                      {act.sellerName} - {act.productName}
                    </span>
                    <span style={styles.activityTime}>
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notice */}
          <p style={styles.serviceNotice}>{service.notice}</p>
        </div>
      )}
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
    gridTemplateColumns: 'repeat(3, 1fr)',
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
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  serviceMainRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    margin: '0 0 6px 0',
  },
  serviceStatsRow: {
    display: 'flex',
    gap: '16px',
  },
  serviceStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#64748b',
  },
  serviceStatPending: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#d97706',
    fontWeight: 500,
  },
  serviceActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  lastApproved: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
  expandButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#64748b',
  },
  expandedContent: {
    borderTop: '1px solid #e2e8f0',
    padding: '20px 24px',
    backgroundColor: '#f8fafc',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  featuresSection: {
    marginBottom: '16px',
  },
  featureTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  featureTag: {
    fontSize: '12px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  contactSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  emailLink: {
    fontSize: '13px',
    color: '#3b82f6',
    textDecoration: 'none',
  },
  activitySection: {
    marginBottom: '16px',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
  },
  activityBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
  },
  activityText: {
    color: '#475569',
    flex: 1,
  },
  activityTime: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  serviceNotice: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
    fontStyle: 'italic',
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
