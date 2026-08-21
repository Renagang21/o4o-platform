/**
 * UserDetailPage — Pharmacy-Hub 회원 상세 (공통 Core Wrapper)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1
 *
 * 신규 독자 화면을 만들지 않는다. KPA / K-Cosmetics / Neture 와 동일하게
 * `@o4o/ui` 의 공통 UserDetailPage 를 adapter + config 만 주입해 재사용한다.
 *
 * ID 계약: route param = **users.id** (공통 콘솔 `UserData.id` canonical 축).
 * lifecycle write 는 config.serviceKey 로 pharmacy-hub membership 에만 적용된다.
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  UserDetailPage as CommonUserDetailPage,
  createUserDetailApiAdapter,
} from '@o4o/ui';
import type { UserDetailConfig } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import { SERVICE_KEY } from '../../config/service';

const apiAdapter = createUserDetailApiAdapter(api);

const pharmacyHubConfig: UserDetailConfig = {
  serviceKey: SERVICE_KEY,
  listPath: '/operator/members',
  theme: 'primary',
  labels: {
    businessInfoTitle: '사업자 정보',
    businessNameLabel: '사업자명',
  },
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isCurrentUserAdmin =
    currentUser?.roles?.some(
      (r) => r === 'pharmacy-hub:admin' || r === 'platform:super_admin',
    ) ?? false;

  return (
    <CommonUserDetailPage
      apiAdapter={apiAdapter}
      config={pharmacyHubConfig}
      isAdmin={isCurrentUserAdmin}
      navigate={navigate}
      userId={id}
    />
  );
}
