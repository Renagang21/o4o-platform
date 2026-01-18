/**
 * Operator Dashboard - K-Cosmetics 운영자 대시보드
 * GlycoPharm 스타일 적용
 * API Integration: WO-COSMETICS-DASHBOARD-API-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { AiSummaryButton } from '@/components/ai/AiSummaryButton';
import { operatorApi, type OperatorDashboardSummary } from '@/services/operatorApi';

// 빈 데이터 상태 컴포넌트
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <AlertCircle size={36} className="mx-auto mb-3 text-gray-400" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  '배송중': 'bg-blue-100 text-blue-700',
  '준비중': 'bg-yellow-100 text-yellow-700',
  '완료': 'bg-green-100 text-green-700',
  '검토중': 'bg-gray-100 text-gray-700',
  '승인대기': 'bg-orange-100 text-orange-700',
  '서류심사': 'bg-purple-100 text-purple-700',
};

export default function OperatorDashboard() {
  const [summary, setSummary] = useState<OperatorDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await operatorApi.getDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch operator dashboard data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = summary?.stats || {
    totalStores: 0,
    activeOrders: 0,
    monthlyRevenue: '₩0',
    newSignups: 0,
  };

  const hasRecentOrders = summary?.recentOrders && summary.recentOrders.length > 0;
  const hasRecentApplications = summary?.recentApplications && summary.recentApplications.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">K-Cosmetics 플랫폼 운영 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <AiSummaryButton
            contextLabel="운영자 대시보드 요약"
            serviceId="k-cosmetics"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 opacity-50">
              <div className="text-sm font-medium text-slate-500">로딩 중...</div>
              <p className="text-3xl font-bold text-slate-800 mt-2">-</p>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">총 매장</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalStores}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">활성 주문</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.activeOrders}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">이번 달 매출</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.monthlyRevenue}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">신규 가입</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.newSignups}</p>
            </div>
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">최근 주문</h2>
              <a href="/operator/orders" className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                전체보기 →
              </a>
            </div>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">로딩 중...</div>
          ) : !hasRecentOrders ? (
            <EmptyState message="자료가 없습니다. 최근 주문 내역이 없습니다." />
          ) : (
            <div className="divide-y divide-slate-100">
              {summary!.recentOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{order.store}</p>
                      <p className="text-sm text-slate-500">{order.id} · {order.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">{order.amount}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">신규 신청</h2>
              <a href="/operator/applications" className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                전체보기 →
              </a>
            </div>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">로딩 중...</div>
          ) : !hasRecentApplications ? (
            <EmptyState message="자료가 없습니다. 신규 신청 내역이 없습니다." />
          ) : (
            <div className="divide-y divide-slate-100">
              {summary!.recentApplications.map((app, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{app.name}</p>
                      <p className="text-sm text-slate-500">{app.type} · {app.date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[app.status] || 'bg-gray-100 text-gray-700'}`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '상품 등록', href: '/operator/products', icon: '📦' },
            { label: '주문 확인', href: '/operator/orders', icon: '🛒' },
            { label: '매장 관리', href: '/operator/stores', icon: '🏪' },
            { label: '정산 처리', href: '/operator/settlements', icon: '💳' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-colors"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="font-medium text-slate-700">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
