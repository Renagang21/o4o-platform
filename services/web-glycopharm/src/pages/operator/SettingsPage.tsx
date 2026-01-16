/**
 * Operator Settings Page
 *
 * 세미-프랜차이즈 운영자 설정
 * - 시스템 설정
 * - 알림 설정
 * - 서비스 정책
 */

import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Truck,
  Mail,
  Smartphone,
  Clock,
  Save,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

// Types
type TabType = 'general' | 'notifications' | 'policies' | 'integrations';

// Toggle component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// Setting row component
function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: 'GlycoPharm',
    timezone: 'Asia/Seoul',
    language: 'ko',
    maintenanceMode: false,

    // Notifications
    emailNotifications: true,
    smsNotifications: true,
    orderAlerts: true,
    lowStockAlerts: true,
    settlementAlerts: true,
    supportAlerts: true,

    // Policies
    autoApproveOrders: false,
    requirePaymentBeforeShipping: true,
    allowReturnRequest: true,
    returnPeriodDays: 7,
    settlementCycle: 'weekly',
    commissionRate: 5,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSaving(false);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">설정</h1>
          <p className="text-slate-500 text-sm">시스템 및 서비스 설정 관리</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              변경사항 저장
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              일반 설정
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'notifications'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Bell className="w-4 h-4" />
              알림 설정
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'policies'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Shield className="w-4 h-4" />
              서비스 정책
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'integrations'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Globe className="w-4 h-4" />
              연동 설정
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-1">
              <SettingRow
                icon={Globe}
                title="사이트 이름"
                description="서비스에 표시되는 사이트 이름입니다."
              >
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-48 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </SettingRow>

              <SettingRow
                icon={Clock}
                title="시간대"
                description="서비스에서 사용하는 기본 시간대입니다."
              >
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-48 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </SettingRow>

              <SettingRow
                icon={Globe}
                title="기본 언어"
                description="서비스의 기본 표시 언어입니다."
              >
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-48 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </SettingRow>

              <SettingRow
                icon={AlertCircle}
                title="유지보수 모드"
                description="활성화하면 일반 사용자의 접근이 제한됩니다."
              >
                <Toggle
                  enabled={settings.maintenanceMode}
                  onChange={() => toggleSetting('maintenanceMode')}
                />
              </SettingRow>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-1">
              <SettingRow
                icon={Mail}
                title="이메일 알림"
                description="중요한 알림을 이메일로 받습니다."
              >
                <Toggle
                  enabled={settings.emailNotifications}
                  onChange={() => toggleSetting('emailNotifications')}
                />
              </SettingRow>

              <SettingRow
                icon={Smartphone}
                title="SMS 알림"
                description="긴급한 알림을 SMS로 받습니다."
              >
                <Toggle
                  enabled={settings.smsNotifications}
                  onChange={() => toggleSetting('smsNotifications')}
                />
              </SettingRow>

              <div className="my-6 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">알림 항목</h3>
              </div>

              <SettingRow
                icon={Bell}
                title="주문 알림"
                description="새로운 주문이 접수되면 알림을 받습니다."
              >
                <Toggle
                  enabled={settings.orderAlerts}
                  onChange={() => toggleSetting('orderAlerts')}
                />
              </SettingRow>

              <SettingRow
                icon={Bell}
                title="재고 부족 알림"
                description="재고가 최소 수량 이하로 떨어지면 알림을 받습니다."
              >
                <Toggle
                  enabled={settings.lowStockAlerts}
                  onChange={() => toggleSetting('lowStockAlerts')}
                />
              </SettingRow>

              <SettingRow
                icon={Bell}
                title="정산 알림"
                description="정산 처리 관련 알림을 받습니다."
              >
                <Toggle
                  enabled={settings.settlementAlerts}
                  onChange={() => toggleSetting('settlementAlerts')}
                />
              </SettingRow>

              <SettingRow
                icon={Bell}
                title="고객지원 알림"
                description="새로운 문의나 티켓이 접수되면 알림을 받습니다."
              >
                <Toggle
                  enabled={settings.supportAlerts}
                  onChange={() => toggleSetting('supportAlerts')}
                />
              </SettingRow>
            </div>
          )}

          {/* Policy Settings */}
          {activeTab === 'policies' && (
            <div className="space-y-1">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">주문 정책</h3>
              </div>

              <SettingRow
                icon={Shield}
                title="주문 자동 승인"
                description="결제 완료 시 주문을 자동으로 승인합니다."
              >
                <Toggle
                  enabled={settings.autoApproveOrders}
                  onChange={() => toggleSetting('autoApproveOrders')}
                />
              </SettingRow>

              <SettingRow
                icon={CreditCard}
                title="선결제 필수"
                description="배송 전 결제가 완료되어야 합니다."
              >
                <Toggle
                  enabled={settings.requirePaymentBeforeShipping}
                  onChange={() => toggleSetting('requirePaymentBeforeShipping')}
                />
              </SettingRow>

              <SettingRow
                icon={Truck}
                title="반품 요청 허용"
                description="약국의 반품 요청을 허용합니다."
              >
                <Toggle
                  enabled={settings.allowReturnRequest}
                  onChange={() => toggleSetting('allowReturnRequest')}
                />
              </SettingRow>

              <SettingRow
                icon={Clock}
                title="반품 가능 기간"
                description="배송 완료 후 반품 요청 가능 기간입니다."
              >
                <select
                  value={settings.returnPeriodDays}
                  onChange={(e) => setSettings({ ...settings, returnPeriodDays: Number(e.target.value) })}
                  className="w-32 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value={3}>3일</option>
                  <option value={7}>7일</option>
                  <option value={14}>14일</option>
                  <option value={30}>30일</option>
                </select>
              </SettingRow>

              <div className="my-6 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">정산 정책</h3>
              </div>

              <SettingRow
                icon={Clock}
                title="정산 주기"
                description="약국 정산이 진행되는 주기입니다."
              >
                <select
                  value={settings.settlementCycle}
                  onChange={(e) => setSettings({ ...settings, settlementCycle: e.target.value })}
                  className="w-32 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="biweekly">격주</option>
                  <option value="monthly">매월</option>
                </select>
              </SettingRow>

              <SettingRow
                icon={CreditCard}
                title="기본 수수료율"
                description="약국 매출에 적용되는 기본 수수료율입니다."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.commissionRate}
                    onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
                    className="w-20 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-right"
                    min={0}
                    max={100}
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </SettingRow>
            </div>
          )}

          {/* Integration Settings */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">이메일 서비스 (SendGrid)</h3>
                      <p className="text-sm text-slate-500">이메일 발송 서비스 연동</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">연결됨</span>
                    <button className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">SMS 서비스 (Twilio)</h3>
                      <p className="text-sm text-slate-500">SMS 발송 서비스 연동</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">연결됨</span>
                    <button className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">결제 서비스 (토스페이먼츠)</h3>
                      <p className="text-sm text-slate-500">온라인 결제 서비스 연동</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">연결됨</span>
                    <button className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">배송 서비스 (CJ대한통운)</h3>
                      <p className="text-sm text-slate-500">배송 추적 서비스 연동</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">미연결</span>
                    <button className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
