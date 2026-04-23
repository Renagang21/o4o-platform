/**
 * ResourcesHubPage — KPA 자료실
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-FOUNDATION-V1
 *
 * ResourcesHubTemplate + KPA adapter.
 * KPA 전용 API(resourcesApi), operator 조건, 문구는
 * kpaResourcesConfig에만 위치한다.
 */

import { useMemo } from 'react';
import { ResourcesHubTemplate, type ResourcesHubConfig, type ResourcesHubItem } from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';
import { resourcesApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';

// ─── KPA Config ───────────────────────────────────────────────────────────────

function useKpaResourcesConfig(isOperator: boolean): ResourcesHubConfig {
  return useMemo(() => ({
    serviceKey: 'kpa-society',
    tableId: 'kpa-resources',

    title: '자료실',
    subtitle: '회원들이 함께 이용하는 공동자료실입니다.',
    searchPlaceholder: '자료를 검색하세요 (제목, 내용, 등록자)',

    fetchItems: async ({ page, limit, search }) => {
      const res = await resourcesApi.list({ page, limit, search, sort: 'latest' });
      const d = res.data;
      return {
        items: (d.items || []) as ResourcesHubItem[],
        total: d.total || 0,
        totalPages: d.totalPages || 1,
      };
    },

    fetchDetail: async (id) => {
      const res = await resourcesApi.getDetail(id);
      return res.data as ResourcesHubItem;
    },

    trackView: (id) => { resourcesApi.trackView(id).catch(() => {}); },

    createAction: isOperator
      ? { label: '자료 등록', href: '/operator/resources/new' }
      : undefined,

    getEditHref: isOperator
      ? (id) => `/operator/resources/${id}/edit`
      : undefined,

    onDelete: isOperator
      ? async (id) => {
          await resourcesApi.delete(id);
          toast.success('자료가 삭제되었습니다');
        }
      : undefined,

    onBulkDelete: isOperator
      ? async (ids) => {
          await Promise.all(ids.map(id => resourcesApi.delete(id)));
          toast.success(`${ids.length}개가 삭제되었습니다`);
        }
      : undefined,

    emptyMessage: '등록된 자료가 없습니다.',
    emptyFilteredMessage: '검색 결과가 없습니다.',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isOperator]);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function ResourcesHubPage() {
  const { user } = useAuth();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);
  const config = useKpaResourcesConfig(isOperator);
  return <ResourcesHubTemplate config={config} />;
}

export default ResourcesHubPage;
