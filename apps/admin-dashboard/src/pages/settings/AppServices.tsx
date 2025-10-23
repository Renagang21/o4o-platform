import React, { useState, useEffect } from 'react';
import { appSystemApi, App, AppInstance, AppUsageStats } from '@/api/app-system.api';
import toast from 'react-hot-toast';
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  Check,
  AlertCircle,
  BarChart3,
  Package,
  Settings as SettingsIcon,
  FileText
} from 'lucide-react';
import ReferencesTab from '@/components/settings/ReferencesTab';

const AppServices: React.FC = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [instances, setInstances] = useState<Record<string, AppInstance>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, Record<string, any>>>({});
  const [usageStats, setUsageStats] = useState<Record<string, AppUsageStats>>({});
  const [activeTab, setActiveTab] = useState<'apps' | 'usage' | 'references'>('apps');

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      // Load all apps
      const appsData = await appSystemApi.getAllApps();
      setApps(appsData);

      // Load instances for each app
      const instancesData: Record<string, AppInstance> = {};
      const configsData: Record<string, Record<string, any>> = {};

      for (const app of appsData) {
        const instance = await appSystemApi.getInstance(app.slug);
        if (instance) {
          instancesData[app.slug] = instance;
          configsData[app.slug] = instance.config || {};
        } else {
          // Initialize empty config based on manifest
          configsData[app.slug] = {};
        }
      }

      setInstances(instancesData);
      setConfigs(configsData);
    } catch (error) {
      console.error('Error loading apps:', error);
      toast.error('앱 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats: Record<string, AppUsageStats> = {};
      for (const app of apps) {
        const appStats = await appSystemApi.getUsageStats(app.slug);
        if (appStats) {
          stats[app.slug] = appStats;
        }
      }
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'usage' && apps.length > 0) {
      loadUsageStats();
    }
  }, [activeTab, apps]);

  const handleConfigChange = (appSlug: string, key: string, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [appSlug]: {
        ...prev[appSlug],
        [key]: value
      }
    }));
  };

  const handleSave = async (app: App) => {
    setSaving(prev => ({ ...prev, [app.slug]: true }));
    try {
      const config = configs[app.slug];

      // Check if already installed
      if (instances[app.slug]) {
        // Update existing config
        await appSystemApi.updateConfig(app.slug, config);
        toast.success(`${app.name} 설정이 저장되었습니다.`);
      } else {
        // Install app
        const instance = await appSystemApi.installApp(app.slug, config);
        if (instance) {
          setInstances(prev => ({ ...prev, [app.slug]: instance }));
          toast.success(`${app.name}이 설치되었습니다.`);
        }
      }
    } catch (error: any) {
      console.error('Error saving app config:', error);
      toast.error(error.response?.data?.error || `설정 저장에 실패했습니다.`);
    } finally {
      setSaving(prev => ({ ...prev, [app.slug]: false }));
    }
  };

  const toggleKeyVisibility = (appSlug: string) => {
    setShowKeys(prev => ({
      ...prev,
      [appSlug]: !prev[appSlug]
    }));
  };

  const renderAppCard = (app: App) => {
    const instance = instances[app.slug];
    const config = configs[app.slug] || {};
    const isInstalled = !!instance;
    const isSaving = saving[app.slug];
    const showKey = showKeys[app.slug];
    const settingsSchema = app.manifest?.settingsSchema || {};

    return (
      <div key={app.slug} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        {/* App Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{app.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {app.provider}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {app.category}
              </span>
              {isInstalled && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" />
                  설치됨
                </span>
              )}
            </div>
          </div>
          {isInstalled && instance.usageCount > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-500">사용 횟수</div>
              <div className="text-2xl font-bold text-gray-900">{instance.usageCount.toLocaleString()}</div>
            </div>
          )}
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          {Object.entries(settingsSchema).map(([key, schema]: [string, any]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {schema.label || key}
                {schema.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {schema.type === 'select' ? (
                <select
                  value={config[key] || schema.default || ''}
                  onChange={(e) => handleConfigChange(app.slug, key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {schema.options?.map((option: string) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : schema.secret ? (
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={config[key] || ''}
                    onChange={(e) => handleConfigChange(app.slug, key, e.target.value)}
                    placeholder={`${key}를 입력하세요`}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(app.slug)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={config[key] || ''}
                  onChange={(e) => handleConfigChange(app.slug, key, e.target.value)}
                  placeholder={schema.placeholder || `${key}를 입력하세요`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {schema.description && (
                <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
              )}
            </div>
          ))}

          {/* Save Button */}
          <button
            onClick={() => handleSave(app)}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isInstalled ? '설정 업데이트' : '앱 설치'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderUsageTab = () => {
    return (
      <div className="space-y-6">
        {apps.map(app => {
          const stats = usageStats[app.slug];
          const instance = instances[app.slug];

          if (!instance) return null;

          return (
            <div key={app.slug} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{app.name}</h3>

              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">총 호출</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalCalls.toLocaleString()}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">성공률</div>
                    <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">입력 토큰</div>
                    <div className="text-2xl font-bold text-purple-600">{stats.totalInputTokens.toLocaleString()}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">출력 토큰</div>
                    <div className="text-2xl font-bold text-orange-600">{stats.totalOutputTokens.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">평균 처리 시간</div>
                    <div className="text-2xl font-bold text-gray-600">{stats.avgDuration}ms</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">오류 횟수</div>
                    <div className="text-2xl font-bold text-red-600">{stats.errorCalls.toLocaleString()}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  통계 로딩 중...
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Services</h1>
        <p className="text-gray-600 mt-1">
          AI 앱을 설치하고 관리하세요. API 키를 설정하여 다양한 AI 기능을 사용할 수 있습니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('apps')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'apps'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              앱 관리
            </div>
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              사용 통계
            </div>
          </button>
          <button
            onClick={() => setActiveTab('references')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'references'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              References
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'apps' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {apps.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">사용 가능한 앱이 없습니다.</p>
            </div>
          ) : (
            apps.map(renderAppCard)
          )}
        </div>
      ) : activeTab === 'usage' ? (
        renderUsageTab()
      ) : (
        <ReferencesTab />
      )}
    </div>
  );
};

export default AppServices;
