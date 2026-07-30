# CHECK-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1

> WO: `WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1`
> 작업일: 2026-07-30 · 브랜치: `main`

---

## 1. 조사 결과 — SSOT

### 1-1. SupplierProductOffer 제공 범위 SSOT

| 항목 | 실측 |
|------|------|
| 컬럼 | [`SupplierProductOffer.entity.ts:146`](../../apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts) `service_keys text[] DEFAULT '{}'` |
| 별도 연결 테이블 | **없음** (배열 단일 축) |
| 파생 필드 | `distribution_type` = `deriveDistributionType(is_public, service_keys)` — `is_public→PUBLIC`, `len>0→SERVICE`, else `PRIVATE` |
| 승인 대상 키 SSOT | [`approval-service-keys.ts`](../../apps/api-server/src/modules/neture/constants/approval-service-keys.ts) `APPROVAL_ELIGIBLE_SERVICE_KEYS = ['glycopharm','kpa-society','k-cosmetics']` — **pharmacy-hub 미포함** |

### 1-2. 서비스별 가격 구조

[`OfferServicePrice.entity.ts`](../../apps/api-server/src/modules/neture/entities/OfferServicePrice.entity.ts) — `offer_service_prices(offer_id, service_key, unit_price)`, `UNIQUE(offer_id, service_key)`.
문서화된 우선순위: `event_price > offer_service_prices.unit_price > price_general > legacy opl.price`.
**신규 가격 컬럼을 추가하지 않았다.**

### 1-3. 공급자 소유권 구조

`supplier_product_offers.supplier_id` → `neture_suppliers.id`, `neture_suppliers.user_id` → `users.id`.
기존 미들웨어 [`createRequireActiveSupplier`](../../apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts)가 `supplierId` 를 주입한다.

### 1-4. 약국 조회(노출 게이트) 구조

매장 카탈로그 SSOT = [`pharmacy-products.controller.ts:83-93`](../../apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts) `buildServiceApprovalGateSql`:

```
spo.is_active = true
AND neture_suppliers.status = 'ACTIVE'
AND ( spo.distribution_type='PUBLIC' OR EXISTS(offer_service_approvals approved for svc) )
AND ( spo.distribution_type <> 'PRIVATE' OR org = ANY(allowed_seller_ids) )
```

**OrganizationProductListing 선생성은 필요 없다** — 카탈로그는 offer 직접 조회다.

### 1-5. 재사용한 기존 자산

| 재사용 | 용도 |
|--------|------|
| `ProductMaster` / `SupplierProductOffer` / `neture_suppliers` / `organizations` | 상품·공급자 원장 |
| `offer_service_prices` | 서비스별 공급가 |
| `service_audience_policies` + `ServiceAudienceService.getPharmacyAudienceResolver()` | 의약품(규제 상품) 경계 |
| `createRequireActiveSupplier` | 공급자 자격 |
| `requirePharmacyHubScope` (membership guard) | membership active + 역할 |
| `NetureOfferService` / `NetureService` | 제공 토글 구현 위치 (신규 서비스 클래스 미생성) |
| `deriveDistributionType` | 파생 규칙 |

---

## 2. 조사에서 발견한 결함 2건 (WO §10 판단 후 사용자 승인으로 처리)

### 2-1. `updateDistribution` 의 파괴적 serviceKeys 필터 — **수정함**

수정 전 [`offer.service.ts`](../../apps/api-server/src/modules/neture/services/offer.service.ts):

```js
const nextKeys = input.serviceKeys !== undefined
  ? filterApprovalEligibleServiceKeys(input.serviceKeys)   // 승인대상 3키로 축소
  : currentKeys;
```

승인 대상이 아닌 키는 입력에 있든 없든 전부 탈락 → 공급자가 Neture 유통 화면을 한 번 저장하면
`pharmacy-hub` / `neture` / `glucoseview` 가 조용히 삭제된다. (생성 경로는 `neture`·`glucoseview`만
제외하므로 **생성과 수정의 필터 정책이 이미 불일치**했고, 기존 두 키도 같은 방식으로 소실되고 있었다.)

수정 후: **승인 대상 3키만 diff 하고 나머지 키는 보존**한다. `added`/`removed` 는 eligible 집합에서만
계산하므로 승인 큐·listing 캐스케이드 거동은 불변이다.

### 2-2. `service_audience_policies` 에 pharmacy-hub 행 부재 — **seed 함**

resolver fallback `DEFAULT_PHARMACY_SERVICE_KEYS = ['glycopharm','kpa-society']` → pharmacy-hub = `false`
→ 규제 상품(의약품) 연결이 `REGULATED_PRODUCT_NON_PHARMACY_SERVICE` 로 거부되었다.
약국 전문 서비스라는 §4.6 정의와 어긋나므로 멱등 seed migration 으로 행을 추가했다.

---

## 3. 구현 내용

### 3-1. 공급자 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/v1/pharmacy-hub/supplier/products` | 내 Offer + Pharmacy-Hub 제공 여부 · 서비스별 공급가 (page/limit/q/delivered) |
| `PATCH /api/v1/pharmacy-hub/supplier/products/:offerId/delivery` | `{ enabled, unitPrice? }` — 제공 시작/중지 |

`serviceKey` 는 서버가 `'pharmacy-hub'` 로 강제한다 (클라이언트 입력 미사용).

### 3-2. 제공 토글 구현

`NetureOfferService.setServiceDelivery(offerId, supplierId, serviceKey, { enabled, unitPrice })`

- 대상 키 **1개만** 멱등 add/remove — 다른 서비스 키 불변
- 승인 대상 키를 넘기면 `SERVICE_KEY_REQUIRES_APPROVAL_FLOW` 로 거부 (승인 큐 우회 방지)
- `distribution_type` 은 기존과 **같은 파생 규칙**으로 재계산 (`updateSupplierOffer` 가 모든 공급자 편집에서 동일 규칙으로 재계산하므로 중간 불일치를 만들지 않기 위함)
- 규제 상품이면 `service_audience_policies` 게이트 통과 필요
- `offer_service_prices` upsert. **제공 중지 시 가격 행은 삭제하지 않는다** (재개 시 단가 보존, 노출은 `service_keys` 로만 결정되므로 잔존 행 무해)
- 유통 관리 기능을 이중화하지 않으려고 소유권 검증·파생 규칙·가격 축을 모두 기존 것으로 재사용했다

### 3-3. 약국 경영자 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/v1/pharmacy-hub/store-owner/products` | 목록 (page/limit/q/regulatoryType/supplierId) |
| `GET /api/v1/pharmacy-hub/store-owner/products/:offerId` | 상세 (+ `product_identifiers`) |

노출 게이트 — 매장 카탈로그 SSOT 형태에서 **per-service 축만 교체**:

```
기존 서비스 : (distribution_type='PUBLIC' OR offer_service_approvals.approved for svc)
Pharmacy-Hub: 'pharmacy-hub' = ANY(spo.service_keys)      ← 공급자 직접 opt-in
```

나머지 공통 안전 조건은 유지: `is_active=true`, `deleted_at IS NULL`, `neture_suppliers.status='ACTIVE'`,
`COALESCE(product_masters.status,'ACTIVE')='ACTIVE'`, `distribution_type <> 'PRIVATE'`.

> **해석 판단 1건**: `approval_status='APPROVED'` 는 조회 조건에 넣지 않았다.
> 이 값은 `offer_service_approvals`(승인 대상 3키) 파생 필드이며 매장 카탈로그 SSOT 도 게이트로 쓰지 않는다.
> Pharmacy-Hub 는 상품별 운영자 승인이 없으므로(§4.5) 이를 요구하면 pharmacy-hub 전용 상품이
> 영구히 노출 불가가 되어 §1 "제공 시작 → 즉시 노출" 과 모순된다.
> 대신 공급자가 제어하는 `is_active` 가 활성 게이트 역할을 한다.

### 3-4. 프론트엔드

| 라우트 | 화면 |
|--------|------|
| `/supplier/products` | 제공 설정 (제공 시작/중지, 서비스별 공급가 입력, 활성 상태 표시, 검색·필터·페이지네이션) |
| `/store-owner/products` | 제공 상품 목록 (검색, 분류·공급자 필터, 페이지네이션) |
| `/store-owner/products/:offerId` | 상세 (+ 후속 WO 연결용 offerId/masterId/supplierId/적용 단가 노출) |

역할 진입점(`/supplier`, `/store-owner`)에 링크를 추가했다.
**상품 등록 기능은 만들지 않았다** — 등록·수정·활성화는 기존 Neture 공급자 원장이 담당한다.

빈 상태는 구분해 표시한다: 등록 상품 없음 / 제공 상품 없음 / 검색 결과 없음 / 권한 없음(403).

---

## 4. 데이터 변경

| 항목 | 내용 |
|------|------|
| 신규 테이블 | **0** |
| migration | `20270218000000-SeedPharmacyHubPharmacyAudience` — `service_audience_policies` 1행 (DDL 없음, `ON CONFLICT (service_key) DO NOTHING`) |
| 런타임 write | `supplier_product_offers.service_keys` / `.distribution_type`, `offer_service_prices` upsert **만** |
| 미변경 | `offer_service_approvals` · `organization_product_listings` · `product_approvals` · `ProductMaster` · `price_general` · Offer 삭제 없음 |

---

## 5. 서비스 격리 검증

### 5-1. 키 병합 로직 격리 검증 (7 케이스, 전부 PASS)

| 케이스 | current | input | 결과 |
|--------|---------|-------|------|
| 기존 3키 추가 | `[glycopharm]` | `[glycopharm,kpa-society]` | added=`[kpa-society]` — legacy 동일 |
| 기존 3키 제거 | `[glycopharm,kpa-society]` | `[glycopharm]` | removed=`[kpa-society]` — legacy 동일 |
| **pharmacy-hub 보존** | `[glycopharm,pharmacy-hub]` | `[glycopharm]` | next=`[glycopharm,pharmacy-hub]` (legacy 는 pharmacy-hub 삭제) |
| **neture/glucoseview 보존** | `[glycopharm,neture,glucoseview]` | `[glycopharm]` | 3키 모두 보존 (legacy 는 2키 삭제) |
| 3키 전부 해제 | `[glycopharm,pharmacy-hub]` | `[]` | next=`[pharmacy-hub]`, removed=`[glycopharm]` |
| serviceKeys 미전달 | `[glycopharm,pharmacy-hub]` | `undefined` | 불변 |
| 비승인키가 입력에 실림 | `[glycopharm]` | `[glycopharm,pharmacy-hub]` | 3키 diff 불변 (추가는 setServiceDelivery 책임) |

**승인 대상 3키의 `added`/`removed` 는 legacy 와 100% 동일** → 기존 승인·listing 캐스케이드 거동 불변.
**비승인키 보존 실패 0건.**

### 5-2. 프로덕션 DB 실측 (2026-07-30, 제공 시작 후)

```
offer_service_approvals rows           0    (본 흐름이 승인행을 만들지 않음)
organization_product_listings rows    20    (작업 전과 동일 — 자동 생성 0)
product_approvals rows                 0
offers with 3 eligible service_keys    0    (테스트 offer 는 pharmacy-hub 만 보유)
```

노출 게이트 실행 결과: 대상 1건만 반환 (`[E2E_TEST] … 검증상품 A`, 적용 단가 9,900 = 서비스별 단가 우선 적용).

### 5-3. 권한 격리 (API 실측)

| 시나리오 | 결과 |
|---------|------|
| 미인증 `GET /supplier/products` | 401 |
| 미인증 `GET /store-owner/products` | 401 |
| operator 토큰으로 `GET /store-owner/products` | **403** (역할 격리) |
| 공급자 원장 없는 계정의 `PATCH …/delivery` | **403** |
| 제공 시작 멱등 재호출 | 200 · `changed=false` · `serviceKeys` 불변 |

### 5-4. 의약품 접근 경계

- `service_audience_policies` 실측: `pharmacy-hub = true`, `glycopharm/kpa-society = true`, `neture/k-cosmetics = false`
- 규제 상품은 `setServiceDelivery` 의 audience 게이트를 통과해야 pharmacy-hub 에 연결된다
- 조회는 `pharmacy-hub:store_owner` scope + membership active 안에서만 가능 — 공개/비회원 경로 없음
- 다른 일반 매장 서비스로 자동 노출되는 경로 없음 (OPL 자동 생성 0)

---

## 6. 변경 파일

```
apps/api-server/src/modules/neture/services/offer.service.ts            (보존형 수정 + setServiceDelivery)
apps/api-server/src/modules/neture/neture.service.ts                    (facade 1개 추가)
apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts          (4 라우트)
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubSupplierProductController.ts   (신규)
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubStoreProductController.ts      (신규)
apps/api-server/src/database/migrations/20270218000000-SeedPharmacyHubPharmacyAudience.ts (신규)
services/web-pharmacy-hub/src/App.tsx                                   (3 라우트 + 진입점 링크)
services/web-pharmacy-hub/src/pages/supplier/ProductsPage.tsx           (신규)
services/web-pharmacy-hub/src/pages/store-owner/ProductsPage.tsx        (신규)
services/web-pharmacy-hub/src/pages/store-owner/ProductDetailPage.tsx   (신규)
```

병행 작업 파일 미포함 확인: `pnpm-lock.yaml`, `apps/api-server/src/scripts/data/*` (HFF·OTC 세션 산출물)은
**커밋에 포함하지 않았다** — `git commit -- <pathspec>` 로 경로를 한정했고 `git diff --cached --name-only` 로 확인했다.

---

## 7. 실행한 검증

| 검사 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.build.json` (api-server) | ✅ 0 errors |
| `pnpm --filter pharmacy-hub-web run type-check` | ✅ 0 errors |
| `npx vite build` (pharmacy-hub-web) | ✅ 성공 (171 modules) |
| 키 병합 로직 격리 검증 | ✅ 7/7 |
| 프로덕션 SQL PREPARE/EXECUTE 검증 | ✅ count·목록·게이트 정상 |
| migration 적용 | ✅ `service_audience_policies` 에 pharmacy-hub row 확인 |

회귀 영향 범위: 변경은 `apps/api-server` + `services/web-pharmacy-hub` 에 한정된다.
`packages/*` 및 다른 web 서비스 소스는 **변경 0** 이므로 web-neture / web-kpa-society /
web-glycopharm / web-k-cosmetics 는 빌드 산출물이 달라질 여지가 없다.
공유 로직인 `updateDistribution` 은 §5-1 격리 검증으로 3키 거동 동일성을 확인했다.

Market Trial 연결 0 · serviceKey 충돌 0.

---

## 8. 배포 · E2E

배포: `main` push → API/Web Cloud Run 자동 배포.

### 8-1. 생성한 테스트 데이터 (전량 기록)

공급자 `sohae21@naver.com` (supplier `251adaaf-fecb-4c7c-b2a8-7f81ffef36a6`, ACTIVE) 소유:

| offerId | masterId | 명칭 | 최종 상태 |
|---------|----------|------|-----------|
| `3bb54519-834c-46e0-873c-0f5d18365615` | `07581fe1-ed71-4754-979a-4cb5f1001bd8` | `[E2E_TEST] 파머시허브 검증상품 A 20260730-2340` | `is_active=true`, `service_keys={pharmacy-hub}`, `distribution_type=SERVICE`, pharmacy-hub 단가 9,900 |
| `a9b823f8-27f4-476c-9248-38e554913046` | `5f5e1000-d2be-496a-a7cb-6429dde77737` | `[E2E_TEST] 파머시허브 검증상품 B 20260730-2340` | `is_active=false`, `service_keys={}` (미제공 — 음성 대조군) |

- 명칭에 `[E2E_TEST]` 접두사로 실제 판매 상품과 구분
- **다른 서비스에는 제공하지 않았다** (`service_keys` 에 glycopharm/kpa-society/k-cosmetics 없음)
- 삭제하지 않았다 — 정리가 필요하면 비활성화(`is_active=false`) 또는 제공 중지로 처리한다
- Offer B 활성화는 기존 Neture 규칙 `PRIVATE_REQUIRES_SELLER_IDS` 로 거부됨 (본 WO 무관, 음성 대조군으로 유지)

### 8-2. E2E 결과 (프로덕션 실측)

| # | 시나리오 | 결과 |
|---|---------|------|
| 1 | 본인 Offer 목록 (필터 없음) | ✅ 200 · total=2 |
| 2 | `delivered=true` 필터 | ✅ 200 · total=1 (A만) |
| 3 | `delivered=false` 필터 | ✅ 200 · total=1 (B만) |
| 4 | 검색어 + `delivered` 조합 | ✅ 200 · total=1 |
| 5 | Pharmacy-Hub 제공 시작 (+단가 9,900) | ✅ 200 · `serviceKeys=["pharmacy-hub"]` · `distributionType=SERVICE` |
| 6 | 제공 시작 **멱등** 재호출 | ✅ 200 · `changed=false` · 키 불변 |
| 7 | 제공 중지 | ✅ 200 · `serviceKeys=[]` · `distributionType=PRIVATE` |
| 8 | 중지 후 `delivered=true` | ✅ total=0 |
| 9 | 제공 재개 (단가 미전달) | ✅ 200 · `serviceKeys=["pharmacy-hub"]` |
| 10 | 재개 후 서비스별 단가 | ✅ **9,900 보존** (중지 시 가격 행을 지우지 않는 설계대로) |
| 11 | 없는 offer 수정 | ✅ 404 `OFFER_NOT_FOUND` |
| 12 | `enabled` 누락 | ✅ 400 `ENABLED_REQUIRED` |
| 13 | 미인증 목록 조회 | ✅ 401 |
| 14 | 공급자 원장 없는 계정의 제공 변경 | ✅ 403 |
| 15 | operator 토큰으로 약국 상품 목록 | ✅ 403 |
| 16 | supplier 토큰으로 약국 상품 목록 | ✅ 403 (역할 격리) |
| 17 | 약국 노출 게이트 결과 (SQL 실측) | ✅ 대상 1건만 반환 · 적용 단가 9,900 |
| 18 | 타 서비스 오염 | ✅ `offer_service_approvals`=0 · OPL=20(불변) · `product_approvals`=0 |

### 8-3. 미검증 1건

**약국 경영자 상품 조회의 HTTP 200 경로** — `pharmacy-hub:store_owner` 역할로 로그인 가능한 계정이 없다.

- 역할 보유 계정 `renagang21@gmail.com` 은 `service_memberships(pharmacy-hub, active, store_owner)` +
  `role_assignments('pharmacy-hub:store_owner')` 를 모두 갖고 있으나, **프로덕션 비밀번호가
  `docs/local/TEST-ACCOUNTS.local.md` 값과 불일치**해 로그인이 401 `INVALID_CREDENTIALS` 이다
  (직전 WO `WO-PHARMACY-HUB-DEPLOY-BOOTSTRAP-AND-MEMBERSHIP-E2E-V1 §4-3` 에서 확인된 동일 사유).
- 대신 다음으로 대체 검증했다:
  - **쿼리 정확성**: 노출 게이트 SQL 을 프로덕션에 직접 실행해 반환 집합(1건·적용단가 9,900)을 확인
  - **권한 경계**: operator·supplier·미인증 토큰이 모두 403/401 로 차단됨을 확인
- 닫으려면 로그인 가능한 `pharmacy-hub:store_owner` 신원이 필요하다 (기존 가입→승인 API 로 라벨링된
  테스트 계정 1개를 만들면 이 항목과 직전 WO 의 반려 경로 미검증까지 함께 닫힌다).

---

## 9. 제외 범위 (구현하지 않음)

```
신규 상품 등록 · ProductMaster 생성/수정 · 상품 승인 · 운영자 상품 승인 콘솔 ·
약국별 상품 승인 · 장바구니 · 주문 · 결제 · 정산 · 배송지 · 콘텐츠 · 커뮤니티 ·
이벤트 오퍼 · Market Trial · 매장 취급 상품 자동 등록 · POP/QR/태블릿 ·
pharmacyhub.co.kr DNS · 소비자 기능
```

---

## 10. 후속 작업

1. **Pharmacy-Hub B2B 장바구니·주문** — 상세 응답의 `offerId`/`masterId`/`supplierId`/적용 단가로 연결
2. 공급자·운영자 콘텐츠
3. 커뮤니티
4. 이벤트 오퍼
5. 배송지 부가 기능
6. `pharmacyhub.co.kr` DNS 연결
7. (참고) 공급자 화면의 **활성 상태는 표시 전용**이다. 활성화·상품 수정은 Neture 공급자 원장 경로다. Pharmacy-Hub 안에서 활성화까지 다루려면 별도 WO 로 범위를 정해야 한다.
