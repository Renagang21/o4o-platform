/**
 * StoreAssetsPage — 매장 자산 통합 페이지
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (pagination)
 * WO-O4O-ASSET-COPY-NETURE-PILOT-V1 (sourceService column)
 * WO-KPA-A-HUB-TO-STORE-CLONE-FLOW-V2: ?tab= URL 파라미터 지원
 * WO-KPA-A-STORE-IA-REALIGN-PHASE1-V1: StoreHubPage KPI 흡수, 단일 자산 진입점
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V1: publish 상태 배지 + 토글
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V2: forced 배지, locked 표시, 기간 노출
 *
 * 구조:
 * ├─ KPI 요약 (상품/콘텐츠/사이니지 집계)
 * ├─ 탭 (전체/CMS/사이니지)
 * └─ 자산 목록 (publish 상태 + forced/locked 표시, 페이지네이션)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Monitor,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  LayoutGrid,
  Tv,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import {
  storeAssetControlApi,
  type StoreAssetItem,
  type AssetPublishStatus,
} from '../../api/assetSnapshot';
import { fetchStoreHubOverview, type StoreHubOverview } from '../../api/storeHub';

type TabKey = 'all' | 'cms' | 'signage';

const PAGE_LIMIT = 20;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

const SERVICE_LABELS: Record<string, string> = {
  kpa: 'KPA',
  neture: 'Neture',
};

const STATUS_CONFIG: Record<AssetPublishStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-600' },
  published: { label: '게시됨', bg: 'bg-green-50', text: 'text-green-700' },
  hidden: { label: '숨김', bg: 'bg-orange-50', text: 'text-orange-700' },
};

function parseTabParam(value: string | null): TabKey {
  if (value === 'cms' || value === 'signage') return value;
  return 'all';
}

export default function StoreAssetsPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(() => parseTabParam(searchParams.get('tab')));
  const [items, setItems] = useState<StoreAssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<StoreHubOverview | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assetType = activeTab === 'all' ? undefined : activeTab;
      const res = await storeAssetControlApi.list({ type: assetType, page, limit: PAGE_LIMIT });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // KPI overview (fire-and-forget, non-blocking)
  useEffect(() => {
    let cancelled = false;
    fetchStoreHubOverview()
      .then(data => { if (!cancelled) setOverview(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Publish status toggle: draft → published → hidden → draft
  // Blocked for forced items
  const handleToggleStatus = async (item: StoreAssetItem) => {
    if (item.isForced) return;

    const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const currentIdx = cycle.indexOf(item.publishStatus);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];

    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(item.id, nextStatus);
      setItems(prev =>
        prev.map(it =>
          it.id === item.id
            ? { ...it, publishStatus: res.data.publishStatus }
            : it,
        ),
      );
    } catch {
      // Silently fail — user can retry
    } finally {
      setUpdatingId(null);
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
    { key: 'all', label: '전체', icon: FileText },
    { key: 'cms', label: 'CMS 콘텐츠', icon: FileText },
    { key: 'signage', label: '사이니지', icon: Monitor },
  ];

  const productCount = overview
    ? (overview.products.glycopharm.totalCount + overview.products.cosmetics.listedCount)
    : null;
  const contentCount = overview?.contents.totalSlotCount ?? null;
  const signageCount = overview?.signage.pharmacy.contentCount ?? null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to="/pharmacy/dashboard" className="text-blue-600 hover:underline">&larr; 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">매장 자산</h1>
          <p className="text-sm text-slate-500 mt-1">매장의 상품·콘텐츠·사이니지 자산을 한눈에 확인하고 게시 상태를 관리합니다</p>
        </div>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* KPI Summary */}
      {overview && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <KpiCard icon={Package} label="상품" count={productCount} unit="건" />
          <KpiCard icon={LayoutGrid} label="콘텐츠 슬롯" count={contentCount} unit="개" />
          <KpiCard
            icon={Tv}
            label="사이니지"
            count={signageCount}
            unit="건"
            extra={`활성 ${overview.signage.pharmacy.activeCount}건`}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          자산 목록을 불러오는 중...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchItems} className="mt-3 text-sm text-blue-600 hover:underline">
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-sm">복사된 자산이 없습니다.</p>
          <p className="text-xs mt-1">커뮤니티 콘텐츠/사이니지 관리에서 "매장으로 복사" 버튼을 이용해주세요.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">출처</th>
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium w-24">상태</th>
                  <th className="px-4 py-3 font-medium w-28">복사일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const statusCfg = STATUS_CONFIG[item.publishStatus] || STATUS_CONFIG.draft;
                  const isUpdating = updatingId === item.id;
                  const isForced = item.isForced;
                  const isLocked = item.isLocked;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isForced ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.assetType === 'cms'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {item.assetType === 'cms' ? 'CMS' : '사이니지'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {SERVICE_LABELS[item.sourceService] || item.sourceService}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-md">
                          {item.title}
                        </div>
                        {/* Forced injection badge */}
                        {isForced && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                              <ShieldAlert className="w-3 h-3" />
                              강제노출
                            </span>
                            {isLocked && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                            {(item.forcedStartAt || item.forcedEndAt) && (
                              <span className="text-[10px] text-slate-400">
                                {formatShortDate(item.forcedStartAt)} ~ {formatShortDate(item.forcedEndAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isForced ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 cursor-not-allowed opacity-70"
                            title="관리자 강제노출 - 변경 불가"
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            {statusCfg.label}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={isUpdating}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${statusCfg.bg} ${statusCfg.text}`}
                            title="클릭하여 상태 변경"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            {statusCfg.label}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>총 {total}건 · {page}/{totalPages} 페이지</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, count, unit, extra }: {
  icon: typeof Package;
  label: string;
  count: number | null;
  unit: string;
  extra?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="text-xl font-semibold text-slate-900">
        {count !== null ? `${count}${unit}` : '—'}
      </div>
      {extra && <div className="text-xs text-slate-400 mt-1">{extra}</div>}
    </div>
  );
}
