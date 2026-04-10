/**
 * MyPage - 계정 허브
 *
 * WO-MY-PAGE-FUNCTIONAL-ENABLEMENT-V1
 * WO-O4O-ACCOUNT-UI-COMMON-PACKAGE-V1: 공통 account-ui 패키지 기반 전환
 *
 * - 프로필 수정 (이름, 연락처) → PUT /api/v1/users/profile
 * - 비밀번호 변경 → PUT /api/v1/users/password
 * - 역할 라벨 정합성 보정
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Lock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  AccountPageLayout,
  ProfileCard,
  ProfileInfoField,
  PasswordChangeModal,
} from '@o4o/account-ui';

const roleLabels: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  pharmacy: '약사',
  pharmacist: '약사',
  customer: '당뇨인',
  supplier: '공급자',
  partner: '파트너',
  consumer: '소비자',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '승인 대기', color: '#ca8a04' },
  approved: { label: '승인됨', color: '#16a34a' },
  active: { label: '승인됨', color: '#16a34a' },
  rejected: { label: '거부됨', color: '#dc2626' },
  suspended: { label: '정지됨', color: '#6b7280' },
};

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export default function MyPage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    lastName: user?.lastName || '',
    firstName: user?.firstName || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-slate-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  const status = statusLabels[user.status] || statusLabels.pending;
  const displayName = (user.lastName && user.firstName) ? `${user.lastName}${user.firstName}` : user.name;
  const roleLabel = roleLabels[user.memberships?.find(m => m.serviceKey === 'glycopharm')?.role || ''] || roleLabels[user.roles[0]] || user.roles[0];

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const fullName = (editData.lastName && editData.firstName)
        ? `${editData.lastName}${editData.firstName}`
        : editData.lastName || editData.firstName || user.name;
      await api.put('/users/profile', {
        name: fullName,
        lastName: editData.lastName,
        firstName: editData.firstName,
        phone: editData.phone,
      });

      updateUser({
        name: fullName,
        lastName: editData.lastName,
        firstName: editData.firstName,
        phone: editData.phone,
      });
      setIsEditing(false);
      setFeedback({ type: 'success', message: '프로필이 수정되었습니다.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || (err instanceof Error ? err.message : '프로필 수정에 실패했습니다.');
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ lastName: user.lastName || '', firstName: user.firstName || '', phone: user.phone || '' });
    setFeedback(null);
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string, newPasswordConfirm: string) => {
    setChangingPassword(true);
    try {
      await api.put('/users/password', { currentPassword, newPassword, newPasswordConfirm });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AccountPageLayout title="마이페이지">
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

      <ProfileCard
        initial={user?.lastName?.charAt(0) || user?.name?.charAt(0) || '?'}
        name={displayName}
        email={user.email}
        roleLabel={roleLabel}
        statusLabel={status.label}
        statusColor={status.color}
        isEditing={isEditing}
        saving={saving}
        onEdit={() => {
          setEditData({ lastName: user.lastName || '', firstName: user.firstName || '', phone: user.phone || '' });
          setIsEditing(true);
        }}
        onSave={handleSave}
        onCancel={handleCancel}
      >
        <ProfileInfoField
          label="이메일"
          value={user.email}
          editable={false}
          icon={<Mail className="w-5 h-5 text-gray-400" />}
        />
        <ProfileInfoField
          label="성"
          value={user.lastName || '-'}
          editValue={editData.lastName}
          isEditing={isEditing}
          onChange={(v) => setEditData(prev => ({ ...prev, lastName: v }))}
          icon={<User className="w-5 h-5 text-gray-400" />}
        />
        <ProfileInfoField
          label="이름"
          value={user.firstName || '-'}
          editValue={editData.firstName}
          isEditing={isEditing}
          onChange={(v) => setEditData(prev => ({ ...prev, firstName: v }))}
          icon={<User className="w-5 h-5 text-gray-400" />}
        />
        <ProfileInfoField
          label="연락처"
          value={user.phone || '등록된 연락처가 없습니다'}
          editValue={editData.phone}
          isEditing={isEditing}
          onChange={(v) => setEditData(prev => ({ ...prev, phone: v }))}
          type="tel"
          icon={<Phone className="w-5 h-5 text-gray-400" />}
        />
        <ProfileInfoField
          label="역할"
          value={roleLabel}
          editable={false}
          icon={<Building2 className="w-5 h-5 text-gray-400" />}
        />
        <ProfileInfoField
          label="상태"
          value={status.label}
          editable={false}
          icon={<Shield className="w-5 h-5 text-gray-400" />}
        />
      </ProfileCard>

      {/* Security */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">보안 설정</h3>
        <div className="space-y-3">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">비밀번호 변경</span>
            </div>
          </button>
          <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <span className="text-sm text-gray-700">2단계 인증</span>
            <span className="text-xs text-gray-400">비활성화</span>
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">계정 관리</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <span className="text-sm text-gray-700">알림 설정</span>
          </button>
          <button className="w-full text-left p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
            <span className="text-sm text-red-600">계정 탈퇴</span>
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleChangePassword}
        submitting={changingPassword}
      />
    </AccountPageLayout>
  );
}
