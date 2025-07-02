import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ShoppingCart, 
  Eye, 
  Edit, 
  Printer, 
  Download, 
  Filter, 
  Search,
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { Order, OrderFilters as IOrderFilters, OrderStatus } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const AllOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [filters, setFilters] = useState<IOrderFilters>({})
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  })

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    todayRevenue: 0,
    todayOrders: 0
  })

  const pageSize = 20

  useEffect(() => {
    loadOrders()
    loadStats()
  }, [filters])

  const loadOrders = async (page = 1) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getOrders(page, pageSize, filters)
      setOrders(response.data)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load orders:', error)
      toast.error('주문 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await EcommerceApi.getDashboardStats()
      setStats({
        total: response.data.totalOrders || 0,
        pending: response.data.pendingOrders || 0,
        processing: 0, // TODO: Add to API
        completed: 0, // TODO: Add to API
        cancelled: 0, // TODO: Add to API
        todayRevenue: response.data.todaySales || 0,
        todayOrders: response.data.todayOrders || 0
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleStatusChange = async (orderId: string, status: OrderStatus, note?: string) => {
    try {
      await EcommerceApi.updateOrderStatus(orderId, status, note)
      toast.success('주문 상태가 변경되었습니다.')
      loadOrders(pagination.current)
      loadStats()
    } catch (error) {
      console.error('Failed to update order status:', error)
      toast.error('주문 상태 변경에 실패했습니다.')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedOrders.length === 0) {
      toast.error('선택된 주문이 없습니다.')
      return
    }

    try {
      await EcommerceApi.bulkOrderAction({
        action: action as any,
        orderIds: selectedOrders,
        data: action.startsWith('update_status_') ? { status: action.replace('update_status_', '') as OrderStatus } : undefined
      })
      toast.success('일괄 작업이 완료되었습니다.')
      setSelectedOrders([])
      loadOrders(pagination.current)
      loadStats()
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error('일괄 작업에 실패했습니다.')
    }
  }

  const handleExport = async () => {
    try {
      const blob = await EcommerceApi.exportOrders(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('주문 목록이 내보내졌습니다.')
    } catch (error) {
      console.error('Failed to export orders:', error)
      toast.error('내보내기에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: '대기중' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Package, label: '처리중' },
      'on-hold': { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: '보류' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: '완료' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: '취소' },
      refunded: { color: 'bg-purple-100 text-purple-800', icon: XCircle, label: '환불' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: '실패' }
    }

    const config = configs[status] || { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: status }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      refunded: 'bg-purple-100 text-purple-800'
    }

    const labels = {
      pending: '대기중',
      processing: '처리중',
      completed: '완료',
      failed: '실패',
      cancelled: '취소',
      refunded: '환불'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const updateFilter = (key: keyof IOrderFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedOrders(selected ? orders.map(o => o.id) : [])
  }

  const allSelected = orders.length > 0 && selectedOrders.length === orders.length
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주문</h1>
          <p className="text-gray-600 mt-1">모든 주문을 확인하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="wp-button-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 주문</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">대기중</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">처리중</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing.toLocaleString()}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">완료</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">취소</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled.toLocaleString()}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">오늘 주문</p>
                <p className="text-2xl font-bold text-purple-600">{stats.todayOrders.toLocaleString()}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">오늘 매출</p>
                <p className="text-xl font-bold text-green-600">{formatPrice(stats.todayRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="주문번호, 고객명, 이메일로 검색..."
                  value={filters.search || ''}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="processing">처리중</option>
                <option value="on-hold">보류</option>
                <option value="completed">완료</option>
                <option value="cancelled">취소</option>
                <option value="refunded">환불</option>
                <option value="failed">실패</option>
              </select>

              <select
                value={filters.paymentStatus || ''}
                onChange={(e) => updateFilter('paymentStatus', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 결제</option>
                <option value="pending">결제대기</option>
                <option value="completed">결제완료</option>
                <option value="failed">결제실패</option>
                <option value="refunded">환불완료</option>
              </select>

              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="wp-input"
                placeholder="시작일"
              />

              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="wp-input"
                placeholder="종료일"
              />

              <button
                onClick={() => setFilters({})}
                className="wp-button-secondary"
                title="필터 초기화"
              >
                <Filter className="w-4 h-4" />
                초기화
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedOrders.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedOrders.length}개 주문 선택됨
                </span>
                
                <div className="flex items-center gap-2">
                  <select 
                    className="wp-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">일괄 작업 선택</option>
                    <option value="update_status_processing">처리중으로 변경</option>
                    <option value="update_status_completed">완료로 변경</option>
                    <option value="update_status_on-hold">보류로 변경</option>
                    <option value="update_status_cancelled">취소로 변경</option>
                    <option value="export">선택된 주문 내보내기</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrders([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            주문 목록 ({pagination.totalItems.toLocaleString()}개)
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
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={input => {
                          if (input) input.indeterminate = someSelected
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                    </th>
                    <th>주문</th>
                    <th>고객</th>
                    <th>주문상태</th>
                    <th>결제상태</th>
                    <th>총액</th>
                    <th>상품수</th>
                    <th>주문일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                        />
                      </td>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">
                            <Link 
                              to={`/woocommerce/orders/${order.id}`}
                              className="hover:text-admin-blue"
                            >
                              #{order.orderNumber}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.paymentMethod}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">{order.customerName}</div>
                          <div className="text-sm text-gray-500">{order.customerEmail}</div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(order.status)}
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5"
                          >
                            <option value="pending">대기중</option>
                            <option value="processing">처리중</option>
                            <option value="on-hold">보류</option>
                            <option value="completed">완료</option>
                            <option value="cancelled">취소</option>
                            <option value="refunded">환불</option>
                            <option value="failed">실패</option>
                          </select>
                        </div>
                      </td>
                      <td>{getPaymentStatusBadge(order.paymentStatus)}</td>
                      <td>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatPrice(order.total)}</div>
                          {order.tax > 0 && (
                            <div className="text-xs text-gray-500">세금: {formatPrice(order.tax)}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-gray-900">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)}개
                        </span>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div>{formatDate(order.createdAt)}</div>
                          {order.completedAt && (
                            <div className="text-xs text-green-600">
                              완료: {formatDate(order.completedAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/woocommerce/orders/${order.id}`}
                            className="text-blue-600 hover:text-blue-700"
                            title="상세보기"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          <button
                            onClick={() => window.print()}
                            className="text-green-600 hover:text-green-700"
                            title="인쇄"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">주문이 없습니다</p>
                  <p className="text-sm">고객의 첫 주문을 기다리고 있습니다!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            전체 <span className="font-medium">{pagination.totalItems}</span>개 중{' '}
            <span className="font-medium">
              {((pagination.current - 1) * pageSize) + 1}-{Math.min(pagination.current * pageSize, pagination.totalItems)}
            </span>개 표시
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => loadOrders(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="wp-button-secondary"
            >
              이전
            </button>
            
            {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
              const page = i + Math.max(1, pagination.current - 2)
              if (page > pagination.total) return null
              
              return (
                <button
                  key={page}
                  onClick={() => loadOrders(page)}
                  className={page === pagination.current ? 'wp-button-primary' : 'wp-button-secondary'}
                >
                  {page}
                </button>
              )
            })}
            
            <button
              onClick={() => loadOrders(pagination.current + 1)}
              disabled={pagination.current === pagination.total}
              className="wp-button-secondary"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllOrders