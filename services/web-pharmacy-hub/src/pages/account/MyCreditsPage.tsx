/**
 * MyCreditsPage — 내 크레딧 (Pharmacy-Hub wrapper)
 *
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §15
 * "이수 학점(credits)" 은 KPA / K-Cosmetics / GlycoPharm 에서 실제 사용자 대상
 * capability 다(학습 활동 리워드 적립 — lesson_complete / quiz_pass / course_complete).
 * 지급 경로(RewardPolicyService → PointService → CreditService)는 service-neutral 이며
 * 원장(`/api/v1/credits/*`)도 사용자 단위 플랫폼 공통이다 → PH 도 같은 화면을 채택한다.
 * API: GET /credits/me, GET /credits/me/transactions
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageShell, MyPageAuthRequired, MyCreditsView } from '@o4o/account-ui';
import { PHARMACY_HUB_ACCOUNT_NAV_ITEMS } from './navItems';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

export default function MyCreditsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const [balRes, txRes] = await Promise.all([
        api.get<any>('/credits/me'),
        api.get<any>('/credits/me/transactions', { params: { page, limit: 20 } }),
      ]);
      setBalance(balRes.data?.data?.balance ?? balRes.data?.balance ?? 0);
      const txData = txRes.data?.data ?? txRes.data;
      setTransactions(txData?.transactions ?? []);
      setTotalPages(txData?.pagination?.totalPages ?? 1);
    } catch {
      setError('크레딧 정보를 불러오지 못했습니다.');
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
    void load(currentPage);
  }, [isLoading, isAuthenticated, currentPage, load]);

  const frame = (children: React.ReactNode) => (
    <MyPageShell
      title="내 크레딧"
      subtitle="학습 활동으로 적립된 크레딧을 확인하세요"
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
        description="내 크레딧은 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => navigate('/login')}
      />,
    );
  }

  return frame(
    <MyCreditsView
      balance={balance}
      transactions={transactions}
      loading={loading || isLoading}
      error={error}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      onBrowseCourses={() => navigate('/education')}
    />,
  );
}
