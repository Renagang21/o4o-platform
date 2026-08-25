/**
 * MyRequestsPage — 내 신청 내역 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §5 (#19 · #51)
 *
 * KPA `/mypage/my-requests` · K-Cosmetics `/mypage/my-requests` 와 같은 공통
 * `MyRequestsInbox` 를 채택한다. PH 의 개인 축 canonical 은 `/account` 이므로
 * 경로만 `/account/my-requests` 다 (`/mypage` 축을 새로 만들지 않는다).
 *
 * 집계는 `fetchPharmacyHubMyRequests` 담당 — 신규 backend 0.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import {
  MyPageShell,
  MyPageAuthRequired,
  MyRequestsInbox,
  type MyRequestItem,
} from '@o4o/account-ui';
import { PHARMACY_HUB_ACCOUNT_NAV_ITEMS } from './navItems';
import { fetchPharmacyHubMyRequests } from '../../lib/api/pharmacyHubMyRequests';
import { useAuth } from '../../contexts/AuthContext';

/** PH 에 실제 유입 경로가 있는 축만 탭으로 둔다(빈 탭 금지). */
const TYPE_FILTERS = [
  { key: '', label: '전체' },
  { key: 'forum_category', label: '포럼 개설' },
  { key: 'course_enrollment', label: '수강' },
];

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [items, setItems] = useState<MyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchPharmacyHubMyRequests());
    } catch {
      setError('신청 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [isLoading, isAuthenticated, load]);

  const frame = (children: React.ReactNode) => (
    <MyPageShell
      title="내 신청 내역"
      subtitle="포럼 개설 · 수강 신청의 진행 상태를 확인합니다"
      width="wide"
      basePath="/account"
      navItems={PHARMACY_HUB_ACCOUNT_NAV_ITEMS}
    >
      {children}
    </MyPageShell>
  );

  if (!isLoading && !isAuthenticated) {
    return frame(
      <MyPageAuthRequired
        description="내 신청 내역은 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => navigate('/login')}
      />,
    );
  }

  const actionSection = (
    <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4">
      <div className="mb-2 text-sm font-semibold text-teal-800">새 신청하기</div>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/forum/request"
          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-700 transition-colors hover:bg-teal-100"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          포럼 개설 신청
        </Link>
      </div>
    </div>
  );

  return frame(
    <MyRequestsInbox
      items={items}
      loading={loading || isLoading}
      error={error}
      onRetry={load}
      typeFilters={TYPE_FILTERS}
      actionSection={actionSection}
      emptyTitle="신청 내역이 없습니다"
      emptyDescription="포럼 개설이나 강의 수강을 신청하면 여기에 표시됩니다"
    />,
  );
}
