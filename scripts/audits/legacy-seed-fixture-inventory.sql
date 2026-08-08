-- =============================================================================
-- WO-O4O-LEGACY-SEED-FIXTURE-PRODUCTION-DATA-INVENTORY-V1
-- 과거 seed fixture (e0000000% / f0000000%) 운영 DB 읽기 전용 인벤토리
--
-- READ-ONLY 전용. INSERT/UPDATE/DELETE/DDL 을 포함하지 않는다.
-- 첫 구문이 세션을 read-only 로 고정하므로, write 가 섞이면 즉시 실패한다.
--
-- 사용:
--   ./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" \
--     --port 5444 netureyoutube:asia-northeast3:o4o-platform-db
--   psql -h 127.0.0.1 -p 5444 -U "$DB_USERNAME" -d o4o_platform -X \
--     -f scripts/audits/legacy-seed-fixture-inventory.sql
--   (한글 주석 때문에 psql -c 인라인 대신 -f 로 실행할 것)
--
-- 배경: `4971381fb` 로 제거된 두 seed HTTP route 의 fixture 가 운영 DB 에
--       남아 있는지 확인한다. **prefix 만으로 판정하지 않는다** — 같은
--       e0000000/f0000000 prefix 를 쓰는 다른 계열(migration seed, live 상수)이
--       있으므로 UUID 2번째 세그먼트로 계열을 분리한다.
--
-- 계열 정의:
--   SET A  e0000000-ee01..ee05  store-hub seed        (33bccc567 → 제거 4971381fb)
--   SET B  f0000000-aa01/bb01   neture-offers seed    (582dd5285 → 제거 4971381fb)
--   SET C  e0000000-0a00        KPA banner/benefit cms_contents (migration seed)
--   SET D  f0000000-0a00        KPA test forum / market-trial 상수
--   SET E  e0000000-ee10/20/21  Care 테스트 (문서에만 존재, 테이블 DROP 됨)
-- =============================================================================

SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;

\echo ''
\echo '=== 0. READ-ONLY 확인 ==='
SELECT current_setting('default_transaction_read_only') AS session_read_only,
       current_user, current_database();

-- -----------------------------------------------------------------------------
-- 1. SET A — store-hub seed
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 1. SET A: store-hub seed (e0000000-ee01..ee05) ==='
SELECT 'users'                     AS table_name, count(*) AS rows FROM users                     WHERE id::text LIKE 'e0000000-ee01%'
UNION ALL SELECT 'organizations',                 count(*) FROM organizations                     WHERE id::text LIKE 'e0000000-ee02%'
UNION ALL SELECT 'organization_channels',         count(*) FROM organization_channels             WHERE id::text LIKE 'e0000000-ee03%'
UNION ALL SELECT 'organization_product_listings', count(*) FROM organization_product_listings     WHERE id::text LIKE 'e0000000-ee04%'
UNION ALL SELECT 'platform_store_slugs',          count(*) FROM platform_store_slugs              WHERE id::text LIKE 'e0000000-ee05%'
ORDER BY 1;

-- SET A 의 하위 2테이블은 gen_random_uuid() 로 만들어져 prefix 검색이 불가능하다.
-- 반드시 FK 역방향으로 확인한다 (부모만 지워진 고아 탐지).
\echo '--- SET A 하위(랜덤 UUID): FK 역방향 ---'
SELECT 'organization_members(by org)'       AS relation, count(*) AS rows FROM organization_members        WHERE organization_id::text     LIKE 'e0000000-ee02%'
UNION ALL SELECT 'organization_members(by user)',       count(*) FROM organization_members                 WHERE user_id::text             LIKE 'e0000000-ee01%'
UNION ALL SELECT 'organization_product_channels(ch)',   count(*) FROM organization_product_channels        WHERE channel_id::text          LIKE 'e0000000-ee03%'
UNION ALL SELECT 'organization_product_channels(pl)',   count(*) FROM organization_product_channels        WHERE product_listing_id::text  LIKE 'e0000000-ee04%'
ORDER BY 1;

\echo '--- SET A fixture 이메일 (ID 와 무관하게 재생성됐을 가능성) ---'
SELECT count(*) AS fixture_email_users
FROM users WHERE email IN ('store.owner1@test.com','store.owner2@test.com','operator@test.com');

-- -----------------------------------------------------------------------------
-- 2. SET B — neture-offers seed
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 2. SET B: neture-offers seed (f0000000-aa01/bb01) ==='
SELECT 'product_masters'                          AS table_name, count(*) AS rows FROM product_masters               WHERE id::text       LIKE 'f0000000-aa01%'
UNION ALL SELECT 'supplier_product_offers',                       count(*) FROM supplier_product_offers              WHERE id::text       LIKE 'f0000000-bb01%'
UNION ALL SELECT 'organization_product_listings(by offer)',       count(*) FROM organization_product_listings        WHERE offer_id::text LIKE 'f0000000-bb01%'
UNION ALL SELECT 'offer_service_approvals(by offer)',             count(*) FROM offer_service_approvals              WHERE offer_id::text LIKE 'f0000000-bb01%'
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 3. 전 uuid 컬럼 동적 스캔 — 상위 집합. 여기 없으면 DB 어디에도 없다.
--    출력된 SQL 을 그대로 실행하면 prefix 를 가진 모든 (테이블,컬럼) 건수가 나온다.
--    실행 예: psql ... -t -A -f 이 파일 > gen.txt 후 gen.txt 를 -f 로 재실행
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 3. 전 uuid 컬럼 스캔 SQL (생성) ==='
SELECT format(E'SELECT * FROM (\n%s\n) s WHERE n > 0 ORDER BY n DESC, t, c;',
         string_agg(
           format('SELECT %L AS t, %L AS c, count(*) AS n FROM %I WHERE %I::text LIKE ''e0000000%%'' OR %I::text LIKE ''f0000000%%''',
                  c.table_name, c.column_name, c.table_name, c.column_name, c.column_name),
           E'\nUNION ALL ')
       ) AS generated_scan_sql
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
WHERE c.table_schema = 'public' AND c.data_type = 'uuid';

-- -----------------------------------------------------------------------------
-- 4. SET C — 동일 prefix 의 타 계열. 삭제 후보로 오인 금지.
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 4. SET C: cms_contents (e0000000-0a00) — KPA 배너/혜택 ==='
SELECT substring(id::text, 1, 18) AS family, status, "serviceKey", type, count(*) AS rows,
       min("createdAt")::date AS first_created
FROM cms_contents
WHERE id::text LIKE 'e0000000%' OR id::text LIKE 'f0000000%'
GROUP BY 1,2,3,4 ORDER BY 5 DESC;

\echo '--- 소비 실태: 활성 slot 연결 ---'
SELECT s."slotKey", s."isActive", count(*) AS slot_rows
FROM cms_content_slots s
WHERE s."contentId"::text LIKE 'e0000000%' OR s."contentId"::text LIKE 'f0000000%'
GROUP BY 1,2 ORDER BY 3 DESC;

\echo '--- 교차검증: 총계 / 연결 / 미연결 ---'
SELECT (SELECT count(*) FROM cms_contents WHERE id::text LIKE 'e0000000%' OR id::text LIKE 'f0000000%') AS contents_total,
       (SELECT count(DISTINCT "contentId") FROM cms_content_slots WHERE "contentId"::text LIKE 'e0000000%' OR "contentId"::text LIKE 'f0000000%') AS distinct_slotted,
       (SELECT count(*) FROM cms_content_slots WHERE "contentId"::text LIKE 'e0000000%' OR "contentId"::text LIKE 'f0000000%') AS slot_rows,
       (SELECT count(*) FROM cms_contents c WHERE (c.id::text LIKE 'e0000000%' OR c.id::text LIKE 'f0000000%')
          AND NOT EXISTS (SELECT 1 FROM cms_content_slots s WHERE s."contentId" = c.id)) AS unslotted;

\echo '--- 고아 검사: slot 이 없는 content 를 가리키는가 ---'
SELECT count(*) AS slots_pointing_at_missing_content
FROM cms_content_slots s
LEFT JOIN cms_contents c ON c.id = s."contentId"
WHERE (s."contentId"::text LIKE 'e0000000%' OR s."contentId"::text LIKE 'f0000000%') AND c.id IS NULL;

-- -----------------------------------------------------------------------------
-- 5. SET D — forum 계열. `forum_categories` 테이블은 존재하지 않는다.
--    market-trial LIVE 상수는 forum_category_requests 를 조회한다
--    (marketTrialOperatorController.ts:299).
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 5. SET D: forum 계열 ==='
SELECT 'forum_category_requests(prefix)' AS scope, count(*) AS rows
  FROM forum_category_requests WHERE id::text LIKE 'e0000000%' OR id::text LIKE 'f0000000%'
UNION ALL
SELECT 'market-trial LIVE 상수 f0000000-0a00-4000-f000-0000000000f1', count(*)
  FROM forum_category_requests WHERE id::text = 'f0000000-0a00-4000-f000-0000000000f1'
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 6. 운영 연결 — 주문·결제·정산·감사
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 6. 주문/결제/감사 연결 ==='
-- checkout_orders 의 조직 축은 "sellerOrganizationId" 다 ("organizationId" 아님).
SELECT 'checkout_orders(by seller org)' AS relation, count(*) AS rows FROM checkout_orders  WHERE "sellerOrganizationId"::text LIKE 'e0000000%' OR "sellerOrganizationId"::text LIKE 'f0000000%'
UNION ALL SELECT 'checkout_orders(by buyer)',        count(*) FROM checkout_orders  WHERE "buyerId"::text  LIKE 'e0000000%' OR "buyerId"::text  LIKE 'f0000000%'
UNION ALL SELECT 'checkout_payments(by order)',      count(*) FROM checkout_payments WHERE "orderId"::text LIKE 'e0000000%' OR "orderId"::text LIKE 'f0000000%'
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 7. migration 실행 이력 (SET C 의 생성/정리 경위)
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 7. 관련 migration 실행 이력 ==='
SELECT name FROM typeorm_migrations
WHERE name ILIKE '%CleanupDemoSeed%' OR name ILIKE '%SeedKpaBanner%' OR name ILIKE '%SeedKpaBenefit%'
ORDER BY 1;

\echo ''
\echo '=== 완료 — write 0 ==='
