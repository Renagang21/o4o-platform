# CHECK-O4O-STORE-SERVICE-KEY-RESIDUAL-INTEGRITY-CLEANUP-V1

- **WO**: `WO-O4O-STORE-SERVICE-KEY-RESIDUAL-INTEGRITY-CLEANUP-V1`
- **일자**: 2026-08-18
- **범위**: Store 관련 service-key 저장소의 legacy key 잔여 행 + **신규 legacy 생성 경로** 정리
- **결과**: **PASS** — legacy 신규 생성 경로 1건 차단, 운영 legacy 행 2건 제거(잔여 0), 회귀 0

---

## 1. census (production, read-only · 정리 전)

| 테이블 | 전체 | 키별 분포 | legacy 후보 |
|---|---:|---|---|
| `organization_service_enrollments` | 21 | cosmetics 1 / glycopharm 2 / k-cosmetics 2 / kpa-society 7 / neture 3 / pharmacy-hub 6 (전부 active) | **cosmetics 1** |
| `organization_product_listings` | 29 | glycopharm 2 / glycopharm-event-offer 1 / k-cosmetics 2 / k-cosmetics-event-offer 1 / **kpa 1** / kpa-groupbuy 1 / kpa-society 1 / neture 20 | **kpa 1** |
| `product_approvals` | 4 | glycopharm approved 1 / k-cosmetics approved 1 / kpa-society approved 1 + pending 1 | 0 |
| `service_audience_policies` | 5 | glycopharm / k-cosmetics / kpa-society / neture / pharmacy-hub 각 1 | 0 |
| `service_memberships` | 40 | glycopharm 4 / k-cosmetics 5 / kpa-branch 2 / kpa-society 6 / neture 7 / pharmacy-hub 8 active + 1 rejected / platform 7 | 0 |
| `platform_store_slugs` | 15 | cosmetics 2 / kpa 7 / pharmacy-hub 6 (전부 active) | 0 (**slug 축은 정상값**) |

**미조사 0** — 6 테이블 전수 집계 + dual-key / orphan 검증까지 수행했다(§6).

## 2. canonical 축 재확인 (신규 계약 아님)

| 축 | KPA | K-Cosmetics |
|---|---|---|
| ROLE prefix (`role_assignments`) | `kpa` | `cosmetics` |
| MEMBERSHIP (`service_memberships`) | `kpa-society` | `k-cosmetics` |
| ENROLLMENT (`organization_service_enrollments.service_code`) | `kpa-society` | `k-cosmetics` |
| LISTING (`organization_product_listings.service_key`) | `kpa-society` | `k-cosmetics` |
| POLICY (`service_audience_policies`) | `kpa-society` | `k-cosmetics` |
| SLUG (`platform_store_slugs.service_key`) | `kpa` | `cosmetics` |

근거: `packages/security-core/src/service-configs.ts`(`resolveCanonicalServiceKey`), `apps/api-server/src/utils/listing-service-key.ts`(OPL canonical SSOT), migration `20260411300000-NormalizeKpaServiceKeys`(OPL/approvals 의 `kpa` → `kpa-society` 를 "표준 key" 로 확정), migration `20260930000000-BackfillCosmeticsServiceEnrollments`(enrollment canonical = `k-cosmetics`).

## 3. K-Cos legacy enrollment 판정 — **SAFE_TO_MERGE**

| 항목 | legacy | canonical |
|---|---|---|
| id | `e874076f-1703-42e2-9e07-a97e4e8c168c` | `7387f53a-b2ac-4cf4-97e4-cf22c818c076` |
| organization_id | `31e926a0-8b41-4af6-8a22-b32d3ad880e6` | 동일 |
| service_code | `cosmetics` | `k-cosmetics` |
| status | active | active |
| enrolled_at | 2026-05-17 12:09:27 | 2026-05-26 13:23:48 |
| config | `{}` | `{}` |

- 보존할 metadata **없음**(config 양쪽 `{}`), 충돌 없음.
- WO §5 "근거 없이 timestamp 를 덮어쓰지 않는다" → canonical 의 `enrolled_at` 은 **변경하지 않았다**(legacy 의 이른 날짜를 이전할 업무적 근거 없음).
- `organization_service_enrollments(id)` 를 참조하는 FK **0건**(`pg_constraint` 확인) → 삭제 안전.

## 4. KPA legacy OPL 판정 — **DUPLICATE_CANONICAL_EXISTS → 삭제**

| 항목 | legacy | canonical |
|---|---|---|
| id | `29d91f79-794a-4dba-b8f6-81c2914cf3ba` | `64ae4184-4d8d-4fa9-8cfb-f217572eba4a` |
| organization_id | `9c87f46b-57a1-4afe-80bd-60782c49ce96` (테스트 약국) | 동일 |
| service_key | `kpa` | `kpa-society` |
| master_id / offer_id | `7469448d…` / `61db213b…` | 동일 / 동일 |
| is_active / status | true / pending | true / pending |
| source_type / source_id | `event-offer` / `02003281…` | (없음) |
| price / event_price / origin_service_key | NULL | NULL |
| created_at | 2026-08-14 02:06:32 | 2026-08-14 01:44:06 |

- `UNIQUE (organization_id, service_key, offer_id)` 때문에 `kpa → kpa-society` **UPDATE 는 불가**(canonical 행이 이미 같은 org+offer 를 점유). WO §8 "canonical row 가 이미 있으면 자동 UPDATE 금지" 와 일치.
- migration `20260411300000` 이 동일 상황(중복 `kpa` 행)에 대해 **DELETE 후 나머지 UPDATE** 를 표준 절차로 이미 명문화했다 → 같은 절차 적용.
- downstream 참조 전수 확인 **모두 0**: `organization_product_channels.product_listing_id`, `external_channel_product_links.listing_id`, `store_cart_items.organization_product_listing_id`, `store_product_description_selections.organization_product_listing_id`, 그리고 이 행을 `source_id` 로 참조하는 OPL 0건.
- 업무 의미 손실 없음: 파생행을 읽는 유일한 경로는 `/pharmacy/products/orderable` 의 **제외 조건**(`source_type IS DISTINCT FROM 'event-offer'`)이며, 매장 노출은 canonical 행이 담당한다. 공개 매장(`store-public-utils.resolveServiceKeys('kpa') = ['kpa','kpa-society']`)에서는 두 행이 **같은 상품을 중복 노출**하고 있었으므로 삭제가 결함 해소이기도 하다.

## 5. write path 전수감사 (§7)

### 5-1. `organization_product_listings` INSERT 경로

| 경로 | service_key 출처 | 판정 |
|---|---|---|
| `routes/kpa/services/event-offer.service.ts` `ensureStoreProduct()` | `STORE_SERVICE_KEY_MAP[eventServiceKey]` | **LEGACY_WRONG → 수정** |
| `utils/auto-listing.utils.ts` (4 INSERT) | `organization_service_enrollments.service_code`(canonical) / 호출자 canonical 인자 | CANONICAL |
| `modules/product-policy-v2/product-approval-v2.service.ts` | `product_approvals.service_key`(canonical) | CANONICAL |
| `routes/o4o-store/controllers/store-product-library.controller.ts` (2 INSERT) | `deriveListingServiceKeyFromMemberships()` | CANONICAL |
| `modules/neture/services/product-candidate.service.ts` | `resolveCanonicalServiceKey(input.serviceKey)` | CANONICAL |
| `modules/neture/services/store-product-request-admin.service.ts` | `resolveCanonicalServiceKey(input.serviceKey)` | CANONICAL |
| `modules/neture/services/partner-contract.service.ts` | `recruitment.service_id`(canonical service id) | CANONICAL |
| `controllers/pharmacy-hub/PharmacyHubHandledProductController.ts` | 상수 `SERVICE_KEY='pharmacy-hub'` | CANONICAL |
| `database/migrations/*` | 1회성 | MIGRATION_ONLY |

### 5-2. `organization_service_enrollments` INSERT 경로

| 경로 | service_code 출처 | 판정 |
|---|---|---|
| `modules/organization/services/organization-ops.service.ts` `enrollService()` | 호출자 인자 | CANONICAL(호출자 전수 확인) |
| `routes/cosmetics/services/cosmetics-store.service.ts` (2 호출) | 리터럴 `'k-cosmetics'` | CANONICAL |
| `modules/neture/services/supplier.service.ts` | 리터럴 `'neture'` | CANONICAL |
| `routes/glycopharm/**`(admin·store-applications·member) | `'glycopharm'` | CANONICAL |
| `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | `'pharmacy-hub'` | CANONICAL |

→ **enrollment 쪽에 살아 있는 legacy writer 없음.** 운영 데이터의 `cosmetics` 1행은 2026-05-17 생성으로, canonical 정렬(2026-05-26 backfill migration) 이전의 잔재다.

## 6. 최소 수정 (코드 3파일 + 테스트 1파일)

1. `apps/api-server/src/routes/kpa/services/event-offer.service.ts`
   `STORE_SERVICE_KEY_MAP[SERVICE_KEYS.KPA_GROUPBUY]` : `SERVICE_KEYS.KPA` → **`SERVICE_KEYS.KPA_SOCIETY`**
   (형제 항목 K-Cosmetics·GlycoPharm 은 이미 canonical. KPA 만 role-prefix 로 남아 legacy 행을 계속 생성했다.)
2. `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts`
   파생행을 `service_key='kpa'` 로 설명하던 **주석 2곳 정정**(구분은 `source_type` 으로만 한다). 쿼리 로직 무변경.
3. `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts`
   "이벤트 오퍼 승인 대기" KPI 를 `service_key='kpa-society'` → **`'kpa-groupbuy'`**.
   ①본래 주석이 "`EventOfferService.countPendingListings` 와 동일 쿼리" 라고 선언했고 실제 운영자 큐는 `listPendingListings(KPA_GROUPBUY)` 이며, GlycoPharm 대시보드도 `GLYCOPHARM_EVENT_OFFER` 를 센다(형제 정합). ②1번 수정으로 파생행이 canonical 키를 갖게 되어, 그대로 두면 이 KPI 가 파생행까지 세어 큐 목록과 더 크게 어긋난다.
4. `apps/api-server/src/__tests__/store-service-key-residual.spec.ts` (신규, 4 test) — legacy key 신규 생성 경로 재발 방지 회귀.

## 7. 운영 데이터 정리 (§9)

- 사전 snapshot: 두 행의 전체 컬럼을 `row_to_json` 으로 확보(로컬 보관, 커밋 제외). 본 문서 §3·§4 표가 동일 내용이다.
- 단일 transaction + guard 3종(canonical 존재 2 / downstream 참조 0) + `expected == actual` 검증.

| 대상 | expected | actual |
|---|---:|---:|
| `organization_service_enrollments` id `e874076f…` (`cosmetics`) DELETE | 1 | **1** |
| `organization_product_listings` id `29d91f79…` (`kpa`) DELETE | 1 | **1** |

- 사후: `organization_service_enrollments` 21 → **20**, `organization_product_listings` 29 → **28**, legacy `cosmetics` 0 / legacy `kpa` 0.

### rollback SQL (필요 시)

```sql
INSERT INTO organization_service_enrollments
  (id, organization_id, service_code, status, enrolled_at, config, created_at, updated_at)
VALUES ('e874076f-1703-42e2-9e07-a97e4e8c168c','31e926a0-8b41-4af6-8a22-b32d3ad880e6',
        'cosmetics','active','2026-05-17 12:09:27.544157','{}'::jsonb,
        '2026-05-17 12:09:27.544157','2026-05-17 12:09:27.544157');

INSERT INTO organization_product_listings
  (id, organization_id, service_key, is_active, created_at, updated_at, master_id, offer_id,
   source_type, source_id, status)
VALUES ('29d91f79-794a-4dba-b8f6-81c2914cf3ba','9c87f46b-57a1-4afe-80bd-60782c49ce96',
        'kpa', true, '2026-08-14 02:06:32.154613+00','2026-08-14 02:06:32.154613+00',
        '7469448d-d5e1-4a13-8b73-cdd35bc99726','61db213b-547d-4473-9f28-a0586eb2524d',
        'event-offer','02003281-0545-4854-875e-fea37f940c44','pending');
```

## 8. 정리 후 무결성 검증

| 검사 | 결과 |
|---|---|
| enrollment dual-key org (cosmetics∧k-cosmetics / kpa∧kpa-society) | **0** |
| enrollment orphan (`platform_services` / `organizations`) | 0 / 0 |
| OPL orphan (org / master) | 0 / 0 |
| OPL 동일 (org, offer) 다중행 | 1건 — `9c87f46b…` × `61db213b…` 가 `glycopharm` / `k-cosmetics` / `kpa-society` 3행 (**서비스별 정상 진열**, legacy key 아님) |
| `service_memberships` dual-key 사용자 | 0 |
| `platform_store_slugs` orphan | 0 |
| `product_approvals` orphan org | 1건 (`a0000000-…-0001` bridge org) — **사전 존재**, 본 WO 범위 밖(§9 별도 WO 제안) |

## 9. 회귀 검증

### 코드
- Jest(api-server 전체): **150 suites / 2366 tests PASS** (신규 spec 4 포함)
- `tsc --noEmit`: 변경 4파일 오류 **0**. 잔여 오류는 worktree 에서 빌드되지 않은 workspace 패키지의 subpath 모듈 해석(`@o4o/forum-core/entities` 등)으로 코드 변경과 무관하며 본 WO 이전부터 동일하다.

### 프로덕션 API (데이터 정리 직후, `api.neture.co.kr`)

| 대상 | 결과 |
|---|---|
| K-Cos 로그인(`k-cosmetics`) → `/cosmetics/store-hub/overview` · `/capabilities` | 200 / 200 |
| K-Cos `/store/handled-products` · `/store/local-products` · `/cosmetics/event-offers` | 200 / 200 / 200 |
| KPA 로그인(`kpa-society`) → `/kpa/store-hub/overview` · `/capabilities` | 200 / 200 |
| KPA `/store/handled-products` · `/store/local-products` | 200 / 200 |
| KPA `/kpa/pharmacy/products/orderable` | 200 — canonical `64ae4184…` 정상 반환 |
| GlycoPharm 로그인 → `/glycopharm/store-hub/overview` | 200 (타 서비스 영향 0) |

> 코드 수정분은 본 커밋 push 후 CI/CD 배포로 반영된다. 위 스모크는 **데이터 정리에 대한 회귀 확인**이다.

## 10. 미결·후속 제안 (본 WO 범위 밖)

1. `store-handled-products` 는 `service_key` 필터가 없어 다중 서비스 등록 매장에서 **같은 master 가 서비스 수만큼 반복 노출**된다(현재 `9c87f46b…` 3회). master 기준 dedupe 정책 필요.
2. `product_approvals` 의 bridge org(`a0000000-…-0001`) orphan 1건 — `organizations` 미존재. approval-v2 가 SAVEPOINT 로 감싸는 알려진 케이스이나 데이터 정합 판단은 별도 WO.
3. `platform_store_slugs` 는 slug 축(`kpa`/`cosmetics`)을 유지한다. 본 WO §11 에 따라 **변경하지 않았다**.

## 11. 변경/미변경

- 변경: 코드 3파일 + 테스트 1파일, 운영 데이터 2행 DELETE.
- 미변경: schema · migration · FK · role key · slug key · RBAC · frontend · 그 외 테이블.

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(§10-1, §10-2)
