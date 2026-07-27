# IR-O4O-PHARMACY-SELL-PAGE-MANUAL-APPLICATION-ENTRY-AUDIT-V1

> **조사 전용 IR** — 코드 변경 0 / DB write 0 / API write 0 / 배포 0
> 기준 브랜치: `main` (HEAD `6721cc1d2`, IR 지정 base `afad94fb9` 의 후손)
> 조사일: 2026-07-27

---

## 0. 결론 요약

| 항목 | 결과 |
|------|------|
| 실제 사용자 진입 경로 | **존재하나 부차적** — 사이드바·대시보드 카드·CTA 없음. `PharmacyB2BPage` 내부 서브탭 링크 "판매 신청" 1개만 렌더 |
| 수동 신청 폼 현재 동작 | **항상 실패** — `externalProductId`/`productName` 전송, 서버는 `supplyProductId`(offer UUID) 필수 → `400 MISSING_PARAM` |
| `externalProductId` 실제 의미 | **자유 입력 외부 참조 문자열** (placeholder `PROD-001`). 어떤 v2 엔티티에도 매핑되지 않음 |
| 서버 `supplyProductId` 계약 | `supplier_product_offers.id` (UUID). `findApplicableOffer` 가 카탈로그 노출 게이트와 동일 조건 재검증 |
| A/B/C 판정 | **C** (화면 전체가 구형 v1 계약) — 부수적으로 B(엔티티 종류 상이) 포함. **A(필드명만) 아님** |
| 대체 정상 경로 | **있음** — `HubB2BCatalogPage`(`/store-hub/b2b`) `applyBySupplyProductId(offer.id)` + `PharmacyB2BPage` `getOrderable()` |
| 영향 서비스 | **KPA 전용** (GP/KCos 는 `commerce/products/b2c` 라우트·`PharmacySellPage` 미보유) |
| **우선순위 판정** | **MEDIUM** |
| 권장 조치 | 즉시 수정 WO 생성하지 않음. **HUB-P0-03 (GP/KCos 자료함 공통화) 이후** 처리. 수정 방향은 "필드명 치환"이 아니라 **수동 폼 탭 제거 또는 카탈로그 기반 재작성** |

---

## 1. Route 와 Guard

- 렌더 위치: `services/web-kpa-society/src/App.tsx:970`
  `<Route path="commerce/products/b2c" element={<PharmacySellPage />} />` (현재 렌더, 주석 아님)
- 부모: `App.tsx:944` `<Route path="/store" element={<PharmacyGuard><KpaStoreLayoutWrapper/></PharmacyGuard>}>`
- **전체 URL**: `/store/commerce/products/b2c`
- **Guard**: `PharmacyGuard` (인증 + store-owner 이중 확인)
- **접근 역할**: 인증된 매장 소유자(약국주)
- lazy import: `App.tsx:205`
- 레거시 redirect: `App.tsx:1025` `products/b2c` → `Navigate to="/store/commerce/products/b2c"` (활성)
- 이 라우트를 다른 곳으로 보내는 redirect 는 없음 — 페이지를 직접 렌더

---

## 2. 실제 진입점

| 진입점 | 서비스 | 사용자 역할 | 현재 노출 | 실제 route |
|--------|--------|-----------|-----------|-----------|
| `PharmacyB2BPage.tsx:341` 서브탭 `판매 신청` `<Link to="/store/products/b2c">` | KPA | 매장 소유자 | **현재 렌더됨(무조건)** | `/store/products/b2c` → redirect → `/store/commerce/products/b2c` |
| 사이드바 `packages/store-ui-core/.../storeMenuConfig.ts:268` `O4O 제품` | KPA | 매장 소유자 | 렌더됨 | `/commerce/products` (**B2B 페이지, b2c 아님**) |
| `StoreManagementSection.tsx:13` 카드 `B2B 구매` | KPA | 매장 소유자 | **죽은 코드**(import 없음) + B2B 대상 | `/store/products` |
| `StoreHomePage.tsx:169,296` 홈 링크 | KPA | 매장 소유자 | 렌더됨 | `/store/commerce/products` (**B2B**) |
| value-guide `shared-space-ui/.../kpa.ts:365,578,1737` `route:'/store/commerce/products/b2c'` | KPA | 매장 소유자 | 가이드 텍스트(클릭 가능 시 부차 진입) | `/store/commerce/products/b2c` |

**구분:**
- `PharmacyB2BPage.tsx:341` = **현재 렌더됨** (유일한 명확한 클릭 경로, 단 부차적 서브탭)
- 사이드바/홈/카드 = 모두 **B2B 페이지**를 가리킴 (b2c 직접 진입 없음). `storeMenuConfig.ts:264` 주석: "거래 신청 전용 라우트는 KPA에 없음 → 데드링크 방지 위해 미추가"
- `StoreManagementSection` = 죽은 코드
- `PharmacySellPage.tsx:72` back-link `/store/products` = **출구**(진입 아님)

**다른 렌더러**: 없음. 저장소 전체에서 `App.tsx:970` 만 렌더.

---

## 3. 영향 서비스

- **KPA 전용.**
- `web-glycopharm`: `commerce/products` → `PharmacyB2BProducts` (b2c child 없음, `PharmacySellPage` 미import)
- `web-k-cosmetics`: `commerce/products` → `StoreCommerceProductsPage` (b2c child 없음)
- 공통 package 로 공유되는 화면 아님. GP/KCos 는 별개 컴포넌트.

---

## 4. `externalProductId` 의 실제 의미

- 폼 상태: `PharmacySellPage.tsx:123` `{ externalProductId: '', productName: '', serviceKey: 'kpa' }`
- 입력 UI: `:213-217` 자유 텍스트 input, placeholder **`예: PROD-001`**, 라벨 "상품 ID (외부 참조)"
- 전송: `:154` `applyProduct({ externalProductId, productName })`
- API: `api/pharmacyProducts.ts:185-191` `applyProduct` → `POST /pharmacy/products/apply` body `{ externalProductId, productName }`

→ **자유 입력 외부 참조 문자열**. `ProductMaster.id` / `SupplierProductOffer.id` / `SupplierProduct.id` / `ProductCandidate.id` 어느 것과도 연결되는 선택 UI가 없음. 사용자가 손으로 입력하는 임의 문자열이며 v2 엔티티 ID 로 해석 불가.

---

## 5. 서버 `supplyProductId` 계약

- 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts`
- `POST /apply` (`:374`):
  - `:377` `const { supplyProductId } = req.body;` — **`externalProductId`/`productName` 은 읽지 않음**
  - `:411-413` `if (!supplyProductId) throw 400 'supplyProductId is required' (MISSING_PARAM)`
  - `:428` `findApplicableOffer(dataSource, supplyProductId, ...)` — `supplyProductId` 를 **offer UUID** 로 취급
  - `findApplicableOffer :141` `UUID_RE.test(offerId)` 실패 시 즉시 `null` → `:436` `404 OFFER_NOT_AVAILABLE`
  - 참조 테이블: **`supplier_product_offers.id`** (`:156-167` JOIN `neture_suppliers`)
  - 분기: `PUBLIC` → `createPublicListing` / `SERVICE` → `createServiceApproval` / `PRIVATE` → `createPrivateApproval`
- 보안 테스트 `__tests__/security/store-hub-product-apply-gate.spec.ts` 도 전부 `{ supplyProductId }` 사용 — v2 계약이 canonical 임을 확인.

**결과:** 수동 폼은 `supplyProductId` 미포함 → **항상 `400 MISSING_PARAM`**. 가령 필드명을 `supplyProductId` 로 바꿔도 값(`PROD-001` 등 자유 문자열)은 UUID 가 아니므로 `404 OFFER_NOT_AVAILABLE`. 즉 단순 치환으로 복구 불가.

---

## 6. 대체 정상 경로

| 경로 | 파일 | API | 판정 |
|------|------|-----|------|
| 매장 HUB B2B 카탈로그에서 추가 | `HubB2BCatalogPage.tsx:121,171` | `applyBySupplyProductId(offer.id)` → `POST /apply { supplyProductId }` | **정상 동작 경로** |
| 주문 상품 통합 조회 | `PharmacyB2BPage.tsx:95` | `getOrderable()` | 주문 가능 상품 확인 |
| 진입: 사이드바 `O4O 제품` | `storeMenuConfig.ts:268` | `/commerce/products` (B2BPage) | 실제 canonical 진입 |

→ **대체 경로 있음.** 사용자는 사이드바 "O4O 제품" → B2B 페이지 / 매장 HUB(`/store-hub/b2b`) 카탈로그에서 실제 offer 를 선택해 취급 등록 가능. 수동 자유입력 폼은 이 흐름과 **중복이며 깨져 있음**.

판정: **대체 경로 있음** (단, "판매 신청" 서브탭이 깨진 폼으로 남아 혼란 유발).

---

## 7. A/B/C 판정

- **A. 필드명만 잘못됨** — ❌. `externalProductId` → `supplyProductId` 치환만으로 동작하지 않음(값 자체가 UUID 아님).
- **B. 엔티티 종류가 잘못됨** — 부분 해당. 자유 문자열 vs `supplier_product_offers.id`.
- **C. 화면 전체가 구형 v1 계약** — ✅ **주 판정**. 수동 자유입력 → v1 `external_product_id` 기반 신청 모델. v2 는 카탈로그 offer 선택(`supplyProductId`) 기반으로 전환됨. 수동 입력 탭 자체가 레거시.

---

## 8. 우선순위 판정: **MEDIUM**

| 기준 | 해당 여부 |
|------|-----------|
| 현재 메뉴/주요 CTA 에서 실제 진입 | ❌ 사이드바·카드·CTA 없음 (서브탭 링크 1개만) |
| 대체 경로 없음 | ❌ 대체 경로 존재 |
| 수동 신청 항상 400 | ✅ |

- **HIGH 아님**: 주요 진입(사이드바/CTA)이 아니고 대체 정상 경로가 존재.
- **LOW 아님**: route 직접 입력만 가능한 죽은 화면이 아님 — `PharmacyB2BPage.tsx:341` 서브탭에서 실제 렌더되는 클릭 경로 존재.
- ⇒ **MEDIUM**: 진입 가능 + 다른 정상 신청 경로 존재 + 기능 중복/혼란 유발.

---

## 9. 권장 후속 조치

1. **즉시 수정 WO 생성하지 않음.** MEDIUM 이므로 **HUB-P0-03 (GP/KCos 자료함 서비스별 공통화)** 를 먼저 진행한다.
2. P0-03 이후 후속 WO 시 수정 방향(택1):
   - **(권장) 수동 자유입력 탭 제거** — `PharmacyB2BPage.tsx:341` "판매 신청" 서브탭 링크 및 `PharmacySellPage` `ApplicationsTab` 의 수동 폼을 제거하고, 상품 추가는 카탈로그(`/store-hub/b2b`) 경로로 일원화. (F11/Shared Module 관점: b2c 라우트·redirect·value-guide route 정리 동반 검토)
   - 또는 **카탈로그 기반 재작성** — 수동 input 을 offer 선택 UI 로 교체하고 `applyBySupplyProductId` 를 호출. 단 이는 이미 `HubB2BCatalogPage` 와 기능 중복이므로 제거가 더 정합적.
3. **단순 필드명 치환 금지** — §5·§7 근거로 `externalProductId → supplyProductId` 치환은 오히려 404 를 유발하는 오답.
4. 정리 시 소비처 동반 점검: `App.tsx:970,1025`(라우트·redirect), `PharmacyB2BPage.tsx:341`(서브탭), `shared-space-ui` value-guide `route` 필드(kpa.ts / glycopharm.ts).

---

## 10. DB read-only 후속 과제(기록만, 이번 미실행)

- 필요 시: `product_approvals` / `organization_product_listings` 중 `metadata` 또는 legacy `external_product_id` 유래 row 가 실제 존재하는지 read-only 확인 → 수동 폼이 과거에 성공한 적이 있는지 방증. (이번 IR 범위 밖, read-only 과제로 분리)

---

*조사 완료 기준 충족: 진입 경로·엔티티 의미·대체 경로·영향 서비스·우선순위 확정. 코드/DB 변경 0.*
