# CHECK-O4O-STORE-HANDLED-PRODUCT-ACTION-USABILITY-AUDIT-AND-LINK-V1

Status: **DONE (Audit)** — read-only 조사 완료. 코드 변경 0 (안전하게 링크 가능한 신규 Action 없음이 결론). 2026-07-09
WO: `WO-O4O-STORE-HANDLED-PRODUCT-ACTION-USABILITY-AUDIT-AND-LINK-V1`
선행: `WO-O4O-STORE-HANDLED-PRODUCT-ACTION-FLOW-REVERT-V1` (DONE)

## 목적
`/store/handled-products`를 Action Hub로 정비. 새 기능 없이 기존 기능을 쉽게 쓰도록 연결. **먼저 조사(§4) → Action Inventory(§5) → 안전한 링크만 추가.**

## 핵심 발견 (구조적 병목)
handled-products 행은 **listing=`organization_product_listings.id` / local=`store_local_products.id`** 만 보유하고 **`master_id`는 API 응답에 노출되지 않는다**(`store-handled-products.routes.ts:173-189` — 쿼리는 `opl.master_id` 하지만 매핑에서 버림). 그런데 POP·상세설명·AI 화면은 `product_masters.id`를 요구한다. 게다가 POP/AI 접근 가드(`store-ai/utils/product-access.utils.ts:50-58`)는 `organization_product_listings JOIN supplier_product_offers ON opl.offer_id WHERE spo.master_id=$productId`를 요구 → **master 기반 listing(“O4O 표준 상품에서 추가”, `offer_id` NULL)은 403**.

⇒ 지금 파라미터가 그대로 호환되어 **실동작하는 상품 Action은 “다국어 QR” 하나뿐이며 이미 연결됨**. 나머지는 링크 시 깨진(403)·불일치 이동이 되어 이번 WO 원칙에 위배 → **신규 링크 추가하지 않음.**

## Action Inventory (§5)

| Action | 화면/라우트 | handled-products 진입 | 기대 id vs 보유 id | 판정 | 잠금 해제 조건 |
|---|---|---|---|---|---|
| 다국어 QR | `StoreProductMultilingualContentPage` `/store/products/multilingual/:targetKind/:targetId` | **있음** (`StoreHandledProductsPage` goMultilingual) | targetKind/targetId = sourceType/sourceId **일치** | ✅ 연결됨·실동작 | — |
| O4O 상세설명 가져오기 | `ImportB2cDescriptionModal` (listing 전용) | 있음 | listing sourceId | ✅ 동작(복사) | — |
| 콘텐츠 만들기 | `/store/library/contents?create=1&pType&pId&pName` | 있음 | sourceType/sourceId | ✅ 동작 | — |
| 관리 | 원본 관리 화면(`/store/my-products` · `/store/commerce/local-products`) | 있음 | sourceId highlight | ✅ 동작 | — |
| **상세설명 보기(조회전용)** | 없음(편집 `StoreProductDescriptionsPage`는 local 한정·deep-link X) | 없음 | 편집 API=master_id | ❌ 보기 전용 화면 부재 | 신규 조회 화면 |
| **POP 만들기** | `ProductPopBuilderPage` `/store/commerce/products/:productId/pop` | 없음 | **master_id** + offer 기반 listing | ⚠️ 화면 있으나 param+가드 불일치 | master_id 노출 + 접근가드가 master 기반 listing 허용 |
| **QR 만들기** | `StoreQRPage` `/store/marketing/qr` | 없음 | product 옵션=listing.id/local.id (state prefill=library 자료) | ⚠️ 직접 상품 링크 미연결 | 상품→QR 직접 prefill 진입선 |
| **마케팅 자산** | `ProductMarketingPage` `/store/commerce/products/:productId/marketing` | 없음(local 진입만) | 불투명 키(호환) | △ 링크 무해하나 하위 POP이 막힘 | (저가치) |
| **동영상** | `PharmacyVideoPage` `/store/content/video` | 없음 | 상품 파라미터 없음 | ❌ 상품 대상 아님 | 상품↔동영상 연결 개념 |
| **태블릿 적용** | `StoreTabletDisplaysPage` `/store/commerce/tablet-displays` | 없음 | pool 내 선택, preselect 없음 | ⚠️ deep-link preselect 불가 | “이 상품 추가” 파라미터 |
| **블로그** | 상품 기반 경로 없음 | 없음 | — | ❌ 화면 자체 없음 | 상품 기반 블로그 작성 |
| **사이니지** | 상품 기반 경로 없음(asset_type만 예약) | 없음 | — | ❌ 화면 자체 없음 | 상품→사이니지 연결 |

## UX 개선 전 / 후
- **전(현재)**: handled-products 행 = 다국어 QR / O4O 상세설명 가져오기 / 콘텐츠 만들기 / 관리 — 모두 실동작. (직전 REVERT-V1로 dead model “사용 설명서” 제거 완료.)
- **후(이번 WO)**: 위 4개가 유일하게 안전·실동작하는 링크임을 확정. 나머지 Action은 링크 전 각각 **잠금 해제 선행 작업** 필요(표 참조) → 링크를 억지로 추가하지 않음(깨진 UX 방지).

## 추가 Action / 삭제 Action
- **추가**: 없음 (안전·실동작 조건을 만족하는 신규 링크가 현재 0. master_id 노출 enabler 는 접근가드 때문에 단독으로는 POP을 동작시키지 못하므로 후속 WO로 묶음.)
- **삭제**: 없음 (선행 REVERT-V1에서 “사용 설명서” 제거 완료.)

## Browser Smoke / 회귀
- 코드 변경 없음 → 신규 배포 없음.
- 현재 handled-products 액션(다국어 QR / 가져오기 / 콘텐츠 만들기 / 관리)은 직전 REVERT-V1 프로덕션 smoke(kpa-society.co.kr)에서 정상·회귀 0 확인됨.

## 결론 / 후속 WO (Action 단위, 각각 잠금 해제 포함)
현 단계에서 “쉽게 쓰게” 만들 수 있는 링크는 이미 다국어 QR로 실현됨. 나머지는 데이터 모델/접근가드/대상 화면이 준비돼야 링크가 의미 있음. 우선순위:

1. `WO-O4O-STORE-HANDLED-PRODUCT-MASTER-ID-EXPOSE-V1` — handled-products 응답/타입에 master_id 노출(이미 쿼리됨, 최소). POP·상세설명 링크의 전제.
2. `WO-O4O-STORE-POP-ACCESS-GUARD-ALLOW-MASTER-LISTING-V1` — POP/AI 접근가드가 offer 없는 master 기반 listing 도 허용(org 소유 검증 기준 확장). ①과 합쳐야 POP 링크가 실제 동작.
3. `WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-VIEW-V1` — 설명서 **조회 전용** 화면/Action (선택·저장 아님).
4. `WO-O4O-STORE-HANDLED-PRODUCT-QR-CREATE-LINK-V1` — 상품→QR 직접 진입선(landingType='product', 상품 자동선택).
5. (하위) 태블릿 “이 상품 추가” preselect 파라미터 / 상품↔동영상·블로그·사이니지 연결은 화면 신설 필요 → 별도 검토.

> 원칙: “Action”은 UI 개념, API는 리소스 생성/조회 중심 유지(`GET .../:id/description`, `POST .../:id/pop|qr|video`). 잠금 해제 전 링크를 붙이지 않는다(깨진 403/불일치 UX 방지).
