import { NavLink } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  ArrowRight,
  Eye,
  MoreHorizontal,
} from 'lucide-react';

// Mock data
const stats = [
  {
    label: '이번 달 매출',
    value: '8,450,000원',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'primary',
  },
  {
    label: '신규 주문',
    value: '45건',
    change: '+8.2%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'blue',
  },
  {
    label: '등록 상품',
    value: '128개',
    change: '+5',
    trend: 'up',
    icon: Package,
    color: 'green',
  },
  {
    label: '고객 수',
    value: '356명',
    change: '+23',
    trend: 'up',
    icon: Users,
    color: 'purple',
  },
];

const recentOrders = [
  { id: 'ORD-001', customer: '김철수', items: 3, total: 125000, status: 'pending', time: '10분 전' },
  { id: 'ORD-002', customer: '이영희', items: 1, total: 89000, status: 'confirmed', time: '30분 전' },
  { id: 'ORD-003', customer: '박민수', items: 5, total: 245000, status: 'shipped', time: '1시간 전' },
  { id: 'ORD-004', customer: '정수진', items: 2, total: 178000, status: 'delivered', time: '2시간 전' },
];

const topProducts = [
  { name: '프리스타일 리브레2', category: 'CGM', sold: 45, revenue: 2250000 },
  { name: '덱스콤 G7', category: 'CGM', sold: 32, revenue: 1920000 },
  { name: '아큐첵 가이드', category: '혈당측정기', sold: 28, revenue: 840000 },
  { name: '당뇨영양바', category: '건강식품', sold: 120, revenue: 360000 },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '대기' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '확인' },
  shipped: { bg: 'bg-purple-100', text: 'text-purple-700', label: '배송중' },
  delivered: { bg: 'bg-green-100', text: 'text-green-700', label: '완료' },
};

export default function PharmacyDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
          <p className="text-slate-500 text-sm">오늘의 약국 현황을 확인하세요</p>
        </div>
        <NavLink
          to="/store/pharmacy-1"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          내 매장 보기
        </NavLink>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-4">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="font-semibold text-slate-800">최근 주문</h2>
            <NavLink
              to="/pharmacy/orders"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              전체보기
              <ArrowRight className="w-4 h-4" />
            </NavLink>
          </div>
          <div className="divide-y">
            {recentOrders.map((order) => {
              const status = statusColors[order.status];
              return (
                <div
                  key={order.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-slate-600">
                        {order.customer.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{order.customer}</p>
                      <p className="text-xs text-slate-400">{order.id} · {order.items}개 상품</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">
                      {order.total.toLocaleString()}원
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-slate-400">{order.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="font-semibold text-slate-800">인기 상품</h2>
            <NavLink
              to="/pharmacy/products"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              전체보기
              <ArrowRight className="w-4 h-4" />
            </NavLink>
          </div>
          <div className="divide-y">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800">
                    {product.revenue.toLocaleString()}원
                  </p>
                  <p className="text-xs text-slate-400">{product.sold}개 판매</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NavLink
            to="/pharmacy/products"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Package className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">상품 등록</span>
          </NavLink>
          <NavLink
            to="/pharmacy/orders"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">주문 관리</span>
          </NavLink>
          <NavLink
            to="/pharmacy/patients"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Users className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">고객 관리</span>
          </NavLink>
          <NavLink
            to="/pharmacy/settings"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <MoreHorizontal className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">더보기</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
