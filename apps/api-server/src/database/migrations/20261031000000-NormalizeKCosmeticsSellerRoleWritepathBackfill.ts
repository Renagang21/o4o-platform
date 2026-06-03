import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1
 *
 * K-Cosmetics 판매자(=매장 경영자) 의 canonical role 은 `cosmetics:store_owner` 이다.
 * (2026-09 BackfillStoreOwnerRoles20260900000000 / CleanupKCosmeticsSellerRole20260901000000 통합 기준.)
 *
 * 배경:
 *   - 위 2026-09 통합 마이그레이션은 *기존 행 1회성 backfill* 이었고, 가입/승인 write-path 는 정렬되지 않아
 *     이후 가입·승인된 판매자는 다시 legacy `'seller'` role 을 얻어 메뉴/가드(cosmetics:store_owner 기준)에서 누락되었다.
 *   - 본 WO 에서 write-path(auth-register / MembershipApprovalService) 를 정규화하여 신규는 재발하지 않는다.
 *   - 본 migration 은 그 사이 누적된 *기존 판매자 데이터* 를 1회 재정규화한다 (멱등, no-op down).
 *
 * 처리:
 *   1. 사전 진단 카운트
 *   2. role_assignments: k-cosmetics 멤버 중 active seller 변종 → cosmetics:store_owner
 *      (이미 active cosmetics:store_owner 보유 시 UPDATE 제외 — unique_active_role_per_user 충돌 방지)
 *   3. 잔여 seller 변종 active row deactivate (store_owner 이미 보유했던 케이스 정리)
 *   4. service_memberships: k-cosmetics seller 변종 → cosmetics:store_owner (role SSOT 일관성)
 *   5. 사후 검증 카운트
 *
 * 범위 밖 (선례 BackfillCosmeticsServiceEnrollments20260930000000 와 동일 원칙):
 *   - cosmetics_stores / organization / org_members 등 *매장 context 생성* 은 본 migration 에서 하지 않는다.
 *     매장 context backfill 은 검증된 provisioning(CosmeticsStoreService.ensureStoreContextForOwner) 을 재사용하는
 *     별도 스크립트(scripts/backfill-cosmetics-seller-stores.ts)로 수행한다 (slug registry/org reuse 정합 보장).
 */
export class NormalizeKCosmeticsSellerRoleWritepathBackfill20261031000000 implements MigrationInterface {
  name = 'NormalizeKCosmeticsSellerRoleWritepathBackfill20261031000000';

  private readonly SELLER_VARIANTS = ['seller', 'cosmetics:seller', 'k-cosmetics:seller'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. 사전 진단 ───────────────────────────────────────────
    const raPre = await queryRunner.query(`
      SELECT COUNT(*)::int AS c
      FROM role_assignments ra
      JOIN service_memberships sm ON sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics'
      WHERE ra.is_active = true
        AND ra.role IN ('seller', 'cosmetics:seller', 'k-cosmetics:seller')
    `);
    const smPre = await queryRunner.query(`
      SELECT COUNT(*)::int AS c
      FROM service_memberships
      WHERE service_key = 'k-cosmetics'
        AND role IN ('seller', 'cosmetics:seller', 'k-cosmetics:seller')
    `);
    console.log(
      `[Migration] NormalizeKCosmeticsSellerRole: pre-check — role_assignments seller variants=${raPre[0]?.c ?? 0}, service_memberships seller variants=${smPre[0]?.c ?? 0}`,
    );

    if ((raPre[0]?.c ?? 0) === 0 && (smPre[0]?.c ?? 0) === 0) {
      console.log('[Migration] NormalizeKCosmeticsSellerRole: no-op (already normalized)');
      return;
    }

    // ─── 2. role_assignments seller 변종 → cosmetics:store_owner ─
    //   이미 active cosmetics:store_owner 가 있으면 제외 (unique_active_role_per_user 충돌 방지).
    const raUpdate = await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'cosmetics:store_owner', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id
        AND sm.service_key = 'k-cosmetics'
        AND ra.is_active = true
        AND ra.role IN ('seller', 'cosmetics:seller', 'k-cosmetics:seller')
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments r2
          WHERE r2.user_id = ra.user_id
            AND r2.role = 'cosmetics:store_owner'
            AND r2.is_active = true
        )
    `);
    const raUpdated = Array.isArray(raUpdate) ? raUpdate.length : (raUpdate as { rowCount?: number }).rowCount ?? 0;

    // ─── 3. 잔여 seller 변종 active deactivate (store_owner 이미 보유 케이스) ─
    const raDeact = await queryRunner.query(`
      UPDATE role_assignments
      SET is_active = false, updated_at = NOW()
      WHERE is_active = true
        AND role IN ('seller', 'cosmetics:seller', 'k-cosmetics:seller')
        AND user_id IN (SELECT user_id FROM service_memberships WHERE service_key = 'k-cosmetics')
    `);
    const raDeactivated = Array.isArray(raDeact) ? raDeact.length : (raDeact as { rowCount?: number }).rowCount ?? 0;

    // ─── 4. service_memberships seller 변종 → cosmetics:store_owner ─
    const smUpdate = await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'cosmetics:store_owner', updated_at = NOW()
      WHERE service_key = 'k-cosmetics'
        AND role IN ('seller', 'cosmetics:seller', 'k-cosmetics:seller')
    `);
    const smUpdated = Array.isArray(smUpdate) ? smUpdate.length : (smUpdate as { rowCount?: number }).rowCount ?? 0;

    // ─── 5. 사후 검증 ───────────────────────────────────────────
    const raPost = await queryRunner.query(`
      SELECT COUNT(*)::int AS c
      FROM role_assignments ra
      JOIN service_memberships sm ON sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics'
      WHERE ra.is_active = true
        AND ra.role IN ('seller', 'cosmetics:seller', 'k-cosmetics:seller')
    `);
    console.log(
      `[Migration] NormalizeKCosmeticsSellerRole: DONE — role_assignments updated=${raUpdated}, deactivated=${raDeactivated}, service_memberships updated=${smUpdated}, remaining_active_seller=${raPost[0]?.c ?? 0}`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op: legacy seller 포맷 복원은 원하지 않음 (CleanupKCosmeticsSellerRole20260901000000 와 동일 정책).
    console.log('[Migration] NormalizeKCosmeticsSellerRole down: no-op (legacy restoration not desired)');
  }
}
