/**
 * LmsMemberCredits
 *
 * 약사 회원용 평점 관리 페이지
 * - 평점 요약 (총 누적, 당해년도, 검증 대기)
 * - 연도별 평점 차트
 * - 유형별 평점 분류
 * - 평점 내역 목록
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';
import { CreditSummaryCard } from '@/components/lms-yaksa';
import type { CreditRecord, CreditSummary } from '@/lib/api/lmsYaksaMember';

type FilterYear = 'all' | number;
type FilterType = 'all' | string;

export function LmsMemberCredits() {
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<FilterYear>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const loadCredits = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 평점 요약과 내역 동시 로드
      const [summaryRes, creditsRes] = await Promise.all([
        authClient.api.get('/lms/yaksa/member/credits/summary'),
        authClient.api.get('/lms/yaksa/member/credits'),
      ]);

      setSummary(summaryRes.data);
      setCredits(creditsRes.data.items || creditsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load credits:', err);
      setError('평점 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // 유형 목록 추출
  const availableTypes = Array.from(
    new Set(credits.map((c) => c.type).filter(Boolean))
  );

  // 필터링된 목록
  const filteredCredits = credits.filter((credit) => {
    if (filterYear !== 'all') {
      const creditYear = new Date(credit.earnedAt).getFullYear();
      if (creditYear !== filterYear) return false;
    }
    if (filterType !== 'all' && credit.type !== filterType) {
      return false;
    }
    return true;
  });

  // 날짜순 정렬 (최신순)
  const sortedCredits = [...filteredCredits].sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
  );

  // 유형 라벨
  const typeLabels: Record<string, string> = {
    course_completion: '강좌 이수',
    attendance: '출석',
    external: '외부 교육',
    manual_adjustment: '수동 조정',
  };

  // 필터링된 총 평점
  const filteredTotal = filteredCredits.reduce((sum, c) => sum + c.amount, 0);

  if (isLoading) {
    return <PageLoading message="평점 정보를 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="평점 관리"
        subtitle="평점 현황 및 내역"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '회원', href: '/member' },
          { label: '교육 대시보드', href: '/member/lms/dashboard' },
          { label: '평점 관리' },
        ]}
        actions={
          <Link
            to="/member/lms/dashboard"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← 대시보드로
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
            <button
              type="button"
              onClick={loadCredits}
              className="ml-4 text-red-600 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            {/* 평점 요약 카드 */}
            {summary && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <CreditSummaryCard summary={summary} showChart />

                {/* 상세 요약 */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">평점 상세</h3>

                  <div className="space-y-4">
                    {/* 연도별 목표 달성 */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">{currentYear}년 목표</span>
                        <span className="font-medium">
                          {summary.currentYearCredits.toFixed(1)} / 8.0 평점
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            summary.currentYearCredits >= 8 ? 'bg-green-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min((summary.currentYearCredits / 8) * 100, 100)}%` }}
                        />
                      </div>
                      {summary.currentYearCredits >= 8 && (
                        <p className="text-xs text-green-600 mt-1">✅ 연간 목표 달성!</p>
                      )}
                    </div>

                    {/* 검증 상태 */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">검증 완료</span>
                        <span className="text-lg font-bold text-green-600">
                          {(summary.totalCredits - summary.unverifiedCredits).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">검증 대기</span>
                        <span className="text-lg font-bold text-yellow-600">
                          {summary.unverifiedCredits.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* 유형별 분포 */}
                    {Object.keys(summary.byType).length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">유형별 분포</h4>
                        <div className="space-y-2">
                          {Object.entries(summary.byType).map(([type, amount]) => {
                            const percentage = summary.totalCredits > 0
                              ? (amount / summary.totalCredits) * 100
                              : 0;
                            return (
                              <div key={type} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-20">
                                  {typeLabels[type] || type}
                                </span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-400"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium w-12 text-right">
                                  {amount.toFixed(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 필터 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* 연도 필터 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">연도</label>
                  <select
                    value={filterYear}
                    onChange={(e) =>
                      setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                </div>

                {/* 유형 필터 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">유형</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {typeLabels[type] || type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 필터 결과 */}
                <div className="ml-auto text-sm text-gray-500">
                  {filteredCredits.length}건 / {filteredTotal.toFixed(1)} 평점
                </div>
              </div>
            </div>

            {/* 평점 내역 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">평점 내역</h3>
              </div>

              {sortedCredits.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon="📊"
                    title="평점 내역이 없습니다"
                    description={
                      filterYear !== 'all' || filterType !== 'all'
                        ? '해당 조건의 평점 내역이 없습니다.'
                        : '아직 취득한 평점이 없습니다. 교육을 이수하면 평점이 기록됩니다.'
                    }
                    action={
                      filterYear !== 'all' || filterType !== 'all' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterYear('all');
                            setFilterType('all');
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                          필터 초기화
                        </button>
                      ) : (
                        <Link
                          to="/member/lms/required-courses"
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                          필수 교육 보기
                        </Link>
                      )
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sortedCredits.map((credit) => (
                    <div
                      key={credit.id}
                      className="px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                credit.isVerified
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {credit.isVerified ? '검증됨' : '검증 대기'}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              {typeLabels[credit.type] || credit.type}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {credit.description || credit.courseTitle || '평점 취득'}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(credit.earnedAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-lg font-bold ${
                              credit.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {credit.amount >= 0 ? '+' : ''}
                            {credit.amount.toFixed(1)}
                          </span>
                          <p className="text-xs text-gray-500">평점</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LmsMemberCredits;
