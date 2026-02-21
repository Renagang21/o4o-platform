/**
 * MyPage - 계정 허브
 *
 * WO-MY-PAGE-FUNCTIONAL-ENABLEMENT-V1
 *
 * - 프로필 수정 (이름, 연락처) → PUT /api/v1/users/profile
 * - 비밀번호 변경 → PUT /api/v1/users/password
 * - 역할 라벨 정합성 보정
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Edit3,
  Check,
  X,
  Camera,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

const roleLabels: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  pharmacy: '약사',
  supplier: '공급자',
  partner: '파트너',
  consumer: '소비자',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '승인 대기', color: 'yellow' },
  approved: { label: '승인됨', color: 'green' },
  rejected: { label: '거부됨', color: 'red' },
  suspended: { label: '정지됨', color: 'gray' },
};

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export default function MyPage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState | null>(null);

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-slate-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  const status = statusLabels[user.status] || statusLabels.pending;

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      body: JSON.stringify({
          name: editData.name,
          phone: editData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '프로필 수정에 실패했습니다.');
      }

      updateUser({ name: editData.name, phone: editData.phone });
      setIsEditing(false);
      setFeedback({ type: 'success', message: '프로필이 수정되었습니다.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '프로필 수정에 실패했습니다.';
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ name: user.name, phone: user.phone || '' });
    setFeedback(null);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.newPasswordConfirm) {
      setPasswordFeedback({ type: 'error', message: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: '새 비밀번호는 8자 이상이어야 합니다.' });
      return;
    }

    setChangingPassword(true);
    setPasswordFeedback(null);
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          newPasswordConfirm: passwordData.newPasswordConfirm,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '비밀번호 변경에 실패했습니다.');
      }

      setPasswordFeedback({ type: 'success', message: '비밀번호가 변경되었습니다.' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
        setPasswordFeedback(null);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.';
      setPasswordFeedback({ type: 'error', message });
    } finally {
      setChangingPassword(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordData({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
    setPasswordFeedback(null);
    setShowPasswordModal(true);
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">마이페이지</h1>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mb-6 flex items-center gap-2 p-4 rounded-xl text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {feedback.message}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-primary-500 to-accent-600">
            <div className="absolute -bottom-12 left-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {user?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                </div>
                {/* TODO: 프로필 이미지 업로드 기능 (Phase 2) */}
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <Camera className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-16 pb-6 px-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slate-500">{roleLabels[user.roles[0]] || user.roles[0]}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-700`}>
                    {status.label}
                  </span>
                </div>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => {
                    setEditData({ name: user.name, phone: user.phone || '' });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  편집
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    저장
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 border rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    취소
                  </button>
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid gap-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">이메일</p>
                  <p className="text-sm font-medium text-slate-800">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">이름</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{user.name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">연락처</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800">
                      {user.phone || '등록된 연락처가 없습니다'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">역할</p>
                  <p className="text-sm font-medium text-slate-800">{roleLabels[user.roles[0]] || user.roles[0]}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">상태</p>
                  <p className="text-sm font-medium text-slate-800">{status.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Sections */}
        <div className="mt-6 grid gap-6">
          {/* Security */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">보안 설정</h3>
            <div className="space-y-3">
              <button
                onClick={openPasswordModal}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">비밀번호 변경</span>
                </div>
              </button>
              {/* TODO: 2단계 인증 (Phase 2) */}
              <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">2단계 인증</span>
                <span className="text-xs text-slate-400">비활성화</span>
              </button>
            </div>
          </div>

          {/* Account */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">계정 관리</h3>
            <div className="space-y-3">
              {/* TODO: 알림 설정 (Phase 2) */}
              <button className="w-full text-left p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">알림 설정</span>
              </button>
              {/* TODO: 계정 탈퇴 (Phase 2) */}
              <button className="w-full text-left p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                <span className="text-sm text-red-600">계정 탈퇴</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !changingPassword && setShowPasswordModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">비밀번호 변경</h3>

            {passwordFeedback && (
              <div
                className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
                  passwordFeedback.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {passwordFeedback.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">현재 비밀번호</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="현재 비밀번호 입력"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">새 비밀번호</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="8자 이상 입력"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={passwordData.newPasswordConfirm}
                  onChange={(e) =>
                    setPasswordData(prev => ({ ...prev, newPasswordConfirm: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="새 비밀번호 재입력"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                disabled={changingPassword}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.newPasswordConfirm}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
