# CHECK-O4O-CROSS-SERVICE-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1

- **WO**: `WO-O4O-CROSS-SERVICE-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1`
- **선행**: [`CHECK-O4O-KPA-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1`](CHECK-O4O-KPA-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1.md) (`d9771f7e2`)
- **기준 commit**: `0a61957f7`
- **일자**: 2026-08-18
- **판정**: **PASS** — orphan 3건 SAFE_TO_DELETE 정리 완료, 재발 write path 결함 1건 최소 수정

---

## 1. 전체 census — `platform_store_slugs`

정리 **전** 전체 모집단 (service_key 별):

| service_key | 총 slug | 정상 | ORPHAN |
|---|---:|---:|---:|
| cosmetics | 1 | 0 | **1** |
| glycopharm | 2 | 0 | **2** |
| kpa | 7 | 7 | 0 |
| pharmacy-hub | 6 | 6 | 0 |

### 1-1. KCos / GP 전 row 상세 (미조사 0)

| service_key | slug | store_id | is_active | org 존재 | enrollment | member | role_assignment | listing/product/content/tablet/playlist/QR | created_at |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| glycopharm | `glycopharm-test-pharmacy` | `d43804b0…` | true | **없음** | 0 | 0 | 0 | 0 | 2026-03-07 |
| glycopharm | `e2e-test-pharmacy-20260414` | `c7c0af9e…` | true | **없음** | 0 | 0 | 0 | 0 | 2026-04-14 |
| cosmetics | `k-1` | `9434f2f1…` | true | **없음** | 0 | 0 | 0 | 0 | 2026-04-29 |

### 1-2. 분류 집계 (정리 전)

```
KCos slug 전체: 1 / GP slug 전체: 2
정상: 0
ORPHAN_ORGANIZATION_MISSING: 3   (KCos 1 + GP 2)
ENROLLMENT_MISSING: 해당 없음 (organization 자체가 없어 하위 판정 불가)
OWNER_LINK_MISSING: 3            (위 3건과 동일 집합)
INACTIVE_LEGACY: 0               (3건 모두 is_active = true)
중복 slug: 0                     (UNIQUE(slug) 제약)
동일 org 다중 active slug: 0
미조사: 0
```

### 1-3. 논리 참조 전수 스캔 (FK 없는 참조 포함)

3개 `store_id` + 3개 slug row `id` + 3개 slug 문자열을 **DB 전체**에서 스캔했다.

- 스캔 범위: `public` / `cosmetics` / `neture` 3 스키마
- uuid 컬럼 **831개**, text·varchar·json·jsonb 컬럼 **1,667개**
- `k-1` 은 문자열이 짧아 정규식 대신 **완전일치 + JSON 토큰** 으로 별도 스캔

**결과: `platform_store_slugs` 자기 자신 외 참조 0건.**
`platform_store_slug_history` 는 전체 row 0건이라 잔재도 없다.

### 1-4. 역방향 관찰 — slug 미보유 정상 조직 (참고, 이번 범위 외)

| service_code | organization | slug 보유 |
|---|---|---|
| glycopharm | `c92b857f` 테스트 약국 | glycopharm slug 없음 (`kpa` slug 만 보유) |
| glycopharm | `13c08a86` [E2E_TEST] 글라이코팜 검증 약국 | 없음 |
| k-cosmetics / cosmetics | `31e926a0` 테스트 K-Cosmetics 매장 | 없음 (`cosmetics_stores.slug` 컬럼에만 존재) |
| k-cosmetics | `83ff96c7` 테스트 뷰티샵 | 없음 |

→ 정리 후 KCos·GP 의 `platform_store_slugs` row 는 **0** 이 된다. 이는 orphan 삭제 때문이 아니라
**원래 정상 slug 가 0 이었기 때문**이다. slug backfill 은 이번 WO 범위(§9 slug 체계 리팩터링 금지)가 아니라 별도 WO 로 제안한다(§7).

---

## 2. orphan 판정 (§4)

3건 모두 **SAFE_TO_DELETE**.

| slug | 판정 | 근거 |
|---|---|---|
| `glycopharm-test-pharmacy` | SAFE_TO_DELETE | 이름 자체가 테스트 잔재. 은퇴한 seed route(`/api/v1/ops/seed-store-hub`, `33bccc567` 생성 → `4971381fb` 제거)가 같은 slug 문자열을 사용. organization·member·role·실데이터 참조 0 |
| `e2e-test-pharmacy-20260414` | SAFE_TO_DELETE | 날짜 포함 E2E 잔재. 참조 0 |
| `k-1` | SAFE_TO_DELETE | cosmetics 매장 생성 경로의 `generateUniqueSlug()` 자동 채번 결과. 대응 `cosmetics.cosmetics_stores` row·organization 모두 부재. 참조 0 |

`RESTORE_ORGANIZATION_REQUIRED` / `KEEP_LEGACY_WITH_REASON` / `UNKNOWN_STOP` 해당 0건.
**복구해야 할 실제 운영데이터 없음** — 세 건 모두 조직·회원·주문·콘텐츠·태블릿·플레이리스트·QR 어디에도 연결이 없다.

---

## 3. READ 소비처 census (§5)

`platform_store_slugs` 를 읽는 경로 전수 (`findBySlug` / `findOldSlugRedirect` / raw SQL):

| 소비처 | 해석 방식 | orphan 영향 |
|---|---|---|
| `routes/platform/store-public/store-public-utils.ts` `resolvePublicStore()` — 통합 공개 매장 라우트(`/api/v1/stores/:slug/*`, 태블릿 포함) 전부 | slug → `organizations` 재확인 | **404** |
| `routes/glycopharm/controllers/store.controller.ts` `findOrgBySlug()` | 조직 재확인 | **404** |
| `routes/glycopharm/repositories/glycopharm.repository.ts` `findPharmacyBySlug` / `findActivePharmacyBySlug` | 조직 재확인 | **404** |
| `routes/o4o-store/controllers/{blog,pop,qr,video,layout,kpa-store-template,store-settings}.controller.ts` | 조직 재확인 | **404** |
| `routes/o4o-store/controllers/store-hub.controller.ts` | `store_id = <organizationId>` 역방향 조회 | **무영향** (orphan 은 매칭 자체가 안 됨) |
| `controllers/operator/StoreConsoleController.ts`, `controllers/pharmacy-hub/store-organization.resolver.ts` | 조직 기준 역방향 | **무영향** |
| `routes/platform/store-policy.routes.ts:88` | `slugRecord.storeId` 를 **조직 확인 없이** 소유자 판정에 사용 | 404 가 아니라 **403 FORBIDDEN** |
| `routes/platform/store-policy.routes.ts:601` `GET /api/v1/stores/resolve/:slug` | slug 레지스트리만 조회 | **잘못된 공개 노출** — orphan 에 `found: true` 응답 |

정리 전 실측:

```
GET /api/v1/stores/resolve/glycopharm-test-pharmacy   → 200 {"found":true,"serviceKey":"glycopharm"}
GET /api/v1/stores/resolve/e2e-test-pharmacy-20260414 → 200 {"found":true,"serviceKey":"glycopharm"}
GET /api/v1/stores/resolve/k-1                        → 200 {"found":true,"serviceKey":"cosmetics"}
GET /api/v1/stores/{위 3건}                            → 404
```

---

## 4. WRITE · 삭제 경로 census (§6)

### 4-1. slug 생성 경로 (`reserveSlug`) — 7곳

| 호출부 | `storeId` 인자 | 축 |
|---|---|---|
| `routes/kpa/controllers/organization.controller.ts` | `saved.id` | organizations ✅ |
| `routes/kpa/services/kpa-store-organization.provisioning.ts` | `orgResult.id` | organizations ✅ |
| `routes/glycopharm/services/glycopharm.service.ts` | `org.id` | organizations ✅ |
| `routes/glycopharm/controllers/admin.controller.ts` | `createdOrg.id` | organizations ✅ |
| `routes/glycopharm/controllers/store-applications.controller.ts` | `createdOrg.id` | organizations ✅ |
| `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | `organizationId` | organizations ✅ |
| `routes/cosmetics/services/cosmetics-store.service.ts` | ~~`(savedStore as any).id`~~ → `orgId` | **cosmetics_stores → organizations (이번 수정)** |

**확정 결함**: cosmetics 만 `cosmetics.cosmetics_stores.id` 를 `store_id` 에 넣고 있었다. 결과는 두 가지다.

1. 공개 조회(`resolvePublicStore`)가 `organizations` 를 찾으므로 **정상 매장이어도 영구 404**
2. 조직이 삭제돼도 slug 정리(`OrganizationService.deleteOrganization`)가 `store_id` 로 매칭되지 않아 **orphan 이 그대로 남는다** — 프로덕션 `k-1` 이 정확히 이 형태

→ `storeId: orgId` 로 최소 수정. 기존 데이터 영향 0 (cosmetics slug row 는 정리 후 0건, 기존 매장 2곳은 애초에 레지스트리 row 없음).

### 4-2. organization 삭제 경로

| 경로 | slug 정리 | 비고 |
|---|:--:|---|
| `packages/organization-core/src/services/OrganizationService.ts` `deleteOrganization()` | ✅ | 선행 WO `d9771f7e2` 에서 같은 트랜잭션 정리 추가 (기준 commit 에 포함) |
| `packages/organization-core/src/lifecycle/uninstall.ts` | — | 전체 uninstall 전용 |
| migration 6건 (Seed / Cleanup Demo / OrgBridge / RepairForumGlycopharm) | — | 일회성·과거 시점 |
| `/api/v1/ops/seed-store-hub` (UUID prefix LIKE 대량 DELETE) | ❌ | **`4971381fb` 에서 은퇴 완료** — 과거 재발원인, 현재 부재 |
| glycopharm / cosmetics 서비스 전용 삭제 라우트 | — | **존재하지 않음**. 두 서비스 모두 조직 hard delete API 없음 (`router.delete` 는 featured-product·resource·forum·member 뿐) |
| `cosmetics.cosmetics_stores` 삭제 경로 | — | 런타임 코드 0건 |

→ KCos·GP 는 별도 delete path 를 갖지 않으며, 조직 삭제는 canonical `deleteOrganization()` 하나뿐이다.
구조적 정본 해법인 `platform_store_slugs.store_id` FK(`ON DELETE CASCADE`) 는 schema 변경이라 §9 에 의해 이번 범위 밖 — §7 후속 WO 로 유지한다.

---

## 5. Production cleanup (§7)

정리 전 정확 스냅샷:

```
7ae3ea7b-2998-44ae-b7b2-b6818f576959 | glycopharm-test-pharmacy   | d43804b0-b0c5-4998-b10c-4eb4b2d1998b | glycopharm | true | 2026-03-07 05:20:32.165702+00
51926ac1-3837-4349-bf00-b0d3db400525 | e2e-test-pharmacy-20260414 | c7c0af9e-52b1-4905-931e-a46074bb888a | glycopharm | true | 2026-04-14 13:18:41.781257+00
63adf8df-fa31-49fe-ac61-cbd0abaa9616 | k-1                        | 9434f2f1-1c84-45c7-a743-1bf04da3c346 | cosmetics  | true | 2026-04-29 02:47:18.865694+00
```

실행 SQL (단일 트랜잭션, 대상 고정 후 삭제):

```sql
BEGIN;
CREATE TEMP TABLE _tgt AS
SELECT id, slug, store_id, service_key, is_active, created_at, updated_at
FROM platform_store_slugs p
WHERE p.service_key IN ('cosmetics','glycopharm')
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = p.store_id)
  AND NOT EXISTS (SELECT 1 FROM cosmetics.cosmetics_stores cs WHERE cs.id = p.store_id);
-- TARGET_COUNT = 3
WITH d AS (DELETE FROM platform_store_slugs p USING _tgt t WHERE p.id = t.id RETURNING p.id)
SELECT count(*) FROM d;   -- DELETED = 3
COMMIT;
```

- 예상 3 == 실제 삭제 3 → COMMIT (불일치 시 ROLLBACK 하도록 대상을 먼저 고정)
- `organizations` · `organization_service_enrollments` · `organization_members` · listing · content 등 **연관 실데이터는 일절 삭제하지 않았다**
- **rollback SQL 준비 완료, 사용하지 않았다**:

```sql
INSERT INTO platform_store_slugs (id, slug, store_id, service_key, is_active, created_at, updated_at) VALUES
 ('7ae3ea7b-2998-44ae-b7b2-b6818f576959','glycopharm-test-pharmacy','d43804b0-b0c5-4998-b10c-4eb4b2d1998b','glycopharm',true,'2026-03-07 05:20:32.165702+00','2026-03-07 05:20:32.165702+00'),
 ('51926ac1-3837-4349-bf00-b0d3db400525','e2e-test-pharmacy-20260414','c7c0af9e-52b1-4905-931e-a46074bb888a','glycopharm',true,'2026-04-14 13:18:41.781257+00','2026-04-14 13:18:41.781257+00'),
 ('63adf8df-fa31-49fe-ac61-cbd0abaa9616','k-1','9434f2f1-1c84-45c7-a743-1bf04da3c346','cosmetics',true,'2026-04-29 02:47:18.865694+00','2026-04-29 02:47:18.865694+00');
```

---

## 6. 정리 후 검증 (§8)

| 항목 | 결과 |
|---|---|
| orphan slug (전 service_key, organizations + cosmetics_stores 양축 대조) | **0** |
| 잔여 slug | `kpa` 7 / `pharmacy-hub` 6 — 정리 전과 동일 |
| 중복 slug / 동일 org 다중 active slug | 0 / 0 |
| 삭제된 3 slug 공개 응답 | `resolve` 200→**404**, `/stores/:slug` 404 유지 |
| 잔여 13 slug 전수 공개 smoke | `resolve` **13/13 200**, `/api/v1/stores/:slug` **13/13 200** |
| GlycoPharm 로그인 → store-hub | `login(serviceKey=glycopharm)` 200 / `overview` 200 `data:null` / `capabilities` 403 `STORE_OWNER_REQUIRED` |
| K-Cosmetics 로그인 → store-hub | `login(serviceKey=k-cosmetics)` 200 / `overview` 200 `data:null` / `capabilities` 403 `STORE_OWNER_REQUIRED` |
| 다른 서비스 영향 | 없음 (kpa·pharmacy-hub 회귀 0) |

> GP·KCos smoke 결과는 `docs/local/TEST-ACCOUNTS.local.md` 에 **이번 작업 이전부터 기록된 baseline 과 동일**하다
> (해당 문서: "GlycoPharm·K-Cosmetics 매장 스코프 검증에 현재 사용 가능한 store_owner 계정은 없다").
> 즉 이번 정리로 인한 회귀가 아니며, store_owner 해석은 slug 가 아니라 `organization_service_enrollments` 축을 쓰므로 slug 삭제의 영향을 받지 않는다.

---

## 7. 잔존 위험 · 후속 WO 제안

| # | 내용 | 이번 범위 제외 사유 |
|---|---|---|
| 1 | `platform_store_slugs.store_id` / `platform_store_slug_history.store_id` 에 FK(`ON DELETE CASCADE`) 부재 — orphan 의 구조적 근본 원인 | schema·migration 변경 (§9 금지) |
| 2 | `GET /api/v1/stores/resolve/:slug` 가 조직 존재를 확인하지 않아 orphan 에 `found: true` 를 반환 — 현재 orphan 0 이라 실피해 없음 | API 응답 계약 변경 |
| 3 | `store-policy.routes.ts:88` 이 orphan 에 404 대신 403 반환 | 동일 |
| 4 | GP 2곳·KCos 2곳 정상 조직이 자기 service_key slug 미보유 → 두 서비스 공개 매장 주소 사용 불가 | slug backfill = 데이터 생성, §9 slug 체계 범위 |
| 5 | cosmetics enrollment `service_code` 가 `cosmetics` / `k-cosmetics` 두 값 혼재 | serviceKey 정책 (§9 금지) |

---

## 8. 검증 · Git

- `apps/api-server` typecheck: **PASS** (`tsc --noEmit`, 0 error)
- `apps/api-server` Jest **전체**: **138 suites / 2,178 tests PASS**
  - 신규 `src/__tests__/store-slug-store-id-axis.spec.ts` 4 tests PASS (reserveSlug 축 census)
  - 선행 `src/__tests__/organization-delete-slug-cleanup.spec.ts` 3 tests PASS
- DB schema·migration 변경: **없음** (데이터 3 row DELETE 만)

---

## 9. 문서 정합

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건
```
