/**
 * MyRequestsPage — 내 신청 내역 (GlycoPharm)
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
 *
 * Backend unified endpoint:
 *   GET /api/v1/glycopharm/mypage/my-requests
 *   → membership(약사 회원 신청) + service_application(약국 참여 신청) 통합
 */

import { useState, useEffect, useCallback } from 'react';
import { MyPageLayout } from '@o4o/account-ui';
import { MyRequestsInbox } from '@o4o/account-ui';
import type { MyRequestItem } from '@o4o/account-ui';
import { mypageApi } from '@/api/mypage';

const TYPE_FILTERS = [
  { key: '', label: '전체' },
  { key: 'membership', label: '회원 신청' },
  { key: 'service_application', label: '약국 참여' },
];

export default function MyRequestsPage() {
  const [items, setItems] = useState<MyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mypageApi.getMyRequests();
      setItems(data);
    } catch {
      setError('신청 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <MyPageLayout title="내 신청 내역" subtitle="회원 신청 및 약국 참여 신청 내역을 확인합니다" width="wide">
      <MyRequestsInbox
        items={items}
        loading={loading}
        error={error}
        onRetry={loadData}
        typeFilters={TYPE_FILTERS}
        emptyTitle="신청 내역이 없습니다"
        emptyDescription="약사 회원 신청 또는 약국 참여 신청을 하면 여기에 표시됩니다"
      />
    </MyPageLayout>
  );
}
