import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 — Phase C (최종 정리)
 *
 * 선행 완료:
 *   Phase A: organizations 확장, enrollment, extension, VIEW 생성 (비파괴적)
 *   Phase B: 코드 전환 (GlycopharmPharmacy → OrganizationStore + Extension)
 *
 * 이 마이그레이션:
 *   C-1: glycopharm_pharmacies를 참조하는 모든 FK 재지정 → organizations
 *   C-2: glycopharm_pharmacy_extensions에 email 컬럼 추가 (GAP 해소)
 *   C-3: email 데이터 백필 (glycopharm_pharmacies → extension)
 *   C-4: v_glycopharm_pharmacies VIEW 갱신 (email 포함)
 *   C-5: glycopharm_pharmacies 테이블 DROP
 *
 * 안전성:
 *   - PK 공유(glycopharm_pharmacies.id ≡ organizations.id) 덕분에
 *     pharmacy_id 값은 이미 organizations.id로 유효
 *   - 런타임 코드는 glycopharm_pharmacies를 더 이상 참조하지 않음 (Phase B 완료)
 */
export class OrgServiceModelNormalizationPhaseC20260221100000 implements MigrationInterface {
  name = 'OrgServiceModelNormalizationPhaseC20260221100000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ============================================================
    // C-1: glycopharm_pharmacies를 참조하는 모든 FK 찾아서 재지정
    //
    // information_schema로 동적 발견 → DROP → organizations 참조로 재생성
    // glycopharm_pharmacies 자체의 FK (id → kpa_organizations)는
    // 테이블 DROP 시 자동 제거되므로 제외
    // ============================================================

    const fkConstraints = await queryRunner.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE ccu.table_name = 'glycopharm_pharmacies'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name != 'glycopharm_pharmacies'
        AND tc.table_schema = 'public'
    `);

    console.log(
      `[Phase C] Found ${fkConstraints.length} FK constraint(s) referencing glycopharm_pharmacies`
    );

    for (const fk of fkConstraints) {
      const { constraint_name, table_name, column_name } = fk;

      console.log(
        `[Phase C] Repointing: ${table_name}.${column_name} (${constraint_name}) → organizations`
      );

      // Drop old FK
      await queryRunner.query(
        `ALTER TABLE "${table_name}" DROP CONSTRAINT IF EXISTS "${constraint_name}"`
      );

      // Check if column is nullable
      const colInfo = await queryRunner.query(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'
      `, [table_name, column_name]);

      const isNullable = colInfo.length > 0 && colInfo[0].is_nullable === 'YES';
      const onDelete = isNullable ? 'SET NULL' : 'CASCADE';

      // Add new FK pointing to organizations
      const newConstraint = `FK_${table_name}_${column_name}_org`;
      await queryRunner.query(`
        ALTER TABLE "${table_name}"
        ADD CONSTRAINT "${newConstraint}"
        FOREIGN KEY ("${column_name}")
        REFERENCES organizations(id)
        ON DELETE ${onDelete}
      `);
    }

    // ============================================================
    // C-2: glycopharm_pharmacy_extensions에 email 컬럼 추가
    // ============================================================

    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacy_extensions
      ADD COLUMN IF NOT EXISTS email VARCHAR(255)
    `);

    // ============================================================
    // C-3: email 데이터 백필
    // ============================================================

    // glycopharm_pharmacies 테이블이 아직 존재하는 동안 백필
    const tableExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'glycopharm_pharmacies' AND table_schema = 'public'
    `);

    if (tableExists.length > 0) {
      const emailResult = await queryRunner.query(`
        UPDATE glycopharm_pharmacy_extensions ext
        SET email = gp.email
        FROM glycopharm_pharmacies gp
        WHERE ext.organization_id = gp.id
          AND gp.email IS NOT NULL
          AND ext.email IS NULL
      `);
      console.log(`[Phase C] Email backfill complete`);
    }

    // ============================================================
    // C-4: v_glycopharm_pharmacies VIEW 갱신 (email 포함)
    // ============================================================

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_glycopharm_pharmacies AS
      SELECT
        o.id,
        o.name,
        o.code,
        o.address,
        o.phone,
        ext.email,
        ext.owner_name,
        o.business_number,
        pss.slug,
        o.description,
        ext.hero_image,
        ext.logo,
        CASE WHEN o."isActive" THEN 'active' ELSE 'inactive' END AS status,
        ext.sort_order,
        o.created_by_user_id,
        ext.enabled_services,
        o.storefront_config,
        o.template_profile,
        o.storefront_blocks,
        o."createdAt" AS created_at,
        o."updatedAt" AS updated_at
      FROM organizations o
      JOIN organization_service_enrollments ose
        ON ose.organization_id = o.id
       AND ose.service_code = 'glycopharm'
      LEFT JOIN glycopharm_pharmacy_extensions ext
        ON ext.organization_id = o.id
      LEFT JOIN platform_store_slugs pss
        ON pss.store_id = o.id
       AND pss.service_key = 'glycopharm'
       AND pss.is_active = true;
    `);

    // ============================================================
    // C-5: glycopharm_pharmacies 테이블 DROP
    //
    // 자체 FK (id → kpa_organizations) + 인덱스 자동 제거
    // 외부 FK는 C-1에서 이미 제거됨
    // ============================================================

    // Drop self FK first (glycopharm_pharmacies.id → kpa_organizations.id)
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      DROP CONSTRAINT IF EXISTS "FK_pharmacy_organization"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS glycopharm_pharmacies
    `);

    console.log('[Phase C] glycopharm_pharmacies table dropped. Migration complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Phase C는 의도적 단방향 마이그레이션.
    // glycopharm_pharmacies 재생성이 필요한 경우
    // v_glycopharm_pharmacies VIEW에서 데이터를 읽을 수 있음.
    console.warn(
      '[Phase C] down: glycopharm_pharmacies cannot be automatically restored. ' +
      'Use v_glycopharm_pharmacies VIEW for backward-compatible reads.'
    );
  }
}
