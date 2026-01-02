import {
  TrendingUp,
  Package,
  ShoppingCart,
  Building2,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

const stats = [
  { label: '이번 달 매출', value: '45,800,000원', change: '+15.2%', icon: DollarSign, color: 'blue' },
  { label: '총 주문', value: '234건', change: '+8.5%', icon: ShoppingCart, color: 'green' },
  { label: '등록 상품', value: '89개', change: '+3', icon: Package, color: 'purple' },
  { label: '거래 약국', value: '156곳', change: '+12', icon: Building2, color: 'primary' },
];

const recentOrders = [
  { id: 'ORD-001', pharmacy: '건강약국', items: 5, total: 450000, status: 'pending' },
  { id: 'ORD-002', pharmacy: '행복약국', items: 3, total: 280000, status: 'confirmed' },
  { id: 'ORD-003', pharmacy: '사랑약국', items: 8, total: 720000, status: 'shipped' },
  { id: 'ORD-004', pharmacy: '희망약국', items: 2, total: 180000, status: 'delivered' },
];

const topProducts = [
  { name: '프리스타일 리브레2 센서', sold: 245, revenue: 12250000 },
  { name: '덱스콤 G7 스타터킷', sold: 120, revenue: 14400000 },
  { name: '아큐첵 가이드 측정기', sold: 180, revenue: 6300000 },
  { name: '당뇨 영양바 세트', sold: 350, revenue: 5250000 },
];

export default function SupplierDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">공급자 대시보드</h1>
        <p className="text-slate-500 text-sm">오늘의 공급 현황을 확인하세요</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {stat.change}
                </span>
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
            <button className="text-sm text-blue-600 flex items-center gap-1">
              전체보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{order.pharmacy}</p>
                  <p className="text-xs text-slate-400">{order.id} · {order.items}개 상품</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800">{order.total.toLocaleString()}원</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {order.status === 'pending' ? '대기' :
                     order.status === 'confirmed' ? '확인' :
                     order.status === 'shipped' ? '배송중' : '완료'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="font-semibold text-slate-800">인기 상품</h2>
            <button className="text-sm text-blue-600 flex items-center gap-1">
              전체보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y">
            {topProducts.map((product, index) => (
              <div key={product.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.sold}개 판매</p>
                  </div>
                </div>
                <p className="font-medium text-slate-800">{product.revenue.toLocaleString()}원</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
