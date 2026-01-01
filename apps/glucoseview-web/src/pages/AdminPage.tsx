import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 샘플 대기 중인 회원 데이터
const samplePendingMembers = [
  {
    id: '1',
    realName: '김약사',
    displayName: '김약사',
    email: 'kim@example.com',
    phone: '010-1111-1111',
    licenseNumber: 'PH-11111',
    pharmacyName: '해피약국',
    branchName: '서울지부',
    chapterName: '강남분회',
    createdAt: '2025-12-28',
  },
  {
    id: '2',
    realName: '이약사',
    displayName: '이약사',
    email: 'lee@example.com',
    phone: '010-2222-2222',
    licenseNumber: 'PH-22222',
    pharmacyName: '건강약국',
    branchName: '경기지부',
    chapterName: '수원분회',
    createdAt: '2025-12-29',
  },
];

export default function AdminPage() {
  const { isAdmin, user, logout } = useAuth();
  const [pendingMembers] = useState(samplePendingMembers);
  const [selectedMember, setSelectedMember] = useState<typeof samplePendingMembers[0] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // 관리자가 아니면 홈으로 리다이렉트
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleApprove = (member: typeof samplePendingMembers[0]) => {
    alert(`${member.realName}님의 가입을 승인했습니다.`);
    // 실제로는 API 호출
  };

  const handleRejectClick = (member: typeof samplePendingMembers[0]) => {
    setSelectedMember(member);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }
    alert(`${selectedMember?.realName}님의 가입을 거절했습니다.\n사유: ${rejectReason}`);
    setShowRejectModal(false);
    // 실제로는 API 호출
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-slate-900">
                GlucoseView
              </Link>
              <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded">Admin</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{user?.displayName || user?.name}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">관리자 페이지</h1>
          <p className="text-slate-500">회원 승인 및 시스템 관리</p>
        </div>

        {/* Pending Members */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-900">승인 대기 회원</h2>
              <span className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-full">
                {pendingMembers.length}명
              </span>
            </div>
          </div>

          {pendingMembers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pendingMembers.map((member) => (
                <div key={member.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-medium text-slate-900">{member.realName}</h3>
                        <span className="text-sm text-slate-400">({member.displayName})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div>
                          <span className="text-slate-400">이메일:</span>{' '}
                          <span className="text-slate-600">{member.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">전화번호:</span>{' '}
                          <span className="text-slate-600">{member.phone}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">면허번호:</span>{' '}
                          <span className="text-slate-600">{member.licenseNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">약국명:</span>{' '}
                          <span className="text-slate-600">{member.pharmacyName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">소속:</span>{' '}
                          <span className="text-slate-600">{member.branchName} {member.chapterName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">신청일:</span>{' '}
                          <span className="text-slate-600">{member.createdAt}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleRejectClick(member)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => handleApprove(member)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        승인
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-500">대기 중인 회원이 없습니다.</p>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">가입 거절</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              <span className="font-medium text-slate-700">{selectedMember.realName}</span>님의 가입을 거절합니다.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                거절 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="거절 사유를 입력해주세요"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                거절하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
