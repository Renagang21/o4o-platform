import React, { useState, useEffect } from 'react'
import { 
  Save,
  Store,
  Globe,
  Clock,
  ImageIcon,
  ShoppingBag,
  Star,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Upload,
  X
} from 'lucide-react'
import { GeneralSettings as GeneralSettingsType } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const GeneralSettings: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'store' | 'products' | 'orders' | 'media'>('store')
  const [hasChanges, setHasChanges] = useState(false)

  const [settings, setSettings] = useState<GeneralSettingsType>({
    // Store Information
    storeName: '',
    storeDescription: '',
    storeAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'KR'
    },
    contactInfo: {
      phone: '',
      email: '',
      website: ''
    },
    businessHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '17:00', closed: false },
      sunday: { open: '10:00', close: '17:00', closed: true }
    },

    // Basic Settings
    currency: 'KRW',
    language: 'ko-KR',
    timezone: 'Asia/Seoul',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',

    // Product Settings
    enableInventoryManagement: true,
    enableReviews: true,
    enableWishlist: true,
    requiresLogin: false,
    showOutOfStock: true,
    imageSizes: {
      thumbnail: { width: 150, height: 150 },
      catalog: { width: 300, height: 300 },
      single: { width: 600, height: 600 }
    },

    // Order Settings
    orderNumberFormat: 'ORD-{YYYY}{MM}{DD}-{####}',
    defaultOrderStatus: 'pending',
    enableGuestCheckout: true,
    requireOrderNotes: false,
    autoCompleteOrders: false,
    orderRetentionDays: 365,

    // SEO Settings
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    enableSitemap: true,
    enableRichSnippets: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getGeneralSettings()
      setSettings(response.data)
    } catch (error) {
      console.error('Failed to load general settings:', error)
      toast.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await EcommerceApi.updateGeneralSettings(settings)
      setHasChanges(false)
      toast.success('설정이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save settings:', error)
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

  const resetToDefaults = () => {
    if (confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
      loadSettings()
      setHasChanges(false)
      toast.success('설정이 기본값으로 복원되었습니다.')
    }
  }

  const generateOrderNumber = () => {
    const format = settings.orderNumberFormat
    const now = new Date()
    
    return format
      .replace('{YYYY}', now.getFullYear().toString())
      .replace('{MM}', (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace('{DD}', now.getDate().toString().padStart(2, '0'))
      .replace('{####}', '0001')
  }

  const tabs = [
    { id: 'store', label: '스토어 정보', icon: Store },
    { id: 'products', label: '상품 설정', icon: ShoppingBag },
    { id: 'orders', label: '주문 설정', icon: FileText },
    { id: 'media', label: '미디어 설정', icon: ImageIcon }
  ]

  const weekdays = [
    { key: 'monday', label: '월요일' },
    { key: 'tuesday', label: '화요일' },
    { key: 'wednesday', label: '수요일' },
    { key: 'thursday', label: '목요일' },
    { key: 'friday', label: '금요일' },
    { key: 'saturday', label: '토요일' },
    { key: 'sunday', label: '일요일' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">설정을 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">일반 설정</h1>
          <p className="text-gray-600 mt-1">스토어의 기본 설정을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
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
          {activeTab === 'store' && (
            <div className="space-y-6">
              {/* Store Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  스토어 기본 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="wp-label">스토어 이름 *</label>
                    <input
                      type="text"
                      value={settings.storeName}
                      onChange={(e) => updateSetting('storeName', e.target.value)}
                      className="wp-input"
                      placeholder="우리 온라인 스토어"
                    />
                  </div>
                  <div>
                    <label className="wp-label">스토어 설명</label>
                    <textarea
                      value={settings.storeDescription}
                      onChange={(e) => updateSetting('storeDescription', e.target.value)}
                      className="wp-textarea"
                      rows={3}
                      placeholder="스토어에 대한 간단한 설명"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">주소 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="wp-label">주소</label>
                    <input
                      type="text"
                      value={settings.storeAddress.street}
                      onChange={(e) => updateSetting('storeAddress.street', e.target.value)}
                      className="wp-input"
                      placeholder="서울특별시 강남구 테헤란로 123"
                    />
                  </div>
                  <div>
                    <label className="wp-label">도시</label>
                    <input
                      type="text"
                      value={settings.storeAddress.city}
                      onChange={(e) => updateSetting('storeAddress.city', e.target.value)}
                      className="wp-input"
                      placeholder="서울"
                    />
                  </div>
                  <div>
                    <label className="wp-label">우편번호</label>
                    <input
                      type="text"
                      value={settings.storeAddress.zipCode}
                      onChange={(e) => updateSetting('storeAddress.zipCode', e.target.value)}
                      className="wp-input"
                      placeholder="06234"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">연락처 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="wp-label">전화번호</label>
                    <input
                      type="tel"
                      value={settings.contactInfo.phone}
                      onChange={(e) => updateSetting('contactInfo.phone', e.target.value)}
                      className="wp-input"
                      placeholder="02-1234-5678"
                    />
                  </div>
                  <div>
                    <label className="wp-label">이메일</label>
                    <input
                      type="email"
                      value={settings.contactInfo.email}
                      onChange={(e) => updateSetting('contactInfo.email', e.target.value)}
                      className="wp-input"
                      placeholder="contact@store.com"
                    />
                  </div>
                  <div>
                    <label className="wp-label">웹사이트</label>
                    <input
                      type="url"
                      value={settings.contactInfo.website}
                      onChange={(e) => updateSetting('contactInfo.website', e.target.value)}
                      className="wp-input"
                      placeholder="https://store.com"
                    />
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  영업시간
                </h4>
                <div className="space-y-3">
                  {weekdays.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-16 text-sm text-gray-700">{label}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!settings.businessHours[key].closed}
                          onChange={(e) => updateSetting(`businessHours.${key}.closed`, !e.target.checked)}
                          className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                        />
                        <span className="text-sm text-gray-600">영업</span>
                      </div>
                      {!settings.businessHours[key].closed && (
                        <>
                          <input
                            type="time"
                            value={settings.businessHours[key].open}
                            onChange={(e) => updateSetting(`businessHours.${key}.open`, e.target.value)}
                            className="wp-input w-24"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={settings.businessHours[key].close}
                            onChange={(e) => updateSetting(`businessHours.${key}.close`, e.target.value)}
                            className="wp-input w-24"
                          />
                        </>
                      )}
                      {settings.businessHours[key].closed && (
                        <span className="text-gray-500 text-sm">휴무</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Localization */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  지역화 설정
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="wp-label">통화</label>
                    <select
                      value={settings.currency}
                      onChange={(e) => updateSetting('currency', e.target.value)}
                      className="wp-select"
                    >
                      <option value="KRW">대한민국 원 (₩)</option>
                      <option value="USD">미국 달러 ($)</option>
                      <option value="EUR">유로 (€)</option>
                      <option value="JPY">일본 엔 (¥)</option>
                    </select>
                  </div>
                  <div>
                    <label className="wp-label">언어</label>
                    <select
                      value={settings.language}
                      onChange={(e) => updateSetting('language', e.target.value)}
                      className="wp-select"
                    >
                      <option value="ko-KR">한국어</option>
                      <option value="en-US">English (US)</option>
                      <option value="ja-JP">日本語</option>
                      <option value="zh-CN">中文 (简体)</option>
                    </select>
                  </div>
                  <div>
                    <label className="wp-label">시간대</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                      className="wp-select"
                    >
                      <option value="Asia/Seoul">아시아/서울 (KST)</option>
                      <option value="UTC">협정 세계시 (UTC)</option>
                      <option value="America/New_York">미국/뉴욕 (EST)</option>
                      <option value="Europe/London">유럽/런던 (GMT)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                상품 관련 설정
              </h3>

              {/* Product Features */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">기능 설정</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableInventory"
                      checked={settings.enableInventoryManagement}
                      onChange={(e) => updateSetting('enableInventoryManagement', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="enableInventory" className="text-sm text-gray-700">
                      재고 관리 활성화
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableReviews"
                      checked={settings.enableReviews}
                      onChange={(e) => updateSetting('enableReviews', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="enableReviews" className="text-sm text-gray-700">
                      상품 리뷰 허용
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableWishlist"
                      checked={settings.enableWishlist}
                      onChange={(e) => updateSetting('enableWishlist', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="enableWishlist" className="text-sm text-gray-700">
                      위시리스트 기능
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showOutOfStock"
                      checked={settings.showOutOfStock}
                      onChange={(e) => updateSetting('showOutOfStock', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="showOutOfStock" className="text-sm text-gray-700">
                      품절 상품도 표시
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requiresLogin"
                      checked={settings.requiresLogin}
                      onChange={(e) => updateSetting('requiresLogin', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="requiresLogin" className="text-sm text-gray-700">
                      가격 보기에 로그인 필요
                    </label>
                  </div>
                </div>
              </div>

              {/* SEO Settings */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">SEO 설정</h4>
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">사이트 제목</label>
                    <input
                      type="text"
                      value={settings.seoTitle}
                      onChange={(e) => updateSetting('seoTitle', e.target.value)}
                      className="wp-input"
                      placeholder="온라인 쇼핑몰 - 최고의 상품들"
                    />
                  </div>
                  <div>
                    <label className="wp-label">사이트 설명</label>
                    <textarea
                      value={settings.seoDescription}
                      onChange={(e) => updateSetting('seoDescription', e.target.value)}
                      className="wp-textarea"
                      rows={3}
                      placeholder="고품질 상품을 합리적인 가격에 만나보세요"
                    />
                  </div>
                  <div>
                    <label className="wp-label">키워드 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={settings.seoKeywords}
                      onChange={(e) => updateSetting('seoKeywords', e.target.value)}
                      className="wp-input"
                      placeholder="온라인쇼핑, 전자제품, 패션, 생활용품"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableSitemap"
                        checked={settings.enableSitemap}
                        onChange={(e) => updateSetting('enableSitemap', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="enableSitemap" className="text-sm text-gray-700">
                        사이트맵 자동 생성
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableRichSnippets"
                        checked={settings.enableRichSnippets}
                        onChange={(e) => updateSetting('enableRichSnippets', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="enableRichSnippets" className="text-sm text-gray-700">
                        구조화된 데이터 (리치 스니펫) 활성화
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                주문 관련 설정
              </h3>

              {/* Order Number Format */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">주문 번호 설정</h4>
                <div>
                  <label className="wp-label">주문 번호 형식</label>
                  <input
                    type="text"
                    value={settings.orderNumberFormat}
                    onChange={(e) => updateSetting('orderNumberFormat', e.target.value)}
                    className="wp-input"
                    placeholder="ORD-{YYYY}{MM}{DD}-{####}"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    사용 가능한 변수: {'{YYYY}'} (연도), {'{MM}'} (월), {'{DD}'} (일), {'{####}'} (순번)
                  </p>
                  <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <span className="text-sm text-gray-600">미리보기: </span>
                    <code className="text-sm font-mono text-gray-900">{generateOrderNumber()}</code>
                  </div>
                </div>
              </div>

              {/* Order Settings */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">주문 처리 설정</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="wp-label">기본 주문 상태</label>
                    <select
                      value={settings.defaultOrderStatus}
                      onChange={(e) => updateSetting('defaultOrderStatus', e.target.value)}
                      className="wp-select"
                    >
                      <option value="pending">대기중</option>
                      <option value="processing">처리중</option>
                      <option value="on-hold">보류</option>
                      <option value="completed">완료</option>
                    </select>
                  </div>
                  <div>
                    <label className="wp-label">주문 데이터 보관 기간 (일)</label>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.orderRetentionDays}
                      onChange={(e) => updateSetting('orderRetentionDays', parseInt(e.target.value))}
                      className="wp-input"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableGuestCheckout"
                      checked={settings.enableGuestCheckout}
                      onChange={(e) => updateSetting('enableGuestCheckout', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="enableGuestCheckout" className="text-sm text-gray-700">
                      비회원 주문 허용
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireOrderNotes"
                      checked={settings.requireOrderNotes}
                      onChange={(e) => updateSetting('requireOrderNotes', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="requireOrderNotes" className="text-sm text-gray-700">
                      주문 메모 필수 입력
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoCompleteOrders"
                      checked={settings.autoCompleteOrders}
                      onChange={(e) => updateSetting('autoCompleteOrders', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="autoCompleteOrders" className="text-sm text-gray-700">
                      배송 완료 시 주문 자동 완료
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                미디어 및 이미지 설정
              </h3>

              {/* Image Sizes */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">이미지 크기 설정</h4>
                <div className="space-y-4">
                  {Object.entries(settings.imageSizes).map(([key, size]) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-700 capitalize">
                        {key === 'thumbnail' ? '썸네일' :
                         key === 'catalog' ? '카탈로그' : '상세페이지'}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">너비:</label>
                        <input
                          type="number"
                          min="50"
                          max="2000"
                          value={size.width}
                          onChange={(e) => updateSetting(`imageSizes.${key}.width`, parseInt(e.target.value))}
                          className="wp-input w-20"
                        />
                        <span className="text-gray-500">px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">높이:</label>
                        <input
                          type="number"
                          min="50"
                          max="2000"
                          value={size.height}
                          onChange={(e) => updateSetting(`imageSizes.${key}.height`, parseInt(e.target.value))}
                          className="wp-input w-20"
                        />
                        <span className="text-gray-500">px</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  이미지 크기를 변경한 후에는 기존 이미지를 재생성해야 할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GeneralSettings