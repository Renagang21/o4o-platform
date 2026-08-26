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

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function usePharmacyHubResourcesConfig(
  mine: boolean,
  onToggleMine: () => void,
): ResourcesHubConfig {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
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
          mine,
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
      //
      // WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §7:
      //   공개 목록은 `published` 만 보여주므로, 등록 직후(draft·pending)의 자기 자료가
      //   목록에 없어 `getOwnerEditHref` 수정 경로에 도달할 수 없었다.
      //   콘텐츠 목록(`/content`)과 같은 `내 자료 / 전체 자료` 축을 둔다.
      ...(isAuthenticated
        ? {
            createAction: { label: '자료 등록', href: '/resources/new' },
            headerAction: (
              <div style={styles.actions}>
                <button
                  type="button"
                  style={{ ...styles.toggleBtn, ...(mine ? styles.toggleBtnOn : {}) }}
                  onClick={onToggleMine}
                >
                  {mine ? '전체 자료' : '내 자료'}
                </button>
                <button
                  type="button"
                  style={styles.createBtn}
                  onClick={() => navigate('/resources/new')}
                >
                  자료 등록
                </button>
              </div>
            ),
          }
        : {}),
      getCurrentUserId: () => userId,
      getOwnerEditHref: (id) => `/resources/${id}/edit`,
      // cms_contents 에는 DELETE 엔드포인트가 없다 — 실제로 존재하는 보관 전이를 쓴다.
      onOwnerDelete: async (id) => { await archivePharmacyHubResource(id); },

      // #28 추천 toggle — 공통 `POST /cms/contents/:id/recommend`
      onToggleRecommend: (id) => togglePharmacyHubCmsRecommend(id),
      onToast: (message, type) => (type === 'error' ? toast.error(message) : toast.success(message)),

      emptyMessage: mine ? '등록한 자료가 없습니다.' : '등록된 자료가 없습니다.',
      emptyFilteredMessage: '검색 결과가 없습니다.',
    }),
    [userId, isAuthenticated, mine, onToggleMine, navigate],
  );
}

const styles: Record<string, React.CSSProperties> = {
  actions: { display: 'inline-flex', gap: 8 },
  toggleBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '8px 14px', fontSize: '0.8125rem',
    fontWeight: 600, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 8, cursor: 'pointer',
  },
  toggleBtnOn: { color: '#0f766e', borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
  createBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
    fontWeight: 600, color: '#ffffff', backgroundColor: '#0f766e', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },
};

export default function PharmacyHubResourcesPage() {
  const [mine, setMine] = useState(false);
  const onToggleMine = useCallback(() => setMine((v) => !v), []);
  // 축을 바꾸면 template 내부 목록 state 를 초기화한다 (KPA 와 같은 remount 방식).
  return (
    <ResourcesHubTemplate
      key={mine ? 'mine' : 'all'}
      config={usePharmacyHubResourcesConfig(mine, onToggleMine)}
    />
  );
}
