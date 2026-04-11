import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-PRODUCT-APPROVAL-LISTING-UPSERT-FIX-V1
 *
 * kpa_organizations에 존재하지만 organizations에 누락된 레코드를 동기화한다.
 * Phase A (20260221000000) 이후 추가된 KPA 조직이나 동기화가 누락된 조직을 보충.
 *
 * 이 동기화가 없으면 organization_product_listings의 FK_listing_organization 제약으로
 * KPA 약국의 상품 listing 생성이 실패한다.
 */
export class BackfillKpaOrgsToOrganizations20260411100000 implements MigrationInterface {
  name = 'BackfillKpaOrgsToOrganizations20260411100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 누락된 조직 확인
    const missing = await queryRunner.query(`
      SELECT k.id, k.name, k.type
      FROM kpa_organizations k
      LEFT JOIN organizations o ON o.id = k.id
      WHERE o.id IS NULL
    `);
    console.log(`[BackfillKpaOrgs] Missing orgs in organizations table: ${missing.length}`);

    if (missing.length === 0) {
      console.log('[BackfillKpaOrgs] No missing orgs. Skipping.');
      return;
    }

    // 2. 최상위 조직 먼저 (parent_id IS NULL)
    const topResult = await queryRunner.query(`
      INSERT INTO organizations (
        id, name, code, type, "parentId", level, path,
        "isActive", "childrenCount", metadata,
        address, phone, description, storefront_config,
        "createdAt", "updatedAt"
      )
      SELECT
        k.id,
        k.name,
        'kpa-' || REPLACE(k.id::text, '-', ''),
        k.type,
        k.parent_id,
        0,
        '/' || LOWER(REGEXP_REPLACE(k.name, '[^a-zA-Z0-9가-힣]', '-', 'g')),
        COALESCE(k.is_active, true),
        (SELECT COUNT(*) FROM kpa_organizations c WHERE c.parent_id = k.id),
        '{}'::jsonb,
        k.address,
        k.phone,
        k.description,
        COALESCE(k.storefront_config, '{}'::jsonb),
        COALESCE(k.created_at, NOW()),
        COALESCE(k.updated_at, NOW())
      FROM kpa_organizations k
      LEFT JOIN organizations o ON o.id = k.id
      WHERE o.id IS NULL AND k.parent_id IS NULL
      ON CONFLICT (id) DO NOTHING
    `);
    const topCount = Array.isArray(topResult) ? topResult.length : (topResult as any)?.rowCount ?? 0;
    console.log(`[BackfillKpaOrgs] Synced top-level orgs: ${topCount}`);

    // 3. 1단계 하위 (branch — parent exists in organizations)
    const branchResult = await queryRunner.query(`
      INSERT INTO organizations (
        id, name, code, type, "parentId", level, path,
        "isActive", "childrenCount", metadata,
        address, phone, description, storefront_config,
        "createdAt", "updatedAt"
      )
      SELECT
        k.id,
        k.name,
        'kpa-' || REPLACE(k.id::text, '-', ''),
        k.type,
        k.parent_id,
        1,
        (SELECT o_p.path FROM organizations o_p WHERE o_p.id = k.parent_id) || '/' || LOWER(REGEXP_REPLACE(k.name, '[^a-zA-Z0-9가-힣]', '-', 'g')),
        COALESCE(k.is_active, true),
        (SELECT COUNT(*) FROM kpa_organizations c WHERE c.parent_id = k.id),
        '{}'::jsonb,
        k.address,
        k.phone,
        k.description,
        COALESCE(k.storefront_config, '{}'::jsonb),
        COALESCE(k.created_at, NOW()),
        COALESCE(k.updated_at, NOW())
      FROM kpa_organizations k
      LEFT JOIN organizations o ON o.id = k.id
      WHERE o.id IS NULL
        AND k.parent_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM organizations p WHERE p.id = k.parent_id)
      ON CONFLICT (id) DO NOTHING
    `);
    const branchCount = Array.isArray(branchResult) ? branchResult.length : (branchResult as any)?.rowCount ?? 0;
    console.log(`[BackfillKpaOrgs] Synced branch orgs: ${branchCount}`);

    // 4. 2단계 하위 (group — parent was just inserted)
    const groupResult = await queryRunner.query(`
      INSERT INTO organizations (
        id, name, code, type, "parentId", level, path,
        "isActive", "childrenCount", metadata,
        address, phone, description, storefront_config,
        "createdAt", "updatedAt"
      )
      SELECT
        k.id,
        k.name,
        'kpa-' || REPLACE(k.id::text, '-', ''),
        k.type,
        k.parent_id,
        2,
        COALESCE(
          (SELECT o_p.path FROM organizations o_p WHERE o_p.id = k.parent_id),
          '/'
        ) || '/' || LOWER(REGEXP_REPLACE(k.name, '[^a-zA-Z0-9가-힣]', '-', 'g')),
        COALESCE(k.is_active, true),
        0,
        '{}'::jsonb,
        k.address,
        k.phone,
        k.description,
        COALESCE(k.storefront_config, '{}'::jsonb),
        COALESCE(k.created_at, NOW()),
        COALESCE(k.updated_at, NOW())
      FROM kpa_organizations k
      LEFT JOIN organizations o ON o.id = k.id
      WHERE o.id IS NULL
        AND k.parent_id IS NOT NULL
      ON CONFLICT (id) DO NOTHING
    `);
    const groupCount = Array.isArray(groupResult) ? groupResult.length : (groupResult as any)?.rowCount ?? 0;
    console.log(`[BackfillKpaOrgs] Synced group orgs: ${groupCount}`);

    // 5. 최종 확인
    const remaining = await queryRunner.query(`
      SELECT k.id, k.name
      FROM kpa_organizations k
      LEFT JOIN organizations o ON o.id = k.id
      WHERE o.id IS NULL
    `);
    console.log(`[BackfillKpaOrgs] Remaining unsynced: ${remaining.length}`);
    if (remaining.length > 0) {
      for (const r of remaining.slice(0, 5)) {
        console.log(`  - ${r.id} ${r.name}`);
      }
    }

    // 6. code 중복 해결 (ON CONFLICT (code))
    // organizations.code에 UNIQUE 제약이 있으므로, 동일 code가 이미 존재하면 실패할 수 있음.
    // 'kpa-{uuid_no_dash}' 형식은 UUID 기반이므로 충돌 가능성 극히 낮음.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 이 마이그레이션은 누락 데이터 보충이므로 down은 no-op
    console.log('[BackfillKpaOrgs] down: no-op (data backfill migration)');
  }
}
