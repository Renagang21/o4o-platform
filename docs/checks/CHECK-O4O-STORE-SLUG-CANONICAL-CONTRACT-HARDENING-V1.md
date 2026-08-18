# CHECK-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1

- **WO**: `WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1`
- **일자**: 2026-08-18
- **기준 commit**: `ae6bb41ad` (worktree `work/slug-contract-hardening`, base = 최신 `main`)
- **범위**: store slug 의 **생성 → 저장 → 서비스 귀속 → 공개 조회** 계약 정합화
- **DB write**: **0건** (production read-only census 만 수행)

---

## 1. 결론

| # | WO 가 지목한 결함 | 실재 | 처리 |
|---|---|:--:|---|
| 1 | `generateSlugFromName()` 결과가 `_` 를 남겨 `validateSlug()` 와 충돌 | ✅ | 생성기 규칙을 validator 집합에 일치시킴 |
| 2 | `cosmetics_stores.slug` 와 `platform_store_slugs` 의 SSOT 이원화 | ✅ | registry 를 SSOT 로 확정 · mirror write 2곳 중단 |
| 3 | `resolvePublicStore` 계열이 serviceKey 를 확인하지 않음 | ✅ | 서비스별 mount 4개 컨트롤러에 service 귀속 대조 추가 |

census 중 추가 결함 2건을 더 확인했다(§8 잔존 위험 1·6번).

---

## 2. §3-A 생성기 · validator census

| 함수 | 위치 | 분류 | 허용문자 | `_` | 공백 | 한글 | 대소문자 | 최대길이 | 중복처리 |
|---|---|---|---|---|---|---|---|---|---|
| `validateSlug` | `platform-core/.../utils/slug-validation.ts` | **CANONICAL(validator)** | `[a-z0-9가-힣-]`, 양끝·연속 하이픈 금지, RESERVED 금지 | 거부 | 거부 | 허용 | 소문자만 | 3~120 | — |
| `generateSlugFromName` | 같은 파일 | **CANONICAL(generator)** | (수정 전) `\w` 보존 → **`_` 통과** | **불일치** | `-` | 보존 | 소문자화 | 120 절단 | — |
| `generateUniqueSlug` | `platform-core/.../services/store-slug.service.ts` | CANONICAL | generator 결과 + `-1`…`-100` | — | — | — | — | — | 숫자 suffix, 실패 시 throw |
| `slugBase` | `api-server/.../PharmacyHubStoreProvisioningService.ts` | SERVICE_LOCAL(중복 규칙) | `_`/공백 → `-` 자체 구현 | 우회 | `-` | 보존 | 소문자 | — | 3자 미만 → org code fallback |
| `generateStoreSlug` / `generateUniqueStoreSlug` / `isValidSlug` | `api-server/src/utils/slug.ts` | **DEAD** (store slug 축 소비처 0) | — | — | — | — | — | — | — |
| `generateSlugFromName` (frontend) | `services/web-glycopharm/.../StoreApprovalDetailPage.tsx` | SERVICE_LOCAL(입력 제안용, 백엔드가 재검증) | — | — | — | — | — | — | — |

**재현(수정 전 생성기)**

```
"E2E_TEST Pharmacy" -> "e2e_test-pharmacy"  INVALID (INVALID_CHARACTERS)
"test_store"        -> "test_store"         INVALID
"A___B___C"         -> "a___b___c"          INVALID
"테스트 약국"        -> "테스트-약국"          VALID
"Test Store 01"     -> "test-store-01"      VALID
"  spaced  name  "  -> "spaced-name"        VALID
120자 절단           -> "...aaaa-"           INVALID (ENDS_WITH_HYPHEN)
```

`_` 가 들어가면 base 도 `-1`…`-100` 도 전부 INVALID 라서 `generateUniqueSlug` 가 **100회 시도 후 throw** 한다(증상: PharmacyHub `SLUG_UNRESOLVABLE`).

---

## 3. §3-B 저장소 census

| 저장소 | 분류 | 근거 |
|---|---|---|
| `platform_store_slugs` | **CANONICAL** | 공개 조회(`resolvePublicStore`), 매장 허브 `GET /store-hub/slug`, slug 변경(`PUT /:slug/slug`), 조직 삭제 시 정리가 전부 이 테이블을 본다 |
| `cosmetics.cosmetics_stores.slug` | **LEGACY_MIRROR** | runtime 공개 조회 소비처 0. write 2곳(신규 생성 · slug 변경 mirror)뿐이었고 그중 slug 변경 mirror 는 **id 축이 어긋나 항상 0 row** 였다 |
| `platform_store_slug_history` | CANONICAL(부속) | 301 redirect · 1회 변경 정책. production **0 row** |
| glycopharm / kpa / pharmacy-hub 전용 slug 컬럼 | **없음** | registry 단독 |

---

## 4. §3-C READ 경로 census

| 경로 | slug lookup | org 확인 | serviceKey 확인 | 판정 |
|---|---|:--:|:--:|---|
| `GET /api/v1/stores/:slug` · `/resolve/:slug` (`resolvePublicStore`) | registry | ✅ | 해당 없음 | **service-neutral 단일 mount** — slug row 의 serviceKey 를 결과로 돌려준다. WO §6 의 "service-neutral 이면 slug row 기준" 에 부합 → 변경 없음 |
| `/api/v1/{cosmetics\|glycopharm\|kpa}/stores/:slug/blog` | registry | ✅ | ❌ → **✅ 수정** | 서비스별 mount 인데 대조 없음 |
| 〃 `/pop`, `/qr`, `/video` | registry | ✅ | ❌ → **✅ 수정** | 동일 |
| `layout.controller` / `store-settings.controller` / `kpa-store-template.controller` | registry | ✅ | mount serviceKey 인자 자체가 없음 | service-neutral → **변경 없음** (신규 계약 금지: §6·§10) |
| `store-policy.routes.ts` (`resolveAndAuthorize`) | registry | 소유권 질의 | slug row 의 serviceKey 사용 | 변경 없음 |

**production 재현(수정 전, 다서비스 조직 `테스트-약국` = slug service_key `kpa`)**

```
GET /api/v1/kpa/stores/테스트-약국/blog        200   (정상)
GET /api/v1/glycopharm/stores/테스트-약국/blog 200   ← 결함
GET /api/v1/cosmetics/stores/테스트-약국/blog  200   ← 결함 (cosmetics enrollment 조차 없다)
```

---

## 5. 수정 내역

| 파일 | 변경 |
|---|---|
| `packages/platform-core/src/store-identity/utils/slug-validation.ts` | `generateSlugFromName`: `[_\s]+` → `-`, 허용 문자 집합을 validator 와 동일하게, 120자 절단 **후** 말단 하이픈 재정리. `toValidSlugBase` / `SLUG_FALLBACK_BASE` 추가 |
| `packages/platform-core/src/store-identity/services/store-slug.service.ts` | `generateUniqueSlug` 이 `toValidSlugBase` 사용 — 첫 생성부터 유효 base |
| `packages/platform-core/src/store-identity/index.ts` | `toValidSlugBase` · `SLUG_FALLBACK_BASE` export |
| `packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts` | `storeId` 주석을 canonical 축(**organizations.id**)으로 정정 (stale 주석) |
| `apps/api-server/src/services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | `slugBase` 의 중복 정규화 규칙 제거 → 공통 `generateSlugFromName` 위임. PH 고유 fallback(3자 미만 → org code)만 유지 |
| `apps/api-server/src/routes/platform/store-policy.routes.ts` | `UPDATE cosmetics.cosmetics_stores SET slug` mirror write 제거 |
| `apps/api-server/src/routes/cosmetics/services/cosmetics-store.service.ts` | 신규 매장 생성 시 `cosmetics_stores.slug` write 중단(registry 예약은 유지). `ensureCosmeticsStoreSlug` 의 mirror 읽기는 **provisioning 시점 1회 승격**으로 주석 명확화 |
| `apps/api-server/src/routes/o4o-store/controllers/{blog,pop,qr,video}.controller.ts` | `resolvePharmacy` 에 `record.serviceKey !== serviceKey → null` 대조 추가(organization 조회보다 먼저) |
| `apps/api-server/src/__tests__/store-slug-canonical-contract.spec.ts` | 신규 회귀 스펙 23 케이스 |

**생성 규칙 변경의 회귀 영향**: 기존에 **유효했던 이름**의 채번 결과는 그대로다(테스트로 고정). RESERVED / 3자 미만 base 는 기존대로 숫자 suffix 로 해소되게 두어 채번 결과를 바꾸지 않았고, fallback 은 **base 가 빈 문자열이 되는 경우**(`"!!!"`, `"___"`)에만 쓴다 — 그 경우는 기존 구현에서 `-1` 도 무효라 **어떤 slug 도 만들지 못하던** 케이스다.

---

## 6. §8 production read-only census (2026-08-18)

| 항목 | 값 |
|---|---|
| `platform_store_slugs` 전체 | **15** (전부 `is_active=true`) |
| service 별 | cosmetics 2 / kpa 7 / pharmacy-hub 6 (glycopharm 0 · neture 0) |
| invalid slug pattern | **0** |
| underscore 포함 | **0** |
| 연속 하이픈 · 양끝 하이픈 · 3자 미만 · 120자 초과 | 각 **0** |
| orphan (organization 없음) | 0 |
| slug 중복 · 동일 org 다중 active | 0 · 0 |
| `platform_store_slug_history` | 0 row |
| `cosmetics_stores` 전체 | 2 |
| `cosmetics_stores.slug` 보유 | 1 |
| registry 와 값 일치 | 1 (`test-kcos-store-owner`) |
| registry 와 불일치 | **0** |
| local slug 만 있고 registry 없음 | **0** |
| registry 만 있고 local NULL | 1 (`테스트-뷰티샵`) |
| 다서비스 organization | **2** (`cosmetics,k-cosmetics` / `glycopharm,kpa-society`) |
| 다서비스 org 의 slug | 2 (`test-kcos-store-owner`=cosmetics, `테스트-약국`=kpa) |

**판정**: 기존 데이터 rewrite **불필요**. invalid slug 0 · 불일치 0 이므로 backfill/redirect 정책 없이 코드 수정만으로 계약이 닫힌다 → §9 대로 production write 0건.

---

## 7. 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `tsc --noEmit` | **PASS** (0 error) |
| 신규 스펙 `store-slug-canonical-contract.spec.ts` | **PASS** 23/23 |
| api-server 전체 Jest | **PASS** 140 suites / 2231 tests |
| production 공개 매장 전수 smoke (`GET /api/v1/stores/{slug}`) | **15/15 → 200** (배포 전 baseline · service-neutral 경로라 이번 수정 영향 없음) |
| production DB write | **0건** |

배포 후 기대값: `GET /api/v1/glycopharm/stores/테스트-약국/blog` 및 `/cosmetics/...` → **404**, `/kpa/...` → 200 유지.

---

## 8. 잔존 위험 · 별도 WO 제안

1. **(신규 발견) `store-policy.routes.ts` 의 cosmetics 소유권 질의 축 불일치** — `isStoreOwner` 가 `cosmetics.cosmetics_stores WHERE id = $1` 에 **organizations.id** 를 넣어 K-Cos 매장주가 항상 403 이다. 권한·route 계약 변경이라 이번 WO 범위 밖(중지 조건) → 별도 WO.
2. **`cosmetics_stores.slug` 컬럼 제거** — 신규 write 는 끊었으나 컬럼·부분 UNIQUE 인덱스·legacy row 1건은 남아 있다. schema/migration WO 필요.
3. **service-neutral 컨트롤러 3종**(layout / store-settings / kpa-store-template) — mount serviceKey 인자가 없어 service 귀속 대조가 구조적으로 불가. 계약 신설이 필요하므로 별도 WO.
4. **`platform_store_slugs.store_id` FK 부재** — orphan 방지가 여전히 애플리케이션 계약에만 의존(§10 금지 항목).
5. **enrollment 키 이원화**(`cosmetics` vs `k-cosmetics`, `kpa` vs `kpa-society`) — 다서비스 조직 판정이 두 축을 오간다. 정규화는 §10 금지 → 별도 WO.
6. **(신규 발견) `apps/api-server/src/utils/slug.ts` 의 store slug 계열 3함수 DEAD** — 소비처 0. 제거는 별도 WO.

---

## 9. 문서 정합

```
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 6건
```

- 발견 1건 = `platform-store-slug.entity.ts` 의 `storeId` 주석이 canonical 축과 어긋나 있던 것(기준 문서가 아닌 소스 주석이라 인라인 정정).
