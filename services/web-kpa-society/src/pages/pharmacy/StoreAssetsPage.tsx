/**
 * StoreAssetsPage — 매장 자산 운영 대시보드 (KPA wrapper)
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1: thin wrapper over @o4o/store-asset-policy-core
 * WO-O4O-KPA-STORE-ASSETS-PAGE-DIRECT-SECTION-REMOVE-V1: direct 콘텐츠 섹션 제거
 *   → StoreLibraryContentsPage(/store/library/contents)가 canonical 편집 진입점
 *
 * Data fetching and API calls remain here.
 * Policy, filtering, sorting, and rendering delegated to StoreAssetsPanel.
 *
 * WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1:
 *   게시 상태 변경(단건/일괄) 실패를 catch 에서 삼켜 사용자가 성공 여부를 알 수 없던 문제 수정.
 *   조회 오류는 StoreAssetsPanel 의 error 계약(오류 + 다시 시도)이 이미 처리하므로 그대로 두고,
 *   mutation 오류만 래퍼 상단 인라인 배너로 안내한다(공통 패키지 미변경).
 *   실패 시 publishStatus 는 갱신하지 않으므로 기존 상태가 그대로 보존된다.
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
  // WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1: 게시 상태 변경 실패 안내(조회 error 와 분리)
  const [actionError, setActionError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggleStatus = useCallback(async (item: StoreAssetItem) => {
    if (item.isForced) return;
    if (!canToggleStatus(item)) return;

    const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const currentIdx = cycle.indexOf(item.publishStatus);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];

    setUpdatingId(item.id);
    setActionError(null);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(item.id, nextStatus);
      setAllItems(prev =>
        prev.map(it =>
          it.id === item.id ? { ...it, publishStatus: res.data.publishStatus } : it,
        ),
      );
    } catch {
      // 실패 시 publishStatus 를 갱신하지 않아 이전 상태가 그대로 유지된다(성공으로 표시하지 않음).
      setActionError('게시 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleEdit = useCallback((snapshotId: string) => {
    navigate(`/store/content/${snapshotId}/edit`);
  }, [navigate]);

  const handleBulkStatusChange = useCallback(async (ids: string[], status: AssetPublishStatus) => {
    setActionError(null);
    const results = await Promise.allSettled(
      ids.map(id => storeAssetControlApi.updatePublishStatus(id, status)),
    );
    const succeededIds = new Set(
      ids.filter((_, i) => results[i].status === 'fulfilled'),
    );
    if (succeededIds.size > 0) {
      setAllItems(prev =>
        prev.map(it => succeededIds.has(it.id) ? { ...it, publishStatus: status } : it),
      );
    }
    // 부분 실패도 조용히 넘기지 않는다 — 실패한 항목은 이전 상태가 유지된 채 건수를 안내한다.
    const failedCount = ids.length - succeededIds.size;
    if (failedCount > 0) {
      setActionError(
        `${failedCount}건의 게시 상태를 변경하지 못했습니다. 해당 항목은 이전 상태로 남아 있습니다.`,
      );
    }
  }, []);

  return (
    <>
      {actionError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            margin: '0 0 12px',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #FECACA',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            fontSize: '0.85rem',
          }}
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#991B1B',
              cursor: 'pointer',
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            닫기
          </button>
        </div>
      )}
      <StoreAssetsPanel
        items={allItems}
        loading={loading}
        error={error}
        updatingId={updatingId}
        onRefresh={fetchItems}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
        onBulkStatusChange={handleBulkStatusChange}
        dashboardPath="/store"
        contentListPath="/store/content"
      />
    </>
  );
}
