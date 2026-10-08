/**
 * 세미프랜차이즈 커뮤니티 접근 — DESIGN §7
 *
 * `semi_franchises.community_key` 로 식별하는 사업 공간은 별도 커뮤니티 가입 없이
 * **그 세미프랜차이즈 가입이 active 인 약국 조직의 owner/admin/manager** 만 이용한다.
 * 정지 · 종료 · 미가입 = 차단. `community_memberships` 를 만들거나 동기화하지 않는다(가입 상태를 직접 판정).
 * 일반 커뮤니티의 독립 가입 정책은 이 함수와 무관하다(semiFranchise=false 이면 호출 측이 종전 판정을 쓴다).
 */
type Exec = { query: (sql: string, params?: unknown[]) => Promise<any[]> };

export interface SemiFranchiseCommunityAccess {
  /** 이 communityKey 가 세미프랜차이즈 커뮤니티인가 */
  semiFranchise: boolean;
  allowed: boolean;
  semiFranchiseKey: string | null;
  operator?: boolean;
}

export async function resolveSemiFranchiseCommunityAccess(
  exec: Exec,
  userId: string | null | undefined,
  communityKey: string,
): Promise<SemiFranchiseCommunityAccess> {
  const [sf] = await exec.query(
    `SELECT id, key, status FROM semi_franchises WHERE community_key = $1 LIMIT 1`,
    [communityKey],
  );
  if (!sf) return { semiFranchise: false, allowed: false, semiFranchiseKey: null };
  if (sf.status !== 'active') return { semiFranchise: true, allowed: false, semiFranchiseKey: sf.key };
  if (!userId) return { semiFranchise: true, allowed: false, semiFranchiseKey: sf.key };
  const rows = await exec.query(
    `SELECT 1
      WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = $2 AND u."isEmailVerified" = true AND u."isActive" = true AND u.status IN ('active','approved'))
        AND NOT EXISTS (SELECT 1 FROM service_memberships main WHERE main.user_id = $2 AND main.service_key = 'neture' AND main.status IN ('suspended','withdrawn'))
        AND (EXISTS (
       SELECT 1 FROM semi_franchise_memberships sfm
       JOIN organization_members om
         ON om.organization_id = sfm.organization_id AND om.user_id = $2
        AND om.role IN ('owner','admin','manager') AND om.left_at IS NULL
       JOIN neture_pharmacy_memberships npm
         ON npm.organization_id = sfm.organization_id AND npm.status = 'active'
      WHERE sfm.semi_franchise_id = $1 AND sfm.status = 'active'
        ) OR EXISTS (
          SELECT 1 FROM semi_franchise_operators sfo
          JOIN role_assignments ra ON ra.user_id = sfo.user_id AND ra.is_active = true
            AND ra.role IN ('neture:operator','neture:admin')
          WHERE sfo.semi_franchise_id = $1 AND sfo.user_id = $2 AND sfo.revoked_at IS NULL
        ))
      LIMIT 1`,
    [sf.id, userId],
  );
  return { semiFranchise: true, allowed: rows.length > 0, semiFranchiseKey: sf.key };
}
