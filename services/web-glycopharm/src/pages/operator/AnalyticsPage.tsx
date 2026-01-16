/**
 * Operator Analytics Page (Analytics & Reports)
 *
 * 세미-프랜차이즈 분석 및 리포트
 * - 매출 분석
 * - 약국 성과
 * - 상품 분석
 */

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Store,
  Package,
  Download,
  ArrowUp,
  ArrowDown,
  Target,
} from 'lucide-react';

// Types
type TabType = 'overview' | 'sales' | 'pharmacies' | 'products';

// Sample data
const overviewStats = {
  totalRevenue: 856000000,
  revenueGrowth: 12.5,
  totalOrders: 4520,
  ordersGrowth: 8.3,
  activePharmacies: 98,
  pharmaciesGrowth: 5.2,
  avgOrderValue: 189380,
  avgOrderGrowth: 3.8,
};

const topPharmacies = [
  { rank: 1, name: '건강한약국', region: '서울 강남구', revenue: 125000000, orders: 156, growth: 15.3 },
  { rank: 2, name: '행복약국', region: '서울 마포구', revenue: 89000000, orders: 112, growth: 8.7 },
  { rank: 3, name: '사랑약국', region: '부산 해운대구', revenue: 78000000, orders: 98, growth: 12.1 },
  { rank: 4, name: '미래약국', region: '인천 남동구', revenue: 67000000, orders: 85, growth: -2.5 },
  { rank: 5, name: '청춘약국', region: '대전 유성구', revenue: 56000000, orders: 72, growth: 6.8 },
];

const topProducts = [
  { rank: 1, name: '혈당 측정 스트립 100매', category: '소모품', sales: 4520, revenue: 176280000, growth: 22.1 },
  { rank: 2, name: '글루코스 모니터링 키트 프로', category: '혈당 모니터링', sales: 1520, revenue: 150480000, growth: 15.8 },
  { rank: 3, name: '당뇨 관리 종합 세트', category: '관리 세트', sales: 856, revenue: 153224000, growth: 11.2 },
  { rank: 4, name: '인슐린 냉장 파우치', category: '액세서리', sales: 623, revenue: 21805000, growth: 8.5 },
  { rank: 5, name: '디지털 혈압계 스마트', category: '측정기기', sales: 312, revenue: 24648000, growth: -3.2 },
];

const monthlyRevenue = [
  { month: '8월', revenue: 680000000 },
  { month: '9월', revenue: 720000000 },
  { month: '10월', revenue: 780000000 },
  { month: '11월', revenue: 810000000 },
  { month: '12월', revenue: 856000000 },
  { month: '1월', revenue: 720000000 },
];

// Stat card component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  format = 'number',
}: {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  iconColor: string;
  format?: 'number' | 'currency' | 'percent';
}) {
  const formatValue = () => {
    if (format === 'currency') {
      if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
      return `${(value / 10000).toLocaleString()}만`;
    }
    if (format === 'percent') return `${value}%`;
    return value.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800">{formatValue()}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className={`flex items-center gap-1 mt-3 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
        <span className="font-medium">{Math.abs(change)}%</span>
        <span className="text-slate-400">전월 대비</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState<string>('month');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">분석/리포트</h1>
          <p className="text-slate-500 text-sm">네트워크 성과 분석 및 인사이트</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="quarter">이번 분기</option>
            <option value="year">올해</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
            <Download className="w-4 h-4" />
            리포트 다운로드
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              종합 현황
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sales'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              매출 분석
            </button>
            <button
              onClick={() => setActiveTab('pharmacies')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pharmacies'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Store className="w-4 h-4" />
              약국 성과
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Package className="w-4 h-4" />
              상품 분석
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="총 매출"
                  value={overviewStats.totalRevenue}
                  change={overviewStats.revenueGrowth}
                  icon={DollarSign}
                  iconColor="bg-primary-500"
                  format="currency"
                />
                <StatCard
                  title="총 주문"
                  value={overviewStats.totalOrders}
                  change={overviewStats.ordersGrowth}
                  icon={ShoppingCart}
                  iconColor="bg-blue-500"
                />
                <StatCard
                  title="활성 약국"
                  value={overviewStats.activePharmacies}
                  change={overviewStats.pharmaciesGrowth}
                  icon={Store}
                  iconColor="bg-emerald-500"
                />
                <StatCard
                  title="평균 주문액"
                  value={overviewStats.avgOrderValue}
                  change={overviewStats.avgOrderGrowth}
                  icon={Target}
                  iconColor="bg-purple-500"
                  format="currency"
                />
              </div>

              {/* Revenue Chart Placeholder */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">월별 매출 추이</h3>
                <div className="flex items-end gap-4 h-48">
                  {monthlyRevenue.map((item) => (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-primary-500 rounded-t-lg transition-all hover:bg-primary-600"
                        style={{ height: `${(item.revenue / 900000000) * 100}%` }}
                      />
                      <span className="text-xs text-slate-500">{item.month}</span>
                      <span className="text-xs font-medium text-slate-700">
                        {(item.revenue / 100000000).toFixed(1)}억
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Lists */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Pharmacies */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Top 5 약국</h3>
                  <div className="space-y-3">
                    {topPharmacies.map((pharmacy) => (
                      <div key={pharmacy.rank} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          pharmacy.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                          pharmacy.rank === 2 ? 'bg-slate-100 text-slate-600' :
                          pharmacy.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {pharmacy.rank}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{pharmacy.name}</p>
                          <p className="text-xs text-slate-500">{pharmacy.region}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">{(pharmacy.revenue / 10000).toLocaleString()}만</p>
                          <p className={`text-xs flex items-center gap-1 justify-end ${pharmacy.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pharmacy.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(pharmacy.growth)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Top 5 상품</h3>
                  <div className="space-y-3">
                    {topProducts.map((product) => (
                      <div key={product.rank} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          product.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                          product.rank === 2 ? 'bg-slate-100 text-slate-600' :
                          product.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {product.rank}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 text-sm">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">{product.sales.toLocaleString()}개</p>
                          <p className={`text-xs flex items-center gap-1 justify-end ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(product.growth)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="text-center py-12 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600 mb-2">매출 상세 분석</p>
              <p className="text-sm">기간별, 카테고리별, 채널별 매출 분석이 표시됩니다.</p>
            </div>
          )}

          {/* Pharmacies Tab */}
          {activeTab === 'pharmacies' && (
            <div className="text-center py-12 text-slate-500">
              <Store className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600 mb-2">약국별 성과 분석</p>
              <p className="text-sm">약국별 매출, 주문, 성장률 등 상세 성과 분석이 표시됩니다.</p>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600 mb-2">상품별 분석</p>
              <p className="text-sm">상품별 판매량, 수익성, 트렌드 분석이 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
