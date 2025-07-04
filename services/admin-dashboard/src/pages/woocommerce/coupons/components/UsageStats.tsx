import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  Clock,
  Star,
  ShoppingCart,
  Percent,
  Calendar,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react'
import { CouponUsage } from '@/types/ecommerce'

interface UsageStatsProps {
  couponId?: string
  period?: 'week' | 'month' | 'quarter' | 'year'
  data?: CouponUsage[]
  className?: string
  compact?: boolean
}

const UsageStats: React.FC<UsageStatsProps> = ({
  couponId,
  period = 'month',
  data = [],
  className = '',
  compact = false
}) => {
  const [stats, setStats] = useState({
    totalUsage: 0,
    totalSavings: 0,
    totalOrders: 0,
    uniqueUsers: 0,
    avgConversion: 0,
    avgSavingsPerUse: 0,
    topPerformingCoupon: null as CouponUsage | null,
    growthRate: 0,
    peakUsageDay: null as string | null,
    mostActiveHour: null as number | null
  })

  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable')

  useEffect(() => {
    calculateStats()
  }, [data, couponId])

  const calculateStats = () => {
    if (!data || data.length === 0) {
      setStats({
        totalUsage: 0,
        totalSavings: 0,
        totalOrders: 0,
        uniqueUsers: 0,
        avgConversion: 0,
        avgSavingsPerUse: 0,
        topPerformingCoupon: null,
        growthRate: 0,
        peakUsageDay: null,
        mostActiveHour: null
      })
      return
    }

    // Filter data by couponId if specified
    const filteredData = couponId 
      ? data.filter(item => item.couponId === couponId)
      : data

    const totalUsage = filteredData.reduce((sum, item) => sum + item.usageCount, 0)
    const totalSavings = filteredData.reduce((sum, item) => sum + item.totalSavings, 0)
    const totalOrders = filteredData.reduce((sum, item) => sum + item.orderCount, 0)
    const uniqueUsers = filteredData.reduce((sum, item) => sum + item.uniqueUsers, 0)
    
    const avgConversion = filteredData.length > 0 
      ? filteredData.reduce((sum, item) => sum + item.conversionRate, 0) / filteredData.length 
      : 0

    const avgSavingsPerUse = totalUsage > 0 ? totalSavings / totalUsage : 0

    // Find top performing coupon
    const topPerformingCoupon = filteredData.length > 0
      ? filteredData.reduce((top, current) => 
          current.conversionRate > top.conversionRate ? current : top
        )
      : null

    // Calculate growth rate (mock calculation)
    const growthRate = Math.random() * 20 - 10 // -10% to +10%
    
    // Determine trend
    let trendDirection: 'up' | 'down' | 'stable' = 'stable'
    if (growthRate > 2) trendDirection = 'up'
    else if (growthRate < -2) trendDirection = 'down'

    setStats({
      totalUsage,
      totalSavings,
      totalOrders,
      uniqueUsers,
      avgConversion,
      avgSavingsPerUse,
      topPerformingCoupon,
      growthRate,
      peakUsageDay: 'Monday', // Mock data
      mostActiveHour: 14 // Mock data - 2 PM
    })

    setTrend(trendDirection)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatGrowth = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getPeriodLabel = () => {
    const labels = {
      week: '이번 주',
      month: '이번 달',
      quarter: '이번 분기',
      year: '올해'
    }
    return labels[period]
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (compact) {
    return (
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">사용량</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalUsage.toLocaleString()}</p>
              </div>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">절약액</p>
                <p className="text-sm font-bold text-gray-900">{formatPrice(stats.totalSavings)}</p>
              </div>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">전환율</p>
                <p className="text-lg font-bold text-gray-900">{formatPercent(stats.avgConversion)}</p>
              </div>
              <Percent className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">성장률</p>
                <p className={`text-lg font-bold ${getTrendColor()}`}>
                  {formatGrowth(stats.growthRate)}
                </p>
              </div>
              {getTrendIcon()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {couponId ? '쿠폰 사용 통계' : '전체 쿠폰 통계'}
          </h3>
          <p className="text-sm text-gray-600">{getPeriodLabel()} 성과 요약</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {getTrendIcon()}
          <span className={getTrendColor()}>
            {trend === 'up' ? '상승 추세' : trend === 'down' ? '하락 추세' : '안정적'}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 사용량</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsage.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon()}
                  <span className={`text-xs ${getTrendColor()}`}>
                    {formatGrowth(stats.growthRate)}
                  </span>
                  <span className="text-xs text-gray-500">vs 이전 기간</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 절약액</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(stats.totalSavings)}</p>
                <div className="text-xs text-gray-500 mt-1">
                  평균 {formatPrice(stats.avgSavingsPerUse)} / 사용
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 전환율</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercent(stats.avgConversion)}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.totalOrders.toLocaleString()} 주문 생성
                </div>
              </div>
              <Percent className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">사용자 수</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueUsers.toLocaleString()}</p>
                <div className="text-xs text-gray-500 mt-1">
                  유니크 사용자
                </div>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="wp-card">
          <div className="wp-card-header">
            <h4 className="wp-card-title flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              성과 지표
            </h4>
          </div>
          <div className="wp-card-body space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">전환율</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${
                  stats.avgConversion >= 10 ? 'text-green-600' :
                  stats.avgConversion >= 5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatPercent(stats.avgConversion)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  stats.avgConversion >= 10 ? 'bg-green-100 text-green-800' :
                  stats.avgConversion >= 5 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {stats.avgConversion >= 10 ? '우수' :
                   stats.avgConversion >= 5 ? '보통' : '개선필요'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">사용자당 평균 사용</span>
              <span className="font-medium">
                {stats.uniqueUsers > 0 ? (stats.totalUsage / stats.uniqueUsers).toFixed(1) : '0'}회
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">평균 절약액</span>
              <span className="font-medium text-green-600">
                {formatPrice(stats.avgSavingsPerUse)}
              </span>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h4 className="wp-card-title flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              사용 패턴
            </h4>
          </div>
          <div className="wp-card-body space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">최고 사용 요일</span>
              <span className="font-medium">{stats.peakUsageDay || '-'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">최고 사용 시간</span>
              <span className="font-medium">
                {stats.mostActiveHour ? `${stats.mostActiveHour}:00` : '-'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">성장률</span>
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={`font-medium ${getTrendColor()}`}>
                  {formatGrowth(stats.growthRate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h4 className="wp-card-title flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              최고 성과
            </h4>
          </div>
          <div className="wp-card-body">
            {stats.topPerformingCoupon ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">최고 전환율 쿠폰</span>
                  <div className="font-medium text-gray-900 mt-1">
                    {stats.topPerformingCoupon.couponId}
                  </div>
                  <div className="text-sm text-green-600">
                    {formatPercent(stats.topPerformingCoupon.conversionRate)} 전환율
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">성과 요약</span>
                  <div className="mt-1 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>사용량:</span>
                      <span>{stats.topPerformingCoupon.usageCount.toLocaleString()}회</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>절약액:</span>
                      <span>{formatPrice(stats.topPerformingCoupon.totalSavings)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Breakdown Chart */}
      {data.length > 0 && (
        <div className="wp-card">
          <div className="wp-card-header">
            <h4 className="wp-card-title flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              사용량 분포
            </h4>
          </div>
          <div className="wp-card-body">
            <div className="space-y-4">
              {data.slice(0, 5).map((item, index) => {
                const maxUsage = Math.max(...data.map(d => d.usageCount))
                const percentage = maxUsage > 0 ? (item.usageCount / maxUsage) * 100 : 0
                
                return (
                  <div key={item.couponId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{item.couponId}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{item.usageCount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{formatPercent(item.conversionRate)} 전환율</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsageStats