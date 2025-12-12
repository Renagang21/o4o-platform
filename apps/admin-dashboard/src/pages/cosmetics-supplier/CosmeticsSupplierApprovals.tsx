/**
 * Cosmetics Supplier Approvals
 *
 * 셀러/파트너 승인 관리
 * - 대기 중인 승인 요청 목록
 * - 승인/거절 처리
 * - 승인 이력 조회
 *
 * Phase 6-G: Cosmetics Supplier Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Users,
  UserCheck,
  Search,
  Filter,
  Eye,
  ChevronDown,
  Building,
  User,
} from 'lucide-react';

type ApprovalType = 'seller' | 'partner';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'revoked';
type TabType = 'pending' | 'approved' | 'rejected';

interface Approval {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  sellerId?: string;
  partnerId?: string;
  applicantName?: string;
  storeName?: string;
  businessNumber?: string;
  requestMessage?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  commissionRate?: number;
}

const CosmeticsSupplierApprovals: React.FC = () => {
  const api = authClient.api;
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [typeFilter, setTypeFilter] = useState<ApprovalType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setApprovals([
        {
          id: '1',
          type: 'seller',
          status: 'pending',
          sellerId: 'seller-1',
          applicantName: '김미용',
          storeName: '뷰티샵 강남점',
          businessNumber: '123-45-67890',
          requestMessage: '귀사 제품을 판매하고 싶습니다.',
          requestedAt: '2024-12-10T10:00:00Z',
        },
        {
          id: '2',
          type: 'partner',
          status: 'pending',
          partnerId: 'partner-1',
          applicantName: '이인플',
          storeName: '@beauty_influencer',
          requestMessage: '인플루언서 파트너십을 희망합니다.',
          requestedAt: '2024-12-09T14:30:00Z',
        },
        {
          id: '3',
          type: 'seller',
          status: 'approved',
          sellerId: 'seller-2',
          applicantName: '박판매',
          storeName: '코스메틱 홍대점',
          businessNumber: '234-56-78901',
          requestedAt: '2024-12-05T09:00:00Z',
          approvedAt: '2024-12-06T11:00:00Z',
          commissionRate: 15,
        },
        {
          id: '4',
          type: 'partner',
          status: 'rejected',
          partnerId: 'partner-2',
          applicantName: '최거절',
          storeName: '@rejected_user',
          requestedAt: '2024-12-03T16:00:00Z',
          rejectedAt: '2024-12-04T10:00:00Z',
          rejectionReason: '팔로워 수 기준 미달',
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (approval: Approval) => {
    // TODO: Call API to approve
    console.log('Approving:', approval.id);
    fetchApprovals();
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectionReason) return;
    // TODO: Call API to reject
    console.log('Rejecting:', selectedApproval.id, rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedApproval(null);
    fetchApprovals();
  };

  const filteredApprovals = approvals.filter((a) => {
    // Tab filter
    if (activeTab === 'pending' && a.status !== 'pending') return false;
    if (activeTab === 'approved' && a.status !== 'approved') return false;
    if (activeTab === 'rejected' && a.status !== 'rejected') return false;

    // Type filter
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !a.applicantName?.toLowerCase().includes(search) &&
        !a.storeName?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" /> 대기중
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> 승인됨
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> 거절됨
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">승인 관리</h1>
          <p className="text-gray-500 text-sm mt-1">셀러 및 파트너 승인 요청 처리</p>
        </div>
        <button
          onClick={fetchApprovals}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="새로고침"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {approvals.filter((a) => a.status === 'pending').length}
              </p>
              <p className="text-sm text-yellow-600">대기중</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">
                {approvals.filter((a) => a.status === 'approved').length}
              </p>
              <p className="text-sm text-green-600">승인됨</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700">
                {approvals.filter((a) => a.status === 'rejected').length}
              </p>
              <p className="text-sm text-red-600">거절됨</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(['pending', 'approved', 'rejected'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'pending' && '대기중'}
              {tab === 'approved' && '승인됨'}
              {tab === 'rejected' && '거절됨'}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름 또는 스토어명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ApprovalType | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">전체 유형</option>
          <option value="seller">셀러</option>
          <option value="partner">파트너</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredApprovals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>해당하는 승인 요청이 없습니다</p>
          </div>
        ) : (
          filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    approval.type === 'seller' ? 'bg-blue-50' : 'bg-purple-50'
                  }`}>
                    {approval.type === 'seller' ? (
                      <Building className={`w-5 h-5 text-blue-500`} />
                    ) : (
                      <User className={`w-5 h-5 text-purple-500`} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{approval.applicantName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        approval.type === 'seller'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {approval.type === 'seller' ? '셀러' : '파트너'}
                      </span>
                      {getStatusBadge(approval.status)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{approval.storeName}</p>
                    {approval.businessNumber && (
                      <p className="text-xs text-gray-400 mt-0.5">사업자번호: {approval.businessNumber}</p>
                    )}
                    {approval.requestMessage && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">
                        "{approval.requestMessage}"
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      신청일: {formatDate(approval.requestedAt)}
                    </p>
                    {approval.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">
                        거절 사유: {approval.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {approval.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(approval)}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      승인
                    </button>
                    <button
                      onClick={() => {
                        setSelectedApproval(approval);
                        setShowRejectModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      거절
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">승인 거절</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedApproval?.applicantName}님의 요청을 거절하시겠습니까?
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거절 사유를 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 h-24"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedApproval(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                거절하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsSupplierApprovals;
