import { FC, useState, useEffect } from 'react';
import { 
  Save, 
  CreditCard, 
  Truck, 
  Receipt, 
  Store, 
  Mail, 
  Package,
  DollarSign,
  MapPin,
  Phone,
  Globe,
  Bell,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { EcommerceApi } from '@/api/ecommerceApi';

interface SettingsData {
  // Store Information
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  storeCity: string;
  storeCountry: string;
  storePostalCode: string;
  
  // Payment Settings
  paymentMethods: {
    creditCard: boolean;
    paypal: boolean;
    stripe: boolean;
    toss: boolean;
    bankTransfer: boolean;
  };
  paypalEmail?: string;
  stripePublicKey?: string;
  stripeSecretKey?: string;
  tossClientKey?: string;
  tossSecretKey?: string;
  
  // Shipping Settings
  enableShipping: boolean;
  freeShippingThreshold: number;
  defaultShippingFee: number;
  shippingZones: Array<{
    name: string;
    regions: string[];
    fee: number;
  }>;
  shippingProviders: Array<{
    name: string;
    enabled: boolean;
    apiKey?: string;
  }>;
  
  // Tax Settings
  enableTax: boolean;
  taxRate: number;
  taxIncludedInPrice: boolean;
  taxName: string;
  
  // Email Notifications
  emailNotifications: {
    newOrder: boolean;
    orderShipped: boolean;
    orderCancelled: boolean;
    lowStock: boolean;
    newCustomer: boolean;
    paymentFailed: boolean;
  };
  notificationEmail: string;
  
  // Product Display Settings
  productsPerPage: number;
  enableReviews: boolean;
  requireReviewApproval: boolean;
  enableWishlist: boolean;
  enableCompare: boolean;
  showOutOfStock: boolean;
  defaultSortOrder: 'name' | 'price' | 'date' | 'popularity';
  
  // Inventory Settings
  enableStockManagement: boolean;
  lowStockThreshold: number;
  outOfStockThreshold: number;
  hideOutOfStock: boolean;
  allowBackorders: boolean;
  
  // Currency Settings
  currency: string;
  currencyPosition: 'left' | 'right';
  thousandSeparator: string;
  decimalSeparator: string;
  decimals: number;
}

const EcommerceSettings: FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    // Store Information
    storeName: '',
    storeEmail: '',
    storePhone: '',
    storeAddress: '',
    storeCity: '',
    storeCountry: 'KR',
    storePostalCode: '',
    
    // Payment Settings
    paymentMethods: {
      creditCard: true,
      paypal: false,
      stripe: false,
      toss: true,
      bankTransfer: false
    },
    
    // Shipping Settings
    enableShipping: true,
    freeShippingThreshold: 50000,
    defaultShippingFee: 3000,
    shippingZones: [],
    shippingProviders: [],
    
    // Tax Settings
    enableTax: true,
    taxRate: 10,
    taxIncludedInPrice: true,
    taxName: '부가세',
    
    // Email Notifications
    emailNotifications: {
      newOrder: true,
      orderShipped: true,
      orderCancelled: true,
      lowStock: true,
      newCustomer: false,
      paymentFailed: true
    },
    notificationEmail: '',
    
    // Product Display
    productsPerPage: 20,
    enableReviews: true,
    requireReviewApproval: true,
    enableWishlist: true,
    enableCompare: false,
    showOutOfStock: true,
    defaultSortOrder: 'date',
    
    // Inventory
    enableStockManagement: true,
    lowStockThreshold: 10,
    outOfStockThreshold: 0,
    hideOutOfStock: false,
    allowBackorders: false,
    
    // Currency
    currency: 'KRW',
    currencyPosition: 'left',
    thousandSeparator: ',',
    decimalSeparator: '.',
    decimals: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('store');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await EcommerceApi.getSettings();
      if (response.data) {
        // Merge API response with default settings to ensure all fields exist
        const mergedSettings = {
          ...settings, // Default values
          ...response.data,
          // Ensure nested objects have all required fields
          paymentMethods: {
            creditCard: true,
            paypal: false,
            stripe: false,
            toss: true,
            bankTransfer: false,
            ...(response.data as any).paymentMethods
          },
          emailNotifications: {
            newOrder: true,
            orderShipped: true,
            orderCancelled: true,
            lowStock: true,
            newCustomer: false,
            paymentFailed: true,
            ...(response.data as any).emailNotifications
          }
        };
        setSettings(mergedSettings);
      }
    } catch (error) {
      // Error log removed
      // Use default settings if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await EcommerceApi.updateSettings(settings as any);
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      // Error log removed
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...(prev as any)[parent],
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'store', label: '스토어 정보', icon: Store },
    { id: 'payment', label: '결제 설정', icon: CreditCard },
    { id: 'shipping', label: '배송 설정', icon: Truck },
    { id: 'tax', label: '세금 설정', icon: Receipt },
    { id: 'email', label: '이메일 알림', icon: Mail },
    { id: 'products', label: '상품 표시', icon: Package },
    { id: 'inventory', label: '재고 관리', icon: Shield },
    { id: 'currency', label: '통화 설정', icon: DollarSign }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">전자상거래 설정</h1>
          <p className="text-gray-600 mt-1">스토어 운영에 필요한 설정을 관리합니다</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Store Information */}
        {activeTab === 'store' && (
          <Card>
            <CardHeader>
              <CardTitle>스토어 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Store className="w-4 h-4 inline mr-1" />
                    스토어 이름
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => handleInputChange('storeName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="온라인 스토어"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    이메일
                  </label>
                  <input
                    type="email"
                    value={settings.storeEmail}
                    onChange={(e) => handleInputChange('storeEmail', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="store@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    전화번호
                  </label>
                  <input
                    type="tel"
                    value={settings.storePhone}
                    onChange={(e) => handleInputChange('storePhone', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="02-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    국가
                  </label>
                  <select
                    value={settings.storeCountry}
                    onChange={(e) => handleInputChange('storeCountry', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="KR">대한민국</option>
                    <option value="US">미국</option>
                    <option value="JP">일본</option>
                    <option value="CN">중국</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    주소
                  </label>
                  <input
                    type="text"
                    value={settings.storeAddress}
                    onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="서울특별시 강남구 테헤란로 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">도시</label>
                  <input
                    type="text"
                    value={settings.storeCity}
                    onChange={(e) => handleInputChange('storeCity', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="서울"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">우편번호</label>
                  <input
                    type="text"
                    value={settings.storePostalCode}
                    onChange={(e) => handleInputChange('storePostalCode', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="06234"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Settings */}
        {activeTab === 'payment' && (
          <Card>
            <CardHeader>
              <CardTitle>결제 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">결제 수단</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods.creditCard}
                      onChange={(e) => handleNestedChange('paymentMethods', 'creditCard', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    <CreditCard className="w-4 h-4 mr-2" />
                    신용카드
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods.toss}
                      onChange={(e) => handleNestedChange('paymentMethods', 'toss', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    토스페이먼츠
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods.paypal}
                      onChange={(e) => handleNestedChange('paymentMethods', 'paypal', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    PayPal
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods.stripe}
                      onChange={(e) => handleNestedChange('paymentMethods', 'stripe', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    Stripe
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods.bankTransfer}
                      onChange={(e) => handleNestedChange('paymentMethods', 'bankTransfer', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    무통장 입금
                  </label>
                </div>
              </div>

              {settings.paymentMethods.toss && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">토스페이먼츠 설정</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Client Key</label>
                      <input
                        type="text"
                        value={settings.tossClientKey || ''}
                        onChange={(e) => handleInputChange('tossClientKey', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="test_ck_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Secret Key</label>
                      <input
                        type="password"
                        value={settings.tossSecretKey || ''}
                        onChange={(e) => handleInputChange('tossSecretKey', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="test_sk_..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shipping Settings */}
        {activeTab === 'shipping' && (
          <Card>
            <CardHeader>
              <CardTitle>배송 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableShipping}
                  onChange={(e) => handleInputChange('enableShipping', e.target.checked)}
                  className="mr-3 rounded"
                />
                배송 기능 사용
              </label>

              {settings.enableShipping && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        무료 배송 기준 금액
                      </label>
                      <input
                        type="number"
                        value={settings.freeShippingThreshold}
                        onChange={(e) => handleInputChange('freeShippingThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        기본 배송비
                      </label>
                      <input
                        type="number"
                        value={settings.defaultShippingFee}
                        onChange={(e) => handleInputChange('defaultShippingFee', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3000"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">배송 업체</h3>
                    <div className="space-y-2">
                      {['CJ대한통운', '한진택배', '로젠택배', '우체국택배'].map(provider => (
                        <label key={provider} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-3 rounded"
                          />
                          {provider}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tax Settings */}
        {activeTab === 'tax' && (
          <Card>
            <CardHeader>
              <CardTitle>세금 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableTax}
                  onChange={(e) => handleInputChange('enableTax', e.target.checked)}
                  className="mr-3 rounded"
                />
                세금 계산 활성화
              </label>

              {settings.enableTax && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">세금 이름</label>
                      <input
                        type="text"
                        value={settings.taxName}
                        onChange={(e) => handleInputChange('taxName', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="부가세"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">세율 (%)</label>
                      <input
                        type="number"
                        value={settings.taxRate}
                        onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="10"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.taxIncludedInPrice}
                      onChange={(e) => handleInputChange('taxIncludedInPrice', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    가격에 세금 포함
                  </label>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email Notifications */}
        {activeTab === 'email' && (
          <Card>
            <CardHeader>
              <CardTitle>이메일 알림 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Bell className="w-4 h-4 inline mr-1" />
                  알림 수신 이메일
                </label>
                <input
                  type="email"
                  value={settings.notificationEmail}
                  onChange={(e) => handleInputChange('notificationEmail', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <h3 className="font-medium mb-3">알림 유형</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications.newOrder}
                      onChange={(e) => handleNestedChange('emailNotifications', 'newOrder', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    새 주문 접수
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications.orderShipped}
                      onChange={(e) => handleNestedChange('emailNotifications', 'orderShipped', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    주문 발송 완료
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications.orderCancelled}
                      onChange={(e) => handleNestedChange('emailNotifications', 'orderCancelled', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    주문 취소
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications.lowStock}
                      onChange={(e) => handleNestedChange('emailNotifications', 'lowStock', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    재고 부족 경고
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications.paymentFailed}
                      onChange={(e) => handleNestedChange('emailNotifications', 'paymentFailed', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    결제 실패
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Display Settings */}
        {activeTab === 'products' && (
          <Card>
            <CardHeader>
              <CardTitle>상품 표시 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    페이지당 상품 수
                  </label>
                  <input
                    type="number"
                    value={settings.productsPerPage}
                    onChange={(e) => handleInputChange('productsPerPage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    기본 정렬 순서
                  </label>
                  <select
                    value={settings.defaultSortOrder}
                    onChange={(e) => handleInputChange('defaultSortOrder', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="name">이름순</option>
                    <option value="price">가격순</option>
                    <option value="date">최신순</option>
                    <option value="popularity">인기순</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableReviews}
                    onChange={(e) => handleInputChange('enableReviews', e.target.checked)}
                    className="mr-3 rounded"
                  />
                  리뷰 기능 사용
                </label>
                {settings.enableReviews && (
                  <label className="flex items-center ml-6">
                    <input
                      type="checkbox"
                      checked={settings.requireReviewApproval}
                      onChange={(e) => handleInputChange('requireReviewApproval', e.target.checked)}
                      className="mr-3 rounded"
                    />
                    리뷰 승인 필요
                  </label>
                )}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableWishlist}
                    onChange={(e) => handleInputChange('enableWishlist', e.target.checked)}
                    className="mr-3 rounded"
                  />
                  위시리스트 기능 사용
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableCompare}
                    onChange={(e) => handleInputChange('enableCompare', e.target.checked)}
                    className="mr-3 rounded"
                  />
                  상품 비교 기능 사용
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showOutOfStock}
                    onChange={(e) => handleInputChange('showOutOfStock', e.target.checked)}
                    className="mr-3 rounded"
                  />
                  품절 상품 표시
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Settings */}
        {activeTab === 'inventory' && (
          <Card>
            <CardHeader>
              <CardTitle>재고 관리 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableStockManagement}
                  onChange={(e) => handleInputChange('enableStockManagement', e.target.checked)}
                  className="mr-3 rounded"
                />
                재고 관리 활성화
              </label>

              {settings.enableStockManagement && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        재고 부족 임계값
                      </label>
                      <input
                        type="number"
                        value={settings.lowStockThreshold}
                        onChange={(e) => handleInputChange('lowStockThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        품절 임계값
                      </label>
                      <input
                        type="number"
                        value={settings.outOfStockThreshold}
                        onChange={(e) => handleInputChange('outOfStockThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.hideOutOfStock}
                        onChange={(e) => handleInputChange('hideOutOfStock', e.target.checked)}
                        className="mr-3 rounded"
                      />
                      품절 상품 숨기기
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.allowBackorders}
                        onChange={(e) => handleInputChange('allowBackorders', e.target.checked)}
                        className="mr-3 rounded"
                      />
                      재고 없어도 주문 허용 (백오더)
                    </label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Currency Settings */}
        {activeTab === 'currency' && (
          <Card>
            <CardHeader>
              <CardTitle>통화 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">통화</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="KRW">원 (₩)</option>
                    <option value="USD">달러 ($)</option>
                    <option value="EUR">유로 (€)</option>
                    <option value="JPY">엔 (¥)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">통화 위치</label>
                  <select
                    value={settings.currencyPosition}
                    onChange={(e) => handleInputChange('currencyPosition', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="left">왼쪽 (₩1,000)</option>
                    <option value="right">오른쪽 (1,000₩)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">천 단위 구분자</label>
                  <input
                    type="text"
                    value={settings.thousandSeparator}
                    onChange={(e) => handleInputChange('thousandSeparator', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">소수점 구분자</label>
                  <input
                    type="text"
                    value={settings.decimalSeparator}
                    onChange={(e) => handleInputChange('decimalSeparator', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">소수 자릿수</label>
                  <input
                    type="number"
                    value={settings.decimals}
                    onChange={(e) => handleInputChange('decimals', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EcommerceSettings;