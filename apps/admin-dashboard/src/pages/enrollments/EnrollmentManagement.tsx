/**
 * P0 RBAC: Enrollment Management Page
 * - Admins review and approve/reject/hold role enrollments
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { cookieAuthClient, Enrollment } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/common/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'on_hold';
type FilterRole = 'all' | 'supplier' | 'seller' | 'partner';

const statusLabels: Record<string, { text: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { text: '심사 중', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { text: '승인', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { text: '거부', color: 'bg-red-100 text-red-800', icon: XCircle },
  on_hold: { text: '보류', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
};

const roleLabels: Record<string, string> = {
  supplier: '공급자',
  seller: '판매자',
  partner: '파트너',
};

const EnrollmentManagement = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // D-2: Debounced search (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // D-3: Keyboard shortcuts
  useKeyboardShortcuts();

  // Close dropdown on ESC key
  useEffect(() => {
    const handleEscape = () => setActiveDropdown(null);
    window.addEventListener('keyboard-escape', handleEscape);
    return () => window.removeEventListener('keyboard-escape', handleEscape);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  // Fetch enrollments
  useEffect(() => {
    fetchEnrollments();
  }, [filterStatus, filterRole, currentPage, debouncedSearchQuery]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterRole !== 'all') params.role = filterRole;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const response = await cookieAuthClient.getAdminEnrollments(params);
      setEnrollments(response.enrollments);
      setTotalEnrollments(response.total || response.enrollments.length);
    } catch (error: any) {
      const errorCode = error.response?.data?.code;

      if (errorCode === 'FORBIDDEN') {
        toast.error('권한이 필요합니다.');
      } else if (errorCode === 'TOO_MANY_REQUESTS') {
        toast.error('요청 빈도가 높습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('신청 목록을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 신청을 승인하시겠습니까?')) return;

    try {
      await cookieAuthClient.approveEnrollment(id);
      toast.success('승인되었습니다.');
      fetchEnrollments();
    } catch (error: any) {
      const errorCode = error.response?.data?.code;
      if (errorCode === 'ALREADY_PROCESSED') {
        toast.error('이미 처리된 신청입니다.');
      } else {
        toast.error('승인에 실패했습니다.');
      }
      fetchEnrollments();
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (!reason) return;

    try {
      await cookieAuthClient.rejectEnrollment(id, reason);
      toast.success('거부되었습니다.');
      fetchEnrollments();
    } catch (error) {
      toast.error('거부에 실패했습니다.');
    }
  };

  const handleHold = async (id: string) => {
    const reason = prompt('보류 사유를 입력하세요:');
    if (!reason) return;

    try {
      await cookieAuthClient.holdEnrollment(id, reason);
      toast.success('보류되었습니다.');
      fetchEnrollments();
    } catch (error) {
      toast.error('보류에 실패했습니다.');
    }
  };

  const totalPages = Math.ceil(totalEnrollments / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '역할 신청 관리' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">역할 신청 관리</h1>
            <p className="mt-1 text-sm text-gray-600">
              사용자의 역할 신청을 검토하고 승인/거부할 수 있습니다.
            </p>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="사용자 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Role Filter */}
              <div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 역할</option>
                  <option value="supplier">공급자</option>
                  <option value="seller">판매자</option>
                  <option value="partner">파트너</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 상태</option>
                  <option value="pending">심사 중</option>
                  <option value="approved">승인</option>
                  <option value="rejected">거부</option>
                  <option value="on_hold">보류</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                신청 내역이 없습니다.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrollments.map((enrollment) => {
                    const StatusIcon = statusLabels[enrollment.status].icon;

                    return (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {enrollment.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {roleLabels[enrollment.role] || enrollment.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusLabels[enrollment.status].color}`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {statusLabels[enrollment.status].text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(enrollment.submittedAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {enrollment.status === 'pending' ? (
                            <div className="relative">
                              {/* D-4: Quick Actions Dropdown */}
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === enrollment.id ? null : enrollment.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="액션"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-600" />
                              </button>
                              {activeDropdown === enrollment.id && (
                                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                  <button
                                    onClick={() => {
                                      handleApprove(enrollment.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-green-600 rounded-t-lg"
                                  >
                                    ✓ 승인
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleHold(enrollment.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-orange-600"
                                  >
                                    ⏸ 보류
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleReject(enrollment.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 rounded-b-lg"
                                  >
                                    ✕ 거부
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">처리 완료</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
                totalItems={0}
                itemsPerPage={10}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentManagement;
