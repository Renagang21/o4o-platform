/**
 * DropUsersLegacyUpdatedAt
 * WO-O4O-USERS-TIMESTAMP-DUAL-COLUMN-CANONICALIZATION-V1 §4
 *
 * users 테이블에는 갱신 시각 컬럼이 2개 존재했다.
 *
 *   "updatedAt"  — canonical. User entity 의 @UpdateDateColumn 이 갱신한다.
 *                  (SnakeNamingStrategy 미적용 → 컬럼명이 camelCase)
 *   updated_at   — legacy. 1700000000000-CreateUsersTable 이 만든 컬럼.
 *                  entity 도 runtime raw SQL 도 갱신하지 않아 INSERT 시각에서 멈춰 있다.
 *
 * 2026-08-18 production read-only census (53 rows):
 *   updated_at <> "updatedAt"  : 52 / 53
 *   "updatedAt" 이 최신         : 52 / 53   (updated_at 이 최신인 행 0)
 *   updated_at = created_at     : 53 / 53   ← 생성 이후 한 번도 움직인 적이 없다
 *
 * 즉 legacy 컬럼은 created_at 이 이미 갖고 있는 값 외에 어떤 정보도 갖고 있지 않다.
 * 두 컬럼을 계속 동기화하는 trigger/dual-write 는 WO 에서 금지되어 있으므로 제거한다.
 *
 * created_at / "createdAt" 은 같은 naming drift 지만 성격이 다르다 —
 * 53/53 행에서 값이 완전히 동일하고 stale 판정 위험이 없어 이번 migration 범위에서 제외한다.
 * (CHECK-O4O-USERS-TIMESTAMP-DUAL-COLUMN-CANONICALIZATION-V1 §E 참조)
 *
 * down: 컬럼을 되살리고 "createdAt" 으로 backfill 한다. legacy 의 의미가
 *       "INSERT 시각" 이었으므로 이 backfill 은 삭제 직전 값을 정확히 복원한다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUsersLegacyUpdatedAt20270310000000 implements MigrationInterface {
  name = 'DropUsersLegacyUpdatedAt20270310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    // legacy 의미 복원: INSERT 시각 = "createdAt"
    await queryRunner.query(`UPDATE "users" SET "updated_at" = "createdAt" WHERE "createdAt" IS NOT NULL`);
  }
}
