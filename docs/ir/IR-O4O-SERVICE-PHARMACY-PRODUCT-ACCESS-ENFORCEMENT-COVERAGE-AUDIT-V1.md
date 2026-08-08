# IR-O4O-SERVICE-PHARMACY-PRODUCT-ACCESS-ENFORCEMENT-COVERAGE-AUDIT-V1

> **유형:** read-only 전수 감사 (코드·설정·DB·schema·migration 무변경)
> **기준 커밋:** `e52f8f8b401e6d3d8adaafecea1c35f9a750f708` (main, `HEAD == origin/main`, divergence 0/0)
> **감사일:** 2026-08-08
> **범위:** 서비스별 의약품 접근정책이 상품의 등록·유입·검색·조회·거래·콘텐츠 활용 전 경로에서 실제로 강제되는지

---

## 0. 요약 결론 (3대 질문)

| 질문 | 답 | 근거 |
|------|-----|------|
| **① 의약품 접근정책의 실제 단일 기준점이 있는가** | **부분적으로 있다 — 그러나 "서비스 접근정책"이 아니라 "offer의 service_keys 연결정책"이다.** | `service_audience_policies` (SSOT) + `ServiceAudienceService`. 단 판정 대상이 *상품 접근*이 아니라 *offer↔service 연결*이다 |
| **② 모든 경로가 그 기준점을 반드시 통과하는가** | **아니다.** 전 저장소에서 gate 호출은 **단 1곳**(`offer.service.ts:1038`) + 방어 재확인 2곳뿐 | `assertPharmacyOnlyServiceKeys(` grep 결과 호출부 1개 |
| **③ productMasterId·콘텐츠 복사 등 간접 참조 시 원상품 접근권한을 재검증하는가** | **아니다.** 간접 경로 전부 의약품 여부를 보지 않는다 | `product-access.utils.ts` 는 **의도적으로** ProductMaster를 service-neutral 로 선언 |

**핵심 구조적 사실:** 이 저장소에는 *"의약품은 약국 서비스에서만 조회·활용 가능"* 을 강제하는 계층이 **존재하지 않는다.**
존재하는 것은 *"규제 상품 offer 는 약국 대상 service_key 에만 연결할 수 있다"* 는 **공급 유통 축 단일 규칙**이며,
조회·검색·콘텐츠·거래 축에는 대응물이 없다.

---

## 1. 감사 기준과 현재 정책 해석

WO가 제시한 6개 정책 원칙 대비 현재 구현 상태:

| # | 정책 원칙 | 구현 상태 | 판정 |
|---|-----------|----------|:----:|
| 1 | 의약품은 약국 허용 서비스에서만 취급·조회·활용 | *취급(offer 연결)* 만 부분 강제. *조회·활용* 무강제 | PARTIAL |
| 2 | 일반 서비스·일반 매장은 의약품 검색·조회·등록·가져오기 불가 | **검색·조회·가져오기 전부 가능** | NOT_ENFORCED |
| 3 | 의약품은 B2C 판매·일반 commerce 노출 금지 | commerce 계층에 의약품 판정 자체가 없음 | NOT_ENFORCED |
| 4 | 약국에서는 의약품 소개·경영활용 콘텐츠 사용 가능 | 가능 (동작함) | OK |
| 5 | 화면 숨김만으로 불충분, 서버 강제 필요 | 화면 숨김조차 없음 (배지만 표시) | NOT_ENFORCED |
| 6 | 중앙 운영자 vs 서비스 운영자·공급자·매장 권한 구분 | `platform:super_admin` 만 구분. 서비스 운영자는 사실상 동급 | PARTIAL |

---

## 2. 실제 정책 SSOT 와 생명주기

### 2.1 SSOT

| 요소 | 위치 | 비고 |
|------|------|------|
| 테이블 | `service_audience_policies` | `service_key` UNIQUE, 1 서비스 = 1 row |
| Entity | [ServiceAudiencePolicy.entity.ts:23-47](apps/api-server/src/modules/neture/entities/ServiceAudiencePolicy.entity.ts#L23-L47) | 유일 필드 `is_pharmacy_target_service: boolean` |
| Service | [service-audience.service.ts](apps/api-server/src/modules/neture/services/service-audience.service.ts) | `isPharmacyAudienceService()` :104, `getPharmacyAudienceResolver()` :115 |
| Admin API | [admin-service-audience.controller.ts:47](apps/api-server/src/modules/neture/controllers/admin-service-audience.controller.ts#L47) | `neture:admin` 전용 |
| Admin UI | [ServiceAudiencePolicyPage.tsx](services/web-neture/src/pages/admin/ServiceAudiencePolicyPage.tsx) | admin.neture.co.kr 전용 |

### 2.2 기본값 — deny-by-default 아님, **하드코딩 allow-list fallback**

[service-audience.service.ts:17](apps/api-server/src/modules/neture/services/service-audience.service.ts#L17)

```ts
const DEFAULT_PHARMACY_SERVICE_KEYS = ['glycopharm', 'kpa-society'];
```

row 부재 시 이 상수로 fallback한다. 즉 **정책 행이 전혀 없는 신규 서비스 → `false`(비약국)** 로 판정된다.
이 방향은 *약국 서비스로의 오인 허용*은 막으므로 **해당 gate 한정으로는 안전(fail-closed)** 이다.

다만 반대 위험이 실재한다: **신규 약국 서비스가 seed 누락 시 조용히 비약국으로 판정**되어 정상 의약품 공급이 차단된다.
실제로 그 사고가 한 번 발생해 [20270218000000-SeedPharmacyHubPharmacyAudience.ts](apps/api-server/src/database/migrations/20270218000000-SeedPharmacyHubPharmacyAudience.ts) 로 사후 교정되었다(주석 §8-12 에 명시).

### 2.3 Seed 값 (migration 기준 — DB 실측 미확인, §8 참조)

| service_key | is_pharmacy_target_service | 출처 |
|---|:---:|---|
| `kpa-society` | true | 20260615160000 |
| `glycopharm` | true | 20260615160000 |
| `k-cosmetics` | false | 20260615160000 |
| `neture` | false | 20260615160000 |
| `pharmacy-hub` | true | 20270218000000 |

### 2.4 생명주기 공백

- **생성/갱신**: admin upsert 만. 신규 서비스 등록 시 정책 행 자동 생성 훅 **없음**.
- **삭제**: 엔티티에 soft-delete·비활성 컬럼 **없음**. row 삭제 시 조용히 fallback 상수로 회귀.
- **stale 처리**: 없음. `updatedAt` 은 기록되나 만료·재검토 로직 없음.
- **캐시**: 없음(매 호출 DB 조회) → 정책 변경은 즉시 반영. 이 점은 양호.
- **정책 변경의 소급 효과**: **없음.** 이미 생성된 offer·listing·콘텐츠는 재평가되지 않는다.

---

## 3. 의약품 판정 축 — 3중 이원화 (중대 결함)

의약품 여부를 판정하는 축이 **서로 다른 3개**이며 gate 마다 다른 축을 쓴다.

| 축 | 정의 위치 | 사용처 | 문제 |
|---|---|---|---|
| **A. `product_categories.is_regulated`** | ProductCategory 테이블 | **유일하게 gate 에 쓰이는 축** (`assertPharmacyOnlyServiceKeys`) | 의약품이 아니라 "규제 상품" 전반. `category_id` 가 NULL 이면 판정 불가 → gate 무력화 |
| **B. `product_masters.regulatory_type`** | ProductMaster 컬럼 | 표시·필터 전용 (`deriveProductClassification`) | gate 에 **전혀 쓰이지 않음** |
| **C. `product_masters.drug_category`** | ProductMaster 컬럼 (otc/rx/quasi/…) | 표시·필터 전용 | gate 에 **전혀 쓰이지 않음** |

[product-type.util.ts](apps/api-server/src/modules/neture/utils/product-type.util.ts) 는 `getDefaultDrugDisplayPolicy()` 로
`pharmacyOnly` / `customerDisplayAllowed` / `onlineSaleAllowed` / `tabletDisplayAllowed` 정책을 **정의**하지만
— **이 함수의 반환값을 강제에 사용하는 호출부가 존재하지 않는다.**

> **판정: `getDefaultDrugDisplayPolicy` = DEAD_OR_UNUSED (정책 선언만 존재, 소비자 없음)**

즉 정책 의도는 코드로 **문서화**되어 있으나 **연결되어 있지 않다.**
상품 230,841건 규모의 의약품 ProductMaster가 `regulatory_type='DRUG'` 로 존재하지만,
gate 는 그 컬럼을 보지 않고 `product_categories.is_regulated` 만 본다.

---

## 4. 전체 경로 인벤토리 · 결과표

> 프런트 차단 = 메뉴/검색결과 숨김 여부. 백엔드 차단 = 서비스/쿼리 계층 의약품 판정 여부.

### A. 상품 유입·등록

| 진입 화면/호출자 | route/endpoint | controller/service | 유형판정 필드 | 정책판정 지점 | 프런트 | 백엔드 | 직접ID | 판정 |
|---|---|---|---|---|:---:|:---:|:---:|:---:|
| 공급자 상품 등록 | `POST /neture/supplier/offers` | `offer.service.ts:977` `createSupplierOffer` | `is_regulated`(A) | **:1038 유일 gate** | ✗ | ✔ | — | **ENFORCED**\* |
| 공급자 승인요청 | `submitForApproval` | `offer.service.ts:411` | `is_regulated`(A) | :451 방어 재확인 | ✗ | ✔ | — | ENFORCED |
| 서비스별 제공 토글 | `setServiceDelivery` | `offer.service.ts:~1410` | `is_regulated`(A) | :1434-1443 | ✗ | ✔ | — | ENFORCED |
| **공급자 offer 편집** | `updateSupplierOffer` | `offer.service.ts:1138` | — | **없음** | ✗ | ✗ | ✔ | **BYPASSABLE** |
| **유통 설정 변경** | `updateDistribution` | `offer.service.ts:1294` | — | **없음** | ✗ | ✗ | ✔ | **BYPASSABLE** |
| **PUBLIC 자동 확산** | (내부) | `auto-listing.utils.ts:27` | — | **없음** | — | ✗ | — | **BYPASSABLE** |
| 매장 신규상품 요청 | `POST /store/product-requests` | `store-product-request-admin.service.ts:233` | classification | `RX_NEW_MASTER_BLOCKED` (rx만) | ✗ | 부분 | — | PARTIAL |
| 매장 취급 등록 | `POST /pharmacy-hub/.../handled-products` | `PharmacyHubHandledProductController:196` | — | exposure gate(서비스 scope) | ✗ | 부분 | — | PARTIAL |

\* `createSupplierOffer` 조차 **`serviceKeys` 가 비어 있으면 no-op** — [offer.service.ts:112](apps/api-server/src/modules/neture/services/offer.service.ts#L112)

### B. 조회·노출

| 진입 화면/호출자 | route/endpoint | controller/service | 정책판정 | 프런트 | 백엔드 | 직접ID | 판정 |
|---|---|---|---|:---:|:---:|:---:|:---:|
| **공급자/저작/관리자 picker** | `GET /api/v1/neture/products/library/search` | [product-library.controller.ts:64](apps/api-server/src/modules/neture/controllers/product-library.controller.ts#L64) → `searchProductMasters` | **`requireAuth` 만** | ✗ | ✗ | ✔ | **NOT_ENFORCED** |
| **매장 picker** | `GET /api/v1/store/products/search` | [store-product-library.controller.ts:117](apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts#L117) | `requireAuth`+`requireStoreOwner` (서비스 무관) | ✗ | ✗ | ✔ | **NOT_ENFORCED** |
| 상품 상세 | `GET /neture/products/library/:id` | `catalog.getProductMasterById` | 없음 | ✗ | ✗ | ✔ | **NOT_ENFORCED** |
| operator 콘솔 | `GET /api/v1/operator/products` | `ProductConsoleController` (별도 raw SQL) | OPL 기반 서비스 scope | ✗ | 부분 | ✔ | PARTIAL |
| SPD 콘텐츠 browse | `GET /neture/product-contents` | `product-content-browse.controller.ts:54` | `serviceKey` = **caller 필터** | ✗ | ✗ | ✔ | **NOT_ENFORCED** |
| **공개 QR 랜딩** | `GET /api/v1/public/product-landings/:publicKey` | [product-landing.controller.ts:44](apps/api-server/src/modules/neture/controllers/product-landing.controller.ts#L44) `optionalAuth` | 로그인 게이트 + status 만 | ✗ | ✗ | ✔ | **BYPASSABLE** |

**핵심:** `catalog.service.ts:355` `searchProductMasters()` 는 **serviceKey/organizationId 파라미터 자체가 없다.**
`regulatoryType`·`drugCategory` 는 **호출자가 지정하는 필터**이므로, 오히려 `classification=otc` 로 **의약품만 골라 조회**할 수 있다.
이 단일 메서드가 관리자 목록 · 공급자 picker · 매장 picker **3경로 공용**이다.

### C. 거래 경로

| 경로 | 정책판정 | 판정 |
|---|---|:---:|
| 장바구니 / checkout / 주문 | 의약품 판정 **부재** (grep: `regulatory_type|is_regulated` 0건) | **NOT_ENFORCED** |
| listing 활성화 (`is_active`) | 의약품 판정 부재 | **NOT_ENFORCED** |
| B2C 상세·주문 | 의약품 판정 부재 | **NOT_ENFORCED** |

`getDefaultDrugDisplayPolicy().onlineSaleAllowed=false` 는 선언되어 있으나 **commerce 계층이 이를 조회하지 않는다.**

### D. 콘텐츠 활용 (간접 참조)

| 경로 | 접근 판정축 | 의약품 재검증 | 판정 |
|---|---|:---:|:---:|
| 전역 상품 AI 콘텐츠 / POP 렌더 | [product-access.utils.ts:108](apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L108) — super_admin / 자기 offer / **active OPL** | **없음** | **BYPASSABLE** |
| 매장 콘텐츠 ↔ 제품 링크 | [store-content.service.ts:98](apps/api-server/src/services/store/store-content.service.ts#L98) — `organization_id` 일치만 | **없음** | **BYPASSABLE** |
| QR / POP / 태블릿 / 사이니지 | store-public 핸들러 — 의약품 판정 grep 0건 | **없음** | **NOT_ENFORCED** |
| SPD 다국어 콘텐츠 | serviceKey = caller 필터 | **없음** | **NOT_ENFORCED** |

> **`product-access.utils.ts:9-14` 는 명시적으로 선언한다:**
> *"표준 ProductMaster 는 **전 서비스 공용**이며 service 소유권을 갖지 않는다.
> `organization_product_listings.service_key` 를 ProductMaster 의 service 경계로 사용하지 않는다."*
>
> 이는 2026-07-29 사용자 승인된 **의도적 결정**이다. 따라서 콘텐츠 축의 무강제는 *버그가 아니라 설계*이며,
> 의약품 정책과 **정면으로 충돌**한다. → §10 정책 충돌 항목.

### E. 프런트엔드 일치

4단계(메뉴 숨김 / route guard / API 권한 / 서비스계층 판정) 중
**의약품 관련해서는 1·2·4 단계가 전 경로에서 부재**하다.
프런트의 `isPharmacy` 변수(GlycoGlobalHeader 등)는 **사용자의 약국 여부에 따른 내비게이션 표시**일 뿐
상품 목록에서 의약품을 제외하지 않는다. 의약품은 `의약품` **배지와 함께 정상 표시**된다
([product-type.util.ts:213-223](apps/api-server/src/modules/neture/utils/product-type.util.ts#L213-L223) `CLASSIFICATION_LABELS`).

---

## 5. 판정별 집계

| 판정 | 건수 | 대상 |
|---|:---:|---|
| **ENFORCED** | 3 | createSupplierOffer / submitForApproval / setServiceDelivery |
| **PARTIAL** | 3 | operator 콘솔 / 매장 신규상품 요청(rx만) / pharmacy-hub 취급등록 |
| **UI_ONLY** | 0 | *(화면 숨김조차 없음)* |
| **BYPASSABLE** | 6 | updateSupplierOffer / updateDistribution / PUBLIC 자동확산 / 공개 QR 랜딩 / 전역 AI 콘텐츠 / 매장 콘텐츠 링크 |
| **NOT_ENFORCED** | 9 | 상품검색 2 · 상품상세 · SPD browse · QR/POP/태블릿 · commerce 3 · listing 활성화 |
| **DEAD_OR_UNUSED** | 1 | `getDefaultDrugDisplayPolicy()` |
| **INTENDED_EXCEPTION** | 1 | `platform:super_admin` 전역 권한 |
| **UNKNOWN** | 4 | DB 실측 항목 (§8) |

---

## 6. 우회 가능 경로와 재현 조건 (위험도순)

### 🔴 P0-1. PUBLIC 전환 → 전 서비스 매장 자동 확산

**재현:**
1. 규제 상품(의약품) offer 를 `serviceKeys=[]` 로 생성 → [offer.service.ts:112](apps/api-server/src/modules/neture/services/offer.service.ts#L112) **gate no-op 통과**
2. `updateSupplierOffer({ isPublic: true })` 호출 → [:1138](apps/api-server/src/modules/neture/services/offer.service.ts#L1138) **gate 없음**
3. `deriveDistributionType(true, [])` → `PUBLIC` ([:30-32](apps/api-server/src/modules/neture/services/offer.service.ts#L30-L32))
4. 승인·활성 상태면 [:1253-1258](apps/api-server/src/modules/neture/services/offer.service.ts#L1253-L1258) → `autoExpandPublicProduct`
5. [auto-listing.utils.ts:33-51](apps/api-server/src/utils/auto-listing.utils.ts#L33-L51) — **`organization_service_enrollments` 전체**에 OPL INSERT.
   서비스 필터·의약품 필터 **전무**

**결과:** 의약품이 K-Cosmetics·Neture 포함 **전 서비스 전 매장**에 listing 으로 확산.
`is_active=false` 로 생성되나 매장이 토글만 하면 활성화되며, **OPL 존재 자체가 콘텐츠 접근 권한**([product-access.utils.ts:214](apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L214))이므로 즉시 의약품 콘텐츠 열람이 가능해진다.

**근거:** `assertPharmacyOnlyServiceKeys(` 호출부는 저장소 전체에서 **`offer.service.ts:1038` 단 1곳**.

### 🔴 P0-2. `updateDistribution` — serviceKeys 변경 무게이트

[offer.service.ts:1294](apps/api-server/src/modules/neture/services/offer.service.ts#L1294) 는 `serviceKeys` 를 변경하지만 의약품 gate 가 없다.
자매 함수 `setServiceDelivery`([:1434](apps/api-server/src/modules/neture/services/offer.service.ts#L1434))에는 gate 가 있다 → **동일 축의 비대칭.**

> **CHECK 문서의 전제가 stale:** [CHECK-O4O-DRUG-SERVICE-CONNECTION-GATE-V1.md §2](docs/investigations/CHECK-O4O-DRUG-SERVICE-CONNECTION-GATE-V1.md) 는
> *"serviceKeys 는 생성 시 확정·이후 불변 → updateSupplierOffer 제외(변경 불가)"* 라고 기록했다.
> 그러나 이후 `updateDistribution` · `setServiceDelivery` 가 도입되어 **serviceKeys 는 더 이상 불변이 아니다.**
> gate 설계 근거가 무너진 상태다.

### 🟠 P1-3. 일반 서비스 전원 의약품 전수 검색

`GET /api/v1/neture/products/library/search` — **`requireAuth` 단독.**
K-Cosmetics 공급자·Neture 사용자 누구나 `?classification=otc` 로 의약품 ProductMaster 전량을 페이지네이션 조회 가능.

### 🟠 P1-4. 공개 QR 랜딩을 통한 의약품 콘텐츠 노출

- 랜딩 생성 권한: `cosmetics:operator`·`neture:operator` 포함 ([product-landing.controller.ts:23-33](apps/api-server/src/modules/neture/controllers/product-landing.controller.ts#L23-L33)) → **비약국 서비스 운영자가 의약품 랜딩을 만들 수 있다.**
- 소비: `optionalAuth`. 로그인만 하면 `description_type='STORE'` 의약품 설명서 전문이 반환된다. 서비스·매장 소속 무관.

### 🟡 P2-5. 콘텐츠 간접 접근 시 원상품 재검증 부재

`resolveProductForLink`([store-content.service.ts:98](apps/api-server/src/services/store/store-content.service.ts#L98))·`resolveGlobalProductResourceAccess` 둘 다
**organization 소유 여부만** 검사하고 `productMasterId` 의 의약품 여부는 보지 않는다.
P0-1 로 OPL 이 생기면 그대로 콘텐츠 권한으로 전이된다.

---

## 7. 기존 테스트 커버리지

| 항목 | 결과 |
|---|---|
| `REGULATED_PRODUCT_NON_PHARMACY_SERVICE` 검증 테스트 | **0건** |
| `isPharmacyTargetService` / `assertPharmacyOnly` 테스트 | **0건** |
| `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE` 테스트 | **0건** |
| 관련 존재 테스트 | `__tests__/security/product-ai-global-access.spec.ts` — **OPL 기반 접근만** 검증, 의약품 축 없음 |

> **의약품 접근 gate 전체에 회귀 테스트가 0건이다.** 유일한 gate 1줄이 삭제돼도 CI 는 통과한다.

CHECK 문서 §9 도 *"browser/DB smoke: 미수행"* 을 명시하고 있어, 배포 후 실증 검증도 이루어지지 않았다.

---

## 8. DB 확인 결과 — 미확인 (UNKNOWN)

read-only SELECT 를 시도했으나 채널 확보 실패. **코드 감사는 계속 진행했다.**

- `gcloud sql connect` — 접속·IP allowlist 는 성공하나 Windows 환경에서 stdin/stdout 파이프가 psql 로 전달되지 않아 결과 미반환
- Cloud SQL Auth Proxy 바이너리 **미설치** (설치는 read-only 감사 범위를 벗어나므로 미수행)
- 직접 psql TCP 접속 — 환경 정책상 차단

**미확인 항목 (후속 확인 필요):**

| # | 확인할 SQL (SELECT only) | 목적 |
|---|---|---|
| U1 | `SELECT service_key, is_pharmacy_target_service FROM service_audience_policies` | 실제 정책 행 vs seed 일치 여부 |
| U2 | `SELECT count(*) FROM product_masters WHERE regulatory_type='DRUG'` | 노출 위험 모수 |
| U3 | `SELECT count(*) FROM product_categories WHERE is_regulated=true` + 의약품 master 중 `category_id IS NULL` 비율 | **gate 축 A 의 실효 커버리지** — NULL 이면 gate 무력 |
| U4 | 의약품 master 를 참조하는 OPL 을 `service_key` 별 집계 | P0-1 실제 발생 여부 |
| U5 | `distribution_type='PUBLIC'` 이면서 규제 상품인 offer 수 | P0-1 노출 실측 |
| U6 | 비약국 service_key 를 가진 규제 상품 offer 수 | 기존 데이터 위반 |

> **U3 가 가장 중요하다.** gate 가 `product_categories.is_regulated` 에만 의존하므로,
> 의약품 ProductMaster 다수가 `category_id IS NULL` 이면 **현행 gate 는 사실상 전면 무력**이다.

---

## 9. 위험도별 결함 목록

| ID | 위험 | 판정 | 영향 |
|---|---|:---:|---|
| **D1** | PUBLIC 자동확산에 서비스·의약품 필터 없음 | BYPASSABLE | 🔴 전 서비스 의약품 확산 |
| **D2** | `updateSupplierOffer`·`updateDistribution` 무게이트 | BYPASSABLE | 🔴 gate 우회 |
| **D3** | `serviceKeys=[]` 시 gate no-op | BYPASSABLE | 🔴 D1 의 진입점 |
| **D4** | 공용 상품검색이 서비스 문맥을 받지 않음 | NOT_ENFORCED | 🟠 전원 의약품 조회 |
| **D5** | 의약품 판정축 3중 이원화, gate 는 A축만 사용 | PARTIAL | 🟠 gate 실효성 불명(U3) |
| **D6** | `getDefaultDrugDisplayPolicy` 소비자 0 | DEAD | 🟠 정책 선언만 존재 |
| **D7** | commerce 전 계층 의약품 판정 부재 | NOT_ENFORCED | 🟠 B2C 진입 가능 |
| **D8** | 공개 랜딩 생성 권한에 비약국 운영자 포함 | BYPASSABLE | 🟠 의약품 공개 노출 |
| **D9** | 콘텐츠 간접참조 시 원상품 재검증 없음 | BYPASSABLE | 🟡 권한 전이 |
| **D10** | 회귀 테스트 0건 | — | 🟡 재발 무방비 |
| **D11** | 정책 행 생명주기(신규서비스 자동생성·soft delete) 부재 | PARTIAL | 🟡 운영 사고 재발(선례 있음) |
| **D12** | 정책 변경이 기존 offer·listing·콘텐츠에 소급되지 않음 | NOT_ENFORCED | 🟡 stale 노출 잔존 |

---

## 10. 최소 보완 원칙 · 정책 충돌

### 10.1 선결 정책 결정 (코드만으로 판단 불가 — 사용자 판단 필요)

**`ProductMaster` 는 service-neutral 인가, 아닌가?**

- [product-access.utils.ts:9-14](apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L9-L14) — *"전 서비스 공용, service 소유권 없음"* (2026-07-29 승인)
- 본 WO 정책 2 — *"일반 서비스는 의약품을 조회할 수 없어야 한다"*

**두 명제는 양립 불가능하다.** 어느 쪽을 상위로 둘지 확정하지 않으면 보완 설계가 불가능하다.

> **권고: "ProductMaster 는 service-neutral 하되, `regulatory_type='DRUG'` 인 master 는 예외적으로 pharmacy-audience gate 를 통과한 호출자에게만 노출한다"** —
> 즉 service 소유권 모델은 유지하고, **의약품만 횡단 관심사(cross-cutting gate)로 분리**한다.
> 이렇게 하면 기존 F12 Product Resource Baseline·전역 자원 모델을 깨지 않으면서 정책을 만족한다.

### 10.2 최소 보완 원칙

1. **판정축 단일화** — gate 는 `product_masters.regulatory_type`(B축) 기준으로 통일. `is_regulated`(A축)는 보조.
2. **단일 공통 게이트 1개** — `assertDrugAccessAllowed(serviceKey|actor, master)` 하나를 만들고 모든 경로가 이를 통과.
3. **fail-closed** — `serviceKeys` 비었거나 서비스 문맥 부재 시 **거부**(현행 no-op 반대).
4. **검색은 필터가 아니라 gate** — `searchProductMasters` 에 **필수** `callerServiceKey` 파라미터 추가, 비약국이면 DRUG 강제 제외.
5. **간접 참조 재검증** — OPL·콘텐츠 복사·랜딩 소비 시 원 master 의 의약품 여부 재확인.

---

## 11. 후속 구현 WO 분할안 (우선순위순)

| 순위 | WO | 대상 결함 | 규모 |
|:---:|---|---|:---:|
| **1** | `WO-…-DRUG-ACCESS-POLICY-DECISION-V1` — §10.1 정책 충돌 확정 (**선결**) | D5 전제 | 문서 |
| **2** | `WO-…-DRUG-GATE-SSOT-CONSOLIDATION-V1` — 판정축 단일화 + 공통 gate 함수 신설 | D5·D6 | 중 |
| **3** | `WO-…-OFFER-MUTATION-GATE-COVERAGE-V1` — updateSupplierOffer·updateDistribution·빈 serviceKeys | D2·D3 | 소 |
| **4** | `WO-…-PUBLIC-AUTO-EXPANSION-DRUG-GUARD-V1` — auto-listing 4경로 필터 | D1 | 소 |
| **5** | `WO-…-PRODUCT-SEARCH-SERVICE-CONTEXT-GATE-V1` — 검색·상세 API 서비스 문맥 강제 | D4 | 중 |
| **6** | `WO-…-DRUG-COMMERCE-BLOCK-V1` — B2C·장바구니·listing 활성화 차단 | D7 | 중 |
| **7** | `WO-…-DRUG-CONTENT-INDIRECT-ACCESS-GATE-V1` — 랜딩·QR·POP·태블릿·SPD | D8·D9 | 중 |
| **8** | `WO-…-DRUG-POLICY-LIFECYCLE-V1` — 신규서비스 자동 seed·soft delete·stale 감사 | D11·D12 | 소 |
| **9** | `WO-…-DRUG-GATE-REGRESSION-TESTS-V1` — 회귀 테스트 확충 | D10 | 소 |
| **10** | `WO-…-EXISTING-DRUG-EXPOSURE-DATA-AUDIT-V1` — §8 U1~U6 read-only DB 실측 | UNKNOWN | 소 |

> **10번은 2번보다 먼저 수행해도 좋다** — U3 결과가 gate 설계(판정축)를 좌우한다.

---

## 12. 감사 한계와 미확정 사항

1. **DB 실측 0건.** §8 U1~U6 전부 UNKNOWN. 코드상 위험이 실제 데이터로 발현됐는지는 미확인.
2. **런타임 검증 미수행.** 브라우저·API 실호출 없이 정적 추적만 수행(read-only 감사 범위 준수).
3. **scripts/ 경로 제외.** `apps/api-server/src/scripts/**` 의 대량 생산 스크립트는 HTTP 계층을 거치지 않으므로 gate 대상이 아니며, 본 감사의 접근제어 범위에서 제외했다.
4. **`ProductConsoleController` 의 자체 raw SQL** 은 OPL 기반 서비스 scope 를 갖지만 의약품 축은 없다 — PARTIAL 로 분류했으며 세부 쿼리 전수 분석은 미수행.
5. **frontend 전수 미조사.** 4개 서비스의 모든 상품 관련 화면을 열거하지 않았다. 단 "의약품 제외 필터가 존재하지 않는다"는 grep 으로 확인했다.
6. **판정 "ENFORCED" 3건도 조건부다** — 모두 `is_regulated`(A축) 의존이므로 U3 결과에 따라 PARTIAL 로 강등될 수 있다.

---

## 검증 · Git

- 코드·설정·DB·schema·migration **변경 0건**
- 신규 테스트·fixture 생성 **0건**
- DB write **0건** (SELECT 시도만, 미성공)
- `git status --short` 감사 전후 동일 (clean)
- 본 IR 문서만 신규 생성

---

*Audit: read-only · 2026-08-08 · base `e52f8f8b4`*
