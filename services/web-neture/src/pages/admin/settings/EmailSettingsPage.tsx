/**
 * EmailSettingsPage - 플랫폼 이메일/SMTP 설정
 *
 * 관리자 전용: 전체 서비스가 사용하는 SMTP 설정
 * - SMTP 서버 설정
 * - 발신자 이메일 설정
 * - 테스트 이메일 발송
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Server, Shield, Send, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

const defaultSettings: SmtpSettings = {
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromEmail: '',
  fromName: 'Neture Platform',
  enabled: false,
};

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/admin/settings/email`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/admin/settings/email`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'SMTP 설정이 저장되었습니다.' });
      } else {
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '서버 연결에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: '테스트 이메일 주소를 입력해주세요.' });
      return;
    }

    try {
      setTesting(true);
      setMessage(null);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/admin/settings/email/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `테스트 이메일이 ${testEmail}로 발송되었습니다.` });
      } else {
        setMessage({ type: 'error', text: data.error || '이메일 발송에 실패했습니다.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '서버 연결에 실패했습니다.' });
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field: keyof SmtpSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
            <Link to="/admin" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-gray-900">이메일 설정</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">플랫폼 이메일 설정</h1>
          <p className="text-gray-500 mt-1">
            전체 서비스에서 사용할 SMTP 서버 및 발신 설정을 관리합니다.
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

        {/* SMTP Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Server className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">SMTP 서버 설정</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <div className="font-medium text-gray-900">이메일 서비스 활성화</div>
                <div className="text-sm text-gray-500">이메일 발송 기능을 활성화합니다</div>
              </div>
              <button
                onClick={() => handleChange('enabled', !settings.enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.enabled ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.enabled ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Host & Port */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP 호스트
                </label>
                <input
                  type="text"
                  value={settings.host}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  포트
                </label>
                <input
                  type="number"
                  value={settings.port}
                  onChange={(e) => handleChange('port', parseInt(e.target.value) || 587)}
                  placeholder="587"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Secure Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="secure"
                checked={settings.secure}
                onChange={(e) => handleChange('secure', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="secure" className="text-sm text-gray-700">
                SSL/TLS 사용 (포트 465 사용 시 권장)
              </label>
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사용자명 (이메일)
                </label>
                <input
                  type="text"
                  value={settings.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 / 앱 비밀번호
                </label>
                <input
                  type="password"
                  value={settings.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="앱 비밀번호 입력"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sender Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">발신자 설정</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  발신자 이메일
                </label>
                <input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => handleChange('fromEmail', e.target.value)}
                  placeholder="noreply@neture.co.kr"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  발신자 이름
                </label>
                <input
                  type="text"
                  value={settings.fromName}
                  onChange={(e) => handleChange('fromName', e.target.value)}
                  placeholder="Neture Platform"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Test Email */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Send className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">테스트 이메일</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">
              설정이 올바른지 테스트 이메일을 발송하여 확인합니다.
            </p>
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={handleTestEmail}
                disabled={testing || !settings.enabled}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {testing ? '발송 중...' : '테스트 발송'}
              </button>
            </div>
            {!settings.enabled && (
              <p className="mt-2 text-sm text-amber-600">
                이메일 서비스를 먼저 활성화해주세요.
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-900 mb-2">Gmail SMTP 설정 방법</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Google 계정에서 2단계 인증을 활성화합니다.</li>
            <li>2. 앱 비밀번호를 생성합니다 (Google 계정 &gt; 보안 &gt; 앱 비밀번호).</li>
            <li>3. SMTP 호스트: smtp.gmail.com, 포트: 587 (TLS) 또는 465 (SSL).</li>
            <li>4. 사용자명: Gmail 주소, 비밀번호: 앱 비밀번호.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
