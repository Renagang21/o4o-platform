import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function MyPage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || user?.name || '',
    phone: user?.phone || '',
    pharmacyName: user?.pharmacyName || '',
    pharmacyAddress: user?.pharmacyAddress || '',
  });

  // 비로그인 시 홈으로 리다이렉트
  if (!isAuthenticated || !user) {
    navigate('/');
    return null;
  }

  const handleSave = () => {
    updateUser(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || user?.name || '',
      phone: user?.phone || '',
      pharmacyName: user?.pharmacyName || '',
      pharmacyAddress: user?.pharmacyAddress || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">마이페이지</h1>
          <p className="text-sm text-slate-500 mt-1">내 정보를 확인하고 수정할 수 있습니다</p>
        </div>

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* 프로필 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user.displayName || user.name}</h2>
                <p className="text-blue-100 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    user.role === 'admin'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'admin' ? '관리자' : '약사'}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    user.approvalStatus === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : user.approvalStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {user.approvalStatus === 'approved' ? '승인됨' : user.approvalStatus === 'pending' ? '대기중' : '거절됨'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 정보 섹션 */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">기본 정보</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  수정
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    저장
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* 표시 이름 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">표시 이름</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-slate-900 py-2">{user.displayName || user.name || '-'}</p>
                )}
              </div>

              {/* 이메일 (수정 불가) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <p className="text-slate-900 py-2">{user.email}</p>
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">연락처</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="010-0000-0000"
                  />
                ) : (
                  <p className="text-slate-900 py-2">{user.phone || '-'}</p>
                )}
              </div>

              {/* 면허번호 (수정 불가) */}
              {user.licenseNumber && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">면허번호</label>
                  <p className="text-slate-900 py-2">{user.licenseNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* 약국 정보 섹션 */}
          <div className="border-t border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">약국 정보</h3>
            <div className="space-y-4">
              {/* 약국명 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">약국명</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.pharmacyName}
                    onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-slate-900 py-2">{user.pharmacyName || '-'}</p>
                )}
              </div>

              {/* 약국 주소 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">약국 주소</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.pharmacyAddress}
                    onChange={(e) => setFormData({ ...formData, pharmacyAddress: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-slate-900 py-2">{user.pharmacyAddress || '-'}</p>
                )}
              </div>

              {/* 소속 지부/분회 (수정 불가) */}
              {(user.branchName || user.chapterName) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">소속</label>
                  <p className="text-slate-900 py-2">
                    {user.branchName && `${user.branchName} `}
                    {user.chapterName && user.chapterName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 계정 활동 */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">계정 활동</h3>
          <div className="text-sm text-slate-500">
            <p>계정 활동 기록 기능은 준비 중입니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
