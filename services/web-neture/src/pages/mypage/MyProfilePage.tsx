/**
 * MyProfilePage - 프로필 편집
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   `@o4o/account-ui` 의 `AccountProfileSection` / `MyPageAuthRequired` 채택.
 *
 * /mypage/profile — 이름 수정. PUT /api/v1/users/profile
 */

import { User, Mail, Shield } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { useAuth, getNetureRoleLabel } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { api } from '../../lib/apiClient';
import {
  MyPageLayout,
  MyPageAuthRequired,
  AccountProfileSection,
  type AccountProfileFieldSpec,
} from '@o4o/account-ui';

export default function MyProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { openLoginModal } = useLoginModal();

  if (!isAuthenticated || !user) {
    return (
      <MyPageAuthRequired
        icon={<User className="w-8 h-8 text-gray-400" />}
        description="마이페이지를 이용하려면 로그인해주세요."
        onAction={() => openLoginModal('/mypage/profile')}
      />
    );
  }

  const roleLabel = getNetureRoleLabel(user.roles);

  const fields: AccountProfileFieldSpec[] = [
    { key: 'name', label: '이름', icon: <User className="w-5 h-5 text-gray-400" /> },
    {
      key: 'email',
      label: '이메일',
      editable: false,
      icon: <Mail className="w-5 h-5 text-gray-400" />,
    },
    {
      key: 'role',
      label: '역할',
      editable: false,
      icon: <Shield className="w-5 h-5 text-gray-400" />,
    },
  ];

  const values: Record<string, string> = {
    name: user.name || '',
    email: user.email,
    role: roleLabel,
  };

  const handleSave = async (draft: Record<string, string>) => {
    await api.put('/users/profile', { name: draft.name });
    updateUser({ name: draft.name });
    toast.success('프로필이 수정되었습니다.');
  };

  return (
    <MyPageLayout
      title="마이페이지"
      subtitle="기본 정보를 확인하고 수정할 수 있습니다"
      width="form"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: '/mypage' },
        { label: '프로필' },
      ]}
    >
      <AccountProfileSection
        initial={user.name?.charAt(0) || '?'}
        name={user.name}
        email={user.email}
        roleLabel={roleLabel}
        fields={fields}
        values={values}
        onSave={handleSave}
        onError={(message) => toast.error(message)}
      />
    </MyPageLayout>
  );
}
