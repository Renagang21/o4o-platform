import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface Affiliation {
  id: string;
  memberId: string;
  memberName?: string;
  organizationId: string;
  organizationName?: string;
  organizationType: string;
  role?: string;
  status: 'active' | 'inactive' | 'pending';
  startDate: string;
  endDate?: string;
  createdAt: string;
}

/**
 * AffiliationManagement
 *
 * 회원 소속 관리 페이지
 */
export default function AffiliationManagement() {
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    organizationType: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    loadAffiliations();
  }, [filters, pagination.page]);

  const loadAffiliations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.organizationType) params.append('organizationType', filters.organizationType);
      if (filters.search) params.append('search', filters.search);

      const response = await authClient.api.get(`/api/membership/affiliations?${params}`);
      if (response.data?.success) {
        setAffiliations(response.data.data.items || response.data.data);
        if (response.data.data.total) {
          setPagination((prev) => ({ ...prev, total: response.data.data.total }));
        }
      }
    } catch (error) {
      console.error('Failed to load affiliations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      active: '활성',
      inactive: '비활성',
      pending: '대기',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getOrgTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      national: '본회',
      division: '지부',
      branch: '분회',
    };
    return labels[type] || type;
  };

  if (loading && affiliations.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">소속 관리</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="pending">대기</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">조직 유형</label>
            <select
              value={filters.organizationType}
              onChange={(e) => setFilters({ ...filters, organizationType: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="national">본회</option>
              <option value="division">지부</option>
              <option value="branch">분회</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="회원명, 조직명..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setPagination({ ...pagination, page: 1 });
                loadAffiliations();
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 w-full"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 소속 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">회원</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">소속 조직</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">조직 유형</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">역할</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">시작일</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">상태</th>
            </tr>
          </thead>
          <tbody>
            {affiliations.map((affiliation) => (
              <tr key={affiliation.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  {affiliation.memberName || affiliation.memberId}
                </td>
                <td className="px-4 py-3">
                  {affiliation.organizationName || affiliation.organizationId}
                </td>
                <td className="px-4 py-3 text-center">
                  {getOrgTypeLabel(affiliation.organizationType)}
                </td>
                <td className="px-4 py-3 text-center">{affiliation.role || '-'}</td>
                <td className="px-4 py-3 text-center text-sm">
                  {formatDate(affiliation.startDate)}
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(affiliation.status)}
                </td>
              </tr>
            ))}
            {affiliations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  소속 정보가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.total > pagination.limit && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-3 py-1">
            {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
