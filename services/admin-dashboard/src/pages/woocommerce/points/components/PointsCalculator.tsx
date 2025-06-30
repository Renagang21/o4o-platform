import React, { useState, useEffect } from 'react'
import { 
  Calculator,
  X,
  Percent,
  DollarSign,
  Star,
  TrendingUp,
  Info,
  Target,
  Award
} from 'lucide-react'
import { PointsPolicy } from '@/types/ecommerce'

interface PointsCalculatorProps {
  policy: PointsPolicy
  onClose: () => void
}

const PointsCalculator: React.FC<PointsCalculatorProps> = ({
  policy,
  onClose
}) => {
  const [calculations, setCalculations] = useState({
    purchaseAmount: 100000,
    userTier: 'bronze',
    calculatedPoints: 0,
    conversionValue: 0,
    scenarios: []
  })

  const [spendCalculation, setSpendCalculation] = useState({
    orderAmount: 50000,
    pointsToSpend: 5000,
    maxSpendable: 0,
    remainingAmount: 0,
    discountPercentage: 0
  })

  useEffect(() => {
    calculateEarnPoints()
  }, [calculations.purchaseAmount, calculations.userTier, policy])

  useEffect(() => {
    calculateSpendPoints()
  }, [spendCalculation.orderAmount, spendCalculation.pointsToSpend, policy])

  const calculateEarnPoints = () => {
    const amount = calculations.purchaseAmount
    const tier = calculations.userTier
    
    // Basic points calculation
    let basePoints = Math.floor(amount * policy.purchaseRate / 100)
    
    // Apply rounding rule
    switch (policy.roundingRule) {
      case 'ceil':
        basePoints = Math.ceil(amount * policy.purchaseRate / 100)
        break
      case 'round':
        basePoints = Math.round(amount * policy.purchaseRate / 100)
        break
      default: // floor
        basePoints = Math.floor(amount * policy.purchaseRate / 100)
    }
    
    // Apply tier multiplier
    const tierMultiplier = policy.tierRates[tier] || 1
    const finalPoints = Math.floor(basePoints * tierMultiplier)
    
    // Check earning limits
    const limitedPoints = Math.min(finalPoints, policy.maxDailyEarn || Infinity)
    
    // Calculate conversion value
    const conversionValue = limitedPoints * policy.conversionRate
    
    // Generate scenarios for all tiers
    const scenarios = ['bronze', 'silver', 'gold', 'platinum'].map(tierName => {
      const tierPoints = Math.floor(basePoints * (policy.tierRates[tierName] || 1))
      return {
        tier: tierName,
        points: Math.min(tierPoints, policy.maxDailyEarn || Infinity),
        value: Math.min(tierPoints, policy.maxDailyEarn || Infinity) * policy.conversionRate
      }
    })

    setCalculations(prev => ({
      ...prev,
      calculatedPoints: limitedPoints,
      conversionValue,
      scenarios
    }))
  }

  const calculateSpendPoints = () => {
    const orderAmount = spendCalculation.orderAmount
    const pointsToSpend = spendCalculation.pointsToSpend
    
    // Calculate maximum spendable points
    const maxSpendable = Math.floor((orderAmount * policy.maximumSpendRatio / 100) / policy.conversionRate)
    
    // Calculate actual spend (within limits)
    const actualSpend = Math.min(pointsToSpend, maxSpendable)
    const pointsValue = actualSpend * policy.conversionRate
    const remainingAmount = orderAmount - pointsValue
    const discountPercentage = (pointsValue / orderAmount) * 100

    setSpendCalculation(prev => ({
      ...prev,
      maxSpendable,
      remainingAmount,
      discountPercentage
    }))
  }

  const updateEarnCalculation = (key: string, value: any) => {
    setCalculations(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateSpendCalculation = (key: string, value: any) => {
    setSpendCalculation(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('ko-KR').format(points) + 'P'
  }

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'text-orange-600',
      silver: 'text-gray-600',
      gold: 'text-yellow-600',
      platinum: 'text-purple-600'
    }
    return colors[tier] || colors.bronze
  }

  const getTierLabel = (tier: string) => {
    const labels = {
      bronze: '브론즈',
      silver: '실버',
      gold: '골드',
      platinum: '플래티넘'
    }
    return labels[tier] || tier
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">포인트 계산기</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earn Points Calculator */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h4 className="text-lg font-medium text-gray-900">포인트 적립 계산</h4>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="wp-label">구매 금액</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={calculations.purchaseAmount}
                    onChange={(e) => updateEarnCalculation('purchaseAmount', parseInt(e.target.value) || 0)}
                    className="wp-input"
                    placeholder="구매 금액을 입력하세요"
                  />
                </div>

                <div>
                  <label className="wp-label">사용자 등급</label>
                  <select
                    value={calculations.userTier}
                    onChange={(e) => updateEarnCalculation('userTier', e.target.value)}
                    className="wp-select"
                  >
                    <option value="bronze">브론즈</option>
                    <option value="silver">실버</option>
                    <option value="gold">골드</option>
                    <option value="platinum">플래티넘</option>
                  </select>
                </div>

                {/* Calculation Result */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {formatPoints(calculations.calculatedPoints)}
                    </div>
                    <div className="text-sm text-green-700">
                      적립 예정 포인트
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      ({formatPrice(calculations.conversionValue)} 상당)
                    </div>
                  </div>
                </div>

                {/* Calculation Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">기본 적립률:</span>
                    <span className="font-medium">{policy.purchaseRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">등급 배수:</span>
                    <span className="font-medium">×{policy.tierRates[calculations.userTier]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">반올림 규칙:</span>
                    <span className="font-medium">
                      {policy.roundingRule === 'floor' ? '내림' : 
                       policy.roundingRule === 'ceil' ? '올림' : '반올림'}
                    </span>
                  </div>
                  {policy.maxDailyEarn && calculations.calculatedPoints >= policy.maxDailyEarn && (
                    <div className="flex justify-between text-orange-600">
                      <span>일일 한도:</span>
                      <span className="font-medium">{formatPoints(policy.maxDailyEarn)}</span>
                    </div>
                  )}
                </div>

                {/* Tier Scenarios */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">등급별 적립 비교</h5>
                  <div className="space-y-2">
                    {calculations.scenarios.map((scenario) => (
                      <div 
                        key={scenario.tier}
                        className={`flex items-center justify-between p-2 rounded ${
                          scenario.tier === calculations.userTier ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <span className={`font-medium ${getTierColor(scenario.tier)}`}>
                          {getTierLabel(scenario.tier)}
                        </span>
                        <div className="text-right">
                          <div className="font-medium">{formatPoints(scenario.points)}</div>
                          <div className="text-xs text-gray-500">
                            {formatPrice(scenario.value)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Spend Points Calculator */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-medium text-gray-900">포인트 사용 계산</h4>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="wp-label">주문 금액</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={spendCalculation.orderAmount}
                    onChange={(e) => updateSpendCalculation('orderAmount', parseInt(e.target.value) || 0)}
                    className="wp-input"
                    placeholder="주문 금액을 입력하세요"
                  />
                </div>

                <div>
                  <label className="wp-label">사용할 포인트</label>
                  <input
                    type="number"
                    min="0"
                    max={spendCalculation.maxSpendable}
                    value={spendCalculation.pointsToSpend}
                    onChange={(e) => updateSpendCalculation('pointsToSpend', parseInt(e.target.value) || 0)}
                    className="wp-input"
                    placeholder="사용할 포인트를 입력하세요"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    최대 사용 가능: {formatPoints(spendCalculation.maxSpendable)}
                  </p>
                </div>

                {/* Spending Result */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-700">할인 금액:</span>
                      <span className="font-bold text-blue-900">
                        {formatPrice(Math.min(spendCalculation.pointsToSpend, spendCalculation.maxSpendable) * policy.conversionRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">최종 결제금액:</span>
                      <span className="font-bold text-blue-900">
                        {formatPrice(spendCalculation.remainingAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">할인율:</span>
                      <span className="font-bold text-blue-900">
                        {spendCalculation.discountPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spending Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">포인트 가치:</span>
                    <span className="font-medium">1P = {policy.conversionRate}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">최대 사용 비율:</span>
                    <span className="font-medium">{policy.maximumSpendRatio}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">최소 사용:</span>
                    <span className="font-medium">{formatPoints(policy.minimumSpend)}</span>
                  </div>
                </div>

                {/* Usage Scenarios */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">사용 시나리오</h5>
                  <div className="space-y-2">
                    {[25, 50, 75, 100].map(percentage => {
                      const maxUsage = Math.floor((spendCalculation.orderAmount * percentage / 100) / policy.conversionRate)
                      const actualUsage = Math.min(maxUsage, spendCalculation.maxSpendable)
                      const discount = actualUsage * policy.conversionRate
                      const remaining = spendCalculation.orderAmount - discount

                      return (
                        <div key={percentage} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">{percentage}% 할인:</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatPoints(actualUsage)} → {formatPrice(discount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              결제: {formatPrice(remaining)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Summary */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-gray-500" />
              <h5 className="font-medium text-gray-900">현재 포인트 정책</h5>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{policy.purchaseRate}%</div>
                <div className="text-gray-600">기본 적립률</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{policy.maximumSpendRatio}%</div>
                <div className="text-gray-600">최대 사용 비율</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{policy.conversionRate}원</div>
                <div className="text-gray-600">1P 가치</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{policy.expiryMonths}개월</div>
                <div className="text-gray-600">만료 기간</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="wp-button-primary"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointsCalculator