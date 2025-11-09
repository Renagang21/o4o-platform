import React, { useState, useEffect } from 'react';
import { AccessControlSettings as AccessControlSettingsType } from '@o4o/types';
import { authClient } from '@o4o/auth-client';

/**
 * AccessControlSettings Page
 *
 * Global settings for access control functionality.
 * Allows admins to configure default denial messages and behavior.
 */
const AccessControlSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AccessControlSettingsType>({
    defaultDenialMessage: '이 콘텐츠에 접근할 권한이 없습니다.',
    defaultRedirectUrl: '/pricing',
    showUpgradeLink: true,
    upgradeUrl: '/pricing',
    autoRedirectDelay: 0,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/v1/admin/settings/access-control');

      if (response.data?.success && response.data?.data) {
        setSettings(response.data.data.value || settings);
      }
    } catch (error: any) {
      console.error('Failed to fetch access control settings:', error);
      // Use default settings if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await authClient.api.put('/v1/admin/settings/access-control', {
        value: settings,
        type: 'access-control',
        description: 'Global access control settings'
      });

      setSuccessMessage('설정이 성공적으로 저장되었습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setErrorMessage(error?.response?.data?.message || '설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (updates: Partial<AccessControlSettingsType>) => {
    setSettings({ ...settings, ...updates });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">접근 제어 설정</h1>
        <p className="mt-2 text-gray-600">
          포스트 및 페이지 접근 제어에 대한 전역 설정을 관리합니다.
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Default Denial Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            기본 거부 메시지
          </label>
          <textarea
            value={settings.defaultDenialMessage}
            onChange={(e) => handleChange({ defaultDenialMessage: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이 콘텐츠에 접근할 권한이 없습니다."
          />
          <p className="mt-1 text-xs text-gray-500">
            포스트/페이지에 사용자 지정 메시지가 없을 때 표시되는 기본 메시지입니다.
            HTML을 사용할 수 있습니다.
          </p>
        </div>

        {/* Default Redirect URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            기본 리다이렉트 URL
          </label>
          <input
            type="text"
            value={settings.defaultRedirectUrl}
            onChange={(e) => handleChange({ defaultRedirectUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="/pricing"
          />
          <p className="mt-1 text-xs text-gray-500">
            포스트/페이지에 사용자 지정 리다이렉트 URL이 없을 때 사용되는 기본 URL입니다.
          </p>
        </div>

        {/* Show Upgrade Link */}
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showUpgradeLink}
              onChange={(e) => handleChange({ showUpgradeLink: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              업그레이드 링크 표시
            </span>
          </label>
          <p className="mt-1 text-xs text-gray-500 ml-6">
            접근 거부 메시지에 업그레이드 링크를 표시합니다.
          </p>
        </div>

        {/* Upgrade URL (only if showUpgradeLink is true) */}
        {settings.showUpgradeLink && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              업그레이드 URL
            </label>
            <input
              type="text"
              value={settings.upgradeUrl || ''}
              onChange={(e) => handleChange({ upgradeUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/pricing"
            />
            <p className="mt-1 text-xs text-gray-500">
              업그레이드 버튼이 연결될 URL입니다.
            </p>
          </div>
        )}

        {/* Auto Redirect Delay */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            자동 리다이렉트 지연 시간 (초)
          </label>
          <input
            type="number"
            min="0"
            max="60"
            value={settings.autoRedirectDelay || 0}
            onChange={(e) => handleChange({ autoRedirectDelay: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            0으로 설정하면 자동 리다이렉트가 비활성화됩니다.
            1-60초 사이의 값을 설정하면 지정된 시간 후 자동으로 리다이렉트됩니다.
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">참고사항</h4>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>각 포스트/페이지는 이 전역 설정을 재정의할 수 있습니다.</li>
            <li>사용자 지정 메시지는 HTML을 지원하지만 보안상 스크립트는 제거됩니다.</li>
            <li>리다이렉트 URL은 상대 경로(/pricing) 또는 절대 URL(https://example.com)을 사용할 수 있습니다.</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessControlSettings;
