-- =============================================================================
-- WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 — 운영 DB 읽기 전용 검증
--
-- READ-ONLY 전용. INSERT/UPDATE/DELETE/DDL 을 포함하지 않는다.
-- 첫 구문이 세션을 read-only 로 고정하므로, write 가 섞이면 즉시 실패한다.
--
-- 사용:
--   ./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" \
--     --port 5461 netureyoutube:asia-northeast3:o4o-platform-db
--   psql -h 127.0.0.1 -p 5461 -U "$DB_USERNAME" -d o4o_platform -X \
--     -f scripts/audits/qr-screenset-state-alignment-verify.sql
--   (한글 주석 때문에 psql -c 인라인 대신 -f 로 실행할 것)
--
-- 목적: 코드에 넣은 판정식(QR_LANDABLE_CONDITION / ARCHIVED_SCREEN_SET_QR_CONDITION)이
--       운영 데이터에서 무엇을 바꾸는지 **실측**한다. 배포 전후 비교 없이도,
--       구(is_active 단독)/신(이중 게이트) 판정을 같은 쿼리에서 나란히 세어 차이를 드러낸다.
-- =============================================================================

SET default_transaction_read_only = on;

\echo '=== [1] screen_set QR 전체 상태 분포 (전 매장) ==================='
SELECT
  qr.is_active                                   AS "qr_is_active",
  CASE
    WHEN qs.id IS NULL THEN 'set_missing'
    WHEN qs.deleted_at IS NOT NULL OR qs.status = 'archived' THEN 'archived'
    ELSE 'active'
  END                                            AS "screen_set_state",
  COUNT(*)::int                                  AS "qr_count"
FROM store_qr_codes qr
LEFT JOIN store_tablet_screen_sets qs
  ON qs.id::text = qr.landing_target_id
 AND qs.organization_id = qr.organization_id
 AND qs.origin = 'store'
WHERE qr.landing_type = 'screen_set'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

\echo ''
\echo '=== [2] 구/신 판정 차이 — 매장별 (차이 있는 매장만) ==============='
\echo '    old_active  : 기존 is_active 단독 집계 (구 KPI · 구 목록)'
\echo '    new_landable: 공개 랜딩 이중 게이트 (신 KPI · 신 목록의 활성)'
\echo '    archived_shown: 신규로 목록에 보이는 보관 코너 QR'
WITH j AS (
  SELECT
    qr.organization_id,
    qr.is_active,
    qr.landing_type,
    qs.id            AS set_id,
    qs.deleted_at    AS set_deleted_at,
    qs.status        AS set_status
  FROM store_qr_codes qr
  LEFT JOIN store_tablet_screen_sets qs
    ON qs.id::text = qr.landing_target_id
   AND qs.organization_id = qr.organization_id
   AND qs.origin = 'store'
)
SELECT
  o.name                                                          AS "store",
  COUNT(*) FILTER (WHERE is_active)::int                          AS "old_active",
  COUNT(*) FILTER (
    WHERE is_active
      AND (landing_type <> 'screen_set'
           OR (set_id IS NOT NULL AND set_deleted_at IS NULL AND set_status <> 'archived'))
  )::int                                                          AS "new_landable",
  COUNT(*) FILTER (
    WHERE landing_type = 'screen_set'
      AND set_id IS NOT NULL
      AND (set_deleted_at IS NOT NULL OR set_status = 'archived')
  )::int                                                          AS "archived_shown"
FROM j
JOIN organizations o ON o.id = j.organization_id
GROUP BY o.name
HAVING COUNT(*) FILTER (WHERE is_active) <> COUNT(*) FILTER (
         WHERE is_active
           AND (landing_type <> 'screen_set'
                OR (set_id IS NOT NULL AND set_deleted_at IS NULL AND set_status <> 'archived')))
    OR COUNT(*) FILTER (
         WHERE landing_type = 'screen_set'
           AND set_id IS NOT NULL
           AND (set_deleted_at IS NOT NULL OR set_status = 'archived')) > 0
ORDER BY 1;

\echo ''
\echo '=== [3] 보관 코너 QR 표본 — 공개 랜딩 410 / 출력 차단 대상 ========'
\echo '    slug 은 공개 URL 이므로 그대로 노출해도 비밀이 아니다.'
SELECT
  o.name                     AS "store",
  qr.slug                    AS "qr_slug",
  qr.is_active               AS "qr_is_active",
  qs.name                    AS "screen_set",
  qs.status                  AS "set_status",
  (qs.deleted_at IS NOT NULL) AS "set_soft_deleted",
  qs.public_qr_slug          AS "set_public_qr_slug"
FROM store_qr_codes qr
JOIN store_tablet_screen_sets qs
  ON qs.id::text = qr.landing_target_id
 AND qs.organization_id = qr.organization_id
 AND qs.origin = 'store'
JOIN organizations o ON o.id = qr.organization_id
WHERE qr.landing_type = 'screen_set'
  AND (qs.deleted_at IS NOT NULL OR qs.status = 'archived')
ORDER BY o.name, qs.name
LIMIT 20;

\echo ''
\echo '=== [4] 활성 코너 QR 표본 — 공개 랜딩 200 대상 ===================='
SELECT
  o.name            AS "store",
  qr.slug           AS "qr_slug",
  qs.name           AS "screen_set",
  qs.status         AS "set_status",
  EXISTS(SELECT 1 FROM store_tablets t WHERE t.current_screen_set_id = qs.id) AS "applied_to_corner"
FROM store_qr_codes qr
JOIN store_tablet_screen_sets qs
  ON qs.id::text = qr.landing_target_id
 AND qs.organization_id = qr.organization_id
 AND qs.origin = 'store'
JOIN organizations o ON o.id = qr.organization_id
WHERE qr.landing_type = 'screen_set'
  AND qr.is_active = true
  AND qs.deleted_at IS NULL
  AND qs.status <> 'archived'
ORDER BY 5 DESC, o.name, qs.name
LIMIT 20;

\echo ''
\echo '=== [5] M-5 검증 대상 — product_list 블록의 상품 선택 방식 ========'
\echo '    selected_products = 직접 선택(그 상품만 노출)'
\echo '    legacy            = 선택 없음 → 이번 WO 로 공개 QR 에서 상품 0건'
SELECT
  COALESCE(b.config->>'source', '(none)')                       AS "product_list_source",
  COUNT(*)::int                                                 AS "block_count",
  COUNT(*) FILTER (WHERE qs.public_qr_slug IS NOT NULL)::int    AS "with_qr_slug"
FROM store_tablet_screen_blocks b
JOIN store_tablet_screen_sets qs ON qs.id = b.screen_set_id
WHERE b.block_type = 'product_list'
  AND qs.origin = 'store'
  AND qs.deleted_at IS NULL
GROUP BY 1
ORDER BY 2 DESC;

\echo ''
\echo '=== [6] 미적용 + legacy(선택없음) Screen Set — 상품 0건이어야 함 ==='
SELECT
  o.name    AS "store",
  qs.name   AS "screen_set",
  qs.public_qr_slug AS "qr_slug",
  COALESCE(b.config->>'source', '(none)') AS "product_list_source"
FROM store_tablet_screen_blocks b
JOIN store_tablet_screen_sets qs ON qs.id = b.screen_set_id
JOIN organizations o ON o.id = qs.organization_id
WHERE b.block_type = 'product_list'
  AND qs.origin = 'store'
  AND qs.deleted_at IS NULL
  AND qs.status <> 'archived'
  AND qs.public_qr_slug IS NOT NULL
  AND COALESCE(b.config->>'source', '') <> 'selected_products'
  AND NOT EXISTS (SELECT 1 FROM store_tablets t WHERE t.current_screen_set_id = qs.id)
ORDER BY o.name, qs.name
LIMIT 15;
