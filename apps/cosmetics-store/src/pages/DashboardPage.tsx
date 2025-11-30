import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchMyProducts,
  fetchRecentImports,
  fetchRoutineStats,
  fetchSettlementSummary,
} from '../services/api';

export default function DashboardPage() {
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const [routineStats, setRoutineStats] = useState<any>(null);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [products, imports, stats, settlement] = await Promise.all([
        fetchMyProducts({ limit: 5 }),
        fetchRecentImports({ limit: 5 }),
        fetchRoutineStats(),
        fetchSettlementSummary(),
      ]);

      setMyProducts(products.data?.products || []);
      setRecentImports(imports.data?.imports || []);
      setRoutineStats(stats.data || null);
      setSettlementSummary(settlement.data || null);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">대시보드 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">매장 대시보드</h1>
        <p className="text-sm text-gray-500">
          Cosmetics Store Dashboard
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/sourcing"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-2xl mb-2">🛍️</span>
            <span className="text-sm font-medium text-gray-900">상품 소싱하기</span>
          </Link>
          <Link
            to="/routine-builder"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-2xl mb-2">✨</span>
            <span className="text-sm font-medium text-gray-900">루틴 만들기</span>
          </Link>
          <Link
            to="/sourcing?sortBy=popular"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-2xl mb-2">🔥</span>
            <span className="text-sm font-medium text-gray-900">인기 제품 보기</span>
          </Link>
          <Link
            to="/my-products"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-2xl mb-2">📦</span>
            <span className="text-sm font-medium text-gray-900">내 상품 보기</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Products TOP 5 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">소싱한 제품 TOP 5</h2>
          {myProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">아직 소싱한 상품이 없습니다</p>
              <Link to="/sourcing" className="text-primary-600 hover:text-primary-700">
                제품 소싱하러 가기 →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                    <img
                      src={product.image || '/placeholder-product.png'}
                      alt={product.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {product.name}
                    </h3>
                    {product.metadata?.cosmetics?.skinType && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.metadata.cosmetics.skinType.slice(0, 2).map((type: string) => (
                          <span
                            key={type}
                            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded"
                          >
                            {getSkinTypeLabel(type)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/product/${product.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                  >
                    상세보기
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settlement Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">정산 요약</h2>
          {settlementSummary ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">이번달 정산예정</span>
                <span className="text-2xl font-bold text-green-600">
                  ₩{settlementSummary.thisMonth?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">지난달 정산</span>
                <span className="font-semibold text-gray-900">
                  ₩{settlementSummary.lastMonth?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">총 누적 정산</span>
                <span className="font-semibold text-gray-900">
                  ₩{settlementSummary.totalSettled?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-sm text-gray-600">다음 정산일</span>
                <span className="font-medium text-primary-600">
                  {settlementSummary.nextSettlementDate || '2025-12-15'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              정산 정보를 불러올 수 없습니다
            </div>
          )}
        </div>

        {/* Recent Import Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">최근 소싱 Activity</h2>
          {recentImports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              최근 소싱 내역이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {recentImports.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {item.productName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {item.category || '카테고리 미지정'}
                      </span>
                      {item.reason && (
                        <span className="text-xs text-gray-400">• {item.reason}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Routine Usage Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">루틴 추천 사용현황</h2>
          {routineStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">최근 7일 루틴 생성</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {routineStats.totalRoutines || 0}회
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">인기 피부타입</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {getSkinTypeLabel(routineStats.topSkinType) || '-'}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">인기 고민</div>
                <div className="flex flex-wrap gap-2">
                  {routineStats.topConcerns?.slice(0, 3).map((concern: string) => (
                    <span
                      key={concern}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
                    >
                      {getConcernLabel(concern)}
                    </span>
                  )) || <span className="text-sm text-gray-500">데이터 없음</span>}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">추천 제품 TOP 3</div>
                <ol className="space-y-1">
                  {routineStats.topProducts?.slice(0, 3).map((product: any, index: number) => (
                    <li key={index} className="text-sm">
                      <span className="font-semibold text-gray-900">{index + 1}.</span>{' '}
                      {product.name}
                    </li>
                  )) || <li className="text-sm text-gray-500">데이터 없음</li>}
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              루틴 사용 통계를 불러올 수 없습니다
            </div>
          )}
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
