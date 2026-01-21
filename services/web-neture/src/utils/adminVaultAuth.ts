/**
 * Admin Vault 접근 권한 검증
 *
 * Work Order: WO-O4O-ADMIN-VAULT-ACCESS-V1
 *
 * o4o 설계 보호 구역(Admin Vault)은
 * 지정된 관리자 계정만 접근 가능하다.
 */

// Admin Vault 접근 허용 계정 목록
const ADMIN_VAULT_ALLOWED_EMAILS = [
  'o4o-admin-id@admin.co.kr',
];

/**
 * Admin Vault 접근 권한 확인
 * @param email 사용자 이메일
 * @returns 접근 가능 여부
 */
export function isAdminVaultAuthorized(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_VAULT_ALLOWED_EMAILS.includes(email.toLowerCase());
}
