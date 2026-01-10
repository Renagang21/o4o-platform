/**
 * Supplier Context Card
 * PoC: 공급자 대시보드 대체 카드
 */

import React, { useState, useEffect } from 'react';
import { Truck, Package, AlertTriangle, ArrowRight, Loader2, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UnifiedCardProps } from '../types';

interface SupplierStats {
  pendingOrders: number;
  inTransit: number;
  lowStockItems: number;
  monthlyShipments: number;
}

export const SupplierCard: React.FC<UnifiedCardProps> = ({ config }) => {
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSupplierStats();
  }, []);

  const loadSupplierStats = async () => {
    setIsLoading(true);
    try {
      // Mock data for PoC
      await new Promise((r) => setTimeout(r, 300));
      setStats({
        pendingOrders: Math.floor(Math.random() * 20) + 3,
        inTransit: Math.floor(Math.random() * 15) + 5,
        lowStockItems: Math.floor(Math.random() * 8),
        monthlyShipments: Math.floor(Math.random() * 200) + 50,
      });
    } catch (err) {
      console.error('Error loading supplier stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">처리 대기</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{stats?.pendingOrders || 0}건</p>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">배송 중</span>
          </div>
          <p className="text-xl font-bold text-green-700">{stats?.inTransit || 0}건</p>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.lowStockItems || 0) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-700">재고 부족 알림</p>
            <p className="text-xs text-orange-600">{stats?.lowStockItems}개 품목 재고 부족</p>
          </div>
          <Link
            to="/inventory?filter=low-stock"
            className="text-xs text-orange-700 underline"
          >
            확인
          </Link>
        </div>
      )}

      {/* Monthly Stats */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">이번 달 출고</span>
          </div>
          <p className="font-bold text-gray-700">{stats?.monthlyShipments || 0}건</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Link
          to="/supplier/orders"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          주문 처리
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/inventory"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          재고 관리
        </Link>
      </div>
    </div>
  );
};

export default SupplierCard;
