-- =============================================================================
-- WO-O4O-MARKET-TRIAL-FEATURE-LIFECYCLE-INVENTORY-V1
-- market-trial(유통참여형 펀딩) 기능 운영 데이터 읽기 전용 인벤토리
--
-- READ-ONLY 전용. INSERT/UPDATE/DELETE/DDL 을 포함하지 않는다.
--
-- 사용:
--   ./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" \
--     --port 5445 netureyoutube:asia-northeast3:o4o-platform-db
--   psql -h 127.0.0.1 -p 5445 -U "$DB_USERNAME" -d o4o_platform -X \
--     -f scripts/audits/market-trial-lifecycle-inventory.sql
--   (한글 주석 때문에 psql -c 인라인 대신 -f 로 실행할 것)
--
-- 주의: market_trials 는 camelCase 컬럼("createdAt","supplierName" 등),
--       market_trial_participants 는 별도 네이밍을 쓴다. snake_case 로 가정하지 말 것.
-- =============================================================================

SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;

\echo ''
\echo '=== 0. READ-ONLY 확인 ==='
SELECT current_setting('default_transaction_read_only') AS session_read_only,
       current_user, current_database();

\echo ''
\echo '=== 1. market_trial* 테이블별 건수 ==='
SELECT t.table_name,
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I', t.table_name), false, true, '')))[1]::text::int AS rows
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_name LIKE 'market_trial%'
ORDER BY 1;

\echo ''
\echo '=== 2. trial 상세 (상태·제목·생성일) ==='
SELECT id::text AS trial_id, status, title,
       "createdAt"::date AS created, "updatedAt"::date AS updated,
       "currentParticipants", "maxParticipants"
FROM market_trials
ORDER BY "createdAt" DESC;

\echo ''
\echo '=== 3. 상태 분포 ==='
SELECT status, count(*) AS rows FROM market_trials GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '=== 4. 포럼 연동 계약 검증 =========================================='
\echo '-- 컨트롤러(marketTrialOperatorController.ts:299)는 forum_category_requests 를 읽는다.'
\echo '-- 그러나 생성 migration 2건은 forum_category(단수) 에 INSERT 한다.'
\echo '-- 두 테이블의 실재 여부와 상수 행 존재를 함께 본다.'
SELECT 'forum_category(단수) 테이블 존재' AS check_item,
       count(*) AS present
  FROM information_schema.tables WHERE table_schema='public' AND table_name='forum_category'
UNION ALL
SELECT 'forum_category_requests 테이블 존재', count(*)
  FROM information_schema.tables WHERE table_schema='public' AND table_name='forum_category_requests'
ORDER BY 1;

\echo '-- LIVE 상수 f0000000-0a00-4000-f000-0000000000f1 의 참조 행 --'
SELECT count(*) AS constant_row_in_forum_category_requests
FROM forum_category_requests
WHERE id::text = 'f0000000-0a00-4000-f000-0000000000f1';

\echo ''
\echo '=== 5. 연동 산출물 (게시글 매핑 / 실패 원장) ==='
SELECT 'market_trial_forums(매핑)' AS artifact, count(*) AS rows FROM market_trial_forums
UNION ALL SELECT 'market_trial_forum_sync_failures(실패 원장)', count(*) FROM market_trial_forum_sync_failures
ORDER BY 1;

\echo ''
\echo '=== 6. 관련 migration 실행 이력 ==='
SELECT name FROM typeorm_migrations
WHERE name ILIKE '%MarketTrial%'
ORDER BY 1;

\echo ''
\echo '=== 완료 — write 0 ==='
