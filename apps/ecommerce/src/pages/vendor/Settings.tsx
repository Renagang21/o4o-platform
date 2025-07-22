import React, { useState } from 'react';
import { 
  Store, 
  User, 
  Bell, 
  CreditCard, 
  Truck,
  Shield,
  Save,
  Camera,
  Mail,
  Phone,
  MapPin,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea } from '@o4o/ui';
import { useAuth } from '../../hooks/useAuth';

interface StoreSettings {
  storeName: string;
  storeDescription: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  businessHours: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  notificationEmail: boolean;
  notificationSms: boolean;
  notificationPush: boolean;
  autoConfirmOrder: boolean;
  returnPeriod: number;
  shippingFee: number;
  freeShippingThreshold: number;
}

export default function VendorSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('store');
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: user?.business_name || 'My Store',
    storeDescription: '고품질 전자제품 및 액세서리를 판매하는 온라인 스토어입니다.',
    logo: '/api/placeholder/200/200',
    email: user?.email || 'store@example.com',
    phone: '02-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    businessHours: '평일 09:00 - 18:00',
    bankAccount: '1234-567-89012',
    bankName: '국민은행',
    accountHolder: user?.name || '홍길동',
    notificationEmail: true,
    notificationSms: true,
    notificationPush: false,
    autoConfirmOrder: false,
    returnPeriod: 7,
    shippingFee: 3000,
    freeShippingThreshold: 50000
  });

  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'store', name: '스토어 정보', icon: Store },
    { id: 'payment', name: '정산 정보', icon: CreditCard },
    { id: 'shipping', name: '배송 설정', icon: Truck },
    { id: 'notifications', name: '알림 설정', icon: Bell },
    { id: 'security', name: '보안 설정', icon: Shield }
  ];

  const handleSave = async () => {
    setSaving(true);
    // API 호출하여 설정 저장
    setTimeout(() => {
      setSaving(false);
      alert('설정이 저장되었습니다.');
    }, 1000);
  };

  const handleInputChange = (field: keyof StoreSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">스토어 설정</h1>
          <p className="text-gray-600 mt-1">스토어 정보와 운영 정책을 관리하세요</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* 사이드바 */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="mr-3 h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 설정 내용 */}
        <div className="flex-1">
          {activeTab === 'store' && (
            <Card>
              <CardHeader>
                <CardTitle>스토어 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 로고 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스토어 로고
                  </label>
                  <div className="flex items-center space-x-4">
                    <img
                      src={settings.logo}
                      alt="Store logo"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <Button variant="outline">
                      <Camera className="h-4 w-4 mr-2" />
                      로고 변경
                    </Button>
                  </div>
                </div>

                {/* 스토어 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스토어 이름
                  </label>
                  <Input
                    value={settings.storeName}
                    onChange={(e) => handleInputChange('storeName', e.target.value)}
                  />
                </div>

                {/* 스토어 설명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스토어 설명
                  </label>
                  <Textarea
                    rows={3}
                    value={settings.storeDescription}
                    onChange={(e) => handleInputChange('storeDescription', e.target.value)}
                  />
                </div>

                {/* 연락처 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      이메일
                    </label>
                    <Input
                      type="email"
                      value={settings.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="inline h-4 w-4 mr-1" />
                      전화번호
                    </label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                {/* 주소 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    사업장 주소
                  </label>
                  <Input
                    value={settings.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>

                {/* 영업시간 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    영업시간
                  </label>
                  <Input
                    value={settings.businessHours}
                    onChange={(e) => handleInputChange('businessHours', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle>정산 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    은행명
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                  >
                    <option>국민은행</option>
                    <option>신한은행</option>
                    <option>우리은행</option>
                    <option>하나은행</option>
                    <option>농협은행</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계좌번호
                  </label>
                  <Input
                    value={settings.bankAccount}
                    onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예금주명
                  </label>
                  <Input
                    value={settings.accountHolder}
                    onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                  />
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>주의:</strong> 정산 정보 변경 시 본인 확인 절차가 필요할 수 있습니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'shipping' && (
            <Card>
              <CardHeader>
                <CardTitle>배송 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기본 배송비
                  </label>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      value={settings.shippingFee}
                      onChange={(e) => handleInputChange('shippingFee', parseInt(e.target.value))}
                      className="w-40"
                    />
                    <span className="ml-2">원</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    무료배송 기준금액
                  </label>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      value={settings.freeShippingThreshold}
                      onChange={(e) => handleInputChange('freeShippingThreshold', parseInt(e.target.value))}
                      className="w-40"
                    />
                    <span className="ml-2">원 이상</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    반품 가능 기간
                  </label>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      value={settings.returnPeriod}
                      onChange={(e) => handleInputChange('returnPeriod', parseInt(e.target.value))}
                      className="w-40"
                    />
                    <span className="ml-2">일</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoConfirmOrder}
                      onChange={(e) => handleInputChange('autoConfirmOrder', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm">주문 자동 확인 (결제 완료 시 자동으로 주문 확정)</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>알림 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">알림 수신 방법</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notificationEmail}
                        onChange={(e) => handleInputChange('notificationEmail', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2">이메일 알림</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notificationSms}
                        onChange={(e) => handleInputChange('notificationSms', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2">SMS 알림</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notificationPush}
                        onChange={(e) => handleInputChange('notificationPush', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2">푸시 알림 (모바일 앱)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">알림 항목</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span>새 주문 알림</span>
                      <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>주문 취소 알림</span>
                      <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>상품 문의 알림</span>
                      <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>리뷰 등록 알림</span>
                      <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>재고 부족 알림</span>
                      <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>보안 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">비밀번호 변경</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">현재 비밀번호</label>
                      <Input type="password" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">새 비밀번호</label>
                      <Input type="password" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">새 비밀번호 확인</label>
                      <Input type="password" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">2단계 인증</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      계정 보안을 강화하기 위해 2단계 인증을 활성화하세요.
                    </p>
                    <Button variant="outline">2단계 인증 설정</Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">로그인 기록</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      최근 로그인: 2024-01-20 14:30 (서울, 대한민국)
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      전체 기록 보기
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}