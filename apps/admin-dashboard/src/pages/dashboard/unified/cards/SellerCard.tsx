/**
 * Seller Context Card v1.1
 * 판매자 대시보드 카드 + 알림 연계
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, TrendingUp, ArrowRight, Loader2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UnifiedCardProps } from '../types';
import { useNotifications } from '../useNotifications';

interface SellerStats {
  todayOrders: number;
  pendingShipments: number;
  monthlyRevenue: number;
  revenueChange: number;
}

export const SellerCard: React.FC<UnifiedCardProps> = ({ config }) => {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // seller 컨텍스트 알림만 필터링
  const { getNotificationsByContext, isLoading: isLoadingNotifications } = useNotifications({
    contextFilter: 'seller',
  });

  const sellerNotifications = getNotificationsByContext('seller');

  useEffect(() => {
    loadSellerStats();
  }, []);

  const loadSellerStats = async () => {
    setIsLoading(true);
    try {
      // Mock data for PoC
      await new Promise((r) => setTimeout(r, 300));
      setStats({
        todayOrders: Math.floor(Math.random() * 30) + 5,
        pendingShipments: Math.floor(Math.random() * 15) + 2,
        monthlyRevenue: Math.floor(Math.random() * 5000000) + 1000000,
        revenueChange: Math.floor(Math.random() * 30) - 10,
      });
    } catch (err) {
      console.error('Error loading seller stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isLoadingNotifications) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const unreadCount = sellerNotifications?.unreadCount || 0;

  return (
    <div className="space-y-4">
      {/* Seller Notifications Alert */}
      {unreadCount > 0 && (
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-700">
              <strong>{unreadCount}</strong>건의 새 알림이 있습니다
            </p>
          </div>
          {sellerNotifications?.notifications?.slice(0, 1).map((notif) => (
            <p key={notif.id} className="text-xs text-blue-600 mt-1 truncate">
              {notif.title}
            </p>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">오늘 주문</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{stats?.todayOrders || 0}건</p>
        </div>

        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-gray-600">배송 대기</span>
          </div>
          <p className="text-xl font-bold text-orange-700">{stats?.pendingShipments || 0}건</p>
        </div>
      </div>

      {/* Revenue */}
      <div className="p-3 bg-green-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">이번 달 매출</span>
            </div>
            <p className="text-xl font-bold text-green-700">
              {(stats?.monthlyRevenue || 0).toLocaleString()}원
            </p>
          </div>
          <div className={`text-sm font-medium ${
            (stats?.revenueChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {(stats?.revenueChange || 0) >= 0 ? '+' : ''}{stats?.revenueChange || 0}%
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Link
          to="/orders"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          주문 관리
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/products"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          상품 관리
        </Link>
      </div>
    </div>
  );
};

export default SellerCard;
