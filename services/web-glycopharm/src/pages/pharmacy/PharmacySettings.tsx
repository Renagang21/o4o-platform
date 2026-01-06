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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Palette,
  Layout,
} from 'lucide-react';
import type { StoreTemplate, StoreTheme } from '@/types/store';
import { DEFAULT_STORE_TEMPLATE, DEFAULT_STORE_THEME, THEME_METAS } from '@/types/store';

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
    // Template & Theme 설정
    template: DEFAULT_STORE_TEMPLATE as StoreTemplate,
    theme: DEFAULT_STORE_THEME as StoreTheme,
  });

  // 채널 신청·승인 상태
  // 'none' | 'requested' | 'approved' | 'rejected'
  const [deviceSettings, setDeviceSettings] = useState({
    // 키오스크
    kioskStatus: 'none' as 'none' | 'requested' | 'approved' | 'rejected',
    kioskRequestedAt: null as string | null,
    kioskApprovedAt: null as string | null,
    kioskPin: '',
    kioskAutoReset: 180,
    kioskProductLimit: 20,
    // 태블릿
    tabletStatus: 'none' as 'none' | 'requested' | 'approved' | 'rejected',
    tabletRequestedAt: null as string | null,
    tabletApprovedAt: null as string | null,
    tabletPin: '',
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

  // 키오스크 신청
  const handleKioskRequest = () => {
    if (!confirm('키오스크 주문 채널 활성화를 신청하시겠습니까?\n\n운영자 승인 후 사용할 수 있습니다.')) return;
    setDeviceSettings(prev => ({
      ...prev,
      kioskStatus: 'requested',
      kioskRequestedAt: new Date().toISOString(),
    }));
    // TODO: API 호출
    alert('키오스크 채널 신청이 완료되었습니다.\n운영자 승인을 기다려주세요.');
  };

  // 태블릿 신청
  const handleTabletRequest = () => {
    if (!confirm('태블릿 주문 채널 활성화를 신청하시겠습니까?\n\n운영자 승인 후 사용할 수 있습니다.')) return;
    setDeviceSettings(prev => ({
      ...prev,
      tabletStatus: 'requested',
      tabletRequestedAt: new Date().toISOString(),
    }));
    // TODO: API 호출
    alert('태블릿 채널 신청이 완료되었습니다.\n운영자 승인을 기다려주세요.');
  };

  // 채널 상태 뱃지 렌더링
  const renderChannelStatusBadge = (status: 'none' | 'requested' | 'approved' | 'rejected') => {
    switch (status) {
      case 'requested':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            승인 대기
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            승인됨
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            반려됨
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
            미신청
          </span>
        );
    }
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

                  {/* Template & Theme 설정 */}
                  <div className="pt-4 border-t">
                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary-500" />
                      스토어 디자인
                    </h3>

                    <div className="grid md:grid-cols-2 gap-5">
                      {/* Template 선택 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          <Layout className="w-4 h-4 inline-block mr-1" />
                          레이아웃 템플릿
                        </label>
                        <select
                          value={storeSettings.template}
                          onChange={(e) =>
                            setStoreSettings((prev) => ({
                              ...prev,
                              template: e.target.value as StoreTemplate,
                            }))
                          }
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                          <option value="franchise-standard">프랜차이즈 표준</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          스토어 페이지의 구조와 섹션 배치를 결정합니다.
                        </p>
                      </div>

                      {/* Theme 선택 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          <Palette className="w-4 h-4 inline-block mr-1" />
                          색상 테마
                        </label>
                        <select
                          value={storeSettings.theme}
                          onChange={(e) =>
                            setStoreSettings((prev) => ({
                              ...prev,
                              theme: e.target.value as StoreTheme,
                            }))
                          }
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                          {THEME_METAS.map((themeMeta) => (
                            <option key={themeMeta.id} value={themeMeta.id}>
                              {themeMeta.name}
                              {themeMeta.isRecommended ? ' (권장)' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          스토어의 색상과 스타일 인상을 결정합니다.
                        </p>
                      </div>
                    </div>

                    {/* Theme Preview with Color Swatches */}
                    {(() => {
                      const selectedThemeMeta = THEME_METAS.find(
                        (t) => t.id === storeSettings.theme
                      );
                      const swatchLabels = ['Primary', 'Accent', 'Background', 'Text'];
                      return (
                        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-medium text-slate-500">미리보기</div>
                            {selectedThemeMeta?.isDeviceOptimized && (
                              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                                키오스크/태블릿 최적화
                              </span>
                            )}
                          </div>
                          {/* Color Swatches */}
                          <div className="flex items-center gap-2 mb-3">
                            {selectedThemeMeta?.previewColors.map((color, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-1">
                                <div
                                  className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm"
                                  style={{ backgroundColor: color }}
                                  title={`${swatchLabels[idx]}: ${color}`}
                                />
                                <span className="text-[10px] text-slate-400">{swatchLabels[idx]}</span>
                              </div>
                            ))}
                          </div>
                          {/* Theme Info */}
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">
                              {selectedThemeMeta?.name} 테마
                              {selectedThemeMeta?.isRecommended && (
                                <span className="ml-1 text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                                  권장
                                </span>
                              )}
                            </span>
                            <p className="text-slate-500 mt-1 text-xs">
                              {selectedThemeMeta?.description}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 키오스크/태블릿 테마 안내 */}
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <strong>참고:</strong> 키오스크 및 태블릿 모드에서는 가독성 최적화를 위해
                        <strong> 모던 테마</strong>가 자동으로 적용됩니다.
                        약국에서 선택한 테마는 일반 웹 스토어에만 적용됩니다.
                      </p>
                    </div>
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
                  주문 채널 관리
                </h2>

                {/* 안내 문구 */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold mb-1">주문 채널 활성화 안내</p>
                      <p>키오스크/태블릿 채널은 <strong>웹 몰 판매 승인이 완료된 약국</strong>만 신청할 수 있습니다.</p>
                      <p>신청 후 운영자 승인을 거쳐 활성화됩니다.</p>
                    </div>
                  </div>
                </div>

                {/* 키오스크 섹션 */}
                <div className="p-5 bg-slate-50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        deviceSettings.kioskStatus === 'approved' ? 'bg-primary-100' : 'bg-slate-200'
                      }`}>
                        <Monitor className={`w-5 h-5 ${
                          deviceSettings.kioskStatus === 'approved' ? 'text-primary-600' : 'text-slate-500'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">키오스크 채널</p>
                          {renderChannelStatusBadge(deviceSettings.kioskStatus)}
                        </div>
                        <p className="text-sm text-slate-500">매장 내 고객 셀프 주문</p>
                      </div>
                    </div>

                    {/* 신청 버튼 (미신청 또는 반려 상태일 때) */}
                    {(deviceSettings.kioskStatus === 'none' || deviceSettings.kioskStatus === 'rejected') && (
                      <button
                        onClick={handleKioskRequest}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
                      >
                        활성화 신청
                      </button>
                    )}
                  </div>

                  {/* 승인 대기 상태 */}
                  {deviceSettings.kioskStatus === 'requested' && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600">
                        신청일: {deviceSettings.kioskRequestedAt ? new Date(deviceSettings.kioskRequestedAt).toLocaleDateString('ko-KR') : '-'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        운영자가 신청을 검토 중입니다. 승인까지 1~2 영업일이 소요될 수 있습니다.
                      </p>
                    </div>
                  )}

                  {/* 승인 완료 상태 - 설정 표시 */}
                  {deviceSettings.kioskStatus === 'approved' && (
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
                      </div>
                    </div>
                  )}
                </div>

                {/* 태블릿 섹션 */}
                <div className="p-5 bg-slate-50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        deviceSettings.tabletStatus === 'approved' ? 'bg-green-100' : 'bg-slate-200'
                      }`}>
                        <Tablet className={`w-5 h-5 ${
                          deviceSettings.tabletStatus === 'approved' ? 'text-green-600' : 'text-slate-500'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">태블릿 채널</p>
                          {renderChannelStatusBadge(deviceSettings.tabletStatus)}
                        </div>
                        <p className="text-sm text-slate-500">직원 보조 주문</p>
                      </div>
                    </div>

                    {/* 신청 버튼 */}
                    {(deviceSettings.tabletStatus === 'none' || deviceSettings.tabletStatus === 'rejected') && (
                      <button
                        onClick={handleTabletRequest}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                      >
                        활성화 신청
                      </button>
                    )}
                  </div>

                  {/* 승인 대기 상태 */}
                  {deviceSettings.tabletStatus === 'requested' && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600">
                        신청일: {deviceSettings.tabletRequestedAt ? new Date(deviceSettings.tabletRequestedAt).toLocaleDateString('ko-KR') : '-'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        운영자가 신청을 검토 중입니다. 승인까지 1~2 영업일이 소요될 수 있습니다.
                      </p>
                    </div>
                  )}

                  {/* 승인 완료 상태 */}
                  {deviceSettings.tabletStatus === 'approved' && (
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
                      </div>
                    </div>
                  )}
                </div>

                {/* 정책 안내 */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>주문 책임 안내:</strong> 키오스크/태블릿 채널을 통한 주문은 비회원 주문으로 처리되며,
                    해당 주문에 대한 모든 책임은 약국(판매자)에 있습니다. 주문 채널은 자동으로 기록됩니다.
                  </p>
                </div>

                {/* 저장 버튼 (승인된 채널이 있을 때만) */}
                {(deviceSettings.kioskStatus === 'approved' || deviceSettings.tabletStatus === 'approved') && (
                  <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    설정 저장
                  </button>
                )}
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
