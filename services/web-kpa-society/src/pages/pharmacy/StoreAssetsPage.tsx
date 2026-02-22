/**
 * StoreAssetsPage — 매장 자산 운영 대시보드 (KPA wrapper)
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1: thin wrapper over @o4o/store-asset-policy-core
 *
 * Data fetching and API calls remain here.
 * Policy, filtering, sorting, and rendering delegated to StoreAssetsPanel.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StoreAssetsPanel,
  canToggleStatus,
  type StoreAssetItem,
  type AssetPublishStatus,
} from '@o4o/store-asset-policy-core';
import { storeAssetControlApi } from '../../api/assetSnapshot';

export default function StoreAssetsPage() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
  );
}
