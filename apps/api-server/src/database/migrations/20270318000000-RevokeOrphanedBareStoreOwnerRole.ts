/**
 * RevokeOrphanedBareStoreOwnerRole
 * WO-O4O-CROSSSERVICE-LEGACY-BARE-ROLE-CENSUS-AND-CLEANUP-V1
 *
 * 정본: docs/checks/WO-O4O-CROSSSERVICE-LEGACY-BARE-ROLE-CENSUS-AND-CLEANUP-V1-CHECK.md
 *
 * `role_assignments` 의 접두어 없는 legacy **서비스** 역할 중 유일하게 활성으로 남은
 * `store_owner` 를 회수(soft revoke)한다.
 *
 * ## 왜 `store_owner` 만인가 (2026-08-24 프로덕션 read-only census)
 *
 * bare role 총 22행 / 7종. 그중
 *   - `customer` · `user` · `supplier` — RBAC Role Catalog V1 §1 의 정식 전역 역할이고
 *     살아있는 consumer 가 있다(Neture 는 WO-NETURE-ROLE-NORMALIZATION-V1 로 의도적 unprefixed).
 *   - `pharmacy` — GlycoPharm 추천 가중치가 bare 문자열을 그대로 읽는다
 *     (`ForumRecommendationController`). 회수하면 동작이 바뀐다.
 *   - `member` · `super_admin` — 이미 비활성(이력)이다. 손대지 않는다.
 *   - `store_owner` — **어떤 consumer 도 bare 형태를 읽지 않는다.**
 *     매장 경영자 판정은 전부 prefixed 다(`store-owner.utils.ts` SERVICE_STORE_OWNER_ROLES ·
 *     `kpa-store-owner.util.ts`), `scope-assignment.utils.ts` 의 member 목록에도 없다.
 *     Role Catalog 의 접두어 없는 목록에도 없다 → 전역 역할이 아니다.
 *
 * ## 안전장치 — 멤버십이 하나도 없는 사용자만
 *
 * service_membership 이 한 건이라도 있으면 그 서비스가 이 행을 의도했을 여지가 있으므로
 * 대상에서 뺀다. 실제 대상은 census 기준 1행(멤버십 0 · prefixed role 0 · users.status='deleted')
 * 이며, 이 사용자는 그 어떤 서비스에도 속해 있지 않아 권한 변화가 발생할 수 없다.
 *
 * ## 하지 않는 것
 *
 * row DELETE(이력 보존 — 회수 계약은 `is_active=false`) · 다른 role 로의 변환 ·
 * users / service_memberships 변경 · prefixed role 부여.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevokeOrphanedBareStoreOwnerRole20270318000000 implements MigrationInterface {
  name = 'RevokeOrphanedBareStoreOwnerRole20270318000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const revoked: Array<{ id: string; user_id: string }> = await queryRunner.query(`
      UPDATE role_assignments ra
         SET is_active = false, updated_at = NOW()
       WHERE ra.role = 'store_owner'
         AND ra.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM service_memberships sm WHERE sm.user_id = ra.user_id
         )
      RETURNING ra.id, ra.user_id
    `);
    const rows = Array.isArray(revoked) ? revoked : [];
    // eslint-disable-next-line no-console
    console.log(
      `[RevokeOrphanedBareStoreOwnerRole] soft-revoked ${rows.length} row(s)` +
        (rows.length ? `: ${rows.map((r) => r.id).join(', ')}` : '')
    );
  }

  public async down(): Promise<void> {
    // 되돌리지 않는다. 되살릴 행을 정확히 특정할 수 없고(이 migration 이 내린 행과 정상
    // 경로로 회수된 행이 구분되지 않는다), 되살리면 consumer 도 없는 역할을 다시 켜는
    // 방향이라 안전하지 않다. 회수는 행을 지우지 않으므로 이력은 그대로 남아 있다.
  }
}
