import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  Check,
  BarChart3,
  Package,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Mock usage statistics data
const mockUsageStats = {
  today: {
    totalCalls: 847,
    successCalls: 823,
    errorCalls: 24,
    totalInputTokens: 156420,
    totalOutputTokens: 89340,
    avgDuration: 1240,
  },
  thisWeek: {
    totalCalls: 5234,
    successCalls: 5089,
    errorCalls: 145,
    totalInputTokens: 987650,
    totalOutputTokens: 534210,
    avgDuration: 1180,
  },
  thisMonth: {
    totalCalls: 18942,
    successCalls: 18456,
    errorCalls: 486,
    totalInputTokens: 3542180,
    totalOutputTokens: 1876540,
    avgDuration: 1210,
  }
};

// Daily usage breakdown for chart
const dailyUsage = [
  { date: '01/10', calls: 620 },
  { date: '01/11', calls: 780 },
  { date: '01/12', calls: 890 },
  { date: '01/13', calls: 720 },
  { date: '01/14', calls: 950 },
  { date: '01/15', calls: 1120 },
  { date: '01/16', calls: 847 },
];

const AppServices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'usage'>('settings');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usagePeriod, setUsagePeriod] = useState<'today' | 'thisWeek' | 'thisMonth'>('today');

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const stats = mockUsageStats[usagePeriod];
  const successRate = ((stats.successCalls / stats.totalCalls) * 100).toFixed(1);
  const maxCalls = Math.max(...dailyUsage.map(d => d.calls));

  return (
    <div className="max-w-5xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Services</h1>
        <p className="text-gray-600 mt-1">
          AI 서비스 API 설정 및 사용 통계를 관리합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              API 설정
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
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Gemini 3.0 Flash Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Gemini 3.0 Flash</h3>
                  <p className="text-sm text-gray-500">Google AI - 최신 Gemini 모델</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Google
                </span>
                {isEnabled && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    활성
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">서비스 활성화</p>
                  <p className="text-sm text-gray-500">Gemini 3.0 Flash API를 활성화/비활성화합니다</p>
                </div>
                <button
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Google AI API Key를 입력하세요"
                    autoComplete="off"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Google AI Studio에서 API Key를 발급받을 수 있습니다.{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    API Key 발급받기
                  </a>
                </p>
              </div>

              {/* Model Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">모델 버전</p>
                  <p className="font-medium text-gray-900">gemini-3.0-flash</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">최대 토큰</p>
                  <p className="font-medium text-gray-900">1,000,000</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">입력 가격</p>
                  <p className="font-medium text-gray-900">$0.075 / 1M tokens</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">출력 가격</p>
                  <p className="font-medium text-gray-900">$0.30 / 1M tokens</p>
                </div>
              </div>

              {/* Features */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">주요 기능</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>- 향상된 추론 능력과 응답 품질</li>
                  <li>- 멀티모달 지원 (텍스트, 이미지, 비디오)</li>
                  <li>- 빠른 응답 속도 (Flash 모델)</li>
                  <li>- 코드 생성 및 분석 최적화</li>
                </ul>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    설정 저장
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex gap-2">
            {[
              { key: 'today', label: '오늘' },
              { key: 'thisWeek', label: '이번 주' },
              { key: 'thisMonth', label: '이번 달' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setUsagePeriod(key as typeof usagePeriod)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  usagePeriod === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">총 호출</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCalls.toLocaleString()}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">성공률</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{successRate}%</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">평균 응답</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgDuration}ms</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">오류</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.errorCalls.toLocaleString()}</p>
            </div>
          </div>

          {/* Token Usage */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">토큰 사용량</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">입력 토큰</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.totalInputTokens.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: '65%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">출력 토큰</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.totalOutputTokens.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: '45%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Usage Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 호출 추이</h3>
            <div className="flex items-end gap-3 h-48">
              {dailyUsage.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                    style={{ height: `${(day.calls / maxCalls) * 100}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                  <span className="text-xs font-medium text-gray-700">{day.calls}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Estimation */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">예상 비용</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">입력 비용</p>
                <p className="text-xl font-bold text-gray-900">
                  ${((stats.totalInputTokens / 1000000) * 0.075).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">출력 비용</p>
                <p className="text-xl font-bold text-gray-900">
                  ${((stats.totalOutputTokens / 1000000) * 0.30).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">총 예상 비용</p>
                <p className="text-xl font-bold text-blue-600">
                  ${(
                    ((stats.totalInputTokens / 1000000) * 0.075) +
                    ((stats.totalOutputTokens / 1000000) * 0.30)
                  ).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppServices;
