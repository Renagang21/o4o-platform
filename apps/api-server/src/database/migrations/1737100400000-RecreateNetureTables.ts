import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * WO-NETURE-SMOKE-STABILIZATION-V1
 *
 * Issue: CreateNetureTables1736950000000 was marked as executed in typeorm_migrations
 * but tables were never actually created, causing "relation does not exist" errors.
 *
 * Solution: Create tables with fresh migration timestamp.
 */
export class RecreateNetureTables1737100400000 implements MigrationInterface {
  name = 'RecreateNetureTables1737100400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // SAFETY: Check if tables already exist before creating
    // ============================================================================
    const suppliersExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_suppliers'
      );
    `);

    if (suppliersExist[0]?.exists) {
      console.log('[RecreateNetureTables] Tables already exist, skipping creation');
      return;
    }

    console.log('[RecreateNetureTables] Creating Neture tables...');

    // ============================================================================
    // 1. Create ENUM types for PostgreSQL
    // ============================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_supplier_status_enum" AS ENUM ('ACTIVE', 'INACTIVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_partnership_status_enum" AS ENUM ('OPEN', 'MATCHED', 'CLOSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // ============================================================================
    // 2. Create neture_suppliers table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_suppliers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'slug',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'logo_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'short_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'pricing_policy',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'moq',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'shipping_standard',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shipping_island',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shipping_mountain',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_website',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_kakao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'neture_supplier_status_enum',
            default: "'ACTIVE'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    console.log('[RecreateNetureTables] Created neture_suppliers');

    // ============================================================================
    // 3. Create neture_supplier_products table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_supplier_products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'supplier_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add FK: neture_supplier_products.supplier_id -> neture_suppliers.id
    await queryRunner.createForeignKey(
      'neture_supplier_products',
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'neture_suppliers',
        onDelete: 'CASCADE',
      }),
    );

    console.log('[RecreateNetureTables] Created neture_supplier_products');

    // ============================================================================
    // 4. Create neture_partnership_requests table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_partnership_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'seller_id',
            type: 'varchar',
          },
          {
            name: 'seller_name',
            type: 'varchar',
          },
          {
            name: 'seller_service_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'seller_store_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'product_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'period_start',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'period_end',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'revenue_structure',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'neture_partnership_status_enum',
            default: "'OPEN'",
          },
          {
            name: 'promotion_sns',
            type: 'boolean',
            default: false,
          },
          {
            name: 'promotion_content',
            type: 'boolean',
            default: false,
          },
          {
            name: 'promotion_banner',
            type: 'boolean',
            default: false,
          },
          {
            name: 'promotion_other',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_kakao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'matched_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    console.log('[RecreateNetureTables] Created neture_partnership_requests');

    // ============================================================================
    // 5. Create neture_partnership_products table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_partnership_products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'partnership_request_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add FK: neture_partnership_products.partnership_request_id -> neture_partnership_requests.id
    await queryRunner.createForeignKey(
      'neture_partnership_products',
      new TableForeignKey({
        columnNames: ['partnership_request_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'neture_partnership_requests',
        onDelete: 'CASCADE',
      }),
    );

    console.log('[RecreateNetureTables] Created neture_partnership_products');

    // ============================================================================
    // 6. Create indexes for performance
    // ============================================================================
    await queryRunner.createIndex(
      'neture_suppliers',
      new TableIndex({
        name: 'IDX_neture_suppliers_status_v2',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'neture_suppliers',
      new TableIndex({
        name: 'IDX_neture_suppliers_category_v2',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'neture_supplier_products',
      new TableIndex({
        name: 'IDX_neture_supplier_products_supplier_id_v2',
        columnNames: ['supplier_id'],
      }),
    );

    await queryRunner.createIndex(
      'neture_partnership_requests',
      new TableIndex({
        name: 'IDX_neture_partnership_requests_status_v2',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'neture_partnership_products',
      new TableIndex({
        name: 'IDX_neture_partnership_products_request_id_v2',
        columnNames: ['partnership_request_id'],
      }),
    );

    console.log('[RecreateNetureTables] Created indexes');

    // ============================================================================
    // 7. Seed data (same as SeedNetureData migration)
    // ============================================================================
    console.log('[RecreateNetureTables] Seeding Neture data...');

    // Seed Suppliers
    await queryRunner.query(`
      INSERT INTO neture_suppliers (id, slug, name, logo_url, category, short_description, description, pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain, contact_email, contact_phone, contact_website, status)
      VALUES
        (gen_random_uuid(), 'fresh-farm', '청정농원', NULL, '식품/농산물', '제주 청정 지역의 유기농 농산물 공급', '제주도 청정 지역에서 재배한 100% 유기농 농산물을 공급합니다. GAP 인증을 받은 농장에서 친환경 재배 방식으로 생산됩니다.', '도매가 기준 소비자가 대비 40% 할인', '박스당 10kg 이상', '기본 배송비 3,000원 (50,000원 이상 무료)', '도서산간 추가 5,000원', '산간지역 추가 3,000원', 'fresh@farm.kr', '064-123-4567', 'https://freshfarm.kr', 'ACTIVE'),
        (gen_random_uuid(), 'beauty-lab', '뷰티랩코리아', NULL, '화장품/뷰티', '자연 유래 성분 기반 프리미엄 화장품', 'K-뷰티 트렌드를 이끄는 자연 유래 성분 기반 화장품을 생산합니다. 비건 인증, 동물실험 반대 정책을 준수합니다.', '권장소비자가 대비 50% 공급', '품목당 100개 이상', '기본 배송비 무료 (30만원 이상 주문 시)', '도서산간 추가 3,000원', 'N/A', 'biz@beautylab.kr', '02-987-6543', 'https://beautylab.kr', 'ACTIVE'),
        (gen_random_uuid(), 'health-plus', '헬스플러스', NULL, '건강기능식품', '과학적으로 검증된 건강기능식품 전문', 'KFDA 인증을 받은 건강기능식품을 제조/공급합니다. 연구개발 센터를 운영하며 품질 관리에 최선을 다합니다.', '출고가 기준 정가의 45% 할인', '품목당 50박스 이상', '기본 배송비 무료', '도서산간 배송 불가', 'N/A', 'supply@healthplus.kr', '031-456-7890', 'https://healthplus.kr', 'ACTIVE')
    `);

    // Get supplier IDs for products
    const suppliers = await queryRunner.query(`
      SELECT id, slug FROM neture_suppliers ORDER BY created_at
    `);

    // Seed Supplier Products
    for (const supplier of suppliers) {
      if (supplier.slug === 'fresh-farm') {
        await queryRunner.query(`
          INSERT INTO neture_supplier_products (id, supplier_id, name, category, description)
          VALUES
            (gen_random_uuid(), '${supplier.id}', '유기농 감귤 10kg', '과일', '제주 청정 지역 유기농 감귤'),
            (gen_random_uuid(), '${supplier.id}', '친환경 당근 5kg', '채소', '무농약 재배 당근'),
            (gen_random_uuid(), '${supplier.id}', '제주 흑돼지 선물세트', '정육', '제주 흑돼지 프리미엄 선물세트')
        `);
      } else if (supplier.slug === 'beauty-lab') {
        await queryRunner.query(`
          INSERT INTO neture_supplier_products (id, supplier_id, name, category, description)
          VALUES
            (gen_random_uuid(), '${supplier.id}', '수분 에센스 100ml', '스킨케어', '히알루론산 고농축 수분 에센스'),
            (gen_random_uuid(), '${supplier.id}', '비건 립스틱 세트', '메이크업', '자연 유래 비건 립스틱 5종 세트'),
            (gen_random_uuid(), '${supplier.id}', '진정 크림 50ml', '스킨케어', '센텔라 추출물 진정 크림')
        `);
      } else if (supplier.slug === 'health-plus') {
        await queryRunner.query(`
          INSERT INTO neture_supplier_products (id, supplier_id, name, category, description)
          VALUES
            (gen_random_uuid(), '${supplier.id}', '멀티비타민 90정', '비타민', '하루 한 알 종합 비타민'),
            (gen_random_uuid(), '${supplier.id}', '프로바이오틱스 30포', '유산균', '장건강 프로바이오틱스'),
            (gen_random_uuid(), '${supplier.id}', '오메가3 60캡슐', '오메가3', '순도 99% 알래스카산 오메가3')
        `);
      }
    }

    console.log('[RecreateNetureTables] Created 3 suppliers with products');

    // Seed Partnership Requests
    await queryRunner.query(`
      INSERT INTO neture_partnership_requests (id, seller_id, seller_name, seller_service_type, seller_store_url, product_count, period_start, period_end, revenue_structure, status, promotion_sns, promotion_content, promotion_banner, contact_email, contact_phone)
      VALUES
        (gen_random_uuid(), 'seller-001', '스마트스토어 패션매장', '스마트스토어', 'https://smartstore.naver.com/fashion', 5, '2026-02-01', '2026-04-30', '판매 수수료 10% + 고정비 월 50만원', 'OPEN', true, true, false, 'fashion@seller.kr', '010-1234-5678'),
        (gen_random_uuid(), 'seller-002', '쿠팡 식품전문점', '쿠팡', 'https://coupang.com/food', 10, '2026-03-01', '2026-05-31', '매출 연동 수수료 8%', 'OPEN', true, false, true, 'food@seller.kr', '010-2345-6789'),
        (gen_random_uuid(), 'seller-003', '11번가 뷰티샵', '11번가', 'https://11st.co.kr/beauty', 8, '2026-01-15', '2026-03-15', '고정 월 100만원 + 성과급', 'MATCHED', false, true, true, 'beauty@seller.kr', '010-3456-7890')
    `);

    // Get partnership IDs for products
    const requests = await queryRunner.query(`
      SELECT id, seller_name FROM neture_partnership_requests ORDER BY created_at
    `);

    // Seed Partnership Products
    for (const request of requests) {
      if (request.seller_name.includes('패션')) {
        await queryRunner.query(`
          INSERT INTO neture_partnership_products (id, partnership_request_id, name, category)
          VALUES
            (gen_random_uuid(), '${request.id}', '여성 원피스', '의류'),
            (gen_random_uuid(), '${request.id}', '남성 캐주얼 셔츠', '의류')
        `);
      } else if (request.seller_name.includes('식품')) {
        await queryRunner.query(`
          INSERT INTO neture_partnership_products (id, partnership_request_id, name, category)
          VALUES
            (gen_random_uuid(), '${request.id}', '유기농 과일 세트', '식품'),
            (gen_random_uuid(), '${request.id}', '프리미엄 견과류', '식품')
        `);
      } else if (request.seller_name.includes('뷰티')) {
        await queryRunner.query(`
          INSERT INTO neture_partnership_products (id, partnership_request_id, name, category)
          VALUES
            (gen_random_uuid(), '${request.id}', '스킨케어 세트', '화장품'),
            (gen_random_uuid(), '${request.id}', '메이크업 팔레트', '화장품')
        `);
      }
    }

    console.log('[RecreateNetureTables] Created 3 partnership requests with products');

    // ============================================================================
    // 8. Seed CMS Contents for Neture
    // ============================================================================
    const existingContents = await queryRunner.query(
      `SELECT COUNT(*) as count FROM cms_contents WHERE "serviceKey" = 'neture'`
    );

    if (parseInt(existingContents[0].count) === 0) {
      await queryRunner.query(`
        INSERT INTO cms_contents ("id", "serviceKey", "type", "title", "summary", "body", "status", "isPinned", "sortOrder", "createdAt", "updatedAt", "publishedAt")
        VALUES
          (
            gen_random_uuid(), 'neture', 'notice',
            '네뚜레 플랫폼 오픈 안내',
            '유통 정보 플랫폼 네뚜레가 오픈했습니다.',
            '네뚜레는 공급자와 판매자를 연결하는 유통 정보 플랫폼입니다. 검증된 공급자 정보를 제공하고, 파트너십 매칭을 지원합니다.',
            'published', true, 1, NOW(), NOW(), NOW()
          ),
          (
            gen_random_uuid(), 'neture', 'notice',
            '공급자 등록 안내',
            '공급자로 등록하는 방법을 안내합니다.',
            '공급자 등록을 원하시면 참여 신청 페이지에서 문의해 주세요. 담당자가 검토 후 연락드리겠습니다. 필요 서류: 사업자등록증, 제품 카탈로그, 거래 조건표',
            'published', false, 2, NOW(), NOW(), NOW()
          ),
          (
            gen_random_uuid(), 'neture', 'notice',
            '파트너십 신청 안내',
            '제휴 파트너십 신청 방법과 혜택을 알려드립니다.',
            '네뚜레 파트너십을 통해 검증된 공급자와 안전하게 거래하세요. 파트너 혜택: 신뢰할 수 있는 공급자 연결, 거래 조건 투명 공개, 분쟁 중재 서비스',
            'published', false, 3, NOW(), NOW(), NOW()
          )
      `);

      console.log('[RecreateNetureTables] Created 3 Neture CMS contents');
    }

    console.log('[RecreateNetureTables] === Migration Complete ===');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove CMS contents
    await queryRunner.query(`DELETE FROM cms_contents WHERE "serviceKey" = 'neture'`);

    // Drop tables in reverse order (child tables first)
    await queryRunner.dropTable('neture_partnership_products', true);
    await queryRunner.dropTable('neture_partnership_requests', true);
    await queryRunner.dropTable('neture_supplier_products', true);
    await queryRunner.dropTable('neture_suppliers', true);
  }
}
