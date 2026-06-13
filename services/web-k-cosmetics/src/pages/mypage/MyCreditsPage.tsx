/**
 * MyCreditsPage — 내 크레딧 (포인트 잔액 + 적립 내역)
 *
 * WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1
 * KPA Canonical 기준 정렬. API: GET /credits/me, GET /credits/me/transactions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageLayout, MyPageLoadingState, MyPageEmptyState } from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

const SOURCE_LABELS: Record<string, string> = {
  lesson_complete: '레슨 완료',
  quiz_pass: '퀴즈 통과',
  course_complete: '코스 완료',
  admin_grant: '관리자 지급',
  survey_complete: '설문 완료',
};

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
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <p className="text-gray-700 mb-4">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <MyPageLayout
      title="내 크레딧"
      subtitle="학습 활동으로 획득한 크레딧을 확인하세요"
      width="wide"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      {/* Balance */}
      <div className="bg-white rounded-2xl shadow-sm p-8 mb-4 text-center">
        <p className="text-sm text-gray-400 mb-2">보유 크레딧</p>
        <p className="text-5xl font-bold text-primary-600 mb-2">{balance.toLocaleString()} C</p>
        <p className="text-xs text-gray-400">리워드가 설정된 강의에서 조건을 충족하면 크레딧이 적립됩니다</p>
      </div>

      {/* Reward policy notice — WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1:
          리워드는 강의별 정책(rewardPolicy)이 설정된 경우에만 지급된다. 고정 스케줄(+10/+20/+50) 노출 금지. */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-500 leading-relaxed">
          일부 강의는 레슨 완료, 퀴즈 통과, 강의 수료 등에 따라 리워드를 제공할 수 있습니다.
          지급 여부와 금액은 강의별 리워드 정책에 따라 달라집니다.
        </p>
      </div>

      {/* History */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">적립 내역</h3>

      {loading && <MyPageLoadingState />}

      {!loading && error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && transactions.length === 0 && (
        <MyPageEmptyState
          description="적립 내역이 없습니다."
          actionLabel="학습 시작"
          onAction={() => navigate('/lms')}
        />
      )}

      {!loading && !error && transactions.length > 0 && (
        <>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {SOURCE_LABELS[tx.sourceType] ?? tx.sourceType}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} C
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </MyPageLayout>
  );
}
