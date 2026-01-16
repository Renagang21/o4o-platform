/**
 * Operator Dashboard - K-Cosmetics 운영자 대시보드
 * GlycoPharm 스타일 적용
 */

import { AiSummaryButton } from '@/components/ai/AiSummaryButton';

// 통계 카드 데이터
const stats = [
  { label: '총 매장', value: '156', change: '+12', trend: 'up', color: 'pink' },
  { label: '활성 주문', value: '342', change: '+28', trend: 'up', color: 'blue' },
  { label: '이번 달 매출', value: '₩45.2M', change: '+15.3%', trend: 'up', color: 'green' },
  { label: '신규 가입', value: '89', change: '+23', trend: 'up', color: 'purple' },
];

// 최근 주문 데이터
const recentOrders = [
  { id: 'ORD-2024-001', store: '뷰티랩 강남점', amount: '₩1,250,000', status: '배송중', time: '10분 전' },
  { id: 'ORD-2024-002', store: '코스메틱 홍대점', amount: '₩890,000', status: '준비중', time: '25분 전' },
  { id: 'ORD-2024-003', store: '스킨케어 명동점', amount: '₩2,100,000', status: '완료', time: '1시간 전' },
  { id: 'ORD-2024-004', store: '메이크업 신촌점', amount: '₩560,000', status: '배송중', time: '2시간 전' },
];

// 신규 신청 데이터
const recentApplications = [
  { name: '뷰티스타 압구정점', type: '신규 매장', date: '2024-01-15', status: '검토중' },
  { name: '글로우업 이태원점', type: '신규 매장', date: '2024-01-14', status: '승인대기' },
  { name: '스킨랩 성수점', type: '파트너 신청', date: '2024-01-13', status: '서류심사' },
];

const statusStyles: Record<string, string> = {
  '배송중': 'bg-blue-100 text-blue-700',
  '준비중': 'bg-yellow-100 text-yellow-700',
  '완료': 'bg-green-100 text-green-700',
  '검토중': 'bg-gray-100 text-gray-700',
  '승인대기': 'bg-orange-100 text-orange-700',
  '서류심사': 'bg-purple-100 text-purple-700',
};

export default function OperatorDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">K-Cosmetics 플랫폼 운영 현황을 한눈에 확인하세요</p>
        </div>
        <AiSummaryButton
          contextLabel="운영자 대시보드 요약"
          serviceId="k-cosmetics"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{stat.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
          </div>
        ))}
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
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{order.store}</p>
                    <p className="text-sm text-slate-500">{order.id} · {order.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{order.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <div className="divide-y divide-slate-100">
            {recentApplications.map((app, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{app.name}</p>
                    <p className="text-sm text-slate-500">{app.type} · {app.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[app.status]}`}>
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
