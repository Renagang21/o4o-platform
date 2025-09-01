import { FC, useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone,
  Volume2,
  Monitor,
  Save,
  RefreshCw,
  MessageSquare,
  Shield,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NotificationSettings as Settings } from '@/types/notifications';
import { notificationApi } from '@/api/notifications';
import toast from 'react-hot-toast';

const NotificationSettings: FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await notificationApi.getSettings();
        setSettings(data);
      } catch (error) {
        // Error log removed
        toast.error('설정을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle setting change
  const handleSettingChange = (key: keyof Settings, value: any) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [key]: value
    }));
    setHasChanges(true);
  };

  // Handle notification type toggle
  const handleTypeToggle = (type: keyof Settings['notificationTypes']) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      notificationTypes: {
        ...prev!.notificationTypes,
        [type]: !prev!.notificationTypes[type]
      }
    }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    if (!settings || !hasChanges) return;
    
    setIsSaving(true);
    try {
      const updated = await notificationApi.updateSettings(settings);
      setSettings(updated);
      setHasChanges(false);
      toast.success('알림 설정이 저장되었습니다.');
    } catch (error) {
      // Error log removed
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings({
      enableNotifications: true,
      enableEmailNotifications: true,
      enablePushNotifications: false,
      notificationTypes: {
        updates: true,
        comments: true,
        system: true,
        security: true
      },
      emailFrequency: 'daily',
      retentionDays: 30,
      soundEnabled: true,
      desktopNotifications: false
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">설정을 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Bell className="w-6 h-6 text-gray-600" />
                <h1 className="text-xl font-semibold">알림 설정</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                기본값으로 재설정
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`
                  px-4 py-2 rounded-lg flex items-center gap-2
                  ${hasChanges 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                `}
              >
                <Save className="w-4 h-4" />
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium">일반 설정</h2>
              <p className="text-sm text-gray-600 mt-1">
                알림을 받는 방법과 시기를 설정합니다.
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Master toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="font-medium text-gray-900">
                      알림 활성화
                    </label>
                    <p className="text-sm text-gray-600">
                      모든 알림을 켜거나 끕니다
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Email notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="font-medium text-gray-900">
                      이메일 알림
                    </label>
                    <p className="text-sm text-gray-600">
                      중요한 알림을 이메일로 받습니다
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableEmailNotifications}
                    onChange={(e) => handleSettingChange('enableEmailNotifications', e.target.checked)}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Email frequency */}
              {settings.enableEmailNotifications && (
                <div className="ml-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일 알림 빈도
                  </label>
                  <select
                    value={settings.emailFrequency}
                    onChange={(e) => handleSettingChange('emailFrequency', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="instant">즉시</option>
                    <option value="hourly">매시간</option>
                    <option value="daily">매일</option>
                    <option value="weekly">매주</option>
                    <option value="never">받지 않음</option>
                  </select>
                </div>
              )}

              {/* Push notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="font-medium text-gray-900">
                      푸시 알림
                    </label>
                    <p className="text-sm text-gray-600">
                      모바일 기기로 푸시 알림을 받습니다
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enablePushNotifications}
                    onChange={(e) => handleSettingChange('enablePushNotifications', e.target.checked)}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="font-medium text-gray-900">
                      알림음
                    </label>
                    <p className="text-sm text-gray-600">
                      새 알림이 올 때 소리로 알려줍니다
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Desktop notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="font-medium text-gray-900">
                      데스크톱 알림
                    </label>
                    <p className="text-sm text-gray-600">
                      브라우저 알림을 표시합니다
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.desktopNotifications}
                    onChange={(e) => handleSettingChange('desktopNotifications', e.target.checked)}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium">알림 유형</h2>
              <p className="text-sm text-gray-600 mt-1">
                받고 싶은 알림 유형을 선택하세요.
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Updates */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  <div>
                    <label className="font-medium text-gray-900">
                      업데이트 알림
                    </label>
                    <p className="text-sm text-gray-600">
                      플러그인, 테마, 시스템 업데이트
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationTypes.updates}
                    onChange={() => handleTypeToggle('updates')}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Comments */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  <div>
                    <label className="font-medium text-gray-900">
                      댓글 알림
                    </label>
                    <p className="text-sm text-gray-600">
                      새 댓글 및 답글 알림
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationTypes.comments}
                    onChange={() => handleTypeToggle('comments')}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* System */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <label className="font-medium text-gray-900">
                      시스템 알림
                    </label>
                    <p className="text-sm text-gray-600">
                      시스템 상태 및 공지사항
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationTypes.system}
                    onChange={() => handleTypeToggle('system')}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Security */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-red-500" />
                  <div>
                    <label className="font-medium text-gray-900">
                      보안 알림
                    </label>
                    <p className="text-sm text-gray-600">
                      보안 경고 및 위협 알림
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationTypes.security}
                    onChange={() => handleTypeToggle('security')}
                    disabled={!settings.enableNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium">데이터 관리</h2>
              <p className="text-sm text-gray-600 mt-1">
                알림 데이터 보관 및 관리 설정
              </p>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 보관 기간
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.retentionDays}
                    onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">일</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  이 기간이 지난 알림은 자동으로 삭제됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;