import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Target,
  ShoppingCart,
  Percent,
  Clock,
  Search,
  Eye
} from 'lucide-react'
import { CouponUsage, Coupon } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const CouponUsagePage: React.FC = () => {
  const [usageData, setUsageData] = useState<CouponUsage[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedCoupon, setSelectedCoupon] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'usageCount' | 'savings' | 'conversionRate'>('usageCount')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadData()
  }, [period, selectedCoupon])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usageResponse, couponsResponse] = await Promise.all([
        EcommerceApi.getCouponUsage(period, selectedCoupon || undefined),
        EcommerceApi.getCoupons(1, 100)
      ])
      setUsageData(Array.isArray(usageResponse.data) ? usageResponse.data : [])
      setCoupons(Array.isArray(couponsResponse.data) ? couponsResponse.data : [])
    } catch (error) {
      console.error('Failed to load coupon usage data:', error)
      toast.error('쿠폰 사용 현황을 불러오는데 실패했습니다.')
      setUsageData([])
      setCoupons([])
    } finally {
      setLoading(false)
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Calculate summary stats
  const summaryStats = {
    totalUsage: usageData.reduce((sum, item) => sum + item.usageCount, 0),
    totalSavings: usageData.reduce((sum, item) => sum + item.totalSavings, 0),
    totalOrders: usageData.reduce((sum, item) => sum + item.orderCount, 0),
    avgConversion: usageData.length > 0 
      ? usageData.reduce((sum, item) => sum + item.conversionRate, 0) / usageData.length 
      : 0,
    uniqueUsers: usageData.reduce((sum, item) => sum + item.uniqueUsers, 0),
    avgSavingsPerUse: usageData.length > 0 && usageData.reduce((sum, item) => sum + item.usageCount, 0) > 0
      ? usageData.reduce((sum, item) => sum + item.totalSavings, 0) / usageData.reduce((sum, item) => sum + item.usageCount, 0)
      : 0
  }

  const filteredAndSortedData = usageData
    .filter(item => {
      const coupon = coupons.find(c => c.id === item.couponId)
      return coupon?.code.toLowerCase().includes(searchTerm.toLowerCase()) || false
    })
    .sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
    })

  const getPerformanceColor = (conversionRate: number) => {
    if (conversionRate >= 10) return 'text-green-600'
    if (conversionRate >= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBadge = (conversionRate: number) => {
    const color = getPerformanceColor(conversionRate)
    let label = '보통'
    
    if (conversionRate >= 10) label = '우수'
    else if (conversionRate >= 5) label = '보통'
    else label = '개선필요'

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        label === '우수' ? 'bg-green-100 text-green-800' :
        label === '보통' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <Link
            to="/woocommerce/coupons"
            className="wp-button-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">쿠폰 사용 현황</h1>
            <p className="text-gray-600 mt-1">{getPeriodLabel()} 쿠폰 사용 분석 및 성과 측정</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            리포트 다운로드
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">기간:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="wp-select"
              >
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
                <option value="quarter">이번 분기</option>
                <option value="year">올해</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">쿠폰:</label>
              <select
                value={selectedCoupon}
                onChange={(e) => setSelectedCoupon(e.target.value)}
                className="wp-select min-w-[150px]"
              >
                <option value="">전체 쿠폰</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="쿠폰 코드로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">정렬:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="wp-select"
              >
                <option value="usageCount">사용량순</option>
                <option value="savings">절약금액순</option>
                <option value="conversionRate">전환율순</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="wp-button-secondary"
              >
                {sortOrder === 'desc' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 사용량</p>
                <p className="text-xl font-bold text-gray-900">{summaryStats.totalUsage.toLocaleString()}</p>
              </div>
              <Target className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 절약금액</p>
                <p className="text-lg font-bold text-gray-900">{formatPrice(summaryStats.totalSavings)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">쿠폰 주문</p>
                <p className="text-xl font-bold text-gray-900">{summaryStats.totalOrders.toLocaleString()}</p>
              </div>
              <ShoppingCart className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 전환율</p>
                <p className="text-xl font-bold text-gray-900">{formatPercent(summaryStats.avgConversion)}</p>
              </div>
              <Percent className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-indigo-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">사용자 수</p>
                <p className="text-xl font-bold text-gray-900">{summaryStats.uniqueUsers.toLocaleString()}</p>
              </div>
              <Users className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-pink-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 절약</p>
                <p className="text-lg font-bold text-gray-900">{formatPrice(summaryStats.avgSavingsPerUse)}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-pink-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Usage Analytics Table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            쿠폰별 사용 분석 ({filteredAndSortedData.length}개)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>쿠폰 코드</th>
                    <th>사용량</th>
                    <th>절약금액</th>
                    <th>주문 수</th>
                    <th>사용자 수</th>
                    <th>전환율</th>
                    <th>평균 절약</th>
                    <th>성과</th>
                    <th>최근 사용</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-500">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">사용 데이터가 없습니다</p>
                        <p className="text-sm">쿠폰이 사용되면 여기에 표시됩니다.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedData.map((item, index) => {
                      const coupon = coupons.find(c => c.id === item.couponId)
                      const avgSavings = item.usageCount > 0 ? item.totalSavings / item.usageCount : 0
                      
                      return (
                        <tr key={item.couponId} className={index < 3 ? 'bg-green-50' : ''}>
                          <td>
                            <div className="flex items-center gap-2">
                              {index < 3 && (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  index === 0 ? 'bg-yellow-500' :
                                  index === 1 ? 'bg-gray-400' :
                                  'bg-orange-500'
                                }`}>
                                  {index + 1}
                                </div>
                              )}
                              <div>
                                <Link 
                                  to={`/woocommerce/coupons/${item.couponId}/edit`}
                                  className="font-medium text-admin-blue hover:underline"
                                >
                                  {coupon?.code || item.couponId}
                                </Link>
                                {coupon?.description && (
                                  <div className="text-xs text-gray-500 truncate max-w-32">
                                    {coupon.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-center">
                              <div className="font-medium text-gray-900">{item.usageCount.toLocaleString()}</div>
                              {coupon?.usageLimitPerCoupon && (
                                <div className="text-xs text-gray-500">
                                  / {coupon.usageLimitPerCoupon.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="font-medium text-green-600">
                              {formatPrice(item.totalSavings)}
                            </span>
                          </td>
                          <td>
                            <span className="font-medium text-gray-900">
                              {item.orderCount.toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-gray-400" />
                              <span>{item.uniqueUsers.toLocaleString()}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className={getPerformanceColor(item.conversionRate)}>
                                {formatPercent(item.conversionRate)}
                              </span>
                              {getPerformanceBadge(item.conversionRate)}
                            </div>
                          </td>
                          <td>
                            <span className="text-gray-900">
                              {formatPrice(avgSavings)}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              {item.conversionRate >= 10 ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                  <span className="text-green-600 text-sm font-medium">우수</span>
                                </>
                              ) : item.conversionRate >= 5 ? (
                                <>
                                  <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                                  <span className="text-yellow-600 text-sm font-medium">보통</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-4 h-4 text-red-500" />
                                  <span className="text-red-600 text-sm font-medium">개선필요</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-gray-600">
                              {item.lastUsed ? formatDate(item.lastUsed) : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/woocommerce/coupons/${item.couponId}/edit`}
                                className="text-blue-600 hover:text-blue-700"
                                title="편집"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              최고 성과 쿠폰
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {usageData
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 5)
                .map((item, index) => {
                  const coupon = coupons.find(c => c.id === item.couponId)
                  return (
                    <div key={item.couponId} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{coupon?.code || item.couponId}</span>
                      </div>
                      <span className="font-medium text-green-600">
                        {formatPercent(item.conversionRate)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-500" />
              절약 금액 TOP 5
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {usageData
                .sort((a, b) => b.totalSavings - a.totalSavings)
                .slice(0, 5)
                .map((item, index) => {
                  const coupon = coupons.find(c => c.id === item.couponId)
                  return (
                    <div key={item.couponId} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{coupon?.code || item.couponId}</span>
                      </div>
                      <span className="font-medium text-purple-600">
                        {formatPrice(item.totalSavings)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              인기 쿠폰 TOP 5
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {usageData
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 5)
                .map((item, index) => {
                  const coupon = coupons.find(c => c.id === item.couponId)
                  return (
                    <div key={item.couponId} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{coupon?.code || item.couponId}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-blue-600">{item.usageCount}회</div>
                        <div className="text-xs text-gray-500">{item.uniqueUsers}명</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CouponUsagePage