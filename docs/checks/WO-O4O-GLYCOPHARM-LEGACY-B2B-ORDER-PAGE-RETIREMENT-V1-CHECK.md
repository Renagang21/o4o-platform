# CHECK — GlycoPharm 레거시 `/store/b2b-order` 화면 은퇴

> **WO**: WO-O4O-GLYCOPHARM-LEGACY-B2B-ORDER-PAGE-RETIREMENT-V1
> **일자**: 2026-08-26
> **성격**: 구현 WO (legacy 화면 은퇴 + canonical 진입 정렬)
> **최종 상태**: **DONE**

선행: [WO-O4O-GLYCOPHARM-B2B-ORDER-TO-CANONICAL-CART-ADOPTION-V1-CHECK](WO-O4O-GLYCOPHARM-B2B-ORDER-TO-CANONICAL-CART-ADOPTION-V1-CHECK.md) (BLOCKED)
→ 그 CHECK §12 의 **D1 결정 = `/store/b2b-order` 은퇴** 를 실행한 WO 다.

---

## 1. 결정 근거 (D1)

선행 조사에서 확정된 사실:

```text
/store/b2b-order      → glycopharm_products (legacy)
                      → supplier organization 없음 · offer 앵커 없음 · canonical 공급가 없음
                      → "주문하기" = toast stub (주문 생성 0)

/store/commerce/products → supplier_product_offers (canonical)
                      → supplierId(neture_suppliers.id) · priceGeneral/priceGold 식별 가능
                      → "내 약국에 추가" = 공급 상품 신청(ProductApproval)
```

메뉴 SSOT 가 두 행을 **`상품` / `거래 신청`** 으로 나눠 노출하고 있었으나,
canonical 화면(`/commerce/products`)의 액션이 이미 **거래 신청**이다.
→ 같은 기능을 두 화면으로 유지할 이유가 없어 legacy 쪽을 은퇴시켰다.

**상품 source 를 canonical 로 갈아끼우지 않았다.** 그렇게 하면 canonical 카탈로그 화면이
2개가 되어 중복이 해소되지 않기 때문이다(선행 CHECK §12-D1).

---

## 2. 시작 기준

| 항목 | 값 |
|------|-----|
| 브랜치 | `main` |
| 시작 commit | `316a8ea08` (`HEAD == origin/main`) |
| 작업트리 | 시작 시 clean |
| 다른 세션 WIP | 작업 중 `apps/api-server` channel routes 삭제 · `entities.ts` · `register-routes.ts` 등장 — **접촉 0** (stage·commit 제외) |

---

## 3. 소비처 census (CLAUDE.md Shared Module Change Rule)

`/store/b2b-order` 는 **공통 패키지 `store-ui-core` 의 메뉴 SSOT** 에 등재돼 있어
단일 서비스 기준으로 완료 판단하지 않고 전 소비처를 식별했다.

### 3-1. 3축 검색 (선행 회귀 교훈 적용)

식별자 검색만으로 판정하지 않았다 — 직전 WO 에서 raw-text 단언 spec 을 놓쳐 main 이 red 가 된 사례가 있다.

| 축 | 쿼리 | 결과 |
|---|------|------|
| 식별자 | `storeMenuConfig` · `GLYCOPHARM_STORE_CONFIG` | 소비처 17개 파일 식별 |
| 파일경로 문자열 | `apps/api-server/src/__tests__/` 내 `storeMenuConfig` | **0건** (backend raw-text spec 없음) |
| 값 문자열 | `b2b-order` · `거래 신청` (`apps/` 전체) | **0건** |

### 3-2. 식별된 소비처와 처리

| # | 소비처 | 성격 | 처리 |
|:-:|--------|------|------|
| 1 | `services/web-glycopharm/src/App.tsx:124` lazy import | 라우트 | 은퇴 페이지로 교체 |
| 2 | `App.tsx:1080` `<Route path="b2b-order">` | 라우트 | **유지** (안내 렌더) |
| 3 | `pages/store-management/b2b-order/B2BOrderPage.tsx` (647줄) | legacy 화면 | **삭제** |
| 4 | `pages/store-management/b2b-order/index.ts` | barrel | export 교체 |
| 5 | `pages/store-management/StoreMainPage.tsx:54` QUICK_ACTIONS 카드 | 진입점 | canonical 로 **repoint** |
| 6 | `packages/store-ui-core/src/config/storeMenuConfig.ts:297` | **공통 메뉴 SSOT** | 행 제거 |
| 7 | `packages/store-ui-core/src/components/StoreSidebar.tsx:105` 아이콘 맵 | **공통 컴포넌트** | 고아 키 제거 |
| 8 | `packages/shared-space-ui/src/guide/copy/glycopharm.ts:1344` | 가이드 문구 | canonical 경로로 정정 |
| 9 | `pages/store-management/PharmacyB2BProducts.tsx:16` legacy 소비처 census 주석 | 주석 | 본 변경으로 낡아져 정정 |

### 3-3. 타 서비스 영향 = 0

- `b2b-order` 메뉴 행은 **`GLYCOPHARM_STORE_CONFIG` 안에만** 존재한다.
  `KPA_SOCIETY_STORE_CONFIG` · `COSMETICS_STORE_CONFIG` · `PHARMACY_HUB_STORE_CONFIG` 에는 없다.
- `menuCapabilityMap.ts` 에 `b2b-order` 항목 **없음** → capability/권한 영향 0.
- `StoreSidebar` 의 `Truck` 아이콘은 `suppliers` 키가 계속 사용 → import 고아화 없음.
- 빈 그룹 발생 없음: '약국 상품·거래' 그룹에 `products` · `orders` · `recruitment-applications` 3행 잔존
  (기능 은폐 0 · 데드링크 0).

---

## 4. 은퇴 방식 — 404 아님, 안내 페이지

WO 가 "404보다 안내/redirect 중 현재 UX 에 맞는 방식 선택" 을 요구했다.
저장소 선례([`OnlineSalesOrdersRetiredPage`](../../services/web-kpa-society/src/pages/pharmacy/OnlineSalesOrdersRetiredPage.tsx),
`WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1`)가 이미
**"라우트 유지 + 은퇴 안내 + canonical 대안 링크"** 패턴을 확립해 두어 그대로 따랐다.

`services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderRetiredPage.tsx` (신규)

- 라우트 `/store/b2b-order` 는 남는다 → 북마크·외부 링크·구 가이드 문구가 **404 로 떨어지지 않는다**
- 안내 + canonical 진입 2개: `/store/commerce/products`(거래 신청) · `/store/commerce/orders`(발주 내역)

redirect 대신 안내를 택한 이유: 사용자가 "주문 화면이 사라진 것" 을 인지하지 못한 채
다른 화면으로 튕기면 기능이 은폐된 것으로 오인된다. 선례도 동일 판단이다.

---

## 5. legacy 읽기 기능 보호 (WO 요구)

WO 가 "읽기용 legacy 상품관리 기능이 다른 곳에서 필요한지는 별도 보호" 를 요구했다.

| 자산 | 상태 | 조치 |
|------|------|------|
| `glycopharm_products` 테이블 | **보존** | 손대지 않음 |
| `pharmacyApi.getProducts` | **살아있음** — `pages/operator/StoreDetailPage.tsx:38` 이 계속 소비 | 보호(무변경) |
| admin · storefront · 파트너 모집 소비 | 보존 | 무변경 |
| `GET /api/v1/glycopharm/b2b/products` (backend) | ⚠️ **프런트 소비처 0 이 됨** | **제거하지 않음** → §8 DEFERRED |

DB · migration · 테이블 삭제 **0건**.

---

## 6. 변경 파일

```text
D  services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx   (-647)
A  services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderRetiredPage.tsx
M  services/web-glycopharm/src/pages/store-management/b2b-order/index.ts
M  services/web-glycopharm/src/App.tsx
M  services/web-glycopharm/src/pages/store-management/StoreMainPage.tsx
M  services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx
M  packages/store-ui-core/src/config/storeMenuConfig.ts
M  packages/store-ui-core/src/components/StoreSidebar.tsx
M  packages/shared-space-ui/src/guide/copy/glycopharm.ts
```

backend 변경 **0** · DB 변경 **0** · route 삭제 **0** · 권한/capability 변경 **0**.

---

## 7. 검증

| 대상 | 명령 | 결과 |
|------|------|:----:|
| store-ui-core parity contract | `vitest run --config packages/store-ui-core/vitest.config.mjs` | **18 tests PASS** |
| GlycoPharm typecheck | `pnpm --filter glycopharm-web run type-check` (`tsc -b`) | **PASS** (exit 0) |
| GlycoPharm build | `pnpm --filter glycopharm-web run build` | **PASS** (exit 0, 23.94s) |
| KPA Society build | `pnpm --filter @o4o/web-kpa-society run build` | **PASS** (exit 0, 19.99s) |
| K-Cosmetics build | `pnpm --filter @o4o/web-k-cosmetics run build` | **PASS** (exit 0, 17.27s) |
| Neture build | `pnpm --filter @o4o/web-neture run build` | **PASS** (exit 0, 15.87s) |
| PharmacyHub build | `pnpm --filter pharmacy-hub-web run build` | **PASS** (exit 0, 15.64s) |

`store-ui-core` · `shared-space-ui` 는 **source-only 패키지**(`main` = `./src/index.ts`)라
별도 dist 빌드가 필요 없고 소비 서비스가 직접 컴파일한다. 따라서 5서비스 빌드가
공통 패키지 변경의 실질 검증이다.

### 7-1. 타 4서비스 빌드 결과

**5서비스 전부 PASS (exit 0).** 공통 패키지 2개(`store-ui-core` · `shared-space-ui`)를 수정했으므로
소비 5서비스를 전수 빌드했다. GlycoPharm 외 4서비스는 소스 변경이 0 이며 빌드도 정상이다
= 공통 변경이 타 서비스 계약을 깨지 않았다.

---

## 8. UNKNOWN · DEFERRED

```text
UNKNOWN  = 0

DEFERRED = 2
  ① GET /api/v1/glycopharm/b2b/products 은퇴 여부
     프런트 소비처가 0 이 됐으나 backend route 제거는 API 계약 변경이라
     본 WO(화면 은퇴) 범위 밖. 별도 판단 필요.
     — 제거 시 확인할 것: 외부/모바일 소비 여부, glycopharm_products 읽기 축 영향

  ② D2 — GlycoPharm 일반 B2B 주문 확정 경로
     WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 로 분리.
     (checkout-confirm-b2b 의 serviceKey==='neture' 하드 제한 일반화)
     DF-3(KPA 관심상품 작업대)은 그 뒤에 연결한다 — 먼저 연결하면
     "cart 에는 담기지만 확정이 막히는" 구조를 반복한다.
```

---

## 9. 사업 경계 확인

| 확인 | 결과 |
|------|:----:|
| consumer commerce 재유입 | **0** (주문 UI 를 만든 게 아니라 없앴다) |
| consumer checkout 410 계약 | 무변경 (backend 무접촉) |
| PG · 결제 · 정산 | 무변경 |
| POS | 무접촉 |
| B2B canonical 축(`store_cart_items` / `checkout_orders`) | 무변경 |

`O4O-STORE-COMMERCE-BOUNDARY-V1` · `O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1` 위반 0.

---

## 10. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- 발견 1건 = `PharmacyB2BProducts.tsx` 의 legacy 소비처 census 주석이 본 변경으로 낡음 → 인라인 정정(§3-2 #9)
- 별도 WO 제안 1건 = §8 DEFERRED ①

`docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md` 는 **갱신하지 않았다** —
이번 WO 는 canonical 주문 축에 GlycoPharm 을 **추가하지 않았고**(화면 은퇴만 수행),
adoption 상태를 적을 수 있는 시점은 D2 완료 후다.

---

## 11. 최종 상태

```text
/store/b2b-order        = RETIRED (라우트 유지 · 안내 렌더)
legacy 주문 UI 연결      = 제거 (glycopharm_products 주문 화면 소멸)
canonical 진입           = /store/commerce/products 로 일원화
메뉴 SSOT               = '거래 신청' 행 제거, '상품' 행이 담당
legacy 읽기 축           = 보호 (operator/admin/storefront 소비 유지)
타 서비스               = 무영향
backend · DB            = 무변경
```
