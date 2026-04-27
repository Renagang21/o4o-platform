/**
 * ResourcesPage — K-Cosmetics 자료실
 *
 * WO-KCOS-RESOURCES-HUB-IMPLEMENTATION-V1
 *
 * ResourcesHubTemplate + K-Cosmetics adapter.
 * 읽기 전용 — 업로드/삭제 없음.
 * API: /api/v1/cosmetics/contents (서버 미구현 시 빈 목록 표시)
 */

import { useMemo } from 'react';
import { ResourcesHubTemplate, type ResourcesHubConfig } from '@o4o/shared-space-ui';
import { api } from '@/lib/apiClient';

// ─── K-Cosmetics Config ───────────────────────────────────────────────────────

function useKCosResourcesConfig(): ResourcesHubConfig {
  return useMemo(() => ({
    serviceKey: 'k-cosmetics',
    tableId: 'kcos-resources',

    heroTitle: '자료실',
    heroDesc: 'K-Beauty 관련 자료를 검색하고 활용하세요.',
    searchPlaceholder: '자료를 검색하세요 (제목, 등록자)',

    fetchItems: async ({ page, limit, search }) => {
      try {
        const params: Record<string, string | number> = { page, limit };
        if (search) params.search = search;
        const res = await api.get('/cosmetics/contents', { params });
        const data = res.data?.data;
        return {
          items: data?.items ?? [],
          total: data?.total ?? 0,
          totalPages: data?.totalPages ?? 1,
        };
      } catch {
        return { items: [], total: 0, totalPages: 1 };
      }
    },

    emptyMessage: '등록된 자료가 없습니다.',
    emptyFilteredMessage: '검색 결과가 없습니다.',
  }), []);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function ResourcesPage() {
  const config = useKCosResourcesConfig();
  return <ResourcesHubTemplate config={config} />;
}

export default ResourcesPage;
