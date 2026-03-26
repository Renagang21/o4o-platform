/**
 * UserDetailPage — GlycoPharm 회원 상세 (공통 컴포넌트 Wrapper)
 * WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import {
  UserDetailPage as CommonUserDetailPage,
} from '@o4o/ui';
import type {
  UserDetailApiAdapter,
  UserDetailConfig,
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

const glycopharmConfig: UserDetailConfig = {
  theme: 'primary',
  labels: {
    businessInfoTitle: '약국 정보',
    businessNameLabel: '약국명',
  },
};

// ─── Page Component ──────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  // WO-O4O-AUTH-RBAC-CLEANUP-V1: prefixed role check
  const isCurrentUserAdmin = currentUser?.roles?.some(r => r === 'glycopharm:admin' || r === 'platform:super_admin') ?? false;

  return (
    <CommonUserDetailPage
      apiAdapter={apiAdapter}
      config={glycopharmConfig}
      isAdmin={isCurrentUserAdmin}
      navigate={navigate}
      userId={id}
    />
  );
}
