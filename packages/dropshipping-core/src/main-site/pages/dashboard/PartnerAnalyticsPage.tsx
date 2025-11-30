/**
 * Partner Analytics Page
 * 파트너 성과 분석 대시보드
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { partnerLinkAPI } from '@/services/partnerLinkApi';
import { handleApiError } from '@/utils/apiErrorHandler';
import {
  AnalyticsPeriod,
  PartnerAnalyticsSummary,
  PartnerAnalyticsTimeseries,
  PartnerLinkSummary,
} from '@/types/partner-link';

export const PartnerAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [summary, setSummary] = useState<PartnerAnalyticsSummary | null>(null);
  const [timeseries, setTimeseries] = useState<PartnerAnalyticsTimeseries | null>(null);
  const [linkSummaries, setLinkSummaries] = useState<PartnerLinkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, timeseriesRes, linksRes] = await Promise.all([
          partnerLinkAPI.fetchAnalyticsSummary(period),
          partnerLinkAPI.fetchAnalyticsTimeseries(period),
          partnerLinkAPI.fetchLinkSummaries(period),
        ]);

        setSummary(summaryRes.data ?? null);
        setTimeseries(timeseriesRes.data ?? null);
        setLinkSummaries(linksRes.data ?? []);
      } catch (err) {
        const errorMessage = handleApiError(err, '분석 데이터');
        setError(errorMessage);
        setSummary(null);
        setTimeseries(null);
        setLinkSummaries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  // Retry handler
  const handleRetry = () => {
    window.location.reload();
  };

  // Period labels
  const periodLabels: Record<AnalyticsPeriod, string> = {
    '7d': '최근 7일',
    '30d': '최근 30일',
    '90d': '최근 90일',
    '365d': '최근 1년',
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString()}원`;
  };

  // Format percentage
  const formatPercent = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value.toFixed(2)}%`;
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: '파트너 대시보드', href: '/dashboard/partner' },
          { label: '성과 분석', isCurrent: true },
        ]}
      />

      <PageHeader
        title="성과 분석"
        subtitle="내 링크들의 클릭, 전환, 수익, 커미션을 한눈에 확인합니다."
        actions={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
            <option value="90d">최근 90일</option>
            <option value="365d">최근 1년</option>
          </select>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">데이터를 불러오는 중입니다...</div>
      ) : error ? (
        <div className="py-12">
          <EmptyState
            icon={<AlertCircle className="w-16 h-16 text-red-400" />}
            title="분석 데이터를 불러올 수 없습니다"
            description={error}
            action={
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                다시 시도
              </button>
            }
          />
        </div>
      ) : !summary ? (
        <div className="py-12">
          <EmptyState
            icon={<BarChart3 className="w-16 h-16 text-gray-400" />}
            title="선택한 기간에 대한 분석 데이터가 없습니다"
            description="링크를 생성하고 홍보를 시작하면 성과를 확인할 수 있습니다."
            action={
              <button
                onClick={() => navigate('/dashboard/partner/links/new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                링크 생성하기
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Clicks */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">총 클릭수</div>
                <MousePointerClick className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {(summary.total_clicks ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">{periodLabels[period]}</div>
            </div>

            {/* Total Conversions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">총 전환수</div>
                <ShoppingCart className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {(summary.total_conversions ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">{periodLabels[period]}</div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">총 매출 (추정)</div>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(summary.total_revenue ?? 0)}
              </div>
              <div className="text-xs text-gray-500">{periodLabels[period]}</div>
            </div>

            {/* Total Commission */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">총 예상 커미션</div>
                <DollarSign className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(summary.total_commission ?? 0)}
              </div>
              <div className="text-xs text-gray-500">{periodLabels[period]}</div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Percent className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">평균 클릭률 (CTR)</h3>
              </div>
              <div className="text-4xl font-bold text-blue-600">
                {formatPercent(summary.average_ctr)}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                링크를 본 사람 중 클릭한 비율
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Percent className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">평균 전환율 (CVR)</h3>
              </div>
              <div className="text-4xl font-bold text-green-600">
                {formatPercent(summary.average_cvr)}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                클릭 후 구매까지 이어진 비율
              </p>
            </div>
          </div>

          {/* Trend Chart */}
          {timeseries && timeseries.points.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">성과 트렌드</h3>
              <div className="space-y-4">
                {/* Simple bar chart */}
                <div className="h-64 flex items-end gap-1">
                  {timeseries.points.map((point, index) => {
                    const maxCommission = Math.max(...timeseries.points.map(p => p.commission));
                    const height = maxCommission > 0 ? (point.commission / maxCommission) * 100 : 0;

                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center"
                        title={`${point.date}\n클릭: ${point.clicks}\n전환: ${point.conversions}\n커미션: ${formatCurrency(point.commission)}`}
                      >
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                          style={{ height: `${height}%`, minHeight: height > 0 ? '2px' : '0' }}
                        />
                        {index % Math.ceil(timeseries.points.length / 7) === 0 && (
                          <div className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                            {new Date(point.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>일별 커미션</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Links Table */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">상위 성과 링크</h3>
              <p className="text-sm text-gray-500 mt-1">
                커미션 기준 상위 링크 목록
              </p>
            </div>

            {linkSummaries.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                아직 수집된 데이터가 없습니다. 링크를 생성하고 홍보를 시작해 보세요.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        링크명
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        클릭수
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        전환수
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        전환율
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        예상 커미션
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {linkSummaries.slice(0, 10).map((link) => (
                      <tr key={link.link_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{link.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {(link.total_clicks ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {(link.total_conversions ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span className={`font-medium ${(link.cvr ?? 0) >= 5 ? 'text-green-600' : 'text-gray-900'}`}>
                            {formatPercent(link.cvr)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatCurrency(link.total_commission ?? 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          <button
                            onClick={() => navigate(`/dashboard/partner/links/${link.link_id}/edit`)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            상세보기 →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PartnerAnalyticsPage;
