/**
 * SellerOps Dashboard Page Wrapper
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  Bell,
} from 'lucide-react';

interface DashboardSummary {
  totalSales: number;
  pendingSettlement: number;
  activeListings: number;
  pendingOrders: number;
  approvedSuppliers: number;
  recentAlerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info' | 'success';
    title: string;
    message: string;
    createdAt: Date;
  }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const sellerId = user?.id || 'demo-seller';
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from actual API when backend is ready
    // For now, show demo data
    setTimeout(() => {
      setSummary({
        totalSales: 15420000,
        pendingSettlement: 2340000,
        activeListings: 47,
        pendingOrders: 12,
        approvedSuppliers: 8,
        recentAlerts: [
          {
            id: '1',
            type: 'info',
            title: '새 주문 접수',
            message: '3건의 새로운 주문이 접수되었습니다.',
            createdAt: new Date(),
          },
          {
            id: '2',
            type: 'warning',
            title: '재고 부족',
            message: '일부 상품의 재고가 부족합니다.',
            createdAt: new Date(),
          },
        ],
      });
      setLoading(false);
    }, 500);
  }, [sellerId]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">SellerOps 대시보드</h1>
        <p className="text-gray-600">판매 현황 및 주요 지표</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 판매액</p>
              <p className="text-2xl font-bold">
                {summary?.totalSales.toLocaleString()}원
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">정산 예정</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary?.pendingSettlement.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">판매 중인 상품</p>
              <p className="text-2xl font-bold">{summary?.activeListings}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">처리 중인 주문</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary?.pendingOrders}
              </p>
            </div>
            <Truck className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Info */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            공급자 현황
          </h2>
          <div className="text-center py-8">
            <p className="text-4xl font-bold text-blue-600">
              {summary?.approvedSuppliers}
            </p>
            <p className="text-gray-600 mt-2">승인된 공급자</p>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            최근 알림
          </h2>
          {summary?.recentAlerts && summary.recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {summary.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : alert.type === 'error'
                        ? 'bg-red-50 border-red-200'
                        : alert.type === 'success'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs text-gray-600">{alert.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">새로운 알림이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
