import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-AUDIT-LOG-V1 (additive)
 *
 * canonical 교체(운영자가 기존 STORE canonical 을 숨기고 새 설명서로 교체) 이력을 남기는
 * 신규 감사 로그 테이블을 추가한다. 기존 테이블/컬럼/인덱스/데이터는 변경하지 않는다.
 *
 * 테이블: shared_product_description_audit_logs
 *   - event_type = 'canonical_replaced' (V1 유일)
 *   - previous_description_id = 교체로 hidden 강등된 기존 canonical
 *   - new_description_id = 새로 canonical 로 승격된 설명서
 *
 * FK 정책 (감사 로그가 기존 설명서 삭제/정리 job 을 막지 않도록):
 *   - previous_description_id / new_description_id → shared_product_descriptions(id) ON DELETE SET NULL
 *   - performed_by → users(id) ON DELETE SET NULL
 *   - master_id → product_masters(id) ON DELETE CASCADE (SPD 자신의 master FK 와 동일)
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - shared_product_descriptions / product_masters / users 스키마 무변경
 *   - canonical partial unique 무변경
 *   - 과거 교체 이력 backfill 없음 (신규 교체부터 기록)
 */
export class CreateSharedProductDescriptionAuditLogs20270207000000
  implements MigrationInterface
{
  name = 'CreateSharedProductDescriptionAuditLogs20270207000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shared_product_description_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type varchar(40) NOT NULL,
        description_type varchar(32) NOT NULL,
        master_id uuid NOT NULL,
        language varchar(16) NOT NULL,
        previous_description_id uuid NULL,
        new_description_id uuid NULL,
        previous_status varchar(32) NULL,
        new_status varchar(32) NULL,
        performed_by uuid NULL,
        performed_at timestamp NOT NULL DEFAULT NOW(),
        metadata jsonb NULL,
        created_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    // FK — 감사 로그가 삭제/정리 job 을 막지 않도록 약하게(SET NULL/CASCADE).
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_spd_audit_master') THEN
          ALTER TABLE shared_product_description_audit_logs
            ADD CONSTRAINT fk_spd_audit_master
            FOREIGN KEY (master_id) REFERENCES product_masters(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_spd_audit_previous') THEN
          ALTER TABLE shared_product_description_audit_logs
            ADD CONSTRAINT fk_spd_audit_previous
            FOREIGN KEY (previous_description_id) REFERENCES shared_product_descriptions(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_spd_audit_new') THEN
          ALTER TABLE shared_product_description_audit_logs
            ADD CONSTRAINT fk_spd_audit_new
            FOREIGN KEY (new_description_id) REFERENCES shared_product_descriptions(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_spd_audit_performed_by') THEN
          ALTER TABLE shared_product_description_audit_logs
            ADD CONSTRAINT fk_spd_audit_performed_by
            FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spd_audit_master_type_lang_at
        ON shared_product_description_audit_logs (master_id, description_type, language, performed_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spd_audit_previous
        ON shared_product_description_audit_logs (previous_description_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spd_audit_new
        ON shared_product_description_audit_logs (new_description_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS shared_product_description_audit_logs`);
  }
}
