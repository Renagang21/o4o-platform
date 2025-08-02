import { useState, useEffect, FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useToast from '../../hooks/useToast';
import { useApproval } from './ApprovalContext';

interface ApprovalUser {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  phoneNumber?: string;
  address?: string;
  rejectionReason?: string;
}

// Mock data for testing
const mockUser: ApprovalUser = {
  id: '1',
  name: '김약사',
  email: 'pharmacist1@example.com',
  licenseNumber: '12345',
  status: 'pending',
  createdAt: '2024-03-15T10:00:00Z',
  phoneNumber: '010-1234-5678',
  address: '서울시 강남구',
};

const YaksaApprovalDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { getUserById, approveUser, rejectUser } = useApproval();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const user = id ? getUserById(id) : null;

  const handleApprove = () => {
    if (!user) return;
    setLoading(true);
    approveUser(user.id);
    setLoading(false);
    showToast({ type: 'success', message: '약사 회원이 승인되었습니다.' });
    navigate('/admin/approvals');
  };

  const handleReject = () => {
    if (!user || !rejectionReason.trim()) return;
    setLoading(true);
    rejectUser(user.id, rejectionReason);
    setLoading(false);
    showToast({ type: 'error', message: '약사 회원이 거절되었습니다.' });
    setIsRejectModalOpen(false);
    navigate('/admin/approvals');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-500 dark:text-gray-400">존재하지 않는 회원입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/approvals')}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            ← 목록으로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">약사 회원 상세 정보</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">이름</h3>
                <p className="mt-1 text-lg text-gray-900 dark:text-white">{user.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">이메일</h3>
                <p className="mt-1 text-lg text-gray-900 dark:text-white">{user.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">면허번호</h3>
                <p className="mt-1 text-lg text-gray-900 dark:text-white">{user.licenseNumber}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">전화번호</h3>
                <p className="mt-1 text-lg text-gray-900 dark:text-white">{user.phoneNumber}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">주소</h3>
                <p className="mt-1 text-lg text-gray-900 dark:text-white">{user.address}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">가입일</h3>
                <p className="mt-1 text-lg text-gray-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {user.status === 'pending' && (
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/20"
                  disabled={loading}
                >
                  거절
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  disabled={loading}
                >
                  승인
                </button>
              </div>
            )}

            {user.status === 'rejected' && user.rejectionReason && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">거절 사유</h3>
                <p className="mt-1 text-red-700 dark:text-red-300">{user.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 거절 사유 입력 모달 */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              거절 사유 입력
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full h-32 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="거절 사유를 입력해주세요..."
            />
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-500 dark:hover:bg-red-600"
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

export default YaksaApprovalDetail; 