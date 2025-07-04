import React, { useState, useEffect } from 'react'
import { 
  Save,
  Plus,
  Edit,
  Trash2,
  Percent,
  MapPin,
  Building,
  Calculator,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  X,
  Search
} from 'lucide-react'
import { TaxSettings as TaxSettingsType, TaxRate } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const TaxSettings: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null)

  const [settings, setSettings] = useState<TaxSettingsType>({
    enableTax: true,
    pricesIncludeTax: false,
    taxBasedOn: 'billing',
    shippingTaxClass: 'standard',
    roundingMode: 'round',
    displayTaxTotals: 'itemized',
    taxRates: [],
    defaultTaxClass: 'standard',
    taxClasses: [
      { id: 'standard', name: '표준세율', rate: 10 },
      { id: 'reduced', name: '경감세율', rate: 5 },
      { id: 'zero', name: '영세율', rate: 0 }
    ]
  })

  const [formData, setFormData] = useState<Partial<TaxRate>>({
    country: 'KR',
    state: '',
    city: '',
    zipcode: '',
    rate: 10,
    taxClass: 'standard',
    compound: false,
    shipping: false,
    priority: 1,
    isActive: true
  })

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getSettings()
      setSettings(response.data)
    } catch (error) {
      console.error('Failed to load tax settings:', error)
      toast.error('세금 설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await EcommerceApi.updateSettings(settings)
      setHasChanges(false)
      toast.success('세금 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save tax settings:', error)
      toast.error('설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (path: string, value: any) => {
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

  const openModal = (mode: 'create' | 'edit', taxRate?: TaxRate) => {
    setModalMode(mode)
    if (taxRate) {
      setSelectedTaxRate(taxRate)
      setFormData(taxRate)
    } else {
      setSelectedTaxRate(null)
      setFormData({
        country: 'KR',
        state: '',
        city: '',
        zipcode: '',
        rate: 10,
        taxClass: 'standard',
        compound: false,
        shipping: false,
        priority: 1,
        isActive: true
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTaxRate(null)
    setFormData({})
  }

  const handleSaveTaxRate = async () => {
    try {
      setSaving(true)
      
      if (modalMode === 'create') {
        const newTaxRate = {
          ...formData,
          id: Date.now().toString()
        } as TaxRate
        
        updateSettings('taxRates', [...settings.taxRates, newTaxRate])
        toast.success('세율이 추가되었습니다.')
      } else if (modalMode === 'edit' && selectedTaxRate) {
        const updatedRates = settings.taxRates.map(rate => 
          rate.id === selectedTaxRate.id ? { ...formData, id: selectedTaxRate.id } as TaxRate : rate
        )
        updateSettings('taxRates', updatedRates)
        toast.success('세율이 수정되었습니다.')
      }
      
      closeModal()
    } catch (error) {
      console.error('Failed to save tax rate:', error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTaxRate = (taxRateId: string) => {
    if (confirm('이 세율을 삭제하시겠습니까?')) {
      const updatedRates = settings.taxRates.filter(rate => rate.id !== taxRateId)
      updateSettings('taxRates', updatedRates)
      toast.success('세율이 삭제되었습니다.')
    }
  }

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const filteredTaxRates = settings.taxRates.filter(rate => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      rate.country.toLowerCase().includes(term) ||
      rate.state?.toLowerCase().includes(term) ||
      rate.city?.toLowerCase().includes(term) ||
      rate.zipcode?.toLowerCase().includes(term)
    )
  })

  const koreanStates = [
    '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
    '경기도', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">세금 설정을 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">세금 설정</h1>
          <p className="text-gray-600 mt-1">VAT 및 지역별 세율을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSettings}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
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
                설정 저장
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

      {/* General Tax Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="wp-card-title">일반 세금 설정</h2>
        </div>
        <div className="wp-card-body space-y-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableTax"
              checked={settings.enableTax}
              onChange={(e) => updateSettings('enableTax', e.target.checked)}
              className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
            />
            <label htmlFor="enableTax" className="text-sm text-gray-700 font-medium">
              세금 계산 활성화
            </label>
          </div>

          {settings.enableTax && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">가격 표시 방식</label>
                  <select
                    value={settings.pricesIncludeTax ? 'inclusive' : 'exclusive'}
                    onChange={(e) => updateSettings('pricesIncludeTax', e.target.value === 'inclusive')}
                    className="wp-select"
                  >
                    <option value="exclusive">세금 별도 (세전 가격)</option>
                    <option value="inclusive">세금 포함 (세후 가격)</option>
                  </select>
                </div>

                <div>
                  <label className="wp-label">세금 계산 기준</label>
                  <select
                    value={settings.taxBasedOn}
                    onChange={(e) => updateSettings('taxBasedOn', e.target.value)}
                    className="wp-select"
                  >
                    <option value="billing">청구지 주소</option>
                    <option value="shipping">배송지 주소</option>
                    <option value="base">기본 주소</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">배송비 세금 분류</label>
                  <select
                    value={settings.shippingTaxClass}
                    onChange={(e) => updateSettings('shippingTaxClass', e.target.value)}
                    className="wp-select"
                  >
                    <option value="inherit">상품과 동일</option>
                    <option value="standard">표준세율</option>
                    <option value="reduced">경감세율</option>
                    <option value="zero">영세율</option>
                  </select>
                </div>

                <div>
                  <label className="wp-label">반올림 방식</label>
                  <select
                    value={settings.roundingMode}
                    onChange={(e) => updateSettings('roundingMode', e.target.value)}
                    className="wp-select"
                  >
                    <option value="round">반올림</option>
                    <option value="floor">내림</option>
                    <option value="ceil">올림</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="wp-label">세금 표시 방식</label>
                <select
                  value={settings.displayTaxTotals}
                  onChange={(e) => updateSettings('displayTaxTotals', e.target.value)}
                  className="wp-select w-full md:w-1/2"
                >
                  <option value="single">총 세금 합계만 표시</option>
                  <option value="itemized">세목별 분리 표시</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Classes */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="wp-card-title">세금 분류</h2>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {settings.taxClasses.map((taxClass) => (
              <div key={taxClass.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{taxClass.name}</h3>
                  <span className="text-sm font-medium text-blue-600">{taxClass.rate}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="defaultTaxClass"
                    checked={settings.defaultTaxClass === taxClass.id}
                    onChange={() => updateSettings('defaultTaxClass', taxClass.id)}
                    className="text-admin-blue focus:ring-admin-blue"
                  />
                  <label className="text-sm text-gray-600">기본 분류</label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tax Rates */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h2 className="wp-card-title">지역별 세율</h2>
            <button
              onClick={() => openModal('create')}
              className="wp-button-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              세율 추가
            </button>
          </div>
        </div>
        <div className="wp-card-body">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="지역으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="wp-input pl-10 max-w-md"
              />
            </div>
          </div>

          {filteredTaxRates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">등록된 세율이 없습니다</p>
              <p className="text-sm">지역별 세율을 추가해보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>국가</th>
                    <th>시/도</th>
                    <th>시/군/구</th>
                    <th>우편번호</th>
                    <th>세율</th>
                    <th>세금 분류</th>
                    <th>배송비</th>
                    <th>우선순위</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTaxRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="fi fi-kr w-4 h-4"></span>
                          <span>대한민국</span>
                        </div>
                      </td>
                      <td>{rate.state || '전체'}</td>
                      <td>{rate.city || '전체'}</td>
                      <td>{rate.zipcode || '전체'}</td>
                      <td>
                        <span className="font-medium text-blue-600">{rate.rate}%</span>
                      </td>
                      <td>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          {settings.taxClasses.find(tc => tc.id === rate.taxClass)?.name || rate.taxClass}
                        </span>
                      </td>
                      <td>
                        {rate.shipping ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                      <td>{rate.priority}</td>
                      <td>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rate.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rate.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openModal('edit', rate)}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTaxRate(rate.id)}
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

      {/* Tax Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {modalMode === 'create' ? '세율 추가' : '세율 수정'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="wp-label">국가</label>
                  <select
                    value={formData.country || 'KR'}
                    onChange={(e) => updateFormData('country', e.target.value)}
                    className="wp-select"
                  >
                    <option value="KR">대한민국</option>
                  </select>
                </div>

                <div>
                  <label className="wp-label">시/도</label>
                  <select
                    value={formData.state || ''}
                    onChange={(e) => updateFormData('state', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">전체 지역</option>
                    {koreanStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="wp-label">시/군/구</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => updateFormData('city', e.target.value)}
                    className="wp-input"
                    placeholder="선택사항"
                  />
                </div>

                <div>
                  <label className="wp-label">우편번호</label>
                  <input
                    type="text"
                    value={formData.zipcode || ''}
                    onChange={(e) => updateFormData('zipcode', e.target.value)}
                    className="wp-input"
                    placeholder="선택사항"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="wp-label">세율 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.rate || 0}
                      onChange={(e) => updateFormData('rate', parseFloat(e.target.value))}
                      className="wp-input"
                    />
                  </div>
                  <div>
                    <label className="wp-label">우선순위</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.priority || 1}
                      onChange={(e) => updateFormData('priority', parseInt(e.target.value))}
                      className="wp-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="wp-label">세금 분류</label>
                  <select
                    value={formData.taxClass || 'standard'}
                    onChange={(e) => updateFormData('taxClass', e.target.value)}
                    className="wp-select"
                  >
                    {settings.taxClasses.map(taxClass => (
                      <option key={taxClass.id} value={taxClass.id}>
                        {taxClass.name} ({taxClass.rate}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="compound"
                      checked={formData.compound || false}
                      onChange={(e) => updateFormData('compound', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="compound" className="text-sm text-gray-700">
                      복합 세금 (다른 세금 위에 계산)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="shipping"
                      checked={formData.shipping || false}
                      onChange={(e) => updateFormData('shipping', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="shipping" className="text-sm text-gray-700">
                      배송비에도 세금 적용
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive || false}
                      onChange={(e) => updateFormData('isActive', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">
                      세율 활성화
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={closeModal}
                  className="wp-button-secondary"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveTaxRate}
                  disabled={saving}
                  className="wp-button-primary"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaxSettings