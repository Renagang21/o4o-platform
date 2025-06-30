import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { SalesReport } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const SalesReports: React.FC = () => {
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    loadReport()
  }, [period, dateRange])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getSalesReport(
        period,
        period === 'custom' ? dateRange.startDate : undefined,
        period === 'custom' ? dateRange.endDate : undefined
      )
      setReport(response.data)
    } catch (error) {
      console.error('Failed to load sales report:', error)
      toast.error('매출 리포트를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getPeriodLabel = () => {
    const labels = {
      today: '오늘',
      week: '이번 주',
      month: '이번 달',
      year: '올해',
      custom: '사용자 정의'
    }
    return labels[period]
  }

  // Mock comparison data (이전 기간 대비)
  const mockComparison = {
    salesGrowth: 12.5,
    ordersGrowth: 8.3,
    avgOrderGrowth: 3.8,
    customerGrowth: 15.2
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">데이터를 불러올 수 없습니다</h2>
        <p className="text-gray-500">나중에 다시 시도해주세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출 리포트</h1>
          <p className="text-gray-600 mt-1">{getPeriodLabel()} 매출 성과를 분석합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            PDF 다운로드
          </button>
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* Period Filter */}
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
                <option value="today">오늘</option>
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
                <option value="year">올해</option>
                <option value="custom">사용자 정의</option>
              </select>
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="wp-input"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="wp-input"
                />
                <button
                  onClick={loadReport}
                  className="wp-button-primary"
                >
                  적용
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 매출</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(report.totalSales)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {mockComparison.salesGrowth >= 0 ? (
                    <ArrowUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${mockComparison.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(mockComparison.salesGrowth)}
                  </span>
                  <span className="text-xs text-gray-500">vs 이전 기간</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 주문</p>
                <p className="text-2xl font-bold text-gray-900">{report.totalOrders.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {mockComparison.ordersGrowth >= 0 ? (
                    <ArrowUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${mockComparison.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(mockComparison.ordersGrowth)}
                  </span>
                  <span className="text-xs text-gray-500">vs 이전 기간</span>
                </div>
              </div>
              <ShoppingBag className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 주문액</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(report.averageOrderValue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {mockComparison.avgOrderGrowth >= 0 ? (
                    <ArrowUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${mockComparison.avgOrderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(mockComparison.avgOrderGrowth)}
                  </span>
                  <span className="text-xs text-gray-500">vs 이전 기간</span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">순매출</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(report.netSales)}</p>
                <div className="text-xs text-gray-500 mt-1">
                  할인: {formatPrice(report.totalDiscount)} | 환불: {formatPrice(report.totalRefunds)}
                </div>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 세금</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(report.totalTax)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">세</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 배송비</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(report.totalShipping)}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">배</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 할인</p>
                <p className="text-xl font-bold text-red-600">{formatPrice(report.totalDiscount)}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-sm">할</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              매출 추이
            </h3>
          </div>
          <div className="wp-card-body">
            {report.salesByDay.length > 0 ? (
              <div className="space-y-4">
                {/* Simple bar chart representation */}
                <div className="h-64 flex items-end justify-between gap-1">
                  {report.salesByDay.slice(-7).map((data, index) => {
                    const maxSales = Math.max(...report.salesByDay.map(d => d.sales))
                    const height = (data.sales / maxSales) * 100
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${new Date(data.date).toLocaleDateString('ko-KR')}: ${formatPrice(data.sales)}`}
                        />
                        <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                          {new Date(data.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>최근 7일 매출 추이</span>
                  <span>최대: {formatPrice(Math.max(...report.salesByDay.map(d => d.sales)))}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>차트 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              인기 상품
            </h3>
          </div>
          <div className="wp-card-body">
            {report.topProducts.length > 0 ? (
              <div className="space-y-3">
                {report.topProducts.slice(0, 5).map((product, index) => {
                  const maxSales = Math.max(...report.topProducts.map(p => p.sales))
                  const percentage = (product.sales / maxSales) * 100
                  
                  return (
                    <div key={product.productId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-900 truncate max-w-48">
                            {product.productName}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatPrice(product.sales)}</div>
                          <div className="text-xs text-gray-500">{product.quantity}개</div>
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PieChart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>상품 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">카테고리별 매출</h3>
        </div>
        <div className="wp-card-body">
          {report.topCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>카테고리</th>
                    <th>매출</th>
                    <th>주문 수</th>
                    <th>점유율</th>
                    <th>추이</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topCategories.map((category, index) => {
                    const percentage = (category.sales / report.totalSales) * 100
                    
                    return (
                      <tr key={category.categoryId}>
                        <td>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-gray-900">{category.categoryName}</div>
                        </td>
                        <td>
                          <div className="font-medium text-gray-900">{formatPrice(category.sales)}</div>
                        </td>
                        <td>
                          <div className="text-gray-900">{category.orders.toLocaleString()}</div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">+5.2%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p>카테고리 데이터가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalesReports