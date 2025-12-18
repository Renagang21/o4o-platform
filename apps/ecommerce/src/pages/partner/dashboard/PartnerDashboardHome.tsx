/**
 * Partner Dashboard Home
 *
 * 파트너 대시보드 홈 (요약 지표, 빠른 액션)
 *
 * @package Phase K - Partner Flow
 */

import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { usePartner } from '../../../hooks/usePartner';

export function PartnerDashboardHome() {
  const { currentPartner, stats, fetchStats, isLoading } = usePartner();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요, {currentPartner?.name || '파트너'}님!
        </h1>
        <p className="text-gray-600">오늘도 함께 성장해요.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 클릭"
          value={stats.totalClicks.toLocaleString()}
          unit="회"
          color="blue"
        />
        <KPICard
          title="총 전환"
          value={stats.totalConversions.toLocaleString()}
          unit="건"
          color="green"
        />
        <KPICard
          title="전환율"
          value={stats.conversionRate.toFixed(1)}
          unit="%"
          color="purple"
        />
        <KPICard
          title="누적 수익"
          value={stats.totalEarnings.toLocaleString()}
          unit="원"
          color="orange"
        />
      </div>

      {/* Pending Earnings Alert */}
      {stats.pendingEarnings > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium text-blue-900">정산 예정 금액</div>
              <div className="text-sm text-blue-700">
                {stats.pendingEarnings.toLocaleString()}원
              </div>
            </div>
          </div>
          <NavLink
            to="/partner/dashboard/earnings"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            자세히 보기
          </NavLink>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            title="새 링크 만들기"
            description="추천 링크를 생성하세요"
            icon="link"
            to="/partner/dashboard/links"
          />
          <QuickActionCard
            title="수익 확인"
            description="커미션 내역을 확인하세요"
            icon="chart"
            to="/partner/dashboard/earnings"
          />
          <QuickActionCard
            title="상품 둘러보기"
            description="추천할 상품을 찾아보세요"
            icon="shop"
            to="/products"
          />
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          파트너 활동 팁
        </h2>
        <ul className="space-y-3 text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">&#8226;</span>
            <span>
              제품별 전용 링크를 사용하면 어떤 제품이 인기 있는지 알 수 있어요.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">&#8226;</span>
            <span>
              SNS 스토리나 게시물에 추천 링크를 활용해 보세요.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">&#8226;</span>
            <span>
              쿠키 유효기간은 30일이에요. 클릭 후 30일 내 구매가 이루어지면
              커미션이 적립됩니다.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  unit,
  color,
}: {
  title: string;
  value: string;
  unit: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${colorClasses[color].split(' ')[1]}`}>
          {value}
        </span>
        <span className="text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  to,
}: {
  title: string;
  description: string;
  icon: string;
  to: string;
}) {
  const iconPaths: Record<string, string> = {
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    chart:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    shop: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  };

  return (
    <NavLink
      to={to}
      className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
    >
      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={iconPaths[icon] || iconPaths.link}
          />
        </svg>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </NavLink>
  );
}
