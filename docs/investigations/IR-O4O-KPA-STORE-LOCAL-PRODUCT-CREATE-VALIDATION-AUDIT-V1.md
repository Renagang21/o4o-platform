# IR-O4O-KPA-STORE-LOCAL-PRODUCT-CREATE-VALIDATION-AUDIT-V1

> 유형: 조사 (read-only) / 상태: 원인확정, 후속 WO 결정 대기
> 작성일: 2026-06-26 / 범위: KPA, 온라인 판매 제외
> 선행: WO-O4O-KPA-TABLET-BROWSE-AUTO-SLIDE-V1 검증 중 "Failed to create local product" 발견

---

## 1. 결론 요약

- **생성 API는 정상이다.** `POST /api/v1/store/local-products` 는 동작하며 필수값은 `name` 뿐이다.
- 검증 중 발생한 **"Failed to create local product"(500)** 의 실제 원인은 Cloud Run 로그로 확정:
  ```
  QueryFailedError: invalid input syntax for type numeric: "10,000원"
  QueryFailedError: invalid input syntax for type numeric: "20,000원"
  ```
  → `store_local_products.price_display` 는 **numeric(12,2)** 컬럼인데, **조사자(Claude)가 직접 API 로 표시용 문자열 `"10,000원"`(쉼표·원 포함)을 전송**해서 Postgres 숫자 변환이 실패한 것. **운영 버그가 아니라 테스트 payload 문제.**
- **운영 생성 UI 는 정상**: KPA `StoreLocalProductsPage` 의 가격 입력은 `type="number"`("표시 가격 (원)") 라 숫자만 전송 → numeric 컬럼 정상 저장.
- **진짜 UX 공백(KPA)**: `/store/commerce/local-products`(자체 상품 생성 페이지) 라우트는 존재하나 **KPA 사이드바 메뉴에 없다**(GP/KCos 는 '자체 상품' 메뉴 보유). 또 타블렛의 '매장 자체 제품' 탭과 '내 매장 제품 관리 →' 링크는 모두 **listings(/store/my-products)** 로만 연결되어, **자체 제품을 만들 동선이 KPA UI 에 없다**. 이 때문에 타블렛 테스트 데이터를 만들기 어려웠다.
- **부차적 견고성 갭(공유)**: 백엔드가 `priceDisplay` 문자열을 numeric 컬럼에 그대로 전달 → 비숫자 입력 시 400 이 아니라 **500**. 정제/검증 권장(낮은 우선순위).

---

## 2. 현재 생성 경로

| 경로 | 무엇을 생성 | 비고 |
|---|---|---|
| `/store/my-products` (`StoreProductsManagerPage`) | **organization_product_listings** (O4O 제품 기반 listing) | 자체 제품(store_local_products) 생성 아님 |
| `/store/commerce/local-products` (`StoreLocalProductsPage` + 공유 `StoreLocalProductsManager`) | **store_local_products** (매장 자체 제품) | App.tsx:1003 라우트 존재. **KPA 메뉴 미노출** |
| 타블렛 '매장 자체 제품' 탭 (`StoreTabletDisplaysPage`) | 생성 아님 — 기존 local product **선택(진열)** 만 | 생성 링크 없음 |

→ KPA 에서 자체 제품을 만들려면 `/store/commerce/local-products` URL 을 직접 알아야 한다(메뉴/링크 없음).

## 3. 프론트 payload 조사

- `LocalProductInput`(KPA `api/localProducts.ts`): `name`(필수) + `description?/category?/priceDisplay?` 등 전부 optional. `priceDisplay?: string`.
- `StoreLocalProductsPage`(line 627–635): 가격 = **`<input type="number">`**, 제출 시 `if (priceDisplay.trim()) data.priceDisplay = priceDisplay.trim()`(line 517). number 입력이라 사용자는 `10000` 같은 숫자 문자열만 보냄 → numeric 정상.
- 조사자의 직접 API 호출은 `"10,000원"` 을 보냄 → 실패. **UI 는 이 경로를 타지 않음.**

## 4. 백엔드 validation 조사

`apps/api-server/src/routes/platform/store-local-product.routes.ts` `POST /local-products`:
1. `requireAuth` + `resolveStoreAccess(userId, roles)` → org 없으면 403.
2. `name` 없으면 **400 VALIDATION_ERROR** "Product name is required".
3. `badgeType` 유효성(`none/new/recommend/event`) → 400.
4. `repo.create({... priceDisplay: priceDisplay != null ? String(priceDisplay) : null ...})` → `repo.save`.
5. 예외 시 **500 INTERNAL_ERROR** "Failed to create local product" (← 받은 오류 지점).

→ 필수 = `name`. 가격/이미지/분류/상태는 optional·기본값(`isActive:true`, `badgeType:'none'`, `images:[]`). **`String(priceDisplay)` 가 numeric 컬럼에 비숫자 문자열을 그대로 전달**하는 것이 500 의 직접 트리거.

## 5. DB 제약 조사

`store_local_products`(entity `store-local-product.entity.ts` / migration `20260224200000`,`…400000`):
- `name varchar(200) NOT NULL`, `organization_id uuid NOT NULL`.
- `price_display numeric(12,2) nullable` ← **표시용 이름이지만 타입은 numeric**(TS 는 `string`). 의미·타입 불일치.
- `images/gallery_images jsonb default []`, `badge_type enum default 'none'`, `is_active default true`, `sort_order default 0`.
- 그 외 content 필드(summary/detail_html/usage/caution/thumbnail) nullable.

→ 필수 DB 컬럼은 name/organization_id 뿐. 실패는 제약 위반이 아니라 **numeric 캐스팅 실패**.

## 6. 실패 원인 (확정)

```
표시 문자열 "10,000원"(또는 "10,000") → price_display numeric 컬럼 → invalid input syntax → 500
```
- 위치: **테스트 payload**(조사자) + 부차적으로 **백엔드가 비숫자 문자열을 numeric 에 무검증 전달**.
- **운영 정상 흐름(number input)에서는 재현되지 않음.**

## 7. 수정 필요 여부

- **생성 기능 자체: 수정 불필요**(정상 동작).
- **KPA 접근 동선: 보완 권장** — 자체 제품 생성 페이지가 KPA 메뉴/타블렛 링크에서 도달 불가.
- **백엔드 견고성: 선택적 보완** — `priceDisplay` 숫자 검증/정제(쉼표·통화기호 제거 또는 비숫자 시 400). 낮은 우선순위.

## 8. §6 필수 질문 답변

| # | 질문 | 답 |
|---|---|---|
| 1 | 생성 API 존재? | ✅ `POST /api/v1/store/local-products` |
| 2 | /store/my-products 에서 자체 제품 생성 가능? | ❌ 거기선 listing 생성. 자체 제품은 `/store/commerce/local-products`(별도 페이지, **KPA 메뉴 미노출**) |
| 3 | "Failed to create…" 실제 응답? | **500** `QueryFailedError: invalid input syntax for type numeric: "10,000원"` (Cloud Run 로그) |
| 4 | 원인 위치? | **테스트 payload**(formatted price→numeric). 부차적으로 백엔드 무검증 String 전달 |
| 5 | 필수 필드? | `name` 만 |
| 6 | UI 가 필수 필드 다 받는가? | ✅ name + (number)가격. 운영 UI 정상 |
| 7 | product-pool 의 local 조회? | `SELECT … FROM store_local_products WHERE organization_id=$1 AND is_active=true` |
| 8 | 생성 성공 시 타블렛 '매장 자체 제품' 탭 즉시 노출? | ✅ is_active=true 기본 → product-pool 에 포함(브라우저 시각 1회 확인은 프로필 점유로 보류) |
| 9 | 후속은 프론트만? 백엔드도? | 접근 동선=프론트(메뉴/링크). 가격 견고성=백엔드(선택) |

## 9. 자동 넘김 smoke 와의 관계

- 자동 넘김 시각 smoke 가 막힌 이유 = 데모 매장 진열 0건 + 자체 제품 생성 동선 부재(+ 조사자 시드 payload 오류). **생성 API 정상**이므로, 숫자 가격으로 시드하면 즉시 진열 → 자동 넘김 시각 확인 가능.
- 즉 자동 넘김 구현 자체와 무관한 **테스트 데이터 동선** 문제.

## 10. 후속 WO 제안

1. **WO-O4O-KPA-STORE-LOCAL-PRODUCT-MENU-ACCESS-V1 (후보 C 변형, 권장 1순위)**
   - KPA 에서 자체 제품 생성 동선 확보: '자체 상품'을 **타블렛 그룹 또는 내 매장 제품 영역에 메뉴/링크 추가**(라우트 `/store/commerce/local-products` 재사용, GP/KCos 와 동일 패턴). 데드링크 0.
   - 이걸로 타블렛 테스트 데이터 동선 + 자동 넘김/미리보기 smoke 가 풀림.
2. **WO-O4O-KPA-STORE-LOCAL-PRODUCT-PRICE-INPUT-HARDENING-V1 (후보 B, 선택)**
   - 백엔드: `priceDisplay` 숫자 검증/정제(쉼표·통화기호 strip 또는 비숫자 400). 공유 API 라 GP/KCos 영향 검토.
   - 또는 컬럼 의미 정합(`price_display` numeric ↔ 이름) 재검토.

> 후보 A(프론트 payload fix)는 불필요 — 운영 프론트는 이미 정상(number input).

## 11. 완료 기준 대비

- 코드/DB/UI 변경 없음 ✅ (read-only)
- 온라인 판매 조사 제외 ✅
- 실패 원인 확인 ✅ (numeric 캐스팅, Cloud Run 로그)
- 원인 위치 특정 ✅ (테스트 payload + 백엔드 무검증; 운영 정상)
- 후속 WO 제안 ✅ (§10)

## 부록 — 참조

| 항목 | 위치 |
|---|---|
| 생성 핸들러 | `apps/api-server/src/routes/platform/store-local-product.routes.ts:151` |
| 엔티티 | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` (price_display numeric:45) |
| KPA 생성 페이지 | `services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx` (가격 number input:627) / 라우트 `App.tsx:1003` |
| 공유 매니저 | `packages/store-ui-core/src/components/local-products/StoreLocalProductsManager.tsx` |
| 메뉴(자체 상품: GP/KCos 만) | `packages/store-ui-core/src/config/storeMenuConfig.ts:119,197` (KPA 블록 없음) |
| Cloud Run 로그 | `[StoreLocalProduct] POST /local-products error: QueryFailedError: invalid input syntax for type numeric` (2026-06-26 02:45 KST) |
