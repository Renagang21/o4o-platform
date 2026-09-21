/**
 * useStoreOrganizationId — 내 매장 canonical organization (Unified Store Workspace)
 *
 * KPA 의 같은 이름 훅은 `GET /pharmacy/store/config` 의 organizationId(백엔드 per-service 해석)를 썼다.
 * Unified Store 에서는 1차 축이 **선택된 매장(organizationId)** 이므로 StoreContext 값을 그대로 돌려준다.
 * (백엔드 서비스 mount 는 여전히 자체 해석을 하므로, 두 값이 다르면 서버가 403 으로 거른다 — CHECK §제약 참조.)
 */
import { useUnifiedStore } from '../contexts/StoreContext';

export interface StoreOrganizationState {
  /** canonical 매장 조직 id. 미해석 상태에서는 '' */
  organizationId: string;
  loading: boolean;
  /** 조회 실패 시 고정 메시지(정상 미연결과 구분) */
  error: string | null;
}

export function useStoreOrganizationId(): StoreOrganizationState {
  const { status, organizationId, error } = useUnifiedStore();
  const loading = status === 'loading' || status === 'resolving' || status === 'idle';
  return { organizationId: organizationId ?? '', loading, error: status === 'error' ? error : null };
}
