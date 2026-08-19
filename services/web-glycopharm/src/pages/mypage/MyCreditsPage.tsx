/**
 * MyCreditsPage — 내 크레딧 (GlycoPharm wrapper)
 *
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §8
 * View 는 @o4o/account-ui MyCreditsView 로 공통화. 본 파일은 데이터 로딩 + navigation 만 담당.
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1 §4:
 *   공통 My Page navigation(navItems) adoption 누락분 교정.
 * API: GET /credits/me, GET /credits/me/transactions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageLayout, MyPageAuthRequired, MyCreditsView } from '@o4o/account-ui';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { GLYCOPHARM_MYPAGE_NAV_ITEMS } from './navItems';

export default function MyCreditsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user) loadData();
  }, [user, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [balRes, txRes] = await Promise.all([
        api.get<any>('/credits/me'),
        api.get<any>('/credits/me/transactions', { params: { page: currentPage, limit: 20 } }),
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
  };

  if (!isAuthenticated || !user) {
    // 로그인 안내도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지).
    return (
      <MyPageLayout title="내 크레딧" width="wide" navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}>
        <MyPageAuthRequired />
      </MyPageLayout>
    );
  }

  return (
    <MyPageLayout
      title="내 크레딧"
      subtitle="학습 활동으로 획득한 크레딧을 확인하세요"
      width="wide"
      navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}
    >
      <MyCreditsView
        balance={balance}
        transactions={transactions}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onBrowseCourses={() => navigate('/lms')}
      />
    </MyPageLayout>
  );
}
