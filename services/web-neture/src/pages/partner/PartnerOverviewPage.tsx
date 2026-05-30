/**
 * PartnerOverviewPage - 파트너 운영 허브
 *
 * Work Order: WO-NETURE-PARTNER-DASHBOARD-HUB
 *
 * 파트너 역할:
 * - 공급자와의 협업 상태 확인
 * - 연결된 서비스별 현황 확인
 * - 각 서비스로 이동하여 상세 작업 수행
 *
 * 허브 개념:
 * - Neture는 파트너의 운영 허브
 * - 전체 현황 파악 및 이동 지점
 * - 상세 분석/처리는 각 서비스에서
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Info, ExternalLink, Users, Megaphone, ArrowRight, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Paperclip, X, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { AiSummaryButton } from '../../components/ai';
import { dashboardApi, partnerDashboardApi, type PartnerDashboardSummary, type PartnerDashboardItem, type BrowsableContent, type LinkedContent } from '../../lib/api';

// WO-O4O-SHARED-PACKAGES-GLUCOSEVIEW-RESIDUE-CLEANUP-V1: glucoseview URL/icon/label entries 제거
// 서비스 URL 설정
const SERVICE_URLS: Record<string, string> = {
  glycopharm: 'https://glycopharm.co.kr/partner',
  'k-cosmetics': 'https://k-cosmetics.site/partner',
};

// 서비스 아이콘 설정
const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
};

// 빈 데이터 상태 컴포넌트
function EmptyState({ message }: { message: string }) {
  return (
    <div style={styles.emptyState}>
      <AlertCircle size={40} style={{ color: '#94a3b8', marginBottom: '16px' }} />
      <p style={styles.emptyStateText}>{message}</p>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  cgm_device: 'CGM 기기',
  test_strip: '시험지',
  lancet: '란셋',
  meter: '측정기',
  accessory: '액세서리',
  other: '기타',
};

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'k-cosmetics': 'K-Cosmetics',
};

type SortOption = 'recent' | 'oldest' | 'name';

export function PartnerOverviewPage() {
  const [summary, setSummary] = useState<PartnerDashboardSummary | null>(null);
  const [dashboardItems, setDashboardItems] = useState<PartnerDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Content linking modal state (WO-PARTNER-CONTENT-LINK-PHASE1-V1)
  const [contentModalItemId, setContentModalItemId] = useState<string | null>(null);
  const [browsableContents, setBrowsableContents] = useState<BrowsableContent[]>([]);
  const [linkedContents, setLinkedContents] = useState<LinkedContent[]>([]);
  const [contentSourceFilter, setContentSourceFilter] = useState<'all' | 'cms' | 'supplier'>('all');
  const [contentLoading, setContentLoading] = useState(false);
  const [linkingContentId, setLinkingContentId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, items] = await Promise.all([
        dashboardApi.getPartnerDashboardSummary(),
        partnerDashboardApi.getItems(),
      ]);
      setSummary(summaryData);
      setDashboardItems(items);
    } catch (error) {
      console.error('Failed to fetch partner dashboard data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sorted + grouped dashboard items (WO-PARTNER-DASHBOARD-UX-PHASE2-V1)
  const groupedItems = useMemo(() => {
    const sorted = [...dashboardItems].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.productName.localeCompare(b.productName, 'ko');
        default: // recent
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    const groups = new Map<string, PartnerDashboardItem[]>();
    for (const item of sorted) {
      const key = item.serviceId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return groups;
  }, [dashboardItems, sortBy]);

  const toggleGroup = (serviceId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const handleToggleStatus = async (item: PartnerDashboardItem) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    setTogglingIds((prev) => new Set(prev).add(item.id));

    // Optimistic update
    setDashboardItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)),
    );

    try {
      await partnerDashboardApi.toggleStatus(item.id, newStatus);
      setToastMessage(newStatus === 'active' ? '활성화되었습니다' : '비활성화되었습니다');
    } catch {
      // Revert on error
      setDashboardItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)),
      );
      setToastMessage('상태 변경에 실패했습니다');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Content modal handlers (WO-PARTNER-CONTENT-LINK-PHASE1-V1)
  const openContentModal = async (itemId: string) => {
    setContentModalItemId(itemId);
    setContentLoading(true);
    setContentSourceFilter('all');
    try {
      const [allContents, linked] = await Promise.all([
        partnerDashboardApi.browseContents(),
        partnerDashboardApi.getLinkedContents(itemId),
      ]);
      setBrowsableContents(allContents);
      setLinkedContents(linked);
    } catch {
      setBrowsableContents([]);
      setLinkedContents([]);
    }
    setContentLoading(false);
  };

  const closeContentModal = () => {
    setContentModalItemId(null);
    setBrowsableContents([]);
    setLinkedContents([]);
  };

  const handleLinkContent = async (content: BrowsableContent) => {
    if (!contentModalItemId) return;
    setLinkingContentId(content.id);
    try {
      const result = await partnerDashboardApi.linkContent(contentModalItemId, content.id, content.source);
      if (result.already_linked) {
        setToastMessage('이미 연결된 자료입니다');
      } else {
        // Re-fetch linked contents
        const linked = await partnerDashboardApi.getLinkedContents(contentModalItemId);
        setLinkedContents(linked);
        // Update contentCount in dashboard items
        setDashboardItems((prev) =>
          prev.map((i) => (i.id === contentModalItemId ? { ...i, contentCount: (i.contentCount || 0) + 1 } : i)),
        );
        setToastMessage('자료가 연결되었습니다');
      }
    } catch {
      setToastMessage('연결에 실패했습니다');
    }
    setLinkingContentId(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUnlinkContent = async (linkId: string) => {
    if (!contentModalItemId) return;
    try {
      await partnerDashboardApi.unlinkContent(contentModalItemId, linkId);
      setLinkedContents((prev) => prev.filter((l) => l.linkId !== linkId));
      setDashboardItems((prev) =>
        prev.map((i) => (i.id === contentModalItemId ? { ...i, contentCount: Math.max(0, (i.contentCount || 0) - 1) } : i)),
      );
      setToastMessage('연결이 해제되었습니다');
    } catch {
      setToastMessage('해제에 실패했습니다');
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMoveContent = async (index: number, direction: 'up' | 'down') => {
    if (!contentModalItemId) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= linkedContents.length) return;

    // Optimistic reorder
    const reordered = [...linkedContents];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setLinkedContents(reordered);

    try {
      await partnerDashboardApi.reorderContents(contentModalItemId, reordered.map((lc) => lc.linkId));
    } catch {
      // Revert on error
      const reverted = await partnerDashboardApi.getLinkedContents(contentModalItemId);
      setLinkedContents(reverted);
      setToastMessage('순서 변경에 실패했습니다');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleSetPrimary = async (linkId: string) => {
    if (!contentModalItemId) return;

    // Optimistic update
    setLinkedContents((prev) =>
      prev.map((lc) => ({ ...lc, isPrimary: lc.linkId === linkId })),
    );

    try {
      await partnerDashboardApi.setPrimaryContent(contentModalItemId, linkId);
    } catch {
      // Revert on error
      const reverted = await partnerDashboardApi.getLinkedContents(contentModalItemId);
      setLinkedContents(reverted);
      setToastMessage('대표 자료 지정에 실패했습니다');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const linkedContentIds = useMemo(
    () => new Set(linkedContents.map((l) => `${l.contentSource}:${l.contentId}`)),
    [linkedContents],
  );

  const filteredBrowsableContents = useMemo(
    () => contentSourceFilter === 'all' ? browsableContents : browsableContents.filter((c) => c.source === contentSourceFilter),
    [browsableContents, contentSourceFilter],
  );

  const hasConnectedServices = summary?.connectedServices && summary.connectedServices.length > 0;
  const hasNotifications = summary?.notifications && summary.notifications.length > 0;

  const stats = summary?.stats || {
    connectedServiceCount: 0,
    totalSupplierCount: 0,
    openRequests: 0,
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <Compass size={28} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h1 style={styles.title}>파트너 운영 허브</h1>
            <p style={styles.subtitle}>
              연결된 서비스 현황을 확인하고, 필요한 서비스로 바로 이동합니다
            </p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchData} style={styles.refreshButton} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <AiSummaryButton contextLabel="파트너 운영 현황" />
        </div>
      </div>

      {/* Hub Concept Info */}
      <div style={styles.infoCard}>
        <Info size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
        <div>
          <p style={styles.infoCardText}>
            <strong>Neture는 파트너의 운영 허브입니다.</strong><br />
            협업 중인 공급자와 서비스 현황을 한눈에 확인하고,
            상세 작업이 필요한 서비스로 바로 이동할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div style={styles.statsRow}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...styles.statCard, opacity: 0.5 }}>
              <div style={{ width: 24, height: 24, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
              <div>
                <p style={styles.statValue}>-</p>
                <p style={styles.statLabel}>로딩 중...</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <Users size={24} style={{ color: '#2563eb' }} />
            <div>
              <p style={styles.statValue}>{stats.connectedServiceCount}</p>
              <p style={styles.statLabel}>연결된 서비스</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <Users size={24} style={{ color: '#16a34a' }} />
            <div>
              <p style={styles.statValue}>{stats.totalSupplierCount}</p>
              <p style={styles.statLabel}>협업 공급자</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <Megaphone size={24} style={{ color: '#f59e0b' }} />
            <div>
              <p style={styles.statValue}>{stats.openRequests}</p>
              <p style={styles.statLabel}>진행 중 요청</p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={styles.notificationSection}>
        <h2 style={styles.sectionTitle}>확인이 필요한 항목</h2>
        {loading ? (
          <p style={styles.loadingText}>로딩 중...</p>
        ) : !hasNotifications ? (
          <EmptyState message="자료가 없습니다. 현재 확인이 필요한 항목이 없습니다." />
        ) : (
          <div style={styles.notificationList}>
            {summary!.notifications.map((noti, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.notificationItem,
                  backgroundColor: noti.type === 'success' ? '#f0fdf4' : '#eff6ff',
                  borderColor: noti.type === 'success' ? '#86efac' : '#bfdbfe',
                }}
              >
                <span style={styles.notificationIcon}>
                  {noti.type === 'success' ? '💰' : '📬'}
                </span>
                <span style={styles.notificationText}>{noti.text}</span>
                <Link to={noti.link} style={styles.notificationAction}>
                  확인하기
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 내가 소개하는 제품 (WO-PARTNER-DASHBOARD-UX-PHASE2-V1) */}
      <div style={styles.notificationSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>내가 소개하는 제품</h2>
          {dashboardItems.length > 0 && !loading && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                color: '#475569',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="recent">최근 추가순</option>
              <option value="oldest">오래된 순</option>
              <option value="name">제품명 A-Z</option>
            </select>
          )}
        </div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...styles.statCard, opacity: 0.5, height: '100px' }} />
            ))}
          </div>
        ) : dashboardItems.length === 0 ? (
          <div style={{ ...styles.emptyStateContainer, padding: '40px' }}>
            <p style={styles.emptyStateDescription}>
              아직 소개 중인 제품이 없습니다.
            </p>
            <Link
              to="/partner/dashboard"
              style={{ display: 'inline-block', marginTop: '12px', fontSize: '14px', color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}
            >
              파트너 모집 제품 보기 &rarr;
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from(groupedItems.entries()).map(([serviceId, items]) => (
              <div key={serviceId} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff' }}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(serviceId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '14px 18px',
                    border: 'none',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    borderBottom: collapsedGroups.has(serviceId) ? 'none' : '1px solid #e2e8f0',
                  }}
                >
                  {collapsedGroups.has(serviceId) ? <ChevronRight size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    {SERVICE_LABELS[serviceId] || serviceId}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>
                    ({items.length})
                  </span>
                </button>

                {/* Group Items */}
                {!collapsedGroups.has(serviceId) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', padding: '14px' }}>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          ...styles.statCard,
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '8px',
                          opacity: item.status === 'inactive' ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: item.status === 'inactive' ? '#94a3b8' : '#1e293b' }}>
                            {item.productName}
                          </h4>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: item.status === 'active' ? '#f0fdf4' : '#f1f5f9',
                            color: item.status === 'active' ? '#16a34a' : '#94a3b8',
                          }}>
                            {item.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
                          <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                          <span>{item.price.toLocaleString()}원</span>
                        </div>
                        {item.pharmacyName && (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>공급: {item.pharmacyName}</span>
                        )}
                        {/* Primary content summary (WO-PARTNER-CONTENT-PRESENTATION-PHASE3-V1) */}
                        {item.primaryContent && (
                          <div
                            onClick={() => openContentModal(item.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 10px', borderRadius: '6px',
                              backgroundColor: '#faf5ff', border: '1px solid #ede9fe',
                              cursor: 'pointer', width: '100%',
                            }}
                          >
                            <Star size={12} fill="#f59e0b" color="#f59e0b" style={{ flexShrink: 0 }} />
                            <span style={{
                              fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', flexShrink: 0,
                              backgroundColor: item.primaryContent.contentSource === 'cms' ? '#eff6ff' : '#f0fdf4',
                              color: item.primaryContent.contentSource === 'cms' ? '#2563eb' : '#16a34a',
                            }}>
                              {item.primaryContent.contentSource === 'cms' ? '운영자' : '공급자'}
                            </span>
                            <span style={{
                              fontSize: '12px', color: '#6b21a8', fontWeight: 500,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                            }}>
                              {item.primaryContent.title}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={togglingIds.has(item.id)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              backgroundColor: '#fff',
                              color: item.status === 'active' ? '#64748b' : '#7c3aed',
                              cursor: togglingIds.has(item.id) ? 'wait' : 'pointer',
                            }}
                          >
                            {togglingIds.has(item.id) ? '변경 중...' : item.status === 'active' ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => openContentModal(item.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              backgroundColor: '#fff',
                              color: '#7c3aed',
                              cursor: 'pointer',
                            }}
                          >
                            <Paperclip size={12} />
                            자료 연결
                            {(item.contentCount || 0) > 0 && (
                              <span style={{
                                marginLeft: '2px',
                                padding: '0 5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                borderRadius: '8px',
                                backgroundColor: '#7c3aed',
                                color: '#fff',
                              }}>
                                {item.contentCount}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          backgroundColor: '#1e293b',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toastMessage}
        </div>
      )}

      {/* Service Entry Cards */}
      <div style={styles.serviceSection}>
        <h2 style={styles.sectionTitle}>서비스별 운영 현황</h2>
        {loading ? (
          <p style={styles.loadingText}>로딩 중...</p>
        ) : !hasConnectedServices ? (
          <div style={styles.emptyStateContainer}>
            <div style={styles.emptyStateIcon}>
              <Compass size={40} style={{ color: '#94a3b8' }} />
            </div>
            <h3 style={styles.emptyStateTitle}>자료가 없습니다</h3>
            <p style={styles.emptyStateDescription}>
              아직 연결된 서비스가 없습니다.<br />
              공급자와 협업이 시작되면, 해당 서비스가 이곳에 자동으로 표시됩니다.
            </p>
          </div>
        ) : (
          <div style={styles.serviceList}>
            {summary!.connectedServices.map((service) => (
              <div key={service.serviceId} style={styles.serviceCard}>
                <div style={styles.serviceHeader}>
                  <div style={styles.serviceInfo}>
                    <span style={styles.serviceIcon}>
                      {SERVICE_ICONS[service.serviceId] || '📦'}
                    </span>
                    <div>
                      <h3 style={styles.serviceName}>{service.serviceName}</h3>
                      <div style={styles.serviceStats}>
                        <span style={styles.serviceStat}>
                          <Users size={14} />
                          {service.supplierCount}개 공급자
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.serviceActions}>
                    <p style={styles.lastActivity}>최근 활동: {service.lastActivity}</p>
                    <a
                      href={SERVICE_URLS[service.serviceId] || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.serviceLink}
                    >
                      {service.serviceName} 파트너 페이지로 이동
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.quickSection}>
        <h2 style={styles.sectionTitle}>빠른 액션</h2>
        <div style={styles.quickGrid}>
          <Link to="/partner/collaboration" style={styles.quickCard}>
            <span style={styles.quickIcon}>🤝</span>
            <span style={styles.quickLabel}>협업 관리</span>
            <span style={styles.quickDesc}>공급자 연결 및 계약</span>
          </Link>
          <Link to="/partner/promotions" style={styles.quickCard}>
            <span style={styles.quickIcon}>📢</span>
            <span style={styles.quickLabel}>프로모션</span>
            <span style={styles.quickDesc}>캠페인 현황 확인</span>
          </Link>
          <Link to="/partner/settlements" style={styles.quickCard}>
            <span style={styles.quickIcon}>💳</span>
            <span style={styles.quickLabel}>정산 내역</span>
            <span style={styles.quickDesc}>커미션 및 정산</span>
          </Link>
        </div>
      </div>

      {/* Role Separation Notice */}
      <div style={styles.roleNotice}>
        <div style={styles.roleNoticeContent}>
          <span style={styles.roleNoticeBadge}>책임 분리</span>
          <p style={styles.roleNoticeText}>
            <strong>Neture</strong>: 전체 현황 확인 및 이동 &nbsp;|&nbsp;
            <strong>각 서비스</strong>: 상세 협업, 캠페인 관리, 정산 처리
          </p>
        </div>
      </div>

      {/* Content Linking Modal (WO-PARTNER-CONTENT-LINK-PHASE1-V1) */}
      {contentModalItemId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }} onClick={closeContentModal}>
          <div
            style={{
              backgroundColor: '#fff', borderRadius: '16px', width: '600px', maxHeight: '80vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>자료 연결</h3>
              <button onClick={closeContentModal} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Source filter tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: '1px solid #f1f5f9' }}>
              {[
                { value: 'all' as const, label: '전체' },
                { value: 'cms' as const, label: '운영자' },
                { value: 'supplier' as const, label: '공급자' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setContentSourceFilter(tab.value)}
                  style={{
                    padding: '6px 14px', fontSize: '13px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer',
                    backgroundColor: contentSourceFilter === tab.value ? '#7c3aed' : '#f1f5f9',
                    color: contentSourceFilter === tab.value ? '#fff' : '#64748b',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Linked contents section — ordered list with reorder & primary (WO-PARTNER-CONTENT-ORDER-PHASE2-V1) */}
            {linkedContents.length > 0 && (
              <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#faf5ff' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>연결된 자료 ({linkedContents.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {linkedContents.map((lc, idx) => (
                    <div key={lc.linkId} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 10px', fontSize: '13px', backgroundColor: lc.isPrimary ? '#f5f3ff' : '#fff',
                      border: lc.isPrimary ? '1px solid #c4b5fd' : '1px solid #e9d5ff', borderRadius: '6px',
                    }}>
                      {/* Star toggle */}
                      <button
                        onClick={() => handleSetPrimary(lc.linkId)}
                        title={lc.isPrimary ? '대표 자료' : '대표로 지정'}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      >
                        <Star size={14} fill={lc.isPrimary ? '#f59e0b' : 'none'} color={lc.isPrimary ? '#f59e0b' : '#d1d5db'} />
                      </button>
                      {/* Title */}
                      <span style={{ flex: 1, color: '#6b21a8', fontWeight: lc.isPrimary ? 600 : 400 }}>
                        {lc.title.length > 30 ? lc.title.slice(0, 30) + '...' : lc.title}
                      </span>
                      {/* Source badge */}
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px',
                        backgroundColor: lc.contentSource === 'cms' ? '#eff6ff' : '#f0fdf4',
                        color: lc.contentSource === 'cms' ? '#2563eb' : '#16a34a',
                      }}>
                        {lc.contentSource === 'cms' ? '운영자' : '공급자'}
                      </span>
                      {/* Up/Down arrows */}
                      <button
                        onClick={() => handleMoveContent(idx, 'up')}
                        disabled={idx === 0}
                        style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px', display: 'flex', opacity: idx === 0 ? 0.3 : 1 }}
                      >
                        <ArrowUp size={14} color="#64748b" />
                      </button>
                      <button
                        onClick={() => handleMoveContent(idx, 'down')}
                        disabled={idx === linkedContents.length - 1}
                        style={{ border: 'none', background: 'none', cursor: idx === linkedContents.length - 1 ? 'default' : 'pointer', padding: '2px', display: 'flex', opacity: idx === linkedContents.length - 1 ? 0.3 : 1 }}
                      >
                        <ArrowDown size={14} color="#64748b" />
                      </button>
                      {/* Unlink */}
                      <button
                        onClick={() => handleUnlinkContent(lc.linkId)}
                        title="연결 해제"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      >
                        <X size={14} color="#9333ea" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Browsable content list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
              {contentLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>로딩 중...</div>
              ) : filteredBrowsableContents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>사용 가능한 콘텐츠가 없습니다</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredBrowsableContents.map((content) => {
                    const isLinked = linkedContentIds.has(`${content.source}:${content.id}`);
                    return (
                      <div
                        key={`${content.source}:${content.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                          backgroundColor: isLinked ? '#faf5ff' : '#fff',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px',
                              backgroundColor: content.source === 'cms' ? '#eff6ff' : '#f0fdf4',
                              color: content.source === 'cms' ? '#2563eb' : '#16a34a',
                            }}>
                              {content.source === 'cms' ? '운영자' : '공급자'}
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>{content.type}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{content.title}</p>
                          {content.summary && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                              {content.summary.length > 60 ? content.summary.slice(0, 60) + '...' : content.summary}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => !isLinked && handleLinkContent(content)}
                          disabled={isLinked || linkingContentId === content.id}
                          style={{
                            padding: '6px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: isLinked ? 'default' : 'pointer',
                            backgroundColor: isLinked ? '#e9d5ff' : '#7c3aed',
                            color: isLinked ? '#7c3aed' : '#fff',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {linkingContentId === content.id ? '연결 중...' : isLinked ? '연결됨' : '연결'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
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
  notificationSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 16px 0',
  },
  loadingText: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px',
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '10px',
    border: '1px solid',
  },
  notificationIcon: {
    fontSize: '18px',
  },
  notificationText: {
    flex: 1,
    fontSize: '14px',
    color: '#1e293b',
  },
  notificationAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
  },
  serviceSection: {
    marginBottom: '24px',
  },
  serviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  serviceHeader: {
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
  serviceStats: {
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
  serviceActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  lastActivity: {
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
    backgroundColor: '#2563eb',
    padding: '8px 14px',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },
  emptyStateContainer: {
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
  emptyStateDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  quickSection: {
    marginBottom: '24px',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  quickCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    textDecoration: 'none',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  quickIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  quickLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '4px',
  },
  quickDesc: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
  },
  roleNotice: {
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
