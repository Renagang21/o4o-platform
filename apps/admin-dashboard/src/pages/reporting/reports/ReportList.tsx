/**
 * Reporting-Yaksa: Report List Page
 *
 * List and manage annual reports
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface AnnualReport {
  id: string;
  memberId: string;
  organizationId: string;
  year: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: '작성 중', color: 'bg-gray-100 text-gray-800', icon: <FileText className="w-4 h-4" /> },
  submitted: { label: '제출됨', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4" /> },
  approved: { label: '승인됨', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: '반려됨', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
  revision_requested: { label: '수정 요청', color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="w-4 h-4" /> },
};

const ReportList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [reports, setReports] = useState<AnnualReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [year, setYear] = useState(searchParams.get('year') || String(new Date().getFullYear()));
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useKeyboardShortcuts();

  useEffect(() => {
    fetchReports();
  }, [page, year, status]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (year) params.append('year', year);
      if (status) params.append('status', status);

      const response = await authClient.api.get(`/reporting/reports?${params.toString()}`);

      if (response.data.success) {
        setReports(response.data.data || []);
        setTotal(response.data.total || 0);
      } else {
        toast.error('신고서 목록을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      // API가 연결되지 않은 경우
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (newStatus) {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    setSearchParams(params);
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.set('year', newYear);
    setSearchParams(params);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '신상신고', href: '/admin/reporting' },
          { label: '신고서 목록' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">신고서 목록</h1>
            <p className="mt-1 text-sm text-gray-600">
              제출된 신상신고서를 확인하고 승인/반려합니다.
            </p>
          </div>
          <button
            onClick={fetchReports}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">모든 상태</option>
                <option value="draft">작성 중</option>
                <option value="submitted">제출됨 (승인 대기)</option>
                <option value="approved">승인됨</option>
                <option value="rejected">반려됨</option>
                <option value="revision_requested">수정 요청</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="회원 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-4 text-gray-600">로딩 중...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>신고서가 없습니다.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회원 ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제출일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    처리일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => {
                  const statusInfo = statusConfig[report.status];
                  return (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {report.year}년
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.memberId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.submittedAt
                          ? new Date(report.submittedAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.approvedAt
                          ? new Date(report.approvedAt).toLocaleDateString('ko-KR')
                          : report.rejectedAt
                          ? new Date(report.rejectedAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/admin/reporting/reports/${report.id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="상세보기"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    총 <span className="font-medium">{total}</span>건 중{' '}
                    <span className="font-medium">{(page - 1) * limit + 1}</span> -{' '}
                    <span className="font-medium">{Math.min(page * limit, total)}</span>건
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      이전
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportList;
