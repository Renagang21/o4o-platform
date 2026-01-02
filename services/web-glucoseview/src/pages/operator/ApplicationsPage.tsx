/**
 * GlucoseView Operator Applications Page
 *
 * Phase C-4: 운영자용 신청 목록 페이지
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { AdminApplication, ApplicationStatus } from '../../services/api';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bgColor: string; textColor: string }> = {
  submitted: { label: '심사 대기', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  approved: { label: '승인됨', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: '반려됨', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

export default function OperatorApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadApplications();
  }, [statusFilter, page]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getAdminApplications({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setApplications(response.applications);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('FORBIDDEN')) {
        setError('접근 권한이 없습니다. 운영자 계정으로 로그인해주세요.');
      } else {
        setError(err.message || '신청 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">GlucoseView 신청 관리</h1>
          <p className="text-gray-600">CGM View 서비스 신청을 검토하고 승인합니다</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">상태 필터:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ApplicationStatus | '');
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              <option value="submitted">심사 대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">반려됨</option>
            </select>
            <span className="text-sm text-gray-500 ml-auto">
              총 {total}건
            </span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadApplications}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              다시 시도
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">신청 내역이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">신청자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">약국명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">서비스</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">신청일</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((app) => {
                    const statusConfig = STATUS_CONFIG[app.status];
                    return (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{app.userName || '-'}</p>
                            <p className="text-xs text-gray-500">{app.userEmail || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{app.pharmacyName}</p>
                          {app.businessNumber && (
                            <p className="text-xs text-gray-500">{app.businessNumber}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {app.serviceTypes.map((service) => (
                              <span
                                key={service}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                              >
                                {service === 'cgm_view' ? 'CGM View' : service}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(app.submittedAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/operator/glucoseview/applications/${app.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            상세 →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
