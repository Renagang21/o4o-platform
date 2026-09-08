import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1
 *
 * GlycoPharm 서비스를 플랫폼에서 완전히 삭제한다.
 *
 * 선행 조건 (이 마이그레이션이 도는 시점에 이미 참이어야 한다):
 *   - `/api/v1/glycopharm/*` mount 제거 · routes/glycopharm 삭제 (코드 배포 완료)
 *   - entity registry 에서 Glycopharm* 등재 제거 (database/entities.ts)
 *   - deploy-web-services.yml 의 deploy-glycopharm job 제거 (재생성 경로 차단)
 *
 * 보존 대상 (삭제하지 않는다):
 *   - 공용 `users` — 계정 자체는 GlycoPharm 소유가 아니다.
 *   - bare role `pharmacy` · `customer` · `supplier` · `partner`
 *     → GlycoPharm 경계 안에 잘못 등록돼 있던 공용 역할이다. Neture 공급자 등
 *       타 서비스가 실제 보유 중이므로 **삭제하지 않고 service_key 만 재귀속**한다.
 *   - `store_blog_posts` · `store_blog_settings` — 공통 Store 도메인 테이블
 *     (entity 위치만 modules/store/entities 로 이전했다. 스키마·데이터 불변).
 *
 * 삭제 범위 (프로덕션 실측 2026-09-08 기준):
 *   전용 테이블 13 + view 1 (총 9행)
 *   공유 테이블의 service_key='glycopharm' 행 (총 305행)
 *   glycopharm:* 접두 role 및 그 role_assignments
 *
 * 멱등: 모든 문 IF EXISTS / 조건부. 재실행해도 안전하다.
 * 되돌리기: down() 은 스키마를 복원하지 않는다 (서비스 폐지 — 복구 대상 아님).
 */
export class DropGlycopharmService20270326000000 implements MigrationInterface {
  name = 'DropGlycopharmService20270326000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1) 공용 역할 재귀속 (삭제 금지 — 타 서비스가 보유 중) ──────────────
    //    roles.service_key='glycopharm' 인 bare role 을 서비스 중립 축으로 옮긴다.
    await queryRunner.query(`
      UPDATE roles SET service_key = 'neture'
       WHERE service_key = 'glycopharm' AND name IN ('supplier', 'partner')
    `);
    await queryRunner.query(`
      UPDATE roles SET service_key = 'platform'
       WHERE service_key = 'glycopharm' AND name IN ('pharmacy', 'customer')
    `);

    // ── 2) glycopharm:* 접두 role assignment → role → 나머지 role row ──────
    await queryRunner.query(`
      DELETE FROM role_assignments WHERE role LIKE 'glycopharm:%'
    `);
    await queryRunner.query(`
      DELETE FROM roles WHERE service_key = 'glycopharm'
    `);

    // ── 3) 공유 테이블의 glycopharm 축 행 삭제 ────────────────────────────
    //    실측으로 확인된 소유 테이블만 명시한다 (와일드카드 삭제 금지).
    const scopedDeletes: Array<[string, string]> = [
      ['action_logs', 'service_key'],
      ['cms_content_slots', '"serviceKey"'],
      ['cms_contents', '"serviceKey"'],
      ['contact_inquiries', 'service_key'],
      ['guide_contents', 'service_key'],
      ['media_assets', 'service_key'],
      ['notifications', '"serviceKey"'],
      ['offer_service_approvals', 'service_key'],
      ['offer_service_prices', 'service_key'],
      ['organization_product_listings', 'service_key'],
      ['password_reset_tokens', 'service_key'],
      ['product_approvals', 'service_key'],
      ['service_audience_policies', 'service_key'],
      ['service_contact_settings', 'service_key'],
      ['service_credentials', 'service_key'],
      ['service_memberships', 'service_key'],
      ['store_asset_derivations', 'service_key'],
      ['store_blog_posts', 'service_key'],
      ['store_blog_settings', 'service_key'],
      ['store_cart_items', 'service_key'],
      ['store_pops', 'service_key'],
      ['store_tablet_screen_sets', 'service_key'],
      ['store_videos', 'service_key'],
      ['service_products', 'service_key'],
      ['service_legal_profiles', 'service_key'],
      ['service_policy_documents', 'service_key'],
      ['service_point_budgets', 'service_key'],
      ['service_point_budget_transactions', 'service_key'],
      ['operator_action_dismissals', 'service_key'],
      ['operator_qr_templates', 'service_key'],
      ['qualification_requests', 'service_key'],
      ['product_candidates', 'service_key'],
      ['signage_forced_content', 'service_key'],
      ['signage_media', '"serviceKey"'],
      ['signage_playlists', '"serviceKey"'],
      ['signage_schedules', '"serviceKey"'],
      ['signage_templates', '"serviceKey"'],
      ['signage_content_blocks', '"serviceKey"'],
      ['signage_layout_presets', '"serviceKey"'],
      ['channels', '"serviceKey"'],
      ['content_templates', 'service_key'],
      ['lms_courses', 'service_key'],
      ['lms_surveys', 'service_key'],
      ['platform_store_slugs', 'service_key'],
      ['platform_store_slug_history', 'service_key'],
      ['platform_store_policies', 'service_key'],
      ['platform_store_payment_configs', 'service_key'],
      ['store_paid_feature_entitlements', 'service_key'],
      ['store_multilingual_product_content_groups', 'service_key'],
      ['operator_multilingual_product_content_groups', 'service_key'],
    ];
    for (const [table, column] of scopedDeletes) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema = 'public' AND table_name = '${table}') THEN
            EXECUTE 'DELETE FROM public."${table}" WHERE ${column} = ''glycopharm''';
          END IF;
        END $$;
      `);
    }

    // event-offer 축 키도 함께 제거한다 (glycopharm-event-offer).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'offer_service_approvals') THEN
          EXECUTE 'DELETE FROM public.offer_service_approvals WHERE service_key = ''glycopharm-event-offer''';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'offer_service_prices') THEN
          EXECUTE 'DELETE FROM public.offer_service_prices WHERE service_key = ''glycopharm-event-offer''';
        END IF;
      END $$;
    `);

    // ── 4) 조직 서비스 등록 해제 ─────────────────────────────────────────
    await queryRunner.query(`
      DELETE FROM organization_service_enrollments WHERE service_code = 'glycopharm'
    `);

    // ── 5) 서비스 카탈로그 row ───────────────────────────────────────────
    await queryRunner.query(`
      DELETE FROM platform_services WHERE code = 'glycopharm'
    `);

    // ── 6) 전용 view → 전용 테이블 (FK 역순) ─────────────────────────────
    await queryRunner.query(`DROP VIEW IF EXISTS v_glycopharm_pharmacies`);

    const dropOrder = [
      'glycopharm_request_action_logs', // → glycopharm_customer_requests
      'glycopharm_customer_requests',
      'glycopharm_featured_products', // → glycopharm_products
      'glycopharm_product_logs', // → glycopharm_products
      'glycopharm_products',
      'glycopharm_billing_invoices',
      'glycopharm_events',
      'glycopharm_contents',
      'glycopharm_applications',
      'glycopharm_members',
      'glycopharm_pharmacy_extensions',
      'glycopharm_pharmacies',
      'glycopharm_forum_category_requests',
    ];
    for (const table of dropOrder) {
      await queryRunner.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
    }
  }

  public async down(): Promise<void> {
    // 서비스 폐지 마이그레이션이다. 스키마·데이터를 복원하지 않는다.
    // (복구가 필요하면 Cloud SQL PITR/백업으로 되돌린다.)
  }
}
