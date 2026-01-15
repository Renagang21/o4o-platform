/**
 * AiPolicyPage - AI 사용 기준 설정
 *
 * Work Order: WO-AI-ADMIN-CONTROL-PLANE-V1
 *
 * AI 사용량을 관리자가 직접 통제
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface PolicySettings {
  freeDailyLimit: number;
  paidDailyLimit: number;
  globalDailyLimit: number;
  warningThreshold: number;
  aiEnabled: boolean;
  defaultModel: string;
  activeEngineId: number | null;
}

export default function AiPolicyPage() {
  const [policy, setPolicy] = useState<PolicySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    freeDailyLimit: 10,
    paidDailyLimit: 100,
    globalDailyLimit: 1000,
    warningThreshold: 80,
    aiEnabled: true,
  });

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/admin/policy`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data?.success) {
        setPolicy(data.data);
        setFormData({
          freeDailyLimit: data.data.freeDailyLimit,
          paidDailyLimit: data.data.paidDailyLimit,
          globalDailyLimit: data.data.globalDailyLimit,
          warningThreshold: data.data.warningThreshold,
          aiEnabled: data.data.aiEnabled,
        });
      }
    } catch (error) {
      console.error('Failed to fetch policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/admin/policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data?.success) {
        setPolicy(data.data);
        alert('정책이 업데이트되었습니다.');
      } else {
        alert(data.error || '정책 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update policy:', error);
      alert('정책 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 관리</span>
            </div>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              대시보드
            </Link>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            <Link
              to="/admin/ai"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              대시보드
            </Link>
            <Link
              to="/admin/ai/engines"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              엔진 설정
            </Link>
            <Link
              to="/admin/ai/policy"
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm"
            >
              사용 기준 설정
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 사용 기준 설정</h1>
          <p className="text-gray-500 mt-1">
            AI 사용량 한도와 경고 기준을 설정합니다. 변경 사항은 즉시 적용됩니다.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-6">AI 활성화</h2>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleChange('aiEnabled', !formData.aiEnabled)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    formData.aiEnabled ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      formData.aiEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-gray-700">
                  {formData.aiEnabled ? 'AI 기능 활성화됨' : 'AI 기능 비활성화됨'}
                </span>
              </div>
              {!formData.aiEnabled && (
                <p className="mt-3 text-sm text-amber-600">
                  AI 기능이 비활성화되면 모든 사용자의 AI 질문이 차단됩니다.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-6">사용자별 일일 한도</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    무료 사용자 일 한도
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={formData.freeDailyLimit}
                      onChange={(e) => handleChange('freeDailyLimit', parseInt(e.target.value, 10) || 0)}
                      className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-gray-500">회/일</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    무료 사용자가 하루에 질문할 수 있는 최대 횟수
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    유료 사용자 일 한도
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={formData.paidDailyLimit}
                      onChange={(e) => handleChange('paidDailyLimit', parseInt(e.target.value, 10) || 0)}
                      className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-gray-500">회/일</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    유료 사용자가 하루에 질문할 수 있는 최대 횟수
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-6">전체 사용량 관리</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전체 일일 한도
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={formData.globalDailyLimit}
                      onChange={(e) => handleChange('globalDailyLimit', parseInt(e.target.value, 10) || 0)}
                      className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-gray-500">회/일</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    플랫폼 전체에서 하루에 처리할 수 있는 최대 질문 수
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경고 임계치
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.warningThreshold}
                      onChange={(e) => handleChange('warningThreshold', parseInt(e.target.value, 10) || 80)}
                      className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    사용량이 이 비율에 도달하면 운영자에게 경고 표시
                  </p>
                </div>
              </div>
            </div>

            {/* Current Model Info */}
            {policy && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="font-medium text-gray-700 mb-2">현재 설정 정보</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>사용 모델: <span className="font-medium">{policy.defaultModel}</span></div>
                  <div>활성 엔진 ID: <span className="font-medium">{policy.activeEngineId || '없음'}</span></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {saving ? '저장 중...' : '설정 저장'}
              </button>
            </div>
          </form>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            설정을 변경하면 즉시 적용됩니다. 사용량 한도를 0으로 설정하면 해당 사용자 그룹의 AI 사용이 차단됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
