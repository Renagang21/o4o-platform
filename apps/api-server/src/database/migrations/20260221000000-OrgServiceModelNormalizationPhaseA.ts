import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 — Phase A (비파괴적)
 *
 * 기존 테이블 삭제/수정 없음. 새 구조만 추가하고 데이터를 복사.
 *
 * A-1: organizations 확장 컬럼 추가
 * A-2: organization_service_enrollments 생성
 * A-3: kpa_organizations → organizations 데이터 동기화
 * A-4: glycopharm_pharmacies → organizations 확장 필드 반영
 * A-5: organization_service_enrollments 시딩
 * A-6: glycopharm_pharmacy_extensions 생성 + 데이터 이관
 * A-7: v_glycopharm_pharmacies 호환성 뷰
 */
export class OrgServiceModelNormalizationPhaseA20260221000000 implements MigrationInterface {
  name = 'OrgServiceModelNormalizationPhaseA20260221000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ============================================================
    // A-0: organizations 테이블 생성 (IF NOT EXISTS)
    //
    // @o4o/organization-core Organization 엔티티 기준.
    // 프로덕션에서는 synchronize:false이므로 테이블이 없을 수 있음.
    // 컬럼명: camelCase quoted (Organization 엔티티 원본 규칙)
    // ============================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL DEFAULT 'branch',
        "parentId" UUID,
        level INT NOT NULL DEFAULT 0,
        path TEXT NOT NULL DEFAULT '/',
        metadata JSONB,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "childrenCount" INT NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_parentId" ON organizations("parentId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_type" ON organizations(type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_isActive" ON organizations("isActive");`);

    // ============================================================
    // A-1: organizations 테이블에 storefront/약국 컬럼 추가
    //
    // organizations 컬럼명 규칙: camelCase quoted
    //   "parentId", "isActive", "childrenCount", "createdAt", "updatedAt"
    // 새 컬럼: snake_case (기존 kpa/glycopharm 패턴 일관성)
    // ============================================================

    await queryRunner.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS address VARCHAR(500),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS business_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
        ADD COLUMN IF NOT EXISTS storefront_config JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS template_profile VARCHAR(30) DEFAULT 'BASIC',
        ADD COLUMN IF NOT EXISTS storefront_blocks JSONB;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organizations_business_number"
      ON organizations(business_number)
      WHERE business_number IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organizations_created_by_user_id"
      ON organizations(created_by_user_id)
      WHERE created_by_user_id IS NOT NULL;
    `);

    // ============================================================
    // A-2: organization_service_enrollments 생성
    // ============================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_service_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        service_code VARCHAR(50) NOT NULL REFERENCES platform_services(code),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
        config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(organization_id, service_code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_org_svc_enroll_org"
      ON organization_service_enrollments(organization_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_org_svc_enroll_svc"
      ON organization_service_enrollments(service_code);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_org_svc_enroll_status"
      ON organization_service_enrollments(status);
    `);

    // ============================================================
    // A-3: kpa_organizations → organizations 데이터 동기화 (UPSERT)
    //
    // 주의사항:
    //   - organizations.path: NOT NULL, 기본값 없음 → 반드시 계산 필요
    //   - organizations.code: UNIQUE → kpa-{uuid_no_dash} 형식으로 생성
    //   - organizations."parentId": camelCase quoted
    //   - organizations."isActive": camelCase quoted
    //   - kpa_organizations.parent_id: snake_case
    //   - kpa_organizations.is_active: snake_case
    // ============================================================

    // Step 3a: 최상위 조직 (parent_id IS NULL) 먼저 삽입
    await queryRunner.query(`
      INSERT INTO organizations (
        id, name, code, type, "parentId", level, path,
        "isActive", "childrenCount", metadata,
        address, phone, description, storefront_config,
        "createdAt", "updatedAt"
      )
      SELECT
        k.id,
        k.name,
        COALESCE(o_existing.code, 'kpa-' || REPLACE(k.id::text, '-', '')),
        k.type,
        k.parent_id,
        0,
        '/' || LOWER(REGEXP_REPLACE(k.name, '[^a-zA-Z0-9가-힣]', '-', 'g')),
        k.is_active,
        (SELECT COUNT(*) FROM kpa_organizations c WHERE c.parent_id = k.id),
        '{}'::jsonb,
        k.address,
        k.phone,
        k.description,
        k.storefront_config,
        COALESCE(k.created_at, NOW()),
        COALESCE(k.updated_at, NOW())
      FROM kpa_organizations k
      LEFT JOIN organizations o_existing ON o_existing.id = k.id
      WHERE k.parent_id IS NULL
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        "isActive" = EXCLUDED."isActive",
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        description = EXCLUDED.description,
        storefront_config = EXCLUDED.storefront_config,
        "updatedAt" = NOW();
    `);

    // Step 3b: 2단계 하위 조직 (parent_id가 있는 조직)
    await queryRunner.query(`
      INSERT INTO organizations (
        id, name, code, type, "parentId", level, path,
        "isActive", "childrenCount", metadata,
        address, phone, description, storefront_config,
        "createdAt", "updatedAt"
      )
      SELECT
        k.id,
        k.name,
        COALESCE(o_existing.code, 'kpa-' || REPLACE(k.id::text, '-', '')),
        k.type,
        k.parent_id,
        1,
        COALESCE(p.path, '') || '/' || LOWER(REGEXP_REPLACE(k.name, '[^a-zA-Z0-9가-힣]', '-', 'g')),
        k.is_active,
        (SELECT COUNT(*) FROM kpa_organizations c WHERE c.parent_id = k.id),
        '{}'::jsonb,
        k.address,
        k.phone,
        k.description,
        k.storefront_config,
        COALESCE(k.created_at, NOW()),
        COALESCE(k.updated_at, NOW())
      FROM kpa_organizations k
      LEFT JOIN organizations o_existing ON o_existing.id = k.id
      LEFT JOIN organizations p ON p.id = k.parent_id
      WHERE k.parent_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM kpa_organizations gp WHERE gp.id = k.parent_id AND gp.parent_id IS NOT NULL
        )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        "parentId" = EXCLUDED."parentId",
        "isActive" = EXCLUDED."isActive",
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        description = EXCLUDED.description,
        storefront_config = EXCLUDED.storefront_config,
        "updatedAt" = NOW();
    `);

    // Step 3c: 3단계 하위 조직 (손자 조직)
    await queryRunner.query(`
      INSERT INTO organizations (
        id, name, code, type, "parentId", level, path,
        "isActive", "childrenCount", metadata,
        address, phone, description, storefront_config,
        "createdAt", "updatedAt"
      )
      SELECT
        k.id,
        k.name,
        COALESCE(o_existing.code, 'kpa-' || REPLACE(k.id::text, '-', '')),
        k.type,
        k.parent_id,
        2,
        COALESCE(p.path, '') || '/' || LOWER(REGEXP_REPLACE(k.name, '[^a-zA-Z0-9가-힣]', '-', 'g')),
        k.is_active,
        (SELECT COUNT(*) FROM kpa_organizations c WHERE c.parent_id = k.id),
        '{}'::jsonb,
        k.address,
        k.phone,
        k.description,
        k.storefront_config,
        COALESCE(k.created_at, NOW()),
        COALESCE(k.updated_at, NOW())
      FROM kpa_organizations k
      LEFT JOIN organizations o_existing ON o_existing.id = k.id
      LEFT JOIN organizations p ON p.id = k.parent_id
      WHERE k.parent_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM kpa_organizations gp WHERE gp.id = k.parent_id AND gp.parent_id IS NOT NULL
        )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        "parentId" = EXCLUDED."parentId",
        "isActive" = EXCLUDED."isActive",
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        description = EXCLUDED.description,
        storefront_config = EXCLUDED.storefront_config,
        "updatedAt" = NOW();
    `);

    // ============================================================
    // A-3d: glycopharm_pharmacies → organizations INSERT (UPSERT)
    //
    // glycopharm_pharmacies의 PK는 organizations.id와 공유 가능.
    // kpa_organizations에 없는 약국들을 organizations에 등록.
    // 동적 컬럼 조회: synchronize:true로 생성된 테이블이므로
    // 프로덕션에서 일부 컬럼이 없을 수 있음.
    // ============================================================

    const gpAllCols = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'glycopharm_pharmacies' AND table_schema = 'public'
    `);
    const gpAllColSet = new Set(gpAllCols.map((r: any) => r.column_name));

    // 기본 INSERT: id, name, code 필수 + 존재하는 컬럼 동적 추가
    const hasName = gpAllColSet.has('name');
    const hasCode = gpAllColSet.has('code');
    const hasAddress = gpAllColSet.has('address');
    const hasPhone = gpAllColSet.has('phone');
    const hasDescription = gpAllColSet.has('description');
    const hasStatus = gpAllColSet.has('status');

    console.log(`[Phase A] A-3d: glycopharm_pharmacies columns found: ${[...gpAllColSet].join(', ')}`);

    // 동적 INSERT — 존재하는 컬럼만 포함
    const insertCols: string[] = ['id', 'name', 'code', 'type', 'level', 'path', '"isActive"', '"childrenCount"', 'metadata'];
    const selectExprs: string[] = [
      'gp.id',
      hasName ? 'gp.name' : "'Pharmacy'",
      // code: UNIQUE 충돌 방지를 위해 항상 gp- prefix 사용
      "'gp-' || REPLACE(gp.id::text, '-', '')",
      "'pharmacy'",
      '0',
      "'/pharmacy/' || gp.id::text",
      hasStatus ? "gp.status = 'active'" : 'true',
      '0',
      "'{}'::jsonb",
    ];

    if (hasAddress) { insertCols.push('address'); selectExprs.push('gp.address'); }
    if (hasPhone) { insertCols.push('phone'); selectExprs.push('gp.phone'); }
    if (hasDescription) { insertCols.push('description'); selectExprs.push('gp.description'); }

    insertCols.push('"createdAt"', '"updatedAt"');
    selectExprs.push('NOW()', 'NOW()');

    await queryRunner.query(`
      INSERT INTO organizations (${insertCols.join(', ')})
      SELECT ${selectExprs.join(', ')}
      FROM glycopharm_pharmacies gp
      WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = gp.id)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[Phase A] A-3d: glycopharm_pharmacies inserted into organizations');

    // ============================================================
    // A-4: glycopharm_pharmacies → organizations 확장 필드 반영
    //
    // glycopharm_pharmacies는 synchronize:true로 생성된 테이블이므로
    // 프로덕션에서 일부 컬럼이 존재하지 않을 수 있음.
    // 존재하는 컬럼만 동적으로 복사.
    // ============================================================

    // gpAllColSet 재사용 (A-3d에서 이미 조회됨)
    const gpColSet = gpAllColSet;

    // 동적 SET 절 구성
    const setClauses: string[] = [];
    if (gpColSet.has('business_number')) setClauses.push('business_number = gp.business_number');
    if (gpColSet.has('created_by_user_id')) setClauses.push('created_by_user_id = gp.created_by_user_id');
    if (gpColSet.has('template_profile')) setClauses.push('template_profile = gp.template_profile');
    if (gpColSet.has('storefront_blocks')) setClauses.push('storefront_blocks = gp.storefront_blocks');
    if (gpColSet.has('storefront_config')) {
      setClauses.push(`storefront_config = COALESCE(o.storefront_config, '{}'::jsonb) || COALESCE(gp.storefront_config, '{}'::jsonb)`);
    }

    if (setClauses.length > 0) {
      await queryRunner.query(`
        UPDATE organizations o SET ${setClauses.join(', ')}
        FROM glycopharm_pharmacies gp
        WHERE o.id = gp.id;
      `);
    }

    console.log(`[Phase A] A-4: Copied ${setClauses.length} columns from glycopharm_pharmacies → organizations`);

    // ============================================================
    // A-5: organization_service_enrollments 시딩
    // ============================================================

    // 모든 활성 kpa_organizations → kpa-society 서비스
    await queryRunner.query(`
      INSERT INTO organization_service_enrollments (organization_id, service_code, status)
      SELECT k.id, 'kpa-society', 'active'
      FROM kpa_organizations k
      WHERE k.is_active = true
        AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = k.id)
      ON CONFLICT (organization_id, service_code) DO NOTHING;
    `);

    // 모든 활성 glycopharm_pharmacies → glycopharm 서비스
    await queryRunner.query(`
      INSERT INTO organization_service_enrollments (organization_id, service_code, status)
      SELECT gp.id, 'glycopharm', 'active'
      FROM glycopharm_pharmacies gp
      WHERE gp.status = 'active'
        AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = gp.id)
      ON CONFLICT (organization_id, service_code) DO NOTHING;
    `);

    // ============================================================
    // A-6: glycopharm_pharmacy_extensions 생성 + 데이터 이관
    // ============================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS glycopharm_pharmacy_extensions (
        organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
        enabled_services JSONB DEFAULT '[]'::jsonb,
        hero_image VARCHAR(2000),
        logo VARCHAR(2000),
        owner_name VARCHAR(100),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 동적 컬럼 확인 후 삽입 (gpColSet은 A-4에서 이미 조회됨)
    const extInsertCols: string[] = ['organization_id'];
    const extSelectCols: string[] = ['id'];

    for (const [extCol, gpCol] of [
      ['enabled_services', 'enabled_services'],
      ['hero_image', 'hero_image'],
      ['logo', 'logo'],
      ['owner_name', 'owner_name'],
      ['sort_order', 'sort_order'],
    ] as const) {
      if (gpColSet.has(gpCol)) {
        extInsertCols.push(extCol);
        extSelectCols.push(gpCol);
      }
    }

    await queryRunner.query(`
      INSERT INTO glycopharm_pharmacy_extensions
        (${extInsertCols.join(', ')})
      SELECT ${extSelectCols.join(', ')}
      FROM glycopharm_pharmacies
      WHERE EXISTS (SELECT 1 FROM organizations o WHERE o.id = glycopharm_pharmacies.id)
      ON CONFLICT (organization_id) DO NOTHING;
    `);

    console.log(`[Phase A] A-6: Migrated ${extInsertCols.length - 1} extension columns from glycopharm_pharmacies`);

    // ============================================================
    // A-7a: platform_store_slugs 테이블 생성 (IF NOT EXISTS)
    //
    // 프로덕션에서 src/migrations/ 디렉토리의 마이그레이션이 로드되지 않으므로
    // 이 테이블이 존재하지 않을 수 있음. VIEW에서 참조하기 전에 생성.
    // ============================================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_store_slugs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(120) NOT NULL UNIQUE,
        store_id UUID NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_platform_store_slugs_slug" ON platform_store_slugs(slug);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_platform_store_slugs_service_store" ON platform_store_slugs(service_key, store_id);`);

    // ============================================================
    // A-7b: v_glycopharm_pharmacies 호환성 뷰
    // ============================================================

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_glycopharm_pharmacies AS
      SELECT
        o.id,
        o.name,
        o.code,
        o.address,
        o.phone,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    // 역순 정리
    await queryRunner.query(`DROP VIEW IF EXISTS v_glycopharm_pharmacies;`);
    await queryRunner.query(`DROP TABLE IF EXISTS glycopharm_pharmacy_extensions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_service_enrollments;`);

    // organizations 확장 컬럼 제거
    await queryRunner.query(`
      ALTER TABLE organizations
        DROP COLUMN IF EXISTS address,
        DROP COLUMN IF EXISTS phone,
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS business_number,
        DROP COLUMN IF EXISTS created_by_user_id,
        DROP COLUMN IF EXISTS storefront_config,
        DROP COLUMN IF EXISTS template_profile,
        DROP COLUMN IF EXISTS storefront_blocks;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organizations_business_number";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organizations_created_by_user_id";`);
  }
}
