import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  performedByName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

/**
 * AuditLogManagement
 *
 * 회원 활동 감사 로그 관리 페이지
 */
export default function AuditLogManagement() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });

  useEffect(() => {
    loadLogs();
  }, [filters, pagination.page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await authClient.api.get(`/api/membership/audit-logs?${params}`);
      if (response.data?.success) {
        setLogs(response.data.data.items || response.data.data);
        if (response.data.data.total) {
          setPagination((prev) => ({ ...prev, total: response.data.data.total }));
        }
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '생성',
      update: '수정',
      delete: '삭제',
      approve: '승인',
      reject: '거부',
      login: '로그인',
      logout: '로그아웃',
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      member: '회원',
      affiliation: '소속',
      category: '회원유형',
      verification: '인증',
    };
    return labels[type] || type;
  };

  if (loading && logs.length === 0) {
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
        <h1 className="text-2xl font-bold">감사 로그</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">활동 유형</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="create">생성</option>
              <option value="update">수정</option>
              <option value="delete">삭제</option>
              <option value="approve">승인</option>
              <option value="reject">거부</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">대상 유형</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="member">회원</option>
              <option value="affiliation">소속</option>
              <option value="category">회원유형</option>
              <option value="verification">인증</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setPagination({ ...pagination, page: 1 });
                loadLogs();
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 w-full"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">일시</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">활동</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">대상</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">수행자</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {getActionLabel(log.action)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {getEntityTypeLabel(log.entityType)} ({log.entityId.substring(0, 8)}...)
                </td>
                <td className="px-4 py-3 text-sm">
                  {log.performedByName || log.performedBy}
                </td>
                <td className="px-4 py-3 text-sm font-mono">{log.ipAddress || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  감사 로그가 없습니다.
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
