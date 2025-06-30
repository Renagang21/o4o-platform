import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  User,
  Building,
  Crown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  Edit,
  Save,
  Eye,
  Package,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Customer, Order } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const CustomerDetail: React.FC = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Customer>>({})

  useEffect(() => {
    if (customerId) {
      loadCustomer(customerId)
      loadCustomerOrders(customerId)
    }
  }, [customerId])

  const loadCustomer = async (id: string) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getCustomer(id)
      setCustomer(response.data)
      setEditData(response.data)
    } catch (error) {
      console.error('Failed to load customer:', error)
      toast.error('고객 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerOrders = async (id: string) => {
    try {
      setOrdersLoading(true)
      const response = await EcommerceApi.getCustomerOrders(id)
      setOrders(response.data)
    } catch (error) {
      console.error('Failed to load customer orders:', error)
      toast.error('고객 주문을 불러오는데 실패했습니다.')
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleSave = async () => {
    if (!customer) return

    try {
      // TODO: Implement customer update API
      // await EcommerceApi.updateCustomer(customer.id, editData)
      setCustomer(prev => prev ? { ...prev, ...editData } : null)
      setIsEditing(false)
      toast.success('고객 정보가 수정되었습니다.')
    } catch (error) {
      console.error('Failed to update customer:', error)
      toast.error('고객 정보 수정에 실패했습니다.')
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
      <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: '활성' },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: '비활성' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: '대기중' }
    }

    const config = configs[status as keyof typeof configs] || { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle, label: status }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  const getOrderStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800'
    }

    const labels = {
      pending: '대기중',
      processing: '처리중',
      completed: '완료',
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">고객을 찾을 수 없습니다</h2>
        <p className="text-gray-500">요청하신 고객이 존재하지 않거나 삭제되었습니다.</p>
        <button
          onClick={() => navigate('/woocommerce/customers')}
          className="wp-button-primary mt-4"
        >
          고객 목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/woocommerce/customers')}
            className="wp-button-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
              {(customer.firstName[0] || '') + (customer.lastName[0] || '')}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h1>
              <p className="text-gray-600 mt-1">{customer.email}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`mailto:${customer.email}`}
            className="wp-button-secondary"
          >
            <Mail className="w-4 h-4 mr-2" />
            이메일
          </a>
          
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditData(customer)
                }}
                className="wp-button-secondary"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="wp-button-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                저장
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="wp-button-primary"
            >
              <Edit className="w-4 h-4 mr-2" />
              편집
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Customer Info */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">고객 정보</h3>
            </div>
            <div className="wp-card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">이름</label>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editData.firstName || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="wp-input"
                          placeholder="이름"
                        />
                        <input
                          type="text"
                          value={editData.lastName || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="wp-input"
                          placeholder="성"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900">{customer.firstName} {customer.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="wp-label">이메일</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                        className="wp-input"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="wp-label">역할</label>
                    {isEditing ? (
                      <select
                        value={editData.role || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, role: e.target.value as any }))}
                        className="wp-select"
                      >
                        <option value="customer">일반고객</option>
                        <option value="business">기업고객</option>
                        <option value="affiliate">파트너</option>
                      </select>
                    ) : (
                      <div>{getRoleBadge(customer.role)}</div>
                    )}
                  </div>

                  <div>
                    <label className="wp-label">상태</label>
                    {isEditing ? (
                      <select
                        value={editData.status || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
                        className="wp-select"
                      >
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                        <option value="pending">대기중</option>
                      </select>
                    ) : (
                      <div>{getStatusBadge(customer.status)}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="wp-label">가입일</label>
                    <p className="text-gray-900">{formatDate(customer.createdAt)}</p>
                  </div>

                  <div>
                    <label className="wp-label">최근 로그인</label>
                    <p className="text-gray-900">
                      {customer.lastLoginAt ? formatDate(customer.lastLoginAt) : '없음'}
                    </p>
                  </div>

                  <div>
                    <label className="wp-label">언어</label>
                    {isEditing ? (
                      <select
                        value={editData.language || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, language: e.target.value }))}
                        className="wp-select"
                      >
                        <option value="ko">한국어</option>
                        <option value="en">English</option>
                        <option value="ja">日本語</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{customer.language}</p>
                    )}
                  </div>

                  <div>
                    <label className="wp-label">통화</label>
                    {isEditing ? (
                      <select
                        value={editData.currency || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, currency: e.target.value }))}
                        className="wp-select"
                      >
                        <option value="KRW">KRW (원)</option>
                        <option value="USD">USD (달러)</option>
                        <option value="JPY">JPY (엔)</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{customer.currency}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Info (if business customer) */}
          {customer.businessInfo && (
            <div className="wp-card">
              <div className="wp-card-header">
                <h3 className="wp-card-title flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  기업 정보
                </h3>
              </div>
              <div className="wp-card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="wp-label">회사명</label>
                    <p className="text-gray-900">{customer.businessInfo.businessName}</p>
                  </div>
                  <div>
                    <label className="wp-label">업종</label>
                    <p className="text-gray-900">{customer.businessInfo.businessType}</p>
                  </div>
                  <div>
                    <label className="wp-label">사업자번호</label>
                    <p className="text-gray-900">{customer.businessInfo.businessNumber}</p>
                  </div>
                  {customer.businessInfo.taxId && (
                    <div>
                      <label className="wp-label">세금번호</label>
                      <p className="text-gray-900">{customer.businessInfo.taxId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">최근 주문</h3>
            </div>
            <div className="wp-card-body p-0">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner" />
                  <span className="ml-2 text-gray-600">로딩 중...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>주문 내역이 없습니다</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="wp-table">
                    <thead>
                      <tr>
                        <th>주문번호</th>
                        <th>상태</th>
                        <th>상품수</th>
                        <th>총액</th>
                        <th>주문일</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td>
                            <Link
                              to={`/woocommerce/orders/${order.id}`}
                              className="font-medium text-admin-blue hover:underline"
                            >
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td>{getOrderStatusBadge(order.status)}</td>
                          <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                          <td className="font-medium">{formatPrice(order.total)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>
                            <Link
                              to={`/woocommerce/orders/${order.id}`}
                              className="text-blue-600 hover:text-blue-700"
                              title="주문 상세보기"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Customer Stats */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">고객 통계</h3>
            </div>
            <div className="wp-card-body space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">총 주문</span>
                </div>
                <span className="font-medium text-gray-900">{customer.orderCount}회</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">총 구매액</span>
                </div>
                <span className="font-medium text-gray-900">{formatPrice(customer.totalSpent)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">평균 주문액</span>
                </div>
                <span className="font-medium text-gray-900">{formatPrice(customer.averageOrderValue)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">최근 주문</span>
                </div>
                <span className="font-medium text-gray-900">
                  {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '없음'}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Address */}
          {customer.billingAddress && (
            <div className="wp-card">
              <div className="wp-card-header">
                <h3 className="wp-card-title flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  청구지 주소
                </h3>
              </div>
              <div className="wp-card-body">
                <div className="text-sm space-y-1">
                  <div className="font-medium">
                    {customer.billingAddress.firstName} {customer.billingAddress.lastName}
                  </div>
                  {customer.billingAddress.company && (
                    <div>{customer.billingAddress.company}</div>
                  )}
                  <div>{customer.billingAddress.address1}</div>
                  {customer.billingAddress.address2 && (
                    <div>{customer.billingAddress.address2}</div>
                  )}
                  <div>
                    {customer.billingAddress.city}, {customer.billingAddress.state} {customer.billingAddress.postalCode}
                  </div>
                  <div>{customer.billingAddress.country}</div>
                  {customer.billingAddress.phone && (
                    <div className="flex items-center gap-1 mt-2">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${customer.billingAddress.phone}`} className="text-blue-600 hover:underline">
                        {customer.billingAddress.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shipping Address */}
          {customer.shippingAddress && (
            <div className="wp-card">
              <div className="wp-card-header">
                <h3 className="wp-card-title flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  배송지 주소
                </h3>
              </div>
              <div className="wp-card-body">
                <div className="text-sm space-y-1">
                  <div className="font-medium">
                    {customer.shippingAddress.firstName} {customer.shippingAddress.lastName}
                  </div>
                  {customer.shippingAddress.company && (
                    <div>{customer.shippingAddress.company}</div>
                  )}
                  <div>{customer.shippingAddress.address1}</div>
                  {customer.shippingAddress.address2 && (
                    <div>{customer.shippingAddress.address2}</div>
                  )}
                  <div>
                    {customer.shippingAddress.city}, {customer.shippingAddress.state} {customer.shippingAddress.postalCode}
                  </div>
                  <div>{customer.shippingAddress.country}</div>
                </div>
              </div>
            </div>
          )}

          {/* Marketing */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">마케팅 설정</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">마케팅 수신 동의</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    customer.marketingOptIn 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.marketingOptIn ? '동의' : '거부'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Activity */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">계정 활동</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">가입일:</span>
                  <span>{formatDate(customer.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">정보 수정:</span>
                  <span>{formatDate(customer.updatedAt)}</span>
                </div>
                {customer.lastLoginAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">최근 로그인:</span>
                    <span>{formatDate(customer.lastLoginAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail