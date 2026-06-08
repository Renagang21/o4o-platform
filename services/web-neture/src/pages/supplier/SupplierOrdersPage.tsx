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
import { Link } from 'react-router-dom';
import { GuideBackLink } from '../../components/GuideBackLink';
import { ShoppingBag, ExternalLink, Info, Users, Clock, Mail, ChevronDown, ChevronUp, Compass, Truck, ArrowRight, Lock } from 'lucide-react';
import { supplierApi, type OrderSummaryResponse, type ServiceSummary } from '../../lib/api';
import type { UnifiedSupplierOrder } from '../../lib/api/supplier';

const formatKRW = (v: number | null | undefined): string =>
  `₩${Number(v ?? 0).toLocaleString('ko-KR')}`;

// 주문 출처/유형 배지 라벨·색상
const SOURCE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  neture: { label: 'Neture 주문', bg: '#dbeafe', color: '#1d4ed8' },
  event_offer: { label: '이벤트 오퍼 주문', bg: '#ede9fe', color: '#6d28d9' },
  service_checkout: { label: '서비스 주문', bg: '#f1f5f9', color: '#475569' },
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  created: '주문접수', pending_payment: '결제대기', paid: '결제완료',
  preparing: '준비중', shipped: '배송중', delivered: '배송완료',
  cancelled: '취소', refunded: '환불',
};

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

  // WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1: 통합 주문(읽기) 상태
  const [unifiedOrders, setUnifiedOrders] = useState<UnifiedSupplierOrder[]>([]);
  const [unifiedLoading, setUnifiedLoading] = useState(true);
  const [unifiedTotal, setUnifiedTotal] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'neture' | 'checkout'>('all');

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const result = await supplierApi.getOrdersSummary();
      setData(result);
      setLoading(false);
    };
    fetchSummary();
  }, []);

  useEffect(() => {
    const fetchUnified = async () => {
      setUnifiedLoading(true);
      const result = await supplierApi.getUnifiedOrders({ page: 1, limit: 20, source: sourceFilter });
      setUnifiedOrders(result.data);
      setUnifiedTotal(result.meta.total);
      setUnifiedLoading(false);
    };
    fetchUnified();
  }, [sourceFilter]);

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
          <div style={{ marginTop: 8 }}><GuideBackLink to="/guide" label="이용 안내" /></div>
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

      {/* 주문 처리 workspace 진입 — WO-O4O-NETURE-SUPPLIER-ORDER-WORKSPACE-IA-LINK-V1 */}
      <Link to="/account/supplier/orders" style={styles.fulfillCard}>
        <div style={styles.fulfillIcon}>
          <Truck size={24} style={{ color: '#2563eb' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={styles.fulfillTitle}>주문 처리 · 배송 workspace 열기</p>
          <p style={styles.fulfillText}>
            Neture 주문의 주문 확인 · 배송 준비 · 송장 등록 · 배송 완료를 처리합니다.
            <br />
            <span style={styles.fulfillNote}>
              이벤트 오퍼 주문은 아래 "통합 주문 보기"에서 함께 확인할 수 있으며(읽기 전용), 배송 처리 통합은 후속 작업에서 다룹니다.
            </span>
          </p>
        </div>
        <ArrowRight size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
      </Link>

      {/* 통합 주문 보기 (읽기) — WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 */}
      <UnifiedOrdersSection
        orders={unifiedOrders}
        loading={unifiedLoading}
        total={unifiedTotal}
        sourceFilter={sourceFilter}
        onChangeFilter={setSourceFilter}
      />

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

// 통합 주문 보기 섹션 (읽기) — neture_orders + checkout_orders
function UnifiedOrdersSection({
  orders,
  loading,
  total,
  sourceFilter,
  onChangeFilter,
}: {
  orders: UnifiedSupplierOrder[];
  loading: boolean;
  total: number;
  sourceFilter: 'all' | 'neture' | 'checkout';
  onChangeFilter: (f: 'all' | 'neture' | 'checkout') => void;
}) {
  const FILTERS: Array<{ key: 'all' | 'neture' | 'checkout'; label: string }> = [
    { key: 'all', label: '전체' },
    { key: 'neture', label: 'Neture 주문' },
    { key: 'checkout', label: '이벤트/서비스 주문' },
  ];

  return (
    <div style={styles.unifiedCard}>
      <div style={styles.unifiedHeader}>
        <div>
          <h2 style={styles.unifiedTitle}>통합 주문 보기</h2>
          <p style={styles.unifiedSubtitle}>
            Neture 주문과 이벤트 오퍼·서비스 주문을 한 곳에서 확인합니다. (읽기 전용 · 총 {total}건)
          </p>
        </div>
        <div style={styles.filterRow}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onChangeFilter(f.key)}
              style={{
                ...styles.filterBtn,
                ...(sourceFilter === f.key ? styles.filterBtnActive : {}),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.unifiedLoading}>주문을 불러오는 중...</div>
      ) : orders.length === 0 ? (
        <div style={styles.unifiedEmpty}>표시할 주문이 없습니다.</div>
      ) : (
        <div style={styles.unifiedList}>
          {orders.map((o) => {
            const badge = SOURCE_BADGE[o.orderType] || SOURCE_BADGE.service_checkout;
            const firstItem = o.itemsPreview[0]?.name;
            const itemLabel = firstItem
              ? o.itemCount > 1 ? `${firstItem} 외 ${o.itemCount - 1}건` : firstItem
              : `${o.itemCount}개 상품`;
            return (
              <div key={`${o.source}-${o.id}`} style={styles.orderRow}>
                <div style={styles.orderMain}>
                  <div style={styles.orderTopLine}>
                    <span style={{ ...styles.sourceBadge, backgroundColor: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <span style={styles.orderNumber}>{o.orderNumber || o.id.slice(0, 8)}</span>
                    {o.status && (
                      <span style={styles.orderStatus}>{ORDER_STATUS_LABEL[o.status] || o.status}</span>
                    )}
                  </div>
                  <p style={styles.orderItems}>{itemLabel}</p>
                  <p style={styles.orderMeta}>
                    {o.buyerOrganizationName || o.buyerName || '구매자 정보 없음'}
                    {' · '}
                    {formatDate(o.createdAt)}
                  </p>
                </div>
                <div style={styles.orderRight}>
                  <p style={styles.orderTotal}>{formatKRW(o.totalAmount)}</p>
                  <p style={styles.orderShipping}>배송비 {formatKRW(o.shippingFee)}</p>
                  {o.canFulfill && o.fulfillmentUrl ? (
                    <Link to={o.fulfillmentUrl} style={styles.orderActionBtn}>
                      주문 처리 <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <span style={styles.orderReadonly} title={o.readOnlyReason || '읽기 전용'}>
                      <Lock size={12} /> 읽기 전용
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={styles.unifiedFootnote}>
        이벤트 오퍼·서비스 주문은 checkout_orders 기반으로, 현재 화면에서는 확인만 가능합니다.
        배송 처리·송장·정산 통합은 후속 작업에서 다룹니다.
      </p>
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
  // WO-O4O-NETURE-SUPPLIER-ORDER-WORKSPACE-IA-LINK-V1
  fulfillCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '18px 22px',
    marginBottom: '24px',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  fulfillIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fulfillTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  fulfillText: {
    fontSize: '13px',
    color: '#475569',
    margin: 0,
    lineHeight: 1.6,
  },
  fulfillNote: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 16px 0',
  },
  // WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1
  unifiedCard: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px 22px',
    marginBottom: '24px',
  },
  unifiedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  unifiedTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  unifiedSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  filterRow: {
    display: 'flex',
    gap: '6px',
  },
  filterBtn: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
  },
  filterBtnActive: {
    color: '#fff',
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  unifiedLoading: {
    textAlign: 'center',
    padding: '32px',
    color: '#64748b',
    fontSize: '14px',
  },
  unifiedEmpty: {
    textAlign: 'center',
    padding: '32px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  unifiedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  orderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px 16px',
  },
  orderMain: {
    flex: 1,
    minWidth: 0,
  },
  orderTopLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '6px',
  },
  sourceBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
  },
  orderNumber: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1e293b',
  },
  orderStatus: {
    fontSize: '12px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  orderItems: {
    fontSize: '13px',
    color: '#475569',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  orderMeta: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  orderRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  orderTotal: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  orderShipping: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  orderActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    padding: '6px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    marginTop: '4px',
  },
  orderReadonly: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  unifiedFootnote: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '16px 0 0 0',
    lineHeight: 1.6,
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
