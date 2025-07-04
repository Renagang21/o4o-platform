import React from 'react'
import { Users, Package, ShoppingCart, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const Dashboard: React.FC = () => {
  // Mock data - will be replaced with real API calls
  const stats = {
    users: { total: 1247, change: 12.5, trend: 'up' as const },
    products: { total: 342, change: -2.3, trend: 'down' as const },
    orders: { total: 89, change: 8.7, trend: 'up' as const },
    revenue: { total: 2840000, change: 15.2, trend: 'up' as const }
  }

  const recentActivity = [
    { id: 1, type: 'user', message: '새로운 사업자 회원이 가입했습니다', time: '2분 전' },
    { id: 2, type: 'order', message: '새 주문이 접수되었습니다 (#ORD-2025-001)', time: '15분 전' },
    { id: 3, type: 'product', message: '오메가3 상품의 재고가 부족합니다', time: '1시간 전' },
    { id: 4, type: 'user', message: '파트너 승인 요청이 있습니다', time: '2시간 전' }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const StatCard: React.FC<{
    title: string
    value: string | number
    change: number
    trend: 'up' | 'down'
    icon: React.ReactElement
    color: string
  }> = ({ title, value, change, trend, icon, color }) => (
    <div className="wp-card">
      <div className="wp-card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
        <div className="flex items-center mt-4 text-sm">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(change)}%
          </span>
          <span className="text-gray-500 ml-1">지난 달 대비</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-1">O4O 플랫폼 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="전체 사용자"
          value={stats.users.total.toLocaleString()}
          change={stats.users.change}
          trend={stats.users.trend}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          title="등록된 상품"
          value={stats.products.total.toLocaleString()}
          change={stats.products.change}
          trend={stats.products.trend}
          icon={<Package className="w-6 h-6 text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="이번 달 주문"
          value={stats.orders.total.toLocaleString()}
          change={stats.orders.change}
          trend={stats.orders.trend}
          icon={<ShoppingCart className="w-6 h-6 text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          title="이번 달 매출"
          value={formatCurrency(stats.revenue.total)}
          change={stats.revenue.change}
          trend={stats.revenue.trend}
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">최근 활동</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">빠른 작업</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3">
                <button className="w-full wp-button-primary justify-center">
                  새 상품 등록
                </button>
                <button className="w-full wp-button-secondary justify-center">
                  사용자 승인 처리
                </button>
                <button className="w-full wp-button-secondary justify-center">
                  주문 상태 업데이트
                </button>
                <button className="w-full wp-button-secondary justify-center">
                  콘텐츠 발행
                </button>
              </div>
            </div>
          </div>

          {/* System status */}
          <div className="wp-card mt-6">
            <div className="wp-card-header">
              <h3 className="wp-card-title">시스템 상태</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API 서버</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    정상
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">데이터베이스</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    정상
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">메일 서비스</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    확인 중
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">스토리지</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    정상
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard