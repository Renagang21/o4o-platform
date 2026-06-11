# CHECK-O4O-MY-STORE-CANONICAL-MENU-LABEL-ALIGNMENT-3SERVICES-V1

> 내 매장 공통화 Phase 5 후속 — 3서비스(KPA / GlycoPharm / K-Cosmetics) canonical 메뉴 라벨 / IA 정렬.
> **결과: PASS** — 메뉴 config 무변경(canonical 보존) + page heading 데이터 의미 정렬(my-products / local-products 3서비스 동시) + tsc 0.
> 선행: `WO-O4O-MY-STORE-COMMONIZATION-PHASE5-KPA-BASELINE-V1`(PASS) · `WO-O4O-STORE-PRODUCTS-MANAGER-HEADING-PROP-ALIGNMENT-V1`(PASS) · `WO-O4O-MY-STORE-PRODUCT-TERMINOLOGY-ALIGNMENT-V1`(PASS)
> 상위 기준: `IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1` — 2026-06-11

---

## 1. 목적

KPA / GlycoPharm / K-Cosmetics 의 내 매장 상품 관련 **메뉴 라벨 / IA** 가 기준 모델과 충돌하지 않는지
확인하고, 필요 시 3서비스 동시 기준으로 라벨·설명을 정리한다. DB / API / 주문·결제 로직 변경 없음.

---

## 2. 선행 기준

KPA baseline(Phase 5) 확정 모델:

| 개념 | DB 기준 | 주문 |
|---|---|---|
| 매장 취급 상품 | `StoreLocalProduct` | 불가 (비-O4O) |
| 기본 O4O 주문 가능 상품 | `OrganizationProductListing` | 승인·활성, 반복 주문 |
| 신청·승인 현황 | `ProductApproval` | — |
| 이벤트형 O4O 주문 가능 상품 | `EventOffer` / `store_cart_items(event_offer)` | 기간·상태 조건부 |
| 주문 내역 | `checkout_orders` | — |

---

## 3. 핵심 판단 — 제품 IA 앵커 유지 (사용자 확정)

**판단: "제품 = 제작 기준 데이터 앵커" 를 유지한다.**

- 메뉴 라벨을 `O4O 주문 가능 상품` 으로 좁히지 않는다.
- `my-products` 는 OrganizationProductListing 기반 O4O 주문 가능 상품 화면이지만, 전체 IA 에서 "제품" 은
  상품 설명·POP·QR·블로그·콘텐츠 제작의 **기준 데이터 앵커** 로도 쓰인다. 메뉴를 주문 개념으로 좁히면
  콘텐츠/제작 자료 흐름과 충돌한다.
- 대신 **메뉴 = 짧고 안정적인 IA 앵커**, **page heading/description = 데이터 성격 명확화** 로 계층 분리한다.

이 판단은 선행 `WO-O4O-MY-STORE-PRODUCT-TERMINOLOGY-ALIGNMENT-V1 §9` 의 결정(메뉴 canonical 무변경,
페이지 문구만 정렬)과 일관된다.

---

## 4. Phase 1 — 3서비스 상품 관련 메뉴 현황

`packages/store-ui-core/src/config/storeMenuConfig.ts` 기준.

| 서비스 | 활성화 앵커 라벨 (메뉴) | route | local-products 라벨 (메뉴) | 데이터 기준 | 판정 |
|---|---|---|---|---|---|
| KPA | **내 약국 제품** | `/my-products` | (메뉴 미노출) | OrganizationProductListing | 유지 (A) |
| GlycoPharm | **내 약국 제품** | `/my-products` | 자체 상품 (`/commerce/local-products`) | OrganizationProductListing | 유지 (A) |
| K-Cosmetics | **내 매장 제품** | `/my-products` | 자체 상품 (`/commerce/local-products`) | OrganizationProductListing | 유지 (A) |

- 메뉴 라벨은 이미 **"제품"**(제작 기준 데이터 앵커)으로 canonical 정렬됨. 위험했던 포괄 라벨 `내 매장 상품` 은
  **메뉴에 없음** — page heading 에만 존재했다.
- config 주석에 용어 구분 명문화: `"상품" = 거래·주문 대상`, `"제품" = 활성화 자료 제작 기준 데이터`.

---

## 5. Phase 2 — 메뉴 라벨 유지/변경 판단

| 메뉴 | 판정 | 사유 |
|---|---|---|
| 내 약국 제품 / 내 매장 제품 (my-products) | **A (유지)** | 제작 기준 데이터 IA 앵커로 적절. 3서비스 canonical 정렬 보존. |
| 자체 상품 (local-products) | **A (유지, 메뉴 레벨)** | 짧은 IA 앵커. 데이터 성격은 page heading 에서 "매장 취급 상품" 으로 명확화 (B). |

**메뉴 config(`storeMenuConfig.ts`) 변경 없음.** — canonical 3서비스 정렬 축 보존.

---

## 6. Phase 3 — StoreProductsManagerPage title/description 서비스별 적용

선행 WO 에서 공유 컴포넌트에 추가된 `title?` / `description?` prop 을 **3서비스 동시** 로 주입하여
page heading 을 데이터 의미("O4O 주문 가능 상품")로 정렬. 메뉴 앵커("제품")는 그대로 유지.

| 서비스 | title | description | 비고 |
|---|---|---|---|
| KPA | O4O 주문 가능 상품 | …약국에서 반복 주문… | 선행 WO 에서 주입 완료 (유지) |
| GlycoPharm | O4O 주문 가능 상품 | 공급자 또는 운영자 승인 후 **약국**에서 반복 주문할 수 있는 O4O 공급 상품을 관리합니다. | 본 WO 주입 |
| K-Cosmetics | O4O 주문 가능 상품 | 공급자 또는 운영자 승인 후 **매장**에서 반복 주문할 수 있는 O4O 공급 상품을 관리합니다. | 본 WO 주입 (`약국` 미사용) |

- `ProductApproval(PENDING)` 을 주문 가능 상품처럼 표현하지 않음 — "승인 후 반복 주문" 으로 기술.

---

## 7. Phase 4 — 매장 취급 상품(StoreLocalProduct) 라벨 정렬

KPA 는 선행 terminology WO 에서 이미 "매장 취급 상품" 으로 정렬됨. GP/KCos 를 동일 기준으로 마저 정렬하여
**3서비스 동시 정렬 완성**.

| 위치 | 전 (GP/KCos) | 후 (GP/KCos, = KPA) |
|---|---|---|
| 페이지 heading | 자체 상품 관리 | **매장 취급 상품** |
| 설명 | 매장에서 직접 등록하는 상품입니다. Display Domain 전용 — 결제/주문 시스템과 연결되지 않습니다. | O4O 주문과 무관하게 매장에서 자체적으로 취급·진열하는 상품입니다. 결제/주문 시스템과 연결되지 않습니다. |
| empty 제목 | 등록된 자체 상품이 없습니다 | 등록된 매장 취급 상품이 없습니다 |
| empty 설명 | 매장에서 직접 판매하는 상품을 등록해 보세요. | 매장에서 자체적으로 취급하는 상품을 등록해 보세요. |

- 메뉴 라벨 "자체 상품"(짧은 앵커)은 유지, page heading 에서만 데이터 성격을 "매장 취급 상품" 으로 명확화.
  (my-products 의 "제품" 메뉴 ↔ "O4O 주문 가능 상품" heading 과 동일한 계층 분리 패턴.)

---

## 8. Phase 5 — 이벤트 오퍼 라벨 기준 확인

- 이벤트 오퍼 = O4O 주문 가능 상품군에 포함되는 **이벤트형 O4O 주문 가능 상품** (기간·상태 조건부).
- my-products heading 이 "O4O 주문 가능 상품" 이 되더라도 이벤트 오퍼를 제외/부정하지 않음 — description 의
  "반복 주문" 표현으로 **기본(반복) 주문 상품** 임을 명시하여, 기간·상태 조건이 있는 이벤트형과 자연스럽게 구분.
- 이벤트 오퍼 주문 로직(진행 중 주문 가능 / 종료·만료 시 차단)은 본 WO 범위 외 — 변경 없음.

---

## 9. 변경 내용

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/App.tsx` | `/store/my-products` 라우트에 title/description prop 주입 (약국 기준) |
| `services/web-k-cosmetics/src/App.tsx` | `/store/my-products` 라우트에 title/description prop 주입 (매장 기준) |
| `services/web-glycopharm/src/pages/store-management/StoreLocalProductsPage.tsx` | heading/설명/empty 문구 → "매장 취급 상품" 정렬 |
| `services/web-k-cosmetics/src/pages/store/StoreLocalProductsPage.tsx` | heading/설명/empty 문구 → "매장 취급 상품" 정렬 |
| `docs/checks/CHECK-...-3SERVICES-V1.md` | 본 문서 |

---

## 10. 제외 / 무변경 항목

- `packages/store-ui-core/src/config/storeMenuConfig.ts` — **무변경**. 메뉴 canonical 라벨("내 약국/매장 제품" · "자체 상품") 보존.
- 공유 `StoreProductsManagerPage` 컴포넌트 — **무변경**. prop 은 선행 WO 에서 추가됨, 본 WO 는 주입만.
- KPA `/store/my-products` · `StoreLocalProductsPage` — 선행 WO 에서 정렬 완료, 본 WO 무변경(유지 확인).
- Neture — store-hub/my-store 구조 상이, 이번 canonical 정렬 직접 대상 외 (공유 컴포넌트 prop 기본값 유지로 무영향).
- DB schema / migration / API / 주문·결제·장바구니 / ProductApproval / OrganizationProductListing / StoreLocalProduct / EventOffer 로직 — **무변경**.

---

## 11. 검증 결과

### 정적 검증

- [x] 3서비스 메뉴 라벨 canonical 정렬 미파괴 (`storeMenuConfig.ts` 무변경)
- [x] "제품 = IA 앵커 유지" 판단 문서화, 메뉴 `O4O 주문 가능 상품` 미축소
- [x] KPA my-products title prop 적용 상태 유지
- [x] GP/KCos my-products title/description 주입 (3서비스 동시 완성)
- [x] StoreLocalProduct 기반 화면 = "매장 취급 상품" (3서비스 동시), 주문 가능 상품처럼 표현 안 됨
- [x] OrganizationProductListing 기반 화면 = "O4O 주문 가능 상품", 매장 취급 상품처럼 표현 안 됨
- [x] 이벤트 오퍼 = 이벤트형 O4O 주문 가능 상품 기준 유지, 제외 표현 없음

### TypeScript 검증

| 대상 | 명령 | 결과 |
|---|---|---|
| web-glycopharm | `tsc --noEmit -p tsconfig.app.json` | PASS |
| web-k-cosmetics | `tsc --noEmit` | PASS |

(공유 패키지 `store-products-ui` 무변경 — 재검증 불필요. KPA 무변경.)

### Smoke 검증

- 배포 전 — typecheck + 정적 검증으로 대체. heading/문구 변경은 순수 텍스트이며 레이아웃·route·prop 계약 변동 없음.
  배포 후 다음 렌더 확인 권장: GP/KCos `/store/my-products`("O4O 주문 가능 상품"),
  GP/KCos `/store/commerce/local-products`("매장 취급 상품").

### 병렬 세션 격리

- 작업 중 병렬 세션이 GlycoPharm → K-Cosmetics ServiceGuide 를 순차 커밋(`d63aa54c2`, `1fbf98d5a`, `2a4f65939`).
- 해당 세션이 App.tsx 를 미커밋 점유한 동안에는 그 파일을 건드리지 않고, 커밋 완료(클린) 후 진입하여
  staging 오염 0. path-specific add 로 본 WO 파일만 커밋.

---

## 12. 완료 판정

| 완료 조건 | 충족 |
|---|---|
| 3서비스 상품 메뉴 라벨 현황 정리 | ✅ |
| "제품 = 제작 기준 데이터 앵커" 유지 판단 | ✅ |
| 메뉴 `O4O 주문 가능 상품` 축소 여부 3서비스 기준 확정 (→ 축소 안 함) | ✅ |
| KPA my-products heading prop 유지 | ✅ |
| GP/KCos title/description 적용 결정·실행 | ✅ (적용) |
| StoreLocalProduct 화면 = 매장 취급 상품 (3서비스) | ✅ |
| EventOffer = 이벤트형 O4O 주문 가능 상품 기준 | ✅ |
| DB/API/주문/결제 로직 무변경 | ✅ |
| typecheck 통과 | ✅ |
| CHECK 문서 작성 | ✅ |

**판정: PASS**

---

## 13. 후속 작업

- 배포 후 GP/KCos 5개 화면(my-products / local-products) heading smoke 확인.
- 메뉴 라벨 자체의 재정의(예: "제품" → 다른 체계)는 본 WO 에서 의도적으로 보류 — 콘텐츠/제작 자료 흐름과의
  관계를 별도 IR 로 판단한 뒤에만 진행 (제품 IA 앵커는 콘텐츠 제작 기준 데이터로도 쓰이므로 성급한 축소 금지).
