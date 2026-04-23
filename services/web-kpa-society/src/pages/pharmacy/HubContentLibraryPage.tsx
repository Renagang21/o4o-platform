/**
 * HubContentLibraryPage — KPA 플랫폼 콘텐츠 라이브러리
 *
 * WO-O4O-CONTENT-HUB-TEMPLATE-FOUNDATION-V1
 *
 * ContentHubTemplate + KPA adapter.
 * KPA 전용 API(cmsApi, assetSnapshotApi), 탭 display remap, 복사 로직은
 * kpaContentHubConfig에만 위치한다.
 *
 * 탭 display remap (WO-O4O-KPA-CONTENT-HUB-TYPE-DISPLAY-REMAP-V1):
 *   DB type → display category (notice+news→공지/소식, promo+event→혜택/이벤트)
 *   복합 탭은 adapter에서 병렬 fetch 후 merge + sort.
 */

import { useMemo } from 'react';
import { toast } from '@o4o/error-handling';
import { ContentHubTemplate, type ContentHubConfig, type ContentHubItem } from '@o4o/shared-space-ui';
import { cmsApi, type CmsContent } from '../../api/cms';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { useAuth } from '../../contexts/AuthContext';

// ─── Display Remap ────────────────────────────────────────────────────────────

const TAB_DB_TYPES: Record<string, string[] | null> = {
  'all':         null,
  'notice-news': ['notice', 'news'],
  'guide':       ['guide'],
  'knowledge':   ['knowledge'],
  'promo-event': ['promo', 'event'],
};

const DISPLAY_LABEL_MAP: Record<string, string> = {
  notice: '공지/소식', news: '공지/소식',
  guide: '가이드', knowledge: '지식자료',
  promo: '혜택/이벤트', event: '혜택/이벤트',
};

const DISPLAY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  '공지/소식':  { bg: '#fef3c7', text: '#92400e' },
  '가이드':     { bg: '#dbeafe', text: '#1e40af' },
  '지식자료':   { bg: '#ede9fe', text: '#5b21b6' },
  '혜택/이벤트': { bg: '#fce7f3', text: '#9d174d' },
};

const PAGE_LIMIT = 20;
const NEW_DAYS = 7;

function isNew(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < NEW_DAYS * 86400000;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}시간 전`;
  const minutes = Math.floor(diff / 60000);
  return minutes > 0 ? `${minutes}분 전` : '방금 전';
}

function cmsToItem(c: CmsContent): ContentHubItem {
  const displayLabel = DISPLAY_LABEL_MAP[c.type] ?? c.type;
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    type: displayLabel,
    typeColor: DISPLAY_BADGE_COLORS[displayLabel],
    date: formatDate(c.publishedAt || c.createdAt),
    isPinned: c.isPinned,
    isNew: isNew(c.publishedAt || c.createdAt),
  };
}

// ─── KPA Config ───────────────────────────────────────────────────────────────

function useKpaContentHubConfig(userId?: string): ContentHubConfig {
  return useMemo(() => ({
    serviceKey: 'kpa-society',

    heroTitle: '플랫폼 콘텐츠',
    heroDesc: '본부/공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.',
    searchPlaceholder: '제목 또는 요약 검색',

    filters: [
      { key: 'all',         label: '전체' },
      { key: 'notice-news', label: '공지/소식' },
      { key: 'guide',       label: '가이드' },
      { key: 'knowledge',   label: '지식자료' },
      { key: 'promo-event', label: '혜택/이벤트' },
    ],

    pageLimit: PAGE_LIMIT,

    fetchItems: async ({ filter, search, page, limit }) => {
      const dbTypes = TAB_DB_TYPES[filter] ?? null;
      const offset = (page - 1) * limit;

      // 복합 탭: 병렬 fetch + merge + 클라이언트 페이지네이션
      if (dbTypes && dbTypes.length > 1) {
        const results = await Promise.all(
          dbTypes.map(type => cmsApi.getContents({
            serviceKey: 'kpa', type, status: 'published',
            search: search || undefined, limit: 200, offset: 0,
          }))
        );
        const all = results.flatMap(r => r.data as CmsContent[]);
        all.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return {
          items: all.slice(offset, offset + limit).map(cmsToItem),
          total: all.length,
        };
      }

      // 단일 타입 or 전체 탭
      const res = await cmsApi.getContents({
        serviceKey: 'kpa',
        type: dbTypes?.[0],
        status: 'published',
        search: search || undefined,
        limit,
        offset,
      });
      const items = (res.data as CmsContent[])
        .filter(c => c.type !== 'hero' && c.type !== 'featured')
        .map(cmsToItem);
      const total = res.pagination.total - ((res.data as CmsContent[]).length - items.length);
      return { items, total };
    },

    loadCopiedIds: async () => {
      if (!userId) return new Set<string>();
      const res = await assetSnapshotApi.list({ type: 'cms', limit: 200 });
      return new Set<string>((res.data?.items || []).map((i: { sourceAssetId: string }) => i.sourceAssetId));
    },

    onCopy: async (item) => {
      await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: item.id, assetType: 'cms' });
      toast.success(`"${item.title}" 이(가) 내 매장에 복사되었습니다.`);
    },

    copyLabel: '내 매장에 복사',
    copiedLabel: '복사 완료',
    copyingLabel: '복사 중...',
    afterCopyAction: { label: '작업하러 가기 →', href: '/store/content' },

    infoText: '복사된 콘텐츠는 ',
    infoLinks: [{ label: '내 매장 > 자산 관리', href: '/store/content' }],

    emptyMessage: '현재 제공되는 콘텐츠가 없습니다',
    emptyFilteredMessage: '조건에 맞는 콘텐츠가 없습니다',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [userId]);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function HubContentLibraryPage() {
  const { user } = useAuth();
  const config = useKpaContentHubConfig(user?.id);
  return <ContentHubTemplate config={config} />;
}

export default HubContentLibraryPage;
