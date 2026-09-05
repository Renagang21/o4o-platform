/**
 * PharmacyHubNewsListPage — PH 뉴스 목록 (`/news`)
 *
 * WO-O4O-PHARMACYHUB-HOME-NEWS-AND-USAGE-GUIDE-REALIGNMENT-V1 §3
 *
 * 홈 뉴스 카드의 `전체 보기` 착지 화면이다. 표시부는 다른 목록(콘텐츠·자료실)과 같은
 * 공통 `CommunityContentListTemplate` 을 그대로 채택한다 — PH 전용 목록 View 를
 * 복제하지 않는다. wrapper 책임은 원장 adapter · 라우팅 · 문구뿐이다.
 *
 * 원장은 공통 cms_contents(type='news') — 신규 table 0 / 신규 backend API 0.
 * 공개 화면이다(MembershipGate 없음) — backend 가 optionalAuth 이고 published 만 준다.
 */

import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CommunityContentListTemplate,
  type CommunityContentListConfig,
  type CommunityContentListItem,
} from '@o4o/shared-space-ui';
import {
  listPharmacyHubNews,
  pharmacyHubNewsDate,
  type PharmacyHubNewsItem,
} from '../../lib/api/pharmacyHubNews';

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function mapNewsToListItem(item: PharmacyHubNewsItem): CommunityContentListItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    // cms_contents 에는 작성자 표시명 컬럼이 없다 — 값을 지어내지 않고 비운다.
    authorName: null,
    dateLabel: formatDate(pharmacyHubNewsDate(item)),
    viewCount: item.viewCount,
    badges: [],
  };
}

export default function PharmacyHubNewsListPage() {
  const fetchItems = useCallback(
    async (params: { page: number; limit: number }) => {
      const result = await listPharmacyHubNews({ page: params.page, limit: params.limit });
      return { items: result.items.map(mapNewsToListItem), total: result.total };
    },
    [],
  );

  const config = useMemo<CommunityContentListConfig>(
    () => ({
      title: '뉴스',
      description:
        '약국 경영 · 약사 제도 · 의약품 유통 · 건강기능식품 · 매장 디지털 운영 등 PharmacyHub 이용자에게 직접 관련된 소식을 전합니다.',
      accent: '#0f766e',
      // 공통 news API 에 검색 파라미터가 없다 — 동작하지 않는 검색창을 노출하지 않는다.
      disableSearch: true,
      pageSize: 20,
      emptyMessage: '등록된 뉴스가 없습니다.',
      errorMessage: '뉴스를 불러오지 못했습니다.',
      detailPathFor: (item) => `/news/${item.id}`,
      fetchItems,
    }),
    [fetchItems],
  );

  return (
    <CommunityContentListTemplate
      config={config}
      renderLink={(href, children) => (
        <Link to={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          {children}
        </Link>
      )}
    />
  );
}
