/**
 * MyProfilePage - 프로필 편집
 *
 * WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   ProfileCard + ProfileInfoField 목록 + 편집/저장 상태기계 4중 복제를
 *   `@o4o/account-ui` 의 `AccountProfileSection` 으로 수렴.
 *   이 화면은 field 구성 + canonical self-profile adapter 만 담당한다.
 * WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1:
 *   ACCOUNT_CORE write 를 공통 계약 `PATCH /api/v1/users/me/profile` 로 정렬.
 *
 * /mypage/profile — 이름, 연락처 등 개인정보 편집 전용 페이지.
 */

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { User, Mail, Phone, Building2, Shield } from 'lucide-react';
import {
  MyPageLayout,
  MyPageAuthRequired,
  AccountProfileSection,
  type AccountProfileFieldSpec,
} from '@o4o/account-ui';
import { GLYCOPHARM_MYPAGE_NAV_ITEMS } from './navItems';

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

  // WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
  // 로그인 안내도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지).
  if (!user) {
    return (
      <MyPageLayout title="프로필" width="form" navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}>
        <MyPageAuthRequired />
      </MyPageLayout>
    );
  }

  const status = statusLabels[user.status] || statusLabels.pending;
  const displayName =
    user.lastName && user.firstName ? `${user.lastName}${user.firstName}` : user.name;
  const roleLabel =
    roleLabels[user.memberships?.find((m) => m.serviceKey === 'glycopharm')?.role || ''] ||
    roleLabels[user.roles[0]] ||
    user.roles[0];

  const fields: AccountProfileFieldSpec[] = [
    {
      key: 'email',
      label: '이메일',
      editable: false,
      icon: <Mail className="w-5 h-5 text-gray-400" />,
    },
    { key: 'lastName', label: '성', icon: <User className="w-5 h-5 text-gray-400" /> },
    { key: 'firstName', label: '이름', icon: <User className="w-5 h-5 text-gray-400" /> },
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
      key: 'role',
      label: '역할',
      editable: false,
      icon: <Building2 className="w-5 h-5 text-gray-400" />,
    },
    {
      key: 'status',
      label: '상태',
      editable: false,
      icon: <Shield className="w-5 h-5 text-gray-400" />,
    },
  ];

  const values: Record<string, string> = {
    email: user.email,
    lastName: user.lastName || '',
    firstName: user.firstName || '',
    nickname: user.nickname || '',
    phone: user.phone || '',
    role: roleLabel,
    status: status.label,
  };

  const handleSave = async (draft: Record<string, string>) => {
    const fullName =
      draft.lastName && draft.firstName
        ? `${draft.lastName}${draft.firstName}`
        : draft.lastName || draft.firstName || user.name;
    const patch = {
      name: fullName,
      lastName: draft.lastName,
      firstName: draft.firstName,
      nickname: draft.nickname,
      phone: draft.phone,
    };
    await api.patch('/users/me/profile', patch);
    updateUser(patch);
    toast.success('프로필이 수정되었습니다.');
  };

  return (
    <MyPageLayout title="프로필" width="form" navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}>
      <AccountProfileSection
        initial={user.lastName?.charAt(0) || user.name?.charAt(0) || '?'}
        name={displayName}
        email={user.email}
        roleLabel={roleLabel}
        statusLabel={status.label}
        statusColor={status.color}
        fields={fields}
        values={values}
        onSave={handleSave}
        onError={(message) => toast.error(message)}
      />
    </MyPageLayout>
  );
}
