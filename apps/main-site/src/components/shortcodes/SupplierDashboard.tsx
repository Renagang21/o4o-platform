/**
 * Supplier Dashboard Component for Main Site
 * Displays supplier metrics, products, and order management
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';

interface SupplierDashboardProps {
  defaultPeriod?: string;
}

interface DashboardStats {
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  totalRevenue: number;
  totalProfit: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  monthlyOrders: number;
  avgOrderValue: number;
}

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({
  defaultPeriod = '30d'
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(defaultPeriod);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/v1/dropshipping/supplier/dashboard/stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch supplier dashboard data');
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to load dashboard');
      }
    } catch (err: any) {
      console.error('Supplier dashboard fetch error:', err);
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supplier dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-4">
        <div className="flex items-center gap-2 text-red-800">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Error loading dashboard</span>
        </div>
        <p className="text-sm text-red-700 mt-2">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 my-6">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Supplier Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage your products and track your supplier performance
            </p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d', '1y'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === '7d' ? '7일' : p === '30d' ? '30일' : p === '90d' ? '90일' : '1년'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Products */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">총 제품</p>
              <p className="text-2xl font-bold text-blue-900">{stats?.totalProducts || 0}</p>
              <p className="text-xs text-blue-600 mt-1">
                승인: {stats?.approvedProducts || 0} | 대기: {stats?.pendingProducts || 0}
              </p>
            </div>
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">이번 달 매출</p>
              <p className="text-2xl font-bold text-green-900">{formatPrice(stats?.totalRevenue || 0)}</p>
              <p className="text-xs text-green-600 mt-1">
                주문: {stats?.monthlyOrders || 0}건
              </p>
            </div>
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">이번 달 수익</p>
              <p className="text-2xl font-bold text-purple-900">{formatPrice(stats?.totalProfit || 0)}</p>
              <p className="text-xs text-purple-600 mt-1">
                평균 주문: {formatPrice(stats?.avgOrderValue || 0)}
              </p>
            </div>
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">재고 부족</p>
              <p className="text-2xl font-bold text-orange-900">{stats?.lowStockProducts || 0}</p>
              <p className="text-xs text-red-600 mt-1">
                품절: {stats?.outOfStockProducts || 0}개
              </p>
            </div>
            <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Product Status Breakdown */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="inline-block px-3 py-1 bg-green-100 border border-green-300 rounded-full text-green-800 font-semibold mb-2">
              승인됨
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.approvedProducts || 0}</p>
          </div>
          <div className="text-center">
            <div className="inline-block px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full text-yellow-800 font-semibold mb-2">
              대기 중
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.pendingProducts || 0}</p>
          </div>
          <div className="text-center">
            <div className="inline-block px-3 py-1 bg-red-100 border border-red-300 rounded-full text-red-800 font-semibold mb-2">
              거부됨
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.rejectedProducts || 0}</p>
          </div>
          <div className="text-center">
            <div className="inline-block px-3 py-1 bg-blue-100 border border-blue-300 rounded-full text-blue-800 font-semibold mb-2">
              전체
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          새 제품 등록
        </button>
        <button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          제품 관리
        </button>
        <button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          주문 내역
        </button>
      </div>
    </div>
  );
};
