# CHECK — WO-O4O-KPA-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1

**작업:** KPA `platform_store_slugs` orphan 전수조사 → 원인 감사 → SAFE_TO_DELETE 판정 → 재발 방지 최소 수정 → 프로덕션 정리 → 독립검증
**기준 commit:** `0bb45df0a`
**작업공간:** worktree `/c/tmp/o4o-users-timestamp`, branch `work/kpa-orphan-slug`
**대상 DB:** 프로덕션 `o4o_platform` (cloud-sql-proxy `127.0.0.1:5452`, user `o4o_api_v2`)
**성격:** read-only census → 코드 최소 수정 1건 + 회귀 spec 1건 → 프로덕션 DELETE 2행

---

## 1. 왜 이 작업이 필요했는가

선행 CHECK([CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1](CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1.md))
가 KPA slug 2건(`neture-3lifezone`, `phase0-테스트약국`)의 `store_id` 가 존재하지 않는 organization 을
가리킨다고 보고했고, 그 때문에 enrollment 를 만들 수 없어 **미해결 잔여 항목**으로 남아 있었다.

---

## 2. §2 — KPA slug 전체 모집단 census (수정 전)

`platform_store_slugs WHERE service_key='kpa'` = **9건**. 미조사 0.

| slug | store_id(8) | is_active | org 존재 | org 이름 | org type | org isActive | enrollment | member | 생성일 |
|---|---|:--:|:--:|---|---|:--:|---|:--:|---|
| 네뚜레-약국 | `9c87f46b` | t | ✅ | 테스트 약국 | pharmacy | true | kpa-society:active | 2 | 2026-05-19 |
| 테스트-약국 | `c92b857f` | t | ✅ | 테스트 약국 | pharmacy | true | kpa-society:active, glycopharm:active | 0 | 2026-05-19 |
| 피앤디-약국 | `c5982508` | t | ✅ | 피앤디 약국 | pharmacy | true | kpa-society:active | 1 | 2026-07-09 |
| 중앙약국 | `8712bff0` | t | ✅ | 중앙약국 | pharmacy | true | kpa-society:active | 1 | 2026-05-21 |
| e2e | `ec596c46` | t | ✅ | 테스트 약국(E2E) | association | true | kpa-society:active | 0 | 2026-05-15 |
| renagang-약국 | `aed9eda9` | t | ✅ | Renagang 약국 | pharmacy | true | kpa-society:active | 0 | 2026-05-18 |
| sohae-약국 | `c9beb4a2` | t | ✅ | Sohae 약국 | pharmacy | true | kpa-society:active | 1 | 2026-05-18 |
| **neture-3lifezone** | `843bfd17` | t | ❌ | — | — | — | — | 0 | 2026-04-16 |
| **phase0-테스트약국** | `8596a54f` | t | ❌ | — | — | — | — | 0 | 2026-04-16 |

**분류**

```
KPA slug 전체: 9
정상: 7
ORPHAN_ORGANIZATION_MISSING: 2
ENROLLMENT_MISSING: 0        (org 이 존재하는 7건 모두 kpa-society enrollment 보유)
OWNER_LINK_MISSING: 0        (아래 주 참조)
INACTIVE/LEGACY: 0           (is_active=false 인 KPA slug 없음)
미조사: 0
```

- 중복 slug: **0** / 동일 organization 에 active slug 2개 이상: **0**
- `organization_members` 가 0인 KPA slug 3건(테스트-약국·e2e·renagang-약국)이 있으나, organization 과
  enrollment 는 정상이며 owner 는 `role_assignments('kpa:store_owner')` 축으로도 성립한다.
  slug 정합성 결함이 아니므로 OWNER_LINK_MISSING 으로 세지 않고 **관찰 사항**으로만 기록한다.

**타 서비스 orphan (§8 변경 금지 — 보고만)**

| service_key | slug | store_id(8) | 생성일 |
|---|---|---|---|
| cosmetics | k-1 | `9434f2f1` | 2026-04-29 |
| glycopharm | e2e-test-pharmacy-20260414 | `c7c0af9e` | 2026-04-14 |
| glycopharm | glycopharm-test-pharmacy | `d43804b0` | 2026-03-07 |

---

## 3. §3 — runtime READ 소비처 census

`platform_store_slugs` / `PlatformStoreSlug` 참조 소스는 41개(dist 제외, migration·frontend 포함).
그 중 **런타임 읽기 경로**는 방향이 둘뿐이다.

### 3-1. `organizations` → slug (표시용)

`StoreConsoleController`(운영자 매장 콘솔), pharmacy-hub `store-organization.resolver`,
glycopharm `cockpit.controller`, `pharmacy-info.controller`, `store-hub.controller`,
`store-qr.service`, `PharmacyHubStoreProvisioningService` 등.

이미 존재하는 organization 에서 출발해 slug 를 붙이는 형태(`SELECT slug ... WHERE store_id = $1`)라
orphan slug 는 결과에 **등장하지 않는다.** → **무영향**

### 3-2. slug → `organizations` (공개·소유자 경로)

`resolvePublicStore`(unified store public: 홈·상품·콘텐츠·태블릿 전체), blog / pop / qr / video /
layout / template / store-settings controller, glycopharm store controller·repository.

모두 `findBySlug` 직후 **organization 실재(+`isActive`)를 다시 조회**하고 없으면 404 로 끝난다.
→ **404** (잘못된 store 노출·잘못된 organization 후보 생성 없음)

### 3-3. 조직 후보 산출

`utils/store-organization.resolver.ts` 의 서비스↔조직 linkage 는
`FROM organizations o WHERE EXISTS (SELECT 1 FROM platform_store_slugs s ...)` 형태다.
organization 이 없으면 후보 자체가 만들어지지 않는다. → **무영향**

### 3-4. 유일한 예외

`routes/platform/store-policy.routes.ts:88` `resolveStoreOwner()` 는 slug 행의 `storeId` 로 바로
`isStoreOwner()` 를 호출한다(organization 실재 확인 없음). orphan slug 에 대해서는
소유자가 있을 수 없으므로 **404 대신 403 FORBIDDEN** 이 나간다. 데이터 노출은 없다.
→ **403** (경미. 본 WO 에서 정리한 2건이 사라져 실측 재현 대상 자체가 없어졌다)

### 3-5. 실사용 여부 (orphan 2건)

- `platform_store_slug_history` 에 두 slug 문자열 없음
- **DB 전체 text 컬럼 1,349개 스캔** — 두 slug 문자열은 `platform_store_slugs.slug` **외 어디에도 없다**
- 프로덕션 실측: `GET /api/v1/stores/neture-3lifezone` → `404 STORE_NOT_FOUND` (정리 전·후 동일)

---

## 4. §4 — WRITE / 생성 경로 감사

### 4-1. 생성 경로 (`reserveSlug`) — 6곳

| 경로 | 순서 | orphan 생성 가능성 |
|---|---|:--:|
| `routes/kpa/services/kpa-store-organization.provisioning.ts:126` | org 저장 → member → role → enrollment → **slug(비차단)** | 없음 |
| `routes/kpa/controllers/organization.controller.ts:180` | `orgRepo.save()` 커밋 후 slug | 없음 |
| `routes/cosmetics/services/cosmetics-store.service.ts:250` | org 생성 후 | 없음 |
| `routes/glycopharm/services/glycopharm.service.ts:149` | org 생성 후 | 없음 |
| `routes/glycopharm/controllers/admin.controller.ts:347` | org 생성 후 | 없음 |
| `routes/glycopharm/controllers/store-applications.controller.ts:651` | org 생성 후 | 없음 |
| `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts:398` | org 생성 후(멱등) | 없음 |

모두 **organization 을 먼저 커밋한 뒤** slug 를 예약한다. slug 실패는 비차단이므로
"slug 만 남고 org 는 없는" 상태는 생성 방향에서 만들어지지 않는다.
`StoreSlugService.reserveSlug()` 가 `storeId` 실재를 검증하지 않는 것은 사실이나,
이번 orphan 의 원인은 아니다(아래 4-3).

### 4-2. migration 경로

`20260416300000-BackfillMissingKpaSlugs` 가 두 orphan 의 **생성 시각과 정확히 일치**한다
(둘 다 `2026-04-16 03:54:35.700204+00`, 완전 동일 → 단일 배치 INSERT).
이 migration 은 `FROM organizations o JOIN organization_service_enrollments ose ...` 로
**실재하는 org 만** 대상으로 삼는다. → **생성 시점에는 두 organization 이 실제로 존재했다.**

보강 증거: `843bfd17` 은 2026-04-17 `kpa_operator_audit_logs` 에 `STOREFRONT_CONFIG_UPDATED` 기록이 있다.

### 4-3. 삭제 경로 — **실제 원인**

`platform_store_slugs.store_id` 에는 **FK 가 없다.**

```
platform_store_slugs_pkey / platform_store_slugs_slug_key UNIQUE(slug)
idx_platform_store_slugs_slug / idx_platform_store_slugs_service_store
→ store_id 에 대한 FOREIGN KEY 없음
```

대조군: `organization_service_enrollments_organization_id_fkey`
= `FOREIGN KEY (organization_id) REFERENCES organizations(id) **ON DELETE CASCADE**`
→ 그래서 프로덕션 orphan enrollment 는 **0건**이다. 같은 계열에서 slug 테이블만 보호되지 않았다.

organization 을 hard delete 하는 코드는 3가지뿐이다.

| 위치 | 상태 | slug 정리 |
|---|---|:--:|
| `packages/organization-core/src/services/OrganizationService.ts:deleteOrganization()` | **api-server 어디에도 mount 되지 않음** (`OrganizationController` 미등록) | ❌ 없었음 |
| `packages/organization-core/src/lifecycle/uninstall.ts` | 패키지 uninstall 전용 (`DELETE FROM organizations` 전량) | 범위 외 |
| 일부 one-off migration | 2026-04-16 **이후** organizations 를 지우는 migration 은 `RepairForumGlycopharmOrganization`(FORUM_GLYCOPHARM 한정) 뿐 | 해당 없음 |

즉 두 organization 은 **런타임 코드가 아닌 경로**(수동 SQL / 콘솔 테스트 데이터 정리)로 삭제됐고,
FK 부재 때문에 slug 만 남았다. `phase0-테스트약국`(`8596a54f`) 이 삭제된 E2E 테스트 조직이라는 사실은
[CHECK-O4O-KPA-SIGNAGE-DANGLING-SNAPSHOT-REPAIR-V1](CHECK-O4O-KPA-SIGNAGE-DANGLING-SNAPSHOT-REPAIR-V1.md) 이 이미 독립적으로 기록했다.

### 4-4. 적용한 최소 수정

**코드로 막을 수 있는 유일한 잠재 재발원**인 `deleteOrganization()` 을 고쳤다.

- 삭제를 **트랜잭션**으로 감싼다(기존에는 parent 카운터 감소와 삭제가 서로 다른 트랜잭션이었다).
- 같은 트랜잭션에서 `platform_store_slugs` · `platform_store_slug_history` 의 `store_id` 행을 함께 지운다.
- `organization-core` 는 `platform-core` 에 의존하지 않으므로 entity import 없이
  `to_regclass` 로 테이블 존재를 확인한 뒤 raw SQL(파라미터 바인딩)로만 접근한다.
  두 테이블이 없는 배포에서도 조직 삭제는 계속 성공한다.

**FK / `ON DELETE CASCADE` 추가는 하지 않았다.** 구조적으로는 그것이 정답이지만
WO §8 이 schema·migration 변경을 "필수임이 증명되면 **중지 후 보고**" 로 규정했다.
→ **별도 WO 제안**(§8-1).

---

## 5. §5 — orphan 2건 판정

### 5-1. `neture-3lifezone`

| 항목 | 결과 |
|---|---|
| slug row | `9ee521ae-d52c-4b47-9515-9ba288f4c62a` / `843bfd17-235d-4a8e-9977-aa933fc2b486` / `kpa` / active / 2026-04-16 03:54:35.700204+00 |
| org 과거 존재 | ✅ (migration 대상 조건 + 2026-04-17 audit log) |
| 현재 org | 없음 |
| member / role_assignment / enrollment / tablet / listing / playlist / kpa_store_contents | 전부 **0** |
| DB 전체 uuid 컬럼 829개 스캔 | `platform_store_slugs.store_id` 외 유일 참조 = `kpa_operator_audit_logs.target_id` 1건 (불변 이력, operator `e709bcd9` 는 `users` 에도 없음) |
| slug 문자열 참조 | text 컬럼 1,349개 중 0 |
| frontend·API 실사용 | 404 |
| **판정** | **SAFE_TO_DELETE** |

### 5-2. `phase0-테스트약국`

| 항목 | 결과 |
|---|---|
| slug row | `5001835e-c922-4a25-8272-4ccd5f59ea3f` / `8596a54f-2812-4cb9-933c-a92e80e95b6e` / `kpa` / active / 2026-04-16 03:54:35.700204+00 |
| org 과거 존재 | ✅ (동일 근거 + 선행 signage CHECK 가 "이미 삭제된 조직"으로 기록) |
| 현재 org | 없음 |
| member / role_assignment / enrollment / tablet / listing / kpa_store_contents | 전부 **0** |
| `store_playlists` | 5건 (E2E/Debug 3 inactive + "테스트용"·"테스트 2" 2건) — **playlist_items 는 0건** (선행 signage 보정 WO 로 마지막 item 제거됨) |
| `catalog_products.created_by` | 1건 (테스트 CGM, 2026-01-12) — 저작자 필드이며 slug 참조 아님 |
| slug 문자열 참조 | text 컬럼 1,349개 중 0 |
| frontend·API 실사용 | 삭제된 org → `resolvePublicStore` 404. 태블릿 공개 경로(`/:slug/tablet/*`)도 동일 404 → **playlist 는 공개 재생 불가** |
| **판정** | **SAFE_TO_DELETE** |

> **§9 중지 조건 판단**: 남은 `store_playlists` 5건은 (a) 삭제된 E2E 테스트 조직 소속, (b) item 0개,
> (c) 공개 경로에서 도달 불가 이므로 "실제 운영 데이터"가 아니다. 또한 이번 정리 범위는
> **orphan slug 행 한정**이며 playlist / catalog_products 는 **손대지 않는다**. 중지 조건 미해당.

---

## 6. §6 — 프로덕션 cleanup

트랜잭션 + 예상/실제 행 수 이중 검증. 불일치 시 `RAISE EXCEPTION` → 자동 ROLLBACK.

```sql
BEGIN;
CREATE TEMP TABLE _target ON COMMIT DROP AS
SELECT s.* FROM platform_store_slugs s
  LEFT JOIN organizations o ON o.id = s.store_id
 WHERE s.service_key = 'kpa' AND o.id IS NULL
   AND s.id IN ('9ee521ae-…','5001835e-…');
-- n <> 2 → EXCEPTION / DELETE 후 ROW_COUNT <> 2 → EXCEPTION
COMMIT;
```

실행 결과: `target_count=2`, `deleted_rows=2`, **COMMIT**.

**rollback SQL (준비했고 사용하지 않았다)**

```sql
INSERT INTO platform_store_slugs (id, slug, store_id, service_key, is_active, created_at, updated_at) VALUES
('9ee521ae-d52c-4b47-9515-9ba288f4c62a','neture-3lifezone','843bfd17-235d-4a8e-9977-aa933fc2b486','kpa',true,'2026-04-16 03:54:35.700204+00','2026-04-16 03:54:35.700204+00'),
('5001835e-c922-4a25-8272-4ccd5f59ea3f','phase0-테스트약국','8596a54f-2812-4cb9-933c-a92e80e95b6e','kpa',true,'2026-04-16 03:54:35.700204+00','2026-04-16 03:54:35.700204+00');
```

범위 준수: `platform_store_slugs` 2행만 삭제. organization · playlist · catalog_products ·
audit log · 타 서비스 slug 는 **미변경**.

---

## 7. §7 — 정리 후 회귀 검증

### 7-1. 데이터 census (post)

| 항목 | 값 |
|---|:--:|
| KPA slug 전체 | 7 |
| KPA orphan slug | **0** |
| KPA active enrollment 조직 | 7 |
| enrollment 는 있는데 active slug 없는 조직 | **0** |
| active slug 는 있는데 enrollment 없는 조직 | **0** |
| 중복 slug (전 서비스) | 0 |
| 동일 org 다중 active KPA slug | 0 |
| `platform_store_slug_history` orphan | 0 |
| 타 서비스 orphan slug | 3 (§2, 범위 외 — 미변경) |

KPA 는 **organization 7 ↔ enrollment 7 ↔ slug 7 완전 1:1** 이 됐다.

### 7-2. store_owner organization resolution

`kpa:store_owner` 활성 보유자 6명의 조직 후보 수:

```
028854c2 → 1    3f5582bc → 1    5853b6c4 → 1
6967ebe0 → 1    cfd2a5e7 → 1    44fa7733 → 0
```

**ambiguous(2 이상) 0 유지.** `44fa7733` 은 `users.status='suspended'` 이고
`organization_members` 자체가 없다 — 이번 정리와 무관한 기존 상태다(삭제한 slug 2건의 member 는 0이었다).

### 7-3. 프로덕션 실사용 smoke (KPA store_owner `renagang21@gmail.com`, serviceKey `kpa-society`)

| 요청 | 결과 |
|---|---|
| `POST /api/v1/auth/login` | 200, `role: kpa:store_owner`, user `6967ebe0` |
| `GET /api/v1/auth/status` | 200 authenticated |
| `GET /api/v1/store/handled-products` | 200, 실데이터 반환 |
| `GET /api/v1/store/product-requests` | 200, 실데이터 반환 |
| `GET /api/v1/store/local-products` | 200 (items 0 — 기존 상태) |
| `GET /api/v1/stores/네뚜레-약국` | 200 |
| `GET /api/v1/stores/sohae-약국` | 200 |
| `GET /api/v1/stores/neture-3lifezone` | 404 `STORE_NOT_FOUND` (정리 전과 동일) |

403 / 409 / white screen 회귀 **0**. 타 서비스(glycopharm·cosmetics·pharmacy-hub) slug 는 미변경.

---

## 8. 잔존 위험 · 후속 제안

### 8-1. `platform_store_slugs.store_id` FK 부재 (구조)

코드 수정은 `deleteOrganization()` 경로만 막는다. 수동 SQL·다른 삭제 경로는 여전히 orphan 을 만들 수 있다.
근본 해결은 `FOREIGN KEY (store_id) REFERENCES organizations(id) ON DELETE CASCADE`
(= enrollment 테이블이 이미 갖고 있는 형태) 이지만 **schema·migration 변경**이라
WO §8 에 따라 실행하지 않고 **별도 WO 로 제안**한다.
선행 조건: 타 서비스 orphan 3건 정리(§8-2). orphan 이 남아 있으면 FK 추가가 실패한다.

### 8-2. 타 서비스 orphan slug 3건

`cosmetics/k-1`, `glycopharm/e2e-test-pharmacy-20260414`, `glycopharm/glycopharm-test-pharmacy`.
본 WO §8 이 타 서비스 cleanup 을 금지하므로 **보고만** 한다. 동일 절차로 별도 WO 처리 권장.

### 8-3. `store-policy.routes.ts` 의 404/403 (§3-4)

orphan slug 에서 404 대신 403 을 내는 경로. 현재 orphan 이 0이라 재현 대상이 없다.
정합성 개선은 별도 WO 로 분리(본 WO 범위 밖 파일 수정 금지).

### 8-4. `StoreSlugService.reserveSlug()` 의 `storeId` 미검증

이번 orphan 의 원인은 아니지만(생성 경로는 전부 org-first), 방어 계층으로는 비어 있다.
`platform-core` 는 동결 Core 이므로 별도 WO 판단 대상.

---

## 9. 검증 · Git

| 항목 | 결과 |
|---|---|
| `packages/organization-core` `tsc --noEmit` | PASS |
| `apps/api-server` `tsc --noEmit` | PASS |
| slug / store-owner / provisioning 관련 Jest (6 suites) | **62 passed** |
| `apps/api-server` 전체 Jest | **136 suites / 2,142 tests passed** |
| DB schema · migration 변경 | **없음** |
| 프로덕션 DML | `platform_store_slugs` DELETE 2행 (COMMIT) |

**변경 파일**

- `packages/organization-core/src/services/OrganizationService.ts` — `deleteOrganization()` 트랜잭션화 + slug 잔재 정리
- `apps/api-server/src/__tests__/organization-delete-slug-cleanup.spec.ts` — 신규 회귀 spec 3케이스
- `docs/checks/CHECK-O4O-KPA-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1.md` — 본 문서

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§8-1 ~ §8-4)
