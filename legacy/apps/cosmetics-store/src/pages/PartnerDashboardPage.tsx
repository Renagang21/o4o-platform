import { useEffect, useState } from 'react';
import {
  fetchPartnerDashboard,
  fetchPartnerCommissionSummary,
  fetchPartnerEngagement,
} from '../services/api';
import { Link } from 'react-router-dom';

interface PerformanceMetrics {
  totalRoutines: number;
  totalViews: number;
  totalRecommends: number;
  totalConversions: number;
  conversionRate: number;
  topRoutine: {
    id: string;
    title: string;
    views: number;
    recommends: number;
    conversions: number;
  } | null;
}

interface CommissionData {
  thisMonth: number;
  lastMonth: number;
  totalEarned: number;
  totalPaid: number;
  pending: number;
  nextSettlementDate: string;
  partnerTier: string;
  commissionRate: number;
  recentTransactions: Array<{
    date: string;
    amount: number;
    routineTitle: string;
    type: string;
  }>;
}

interface EngagementData {
  topSkinTypes: Array<{ type: string; views: number }>;
  topConcerns: Array<{ concern: string; views: number }>;
  totalEngagement: number;
}

export default function PartnerDashboardPage() {
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [commission, setCommission] = useState<CommissionData | null>(null);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [dashboardData, commissionData, engagementData] = await Promise.all([
          fetchPartnerDashboard(),
          fetchPartnerCommissionSummary(),
          fetchPartnerEngagement(),
        ]);

        setPerformance(dashboardData.data.performance);
        setCommission(commissionData.data);
        setEngagement(engagementData.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('대시보드 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">파트너 대시보드</h1>

      {/* Section 1: Routine Summary */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">루틴 성과 요약</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">총 루틴 수</div>
            <div className="text-2xl font-bold text-gray-900">{performance?.totalRoutines || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">총 조회수</div>
            <div className="text-2xl font-bold text-blue-600">{performance?.totalViews.toLocaleString() || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">총 추천수</div>
            <div className="text-2xl font-bold text-green-600">{performance?.totalRecommends.toLocaleString() || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">총 전환수</div>
            <div className="text-2xl font-bold text-purple-600">{performance?.totalConversions.toLocaleString() || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">전환율</div>
            <div className="text-2xl font-bold text-orange-600">{performance?.conversionRate.toFixed(2)}%</div>
          </div>
        </div>

        {performance?.topRoutine && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg shadow mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">최고 성과 루틴</h3>
            <div className="text-xl font-bold text-purple-900 mb-2">{performance.topRoutine.title}</div>
            <div className="flex gap-6 text-sm">
              <span className="text-gray-700">조회 {performance.topRoutine.views.toLocaleString()}</span>
              <span className="text-gray-700">추천 {performance.topRoutine.recommends.toLocaleString()}</span>
              <span className="text-gray-700">전환 {performance.topRoutine.conversions.toLocaleString()}</span>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Commission Summary */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">커미션 요약</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">이번 달</div>
            <div className="text-2xl font-bold text-green-600">₩{commission?.thisMonth.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">지난 달</div>
            <div className="text-2xl font-bold text-gray-900">₩{commission?.lastMonth.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">총 수익</div>
            <div className="text-2xl font-bold text-blue-600">₩{commission?.totalEarned.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">정산 대기</div>
            <div className="text-2xl font-bold text-orange-600">₩{commission?.pending.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">최근 거래</h3>
            <div className="text-sm text-gray-600">
              다음 정산일: {commission?.nextSettlementDate}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    루틴
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    금액
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commission?.recentTransactions.map((transaction, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.routineTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.type === 'conversion' ? '전환' : transaction.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-green-600">
                      ₩{transaction.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: Engagement Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">인기 주제</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">인기 피부 타입</h3>
            <div className="space-y-3">
              {engagement?.topSkinTypes.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">
                    {index + 1}. {item.type === 'dry' ? '건성' : item.type === 'oily' ? '지성' : item.type === 'combination' ? '복합성' : item.type === 'sensitive' ? '민감성' : '중성'}
                  </span>
                  <span className="text-gray-600">{item.views.toLocaleString()} 조회</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">인기 피부 고민</h3>
            <div className="space-y-3">
              {engagement?.topConcerns.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">
                    {index + 1}. {item.concern === 'acne' ? '여드름' : item.concern === 'whitening' ? '미백' : item.concern === 'wrinkle' ? '주름' : item.concern === 'pore' ? '모공' : item.concern === 'soothing' ? '진정' : item.concern === 'moisturizing' ? '보습' : item.concern}
                  </span>
                  <span className="text-gray-600">{item.views.toLocaleString()} 조회</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/partner/routines"
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow text-center transition-colors"
          >
            <div className="text-lg font-semibold">내 루틴 관리</div>
            <div className="text-sm mt-1">루틴 생성 및 편집</div>
          </Link>
          <Link
            to="/influencers"
            className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow text-center transition-colors"
          >
            <div className="text-lg font-semibold">루틴 둘러보기</div>
            <div className="text-sm mt-1">다른 파트너 루틴 보기</div>
          </Link>
          <Link
            to="/dashboard"
            className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow text-center transition-colors"
          >
            <div className="text-lg font-semibold">제품 관리</div>
            <div className="text-sm mt-1">내 제품 보기</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
