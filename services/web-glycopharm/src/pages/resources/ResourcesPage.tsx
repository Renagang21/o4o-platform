/**
 * ResourcesPage — GlycoPharm 자료실
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-FOUNDATION-V1
 * WO-O4O-GLYCOPHARM-HUB-RESOURCES-V1: glycoResourcesApi wrapper + usage_type 매핑 적용
 *
 * ResourcesHubTemplate + GlycoPharm adapter.
 * Route: /resources
 * API: GET /api/v1/glycopharm/contents?sub_type=resource
 */

import { useMemo } from 'react';
import { ResourcesHubTemplate, type ResourcesHubConfig, type ResourcesHubItem } from '@o4o/shared-space-ui';
import { glycoResourcesApi, type GlycoResourceItem } from '@/api/resources';

// ─── GlycoPharm Config ────────────────────────────────────────────────────────

function useGlycoResourcesConfig(): ResourcesHubConfig {
  return useMemo(() => ({
    serviceKey: 'glycopharm',
    tableId: 'glyco-resources',

    heroTitle: '자료실',
    heroDesc: '자료를 저장하고 AI 작업에 활용하세요.',
    searchPlaceholder: '자료를 검색하세요 (제목, 등록자)',

    // WO-O4O-RESOURCES-HUB-TEMPLATE-LOAD-ERROR-CONTRACT-V1:
    //   조회 실패를 어댑터에서 빈 목록으로 삼키지 않는다. throw 를 그대로 전파하면
    //   ResourcesHubTemplate 이 오류 상태(재시도)로 표면화한다. 정상 0건(200 빈 배열)만 성공 통과.
    fetchItems: async ({ page, limit, search }) => {
      const res = await glycoResourcesApi.list({ page, limit, search, sort: 'latest' });
      const d = res.data?.data;
      const items = (d?.items ?? []).map((item: GlycoResourceItem): ResourcesHubItem => {
        // usage_type → actionType 매핑 (KPA 패턴)
        let actionType: 'view' | 'download' | 'external' | 'copy' | undefined;
        if (item.usage_type === 'LINK') actionType = 'external';
        else if (item.usage_type === 'DOWNLOAD') actionType = 'download';
        else if (item.usage_type === 'COPY') actionType = 'copy';
        else actionType = 'view';
        return { ...item, actionType };
      });
      return {
        items,
        total: d?.total ?? 0,
        totalPages: d?.totalPages ?? 1,
      };
    },

    // 상세 조회 실패도 throw 전파 — 템플릿 openDrawer 가 catch 하여 요약 데이터를 유지한다.
    fetchDetail: async (id) => {
      const res = await glycoResourcesApi.getDetail(id);
      return res.data?.data as ResourcesHubItem;
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
