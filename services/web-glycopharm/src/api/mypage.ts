/**
 * GlycoPharm MyPage API
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
 *
 * Backend: GET /api/v1/glycopharm/mypage/my-requests
 * 회원 신청(membership) + 약국 참여 신청(service_application) 통합 반환
 */

import { api } from '@/lib/apiClient';
import type { MyRequestItem } from '@o4o/account-ui';

export const mypageApi = {
  getMyRequests: async (): Promise<MyRequestItem[]> => {
    const { data } = await api.get<{ success: boolean; data: MyRequestItem[] }>(
      '/glycopharm/mypage/my-requests',
    );
    return data.data ?? [];
  },
};
