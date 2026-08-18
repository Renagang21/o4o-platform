/**
 * AddPlatformStoreSlugsOrganizationFk
 * WO-O4O-PLATFORM-STORE-SLUG-FK-CASCADE-HARDENING-V1 §5
 *
 * `platform_store_slugs.store_id` 의 canonical 축은 **organizations.id** 다
 * (공개 조회 resolvePublicStore / store-policy 소유권 판정 / 조직 삭제 시 slug 정리 모두 이 축).
 * 그런데 이 테이블에는 FK 가 없어 조직이 hard delete 되면 slug 가 orphan 으로 남았다.
 * 실제로 KPA·cross-service 정리 WO 2건이 application 경로로 orphan 을 청소했다.
 *
 * application cleanup(OrganizationService.deleteOrganization)만 믿지 않고
 * DB referential integrity 로 orphan 재발을 구조적으로 차단한다.
 *
 * 2026-08-18 production read-only census:
 *   platform_store_slugs 총 15행 / store_id NULL 0 / orphan(organization 미존재) 0
 *   중복 slug 0 / 동일 org 다중 active slug 0
 *   store_id = uuid NOT NULL, organizations.id = uuid NOT NULL  → 타입 호환
 *   기존 constraint = PK + UNIQUE(slug) 뿐, FK 없음 / trigger 없음 / RLS 없음
 *   relation size 139,264 bytes (reltuples 1) → ALTER TABLE lock 영향 무시 가능
 *
 * 규모가 작아 `NOT VALID` → `VALIDATE CONSTRAINT` 2단계로 나누지 않는다.
 *
 * down: constraint 만 제거한다(데이터 무변경).
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

const CONSTRAINT = 'FK_platform_store_slugs_organization';

export class AddPlatformStoreSlugsOrganizationFk20270312000000 implements MigrationInterface {
  name = 'AddPlatformStoreSlugsOrganizationFk20270312000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 테이블이 없는 배포에서는 조용히 통과한다.
    const present = await queryRunner.query(
      `SELECT to_regclass('public.platform_store_slugs') IS NOT NULL AS a,
              to_regclass('public.organizations') IS NOT NULL AS b`,
    );
    if (!present?.[0]?.a || !present?.[0]?.b) return;

    // 1) precondition census — orphan 이 1건이라도 있으면 FK 생성이 실패한다.
    //    실패를 ALTER TABLE 에서 맞기 전에 명시적으로 멈춘다(원인이 로그에 남도록).
    const orphan = await queryRunner.query(
      `SELECT COUNT(*)::int AS cnt
         FROM platform_store_slugs s
    LEFT JOIN organizations o ON o.id = s.store_id
        WHERE o.id IS NULL`,
    );
    const orphanCount = orphan?.[0]?.cnt ?? 0;
    if (orphanCount > 0) {
      throw new Error(
        `[${this.name}] orphan platform_store_slugs rows = ${orphanCount}. ` +
          'FK 생성 전에 orphan slug 를 먼저 정리해야 한다 ' +
          '(WO-O4O-CROSS-SERVICE-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1 참조).',
      );
    }

    // 2) FK 생성 (재실행 안전)
    await queryRunner.query(
      `ALTER TABLE "platform_store_slugs" DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "platform_store_slugs"
         ADD CONSTRAINT "${CONSTRAINT}"
         FOREIGN KEY ("store_id") REFERENCES "organizations"("id") ON DELETE CASCADE`,
    );

    // 3) 검증 — 존재 + ON DELETE CASCADE(confdeltype='c') 확인
    const verify = await queryRunner.query(
      `SELECT confdeltype FROM pg_constraint
        WHERE conrelid = 'public.platform_store_slugs'::regclass
          AND conname = $1
          AND contype = 'f'`,
      [CONSTRAINT],
    );
    if (verify?.[0]?.confdeltype !== 'c') {
      throw new Error(
        `[${this.name}] FK 검증 실패: conname=${CONSTRAINT} confdeltype=${verify?.[0]?.confdeltype ?? 'none'}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "platform_store_slugs" DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"`,
    );
  }
}
