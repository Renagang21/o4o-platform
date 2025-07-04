import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Trash2, 
  Calendar,
  DollarSign,
  Package,
  Users,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle,
  Eye,
  X
} from 'lucide-react'
import { ProductCategory, ProductTag } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'

export interface CouponConditions {
  // 구매금액 조건
  amountConditions: {
    minimumAmount?: number;
    maximumAmount?: number;
    includeShipping: boolean;
    includeTax: boolean;
  };
  
  // 제품 조건
  productConditions: {
    includedProducts: string[];      // 포함할 특정 상품
    excludedProducts: string[];      // 제외할 특정 상품
    includedCategories: string[];    // 포함할 카테고리
    excludedCategories: string[];    // 제외할 카테고리
    productTags: string[];           // 특정 태그 상품
    minimumQuantity?: number;        // 최소 수량
    maximumQuantity?: number;        // 최대 수량
  };
  
  // 사용자 조건
  userConditions: {
    customerTypes: ('customer' | 'business' | 'affiliate')[];
    customerGroups?: string[];
    firstTimeOnly: boolean;
    allowedEmails?: string[];
    restrictedEmails?: string[];
  };
  
  // 시간 조건
  timeConditions: {
    validFrom: Date;
    validTo: Date;
    allowedDays?: number[];          // 요일 제한 (0=일요일)
    allowedHours?: {start: number, end: number}; // 시간 제한
  };
  
  // 사용 제한
  usageConditions: {
    totalUsageLimit?: number;
    perUserLimit?: number;
    perEmailLimit?: number;
    individualUse: boolean;          // 다른 쿠폰과 중복 사용 불가
  };
}

interface ConditionsBuilderProps {
  conditions: CouponConditions
  onChange: (conditions: CouponConditions) => void
  className?: string
}

const ConditionsBuilder: React.FC<ConditionsBuilderProps> = ({
  conditions,
  onChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'amount' | 'product' | 'user' | 'time' | 'usage'>('amount')
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [tags, setTags] = useState<ProductTag[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    loadCategories()
    loadTags()
  }, [])

  useEffect(() => {
    validateConditions()
  }, [conditions])

  const loadCategories = async () => {
    try {
      const response = await EcommerceApi.getCategories()
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadTags = async () => {
    try {
      const response = await EcommerceApi.getTags()
      setTags(response.data)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const validateConditions = () => {
    const errors: string[] = []

    // Amount validation
    if (conditions.amountConditions.minimumAmount && conditions.amountConditions.maximumAmount) {
      if (conditions.amountConditions.minimumAmount >= conditions.amountConditions.maximumAmount) {
        errors.push('최대 금액은 최소 금액보다 커야 합니다.')
      }
    }

    // Product validation
    const { includedProducts, excludedProducts, includedCategories, excludedCategories } = conditions.productConditions
    if (includedProducts.some(id => excludedProducts.includes(id))) {
      errors.push('포함된 상품과 제외된 상품이 중복됩니다.')
    }
    if (includedCategories.some(id => excludedCategories.includes(id))) {
      errors.push('포함된 카테고리와 제외된 카테고리가 중복됩니다.')
    }

    // Quantity validation
    if (conditions.productConditions.minimumQuantity && conditions.productConditions.maximumQuantity) {
      if (conditions.productConditions.minimumQuantity >= conditions.productConditions.maximumQuantity) {
        errors.push('최대 수량은 최소 수량보다 커야 합니다.')
      }
    }

    // Time validation
    if (conditions.timeConditions.validFrom >= conditions.timeConditions.validTo) {
      errors.push('종료일은 시작일보다 늦어야 합니다.')
    }

    // Hours validation
    if (conditions.timeConditions.allowedHours) {
      const { start, end } = conditions.timeConditions.allowedHours
      if (start >= end) {
        errors.push('종료 시간은 시작 시간보다 늦어야 합니다.')
      }
    }

    setValidationErrors(errors)
  }

  const updateConditions = (section: keyof CouponConditions, updates: any) => {
    onChange({
      ...conditions,
      [section]: {
        ...conditions[section],
        ...updates
      }
    })
  }

  const addToArray = (section: keyof CouponConditions, field: string, value: string) => {
    const currentArray = (conditions[section] as any)[field] || []
    if (!currentArray.includes(value)) {
      updateConditions(section, {
        [field]: [...currentArray, value]
      })
    }
  }

  const removeFromArray = (section: keyof CouponConditions, field: string, value: string) => {
    const currentArray = (conditions[section] as any)[field] || []
    updateConditions(section, {
      [field]: currentArray.filter((item: string) => item !== value)
    })
  }

  const getConditionsSummary = () => {
    const summary: string[] = []

    // Amount conditions
    if (conditions.amountConditions.minimumAmount) {
      summary.push(`최소 주문 금액: ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(conditions.amountConditions.minimumAmount)}`)
    }
    if (conditions.amountConditions.maximumAmount) {
      summary.push(`최대 주문 금액: ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(conditions.amountConditions.maximumAmount)}`)
    }

    // Product conditions
    if (conditions.productConditions.includedProducts.length > 0) {
      summary.push(`특정 상품 포함: ${conditions.productConditions.includedProducts.length}개`)
    }
    if (conditions.productConditions.includedCategories.length > 0) {
      summary.push(`카테고리 포함: ${conditions.productConditions.includedCategories.length}개`)
    }
    if (conditions.productConditions.productTags.length > 0) {
      summary.push(`태그 포함: ${conditions.productConditions.productTags.length}개`)
    }

    // User conditions
    if (conditions.userConditions.customerTypes.length > 0) {
      summary.push(`고객 유형: ${conditions.userConditions.customerTypes.join(', ')}`)
    }
    if (conditions.userConditions.firstTimeOnly) {
      summary.push('첫 구매 고객만')
    }

    // Usage conditions
    if (conditions.usageConditions.totalUsageLimit) {
      summary.push(`총 사용 제한: ${conditions.usageConditions.totalUsageLimit}회`)
    }
    if (conditions.usageConditions.perUserLimit) {
      summary.push(`사용자당 제한: ${conditions.usageConditions.perUserLimit}회`)
    }
    if (conditions.usageConditions.individualUse) {
      summary.push('단독 사용만 가능')
    }

    return summary
  }

  const tabs = [
    { id: 'amount', label: '금액 조건', icon: DollarSign },
    { id: 'product', label: '상품 조건', icon: Package },
    { id: 'user', label: '사용자 조건', icon: Users },
    { id: 'time', label: '시간 조건', icon: Clock },
    { id: 'usage', label: '사용 제한', icon: Settings }
  ]

  const weekdays = [
    { value: 0, label: '일요일' },
    { value: 1, label: '월요일' },
    { value: 2, label: '화요일' },
    { value: 3, label: '수요일' },
    { value: 4, label: '목요일' },
    { value: 5, label: '금요일' },
    { value: 6, label: '토요일' }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="wp-card border-l-4 border-l-red-500">
          <div className="wp-card-body">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">조건 설정 오류</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditions Summary */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h3 className="wp-card-title flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              조건 요약
            </h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="wp-button-secondary"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? '숨기기' : '미리보기'}
            </button>
          </div>
        </div>
        {showPreview && (
          <div className="wp-card-body">
            {getConditionsSummary().length > 0 ? (
              <ul className="space-y-1 text-sm text-gray-700">
                {getConditionsSummary().map((condition, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {condition}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">설정된 조건이 없습니다.</p>
            )}
          </div>
        )}
      </div>

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
          {activeTab === 'amount' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-4">구매 금액 조건</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">최소 주문 금액</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={conditions.amountConditions.minimumAmount || ''}
                    onChange={(e) => updateConditions('amountConditions', {
                      minimumAmount: parseFloat(e.target.value) || undefined
                    })}
                    className="wp-input"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="wp-label">최대 주문 금액</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={conditions.amountConditions.maximumAmount || ''}
                    onChange={(e) => updateConditions('amountConditions', {
                      maximumAmount: parseFloat(e.target.value) || undefined
                    })}
                    className="wp-input"
                    placeholder="제한 없음"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeShipping"
                    checked={conditions.amountConditions.includeShipping}
                    onChange={(e) => updateConditions('amountConditions', {
                      includeShipping: e.target.checked
                    })}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="includeShipping" className="text-sm text-gray-700">
                    배송비 포함
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeTax"
                    checked={conditions.amountConditions.includeTax}
                    onChange={(e) => updateConditions('amountConditions', {
                      includeTax: e.target.checked
                    })}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="includeTax" className="text-sm text-gray-700">
                    세금 포함
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'product' && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900">상품 조건</h4>

              {/* Categories */}
              <div>
                <label className="wp-label">포함할 카테고리</label>
                <div className="space-y-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addToArray('productConditions', 'includedCategories', e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="wp-select"
                    defaultValue=""
                  >
                    <option value="">카테고리 선택</option>
                    {categories
                      .filter(cat => !conditions.productConditions.includedCategories.includes(cat.id))
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  
                  <div className="flex flex-wrap gap-2">
                    {conditions.productConditions.includedCategories.map((categoryId) => {
                      const category = categories.find(c => c.id === categoryId)
                      return (
                        <span
                          key={categoryId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-sm rounded"
                        >
                          {category?.name || categoryId}
                          <button
                            onClick={() => removeFromArray('productConditions', 'includedCategories', categoryId)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Excluded Categories */}
              <div>
                <label className="wp-label">제외할 카테고리</label>
                <div className="space-y-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addToArray('productConditions', 'excludedCategories', e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="wp-select"
                    defaultValue=""
                  >
                    <option value="">카테고리 선택</option>
                    {categories
                      .filter(cat => !conditions.productConditions.excludedCategories.includes(cat.id))
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  
                  <div className="flex flex-wrap gap-2">
                    {conditions.productConditions.excludedCategories.map((categoryId) => {
                      const category = categories.find(c => c.id === categoryId)
                      return (
                        <span
                          key={categoryId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-sm rounded"
                        >
                          {category?.name || categoryId}
                          <button
                            onClick={() => removeFromArray('productConditions', 'excludedCategories', categoryId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Product Tags */}
              <div>
                <label className="wp-label">상품 태그</label>
                <div className="space-y-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addToArray('productConditions', 'productTags', e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="wp-select"
                    defaultValue=""
                  >
                    <option value="">태그 선택</option>
                    {tags
                      .filter(tag => !conditions.productConditions.productTags.includes(tag.id))
                      .map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                  
                  <div className="flex flex-wrap gap-2">
                    {conditions.productConditions.productTags.map((tagId) => {
                      const tag = tags.find(t => t.id === tagId)
                      return (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                        >
                          #{tag?.name || tagId}
                          <button
                            onClick={() => removeFromArray('productConditions', 'productTags', tagId)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Quantity Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">최소 수량</label>
                  <input
                    type="number"
                    min="1"
                    value={conditions.productConditions.minimumQuantity || ''}
                    onChange={(e) => updateConditions('productConditions', {
                      minimumQuantity: parseInt(e.target.value) || undefined
                    })}
                    className="wp-input"
                    placeholder="제한 없음"
                  />
                </div>
                
                <div>
                  <label className="wp-label">최대 수량</label>
                  <input
                    type="number"
                    min="1"
                    value={conditions.productConditions.maximumQuantity || ''}
                    onChange={(e) => updateConditions('productConditions', {
                      maximumQuantity: parseInt(e.target.value) || undefined
                    })}
                    className="wp-input"
                    placeholder="제한 없음"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'user' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-4">사용자 조건</h4>

              <div>
                <label className="wp-label">고객 유형</label>
                <div className="space-y-2">
                  {[
                    { value: 'customer', label: '일반 고객' },
                    { value: 'business', label: '기업 고객' },
                    { value: 'affiliate', label: '파트너' }
                  ].map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={type.value}
                        checked={conditions.userConditions.customerTypes.includes(type.value as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateConditions('userConditions', {
                              customerTypes: [...conditions.userConditions.customerTypes, type.value]
                            })
                          } else {
                            updateConditions('userConditions', {
                              customerTypes: conditions.userConditions.customerTypes.filter(t => t !== type.value)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor={type.value} className="text-sm text-gray-700">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="firstTimeOnly"
                  checked={conditions.userConditions.firstTimeOnly}
                  onChange={(e) => updateConditions('userConditions', {
                    firstTimeOnly: e.target.checked
                  })}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
                <label htmlFor="firstTimeOnly" className="text-sm text-gray-700">
                  첫 구매 고객만 사용 가능
                </label>
              </div>
            </div>
          )}

          {activeTab === 'time' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-4">시간 조건</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">유효 시작일</label>
                  <input
                    type="datetime-local"
                    value={new Date(conditions.timeConditions.validFrom).toISOString().slice(0, 16)}
                    onChange={(e) => updateConditions('timeConditions', {
                      validFrom: new Date(e.target.value)
                    })}
                    className="wp-input"
                  />
                </div>
                
                <div>
                  <label className="wp-label">유효 종료일</label>
                  <input
                    type="datetime-local"
                    value={new Date(conditions.timeConditions.validTo).toISOString().slice(0, 16)}
                    onChange={(e) => updateConditions('timeConditions', {
                      validTo: new Date(e.target.value)
                    })}
                    className="wp-input"
                  />
                </div>
              </div>

              <div>
                <label className="wp-label">사용 가능 요일</label>
                <div className="grid grid-cols-4 gap-2">
                  {weekdays.map((day) => (
                    <div key={day.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`day-${day.value}`}
                        checked={conditions.timeConditions.allowedDays?.includes(day.value) || false}
                        onChange={(e) => {
                          const allowedDays = conditions.timeConditions.allowedDays || []
                          if (e.target.checked) {
                            updateConditions('timeConditions', {
                              allowedDays: [...allowedDays, day.value]
                            })
                          } else {
                            updateConditions('timeConditions', {
                              allowedDays: allowedDays.filter(d => d !== day.value)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor={`day-${day.value}`} className="text-sm text-gray-700">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">시작 시간</label>
                  <input
                    type="time"
                    value={conditions.timeConditions.allowedHours?.start ? 
                      String(conditions.timeConditions.allowedHours.start).padStart(2, '0') + ':00' : ''
                    }
                    onChange={(e) => {
                      const hour = parseInt(e.target.value.split(':')[0])
                      updateConditions('timeConditions', {
                        allowedHours: {
                          ...conditions.timeConditions.allowedHours,
                          start: hour
                        }
                      })
                    }}
                    className="wp-input"
                  />
                </div>
                
                <div>
                  <label className="wp-label">종료 시간</label>
                  <input
                    type="time"
                    value={conditions.timeConditions.allowedHours?.end ? 
                      String(conditions.timeConditions.allowedHours.end).padStart(2, '0') + ':00' : ''
                    }
                    onChange={(e) => {
                      const hour = parseInt(e.target.value.split(':')[0])
                      updateConditions('timeConditions', {
                        allowedHours: {
                          ...conditions.timeConditions.allowedHours,
                          end: hour
                        }
                      })
                    }}
                    className="wp-input"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-4">사용 제한</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="wp-label">총 사용 제한</label>
                  <input
                    type="number"
                    min="1"
                    value={conditions.usageConditions.totalUsageLimit || ''}
                    onChange={(e) => updateConditions('usageConditions', {
                      totalUsageLimit: parseInt(e.target.value) || undefined
                    })}
                    className="wp-input"
                    placeholder="무제한"
                  />
                </div>
                
                <div>
                  <label className="wp-label">사용자당 제한</label>
                  <input
                    type="number"
                    min="1"
                    value={conditions.usageConditions.perUserLimit || ''}
                    onChange={(e) => updateConditions('usageConditions', {
                      perUserLimit: parseInt(e.target.value) || undefined
                    })}
                    className="wp-input"
                    placeholder="무제한"
                  />
                </div>
                
                <div>
                  <label className="wp-label">이메일당 제한</label>
                  <input
                    type="number"
                    min="1"
                    value={conditions.usageConditions.perEmailLimit || ''}
                    onChange={(e) => updateConditions('usageConditions', {
                      perEmailLimit: parseInt(e.target.value) || undefined
                    })}
                    className="wp-input"
                    placeholder="무제한"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="individualUse"
                  checked={conditions.usageConditions.individualUse}
                  onChange={(e) => updateConditions('usageConditions', {
                    individualUse: e.target.checked
                  })}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
                <label htmlFor="individualUse" className="text-sm text-gray-700">
                  다른 쿠폰과 중복 사용 불가 (단독 사용)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConditionsBuilder