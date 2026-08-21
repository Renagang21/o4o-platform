/**
 * PharmacyHubContentPage — Pharmacy-Hub 회원 콘텐츠 목록
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1
 *
 * 공통 `ContentHubTemplate` + PH adapter (읽기 전용). Route: `/content`.
 * 이미 4서비스가 소비하는 공통 View 를 그대로 채택한다 — PH 전용 목록 복제 없음.
 *
 * 원장은 공통 `cms_contents` (`serviceKey='pharmacy-hub'`, `type='content'`).
 * 신규 table / migration / backend API 0.
 *
 * 회원 **작성** CTA 는 붙이지 않는다 — 공통 CMS 쓰기 인가(`authorizeCmsMutation`)가
 * `{serviceKey}:admin|operator` 전용이라 회원에게 노출하면 반드시 403 인 dead CTA 가 된다.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ContentHubTemplate,
  type ContentHubConfig,
  type ContentHubItem,
} from '@o4o/shared-space-ui';
import { listPharmacyHubContents, type CmsContentItem } from '../../lib/api/pharmacyHubContents';

function mapCmsToHubItem(c: CmsContentItem): ContentHubItem {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary ?? null,
    // 외부 링크형은 템플릿이 새 탭으로 연다. 본문형은 href 없이 내부 상세로 이동한다.
    href: c.linkUrl ?? null,
    date: c.publishedAt || c.createdAt,
  };
}

export default function PharmacyHubContentPage() {
  const navigate = useNavigate();

  const config: ContentHubConfig = useMemo(
    () => ({
      serviceKey: 'pharmacy-hub',
      heroTitle: '콘텐츠',
      heroDesc: '약국 운영에 도움이 되는 콘텐츠를 확인하세요.',
      showSearch: true,
      searchPlaceholder: '콘텐츠를 검색하세요',
      showTypeFilters: false,
      pageLimit: 12,
      fetchItems: async ({ page, limit, search }) => {
        const res = await listPharmacyHubContents({
          limit,
          offset: (page - 1) * limit,
          search,
        });
        return { items: res.items.map(mapCmsToHubItem), total: res.total };
      },
      emptyMessage: '등록된 콘텐츠가 없습니다.',
      onItemClick: (item) => navigate(`/content/${item.id}`),
    }),
    [navigate],
  );

  return <ContentHubTemplate config={config} />;
}
