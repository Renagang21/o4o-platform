/**
 * PharmacyHubResourcesPage — Pharmacy-Hub 회원 자료실
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1
 *
 * 공통 `ResourcesHubTemplate` + PH adapter (read-only). Route: `/resources`.
 * KPA / K-Cosmetics / GlycoPharm / Neture 가 이미 소비하는 공통 View 를 그대로 채택한다 —
 * PH 전용 ResourceTable 복제 없음, shared View 내부 serviceKey 분기 추가 없음 (§9).
 *
 * 등록/수정/삭제 액션은 붙이지 않는다. PH 회원 축은 읽기 전용이며
 * 운영자 등록은 공통 CMS 쓰기 경로가 담당한다 (§13 — learner 화면에 operator 기능 혼입 금지).
 */

import { useMemo } from 'react';
import {
  ResourcesHubTemplate,
  type ResourcesHubConfig,
  type ResourcesHubItem,
} from '@o4o/shared-space-ui';
import {
  listPharmacyHubResources,
  getPharmacyHubResource,
  type CmsContentItem,
} from '../../lib/api/pharmacyHubResources';

function mapCmsToResource(c: CmsContentItem): ResourcesHubItem {
  const firstAtt = c.attachments?.[0];
  let source_type = 'view';
  let source_url: string | null = null;
  let source_file_name: string | null = null;

  if (firstAtt) {
    source_type = 'file';
    source_url = firstAtt.url;
    source_file_name = firstAtt.name;
  } else if (c.linkUrl) {
    source_type = 'external';
    source_url = c.linkUrl;
  }

  return {
    id: c.id,
    title: c.title,
    summary: c.summary ?? null,
    body: c.body ?? null,
    source_type,
    source_url,
    source_file_name,
    // cms_contents 에는 조회수 컬럼이 없다 — 값을 지어내지 않고 0 으로 고정한다.
    view_count: 0,
    author_name: null,
    created_at: c.publishedAt || c.createdAt,
  };
}

function usePharmacyHubResourcesConfig(): ResourcesHubConfig {
  return useMemo<ResourcesHubConfig>(
    () => ({
      serviceKey: 'pharmacy-hub',
      tableId: 'pharmacy-hub-resources',

      heroTitle: '자료실',
      heroDesc: '약국 운영에 활용할 수 있는 자료를 모아둔 공간입니다.',
      searchPlaceholder: '자료를 검색하세요',

      pageLimit: 12,

      fetchItems: async ({ page, limit, search }) => {
        const { items, total } = await listPharmacyHubResources({
          limit,
          offset: (page - 1) * limit,
          search,
        });
        return {
          items: items.map(mapCmsToResource),
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      },

      fetchDetail: async (id) => mapCmsToResource(await getPharmacyHubResource(id)),

      emptyMessage: '등록된 자료가 없습니다.',
      emptyFilteredMessage: '검색 결과가 없습니다.',
    }),
    [],
  );
}

export default function PharmacyHubResourcesPage() {
  return <ResourcesHubTemplate config={usePharmacyHubResourcesConfig()} />;
}
