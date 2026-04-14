/**
 * MyProfilePage - 프로필 편집
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 *
 * /mypage/profile — 이름 수정. PUT /api/v1/users/profile
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { api } from '@/lib/apiClient';
import { User, Mail, Shield } from 'lucide-react';
import {
  MyPageLayout,
  ProfileCard,
  ProfileInfoField,
} from '@o4o/account-ui';

export default function MyProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <h1 className="text-lg font-semibold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <Link
            to="/login"
            className="block w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-center"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[user.roles[0]];

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', { name: editData.name });
      updateUser({ name: editData.name });
      setIsEditing(false);
      toast.success('프로필이 수정되었습니다.');
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || '프로필 수정에 실패했습니다.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({ name: user.name || '' });
    setIsEditing(false);
  };

  return (
    <MyPageLayout title="마이페이지" subtitle="내 정보를 확인하고 관리할 수 있습니다">
      <ProfileCard
        initial={user.name?.charAt(0) || '?'}
        name={user.name}
        email={user.email}
        roleLabel={roleLabel}
        isEditing={isEditing}
        saving={saving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
      >
        <ProfileInfoField
          label="이름"
          value={user.name}
          editValue={editData.name}
          isEditing={isEditing}
          onChange={(v) => setEditData({ name: v })}
          icon={<User className="w-5 h-5 text-gray-400" />}
        />
        <ProfileInfoField
          label="이메일"
          value={user.email}
          editable={false}
          icon={<Mail className="w-5 h-5 text-gray-400" />}
        />
        <ProfileInfoField
          label="역할"
          value={roleLabel}
          editable={false}
          icon={<Shield className="w-5 h-5 text-gray-400" />}
        />
      </ProfileCard>
    </MyPageLayout>
  );
}
