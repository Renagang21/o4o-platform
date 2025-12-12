/**
 * Membership-Yaksa: Audit Log Management Page
 *
 * Phase 2: 회원 변경 이력 조회 UI
 * - 회원정보 변경 이력 조회
 * - 변경 필드별 필터링
 * - 기간별 필터링
 * - 변경 내역 상세 보기
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  ArrowRight,
  X,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/common/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ChangedField {
  field: string;
  oldValue: any;
  newValue: any;
  label: string;
}

interface AuditLog {
  id: string;
  memberId: string;
  memberName?: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  changedFields: ChangedField[];
  changedBy: string;
  changedByName?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  member?: {
    id: string;
    name: string;
    licenseNumber: string;
  };
}

const ACTION_LABELS: Record<string, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  status_change: '상태 변경',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  status_change: 'bg-yellow-100 text-yellow-800',
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '(없음)';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const AuditLogManagement = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterField, setFilterField] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [itemsPerPage] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  useKeyboardShortcuts();

  // Available fields for filtering
  const fieldOptions = [
    { value: 'all', label: '모든 필드' },
    { value: 'name', label: '이름' },
    { value: 'licenseNumber', label: '면허번호' },
    { value: 'phone', label: '전화번호' },
    { value: 'email', label: '이메일' },
    { value: 'isVerified', label: '검증 상태' },
    { value: 'isActive', label: '활성 상태' },
    { value: 'categoryId', label: '회원 분류' },
    { value: 'pharmacistType', label: '약사 유형' },
    { value: 'officialRole', label: '직책' },
    { value: 'workplaceName', label: '근무지명' },
    { value: 'organizationId', label: '소속 조직' },
  ];

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterField, startDate, endDate, currentPage, debouncedSearchQuery]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterAction !== 'all') params.action = filterAction;
      if (filterField !== 'all') params.field = filterField;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const response = await authClient.api.get('/membership/audit-logs', { params });

      if (response.data.success) {
        setLogs(response.data.data || []);
        setTotalLogs(response.data.total || response.data.data?.length || 0);
      } else {
        toast.error('변경 이력을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load audit logs:', error);
      const errorCode = error.response?.data?.code;
      if (errorCode === 'FORBIDDEN') {
        toast.error('권한이 필요합니다.');
      } else {
        toast.error('변경 이력을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
  };

  const handleCloseDetail = () => {
    setSelectedLog(null);
  };

  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '회원 관리', href: '/admin/membership/members' },
          { label: '변경 이력' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-6 h-6" />
                  회원 변경 이력
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  회원 정보의 모든 변경 내역을 조회할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="회원명, 면허번호 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Action Filter */}
              <div>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 액션</option>
                  <option value="create">생성</option>
                  <option value="update">수정</option>
                  <option value="delete">삭제</option>
                  <option value="status_change">상태 변경</option>
                </select>
              </div>

              {/* Field Filter */}
              <div>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {fieldOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="시작일"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="종료일"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  날짜 초기화
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                변경 이력이 없습니다.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      일시
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      회원
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      변경 필드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      변경자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상세
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.member?.name || log.memberName || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.member?.licenseNumber || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {log.changedFields.slice(0, 3).map((field, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {field.label || field.field}
                            </span>
                          ))}
                          {log.changedFields.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{log.changedFields.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.changedByName || log.changedBy || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewDetail(log)}
                          className="text-blue-600 hover:text-blue-900"
                          title="상세 보기"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">변경 이력 상세</h2>
              <button
                onClick={handleCloseDetail}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">일시</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">액션</label>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[selectedLog.action]}`}>
                    {ACTION_LABELS[selectedLog.action]}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">회원</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLog.member?.name || selectedLog.memberName || '-'}
                    {selectedLog.member?.licenseNumber && (
                      <span className="text-gray-500 ml-2">({selectedLog.member.licenseNumber})</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">변경자</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.changedByName || selectedLog.changedBy || '-'}</p>
                </div>
              </div>

              {/* Reason */}
              {selectedLog.reason && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500">변경 사유</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedLog.reason}</p>
                </div>
              )}

              {/* Changed Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-3">변경 내역</label>
                <div className="space-y-3">
                  {selectedLog.changedFields.map((field, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {field.label || field.field}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-red-50 border border-red-200 rounded px-3 py-2">
                          <div className="text-xs text-red-600 mb-1">이전 값</div>
                          <div className="text-sm text-gray-900 break-all">
                            {formatValue(field.oldValue)}
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 bg-green-50 border border-green-200 rounded px-3 py-2">
                          <div className="text-xs text-green-600 mb-1">변경 값</div>
                          <div className="text-sm text-gray-900 break-all">
                            {formatValue(field.newValue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Info */}
              {(selectedLog.ipAddress || selectedLog.userAgent) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">기술 정보</label>
                  {selectedLog.ipAddress && (
                    <p className="text-xs text-gray-500">IP: {selectedLog.ipAddress}</p>
                  )}
                  {selectedLog.userAgent && (
                    <p className="text-xs text-gray-500 truncate">UA: {selectedLog.userAgent}</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseDetail}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogManagement;
