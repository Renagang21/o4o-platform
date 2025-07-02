import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Save,
  Eye,
  RefreshCw,
  Settings,
  DollarSign,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import { Coupon } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import ConditionsBuilder, { CouponConditions } from './components/ConditionsBuilder'
import toast from 'react-hot-toast'

const AddCoupon: React.FC = () => {
  const { couponId } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(couponId)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'conditions' | 'preview'>('basic')

  const [coupon, setCoupon] = useState<Partial<Coupon>>({
    code: '',
    description: '',
    discountType: 'percent',
    amount: 0,
    minimumAmount: undefined,
    maximumAmount: undefined,
    dateExpires: undefined,
    usageLimitPerCoupon: undefined,
    usageLimitPerCustomer: undefined,
    individualUse: false,
    excludeSaleItems: false,
    productIds: [],
    categoryIds: [],
    customerIds: []
  })

  const [conditions, setConditions] = useState<CouponConditions>({
    amountConditions: {
      minimumAmount: undefined,
      maximumAmount: undefined,
      includeShipping: false,
      includeTax: false
    },
    productConditions: {
      includedProducts: [],
      excludedProducts: [],
      includedCategories: [],
      excludedCategories: [],
      productTags: [],
      minimumQuantity: undefined,
      maximumQuantity: undefined
    },
    userConditions: {
      customerTypes: ['customer', 'business', 'affiliate'],
      customerGroups: [],
      firstTimeOnly: false,
      allowedEmails: [],
      restrictedEmails: []
    },
    timeConditions: {
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      allowedDays: [],
      allowedHours: undefined
    },
    usageConditions: {
      totalUsageLimit: undefined,
      perUserLimit: undefined,
      perEmailLimit: undefined,
      individualUse: false
    }
  })

  const [testResult, setTestResult] = useState<{
    valid: boolean
    message: string
    savings?: number
  } | null>(null)

  useEffect(() => {
    if (isEditing && couponId) {
      loadCoupon(couponId)
    }
  }, [couponId])

  const loadCoupon = async (id: string) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getCoupons() // Temporarily use getCoupons and filter
      setCoupon(response.data)
      // TODO: Load conditions from coupon data
    } catch (error) {
      console.error('Failed to load coupon:', error)
      toast.error('쿠폰을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateCouponCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    setCoupon(prev => ({ ...prev, code: result }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Convert conditions to coupon format
      const couponData = {
        ...coupon,
        minimumAmount: conditions.amountConditions.minimumAmount,
        maximumAmount: conditions.amountConditions.maximumAmount,
        categoryIds: conditions.productConditions.includedCategories,
        usageLimitPerCoupon: conditions.usageConditions.totalUsageLimit,
        usageLimitPerCustomer: conditions.usageConditions.perUserLimit,
        individualUse: conditions.usageConditions.individualUse,
        dateExpires: conditions.timeConditions.validTo.toISOString()
      }

      let response
      if (isEditing && couponId) {
        response = await EcommerceApi.updateCoupon(couponId, couponData)
        toast.success('쿠폰이 수정되었습니다.')
      } else {
        response = await EcommerceApi.createCoupon(couponData)
        toast.success('쿠폰이 생성되었습니다.')
      }

      navigate('/woocommerce/coupons')
    } catch (error) {
      console.error('Failed to save coupon:', error)
      toast.error('쿠폰 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const testCoupon = () => {
    // Mock test with sample order
    const sampleOrder = {
      subtotal: 50000,
      shipping: 3000,
      tax: 5000,
      items: [
        { productId: 'p1', categoryId: 'c1', quantity: 2, price: 25000 }
      ]
    }

    let valid = true
    let message = ''
    let savings = 0

    // Test amount conditions
    if (conditions.amountConditions.minimumAmount && sampleOrder.subtotal < conditions.amountConditions.minimumAmount) {
      valid = false
      message = `최소 주문 금액 ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(conditions.amountConditions.minimumAmount)}을 충족하지 않습니다.`
    }

    // Test product conditions
    if (valid && conditions.productConditions.includedCategories.length > 0) {
      const hasIncludedCategory = sampleOrder.items.some(item => 
        conditions.productConditions.includedCategories.includes(item.categoryId)
      )
      if (!hasIncludedCategory) {
        valid = false
        message = '포함된 카테고리의 상품이 없습니다.'
      }
    }

    // Calculate savings if valid
    if (valid && coupon.amount) {
      if (coupon.discountType === 'percent') {
        savings = (sampleOrder.subtotal * coupon.amount) / 100
        if (coupon.maximumAmount) {
          savings = Math.min(savings, coupon.maximumAmount)
        }
      } else {
        savings = coupon.amount
      }
      message = `쿠폰이 성공적으로 적용됩니다!`
    }

    setTestResult({ valid, message, savings })
  }

  const updateField = (field: keyof Coupon, value: any) => {
    setCoupon(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: DollarSign },
    { id: 'conditions', label: '조건 설정', icon: Settings },
    { id: 'preview', label: '미리보기', icon: Eye }
  ]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/woocommerce/coupons')}
            className="wp-button-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? '쿠폰 편집' : '쿠폰 추가'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? '기존 쿠폰을 편집합니다' : '새로운 할인 쿠폰을 생성합니다'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={testCoupon}
            className="wp-button-secondary"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            테스트
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || !coupon.code || !coupon.amount}
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
                {isEditing ? '업데이트' : '생성'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`wp-card border-l-4 ${testResult.valid ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <div className="wp-card-body">
            <div className="flex items-start gap-2">
              {testResult.valid ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div>
                <h4 className={`font-medium ${testResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  쿠폰 테스트 결과
                </h4>
                <p className={`text-sm ${testResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
                {testResult.valid && testResult.savings && (
                  <p className="text-sm font-medium text-green-700 mt-1">
                    예상 할인 금액: {formatPrice(testResult.savings)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="wp-card">
        <div className="wp-card-header border-b-0">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                  activeTab === tab.id
                    ? 'text-admin-blue border-admin-blue bg-blue-50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="wp-card-body">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">쿠폰 코드 *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={coupon.code || ''}
                        onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                        className="wp-input flex-1"
                        placeholder="SAVE20"
                      />
                      <button
                        onClick={generateCouponCode}
                        className="wp-button-secondary"
                        title="랜덤 코드 생성"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="wp-label">설명</label>
                    <textarea
                      value={coupon.description || ''}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="wp-textarea"
                      rows={3}
                      placeholder="쿠폰에 대한 설명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="wp-label">할인 유형 *</label>
                    <select
                      value={coupon.discountType || 'percent'}
                      onChange={(e) => updateField('discountType', e.target.value)}
                      className="wp-select"
                    >
                      <option value="percent">비율 할인 (%)</option>
                      <option value="fixed_cart">고정 금액 할인 (장바구니)</option>
                      <option value="fixed_product">고정 금액 할인 (상품)</option>
                    </select>
                  </div>

                  <div>
                    <label className="wp-label">할인 값 *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step={coupon.discountType === 'percent' ? '1' : '1000'}
                        max={coupon.discountType === 'percent' ? '100' : undefined}
                        value={coupon.amount || ''}
                        onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
                        className="wp-input pr-12"
                        placeholder="0"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-sm">
                          {coupon.discountType === 'percent' ? '%' : '원'}
                        </span>
                      </div>
                    </div>
                    {coupon.discountType === 'percent' && coupon.amount && coupon.amount > 100 && (
                      <p className="text-red-600 text-sm mt-1">할인율은 100%를 초과할 수 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">만료일</label>
                    <input
                      type="datetime-local"
                      value={coupon.dateExpires ? new Date(coupon.dateExpires).toISOString().slice(0, 16) : ''}
                      onChange={(e) => updateField('dateExpires', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                      className="wp-input"
                    />
                    <p className="text-sm text-gray-500 mt-1">비워두면 무제한</p>
                  </div>

                  <div>
                    <label className="wp-label">최대 할인 금액</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={coupon.maximumAmount || ''}
                      onChange={(e) => updateField('maximumAmount', parseFloat(e.target.value) || undefined)}
                      className="wp-input"
                      placeholder="제한 없음"
                      disabled={coupon.discountType !== 'percent'}
                    />
                    <p className="text-sm text-gray-500 mt-1">비율 할인시에만 적용</p>
                  </div>

                  <div>
                    <label className="wp-label">총 사용 제한</label>
                    <input
                      type="number"
                      min="1"
                      value={coupon.usageLimitPerCoupon || ''}
                      onChange={(e) => updateField('usageLimitPerCoupon', parseInt(e.target.value) || undefined)}
                      className="wp-input"
                      placeholder="무제한"
                    />
                  </div>

                  <div>
                    <label className="wp-label">고객당 사용 제한</label>
                    <input
                      type="number"
                      min="1"
                      value={coupon.usageLimitPerCustomer || ''}
                      onChange={(e) => updateField('usageLimitPerCustomer', parseInt(e.target.value) || undefined)}
                      className="wp-input"
                      placeholder="무제한"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">추가 옵션</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="individualUse"
                      checked={coupon.individualUse || false}
                      onChange={(e) => updateField('individualUse', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="individualUse" className="text-sm text-gray-700">
                      다른 쿠폰과 중복 사용 불가 (단독 사용)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="excludeSaleItems"
                      checked={coupon.excludeSaleItems || false}
                      onChange={(e) => updateField('excludeSaleItems', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="excludeSaleItems" className="text-sm text-gray-700">
                      세일 상품 제외
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'conditions' && (
            <ConditionsBuilder
              conditions={conditions}
              onChange={setConditions}
            />
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-8 h-8" />
                  <div>
                    <h3 className="text-2xl font-bold">{coupon.code || 'COUPON_CODE'}</h3>
                    <p className="text-blue-100">{coupon.description || '할인 쿠폰'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">
                      {coupon.discountType === 'percent' ? `${coupon.amount || 0}%` : formatPrice(coupon.amount || 0)}
                    </div>
                    <div className="text-blue-100 text-sm">
                      {coupon.discountType === 'percent' ? '할인' : '즉시 할인'}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {coupon.dateExpires && (
                      <div className="text-blue-100 text-sm">
                        {new Date(coupon.dateExpires).toLocaleDateString('ko-KR')}까지
                      </div>
                    )}
                    {conditions.amountConditions.minimumAmount && (
                      <div className="text-blue-100 text-sm">
                        {formatPrice(conditions.amountConditions.minimumAmount)} 이상 구매시
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="wp-card">
                  <div className="wp-card-header">
                    <h4 className="wp-card-title">쿠폰 정보</h4>
                  </div>
                  <div className="wp-card-body space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">코드:</span>
                      <span className="font-mono font-medium">{coupon.code || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">할인:</span>
                      <span className="font-medium">
                        {coupon.discountType === 'percent' ? `${coupon.amount || 0}%` : formatPrice(coupon.amount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">유형:</span>
                      <span>
                        {coupon.discountType === 'percent' ? '비율 할인' :
                         coupon.discountType === 'fixed_cart' ? '장바구니 할인' : '상품 할인'}
                      </span>
                    </div>
                    {coupon.maximumAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">최대 할인:</span>
                        <span>{formatPrice(coupon.maximumAmount)}</span>
                      </div>
                    )}
                    {coupon.dateExpires && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">만료일:</span>
                        <span>{new Date(coupon.dateExpires).toLocaleDateString('ko-KR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="wp-card">
                  <div className="wp-card-header">
                    <h4 className="wp-card-title">사용 조건</h4>
                  </div>
                  <div className="wp-card-body space-y-2">
                    {conditions.amountConditions.minimumAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">최소 주문:</span>
                        <span>{formatPrice(conditions.amountConditions.minimumAmount)}</span>
                      </div>
                    )}
                    {conditions.productConditions.includedCategories.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">포함 카테고리:</span>
                        <span>{conditions.productConditions.includedCategories.length}개</span>
                      </div>
                    )}
                    {conditions.userConditions.customerTypes.length < 3 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">고객 유형:</span>
                        <span>{conditions.userConditions.customerTypes.join(', ')}</span>
                      </div>
                    )}
                    {conditions.usageConditions.totalUsageLimit && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">사용 제한:</span>
                        <span>{conditions.usageConditions.totalUsageLimit}회</span>
                      </div>
                    )}
                    {conditions.usageConditions.individualUse && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">중복 사용:</span>
                        <span className="text-red-600">불가</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="wp-card">
                <div className="wp-card-header">
                  <h4 className="wp-card-title">고객에게 표시되는 내용</h4>
                </div>
                <div className="wp-card-body">
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {coupon.code || 'COUPON_CODE'}
                      </div>
                      <div className="text-lg font-medium mb-2">
                        {coupon.discountType === 'percent' ? `${coupon.amount || 0}% 할인` : `${formatPrice(coupon.amount || 0)} 할인`}
                      </div>
                      {coupon.description && (
                        <div className="text-gray-600 mb-3">{coupon.description}</div>
                      )}
                      {conditions.amountConditions.minimumAmount && (
                        <div className="text-sm text-gray-500">
                          {formatPrice(conditions.amountConditions.minimumAmount)} 이상 구매시 사용 가능
                        </div>
                      )}
                      {coupon.dateExpires && (
                        <div className="text-sm text-red-600">
                          {new Date(coupon.dateExpires).toLocaleDateString('ko-KR')}까지
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddCoupon