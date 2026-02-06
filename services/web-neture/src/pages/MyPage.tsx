/**
 * MyPage - 마이페이지 (프로필 관리)
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 *
 * 표준 기능:
 * - 프로필 정보 표시 (이름, 이메일, 역할)
 * - 프로필 편집 기능
 * - 대시보드 이동 링크
 * - 보안 설정 (비밀번호 변경)
 * - 로그아웃
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Edit3, Check, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS } from '../contexts';
import { useLoginModal } from '../contexts/LoginModalContext';

export default function MyPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-sm text-gray-500 mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
          <button
            onClick={() => openLoginModal('/my')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  const dashboardPath = ROLE_DASHBOARDS[user.currentRole];
  const roleLabel = ROLE_LABELS[user.currentRole];

  const handleSave = () => {
    // TODO: Implement save API
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ name: user.name || '' });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/workspace');
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
        <p className="text-sm text-gray-500 mt-1">내 정보를 확인하고 관리할 수 있습니다</p>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user.name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-primary-100 text-sm">{user.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                {roleLabel}
              </span>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <Edit3 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* 프로필 정보 */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">기본 정보</h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">이름</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mt-1"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">이메일</p>
                <p className="text-sm font-medium text-gray-800">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">역할</p>
                <p className="text-sm font-medium text-gray-800">{roleLabel}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 보안 설정 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">보안 설정</h3>
        <button
          onClick={() => alert('비밀번호 변경 기능은 준비 중입니다.')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm text-gray-700">비밀번호 변경</span>
          <span className="text-xs text-gray-400">마지막 변경: -</span>
        </button>
      </div>

      {/* 빠른 이동 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">빠른 이동</h3>
        <div className="space-y-3">
          {user.currentRole !== 'user' && (
            <Link
              to={dashboardPath}
              className="flex items-center gap-3 w-full p-4 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-sm font-medium">내 대시보드</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-4 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  );
}
