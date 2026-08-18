# CHECK-O4O-KCOS-GP-MISSING-STORE-SLUG-CANONICALIZATION-V1

- **WO**: `WO-O4O-KCOS-GP-MISSING-STORE-SLUG-CANONICALIZATION-V1`
- **선행 WO**: `WO-O4O-CROSS-SERVICE-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1` (잔존 위험 #4 후속)
- **기준 commit**: `23fe9973d`
- **작업일**: 2026-08-18
- **판정**: **PASS** — 원인 write path 2곳 최소 수정, SAFE_TO_BACKFILL 2건 생성, 나머지 2건은 판정 후 제외

---

## 1. §3 수정 전 census — KCos / GP organization ↔ enrollment ↔ slug

모집단 정의: `organization_service_enrollments.status='active'` × `organizations."isActive"=true`.
서비스 매핑은 **두 축이 다르다** (§6 참조).

| 서비스 | enrollment `service_code` | slug `service_key` |
|---|---|---|
| K-Cosmetics | `k-cosmetics` (canonical) · `cosmetics` (legacy 잔존) | `cosmetics` |
| GlycoPharm | `glycopharm` | `glycopharm` |

### 1-1. 전체 enrollment 모집단 (참고)

```
cosmetics|active|1   glycopharm|active|2   k-cosmetics|active|2
kpa-society|active|7  neture|active|3      pharmacy-hub|active|6
```

### 1-2. 대상 조직 전수 (수정 전)

| 서비스 | org(8) | 조직명 | type | isActive | enrollment | 자기 서비스 slug | org member | listing |
|---|---|---|---|:---:|---|---|:---:|:---:|
| KCos | `31e926a0` | 테스트 K-Cosmetics 매장 | store | true | `cosmetics` + `k-cosmetics` | **없음** | 1 | 1 |
| KCos | `83ff96c7` | 테스트 뷰티샵 | store | true | `k-cosmetics` | **없음** | 2 | 1 |
| GP | `c92b857f` | 테스트 약국 | pharmacy | true | `kpa-society` + `glycopharm` | **없음** (단 동일 org 에 `kpa` slug `테스트-약국` 보유) | 0 | 1 |
| GP | `13c08a86` | [E2E_TEST] 글라이코팜 검증 약국 | pharmacy | true | `glycopharm` | **없음** | 1 | 1 |

### 1-3. 최종 숫자 (수정 전)

```
KCos 정상 org: 2 (slug 보유 0 / slug 누락 2 / 중복 slug 0 / 동일 org 다중 active slug 0)
GP   정상 org: 2 (slug 보유 0 / slug 누락 2 / 중복 slug 0 / 동일 org 다중 active slug 0)
전체 platform_store_slugs: 13행 (orphan 0 / 중복 0 / 동일 org 다중 active 0)
미조사: 0
```

부속 데이터: `cosmetics.cosmetics_stores` 2행 (`62011f36` slug=`test-kcos-store-owner` / `bac64424` slug=**NULL**),
`glycopharm_pharmacy_extensions` **0행**, `glycopharm_members` 1행(`approved`/`pharmacy_owner`),
4개 조직 모두 `role_assignments` org-scoped 0행 · local_products 0 · kpa_store_contents 0 · store_playlists 0.

---

## 2. §6 serviceKey 계약 확인 (확정만, 정규화는 하지 않음)

- slug 축(`platform_store_slugs.service_key`) 의 허용값은 타입으로 고정돼 있다 —
  `StoreSlugServiceKey = 'glycopharm' | 'cosmetics' | 'kpa' | 'neture' | 'pharmacy-hub'`
  (`packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts`).
- membership/enrollment 축은 별개다 — `k-cosmetics`, `kpa-society`, `glycopharm`, `pharmacy-hub`, `neture` (+legacy `cosmetics`).
- **확정**: KCos slug canonical key = `cosmetics`, GP slug canonical key = `glycopharm`.
- `31e926a0` 의 enrollment `cosmetics` + `k-cosmetics` 이중 등록은 **이번 WO 범위 밖**(§10) —
  건드리지 않고 그대로 둔다. enrollment `service_code` 정규화는 별도 WO.

---

## 3. §5 WRITE path 전수감사 — 실제 누락 원인

`reserveSlug()` 호출부 전수(수정 전 7곳) 중 KCos·GP provisioning 경로를 역추적한 결과,
**축 오류가 아니라 slug 예약 단계 자체가 없는 경로**가 원인이었다.

| 조직 | 생성 주체 | organization | enrollment | slug 예약 | 성격 |
|---|---|:---:|:---:|:---:|---|
| `31e926a0` | migration `20260501100000-SeedKCosmeticsStoreOwnerTestAccount` | 생성 | 생성 | **없음** (`platform_store_slug_history` 에만 insert — registry 누락) | 1회성 seed, 실행 완료 |
| `83ff96c7` | migration `20261031000001-BackfillKCosmeticsSellerStoreContext` (`90a046f1a`) | 생성 | 생성 | **의도적 생략** (주석: "slug 는 NULL … 공개 slug 라우팅만 보류") | 1회성 backfill, 실행 완료 |
| `13c08a86` | `GlycopharmMemberService.approveMember()` 신규 org 분기 | 생성 | 생성 | **없음** | **살아있는 write path** |
| `c92b857f` | `GlycopharmMemberService.approveMember()` 기존 org 분기 (`enrollService` + `setOwner`) | 재사용 | 생성 | **없음** | **살아있는 write path** |

추가로 KCos 쪽에도 같은 형태의 갭이 있다.

| 경로 | slug 예약 | 비고 |
|---|:---:|---|
| `CosmeticsStoreService.createStoreWithOrg()` (신규 매장) | 있음 | `reviewApplication` · `ensureStoreContextForOwner`(신규 분기) 공유 |
| `CosmeticsStoreService.linkOwnerToStore()` (동일 사업자번호 기존 매장 연결) | **없음** | org member + enrollment 만 보강 → legacy 매장은 owner 가 붙어도 계속 slug 없음 |
| GP `glycopharm.service.ts` / `admin.controller.ts` / `store-applications.controller.ts` | 있음 | 3경로 모두 정상 (단 `glycopharm_pharmacy_extensions` 0행 = 프로덕션에서 실사용된 적 없음) |
| KPA `kpa-store-organization.provisioning.ts` · Pharmacy-Hub `PharmacyHubStoreProvisioningService` | 있음 | **canonical 참조 패턴** — `findByStoreId` 선조회 → 없을 때만 예약, 실패 비차단 |

**원인 확정**: `organization 생성 → enrollment 생성 → slug 예약` 3단계 중 **3단계(slug 예약)** 가
GP 승인 경로 2분기와 KCos 기존 매장 연결 경로에서 빠져 있었다.

---

## 4. §5 코드 수정 (최소)

기존 canonical 패턴(`kpa-store-organization.provisioning.ts` §6 · `PharmacyHubStoreProvisioningService`)을
그대로 재사용했다 — 새 serviceKey mapping·새 slug 규칙·새 helper 계층을 만들지 않았다.

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/glycopharm/services/glycopharm-member.service.ts` | `ensureGlycopharmStoreSlug(organizationId, fallbackName?)` private helper 추가. `approveMember()` 의 `pharmacy_owner` **두 분기 모두**에서 호출 |
| `apps/api-server/src/routes/cosmetics/services/cosmetics-store.service.ts` | `ensureCosmeticsStoreSlug(organizationId, storeSlug, storeName)` private helper 추가. `linkOwnerToStore()` 에서 호출 |
| `apps/api-server/src/__tests__/store-slug-store-id-axis.spec.ts` | 호출부 census 7→8곳 갱신 + 두 경로의 slug 보강 회귀 테스트 2건 추가 |

공통 계약:

- `storeId` 축 = **organizations.id** (선행 WO §6 과 동일)
- `findByStoreId()` 선조회 → 이미 있으면 **no-op (멱등)**
- 실패는 **비차단** — 조직·소유·enrollment 는 이미 확정됐으므로 승인 흐름을 깨지 않고 로그만 남긴다
- KCos 는 `cosmetics_stores.slug` 가 이미 있으면 그 값을 registry 에 맞춘다(두 축 분기 방지). 사용 불가하면 이름 기반 채번으로 회귀

DB schema · migration · route contract · frontend 변경 **0건**.

---

## 5. §4 조직별 판정

| 조직 | 판정 | 근거 |
|---|---|---|
| `31e926a0` 테스트 K-Cosmetics 매장 | **SAFE_TO_BACKFILL** | 정상 active store 조직, owner 2명, listing 1건. 대응 `cosmetics_stores.slug='test-kcos-store-owner'` 가 이미 있고 registry 에서 미사용 → 같은 문자열로 registry 정합 |
| `83ff96c7` 테스트 뷰티샵 | **SAFE_TO_BACKFILL** | 정상 active store 조직, owner 1명, listing 1건. `cosmetics_stores.slug` 는 NULL → 이름 기반 `generateUniqueSlug('테스트 뷰티샵')` = `테스트-뷰티샵` (미사용) |
| `c92b857f` 테스트 약국 | **DUPLICATE_OR_CONFLICT** | 동일 organization 이 이미 `kpa` slug `테스트-약국` 을 보유하고 **공개 조회가 200 으로 동작**한다(`resolvePublicStore` 는 lookup 시 serviceKey 를 따지지 않는다). `platform_store_slugs.slug` 는 전역 UNIQUE 라 glycopharm slug 를 추가하면 `테스트-약국-1` 같은 파생 문자열이 되고, §3 census 가 이상치로 세는 "동일 org 다중 active slug" 를 새로 만든다 → **생성하지 않음** |
| `13c08a86` [E2E_TEST] 글라이코팜 검증 약국 | **LEGACY_NO_PUBLIC_STORE_REQUIRED** | ① 이름·데이터 모두 E2E 검증용 조직(공개 매장 대상 아님). ② 기존 채번 규칙으로 유효 slug 를 만들 수 없다 — `generateSlugFromName('[E2E_TEST] 글라이코팜 검증 약국')` = `e2e_test-글라이코팜-검증-약국` 이고 `_` 가 `SLUG_CONSTRAINTS.PATTERN` 위반이라 `-1`~`-100` 접미사까지 전부 invalid. §7 "임의 slug 하드코딩 금지" 이므로 **생성하지 않음** |

`SAFE_TO_BACKFILL` 2건만 생성했다.

---

## 6. §8 Production backfill

### 사전 게이트 (트랜잭션 내 `RAISE EXCEPTION` 으로 강제)

1. 대상 org 2건이 존재하고 `"isActive"=true`
2. 해당 (store_id, service_key) 로 기존 slug 0건
3. 사용할 slug 문자열이 registry 에서 0건 (전역 UNIQUE 충돌 없음)
4. `INSERT` 후 `GET DIAGNOSTICS ROW_COUNT` 가 **정확히 2** — 아니면 예외 → 전체 rollback

먼저 `COMMIT` 없이 동일 스크립트를 dry-run 하여 `inserted=2 / OK` 를 확인한 뒤 본 실행했다.

### 실행 SQL (요약)

```sql
BEGIN;
DO $$
DECLARE n int;
BEGIN
  CREATE TEMP TABLE _bf(store_id uuid, service_key varchar(50), slug varchar(120)) ON COMMIT DROP;
  INSERT INTO _bf VALUES
   ('31e926a0-8b41-4af6-8a22-b32d3ad880e6','cosmetics','test-kcos-store-owner'),
   ('83ff96c7-217b-4f13-8b55-ac9abbe7be86','cosmetics','테스트-뷰티샵');
  -- (게이트 1~3 생략 — 위 참조)
  INSERT INTO platform_store_slugs (id, slug, store_id, service_key, is_active, created_at, updated_at)
  SELECT gen_random_uuid(), b.slug, b.store_id, b.service_key, true, NOW(), NOW() FROM _bf b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'insert count mismatch: expected 2, actual %', n; END IF;
END $$;
COMMIT;
```

결과: `NOTICE: inserted=2` → `COMMIT`. **INSERT 2행, 그 외 테이블 변경 0행.**

### 생성된 slug

| id | slug | store_id (organization) | service_key | is_active |
|---|---|---|---|:---:|
| `8d189fd8-f89c-4ea8-9d13-ad1abbda95b1` | `test-kcos-store-owner` | `31e926a0-8b41-4af6-8a22-b32d3ad880e6` | `cosmetics` | true |
| `1d83121d-8388-46e5-a5bf-7d1cb805f87b` | `테스트-뷰티샵` | `83ff96c7-217b-4f13-8b55-ac9abbe7be86` | `cosmetics` | true |

### Rollback SQL (준비 완료 · **미사용**)

```sql
DELETE FROM platform_store_slugs
WHERE id IN ('8d189fd8-f89c-4ea8-9d13-ad1abbda95b1','1d83121d-8388-46e5-a5bf-7d1cb805f87b');
```

---

## 7. §9 정리 후 검증

### 7-1. 사후 census

```
KCos 정상 org: 2 (slug 보유 2 / slug 누락 0)
GP   정상 org: 2 (slug 보유 0 / slug 누락 2 — 판정에 따라 의도적 미생성)
전체 platform_store_slugs: 15행
orphan 0 / 중복 slug 0 / 동일 org 다중 active slug 0
```

### 7-2. 공개 route

전체 15개 slug 에 대해 `/api/v1/stores/resolve/:slug` · `/api/v1/stores/:slug` 를 호출 —
**15/15 모두 200** (회귀 0). 신규 2건 본문:

```
GET /api/v1/stores/resolve/test-kcos-store-owner
  → {"found":true,"slug":"test-kcos-store-owner","serviceKey":"cosmetics"}
GET /api/v1/stores/test-kcos-store-owner
  → {"id":"31e926a0-…","name":"테스트 K-Cosmetics 매장","slug":"test-kcos-store-owner","status":"active"}
GET /api/v1/stores/테스트-뷰티샵
  → {"id":"83ff96c7-…","name":"테스트 뷰티샵","slug":"테스트-뷰티샵","status":"active"}
```

> 선행 WO 에서 확인된 대로 cosmetics 공개 매장 페이지는 축 오류 + slug 부재로 **한 번도 동작한 적이 없었다**.
> 이번 정리로 K-Cosmetics 매장 2곳이 처음으로 공개 route 에서 해석된다.

기존 `테스트-약국`(kpa) 은 변경 전후 모두 `{"found":true,…,"serviceKey":"kpa"}` / 200 — 회귀 없음.

### 7-3. 실계정 smoke (`renagang21@gmail.com`, `serviceKey=k-cosmetics`)

| 요청 | 결과 |
|---|---|
| `POST /api/v1/auth/login` | 200 |
| `GET /api/v1/cosmetics/stores/me` (My Store) | 200 — `테스트 뷰티샵` 반환 |
| `GET /api/v1/store/handled-products?organizationId=83ff96c7…` | 200 — items 1건 |
| `GET /api/v1/store/local-products?organizationId=83ff96c7…` | 200 — items 0건 (원래 0) |

---

## 8. §12 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `tsc --noEmit` | **PASS** (오류 0) |
| 관련 Jest (cosmetics · glycopharm · pharmacy-hub · kpa provisioning · slug) | **PASS** 11 suites / 127 tests |
| 전체 `apps/api-server` Jest | **PASS** 138 suites / 2180 tests |
| production pre/post census | 위 §1 · §7-1 |
| insert row count | expected 2 == actual 2 |

DB schema · migration · seed 변경 **없음**. 변경은 `platform_store_slugs` INSERT 2행뿐.

---

## 9. 잔존 위험 · 후속 제안

1. **`cosmetics_stores.slug` 와 registry 의 이원화** — `83ff96c7` 는 registry 에 `테스트-뷰티샵` 이 생겼지만
   `cosmetics.cosmetics_stores.slug` 는 여전히 NULL 이다. 읽기 canonical 은 registry(`findByStoreId`) 이므로
   동작 문제는 없으나 두 축이 갈라져 있다. → 별도 WO (store 테이블 slug 컬럼의 역할 확정 또는 backfill).
2. **`generateSlugFromName()` 이 invalid slug 를 만들 수 있다** — `\w` 를 허용해 `_` 가 남는데
   `validateSlug()` 는 `_` 를 거부한다. 이름에 `_` 가 들어간 매장은 provisioning 이 100회 재시도 후 예외로 끝난다
   (`13c08a86` 이 정확히 이 케이스). → 별도 WO (채번 규칙 정합).
3. **`c92b857f` 의 kpa slug 로 GP 매장이 노출된다** — `resolvePublicStore` 가 lookup 시 serviceKey 를 보지 않아,
   한 조직이 여러 서비스에 걸쳐 있으면 어느 서비스 slug 로도 공개된다. 설계 의도인지 판정 필요. → 별도 WO.
4. **enrollment `service_code` 의 `cosmetics` / `k-cosmetics` 혼재** — `31e926a0` 이 둘 다 보유.
   §10 에 따라 이번에 손대지 않았다. → 별도 WO (선행 WO 잔존 위험과 동일 항목).
5. **`platform_store_slugs.store_id` 에 FK 가 없다** — 선행 WO 에서 `deleteOrganization()` 트랜잭션 정리로 보완했으나
   구조적 근본 원인은 남아 있다. → 별도 WO (FK 도입 가부 판정).

---

## 10. 검증 · Git · 문서 정합

- 브랜치: `work/kcos-gp-missing-slug` (worktree `C:\tmp\o4o-users-timestamp`) → `main`
- 기준 commit: `23fe9973d`
- path-specific stage 만 사용 (`git add .` 미사용). 다른 세션 WIP 미접촉.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건**
