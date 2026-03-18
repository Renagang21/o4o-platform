/**
 * RegistrationRequestsPage - 가입 신청 관리
 *
 * 서비스 운영자가 관리:
 * - 가입 신청 목록 조회
 * - 신청 상세 확인
 * - 승인 / 거부 처리
 * - 이메일 알림 발송
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import { operatorRegistrationApi } from '../../../lib/api';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
type UserRole = 'supplier' | 'partner' | 'consumer' | 'seller' | 'pharmacist' | 'ALL';

interface RegistrationRequest {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  service: string;
  companyName?: string;
  businessNumber?: string;
  licenseNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectReason?: string;
}


const roleLabels: Record<string, string> = {
  ALL: '전체',
  admin: '관리자',
  operator: '운영자',
  supplier: '공급자',
  partner: '파트너',
  user: '사용자',
  consumer: '소비자',
  seller: '판매자',
  pharmacist: '약사회원',
};

const statusLabels: Record<RequestStatus, string> = {
  ALL: '전체',
  PENDING: '승인대기',
  APPROVED: '승인완료',
  REJECTED: '거부됨',
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await operatorRegistrationApi.getRegistrations();
      const mapped: RegistrationRequest[] = (data || []).map((r) => ({
        id: r.id,
        email: r.email || '',
        name: r.name || '',
        phone: r.phone || '',
        role: (r.role as UserRole) || 'consumer',
        service: r.service || 'neture',
        companyName: r.companyName,
        businessNumber: r.businessNumber,
        licenseNumber: r.licenseNumber,
        status: (r.status?.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED') || 'PENDING',
        createdAt: r.createdAt || new Date().toISOString(),
        processedAt: r.processedAt,
        processedBy: r.processedBy,
        rejectReason: r.rejectReason,
      }));
      setRequests(mapped);
    } catch (error) {
      console.error('Failed to fetch registration requests:', error);
      const errMsg = error instanceof Error ? error.message : 'UNKNOWN';
      if (errMsg.includes('403')) {
        setFetchError('가입 신청 데이터에 접근할 권한이 없습니다. 관리자에게 문의하세요.');
      } else {
        setFetchError('가입 신청 데이터를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (request: RegistrationRequest) => {
    try {
      setProcessing(true);
      setMessage(null);

      const result = await operatorRegistrationApi.approve(request.id);
      if (!result.success) {
        setMessage({ type: 'error', text: '승인 처리에 실패했습니다.' });
        return;
      }

      setMessage({ type: 'success', text: `${request.name}님의 가입 신청이 승인되었습니다.` });
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error) {
      setMessage({ type: 'error', text: '처리 중 오류가 발생했습니다.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request: RegistrationRequest) => {
    if (!rejectReason.trim()) {
      setMessage({ type: 'error', text: '거부 사유를 입력해주세요.' });
      return;
    }

    try {
      setProcessing(true);
      setMessage(null);

      const result = await operatorRegistrationApi.reject(request.id, rejectReason);
      if (!result.success) {
        setMessage({ type: 'error', text: '거부 처리에 실패했습니다.' });
        return;
      }

      setMessage({ type: 'success', text: `${request.name}님의 가입 신청이 거부되었습니다.` });
      setSelectedRequest(null);
      setShowRejectModal(false);
      setRejectReason('');
      await fetchRequests();
    } catch (error) {
      setMessage({ type: 'error', text: '처리 중 오류가 발생했습니다.' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
    const matchesRole = roleFilter === 'ALL' || request.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  // DataTable columns (축약 버전: 4개 컬럼 + 액션)
  const columns: Column<Record<string, any>>[] = [
    { key: 'applicant', title: '신청자', dataIndex: 'applicant', width: '30%' },
    { key: 'company', title: '회사 / 면허', dataIndex: 'company', width: '20%' },
    { key: 'date', title: '신청일', dataIndex: 'date', width: '15%' },
    { key: 'status', title: '상태', dataIndex: 'status', width: '15%', align: 'center' },
    { key: 'actions', title: '', dataIndex: 'actions', width: '20%' },
  ];

  // DataTable rows
  const tableRows = filteredRequests.map((request) => ({
    id: request.id,
    applicant: (
      <div>
        <div className="font-medium text-gray-900">{request.name}</div>
        <div className="text-sm text-gray-600">{roleLabels[request.role]}</div>
        <div className="text-sm text-gray-500">{request.email}</div>
      </div>
    ),
    company: (
      <div className="text-sm text-gray-900">
        {request.companyName || request.licenseNumber || '-'}
        {request.businessNumber && (
          <div className="text-sm text-gray-500 mt-1">{request.businessNumber}</div>
        )}
      </div>
    ),
    date: (
      <div className="text-sm text-gray-600">
        {new Date(request.createdAt).toLocaleDateString('ko-KR')}
      </div>
    ),
    status: (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusStyles[request.status]}`}>
        {statusLabels[request.status]}
      </span>
    ),
    actions: (
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedRequest(request)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          상세보기
        </button>
        {request.status === 'PENDING' && (
          <>
            <button
              onClick={() => handleApprove(request)}
              disabled={processing}
              className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
            >
              승인
            </button>
            <button
              onClick={() => {
                setSelectedRequest(request);
                setShowRejectModal(true);
              }}
              disabled={processing}
              className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
            >
              거부
            </button>
          </>
        )}
      </div>
    ),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">가입 신청 목록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link to="/operator" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-gray-900">가입 신청 관리</span>
            </div>
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {pendingCount}건 대기
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fetch Error Alert */}
        {fetchError && (
          <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">에러 발생</p>
              <p className="text-sm">{fetchError}</p>
            </div>
            <button
              onClick={() => fetchRequests()}
              className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded-md transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success'
              ? <CheckCircle className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />
            }
            <span>{message.text}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 이메일, 회사명으로 검색"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Request List - SimpleTable */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <DataTable
            columns={columns}
            dataSource={tableRows}
            rowKey="id"
            loading={loading}
            emptyText="조건에 맞는 가입 신청이 없습니다"
          />
        </div>

        {/* Detail Modal */}
        {selectedRequest && !showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">가입 신청 상세</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">이름</div>
                    <div className="font-medium">{selectedRequest.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">역할</div>
                    <div className="font-medium">{roleLabels[selectedRequest.role]}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">이메일</div>
                    <div className="font-medium">{selectedRequest.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">연락처</div>
                    <div className="font-medium">{selectedRequest.phone}</div>
                  </div>
                  {selectedRequest.companyName && (
                    <div>
                      <div className="text-sm text-gray-500">회사명</div>
                      <div className="font-medium">{selectedRequest.companyName}</div>
                    </div>
                  )}
                  {selectedRequest.businessNumber && (
                    <div>
                      <div className="text-sm text-gray-500">사업자번호</div>
                      <div className="font-medium">{selectedRequest.businessNumber}</div>
                    </div>
                  )}
                  {selectedRequest.licenseNumber && (
                    <div>
                      <div className="text-sm text-gray-500">면허번호</div>
                      <div className="font-medium">{selectedRequest.licenseNumber}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-500">신청일</div>
                    <div className="font-medium">
                      {new Date(selectedRequest.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">상태</div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[selectedRequest.status]}`}>
                      {statusLabels[selectedRequest.status]}
                    </span>
                  </div>
                </div>

                {selectedRequest.rejectReason && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-600 font-medium mb-1">거부 사유</div>
                    <div className="text-sm text-red-700">{selectedRequest.rejectReason}</div>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowRejectModal(true);
                    }}
                    disabled={processing}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    거부
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    승인
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">가입 신청 거부</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  <span className="font-medium">{selectedRequest.name}</span>님의 가입 신청을 거부합니다.
                  거부 사유를 입력해주세요.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="거부 사유를 입력하세요..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 h-32"
                />
                <p className="mt-2 text-sm text-gray-500">
                  거부 사유는 신청자에게 이메일로 전달됩니다.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={() => handleReject(selectedRequest)}
                  disabled={processing || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  거부 확인
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
