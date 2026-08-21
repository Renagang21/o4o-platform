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
  createUserDetailApiAdapter,
} from '@o4o/ui';
import type {
  UserDetailConfig,
  UserDetailActions,
} from '@o4o/ui';

// ─── API Adapter ─────────────────────────────────────────────
// WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
//   3서비스에 복제돼 있던 언랩 어댑터를 @o4o/ui 공통 팩토리로 대체 (동작 동일).

const apiAdapter = createUserDetailApiAdapter(api);

// ─── Config ──────────────────────────────────────────────────

const netureConfig: UserDetailConfig = {
  // WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1
  serviceKey: 'neture',
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
  handleStatusChange: async (userId, status, { user, api: adapter }) => {
    if (status === 'approved' && (user.status === 'pending' || user.status === 'rejected')) {
      await adapter.post(`/neture/operator/registrations/${userId}/approve`);
    } else if (status === 'rejected' && user.status === 'pending') {
      await adapter.post(`/neture/operator/registrations/${userId}/reject`, { reason: '운영자 거부' });
    } else {
      // WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1:
      //   정지/활성화 canonical 계약 = active → suspended / suspended → active.
      //   membership `reject`(가입 반려) 매핑을 제거하고 공통 lifecycle endpoint 로 정렬한다.
      //   serviceKey 로 neture membership 경계를 명시한다.
      await adapter.patch(`/operator/members/${userId}/status`, {
        status: status === 'approved' ? 'active' : status,
        serviceKey: 'neture',
      });
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
