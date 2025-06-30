import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  User, 
  Building, 
  Crown, 
  Eye, 
  Edit, 
  Mail, 
  Phone, 
  MapPin,
  DollarSign,
  ShoppingBag,
  Search,
  Filter,
  Download,
  Plus,
  Calendar
} from 'lucide-react'
import { Customer } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const AllCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  })

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    customers: 0,
    business: 0,
    affiliates: 0,
    active: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  })

  const pageSize = 20

  useEffect(() => {
    loadCustomers()
    loadStats()
  }, [searchTerm, filterRole, filterStatus])

  const loadCustomers = async (page = 1) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getCustomers(page, pageSize, searchTerm)
      setCustomers(response.data)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load customers:', error)
      toast.error('고객 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await EcommerceApi.getDashboardStats()
      setStats({
        total: response.data.totalCustomers || 0,
        customers: 0, // TODO: Add to API
        business: 0, // TODO: Add to API
        affiliates: 0, // TODO: Add to API
        active: 0, // TODO: Add to API
        totalRevenue: response.data.todaySales || 0,
        averageOrderValue: 0 // TODO: Add to API
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleExport = async () => {
    try {
      // TODO: Implement customer export
      toast.success('고객 목록이 내보내졌습니다.')
    } catch (error) {
      console.error('Failed to export customers:', error)
      toast.error('내보내기에 실패했습니다.')
    }
  }

  const getRoleBadge = (role: string) => {
    const configs = {
      customer: { color: 'bg-blue-100 text-blue-800', icon: User, label: '일반고객' },
      business: { color: 'bg-green-100 text-green-800', icon: Building, label: '기업고객' },
      affiliate: { color: 'bg-purple-100 text-purple-800', icon: Crown, label: '파트너' }
    }

    const config = configs[role as keyof typeof configs] || { color: 'bg-gray-100 text-gray-800', icon: User, label: role }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    }

    const labels = {
      active: '활성',
      inactive: '비활성',
      pending: '대기중'
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
      day: 'numeric'
    })
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.businessInfo?.businessName || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = !filterRole || customer.role === filterRole
    const matchesStatus = !filterStatus || customer.status === filterStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedCustomers(selected ? filteredCustomers.map(c => c.id) : [])
  }

  const allSelected = filteredCustomers.length > 0 && selectedCustomers.length === filteredCustomers.length
  const someSelected = selectedCustomers.length > 0 && selectedCustomers.length < filteredCustomers.length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">고객</h1>
          <p className="text-gray-600 mt-1">모든 고객을 확인하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="wp-button-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
          <button className="wp-button-primary">
            <Plus className="w-4 h-4 mr-2" />
            고객 추가
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 고객</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">일반고객</p>
                <p className="text-2xl font-bold text-blue-600">{stats.customers.toLocaleString()}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">기업고객</p>
                <p className="text-2xl font-bold text-green-600">{stats.business.toLocaleString()}</p>
              </div>
              <Building className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">파트너</p>
                <p className="text-2xl font-bold text-purple-600">{stats.affiliates.toLocaleString()}</p>
              </div>
              <Crown className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 고객</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.active.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 매출</p>
                <p className="text-xl font-bold text-green-600">{formatPrice(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 주문</p>
                <p className="text-xl font-bold text-orange-600">{formatPrice(stats.averageOrderValue)}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-orange-500" />
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
                  placeholder="이름, 이메일, 회사명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 역할</option>
                <option value="customer">일반고객</option>
                <option value="business">기업고객</option>
                <option value="affiliate">파트너</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
                <option value="pending">대기중</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterRole('')
                  setFilterStatus('')
                }}
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
      {selectedCustomers.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedCustomers.length}명 고객 선택됨
                </span>
                
                <div className="flex items-center gap-2">
                  <select className="wp-select">
                    <option value="">일괄 작업 선택</option>
                    <option value="activate">활성화</option>
                    <option value="deactivate">비활성화</option>
                    <option value="export">선택된 고객 내보내기</option>
                    <option value="email">이메일 발송</option>
                  </select>
                  <button className="wp-button-primary">적용</button>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomers([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customers table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            고객 목록 ({filteredCustomers.length.toLocaleString()}명)
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
                    <th>고객</th>
                    <th>역할</th>
                    <th>상태</th>
                    <th>연락처</th>
                    <th>주문</th>
                    <th>총 구매액</th>
                    <th>가입일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                            {(customer.firstName[0] || '') + (customer.lastName[0] || '')}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              <Link 
                                to={`/woocommerce/customers/${customer.id}`}
                                className="hover:text-admin-blue"
                              >
                                {customer.firstName} {customer.lastName}
                              </Link>
                            </div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                            {customer.businessInfo && (
                              <div className="text-sm text-gray-600 font-medium">
                                {customer.businessInfo.businessName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(customer.role)}</td>
                      <td>{getStatusBadge(customer.status)}</td>
                      <td>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                              {customer.email}
                            </a>
                          </div>
                          {customer.billingAddress?.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <a href={`tel:${customer.billingAddress.phone}`} className="text-blue-600 hover:underline">
                                {customer.billingAddress.phone}
                              </a>
                            </div>
                          )}
                          {customer.billingAddress?.city && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {customer.billingAddress.city}, {customer.billingAddress.state}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">{customer.orderCount}</div>
                          <div className="text-xs text-gray-500">
                            {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '주문 없음'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatPrice(customer.totalSpent)}</div>
                          <div className="text-xs text-gray-500">
                            평균: {formatPrice(customer.averageOrderValue)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div>{formatDate(customer.createdAt)}</div>
                          {customer.lastLoginAt && (
                            <div className="text-xs text-gray-500">
                              최근: {formatDate(customer.lastLoginAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/woocommerce/customers/${customer.id}`}
                            className="text-blue-600 hover:text-blue-700"
                            title="상세보기"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          <button
                            className="text-green-600 hover:text-green-700"
                            title="편집"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <a
                            href={`mailto:${customer.email}`}
                            className="text-purple-600 hover:text-purple-700"
                            title="이메일 발송"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCustomers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">고객이 없습니다</p>
                  <p className="text-sm">첫 번째 고객을 기다리고 있습니다!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">고객 유형별 분포</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">일반고객</span>
                <span className="font-medium">{stats.customers}명</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">기업고객</span>
                <span className="font-medium">{stats.business}명</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">파트너</span>
                <span className="font-medium">{stats.affiliates}명</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">최근 가입 고객</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {filteredCustomers.slice(0, 3).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {(customer.firstName[0] || '') + (customer.lastName[0] || '')}
                    </div>
                    <span className="text-sm">{customer.firstName} {customer.lastName}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(customer.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">주요 지표</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">활성률</span>
                <span className="font-medium">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">평균 주문액</span>
                <span className="font-medium">{formatPrice(stats.averageOrderValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">총 매출</span>
                <span className="font-medium">{formatPrice(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllCustomers