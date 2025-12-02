import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchInfluencerRoutine, recommendInfluencerRoutine } from '../services/api';

export default function InfluencerRoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [routine, setRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    if (id) {
      loadRoutine(id);
    }
  }, [id]);

  async function loadRoutine(routineId: string) {
    setLoading(true);
    try {
      const response = await fetchInfluencerRoutine(routineId);
      setRoutine(response.data);
    } catch (error) {
      console.error('Failed to load routine:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommend() {
    if (!id) return;

    setRecommending(true);
    try {
      await recommendInfluencerRoutine(id);
      // Reload to update recommend count
      await loadRoutine(id);
      alert('이 루틴을 추천했습니다!');
    } catch (error) {
      console.error('Failed to recommend routine:', error);
      alert('추천에 실패했습니다');
    } finally {
      setRecommending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">루틴을 찾을 수 없습니다</p>
        <Link to="/influencers" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const metadata = routine.metadata || {};

  return (
    <div>
      <Link to="/influencers" className="text-primary-600 hover:text-primary-700 mb-6 inline-block">
        ← 목록으로 돌아가기
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{metadata.title}</h1>
          <p className="text-gray-600">{metadata.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">피부타입</div>
            <div className="flex flex-wrap gap-1">
              {metadata.skinType?.map((type: string) => (
                <span key={type} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {getSkinTypeLabel(type)}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">피부 고민</div>
            <div className="flex flex-wrap gap-1">
              {metadata.concerns?.slice(0, 2).map((concern: string) => (
                <span key={concern} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                  {getConcernLabel(concern)}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">사용 시간</div>
            <div className="text-sm font-medium">{getTimeOfUseLabel(metadata.timeOfUse)}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">조회 / 추천</div>
            <div className="text-sm font-medium">
              {metadata.viewCount || 0} / {metadata.recommendCount || 0}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">루틴 단계</h2>
          <div className="space-y-4">
            {metadata.routine?.map((step: any, index: number) => (
              <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{step.category}</h3>
                  {step.description && (
                    <p className="text-sm text-gray-600">{step.description}</p>
                  )}
                  {step.productId && (
                    <Link
                      to={`/product/${step.productId}`}
                      className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
                    >
                      제품 상세보기 →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleRecommend}
            disabled={recommending}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
          >
            {recommending ? '추천 중...' : '이 루틴 추천하기 👍'}
          </button>
          <button
            onClick={() => alert('매장에서 사용 기능은 추후 구현 예정입니다')}
            className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 font-semibold"
          >
            매장에서 이 루틴 사용하기
          </button>
        </div>
      </div>
    </div>
  );
}

function getSkinTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dry: '건성',
    oily: '지성',
    combination: '복합성',
    sensitive: '민감성',
    normal: '정상',
  };
  return labels[type] || type;
}

function getConcernLabel(concern: string): string {
  const labels: Record<string, string> = {
    acne: '여드름',
    whitening: '미백',
    wrinkle: '주름',
    pore: '모공',
    soothing: '진정',
    moisturizing: '보습',
    elasticity: '탄력',
    trouble: '트러블',
  };
  return labels[concern] || concern;
}

function getTimeOfUseLabel(time: string): string {
  const labels: Record<string, string> = {
    morning: '아침',
    evening: '저녁',
    both: '아침/저녁',
  };
  return labels[time] || time;
}
