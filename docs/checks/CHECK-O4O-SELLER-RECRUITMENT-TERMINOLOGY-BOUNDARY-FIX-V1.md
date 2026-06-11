# CHECK-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1

> 소형 보정 WO — "판매자 모집" 용어가 두 도메인(매장 공급 승인 vs Neture 제휴)을 혼동시키는 지점 정리.
> **결과: PASS** — 매장 허브 PRIVATE 탭 라벨 + seller_recruitment sourceType 경계 주석 정리(3 web 서비스 tsc 0).
> 선행: `IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1`(PASS) — 2026-06-11
> 범위: 사용자 결정 — **좋은 범위(narrow)**. Neture 사업 가이드 "판매자 모집" 본문(40+ 인스턴스)은 의도적 제외(별도 결정).

---

## 1. 목적

선행 IR 결론을 코드 문구/주석에 반영하여 두 도메인을 용어상 분리한다. 구조/DB/API/주문 로직 변경 없음.

---

## 2. 선행 IR 결론

| 도메인 | 원장 체인 | 용어 |
|---|---|---|
| 매장 공급 승인 | `SupplierProductOffer`(노출·타깃) → `ProductApproval`(신청·승인) → `OrganizationProductListing`(주문 가능) | 취급 신청 / 공급 승인 / 공급 승인 상품 |
| Neture 제휴 affiliate | `neture_partner_recruitments` (+ `neture_partner_applications`) | 파트너 모집 / 제휴 |

두 흐름은 테이블 미공유·전환 미연결 → 중복/드리프트 위험 없음. 위험은 "판매자 모집" 네이밍 혼동뿐.

---

## 3. 용어 기준

- 매장 공급 맥락: "공급 승인 대상 / 매장 취급 신청 / 공급 승인 / 신청·승인 현황".
- Neture 제휴 맥락: "파트너 모집 / 제휴 파트너 모집".
- `seller_recruitment`(cart sourceType): 주문 경로 아님 — 승인 전 신청 상태. enum 값 불변(주석으로 경계만 명시).

---

## 4. Phase 1 — 용어 사용처 조사

`판매자 모집 / seller recruitment / partner recruitment` 사용처를 조사한 결과 **두 무리**로 분리됨:

| 무리 | 대표 사용처 | 실제 도메인 | 조치 |
|---|---|---|---|
| 매장 허브 PRIVATE 탭 라벨 "판매자 모집" | KPA `HubB2BCatalogPage.tsx`, GP `HubB2BCatalogPage.tsx`, KCos `HubB2BPage.tsx` (DISTRIBUTION_TABS) | 매장 공급 승인(PRIVATE→ProductApproval) | **본 WO 정정** → "공급 승인 대상" |
| `seller_recruitment` cart sourceType | `StoreCartItem.entity.ts`, `store-cart.service.ts`, 3서비스 `api/storeCart.ts` | 매장 공급 승인(신청 전 상태) | **본 WO 경계 주석**(값 불변) |
| Neture 가이드 "판매자 모집" 본문 | `packages/shared-space-ui/src/guide/copy/neture.ts`(40+), `/guide/business/seller-recruitment` | 정의된 O4O 사업 개념(공급자가 매장 모집) | **제외**(사업 철학 카피 — 별도 결정) |
| Neture 공급자/운영자 "판매자 모집" UI | `RecruitingProductsOverviewPage.tsx`, `AllRegisteredProductsPage.tsx`, `supplierProductTypes.ts`, `productConstants.ts`, `SupplierSupplyOffersPage.tsx` (`is_partner_recruiting`) | Neture partner_recruitment 메커니즘 | **제외**(narrow 범위 외 — 후속 Neture 도메인 정합) |
| "파트너 모집" (affiliate) | `PartnershipRequestListPage.tsx`, `RecruitingProductsPage.tsx`, `partner.ts`(partnerRecruitmentApi) | Neture 제휴 | 이미 정확 — 무변경 |

---

## 5. Phase 2 — 매장 공급 승인 도메인 정리

매장 허브 유통유형 탭(전체 / B2B / 운영자 / ~~판매자 모집~~ **공급 승인 대상**)의 PRIVATE 라벨 정정.

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx` | PRIVATE 탭 라벨 "판매자 모집" → "공급 승인 대상" + 경계 주석 |
| `services/web-glycopharm/src/pages/hub/HubB2BCatalogPage.tsx` | 동일 (헤더 주석 포함) |
| `services/web-k-cosmetics/src/pages/hub/HubB2BPage.tsx` | 동일 (헤더 주석 포함) |

근거: PRIVATE = 공급자가 `allowed_seller_ids` 로 지정한 비공개 공급. 매장 입장에선 취급 신청/공급 승인 대상이며,
공급자가 매장을 "모집"한다는 의미와 무관(혼동 제거). 다른 탭(전체/B2B/운영자)과 결을 맞춘 유통유형 라벨.

---

## 6. Phase 3 — Neture 제휴 도메인 정리

- affiliate 흐름(`neture_partner_recruitments`, `partnerRecruitmentApi`)은 이미 "파트너 모집"으로 일관 사용 — **무변경**.
- Neture 공급자/운영자 UI 의 "판매자 모집"(= `is_partner_recruiting` 메커니즘)과 사업 가이드 본문은 **본 WO 범위 외**.
  → 후속 "Neture 판매자 모집 ↔ 파트너 모집 도메인 정합" 작업으로 분리(사업 철학 카피 영향, 별도 결정 필요).

---

## 7. Phase 4 — seller_recruitment sourceType 경계 가드

`seller_recruitment` 는 cart sourceType enum 에 선언되어 있으나 **주문 경로가 아니다**(승인 전 신청 상태,
선행 IR §9 "주문 아님 — 신청/승인 모델"). enum 값 변경은 위험(저장값·계약 영향) → **값 불변, 경계 주석만 추가**.

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/entities/cart/StoreCartItem.entity.ts` | `CartSourceType` 에 경계 주석(legacy/internal · 주문 경로 아님 · Neture 파트너 모집과 무관) |
| `apps/api-server/src/services/cart/store-cart.service.ts` | `VALID_SOURCE_TYPES` 에 동일 취지 주석 |
| `services/web-kpa-society/src/api/storeCart.ts` | 프론트 미러 경계 주석 |
| `services/web-glycopharm/src/api/storeCart.ts` | 동일 |
| `services/web-k-cosmetics/src/api/storeCart.ts` | 동일 |

> 관찰: 현재 코드에서 `seller_recruitment` 가 실제 checkout 주문으로 진행되는 경로는 발견되지 않음(KPA checkout 대상은 `event_offer`).
> 주문 진행 가능성이 확인되면 별도 `WO-O4O-SELLER-RECRUITMENT-CART-SOURCETYPE-GUARD-V1` 로 분리(런타임 가드).

---

## 8. Phase 5 — PENDING 신청 상태 라벨 확인

- 매장 허브 카탈로그(`HubB2BCatalogPage`)는 `isAdded` boolean → "내 매장" badge 로 렌더. 별도 "주문 가능/판매 가능" 라벨은 없음.
- ⚠️ 관찰: 선행 IR 대로 `isAdded` 는 백엔드에서 `product_approvals`(PENDING 포함) ∪ `organization_product_listings` 합집합 →
  **PENDING 신청(미승인)도 "내 매장" badge 로 표시**됨. "주문 가능"을 직접 주장하진 않으나 "추가됨"으로 다소 낙관적 표기.
- PENDING vs APPROVED 구분 표기는 **백엔드 `isAdded`/카탈로그 응답이 상태를 분리 반환해야** 가능 → API 응답 형태 변경(본 WO 금지 범위).
  → 후속 `WO-O4O-STORE-HUB-CATALOG-APPROVAL-STATUS-LABEL-V1`(가칭) 으로 분리. 본 WO 에서는 라벨 미변경.

---

## 9. 변경 내용 (총 8 코드 파일 + CHECK 1)

```
services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx   PRIVATE 라벨 + 주석
services/web-glycopharm/src/pages/hub/HubB2BCatalogPage.tsx          PRIVATE 라벨 + 헤더/주석
services/web-k-cosmetics/src/pages/hub/HubB2BPage.tsx                PRIVATE 라벨 + 헤더/주석
apps/api-server/src/entities/cart/StoreCartItem.entity.ts            sourceType 경계 주석
apps/api-server/src/services/cart/store-cart.service.ts             sourceType 경계 주석
services/web-kpa-society/src/api/storeCart.ts                        sourceType 경계 주석
services/web-glycopharm/src/api/storeCart.ts                         sourceType 경계 주석
services/web-k-cosmetics/src/api/storeCart.ts                        sourceType 경계 주석
```

---

## 10. 제외 / 무변경 항목

- **Neture 사업 가이드 "판매자 모집" 본문**(`neture.ts` 40+, `/guide/business/seller-recruitment`) — 정의된 사업 개념, 사용자 결정으로 제외.
- **Neture 공급자/운영자 "판매자 모집" UI**(`is_partner_recruiting` 계열) — narrow 범위 외, 후속 Neture 도메인 정합.
- `seller_recruitment` enum 값 / route path / DB column value / API field — 불변.
- DB schema / migration / API response shape / 주문·결제 / ProductApproval / OrganizationProductListing / SupplierProductOffer / neture_partner_recruitments 로직 — 무변경.

---

## 11. 검증 결과

### 정적 검증
- [x] 매장 공급 맥락 PRIVATE 탭 "판매자 모집" 포괄 표현 제거 → "공급 승인 대상"
- [x] `seller_recruitment` 경계 주석(주문 경로 아님 · Neture 파트너 모집과 무관)
- [x] affiliate "파트너 모집" 무변경(이미 정확), 두 도메인 연결 표현 없음
- [x] enum/sourceType 값·route·API 불변
- [x] PENDING 라벨은 백엔드 응답 의존 → 후속 분리(본 WO 미변경)

### TypeScript 검증
| 대상 | 명령 | 결과 |
|---|---|---|
| web-kpa-society | `tsc --noEmit` | PASS |
| web-glycopharm | `tsc --noEmit -p tsconfig.app.json` | PASS |
| web-k-cosmetics | `tsc --noEmit` | PASS |
| api-server | `tsc --noEmit` | 본 WO 변경 파일(cart 주석)은 영향 없음. ⚠️ 무관한 기존 baseline 에러 1건(`market-trial/marketTrialController.ts:162` CreateTrialDto.productId) — 본 WO 변경과 무관(comment-only). |

> api-server 변경은 cart 도메인 **주석만**이라 타 모듈 컴파일에 영향 불가. baseline 에러는 본 WO 범위 외(market-trial 도메인).

### Smoke
- 문구/주석 변경 — typecheck + 정적 검증으로 대체. 배포 후 매장 허브 유통유형 탭에 "공급 승인 대상" 렌더 확인 권장(KPA/GP/KCos).

---

## 12. 후속 작업

- **Neture 도메인 정합**(별도 WO/결정): Neture 사업 가이드 + 공급자/운영자 UI 의 "판매자 모집"(`is_partner_recruiting`)을 affiliate "파트너 모집"으로 통일할지, 또는 "판매자 모집"을 공급자→매장 모집 사업 개념으로 유지할지 — 사업 철학 차원 결정.
- **`WO-O4O-STORE-HUB-CATALOG-APPROVAL-STATUS-LABEL-V1`**(가칭): 카탈로그 `isAdded` 를 PENDING(승인 대기) vs APPROVED(취급 중)로 분리 표기 — 백엔드 응답 변경 동반.
- **`WO-O4O-SELLER-RECRUITMENT-CART-SOURCETYPE-GUARD-V1`**: `seller_recruitment` 가 주문으로 진행될 경로가 확인될 경우 런타임 가드.

---

## 13. 완료 판정

| 조건 | 충족 |
|---|---|
| "판매자 모집" 포괄 표현이 두 도메인 혼동시키지 않게 정리(매장 공급 맥락) | ✅ |
| 매장 공급 흐름 = "공급 승인 대상/취급 신청" 기준 | ✅ |
| Neture 제휴 = "파트너 모집" (이미 정확, 무변경) | ✅ |
| `seller_recruitment` 경계 문서화(주문 아님) | ✅ |
| DB/API/주문 로직·enum 값 무변경 | ✅ |
| typecheck(3 web 서비스) 통과 | ✅ |
| CHECK 문서 작성 | ✅ |

**판정: PASS** (narrow 범위 — Neture 사업 가이드/공급자 UI 는 후속 분리).
