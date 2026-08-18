/**
 * CreateCafe24Connections
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §4
 *
 * Cafe24 OAuth 연결정보 저장소. Cafe24 는 access token 이 단시간 만료되고
 * refresh 시 기존 refresh token 이 폐기되므로, mall 별 토큰을 지속 저장하지 않으면
 * 다중 쇼핑몰 서비스가 성립하지 않는다 (Phase A 에서 persistent 저장소 부재 확인).
 *
 * 의도적 최소 설계:
 *   - 소유권 컬럼(organization_id/supplier_id/service_key) 없음.
 *     "이 mall 을 누가 소유하는가" 는 Census 결과를 본 뒤 별도 WO 로 판정한다.
 *   - 상품/주문/회원 컬럼 없음. Cafe24 원장 복제 금지 (WO §2).
 *   - client_secret 컬럼 없음. 환경 secret 으로만 관리 (WO §3).
 *
 * token 은 암호문(text)으로 저장한다 — 평문 컬럼을 만들지 않는다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCafe24Connections20270313000000 implements MigrationInterface {
  name = 'CreateCafe24Connections20270313000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cafe24_connections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "mall_id" varchar(64) NOT NULL,
        "shop_no" int NOT NULL DEFAULT 1,
        "access_token_enc" text NOT NULL,
        "refresh_token_enc" text NOT NULL,
        "access_token_expires_at" timestamptz NOT NULL,
        "refresh_token_expires_at" timestamptz NOT NULL,
        "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" varchar(24) NOT NULL DEFAULT 'ACTIVE',
        "last_error" text,
        "last_refreshed_at" timestamptz,
        "connected_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cafe24_connections" PRIMARY KEY ("id")
      )
    `);

    // 같은 몰·같은 shop 은 연결 1건 (재승인은 UPDATE 로 덮어쓴다)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cafe24_connections_mall_shop"
        ON "cafe24_connections" ("mall_id", "shop_no")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cafe24_connections_status"
        ON "cafe24_connections" ("status")
    `);

    // 엔티티 union 과 1:1 유지
    await queryRunner.query(`
      ALTER TABLE "cafe24_connections"
        DROP CONSTRAINT IF EXISTS "CHK_cafe24_connections_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "cafe24_connections"
        ADD CONSTRAINT "CHK_cafe24_connections_status"
        CHECK ("status" IN ('ACTIVE', 'EXPIRED', 'DISCONNECTED', 'ERROR'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS "cafe24_connections" DROP CONSTRAINT IF EXISTS "CHK_cafe24_connections_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cafe24_connections_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_cafe24_connections_mall_shop"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cafe24_connections"`);
  }
}
