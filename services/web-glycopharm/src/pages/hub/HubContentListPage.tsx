/**
 * HubContentListPage — GlycoPharm Store HUB 콘텐츠 라이브러리
 *
 * WO-O4O-CONTENT-HUB-TEMPLATE-FOUNDATION-V1
 * WO-O4O-GLYCOPHARM-STORE-HUB-CONTENT-COPY-API-FIX-V1:
 *   dashboardCopyApi → assetSnapshotApi.copy({ assetType:'cms' }) 전환.
 *   KPA/K-Cosmetics canonical copy 흐름 정렬.
 *   - /hub/content/:id 구 경로 카드 이동 제거
 *   - infoLinks /store-hub/content 허브 루프 → /store/library/contents
 *
 * ContentHubTemplate + GlycoPharm adapter + 카드 그리드 renderItems.
 */

import { useMemo } from 'react';
import { toast } from '@o4o/error-handling';
// WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1: 카드 그리드 공통화(@o4o/shared-space-ui)
import { ContentHubTemplate, contentHubCardGrid, type ContentHubConfig, type ContentHubItem } from '@o4o/shared-space-ui';
import { hubContentApi, type HubContentItemResponse } from '@/api/hubContent';
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

// ─── GlycoPharm Config ────────────────────────────────────────────────────────

function useGlycoContentHubConfig(userId?: string): ContentHubConfig {
  return useMemo(() => ({
    serviceKey: 'glycopharm',

    heroTitle: '매장에서 바로 쓰는 콘텐츠',
    heroDesc: 'GlycoPharm 약국을 위한 콘텐츠 자료실',
    searchPlaceholder: '콘텐츠 검색',

    filters: [
      { key: 'all',       label: '전체' },
      { key: 'notice',    label: '공지' },
      { key: 'guide',     label: '가이드' },
      { key: 'knowledge', label: '지식' },
      { key: 'promo',     label: '프로모션' },
      { key: 'news',      label: '뉴스' },
    ],

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
      // GlycoPharm 사용자-facing 문구는 "내 약국" 표현 유지 (WO-O4O-GLYCOPHARM-HUBCONTENT-PHARMACY-LABEL-RESTORE-AND-GUARD-V1)
      // ⚠️ "내 매장"으로 일괄 치환 금지 — GlycoPharm은 약국 전용 서비스
      toast.success(`"${item.title}" 이(가) 내 약국에 복사되었습니다.`);
    },

    copyLabel: '내 약국에 복사',
    copiedLabel: '복사 완료',
    copyingLabel: '복사 중...',
    afterCopyAction: { label: '작업하러 가기 →', href: '/store/library/contents' },

    renderItems: contentHubCardGrid('primary'),

    infoText: '복사된 콘텐츠는 ',
    infoLinks: [{ label: '내 약국 > 자산 관리', href: '/store/library/contents' }],
    // WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1: 가져오기=복사·원본 단절 안내 (약국 용어 유지)
    infoTextAfter: '에 별도 사본으로 저장됩니다. 원본이 수정·삭제되어도 내 약국 사본은 영향받지 않습니다.',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [userId]);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function HubContentListPage() {
  const { user } = useAuth();
  const config = useGlycoContentHubConfig(user?.id);
  return <ContentHubTemplate config={config} />;
}

export default HubContentListPage;
