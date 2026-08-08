# CHECK-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1

> **작업명:** WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1
> **유형:** 구현 — 의약품 판정 SSOT 공통화 + offer/OPL 신규 유입 게이트
> **결과: PASS** — 공통 가드 신설(`drug-access.guard.ts`), offer 4경로 + OPL 3경로 + 자동확산 4함수에 게이트 연결.
> api-server `tsc --noEmit` **0 errors** · 신규 회귀 테스트 **24/24 PASS** · 기존 security 스위트 **255/255 PASS**(11 suites).
> **DB write 0 · schema/migration 0 · 기존 데이터 변경 0.**
> 기준 커밋: `a7486832a` · 선행 실측: `e30358f92`

---

## 1. 의약품 판정 SSOT 구현 위치

[`apps/api-server/src/modules/neture/guards/drug-access.guard.ts`](../../apps/api-server/src/modules/neture/guards/drug-access.guard.ts) (신규)

```ts
isDrugRegulatoryType(regulatoryType)  // 문자열 정규화 판정
isDrugProduct(master)                 // ProductMaster-like 객체
isDrugProductById(executor, masterId) // true | false | null(확정 불가)
```

- SSOT = `product_masters.regulatory_type`. `'DRUG'` + 한글 `'의약품'` 인정, 대소문자·공백 정규화.
- `regulatory_type` 은 DB enum 이 아니라 **varchar(50)** 이며 운영 데이터에 한글 표기가 섞여 있어(실측 U2) 정규화가 필요했다.
- **의약외품(QUASI_DRUG)은 의약품에 포함하지 않는다** — 기존 유통 계약 보존.
- `product_categories.is_regulated` 는 판정에 **사용하지 않는다** (실측 U13: DRUG 커버리지 0%).

## 2. 약국 서비스·조직 문맥 판정 위치

동일 파일.

```ts
isPharmacyAudienceServiceStrict(executor, serviceKey)      // true | false | null
organizationBelongsToService(executor, orgId, serviceKey)  // 서버 실제 소속 확인
```

- `service_audience_policies` **실제 행만** 신뢰한다. 행 부재·조회 실패 → `null`.
- **`ServiceAudienceService.getPharmacyAudienceResolver()` 의 하드코딩 fallback 을 의도적으로 사용하지 않는다.**
  fallback 으로 DRUG 쓰기가 허용되면 안 되기 때문이다(WO 명시). fallback 전면 제거는 `DRUG-POLICY-LIFECYCLE` 로 분리.
- 조직 소속은 `organization_service_enrollments`(status='active') 로 서버에서 재확인 → 요청 `serviceKey` 위조 차단.

## 3. 공통 게이트 함수와 지원 action

```ts
assertDrugActionAllowed(executor, ctx)  // OPL 축 (단일 serviceKey)
assertDrugOfferAllowed(executor, args)  // offer 축 (serviceKeys[] + isPublic)
filterPharmacyAudienceServiceKeys(...)  // 자동확산 대상 축소
```

지원 action: `OFFER_CREATE` · `OFFER_UPDATE` · `OFFER_PUBLISH` · `OPL_CREATE` · `OPL_ACTIVATE` · `PUBLIC_AUTO_EXPAND`

오류 코드(감사 가능):

| 코드 | 조건 |
|---|---|
| `DRUG_NON_PHARMACY_SERVICE` | 비약국 서비스로 의약품 연결 |
| `DRUG_SERVICE_CONTEXT_REQUIRED` | serviceKey 없음 / `serviceKeys=[]` |
| `DRUG_POLICY_UNAVAILABLE` | 정책 행 부재 또는 조회 실패 |
| `DRUG_ORG_CONTEXT_MISMATCH` | 조직이 해당 서비스 소속 아님 |
| `DRUG_PRODUCT_UNRESOLVED` | 상품 유형 확정 불가 |
| `DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN` | 의약품 PUBLIC 유통 등록·전환 |

> 거대한 범용 권한 엔진을 만들지 않았다. 판정 함수 3개 + action 6개 + 오류코드 6개가 전부다.

## 4. Offer 쓰기 경로 조사 결과와 적용

| 경로 | 파일:line | 기존 게이트 | 적용 |
|---|---|:---:|:---:|
| `createSupplierOffer` | `offer.service.ts:977` | is_regulated(실효 0%) | ✅ DRUG 축 추가 |
| `updateSupplierOffer` | `offer.service.ts:1138` | **없음** (P0) | ✅ 신규 — 저장 직전 최종상태 판정 |
| `updateDistribution` | `offer.service.ts:1294` | **없음** (P0) | ✅ 신규 — `nextKeys`+`nextIsPublic` 판정 |
| `setServiceDelivery` | `offer.service.ts:~1440` | is_regulated | ✅ DRUG 축 추가 (제공 중지는 미차단) |
| `submitForApproval` | `offer.service.ts:411` | is_regulated | ⏸ 기존 유지 — 생성·변경 단계에서 이미 차단됨 |
| 관리자 생성·CSV·bulk·seed·import | 다수 | 없음 | ⏸ **본 WO 범위 밖** — §9 참조 |

**기존 `assertPharmacyOnlyServiceKeys`(is_regulated 축)는 제거하지 않고 유지**했다. 의약외품 등 규제 상품 전반을 덮는 별개 축이며, 제거하면 기존 동작이 바뀐다.

## 5. OPL 쓰기 경로 조사 결과와 적용

전 저장소 `INSERT INTO organization_product_listings` **12곳**(migration 제외) 조사.

| 경로 | 파일:line | DRUG 도달 | 적용 |
|---|---|:---:|:---:|
| **매장 picker — offer 기반 등록** | `store-product-library.controller.ts:~250` | ✅ | ✅ `OPL_CREATE` |
| **매장 picker — master 직접 등록(offer_id NULL)** | `store-product-library.controller.ts:~290` | ✅ **실제 발생** | ✅ `OPL_CREATE` |
| **매장 listing 활성화 (PATCH /:id)** | `store-product-library.controller.ts:~407` | ✅ | ✅ `OPL_ACTIVATE` (false→true 만) |
| `autoExpandPublicProduct` | `auto-listing.utils.ts:27` | ✅ | ✅ SQL 조건 |
| `autoExpandServiceProduct` | `auto-listing.utils.ts:~130` | ✅ | ✅ SQL 조건 |
| `autoListPublicProductsForOrg` | `auto-listing.utils.ts:~186` | ✅ | ✅ SQL 조건 |
| `autoListServiceProductsForOrg` | `auto-listing.utils.ts:~230` | ✅ | ✅ SQL 조건 |
| `PharmacyHubHandledProductController:196` | pharmacy-hub | 약국 서비스(허용) | ⏸ 정책상 허용 대상 |
| `partner-contract.service.ts:868` · `product-candidate.service.ts:486` · `store-product-request-admin.service.ts:142` · `product-approval-v2.service.ts:187` · `event-offer.service.ts:960,1137` | 각 도메인 | 미확인 | ⏸ **§9 잔여** |

## 6. PUBLIC 자동확산 차단 방식

**부분 성공을 만들지 않는다.** 두 층으로 처리했다.

1. **요청 자체 거부** — 의약품 offer 를 `isPublic=true` 로 등록·전환하려 하면
   `DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN` 으로 **명시적 거부**한다(`createSupplierOffer`/`updateSupplierOffer`/`updateDistribution`).
   PUBLIC 은 전 서비스 확산을 뜻하므로 약국 한정과 양립할 수 없다.
2. **확산 시점 방어** — 그럼에도 도달한 경우(수동 DB 변경 등) 자동확산 SQL 이 대상 조직을 약국 대상 서비스로 제한한다.

```sql
AND (
  NOT EXISTS (SELECT 1 FROM product_masters pm_drug
               WHERE pm_drug.id = $2
                 AND upper(btrim(pm_drug.regulatory_type)) IN ('DRUG','의약품'))
  OR EXISTS (SELECT 1 FROM service_audience_policies sap
              WHERE sap.service_key = ose.service_code
                AND sap.is_pharmacy_target_service = true)
)
```

- 비의약품이면 첫 `NOT EXISTS` 가 참 → **기존 확산 동작 완전 불변**.
- 정책 행이 없으면 `EXISTS` 가 거짓 → 제외(fail-closed).
- **조용한 skip 금지** — 의약품 확산 시 `logger.warn('[AutoListing][DRUG] ... 확산을 약국 대상 서비스로 제한했다. 생성된 listing=N')` 로 감사 로그를 남긴다.

## 7. `offer_id IS NULL` OPL 생성 경로의 원인

[`store-product-library.controller.ts`](../../apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts) 의
`POST /list` 에는 **두 갈래**가 있다.

- `offerId` 를 주면 offer 기반 등록
- **`masterId` 만 주면 `offer_id = NULL` 로 직접 등록** (주석: "Master 기반 등록 (offer_id = NULL)")

후자는 `is_active=true` 로 즉시 생성되며 `service_key` 는 `deriveListingServiceKey(req)` — **사용자의 active membership 에서 도출**된다.

## 8. 운영 `neture` DRUG OPL 5건의 추정 생성 경로

| 항목 | 판단 |
|---|---|
| 경로 | `POST /api/v1/store/products/list` (master 기반, offer_id NULL) |
| 근거 | 실측 U9 에서 5건 전부 `offer_id IS NULL` · DRUG offer 는 0건이라 offer 경유 불가 |
| 현재 실행 가능? | **적용 전까지 가능했다.** 상품 검색(`GET /store/products/search`)이 의약품을 그대로 반환하고, 등록 API 에 의약품 판정이 없었다 |
| 호출 가능 주체 | **매장 owner**(`requireAuth` + `requireStoreOwner`). 서비스 종류 무관 — `service_key` 는 membership 에서 도출되므로 `neture` 매장이면 `neture` 로 기록된다 |
| 자동 seed 여부 | 아님 — 자동확산은 `is_active=false` 로 생성하는데 5건은 전부 `active` |
| 재발 차단 지점 | 본 WO 에서 해당 INSERT 직전에 `OPL_CREATE` 게이트 연결 → 동일 요청은 이제 `403 DRUG_NON_PHARMACY_SERVICE` |

> **5건은 변경하지 않았다.** 기존 데이터 정리는 후속 WO.

## 9. fail-closed 조건과 오류 계약

| 상황 | 결과 |
|---|---|
| 상품 유형 확정 불가 | `DRUG_PRODUCT_UNRESOLVED` |
| serviceKey 없음 / `serviceKeys=[]` | `DRUG_SERVICE_CONTEXT_REQUIRED` |
| 정책 행 부재 | `DRUG_POLICY_UNAVAILABLE` |
| 정책 조회 예외 | `DRUG_POLICY_UNAVAILABLE` (**fallback 허용 없음**) |
| 조직 소속 불일치 | `DRUG_ORG_CONTEXT_MISMATCH` |
| 의약품 PUBLIC | `DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN` |

HTTP 응답은 `403 { success:false, error:{ code, message } }`, 서비스 계층은 `{ success:false, error:code, message }`.
모든 거부는 `logger.warn` 으로 org·service·master·code 를 남긴다.

## 10. 테스트

[`apps/api-server/src/__tests__/security/drug-access-gate.spec.ts`](../../apps/api-server/src/__tests__/security/drug-access-gate.spec.ts) — **24 tests, 전부 PASS**

WO 요구 12 시나리오 대응:

| WO 요구 | 테스트 |
|---|---|
| 1. 일반 서비스 DRUG offer 생성 거부 | [11] |
| 2. 일반 serviceKey 추가 수정 거부 | [13][17] |
| 3. `isPublic=true` 전환 거부 | [15] |
| 4. 약국 서비스 DRUG offer 생성 성공 | [12] |
| 5. 비의약품 기존 동작 유지 | [16] |
| 6. DRUG PUBLIC 확산이 비약국 OPL 미생성 | [18][19][20] |
| 7. offer_id 없는 직접 DRUG OPL 생성 거부 | [1][3] |
| 8. 비약국 DRUG 활성화 거부 | [10] |
| 9. serviceKey 위조·조직 불일치 거부 | [8] |
| 10. 정책 행 부재·조회 실패 fail-closed | [6][7] |
| 11. 중앙 운영자 권한이 commerce 예외로 확장 안 됨 | 본 가드는 role 예외를 두지 않음 (§11) |
| 12. 비의약품 OPL 생성·활성화 유지 | [4] |

## 11. 비의약품 기존 동작 보존 확인

- 가드는 **비의약품에 대해 항상 `{allowed:true, isDrug:false}`** 로 즉시 반환한다(no-op).
- 자동확산 SQL 조건은 비의약품이면 첫 `NOT EXISTS` 가 참이 되어 **WHERE 절이 기존과 동일**해진다.
- 기존 `assertPharmacyOnlyServiceKeys`(is_regulated) 미제거 → 의약외품 등 기존 규제 동작 유지.
- 기존 security 스위트 **255/255 PASS** (11 suites) — 회귀 없음.
- **중앙 운영자 예외를 두지 않았다.** WO 정책 6 은 "관리 조회는 허용하되 일반 B2C 유통·주문 가능 상태 생성은 허용하지 않는다" 이므로, 쓰기 축인 본 가드에 role bypass 를 넣지 않는 것이 정합적이다.

## 12. 변경 0 확인

| 항목 | 결과 |
|---|:---:|
| DB write | **0** |
| schema · migration | **0** |
| 기존 데이터(OPL 5건 · 랜딩 177,413 · SPD 45,090 · 정책행) | **무변경** |
| seed 실행 | **0** |
| 기존 병렬 세션 WIP | **미접촉** |

## 13. 변경 파일 (5)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/guards/drug-access.guard.ts` | **신규** — 공통 판정 3함수 + offer 헬퍼 + 오류코드 |
| `apps/api-server/src/modules/neture/services/offer.service.ts` | offer 4경로 게이트 연결 |
| `apps/api-server/src/utils/auto-listing.utils.ts` | 자동확산 4함수 SQL 조건 + 감사 로그 |
| `apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts` | OPL 생성 2경로 + 활성화 1경로 게이트 |
| `apps/api-server/src/__tests__/security/drug-access-gate.spec.ts` | **신규** — 회귀 24건 |

## 14. 검증

| 검증 | 결과 |
|---|:---:|
| `tsc --noEmit` (api-server) | **0 errors** |
| 신규 회귀 테스트 | **24/24 PASS** |
| 기존 security 스위트 | **255/255 PASS** (11 suites) |
| workspace deps 사전 빌드 | 완료 (`pnpm --filter "@o4o/api-server^..." build`) |

전체 monorepo build 는 미실행 — 공용 패키지·빌드 계약 변경이 없다.

## 15. 잔여 · 다음 WO 착수 조건

**본 WO 에서 다루지 않은 OPL INSERT 6곳** — 각 도메인 고유 흐름이라 DRUG 도달 가능성 확인이 선행돼야 한다.

`partner-contract.service.ts:868` · `product-candidate.service.ts:486` · `store-product-request-admin.service.ts:142` ·
`product-approval-v2.service.ts:187` · `event-offer.service.ts:960,1137`

> 이 6곳은 **현재 DRUG 유입이 관측되지 않았다**(실측: DRUG OPL 5건 전부 매장 picker 경로).
> 다만 코드상 차단은 아니므로 후속 WO 에서 도달 가능성 판정 후 동일 가드를 연결해야 한다.

**다음 WO:** 사용자 지시에 따라 `DRUG-COMMERCE-ABSOLUTE-BLOCK` 을
`PRODUCT-SEARCH-AND-DETAIL-CONTEXT-GATE` 보다 **먼저** 수행한다 (조회 노출보다 장바구니·주문 진입 위험이 크다).
착수 조건: 본 WO 배포 확인 + DRUG 장바구니·주문 실측 0건 유지 확인.

---

*구현 · 2026-08-08 · base `a7486832a`*
