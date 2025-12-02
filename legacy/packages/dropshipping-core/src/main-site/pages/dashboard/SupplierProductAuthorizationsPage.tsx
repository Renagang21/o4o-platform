/**
 * Supplier Product Authorizations Page
 * Phase 3-6: 공급자용 판매자 신청 관리 페이지
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Check, X, Clock, AlertCircle } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { authorizationAPI } from '@/services/authorizationApi';
import {
  ProductAuthorizationSummary,
  AuthorizationStatus,
} from '@/types/dropshipping-authorization';

export const SupplierProductAuthorizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [authorizations, setAuthorizations] = useState<ProductAuthorizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AuthorizationStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Rejection modal state
  const [rejectingAuth, setRejectingAuth] = useState<ProductAuthorizationSummary | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch authorizations
  useEffect(() => {
    const fetchAuthorizations = async () => {
      setLoading(true);
      try {
        const productId = searchParams.get('productId') || undefined;

        const response = await authorizationAPI.fetchAuthorizations({
          status: statusFilter === 'all' ? undefined : statusFilter,
          supplier_product_id: productId,
          page: currentPage,
          limit: 20,
        });

        setAuthorizations(response.data.authorizations);
        setTotalPages(response.data.pagination.total_pages);
        setTotal(response.data.pagination.total);
      } catch (error) {
        console.error('신청 목록 조회 실패:', error);
        alert('신청 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorizations();
  }, [statusFilter, currentPage, searchParams]);

  // Handle approve
  const handleApprove = async (auth: ProductAuthorizationSummary) => {
    if (!confirm(`${auth.seller_name} 판매자의 신청을 승인하시겠습니까?`)) {
      return;
    }

    try {
      await authorizationAPI.approveAuthorization(auth.id);
      alert('승인이 완료되었습니다.');

      // Refresh list
      const productId = searchParams.get('productId') || undefined;
      const response = await authorizationAPI.fetchAuthorizations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        supplier_product_id: productId,
        page: currentPage,
        limit: 20,
      });
      setAuthorizations(response.data.authorizations);
    } catch (error) {
      console.error('승인 실패:', error);
      alert('승인에 실패했습니다.');
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!rejectingAuth) return;

    if (!rejectionReason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }

    try {
      await authorizationAPI.rejectAuthorization(rejectingAuth.id, {
        reason: rejectionReason,
      });
      alert('거절이 완료되었습니다.');

      // Refresh list
      const productId = searchParams.get('productId') || undefined;
      const response = await authorizationAPI.fetchAuthorizations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        supplier_product_id: productId,
        page: currentPage,
        limit: 20,
      });
      setAuthorizations(response.data.authorizations);

      // Close modal
      setRejectingAuth(null);
      setRejectionReason('');
    } catch (error) {
      console.error('거절 실패:', error);
      alert('거절에 실패했습니다.');
    }
  };

  // Get status badge
  const getStatusBadge = (status: AuthorizationStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <Check className="w-3 h-3" />
            승인됨
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            승인 대기
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            <X className="w-3 h-3" />
            거절됨
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3" />
            취소됨
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: '공급자 대시보드', href: '/dashboard/supplier' },
          { label: '판매자 신청 관리', isCurrent: true },
        ]}
      />

      <PageHeader
        title="판매자 신청 관리"
        subtitle="판매자들의 상품 판매 신청을 승인 또는 거절할 수 있습니다."
      />

      <div className="bg-white rounded-lg shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AuthorizationStatus | 'all');
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 상태</option>
              <option value="pending">승인 대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거절됨</option>
            </select>

            <div className="ml-auto text-sm text-gray-600">
              전체 {total}건
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : authorizations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<AlertCircle className="w-16 h-16 text-gray-400" />}
              title="신청이 없습니다"
              description={
                statusFilter === 'pending'
                  ? '현재 승인 대기 중인 신청이 없습니다.'
                  : '판매자 신청이 없습니다.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상품명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      판매자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청 메시지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청일
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {authorizations.map((auth) => (
                    <tr key={auth.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {auth.supplier_product_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {auth.seller_name || '-'}
                        </div>
                        {auth.seller_email && (
                          <div className="text-xs text-gray-500">{auth.seller_email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {auth.message || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(auth.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(auth.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {auth.status === 'pending' && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(auth)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
                              title="승인"
                            >
                              <Check className="w-4 h-4" />
                              승인
                            </button>
                            <button
                              onClick={() => setRejectingAuth(auth)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                              title="거절"
                            >
                              <X className="w-4 h-4" />
                              거절
                            </button>
                          </div>
                        )}
                        {auth.status === 'rejected' && auth.rejection_reason && (
                          <div className="text-xs text-gray-500 text-left max-w-xs">
                            사유: {auth.rejection_reason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  페이지 {currentPage} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              신청 거절
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{rejectingAuth.seller_name}</strong> 판매자의{' '}
              <strong>{rejectingAuth.supplier_product_name}</strong> 판매 신청을 거절합니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                거절 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="판매자에게 전달될 거절 사유를 입력해주세요."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRejectingAuth(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                거절하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupplierProductAuthorizationsPage;
