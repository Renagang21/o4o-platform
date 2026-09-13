/**
 * ContentLibraryPage — Neture 콘텐츠 라이브러리
 *
 * WO-NETURE-COMMUNITY-HUB-TEMPLATE-ADOPTION-V1
 *
 * ContentHubTemplate + Neture config-only adapter.
 * Route: /content
 * API: GET /api/v1/hub/contents?serviceKey=neture&sourceDomain=cms&type=...
 *
 * WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1:
 *   카드의 "내 콘텐츠로" 복사 버튼과 loadCopiedIds/onCopy/afterCopyAction(/my-content) 를 제거했다.
 *   backend /api/v1/dashboard/assets(cms_media) 축이 운영에 존재한 적 없어 복사는 항상 실패했다.
 *   목록(hub content) 자체는 그대로 유지한다. Media V2 로 치환하지 않는다.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Image as ImageIcon } from 'lucide-react';
import {
  ContentHubTemplate,
  type ContentHubConfig,
  type ContentHubItem,
} from '@o4o/shared-space-ui';
import { hubContentApi } from '../../lib/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';

function apiItemToContentHubItem(item: HubContentItemResponse): ContentHubItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.description,
    thumbnail: item.thumbnailUrl || item.imageUrl,
    href: item.linkUrl,
    type: item.cmsType,
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null,
    isPinned: item.isPinned,
  };
}

function CardGrid({ items }: { items: ContentHubItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => {
        const hasLink = !!item.href;
        return (
          <div
            key={item.id}
            onClick={() => item.href && window.open(item.href, '_blank', 'noopener')}
            className={`bg-white rounded-lg border border-gray-200 overflow-hidden transition-all ${
              hasLink ? 'cursor-pointer hover:shadow-md hover:border-primary-200' : 'opacity-80'
            }`}
          >
            {item.thumbnail ? (
              <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="aspect-[16/9] bg-gray-50 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-200" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {item.type && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
                        {item.type}
                      </span>
                    )}
                    {item.isPinned && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 rounded">
                        추천
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                  )}
                </div>
                {hasLink && (
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-gray-400">{item.date}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentLibraryPage() {
  const config: ContentHubConfig = useMemo(() => ({
    serviceKey: 'neture',
    heroTitle: '콘텐츠 라이브러리',
    heroDesc: 'Neture 콘텐츠를 한눈에 확인하세요',
    headerAction: (
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>
    ),

    showSearch: false,
    filters: [
      { key: 'all', label: '전체' },
      { key: 'notice', label: '공지' },
      { key: 'guide', label: '가이드' },
      { key: 'knowledge', label: '지식' },
      { key: 'promo', label: '프로모션' },
      { key: 'news', label: '뉴스' },
    ],
    pageLimit: 12,

    fetchItems: async ({ filter, page, limit }) => {
      try {
        const res = await hubContentApi.list({
          sourceDomain: 'cms',
          type: filter !== 'all' ? filter : undefined,
          page,
          limit,
        });
        return {
          items: (res?.data ?? []).map(apiItemToContentHubItem),
          total: res?.pagination?.total ?? 0,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },

    renderItems: (items) => <CardGrid items={items} />,

    emptyMessage: '등록된 콘텐츠가 없습니다.',
    emptyFilteredMessage: '조건에 맞는 콘텐츠가 없습니다.',
  }), []);

  return <ContentHubTemplate config={config} />;
}
