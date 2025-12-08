/**
 * SupplierOps Dashboard Page
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  approvalStatus: string;
  totalProducts: number;
  activeOffers: number;
  pendingListingRequests: number;
  relayStats: {
    pending: number;
    dispatched: number;
    fulfilled: number;
    failed: number;
  };
  monthSales: number;
  pendingSettlement: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setStats({
        approvalStatus: 'active',
        totalProducts: 25,
        activeOffers: 18,
        pendingListingRequests: 5,
        relayStats: {
          pending: 3,
          dispatched: 8,
          fulfilled: 45,
          failed: 1,
        },
        monthSales: 8750000,
        pendingSettlement: 3500000,
      });
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            승인됨
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4" />
            승인 대기
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
            <AlertCircle className="w-4 h-4" />
            정지됨
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">공급자 대시보드</h1>
            <p className="text-gray-600">공급자 운영 현황을 한눈에 확인하세요</p>
          </div>
          {stats && getStatusBadge(stats.approvalStatus)}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">등록 상품</p>
              <p className="text-2xl font-bold">{stats?.totalProducts}개</p>
            </div>
            <Package className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활성 Offer</p>
              <p className="text-2xl font-bold">{stats?.activeOffers}개</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이번 달 매출</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats?.monthSales.toLocaleString()}원
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">정산 대기</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats?.pendingSettlement.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Relay Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">주문 Relay 현황</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">
                {stats?.relayStats.pending}
              </p>
              <p className="text-sm text-gray-600">대기중</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {stats?.relayStats.dispatched}
              </p>
              <p className="text-sm text-gray-600">발송됨</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {stats?.relayStats.fulfilled}
              </p>
              <p className="text-sm text-gray-600">완료됨</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">
                {stats?.relayStats.failed}
              </p>
              <p className="text-sm text-gray-600">오류</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">리스팅 요청</h2>
          <div className="text-center py-8">
            <Truck className="w-12 h-12 mx-auto mb-4 text-blue-600 opacity-50" />
            <p className="text-4xl font-bold text-blue-600 mb-2">
              {stats?.pendingListingRequests}
            </p>
            <p className="text-gray-600">Seller 리스팅 승인 대기</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
