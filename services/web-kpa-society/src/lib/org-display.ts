/**
 * Organization Display Utility
 * WO-KPA-CONTEXT-SWITCHER-AND-ORG-RESOLUTION-V1
 *
 * 서비스 컨텍스트에 따라 조직 이름 표시를 제어한다.
 *   KPA_A (커뮤니티) → "대한약사회" (본회 레벨)
 *   KPA_B (데모)     → null (표시 불필요)
 *   KPA_C (분회 서비스) → 실제 소속 조직명 (e.g. "종로구약사회")
 */

import type { KpaServiceId } from '../contexts/ServiceContext';
import type { User } from '../contexts/AuthContext';

/**
 * 서비스 컨텍스트에 맞는 조직 표시명을 반환한다.
 *
 * @param service - 현재 서비스 컨텍스트
 * @param user - 로그인된 사용자 (null이면 null 반환)
 * @returns 표시할 조직명 또는 null
 */
export function getDisplayOrganizationName(
  service: KpaServiceId,
  user: User | null,
): string | null {
  if (!user) return null;

  switch (service) {
    case 'KPA_A':
      return '대한약사회';
    case 'KPA_C':
      return user.membershipOrgName || null;
    case 'KPA_B':
      return null;
  }
}
