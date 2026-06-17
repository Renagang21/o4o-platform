/**
 * HubContentPage — K-Cosmetics Store HUB 콘텐츠 라이브러리
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1: wrapper page 초기 추가
 * WO-O4O-KCOSMETICS-STORE-HUB-CONTENT-CANONICAL-ALIGNMENT-V1:
 *   KPA HubContentLibraryPage canonical 패턴 이식.
 *   - ContentHubTemplate (@o4o/shared-space-ui) + single-action 정책 유지
 *   - hubContentApi (SERVICE_KEY='k-cosmetics', @/lib/api/hubContent)
 *   - assetSnapshotApi.copy({ assetType: 'cms' }) — canonical O4O Store Layer
 *   - dashboardCopyApi 제거 (legacy dashboard API 대체 완료)
 *
 * /store-hub/content 진입점 — CMS 콘텐츠 목록 탐색 + 내 매장에 복사.
 */

import { useMemo } from 'react';
import { toast } from '@o4o/error-handling';
// WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1: 카드 그리드 공통화(@o4o/shared-space-ui)
import { ContentHubTemplate, contentHubCardGrid, type ContentHubConfig, type ContentHubItem } from '@o4o/shared-space-ui';
import { hubContentApi, type HubContentItemResponse } from '@/lib/api/hubContent';
import { assetSnapshotApi } from '@/api/assetSnapshot';
import { useAuth } from '@/contexts/AuthContext';

// ─── Adapter ──────────────────────────────────────────────────────────────────

function apiItemToContentHubItem(item: HubContentItemResponse): ContentHubItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.description,
    thumbnail: item.thumbnailUrl || item.imageUrl,
    href: item.linkUrl || null,
    type: item.cmsType || null,
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : null,
    createdBy: item.authorId ?? null,
  };
}

// ─── K-Cosmetics Content Hub Config ──────────────────────────────────────────

function useKCosContentHubConfig(userId?: string): ContentHubConfig {
  return useMemo(() => ({
    serviceKey: 'k-cosmetics',

    heroTitle: '매장에서 바로 쓰는 콘텐츠',
    heroDesc: 'K-Cosmetics 매장을 위한 콘텐츠 자료실',
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

    pageLimit: 12,

    fetchItems: async ({ filter, search, page, limit }) => {
      try {
        const data = await hubContentApi.list({
          sourceDomain: 'cms',
          type: filter !== 'all' ? filter : undefined,
          search: search || undefined,
          page,
          limit,
        });
        const list = Array.isArray(data?.data) ? data.data : [];
        return {
          items: list.map(apiItemToContentHubItem),
          total: data?.pagination?.total ?? list.length,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },

    loadCopiedIds: async () => {
      if (!userId) return new Set<string>();
      try {
        const res = await assetSnapshotApi.list({ type: 'cms', limit: 200 });
        return new Set<string>((res.data?.items || []).map((i: { sourceAssetId: string }) => i.sourceAssetId));
      } catch {
        return new Set<string>();
      }
    },

    onCopy: async (item) => {
      await assetSnapshotApi.copy({ sourceAssetId: item.id, assetType: 'cms' });
      toast.success(`"${item.title}" 이(가) 내 매장에 복사되었습니다.`);
    },

    copyLabel: '내 매장에 복사',
    copiedLabel: '복사 완료',
    copyingLabel: '복사 중...',
    afterCopyAction: { label: '작업하러 가기 →', href: '/store/library/contents' },

    renderItems: contentHubCardGrid('pink'),

    infoText: '복사된 콘텐츠는 ',
    infoLinks: [{ label: '내 매장 > 자산 관리', href: '/store/library/contents' }],
    // WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1: 가져오기=복사·원본 단절 안내
    // WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1: 재복사 허용 안내
    infoTextAfter: '에 별도 사본으로 저장됩니다. 원본이 수정·삭제되어도 내 매장 사본은 영향받지 않습니다. 다시 복사하면 새 사본으로 저장되며, 필요 없는 사본은 내 매장에서 삭제할 수 있습니다.',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [userId]);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function HubContentPage() {
  const { user } = useAuth();
  const config = useKCosContentHubConfig(user?.id);
  return <ContentHubTemplate config={config} />;
}

export default HubContentPage;
