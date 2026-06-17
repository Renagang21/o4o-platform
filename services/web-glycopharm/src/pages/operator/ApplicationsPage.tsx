import { Link } from 'react-router-dom';
import { Building2, Truck, Monitor, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import {
  DataTable,
  useStandardListQuery,
  type ListColumnDef,
  type StandardListQueryState,
  type StandardPaginatedResponse,
} from '@o4o/operator-ux-core';
import { glycopharmApi } from '@/api/glycopharm';
import type { AdminApplication, ApplicationStatus, ServiceType, OrganizationType } from '@/api/glycopharm';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

/**
 * Operator Applications Page
 * 운영자용 신청 목록 화면
 *
 * WO-O4O-OPERATOR-DATATABLE-SOURCE-ALIGN-V1: DataTable @o4o/ui → @o4o/operator-ux-core
 * WO-O4O-OPERATOR-APPLICATIONS-STANDARD-LIST-ADOPTION-V1:
 *   useStandardListQuery + normalize({applications,pagination}) + URL sync(applications_*) + page=1 reset.
 *   검색·정렬은 backend(getAdminApplications)가 미지원 → 보류(필터 status/serviceType/orgType만 서버).
 */

const SERVICE_LABELS: Record<ServiceType, { label: string; icon: typeof Building2 }> = {
  dropshipping: { label: '무재고 판매', icon: Truck },
  sample_sales: { label: '샘플 판매', icon: Building2 },
  digital_signage: { label: '디지털사이니지', icon: Monitor },
};

interface AdminApplicationsResponse {
  applications: AdminApplication[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function ApplicationsPage() {
  const {
    items: applications,
    pagination,
    query,
    loading,
    error,
    setPage,
    setFilter,
    resetFilters,
    refetch,
  } = useStandardListQuery<AdminApplication, AdminApplicationsResponse>({
    defaultLimit: 20,
    syncUrl: true,
    urlKeyPrefix: 'applications',
    fetcher: (q: StandardListQueryState) =>
      glycopharmApi.getAdminApplications({
        status: (q.filters.status as ApplicationStatus | undefined) || undefined,
        serviceType: (q.filters.serviceType as ServiceType | undefined) || undefined,
        organizationType: (q.filters.organizationType as OrganizationType | undefined) || undefined,
        page: q.page,
        limit: q.limit,
      }),
    normalize: (res): StandardPaginatedResponse<AdminApplication> => {
      const p = res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 };
      return {
        data: res?.applications ?? [],
        pagination: {
          page: p.page,
          limit: p.limit,
          total: p.total,
          totalPages: p.totalPages,
          hasNextPage: p.page < p.totalPages,
          hasPreviousPage: p.page > 1,
        },
      };
    },
  });

  const statusFilter = (query.filters.status as string) ?? '';
  const serviceTypeFilter = (query.filters.serviceType as string) ?? '';
  const orgTypeFilter = (query.filters.organizationType as string) ?? '';
  const hasFilters = !!(statusFilter || serviceTypeFilter || orgTypeFilter);

  const err = error as { status?: number; message?: string } | null;
  const errorMessage = err
    ? err.status === 403
      ? '접근 권한이 없습니다. 운영자 또는 관리자 계정으로 로그인하세요.'
      : err.status === 401
        ? '로그인이 필요합니다.'
        : err.message || '신청 목록을 불러오는데 실패했습니다.'
    : null;

  return (
    <div className="p-6">
      <PageHeader
        title="신청 관리"
        description="약국 참여 신청을 검토하고 승인/반려 처리합니다."
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">필터</span>
          {hasFilters && (
            <button
              onClick={() => resetFilters()}
              className="ml-auto text-sm text-primary-600 hover:text-primary-700"
            >
              필터 초기화
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setFilter('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="submitted">심사 대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">반려됨</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">서비스 타입</label>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setFilter('serviceType', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="dropshipping">무재고 판매</option>
              <option value="sample_sales">샘플 판매</option>
              <option value="digital_signage">디지털사이니지</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">조직 유형</label>
            <select
              value={orgTypeFilter}
              onChange={(e) => setFilter('organizationType', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="pharmacy">개인 약국</option>
              <option value="pharmacy_chain">약국 체인</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-slate-500">
          총 <span className="font-medium text-slate-700">{pagination.total}</span>건
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-500">불러오는 중...</p>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-red-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Applications Table */}
      {!errorMessage && (() => {
        const columns: ListColumnDef<AdminApplication>[] = [
          {
            key: 'organizationName',
            header: '약국명',
            render: (_v, app) => (
              <div>
                <p className="font-medium text-slate-800">{app.organizationName}</p>
                <p className="text-xs text-slate-500">
                  {app.organizationType === 'pharmacy' ? '개인 약국' : '약국 체인'}
                </p>
              </div>
            ),
          },
          {
            key: 'userName',
            header: '신청자',
            render: (_v, app) => (
              <div>
                <p className="text-sm text-slate-700">{app.userName || '-'}</p>
                <p className="text-xs text-slate-500">{app.userEmail || '-'}</p>
              </div>
            ),
          },
          {
            key: 'serviceTypes',
            header: '서비스',
            render: (_v, app) => (
              <div className="flex flex-wrap gap-1">
                {app.serviceTypes.map((serviceType) => (
                  <span key={serviceType} className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                    {SERVICE_LABELS[serviceType]?.label ?? serviceType}
                  </span>
                ))}
              </div>
            ),
          },
          {
            key: 'status',
            header: '상태',
            width: '120px',
            render: (_v, app) => <StatusBadge status={app.status} />,
          },
          {
            key: 'submittedAt',
            header: '신청일',
            width: '100px',
            render: (_v, app) => (
              <span className="text-sm text-slate-600">{new Date(app.submittedAt).toLocaleDateString('ko-KR')}</span>
            ),
          },
          {
            key: '_actions',
            header: '',
            system: true,
            width: '60px',
            align: 'right',
            render: (_v, app) => (
              <Link to={`/operator/applications/${app.id}`} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
                상세<ChevronRight className="w-4 h-4" />
              </Link>
            ),
          },
        ];

        return (
          <>
            <DataTable<AdminApplication>
              columns={columns}
              data={applications}
              rowKey="id"
              loading={loading}
              emptyMessage={hasFilters ? '조건에 맞는 신청이 없습니다.' : '신청 내역이 없습니다.'}
              tableId="glycopharm-operator-applications"
            />
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setPage(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
                <span className="text-sm text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
