import { useState } from 'react';
import {
  Store,
  Bell,
  CreditCard,
  Truck,
  Shield,
  Save,
  Eye,
  EyeOff,
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

  const tabs = [
    { id: 'store', label: '매장 정보', icon: Store },
    { id: 'notifications', label: '알림 설정', icon: Bell },
    { id: 'payment', label: '결제 설정', icon: CreditCard },
    { id: 'shipping', label: '배송 설정', icon: Truck },
    { id: 'security', label: '보안', icon: Shield },
  ];

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
