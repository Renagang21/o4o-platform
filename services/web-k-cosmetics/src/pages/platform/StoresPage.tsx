/**
 * StoresPage - 매장 대시보드 (Store Dashboard)
 * Route: /platform/stores
 *
 * 매장 운영에 필요한 핵심 기능을 제공합니다:
 * - 상품 관리
 * - 주문 현황
 * - 재고 관리
 * - 매출 분석
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts';
import { AiSummaryButton } from '../../components/ai';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface DashboardStats {
  todaySales: number;
  newOrders: number;
  activeProducts: number;
  storeStatus: 'active' | 'inactive';
}

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  statsKey?: keyof DashboardStats;
  statsLabel?: string;
  color: string;
}

const dashboardCards: DashboardCard[] = [
  {
    id: 'products',
    title: '상품 관리',
    description: '매장에 노출할 상품을 등록하고 관리합니다',
    icon: <Package className="w-6 h-6" />,
    link: '/platform/stores/products',
    statsKey: 'activeProducts',
    statsLabel: '등록 상품',
    color: 'blue',
  },
  {
    id: 'orders',
    title: '주문 현황',
    description: '최근 주문 및 배송 상태를 확인합니다',
    icon: <ShoppingCart className="w-6 h-6" />,
    link: '/platform/stores/orders',
    statsKey: 'newOrders',
    statsLabel: '신규 주문',
    color: 'green',
  },
  {
    id: 'analytics',
    title: '매출 분석',
    description: '매출 통계 및 트렌드를 분석합니다',
    icon: <BarChart3 className="w-6 h-6" />,
    link: '/platform/stores/analytics',
    color: 'purple',
  },
  {
    id: 'settings',
    title: '매장 설정',
    description: '매장 정보 및 운영 설정을 관리합니다',
    icon: <Settings className="w-6 h-6" />,
    link: '/platform/stores/settings',
    color: 'slate',
  },
];

function getColorClasses(color: string) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-600' },
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600', text: 'text-slate-600' },
    pink: { bg: 'bg-pink-100', icon: 'text-pink-600', text: 'text-pink-600' },
  };
  return colors[color] || colors.slate;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

export default function StoresPage() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/cosmetics/stores/dashboard`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.data || null);
        } else {
          setStats(null);
        }
      } catch {
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (isAuthenticated) {
      fetchDashboardStats();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-slate-500 mb-6">
            매장 대시보드를 이용하려면 로그인해 주세요.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">매장 대시보드</h1>
              <p className="text-slate-500 mt-1">
                {user?.name || '매장'}님의 운영 현황을 확인하세요
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AiSummaryButton contextLabel="매장 운영 현황" />
              <Link
                to="/platform/stores/products/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                상품 등록
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">오늘 매출</p>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <p className="text-lg font-bold text-slate-800">
                    {stats?.todaySales ? formatCurrency(stats.todaySales) : '-'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">신규 주문</p>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <p className="text-lg font-bold text-slate-800">
                    {stats?.newOrders !== undefined ? `${stats.newOrders}건` : '-'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">노출 상품</p>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <p className="text-lg font-bold text-slate-800">
                    {stats?.activeProducts !== undefined ? `${stats.activeProducts}개` : '-'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">매장 상태</p>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <p className={`text-lg font-bold ${stats?.storeStatus === 'active' ? 'text-green-600' : 'text-slate-500'}`}>
                    {stats?.storeStatus === 'active' ? '운영 중' : '-'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {dashboardCards.map((card) => {
            const colorClasses = getColorClasses(card.color);
            const statsValue = card.statsKey && stats ? stats[card.statsKey] : undefined;
            return (
              <Link
                key={card.id}
                to={card.link}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${colorClasses.bg} flex items-center justify-center ${colorClasses.icon}`}>
                    {card.icon}
                  </div>
                  {card.statsLabel && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800">
                        {isLoading ? '-' : (statsValue !== undefined ? statsValue : '-')}
                      </p>
                      <p className="text-sm text-slate-500">{card.statsLabel}</p>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{card.title}</h3>
                <p className="text-slate-500 text-sm">{card.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Notice */}
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-5">
          <h3 className="font-semibold text-pink-800 mb-2">매장 운영 안내</h3>
          <ul className="text-sm text-pink-700 space-y-1">
            <li>• 상품 등록 후 검수가 완료되면 자동으로 노출됩니다.</li>
            <li>• 주문 접수 시 알림을 받으려면 알림 설정을 확인해 주세요.</li>
            <li>• 문의사항은 파트너 센터를 이용해 주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
