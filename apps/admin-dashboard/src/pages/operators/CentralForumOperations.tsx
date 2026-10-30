import { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { OperatorForumRequestsConsolePage, type ForumRequestsConsoleClient } from '@o4o/operator-core-ui/modules/forum-requests';
import { OperatorForumDeleteRequestsConsolePage, type ForumDeleteRequestsConsoleClient } from '@o4o/operator-core-ui/modules/forum-delete-requests';
import { OperatorForumCategoriesPage, type ForumCategoriesClient } from '@o4o/operator-core-ui/modules/forum-categories';
import { OperatorForumAnalyticsPage, type ForumAnalyticsClient } from '@o4o/operator-core-ui/modules/forum-analytics';
import { ForumDeletedManagementPage, type DeletedForumAdminClient } from '@o4o/operator-core-ui/modules/forum-deleted';
const http = authClient.api;
const base = '/forum/operator';
const admin = '/forum/admin';
const params = { serviceCode: 'neture' };
const idPath = (id: string) => encodeURIComponent(id);
async function get(url: string, extra?: Record<string, unknown>) {
  const response = (await http.get(url, { params: { ...params, ...extra } })).data;
  if (response.success !== true) throw new Error(response.error || '포럼 정보를 불러오지 못했습니다.');
  return response;
}
const post = async (url: string, data?: unknown) => (await http.post(url, data ?? {}, { params })).data;
const result = (response: { success?: boolean; error?: string }) => response.success ? { ok: true } : { ok: false, error: response.error };
const requests: ForumRequestsConsoleClient = {
  list: async query => (await get(`${base}/requests`, query)).data,
  review: async (id, data) => result((await http.patch(`${base}/requests/${idPath(id)}/review`, data, { params })).data),
  batchReview: (ids, action) => post(`${base}/requests/batch-review`, { ids, action }),
};
const deletions: ForumDeleteRequestsConsoleClient = {
  list: async query => (await get(`${base}/delete-requests`, query)).data,
  approve: async (id, data) => result(await post(`${base}/delete-requests/${idPath(id)}/approve`, data)),
  reject: async (id, data) => result(await post(`${base}/delete-requests/${idPath(id)}/reject`, data)),
  batchApprove: (ids, data) => post(`${base}/delete-requests/batch-approve`, { ids, ...data }),
  batchReject: (ids, data) => post(`${base}/delete-requests/batch-reject`, { ids, ...data }),
};
const categories: ForumCategoriesClient = {
  getCategories: () => get(`${base}/categories`),
  updateCategory: async (id, data) => (await http.patch(`${base}/categories/${idPath(id)}`, data, { params })).data,
  directDeactivate: (id, data) => post(`${base}/categories/${idPath(id)}/deactivate`, data),
  activate: id => post(`${base}/categories/${idPath(id)}/activate`),
  // Hard delete remains exclusively in the existing Admin API below.
  getDeleteCheck: async () => { throw new Error('Admin의 삭제된 포럼 관리에서 확인해 주세요.'); },
  hardDelete: async () => { throw new Error('Admin의 삭제된 포럼 관리에서 처리해 주세요.'); },
};
const deleted: DeletedForumAdminClient = {
  getDeletedForums: () => get(`${admin}/forums/deleted`),
  getHardDeleteCheck: id => get(`${admin}/forums/${idPath(id)}/hard-delete-check`),
  restore: id => post(`${admin}/forums/${idPath(id)}/restore`),
  hardDelete: async (id, data) => (await http.delete(`${admin}/forums/${idPath(id)}/hard`, { data, params })).data,
  getAuditLogs: limit => get(`${admin}/audit-logs`, { limit }),
};
const analytics: ForumAnalyticsClient = {
  getSummary: () => get(`${base}/analytics/summary`),
  getTrend: days => get(`${base}/analytics/trend`, { days }),
  getActivity: limit => get(`${base}/analytics/activity`, { limit }),
};
export default function CentralForumOperations({ area }: { area: string }) {
  const [tab, setTab] = useState('requests');
  if (area === 'forums') return <OperatorForumRequestsConsolePage serviceKey="neture" client={requests} title="포럼 신청 관리" description="개설 신청의 승인·반려·보완 요청을 처리합니다." tableId="central-neture-forum-requests" />;
  if (area === 'forum-deleted') return <ForumDeletedManagementPage client={deleted} operatorDeleteHref="/operations/neture/forum-delete" />;
  if (area === 'forum-analytics') return <OperatorForumAnalyticsPage client={analytics} accent={{ iconText: 'text-blue-600', barColor: 'bg-blue-500', activeForumText: 'text-blue-600', activeForumBg: 'bg-blue-50' }} />;
  return <section><div role="tablist" aria-label="포럼 삭제 업무">{[['requests', '삭제 요청'], ['direct', '포럼 직접 삭제']].map(([key, label]) => <button type="button" key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'requests' ? <OperatorForumDeleteRequestsConsolePage serviceKey="neture" client={deletions} title="포럼 삭제 요청" tableId="central-neture-forum-delete" /> : <OperatorForumCategoriesPage client={categories} disableHardDelete tableId="central-neture-forum-categories" />}
  </section>;
}
