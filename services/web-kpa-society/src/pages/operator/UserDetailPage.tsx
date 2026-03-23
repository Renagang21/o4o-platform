/**
 * UserDetailPage — KPA Society 회원 상세 (공통 컴포넌트 Wrapper)
 * WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../lib/role-constants';
import { authClient } from '@o4o/auth-client';
import {
  UserDetailPage as CommonUserDetailPage,
} from '@o4o/ui';
import type {
  UserDetailApiAdapter,
  UserDetailConfig,
} from '@o4o/ui';

// ─── API Adapter (authClient.api — Axios instance) ───────────

const api = authClient.api;

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

const kpaConfig: UserDetailConfig = {
  theme: 'blue',
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
  const isCurrentUserAdmin = currentUser?.roles?.includes(ROLES.KPA_ADMIN) ?? false;

  return (
    <CommonUserDetailPage
      apiAdapter={apiAdapter}
      config={kpaConfig}
      isAdmin={isCurrentUserAdmin}
      navigate={navigate}
      userId={id}
    />
  );
}
