/**
 * AiCardReportPage - AI 카드 노출 운영 리포트
 *
 * Work Order: WO-AI-CARD-EXPOSURE-REPORT-V1.1
 *
 * AI Core App의 공식 운영 리포트
 * - 운영자가 매일 봐도 의미 있는 데이터 제공
 * - 읽기 전용, 지속 사용
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// 타입 정의
interface ReportStats {
  period: {
    startDate: string;
    endDate: string;
  };
  kpi: {
    totalRequests: number;
    requestsWithCards: number;
    totalCards: number;
    cardExposureRate: number;
    avgCardsPerRequest: number;
  };
  cardCountDistribution: Record<number, number>;
  reasonDistribution: Record<string, number>;
  dailyTrend: Array<{
    date: string;
    requests: number;
    cards: number;
    avgCards: number;
    exposureRate: number;
  }>;
  reasonDescriptions: Record<string, { label: string; description: string }>;
}

type PeriodFilter = '1d' | '7d' | '30d' | '90d';

const periodLabels: Record<PeriodFilter, string> = {
  '1d': '오늘',
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
};

export default function AiCardReportPage() {
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportStats();
  }, [period]);

  const fetchReportStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/card-report?period=${period}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data?.success) {
        setStats(data.data);
      } else {
        // API가 없거나 데이터가 없는 경우 샘플 데이터 표시
        setStats(getSampleData());
      }
    } catch (err: any) {
      // API가 없거나 권한이 없는 경우 샘플 데이터 표시
      setStats(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  // 샘플 데이터 (API 연동 전 또는 데이터 없을 때)
  const getSampleData = (): ReportStats => {
    const now = new Date();
    const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      },
      kpi: {
        totalRequests: 0,
        requestsWithCards: 0,
        totalCards: 0,
        cardExposureRate: 0,
        avgCardsPerRequest: 0,
      },
      cardCountDistribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
      reasonDistribution: {
        same_store: 0,
        same_product: 0,
        same_category: 0,
        service_fallback: 0,
      },
      dailyTrend: [],
      reasonDescriptions: {
        same_store: { label: '같은 매장', description: '현재 보고 있는 매장의 다른 상품/정보' },
        same_product: { label: '같은 상품', description: '현재 보고 있는 상품과 관련된 정보' },
        same_category: { label: '같은 카테고리', description: '같은 카테고리에 속한 다른 상품' },
        service_fallback: { label: '서비스 대표', description: '특정 맥락이 없을 때 표시되는 서비스 대표 정보' },
      },
    };
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercent = (num: number) => `${num.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 카드 노출 리포트</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/admin/ai-card-rules" className="text-sm text-gray-500 hover:text-gray-700">
                노출 규칙 보기
              </Link>
              <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
                대시보드
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 카드 노출 리포트</h1>
          <p className="text-gray-500 mt-1">
            AI 응답에 표시된 카드의 노출 현황을 확인합니다.
          </p>
        </div>

        {/* Period Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">기간:</span>
            <div className="flex gap-2">
              {(Object.keys(periodLabels) as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    period === p
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : stats ? (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">전체 AI 질문</div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatNumber(stats.kpi.totalRequests)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {stats.period.startDate} ~ {stats.period.endDate}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">카드 노출 질문</div>
                <div className="text-3xl font-bold text-primary-600">
                  {formatNumber(stats.kpi.requestsWithCards)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  카드가 1개 이상 노출된 질문
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">카드 노출률</div>
                <div className="text-3xl font-bold text-green-600">
                  {formatPercent(stats.kpi.cardExposureRate)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  전체 질문 중 카드 노출 비율
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">평균 카드 수</div>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.kpi.avgCardsPerRequest.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  질문당 평균 노출 카드 수
                </div>
              </div>
            </div>

            {/* Card Count Distribution & Reason Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Card Count Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">카드 개수 분포</h2>
                <p className="text-sm text-gray-500 mb-4">
                  질문별 노출된 카드 개수 분포입니다. "3개가 과한지" 판단할 수 있습니다.
                </p>
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((count) => {
                    const value = stats.cardCountDistribution[count] || 0;
                    const total = Object.values(stats.cardCountDistribution).reduce((a, b) => a + b, 0);
                    const percent = total > 0 ? (value / total) * 100 : 0;

                    return (
                      <div key={count} className="flex items-center gap-4">
                        <div className="w-20 text-sm text-gray-600">
                          {count}개 카드
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                count === 0 ? 'bg-gray-400' :
                                count === 1 ? 'bg-blue-400' :
                                count === 2 ? 'bg-green-400' : 'bg-primary-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <span className="font-medium">{formatNumber(value)}</span>
                          <span className="text-gray-400 text-sm ml-1">({percent.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">노출 사유 분포</h2>
                <p className="text-sm text-gray-500 mb-4">
                  카드가 노출된 이유별 분포입니다. fallback이 많으면 구조 개선이 필요합니다.
                </p>
                <div className="space-y-3">
                  {Object.entries(stats.reasonDistribution).map(([reason, value]) => {
                    const total = Object.values(stats.reasonDistribution).reduce((a, b) => a + b, 0);
                    const percent = total > 0 ? (value / total) * 100 : 0;
                    const desc = stats.reasonDescriptions[reason];

                    const colorClass =
                      reason === 'same_store' ? 'bg-green-400' :
                      reason === 'same_product' ? 'bg-blue-400' :
                      reason === 'same_category' ? 'bg-purple-400' : 'bg-gray-400';

                    return (
                      <div key={reason}>
                        <div className="flex items-center gap-4 mb-1">
                          <div className="w-28 text-sm font-medium text-gray-700">
                            {desc?.label || reason}
                          </div>
                          <div className="flex-1">
                            <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${colorClass}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-24 text-right">
                            <span className="font-medium">{formatNumber(value)}</span>
                            <span className="text-gray-400 text-sm ml-1">({percent.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 ml-32 mb-2">
                          {desc?.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Daily Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">일자별 추이</h2>
              <p className="text-sm text-gray-500 mb-4">
                일자별 AI 질문 수와 카드 노출 현황입니다. 증감 추세를 파악할 수 있습니다.
              </p>

              {stats.dailyTrend.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  해당 기간에 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500">날짜</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">AI 질문</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">노출 카드</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">평균 카드</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">노출률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.dailyTrend.slice(-14).map((day, index) => (
                        <tr
                          key={day.date}
                          className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                        >
                          <td className="py-3 px-2 text-gray-600">{day.date}</td>
                          <td className="py-3 px-2 text-right font-medium">{formatNumber(day.requests)}</td>
                          <td className="py-3 px-2 text-right text-primary-600">{formatNumber(day.cards)}</td>
                          <td className="py-3 px-2 text-right text-blue-600">{day.avgCards.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right text-green-600">{formatPercent(day.exposureRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            이 리포트는 AI Core App의 카드 노출 로그를 기반으로 생성됩니다.
            데이터가 누적될수록 더 정확한 분석이 가능합니다.
          </p>
        </div>
      </main>
    </div>
  );
}
