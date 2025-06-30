import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Search,
  Filter,
  Download,
  Image,
  Palette,
  Monitor,
  Smartphone,
  Calendar,
  Target,
  BarChart3,
  Users,
  MousePointer,
  TrendingUp,
  Settings,
  X
} from 'lucide-react'
import { CouponBanner, Coupon } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const CouponBanners: React.FC = () => {
  const [banners, setBanners] = useState<CouponBanner[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPosition, setFilterPosition] = useState<string>('')
  const [selectedBanners, setSelectedBanners] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState<CouponBanner | null>(null)

  // Banner creation/edit state
  const [isCreating, setIsCreating] = useState(false)
  const [editingBanner, setEditingBanner] = useState<CouponBanner | null>(null)
  const [bannerForm, setBannerForm] = useState<Partial<CouponBanner>>({
    title: '',
    description: '',
    couponId: '',
    position: 'hero',
    isActive: true,
    backgroundColor: '#3B82F6',
    textColor: '#FFFFFF',
    buttonColor: '#10B981',
    buttonTextColor: '#FFFFFF',
    imageUrl: '',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: '',
    targetAudience: 'all',
    displayPages: ['home', 'shop'],
    priority: 1
  })

  const [stats, setStats] = useState({
    totalBanners: 0,
    activeBanners: 0,
    totalViews: 0,
    totalClicks: 0,
    avgCTR: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bannersResponse, couponsResponse] = await Promise.all([
        EcommerceApi.getCouponBanners(),
        EcommerceApi.getCoupons(1, 100)
      ])
      setBanners(Array.isArray(bannersResponse.data) ? bannersResponse.data : [])
      setCoupons(Array.isArray(couponsResponse.data) ? couponsResponse.data : [])
      calculateStats(bannersResponse.data)
    } catch (error) {
      console.error('Failed to load banner data:', error)
      toast.error('배너 데이터를 불러오는데 실패했습니다.')
      setBanners([])
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (bannersData: CouponBanner[]) => {
    setStats({
      totalBanners: bannersData.length,
      activeBanners: bannersData.filter(b => b.isActive).length,
      totalViews: bannersData.reduce((sum, b) => sum + (b.views || 0), 0),
      totalClicks: bannersData.reduce((sum, b) => sum + (b.clicks || 0), 0),
      avgCTR: bannersData.length > 0 
        ? bannersData.reduce((sum, b) => sum + ((b.clicks || 0) / Math.max(b.views || 1, 1) * 100), 0) / bannersData.length
        : 0
    })
  }

  const handleSaveBanner = async () => {
    try {
      if (!bannerForm.title || !bannerForm.couponId) {
        toast.error('제목과 쿠폰을 선택해주세요.')
        return
      }

      if (editingBanner) {
        await EcommerceApi.updateCouponBanner(editingBanner.id, bannerForm)
        toast.success('배너가 수정되었습니다.')
      } else {
        await EcommerceApi.createCouponBanner(bannerForm)
        toast.success('배너가 생성되었습니다.')
      }

      setIsCreating(false)
      setEditingBanner(null)
      setBannerForm({
        title: '',
        description: '',
        couponId: '',
        position: 'hero',
        isActive: true,
        backgroundColor: '#3B82F6',
        textColor: '#FFFFFF',
        buttonColor: '#10B981',
        buttonTextColor: '#FFFFFF',
        imageUrl: '',
        startDate: new Date().toISOString().slice(0, 16),
        endDate: '',
        targetAudience: 'all',
        displayPages: ['home', 'shop'],
        priority: 1
      })
      loadData()
    } catch (error) {
      console.error('Failed to save banner:', error)
      toast.error('배너 저장에 실패했습니다.')
    }
  }

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return

    try {
      await EcommerceApi.deleteCouponBanner(bannerId)
      toast.success('배너가 삭제되었습니다.')
      loadData()
    } catch (error) {
      console.error('Failed to delete banner:', error)
      toast.error('배너 삭제에 실패했습니다.')
    }
  }

  const handleToggleStatus = async (bannerId: string, isActive: boolean) => {
    try {
      await EcommerceApi.updateCouponBanner(bannerId, { isActive: !isActive })
      toast.success(`배너가 ${!isActive ? '활성화' : '비활성화'}되었습니다.`)
      loadData()
    } catch (error) {
      console.error('Failed to toggle banner status:', error)
      toast.error('배너 상태 변경에 실패했습니다.')
    }
  }

  const handleDuplicateBanner = async (banner: CouponBanner) => {
    try {
      const duplicatedBanner = {
        ...banner,
        title: `${banner.title} (복사본)`,
        isActive: false
      }
      delete (duplicatedBanner as any).id
      delete (duplicatedBanner as any).createdAt
      delete (duplicatedBanner as any).views
      delete (duplicatedBanner as any).clicks

      await EcommerceApi.createCouponBanner(duplicatedBanner)
      toast.success('배너가 복제되었습니다.')
      loadData()
    } catch (error) {
      console.error('Failed to duplicate banner:', error)
      toast.error('배너 복제에 실패했습니다.')
    }
  }

  const filteredBanners = banners.filter(banner => {
    const matchesSearch = 
      banner.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (banner.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && banner.isActive) ||
      (filterStatus === 'inactive' && !banner.isActive) ||
      (filterStatus === 'scheduled' && banner.startDate && new Date(banner.startDate) > new Date())
    
    const matchesPosition = !filterPosition || banner.position === filterPosition
    
    return matchesSearch && matchesStatus && matchesPosition
  })

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      hero: '히어로 섹션',
      header: '헤더',
      sidebar: '사이드바',
      footer: '푸터',
      popup: '팝업',
      inline: '인라인'
    }
    return labels[position] || position
  }

  const getStatusBadge = (banner: CouponBanner) => {
    const now = new Date()
    const startDate = banner.startDate ? new Date(banner.startDate) : null
    const endDate = banner.endDate ? new Date(banner.endDate) : null

    if (!banner.isActive) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">비활성</span>
    }

    if (startDate && startDate > now) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">예약</span>
    }

    if (endDate && endDate < now) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">만료</span>
    }

    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCTR = (banner: CouponBanner) => {
    if (!banner.views || banner.views === 0) return 0
    return ((banner.clicks || 0) / banner.views * 100)
  }

  const updateFormField = (field: keyof CouponBanner, value: any) => {
    setBannerForm(prev => ({
      ...prev,
      [field]: value
    }))
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
            <h1 className="text-2xl font-bold text-gray-900">쿠폰 배너 관리</h1>
            <p className="text-gray-600 mt-1">사이트에 표시될 쿠폰 배너를 생성하고 관리합니다</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            리포트 다운로드
          </button>
          <button 
            onClick={() => setIsCreating(true)}
            className="wp-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            배너 추가
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 배너</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBanners}</p>
              </div>
              <Image className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 배너</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeBanners}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 노출</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 클릭</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalClicks.toLocaleString()}</p>
              </div>
              <MousePointer className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 CTR</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.avgCTR.toFixed(1)}%</p>
              </div>
              <Target className="w-8 h-8 text-indigo-500" />
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
                  placeholder="배너 제목, 설명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
                <option value="scheduled">예약</option>
              </select>

              <select
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 위치</option>
                <option value="hero">히어로</option>
                <option value="header">헤더</option>
                <option value="sidebar">사이드바</option>
                <option value="footer">푸터</option>
                <option value="popup">팝업</option>
                <option value="inline">인라인</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('')
                  setFilterPosition('')
                }}
                className="wp-button-secondary"
              >
                <Filter className="w-4 h-4" />
                초기화
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Banner Modal */}
      {(isCreating || editingBanner) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingBanner ? '배너 편집' : '새 배너 생성'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false)
                  setEditingBanner(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">배너 제목 *</label>
                    <input
                      type="text"
                      value={bannerForm.title || ''}
                      onChange={(e) => updateFormField('title', e.target.value)}
                      className="wp-input"
                      placeholder="특별 할인 이벤트!"
                    />
                  </div>

                  <div>
                    <label className="wp-label">설명</label>
                    <textarea
                      value={bannerForm.description || ''}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      className="wp-textarea"
                      rows={3}
                      placeholder="지금 바로 특별 할인 쿠폰을 받아보세요!"
                    />
                  </div>

                  <div>
                    <label className="wp-label">연결할 쿠폰 *</label>
                    <select
                      value={bannerForm.couponId || ''}
                      onChange={(e) => updateFormField('couponId', e.target.value)}
                      className="wp-select"
                    >
                      <option value="">쿠폰을 선택하세요</option>
                      {coupons.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          {coupon.code} - {coupon.discountType === 'percent' ? `${coupon.amount}%` : `${coupon.amount}원`} 할인
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="wp-label">표시 위치</label>
                    <select
                      value={bannerForm.position || 'hero'}
                      onChange={(e) => updateFormField('position', e.target.value)}
                      className="wp-select"
                    >
                      <option value="hero">히어로 섹션</option>
                      <option value="header">헤더</option>
                      <option value="sidebar">사이드바</option>
                      <option value="footer">푸터</option>
                      <option value="popup">팝업</option>
                      <option value="inline">인라인</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">시작일</label>
                      <input
                        type="datetime-local"
                        value={bannerForm.startDate || ''}
                        onChange={(e) => updateFormField('startDate', e.target.value)}
                        className="wp-input"
                      />
                    </div>
                    <div>
                      <label className="wp-label">종료일</label>
                      <input
                        type="datetime-local"
                        value={bannerForm.endDate || ''}
                        onChange={(e) => updateFormField('endDate', e.target.value)}
                        className="wp-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">배경 이미지 URL</label>
                    <input
                      type="url"
                      value={bannerForm.imageUrl || ''}
                      onChange={(e) => updateFormField('imageUrl', e.target.value)}
                      className="wp-input"
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">배경색</label>
                      <input
                        type="color"
                        value={bannerForm.backgroundColor || '#3B82F6'}
                        onChange={(e) => updateFormField('backgroundColor', e.target.value)}
                        className="wp-input h-10"
                      />
                    </div>
                    <div>
                      <label className="wp-label">텍스트 색상</label>
                      <input
                        type="color"
                        value={bannerForm.textColor || '#FFFFFF'}
                        onChange={(e) => updateFormField('textColor', e.target.value)}
                        className="wp-input h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">버튼 색상</label>
                      <input
                        type="color"
                        value={bannerForm.buttonColor || '#10B981'}
                        onChange={(e) => updateFormField('buttonColor', e.target.value)}
                        className="wp-input h-10"
                      />
                    </div>
                    <div>
                      <label className="wp-label">버튼 텍스트 색상</label>
                      <input
                        type="color"
                        value={bannerForm.buttonTextColor || '#FFFFFF'}
                        onChange={(e) => updateFormField('buttonTextColor', e.target.value)}
                        className="wp-input h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="wp-label">대상 고객</label>
                    <select
                      value={bannerForm.targetAudience || 'all'}
                      onChange={(e) => updateFormField('targetAudience', e.target.value)}
                      className="wp-select"
                    >
                      <option value="all">전체 고객</option>
                      <option value="customer">일반 고객</option>
                      <option value="business">기업 고객</option>
                      <option value="affiliate">파트너</option>
                      <option value="new">신규 고객</option>
                      <option value="returning">재방문 고객</option>
                    </select>
                  </div>

                  <div>
                    <label className="wp-label">우선순위</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={bannerForm.priority || 1}
                      onChange={(e) => updateFormField('priority', parseInt(e.target.value))}
                      className="wp-input"
                    />
                    <p className="text-sm text-gray-500 mt-1">1이 가장 높은 우선순위 (1-10)</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={bannerForm.isActive || false}
                      onChange={(e) => updateFormField('isActive', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">
                      배너 활성화
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">미리보기</h4>
                <div 
                  className="relative rounded-lg p-6 text-center"
                  style={{
                    backgroundColor: bannerForm.backgroundColor,
                    color: bannerForm.textColor,
                    backgroundImage: bannerForm.imageUrl ? `url(${bannerForm.imageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">{bannerForm.title || '배너 제목'}</h3>
                    <p className="mb-4">{bannerForm.description || '배너 설명'}</p>
                    <button
                      className="px-6 py-2 rounded-lg font-medium"
                      style={{
                        backgroundColor: bannerForm.buttonColor,
                        color: bannerForm.buttonTextColor
                      }}
                    >
                      쿠폰 받기
                    </button>
                  </div>
                  {bannerForm.imageUrl && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg"></div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-6 border-t">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setEditingBanner(null)
                }}
                className="wp-button-secondary"
              >
                취소
              </button>
              <button
                onClick={handleSaveBanner}
                className="wp-button-primary"
              >
                {editingBanner ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">배너 미리보기</h3>
              <button
                onClick={() => setShowPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {/* Desktop Preview */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm font-medium">데스크톱</span>
                </div>
                <div 
                  className="relative rounded-lg p-8 text-center"
                  style={{
                    backgroundColor: showPreview.backgroundColor,
                    color: showPreview.textColor,
                    backgroundImage: showPreview.imageUrl ? `url(${showPreview.imageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="relative z-10">
                    <h3 className="text-3xl font-bold mb-3">{showPreview.title}</h3>
                    <p className="text-lg mb-6">{showPreview.description}</p>
                    <button
                      className="px-8 py-3 rounded-lg font-medium text-lg"
                      style={{
                        backgroundColor: showPreview.buttonColor,
                        color: showPreview.buttonTextColor
                      }}
                    >
                      쿠폰 받기
                    </button>
                  </div>
                  {showPreview.imageUrl && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg"></div>
                  )}
                </div>
              </div>

              {/* Mobile Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-medium">모바일</span>
                </div>
                <div className="max-w-sm mx-auto">
                  <div 
                    className="relative rounded-lg p-4 text-center"
                    style={{
                      backgroundColor: showPreview.backgroundColor,
                      color: showPreview.textColor,
                      backgroundImage: showPreview.imageUrl ? `url(${showPreview.imageUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold mb-2">{showPreview.title}</h3>
                      <p className="text-sm mb-4">{showPreview.description}</p>
                      <button
                        className="px-4 py-2 rounded font-medium text-sm"
                        style={{
                          backgroundColor: showPreview.buttonColor,
                          color: showPreview.buttonTextColor
                        }}
                      >
                        쿠폰 받기
                      </button>
                    </div>
                    {showPreview.imageUrl && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banners table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            배너 목록 ({filteredBanners.length}개)
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
                    <th>배너</th>
                    <th>쿠폰</th>
                    <th>위치</th>
                    <th>노출/클릭</th>
                    <th>CTR</th>
                    <th>기간</th>
                    <th>상태</th>
                    <th>생성일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBanners.map((banner) => {
                    const coupon = coupons.find(c => c.id === banner.couponId)
                    const ctr = getCTR(banner)
                    
                    return (
                      <tr key={banner.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-8 rounded border flex items-center justify-center text-xs"
                              style={{ backgroundColor: banner.backgroundColor }}
                            >
                              {banner.imageUrl ? (
                                <img src={banner.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                              ) : (
                                <Image className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{banner.title}</div>
                              {banner.description && (
                                <div className="text-sm text-gray-500 truncate max-w-48">
                                  {banner.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="font-medium text-gray-900">{coupon?.code || '-'}</div>
                            {coupon && (
                              <div className="text-sm text-gray-500">
                                {coupon.discountType === 'percent' ? `${coupon.amount}%` : `${coupon.amount}원`} 할인
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {getPositionLabel(banner.position)}
                          </span>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-gray-400" />
                              <span>{(banner.views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MousePointer className="w-3 h-3 text-gray-400" />
                              <span>{(banner.clicks || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={`font-medium ${
                            ctr >= 5 ? 'text-green-600' :
                            ctr >= 2 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {ctr.toFixed(1)}%
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            {banner.startDate && (
                              <div>{formatDate(banner.startDate)}</div>
                            )}
                            {banner.endDate ? (
                              <div className="text-gray-500">~ {formatDate(banner.endDate)}</div>
                            ) : (
                              <div className="text-gray-500">무제한</div>
                            )}
                          </div>
                        </td>
                        <td>{getStatusBadge(banner)}</td>
                        <td>
                          <div className="text-sm text-gray-600">
                            {formatDate(banner.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowPreview(banner)}
                              className="text-blue-600 hover:text-blue-700"
                              title="미리보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => {
                                setEditingBanner(banner)
                                setBannerForm(banner)
                              }}
                              className="text-green-600 hover:text-green-700"
                              title="편집"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(banner.id, banner.isActive)}
                              className={banner.isActive ? "text-gray-600 hover:text-gray-700" : "text-blue-600 hover:text-blue-700"}
                              title={banner.isActive ? "비활성화" : "활성화"}
                            >
                              {banner.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            
                            <button
                              onClick={() => handleDuplicateBanner(banner)}
                              className="text-purple-600 hover:text-purple-700"
                              title="복제"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="text-red-600 hover:text-red-700"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredBanners.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">배너가 없습니다</p>
                  <p className="text-sm">첫 번째 쿠폰 배너를 만들어보세요!</p>
                </div>
              )}
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
              최고 성과 배너
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {banners
                .sort((a, b) => getCTR(b) - getCTR(a))
                .slice(0, 5)
                .map((banner, index) => (
                  <div key={banner.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 truncate max-w-32">{banner.title}</span>
                    </div>
                    <span className="font-medium text-green-600">
                      {getCTR(banner).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <MousePointer className="w-5 h-5 text-purple-500" />
              클릭 수 TOP 5
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {banners
                .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
                .slice(0, 5)
                .map((banner, index) => (
                  <div key={banner.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 truncate max-w-32">{banner.title}</span>
                    </div>
                    <span className="font-medium text-purple-600">
                      {(banner.clicks || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              노출 수 TOP 5
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {banners
                .sort((a, b) => (b.views || 0) - (a.views || 0))
                .slice(0, 5)
                .map((banner, index) => (
                  <div key={banner.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 truncate max-w-32">{banner.title}</span>
                    </div>
                    <span className="font-medium text-blue-600">
                      {(banner.views || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CouponBanners