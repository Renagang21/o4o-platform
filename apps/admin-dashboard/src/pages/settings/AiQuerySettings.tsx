/**
 * AI Query Settings
 * Phase AI-1 - AI 질의 정책 관리
 *
 * 원칙:
 * - Gemini Flash 단일 모델
 * - 무료/유료 차이: 일 사용 상한선만
 * - 토큰 단위 X, 질문 횟수 기준
 *
 * WO-O4O-AI-MODEL-DYNAMIC-REGISTRY-V1 (2026-09-12):
 *   모델 드롭다운은 하드코딩 목록이 아니라 `GET /api/ai/models` — 서버가 운영 GEMINI_API_KEY 로 Google
 *   ListModels 를 조회한(1h 캐시) **실제 사용 가능한 모델** ∪ 정적 whitelist — 를 쓴다. 새 Gemini 모델이
 *   나오면 여기서 고르면 되고 코드 배포가 필요 없다. 서버는 저장 시 같은 목록으로 다시 검증한다(INVALID_MODEL).
 */
import React, { useState, useEffect } from 'react';
// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
//   backend 는 `/api/ai/policy` (ai-query.routes, /api/ai mount) 이다. authClient.api 의 base 는
//   `/api/v1` 이라 `/api/v1/ai/policy` → 404 였다 → base `/api` 인 unifiedApi.raw 로 호출한다.
import { unifiedApi } from '@/api/unified-client';
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

interface GeminiModelInfo {
  id: string;
  displayName: string;
  description: string;
  inputTokenLimit: number | null;
  outputTokenLimit: number | null;
}

interface GeminiModelListing {
  models: GeminiModelInfo[];
  source: 'google' | 'google-stale' | 'static';
  fetchedAt: string | null;
  canonical: string;
  current: string;
}

const SOURCE_LABEL: Record<GeminiModelListing['source'], string> = {
  google: 'Google 실시간 목록',
  'google-stale': 'Google 목록(캐시, 재조회 실패)',
  static: '내장 목록(Google 조회 불가)',
};

const AiQuerySettings: React.FC = () => {
  const [policy, setPolicy] = useState<AiQueryPolicy | null>(null);
  const [models, setModels] = useState<GeminiModelListing | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    freeDailyLimit: 10,
    paidDailyLimit: 100,
    aiEnabled: true,
    defaultModel: 'gemini-2.5-flash',
    systemPrompt: '',
  });

  useEffect(() => {
    loadPolicy();
    loadModels();
  }, []);

  const loadModels = async (refresh = false) => {
    setModelsLoading(true);
    try {
      const response = await unifiedApi.raw.get(refresh ? '/ai/models?refresh=1' : '/ai/models');
      if (response.data.success) setModels(response.data.data);
    } catch (error: any) {
      console.error('Error loading AI models:', error);
      toast.error('모델 목록을 불러오지 못했습니다.');
    } finally {
      setModelsLoading(false);
    }
  };

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const response = await unifiedApi.raw.get('/ai/policy');
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
      const response = await unifiedApi.raw.put('/ai/policy', formData);
      if (response.data.success) {
        setPolicy(response.data.data);
        toast.success('AI 정책이 저장되었습니다.');
      }
    } catch (error: any) {
      console.error('Error saving AI policy:', error);
      // 서버가 모델을 거절한 경우(INVALID_MODEL)는 사유를 그대로 보여 준다 — 조용히 fallback 되지 않는다.
      const serverMessage = error?.response?.data?.error;
      toast.error(serverMessage ? String(serverMessage) : 'AI 정책 저장에 실패했습니다.');
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
            AI 질의·편집 AI 에 사용할 Gemini 모델을 선택합니다. 목록은 현재 API 키로 Google 이 실제 제공하는
            모델입니다 — 새 모델이 나오면 여기서 고르면 되고, 코드 배포는 필요 없습니다.
          </p>

          <div className="flex items-center gap-3">
            <select
              value={formData.defaultModel}
              onChange={(e) => handleChange('defaultModel', e.target.value)}
              disabled={modelsLoading}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              {/* 현재 정책값이 목록에 없으면(무효 id 등) 그대로 보여 주되 표시한다 — 저장 시 서버가 거절한다. */}
              {models && !models.models.some((m) => m.id === formData.defaultModel) && (
                <option value={formData.defaultModel}>{formData.defaultModel} (현재 값 — 사용 불가, 다시 선택 필요)</option>
              )}
              {(models?.models ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName !== m.id ? `${m.displayName} — ${m.id}` : m.id}
                  {m.id === models?.canonical ? ' (기본)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadModels(true)}
              disabled={modelsLoading}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Google 에서 모델 목록 다시 가져오기"
            >
              <RefreshCw className={`w-4 h-4 ${modelsLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>

          {models && (
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              <p>
                목록 출처: {SOURCE_LABEL[models.source]}
                {models.fetchedAt ? ` · 조회 ${new Date(models.fetchedAt).toLocaleString('ko-KR')}` : ''}
                {' · '}지금 실제 사용 중: <span className="font-medium text-gray-700">{models.current}</span>
                {models.current !== formData.defaultModel && formData.defaultModel !== policy?.defaultModel ? ' (저장 전)' : ''}
              </p>
              {(() => {
                const sel = models.models.find((m) => m.id === formData.defaultModel);
                if (!sel) return null;
                return (
                  <p>
                    {sel.description || sel.displayName}
                    {sel.inputTokenLimit ? ` · 입력 ${sel.inputTokenLimit.toLocaleString()} 토큰` : ''}
                    {sel.outputTokenLimit ? ` · 출력 ${sel.outputTokenLimit.toLocaleString()} 토큰` : ''}
                  </p>
                );
              })()}
            </div>
          )}
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
