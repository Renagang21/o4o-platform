import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Building2, Truck, Monitor, ChevronRight, Filter } from 'lucide-react';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { glycopharmApi } from '@/api/glycopharm';
import type { AdminApplication, ApplicationStatus, ServiceType, OrganizationType } from '@/api/glycopharm';

/**
 * Operator Applications Page
 * 운영자용 신청 목록 화면
 */

const SERVICE_LABELS: Record<ServiceType, { label: string; icon: typeof Building2 }> = {
  dropshipping: { label: '무재고 판매', icon: Truck },
  sample_sales: { label: '샘플 판매', icon: Building2 },
  digital_signage: { label: '디지털 사이니지', icon: Monitor },
};

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; icon: typeof Clock; bgColor: string; textColor: string }> = {
  submitted: { label: '심사 대기', icon: Clock, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  approved: { label: '승인됨', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: '반려됨', icon: XCircle, bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | ''>('');
  const [orgTypeFilter, setOrgTypeFilter] = useState<OrganizationType | ''>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadApplications();
  }, [statusFilter, serviceTypeFilter, orgTypeFilter, page]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await glycopharmApi.getAdminApplications({
        status: statusFilter || undefined,
        serviceType: serviceTypeFilter || undefined,
        organizationType: orgTypeFilter || undefined,
        page,
        limit: 20,
      });

      setApplications(response.applications);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      if (err.status === 403) {
        setError('접근 권한이 없습니다. 운영자 또는 관리자 계정으로 로그인하세요.');
      } else if (err.status === 401) {
        setError('로그인이 필요합니다.');
      } else {
        setError(err.message || '신청 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setServiceTypeFilter('');
    setOrgTypeFilter('');
    setPage(1);
  };

  const hasFilters = statusFilter || serviceTypeFilter || orgTypeFilter;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">신청 관리</h1>
        <p className="text-slate-500">약국 참여 신청을 검토하고 승인/반려 처리합니다.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">필터</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
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
              onChange={(e) => {
                setStatusFilter(e.target.value as ApplicationStatus | '');
                setPage(1);
              }}
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
              onChange={(e) => {
                setServiceTypeFilter(e.target.value as ServiceType | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="dropshipping">무재고 판매</option>
              <option value="sample_sales">샘플 판매</option>
              <option value="digital_signage">디지털 사이니지</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">조직 유형</label>
            <select
              value={orgTypeFilter}
              onChange={(e) => {
                setOrgTypeFilter(e.target.value as OrganizationType | '');
                setPage(1);
              }}
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
          총 <span className="font-medium text-slate-700">{total}</span>건
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
      {error && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadApplications}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Applications Table */}
      {!error && (() => {
        const columns: Column<AdminApplication>[] = [
          {
            key: 'organizationName',
            title: '약국명',
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
            title: '신청자',
            render: (_v, app) => (
              <div>
                <p className="text-sm text-slate-700">{app.userName || '-'}</p>
                <p className="text-xs text-slate-500">{app.userEmail || '-'}</p>
              </div>
            ),
          },
          {
            key: 'serviceTypes',
            title: '서비스',
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
            title: '상태',
            width: '120px',
            render: (_v, app) => {
              const cfg = STATUS_CONFIG[app.status];
              const Icon = cfg.icon;
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.textColor}`}>
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </span>
              );
            },
          },
          {
            key: 'submittedAt',
            title: '신청일',
            width: '100px',
            render: (_v, app) => (
              <span className="text-sm text-slate-600">{new Date(app.submittedAt).toLocaleDateString('ko-KR')}</span>
            ),
          },
          {
            key: 'actions',
            title: '',
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
          <DataTable<AdminApplication>
            columns={columns}
            dataSource={applications}
            rowKey="id"
            loading={loading}
            emptyText={hasFilters ? '조건에 맞는 신청이 없습니다.' : '신청 내역이 없습니다.'}
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: (p) => setPage(p),
            }}
          />
        );
      })()}
    </div>
  );
}
