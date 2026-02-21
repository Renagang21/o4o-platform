import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1
 *
 * 공급자-판매자 관계 상태머신 확장:
 * 1. status enum에 suspended, revoked, expired 추가
 * 2. event_type enum에 suspended, reactivated, revoked, expired 추가
 * 3. neture_supplier_requests 테이블에 관계 통제 컬럼 추가
 */
export class NetureSupplierRelationStateExtension20260222000000 implements MigrationInterface {
  name = 'NetureSupplierRelationStateExtension20260222000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ============================================================
    // 1. status enum 확장 (neture_supplier_requests.status)
    // ============================================================
    // PostgreSQL enum 타입명 (원본 migration 1737200000000에서 생성):
    // neture_supplier_request_status_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'suspended'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_supplier_request_status_enum'))
        THEN
          ALTER TYPE neture_supplier_request_status_enum ADD VALUE 'suspended';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'revoked'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_supplier_request_status_enum'))
        THEN
          ALTER TYPE neture_supplier_request_status_enum ADD VALUE 'revoked';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'expired'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_supplier_request_status_enum'))
        THEN
          ALTER TYPE neture_supplier_request_status_enum ADD VALUE 'expired';
        END IF;
      END $$;
    `);

    // ============================================================
    // 2. event_type enum 확장 (neture_supplier_request_events.event_type)
    // ============================================================
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'suspended'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_request_event_type_enum'))
        THEN
          ALTER TYPE neture_request_event_type_enum ADD VALUE 'suspended';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'reactivated'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_request_event_type_enum'))
        THEN
          ALTER TYPE neture_request_event_type_enum ADD VALUE 'reactivated';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'revoked'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_request_event_type_enum'))
        THEN
          ALTER TYPE neture_request_event_type_enum ADD VALUE 'revoked';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'expired'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_request_event_type_enum'))
        THEN
          ALTER TYPE neture_request_event_type_enum ADD VALUE 'expired';
        END IF;
      END $$;
    `);

    // ============================================================
    // 3. 관계 통제 컬럼 추가
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE neture_supplier_requests
        ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS relation_note TEXT,
        ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ;
    `);

    // ============================================================
    // 4. 인덱스
    // ============================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_neture_supplier_request_effective_until"
        ON neture_supplier_requests (effective_until)
        WHERE effective_until IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 제거
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_neture_supplier_request_effective_until";`);

    // 컬럼 제거
    await queryRunner.query(`
      ALTER TABLE neture_supplier_requests
        DROP COLUMN IF EXISTS suspended_at,
        DROP COLUMN IF EXISTS revoked_at,
        DROP COLUMN IF EXISTS expired_at,
        DROP COLUMN IF EXISTS relation_note,
        DROP COLUMN IF EXISTS effective_until;
    `);

    // NOTE: PostgreSQL enum 값은 ALTER TYPE ... DROP VALUE로 제거할 수 없음
    // rollback이 필요한 경우 enum 타입을 재생성해야 함 (운영에서는 권장하지 않음)
  }
}
