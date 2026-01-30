/**
 * Membership-Yaksa: Verification Management Page
 *
 * Admin page for reviewing and approving member license verifications
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Eye,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/common/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ExportButton from '@/components/membership/ExportButton';

interface Verification {
  id: string;
  memberId: string;
  verifierId: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  detail: any;
  rejectionReason: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    name: string;
    licenseNumber: string;
    email: string | null;
  };
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'expired';
type FilterMethod = 'all' | 'license_api' | 'manual_upload' | 'phone_verification';

const statusLabels: Record<string, { text: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { text: '심사 중', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { text: '승인', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { text: '거부', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { text: '만료', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
};

const methodLabels: Record<string, string> = {
  license_api: '면허 API',
  manual_upload: '서류 업로드',
  phone_verification: '전화 인증',
};

const VerificationManagement = () => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterMethod, setFilterMethod] = useState<FilterMethod>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalVerifications, setTotalVerifications] = useState(0);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  useKeyboardShortcuts();

  // Fetch verifications
  useEffect(() => {
    fetchVerifications();
  }, [filterStatus, filterMethod, currentPage, debouncedSearchQuery]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterMethod !== 'all') params.method = filterMethod;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const response = await authClient.api.get('/membership/verifications', { params });

      if (response.data.success) {
        setVerifications(response.data.data || []);
        setTotalVerifications(response.data.total || response.data.data?.length || 0);
      } else {
        toast.error('검증 목록을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load verifications:', error);

      const errorCode = error.response?.data?.code;
      if (errorCode === 'FORBIDDEN') {
        toast.error('권한이 필요합니다.');
      } else if (errorCode === 'TOO_MANY_REQUESTS') {
        toast.error('요청 빈도가 높습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('검증 목록을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 검증을 승인하시겠습니까?')) return;

    try {
      await authClient.api.post(`/api/membership/verifications/${id}/approve`);
      toast.success('승인되었습니다.');
      fetchVerifications();
      setSelectedVerification(null);
    } catch (error: any) {
      const errorCode = error.response?.data?.code;
      if (errorCode === 'ALREADY_PROCESSED') {
        toast.error('이미 처리된 검증입니다.');
      } else {
        toast.error('승인에 실패했습니다.');
      }
      fetchVerifications();
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (!reason) return;

    try {
      await authClient.api.post(`/api/membership/verifications/${id}/reject`, {
        reason,
      });
      toast.success('거부되었습니다.');
      fetchVerifications();
      setSelectedVerification(null);
    } catch (error) {
      toast.error('거부에 실패했습니다.');
    }
  };

  const handleViewDetails = (verification: Verification) => {
    setSelectedVerification(verification);
  };

  const totalPages = Math.ceil(totalVerifications / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '검증 관리' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">검증 관리</h1>
                <p className="mt-1 text-sm text-gray-600">
                  회원의 면허 검증 요청을 검토하고 승인/거부할 수 있습니다.
                </p>
              </div>
              <ExportButton
                type="verifications"
                filters={{
                  search: debouncedSearchQuery,
                  status: filterStatus !== 'all' ? filterStatus : undefined,
                  method: filterMethod !== 'all' ? filterMethod : undefined,
                }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="회원 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Method Filter */}
              <div>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value as FilterMethod)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 인증 방법</option>
                  <option value="license_api">면허 API</option>
                  <option value="manual_upload">서류 업로드</option>
                  <option value="phone_verification">전화 인증</option>
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
                  <option value="expired">만료</option>
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
            ) : verifications.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                검증 요청이 없습니다.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      회원
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      면허번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      인증 방법
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
                  {verifications.map((verification) => {
                    const StatusIcon = statusLabels[verification.status].icon;

                    return (
                      <tr key={verification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {verification.member?.name || '-'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {verification.member?.email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {verification.member?.licenseNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {methodLabels[verification.method] || verification.method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusLabels[verification.status].color}`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {statusLabels[verification.status].text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(verification.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {verification.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewDetails(verification)}
                                className="text-blue-600 hover:text-blue-900"
                                title="상세 보기"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleApprove(verification.id)}
                                className="text-green-600 hover:text-green-900"
                                title="승인"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReject(verification.id)}
                                className="text-red-600 hover:text-red-900"
                                title="거부"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
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
                totalItems={totalVerifications}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">검증 상세 정보</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">회원명</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedVerification.member?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">면허번호</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedVerification.member?.licenseNumber || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">인증 방법</dt>
                  <dd className="mt-1 text-sm text-gray-900">{methodLabels[selectedVerification.method] || selectedVerification.method}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">상세 정보</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
                      {JSON.stringify(selectedVerification.detail, null, 2)}
                    </pre>
                  </dd>
                </div>
                {selectedVerification.rejectionReason && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">거부 사유</dt>
                    <dd className="mt-1 text-sm text-red-600">{selectedVerification.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedVerification(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                닫기
              </button>
              {selectedVerification.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedVerification.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(selectedVerification.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    거부
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationManagement;
