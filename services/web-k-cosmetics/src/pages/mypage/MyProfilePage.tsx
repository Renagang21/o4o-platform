/**
 * MyProfilePage - 프로필 편집
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   `@o4o/account-ui` 의 `AccountProfileSection` / `MyPageAuthRequired` 채택.
 *
 * /mypage/profile — 이름 수정. PUT /api/v1/users/profile
 */

import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { api } from '@/lib/apiClient';
import { User, Mail, Phone, Shield } from 'lucide-react';
import {
  MyPageLayout,
  MyPageAuthRequired,
  AccountProfileSection,
  type AccountProfileFieldSpec,
} from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';

export default function MyProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <MyPageAuthRequired
        href="/login"
        renderLink={(href, className, label) => (
          <Link to={href} className={className}>
            {label}
          </Link>
        )}
      />
    );
  }

  const roleLabel = ROLE_LABELS[user.roles[0]];

  const fields: AccountProfileFieldSpec[] = [
    { key: 'name', label: '이름', icon: <User className="w-5 h-5 text-gray-400" /> },
    {
      key: 'nickname',
      label: '닉네임',
      icon: <User className="w-5 h-5 text-gray-400" />,
      hint: '포럼, 댓글 등 공개 화면에 표시됩니다.',
    },
    {
      key: 'phone',
      label: '연락처',
      type: 'tel',
      emptyText: '등록된 연락처가 없습니다',
      icon: <Phone className="w-5 h-5 text-gray-400" />,
    },
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
    nickname: user.nickname || '',
    phone: user.phone || '',
    email: user.email,
    role: roleLabel,
  };

  const handleSave = async (draft: Record<string, string>) => {
    const patch = { name: draft.name, nickname: draft.nickname, phone: draft.phone };
    await api.put('/users/profile', patch);
    updateUser(patch);
    toast.success('프로필이 수정되었습니다.');
  };

  return (
    <MyPageLayout
      title="마이페이지"
      subtitle="내 정보를 확인하고 관리할 수 있습니다"
      width="form"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
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
