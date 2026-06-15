# CHECK-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1

> **작업명:** WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1
> **유형:** gate 연결 — 공급자 제품 **승인요청** 시 해당 품목군이 공급자 단위 `approved` 상태일 때만 허용. 제품/승인/오퍼 구조 무변경.
> **결과: PASS — `submitForApproval`(승인요청 단계)에 품목군 gate 적용. 제품 분류값(regulatoryType + ProductCategory)을 공급자 품목군으로 최소 매핑, `approved` 아니면 해당 offer skip + reason code 반환. create(draft) 는 무변경(허용). 기존 제품 조회/목록 회귀 0. api-server typecheck 0 · web-neture build ✓.**
> 선행: `1a385dc85`(품목군 온보딩) — 2026-06-15

---

## 1. 조사한 제품 등록/승인요청 흐름

| 단계 | 라우트 | service | 결과 상태 | gate |
|------|--------|---------|-----------|:----:|
| 생성(draft) | `POST /supplier/products` | `NetureOfferService.createSupplierOffer` | offer `approvalStatus=PENDING`, `isActive=false` | ❌ 미적용 |
| 수정 | `PATCH /supplier/products/:id` | `updateSupplierOffer` | offer 갱신 | ❌ 미적용 |
| **승인요청** | `POST /supplier/products/submit-approval` | **`submitForApproval(supplierId, offerIds)`** | `offer_service_approvals` 신규 INSERT | ✅ **적용** |

**판단(WO §5.2 1순위):** create 는 draft 성격(미활성·미승인요청)이므로 **저장은 허용**하고, 별도 단계인 **승인요청(`submitForApproval`)에 gate 강제**. 기존 제품/생성 흐름 회귀 최소화.

## 2. 품목군 매핑 기준

`resolveRegulatedCategoryFromProduct({ regulatoryType, categoryName, categorySlug })` (신규, 순수 함수) — 기존 제품 분류값만 사용(개편 없음):

| 제품 `regulatory_type` | 공급자 품목군 |
|------------------------|---------------|
| `DRUG` | `pharmaceutical` |
| `QUASI_DRUG` | `quasi_drug` |
| `HEALTH_FUNCTIONAL` | `health_functional_food` |
| `COSMETIC` | `cosmetics` |
| `GENERAL` | `general` (단, ProductCategory name/slug 에 `의료기기/medical/device` → `medical_device`, `식품(건강기능 제외)/food` → `food`) |
| 미상 | category hint 로만 최소 판정, 그 외 `null`(→ UNRESOLVED) |

`regulatory_type` 은 `product_masters` 의 비-nullable 컬럼 → 정상 제품은 항상 최소 `general` 로 해소. 일반 상품도 gate 대상(WO §3.3 권장 기본값 — 구조 일관).

## 3. gate 적용 endpoint / 로직

**`offer.service.ts submitForApproval`** (유일 변경 지점):
- 소유권 조회 SQL 을 `JOIN product_masters` + `LEFT JOIN product_categories` 로 확장 → offer 별 `regulatory_type / category_name / category_slug` 동시 취득.
- `SupplierRegulatedCategoryService.getStatusMap(supplierId)` 1회 조회로 공급자 품목군→상태 맵 확보.
- offer 별: 품목군 해소 → `evaluateGate(category, statusMap)`. `allowed=false` 면 `result.skipped` 에 `reasonCode` push 후 continue(승인 INSERT 미수행).
- `approved` 만 통과 → 기존 `filterApprovalEligibleServiceKeys` → `createPendingApprovals` 로 진행(기존 로직 불변).

신규 service 자산(supplier-regulated-category.service.ts): `getStatusMap`, `evaluateGate`, `resolveRegulatedCategoryFromProduct`, 타입 `ProductCategoryGateReason/Result`.

## 4. 차단 상태값 / reason code / 메시지

| 공급자 품목군 상태 | reason code | gate |
|--------------------|-------------|:----:|
| row 없음 / `not_requested` | `SUPPLIER_CATEGORY_NOT_SELECTED` | 차단 |
| `submitted`(검토 중) | `SUPPLIER_CATEGORY_NOT_APPROVED` | 차단 |
| `needs_update` | `SUPPLIER_CATEGORY_NEEDS_UPDATE` | 차단 |
| `rejected` | `SUPPLIER_CATEGORY_REJECTED` | 차단 |
| `suspended` | `SUPPLIER_CATEGORY_SUSPENDED` | 차단 |
| 품목군 해소 불가 | `SUPPLIER_CATEGORY_UNRESOLVED` | 차단 |
| **`approved`** | — | **통과** |

reason code 는 `submitForApproval` 응답 `skipped[].reason` 으로 그대로 전달(컨트롤러 무변경, `{success,data:result}`).

**프론트(`SupplierProductsPage` 승인요청 토스트):** `SUPPLIER_CATEGORY_*` 집계 → "N건은 해당 품목군이 O4O 내부 등록 가능 상태가 아닙니다. 공급자 프로필 > 공급 예정 품목군에서 증빙을 제출하고 운영자 확인을 받아 주세요." 부분 성공 시 "N건 품목군 미승인" 표기. 금지 표현(법적 허가 인증) 미사용 — "O4O 내부 등록 가능 상태" 사용.

## 5. 기존 제품 호환성

- **조회/목록/상세 무영향** — gate 는 `submitForApproval` 에만. 생성·수정·조회 경로 변경 0.
- 이미 승인된 제품/진행 중 승인 미변경(은폐·비활성화 없음). backfill·일괄 상태 변경 없음.
- 기존에 품목군 미설정 공급자는 승인요청 시 차단 → 의도된 신규 gate(공급자 프로필에서 품목군 승인 후 재요청). WO 테스트 9.1~9.6 시나리오와 일치.

## 6. 제외 (WO 명시)

제품 등록 유형 UI 개편 / 운영자승인·B2B·판매자모집 / ProductMaster·SupplierProductOffer·ProductApproval·OrganizationProductListing 구조 변경 / 이벤트 오퍼 / 펀딩 / 의약품·OTC·Rx 흐름 / 외부 API·OCR·허가번호 자동검증 / 법적 유형 enum / 운영자 제품 승인 흐름 개편(§7 — 기존 품목군 검토 모달로 충분, 추가 안 함).

## 7. 검증

- **api-server:** `pnpm --filter @o4o/api-server type-check` → `tsc --noEmit` **0 errors** ✅
- **web-neture:** `pnpm --filter @o4o/web-neture build` → `✓ built in ~12s` ✅
- **정적:** create/update 경로·기존 승인 로직(`createPendingApprovals`)·serviceKey 필터 불변. gate 는 `approved` 만 통과. 매핑은 비-nullable `regulatory_type` 기반 → 정상 제품 항상 해소.
- **browser/DB smoke:** 미수행 — dev 서버·인증 guard. **배포 후 권장**(§9).

## 8. 변경 파일 (4)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/services/supplier-regulated-category.service.ts` | `resolveRegulatedCategoryFromProduct` + 타입 + `getStatusMap`/`evaluateGate` |
| `apps/api-server/src/modules/neture/services/offer.service.ts` | `submitForApproval` 에 품목군 gate(SQL JOIN 확장 + 판정 + skip) |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 승인요청 결과 토스트에 `SUPPLIER_CATEGORY_*` 안내 |
| `docs/investigations/CHECK-...-V1.md` | 본 문서 |

## 9. 완료 판정 / 후속

**PASS.** 승인요청 시점 품목군 `approved` gate 적용, 미승인 차단 + reason code 안내, create/조회 회귀 0, 제품/오퍼/펀딩 흐름 무변경.

**후속(배포 후 smoke 권장):** ① approved 품목군 제품 승인요청 성공 ② submitted/needs_update/rejected/suspended/미신청 제품 승인요청 차단 + 토스트 안내 ③ 기존 제품 목록/상세 정상.
**차기 WO:** WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-TYPE-FLOW-V1(등록 유형 UI) → SERVICE-LISTING-FLOW → EVENT-OFFER-LIFECYCLE → MARKET-TRIAL-FUNDING-LIFECYCLE.

---

*Date: 2026-06-15 · gate 연결 PASS · 승인요청(submitForApproval)에 공급자 품목군 approved gate. regulatoryType+ProductCategory→품목군 최소 매핑, 미승인 skip+reasonCode. create(draft) 허용, 기존 제품 조회 회귀 0. typecheck 0 · build ✓. 배포 후 smoke 권장.*
