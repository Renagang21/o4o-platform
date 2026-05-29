/**
 * MyRequestsPage — 내 신청 내역 (K-Cosmetics)
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
 *
 * Frontend aggregation:
 *   1) GET /cosmetics/stores/application/me — 매장 입점 신청 (store_application)
 *   2) GET /lms/enrollments/me             — LMS 수강 신청 (course_enrollment)
 */

import { useState, useEffect, useCallback } from 'react';
import { MyPageLayout, MyRequestsInbox } from '@o4o/account-ui';
import type { MyRequestItem } from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';
import { kcosMyRequestsApi } from '@/api/mypage';

const TYPE_FILTERS = [
  { key: '', label: '전체' },
  { key: 'store_application', label: '매장 신청' },
  { key: 'course_enrollment', label: '수강 신청' },
];

export default function MyRequestsPage() {
  const [items, setItems] = useState<MyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kcosMyRequestsApi.getMyRequests();
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
    <MyPageLayout
      title="내 신청 내역"
      subtitle="매장 입점 및 수강 신청 내역을 확인합니다"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      <MyRequestsInbox
        items={items}
        loading={loading}
        error={error}
        onRetry={loadData}
        typeFilters={TYPE_FILTERS}
        emptyTitle="신청 내역이 없습니다"
        emptyDescription="매장 입점 신청 또는 강의 수강 신청을 하면 여기에 표시됩니다"
      />
    </MyPageLayout>
  );
}
