/**
 * EmailNotificationSettingsPage - 서비스 운영자 이메일 알림 설정
 *
 * 각 서비스 운영자가 관리:
 * - 운영자 이메일 주소 설정
 * - 알림 유형별 수신 설정
 * - 가입 신청 알림, 문의 알림 등
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Mail, Settings, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationSettings {
  operatorEmail: string;
  operatorEmailSecondary: string;
  notifications: {
    registrationRequest: boolean;
    partnerApplication: boolean;
    supplierApplication: boolean;
    contactInquiry: boolean;
    systemAlert: boolean;
    dailyReport: boolean;
  };
}

const defaultSettings: NotificationSettings = {
  operatorEmail: '',
  operatorEmailSecondary: '',
  notifications: {
    registrationRequest: true,
    partnerApplication: true,
    supplierApplication: true,
    contactInquiry: true,
    systemAlert: true,
    dailyReport: false,
  },
};

const notificationTypes = [
  {
    key: 'registrationRequest' as const,
    label: '회원가입 신청',
    description: '새로운 회원가입 신청이 접수되면 알림을 받습니다.',
  },
  {
    key: 'partnerApplication' as const,
    label: '파트너 신청',
    description: '새로운 파트너 가입 신청이 접수되면 알림을 받습니다.',
  },
  {
    key: 'supplierApplication' as const,
    label: '공급자 신청',
    description: '새로운 공급자 가입 신청이 접수되면 알림을 받습니다.',
  },
  {
    key: 'contactInquiry' as const,
    label: '문의 접수',
    description: '새로운 문의가 접수되면 알림을 받습니다.',
  },
  {
    key: 'systemAlert' as const,
    label: '시스템 알림',
    description: '중요 시스템 알림 (오류, 보안 등)을 받습니다.',
  },
  {
    key: 'dailyReport' as const,
    label: '일일 리포트',
    description: '매일 운영 현황 요약을 이메일로 받습니다.',
  },
];

export default function EmailNotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/operator/settings/notifications`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.operatorEmail) {
      setMessage({ type: 'error', text: '운영자 이메일 주소를 입력해주세요.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/operator/settings/notifications`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '알림 설정이 저장되었습니다.' });
      } else {
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '서버 연결에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">설정을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link to="/operator" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-gray-900">이메일 알림 설정</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">이메일 알림 설정</h1>
          <p className="text-gray-500 mt-1">
            서비스 운영에 관한 알림 이메일 수신 설정을 관리합니다.
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success'
              ? <CheckCircle className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />
            }
            <span>{message.text}</span>
          </div>
        )}

        {/* Operator Email Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">운영자 이메일</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기본 운영자 이메일 *
              </label>
              <input
                type="email"
                value={settings.operatorEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, operatorEmail: e.target.value }))}
                placeholder="operator@company.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                가입 신청 등 중요 알림이 이 주소로 발송됩니다.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                보조 운영자 이메일 (선택)
              </label>
              <input
                type="email"
                value={settings.operatorEmailSecondary}
                onChange={(e) => setSettings(prev => ({ ...prev, operatorEmailSecondary: e.target.value }))}
                placeholder="operator2@company.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                중요 알림을 참조로 함께 받을 추가 이메일 주소입니다.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">알림 유형 설정</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {notificationTypes.map((type) => (
              <div key={type.key} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.description}</div>
                </div>
                <button
                  onClick={() => handleToggle(type.key)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.notifications[type.key] ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.notifications[type.key] ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
          <h3 className="font-medium text-amber-900 mb-2">이메일 발송 설정 확인</h3>
          <p className="text-sm text-amber-700">
            이메일 알림을 받으려면 플랫폼 관리자가 SMTP 설정을 완료해야 합니다.
            이메일이 발송되지 않는 경우 플랫폼 관리자에게 문의하세요.
          </p>
        </div>
      </main>
    </div>
  );
}
