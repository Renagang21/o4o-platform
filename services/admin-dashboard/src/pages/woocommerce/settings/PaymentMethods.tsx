import React, { useState, useEffect } from 'react'
import { 
  Save,
  CreditCard,
  DollarSign,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Settings,
  Test,
  Link as LinkIcon,
  Smartphone
} from 'lucide-react'
import { PaymentMethod, PaymentSettings } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const PaymentMethods: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [testMode, setTestMode] = useState(true)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})

  const [settings, setSettings] = useState<PaymentSettings>({
    enabledMethods: ['card', 'bank_transfer', 'kakaopay', 'naverpay'],
    defaultMethod: 'card',
    testMode: true,
    enablePartialPayment: false,
    enableInstallment: true,
    maxInstallmentMonths: 12,
    minimumOrderAmount: 1000,
    
    providers: {
      iamport: {
        enabled: true,
        merchantId: '',
        apiKey: '',
        apiSecret: '',
        testMode: true
      },
      toss: {
        enabled: false,
        clientKey: '',
        secretKey: '',
        testMode: true
      },
      nice: {
        enabled: false,
        merchantId: '',
        merchantKey: '',
        testMode: true
      }
    },

    fees: {
      card: { rate: 2.9, fixed: 0 },
      bank_transfer: { rate: 0, fixed: 500 },
      kakaopay: { rate: 2.5, fixed: 0 },
      naverpay: { rate: 2.8, fixed: 0 }
    },

    installmentOptions: [3, 6, 12],
    currencies: ['KRW'],
    
    webhookUrl: '',
    returnUrl: '',
    failUrl: ''
  })

  const [editingMethod, setEditingMethod] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getPaymentSettings()
      setSettings(response.data)
      setTestMode(response.data.testMode)
    } catch (error) {
      console.error('Failed to load payment settings:', error)
      toast.error('결제 설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await EcommerceApi.updatePaymentSettings(settings)
      setHasChanges(false)
      toast.success('결제 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save payment settings:', error)
      toast.error('설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
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

  const togglePaymentMethod = (method: string) => {
    const enabledMethods = settings.enabledMethods.includes(method)
      ? settings.enabledMethods.filter(m => m !== method)
      : [...settings.enabledMethods, method]
    
    updateSetting('enabledMethods', enabledMethods)
  }

  const testConnection = async (provider: string) => {
    try {
      const response = await EcommerceApi.testPaymentProvider(provider, settings.providers[provider])
      if (response.success) {
        toast.success(`${provider} 연결 테스트가 성공했습니다.`)
      } else {
        toast.error(`${provider} 연결 테스트가 실패했습니다: ${response.message}`)
      }
    } catch (error) {
      console.error('Payment test failed:', error)
      toast.error('연결 테스트 중 오류가 발생했습니다.')
    }
  }

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const paymentMethods = [
    {
      id: 'card',
      name: '신용카드/체크카드',
      icon: CreditCard,
      description: 'Visa, MasterCard, JCB, 국내 카드사',
      color: 'blue'
    },
    {
      id: 'bank_transfer',
      name: '계좌이체',
      icon: DollarSign,
      description: '실시간 계좌이체',
      color: 'green'
    },
    {
      id: 'kakaopay',
      name: '카카오페이',
      icon: Smartphone,
      description: '카카오톡으로 간편결제',
      color: 'yellow'
    },
    {
      id: 'naverpay',
      name: '네이버페이',
      icon: Shield,
      description: '네이버 간편결제',
      color: 'green'
    }
  ]

  const providers = [
    {
      id: 'iamport',
      name: '아임포트',
      logo: '🏦',
      description: '국내 대표 결제 대행 서비스'
    },
    {
      id: 'toss',
      name: '토스페이먼츠',
      logo: '💳',
      description: '토스의 결제 서비스'
    },
    {
      id: 'nice',
      name: '나이스페이먼츠',
      logo: '💰',
      description: '안정적인 결제 서비스'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">결제 설정을 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">결제 방법 설정</h1>
          <p className="text-gray-600 mt-1">결제 수단과 PG사 설정을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="testMode"
              checked={testMode}
              onChange={(e) => {
                setTestMode(e.target.checked)
                updateSetting('testMode', e.target.checked)
              }}
              className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
            />
            <label htmlFor="testMode" className="text-sm text-gray-700">테스트 모드</label>
          </div>
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
                설정 저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Mode Alert */}
      {testMode && (
        <div className="wp-card border-l-4 border-l-yellow-500">
          <div className="wp-card-body">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <span className="text-yellow-700">테스트 모드가 활성화되어 있습니다. 실제 결제는 처리되지 않습니다.</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Payment Methods */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">결제 수단 관리</h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((method) => {
              const isEnabled = settings.enabledMethods.includes(method.id)
              const IconComponent = method.icon
              
              return (
                <div 
                  key={method.id}
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    isEnabled 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-6 h-6 text-${method.color}-500`} />
                      <div>
                        <h4 className="font-medium text-gray-900">{method.name}</h4>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => togglePaymentMethod(method.id)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      {isEnabled && (
                        <button
                          onClick={() => setEditingMethod(method.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEnabled && settings.fees[method.id] && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        수수료: {settings.fees[method.id].rate}%
                        {settings.fees[method.id].fixed > 0 && ` + ${settings.fees[method.id].fixed}원`}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Payment Options */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-900 mb-4">결제 옵션</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="wp-label">기본 결제 수단</label>
                <select
                  value={settings.defaultMethod}
                  onChange={(e) => updateSetting('defaultMethod', e.target.value)}
                  className="wp-select"
                >
                  {paymentMethods
                    .filter(method => settings.enabledMethods.includes(method.id))
                    .map(method => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="wp-label">최소 주문 금액</label>
                <input
                  type="number"
                  min="0"
                  value={settings.minimumOrderAmount}
                  onChange={(e) => updateSetting('minimumOrderAmount', parseInt(e.target.value))}
                  className="wp-input"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enablePartialPayment"
                  checked={settings.enablePartialPayment}
                  onChange={(e) => updateSetting('enablePartialPayment', e.target.checked)}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
                <label htmlFor="enablePartialPayment" className="text-sm text-gray-700">
                  부분 결제 허용 (포인트 + 카드 등)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableInstallment"
                  checked={settings.enableInstallment}
                  onChange={(e) => updateSetting('enableInstallment', e.target.checked)}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
                <label htmlFor="enableInstallment" className="text-sm text-gray-700">
                  신용카드 할부 허용
                </label>
              </div>

              {settings.enableInstallment && (
                <div className="ml-6">
                  <label className="wp-label">최대 할부 개월</label>
                  <select
                    value={settings.maxInstallmentMonths}
                    onChange={(e) => updateSetting('maxInstallmentMonths', parseInt(e.target.value))}
                    className="wp-select w-32"
                  >
                    <option value={3}>3개월</option>
                    <option value={6}>6개월</option>
                    <option value={12}>12개월</option>
                    <option value={24}>24개월</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PG Providers */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">PG사 설정</h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {providers.map((provider) => {
              const providerSettings = settings.providers[provider.id]
              const isEnabled = providerSettings?.enabled || false
              
              return (
                <div key={provider.id} className={`border rounded-lg p-4 ${isEnabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{provider.logo}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{provider.name}</h4>
                        <p className="text-sm text-gray-600">{provider.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => updateSetting(`providers.${provider.id}.enabled`, e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      {isEnabled && (
                        <button
                          onClick={() => testConnection(provider.id)}
                          className="wp-button-secondary text-sm"
                        >
                          <Test className="w-3 h-3 mr-1" />
                          테스트
                        </button>
                      )}
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {provider.id === 'iamport' && (
                        <>
                          <div>
                            <label className="wp-label">가맹점 식별코드</label>
                            <input
                              type="text"
                              value={providerSettings.merchantId}
                              onChange={(e) => updateSetting(`providers.${provider.id}.merchantId`, e.target.value)}
                              className="wp-input"
                              placeholder="imp12345678"
                            />
                          </div>
                          <div>
                            <label className="wp-label">REST API 키</label>
                            <div className="relative">
                              <input
                                type={showApiKeys[provider.id] ? "text" : "password"}
                                value={providerSettings.apiKey}
                                onChange={(e) => updateSetting(`providers.${provider.id}.apiKey`, e.target.value)}
                                className="wp-input pr-10"
                                placeholder="API 키를 입력하세요"
                              />
                              <button
                                type="button"
                                onClick={() => toggleApiKeyVisibility(provider.id)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showApiKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="wp-label">REST API Secret</label>
                            <div className="relative">
                              <input
                                type={showApiKeys[`${provider.id}_secret`] ? "text" : "password"}
                                value={providerSettings.apiSecret}
                                onChange={(e) => updateSetting(`providers.${provider.id}.apiSecret`, e.target.value)}
                                className="wp-input pr-10"
                                placeholder="API Secret을 입력하세요"
                              />
                              <button
                                type="button"
                                onClick={() => toggleApiKeyVisibility(`${provider.id}_secret`)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showApiKeys[`${provider.id}_secret`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {provider.id === 'toss' && (
                        <>
                          <div>
                            <label className="wp-label">클라이언트 키</label>
                            <input
                              type="text"
                              value={providerSettings.clientKey}
                              onChange={(e) => updateSetting(`providers.${provider.id}.clientKey`, e.target.value)}
                              className="wp-input"
                            />
                          </div>
                          <div>
                            <label className="wp-label">시크릿 키</label>
                            <div className="relative">
                              <input
                                type={showApiKeys[provider.id] ? "text" : "password"}
                                value={providerSettings.secretKey}
                                onChange={(e) => updateSetting(`providers.${provider.id}.secretKey`, e.target.value)}
                                className="wp-input pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => toggleApiKeyVisibility(provider.id)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showApiKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {provider.id === 'nice' && (
                        <>
                          <div>
                            <label className="wp-label">가맹점 ID</label>
                            <input
                              type="text"
                              value={providerSettings.merchantId}
                              onChange={(e) => updateSetting(`providers.${provider.id}.merchantId`, e.target.value)}
                              className="wp-input"
                            />
                          </div>
                          <div>
                            <label className="wp-label">가맹점 키</label>
                            <div className="relative">
                              <input
                                type={showApiKeys[provider.id] ? "text" : "password"}
                                value={providerSettings.merchantKey}
                                onChange={(e) => updateSetting(`providers.${provider.id}.merchantKey`, e.target.value)}
                                className="wp-input pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => toggleApiKeyVisibility(provider.id)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showApiKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`${provider.id}_test`}
                            checked={providerSettings.testMode}
                            onChange={(e) => updateSetting(`providers.${provider.id}.testMode`, e.target.checked)}
                            className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                          />
                          <label htmlFor={`${provider.id}_test`} className="text-sm text-gray-700">
                            테스트 모드 사용
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Webhook & URLs */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            웹훅 및 URL 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-4">
            <div>
              <label className="wp-label">웹훅 URL</label>
              <input
                type="url"
                value={settings.webhookUrl}
                onChange={(e) => updateSetting('webhookUrl', e.target.value)}
                className="wp-input"
                placeholder="https://yourdomain.com/api/payments/webhook"
              />
              <p className="text-sm text-gray-500 mt-1">
                결제 상태 변경 시 알림을 받을 URL입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="wp-label">성공 리턴 URL</label>
                <input
                  type="url"
                  value={settings.returnUrl}
                  onChange={(e) => updateSetting('returnUrl', e.target.value)}
                  className="wp-input"
                  placeholder="https://yourdomain.com/payment/success"
                />
              </div>
              <div>
                <label className="wp-label">실패 리턴 URL</label>
                <input
                  type="url"
                  value={settings.failUrl}
                  onChange={(e) => updateSetting('failUrl', e.target.value)}
                  className="wp-input"
                  placeholder="https://yourdomain.com/payment/fail"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">수수료 설정</h3>
        </div>
        <div className="wp-card-body">
          <div className="overflow-x-auto">
            <table className="wp-table">
              <thead>
                <tr>
                  <th>결제 수단</th>
                  <th>수수료율 (%)</th>
                  <th>고정 수수료 (원)</th>
                  <th>예상 수수료 (10만원 기준)</th>
                </tr>
              </thead>
              <tbody>
                {paymentMethods
                  .filter(method => settings.enabledMethods.includes(method.id))
                  .map(method => {
                    const fee = settings.fees[method.id]
                    const calculatedFee = (100000 * fee.rate / 100) + fee.fixed
                    
                    return (
                      <tr key={method.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <method.icon className="w-4 h-4" />
                            {method.name}
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={fee.rate}
                            onChange={(e) => updateSetting(`fees.${method.id}.rate`, parseFloat(e.target.value))}
                            className="wp-input w-20"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={fee.fixed}
                            onChange={(e) => updateSetting(`fees.${method.id}.fixed`, parseInt(e.target.value))}
                            className="wp-input w-24"
                          />
                        </td>
                        <td>
                          <span className="font-medium text-gray-900">
                            {new Intl.NumberFormat('ko-KR', { 
                              style: 'currency', 
                              currency: 'KRW' 
                            }).format(calculatedFee)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentMethods