import React, { useState, useEffect } from 'react'
import { 
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Gift,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  X
} from 'lucide-react'
import { PointTransaction, UserPoints } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import TransactionTable from './components/TransactionTable'
import toast from 'react-hot-toast'

const PointsTransactions: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<PointTransaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<PointTransaction | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    type: '',
    reason: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    userId: '',
    pointsMin: '',
    pointsMax: ''
  })
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalEarned: 0,
    totalSpent: 0,
    totalExpired: 0,
    uniqueUsers: 0
  })

  useEffect(() => {
    loadTransactions()
  }, [currentPage, pageSize])

  useEffect(() => {
    applyFilters()
  }, [transactions, filters])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getPointsTransactions(currentPage, pageSize)
      setTransactions(response.data)
      setTotalItems(response.pagination?.totalItems || 0)
      calculateStats(response.data)
    } catch (error) {
      console.error('Failed to load point transactions:', error)
      toast.error('포인트 거래 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (transactionData: PointTransaction[]) => {
    const earned = transactionData
      .filter(t => t.type === 'earn')
      .reduce((sum, t) => sum + t.points, 0)
    
    const spent = transactionData
      .filter(t => t.type === 'spend')
      .reduce((sum, t) => sum + t.points, 0)
    
    const expired = transactionData
      .filter(t => t.type === 'expire')
      .reduce((sum, t) => sum + t.points, 0)
    
    const uniqueUsers = new Set(transactionData.map(t => t.userId)).size

    setStats({
      totalTransactions: transactionData.length,
      totalEarned: earned,
      totalSpent: spent,
      totalExpired: expired,
      uniqueUsers
    })
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(t => 
        t.userId.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.orderId?.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term)
      )
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type)
    }

    // Reason filter
    if (filters.reason) {
      filtered = filtered.filter(t => t.reason === filters.reason)
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status)
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(t => new Date(t.createdAt) >= fromDate)
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => new Date(t.createdAt) <= toDate)
    }

    // User ID filter
    if (filters.userId) {
      filtered = filtered.filter(t => t.userId.toLowerCase().includes(filters.userId.toLowerCase()))
    }

    // Points range filter
    if (filters.pointsMin) {
      filtered = filtered.filter(t => t.points >= parseInt(filters.pointsMin))
    }
    if (filters.pointsMax) {
      filtered = filtered.filter(t => t.points <= parseInt(filters.pointsMax))
    }

    setFilteredTransactions(filtered)
  }

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      type: '',
      reason: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      userId: '',
      pointsMin: '',
      pointsMax: ''
    })
  }

  const exportTransactions = async () => {
    try {
      const response = await EcommerceApi.exportPointsTransactions(filters)
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `points_transactions_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('거래 내역이 다운로드되었습니다.')
    } catch (error) {
      console.error('Failed to export transactions:', error)
      toast.error('내보내기에 실패했습니다.')
    }
  }

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('ko-KR').format(points) + 'P'
  }

  const getTransactionTypeInfo = (type: string) => {
    const types = {
      earn: { label: '적립', color: 'text-green-600', bgColor: 'bg-green-100', icon: TrendingUp },
      spend: { label: '사용', color: 'text-red-600', bgColor: 'bg-red-100', icon: TrendingDown },
      expire: { label: '만료', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Clock },
      admin_adjust: { label: '조정', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Gift }
    }
    return types[type] || types.earn
  }

  const getReasonLabel = (reason: string) => {
    const reasons = {
      purchase: '구매',
      review: '리뷰',
      referral: '추천',
      birthday: '생일',
      admin: '관리자',
      usage: '사용'
    }
    return reasons[reason] || reason
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    const statusLabels = {
      pending: '대기',
      confirmed: '확정',
      cancelled: '취소'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || statusColors.pending}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">포인트 거래 내역</h1>
          <p className="text-gray-600 mt-1">모든 포인트 적립, 사용, 만료 내역을 확인합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTransactions}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button
            onClick={exportTransactions}
            className="wp-button-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 거래</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalTransactions.toLocaleString()}</p>
              </div>
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 적립</p>
                <p className="text-xl font-bold text-green-600">{formatPoints(stats.totalEarned)}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-red-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 사용</p>
                <p className="text-xl font-bold text-red-600">{formatPoints(stats.totalSpent)}</p>
              </div>
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-gray-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 만료</p>
                <p className="text-xl font-bold text-gray-600">{formatPoints(stats.totalExpired)}</p>
              </div>
              <Clock className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 사용자</p>
                <p className="text-xl font-bold text-purple-600">{stats.uniqueUsers.toLocaleString()}</p>
              </div>
              <User className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="space-y-4">
            {/* Basic Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="사용자 ID, 주문번호, 거래 ID로 검색..."
                    value={filters.searchTerm}
                    onChange={(e) => updateFilter('searchTerm', e.target.value)}
                    className="wp-input pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter('type', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 유형</option>
                  <option value="earn">적립</option>
                  <option value="spend">사용</option>
                  <option value="expire">만료</option>
                  <option value="admin_adjust">조정</option>
                </select>

                <select
                  value={filters.reason}
                  onChange={(e) => updateFilter('reason', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 사유</option>
                  <option value="purchase">구매</option>
                  <option value="review">리뷰</option>
                  <option value="referral">추천</option>
                  <option value="birthday">생일</option>
                  <option value="admin">관리자</option>
                  <option value="usage">사용</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 상태</option>
                  <option value="pending">대기</option>
                  <option value="confirmed">확정</option>
                  <option value="cancelled">취소</option>
                </select>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="wp-button-secondary"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  고급 필터
                  {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="wp-label">시작일</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="wp-input"
                  />
                </div>
                <div>
                  <label className="wp-label">종료일</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className="wp-input"
                  />
                </div>
                <div>
                  <label className="wp-label">사용자 ID</label>
                  <input
                    type="text"
                    value={filters.userId}
                    onChange={(e) => updateFilter('userId', e.target.value)}
                    className="wp-input"
                    placeholder="특정 사용자"
                  />
                </div>
                <div>
                  <label className="wp-label">최소 포인트</label>
                  <input
                    type="number"
                    value={filters.pointsMin}
                    onChange={(e) => updateFilter('pointsMin', e.target.value)}
                    className="wp-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="wp-label">최대 포인트</label>
                  <input
                    type="number"
                    value={filters.pointsMax}
                    onChange={(e) => updateFilter('pointsMax', e.target.value)}
                    className="wp-input"
                    placeholder="무제한"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="wp-button-secondary w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    필터 초기화
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <TransactionTable
        transactions={filteredTransactions}
        loading={loading}
        onTransactionClick={setSelectedTransaction}
      />

      {/* Pagination */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)}개 / 총 {totalItems}개
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="wp-select w-20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">개씩 보기</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(totalItems / pageSize)) }, (_, i) => {
                  const page = currentPage - 2 + i
                  if (page < 1 || page > Math.ceil(totalItems / pageSize)) return null
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm rounded ${
                        page === currentPage
                          ? 'bg-admin-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalItems / pageSize), currentPage + 1))}
                disabled={currentPage === Math.ceil(totalItems / pageSize)}
                className="wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">거래 상세</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">거래 ID</label>
                  <div className="font-mono text-sm">{selectedTransaction.id}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">유형</label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const typeInfo = getTransactionTypeInfo(selectedTransaction.type)
                        const IconComponent = typeInfo.icon
                        return (
                          <>
                            <IconComponent className={`w-4 h-4 ${typeInfo.color}`} />
                            <span className={typeInfo.color}>{typeInfo.label}</span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">상태</label>
                    <div>{getStatusBadge(selectedTransaction.status)}</div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">포인트</label>
                  <div className={`text-lg font-bold ${
                    selectedTransaction.type === 'earn' || selectedTransaction.type === 'admin_adjust' 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedTransaction.type === 'earn' || selectedTransaction.type === 'admin_adjust' ? '+' : '-'}
                    {formatPoints(selectedTransaction.points)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">사용자</label>
                  <div>{selectedTransaction.userId}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">사유</label>
                  <div>{getReasonLabel(selectedTransaction.reason)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">설명</label>
                  <div>{selectedTransaction.description}</div>
                </div>
                
                {selectedTransaction.orderId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">주문 번호</label>
                    <div className="font-mono text-sm">{selectedTransaction.orderId}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">생성일</label>
                    <div className="text-sm">
                      {new Date(selectedTransaction.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  {selectedTransaction.expiresAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">만료일</label>
                      <div className="text-sm">
                        {new Date(selectedTransaction.expiresAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PointsTransactions