import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePartnerStore } from '../../store/partnerStore';

const PartnerStats: React.FC = () => {
  const { 
    partner,
    stats,
    referralLinks,
    loading,
    error,
    getPartnerStats,
    getReferralLinks,
    clearError
  } = usePartnerStore();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'clicks' | 'conversions'>('clicks');

  useEffect(() => {
    if (partner) {
      getPartnerStats();
      getReferralLinks();
    }
  }, [partner, timeRange]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!partner) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">파트너 인증이 필요합니다</h2>
        <Link
          to="/partner/apply"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          파트너 신청하기
        </Link>
      </div>
    );
  }

  const getMetricValue = (day: any) => {
    switch (selectedMetric) {
      case 'clicks': return day.clicks;
      case 'conversions': return day.conversions;
      default: return 0;
    }
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'clicks': return '클릭수';
      case 'conversions': return '전환수';
      default: return '';
    }
  };

  const maxValue = stats?.dailyStats ? 
    Math.max(...stats.dailyStats.map(getMetricValue)) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">성과 통계</h1>
              <p className="text-gray-600">상세한 성과 분석과 인사이트를 확인하세요</p>
            </div>
            <Link
              to="/partner/dashboard"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition"
            >
              ← 대시보드
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        {/* 주요 지표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 클릭수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalClicks?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 전환수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalConversions?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전환율</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.conversionRate?.toFixed(1) || '0.0'}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">성과 추이</h2>
                <p className="text-sm text-gray-600">시간별 성과 변화를 확인하세요</p>
              </div>
              <div className="flex space-x-4">
                {/* 지표 선택 */}
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as any)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="clicks">클릭수</option>
                  <option value="conversions">전환수</option>
                </select>
                
                {/* 기간 선택 */}
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="7d">최근 7일</option>
                  <option value="30d">최근 30일</option>
                  <option value="90d">최근 90일</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            {loading.stats ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : stats?.dailyStats?.length ? (
              <div>
                {/* 간단한 바 차트 */}
                <div className="mb-6">
                  <div className="flex items-end justify-between space-x-1 h-64">
                    {stats.dailyStats.slice(-14).map((day, index) => {
                      const value = getMetricValue(day);
                      const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div
                            className="bg-blue-500 rounded-t min-h-[4px] w-full mb-2 transition-all duration-300 hover:bg-blue-600"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${day.date}: ${value.toLocaleString()}`}
                          />
                          <span className="text-xs text-gray-500 transform rotate-45 origin-top-left">
                            {day.date.split('-').slice(1).join('/')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center text-sm text-gray-600 mt-4">
                    {getMetricLabel()} 추이 (최근 14일)
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">통계 데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 상세 데이터 테이블 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">일별 상세 데이터</h2>
            <p className="text-sm text-gray-600">각 날짜별 성과를 자세히 확인하세요</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">클릭수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">전환수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">전환율</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats?.dailyStats?.slice(0, 30).map((day, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {day.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.conversions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.clicks > 0 ? ((day.conversions / day.clicks) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 링크별 성과 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">링크별 성과</h2>
            <p className="text-sm text-gray-600">각 추천 링크의 성과를 비교해보세요</p>
          </div>
          
          <div className="p-6">
            {referralLinks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {referralLinks.map((link) => (
                  <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{link.productName}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">클릭수:</span>
                        <span className="font-medium">{link.clicks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">전환수:</span>
                        <span className="font-medium">{link.conversions}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">전환율:</span>
                        <span className="font-medium">
                          {link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">생성된 링크가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerStats;