import { useState } from 'react';
import {
  Store,
  Bell,
  CreditCard,
  Truck,
  Shield,
  Save,
  Monitor,
  Tablet,
  Copy,
  ExternalLink,
} from 'lucide-react';

export default function PharmacySettings() {
  const [activeTab, setActiveTab] = useState('store');
  const [storeSettings, setStoreSettings] = useState({
    storeName: '건강약국',
    storeSlug: 'pharmacy-1',
    description: '혈당관리 전문 약국입니다. 당뇨 관련 모든 제품을 만나보세요.',
    phone: '02-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    businessNumber: '123-45-67890',
    isStoreActive: true,
  });

  const [deviceSettings, setDeviceSettings] = useState({
    kioskEnabled: false,
    tabletEnabled: false,
    kioskPin: '',
    tabletPin: '',
    kioskAutoReset: 180, // seconds
    kioskProductLimit: 20, // 키오스크에 표시할 상품 수 제한
  });

  const tabs = [
    { id: 'store', label: '매장 정보', icon: Store },
    { id: 'devices', label: '키오스크/태블릿', icon: Monitor },
    { id: 'notifications', label: '알림 설정', icon: Bell },
    { id: 'payment', label: '결제 설정', icon: CreditCard },
    { id: 'shipping', label: '배송 설정', icon: Truck },
    { id: 'security', label: '보안', icon: Shield },
  ];

  // URL 복사 함수
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL이 복사되었습니다.');
  };

  // 기본 URL
  const baseUrl = window.location.origin;
  const kioskUrl = `${baseUrl}/store/${storeSettings.storeSlug}/kiosk`;
  const tabletUrl = `${baseUrl}/store/${storeSettings.storeSlug}/tablet`;

  const handleSave = () => {
    // TODO: Implement save API
    alert('설정이 저장되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">설정</h1>
        <p className="text-slate-500 text-sm">약국 운영에 필요한 설정을 관리하세요</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="bg-white rounded-2xl shadow-sm p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {activeTab === 'store' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="text-lg font-semibold text-slate-800">매장 정보</h2>
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">매장 공개</span>
                    <button
                      onClick={() =>
                        setStoreSettings((prev) => ({
                          ...prev,
                          isStoreActive: !prev.isStoreActive,
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        storeSettings.isStoreActive ? 'bg-primary-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          storeSettings.isStoreActive ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      약국명
                    </label>
                    <input
                      type="text"
                      value={storeSettings.storeName}
                      onChange={(e) =>
                        setStoreSettings((prev) => ({ ...prev, storeName: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      매장 URL
                    </label>
                    <div className="flex items-center">
                      <span className="px-4 py-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-sm">
                        glycopharm.co.kr/store/
                      </span>
                      <input
                        type="text"
                        value={storeSettings.storeSlug}
                        onChange={(e) =>
                          setStoreSettings((prev) => ({ ...prev, storeSlug: e.target.value }))
                        }
                        className="flex-1 px-4 py-3 rounded-r-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      매장 소개
                    </label>
                    <textarea
                      value={storeSettings.description}
                      onChange={(e) =>
                        setStoreSettings((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        연락처
                      </label>
                      <input
                        type="tel"
                        value={storeSettings.phone}
                        onChange={(e) =>
                          setStoreSettings((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        사업자등록번호
                      </label>
                      <input
                        type="text"
                        value={storeSettings.businessNumber}
                        onChange={(e) =>
                          setStoreSettings((prev) => ({
                            ...prev,
                            businessNumber: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      주소
                    </label>
                    <input
                      type="text"
                      value={storeSettings.address}
                      onChange={(e) =>
                        setStoreSettings((prev) => ({ ...prev, address: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  저장하기
                </button>
              </div>
            )}

            {activeTab === 'devices' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-4">
                  키오스크 / 태블릿 설정
                </h2>

                {/* 키오스크 섹션 */}
                <div className="p-5 bg-slate-50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">키오스크 모드</p>
                        <p className="text-sm text-slate-500">매장 내 고객 셀프 주문</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setDeviceSettings((prev) => ({
                          ...prev,
                          kioskEnabled: !prev.kioskEnabled,
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        deviceSettings.kioskEnabled ? 'bg-primary-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          deviceSettings.kioskEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {deviceSettings.kioskEnabled && (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      {/* 키오스크 URL */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          키오스크 URL
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={kioskUrl}
                            readOnly
                            className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-600"
                          />
                          <button
                            onClick={() => copyToClipboard(kioskUrl)}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                            title="URL 복사"
                          >
                            <Copy className="w-4 h-4 text-slate-600" />
                          </button>
                          <a
                            href={kioskUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                            title="새 창에서 열기"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-600" />
                          </a>
                        </div>
                      </div>

                      {/* 자동 리셋 시간 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          자동 리셋 시간 (초)
                        </label>
                        <input
                          type="number"
                          value={deviceSettings.kioskAutoReset}
                          onChange={(e) =>
                            setDeviceSettings((prev) => ({
                              ...prev,
                              kioskAutoReset: parseInt(e.target.value) || 180,
                            }))
                          }
                          min={60}
                          max={600}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          일정 시간 동안 활동이 없으면 화면이 초기화됩니다 (60~600초)
                        </p>
                      </div>

                      {/* 상품 제한 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          표시 상품 수 제한
                        </label>
                        <input
                          type="number"
                          value={deviceSettings.kioskProductLimit}
                          onChange={(e) =>
                            setDeviceSettings((prev) => ({
                              ...prev,
                              kioskProductLimit: parseInt(e.target.value) || 20,
                            }))
                          }
                          min={5}
                          max={50}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          키오스크에 표시할 인기 상품 수 (5~50개)
                        </p>
                      </div>

                      {/* 접근 PIN */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          관리자 PIN (선택)
                        </label>
                        <input
                          type="password"
                          value={deviceSettings.kioskPin}
                          onChange={(e) =>
                            setDeviceSettings((prev) => ({
                              ...prev,
                              kioskPin: e.target.value,
                            }))
                          }
                          placeholder="4자리 숫자"
                          maxLength={4}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          키오스크 설정 변경 시 필요한 PIN (비워두면 PIN 없이 접근 가능)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 태블릿 섹션 */}
                <div className="p-5 bg-slate-50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Tablet className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">태블릿 모드</p>
                        <p className="text-sm text-slate-500">직원 보조 주문</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setDeviceSettings((prev) => ({
                          ...prev,
                          tabletEnabled: !prev.tabletEnabled,
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        deviceSettings.tabletEnabled ? 'bg-green-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          deviceSettings.tabletEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {deviceSettings.tabletEnabled && (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      {/* 태블릿 URL */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          태블릿 URL
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tabletUrl}
                            readOnly
                            className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-600"
                          />
                          <button
                            onClick={() => copyToClipboard(tabletUrl)}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                            title="URL 복사"
                          >
                            <Copy className="w-4 h-4 text-slate-600" />
                          </button>
                          <a
                            href={tabletUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                            title="새 창에서 열기"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-600" />
                          </a>
                        </div>
                      </div>

                      {/* 접근 PIN */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          직원 PIN (선택)
                        </label>
                        <input
                          type="password"
                          value={deviceSettings.tabletPin}
                          onChange={(e) =>
                            setDeviceSettings((prev) => ({
                              ...prev,
                              tabletPin: e.target.value,
                            }))
                          }
                          placeholder="4자리 숫자"
                          maxLength={4}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          태블릿 접근 시 필요한 PIN (비워두면 PIN 없이 접근 가능)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 안내 문구 */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>안내:</strong> 키오스크/태블릿 모드에서의 주문은 비회원 주문으로 처리되며,
                    모든 주문 책임은 약국(판매자)에 있습니다. 주문 채널은 자동으로 기록됩니다.
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  설정 저장
                </button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-4">
                  알림 설정
                </h2>
                <div className="space-y-4">
                  {[
                    { label: '신규 주문 알림', description: '새로운 주문이 들어오면 알림을 받습니다', enabled: true },
                    { label: '재고 부족 알림', description: '상품 재고가 부족할 때 알림을 받습니다', enabled: true },
                    { label: '리뷰 알림', description: '새로운 리뷰가 등록되면 알림을 받습니다', enabled: false },
                    { label: '마케팅 알림', description: '프로모션 및 이벤트 정보를 받습니다', enabled: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                      <button
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          item.enabled ? 'bg-primary-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            item.enabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-4">
                  결제 설정
                </h2>
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">결제 설정 기능은 준비 중입니다.</p>
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-4">
                  배송 설정
                </h2>
                <div className="text-center py-12">
                  <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">배송 설정 기능은 준비 중입니다.</p>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-4">
                  보안 설정
                </h2>
                <div className="space-y-4">
                  <button className="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-slate-100 transition-colors">
                    <p className="font-medium text-slate-800">비밀번호 변경</p>
                    <p className="text-sm text-slate-500">계정 비밀번호를 변경합니다</p>
                  </button>
                  <button className="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-slate-100 transition-colors">
                    <p className="font-medium text-slate-800">2단계 인증</p>
                    <p className="text-sm text-slate-500">추가 보안을 위해 2단계 인증을 설정합니다</p>
                  </button>
                  <button className="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-slate-100 transition-colors">
                    <p className="font-medium text-slate-800">로그인 기록</p>
                    <p className="text-sm text-slate-500">최근 로그인 기록을 확인합니다</p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
