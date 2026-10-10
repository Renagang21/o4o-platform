import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Loader2 } from 'lucide-react';
import { unifiedApi } from '@/api/unified-client';

interface ModelListing {
  current: string;
  models: { id: string; displayName: string; inputTokenLimit: number | null }[];
}

/** 서버 모델 정보 조회. 정책 편집은 기존 AI Query 화면이 담당한다. */
export default function AppServices() {
  const [listing, setListing] = useState<ModelListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    unifiedApi.raw.get('/ai/models')
      .then((response) => {
        const data = response.data?.data;
        if (!response.data?.success || typeof data?.current !== 'string' || !Array.isArray(data.models)) {
          throw new Error('Invalid model listing');
        }
        if (!cancelled) setListing(data);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);

  const currentModel = listing?.models.find((model) => model.id === listing.current);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Services</h2>
        <p className="text-gray-600 mt-1">서버에 설정된 AI 모델을 확인합니다.</p>
      </div>
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Bot className="w-5 h-5" /> 현재 모델
        </h3>
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" /> 모델 정보를 불러오는 중입니다.
          </p>
        ) : error ? (
          <div role="alert" className="text-red-700">
            <p>모델 정보를 불러오지 못했습니다.</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 underline">
              다시 불러오기
            </button>
          </div>
        ) : listing && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">모델</dt>
              <dd className="font-medium">{currentModel?.displayName || listing.current}</dd>
              <dd className="text-sm text-gray-600">{listing.current}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">최대 입력 토큰</dt>
              <dd className="font-medium">{currentModel?.inputTokenLimit?.toLocaleString() ?? '정보 없음'}</dd>
            </div>
          </dl>
        )}
      </section>
      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
        <h3 className="font-semibold">AI 정책 관리</h3>
        <p className="text-sm text-gray-600">활성화 여부, 사용 한도와 모델은 AI Query에서 변경할 수 있습니다.</p>
        <Link to="/settings/ai-query" className="inline-block text-blue-700 underline">AI Query 설정으로 이동</Link>
        <p className="text-sm text-gray-600">API Key는 서버 환경에서 관리합니다.</p>
      </section>
      <section className="rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold mb-2">사용 통계</h3>
        <p className="text-sm text-gray-600">이 화면에는 사용 통계가 연결되어 있지 않습니다.</p>
      </section>
    </div>
  );
}
