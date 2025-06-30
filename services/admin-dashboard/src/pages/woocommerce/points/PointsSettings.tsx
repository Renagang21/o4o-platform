import React, { useState, useEffect } from 'react'
import { 
  Save,
  Settings,
  Percent,
  Star,
  Clock,
  Gift,
  Users,
  Award,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calculator,
  Target,
  DollarSign
} from 'lucide-react'
import { PointsPolicy } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import PointsCalculator from './components/PointsCalculator'
import toast from 'react-hot-toast'

const PointsSettings: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState<'rates' | 'tiers' | 'usage' | 'expiry' | 'bonus'>('rates')
  const [showCalculator, setShowCalculator] = useState(false)

  const [policy, setPolicy] = useState<PointsPolicy>({
    // Basic earning rates
    purchaseRate: 1.0,
    tierRates: {
      bronze: 1.0,
      silver: 1.2,
      gold: 1.5,
      platinum: 2.0
    },
    
    // Usage policies
    minimumSpend: 1000,
    maximumSpendRatio: 50,
    conversionRate: 10, // 1 point = 10 KRW
    
    // Expiry policies
    expiryMonths: 12,
    expiryWarningDays: 30,
    autoExpireInactive: true,
    inactivityMonths: 24,
    
    // Bonus point policies
    bonusRates: {
      review: 100,
      referral: 1000,
      birthday: 5000,
      signup: 1000,
      socialShare: 50,
      firstPurchase: 2000
    },
    
    // Tier thresholds (points needed to reach tier)
    tierThresholds: {
      bronze: 0,
      silver: 10000,
      gold: 50000,
      platinum: 200000
    },
    
    // Advanced settings
    enablePointsExpiry: true,
    enableTierSystem: true,
    enableBonusPoints: true,
    allowPartialSpend: true,
    roundingRule: 'floor', // 'floor', 'ceil', 'round'
    minimumEarnAmount: 1000, // Minimum purchase amount to earn points
    
    // Restrictions
    restrictedCategories: [],
    restrictedProducts: [],
    maxDailyEarn: 10000,
    maxMonthlyEarn: 100000
  })

  useEffect(() => {
    loadPolicy()
  }, [])

  const loadPolicy = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getPointsPolicy()
      setPolicy(response.data)
    } catch (error) {
      console.error('Failed to load points policy:', error)
      toast.error('포인트 정책을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await EcommerceApi.updatePointsPolicy(policy)
      setHasChanges(false)
      toast.success('포인트 정책이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save points policy:', error)
      toast.error('정책 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updatePolicy = (path: string, value: any) => {
    setPolicy(prev => {
      const keys = path.split('.')
      const updated = { ...prev }
      let current = updated

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }

      current[keys[keys.length - 1]] = value
      return updated
    })
    setHasChanges(true)
  }

  const resetToDefaults = () => {
    if (confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
      loadPolicy()
      setHasChanges(false)
      toast.success('설정이 기본값으로 복원되었습니다.')
    }
  }

  const calculatePoints = (amount: number, tier: string = 'bronze') => {
    const basePoints = Math.floor(amount * policy.purchaseRate / 100)
    const tierMultiplier = policy.tierRates[tier] || 1
    return Math.floor(basePoints * tierMultiplier)
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

  const tabs = [
    { id: 'rates', label: '적립률 설정', icon: Percent },
    { id: 'tiers', label: '등급 시스템', icon: Star },
    { id: 'usage', label: '사용 정책', icon: DollarSign },
    { id: 'expiry', label: '만료 정책', icon: Clock },
    { id: 'bonus', label: '보너스 포인트', icon: Gift }
  ]

  const tiers = [
    { key: 'bronze', label: '브론즈', color: 'text-orange-600' },
    { key: 'silver', label: '실버', color: 'text-gray-600' },
    { key: 'gold', label: '골드', color: 'text-yellow-600' },
    { key: 'platinum', label: '플래티넘', color: 'text-purple-600' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">포인트 정책을 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">포인트 정책 설정</h1>
          <p className="text-gray-600 mt-1">포인트 적립, 사용, 만료 정책을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="wp-button-secondary"
          >
            <Calculator className="w-4 h-4 mr-2" />
            포인트 계산기
          </button>
          <button
            onClick={resetToDefaults}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            기본값 복원
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
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
                정책 저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* Changes Alert */}
      {hasChanges && (
        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-orange-700">저장되지 않은 변경사항이 있습니다.</span>
            </div>
          </div>
        </div>
      )}

      {/* Points Calculator */}
      {showCalculator && (
        <PointsCalculator
          policy={policy}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* Preview Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">기본 적립률</p>
                <p className="text-xl font-bold text-blue-600">{policy.purchaseRate}%</p>
              </div>
              <Percent className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">최대 사용 비율</p>
                <p className="text-xl font-bold text-green-600">{policy.maximumSpendRatio}%</p>
              </div>
              <Target className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">포인트 가치</p>
                <p className="text-xl font-bold text-purple-600">1P = {policy.conversionRate}원</p>
              </div>
              <DollarSign className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">만료 기간</p>
                <p className="text-xl font-bold text-orange-600">{policy.expiryMonths}개월</p>
              </div>
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
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
          {activeTab === 'rates' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Percent className="w-5 h-5" />
                적립률 설정
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="wp-label">기본 적립률 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={policy.purchaseRate}
                    onChange={(e) => updatePolicy('purchaseRate', parseFloat(e.target.value))}
                    className="wp-input"
                  />
                  <p className="text-sm text-gray-500 mt-1">구매 금액 대비 적립되는 포인트 비율</p>
                </div>

                <div>
                  <label className="wp-label">최소 적립 주문금액</label>
                  <input
                    type="number"
                    min="0"
                    value={policy.minimumEarnAmount}
                    onChange={(e) => updatePolicy('minimumEarnAmount', parseInt(e.target.value))}
                    className="wp-input"
                  />
                  <p className="text-sm text-gray-500 mt-1">이 금액 이상 구매 시에만 포인트 적립</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">적립 제한</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="wp-label">일일 최대 적립 포인트</label>
                    <input
                      type="number"
                      min="0"
                      value={policy.maxDailyEarn}
                      onChange={(e) => updatePolicy('maxDailyEarn', parseInt(e.target.value))}
                      className="wp-input"
                    />
                  </div>
                  <div>
                    <label className="wp-label">월간 최대 적립 포인트</label>
                    <input
                      type="number"
                      min="0"
                      value={policy.maxMonthlyEarn}
                      onChange={(e) => updatePolicy('maxMonthlyEarn', parseInt(e.target.value))}
                      className="wp-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">반올림 규칙</h4>
                <select
                  value={policy.roundingRule}
                  onChange={(e) => updatePolicy('roundingRule', e.target.value)}
                  className="wp-select w-48"
                >
                  <option value="floor">내림 (버림)</option>
                  <option value="ceil">올림</option>
                  <option value="round">반올림</option>
                </select>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">적립 예시</h4>
                <div className="space-y-2 text-sm">
                  <div>100,000원 구매 시: <strong>{formatPoints(calculatePoints(100000))}</strong></div>
                  <div>50,000원 구매 시: <strong>{formatPoints(calculatePoints(50000))}</strong></div>
                  <div>10,000원 구매 시: <strong>{formatPoints(calculatePoints(10000))}</strong></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  등급 시스템
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableTierSystem"
                    checked={policy.enableTierSystem}
                    onChange={(e) => updatePolicy('enableTierSystem', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="enableTierSystem" className="text-sm text-gray-700">
                    등급 시스템 활성화
                  </label>
                </div>
              </div>

              {policy.enableTierSystem && (
                <>
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">등급별 적립률 배수</h4>
                    {tiers.map((tier) => (
                      <div key={tier.key} className="flex items-center gap-4">
                        <div className="w-20 text-sm">
                          <span className={`font-medium ${tier.color}`}>{tier.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={policy.tierRates[tier.key]}
                            onChange={(e) => updatePolicy(`tierRates.${tier.key}`, parseFloat(e.target.value))}
                            className="wp-input w-20"
                          />
                          <span className="text-sm text-gray-500">배</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          = {(policy.purchaseRate * policy.tierRates[tier.key]).toFixed(1)}% 적립률
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">등급 승급 기준 (누적 포인트)</h4>
                    {tiers.map((tier) => (
                      <div key={tier.key} className="flex items-center gap-4">
                        <div className="w-20 text-sm">
                          <span className={`font-medium ${tier.color}`}>{tier.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={policy.tierThresholds[tier.key]}
                            onChange={(e) => updatePolicy(`tierThresholds.${tier.key}`, parseInt(e.target.value))}
                            className="wp-input w-32"
                            disabled={tier.key === 'bronze'}
                          />
                          <span className="text-sm text-gray-500">포인트 이상</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">등급별 적립 예시 (100,000원 구매)</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {tiers.map((tier) => (
                        <div key={tier.key}>
                          <span className={`font-medium ${tier.color}`}>{tier.label}</span>: 
                          <strong> {formatPoints(calculatePoints(100000, tier.key))}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                사용 정책
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="wp-label">최소 사용 포인트</label>
                  <input
                    type="number"
                    min="0"
                    value={policy.minimumSpend}
                    onChange={(e) => updatePolicy('minimumSpend', parseInt(e.target.value))}
                    className="wp-input"
                  />
                  <p className="text-sm text-gray-500 mt-1">한 번에 사용할 수 있는 최소 포인트</p>
                </div>

                <div>
                  <label className="wp-label">최대 사용 비율 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={policy.maximumSpendRatio}
                    onChange={(e) => updatePolicy('maximumSpendRatio', parseInt(e.target.value))}
                    className="wp-input"
                  />
                  <p className="text-sm text-gray-500 mt-1">주문 금액 대비 포인트 사용 한도</p>
                </div>
              </div>

              <div>
                <label className="wp-label">포인트 가치 (1 포인트 = ? 원)</label>
                <input
                  type="number"
                  min="1"
                  value={policy.conversionRate}
                  onChange={(e) => updatePolicy('conversionRate', parseInt(e.target.value))}
                  className="wp-input w-32"
                />
                <p className="text-sm text-gray-500 mt-1">포인트를 현금으로 전환할 때의 비율</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowPartialSpend"
                    checked={policy.allowPartialSpend}
                    onChange={(e) => updatePolicy('allowPartialSpend', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="allowPartialSpend" className="text-sm text-gray-700">
                    부분 결제 허용 (포인트 + 카드)
                  </label>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">사용 예시</h4>
                <div className="space-y-2 text-sm">
                  <div>100,000원 주문 시 최대 사용 가능: <strong>{formatPoints((100000 * policy.maximumSpendRatio) / 100 / policy.conversionRate)}</strong></div>
                  <div>50,000원 주문 시 최대 사용 가능: <strong>{formatPoints((50000 * policy.maximumSpendRatio) / 100 / policy.conversionRate)}</strong></div>
                  <div>1,000 포인트 = <strong>{formatPrice(1000 * policy.conversionRate)}</strong></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'expiry' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  만료 정책
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enablePointsExpiry"
                    checked={policy.enablePointsExpiry}
                    onChange={(e) => updatePolicy('enablePointsExpiry', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="enablePointsExpiry" className="text-sm text-gray-700">
                    포인트 만료 활성화
                  </label>
                </div>
              </div>

              {policy.enablePointsExpiry && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="wp-label">포인트 만료 기간 (개월)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={policy.expiryMonths}
                        onChange={(e) => updatePolicy('expiryMonths', parseInt(e.target.value))}
                        className="wp-input"
                      />
                      <p className="text-sm text-gray-500 mt-1">적립일로부터 만료까지의 기간</p>
                    </div>

                    <div>
                      <label className="wp-label">만료 경고 기간 (일)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={policy.expiryWarningDays}
                        onChange={(e) => updatePolicy('expiryWarningDays', parseInt(e.target.value))}
                        className="wp-input"
                      />
                      <p className="text-sm text-gray-500 mt-1">만료 전 미리 알림을 보낼 기간</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoExpireInactive"
                        checked={policy.autoExpireInactive}
                        onChange={(e) => updatePolicy('autoExpireInactive', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="autoExpireInactive" className="text-sm text-gray-700">
                        장기 미사용 계정 포인트 자동 만료
                      </label>
                    </div>

                    {policy.autoExpireInactive && (
                      <div className="ml-6">
                        <label className="wp-label">미사용 기간 (개월)</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={policy.inactivityMonths}
                          onChange={(e) => updatePolicy('inactivityMonths', parseInt(e.target.value))}
                          className="wp-input w-32"
                        />
                        <p className="text-sm text-gray-500 mt-1">이 기간 동안 미사용시 포인트 만료</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">만료 정책 요약</h4>
                <div className="space-y-1 text-sm text-red-800">
                  {policy.enablePointsExpiry ? (
                    <>
                      <div>• 포인트는 적립일로부터 {policy.expiryMonths}개월 후 만료됩니다</div>
                      <div>• 만료 {policy.expiryWarningDays}일 전부터 알림을 발송합니다</div>
                      {policy.autoExpireInactive && (
                        <div>• {policy.inactivityMonths}개월 미사용 계정의 포인트는 자동 만료됩니다</div>
                      )}
                    </>
                  ) : (
                    <div>• 포인트 만료가 비활성화되어 있습니다</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bonus' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  보너스 포인트
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableBonusPoints"
                    checked={policy.enableBonusPoints}
                    onChange={(e) => updatePolicy('enableBonusPoints', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="enableBonusPoints" className="text-sm text-gray-700">
                    보너스 포인트 활성화
                  </label>
                </div>
              </div>

              {policy.enableBonusPoints && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">활동별 보너스 포인트</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">회원가입</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={policy.bonusRates.signup}
                          onChange={(e) => updatePolicy('bonusRates.signup', parseInt(e.target.value))}
                          className="wp-input"
                        />
                        <span className="text-sm text-gray-500">포인트</span>
                      </div>
                    </div>

                    <div>
                      <label className="wp-label">첫 구매</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={policy.bonusRates.firstPurchase}
                          onChange={(e) => updatePolicy('bonusRates.firstPurchase', parseInt(e.target.value))}
                          className="wp-input"
                        />
                        <span className="text-sm text-gray-500">포인트</span>
                      </div>
                    </div>

                    <div>
                      <label className="wp-label">상품 리뷰 작성</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={policy.bonusRates.review}
                          onChange={(e) => updatePolicy('bonusRates.review', parseInt(e.target.value))}
                          className="wp-input"
                        />
                        <span className="text-sm text-gray-500">포인트</span>
                      </div>
                    </div>

                    <div>
                      <label className="wp-label">친구 추천</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={policy.bonusRates.referral}
                          onChange={(e) => updatePolicy('bonusRates.referral', parseInt(e.target.value))}
                          className="wp-input"
                        />
                        <span className="text-sm text-gray-500">포인트</span>
                      </div>
                    </div>

                    <div>
                      <label className="wp-label">생일 축하</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={policy.bonusRates.birthday}
                          onChange={(e) => updatePolicy('bonusRates.birthday', parseInt(e.target.value))}
                          className="wp-input"
                        />
                        <span className="text-sm text-gray-500">포인트</span>
                      </div>
                    </div>

                    <div>
                      <label className="wp-label">SNS 공유</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={policy.bonusRates.socialShare}
                          onChange={(e) => updatePolicy('bonusRates.socialShare', parseInt(e.target.value))}
                          className="wp-input"
                        />
                        <span className="text-sm text-gray-500">포인트</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">보너스 포인트 요약</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-yellow-800">
                  <div>회원가입: {formatPoints(policy.bonusRates.signup)}</div>
                  <div>첫 구매: {formatPoints(policy.bonusRates.firstPurchase)}</div>
                  <div>리뷰 작성: {formatPoints(policy.bonusRates.review)}</div>
                  <div>친구 추천: {formatPoints(policy.bonusRates.referral)}</div>
                  <div>생일 축하: {formatPoints(policy.bonusRates.birthday)}</div>
                  <div>SNS 공유: {formatPoints(policy.bonusRates.socialShare)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PointsSettings