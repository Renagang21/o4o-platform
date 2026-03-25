/**
 * UserDetailPage — Neture 회원 상세 (공통 컴포넌트 Wrapper)
 * WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1
 *
 * Neture 예외:
 *   - 가입 승인/거부 시 Neture registration endpoint 사용
 *     POST /neture/operator/registrations/:userId/approve
 *     POST /neture/operator/registrations/:userId/reject
 *   - 정지/활성화 → MembershipConsole API
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import {
  UserDetailPage as CommonUserDetailPage,
} from '@o4o/ui';
import type {
  UserDetailApiAdapter,
  UserDetailConfig,
  UserDetailActions,
} from '@o4o/ui';

// ─── API Adapter ─────────────────────────────────────────────

const apiAdapter: UserDetailApiAdapter = {
  get: async (path: string) => {
    const { data } = await api.get(path);
    return data;
  },
  put: async (path: string, body?: any) => {
    const { data } = await api.put(path, body);
    return data;
  },
  post: async (path: string, body?: any) => {
    const { data } = await api.post(path, body);
    return data;
  },
  patch: async (path: string, body?: any) => {
    const { data } = await api.patch(path, body);
    return data;
  },
  delete: async (path: string) => {
    const { data } = await api.delete(path);
    return data;
  },
};

// ─── Config ──────────────────────────────────────────────────

const netureConfig: UserDetailConfig = {
  theme: 'primary',
  labels: {
    businessInfoTitle: '사업자 정보',
    businessNameLabel: '사업자명',
  },
};

// ─── Neture Status Change Actions ────────────────────────────

/**
 * WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1:
 * 승인/거부 → Neture registration endpoint (pending/rejected 사용자)
 * 정지/활성화 → MembershipConsole API
 */
const netureActions: UserDetailActions = {
  handleStatusChange: async (userId, status, { user, memberships, api: adapter }) => {
    if (status === 'approved' && (user.status === 'pending' || user.status === 'rejected')) {
      await adapter.post(`/neture/operator/registrations/${userId}/approve`);
    } else if (status === 'rejected' && user.status === 'pending') {
      await adapter.post(`/neture/operator/registrations/${userId}/reject`, { reason: '운영자 거부' });
    } else {
      const netureMembership = memberships.find(m => m.serviceKey === 'neture');
      if (netureMembership) {
        const endpoint = status === 'suspended'
          ? `/operator/members/${netureMembership.id}/reject`
          : `/operator/members/${netureMembership.id}/approve`;
        await adapter.patch(endpoint);
      } else {
        await adapter.patch(`/operator/members/${userId}/status`, { status });
      }
    }
  },
};

// ─── Page Component ──────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isCurrentUserAdmin = currentUser?.roles?.some(r => r === 'neture:admin' || r === 'platform:super_admin') ?? false;

  return (
    <CommonUserDetailPage
      apiAdapter={apiAdapter}
      config={netureConfig}
      isAdmin={isCurrentUserAdmin}
      actions={netureActions}
      navigate={navigate}
      userId={id}
    />
  );
}
