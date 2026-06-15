/**
 * StoreProductionMaterialsPage — GlycoPharm 내 자료함 / 제작 자료
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CROSSSERVICE-PHASE2-C-V1: 기본 진입 구조
 * WO-O4O-STORE-PRODUCTION-MATERIAL-GP-KCOS-SOURCE-COMPLETION-V1: execution+blog+QR+direct 4소스
 * WO-O4O-STORE-PRODUCTION-MATERIALS-PAGE-COMPONENT-EXTRACTION-V1:
 *   UI 를 @o4o/store-ui-core StoreProductionMaterialsView 로 추출. 본 wrapper 는 fetch +
 *   service-specific derivations 경로만 보유. backend/API/DB/route 무변경.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  StoreProductionMaterialsView,
  mergeProductionMaterials,
  type ProductionMaterialItem,
} from '@o4o/store-ui-core';
import { getStoreExecutionAssets } from '@/api/storeExecutionAssets';
import { fetchStaffBlogPosts } from '@/api/blogStaff';
import { getStoreSlug } from '@/api/storeHub';
import { getStoreQrCodes, getStoreDirectContents } from '@/api/storeProductionSources';
import { api } from '@/lib/apiClient';

export default function StoreProductionMaterialsPage() {
  const [items, setItems] = useState<ProductionMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDerivations = useCallback(
    async ({ derivedKind, derivedId }: { derivedKind: string; derivedId: string }) => {
      const res = await api.get('/glycopharm/store/asset-derivations', { params: { derivedKind, derivedId } });
      return { items: res.data?.data?.items ?? res.data?.items ?? [] };
    },
    [],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // multi-source 병합. 각 소스 독립 .catch(한쪽 실패해도 나머지 표시). 블로그는 slug 필요.
      const slug = await getStoreSlug().catch(() => null);
      const [assetsRes, blogRes, qrItems, directItems] = await Promise.all([
        getStoreExecutionAssets({ limit: 100 }).catch(() => null),
        slug ? fetchStaffBlogPosts(slug, { limit: 50 }).catch(() => null) : Promise.resolve(null),
        getStoreQrCodes({ limit: 50 }).catch(() => []),
        getStoreDirectContents().catch(() => []),
      ]);

      setItems(mergeProductionMaterials({
        executionAssets: (assetsRes?.data?.items ?? []) as any[],
        blogPosts: (blogRes?.data ?? []) as any[],
        qrCodes: qrItems,
        directContents: directItems,
      }));
    } catch (e: any) {
      setError(e?.message || '불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <StoreProductionMaterialsView
      items={items}
      loading={loading}
      error={error}
      onRefresh={fetchAll}
      fetchDerivations={fetchDerivations}
    />
  );
}
