/**
 * Admin Pending Tasks API — 관리자 대기 업무 카운터
 *
 * WO-O4O-ADMIN-PENDING-WORK-COUNTER-AND-HEADER-ENTRY-V1
 * backend: GET /api/v1/admin/pending-tasks/summary (platform:super_admin)
 */
import { authClient } from '@o4o/auth-client';

export interface AdminPendingTasksSummary {
  productRegistrationRequests: number;
  manualReviews: number;
  total: number;
}

export async function fetchAdminPendingTasksSummary(): Promise<AdminPendingTasksSummary> {
  const res = await authClient.api.get('/admin/pending-tasks/summary');
  return res.data.data;
}
