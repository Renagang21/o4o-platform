/**
 * MyContentPage - 내 콘텐츠 관리
 *
 * WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1
 * WO-APP-DASHBOARD-KPI-PHASE4A-V1: KPI 카드 + 정렬 + 안내 메시지
 * WO-APP-DASHBOARD-KPI-PHASE4B-V1: 제안 액션 버튼 (운영 보조)
 * WO-APP-DASHBOARD-EXPOSURE-PHASE5-V1: 노출 위치 배지
 * WO-APP-DASHBOARD-BULK-MANAGE-PHASE6-V1: 일괄 정리/관리
 *
 * 허브에서 복사한 콘텐츠를 관리하는 대시보드 페이지
 * - KPI 미니 대시보드 (전체/공개/조회수/추천)
 * - 정렬: 최근순 / 조회순 / 추천순
 * - 상태 필터: 전체 / 임시저장 / 공개 / 보관 / 조회0 / 30일+
 * - 다중 선택 + 일괄 공개/보관/삭제 (Phase 6)
 * - 액션: 편집(제목/설명) / 공개 / 보관 / 삭제
 * - 카드별 제안 액션 (Phase 4B)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { dashboardApi, type DashboardAsset, type DashboardSortType, type DashboardKpi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { colors, typography } from '../../styles/theme';

type StatusFilter = 'all' | 'draft' | 'active' | 'archived' | 'zero_views' | 'inactive_30d';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: '전체',
  draft: '임시저장',
  active: '공개',
  archived: '보관',
  zero_views: '조회 0',
  inactive_30d: '30일+ 미사용',
};

const STATUS_BADGE_STYLES: Record<'draft' | 'active' | 'archived', React.CSSProperties> = {
  draft: { backgroundColor: '#F1F5F9', color: '#64748B' },
  active: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  archived: { backgroundColor: '#FEF3C7', color: '#D97706' },
};

const STATUS_BADGE_LABELS: Record<'draft' | 'active' | 'archived', string> = {
  draft: '임시저장',
  active: '공개',
  archived: '보관',
};

const EXPOSURE_BADGE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  home: { label: '매장 홈', bg: '#EFF6FF', color: '#2563EB' },
  signage: { label: '사이니지', bg: '#F0FDF4', color: '#16A34A' },
  promo: { label: '프로모션', bg: '#FFF7ED', color: '#EA580C' },
};

const SORT_LABELS: Record<DashboardSortType, string> = {
  recent: '최근순',
  views: '조회순',
  recommend: '추천순',
};

/**
 * Phase 4B: 제안 액션 (메시지 + CTA 버튼)
 */
interface SuggestedAction {
  message: string;
  actionLabel?: string;
  actionType?: 'publish' | 'archive' | 'edit';
}

function getSuggestedAction(asset: DashboardAsset): SuggestedAction | null {
  if (asset.status === 'draft') {
    return { message: '공개하면 활용할 수 있습니다.', actionLabel: '공개하기', actionType: 'publish' };
  }
  if (asset.status === 'active' && (asset.recommendCount || 0) >= 3) {
    return { message: '인기 콘텐츠입니다.' };
  }
  if (asset.status === 'active' && (asset.viewCount || 0) === 0) {
    // 14일 이상 된 자산이면 보관 제안, 아니면 설명 보완 제안
    const copiedDate = asset.copiedAt ? new Date(asset.copiedAt) : null;
    const daysSinceCopy = copiedDate ? (Date.now() - copiedDate.getTime()) / (1000 * 60 * 60 * 24) : 0;
    if (daysSinceCopy >= 14) {
      return { message: '보관을 고려해보세요.', actionLabel: '보관하기', actionType: 'archive' };
    }
    return { message: '설명을 보완해보세요.', actionLabel: '설명 수정', actionType: 'edit' };
  }
  return null;
}

export function MyContentPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<DashboardSortType>('recent');
  const [kpi, setKpi] = useState<DashboardKpi | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Phase 6: 다중 선택 + 일괄 액션
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // 판매자 행동 신호 + 선택적 제안
  const [supplierSignal, setSupplierSignal] = useState(false);
  const [suggestionShown, setSuggestionShown] = useState(
    () => !sessionStorage.getItem('supplier_suggestion_dismissed')
  );

  const dashboardId = user?.id;

  // KPI 로드
  useEffect(() => {
    if (!dashboardId) return;
    dashboardApi.getKpi(dashboardId)
      .then(res => setKpi(res.data))
      .catch(() => {});
  }, [dashboardId]);

  // 판매자 행동 신호: 세션 1회 조회
  useEffect(() => {
    if (sessionStorage.getItem('supplier_signal_dismissed')) return;
    dashboardApi.getSupplierSignal()
      .then(res => { if (res.hasApprovedSupplier) setSupplierSignal(true); })
      .catch(() => {});
  }, []);

  // Phase 6: 항상 전체 조회, 클라이언트 필터링
  const loadAssets = useCallback(async () => {
    if (!dashboardId) return;
    try {
      setLoading(true);
      const res = await dashboardApi.listAssets(dashboardId, { sort });
      setAssets(res.data || []);
    } catch (err) {
      console.warn('Failed to load dashboard assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, sort]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Phase 6: 필터/정렬 변경 시 선택 해제
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, sort]);

  // Phase 6: 클라이언트 필터링
  const filteredAssets = useMemo(() => {
    if (filter === 'all') return assets;
    if (filter === 'draft' || filter === 'active' || filter === 'archived') {
      return assets.filter(a => a.status === filter);
    }
    if (filter === 'zero_views') {
      return assets.filter(a => a.status === 'active' && (a.viewCount || 0) === 0);
    }
    if (filter === 'inactive_30d') {
      return assets.filter(a => {
        const copied = a.copiedAt ? new Date(a.copiedAt) : null;
        const days = copied ? (Date.now() - copied.getTime()) / (1000 * 60 * 60 * 24) : 0;
        return days >= 30;
      });
    }
    return assets;
  }, [assets, filter]);

  // Phase 6: 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAssets.length && filteredAssets.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  // Phase 6: 일괄 액션
  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (bulkLoading || !dashboardId) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action !== 'publish') {
      const label = action === 'archive' ? '보관' : '삭제';
      if (!confirm(`선택한 ${ids.length}개를 ${label}하시겠습니까?`)) return;
    }

    setBulkLoading(true);
    let success = 0;
    let fail = 0;

    for (const id of ids) {
      try {
        if (action === 'publish') await dashboardApi.publishAsset(id, dashboardId);
        else if (action === 'archive') await dashboardApi.archiveAsset(id, dashboardId);
        else await dashboardApi.deleteAsset(id, dashboardId);
        success++;
      } catch {
        fail++;
      }
    }

    toast.success(`${ids.length}개 중 ${success}개 처리 완료${fail > 0 ? ` (${fail}개 실패)` : ''}`);
    setSelectedIds(new Set());
    setBulkLoading(false);
    loadAssets();
  };

  const startEdit = (asset: DashboardAsset) => {
    setEditingId(asset.id);
    setEditTitle(asset.title);
    setEditDescription(asset.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
  };

  const saveEdit = async (id: string) => {
    if (!dashboardId) return;
    try {
      setActionLoading(id);
      await dashboardApi.updateAsset(id, {
        dashboardId,
        title: editTitle,
        description: editDescription,
      });
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, title: editTitle, description: editDescription } : a
      ));
      cancelEdit();
    } catch (err) {
      toast.error('수정에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 판매자 행동 신호 숨기기 (자산 배치/공개 등 행동 시)
  const dismissSupplierSignal = () => {
    if (supplierSignal) {
      setSupplierSignal(false);
      sessionStorage.setItem('supplier_signal_dismissed', '1');
    }
  };

  // Phase 4B: CTA에서 호출 (confirm 생략)
  const handleQuickPublish = async (id: string) => {
    if (!dashboardId) return;
    try {
      setActionLoading(id);
      await dashboardApi.publishAsset(id, dashboardId);
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'active' as const } : a
      ));
      dismissSupplierSignal();
    } catch (err) {
      toast.error('공개에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: string) => {
    if (!dashboardId) return;
    if (!confirm('이 콘텐츠를 공개하시겠습니까?')) return;
    try {
      setActionLoading(id);
      await dashboardApi.publishAsset(id, dashboardId);
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'active' as const } : a
      ));
      dismissSupplierSignal();
    } catch (err) {
      toast.error('공개에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string) => {
    if (!dashboardId) return;
    if (!confirm('이 콘텐츠를 보관하시겠습니까?')) return;
    try {
      setActionLoading(id);
      await dashboardApi.archiveAsset(id, dashboardId);
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'archived' as const } : a
      ));
    } catch (err) {
      toast.error('보관에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!dashboardId) return;
    if (!confirm('이 콘텐츠를 삭제하시겠습니까? (보관 처리됩니다)')) return;
    try {
      setActionLoading(id);
      await dashboardApi.deleteAsset(id, dashboardId);
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="내 콘텐츠를 관리하려면 로그인하세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="내 콘텐츠를 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="내 콘텐츠"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '내 콘텐츠' },
        ]}
      />

      {/* KPI 미니 대시보드 */}
      {kpi && (
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <span style={styles.kpiValue}>{kpi.totalAssets}</span>
            <span style={styles.kpiLabel}>전체 자산</span>
          </div>
          <div style={{ ...styles.kpiCard, ...styles.kpiCardActive }}>
            <span style={{ ...styles.kpiValue, color: '#16A34A' }}>{kpi.activeAssets}</span>
            <span style={styles.kpiLabel}>공개 중</span>
          </div>
          <div style={styles.kpiCard}>
            <span style={styles.kpiValue}>{kpi.recentViewsSum}</span>
            <span style={styles.kpiLabel}>최근 7일 조회</span>
          </div>
          <div style={styles.kpiCard}>
            {kpi.topRecommended ? (
              <>
                <span style={{ ...styles.kpiValue, fontSize: '16px' }}>
                  {kpi.topRecommended.title.length > 12
                    ? kpi.topRecommended.title.slice(0, 12) + '...'
                    : kpi.topRecommended.title}
                </span>
                <span style={styles.kpiLabel}>추천 {kpi.topRecommended.recommendCount}회</span>
              </>
            ) : (
              <>
                <span style={{ ...styles.kpiValue, color: colors.neutral400 }}>-</span>
                <span style={styles.kpiLabel}>추천 콘텐츠</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 판매자 행동 신호 + 선택적 제안 */}
      {supplierSignal && (
        <div style={styles.supplierSignal}>
          승인된 공급자와 연결된 자산이 있습니다.
          {suggestionShown && (
            <div style={styles.suggestionRow}>
              <Link
                to="/content"
                style={styles.suggestionLink}
                onClick={() => {
                  setSuggestionShown(false);
                  sessionStorage.setItem('supplier_suggestion_dismissed', '1');
                }}
              >
                연결된 공급자의 지원 자료를 확인할 수 있습니다.
              </Link>
              <button
                style={styles.suggestionDismiss}
                onClick={() => {
                  setSuggestionShown(false);
                  sessionStorage.setItem('supplier_suggestion_dismissed', '1');
                }}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* 정렬 + 상태 필터 + 전체 선택 */}
      <div style={styles.controlBar}>
        <div style={styles.filterTabs}>
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(key => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                ...styles.filterTab,
                ...(filter === key ? styles.filterTabActive : {}),
              }}
            >
              {STATUS_LABELS[key]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Phase 6: 전체 선택 */}
          {filteredAssets.length > 0 && (
            <label style={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
                onChange={toggleSelectAll}
                style={{ marginRight: '4px' }}
              />
              전체 선택
            </label>
          )}
          <div style={styles.sortDropdown}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as DashboardSortType)}
              style={styles.sortSelect}
            >
              {(Object.keys(SORT_LABELS) as DashboardSortType[]).map(key => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div>
          <EmptyState
            icon="📦"
            title={assets.length === 0 ? '아직 가져온 콘텐츠가 없습니다' : '해당 조건에 맞는 콘텐츠가 없습니다'}
            description={assets.length === 0 ? '콘텐츠 허브에서 콘텐츠를 가져오세요.' : '다른 필터를 선택해보세요.'}
          />
          {assets.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '-16px', paddingBottom: '24px' }}>
              <Link to="/content" style={styles.hubLink}>
                콘텐츠 허브로 이동 →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {filteredAssets.map(asset => {
            const suggested = getSuggestedAction(asset);
            const isSelected = selectedIds.has(asset.id);
            return (
              <Card key={asset.id} padding="medium">
                {editingId === asset.id ? (
                  /* 편집 모드 */
                  <div style={styles.editForm}>
                    <label style={styles.editLabel}>제목</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={styles.editInput}
                    />
                    <label style={{ ...styles.editLabel, marginTop: '12px' }}>설명</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      style={styles.editTextarea}
                      rows={3}
                    />
                    <div style={styles.editActions}>
                      <button
                        onClick={() => saveEdit(asset.id)}
                        disabled={actionLoading === asset.id}
                        style={styles.saveButton}
                      >
                        {actionLoading === asset.id ? '저장 중...' : '저장'}
                      </button>
                      <button onClick={cancelEdit} style={styles.cancelButton}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 보기 모드 */
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Phase 6: 체크박스 */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(asset.id)}
                      style={styles.cardCheckbox}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.cardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            ...styles.statusBadge,
                            ...STATUS_BADGE_STYLES[asset.status],
                          }}>
                            {STATUS_BADGE_LABELS[asset.status]}
                          </span>
                          {/* Phase 5: 노출 위치 배지 */}
                          {asset.status === 'active' && asset.exposure && asset.exposure.length > 0 && asset.exposure.map(loc => {
                            const cfg = EXPOSURE_BADGE_CONFIG[loc];
                            if (!cfg) return null;
                            return (
                              <span key={loc} style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                fontWeight: 500, backgroundColor: cfg.bg, color: cfg.color,
                              }}>
                                {cfg.label}
                              </span>
                            );
                          })}
                        </div>
                        <div style={styles.cardMeta}>
                          {(asset.viewCount || 0) > 0 && (
                            <span style={styles.metaItem}>조회 {asset.viewCount}</span>
                          )}
                          {(asset.recommendCount || 0) > 0 && (
                            <span style={styles.metaItem}>추천 {asset.recommendCount}</span>
                          )}
                          {asset.copiedAt && (
                            <span style={styles.copiedAt}>
                              {new Date(asset.copiedAt).toLocaleDateString('ko-KR')} 복사
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 style={styles.assetTitle}>{asset.title}</h3>
                      {asset.description && (
                        <p style={styles.assetDescription}>{asset.description}</p>
                      )}
                      {/* Phase 4B: 제안 액션 바 */}
                      {suggested && (
                        <div style={styles.suggestedBar}>
                          <span style={styles.suggestedMessage}>{suggested.message}</span>
                          {suggested.actionLabel && suggested.actionType && (
                            <button
                              disabled={actionLoading === asset.id}
                              style={styles.suggestedButton}
                              onClick={() => {
                                if (suggested.actionType === 'publish') handleQuickPublish(asset.id);
                                else if (suggested.actionType === 'archive') handleArchive(asset.id);
                                else if (suggested.actionType === 'edit') startEdit(asset);
                              }}
                            >
                              {actionLoading === asset.id ? '처리 중...' : suggested.actionLabel}
                            </button>
                          )}
                        </div>
                      )}
                      <div style={styles.cardActions}>
                        <button
                          onClick={() => startEdit(asset)}
                          disabled={actionLoading === asset.id}
                          style={styles.actionButton}
                        >
                          ✏️ 편집
                        </button>
                        {asset.status !== 'active' && (
                          <button
                            onClick={() => handlePublish(asset.id)}
                            disabled={actionLoading === asset.id}
                            style={{ ...styles.actionButton, ...styles.publishButton }}
                          >
                            🌐 공개
                          </button>
                        )}
                        {asset.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(asset.id)}
                            disabled={actionLoading === asset.id}
                            style={styles.actionButton}
                          >
                            📦 보관
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(asset.id)}
                          disabled={actionLoading === asset.id}
                          style={{ ...styles.actionButton, ...styles.deleteButton }}
                        >
                          🗑 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Phase 6: 일괄 액션 바 */}
      {selectedIds.size > 0 && (
        <div style={styles.bulkBar}>
          <span style={styles.bulkCount}>{selectedIds.size}개 선택</span>
          <button
            onClick={() => handleBulkAction('publish')}
            disabled={bulkLoading}
            style={styles.bulkButton}
          >
            {bulkLoading ? '처리 중...' : '공개하기'}
          </button>
          <button
            onClick={() => handleBulkAction('archive')}
            disabled={bulkLoading}
            style={styles.bulkButton}
          >
            {bulkLoading ? '처리 중...' : '보관하기'}
          </button>
          <button
            onClick={() => handleBulkAction('delete')}
            disabled={bulkLoading}
            style={{ ...styles.bulkButton, ...styles.bulkDeleteButton }}
          >
            {bulkLoading ? '처리 중...' : '삭제하기'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkLoading}
            style={styles.bulkCancelButton}
          >
            선택 해제
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  kpiCardActive: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  kpiLabel: {
    fontSize: '12px',
    color: colors.neutral500,
    fontWeight: 500,
  },
  controlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  filterTabs: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterTab: {
    padding: '6px 14px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    border: '1px solid transparent',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  selectAllLabel: {
    fontSize: '13px',
    color: colors.neutral600,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap' as const,
  },
  sortDropdown: {
    flexShrink: 0,
  },
  sortSelect: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: `1px solid ${colors.neutral300}`,
    backgroundColor: colors.white,
    color: colors.neutral700,
    cursor: 'pointer',
    outline: 'none',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardCheckbox: {
    marginTop: '4px',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    flexShrink: 0,
    accentColor: colors.primary,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  metaItem: {
    fontSize: '12px',
    color: colors.neutral500,
    fontWeight: 500,
  },
  statusBadge: {
    padding: '2px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  copiedAt: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  assetTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: '0 0 4px',
  },
  assetDescription: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: '0 0 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  suggestedBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: '#EFF6FF',
    padding: '8px 12px',
    borderRadius: '6px',
    margin: '8px 0 0',
  },
  suggestedMessage: {
    fontSize: '13px',
    color: '#2563EB',
    lineHeight: '1.4',
    flex: 1,
  },
  suggestedButton: {
    padding: '5px 14px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '5px',
    border: '1px solid #93C5FD',
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    border: `1px solid ${colors.neutral200}`,
    backgroundColor: colors.white,
    color: colors.neutral700,
    cursor: 'pointer',
  },
  publishButton: {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    borderColor: '#BFDBFE',
  },
  deleteButton: {
    color: colors.accentRed,
    borderColor: '#FECACA',
  },
  hubLink: {
    display: 'inline-block',
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  editLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '4px',
  },
  editInput: {
    padding: '8px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  editTextarea: {
    padding: '8px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  editActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  saveButton: {
    padding: '8px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  // 판매자 행동 신호 + 선택적 제안
  supplierSignal: {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#15803D',
    fontWeight: 500,
    marginBottom: '16px',
  },
  suggestionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  suggestionLink: {
    fontSize: '12px',
    color: '#166534',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  suggestionDismiss: {
    background: 'none',
    border: 'none',
    color: '#86EFAC',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  // Phase 6: 일괄 액션 바
  bulkBar: {
    position: 'sticky' as const,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    backgroundColor: '#1E293B',
    color: '#fff',
    borderRadius: '10px',
    marginTop: '16px',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.15)',
    flexWrap: 'wrap',
  },
  bulkCount: {
    fontSize: '14px',
    fontWeight: 600,
    marginRight: '4px',
  },
  bulkButton: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
  },
  bulkDeleteButton: {
    borderColor: '#FCA5A5',
    color: '#FCA5A5',
  },
  bulkCancelButton: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
};
