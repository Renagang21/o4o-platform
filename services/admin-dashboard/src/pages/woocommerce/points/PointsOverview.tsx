import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Star,
  Gift,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Award,
  Coins,
  RefreshCw,
  Download,
  Clock,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react'
import { PointsOverview as PointsOverviewType, UserPoints, PointTransaction } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import PointsWidget from './components/PointsWidget'
import UserPointsCard from './components/UserPointsCard'
import toast from 'react-hot-toast'

const PointsOverview: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [overview, setOverview] = useState<PointsOverviewType>({
    totalIssued: 0,
    totalUsed: 0,
    totalExpired: 0,
    currentCirculation: 0,
    activeUsers: 0,
    averageBalance: 0,
    conversionRate: 0,
    roi: 0,
    
    trends: {
      issued: { value: 0, change: 0 },
      used: { value: 0, change: 0 },
      circulation: { value: 0, change: 0 },
      users: { value: 0, change: 0 }
    },
    
    monthlyData: [],
    topUsers: [],
    recentTransactions: []
  })

  const [topUsers, setTopUsers] = useState<UserPoints[]>([])
  const [recentTransactions, setRecentTransactions] = useState<PointTransaction[]>([])

  useEffect(() => {
    loadOverview()
  }, [period])

  const loadOverview = async () => {
    try {
      setLoading(true)
      const [overviewResponse, topUsersResponse, transactionsResponse] = await Promise.all([
        EcommerceApi.getPointsOverview(period),
        EcommerceApi.getTopPointsUsers(10),
        EcommerceApi.getPointsTransactions(1, 10)
      ])
      
      setOverview(overviewResponse.data)
      setTopUsers(topUsersResponse.data)
      setRecentTransactions(transactionsResponse.data)
    } catch (error) {
      console.error('Failed to load points overview:', error)
      toast.error('포인트 현황을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('ko-KR').format(points) + 'P'
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatPercent = (value: number) => {
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

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-500" />
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-500" />
    return <Activity className="w-4 h-4 text-gray-500" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getTierBadge = (tier: string) => {
    const colors = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800'
    }
    return `px-2 py-1 text-xs font-medium rounded-full ${colors[tier] || colors.bronze}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">포인트 현황을 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">포인트 현황</h1>
          <p className="text-gray-600 mt-1">{getPeriodLabel()} 포인트 시스템 운영 현황</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={loadOverview}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            리포트 다운로드
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PointsWidget
          title="총 발행 포인트"
          value={formatPoints(overview.totalIssued)}
          change={overview.trends.issued.change}
          icon={Coins}
          color="blue"
        />
        
        <PointsWidget
          title="총 사용 포인트"
          value={formatPoints(overview.totalUsed)}
          change={overview.trends.used.change}
          icon={DollarSign}
          color="green"
        />
        
        <PointsWidget
          title="현재 유통량"
          value={formatPoints(overview.currentCirculation)}
          change={overview.trends.circulation.change}
          icon={Activity}
          color="purple"
        />
        
        <PointsWidget
          title="활성 사용자"
          value={overview.activeUsers.toLocaleString()}
          change={overview.trends.users.change}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">만료된 포인트</p>
                <p className="text-xl font-bold text-red-600">{formatPoints(overview.totalExpired)}</p>
              </div>
              <Clock className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 보유량</p>
                <p className="text-xl font-bold text-gray-900">{formatPoints(overview.averageBalance)}</p>
              </div>
              <Target className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전환율</p>
                <p className="text-xl font-bold text-green-600">{overview.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ROI</p>
                <p className="text-xl font-bold text-purple-600">{overview.roi.toFixed(1)}%</p>
              </div>
              <Award className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              월별 포인트 추이
            </h3>
          </div>
          <div className="wp-card-body">
            {overview.monthlyData.length > 0 ? (
              <div className="space-y-4">
                <div className="h-64 flex items-end justify-between gap-1">
                  {overview.monthlyData.slice(-6).map((data, index) => {
                    const maxValue = Math.max(...overview.monthlyData.map(d => Math.max(d.issued, d.used)))
                    const issuedHeight = (data.issued / maxValue) * 100
                    const usedHeight = (data.used / maxValue) * 100
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col gap-1" style={{ height: '200px' }}>
                          <div className="flex-1 flex flex-col justify-end">
                            <div 
                              className="w-full bg-blue-500 rounded-t"
                              style={{ height: `${issuedHeight}%` }}
                              title={`발행: ${formatPoints(data.issued)}`}
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-end">
                            <div 
                              className="w-full bg-green-500 rounded-t"
                              style={{ height: `${usedHeight}%` }}
                              title={`사용: ${formatPoints(data.used)}`}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 transform -rotate-45 origin-left">
                          {new Date(data.month).toLocaleDateString('ko-KR', { month: 'short' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>발행</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>사용</span>
                  </div>
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

        {/* Points Distribution */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              포인트 분포
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {((overview.currentCirculation / overview.totalIssued) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-blue-700">유통 중</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {((overview.totalUsed / overview.totalIssued) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-700">사용됨</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>발행 포인트</span>
                    <span>{formatPoints(overview.totalIssued)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>사용 포인트</span>
                    <span>{formatPoints(overview.totalUsed)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(overview.totalUsed / overview.totalIssued) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>만료 포인트</span>
                    <span>{formatPoints(overview.totalExpired)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${(overview.totalExpired / overview.totalIssued) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Users and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              포인트 보유 순위
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {topUsers.slice(0, 10).map((user, index) => (
                <UserPointsCard
                  key={user.userId}
                  user={user}
                  rank={index + 1}
                  compact={true}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Activity className="w-5 h-5" />
              최근 거래 내역
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'earn' ? 'bg-green-100' :
                      transaction.type === 'spend' ? 'bg-red-100' :
                      transaction.type === 'expire' ? 'bg-gray-100' : 'bg-blue-100'
                    }`}>
                      {transaction.type === 'earn' ? <TrendingUp className="w-4 h-4 text-green-600" /> :
                       transaction.type === 'spend' ? <TrendingDown className="w-4 h-4 text-red-600" /> :
                       transaction.type === 'expire' ? <Clock className="w-4 h-4 text-gray-600" /> :
                       <Gift className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {transaction.type === 'earn' ? '적립' :
                         transaction.type === 'spend' ? '사용' :
                         transaction.type === 'expire' ? '만료' : '조정'}
                      </div>
                      <div className="text-sm text-gray-500">{transaction.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      transaction.type === 'earn' || transaction.type === 'admin_adjust' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'earn' || transaction.type === 'admin_adjust' ? '+' : '-'}
                      {formatPoints(Math.abs(transaction.points))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">성과 분석</h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {overview.conversionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-green-700 mb-1">포인트 사용 전환율</div>
              <div className="text-xs text-gray-600">
                발행된 포인트 대비 실제 사용 비율
              </div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {formatPrice(overview.averageBalance * 10)}
              </div>
              <div className="text-sm text-blue-700 mb-1">평균 포인트 가치</div>
              <div className="text-xs text-gray-600">
                1포인트 = 10원 기준 평균 보유 가치
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {overview.roi.toFixed(1)}%
              </div>
              <div className="text-sm text-purple-700 mb-1">투자 수익률 (ROI)</div>
              <div className="text-xs text-gray-600">
                포인트 투자 대비 매출 증가율
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointsOverview