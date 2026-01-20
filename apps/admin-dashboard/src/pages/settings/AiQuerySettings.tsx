/**
 * AI Query Settings
 * Phase AI-1 - AI 질의 정책 관리
 *
 * 원칙:
 * - Gemini Flash 단일 모델
 * - 무료/유료 차이: 일 사용 상한선만
 * - 토큰 단위 X, 질문 횟수 기준
 */
import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import {
  Save,
  Loader2,
  Bot,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';

interface AiQueryPolicy {
  freeDailyLimit: number;
  paidDailyLimit: number;
  aiEnabled: boolean;
  defaultModel: string;
  systemPrompt: string | null;
  updatedAt: string;
}

const AiQuerySettings: React.FC = () => {
  const [policy, setPolicy] = useState<AiQueryPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    freeDailyLimit: 10,
    paidDailyLimit: 100,
    aiEnabled: true,
    defaultModel: 'gemini-3.0-flash',
    systemPrompt: '',
  });

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/ai/policy');
      if (response.data.success) {
        const data = response.data.data;
        setPolicy(data);
        setFormData({
          freeDailyLimit: data.freeDailyLimit,
          paidDailyLimit: data.paidDailyLimit,
          aiEnabled: data.aiEnabled,
          defaultModel: data.defaultModel,
          systemPrompt: data.systemPrompt || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading AI policy:', error);
      toast.error('AI 정책을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await authClient.api.put('/ai/policy', formData);
      if (response.data.success) {
        setPolicy(response.data.data);
        toast.success('AI 정책이 저장되었습니다.');
      }
    } catch (error: any) {
      console.error('Error saving AI policy:', error);
      toast.error('AI 정책 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof typeof formData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Query 설정</h1>
            <p className="text-gray-600 mt-1">
              AI 질의 기능의 정책을 설정합니다. 일 사용량 제한, 모델 선택, 시스템 프롬프트를 관리할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI 활성화 토글 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI 기능 활성화</h3>
              <p className="text-sm text-gray-500 mt-1">
                AI 질의 기능을 전체적으로 활성화/비활성화합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('aiEnabled', !formData.aiEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                formData.aiEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {formData.aiEnabled ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  활성화됨
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  비활성화됨
                </>
              )}
            </button>
          </div>
        </div>

        {/* 일 사용량 제한 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">일 사용량 제한</h3>
          <p className="text-sm text-gray-500 mb-4">
            사용자당 하루 질문 가능 횟수를 설정합니다. (토큰이 아닌 질문 횟수 기준)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                무료 사용자 일 제한
              </label>
              <input
                type="number"
                min={0}
                value={formData.freeDailyLimit}
                onChange={(e) => handleChange('freeDailyLimit', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                무료 사용자가 하루에 질문할 수 있는 최대 횟수
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                유료 사용자 일 제한
              </label>
              <input
                type="number"
                min={0}
                value={formData.paidDailyLimit}
                onChange={(e) => handleChange('paidDailyLimit', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                유료 구독자가 하루에 질문할 수 있는 최대 횟수
              </p>
            </div>
          </div>
        </div>

        {/* 모델 선택 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI 모델</h3>
          <p className="text-sm text-gray-500 mb-4">
            AI 질의에 사용할 모델을 선택합니다. (Gemini Flash 권장)
          </p>

          <select
            value={formData.defaultModel}
            onChange={(e) => handleChange('defaultModel', e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="gemini-3.0-flash">Gemini 3.0 Flash (최신, 권장)</option>
            <option value="gemini-3.0-pro">Gemini 3.0 Pro (정확도 높음)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (안정)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (레거시)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (레거시)</option>
          </select>
        </div>

        {/* 시스템 프롬프트 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 프롬프트</h3>
          <p className="text-sm text-gray-500 mb-4">
            AI에게 주어지는 기본 지침입니다. 서비스 맥락과 응답 스타일을 정의합니다.
          </p>

          <textarea
            value={formData.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            rows={6}
            placeholder="AI의 역할과 응답 스타일을 정의하세요..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            사용자 질문 시 자동으로 상품/서비스 맥락이 추가됩니다.
          </p>
        </div>

        {/* 저장 버튼 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={loadPolicy}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                설정 저장
              </>
            )}
          </button>
        </div>

        {/* 마지막 업데이트 시간 */}
        {policy?.updatedAt && (
          <p className="text-xs text-gray-400 text-right">
            마지막 업데이트: {new Date(policy.updatedAt).toLocaleString('ko-KR')}
          </p>
        )}
      </form>
    </div>
  );
};

export default AiQuerySettings;
