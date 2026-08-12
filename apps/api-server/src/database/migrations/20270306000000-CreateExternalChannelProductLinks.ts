/**
 * CreateExternalChannelProductLinks
 * WO-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1 §2-3
 *
 * 외부 판매 채널(네이버 스마트스토어 · 쿠팡) 연동 상태 원장.
 *
 * **상품을 복제하지 않는다.** 이 테이블이 저장하는 것은 연동 상태뿐이며, 상품명·가격·이미지·
 * 상세는 저장하지 않는다. 읽을 때 O4O 기존 원장(product_masters / organization_product_listings
 * / product_images / shared_product_descriptions)에서 가져온다.
 *
 * ── channel_code 를 쓰고 external_channels FK 를 쓰지 않는 이유 (실측 근거) ──
 *
 *   `ExternalChannel` 엔티티(apps/api-server/src/entities/ExternalChannel.ts, PD-9 잔재)는
 *   코드에만 존재한다. 실측 결과:
 *     - 이 엔티티를 생성하는 migration 이 저장소에 **없다**
 *     - database/entities.ts 엔티티 registry 에 **등록되어 있지 않다**
 *     - connection.ts 는 synchronize:false 이므로 런타임 자동 생성도 없다
 *     - 프로덕션 실조회: `to_regclass('public.external_channels')` → **NULL (테이블 부재)**
 *     - 저장소 전체에서 참조 0건 (엔티티 파일 자신 외)
 *
 *   즉 FK 로 참조할 채널 마스터가 **존재하지 않는다**. 없는 테이블을 이 WO 에서 새로 만들고
 *   seed 까지 넣으면, 검증된 적 없는 PD-9 설계를 되살리면서 채널 개념이 2곳으로 갈라진다.
 *   따라서 채널 식별은 CHECK 제약이 걸린 channel_code 로 두고, 채널 마스터가 실제로 필요해지는
 *   시점(채널별 메타데이터·상태 관리가 생길 때)에 승격한다.
 *
 *   승격 경로는 파괴적이지 않다:
 *     external_channels 생성·seed → external_channel_id 컬럼 추가 → channel_code 로 backfill
 *     → FK + UNIQUE 교체 → CHK_ecpl_channel_code 제거
 *
 *   `ExternalChannel` 엔티티 자체의 처리(삭제 vs 활성화)는 본 WO 범위 밖 — 별도 판단 대상이다.
 *
 * ── channel_input 을 jsonb 로 두는 이유 ──
 *
 *   네이버 등록에 필요한데 O4O 에 원천이 없는 값들(리프 카테고리·재고·배송비·반품비·교환비·
 *   출고지/반품지 주소록 ID·A/S 정보·상품정보제공고시)은 **상품 데이터가 아니라 판매 조건**이다.
 *   ProductMaster 에 넣으면 전 서비스 공용 상품에 채널 전용 필드가 오염된다.
 *   또 이 항목 집합은 채널마다 다르므로 컬럼으로 굳히면 쿠팡에서 다시 깨진다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExternalChannelProductLinks20270306000000 implements MigrationInterface {
  name = 'CreateExternalChannelProductLinks20270306000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "external_channel_product_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),

        -- 매장 (Store Ops 경계 — Boundary Policy: organizationId)
        "organization_id" uuid NOT NULL,

        -- O4O 상품 참조. 복제가 아니라 참조다.
        "master_id" uuid NOT NULL,
        "listing_id" uuid,

        -- 채널 식별 (위 주석 참조 — 향후 external_channels FK 로 승격 가능)
        "channel_code" varchar(32) NOT NULL,

        -- 네이버는 원상품번호와 채널상품번호가 서로 다른 키다.
        -- 조회·수정·삭제는 channel_product_id 를 쓴다. 둘 다 저장한다.
        "external_origin_product_id" varchar(64),
        "external_channel_product_id" varchar(64),

        -- 채널별 판매 조건 (상품 데이터 아님)
        "channel_input" jsonb,

        -- 동기화 상태
        "sync_status" varchar(24) NOT NULL DEFAULT 'NOT_LINKED',
        "last_synced_at" timestamptz,
        "last_error" text,

        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_external_channel_product_links" PRIMARY KEY ("id"),

        CONSTRAINT "CHK_ecpl_channel_code"
          CHECK ("channel_code" IN ('NAVER', 'COUPANG')),

        CONSTRAINT "CHK_ecpl_sync_status"
          CHECK ("sync_status" IN ('NOT_LINKED', 'PENDING', 'LINKED', 'FAILED', 'UNLINKED')),

        -- LINKED 인데 외부 채널상품번호가 없으면 연동됐다고 볼 수 없다.
        CONSTRAINT "CHK_ecpl_linked_requires_external_id"
          CHECK (
            "sync_status" <> 'LINKED' OR "external_channel_product_id" IS NOT NULL
          )
      )
    `);

    // ── FK ────────────────────────────────────────────────────────────────
    // 매장·상품이 사라지면 연동 상태를 남길 이유가 없다 → CASCADE.
    // listing 은 진열이 내려가도 외부 채널 등록은 남을 수 있다 → SET NULL.
    await queryRunner.query(`
      ALTER TABLE "external_channel_product_links"
        ADD CONSTRAINT "FK_ecpl_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "external_channel_product_links"
        ADD CONSTRAINT "FK_ecpl_master"
        FOREIGN KEY ("master_id") REFERENCES "product_masters"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "external_channel_product_links"
        ADD CONSTRAINT "FK_ecpl_listing"
        FOREIGN KEY ("listing_id") REFERENCES "organization_product_listings"("id") ON DELETE SET NULL
    `);

    // ── 제약 · 인덱스 ─────────────────────────────────────────────────────
    // 한 매장의 한 상품은 한 채널에 하나만 연결된다.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ecpl_org_master_channel"
        ON "external_channel_product_links" ("organization_id", "master_id", "channel_code")
    `);

    // 같은 외부 상품을 두 링크가 동시에 소유하지 못하게 한다
    // (중복 등록 시 어느 링크가 진짜인지 알 수 없어진다).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ecpl_channel_external_product"
        ON "external_channel_product_links" ("channel_code", "external_channel_product_id")
        WHERE "external_channel_product_id" IS NOT NULL
    `);

    // 매장별 채널 목록 조회 (판매 채널 화면의 주 경로)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ecpl_org_channel"
        ON "external_channel_product_links" ("organization_id", "channel_code")
    `);

    // 재동기화 대상(실패·대기) 스캔
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ecpl_sync_status"
        ON "external_channel_product_links" ("sync_status")
        WHERE "sync_status" IN ('PENDING', 'FAILED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "external_channel_product_links"`);
  }
}
