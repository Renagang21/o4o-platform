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
 *
 * WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-ALIGNMENT-V1:
 *   cms_contents(published) + kpa_contents(ready)를 KPA 프론트에서 정합(가져오기=복사, 출처별 assetType 분기).
 *
 * WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-TABS-V1:
 *   두 소스를 한 목록으로 병합하지 않고 '소스 탭'으로 구분한다 — 콘텐츠 허브(kpa_contents ready) / 운영 자료(cms published).
 *   전체 탭 없음, 기본 탭 = 콘텐츠 허브. 탭별 빈 상태 문구(filterEmptyMessages). 검색은 현재 탭 소스 안에서만.
 *   복사(가져오기=복사) 및 출처별 assetType 분기(cms/content)는 유지. backend/DB 무변경. GP/KCos 무영향(KPA config 한정).
 */

import { useMemo, useRef } from 'react';
import { toast } from '@o4o/error-handling';
import { ContentHubTemplate, type ContentHubConfig, type ContentHubItem } from '@o4o/shared-space-ui';
import { cmsApi, type CmsContent } from '../../api/cms';
import { assetSnapshotApi } from '../../api/assetSnapshot';
// WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-ALIGNMENT-V1:
//   매장 허브를 cms_contents(published) + 운영자 콘텐츠 허브 kpa_contents(ready) 병합 조회로 정합.
import { listContentHubItems, type ContentHubItem as KpaHubItem } from '../../api/contentHub';
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

// WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-ALIGNMENT-V1:
//   운영자 콘텐츠 허브(kpa_contents, status='ready') 항목을 동일 카드 구조로 매핑.
//   유형 배지를 '콘텐츠 허브'로 표기하여 출처(운영자 콘텐츠)를 구분한다.
const KPA_HUB_BADGE = { bg: '#e0f2fe', text: '#0369a1' };

function kpaContentToItem(k: KpaHubItem): ContentHubItem {
  return {
    id: k.id,
    title: k.title,
    summary: k.summary,
    type: '콘텐츠 허브',
    typeColor: KPA_HUB_BADGE,
    date: formatDate(k.created_at),
    isNew: isNew(k.created_at),
  };
}

// ─── KPA Config ───────────────────────────────────────────────────────────────

function useKpaContentHubConfig(userId?: string): ContentHubConfig {
  // WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-ALIGNMENT-V1:
  //   병합 항목의 출처(cms / kpa_content)를 id 로 기억 → onCopy 가 assetType 을 분기한다.
  //   (공통 ContentHubItem 타입 변경 없이 KPA-local 로 처리 — 3서비스 무영향.)
  const sourceDomainRef = useRef<Map<string, 'cms' | 'kpa_content'>>(new Map());

  return useMemo(() => ({
    serviceKey: 'kpa-society',

    heroTitle: '약국에서 바로 쓰는 콘텐츠',
    heroDesc: 'KPA-Society 약국을 위한 콘텐츠 자료실',
    searchPlaceholder: '콘텐츠 검색',

    // WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-TABS-V1:
    //   filters 를 '콘텐츠 소스 탭'으로 사용한다. 전체 탭 없이 콘텐츠 허브 / 운영 자료 2탭만 제공.
    //   기본 탭 = 콘텐츠 허브(filters[0]) — 운영자 콘텐츠 허브 저장 흐름과 정합.
    //   CMS type 필터(공지/가이드 등)는 본 화면에서 제거(소스 구분이 우선). 재도입은 별도 WO.
    filters: [
      { key: 'kpa_content', label: '콘텐츠 허브' },
      { key: 'cms',         label: '운영 자료' },
    ],
    showTypeFilters: true,
    filtersAsSourceTabs: true,
    filterEmptyMessages: {
      kpa_content: '현재 제공되는 콘텐츠 허브 자료가 없습니다. 운영자가 콘텐츠 허브에서 사용 가능 콘텐츠를 저장하면 이곳에 표시됩니다.',
      cms: '현재 제공되는 운영 자료가 없습니다. 운영자가 게시한 자료가 있으면 이곳에 표시됩니다.',
    },

    pageLimit: PAGE_LIMIT,

    // WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-TABS-V1 (소스 탭 분리):
    //   탭(filter)별로 단일 소스만 조회한다 — 병합/정렬/중복제거 없음(섞이지 않음).
    //     - 'cms'         → cms_contents(status='published')   (운영 자료)
    //     - 'kpa_content' → kpa_contents(status='ready')        (콘텐츠 허브, draft 비노출)
    //   각 항목 출처를 sourceDomainRef 에 기록 → onCopy 가 assetType 을 분기한다.
    //   검색은 현재 탭 소스 안에서만 수행(탭 간 결과 섞지 않음).
    fetchItems: async ({ filter, search, page, limit }) => {
      if (filter === 'cms') {
        const offset = (page - 1) * limit;
        const res = await cmsApi.getContents({
          serviceKey: 'kpa',
          status: 'published',
          search: search || undefined,
          limit,
          offset,
        });
        const rows = (res.data as CmsContent[]).filter((c) => c.type !== 'hero' && c.type !== 'featured');
        rows.forEach((c) => sourceDomainRef.current.set(c.id, 'cms'));
        const items = rows.map(cmsToItem);
        const total = res.pagination.total - ((res.data as CmsContent[]).length - items.length);
        return { items, total };
      }

      // 'kpa_content' (기본 탭) — 운영자 콘텐츠 허브 ready
      const res = await listContentHubItems({ status: 'ready', search: search || undefined, page, limit });
      res.items.forEach((k) => sourceDomainRef.current.set(k.id, 'kpa_content'));
      return { items: res.items.map(kpaContentToItem), total: res.total };
    },

    loadCopiedIds: async () => {
      if (!userId) return new Set<string>();
      // 두 소스 사본(cms / content)을 모두 복사 이력으로 표시.
      const [cmsList, contentList] = await Promise.all([
        assetSnapshotApi.list({ type: 'cms', limit: 200 }).catch(() => null),
        assetSnapshotApi.list({ type: 'content', limit: 200 }).catch(() => null),
      ]);
      const ids = new Set<string>();
      for (const i of (cmsList?.data?.items ?? []) as { sourceAssetId: string }[]) ids.add(i.sourceAssetId);
      for (const i of (contentList?.data?.items ?? []) as { sourceAssetId: string }[]) ids.add(i.sourceAssetId);
      return ids;
    },

    onCopy: async (item) => {
      // 가져오기=복사. 출처별 assetType 분기 — cms_contents='cms' / kpa_contents='content'.
      //   둘 다 o4o_asset_snapshots 로 store-owned 사본 생성(원본 무변경). 백엔드 기존 resolver 재사용.
      const domain = sourceDomainRef.current.get(item.id) ?? 'cms';
      const assetType = domain === 'kpa_content' ? 'content' : 'cms';
      await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: item.id, assetType });
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

    // WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-ALIGNMENT-V1 §8.5: 원인 안내(기술 용어 비노출)
    emptyMessage: '현재 제공되는 콘텐츠가 없습니다. 운영자가 콘텐츠 허브에서 콘텐츠를 저장하거나 게시 콘텐츠를 등록하면 이곳에 표시됩니다.',
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
