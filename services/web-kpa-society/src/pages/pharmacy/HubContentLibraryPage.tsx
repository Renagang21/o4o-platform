/**
 * HubContentLibraryPage — KPA 플랫폼 콘텐츠 라이브러리
 *
 * WO-O4O-CONTENT-HUB-TEMPLATE-FOUNDATION-V1
 *
 * ContentHubTemplate + KPA adapter.
 * KPA 전용 API(cmsApi, assetSnapshotApi), 복사 로직은 kpaContentHubConfig에만 위치한다.
 *
 * WO-O4O-KPA-STOREHUB-CONTENT-CANONICAL-ALIGN-V1:
 *   GP·KCos canonical 정렬 — heroTitle/heroDesc("약국에서 바로 쓰는 콘텐츠"/"콘텐츠 자료실"),
 *   6-필터(전체/공지/가이드/지식/프로모션/뉴스, key=CMS DB type), 용어 '내 약국'.
 *   복합 탭 display remap(notice+news / promo+event) 제거 — 단일 type 직매핑.
 *   backend/route/copy-API/링크 대상(/store/content) 무변경. legacy 'event' 콘텐츠는 '전체' 탭 노출 유지.
 */

import { useMemo } from 'react';
import { toast } from '@o4o/error-handling';
import { ContentHubTemplate, type ContentHubConfig, type ContentHubItem } from '@o4o/shared-space-ui';
import { cmsApi, type CmsContent } from '../../api/cms';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { useAuth } from '../../contexts/AuthContext';

// ─── Display Remap ────────────────────────────────────────────────────────────
// WO-O4O-KPA-STOREHUB-CONTENT-CANONICAL-ALIGN-V1:
//   GP·KCos canonical 6-필터(전체/공지/가이드/지식/프로모션/뉴스)로 정렬.
//   필터 key = CMS DB type (notice/guide/knowledge/promo/news) — 복합 탭(notice+news, promo+event)
//   remap 제거. legacy 'event' type 콘텐츠는 '전체' 탭에서 계속 노출되며, 배지 라벨만 유지.

const DISPLAY_LABEL_MAP: Record<string, string> = {
  notice: '공지', news: '뉴스',
  guide: '가이드', knowledge: '지식',
  promo: '프로모션', event: '혜택/이벤트',
};

const DISPLAY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  '공지':       { bg: '#fef3c7', text: '#92400e' },
  '뉴스':       { bg: '#fef3c7', text: '#92400e' },
  '가이드':     { bg: '#dbeafe', text: '#1e40af' },
  '지식':       { bg: '#ede9fe', text: '#5b21b6' },
  '프로모션':   { bg: '#fce7f3', text: '#9d174d' },
  '혜택/이벤트': { bg: '#fce7f3', text: '#9d174d' },
};

const PAGE_LIMIT = 12;
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

    heroTitle: '약국에서 바로 쓰는 콘텐츠',
    heroDesc: 'KPA-Society 약국을 위한 콘텐츠 자료실',
    searchPlaceholder: '콘텐츠 검색',

    // WO-O4O-STOREHUB-CONTENT-FILTER-TABS-DEFER-V1: 콘텐츠 수 적은 단계에서 CMS type 탭 보류.
    // filters 배열은 보존(재도입 시 showTypeFilters 만 true). 기본 fetch=전체('all') 유지.
    filters: [
      { key: 'all',       label: '전체' },
      { key: 'notice',    label: '공지' },
      { key: 'guide',     label: '가이드' },
      { key: 'knowledge', label: '지식' },
      { key: 'promo',     label: '프로모션' },
      { key: 'news',      label: '뉴스' },
    ],
    showTypeFilters: false,

    pageLimit: PAGE_LIMIT,

    // 필터 key = CMS DB type. 'all' → 전체(hero/featured 제외).
    fetchItems: async ({ filter, search, page, limit }) => {
      const offset = (page - 1) * limit;
      const res = await cmsApi.getContents({
        serviceKey: 'kpa',
        type: filter !== 'all' ? filter : undefined,
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
      // copy API 호출은 무변경 (route/import 로직 보존). 사용자-facing 문구만 KPA '내 약국' 용어로 정렬.
      await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: item.id, assetType: 'cms' });
      toast.success(`"${item.title}" 이(가) 내 약국에 복사되었습니다.`);
    },

    copyLabel: '내 약국에 복사',
    copiedLabel: '복사 완료',
    copyingLabel: '복사 중...',
    afterCopyAction: { label: '작업하러 가기 →', href: '/store/content' },

    infoText: '복사된 콘텐츠는 ',
    infoLinks: [{ label: '내 약국 > 자산 관리', href: '/store/content' }],
    // WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1: 가져오기=복사·원본 단절 안내
    // WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1: 재복사 허용 안내
    // WO-O4O-KPA-STOREHUB-CONTENT-CANONICAL-ALIGN-V1: '내 매장' → '내 약국' 용어 정렬(KPA=약국 서비스)
    infoTextAfter: '에 별도 사본으로 저장됩니다. 원본이 수정·삭제되어도 내 약국 사본은 영향받지 않습니다. 다시 복사하면 새 사본으로 저장되며, 필요 없는 사본은 내 약국에서 삭제할 수 있습니다.',

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
