# CHECK-O4O-RETIRED-SERVICE-STRUCTURED-DATA-CLEANUP-V1

> **WO**: WO-O4O-RETIRED-SERVICE-SAFE-DATA-RESIDUAL-CLEANUP-V1
> **실행일**: 2026-09-17 · **환경**: production (`o4o_platform`) · **방식**: 단일 명시 transaction (psql `ON_ERROR_STOP`, in-tx pre/post assertion, 불일치 시 예외 → 자동 ROLLBACK)
> **선행**: WO-O4O-RETIRED-SERVICE-CLEANUP-MAIN-INTEGRATION-AND-DB-RESIDUAL-AUDIT-V1 (main merge `bbd61992a` · `REPOSITORY_ACTIVE_RESIDUAL = 0` · `MAIN_INTEGRATION = CLOSED`)
> **결과**: `DB_STRUCTURED_RESIDUAL = 4 → 0` · ROLLBACK 0회 · repository 코드 변경 0

이 문서는 은퇴 서비스 식별자를 본문에 반복 기재하지 않는다 (repository 검색 결과 재유입 방지). 아래 "retired key" 는 선행 IR/WO 가 식별한 은퇴 서비스 service key · event-offer key · service code · forum seed organization code 를 가리킨다.

---

## 1. 실행 전 상태 확인

```text
git fetch origin · git pull --ff-only origin main → Already up to date
HEAD == origin/main == bbd61992a
이번 WO 범위 파일 변경 0 (다른 세션의 미추적/수정 파일 1건은 불가침 · 미접촉)
```

## 2. Preflight (SELECT only · write 전)

| 대상 | pre count | 상태 | 참조 |
|---|---|---|---|
| A-1 `organization_product_listings` retired event-offer key | 1 | approved · is_active · 2026-08-14 생성 · 2026-08-18 갱신 | `store_cart_items`(listing/event_offer) 0 · `external_channel_product_links` 0 · `organization_product_channels` 0 |
| A-2 `supplier_product_offers.service_keys` ∋ retired key | 1 | APPROVED · is_active · cardinality 3 (현행 2 + retired 1) | 이 offer 를 참조하는 listing 6 (그중 1 = A-1) |
| A-3 `operator_notification_settings` retired service code | 1 | enabled · 2026-02-04 생성 · 발송 이력 0 · `platform_services` 에 해당 code 0 | — |
| A-4 `organizations` retired forum seed fixture (code + `metadata.serviceCode`) | 1 | division · 2026-05-17 생성 · seed migration 산출물 | members 0 · role_assignments(organizationId/scope_id) 0 · enrollments 0 · forum_post/forum_category_requests/forum_notifications 0 · listings 0 · tablets 0 · QR 0 · slugs 0 · children 0 |

`organization_product_listings` 에는 canonical soft-delete 컬럼/정책이 없다 (`status` 는 pending/approved/canceled 업무 상태) → hard delete 채택.

기준 총계(pre): `organization_product_listings` 45 · `supplier_product_offers` 22 · `operator_notification_settings` 4 · `organizations` 26 · 현행 서비스 listing 44.

## 3. Transaction 내부 절차

1. 4 대상 각각 count = 1 재확인 후 PK 로 `FOR UPDATE` 잠금 (PK · key 값 동시 일치 조건).
2. A-4 참조 재확인: `information_schema` 에서 조직 참조 성격의 uuid 컬럼(`organization_id` · `organizationId` · `store_id` · `parentId` · `scope_id` 등) **97 컬럼 전수** 동적 count = 0 확인.
3. 실행: `DELETE` 1 (A-1, PK+key 조건) · `UPDATE … array_remove(service_keys, retired key)` 1 (A-2, PK 조건) · `DELETE` 1 (A-3, PK+code 조건) · `DELETE` 1 (A-4, PK+code 조건). wildcard/LIKE 삭제 없음.
4. COMMIT 전 검증 (모두 통과):
   - 4 대상 retired 잔존 = 0
   - A-2 offer row 존재 · `service_keys` = 현행 2 키 그대로 · cardinality 2 · 참조 listing 5 (= 6 − A-1)
   - `operator_notification_settings` 총 3 (현행 서비스 3 보존)
   - 총계: `organization_product_listings` 44 · `supplier_product_offers` 22 · `organizations` 25 · 현행 서비스 listing 44 (의도치 않은 감소 0)
5. `COMMIT`.

```text
DELETE 1 / UPDATE 1 / DELETE 1 / DELETE 1 → COMMIT (ROLLBACK 0)
```

## 4. 실행 후 전수 read-only census

- 일반 스캔: public 스키마에서 service key/code · code · role · name · metadata · scope 성격 컬럼 **195 컬럼** 을 retired 식별자로 동적 검색 (`users` · `store_playlists` · `typeorm_migrations` 는 보존 대상이라 제외).
- 명시 축: `platform_services` · `service_memberships` · `service_credentials` · `organization_service_enrollments` · `organization_product_listings` · `supplier_product_offers` · `operator_notification_settings` · `roles` · `role_assignments` · `organizations`(code/metadata) · `users.service_key` → **전부 0**.

| 결과 | 값 |
|---|---|
| DB_STRUCTURED_RESIDUAL | **0** |
| 신규 발견 (대상 외 · 미변경) | `checkout_orders.metadata.serviceKey` 4행 — 전부 `cancelled` 주문(2026-08-14 · 08-18) 의 jsonb 이력, FK 아님 → **B. HISTORICAL_BUSINESS_DATA** (선행 census 는 jsonb metadata 를 스캔하지 않았음) |
| KEEP 확인 (불변) | `organizations.name` 1 · `store_playlists.name` 1 · `users.name` 1 (C. FREE_TEXT_USER_DATA) · `typeorm_migrations` 31/681 (D) · enum label 1 (SCHEMA — 별도 WO) |

## 5. Repository 회귀

```text
git status --short → 이번 WO 변경 = 본 CHECK 1건 (다른 세션 파일 1건 불가침)
git grep -niE '<retired keywords>' -- ':!apps/api-server/src/database/**' → 0
```

일회성 SQL 은 세션 scratchpad 에만 두었고 repository 에 추가하지 않았다. 비밀번호 · 접속 문자열 · 개인식별정보는 기록하지 않았다.

## 6. 판정

```text
DB_STRUCTURED_RESIDUAL = 0
REPOSITORY_ACTIVE_RESIDUAL = 0
DB_SCHEMA_RESIDUAL = 1
DB_FREE_TEXT_RESIDUAL = 3 (KEEP)
DB_HISTORICAL_ORDER_METADATA = 4 (KEEP · 신규 분류)
MIGRATION_HISTORY_RESIDUAL = 104
```

`RETIRED_SERVICE_TOTAL_RESIDUAL = 0` 은 선언하지 않는다.

## 7. 다음

- `WO-O4O-RETIRED-SERVICE-SCHEMA-ENUM-CLEANUP-V1` — enum label 제거(새 타입 생성 → 컬럼 캐스트 → 구 타입 drop) + baseline 재스냅샷 + fingerprint + blank DB/migration contract 검증. 이 WO 성공 후에만 착수.
- `checkout_orders.metadata` 4행은 주문 이력이므로 삭제 대상 아님. 필요 시 별도 판단.
- migration history 104 squash 는 enum cleanup 이후 최종 WO.
