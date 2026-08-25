/**
 * PharmacyHubResourcesPage — Pharmacy-Hub 회원 자료실
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1
 *
 * 공통 `ResourcesHubTemplate` + PH adapter (read-only). Route: `/resources`.
 * KPA / K-Cosmetics / GlycoPharm / Neture 가 이미 소비하는 공통 View 를 그대로 채택한다 —
 * PH 전용 ResourceTable 복제 없음, shared View 내부 serviceKey 분기 추가 없음 (§9).
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 (#27·#28):
 *   KPA 는 자료 등록·수정이 **회원 capability** 다 (`/resources/new`, `/resources/:id/edit`).
 *   PH 도 같은 축을 갖는다 — 공통 template 이 이미 제공하는 슬롯
 *   (`createAction` / `getOwnerEditHref` / `onOwnerDelete`)에 연결만 한다. 공통 View 안에
 *   serviceKey 분기를 추가하지 않는다 (§9).
 *
 *   운영자 전용 액션(`getEditHref` / `onDelete` — 남의 자료 편집·삭제)은 연결하지 않는다.
 *   운영자 등록·검토는 별도 operator console 이 담당한다
 *   (§13 — learner 화면에 operator 기능 혼입 금지).
 */

import { useMemo } from 'react';
import { toast } from '@o4o/error-handling';
import {
  ResourcesHubTemplate,
  type ResourcesHubConfig,
  type ResourcesHubItem,
} from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  listPharmacyHubResources,
  getPharmacyHubResource,
  archivePharmacyHubResource,
  cmsAuthorId,
  type CmsContentItem,
} from '../../lib/api/pharmacyHubResources';
import {
  trackPharmacyHubCmsView,
  togglePharmacyHubCmsRecommend,
} from '../../lib/api/pharmacyHubCmsEngagement';

function mapCmsToResource(c: CmsContentItem): ResourcesHubItem {
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
    summary: c.summary ?? null,
    body: c.body ?? null,
    source_type,
    source_url,
    source_file_name,
    // WO-...-FULL-PARITY-CLOSURE-V1 (#28): 공통 CMS 가 engagement 축을 공급한다.
    // 서버가 수치를 못 실어 보낸 경우(필드 생략)에는 지어내지 않고 0 으로 표기한다.
    view_count: c.viewCount ?? 0,
    like_count: c.recommendCount,
    isRecommendedByMe: c.isRecommendedByMe,
    author_name: null,
    created_by: cmsAuthorId(c),
    created_at: c.publishedAt || c.createdAt,
  };
}

function usePharmacyHubResourcesConfig(): ResourcesHubConfig {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;

  return useMemo<ResourcesHubConfig>(
    () => ({
      serviceKey: 'pharmacy-hub',
      tableId: 'pharmacy-hub-resources',

      heroTitle: '자료실',
      heroDesc: '약국 운영에 활용할 수 있는 자료를 모아둔 공간입니다.',
      searchPlaceholder: '자료를 검색하세요',

      pageLimit: 12,

      fetchItems: async ({ page, limit, search }) => {
        const { items, total } = await listPharmacyHubResources({
          limit,
          offset: (page - 1) * limit,
          search,
        });
        return {
          items: items.map(mapCmsToResource),
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      },

      fetchDetail: async (id) => mapCmsToResource(await getPharmacyHubResource(id)),
      trackView: (id) => { void trackPharmacyHubCmsView(id); },

      // #27 회원 자료 등록·수정 — 로그인 회원에게만 노출한다.
      ...(isAuthenticated
        ? { createAction: { label: '자료 등록', href: '/resources/new' } }
        : {}),
      getCurrentUserId: () => userId,
      getOwnerEditHref: (id) => `/resources/${id}/edit`,
      // cms_contents 에는 DELETE 엔드포인트가 없다 — 실제로 존재하는 보관 전이를 쓴다.
      onOwnerDelete: async (id) => { await archivePharmacyHubResource(id); },

      // #28 추천 toggle — 공통 `POST /cms/contents/:id/recommend`
      onToggleRecommend: (id) => togglePharmacyHubCmsRecommend(id),
      onToast: (message, type) => (type === 'error' ? toast.error(message) : toast.success(message)),

      emptyMessage: '등록된 자료가 없습니다.',
      emptyFilteredMessage: '검색 결과가 없습니다.',
    }),
    [userId, isAuthenticated],
  );
}

export default function PharmacyHubResourcesPage() {
  return <ResourcesHubTemplate config={usePharmacyHubResourcesConfig()} />;
}
