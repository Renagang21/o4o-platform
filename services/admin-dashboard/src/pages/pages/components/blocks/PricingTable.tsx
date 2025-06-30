import React, { useState } from 'react'
import { Settings, Plus, Trash2, Check, X, Star } from 'lucide-react'

interface PricingPlan {
  name: string
  price: string
  period: string
  features: string[]
  highlighted: boolean
  ctaText: string
  ctaLink?: string
  popular?: boolean
}

interface PricingTableProps {
  data: {
    plans: PricingPlan[]
    currency?: string
    billingToggle?: boolean
    title?: string
    subtitle?: string
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const PricingTable: React.FC<PricingTableProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [editingPlan, setEditingPlan] = useState<number | null>(null)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const updatePlan = (index: number, key: string, value: any) => {
    const newPlans = [...data.plans]
    newPlans[index] = { ...newPlans[index], [key]: value }
    updateData('plans', newPlans)
  }

  const addPlan = () => {
    const newPlans = [...data.plans, {
      name: '새 플랜',
      price: '9,900',
      period: '월',
      features: ['기능 1', '기능 2', '기능 3'],
      highlighted: false,
      ctaText: '선택하기',
      popular: false
    }]
    updateData('plans', newPlans)
  }

  const removePlan = (index: number) => {
    const newPlans = data.plans.filter((_, i) => i !== index)
    updateData('plans', newPlans)
  }

  const addFeature = (planIndex: number) => {
    const newPlans = [...data.plans]
    newPlans[planIndex].features.push('새 기능')
    updateData('plans', newPlans)
  }

  const updateFeature = (planIndex: number, featureIndex: number, value: string) => {
    const newPlans = [...data.plans]
    newPlans[planIndex].features[featureIndex] = value
    updateData('plans', newPlans)
  }

  const removeFeature = (planIndex: number, featureIndex: number) => {
    const newPlans = [...data.plans]
    newPlans[planIndex].features.splice(featureIndex, 1)
    updateData('plans', newPlans)
  }

  return (
    <div className={`relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Settings Button */}
      {isSelected && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* Pricing Table */}
      <div className="p-8">
        {/* Header */}
        {(data.title || data.subtitle) && (
          <div className="text-center mb-12">
            {data.title && (
              <h2 
                className="text-3xl font-bold text-gray-900 mb-4"
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => updateData('title', e.currentTarget.textContent)}
              >
                {data.title}
              </h2>
            )}
            {data.subtitle && (
              <p 
                className="text-xl text-gray-600"
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => updateData('subtitle', e.currentTarget.textContent)}
              >
                {data.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Plans Grid */}
        <div className={`grid gap-8 ${
          data.plans.length === 1 ? 'max-w-md mx-auto' :
          data.plans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' :
          data.plans.length === 3 ? 'md:grid-cols-3 max-w-6xl mx-auto' :
          'md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {data.plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-lg border-2 ${
                plan.highlighted 
                  ? 'border-blue-500 shadow-lg transform scale-105' 
                  : 'border-gray-200'
              } bg-white p-6`}
              onClick={() => setEditingPlan(editingPlan === index ? null : index)}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    인기
                  </span>
                </div>
              )}

              {/* Delete Button */}
              {isSelected && data.plans.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removePlan(index)
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 
                  className="text-xl font-semibold text-gray-900 mb-4"
                  contentEditable={editingPlan === index}
                  suppressContentEditableWarning
                  onBlur={(e) => updatePlan(index, 'name', e.currentTarget.textContent)}
                >
                  {plan.name}
                </h3>
                
                <div className="mb-4">
                  <span 
                    className="text-4xl font-bold text-gray-900"
                    contentEditable={editingPlan === index}
                    suppressContentEditableWarning
                    onBlur={(e) => updatePlan(index, 'price', e.currentTarget.textContent)}
                  >
                    {data.currency || '₩'}{plan.price}
                  </span>
                  <span 
                    className="text-gray-600 ml-1"
                    contentEditable={editingPlan === index}
                    suppressContentEditableWarning
                    onBlur={(e) => updatePlan(index, 'period', e.currentTarget.textContent)}
                  >
                    /{plan.period}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    <span 
                      className="text-gray-700"
                      contentEditable={editingPlan === index}
                      suppressContentEditableWarning
                      onBlur={(e) => updateFeature(index, featureIndex, e.currentTarget.textContent || '')}
                    >
                      {feature}
                    </span>
                    {editingPlan === index && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFeature(index, featureIndex)
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
                
                {/* Add Feature Button */}
                {editingPlan === index && (
                  <li>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addFeature(index)
                      }}
                      className="flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-3" />
                      기능 추가
                    </button>
                  </li>
                )}
              </ul>

              {/* CTA Button */}
              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
                contentEditable={editingPlan === index}
                suppressContentEditableWarning
                onBlur={(e) => updatePlan(index, 'ctaText', e.currentTarget.textContent)}
              >
                {plan.ctaText}
              </button>

              {/* Plan Settings */}
              {editingPlan === index && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={plan.highlighted}
                      onChange={(e) => updatePlan(index, 'highlighted', e.target.checked)}
                      className="rounded mr-2"
                    />
                    <span className="text-sm">강조 표시</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={plan.popular || false}
                      onChange={(e) => updatePlan(index, 'popular', e.target.checked)}
                      className="rounded mr-2"
                    />
                    <span className="text-sm">인기 배지</span>
                  </label>
                </div>
              )}
            </div>
          ))}

          {/* Add Plan Button */}
          {isSelected && (
            <button
              onClick={addPlan}
              className="flex items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            >
              <div className="text-center">
                <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-500">플랜 추가</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium text-gray-900 mb-4">가격표 설정</h3>
          
          <div className="space-y-4">
            {/* Currency */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">통화</label>
              <select
                value={data.currency || '₩'}
                onChange={(e) => updateData('currency', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="₩">₩ (원)</option>
                <option value="$">$ (달러)</option>
                <option value="€">€ (유로)</option>
                <option value="¥">¥ (엔)</option>
              </select>
            </div>

            {/* Header Text */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">제목</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateData('title', e.target.value)}
                placeholder="가격 안내"
                className="w-full rounded border-gray-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">부제목</label>
              <input
                type="text"
                value={data.subtitle || ''}
                onChange={(e) => updateData('subtitle', e.target.value)}
                placeholder="적합한 플랜을 선택하세요"
                className="w-full rounded border-gray-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PricingTable