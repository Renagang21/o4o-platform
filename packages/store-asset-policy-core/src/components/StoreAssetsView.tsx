/**
 * StoreAssetsView — 매장 자산 운영 대시보드 공통 View
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1
 *
 * KPA / K-Cosmetics / GlycoPharm 세 서비스의 StoreAssetsPage 는 화면(StoreAssetsPanel)은
 * 이미 공통이었지만 **조회·상태전이 controller 가 3벌 복제**되어 있었다
 * (KCos 94L · GP 93L 은 주석을 빼면 동일, KPA 155L 은 여기에 실패 안내 배너만 추가).
 * 이 View 가 그 controller 를 한 곳으로 모은다 — API 클라이언트만 주입받는다.
 *
 * 상태 전이 계약은 그대로다: draft → published → hidden → draft 순환,
 * isForced 항목은 전이 불가(canToggleStatus), 실패 시 publishStatus 미갱신(성공 위장 금지).
 *
 * 실패 안내는 KPA 동작(WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1)을 공통 기본값으로
 * 채택한다. 기존 KCos/GP 의 "조용한 실패"는 사용자가 결과를 알 수 없던 결함이므로 유지하지 않는다.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreAssetsPanel } from './StoreAssetsPanel';
import { canToggleStatus } from '../policy/policyGate';
import type { StoreAssetItem, AssetPublishStatus } from '../types/snapshot';

/** 서비스 API 클라이언트 계약 — 각 서비스의 storeAssetControlApi 가 이미 만족한다. */
export interface StoreAssetsViewApi {
  list(params: { limit: number }): Promise<{ data: { items?: StoreAssetItem[] } }>;
  updatePublishStatus(
    id: string,
    status: AssetPublishStatus,
  ): Promise<{ data: { publishStatus: AssetPublishStatus } }>;
}

export interface StoreAssetsViewProps {
  api: StoreAssetsViewApi;
  /** 대시보드(내 매장 홈) 경로 */
  dashboardPath: string;
  /** 콘텐츠 목록 경로 */
  contentListPath: string;
  /** 편집 진입 경로 — 기본 `${contentListPath}/${snapshotId}/edit` */
  buildEditPath?: (snapshotId: string) => string;
  /** 1회 조회 상한 (기본 200) */
  limit?: number;
}

const STATUS_CYCLE: AssetPublishStatus[] = ['draft', 'published', 'hidden'];

export function StoreAssetsView({
  api,
  dashboardPath,
  contentListPath,
  buildEditPath,
  limit = 200,
}: StoreAssetsViewProps) {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // 조회 오류(error)와 분리 — 상태 변경 실패는 목록을 지우지 않고 배너로만 알린다.
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.list({ limit });
      setAllItems(res.data.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, limit]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleToggleStatus = useCallback(
    async (item: StoreAssetItem) => {
      if (item.isForced) return;
      if (!canToggleStatus(item)) return;

      const currentIdx = STATUS_CYCLE.indexOf(item.publishStatus);
      const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

      setUpdatingId(item.id);
      setActionError(null);
      try {
        const res = await api.updatePublishStatus(item.id, nextStatus);
        setAllItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, publishStatus: res.data.publishStatus } : it,
          ),
        );
      } catch {
        // 실패 시 publishStatus 를 갱신하지 않아 이전 상태가 그대로 유지된다(성공으로 표시하지 않음).
        setActionError('게시 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setUpdatingId(null);
      }
    },
    [api],
  );

  const handleEdit = useCallback(
    (snapshotId: string) => {
      navigate(buildEditPath ? buildEditPath(snapshotId) : `${contentListPath}/${snapshotId}/edit`);
    },
    [navigate, buildEditPath, contentListPath],
  );

  const handleBulkStatusChange = useCallback(
    async (ids: string[], status: AssetPublishStatus) => {
      setActionError(null);
      const results = await Promise.allSettled(
        ids.map((id) => api.updatePublishStatus(id, status)),
      );
      const succeededIds = new Set(ids.filter((_, i) => results[i].status === 'fulfilled'));
      if (succeededIds.size > 0) {
        setAllItems((prev) =>
          prev.map((it) => (succeededIds.has(it.id) ? { ...it, publishStatus: status } : it)),
        );
      }
      // 부분 실패도 조용히 넘기지 않는다 — 실패한 항목은 이전 상태가 유지된 채 건수를 안내한다.
      const failedCount = ids.length - succeededIds.size;
      if (failedCount > 0) {
        setActionError(
          `${failedCount}건의 게시 상태를 변경하지 못했습니다. 해당 항목은 이전 상태로 남아 있습니다.`,
        );
      }
    },
    [api],
  );

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
        dashboardPath={dashboardPath}
        contentListPath={contentListPath}
      />
    </>
  );
}
