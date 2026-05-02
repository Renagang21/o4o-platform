/**
 * getUserDisplayName — 사용자 표시 이름 fallback 체인
 *
 * WO-O4O-NAME-NORMALIZATION-V1
 * WO-O4O-GLOBAL-USER-PROFILE-DROPDOWN-EXTRACTION-V1
 *
 * 우선순위:
 *   displayName > lastName+firstName > name(email과 다른 경우) > email prefix > '사용자'
 */

export interface DisplayNameUser {
  displayName?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  name?: string | null;
  email?: string | null;
}

export function getUserDisplayName(user: DisplayNameUser | null | undefined): string {
  if (!user) return '사용자';

  if (user.displayName) return user.displayName;

  if (user.lastName || user.firstName) {
    const fullName = `${user.lastName || ''}${user.firstName || ''}`.trim();
    if (fullName) return fullName;
  }

  if (user.name && user.name !== user.email) {
    return user.name;
  }

  if (user.email) return user.email.split('@')[0];

  return '사용자';
}
