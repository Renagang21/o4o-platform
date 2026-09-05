/**
 * PharmacyHubNewsDetailPage — PH 뉴스 상세 (`/news/:id`)
 *
 * WO-O4O-PHARMACYHUB-HOME-NEWS-AND-USAGE-GUIDE-REALIGNMENT-V1 §3
 *
 * 홈 뉴스 카드 · `/news` 목록의 착지 화면. 이 route 가 있어야 뉴스 항목이
 * 데드링크가 되지 않는다. 표시부는 공통 `CommunityContentDetailTemplate` 에 위임한다
 * (PH 전용 상세 View 복제 0).
 *
 * 원장은 공통 cms_contents(type='news') — 신규 table 0 / 신규 backend API 0.
 * 운영자가 외부 원문 링크(linkUrl)를 넣은 경우에만 원문 링크를 노출한다.
 */

import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CommunityContentDetailTemplate,
  type CommunityContentDetailConfig,
  type CommunityContentDetailData,
} from '@o4o/shared-space-ui';
import {
  getPharmacyHubNews,
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

export function mapNewsToDetailData(item: PharmacyHubNewsItem): CommunityContentDetailData {
  return {
    title: item.title,
    // cms_contents 에 작성자 표시명 컬럼이 없다 — 지어내지 않는다.
    authorName: null,
    dateLabel: formatDate(pharmacyHubNewsDate(item)),
    viewCount: item.viewCount,
    summary: item.summary,
    bodyHtml: item.body ?? null,
    badges: [],
  };
}

export default function PharmacyHubNewsDetailPage() {
  const { id } = useParams<{ id: string }>();

  const config = useMemo<CommunityContentDetailConfig<PharmacyHubNewsItem>>(
    () => ({
      fetchContent: getPharmacyHubNews,
      toDetailData: mapNewsToDetailData,
      listPath: '/news',
      listLabel: '뉴스 목록',
      errorMessage: '뉴스를 불러오지 못했습니다.',
      notFoundMessage: '뉴스를 찾을 수 없습니다.',
    }),
    [],
  );

  return (
    <CommunityContentDetailTemplate<PharmacyHubNewsItem>
      contentId={id}
      config={config}
      renderLink={(href, children) => (
        <Link to={href} style={{ fontSize: '0.875rem', color: '#0f766e', textDecoration: 'none', fontWeight: 500 }}>
          {children}
        </Link>
      )}
      renderActions={(raw) =>
        raw.linkUrl ? (
          <a
            href={raw.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.875rem', color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}
          >
            {raw.linkText || '원문 보기'} →
          </a>
        ) : undefined
      }
      emptyBodyText="본문이 등록되지 않은 소식입니다."
    />
  );
}
