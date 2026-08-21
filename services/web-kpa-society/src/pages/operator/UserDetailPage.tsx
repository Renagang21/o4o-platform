/**
 * UserDetailPage — KPA Society 회원 상세 (공통 컴포넌트 Wrapper)
 * WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../lib/role-constants';
import { authClient } from '../../contexts/AuthContext';
import {
  UserDetailPage as CommonUserDetailPage,
  createUserDetailApiAdapter,
} from '@o4o/ui';
import type {
  UserDetailConfig,
} from '@o4o/ui';

// ─── API Adapter (authClient.api — Axios instance) ───────────
// WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
//   3서비스에 복제돼 있던 언랩 어댑터를 @o4o/ui 공통 팩토리로 대체 (동작 동일).

const apiAdapter = createUserDetailApiAdapter(authClient.api);

// ─── Config ──────────────────────────────────────────────────

const kpaConfig: UserDetailConfig = {
  // WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1:
  //   lifecycle write 는 이 serviceKey 의 membership 에만 영향을 준다 (fan-out 차단).
  serviceKey: 'kpa-society',
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
