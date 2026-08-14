# CHECK-O4O-KPA-STORE-SERVICE-KEY-AND-PRODUCT-POLICY-CANONICALIZATION-V1

- **WO**: `WO-O4O-KPA-STORE-SERVICE-KEY-AND-PRODUCT-POLICY-CANONICALIZATION-V1`
- **일자**: 2026-08-14
- **선행**: [`CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1.md`](CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1.md) (commit `2d3dfb8d7`)
- **판정**: **A안 — 상품 도메인 key 는 canonical(`kpa-society`) 축이다.** `kpa` 사용은 legacy drift.
- **범위**: 조사 → 최소 수정 → 검증 → production read-only census. **운영 데이터 변경 0건.**

---

## 1. 확정된 5개 key (WO §10)

| key | 값 | 왜 그 값인가 (증거) |
|---|---|---|
| `ROLE_SCOPE_KEY` | **`kpa`** | `role_assignments` 의 role 문자열이 `kpa:store_owner` · `kpa:operator` 형태. `packages/security-core` 의 `ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` 가 이 축을 role-prefix 로 정의. |
| `MEMBERSHIP_KEY` | **`kpa-society`** | migration `20260928000000-NormalizeServiceMembershipsKpaKey` 가 `service_memberships.service_key='kpa'` 를 전량 정규화하고 down() 을 no-op 으로 봉인. |
| `ENROLLMENT_KEY` | **`kpa-society`** | `organization_service_enrollments.service_code`. 선행 WO 에서 신규 생성 경로를 canonical 로 확정 (`KPA_CANONICAL_SERVICE_CODE = resolveCanonicalServiceKey('kpa')`). |
| `LISTING_KEY` | **`kpa-society`** | ① migration `20260411300000-NormalizeKpaServiceKeys` 가 **"표준 key: 'kpa-society'"** 를 명문화하고 `product_approvals` · `organization_product_listings` 의 `'kpa'` 를 운영 데이터에서 정규화(down = no-op). ② `pharmacy-products.controller` 의 `STORE_SERVICE_KEY_TO_APPROVAL_KEY` (HUB-P0-04) 가 `kpa → 'kpa-society'` 로 기록. ③ `product-approval-v2.service` 가 그 값을 OPL 로 전파. ④ `kpa-checkout.controller:375` 가 `opl.service_key = 'kpa-society'` 로 읽음. ⑤ auto-listing 이 `ose.service_code`(=canonical)를 그대로 복사. ⑥ `operator-dashboard.service:254` 주석이 `service_key='kpa-society'` 기준. |
| `POLICY_KEY` | **`kpa-society`** | `service_audience_policies` 운영 데이터에 canonical key 5행만 존재(`kpa` 행 없음). 아래 §5 census 참조. |

**결론**: `MEMBERSHIP_KEY = ENROLLMENT_KEY = LISTING_KEY = POLICY_KEY = 'kpa-society'` 이며, `ROLE_SCOPE_KEY` 만 `'kpa'` 인 **2축 구조**다.

따라서 **enrollment → listing 경계에는 변환이 필요 없다** (같은 축). 변환이 필요한 유일한 경계는 **role-prefix 축 ↔ canonical 축**이고, 그 변환은 이미 존재하는 SSOT (`@o4o/security-core` 의 `resolveCanonicalServiceKey` / `resolveRolePrefixFromCanonicalServiceKey`)에만 위임한다. 로컬 매핑 테이블을 새로 만들지 않았다.

WO §3 의 B안(상품 도메인 = `kpa` canonical)은 **기각**한다. 위 ①④⑥ 이 반대 방향의 확정 계약이며, B안을 택하면 이미 정규화된 운영 데이터를 되돌려야 한다.

---

## 2. 전수 census — 사용처 분류 (WO §2, 미조사 0건)

### 2-1. 축 분류

| 축 | 저장 위치 | 값 | 비고 |
|---|---|---|---|
| `IDENTITY/MEMBERSHIP` | `service_memberships.service_key` | `kpa-society` | migration 20260928 로 봉인 |
| `ORGANIZATION_ENROLLMENT` | `organization_service_enrollments.service_code` | `kpa-society` | 선행 WO 확정 |
| `PRODUCT_LISTING` | `organization_product_listings.service_key`, `product_approvals.service_key`, `offer_service_approvals.service_key`, `offer_service_prices.service_key` | `kpa-society` | migration 20260411 로 표준 확정 |
| `AUDIENCE_POLICY` | `service_audience_policies.service_key` | `kpa-society` | 운영 데이터에 canonical 만 존재 |
| `ROLE_SCOPE` | `role_assignments.role`, `product_candidates.service_key`, `requireScope('kpa:*')` | `kpa` | **의도된 별도 축 — 불변** |
| `URL/SLUG` | `platform_store_slugs.service_key`, 프론트 마운트 경로 `/store/*` | `kpa` | 매장 URL 식별자. 상품 축 아님 |
| `OTHER` | `cms_*.serviceKey`, `community_*.service_code`, copilot `VALID_SERVICES` | `kpa` | 상품/정책 도메인 밖. 본 WO 범위 외 |

### 2-2. OPL 쓰기 경로 전수 (INSERT INTO organization_product_listings — 12곳)

| # | 위치 | 도출 방식 | 판정 |
|---|---|---|---|
| 1 | `utils/auto-listing.utils.ts:83` `autoExpandPublicProduct` | `ose.service_code` 직접 복사 | ✅ 정상 (enrollment = listing 동축) |
| 2 | `utils/auto-listing.utils.ts:139` `autoExpandServiceProduct` | `ose.service_code` 직접 복사 | ✅ 정상 |
| 3 | `utils/auto-listing.utils.ts:192` `autoListPublicProductsForOrg` | 호출자 파라미터 | 호출자 교정 (§3-2) |
| 4 | `utils/auto-listing.utils.ts:239` `autoListServiceProductsForOrg` | 호출자 파라미터 | ✅ 이미 canonical |
| 5 | `store-product-library.controller.ts:237` (offer) | `deriveListingServiceKey` | ❌ drift → **수정** (§3-1) |
| 6 | 〃 `:297` (master) | `deriveListingServiceKey` | ❌ drift → **수정** (§3-1) |
| 7 | `product-policy-v2/product-approval-v2.service.ts:187` | `approval.service_key` 전파 | ✅ 정상 |
| 8 | `pharmacy-hub/PharmacyHubHandledProductController.ts:196` | `SERVICE_KEYS.PHARMACY_HUB` 상수 | ✅ 정상 |
| 9 | `neture/services/partner-contract.service.ts:868` | recruitment `serviceId` | ✅ canonical 저장값 |
| 10 | `neture/services/product-candidate.service.ts:486` | 요청 body `serviceKey` (자유 입력) | ⚠️ 축 미보장 → **경계 변환 추가** (§3-3) |
| 11 | `neture/services/store-product-request-admin.service.ts:142` | `candidate.serviceKey` (**role-prefix 축**) | ❌ 축 혼선 → **경계 변환 추가** (§3-3) |
| 12 | `routes/kpa/services/event-offer.service.ts:960` | `STORE_SERVICE_KEY_MAP[kpa-groupbuy] = 'kpa'` | ⚠️ **의도적 잔존** — §6 참조 (미수정) |

### 2-3. OPL 읽기 경로 (service_key 조건 사용)

`kpa-checkout.controller:375`(`'kpa-society'` 리터럴) · `operator-dashboard.service`(주석 명시 `kpa-society`) · `pharmacy-products.controller`(row 판별자 축으로 명시 사용 — HUB-P0-04 정책 주석 유지) · `event-offer.service` / `supplier-offers.controller`(`'kpa-groupbuy'` 파라미터) · `multilingual-product-content.controller:78`(주석: "listing.service_key 는 `kpa-society` 로 저장돼 있어 mount serviceKey(`kpa`)와 다르다" — 본 판정과 일치) · `operator/ProductConsoleController` · `StoreConsoleController`(enrollment 기준 스코프, OPL key 미사용).

→ **읽기 측은 이미 전부 `kpa-society` 기준.** 쓰기 측 drift 만 남아 있었다.

---

## 3. 수정 내역 (4개 소비처 + 1개 신규 SSOT)

### 3-1. `store-product-library.controller.ts` — 로컬 역매핑 제거

종전:

```ts
const MEMBERSHIP_KEY_TO_LISTING_SERVICE_KEY = { 'kpa-society': 'kpa', 'k-cosmetics': 'cosmetics', ... };
```

canonical membership 을 role-prefix 로 **되돌려서** OPL 에 기록하고 있었다. security-core 주석의 "NEVER hardcode a local `{'kpa-society': 'kpa'}` style map elsewhere" 를 정면으로 위반한 dead local mapping 이다.

→ 제거하고 **공용 도출기 하나로 수렴**: 신규 `apps/api-server/src/utils/listing-service-key.ts` 의 `deriveListingServiceKeyFromMemberships()`. 컨트롤러는 얇은 wrapper 만 유지한다. `MULTI_MEMBERSHIP_PRIORITY`(neture 우선)는 **종전 동작 그대로 보존**했다.

동작 변화: KPA 매장 `kpa` → **`kpa-society`** / K-Cosmetics 매장 `cosmetics` → **`k-cosmetics`**. GlycoPharm · Neture 는 **값 변화 없음**.

### 3-2. `routes/kpa/controllers/organization.controller.ts` — auto-listing 두 호출의 key 불일치 제거

같은 조직 생성 트랜잭션 안에서 PUBLIC 은 `'kpa'`, SERVICE 는 `'kpa-society'` 로 **서로 다른 키**를 쓰고 있었다. 둘 다 `KPA_CANONICAL_SERVICE_CODE`(= `kpa-society`)로 정렬했다.

### 3-3. candidate → listing 경계 변환 (SSOT 위임)

`product_candidates.service_key` 는 **role-prefix 축**이다(운영자 스코프 `{sk}:operator` 구성에 쓰인다 — `store-product-request.controller` 의 `MEMBERSHIP_KEY_TO_SERVICE_KEY` 는 그 목적이므로 **불변 유지**). 그 값이 OPL 로 그대로 흘러가던 두 지점에만 `resolveCanonicalServiceKey()` 를 1회 적용했다. canonical 입력에는 항등이므로 KCos/GP/Neture 회귀 없음.

- `store-product-request-admin.service.ts:upsertOrganizationListing`
- `product-candidate.service.ts:linkCandidateToOrganizationListing`

### 3-4. 미수정(의도) — schema default

`OrganizationProductListing.service_key` · `ProductApproval.service_key` 의 entity/DDL default 가 `'kpa'` 로 남아 있다. **모든 INSERT 가 키를 명시**하므로 실효 0 이고, WO §8 이 schema/migration 선행 변경을 금지하므로 손대지 않았다. → 후속 정리 대상으로 보고한다(§11).

---

## 4. auto-listing 정비 확인 (WO §4)

| 요구 | 결과 |
|---|---|
| KCos / GlycoPharm / PharmacyHub 기존 동작 불변 | ✅ GlycoPharm 3개 호출부 모두 `'glycopharm'`(canonical) 유지. KCos·PH 는 `autoList*ForOrg` 호출부 없음. `autoExpand*` 는 `ose.service_code` 복사 방식으로 **로직 무변경** |
| KPA 신규 enrollment(`kpa-society`) → OPL 은 확정 LISTING_KEY 사용 | ✅ 두 축이 동일 값이므로 복사만으로 충족. 별도 변환 불필요 |
| 동일 master/org/service 중복 listing 0 | ✅ `ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING` · `(organization_id, service_key, master_id) WHERE offer_id IS NULL` 유지. 유니크 인덱스 무변경 |
| 기존 listing 재분류·대량 수정 없음 | ✅ UPDATE 0건. 코드 변경만 |

---

## 5. audience policy 확인 (WO §5)

### 운영 데이터 (read-only)

| service_key | is_pharmacy_target_service |
|---|:---:|
| `glycopharm` | true |
| `k-cosmetics` | false |
| `kpa-society` | **true** |
| `neture` | false |
| `pharmacy-hub` | true |

→ **`kpa` 행은 존재하지 않는다.** 정책 축이 canonical 전용임이 데이터로 확인된다.

### gate 별 전달 key

- `assertDrugActionAllowed` (`drug-access.guard.ts`): ① DRUG 판정 → ② `serviceKey` 필수 → ③ `service_audience_policies` 행 존재 + `is_pharmacy_target_service = true` (**행 없으면 거부** = fail-closed) → ④ `organizationId` 가 주어지면 `organization_service_enrollments` active 소속 확인.
- auto-listing 은 SQL 내 `drugAudienceSqlCondition*` 로 같은 정책 테이블을 조회한다 (비의약품은 무조건 통과).
- 상품별 정책은 없다 — 정책은 **서비스 단위**이며, 상품 축은 `product_masters.regulatory_type` 이다.

### 정책 데이터 신규 생성: **불필요**

`kpa` 행을 만들 이유가 없다. 정책 축이 canonical 이고 `kpa-society` 행이 이미 존재하기 때문이다. **production INSERT/UPDATE 는 수행하지 않았고 제안하지도 않는다.** (WO §5 · §8 준수)

### ⚠️ 명시적으로 기록하는 결과 — 의약품 게이트 도달 지점 변화

`store-product-library` 의 진열 생성(`OPL_CREATE`)에서 gate 에 전달되는 key 가 `kpa` → `kpa-society` 로 바뀐다. 따라서 KPA 매장의 판정 경로가 **③에서 거부(`DRUG_POLICY_UNAVAILABLE`)** 되던 것에서 **④까지 진행**하게 된다.

- ④는 `organization_service_enrollments` 에 `kpa-society` active 소속을 요구한다.
- **현재 운영 DB 의 KPA enrollment 는 0건**(§7) → **오늘 시점에 의약품 진열이 새로 허용되는 매장은 없다.**
- 앞으로 생성되는 KPA 매장(선행 WO 로 enrollment 가 생김)은 ④를 통과할 수 있다.

이것은 **정책을 추정해 새로 허용한 것이 아니다.** 근거는 두 가지 기존 사실뿐이다:

(a) `service_audience_policies` 에 `kpa-society = true` 행이 **이미 운영 데이터로 존재**하고,
(b) canonical 경로인 `POST /pharmacy-products/apply` 는 이미 `kpa-society` 로 동작하여 같은 판정을 받고 있다.

종전 거부는 정책 판단이 아니라 **key drift 로 인한 우발적 fail-closed** 였다.

그럼에도 "KPA 매장이 자료실 경로로 의약품을 직접 진열할 수 있는가" 는 사업 판단이므로, **기존 조직 backfill 실행 전에 사용자 확인이 필요한 유일한 항목**으로 §8 에 올린다.

---

## 6. 남은 legacy key 사용처 (수정하지 않음 · 근거 포함)

| 위치 | 값 | 남긴 이유 |
|---|---|---|
| `event-offer.service.ts` `STORE_SERVICE_KEY_MAP[kpa-groupbuy] = 'kpa'` | `kpa` | 이 행은 **서비스 경계가 아니라 row 판별자**다. `pharmacy-products.controller` 가 `service_key='kpa' AND source_type='event-offer'` 를 "이벤트 주문 파생 진열 행"으로 문서화·소비한다. `kpa-society` 로 바꾸면 유니크 제약 `(org, service_key, offer_id)` 에서 일반 진열 행과 병합되어 조용히 사라진다. Event Offer 도메인 계약 변경이므로 별도 WO. |
| `pharmacy-products.controller` `resolveServiceKeyFromQuery/Body` | 클라이언트 값 허용 | HUB-P0-04 가 "row 판별자 축"으로 남기기로 이미 판정. 서비스 경계 쓰기·읽기는 마운트 도출로 전환 완료. |
| `store-product-request.controller` `MEMBERSHIP_KEY_TO_SERVICE_KEY` | `kpa` | `product_candidates.service_key` = role-prefix 축(운영자 스코프 구성). **의도된 별도 축**. |
| entity/DDL default `'kpa'` (OPL · ProductApproval) | `kpa` | 모든 INSERT 가 키를 명시 → 실효 0. schema 변경은 WO §8 금지. |
| `platform_store_slugs.service_key = 'kpa'` | `kpa` | 매장 URL 식별 축. 상품/정책 축 아님. |
| copilot `VALID_SERVICES`, `cms_*`, `community_*` | `kpa` | 상품 도메인 밖. |

---

## 7. Production read-only census (WO §6)

접속: 기존 `cloud-sql-proxy` (127.0.0.1:15432) · **SELECT 전용 · write 0건**.

| 항목 | 값 |
|---|---|
| `organization_product_listings` 전체 | **20행 (전부 `service_key='neture'`)** |
| OPL `service_key IN ('kpa','kpa-society')` | **0행** |
| OPL 중복 후보 (같은 org+offer 에 두 키 공존) | **0건** |
| `service_audience_policies` KPA 행 | `kpa-society` 1행(true) · `kpa` **0행** |
| `organization_service_enrollments` | cosmetics 1 · glycopharm 2 · k-cosmetics 2 · neture 3 · pharmacy-hub 5 · **kpa / kpa-society 0** |
| `product_approvals` | 1행 (`kpa-society`) |
| `offer_service_approvals` | 전체 3행 · `kpa-society` approved **1행** |
| PUBLIC 승인 offer (활성 공급자) | **0건** / 그 중 DRUG **0건** |
| `product_candidates.service_key` | NULL 394,490 · `neture` 5 (**kpa 0**) |
| `platform_store_slugs` `service_key='kpa'` 조직 | **9개** |

> 참고: `organization_service_enrollments` 에 `cosmetics`(role-prefix) 1행이 섞여 있다. enrollment 축은 canonical 이어야 하므로 drift 이나, KPA 범위 밖이고 데이터 수정이 필요하므로 **보고만 하고 손대지 않는다**(별도 WO 후보).

### 기존 조직 backfill 시 예상 영향

| 예측 항목 | 값 | 근거 |
|---|---|---|
| 신규 OPL 행 | **0행** | auto-listing 은 *조직 생성* 과 *offer 승인* 시점에 돌고 enrollment INSERT 자체는 트리거하지 않는다. 게다가 PUBLIC 승인 offer 가 0건이다. |
| 중복 listing | **0건** | OPL 에 kpa 계열 행 자체가 없음 |
| policy allow/deny 변화 | 정책 데이터 변화 **없음** | 정책 행 미변경. 다만 §5 의 gate ④ 조건을 충족하게 되어 **의약품 진열 판정이 deny → allow 로 바뀔 수 있다** |
| 즉시 사용자 노출 변화 | 운영자 대시보드 KPA 조직 카운트 · 운영자 매장 콘솔 가시성 (선행 CHECK 과 동일) | |

---

## 8. WO §10 완료 판정

| 항목 | 결과 |
|---|---|
| 5개 key 값 확정 | ✅ §1 (`ROLE_SCOPE_KEY=kpa`, 나머지 4개 = `kpa-society`) |
| 각 key 가 그 값인 이유 | ✅ §1 (migration · 기존 WO · 운영 데이터 각각 인용) |
| 변환이 필요한 정확한 경계 | ✅ **role-prefix 축 → canonical 축 1곳뿐**: candidate(`product_candidates.service_key`) → OPL. enrollment → listing 경계는 **변환 불필요**(동축). 변환은 `resolveCanonicalServiceKey` SSOT 에만 위임 |
| 수정한 소비처 수 | **4곳** + 신규 SSOT 1 + 테스트 1 (§3) |
| 남은 legacy key 사용처 | ✅ §6 (6종, 각각 근거 명시) |
| 운영 데이터 수정 필요 여부 | **불필요** — OPL kpa 계열 0행, policy `kpa` 행 불필요. **data-fix 후속 제안 없음** |
| 기존 조직(slug 기준 9개) backfill | **조건부 실행 가능** — 아래 |

### backfill 판정: 기술적 차단 요인 **해소**, 사업 판단 **1건 남음**

- ✅ 선행 조건 1 (OPL key 불일치) — 해소. 쓰기 경로 canonical 정렬 완료, 정리할 운영 데이터 0행.
- ✅ 선행 조건 2 (`kpa` 정책 행 부재) — **무효화**. 정책 축이 canonical 이므로 `kpa` 행은 필요 없고 `kpa-society` 행이 이미 있다.
- ⚠️ 남은 판단: backfill 하면 해당 매장들이 **의약품 게이트 ④를 통과**하게 된다(§5). 이를 의도하는지 확인 후 진행한다. 의도하지 않는다면 backfill 전에 "KPA 매장 자료실 경로의 의약품 진열 차단" 을 별도 WO 로 먼저 정의해야 한다.

---

## 9. 검증 (WO §9)

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | ✅ 0 errors |
| **전체 api-server Jest** | ✅ **122 suites / 1,925 tests 전부 통과** |
| auto-listing 회귀 (KCos/GP/PH) | ✅ 호출부 값 무변경 확인 + 전체 스위트 통과 |
| listing key 도출 신규 테스트 | ✅ `src/utils/__tests__/listing-service-key.test.ts` 7 tests — canonical 유지 · role-prefix 거부 · multi-membership 우선순위 · GP/Neture 무회귀 |
| drug gate allow/deny 계약 | ✅ `src/__tests__/security/drug-access-gate.spec.ts` 통과 (가드 로직 무변경) |
| KPA handled-products 회귀 | ✅ `kpa-boundary-regression.spec.ts` · `kpa-role-guard.spec.ts` 통과 |
| production read-only 영향 예측 | ✅ §7 |
| production write | **0건** |

---

## 10. 변경 파일

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/utils/listing-service-key.ts` | 신규 — OPL service_key 도출 SSOT |
| `apps/api-server/src/utils/__tests__/listing-service-key.test.ts` | 신규 — 회귀 테스트 7건 |
| `apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts` | 로컬 역매핑 제거 → SSOT 위임 |
| `apps/api-server/src/routes/kpa/controllers/organization.controller.ts` | auto-listing 두 호출 key 정렬 |
| `apps/api-server/src/modules/neture/services/store-product-request-admin.service.ts` | candidate → OPL 경계 변환 |
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | candidate → OPL 경계 변환 |

**migration · schema · 운영 데이터 변경 없음.**

---

## 11. 문서 정합

- 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
  - (1) Event Offer 파생 행 `service_key='kpa'` 판별자 정리 (§6)
  - (2) OPL · ProductApproval entity/DDL default `'kpa'` 제거 (§3-4)
  - (3) `organization_service_enrollments` 의 `cosmetics` 1행 canonical 정정 (§7)
