/**
 * UserDetailPage — K-Cosmetics 회원 상세 (공통 컴포넌트 Wrapper)
 * WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import {
  UserDetailPage as CommonUserDetailPage,
  createUserDetailApiAdapter,
} from '@o4o/ui';
import type {
  UserDetailConfig,
} from '@o4o/ui';

// ─── API Adapter ─────────────────────────────────────────────
// WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
//   3서비스에 복제돼 있던 언랩 어댑터를 @o4o/ui 공통 팩토리로 대체 (동작 동일).

const apiAdapter = createUserDetailApiAdapter(api);

// ─── Config ──────────────────────────────────────────────────

const cosmeticsConfig: UserDetailConfig = {
  theme: 'primary',
  labels: {
    businessInfoTitle: '사업자 정보',
    businessNameLabel: '사업자명',
  },
};

// ─── Page Component ──────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isCurrentUserAdmin = currentUser?.roles?.some(r => r === 'cosmetics:admin' || r === 'platform:super_admin') ?? false;

  return (
    <CommonUserDetailPage
      apiAdapter={apiAdapter}
      config={cosmeticsConfig}
      isAdmin={isCurrentUserAdmin}
      navigate={navigate}
      userId={id}
    />
  );
}
