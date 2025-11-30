import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchInfluencerRoutines, type InfluencerRoutineFilters } from '../services/api';

export default function InfluencerListPage() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [filters] = useState<InfluencerRoutineFilters>({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 12,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, [filters, pagination.currentPage]);

  async function loadRoutines() {
    setLoading(true);
    try {
      const response = await fetchInfluencerRoutines({
        ...filters,
        page: pagination.currentPage,
        limit: pagination.limit,
      });

      setRoutines(response.data?.routines || []);
      setPagination({
        ...pagination,
        totalPages: response.data?.pagination?.totalPages || 1,
        totalCount: response.data?.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load influencer routines:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">인플루언서 추천 루틴</h1>
        <p className="mt-2 text-sm text-gray-600">
          전문가들이 큐레이션한 스킨케어 루틴을 확인해보세요
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : routines.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <span className="text-5xl mb-4 block">✨</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            추천 루틴이 아직 없습니다
          </h3>
          <p className="text-gray-600">곧 인플루언서 추천 루틴이 추가될 예정입니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routines.map((routine) => (
            <Link
              key={routine.id}
              to={`/influencer-routine/${routine.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                  {routine.metadata?.title || '제목 없음'}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {routine.metadata?.description || '설명 없음'}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {routine.metadata?.skinType?.slice(0, 2).map((type: string) => (
                    <span
                      key={type}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {getSkinTypeLabel(type)}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{routine.metadata?.routine?.length || 0}개 단계</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    {routine.metadata?.viewCount || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
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
