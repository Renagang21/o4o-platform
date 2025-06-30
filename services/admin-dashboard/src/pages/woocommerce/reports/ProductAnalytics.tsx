import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown,
  Eye,
  ShoppingCart,
  RotateCcw,
  Star,
  Package,
  Target,
  BarChart3,
  PieChart,
  Filter,
  Download,
  Calendar,
  Search
} from 'lucide-react'
import { ProductAnalytics } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const ProductAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<ProductAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>('month')
  const [selectedProduct, setSelectedProduct] = useState<ProductAnalytics | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'views' | 'sales' | 'revenue' | 'conversionRate'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getProductAnalytics(undefined, period)
      setAnalytics(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to load product analytics:', error)
      toast.error('상품 분석 데이터를 불러오는데 실패했습니다.')
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
    return labels[period as keyof typeof labels] || '이번 달'
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

  const getPerformanceColor = (value: number, type: 'conversion' | 'rating' | 'return') => {
    if (type === 'conversion') {
      if (value >= 5) return 'text-green-600'
      if (value >= 2) return 'text-yellow-600'
      return 'text-red-600'
    }
    if (type === 'rating') {
      if (value >= 4.5) return 'text-green-600'
      if (value >= 3.5) return 'text-yellow-600'
      return 'text-red-600'
    }
    if (type === 'return') {
      if (value <= 5) return 'text-green-600'
      if (value <= 15) return 'text-yellow-600'
      return 'text-red-600'
    }
    return 'text-gray-600'
  }

  const getPerformanceBadge = (value: number, type: 'conversion' | 'rating' | 'return') => {
    const color = getPerformanceColor(value, type)
    let label = '보통'
    
    if (type === 'conversion') {
      if (value >= 5) label = '우수'
      else if (value >= 2) label = '보통'
      else label = '개선필요'
    } else if (type === 'rating') {
      if (value >= 4.5) label = '우수'
      else if (value >= 3.5) label = '보통'
      else label = '개선필요'
    } else if (type === 'return') {
      if (value <= 5) label = '우수'
      else if (value <= 15) label = '보통'
      else label = '개선필요'
    }

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

  const filteredAndSortedAnalytics = analytics
    .filter(item => 
      item.productId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
    })

  // Calculate summary stats
  const summaryStats = {
    totalViews: analytics.reduce((sum, item) => sum + item.views, 0),
    totalSales: analytics.reduce((sum, item) => sum + item.sales, 0),
    totalRevenue: analytics.reduce((sum, item) => sum + item.revenue, 0),
    avgConversion: analytics.length > 0 
      ? analytics.reduce((sum, item) => sum + item.conversionRate, 0) / analytics.length 
      : 0,
    avgRating: analytics.length > 0 
      ? analytics.reduce((sum, item) => sum + item.averageRating, 0) / analytics.length 
      : 0,
    avgReturnRate: analytics.length > 0 
      ? analytics.reduce((sum, item) => sum + item.returnRate, 0) / analytics.length 
      : 0
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 분석</h1>
          <p className="text-gray-600 mt-1">{getPeriodLabel()} 상품별 성과를 분석합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            리포트 다운로드
          </button>
        </div>
      </div>

      {/* Period and Search Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">기간:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="wp-select"
              >
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
                <option value="quarter">이번 분기</option>
                <option value="year">올해</option>
              </select>
            </div>

            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="상품 ID로 검색..."
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
                <option value="revenue">매출순</option>
                <option value="sales">판매량순</option>
                <option value="views">조회수순</option>
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
                <p className="text-sm font-medium text-gray-600">총 조회수</p>
                <p className="text-xl font-bold text-gray-900">{summaryStats.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 판매량</p>
                <p className="text-xl font-bold text-gray-900">{summaryStats.totalSales.toLocaleString()}</p>
              </div>
              <ShoppingCart className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 매출</p>
                <p className="text-lg font-bold text-gray-900">{formatPrice(summaryStats.totalRevenue)}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-purple-500" />
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
              <Target className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-yellow-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 평점</p>
                <p className="text-xl font-bold text-gray-900">{summaryStats.avgRating.toFixed(1)}</p>
              </div>
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-red-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 반품률</p>
                <p className="text-xl font-bold text-gray-900">{formatPercent(summaryStats.avgReturnRate)}</p>
              </div>
              <RotateCcw className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Product Analytics Table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            상품별 성과 분석 ({filteredAndSortedAnalytics.length}개)
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
                    <th>상품 ID</th>
                    <th>조회수</th>
                    <th>판매량</th>
                    <th>매출</th>
                    <th>전환율</th>
                    <th>평점</th>
                    <th>리뷰수</th>
                    <th>반품률</th>
                    <th>재고회전율</th>
                    <th>성과</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-500">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">분석 데이터가 없습니다</p>
                        <p className="text-sm">상품 데이터가 수집되면 여기에 표시됩니다.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedAnalytics.map((item, index) => (
                      <tr 
                        key={item.productId}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          index < 3 ? 'bg-green-50' : ''
                        }`}
                        onClick={() => setSelectedProduct(item)}
                      >
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
                            <span className="font-mono text-sm">{item.productId}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-gray-400" />
                            <span>{item.views.toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{item.sales.toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-green-600">
                            {formatPrice(item.revenue)}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={getPerformanceColor(item.conversionRate, 'conversion')}>
                              {formatPercent(item.conversionRate)}
                            </span>
                            {getPerformanceBadge(item.conversionRate, 'conversion')}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className={getPerformanceColor(item.averageRating, 'rating')}>
                              {item.averageRating.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="text-gray-600">{item.reviewCount}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={getPerformanceColor(item.returnRate, 'return')}>
                              {formatPercent(item.returnRate)}
                            </span>
                            {getPerformanceBadge(item.returnRate, 'return')}
                          </div>
                        </td>
                        <td>
                          <span className="text-gray-600">{item.stockTurnover.toFixed(1)}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {item.conversionRate >= 5 && item.averageRating >= 4.5 && item.returnRate <= 5 ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span className="text-green-600 text-sm font-medium">우수</span>
                              </>
                            ) : item.conversionRate >= 2 && item.averageRating >= 3.5 && item.returnRate <= 15 ? (
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              매출 TOP 5
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {analytics
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={item.productId} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-mono text-sm">{item.productId}</span>
                    </div>
                    <span className="font-medium text-green-600">
                      {formatPrice(item.revenue)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              전환율 TOP 5
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {analytics
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={item.productId} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-mono text-sm">{item.productId}</span>
                    </div>
                    <span className="font-medium text-purple-600">
                      {formatPercent(item.conversionRate)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              평점 TOP 5
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {analytics
                .filter(item => item.reviewCount >= 5) // 최소 5개 리뷰 필요
                .sort((a, b) => b.averageRating - a.averageRating)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={item.productId} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-mono text-sm">{item.productId}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="font-medium text-yellow-600">
                        {item.averageRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">({item.reviewCount})</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductAnalyticsPage