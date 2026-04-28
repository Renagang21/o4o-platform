/**
 * EventOfferManagePage - 이벤트 운영자 관리 페이지
 *
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 안정화
 * WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1: UX 개선
 *   - 이벤트 추가: offer 드롭다운 선택 (UUID 직접 입력 제거)
 *   - 상태 필터: 전체/노출중/숨김
 *   - 제목/공급사 검색 (프론트 필터)
 *   - 노출/숨김/목록 제외 액션 명확화
 *   - 정렬 UI 제거 (display_order 저장 구조 없음)
 *   - 모든 액션에 toast + 로딩 처리
 */

import { useState, useEffect } from 'react';
import { toast } from '@o4o/error-handling';
import { colors } from '../../../styles/theme';
import {
  eventOfferAdminApi,
  type GroupbuyProduct,
  type GroupbuyStats,
  type GroupbuyApiError,
  type AvailableOffer,
} from '../../../api/eventOfferAdmin';

type StatusFilter = 'all' | 'visible' | 'hidden';

// WO-O4O-EVENT-OFFER-CORE-REFORM-V1: 상태별 배지 정의
const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: '대기중', bg: '#FEF3C7', color: '#D97706' },
  approved: { label: '승인',   bg: '#D1FAE5', color: '#059669' },
  active:   { label: '진행중', bg: '#D1FAE5', color: '#059669' },
  ended:    { label: '종료',   bg: '#F3F4F6', color: '#6B7280' },
  canceled: { label: '취소',   bg: '#FEE2E2', color: '#DC2626' },
};

const PAGE_TEXT = {
  title: '이벤트 관리',
  subtitle: '서비스에 노출할 이벤트를 등록하고 표시 상태를 관리합니다.',
  addButtonLabel: '이벤트 추가',
  cancelLabel: '취소',
  statsLabel: '통계',
  addSectionTitle: '노출할 이벤트 추가',
  offerSelectPlaceholder: '등록할 이벤트를 선택하세요...',
  submitLabel: '등록하기',
  submittingLabel: '등록 중...',
  searchPlaceholder: '이벤트명 또는 공급사 검색...',
  emptyTitle: '아직 등록된 이벤트가 없습니다.',
  emptyDesc: '노출할 이벤트를 추가하면 이벤트 페이지에 표시됩니다.',
  emptyNoOffers: '등록 가능한 이벤트가 없습니다. 공급자에게 문의하세요.',
  notice: '주문·결제·배송은 공급자 시스템에서 처리되며, 본 화면에서는 상품 노출과 집계 통계만 관리합니다.',
  permissionDenied: '접근 권한이 없습니다.',
  permissionDesc: '운영자 권한이 필요합니다. 관리자에게 문의해 주세요.',
  filterAll: '전체',
  filterVisible: '노출중',
  filterHidden: '미노출',
  actionShow: '노출',
  actionHide: '미노출',
  actionRemove: '목록 제외',
  confirmRemove: (title: string) =>
    `"${title}" 을(를) 이벤트 목록에서 제외하시겠습니까?\n제외 후에도 이벤트 데이터는 보존됩니다.`,
  toastVisible: (title: string) => `"${title}" 노출 설정이 변경되었습니다.`,
  toastRemoved: (title: string) => `"${title}" 이(가) 목록에서 제외되었습니다.`,
  toastAdded: (title: string) => `"${title}" 이(가) 이벤트 목록에 추가되었습니다.`,
  toastError: '처리 중 오류가 발생했습니다.',
  statsCachePrefix: '최근 집계 기준',
  statsRefresh: '새로고침',
  statsRefreshing: '새로고침 중...',
  statsTitle: '집계 통계',
  statsTotalOrders: '총 주문 건수',
  statsTotalParticipants: '참여 약국 수',
  statsProductTitle: '상품별 주문 현황',
  statsEmpty: '현재 집계된 데이터가 없습니다.',
  statsError: '통계 집계 중입니다. 잠시 후 다시 시도해 주세요.',
} as const;

export function EventOfferManagePage() {
  // 목록 상태
  const [products, setProducts] = useState<GroupbuyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // 이벤트 추가 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [offersLoading, setOffersLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 검색/필터
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // 액션 로딩 (row ID별)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // 통계
  const [stats, setStats] = useState<GroupbuyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const isPermissionError = (err: any): boolean => {
    const apiError = err?.response?.data?.error as GroupbuyApiError | undefined;
    return (
      err?.response?.status === 401 ||
      err?.response?.status === 403 ||
      apiError?.code === 'UNAUTHORIZED' ||
      apiError?.code === 'FORBIDDEN'
    );
  };

  const isStatsUnavailable = (err: any): boolean => {
    const apiError = err?.response?.data?.error as GroupbuyApiError | undefined;
    return apiError?.code === 'STATS_UNAVAILABLE';
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const res = await eventOfferAdminApi.getProducts();
      if (res?.data) setProducts(res.data);
    } catch (err: any) {
      if (isPermissionError(err)) {
        setPermissionDenied(true);
      } else {
        setError('데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = async () => {
    setShowAddForm(true);
    setCreateError(null);
    setSelectedOfferId('');
    if (availableOffers.length > 0) return; // 이미 로드됨
    setOffersLoading(true);
    try {
      const res = await eventOfferAdminApi.getAvailableOffers();
      if (res?.data) setAvailableOffers(res.data.offers);
    } catch (err: any) {
      setCreateError('등록 가능한 이벤트 목록을 불러오지 못했습니다.');
    } finally {
      setOffersLoading(false);
    }
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setSelectedOfferId('');
    setCreateError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferId) {
      setCreateError('등록할 이벤트를 선택하세요.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await eventOfferAdminApi.addProduct({ offerId: selectedOfferId });
      if (res?.data) {
        setProducts(prev => [...prev, res.data]);
        // 등록된 offer는 available에서 제거
        setAvailableOffers(prev => prev.filter(o => o.id !== selectedOfferId));
        toast.success(PAGE_TEXT.toastAdded(res.data.title));
        closeAddForm();
      }
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as GroupbuyApiError | undefined;
      if (apiErr?.code === 'ALREADY_REGISTERED') {
        setCreateError('이미 등록된 이벤트입니다. 목록을 새로고침해 주세요.');
      } else {
        setCreateError(apiErr?.message || PAGE_TEXT.toastError);
      }
    } finally {
      setCreating(false);
    }
  };

  const setRowLoading = (id: string, value: boolean) =>
    setActionLoading(prev => ({ ...prev, [id]: value }));

  const handleToggleVisibility = async (product: GroupbuyProduct) => {
    if (actionLoading[product.id]) return;
    setRowLoading(product.id, true);
    try {
      await eventOfferAdminApi.toggleVisibility(product.id, !product.isVisible);
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, isVisible: !p.isVisible } : p)
      );
      toast.success(PAGE_TEXT.toastVisible(product.title));
    } catch (err: any) {
      toast.error(PAGE_TEXT.toastError);
    } finally {
      setRowLoading(product.id, false);
    }
  };

  const handleRemove = async (product: GroupbuyProduct) => {
    if (actionLoading[product.id]) return;
    if (!window.confirm(PAGE_TEXT.confirmRemove(product.title))) return;
    setRowLoading(product.id, true);
    try {
      await eventOfferAdminApi.removeProduct(product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
      // 제외된 offer를 available 목록에 복원 (이미 로드된 경우에만)
      setAvailableOffers(prev => {
        if (prev.length === 0) return prev; // 미로드 상태면 건드리지 않음
        return prev; // 서버 재조회 없이 유지 (간단처리)
      });
      toast.success(PAGE_TEXT.toastRemoved(product.title));
    } catch (err: any) {
      toast.error(PAGE_TEXT.toastError);
    } finally {
      setRowLoading(product.id, false);
    }
  };

  const handleRefreshStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await eventOfferAdminApi.getStats();
      if (res?.data) setStats(res.data);
    } catch (err: any) {
      setStatsError(isStatsUnavailable(err) ? PAGE_TEXT.statsError : PAGE_TEXT.toastError);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleShowStats = async () => {
    setShowStats(!showStats);
    if (!showStats && !stats) {
      await handleRefreshStats();
    }
  };

  const formatCacheTime = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    } catch { return '-'; }
  };

  // 프론트엔드 검색/필터
  const filteredProducts = products.filter(p => {
    if (statusFilter === 'visible' && !p.isVisible) return false;
    if (statusFilter === 'hidden' && p.isVisible) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q);
    }
    return true;
  });

  const visibleCount = products.filter(p => p.isVisible).length;
  const hiddenCount = products.filter(p => !p.isVisible).length;

  return (
    <div style={styles.container}>
      {/* 페이지 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{PAGE_TEXT.title}</h1>
          <p style={styles.subtitle}>{PAGE_TEXT.subtitle}</p>
        </div>
        {!permissionDenied && (
          <div style={styles.headerActions}>
            <button
              style={showAddForm ? styles.cancelButton : styles.addButton}
              onClick={showAddForm ? closeAddForm : openAddForm}
            >
              {showAddForm ? PAGE_TEXT.cancelLabel : PAGE_TEXT.addButtonLabel}
            </button>
            <button style={styles.secondaryButton} onClick={handleShowStats}>
              {PAGE_TEXT.statsLabel}
            </button>
          </div>
        )}
      </div>

      {/* 전체 오류 */}
      {error && !permissionDenied && (
        <div style={styles.errorBanner}>{error}</div>
      )}

      {/* 권한 오류 */}
      {permissionDenied && (
        <div style={styles.permissionCard}>
          <div style={styles.lockIcon}>🔒</div>
          <div style={styles.permissionTitle}>{PAGE_TEXT.permissionDenied}</div>
          <div style={styles.permissionDesc}>{PAGE_TEXT.permissionDesc}</div>
        </div>
      )}

      {!permissionDenied && (
        <>
          {/* 이벤트 추가 폼 */}
          {showAddForm && (
            <div style={styles.addFormCard}>
              <h2 style={styles.addFormTitle}>{PAGE_TEXT.addSectionTitle}</h2>
              <form onSubmit={handleCreate} style={styles.addForm}>
                {offersLoading ? (
                  <div style={styles.loadingText}>이벤트 목록을 불러오는 중...</div>
                ) : availableOffers.length === 0 ? (
                  <div style={styles.emptyOffersText}>{PAGE_TEXT.emptyNoOffers}</div>
                ) : (
                  <div style={styles.selectRow}>
                    <select
                      style={styles.offerSelect}
                      value={selectedOfferId}
                      onChange={e => setSelectedOfferId(e.target.value)}
                      disabled={creating}
                    >
                      <option value="">{PAGE_TEXT.offerSelectPlaceholder}</option>
                      {availableOffers.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.title} — {o.supplierName}
                          {o.price != null ? ` (${o.price.toLocaleString()}원)` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      style={{ ...styles.addButton, opacity: creating || !selectedOfferId ? 0.6 : 1 }}
                      disabled={creating || !selectedOfferId}
                    >
                      {creating ? PAGE_TEXT.submittingLabel : PAGE_TEXT.submitLabel}
                    </button>
                  </div>
                )}
                {createError && <div style={styles.formError}>{createError}</div>}
              </form>
            </div>
          )}

          {/* 검색 + 필터 */}
          <div style={styles.toolbar}>
            <input
              type="text"
              style={styles.searchInput}
              placeholder={PAGE_TEXT.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div style={styles.filterTabs}>
              {(['all', 'visible', 'hidden'] as StatusFilter[]).map(f => (
                <button
                  key={f}
                  style={{
                    ...styles.filterTab,
                    ...(statusFilter === f ? styles.filterTabActive : {}),
                  }}
                  onClick={() => setStatusFilter(f)}
                >
                  {f === 'all'
                    ? `${PAGE_TEXT.filterAll} (${products.length})`
                    : f === 'visible'
                    ? `${PAGE_TEXT.filterVisible} (${visibleCount})`
                    : `${PAGE_TEXT.filterHidden} (${hiddenCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* 목록 */}
          {loading ? (
            <div style={styles.loadingCard}>
              <div style={styles.loadingText}>불러오는 중...</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>🛒</div>
              <div style={styles.emptyTitle}>
                {searchQuery || statusFilter !== 'all'
                  ? '검색 결과가 없습니다.'
                  : PAGE_TEXT.emptyTitle}
              </div>
              {!searchQuery && statusFilter === 'all' && (
                <div style={styles.emptyDesc}>{PAGE_TEXT.emptyDesc}</div>
              )}
            </div>
          ) : (
            <div style={styles.listCard}>
              {/* 목록 헤더 */}
              <div style={styles.listHeader}>
                <span style={{ ...styles.col, flex: 3 }}>이벤트명</span>
                <span style={{ ...styles.col, flex: 2 }}>공급사</span>
                <span style={{ ...styles.colCenter, width: 64 }}>주문</span>
                <span style={{ ...styles.colCenter, width: 64 }}>참여</span>
                <span style={{ ...styles.colCenter, width: 80 }}>상태</span>
                <span style={{ ...styles.colCenter, width: 64 }}>등록일</span>
                <span style={{ ...styles.colRight, width: 140 }}>관리</span>
              </div>

              {/* 목록 행 */}
              {filteredProducts.map(product => {
                const isActing = !!actionLoading[product.id];
                return (
                  <div key={product.id} style={styles.listRow}>
                    <div style={{ ...styles.col, flex: 3 }}>
                      <div style={styles.productName}>{product.title}</div>
                      <div style={styles.productCond}>{product.conditionSummary}</div>
                    </div>
                    <span style={{ ...styles.col, flex: 2, color: colors.neutral600, fontSize: 13 }}>
                      {product.supplierName}
                    </span>
                    <span style={{ ...styles.colCenter, width: 64, fontWeight: 500 }}>
                      {product.orderCount}건
                    </span>
                    <span style={{ ...styles.colCenter, width: 64, color: colors.neutral600 }}>
                      {product.participantCount}곳
                    </span>
                    <span style={{ ...styles.colCenter, width: 80 }}>
                      {(() => {
                        const b = STATUS_BADGE[product.status] ?? STATUS_BADGE.pending;
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: b.bg,
                            color: b.color,
                          }}>
                            {b.label}
                          </span>
                        );
                      })()}
                    </span>
                    <span style={{ ...styles.colCenter, width: 64, fontSize: 12, color: colors.neutral500 }}>
                      {formatDate(product.startDate)}
                    </span>
                    <div style={{ ...styles.colRight, width: 140, gap: 6 }}>
                      <button
                        style={{
                          ...styles.actionBtn,
                          ...(product.isVisible ? styles.actionBtnHide : styles.actionBtnShow),
                          opacity: isActing ? 0.5 : 1,
                        }}
                        disabled={isActing}
                        onClick={() => handleToggleVisibility(product)}
                      >
                        {isActing ? '...' : product.isVisible ? PAGE_TEXT.actionHide : PAGE_TEXT.actionShow}
                      </button>
                      <button
                        style={{
                          ...styles.actionBtn,
                          ...styles.actionBtnRemove,
                          opacity: isActing ? 0.5 : 1,
                        }}
                        disabled={isActing}
                        onClick={() => handleRemove(product)}
                      >
                        {PAGE_TEXT.actionRemove}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 통계 섹션 */}
          {showStats && (
            <div style={styles.statsCard}>
              <div style={styles.statsHeader}>
                <h2 style={styles.statsTitle}>{PAGE_TEXT.statsTitle}</h2>
                {stats?.cachedAt && (
                  <span style={styles.cacheInfo}>
                    {PAGE_TEXT.statsCachePrefix} {formatCacheTime(stats.cachedAt)}
                  </span>
                )}
                <button
                  style={styles.secondaryButton}
                  onClick={handleRefreshStats}
                  disabled={statsLoading}
                >
                  {statsLoading ? PAGE_TEXT.statsRefreshing : PAGE_TEXT.statsRefresh}
                </button>
              </div>

              {statsLoading && !stats && (
                <div style={styles.loadingText}>통계 집계 중...</div>
              )}
              {statsError && !stats && (
                <div style={styles.statsErrorMsg}>{statsError}</div>
              )}
              {statsError && stats && (
                <div style={styles.warningBanner}>{statsError} (이전 캐시 표시 중)</div>
              )}
              {stats && (
                <>
                  <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                      <div style={styles.statValue}>{stats.totalOrders}</div>
                      <div style={styles.statLabel}>{PAGE_TEXT.statsTotalOrders}</div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statValue}>{stats.totalParticipants}</div>
                      <div style={styles.statLabel}>{PAGE_TEXT.statsTotalParticipants}</div>
                    </div>
                  </div>
                  {stats.productOrders.length > 0 && (
                    <div style={styles.productStatsSection}>
                      <h3 style={styles.productStatsTitle}>{PAGE_TEXT.statsProductTitle}</h3>
                      {stats.productOrders.map(item => (
                        <div key={item.productId} style={styles.productStatRow}>
                          <span>{item.productName}</span>
                          <span style={styles.orderCountBadge}>{item.orderCount}건</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {stats.totalOrders === 0 && (
                    <div style={styles.statsEmptyText}>{PAGE_TEXT.statsEmpty}</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 안내 */}
          <div style={styles.notice}>
            <strong>안내:</strong> {PAGE_TEXT.notice}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1100px' },

  // Header
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: 700, color: colors.neutral900, margin: 0 },
  subtitle: { fontSize: '13px', color: colors.neutral500, marginTop: '4px' },
  headerActions: { display: 'flex', gap: '10px', alignItems: 'center' },

  // Buttons
  addButton: {
    padding: '9px 18px',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.white,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  cancelButton: {
    padding: '9px 18px',
    backgroundColor: colors.neutral200,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '9px 16px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },

  // Error/Permission
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  permissionCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  lockIcon: { fontSize: '40px', marginBottom: '12px' },
  permissionTitle: { fontSize: '16px', fontWeight: 600, color: colors.neutral800, marginBottom: '6px' },
  permissionDesc: { fontSize: '13px', color: colors.neutral500 },

  // Add Form
  addFormCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    borderLeft: `4px solid ${colors.primary}`,
  },
  addFormTitle: { fontSize: '15px', fontWeight: 600, color: colors.neutral900, margin: '0 0 14px' },
  addForm: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  selectRow: { display: 'flex', gap: '10px', alignItems: 'center' },
  offerSelect: {
    flex: 1,
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral800,
    backgroundColor: colors.white,
    cursor: 'pointer',
  },
  formError: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  loadingText: { padding: '20px 0', color: colors.neutral500, fontSize: '14px', textAlign: 'center' as const },
  emptyOffersText: { padding: '12px 0', color: colors.neutral500, fontSize: '13px' },

  // Toolbar
  toolbar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '9px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral800,
    outline: 'none',
  },
  filterTabs: { display: 'flex', gap: '6px' },
  filterTab: {
    padding: '7px 14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '20px',
    fontSize: '13px',
    color: colors.neutral600,
    backgroundColor: colors.white,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
    fontWeight: 500,
  },

  // List
  loadingCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '64px 20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyIcon: { fontSize: '40px', marginBottom: '12px' },
  emptyTitle: { fontSize: '15px', fontWeight: 600, color: colors.neutral800, marginBottom: '6px' },
  emptyDesc: { fontSize: '13px', color: colors.neutral500 },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral100}`,
    fontSize: '11px',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.neutral50}`,
    gap: 0,
  },
  col: { display: 'flex', flexDirection: 'column' as const, paddingRight: '12px' },
  colCenter: { textAlign: 'center' as const, flexShrink: 0 },
  colRight: { display: 'flex', justifyContent: 'flex-end', flexShrink: 0 },
  productName: { fontSize: '14px', fontWeight: 500, color: colors.neutral900 },
  productCond: { fontSize: '12px', color: colors.neutral500, marginTop: '2px' },

  // Status badges
  badgeVisible: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  badgeHidden: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },

  // Action buttons
  actionBtn: {
    padding: '5px 10px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  actionBtnShow: { backgroundColor: '#D1FAE5', color: '#059669' },
  actionBtnHide: { backgroundColor: '#F3F4F6', color: '#6B7280' },
  actionBtnRemove: { backgroundColor: '#FEE2E2', color: '#DC2626' },

  // Stats
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  statsHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  statsTitle: { fontSize: '15px', fontWeight: 600, color: colors.neutral900, margin: 0, flex: 1 },
  cacheInfo: {
    fontSize: '11px',
    color: colors.neutral500,
    backgroundColor: colors.neutral100,
    padding: '3px 8px',
    borderRadius: '4px',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' },
  statCard: {
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  statValue: { fontSize: '28px', fontWeight: 700, color: colors.primary },
  statLabel: { fontSize: '13px', color: colors.neutral500, marginTop: '4px' },
  productStatsSection: { borderTop: `1px solid ${colors.neutral200}`, paddingTop: '16px' },
  productStatsTitle: { fontSize: '13px', fontWeight: 600, color: colors.neutral700, margin: '0 0 10px' },
  productStatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
    marginBottom: '6px',
    fontSize: '13px',
  },
  orderCountBadge: { fontWeight: 600, color: colors.primary },
  statsErrorMsg: { color: colors.neutral500, fontSize: '13px', padding: '20px 0', textAlign: 'center' as const },
  statsEmptyText: { color: colors.neutral500, fontSize: '13px', padding: '20px 0', textAlign: 'center' as const },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    padding: '10px 14px',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '13px',
  },

  // Notice
  notice: {
    padding: '14px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral600,
    borderLeft: `3px solid ${colors.primary}`,
    marginTop: '8px',
  },
};

export default EventOfferManagePage;
