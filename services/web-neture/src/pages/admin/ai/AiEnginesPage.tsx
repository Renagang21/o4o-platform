/**
 * AiEnginesPage - AI 엔진 설정
 *
 * Work Order: WO-AI-ADMIN-CONTROL-PLANE-V1
 *
 * 관리자가 사용하는 AI 엔진을 직접 선택
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface AiEngine {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  provider: string;
  isActive: boolean;
  isAvailable: boolean;
}

export default function AiEnginesPage() {
  const [engines, setEngines] = useState<AiEngine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<number | null>(null);

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/admin/engines`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data?.success) {
        setEngines(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const activateEngine = async (engineId: number) => {
    setActivating(engineId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/admin/engines/${engineId}/activate`, {
        method: 'PUT',
        credentials: 'include',
      });
      const data = await response.json();
      if (data?.success) {
        fetchEngines();
      } else {
        alert(data.error || '엔진 활성화에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to activate engine:', error);
      alert('엔진 활성화 중 오류가 발생했습니다.');
    } finally {
      setActivating(null);
    }
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      google: 'Google AI',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
    };
    return labels[provider] || provider;
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
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm"
            >
              엔진 설정
            </Link>
            <Link
              to="/admin/ai/policy"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              사용 기준 설정
            </Link>
            <Link
              to="/admin/ai/asset-quality"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              품질 관리
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 엔진 설정</h1>
          <p className="text-gray-500 mt-1">
            플랫폼에서 사용할 AI 엔진을 선택합니다. 동시에 1개의 엔진만 활성화됩니다.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {engines.map((engine) => (
              <div
                key={engine.id}
                className={`bg-white rounded-xl p-6 shadow-sm border ${
                  engine.isActive ? 'border-primary-300 bg-primary-50/30' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{engine.name}</h3>
                      {engine.isActive && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                          현재 사용 중
                        </span>
                      )}
                      {!engine.isAvailable && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                          사용 불가
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      제공: {getProviderLabel(engine.provider)}
                    </div>
                    {engine.description && (
                      <p className="text-gray-600 mt-3">{engine.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      모델 ID: {engine.slug}
                    </div>
                  </div>
                  <div className="ml-6">
                    {engine.isActive ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">활성</span>
                      </div>
                    ) : engine.isAvailable ? (
                      <button
                        onClick={() => activateEngine(engine.id)}
                        disabled={activating === engine.id}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        {activating === engine.id ? '활성화 중...' : '이 엔진 사용'}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">사용 불가</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            엔진을 변경하면 이후 새로운 AI 질문부터 변경된 엔진이 적용됩니다.
            기존 질문 기록에는 영향이 없습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
