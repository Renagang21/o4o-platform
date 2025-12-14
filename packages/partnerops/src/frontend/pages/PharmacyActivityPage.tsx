/**
 * PharmacyActivityPage
 *
 * 약국 활동 목록 페이지 (Read-only)
 * PHARMACEUTICAL 제품은 자동으로 필터링됩니다.
 *
 * @package @o4o/partnerops
 */

import React, { useState, useEffect } from 'react';
import type {
  PharmacyActivityItem,
  PharmacyActivityStats,
} from '../../services/PharmacyActivityService.js';

// Mock data for development
const mockStats: PharmacyActivityStats = {
  totalPharmacies: 45,
  totalConversions: 1234,
  totalOrderAmount: 125000000,
  byProductType: {
    cosmetics: { count: 678, amount: 68000000 },
    health: { count: 412, amount: 45000000 },
    general: { count: 144, amount: 12000000 },
  },
  byStatus: {
    pending: 156,
    confirmed: 1078,
    cancelled: 0,
  },
  trend: [],
};

const mockActivities: PharmacyActivityItem[] = [
  {
    id: 'activity-001',
    pharmacyId: 'pharmacy-001',
    pharmacyName: '건강약국',
    orderId: 'order-001',
    orderNumber: 'PO-2024-001234',
    productType: 'cosmetics',
    productName: '히알루론산 세럼',
    orderAmount: 85000,
    status: 'confirmed',
    createdAt: new Date(),
  },
  {
    id: 'activity-002',
    pharmacyId: 'pharmacy-002',
    pharmacyName: '행복약국',
    orderId: 'order-002',
    orderNumber: 'PO-2024-001233',
    productType: 'health',
    productName: '종합비타민',
    orderAmount: 45000,
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'activity-003',
    pharmacyId: 'pharmacy-003',
    pharmacyName: '사랑약국',
    orderId: 'order-003',
    orderNumber: 'PO-2024-001232',
    productType: 'general',
    productName: '마스크팩 세트',
    orderAmount: 32000,
    status: 'confirmed',
    createdAt: new Date(Date.now() - 172800000),
  },
];

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, trend }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <div className="mt-2 flex items-baseline">
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
      {subValue && (
        <span className={`ml-2 text-sm ${
          trend === 'up' ? 'text-green-600' :
          trend === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {subValue}
        </span>
      )}
    </div>
  </div>
);

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  const labels: Record<string, string> = {
    pending: '대기중',
    confirmed: '확정',
    cancelled: '취소',
    refunded: '환불',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
};

interface ProductTypeBadgeProps {
  type: string;
}

const ProductTypeBadge: React.FC<ProductTypeBadgeProps> = ({ type }) => {
  const colors: Record<string, string> = {
    cosmetics: 'bg-pink-100 text-pink-800',
    health: 'bg-blue-100 text-blue-800',
    general: 'bg-gray-100 text-gray-800',
  };

  const labels: Record<string, string> = {
    cosmetics: '화장품',
    health: '건강식품',
    general: '일반',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {labels[type] || type}
    </span>
  );
};

export const PharmacyActivityPage: React.FC = () => {
  const [stats, setStats] = useState<PharmacyActivityStats | null>(null);
  const [activities, setActivities] = useState<PharmacyActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    productType: '',
    status: '',
  });

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      setStats(mockStats);
      setActivities(mockActivities);
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">약국 활동</h1>
          <p className="mt-1 text-sm text-gray-500">
            약국에서 발생한 전환 활동을 조회합니다 (Read-only)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            PHARMACEUTICAL 제외
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="활성 약국"
            value={stats.totalPharmacies.toLocaleString()}
            subValue="파트너 연동"
          />
          <StatCard
            title="총 전환"
            value={stats.totalConversions.toLocaleString()}
            subValue="건"
          />
          <StatCard
            title="총 주문 금액"
            value={formatCurrency(stats.totalOrderAmount)}
          />
          <StatCard
            title="확정율"
            value={
              stats.totalConversions > 0
                ? `${((stats.byStatus?.confirmed || 0) / stats.totalConversions * 100).toFixed(1)}%`
                : '0%'
            }
            trend="up"
          />
        </div>
      )}

      {/* Product Type Stats */}
      {stats && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">제품 타입별 통계</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(stats.byProductType).map(([type, data]) => (
                <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                  <ProductTypeBadge type={type} />
                  <div className="mt-2 text-2xl font-semibold">{data.count}건</div>
                  <div className="text-sm text-gray-500">{formatCurrency(data.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <select
            value={filter.productType}
            onChange={(e) => setFilter({ ...filter, productType: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">모든 제품 타입</option>
            <option value="cosmetics">화장품</option>
            <option value="health">건강식품</option>
            <option value="general">일반</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">모든 상태</option>
            <option value="pending">대기중</option>
            <option value="confirmed">확정</option>
            <option value="cancelled">취소</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">활동 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  약국
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제품
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  타입
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  일시
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    활동 내역이 없습니다
                  </td>
                </tr>
              ) : (
                activities
                  .filter((a) =>
                    (!filter.productType || a.productType === filter.productType) &&
                    (!filter.status || a.status === filter.status)
                  )
                  .map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {activity.pharmacyName || activity.pharmacyId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{activity.orderNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {activity.productName || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activity.productType && (
                          <ProductTypeBadge type={activity.productType} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(activity.orderAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={activity.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(activity.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              약국 활동 정보
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                이 페이지는 약국에서 발생한 화장품, 건강식품, 일반 제품 관련 활동을 보여줍니다.
                의약품(PHARMACEUTICAL) 활동은 파트너 프로그램에서 제외되어 표시되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyActivityPage;
