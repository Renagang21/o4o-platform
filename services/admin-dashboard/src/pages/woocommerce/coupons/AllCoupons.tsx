import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  Search,
  Filter,
  Download,
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'
import { Coupon } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const AllCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  })

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    used: 0,
    totalDiscount: 0,
    totalSavings: 0
  })

  const pageSize = 20

  useEffect(() => {
    loadCoupons()
    loadStats()
  }, [searchTerm, filterStatus, filterType])

  const loadCoupons = async (page = 1) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getCoupons(page, pageSize)
      setCoupons(response.data)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load coupons:', error)
      toast.error('쿠폰 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Mock stats - TODO: Add to API
      setStats({
        total: coupons.length,
        active: coupons.filter(c => isActive(c)).length,
        expired: coupons.filter(c => isExpired(c)).length,
        used: coupons.reduce((sum, c) => sum + c.usageCount, 0),
        totalDiscount: 0, // TODO: Calculate from usage
        totalSavings: 0 // TODO: Calculate from usage
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const isActive = (coupon: Coupon) => {
    const now = new Date()
    const expires = coupon.dateExpires ? new Date(coupon.dateExpires) : null
    return !expires || expires > now
  }

  const isExpired = (coupon: Coupon) => {
    const now = new Date()
    const expires = coupon.dateExpires ? new Date(coupon.dateExpires) : null
    return expires && expires <= now
  }

  const handleDelete = async (couponId: string) => {
    if (!confirm('이 쿠폰을 삭제하시겠습니까?')) return

    try {
      await EcommerceApi.deleteCoupon(couponId)
      toast.success('쿠폰이 삭제되었습니다.')
      loadCoupons(pagination.current)
      loadStats()
    } catch (error) {
      console.error('Failed to delete coupon:', error)
      toast.error('쿠폰 삭제에 실패했습니다.')
    }
  }

  const handleDuplicate = async (couponId: string) => {
    try {
      const coupon = coupons.find(c => c.id === couponId)
      if (!coupon) return

      const duplicatedCoupon = {
        ...coupon,
        code: `${coupon.code}_COPY`,
        usageCount: 0,
        createdAt: new Date().toISOString()
      }
      delete (duplicatedCoupon as any).id

      await EcommerceApi.createCoupon(duplicatedCoupon)
      toast.success('쿠폰이 복제되었습니다.')
      loadCoupons(pagination.current)
    } catch (error) {
      console.error('Failed to duplicate coupon:', error)
      toast.error('쿠폰 복제에 실패했습니다.')
    }
  }

  const getStatusBadge = (coupon: Coupon) => {
    if (isExpired(coupon)) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">만료됨</span>
    }
    
    if (coupon.usageLimitPerCoupon && coupon.usageCount >= coupon.usageLimitPerCoupon) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">사용완료</span>
    }

    if (isActive(coupon)) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
    }

    return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">대기</span>
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discountType === 'percent') {
      return `${coupon.amount}%`
    }
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(coupon.amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = 
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coupon.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && isActive(coupon)) ||
      (filterStatus === 'expired' && isExpired(coupon)) ||
      (filterStatus === 'used' && coupon.usageLimitPerCoupon && coupon.usageCount >= coupon.usageLimitPerCoupon)
    
    const matchesType = !filterType || coupon.discountType === filterType
    
    return matchesSearch && matchesStatus && matchesType
  })

  const handleSelectCoupon = (couponId: string) => {
    setSelectedCoupons(prev => 
      prev.includes(couponId)
        ? prev.filter(id => id !== couponId)
        : [...prev, couponId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedCoupons(selected ? filteredCoupons.map(c => c.id) : [])
  }

  const allSelected = filteredCoupons.length > 0 && selectedCoupons.length === filteredCoupons.length
  const someSelected = selectedCoupons.length > 0 && selectedCoupons.length < filteredCoupons.length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">쿠폰</h1>
          <p className="text-gray-600 mt-1">할인 쿠폰을 생성하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/woocommerce/coupons/usage" className="wp-button-secondary">
            <BarChart3 className="w-4 h-4 mr-2" />
            사용 현황
          </Link>
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
          <Link to="/woocommerce/coupons/add" className="wp-button-primary">
            <Plus className="w-4 h-4 mr-2" />
            쿠폰 추가
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 쿠폰</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 쿠폰</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">만료됨</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <Clock className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 사용</p>
                <p className="text-2xl font-bold text-purple-600">{stats.used}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 할인</p>
                <p className="text-lg font-bold text-orange-600">
                  {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(stats.totalDiscount)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">고객 절약</p>
                <p className="text-lg font-bold text-emerald-600">
                  {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(stats.totalSavings)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
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
                  placeholder="쿠폰 코드, 설명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="active">활성</option>
                <option value="expired">만료됨</option>
                <option value="used">사용완료</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 유형</option>
                <option value="percent">비율 할인</option>
                <option value="fixed_cart">금액 할인</option>
                <option value="fixed_product">상품 할인</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('')
                  setFilterType('')
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
      {selectedCoupons.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedCoupons.length}개 쿠폰 선택됨
                </span>
                
                <div className="flex items-center gap-2">
                  <select className="wp-select">
                    <option value="">일괄 작업 선택</option>
                    <option value="activate">활성화</option>
                    <option value="deactivate">비활성화</option>
                    <option value="delete">삭제</option>
                    <option value="export">내보내기</option>
                  </select>
                  <button className="wp-button-primary">적용</button>
                </div>
              </div>

              <button
                onClick={() => setSelectedCoupons([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coupons table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            쿠폰 목록 ({filteredCoupons.length}개)
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
                    <th>쿠폰 코드</th>
                    <th>할인</th>
                    <th>조건</th>
                    <th>사용량</th>
                    <th>상태</th>
                    <th>만료일</th>
                    <th>생성일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedCoupons.includes(coupon.id)}
                          onChange={() => handleSelectCoupon(coupon.id)}
                          className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                        />
                      </td>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">
                            <Link 
                              to={`/woocommerce/coupons/${coupon.id}/edit`}
                              className="hover:text-admin-blue"
                            >
                              {coupon.code}
                            </Link>
                          </div>
                          {coupon.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {coupon.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <div className="font-medium text-green-600">
                            {getDiscountDisplay(coupon)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {coupon.discountType === 'percent' ? '비율' :
                             coupon.discountType === 'fixed_cart' ? '장바구니' : '상품'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {coupon.minimumAmount && (
                            <div>최소: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(coupon.minimumAmount)}</div>
                          )}
                          {coupon.productIds && coupon.productIds.length > 0 && (
                            <div className="text-blue-600">특정상품 ({coupon.productIds.length}개)</div>
                          )}
                          {coupon.categoryIds && coupon.categoryIds.length > 0 && (
                            <div className="text-purple-600">카테고리 ({coupon.categoryIds.length}개)</div>
                          )}
                          {coupon.individualUse && (
                            <div className="text-orange-600">단독사용</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <div className="font-medium">
                            {coupon.usageCount}
                            {coupon.usageLimitPerCoupon && (
                              <span className="text-gray-500">/{coupon.usageLimitPerCoupon}</span>
                            )}
                          </div>
                          {coupon.usageLimitPerCoupon && (
                            <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full" 
                                style={{ 
                                  width: `${Math.min((coupon.usageCount / coupon.usageLimitPerCoupon) * 100, 100)}%` 
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{getStatusBadge(coupon)}</td>
                      <td>
                        <div className="text-sm">
                          {coupon.dateExpires ? (
                            <div className={isExpired(coupon) ? 'text-red-600' : 'text-gray-900'}>
                              {formatDate(coupon.dateExpires)}
                            </div>
                          ) : (
                            <span className="text-gray-400">무제한</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-gray-600">
                          {formatDate(coupon.createdAt)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/woocommerce/coupons/${coupon.id}/edit`}
                            className="text-blue-600 hover:text-blue-700"
                            title="편집"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          
                          <button
                            onClick={() => handleDuplicate(coupon.id)}
                            className="text-green-600 hover:text-green-700"
                            title="복제"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-600 hover:text-red-700"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCoupons.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">쿠폰이 없습니다</p>
                  <p className="text-sm">첫 번째 할인 쿠폰을 만들어보세요!</p>
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
            <h3 className="wp-card-title">최근 생성 쿠폰</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {coupons.slice(0, 5).map((coupon) => (
                <div key={coupon.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{coupon.code}</div>
                    <div className="text-sm text-gray-500">{getDiscountDisplay(coupon)} 할인</div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(coupon)}
                    <div className="text-xs text-gray-500 mt-1">{formatDate(coupon.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">인기 쿠폰</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {coupons
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 5)
                .map((coupon, index) => (
                  <div key={coupon.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{coupon.code}</div>
                        <div className="text-sm text-gray-500">{getDiscountDisplay(coupon)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{coupon.usageCount}회</div>
                      <div className="text-xs text-gray-500">사용됨</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">만료 예정</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {coupons
                .filter(c => c.dateExpires && new Date(c.dateExpires) > new Date())
                .sort((a, b) => new Date(a.dateExpires!).getTime() - new Date(b.dateExpires!).getTime())
                .slice(0, 5)
                .map((coupon) => {
                  const daysLeft = Math.ceil((new Date(coupon.dateExpires!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={coupon.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{coupon.code}</div>
                        <div className="text-sm text-gray-500">{getDiscountDisplay(coupon)}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {daysLeft}일
                        </div>
                        <div className="text-xs text-gray-500">남음</div>
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

export default AllCoupons