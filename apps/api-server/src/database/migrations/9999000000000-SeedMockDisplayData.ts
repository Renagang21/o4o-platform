import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed Mock Display Data Migration
 *
 * 목적: 프론트엔드에서 사용하는 Mock 데이터를 실제 DB에 Seed 데이터로 등록
 *
 * **삭제 마커 정책**:
 * - 모든 seed ID는 'seed0000-' prefix로 시작
 * - 삭제 시: DELETE FROM table WHERE id::text LIKE 'seed0000-%'
 *
 * 대상 서비스:
 * 1. KPA-Society (Yaksa): 공지사항, 교육, 공동구매
 * 2. K-Cosmetics: 매장 정보
 * 3. Glycopharm: 교육 콘텐츠, 스마트 디스플레이
 */
export class SeedMockDisplayData9999000000000 implements MigrationInterface {
  name = 'SeedMockDisplayData9999000000000';

  // ============================================================================
  // Seed ID 접두어 - 삭제 시 식별자
  // ============================================================================
  private readonly SEED_PREFIX = 'seed0000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[Seed] Starting mock display data seeding...');

    // ============================================================================
    // 1. KPA-Society (Yaksa) - 뉴스 카테고리 추가 (지부소식, 전체소식)
    // ============================================================================
    await queryRunner.query(`
      INSERT INTO "yaksa_categories" ("id", "name", "slug", "description", "status", "sort_order")
      VALUES
        ('${this.SEED_PREFIX}-0001-0001-0001-000000000001', '지부/분회 소식', 'branch-news', '지역 지부 및 분회 소식', 'active', 10),
        ('${this.SEED_PREFIX}-0001-0001-0001-000000000002', '전체 약사회 소식', 'kpa-news', '전국 약사회 공식 소식', 'active', 11),
        ('${this.SEED_PREFIX}-0001-0001-0001-000000000003', '추천 교육', 'courses', '연수 및 교육 정보', 'active', 12),
        ('${this.SEED_PREFIX}-0001-0001-0001-000000000004', '공동구매', 'groupbuy', '공동구매 정보', 'active', 13)
      ON CONFLICT (slug) DO NOTHING
    `);

    // KPA-Society - 지부/분회 소식 (mockOrgNews)
    await queryRunner.query(`
      INSERT INTO "yaksa_posts" (
        "id", "category_id", "title", "content", "status", "is_pinned", "is_notice",
        "view_count", "created_by_user_name", "published_at"
      )
      VALUES
        (
          '${this.SEED_PREFIX}-0002-0001-0001-000000000001',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000001',
          '강남분회 12월 정기모임 안내',
          '<p>강남분회 12월 정기모임을 안내드립니다.</p><p>일시: 2024년 12월 18일</p><p>장소: 강남역 인근 회의실</p>',
          'published',
          false,
          false,
          45,
          '강남분회장',
          '2024-12-18'
        ),
        (
          '${this.SEED_PREFIX}-0002-0001-0001-000000000002',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000001',
          '서울지부 송년회 일정 공지',
          '<p>서울지부 송년회 일정을 공지드립니다.</p><p>많은 참석 부탁드립니다.</p>',
          'published',
          false,
          false,
          38,
          '서울지부장',
          '2024-12-15'
        ),
        (
          '${this.SEED_PREFIX}-0002-0001-0001-000000000003',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000001',
          '분회장 인사말씀',
          '<p>회원 여러분께 인사드립니다.</p>',
          'published',
          false,
          false,
          22,
          '분회장',
          '2024-12-10'
        )
      ON CONFLICT (id) DO NOTHING
    `);

    // KPA-Society - 전체 약사회 소식 (mockKpaNews)
    await queryRunner.query(`
      INSERT INTO "yaksa_posts" (
        "id", "category_id", "title", "content", "status", "is_pinned", "is_notice",
        "view_count", "created_by_user_name", "published_at"
      )
      VALUES
        (
          '${this.SEED_PREFIX}-0002-0002-0001-000000000001',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000002',
          '2025년 약사 연수교육 일정 발표',
          '<p>2025년 약사 연수교육 일정을 발표합니다.</p><p>상세 일정은 첨부파일을 확인해 주세요.</p>',
          'published',
          true,
          true,
          156,
          '대한약사회',
          '2024-12-20'
        ),
        (
          '${this.SEED_PREFIX}-0002-0002-0001-000000000002',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000002',
          '의약품 안전관리 지침 개정 안내',
          '<p>의약품 안전관리 지침이 개정되었습니다.</p><p>변경 사항을 확인해 주세요.</p>',
          'published',
          false,
          true,
          89,
          '대한약사회',
          '2024-12-18'
        ),
        (
          '${this.SEED_PREFIX}-0002-0002-0001-000000000003',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000002',
          '전국 약사회 정기총회 결과 보고',
          '<p>전국 약사회 정기총회 결과를 보고드립니다.</p>',
          'published',
          false,
          false,
          67,
          '대한약사회',
          '2024-12-15'
        )
      ON CONFLICT (id) DO NOTHING
    `);

    // KPA-Society - 추천 교육 (mockCourses)
    await queryRunner.query(`
      INSERT INTO "yaksa_posts" (
        "id", "category_id", "title", "content", "status", "is_pinned", "is_notice",
        "view_count", "created_by_user_name", "published_at"
      )
      VALUES
        (
          '${this.SEED_PREFIX}-0002-0003-0001-000000000001',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000003',
          '2024 필수 연수교육',
          '<p>2024년 필수 연수교육 안내입니다.</p><p>교육시간: 8시간</p><p>이수 필수</p>',
          'published',
          true,
          true,
          234,
          '교육위원회',
          '2024-12-01'
        ),
        (
          '${this.SEED_PREFIX}-0002-0003-0001-000000000002',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000003',
          '복약지도 실무과정',
          '<p>복약지도 실무과정 안내입니다.</p><p>교육시간: 4시간</p>',
          'published',
          false,
          false,
          112,
          '교육위원회',
          '2024-11-15'
        ),
        (
          '${this.SEED_PREFIX}-0002-0003-0001-000000000003',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000003',
          '약국 경영 세미나',
          '<p>약국 경영 세미나 안내입니다.</p><p>교육시간: 2시간</p>',
          'published',
          false,
          false,
          78,
          '교육위원회',
          '2024-11-10'
        )
      ON CONFLICT (id) DO NOTHING
    `);

    // KPA-Society - 공동구매 (mockGroupbuys)
    await queryRunner.query(`
      INSERT INTO "yaksa_posts" (
        "id", "category_id", "title", "content", "status", "is_pinned", "is_notice",
        "view_count", "created_by_user_name", "published_at"
      )
      VALUES
        (
          '${this.SEED_PREFIX}-0002-0004-0001-000000000001',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000004',
          '겨울철 건강식품 세트',
          '<p>공동구매: 겨울철 건강식품 세트</p><p>가격: 45,000원</p><p>마감: 12/25</p><p>달성률: 78%</p>',
          'published',
          false,
          false,
          156,
          '공동구매위원회',
          '2024-12-10'
        ),
        (
          '${this.SEED_PREFIX}-0002-0004-0001-000000000002',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000004',
          '약국용 소모품 패키지',
          '<p>공동구매: 약국용 소모품 패키지</p><p>가격: 120,000원</p><p>마감: 12/30</p><p>달성률: 45%</p>',
          'published',
          false,
          false,
          89,
          '공동구매위원회',
          '2024-12-12'
        ),
        (
          '${this.SEED_PREFIX}-0002-0004-0001-000000000003',
          '${this.SEED_PREFIX}-0001-0001-0001-000000000004',
          '2025년 달력/다이어리',
          '<p>공동구매: 2025년 달력/다이어리</p><p>가격: 15,000원</p><p>마감: 12/20</p><p>달성률: 92%</p>',
          'published',
          true,
          false,
          245,
          '공동구매위원회',
          '2024-12-05'
        )
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('[Seed] KPA-Society (Yaksa) data seeded');

    // ============================================================================
    // 2. Glycopharm - 교육 콘텐츠 테이블이 없으므로 posts 테이블 확장 또는 별도 처리
    // 현재 glycopharm_products에 교육 카테고리로 등록
    // ============================================================================

    // Glycopharm 교육 콘텐츠를 products 테이블에 'education' 카테고리로 추가
    await queryRunner.query(`
      INSERT INTO "glycopharm_products" (
        "id", "pharmacy_id", "name", "sku", "category", "description",
        "price", "sale_price", "stock_quantity", "manufacturer", "status", "is_featured"
      )
      VALUES
        (
          '${this.SEED_PREFIX}-0003-0001-0001-000000000001',
          NULL,
          'CGM 완벽 가이드 2024',
          'EDU-CGM-GUIDE-2024',
          'education',
          '연속혈당측정기의 원리부터 실제 적용까지 상세하게 알아봅니다. 교육시간: 45분',
          0,
          NULL,
          999,
          'Glycopharm Education',
          'active',
          true
        ),
        (
          '${this.SEED_PREFIX}-0003-0001-0001-000000000002',
          NULL,
          '당뇨 환자 상담 실전 매뉴얼',
          'EDU-DM-CONSULT-2024',
          'education',
          '약국에서 당뇨 환자 상담 시 활용할 수 있는 실전 매뉴얼입니다. PDF 32페이지',
          0,
          NULL,
          999,
          'Glycopharm Education',
          'active',
          true
        ),
        (
          '${this.SEED_PREFIX}-0003-0001-0001-000000000003',
          NULL,
          '혈당 관리와 영양 웨비나',
          'EDU-NUTRITION-WEBINAR',
          'education',
          '당뇨 환자의 영양 관리에 대한 전문가 웨비나입니다. 예정: 2024-01-20 14:00',
          0,
          NULL,
          999,
          'Glycopharm Education',
          'active',
          false
        ),
        (
          '${this.SEED_PREFIX}-0003-0001-0001-000000000004',
          NULL,
          '인슐린 펜 사용법 교육',
          'EDU-INSULIN-PEN-2024',
          'education',
          '다양한 인슐린 펜의 올바른 사용법을 영상으로 배워봅니다. 교육시간: 25분',
          0,
          NULL,
          999,
          'Glycopharm Education',
          'active',
          false
        ),
        (
          '${this.SEED_PREFIX}-0003-0001-0001-000000000005',
          NULL,
          '약국 혈당관리 서비스 운영 가이드',
          'EDU-PHARMACY-SERVICE-GUIDE',
          'education',
          '약국에서 혈당관리 서비스를 운영하기 위한 종합 가이드입니다. 읽기시간: 15분',
          0,
          NULL,
          999,
          'Glycopharm Education',
          'active',
          false
        )
      ON CONFLICT (sku) DO NOTHING
    `);

    console.log('[Seed] Glycopharm education content seeded');

    // ============================================================================
    // 3. K-Cosmetics - 매장 정보
    // cosmetics_stores 테이블 확인 필요, 없으면 생성
    // ============================================================================

    // Check if cosmetics_stores table exists
    const storesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'cosmetics_stores'
      )
    `);

    if (!storesTableExists[0].exists) {
      // Create cosmetics_stores table if not exists
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "cosmetics_stores" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "slug" varchar(255) NOT NULL UNIQUE,
          "name" varchar(255) NOT NULL,
          "name_en" varchar(255),
          "location" varchar(255) NOT NULL,
          "location_en" varchar(255),
          "address" text,
          "address_en" text,
          "is_verified" boolean NOT NULL DEFAULT false,
          "service_tags" jsonb DEFAULT '[]',
          "status" varchar(20) NOT NULL DEFAULT 'active',
          "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('[Seed] cosmetics_stores table created');
    }

    // Insert K-Cosmetics stores (sampleStores)
    await queryRunner.query(`
      INSERT INTO "cosmetics_stores" (
        "id", "slug", "name", "name_en", "location", "location_en",
        "address", "address_en", "is_verified", "service_tags", "status"
      )
      VALUES
        (
          '${this.SEED_PREFIX}-0004-0001-0001-000000000001',
          'beauty-lab-gangnam',
          '뷰티랩 강남점',
          'Beauty Lab Gangnam',
          '서울 강남구',
          'Gangnam, Seoul',
          '서울시 강남구 테헤란로 123',
          '123 Teheran-ro, Gangnam-gu, Seoul',
          true,
          '["english_ok", "try_on", "group_friendly"]',
          'active'
        ),
        (
          '${this.SEED_PREFIX}-0004-0001-0001-000000000002',
          'kbeauty-store-myeongdong',
          'K뷰티스토어 명동점',
          'K-Beauty Store Myeongdong',
          '서울 중구',
          'Myeongdong, Seoul',
          '서울시 중구 명동길 45',
          '45 Myeongdong-gil, Jung-gu, Seoul',
          true,
          '["english_ok", "group_friendly", "japanese_ok", "chinese_ok"]',
          'active'
        ),
        (
          '${this.SEED_PREFIX}-0004-0001-0001-000000000003',
          'cosme-house-busan',
          '코스메하우스 부산점',
          'Cosme House Busan',
          '부산 해운대구',
          'Haeundae, Busan',
          '부산시 해운대구 해운대로 567',
          '567 Haeundae-ro, Haeundae-gu, Busan',
          true,
          '["try_on", "guide_partner", "english_ok"]',
          'active'
        ),
        (
          '${this.SEED_PREFIX}-0004-0001-0001-000000000004',
          'jeju-beauty-jeju',
          '제주뷰티 본점',
          'Jeju Beauty Main Store',
          '제주 제주시',
          'Jeju City, Jeju',
          '제주시 연동 789',
          '789 Yeondong, Jeju City, Jeju',
          true,
          '["english_ok", "chinese_ok", "group_friendly", "try_on"]',
          'active'
        ),
        (
          '${this.SEED_PREFIX}-0004-0001-0001-000000000005',
          'incheon-duty-free',
          '인천공항 뷰티존',
          'Incheon Airport Beauty Zone',
          '인천 중구',
          'Incheon Airport',
          '인천시 중구 공항로 272',
          '272 Gonghang-ro, Jung-gu, Incheon',
          true,
          '["english_ok", "japanese_ok", "chinese_ok", "group_friendly"]',
          'active'
        ),
        (
          '${this.SEED_PREFIX}-0004-0001-0001-000000000006',
          'daegu-skin-care',
          '대구스킨케어 본점',
          'Daegu Skincare Main',
          '대구 중구',
          'Jung-gu, Daegu',
          '대구시 중구 동성로 234',
          '234 Dongseong-ro, Jung-gu, Daegu',
          true,
          '["try_on", "english_ok"]',
          'active'
        )
      ON CONFLICT (slug) DO NOTHING
    `);

    console.log('[Seed] K-Cosmetics stores seeded');

    // ============================================================================
    // 4. Neture - B2B 조달 카테고리 (이미 neture.neture_products에 있음)
    // mockCategories는 UI용이므로 별도 테이블 필요 시 추가
    // ============================================================================

    console.log('[Seed] Mock display data seeding completed!');
    console.log('[Seed] To delete all seed data, run: DELETE FROM table WHERE id::text LIKE \'seed0000-%\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[Seed] Removing mock display data...');

    // Delete all seed data by prefix
    const seedPrefix = this.SEED_PREFIX;

    // K-Cosmetics stores
    await queryRunner.query(`
      DELETE FROM "cosmetics_stores" WHERE id::text LIKE '${seedPrefix}-%'
    `);

    // Glycopharm education products
    await queryRunner.query(`
      DELETE FROM "glycopharm_products" WHERE id::text LIKE '${seedPrefix}-%'
    `);

    // Yaksa posts (must delete before categories due to FK)
    await queryRunner.query(`
      DELETE FROM "yaksa_posts" WHERE id::text LIKE '${seedPrefix}-%'
    `);

    // Yaksa categories
    await queryRunner.query(`
      DELETE FROM "yaksa_categories" WHERE id::text LIKE '${seedPrefix}-%'
    `);

    console.log('[Seed] Mock display data removed');
  }
}
