import React, { useState, useEffect } from 'react'
import { 
  Save,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Truck,
  Package,
  Clock,
  DollarSign,
  Settings,
  AlertCircle,
  CheckCircle,
  Map,
  Calculator,
  Store
} from 'lucide-react'
import { ShippingZone, ShippingMethod, ShippingSettings } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const ShippingZones: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null)
  const [showCalculator, setShowCalculator] = useState(false)

  const [settings, setSettings] = useState<ShippingSettings>({
    enableShipping: true,
    enableFreeShipping: true,
    freeShippingThreshold: 50000,
    defaultShippingClass: 'standard',
    enableShippingCalculator: true,
    enablePickup: true,
    pickupInstructions: '매장에서 직접 수령 가능합니다.',
    
    zones: [
      {
        id: 'zone_1',
        name: '전국',
        description: '전국 배송 (제주도, 산간지역 제외)',
        regions: ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남'],
        methods: [
          {
            id: 'standard',
            name: '일반택배',
            description: '2-3일 배송',
            enabled: true,
            cost: 3000,
            freeThreshold: 50000,
            estimatedDays: '2-3',
            icon: 'package'
          },
          {
            id: 'express',
            name: '당일배송',
            description: '당일 배송 (오후 2시 이전 주문)',
            enabled: true,
            cost: 5000,
            freeThreshold: 100000,
            estimatedDays: '당일',
            icon: 'truck',
            conditions: {
              cutoffTime: '14:00',
              availableRegions: ['서울', '경기', '인천']
            }
          }
        ]
      },
      {
        id: 'zone_2',
        name: '제주도',
        description: '제주도 지역',
        regions: ['제주'],
        methods: [
          {
            id: 'jeju_standard',
            name: '제주 택배',
            description: '3-4일 배송',
            enabled: true,
            cost: 5000,
            freeThreshold: 70000,
            estimatedDays: '3-4',
            icon: 'package'
          }
        ]
      },
      {
        id: 'zone_3',
        name: '산간지역',
        description: '산간지역 추가 배송비',
        regions: ['산간지역'],
        methods: [
          {
            id: 'mountain_standard',
            name: '산간 택배',
            description: '4-5일 배송',
            enabled: true,
            cost: 4000,
            additionalCost: 2000,
            freeThreshold: 80000,
            estimatedDays: '4-5',
            icon: 'package'
          }
        ]
      }
    ],

    weightRules: [
      { maxWeight: 5, cost: 0 },
      { maxWeight: 10, cost: 1000 },
      { maxWeight: 20, cost: 2000 }
    ],

    pickup: {
      enabled: true,
      locations: [
        {
          id: 'store_1',
          name: '본점',
          address: '서울특별시 강남구 테헤란로 123',
          phone: '02-1234-5678',
          hours: '평일 09:00-18:00, 토요일 10:00-17:00',
          instructions: '1층 고객센터에서 수령'
        }
      ]
    }
  })

  const [calculator, setCalculator] = useState({
    weight: 0,
    region: '서울',
    orderAmount: 0
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getShippingSettings()
      setSettings(response.data)
    } catch (error) {
      console.error('Failed to load shipping settings:', error)
      toast.error('배송 설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await EcommerceApi.updateShippingSettings(settings)
      setHasChanges(false)
      toast.success('배송 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save shipping settings:', error)
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

  const addZone = () => {
    const newZone: ShippingZone = {
      id: `zone_${Date.now()}`,
      name: '새 배송 지역',
      description: '',
      regions: [],
      methods: []
    }
    setEditingZone(newZone)
  }

  const saveZone = (zone: ShippingZone) => {
    const existingIndex = settings.zones.findIndex(z => z.id === zone.id)
    if (existingIndex >= 0) {
      const updatedZones = [...settings.zones]
      updatedZones[existingIndex] = zone
      updateSetting('zones', updatedZones)
    } else {
      updateSetting('zones', [...settings.zones, zone])
    }
    setEditingZone(null)
  }

  const deleteZone = (zoneId: string) => {
    if (confirm('이 배송 지역을 삭제하시겠습니까?')) {
      const updatedZones = settings.zones.filter(z => z.id !== zoneId)
      updateSetting('zones', updatedZones)
    }
  }

  const addMethod = (zoneId: string) => {
    const newMethod: ShippingMethod = {
      id: `method_${Date.now()}`,
      name: '새 배송 방법',
      description: '',
      enabled: true,
      cost: 0,
      estimatedDays: '1-2',
      icon: 'package'
    }
    setEditingMethod(newMethod)
  }

  const calculateShippingCost = () => {
    const zone = settings.zones.find(z => z.regions.includes(calculator.region))
    if (!zone) return 0

    let baseCost = 0
    for (const method of zone.methods) {
      if (method.enabled) {
        baseCost = method.cost
        if (method.freeThreshold && calculator.orderAmount >= method.freeThreshold) {
          baseCost = 0
        }
        break
      }
    }

    // Weight-based additional cost
    const weightRule = settings.weightRules.find(rule => calculator.weight <= rule.maxWeight)
    const weightCost = weightRule ? weightRule.cost : settings.weightRules[settings.weightRules.length - 1].cost

    return baseCost + weightCost
  }

  const getMethodIcon = (iconName: string) => {
    const icons = {
      package: Package,
      truck: Truck,
      store: Store,
      clock: Clock
    }
    return icons[iconName] || Package
  }

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
        <span className="ml-2 text-gray-600">배송 설정을 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">배송 지역 및 방법</h1>
          <p className="text-gray-600 mt-1">배송 지역별 방법과 요금을 설정합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="wp-button-secondary"
          >
            <Calculator className="w-4 h-4 mr-2" />
            배송비 계산기
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

      {/* Shipping Calculator */}
      {showCalculator && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              배송비 계산기
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="wp-label">배송 지역</label>
                <select
                  value={calculator.region}
                  onChange={(e) => setCalculator(prev => ({ ...prev, region: e.target.value }))}
                  className="wp-select"
                >
                  {settings.zones.flatMap(zone => 
                    zone.regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="wp-label">무게 (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={calculator.weight}
                  onChange={(e) => setCalculator(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
                  className="wp-input"
                />
              </div>
              <div>
                <label className="wp-label">주문 금액</label>
                <input
                  type="number"
                  min="0"
                  value={calculator.orderAmount}
                  onChange={(e) => setCalculator(prev => ({ ...prev, orderAmount: parseInt(e.target.value) }))}
                  className="wp-input"
                />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-900">
                예상 배송비: {formatPrice(calculateShippingCost())}
              </div>
              {settings.freeShippingThreshold && calculator.orderAmount >= settings.freeShippingThreshold && (
                <div className="text-sm text-green-600 mt-1">
                  무료배송 조건 충족!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">일반 배송 설정</h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableShipping"
                checked={settings.enableShipping}
                onChange={(e) => updateSetting('enableShipping', e.target.checked)}
                className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
              />
              <label htmlFor="enableShipping" className="text-sm text-gray-700">
                배송 서비스 활성화
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableFreeShipping"
                checked={settings.enableFreeShipping}
                onChange={(e) => updateSetting('enableFreeShipping', e.target.checked)}
                className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
              />
              <label htmlFor="enableFreeShipping" className="text-sm text-gray-700">
                무료배송 활성화
              </label>
            </div>

            {settings.enableFreeShipping && (
              <div className="ml-6">
                <label className="wp-label">무료배송 최소 주문금액</label>
                <input
                  type="number"
                  min="0"
                  value={settings.freeShippingThreshold}
                  onChange={(e) => updateSetting('freeShippingThreshold', parseInt(e.target.value))}
                  className="wp-input w-40"
                />
                <span className="ml-2 text-sm text-gray-500">원</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enablePickup"
                checked={settings.enablePickup}
                onChange={(e) => updateSetting('enablePickup', e.target.checked)}
                className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
              />
              <label htmlFor="enablePickup" className="text-sm text-gray-700">
                매장픽업 허용
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Zones */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h3 className="wp-card-title flex items-center gap-2">
              <Map className="w-5 h-5" />
              배송 지역 관리
            </h3>
            <button
              onClick={addZone}
              className="wp-button-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              지역 추가
            </button>
          </div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-4">
            {settings.zones.map((zone) => (
              <div key={zone.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{zone.name}</h4>
                    <p className="text-sm text-gray-600">{zone.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {zone.regions.map((region) => (
                        <span key={region} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingZone(zone)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Shipping Methods */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-700">배송 방법</h5>
                    <button
                      onClick={() => addMethod(zone.id)}
                      className="wp-button-secondary text-sm"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      방법 추가
                    </button>
                  </div>
                  {zone.methods.map((method) => {
                    const IconComponent = getMethodIcon(method.icon)
                    return (
                      <div key={method.id} className={`flex items-center justify-between p-3 border rounded ${method.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-4 h-4 text-gray-600" />
                          <div>
                            <div className="font-medium text-gray-900">{method.name}</div>
                            <div className="text-sm text-gray-600">{method.description}</div>
                            <div className="text-sm text-gray-500">
                              {formatPrice(method.cost)} 
                              {method.freeThreshold && ` (${formatPrice(method.freeThreshold)} 이상 무료)`}
                              {method.additionalCost && ` + ${formatPrice(method.additionalCost)} 추가`}
                              • 예상 배송: {method.estimatedDays}일
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={method.enabled}
                            onChange={(e) => {
                              const updatedZones = settings.zones.map(z => 
                                z.id === zone.id 
                                  ? {
                                      ...z,
                                      methods: z.methods.map(m =>
                                        m.id === method.id ? { ...m, enabled: e.target.checked } : m
                                      )
                                    }
                                  : z
                              )
                              updateSetting('zones', updatedZones)
                            }}
                            className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                          />
                          <button
                            onClick={() => setEditingMethod(method)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weight Rules */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">무게별 추가 요금</h3>
        </div>
        <div className="wp-card-body">
          <div className="overflow-x-auto">
            <table className="wp-table">
              <thead>
                <tr>
                  <th>최대 무게 (kg)</th>
                  <th>추가 요금</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {settings.weightRules.map((rule, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={rule.maxWeight}
                        onChange={(e) => {
                          const updatedRules = [...settings.weightRules]
                          updatedRules[index].maxWeight = parseFloat(e.target.value)
                          updateSetting('weightRules', updatedRules)
                        }}
                        className="wp-input w-20"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={rule.cost}
                        onChange={(e) => {
                          const updatedRules = [...settings.weightRules]
                          updatedRules[index].cost = parseInt(e.target.value)
                          updateSetting('weightRules', updatedRules)
                        }}
                        className="wp-input w-24"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          const updatedRules = settings.weightRules.filter((_, i) => i !== index)
                          updateSetting('weightRules', updatedRules)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => {
                const newRule = { maxWeight: 0, cost: 0 }
                updateSetting('weightRules', [...settings.weightRules, newRule])
              }}
              className="wp-button-secondary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              규칙 추가
            </button>
          </div>
        </div>
      </div>

      {/* Pickup Locations */}
      {settings.enablePickup && (
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center gap-2">
              <Store className="w-5 h-5" />
              매장픽업 위치
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-4">
              {settings.pickup.locations.map((location, index) => (
                <div key={location.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">매장명</label>
                      <input
                        type="text"
                        value={location.name}
                        onChange={(e) => {
                          const updatedLocations = [...settings.pickup.locations]
                          updatedLocations[index].name = e.target.value
                          updateSetting('pickup.locations', updatedLocations)
                        }}
                        className="wp-input"
                      />
                    </div>
                    <div>
                      <label className="wp-label">전화번호</label>
                      <input
                        type="tel"
                        value={location.phone}
                        onChange={(e) => {
                          const updatedLocations = [...settings.pickup.locations]
                          updatedLocations[index].phone = e.target.value
                          updateSetting('pickup.locations', updatedLocations)
                        }}
                        className="wp-input"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="wp-label">주소</label>
                      <input
                        type="text"
                        value={location.address}
                        onChange={(e) => {
                          const updatedLocations = [...settings.pickup.locations]
                          updatedLocations[index].address = e.target.value
                          updateSetting('pickup.locations', updatedLocations)
                        }}
                        className="wp-input"
                      />
                    </div>
                    <div>
                      <label className="wp-label">운영시간</label>
                      <input
                        type="text"
                        value={location.hours}
                        onChange={(e) => {
                          const updatedLocations = [...settings.pickup.locations]
                          updatedLocations[index].hours = e.target.value
                          updateSetting('pickup.locations', updatedLocations)
                        }}
                        className="wp-input"
                      />
                    </div>
                    <div>
                      <label className="wp-label">픽업 안내</label>
                      <input
                        type="text"
                        value={location.instructions}
                        onChange={(e) => {
                          const updatedLocations = [...settings.pickup.locations]
                          updatedLocations[index].instructions = e.target.value
                          updateSetting('pickup.locations', updatedLocations)
                        }}
                        className="wp-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Zone Edit Modal */}
      {editingZone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingZone.id.startsWith('zone_') && editingZone.id !== `zone_${Date.now()}` ? '지역 편집' : '새 지역 추가'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="wp-label">지역명</label>
                  <input
                    type="text"
                    value={editingZone.name}
                    onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                    className="wp-input"
                  />
                </div>
                <div>
                  <label className="wp-label">설명</label>
                  <textarea
                    value={editingZone.description}
                    onChange={(e) => setEditingZone({ ...editingZone, description: e.target.value })}
                    className="wp-textarea"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="wp-label">포함 지역 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={editingZone.regions.join(', ')}
                    onChange={(e) => setEditingZone({ 
                      ...editingZone, 
                      regions: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                    })}
                    className="wp-input"
                    placeholder="서울, 부산, 대구"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  onClick={() => setEditingZone(null)}
                  className="wp-button-secondary"
                >
                  취소
                </button>
                <button
                  onClick={() => saveZone(editingZone)}
                  className="wp-button-primary"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShippingZones