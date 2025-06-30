import React, { useState, useEffect } from 'react'
import { 
  DollarSign,
  Calendar,
  Users,
  Settings,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  Package,
  Target
} from 'lucide-react'
import { Coupon, ProductCategory } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import ConditionsBuilder, { CouponConditions } from './ConditionsBuilder'

interface CouponFormProps {
  coupon?: Partial<Coupon>
  onSave: (couponData: Partial<Coupon>, conditions: CouponConditions) => void
  onCancel: () => void
  isLoading?: boolean
  mode?: 'create' | 'edit'
  className?: string
}

const CouponForm: React.FC<CouponFormProps> = ({
  coupon,
  onSave,
  onCancel,
  isLoading = false,
  mode = 'create',
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'conditions' | 'preview'>('basic')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState<Partial<Coupon>>({
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
    customerIds: [],
    ...coupon
  })

  const [conditions, setConditions] = useState<CouponConditions>({
    amountConditions: {
      minimumAmount: formData.minimumAmount,
      maximumAmount: formData.maximumAmount,
      includeShipping: false,
      includeTax: false
    },
    productConditions: {
      includedProducts: [],
      excludedProducts: [],
      includedCategories: formData.categoryIds || [],
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
      validTo: formData.dateExpires ? new Date(formData.dateExpires) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      allowedDays: [],
      allowedHours: undefined
    },
    usageConditions: {
      totalUsageLimit: formData.usageLimitPerCoupon,
      perUserLimit: formData.usageLimitPerCustomer,
      perEmailLimit: undefined,
      individualUse: formData.individualUse || false
    }
  })

  const [testResult, setTestResult] = useState<{
    valid: boolean
    message: string
    savings?: number
  } | null>(null)

  useEffect(() => {
    if (coupon) {
      setFormData({ ...formData, ...coupon })
    }
  }, [coupon])

  const generateCouponCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    setFormData(prev => ({ ...prev, code: result }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.code) {
      newErrors.code = '쿠폰 코드는 필수입니다'
    } else if (formData.code.length < 3) {
      newErrors.code = '쿠폰 코드는 최소 3자 이상이어야 합니다'
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = '할인 값은 0보다 커야 합니다'
    } else if (formData.discountType === 'percent' && formData.amount > 100) {
      newErrors.amount = '할인율은 100%를 초과할 수 없습니다'
    }

    if (formData.minimumAmount && formData.maximumAmount) {
      if (formData.minimumAmount >= formData.maximumAmount) {
        newErrors.maximumAmount = '최대 금액은 최소 금액보다 커야 합니다'
      }
    }

    if (formData.usageLimitPerCoupon && formData.usageLimitPerCoupon < 1) {
      newErrors.usageLimitPerCoupon = '사용 제한은 1 이상이어야 합니다'
    }

    if (formData.usageLimitPerCustomer && formData.usageLimitPerCustomer < 1) {
      newErrors.usageLimitPerCustomer = '고객당 사용 제한은 1 이상이어야 합니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setActiveTab('basic')
      return
    }

    // Sync conditions with form data
    const updatedConditions = {
      ...conditions,
      amountConditions: {
        ...conditions.amountConditions,
        minimumAmount: formData.minimumAmount,
        maximumAmount: formData.maximumAmount
      },
      usageConditions: {
        ...conditions.usageConditions,
        totalUsageLimit: formData.usageLimitPerCoupon,
        perUserLimit: formData.usageLimitPerCustomer,
        individualUse: formData.individualUse || false
      },
      timeConditions: {
        ...conditions.timeConditions,
        validTo: formData.dateExpires ? new Date(formData.dateExpires) : conditions.timeConditions.validTo
      }
    }

    onSave(formData, updatedConditions)
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
    if (valid && formData.amount) {
      if (formData.discountType === 'percent') {
        savings = (sampleOrder.subtotal * formData.amount) / 100
        if (formData.maximumAmount) {
          savings = Math.min(savings, formData.maximumAmount)
        }
      } else {
        savings = formData.amount
      }
      message = `쿠폰이 성공적으로 적용됩니다!`
    }

    setTestResult({ valid, message, savings })
  }

  const updateField = (field: keyof Coupon, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: DollarSign },
    { id: 'conditions', label: '고급 조건', icon: Settings },
    { id: 'preview', label: '미리보기', icon: Eye }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
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

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="wp-card">
          <div className="wp-card-header border-b-0">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
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
                          value={formData.code || ''}
                          onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                          className={`wp-input flex-1 ${errors.code ? 'border-red-500' : ''}`}
                          placeholder="SAVE20"
                        />
                        <button
                          type="button"
                          onClick={generateCouponCode}
                          className="wp-button-secondary"
                          title="랜덤 코드 생성"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                      {errors.code && (
                        <p className="text-red-600 text-sm mt-1">{errors.code}</p>
                      )}
                    </div>

                    <div>
                      <label className="wp-label">설명</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="wp-textarea"
                        rows={3}
                        placeholder="쿠폰에 대한 설명을 입력하세요"
                      />
                    </div>

                    <div>
                      <label className="wp-label">할인 유형 *</label>
                      <select
                        value={formData.discountType || 'percent'}
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
                          step={formData.discountType === 'percent' ? '1' : '1000'}
                          max={formData.discountType === 'percent' ? '100' : undefined}
                          value={formData.amount || ''}
                          onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
                          className={`wp-input pr-12 ${errors.amount ? 'border-red-500' : ''}`}
                          placeholder="0"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500 text-sm">
                            {formData.discountType === 'percent' ? '%' : '원'}
                          </span>
                        </div>
                      </div>
                      {errors.amount && (
                        <p className="text-red-600 text-sm mt-1">{errors.amount}</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="wp-label">만료일</label>
                      <input
                        type="datetime-local"
                        value={formData.dateExpires ? new Date(formData.dateExpires).toISOString().slice(0, 16) : ''}
                        onChange={(e) => updateField('dateExpires', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                        className="wp-input"
                      />
                      <p className="text-sm text-gray-500 mt-1">비워두면 무제한</p>
                    </div>

                    <div>
                      <label className="wp-label">최소 주문 금액</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.minimumAmount || ''}
                        onChange={(e) => updateField('minimumAmount', parseFloat(e.target.value) || undefined)}
                        className="wp-input"
                        placeholder="제한 없음"
                      />
                    </div>

                    <div>
                      <label className="wp-label">최대 할인 금액</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.maximumAmount || ''}
                        onChange={(e) => updateField('maximumAmount', parseFloat(e.target.value) || undefined)}
                        className={`wp-input ${errors.maximumAmount ? 'border-red-500' : ''}`}
                        placeholder="제한 없음"
                        disabled={formData.discountType !== 'percent'}
                      />
                      {errors.maximumAmount && (
                        <p className="text-red-600 text-sm mt-1">{errors.maximumAmount}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">비율 할인시에만 적용</p>
                    </div>

                    <div>
                      <label className="wp-label">총 사용 제한</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.usageLimitPerCoupon || ''}
                        onChange={(e) => updateField('usageLimitPerCoupon', parseInt(e.target.value) || undefined)}
                        className={`wp-input ${errors.usageLimitPerCoupon ? 'border-red-500' : ''}`}
                        placeholder="무제한"
                      />
                      {errors.usageLimitPerCoupon && (
                        <p className="text-red-600 text-sm mt-1">{errors.usageLimitPerCoupon}</p>
                      )}
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
                        checked={formData.individualUse || false}
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
                        checked={formData.excludeSaleItems || false}
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
                {/* Customer Preview */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-8 h-8" />
                    <div>
                      <h3 className="text-2xl font-bold">{formData.code || 'COUPON_CODE'}</h3>
                      <p className="text-blue-100">{formData.description || '할인 쿠폰'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">
                        {formData.discountType === 'percent' ? `${formData.amount || 0}%` : formatPrice(formData.amount || 0)}
                      </div>
                      <div className="text-blue-100 text-sm">
                        {formData.discountType === 'percent' ? '할인' : '즉시 할인'}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {formData.dateExpires && (
                        <div className="text-blue-100 text-sm">
                          {new Date(formData.dateExpires).toLocaleDateString('ko-KR')}까지
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

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="wp-card">
                    <div className="wp-card-header">
                      <h4 className="wp-card-title">쿠폰 정보</h4>
                    </div>
                    <div className="wp-card-body space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">코드:</span>
                        <span className="font-mono font-medium">{formData.code || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">할인:</span>
                        <span className="font-medium">
                          {formData.discountType === 'percent' ? `${formData.amount || 0}%` : formatPrice(formData.amount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">유형:</span>
                        <span>
                          {formData.discountType === 'percent' ? '비율 할인' :
                           formData.discountType === 'fixed_cart' ? '장바구니 할인' : '상품 할인'}
                        </span>
                      </div>
                      {formData.maximumAmount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">최대 할인:</span>
                          <span>{formatPrice(formData.maximumAmount)}</span>
                        </div>
                      )}
                      {formData.dateExpires && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">만료일:</span>
                          <span>{new Date(formData.dateExpires).toLocaleDateString('ko-KR')}</span>
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
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={testCoupon}
            className="wp-button-secondary"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            쿠폰 테스트
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="wp-button-secondary"
            >
              취소
            </button>
            
            <button
              type="submit"
              disabled={isLoading || !formData.code || !formData.amount}
              className="wp-button-primary"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner w-4 h-4 mr-2" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? '수정' : '생성'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CouponForm