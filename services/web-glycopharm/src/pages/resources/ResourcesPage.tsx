/**
 * ResourcesPage — GlycoPharm 자료실
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-FOUNDATION-V1
 *
 * ResourcesHubTemplate + GlycoPharm adapter.
 * GlycoPharm 전용 API(api.get), 문구는 glycoResourcesConfig에만 위치한다.
 * operator 기능 없음 — read-only 접근.
 */

import { useMemo } from 'react';
import { ResourcesHubTemplate, type ResourcesHubConfig } from '@o4o/shared-space-ui';
import { api } from '@/lib/apiClient';

// ─── GlycoPharm Config ────────────────────────────────────────────────────────

function useGlycoResourcesConfig(): ResourcesHubConfig {
  return useMemo(() => ({
    serviceKey: 'glycopharm',
    tableId: 'glyco-resources',

    heroTitle: '자료실',
    heroDesc: '자료를 저장하고 AI 작업에 활용하세요.',
    searchPlaceholder: '자료를 검색하세요 (제목, 등록자)',

    fetchItems: async ({ page, limit, search }) => {
      try {
        const params: Record<string, string | number> = { page, limit };
        if (search) params.search = search;
        const res = await api.get('/glycopharm/contents', { params });
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
  const config = useGlycoResourcesConfig();
  return <ResourcesHubTemplate config={config} />;
}

export default ResourcesPage;
