/**
 * MyContentPage - 내 콘텐츠 관리
 *
 * WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1
 * WO-APP-DASHBOARD-KPI-PHASE4A-V1: KPI 카드 + 정렬 + 안내 메시지
 * WO-APP-DASHBOARD-KPI-PHASE4B-V1: 제안 액션 버튼 (운영 보조)
 *
 * 허브에서 복사한 콘텐츠를 관리하는 대시보드 페이지
 * - KPI 미니 대시보드 (전체/공개/조회수/추천)
 * - 정렬: 최근순 / 조회순 / 추천순
 * - 상태 필터: 전체 / 임시저장 / 공개 / 보관
 * - 액션: 편집(제목/설명) / 공개 / 보관 / 삭제
 * - 카드별 제안 액션 (Phase 4B)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { dashboardApi, type DashboardAsset, type DashboardSortType, type DashboardKpi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { colors, typography } from '../../styles/theme';

type StatusFilter = 'all' | 'draft' | 'active' | 'archived';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: '전체',
  draft: '임시저장',
  active: '공개',
  archived: '보관',
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

  const dashboardId = user?.id;

  // KPI 로드
  useEffect(() => {
    if (!dashboardId) return;
    dashboardApi.getKpi(dashboardId)
      .then(res => setKpi(res.data))
      .catch(() => {});
  }, [dashboardId]);

  const loadAssets = useCallback(async () => {
    if (!dashboardId) return;
    try {
      setLoading(true);
      const statusParam = filter === 'all' ? undefined : filter;
      const res = await dashboardApi.listAssets(dashboardId, { status: statusParam, sort });
      setAssets(res.data || []);
    } catch (err) {
      console.warn('Failed to load dashboard assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, filter, sort]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

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
      alert('수정에 실패했습니다.');
    } finally {
      setActionLoading(null);
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
    } catch (err) {
      alert('공개에 실패했습니다.');
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
    } catch (err) {
      alert('공개에 실패했습니다.');
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
      alert('보관에 실패했습니다.');
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
      alert('삭제에 실패했습니다.');
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

      {/* 정렬 + 상태 필터 */}
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

      {assets.length === 0 ? (
        <div>
          <EmptyState
            icon="📦"
            title="아직 가져온 콘텐츠가 없습니다"
            description="콘텐츠 허브에서 콘텐츠를 가져오세요."
          />
          <div style={{ textAlign: 'center', marginTop: '-16px', paddingBottom: '24px' }}>
            <Link to="/news" style={styles.hubLink}>
              콘텐츠 허브로 이동 →
            </Link>
          </div>
        </div>
      ) : (
        <div style={styles.list}>
          {assets.map(asset => {
            const suggested = getSuggestedAction(asset);
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
                  <>
                    <div style={styles.cardHeader}>
                      <span style={{
                        ...styles.statusBadge,
                        ...STATUS_BADGE_STYLES[asset.status],
                      }}>
                        {STATUS_BADGE_LABELS[asset.status]}
                      </span>
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
                  </>
                )}
              </Card>
            );
          })}
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
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterTab: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    border: '1px solid transparent',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
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
};
