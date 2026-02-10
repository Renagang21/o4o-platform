/**
 * MyContentPage - 내 콘텐츠 관리 (Neture)
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
import { useAuth } from '../../contexts/AuthContext';
import { contentAssetApi, type DashboardAsset, type DashboardSortType, type DashboardKpi } from '../../lib/api';

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
    const copiedDate = asset.copiedAt ? new Date(asset.copiedAt) : null;
    const daysSinceCopy = copiedDate ? (Date.now() - copiedDate.getTime()) / (1000 * 60 * 60 * 24) : 0;
    if (daysSinceCopy >= 14) {
      return { message: '보관을 고려해보세요.', actionLabel: '보관하기', actionType: 'archive' };
    }
    return { message: '설명을 보완해보세요.', actionLabel: '설명 수정', actionType: 'edit' };
  }
  return null;
}

export default function MyContentPage() {
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
    contentAssetApi.getKpi(dashboardId)
      .then(res => setKpi(res.data))
      .catch(() => {});
  }, [dashboardId]);

  // 판매자 행동 신호: 세션 1회 조회
  useEffect(() => {
    if (sessionStorage.getItem('supplier_signal_dismissed')) return;
    contentAssetApi.getSupplierSignal()
      .then(res => { if (res.hasApprovedSupplier) setSupplierSignal(true); })
      .catch(() => {});
  }, []);

  // Phase 6: 항상 전체 조회, 클라이언트 필터링
  const loadAssets = useCallback(async () => {
    if (!dashboardId) return;
    try {
      setLoading(true);
      const res = await contentAssetApi.listAssets(dashboardId, { sort });
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
        if (action === 'publish') await contentAssetApi.publishAsset(id, dashboardId);
        else if (action === 'archive') await contentAssetApi.archiveAsset(id, dashboardId);
        else await contentAssetApi.deleteAsset(id, dashboardId);
        success++;
      } catch {
        fail++;
      }
    }

    alert(`${ids.length}개 중 ${success}개 처리 완료${fail > 0 ? ` (${fail}개 실패)` : ''}`);
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
      await contentAssetApi.updateAsset(id, {
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
      await contentAssetApi.publishAsset(id, dashboardId);
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'active' as const } : a
      ));
      dismissSupplierSignal();
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
      await contentAssetApi.publishAsset(id, dashboardId);
      setAssets(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'active' as const } : a
      ));
      dismissSupplierSignal();
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
      await contentAssetApi.archiveAsset(id, dashboardId);
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
      await contentAssetApi.deleteAsset(id, dashboardId);
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('삭제에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-xl text-gray-500">로그인이 필요합니다</p>
        <p className="text-gray-400 mt-2">내 콘텐츠를 관리하려면 로그인하세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">내 콘텐츠를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">내 콘텐츠</h1>
        <p className="text-gray-500 mt-1">허브에서 가져온 콘텐츠를 관리하세요.</p>
      </div>

      {/* KPI 미니 대시보드 */}
      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-gray-900">{kpi.totalAssets}</span>
            <span className="text-xs text-gray-500 font-medium">전체 자산</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-green-600">{kpi.activeAssets}</span>
            <span className="text-xs text-gray-500 font-medium">공개 중</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-gray-900">{kpi.recentViewsSum}</span>
            <span className="text-xs text-gray-500 font-medium">최근 7일 조회</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-1">
            {kpi.topRecommended ? (
              <>
                <span className="text-base font-bold text-gray-900 text-center truncate w-full">
                  {kpi.topRecommended.title.length > 12
                    ? kpi.topRecommended.title.slice(0, 12) + '...'
                    : kpi.topRecommended.title}
                </span>
                <span className="text-xs text-gray-500 font-medium">추천 {kpi.topRecommended.recommendCount}회</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-gray-400">-</span>
                <span className="text-xs text-gray-500 font-medium">추천 콘텐츠</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 판매자 행동 신호 + 선택적 제안 */}
      {supplierSignal && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium mb-4">
          승인된 공급자와 연결된 자산이 있습니다.
          {suggestionShown && (
            <div className="flex items-center gap-2 mt-1.5">
              <Link
                to="/content"
                className="text-green-600 underline underline-offset-2 text-xs"
                onClick={() => { setSuggestionShown(false); sessionStorage.setItem('supplier_suggestion_dismissed', '1'); }}
              >
                연결된 공급자의 지원 자료를 확인할 수 있습니다.
              </Link>
              <button
                className="text-green-400 hover:text-green-600 text-xs leading-none"
                onClick={() => { setSuggestionShown(false); sessionStorage.setItem('supplier_suggestion_dismissed', '1'); }}
                aria-label="닫기"
              >✕</button>
            </div>
          )}
        </div>
      )}

      {/* 정렬 + 상태 필터 + 전체 선택 */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(key => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {STATUS_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {/* Phase 6: 전체 선택 */}
          {filteredAssets.length > 0 && (
            <label className="flex items-center gap-1 text-sm text-gray-600 font-medium cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
                onChange={toggleSelectAll}
                className="accent-primary-600"
              />
              전체 선택
            </label>
          )}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as DashboardSortType)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {(Object.keys(SORT_LABELS) as DashboardSortType[]).map(key => (
              <option key={key} value={key}>{SORT_LABELS[key]}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-xl text-gray-500 mb-2">
            {assets.length === 0 ? '아직 가져온 콘텐츠가 없습니다' : '해당 조건에 맞는 콘텐츠가 없습니다'}
          </p>
          <p className="text-gray-400 mb-6">
            {assets.length === 0 ? '콘텐츠 허브에서 콘텐츠를 가져오세요.' : '다른 필터를 선택해보세요.'}
          </p>
          {assets.length === 0 && (
            <Link
              to="/content"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              콘텐츠 허브로 이동
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map(asset => {
            const suggested = getSuggestedAction(asset);
            const isSelected = selectedIds.has(asset.id);
            return (
              <div key={asset.id} className="bg-white border border-gray-200 rounded-lg p-5">
                {editingId === asset.id ? (
                  /* 편집 모드 */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                      <textarea
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(asset.id)}
                        disabled={actionLoading === asset.id}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                      >
                        {actionLoading === asset.id ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 보기 모드 */
                  <div className="flex gap-3 items-start">
                    {/* Phase 6: 체크박스 */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(asset.id)}
                      className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0 accent-primary-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="px-2.5 py-0.5 rounded text-xs font-medium"
                            style={STATUS_BADGE_STYLES[asset.status]}
                          >
                            {STATUS_BADGE_LABELS[asset.status]}
                          </span>
                          {/* Phase 5: 노출 위치 배지 */}
                          {asset.status === 'active' && asset.exposure && asset.exposure.length > 0 && asset.exposure.map(loc => {
                            const cfg = EXPOSURE_BADGE_CONFIG[loc];
                            if (!cfg) return null;
                            return (
                              <span key={loc} className="px-2 py-0.5 rounded text-[11px] font-medium"
                                style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                {cfg.label}
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 items-center">
                          {(asset.viewCount || 0) > 0 && (
                            <span className="text-xs text-gray-500 font-medium">조회 {asset.viewCount}</span>
                          )}
                          {(asset.recommendCount || 0) > 0 && (
                            <span className="text-xs text-gray-500 font-medium">추천 {asset.recommendCount}</span>
                          )}
                          {asset.copiedAt && (
                            <span className="text-xs text-gray-400">
                              {new Date(asset.copiedAt).toLocaleDateString('ko-KR')} 복사
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">{asset.title}</h3>
                      {asset.description && (
                        <p className="text-sm text-gray-500 mb-1 line-clamp-2">{asset.description}</p>
                      )}
                      {/* Phase 4B: 제안 액션 바 */}
                      {suggested && (
                        <div className="flex items-center justify-between gap-3 bg-blue-50 px-3 py-2 rounded-md mt-2">
                          <span className="text-sm text-blue-600 leading-snug flex-1">{suggested.message}</span>
                          {suggested.actionLabel && suggested.actionType && (
                            <button
                              disabled={actionLoading === asset.id}
                              className="px-3 py-1 text-xs font-semibold rounded border border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 whitespace-nowrap"
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
                      <div className="flex gap-2 flex-wrap mt-3">
                        <button
                          onClick={() => startEdit(asset)}
                          disabled={actionLoading === asset.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          &#9998; 편집
                        </button>
                        {asset.status !== 'active' && (
                          <button
                            onClick={() => handlePublish(asset.id)}
                            disabled={actionLoading === asset.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                          >
                            &#127760; 공개
                          </button>
                        )}
                        {asset.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(asset.id)}
                            disabled={actionLoading === asset.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            &#128230; 보관
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(asset.id)}
                          disabled={actionLoading === asset.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          &#128465; 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Phase 6: 일괄 액션 바 */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 flex items-center gap-2.5 px-5 py-3 bg-gray-800 text-white rounded-xl mt-4 shadow-lg flex-wrap">
          <span className="text-sm font-semibold mr-1">{selectedIds.size}개 선택</span>
          <button
            onClick={() => handleBulkAction('publish')}
            disabled={bulkLoading}
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-white/25 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
          >
            {bulkLoading ? '처리 중...' : '공개하기'}
          </button>
          <button
            onClick={() => handleBulkAction('archive')}
            disabled={bulkLoading}
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-white/25 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
          >
            {bulkLoading ? '처리 중...' : '보관하기'}
          </button>
          <button
            onClick={() => handleBulkAction('delete')}
            disabled={bulkLoading}
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-red-300 text-red-300 hover:bg-red-900/30 disabled:opacity-50"
          >
            {bulkLoading ? '처리 중...' : '삭제하기'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkLoading}
            className="ml-auto px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white/90"
          >
            선택 해제
          </button>
        </div>
      )}
    </div>
  );
}
