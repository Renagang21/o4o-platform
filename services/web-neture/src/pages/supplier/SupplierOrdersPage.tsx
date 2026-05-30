/**
 * SupplierOrdersPage - 공급자 운영 허브
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0, P1, P2-REORDER
 *
 * 핵심 개념: Neture는 주문 처리가 아닌 "운영 허브"
 * - 서비스별 주문 현황을 한눈에 확인
 * - 필요한 서비스로 바로 이동
 * - 주문 처리는 각 서비스에서 수행
 */

import { useState, useEffect } from 'react';
import { ShoppingBag, ExternalLink, Info, Users, Clock, Mail, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { supplierApi, type OrderSummaryResponse, type ServiceSummary } from '../../lib/api';

// WO-O4O-SHARED-PACKAGES-GLUCOSEVIEW-RESIDUE-CLEANUP-V1: glucoseview icon 제거
const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
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
        <div style={styles.headerIcon}>
          <Compass size={28} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h1 style={styles.title}>공급자 운영 허브</h1>
          <p style={styles.subtitle}>
            서비스별 주문 현황을 확인하고, 필요한 서비스로 바로 이동합니다
          </p>
        </div>
      </div>

      {/* Hub Concept Info */}
      <div style={styles.infoCard}>
        <Info size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <div>
          <p style={styles.infoCardText}>
            <strong>Neture는 공급자의 운영 허브입니다.</strong><br />
            주문은 각 서비스에서 발생하며, 이곳에서는 서비스별 주문 현황을 한눈에 확인하고
            필요한 서비스로 바로 이동할 수 있습니다.
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
          <div style={styles.emptyStateIcon}>
            <Compass size={40} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={styles.emptyStateTitle}>아직 연결된 서비스가 없습니다</h3>
          <p style={styles.emptyStateText}>
            판매자 신청이 승인되면,<br />
            해당 서비스가 이곳에 자동으로 표시됩니다.
          </p>
          <p style={styles.emptyStateHint}>
            판매자 신청 현황은 "신청 관리" 메뉴에서 확인하세요
          </p>
        </div>
      ) : (
        <div>
          <h2 style={styles.sectionTitle}>서비스별 운영 현황</h2>
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
        </div>
      )}

      {/* Role Separation Notice */}
      <div style={styles.roleNotice}>
        <div style={styles.roleNoticeContent}>
          <span style={styles.roleNoticeBadge}>책임 분리</span>
          <p style={styles.roleNoticeText}>
            <strong>Neture</strong>: 판매자 승인 및 운영 현황 확인 &nbsp;|&nbsp;
            <strong>각 서비스</strong>: 주문 처리, 배송, 반품 관리
          </p>
        </div>
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
                {service.serviceName} 관리 페이지로 이동
                <ExternalLink size={14} />
              </a>
            ) : (
              <span style={styles.serviceLinkDisabled}>관리 페이지 URL 미설정</span>
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
  infoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '18px 22px',
    marginBottom: '24px',
  },
  infoCardText: {
    fontSize: '14px',
    color: '#1e40af',
    margin: 0,
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 16px 0',
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
    padding: '60px 40px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
  },
  emptyStateIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 12px 0',
  },
  emptyStateText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
    lineHeight: 1.6,
  },
  emptyStateHint: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
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
  roleNotice: {
    marginTop: '24px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
  },
  roleNoticeContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  roleNoticeBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    backgroundColor: '#e2e8f0',
    padding: '4px 10px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  roleNoticeText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
};
