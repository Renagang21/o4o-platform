import { useMemo } from 'react';
import { UserDetailPage, type UserDetailApiAdapter } from '@o4o/ui';
import { OperatorMembersConsolePage } from './OperatorMembersConsolePage';
import { CommonEditUserModal } from './CommonEditUserModal';
import { OperatorMemberSoftDeleteFlow } from './OperatorMemberSoftDeleteFlow';
import type { MembersConsoleClient } from './types';

/** Service membership console, independent of business entities and community membership. */
export function ServiceMembersWorkspace({ serviceKey, basePath, api, roles, userId, navigate }: Readonly<{
  serviceKey: string;
  basePath: string;
  api: UserDetailApiAdapter;
  roles: string[];
  userId?: string;
  navigate: (path: string) => void;
}>) {
  const isAdmin = roles.includes(`${serviceKey}:admin`) || roles.includes('platform:super_admin');
  const client = useMemo<MembersConsoleClient>(() => ({
    list: params => {
      const query = new URLSearchParams({ serviceKey, page: String(params.page), limit: String(params.limit) });
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      return api.get(`/operator/members?${query}`);
    },
    stats: () => api.get(`/operator/members/stats?serviceKey=${encodeURIComponent(serviceKey)}`),
    updateStatus: async (id, status) => { await api.patch(`/operator/members/${id}/status`, { status, serviceKey }); },
  }), [api, serviceKey]);
  if (userId) return <UserDetailPage userId={userId} apiAdapter={api} isAdmin={isAdmin} navigate={navigate}
    config={{ serviceKey, listPath: basePath, theme: 'blue', labels: { businessInfoTitle: '사업자 정보', businessNameLabel: '사업자명' } }} />;
  return <OperatorMembersConsolePage serviceKey={serviceKey} client={client} canManageLifecycle={isAdmin}
    title="서비스 회원 관리" description="이 서비스의 가입 신청과 회원 이용 상태를 관리합니다." roleTabs={[]}
    fullDetailHref={user => `${basePath}/${user.id}`}
    statusTabs={[{ key: 'active', label: '활성', status: 'active' }, { key: 'suspended', label: '정지', status: 'suspended' }, { key: 'withdrawn', label: '탈퇴', status: 'withdrawn' }]}
    renderEditModal={({ user, onClose, onSuccess }) => <CommonEditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess}
      config={{ serviceKey, makeRequest: (method, path, data) => api[method.toLowerCase() as keyof UserDetailApiAdapter](path, data), membershipRoleOptions: [], adminRoleOptions: [] }} />}
    renderDeleteFlow={({ user, onClose, onDeleted }) => <OperatorMemberSoftDeleteFlow user={user} onClose={onClose} onDeleted={onDeleted}
      execute={async id => { await api.delete(`/operator/members/${id}?serviceKey=${encodeURIComponent(serviceKey)}`); }}
      title="서비스 탈퇴 처리" confirmText="탈퇴 처리" buildMessage={name => `${name} 회원을 이 서비스에서 탈퇴 처리하시겠습니까?`}
      successMessage="서비스 탈퇴 처리했습니다." errorMessage="탈퇴 처리하지 못했습니다." />} />;
}
