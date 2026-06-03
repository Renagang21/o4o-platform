import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1
 *
 * 기존 K-Cosmetics 판매자(=매장 경영자, role=cosmetics:store_owner) 중 store/org context 가 없는 사용자에게
 * 내 매장 context 를 1회 backfill 한다. (role 정규화 20261031000000 의 후속 — role 만으로는 cockpit 이 no-store.)
 *
 * 설계 근거:
 *   - store provisioning(CosmeticsStoreService.ensureStoreContextForOwner) 은 엔티티/AppDataSource 의존이라
 *     migrate.ts(entities:[]) 컨텍스트에서 호출 불가. 또한 전용 entry 는 tsup/Dockerfile 미반영 + console.log 가드로 불가.
 *   - 따라서 createStoreWithOrg 의 SQL 등가물을 migration(raw SQL, 가드 제외, 자동 실행)으로 재현한다.
 *   - 차이: slug 는 NULL (platform slug registry 등록은 생략 — owner cockpit 동작엔 불필요, 공개 slug 라우팅만 보류).
 *
 * 멱등:
 *   - 이미 활성 store membership 보유 → 후보 제외 (재실행 no-op).
 *   - 동일 사업자번호 store 존재 → 신규 생성 대신 해당 store 에 owner 로 link.
 *   - org / org_member / enrollment 는 ON CONFLICT DO NOTHING.
 *   - businessNumber(정규화 10자리) 부재 → skip (store.business_number NOT NULL/UNIQUE).
 *
 * 범위: role_assignments / cosmetics_stores / cosmetics_store_members / organizations / organization_members /
 *       organization_service_enrollments. (role 은 20261031000000 에서 이미 정규화됨 — 본 migration 은 role 미변경.)
 */
export class BackfillKCosmeticsSellerStoreContext20261031000001 implements MigrationInterface {
  name = 'BackfillKCosmeticsSellerStoreContext20261031000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: cosmetics 스키마/테이블 부재 환경(dev)에서는 no-op
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cosmetics' AND table_name = 'cosmetics_stores'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      console.log('[Migration] BackfillKCosmeticsSellerStoreContext: cosmetics.cosmetics_stores not found — no-op');
      return;
    }

    const pre = await queryRunner.query(`
      SELECT COUNT(*)::int AS c
      FROM role_assignments ra
      JOIN service_memberships sm ON sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND sm.status = 'active'
      WHERE ra.is_active = true AND ra.role = 'cosmetics:store_owner'
        AND NOT EXISTS (
          SELECT 1 FROM cosmetics.cosmetics_store_members csm
          WHERE csm.user_id = ra.user_id AND csm.is_active = true
        )
    `);
    console.log(`[Migration] BackfillKCosmeticsSellerStoreContext: candidates (store_owner without store)=${pre[0]?.c ?? 0}`);
    if ((pre[0]?.c ?? 0) === 0) {
      console.log('[Migration] BackfillKCosmeticsSellerStoreContext: no-op (no candidates)');
      return;
    }

    // canonical provisioning 의 SQL 등가물 — createStoreWithOrg 참조
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        v_bn text;
        v_store_name text;
        v_owner_name text;
        v_phone text;
        v_address text;
        v_code text;
        v_org_id uuid;
        v_store_id uuid;
        v_created int := 0;
        v_linked int := 0;
        v_skipped int := 0;
      BEGIN
        FOR rec IN
          SELECT ra.user_id AS user_id, u.name AS uname, u.phone AS uphone, u."businessInfo" AS biz
          FROM role_assignments ra
          JOIN users u ON u.id = ra.user_id
          JOIN service_memberships sm ON sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND sm.status = 'active'
          WHERE ra.is_active = true AND ra.role = 'cosmetics:store_owner'
            AND NOT EXISTS (
              SELECT 1 FROM cosmetics.cosmetics_store_members csm
              WHERE csm.user_id = ra.user_id AND csm.is_active = true
            )
        LOOP
          v_bn := regexp_replace(COALESCE(rec.biz->>'businessNumber',''), '\\D', '', 'g');
          IF length(v_bn) <> 10 THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
          END IF;

          v_store_name := COALESCE(NULLIF(rec.biz->>'businessName',''), NULLIF(trim(rec.uname),''), '내 매장');
          v_owner_name := COALESCE(NULLIF(rec.biz->>'representativeName',''), NULLIF(trim(rec.uname),''), v_store_name);
          v_phone := COALESCE(NULLIF(rec.biz->>'managerPhone',''), rec.uphone);
          v_address := NULLIF(rec.biz->>'businessAddress','');

          -- 동일 사업자번호 store 가 이미 있으면 해당 store 에 link
          SELECT id, organization_id INTO v_store_id, v_org_id
          FROM cosmetics.cosmetics_stores WHERE business_number = v_bn LIMIT 1;

          IF v_store_id IS NOT NULL THEN
            IF v_org_id IS NULL THEN
              SELECT id INTO v_org_id FROM organizations WHERE business_number = v_bn LIMIT 1;
            END IF;
            v_linked := v_linked + 1;
          ELSE
            -- organization 재사용(사업자번호 기준) 또는 신규 생성
            v_code := 'KCOS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
            SELECT id INTO v_org_id FROM organizations WHERE business_number = v_bn LIMIT 1;
            IF v_org_id IS NULL THEN
              v_org_id := gen_random_uuid();
              INSERT INTO organizations
                (id, name, code, type, level, path, "isActive", address, phone, business_number, metadata, "createdAt", "updatedAt")
              VALUES
                (v_org_id, v_store_name, v_code, 'store', 0, '/' || v_code, true, v_address, v_phone, v_bn, '{"serviceKey":"cosmetics"}'::jsonb, NOW(), NOW());
            END IF;
            -- store 생성 (slug NULL — registry 등록 생략)
            v_store_id := gen_random_uuid();
            INSERT INTO cosmetics.cosmetics_stores
              (id, name, code, business_number, owner_name, contact_phone, address, region, status, organization_id, created_at, updated_at)
            VALUES
              (v_store_id, v_store_name, v_code, v_bn, v_owner_name, v_phone, v_address, NULL, 'approved', v_org_id, NOW(), NOW());
            v_created := v_created + 1;
          END IF;

          -- store owner member
          INSERT INTO cosmetics.cosmetics_store_members
            (id, store_id, user_id, role, is_active, created_at, updated_at)
          VALUES
            (gen_random_uuid(), v_store_id, rec.user_id, 'owner', true, NOW(), NOW())
          ON CONFLICT (store_id, user_id) DO NOTHING;

          -- org member + service enrollment (멱등)
          IF v_org_id IS NOT NULL THEN
            INSERT INTO organization_members
              (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
            VALUES
              (gen_random_uuid(), v_org_id, rec.user_id, 'owner', false, NOW(), NOW(), NOW())
            ON CONFLICT (organization_id, user_id) DO NOTHING;

            INSERT INTO organization_service_enrollments
              (id, organization_id, service_code, status, enrolled_at, config, created_at, updated_at)
            VALUES
              (gen_random_uuid(), v_org_id, 'k-cosmetics', 'active', NOW(), '{}'::jsonb, NOW(), NOW())
            ON CONFLICT (organization_id, service_code) DO NOTHING;
          END IF;
        END LOOP;

        RAISE NOTICE '[Migration] BackfillKCosmeticsSellerStoreContext: created=%, linked=%, skipped_no_bn=%', v_created, v_linked, v_skipped;
      END $$;
    `);

    const post = await queryRunner.query(`
      SELECT COUNT(*)::int AS c
      FROM role_assignments ra
      JOIN service_memberships sm ON sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND sm.status = 'active'
      WHERE ra.is_active = true AND ra.role = 'cosmetics:store_owner'
        AND NOT EXISTS (
          SELECT 1 FROM cosmetics.cosmetics_store_members csm
          WHERE csm.user_id = ra.user_id AND csm.is_active = true
        )
    `);
    console.log(`[Migration] BackfillKCosmeticsSellerStoreContext: DONE — remaining_without_store=${post[0]?.c ?? 0} (잔여는 businessNumber 부재 등으로 skip된 건)`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op: backfill 이 만든 store/org 를 안전하게 식별·삭제할 metadata 가 없고,
    // 임의 삭제 시 운영 가드 정합을 해칠 수 있어 명시적 no-op (BackfillCosmeticsServiceEnrollments 와 동일 정책).
    console.log('[Migration] BackfillKCosmeticsSellerStoreContext down: no-op');
  }
}
