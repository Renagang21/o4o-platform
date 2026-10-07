/**
 * 운영 스크립트의 DB 로그인 identity 를 env 에서만 받는다.
 * WO-O4O-REPOSITORY-DB-IDENTITY-AND-LEGACY-OPERATIONAL-SCRIPTS-CLEANUP-V1
 *
 * 코드에서 로그인 identity 를 추정하거나 기본값을 두지 않는다.
 * `o4o_api` 는 NOLOGIN owner role 이다 — 로그인 identity 는 SETUP.md §4 참조.
 * 인벤토리: docs/baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md
 */
export function requireDbUsername() {
  const user = (process.env.DB_USERNAME ?? '').trim();
  if (!user) {
    throw new Error(
      'DB_USERNAME is required — no default login identity (o4o_api is a NOLOGIN owner role; see SETUP.md §4)',
    );
  }
  return user;
}
