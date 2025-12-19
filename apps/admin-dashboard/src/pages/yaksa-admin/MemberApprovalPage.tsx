/**
 * MemberApprovalPage
 *
 * Phase 1: 회원 승인 페이지
 *
 * 기능:
 * - 승인 대기 회원 목록 조회
 * - 회원 승인 / 반려
 *
 * 제한:
 * - 회원 수정 ❌
 * - 회원 삭제 ❌
 * - 회원 생성 ❌
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  getPendingMembers,
  getVerifications,
  approveMember,
  rejectMember,
  type PendingMember,
  type MemberVerification,
} from '@/lib/api/yaksaAdmin';

type TabType = 'pending' | 'approved' | 'rejected';

export function MemberApprovalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [verifications, setVerifications] = useState<MemberVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // 임시: 로그인한 관리자의 조직 ID (실제로는 auth context에서 가져와야 함)
  const currentUserId = 'admin-user-id';

  const loadVerifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getVerifications({ status: activeTab });
      setVerifications(response.data || []);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.');
      console.error('Failed to load verifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, [activeTab]);

  const handleApprove = async (verificationId: string) => {
    setActionInProgress(verificationId);
    try {
      await approveMember(verificationId, { verifierId: currentUserId });
      await loadVerifications();
    } catch (err) {
      setError('승인 처리 중 오류가 발생했습니다.');
      console.error('Failed to approve:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (verificationId: string) => {
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해 주세요.');
      return;
    }
    setActionInProgress(verificationId);
    try {
      await rejectMember(verificationId, {
        verifierId: currentUserId,
        reason: rejectReason,
      });
      setShowRejectModal(null);
      setRejectReason('');
      await loadVerifications();
    } catch (err) {
      setError('반려 처리 중 오류가 발생했습니다.');
      console.error('Failed to reject:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const tabs = [
    { id: 'pending' as const, label: '승인 대기', icon: AlertCircle },
    { id: 'approved' as const, label: '승인 완료', icon: CheckCircle },
    { id: 'rejected' as const, label: '반려', icon: XCircle },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          관리자 센터로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">회원 승인/현황</h1>
            <p className="text-gray-500 mt-1">
              신규 가입 회원을 승인하거나 반려합니다.
            </p>
          </div>
          <button
            onClick={loadVerifications}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      ) : verifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {activeTab === 'pending' && '승인 대기 중인 회원이 없습니다.'}
            {activeTab === 'approved' && '승인된 회원이 없습니다.'}
            {activeTab === 'rejected' && '반려된 회원이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  회원 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청일
                </th>
                {activeTab === 'pending' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {verifications.map((verification) => (
                <tr key={verification.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {verification.memberName || verification.memberId}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {verification.memberId}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-medium rounded
                      ${verification.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${verification.status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                      ${verification.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {verification.status === 'pending' && '대기'}
                      {verification.status === 'approved' && '승인'}
                      {verification.status === 'rejected' && '반려'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(verification.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  {activeTab === 'pending' && (
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleApprove(verification.id)}
                        disabled={actionInProgress === verification.id}
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        승인
                      </button>
                      <button
                        onClick={() => setShowRejectModal(verification.id)}
                        disabled={actionInProgress === verification.id}
                        className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        반려
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              회원 가입 반려
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                반려 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="반려 사유를 입력해 주세요."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={actionInProgress === showRejectModal || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberApprovalPage;
