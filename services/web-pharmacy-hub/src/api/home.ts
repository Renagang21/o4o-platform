/**
 * Home API — Pharmacy-Hub
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §5
 *
 * Backend: GET /api/v1/pharmacy-hub/home/latest?type={type}&limit={limit}
 * 공통 `LatestActivitySection` 의 item 계약(type/id/title/authorName/createdAt/href)을 그대로 반환한다.
 */
import { api } from '../lib/apiClient';

export interface LatestItem {
  type: string;
  id: string;
  title: string;
  authorName?: string;
  createdAt: string;
  href: string;
}

interface LatestResponse {
  success: boolean;
  data?: LatestItem[];
  error?: string;
}

export const homeApi = {
  async getLatest(params: { type?: string; limit?: number } = {}): Promise<LatestItem[]> {
    const query = new URLSearchParams();
    if (params.type) query.set('type', params.type);
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const response = await api.get<LatestResponse>(`/pharmacy-hub/home/latest${qs ? `?${qs}` : ''}`);
    const body = response.data;
    // 조회 실패를 빈 목록(정상 0건)으로 위장하지 않는다.
    if (!body?.success) throw new Error(body?.error || '최신 활동을 불러오지 못했습니다.');
    return body.data ?? [];
  },
};
