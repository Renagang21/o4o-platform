/**
 * MyProfilePage - 프로필 편집
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   `@o4o/account-ui` 의 `AccountProfileSection` / `MyPageAuthRequired` 채택.
 *
 * /mypage/profile — 이름 수정. PATCH /api/v1/users/me/profile
 * WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1: canonical self-profile 계약 채택.
 */

import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS, KCOSMETICS_ROLE_PRIORITY } from '@/contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { api } from '@/lib/apiClient';
import { User, Mail, Phone, Shield } from 'lucide-react';
import {
  MyPageLayout,
  MyPageAuthRequired,
  AccountProfileSection,
  resolveRoleLabel,
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

  /**
   * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1:
   *   `ROLE_LABELS[user.roles[0]]` 은 backend 가 돌려주는 배열 순서에 의존해
   *   라벨이 비는 결함이 있었다(프로덕션에서 역할 `-` 로 표시).
   *   MyPageHub 가 이미 쓰는 공통 해석기·우선순위와 축을 맞춘다.
   */
  const roleLabel = resolveRoleLabel(user.roles, {
    labels: ROLE_LABELS,
    priority: KCOSMETICS_ROLE_PRIORITY,
    fallback: '사용자',
  });

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
    await api.patch('/users/me/profile', patch);
    updateUser(patch);
    toast.success('프로필이 수정되었습니다.');
  };

  return (
    /*
     * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1:
     *   leaf 화면인데 허브 제목("마이페이지")을 그대로 써서, KCos 만 어느 화면에
     *   있는지 제목으로 알 수 없었다. KPA/GP/Neture/PH 와 동일하게 화면 이름을 쓴다.
     */
    <MyPageLayout
      title="프로필"
      subtitle="기본 정보를 확인하고 수정할 수 있습니다"
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
