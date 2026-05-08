/**
 * StoreAssetsPage — 매장 자산 운영 대시보드 (KPA wrapper)
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1: thin wrapper over @o4o/store-asset-policy-core
 * WO-O4O-STORE-CONTENT-DIRECT-DETAIL-EDIT-UX-V1: direct 콘텐츠 섹션 추가
 *
 * Data fetching and API calls remain here.
 * Policy, filtering, sorting, and rendering delegated to StoreAssetsPanel.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  StoreAssetsPanel,
  canToggleStatus,
  type StoreAssetItem,
  type AssetPublishStatus,
} from '@o4o/store-asset-policy-core';
import { storeAssetControlApi, directContentApi } from '../../api/assetSnapshot';
import { FileText, ChevronRight, Loader2 } from 'lucide-react';

interface DirectListItem {
  id: string;
  sourceType: string;
  snapshotId: string | null;
  title: string;
  updatedAt: string;
  shareStatus: string | null;
  sharedAt: string | null;
  sharedRequestId: string | null;
}

export default function StoreAssetsPage() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // direct 콘텐츠 목록
  const [directItems, setDirectItems] = useState<DirectListItem[]>([]);
  const [directLoading, setDirectLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeAssetControlApi.list({ limit: 200 });
      setAllItems(res.data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDirectItems = useCallback(async () => {
    setDirectLoading(true);
    try {
      const res = await directContentApi.list();
      // source_type='direct' 인 항목만 필터링
      const direct = (res.data || []).filter((item) => item.sourceType === 'direct');
      setDirectItems(direct);
    } catch {
      // silent — direct 콘텐츠 없거나 org 미등록인 경우 무시
      setDirectItems([]);
    } finally {
      setDirectLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchDirectItems();
  }, [fetchItems, fetchDirectItems]);

  const handleToggleStatus = useCallback(async (item: StoreAssetItem) => {
    if (item.isForced) return;
    if (!canToggleStatus(item)) return;

    const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const currentIdx = cycle.indexOf(item.publishStatus);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];

    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(item.id, nextStatus);
      setAllItems(prev =>
        prev.map(it =>
          it.id === item.id ? { ...it, publishStatus: res.data.publishStatus } : it,
        ),
      );
    } catch {
      // Silently fail — user can retry
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleEdit = useCallback((snapshotId: string) => {
    navigate(`/store/content/${snapshotId}/edit`);
  }, [navigate]);

  return (
    <>
      {/* ── 내 매장 콘텐츠 (direct) 섹션 ── */}
      {(directItems.length > 0 || directLoading) && (
        <div className="max-w-4xl mx-auto px-6 pt-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              내 매장 콘텐츠
              <span className="text-xs font-normal text-slate-400 ml-1">AI 생성 · 직접 작성</span>
            </h2>
          </div>

          {directLoading ? (
            <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              불러오는 중...
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {directItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/store/content/direct/${item.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors no-underline group"
                >
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 flex-shrink-0">
                    내 매장
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                    {item.title}
                  </span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 기존 snapshot-based 자산 목록 ── */}
      <StoreAssetsPanel
        items={allItems}
        loading={loading}
        error={error}
        updatingId={updatingId}
        onRefresh={fetchItems}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
        dashboardPath="/store"
        contentListPath="/store/content"
      />
    </>
  );
}
