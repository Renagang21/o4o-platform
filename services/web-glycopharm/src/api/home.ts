/**
 * Home Page API — GlycoPharm
 *
 * WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-API-V1: Backend /api/v1/glycopharm/home/latest
 * WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1: Frontend latest section
 *
 * KPA api/home.ts 의 LatestItem shape 1:1 mirror — Backend 가 동일 shape 반환.
 */

import { apiClient } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LatestItem {
  type: 'forum' | 'course' | 'content' | 'resource' | 'signage';
  id: string;
  title: string;
  authorName?: string;
  createdAt: string;
  href: string;
}

// ─── API ───────────────────────────────────────────────────────────────────

export const homeApi = {
  /**
   * 최신 활동 목록 — type=all|forum|course|content|resource|signage
   *
   * Backend: GET /api/v1/glycopharm/home/latest?type={type}&limit={limit}
   * Response: { success: true, data: LatestItem[] }
   */
  getLatest: async (params?: { type?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const path = `/api/v1/glycopharm/home/latest${qs ? `?${qs}` : ''}`;
    return apiClient.get<LatestItem[]>(path);
  },
};
