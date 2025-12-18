/**
 * Partner Earnings Page
 *
 * 수익 현황 및 정산 내역
 *
 * @package Phase K - Partner Flow
 */

import { useEffect, useState } from 'react';
import { usePartner } from '../../../hooks/usePartner';
import { authClient } from '@o4o/auth-client';

interface EarningRecord {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
}

export function PartnerEarnings() {
  const { stats, fetchStats } = usePartner();
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>(
    'all'
  );

  useEffect(() => {
    fetchStats();
    loadEarnings();
  }, [fetchStats]);

  const loadEarnings = async () => {
    try {
      const response = await authClient.api.get<{ data: EarningRecord[] }>(
        '/api/partner/earnings'
      );
      setEarnings(response.data || []);
    } catch (err) {
      console.error('Failed to load earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEarnings = earnings.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기';
      case 'approved':
        return '승인';
      case 'paid':
        return '지급완료';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'paid':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">수익 현황</h1>
        <p className="text-gray-600">커미션 적립 및 정산 내역을 확인하세요.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="총 누적 수익"
          value={stats.totalEarnings}
          color="blue"
        />
        <SummaryCard
          title="정산 예정"
          value={stats.pendingEarnings}
          color="orange"
        />
        <SummaryCard
          title="총 전환"
          value={stats.totalConversions}
          color="green"
          suffix="건"
        />
        <SummaryCard
          title="전환율"
          value={stats.conversionRate}
          color="purple"
          suffix="%"
          isPercent
        />
      </div>

      {/* Settlement Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">정산 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- 정산은 매월 15일에 진행됩니다.</li>
          <li>- 최소 정산 금액: 50,000원</li>
          <li>- 승인된 커미션만 정산 대상입니다.</li>
          <li>- 은행 정보는 프로필에서 설정하세요.</li>
        </ul>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">필터:</span>
        {[
          { value: 'all', label: '전체' },
          { value: 'pending', label: '대기' },
          { value: 'approved', label: '승인' },
          { value: 'paid', label: '지급완료' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Earnings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      ) : filteredEarnings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all'
              ? '아직 수익 내역이 없어요'
              : `${getStatusLabel(filter)} 상태의 내역이 없어요`}
          </h3>
          <p className="text-gray-600">
            추천 링크를 공유하고 첫 수익을 만들어 보세요!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  커미션율
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  커미션
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEarnings.map((earning) => (
                <tr key={earning.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(earning.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {earning.orderAmount.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {earning.commissionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {earning.commissionAmount.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        earning.status
                      )}`}
                    >
                      {getStatusLabel(earning.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color,
  suffix = '원',
  isPercent = false,
}: {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  suffix?: string;
  isPercent?: boolean;
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${colorClasses[color]}`}>
          {isPercent ? value.toFixed(1) : value.toLocaleString()}
        </span>
        <span className="text-gray-500">{suffix}</span>
      </div>
    </div>
  );
}
