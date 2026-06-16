/**
 * ForumCategoriesManagementPage - 포럼 목록 관리 (K-Cosmetics)
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-CATEGORIES-GP-KCOS-INTRODUCE-V1:
 *   @o4o/operator-core-ui/modules/forum-categories 의 OperatorForumCategoriesPage 도입.
 *   기존 공통 backend(/api/v1/forum/operator/categories*, serviceCode=k-cosmetics)를 그대로 호출하는
 *   client adapter 만 추가 (backend 변경 없음). hardDelete 409 안전장치는 backend 정책 그대로.
 *
 * client 는 KPA forumOperatorApi 의 categories subset 과 동일 (axios authClient.api, base /api/v1).
 */

import { OperatorForumCategoriesPage } from '@o4o/operator-core-ui/modules/forum-categories';
import type { ForumCategoriesClient } from '@o4o/operator-core-ui/modules/forum-categories';
import { api } from '@/lib/apiClient';

const BASE = '/forum/operator';
const SVC = 'serviceCode=k-cosmetics';

const client: ForumCategoriesClient = {
  getCategories: async () => {
    try {
      const res = await api.get(`${BASE}/categories?${SVC}`);
      return res.data;
    } catch {
      return { success: true, data: [], count: 0 };
    }
  },
  updateCategory: async (id, data) => {
    const res = await api.patch(`${BASE}/categories/${id}?${SVC}`, data);
    return res.data;
  },
  directDeactivate: async (id, data) => {
    const res = await api.post(`${BASE}/categories/${id}/deactivate?${SVC}`, data);
    return res.data;
  },
  activate: async (id) => {
    const res = await api.post(`${BASE}/categories/${id}/activate?${SVC}`, {});
    return res.data;
  },
  getDeleteCheck: async (id) => {
    const res = await api.get(`${BASE}/categories/${id}/delete-check?${SVC}`);
    return res.data;
  },
  hardDelete: async (id, data) => {
    const res = await api.delete(`${BASE}/categories/${id}/hard?${SVC}`, { data });
    return res.data;
  },
};

export default function ForumCategoriesManagementPage() {
  return <OperatorForumCategoriesPage client={client} tableId="kcosmetics-forum-categories" />;
}
