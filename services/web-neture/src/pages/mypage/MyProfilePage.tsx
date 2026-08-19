/**
 * MyProfilePage - 프로필 편집
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   `@o4o/account-ui` 의 `AccountProfileSection` / `MyPageAuthRequired` 채택.
 *
 * /mypage/profile — 이름 수정. PATCH /api/v1/users/me/profile
 * WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1: canonical self-profile 계약 채택.
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
import { getNetureMyPageNavItems } from './navItems';

export default function MyProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { openLoginModal } = useLoginModal();

  // WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
  // 로그인 안내도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지).
  if (!isAuthenticated || !user) {
    return (
      <MyPageLayout title="프로필" width="form" navItems={getNetureMyPageNavItems([])}>
        <MyPageAuthRequired
          icon={<User className="w-8 h-8 text-gray-400" />}
          description="마이페이지를 이용하려면 로그인해주세요."
          onAction={() => openLoginModal('/mypage/profile')}
        />
      </MyPageLayout>
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
    await api.patch('/users/me/profile', { name: draft.name });
    updateUser({ name: draft.name });
    toast.success('프로필이 수정되었습니다.');
  };

  return (
    <MyPageLayout
      title="프로필"
      subtitle="기본 정보를 확인하고 수정할 수 있습니다"
      width="form"
      navItems={getNetureMyPageNavItems(user.roles)}
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
