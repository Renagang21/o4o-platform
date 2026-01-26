/**
 * Admin Vault 접근 권한 검증
 *
 * Work Order: WO-O4O-ADMIN-VAULT-ACCESS-V1
 *
 * o4o 설계 보호 구역(Admin Vault)은
 * 지정된 관리자 계정만 접근 가능하다.
 */

// Admin Vault 접근 허용 계정 목록
// 운영자 계정으로 변경 (2026-01-26)
const ADMIN_VAULT_ALLOWED_EMAILS = [
  'admin-neture@o4o.com',
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
