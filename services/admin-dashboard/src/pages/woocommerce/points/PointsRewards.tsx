import React, { useState, useEffect } from 'react'
import { 
  Gift,
  Star,
  ShoppingCart,
  Users,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Percent,
  Target,
  Award
} from 'lucide-react'
import { PointsReward } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const PointsRewards: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rewards, setRewards] = useState<PointsReward[]>([])
  const [filteredRewards, setFilteredRewards] = useState<PointsReward[]>([])
  const [selectedReward, setSelectedReward] = useState<PointsReward | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  
  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    category: '',
    status: '',
    type: ''
  })
  
  const [formData, setFormData] = useState<Partial<PointsReward>>({
    title: '',
    description: '',
    category: 'product',
    type: 'discount',
    costPoints: 0,
    value: 0,
    valueType: 'percentage',
    status: 'active',
    stockLimit: 0,
    usageLimit: 0,
    userLimit: 1,
    expiryDays: 30,
    minOrderAmount: 0,
    applicableProducts: [],
    applicableCategories: [],
    termsConditions: '',
    isActive: true
  })

  const [stats, setStats] = useState({
    totalRewards: 0,
    activeRewards: 0,
    totalRedemptions: 0,
    pendingRedemptions: 0
  })

  useEffect(() => {
    loadRewards()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [rewards, filters])

  const loadRewards = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getPointsRewards()
      setRewards(response.data)
      calculateStats(response.data)
    } catch (error) {
      console.error('Failed to load points rewards:', error)
      toast.error('포인트 리워드를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (rewardsData: PointsReward[]) => {
    const activeRewards = rewardsData.filter(r => r.status === 'active').length
    const totalRedemptions = rewardsData.reduce((sum, r) => sum + (r.redemptionCount || 0), 0)
    const pendingRedemptions = rewardsData.reduce((sum, r) => sum + (r.pendingRedemptions || 0), 0)

    setStats({
      totalRewards: rewardsData.length,
      activeRewards,
      totalRedemptions,
      pendingRedemptions
    })
  }

  const applyFilters = () => {
    let filtered = [...rewards]

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term)
      )
    }

    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category)
    }

    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status)
    }

    if (filters.type) {
      filtered = filtered.filter(r => r.type === filters.type)
    }

    setFilteredRewards(filtered)
  }

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const openModal = (mode: 'create' | 'edit' | 'view', reward?: PointsReward) => {
    setModalMode(mode)
    if (reward) {
      setSelectedReward(reward)
      setFormData(reward)
    } else {
      setSelectedReward(null)
      setFormData({
        title: '',
        description: '',
        category: 'product',
        type: 'discount',
        costPoints: 0,
        value: 0,
        valueType: 'percentage',
        status: 'active',
        stockLimit: 0,
        usageLimit: 0,
        userLimit: 1,
        expiryDays: 30,
        minOrderAmount: 0,
        applicableProducts: [],
        applicableCategories: [],
        termsConditions: '',
        isActive: true
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedReward(null)
    setFormData({})
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (modalMode === 'create') {
        await EcommerceApi.createPointsReward(formData as PointsReward)
        toast.success('리워드가 생성되었습니다.')
      } else if (modalMode === 'edit') {
        await EcommerceApi.updatePointsReward(selectedReward!.id, formData as PointsReward)
        toast.success('리워드가 수정되었습니다.')
      }
      
      closeModal()
      loadRewards()
    } catch (error) {
      console.error('Failed to save reward:', error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (rewardId: string) => {
    if (confirm('이 리워드를 삭제하시겠습니까?')) {
      try {
        await EcommerceApi.deletePointsReward(rewardId)
        toast.success('리워드가 삭제되었습니다.')
        loadRewards()
      } catch (error) {
        console.error('Failed to delete reward:', error)
        toast.error('삭제에 실패했습니다.')
      }
    }
  }

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('ko-KR').format(points) + 'P'
  }

  const getCategoryLabel = (category: string) => {
    const categories = {
      product: '상품',
      shipping: '배송',
      voucher: '바우처',
      experience: '체험',
      donation: '기부'
    }
    return categories[category] || category
  }

  const getTypeLabel = (type: string) => {
    const types = {
      discount: '할인',
      free_shipping: '무료배송',
      gift: '선물',
      cashback: '캐시백'
    }
    return types[type] || type
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      sold_out: 'bg-orange-100 text-orange-800'
    }
    const statusLabels = {
      active: '활성',
      inactive: '비활성',
      expired: '만료',
      sold_out: '품절'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || statusColors.inactive}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">리워드를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">포인트 리워드 관리</h1>
          <p className="text-gray-600 mt-1">포인트로 교환 가능한 리워드를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRewards}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button
            onClick={() => openModal('create')}
            className="wp-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            리워드 추가
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 리워드</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalRewards}</p>
              </div>
              <Gift className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 리워드</p>
                <p className="text-xl font-bold text-green-600">{stats.activeRewards}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 교환</p>
                <p className="text-xl font-bold text-purple-600">{stats.totalRedemptions}</p>
              </div>
              <Award className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">대기 중</p>
                <p className="text-xl font-bold text-orange-600">{stats.pendingRedemptions}</p>
              </div>
              <Calendar className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="리워드 제목이나 설명으로 검색..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilter('searchTerm', e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 카테고리</option>
                <option value="product">상품</option>
                <option value="shipping">배송</option>
                <option value="voucher">바우처</option>
                <option value="experience">체험</option>
                <option value="donation">기부</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 유형</option>
                <option value="discount">할인</option>
                <option value="free_shipping">무료배송</option>
                <option value="gift">선물</option>
                <option value="cashback">캐시백</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
                <option value="expired">만료</option>
                <option value="sold_out">품절</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Table */}
      <div className="wp-card">
        <div className="wp-card-body p-0">
          {filteredRewards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">리워드가 없습니다</p>
              <p className="text-sm">새로운 리워드를 추가해보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>리워드</th>
                    <th>카테고리</th>
                    <th>유형</th>
                    <th>필요 포인트</th>
                    <th>가치</th>
                    <th>재고</th>
                    <th>교환수</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRewards.map((reward) => (
                    <tr key={reward.id} className="hover:bg-gray-50">
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">{reward.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-48">
                            {reward.description}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {getCategoryLabel(reward.category)}
                        </span>
                      </td>
                      <td>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          {getTypeLabel(reward.type)}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-blue-600">
                          {formatPoints(reward.costPoints)}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium">
                          {reward.valueType === 'percentage' ? `${reward.value}%` : `${reward.value}원`}
                        </span>
                      </td>
                      <td>
                        <span className={reward.stockLimit > 0 ? 'text-gray-900' : 'text-gray-400'}>
                          {reward.stockLimit > 0 ? `${reward.currentStock || 0}/${reward.stockLimit}` : '무제한'}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium">
                          {reward.redemptionCount || 0}
                        </span>
                      </td>
                      <td>
                        {getStatusBadge(reward.status)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openModal('view', reward)}
                            className="text-blue-600 hover:text-blue-700"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', reward)}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(reward.id)}
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
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  {modalMode === 'create' ? '리워드 추가' : 
                   modalMode === 'edit' ? '리워드 수정' : '리워드 상세'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="wp-label">리워드 제목 *</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => updateFormData('title', e.target.value)}
                      className="wp-input"
                      disabled={modalMode === 'view'}
                      placeholder="예: 10% 할인 쿠폰"
                    />
                  </div>
                  <div>
                    <label className="wp-label">카테고리 *</label>
                    <select
                      value={formData.category || 'product'}
                      onChange={(e) => updateFormData('category', e.target.value)}
                      className="wp-select"
                      disabled={modalMode === 'view'}
                    >
                      <option value="product">상품</option>
                      <option value="shipping">배송</option>
                      <option value="voucher">바우처</option>
                      <option value="experience">체험</option>
                      <option value="donation">기부</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="wp-label">설명</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    className="wp-input min-h-[80px]"
                    disabled={modalMode === 'view'}
                    placeholder="리워드에 대한 상세 설명을 입력하세요"
                  />
                </div>

                {/* Cost and Value */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="wp-label">필요 포인트 *</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.costPoints || 0}
                      onChange={(e) => updateFormData('costPoints', parseInt(e.target.value))}
                      className="wp-input"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="wp-label">리워드 유형 *</label>
                    <select
                      value={formData.type || 'discount'}
                      onChange={(e) => updateFormData('type', e.target.value)}
                      className="wp-select"
                      disabled={modalMode === 'view'}
                    >
                      <option value="discount">할인</option>
                      <option value="free_shipping">무료배송</option>
                      <option value="gift">선물</option>
                      <option value="cashback">캐시백</option>
                    </select>
                  </div>
                  <div>
                    <label className="wp-label">가치 유형</label>
                    <select
                      value={formData.valueType || 'percentage'}
                      onChange={(e) => updateFormData('valueType', e.target.value)}
                      className="wp-select"
                      disabled={modalMode === 'view'}
                    >
                      <option value="percentage">퍼센트</option>
                      <option value="fixed">고정금액</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="wp-label">
                      가치 {formData.valueType === 'percentage' ? '(%)' : '(원)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.value || 0}
                      onChange={(e) => updateFormData('value', parseFloat(e.target.value))}
                      className="wp-input"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="wp-label">최소 주문 금액</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minOrderAmount || 0}
                      onChange={(e) => updateFormData('minOrderAmount', parseInt(e.target.value))}
                      className="wp-input"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="wp-label">재고 제한</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockLimit || 0}
                      onChange={(e) => updateFormData('stockLimit', parseInt(e.target.value))}
                      className="wp-input"
                      disabled={modalMode === 'view'}
                      placeholder="0 = 무제한"
                    />
                  </div>
                  <div>
                    <label className="wp-label">사용자당 제한</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.userLimit || 1}
                      onChange={(e) => updateFormData('userLimit', parseInt(e.target.value))}
                      className="wp-input"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="wp-label">유효 기간 (일)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.expiryDays || 30}
                      onChange={(e) => updateFormData('expiryDays', parseInt(e.target.value))}
                      className="wp-input"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <label className="wp-label">이용 약관</label>
                  <textarea
                    value={formData.termsConditions || ''}
                    onChange={(e) => updateFormData('termsConditions', e.target.value)}
                    className="wp-input min-h-[100px]"
                    disabled={modalMode === 'view'}
                    placeholder="리워드 사용 시 적용되는 이용 약관을 입력하세요"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive || false}
                    onChange={(e) => updateFormData('isActive', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    disabled={modalMode === 'view'}
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    리워드 활성화
                  </label>
                </div>
              </div>

              {modalMode !== 'view' && (
                <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                  <button
                    onClick={closeModal}
                    className="wp-button-secondary"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="wp-button-primary"
                  >
                    {saving ? (
                      <>
                        <div className="loading-spinner w-4 h-4 mr-2" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PointsRewards