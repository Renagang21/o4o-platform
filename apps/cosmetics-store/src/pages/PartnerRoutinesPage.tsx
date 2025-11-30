import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPartnerRoutines } from '../services/api';

interface RoutineWithPerformance {
  id: string;
  title: string;
  description: string;
  skinType: string[];
  concerns: string[];
  timeOfUse: 'morning' | 'evening' | 'both';
  isPublished: boolean;
  viewCount: number;
  recommendCount: number;
  conversionCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function PartnerRoutinesPage() {
  const [routines, setRoutines] = useState<RoutineWithPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoutines = async () => {
      try {
        setLoading(true);
        const response = await fetchPartnerRoutines();
        setRoutines(response.data.routines);
        setError(null);
      } catch (err) {
        console.error('Failed to load partner routines:', err);
        setError('루틴 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadRoutines();
  }, []);

  const getSkinTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dry: '건성',
      oily: '지성',
      combination: '복합성',
      sensitive: '민감성',
      normal: '중성',
    };
    return labels[type] || type;
  };

  const getTimeOfUseLabel = (timeOfUse: string) => {
    const labels: Record<string, string> = {
      morning: '아침',
      evening: '저녁',
      both: '아침/저녁',
    };
    return labels[timeOfUse] || timeOfUse;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">내 루틴 관리</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
          새 루틴 만들기
        </button>
      </div>

      {routines.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-lg mb-4">아직 생성한 루틴이 없습니다</div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            첫 루틴 만들기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    루틴명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    피부타입
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용시간
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    추천수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전환수
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {routines.map((routine) => (
                  <tr key={routine.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{routine.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {routine.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {routine.skinType.map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {getSkinTypeLabel(type)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTimeOfUseLabel(routine.timeOfUse)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {routine.isPublished ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          공개
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          비공개
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                      {routine.viewCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {routine.recommendCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-medium">
                      {routine.conversionCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/influencer-routine/${routine.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          보기
                        </Link>
                        <button className="text-gray-600 hover:text-gray-900">
                          수정
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Summary */}
      {routines.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
            <div className="text-sm text-blue-800 mb-1">총 루틴 수</div>
            <div className="text-2xl font-bold text-blue-900">{routines.length}</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
            <div className="text-sm text-green-800 mb-1">총 조회수</div>
            <div className="text-2xl font-bold text-green-900">
              {routines.reduce((sum, r) => sum + r.viewCount, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg">
            <div className="text-sm text-purple-800 mb-1">총 추천수</div>
            <div className="text-2xl font-bold text-purple-900">
              {routines.reduce((sum, r) => sum + r.recommendCount, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg">
            <div className="text-sm text-orange-800 mb-1">총 전환수</div>
            <div className="text-2xl font-bold text-orange-900">
              {routines.reduce((sum, r) => sum + r.conversionCount, 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
