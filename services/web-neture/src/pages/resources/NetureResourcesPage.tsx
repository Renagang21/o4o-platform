/**
 * NetureResourcesPage — Neture 자료실
 *
 * WO-NETURE-COMMUNITY-HUB-TEMPLATE-ADOPTION-V1
 *
 * ResourcesHubTemplate + Neture adapter (read-only).
 * Route: /resources
 * API: GET /api/v1/neture/content?type=resource
 * 등록/삭제/관리 기능 없음 — 공개 읽기 전용.
 */

import { useMemo } from 'react';
import {
  ResourcesHubTemplate,
  type ResourcesHubConfig,
  type ResourcesHubItem,
} from '@o4o/shared-space-ui';
import { cmsApi, type CmsContent } from '../../lib/api/content';

function mapCmsToResource(c: CmsContent): ResourcesHubItem {
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
    summary: c.summary,
    body: c.body,
    source_type,
    source_url,
    source_file_name,
    view_count: c.viewCount ?? 0,
    author_name: null,
    created_at: c.publishedAt || c.createdAt,
    like_count: c.recommendCount,
    isRecommendedByMe: c.isRecommendedByMe,
  };
}

function useNetureResourcesConfig(): ResourcesHubConfig {
  return useMemo(() => ({
    serviceKey: 'neture',
    tableId: 'neture-resources',

    heroTitle: '자료실',
    heroDesc: '공급자·파트너를 위한 공유 자료 모음입니다.',
    searchPlaceholder: '자료를 검색하세요',

    pageLimit: 12,

    fetchItems: async ({ page, limit }) => {
      const res = await cmsApi.getContents({ type: 'resource', sort: 'latest', page, limit });
      return {
        items: (res.data ?? []).map(mapCmsToResource),
        total: res.pagination?.total ?? 0,
        totalPages: res.pagination?.totalPages ?? 1,
      };
    },

    fetchDetail: async (id) => {
      const c = await cmsApi.getContentById(id);
      return mapCmsToResource(c);
    },

    trackView: (id) => { cmsApi.trackView(id).catch(() => {}); },

    emptyMessage: '등록된 자료가 없습니다.',
    emptyFilteredMessage: '검색 결과가 없습니다.',
  }), []);
}

export default function NetureResourcesPage() {
  const config = useNetureResourcesConfig();
  return <ResourcesHubTemplate config={config} />;
}
