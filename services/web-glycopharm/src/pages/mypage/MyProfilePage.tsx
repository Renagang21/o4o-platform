/**
 * MyProfilePage - 프로필 편집
 *
 * WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1
 *
 * /mypage/profile — 이름, 연락처 등 개인정보 편집 전용 페이지.
 * 기존 MyPage.tsx에서 프로필 편집 로직을 분리.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
} from 'lucide-react';
import {
  MyPageLayout,
  ProfileCard,
  ProfileInfoField,
} from '@o4o/account-ui';

const roleLabels: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  pharmacy: '약국',
  pharmacist: '약사',
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

export default function MyProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    lastName: user?.lastName || '',
    firstName: user?.firstName || '',
    nickname: user?.nickname || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);

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
    try {
      const fullName = (editData.lastName && editData.firstName)
        ? `${editData.lastName}${editData.firstName}`
        : editData.lastName || editData.firstName || user.name;
      await api.put('/users/profile', {
        name: fullName,
        lastName: editData.lastName,
        firstName: editData.firstName,
        nickname: editData.nickname,
        phone: editData.phone,
      });

      updateUser({
        name: fullName,
        lastName: editData.lastName,
        firstName: editData.firstName,
        nickname: editData.nickname,
        phone: editData.phone,
      });
      setIsEditing(false);
      toast.success('프로필이 수정되었습니다.');
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || (err instanceof Error ? err.message : '프로필 수정에 실패했습니다.');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ lastName: user.lastName || '', firstName: user.firstName || '', nickname: user.nickname || '', phone: user.phone || '' });
  };

  return (
    <MyPageLayout title="마이페이지">
      <ProfileCard
        initial={user.lastName?.charAt(0) || user.name?.charAt(0) || '?'}
        name={displayName}
        email={user.email}
        roleLabel={roleLabel}
        statusLabel={status.label}
        statusColor={status.color}
        isEditing={isEditing}
        saving={saving}
        onEdit={() => {
          setEditData({ lastName: user.lastName || '', firstName: user.firstName || '', nickname: user.nickname || '', phone: user.phone || '' });
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
          label="닉네임"
          value={user.nickname || '-'}
          editValue={editData.nickname}
          isEditing={isEditing}
          onChange={(v) => setEditData(prev => ({ ...prev, nickname: v }))}
          icon={<User className="w-5 h-5 text-gray-400" />}
        />
        {!isEditing && user.nickname && (
          <p className="text-xs text-gray-400 -mt-2 ml-10 mb-2">포럼, 댓글 등 공개 화면에 표시됩니다.</p>
        )}
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
    </MyPageLayout>
  );
}
