/**
 * PartnerOps Routines Page
 *
 * Content/Routine management:
 * - Create/edit routines (product recommendations)
 * - Link products to routines
 * - View routine performance
 *
 * Refactored: PageHeader pattern applied (card-based layout preserved)
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  TrendingUp,
  Link as LinkIcon,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import {
  PartnerOpsLoadError,
  PartnerOpsMutationNotice,
  PARTNEROPS_MUTATION_DISABLED_REASON,
  toLoadError,
  type PartnerOpsLoadErrorInfo,
} from '../components/PartnerOpsLoadError';

/**
 * Partner Routine (Partner-Core aligned)
 * Maps to PartnerRoutineDto from @o4o/partnerops
 */
interface Routine {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  productIds: string[];       // Changed from products
  productType?: string;
  status: 'draft' | 'published' | 'archived';  // Changed from isActive
  viewCount: number;          // Changed from views
  clickCount: number;         // Changed from clicks
  conversionCount: number;    // Changed from conversions
  createdAt: string;
  updatedAt: string;
}

const ROUTINES_ENDPOINT = '/partnerops/routines';

const Routines: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  // WO-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1:
  //   조회 실패 시 데모 루틴을 주입하지 않는다.
  const [loadError, setLoadError] = useState<PartnerOpsLoadErrorInfo | null>(null);

  const fetchRoutines = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await authClient.api.get(ROUTINES_ENDPOINT);
      setRoutines(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      console.error('Failed to fetch routines:', err);
      setRoutines([]);
      setLoadError(toLoadError(err, ROUTINES_ENDPOINT));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  // WO-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1:
  //   루틴 생성(POST) · 수정(PUT) · 삭제(DELETE) · publish/draft 토글(PUT) 은
  //   운영 API 검증 전이므로 실행 경로를 제거하고 CTA 를 비활성 처리했다.
  //   /partnerops/routines/new · /partnerops/routines/:id 라우트는 유지되며 목록을 표시한다.

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // PageHeader actions
  const headerActions = [
    {
      id: 'new-routine',
      label: '새 루틴',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => {},
      variant: 'primary' as const,
      disabled: true,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="콘텐츠/루틴 관리"
        subtitle="상품 추천 루틴을 만들고 관리합니다"
        actions={headerActions}
      />

      <div className="mb-6">
        <PartnerOpsMutationNotice reason={`루틴 생성·수정·삭제·게시 — ${PARTNEROPS_MUTATION_DISABLED_REASON}`} />
      </div>

      {loadError && (
        <div className="mb-6">
          <PartnerOpsLoadError error={loadError} onRetry={fetchRoutines} retrying={loading} />
        </div>
      )}

      {/* Routines List */}
      {!loadError && (
      <div className="space-y-4">
        {routines.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            등록된 루틴이 없습니다.
          </div>
        ) : (
          routines.map((routine) => (
            <div key={routine.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{routine.title}</h3>
                    {routine.status === 'published' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        게시됨
                      </span>
                    ) : routine.status === 'draft' ? (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded text-xs">
                        초안
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        보관됨
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{routine.description || '-'}</p>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Package className="w-4 h-4" />
                      {routine.productIds.length}개 상품
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Eye className="w-4 h-4" />
                      {routine.viewCount.toLocaleString()} 조회
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <LinkIcon className="w-4 h-4" />
                      {routine.clickCount.toLocaleString()} 클릭
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                      {routine.conversionCount} 전환
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {}}
                    disabled
                    className="p-2 text-gray-400 rounded cursor-not-allowed"
                    title={`${routine.status === 'published' ? '비게시' : '게시'} — ${PARTNEROPS_MUTATION_DISABLED_REASON}`}
                  >
                    {routine.status === 'published' ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {}}
                    disabled
                    className="p-2 text-gray-400 rounded cursor-not-allowed"
                    title={`수정 — ${PARTNEROPS_MUTATION_DISABLED_REASON}`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {}}
                    disabled
                    className="p-2 text-gray-400 rounded cursor-not-allowed"
                    title={`삭제 — ${PARTNEROPS_MUTATION_DISABLED_REASON}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
};

export default Routines;
