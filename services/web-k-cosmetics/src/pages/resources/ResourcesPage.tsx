/**
 * ResourcesPage — K-Cosmetics 자료실
 *
 * WO-KCOS-RESOURCES-HUB-IMPLEMENTATION-V1
 *
 * ResourcesHubTemplate + K-Cosmetics adapter.
 * 읽기 전용 — 업로드/삭제 없음.
 * API: GET /api/v1/cosmetics/contents?sub_type=resource (구현됨: {success,data:{items,total,totalPages}})
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-LOAD-ERROR-CONTRACT-V1:
 *   조회 실패를 어댑터에서 빈 목록으로 삼키지 않는다(이전 "서버 미구현" 주석은 stale — 엔드포인트 실재).
 *   throw 전파 → ResourcesHubTemplate 오류 상태(재시도)로 표면화. 정상 0건(200 빈 배열)만 성공 통과.
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
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      const res = await api.get('/cosmetics/contents', { params });
      const data = res.data?.data;
      return {
        items: data?.items ?? [],
        total: data?.total ?? 0,
        totalPages: data?.totalPages ?? 1,
      };
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
