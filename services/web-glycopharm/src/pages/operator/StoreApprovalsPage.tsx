/**
 * StoreApprovalsPage - 운영자용 스토어 판매 참여 신청 목록
 *
 * Phase 2: 운영자 승인 UI
 * - 신청 목록 조회 (상태별 필터링)
 * - 신청 상세 페이지 링크
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileEdit,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { storeApi } from '@/api/store';
import type { StoreApplication, StoreApplicationStatus } from '@/types/store';

// 상태별 설정
const STATUS_CONFIG: Record<
  StoreApplicationStatus,
  {
    label: string;
    icon: typeof Clock;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  draft: {
    label: '작성 중',
    icon: FileEdit,
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-300',
  },
  submitted: {
    label: '심사 대기',
    icon: Clock,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  reviewing: {
    label: '심사 중',
    icon: Clock,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  supplementing: {
    label: '보완 요청',
    icon: AlertTriangle,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
  },
  approved: {
    label: '승인됨',
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  rejected: {
    label: '반려됨',
    icon: XCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
};

// 필터용 상태 옵션
const STATUS_OPTIONS: Array<{ value: StoreApplicationStatus | ''; label: string }> = [
  { value: '', label: '전체' },
  { value: 'submitted', label: '심사 대기' },
  { value: 'reviewing', label: '심사 중' },
  { value: 'supplementing', label: '보완 요청' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
];

export default function StoreApprovalsPage() {
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StoreApplicationStatus | ''>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await storeApi.getStoreApplications({
        status: statusFilter || undefined,
        page,
        pageSize: 20,
      });

      if (response.success && response.data) {
        setApplications(response.data.items);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      } else {
        throw new Error('데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      if (err.status === 403) {
        setError('접근 권한이 없습니다. 운영자 또는 관리자 계정으로 로그인하세요.');
      } else if (err.status === 401) {
        setError('로그인이 필요합니다.');
      } else {
        setError(err.message || '신청 목록을 불러오는데 실패했습니다.');
      }
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const clearFilters = () => {
    setStatusFilter('');
    setPage(1);
  };

  const hasFilters = !!statusFilter;

  // 대기 중인 신청 수 계산 (submitted + reviewing + supplementing)
  const pendingCount = applications.filter((a) =>
    ['submitted', 'reviewing', 'supplementing'].includes(a.status)
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">스토어 판매 참여 신청</h1>
            <p className="text-slate-500 text-sm">
              약국 B2C 스토어 판매 참여 신청을 검토하고 승인/반려 처리합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {applications.filter((a) => a.status === 'submitted').length}
              </p>
              <p className="text-xs text-slate-500">심사 대기</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {applications.filter((a) => a.status === 'reviewing').length}
              </p>
              <p className="text-xs text-slate-500">심사 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {applications.filter((a) => a.status === 'approved').length}
              </p>
              <p className="text-xs text-slate-500">승인됨</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{total}</p>
              <p className="text-xs text-slate-500">전체</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">필터</span>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                필터 초기화
              </button>
            )}
            <button
              onClick={loadApplications}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value || 'all'}
              onClick={() => {
                setStatusFilter(option.value as StoreApplicationStatus | '');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === option.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">불러오는 중...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadApplications}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Applications List */}
      {!loading && !error && applications.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  약국명
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  사업자 정보
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  관리약사
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  상태
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  신청일
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => {
                const statusConfig = STATUS_CONFIG[app.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{app.form.pharmacyName}</p>
                        <p className="text-xs text-slate-500">{app.form.pharmacyAddress}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-slate-700">{app.form.businessName}</p>
                        <p className="text-xs text-slate-500">{app.form.businessNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-slate-700">{app.form.pharmacistName}</p>
                        <p className="text-xs text-slate-500">
                          면허 #{app.form.pharmacistLicense}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/operator/store-approvals/${app.id}`}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        상세
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && applications.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Store className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">신청 내역이 없습니다</h3>
          <p className="text-slate-500">
            {hasFilters
              ? '조건에 맞는 신청이 없습니다.'
              : '아직 스토어 판매 참여 신청이 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
