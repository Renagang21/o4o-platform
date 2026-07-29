# CHECK-O4O-KPA-STORE-LOCAL-PRODUCTS-ENTRY-ALIGNMENT-V1

> 매장 자체 상품(`store_local_products`) 등록·수정 진입점 복원 및 잔재 정합
> WO: `WO-O4O-KPA-STORE-LOCAL-PRODUCTS-ENTRY-ALIGNMENT-V1`
> 선행 IR: [IR-O4O-KPA-STORE-HIDDEN-MANAGEMENT-ENTRY-POLICY-AUDIT-V1](../investigations/IR-O4O-KPA-STORE-HIDDEN-MANAGEMENT-ENTRY-POLICY-AUDIT-V1.md)
> 채택안: **A1 (진입점 복원)** — A2(전면 은퇴) 기각
> 일자: 2026-07-29 · 범위: KPA 블록 한정 (GlycoPharm / K-Cosmetics 무변경)

---

## 1. 배경

선행 IR 에서 확정된 사실:

- `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-INTERNAL-TABS-V1` 이 `매장 자체 제품` 사이드바 메뉴를 제거하면서
  전제로 삼은 것은 **"handled-products 화면 내부(출처 탭 + 상단 관리 버튼 + 행 관리 버튼)로 흡수"** 였다.
- 그러나 후속 `WO-O4O-KPA-STORE-HANDLED-PRODUCT-REMOVE-AND-STATUS-AUDIT-V1` 이
  바로 그 흡수처(로컬 탭 · 등록 버튼)를 제거하며 `'매장 직접 등록' 정책 폐기` 로 기록했다.
- 결과: **등록·수정 진입점만 소실**되고 소비는 전부 살아 있는 상태.

소비처(모두 현재도 유효):

| 소비처 | 의존 형태 |
|---|---|
| `StoreProductDescriptionsPage` (약국 경영지원 > 상품 설명) | `fetchLocalProducts()` — 목록 **100% 의존** |
| `StoreTabletDisplaysPage` (태블렛 화면 제작) | `product_type: 'local'` pool |
| QR | local 대상 |
| 다국어 콘텐츠 | `targetKind = 'local'` |
| `/api/v1/store/handled-products` | UNION 소스 (`localSelect`) |

→ 신규 매장은 `상품 설명` 메뉴를 **사용 자체가 불가**. CLAUDE.md §1 **"실기능 메뉴 은폐 0"** 위반 상태.

---

## 2. 판정 및 방침

| 항목 | 결정 |
|---|---|
| `/store/commerce/local-products` | **A. 정식 사이드바 메뉴** 로 복원 |
| route | **무변경** (신규 route 0 / redirect 0) |
| 메뉴 라벨 | `매장 자체 상품` |
| 메뉴 위치 | `약국 상품·거래` 그룹, `매장 경영활용 제품` 바로 아래 |
| handled-products | 로컬 탭·등록 버튼 **재추가 안 함** (WO §11 금지) |
| 홈 CTA | **추가 안 함** (WO §5.7) |
| API / DB | **무변경** |

---

## 3. 변경 내역

### 3.1 사이드바 메뉴 복원 (§5.1)

`packages/store-ui-core/src/config/storeMenuConfig.ts` — **KPA 블록 한정**

```ts
{ key: 'handled-products', label: '매장 경영활용 제품', subPath: '/handled-products' },
+ { key: 'local-products', label: '매장 자체 상품', subPath: '/commerce/local-products' },
{ key: 'orders', label: '발주 내역', subPath: '/commerce/orders' },
```

- `local-products` 는 이미 `StoreMenuKey` 유니온(L39)에 존재 → 타입 확장 불필요
- `StoreSidebar.SECTION_ICONS['local-products'] = ShoppingBag` 이미 존재 → 아이콘 fallback 불필요
- 기존 흡수 정책 주석은 **삭제하지 않고**, 그 아래 본 WO 주석으로 경위를 이어 붙였다 (이력 보존)

### 3.2 route 무변경 (§5.2)

`services/web-kpa-society/src/App.tsx` — path 문자열 `commerce/local-products` 그대로.
신규 route·redirect·Navigate 추가 0.

### 3.3 소유자 전용 가드 정렬 (§5.3)

```tsx
<Route
  path="commerce/local-products"
  element={
    <PharmacyOwnerOnlyGuard>
      <StoreLocalProductsPage />
    </PharmacyOwnerOnlyGuard>
  }
/>
```

가드 역전 해소: **쓰기 화면**인 local-products 가 `PharmacyGuard` 만 걸려 있고
**읽기 전용**인 handled-products 가 `PharmacyOwnerOnlyGuard` 이던 상태를 동일 기준으로 정렬.
(백엔드는 이미 `requireAuth` + pharmacy owner + `resolveStoreAccess` 로 org 스코프 적용 중 — 프론트 가드는 표시 정합)

### 3.4 stale 정책 주석 정정 (§5.4)

`StoreHandledProductsPage.tsx`

- 헤더 주석: `'매장 직접 등록'(store_local_products) 정책 폐기`
  → `이 화면에서의 '매장 직접 등록' 진입 폐기` 로 축소하고,
  본 WO 주석 블록으로 **데이터 축은 유효**하다는 사실과 canonical 진입점을 명시
- 인라인 주석(등록 버튼 자리): 동일 취지 + **이 화면에 버튼 재추가 금지** 명시

### 3.5 태블릿 화면 잔재 정정 (§5.5)

`StoreTabletDisplaysPage.tsx`

| 위치 | 이전 | 이후 |
|---|---|---|
| 헤더 뒤로가기 화살표 | `navigate('/store/commerce/local-products')` | `navigate('/store')` |
| local pool 빈 상태 | `태블렛에 진열할 **매장 경영활용 제품**이 없습니다` / 버튼 `매장 경영활용 제품 등록` | `… **매장 자체 상품**이 없습니다` / 버튼 `매장 자체 상품 등록` |

- 뒤로가기: 태블릿 화면 제작에서 자체 상품 관리로 튀던 동선 잔재 → 매장 홈 복귀로 정정
- 빈 상태: 이동 대상 route 는 **무변경**(local-products 가 정상 진입점이 되었으므로 유지).
  실제 pool(`product_type='local'`)과 복원된 메뉴 라벨에 문구만 정합

### 3.6 상품 설명 화면 라벨 정합 (§5.6)

`StoreProductDescriptionsPage.tsx`

| 위치 | 이전 | 이후 |
|---|---|---|
| 사이드 목록 제목 | `내 매장 상품 (n)` | `매장 자체 상품 (n)` |
| 빈 상태 문구 | `등록된 자체 상품이 없습니다.` | `등록된 매장 자체 상품이 없습니다.` |
| 빈 상태 링크 | `상품 등록하기` | `매장 자체 상품 등록하기` |

링크 대상 `/store/commerce/local-products` 는 무변경 — 이제 사이드바 메뉴와 동일 목적지.

### 3.7 홈 CTA (§5.7)

**추가하지 않음.** `StoreHomePage.tsx` 무변경.

---

## 4. Shared Module Change Protocol 확인 (§6)

`storeMenuConfig.ts` 는 3개 서비스 공통 모듈 → 소비처 전수 확인.

| 확인 항목 | 결과 |
|---|---|
| GlycoPharm 블록 (L197 `local-products`) | **무변경** — 기존 `자체 상품` / `/commerce/local-products` 유지 |
| K-Cosmetics 블록 (L119 `local-products`) | **무변경** |
| 공통 flat 정의 (L79) | **무변경** |
| `StoreMenuKey` 유니온 | **무변경** (`local-products` 기존 존재) |
| `MENU_CAPABILITY_MAP` | `local-products` **미매핑** → capability OFF 로 숨겨질 위험 없음 (항상 표시) |
| `resolveStoreMenu()` 섹션 필터 | 빈 그룹 제거 로직 있으나 `약국 상품·거래` 는 항목 5→6 증가 → 그룹 소멸 위험 없음 |
| `StoreSidebar` 렌더 경로 | `menuSections` 존재 시 `enabledMenus` 필터 미적용 → 신규 항목 즉시 노출 |
| `SECTION_ICONS` | `'local-products': ShoppingBag` 존재 → `FileText` fallback 아님 |
| 데드링크 | route 존재 확인 (`App.tsx` `commerce/local-products`) → **0** |
| 기능 은폐 | 실기능 화면 복원 → **0** |

`git diff` 로 `storeMenuConfig.ts` 변경이 KPA 블록 9줄 추가에 국한됨을 확인.

---

## 5. 정적 검증 (§9)

```
rg "local-products" services/web-kpa-society/src
```

| 결과 | 판정 |
|---|---|
| `App.tsx:1005` route | 유지 (가드만 추가) |
| `api/localProducts.ts` ×5 | API 무변경 |
| `StoreHandledProductsPage.tsx:19` | 정정된 주석(canonical 진입점 안내) |
| `StoreProductDescriptionsPage.tsx:240` | 빈 상태 링크 유지 |
| `StoreTabletDisplaysPage.tsx:1490` | local pool 빈 상태 CTA 유지 |
| 헤더 뒤로가기 잔재 | **소멸** (`/store` 로 정정) |

```
rg "정책 폐기" services/web-kpa-society/src
```
→ 1건. 본 WO 정정 주석 내부의 인용(`위 '정책 폐기' 표현은 …`)뿐. 오해 소지 있는 원문 표현 잔존 0.

---

## 6. 타입체크 / 빌드 (§10)

| 대상 | 명령 | 결과 |
|---|---|---|
| web-kpa-society | `npx tsc --noEmit` | **PASS** (출력 없음) |
| web-kpa-society | `npx vite build` | **PASS** (✓ built in 18.13s) |
| web-glycopharm | `npx tsc --noEmit` | **PASS** (exit 0) |
| web-k-cosmetics | `npx tsc --noEmit` | **PASS** (exit 0) |

`@o4o/store-ui-core` 는 source-only 패키지(빌드 스크립트 없음) → 소비 서비스 3종 타입체크로 대체 검증.

---

## 7. 브라우저 smoke (§8)

배포 후 실브라우저 검증 — 아래 §8 참조.

---

## 8. 금지 사항 준수 (§11)

| 금지 항목 | 준수 |
|---|---|
| handled-products 에 local 탭 재추가 | ✅ 안 함 |
| handled-products 에 등록 버튼 재추가 | ✅ 안 함 (주석으로 재추가 금지 명문화) |
| `store_local_products` 전면 은퇴 | ✅ 안 함 |
| 상품 설명 OPL 기반 재설계 | ✅ 안 함 (라벨만 정합) |
| 태블릿 local product 제거 | ✅ 안 함 |
| QR local product 제거 | ✅ 안 함 |
| 다국어 local target 제거 | ✅ 안 함 |
| API 변경 | ✅ 0 |
| DB migration | ✅ 0 |
| 홈 CTA 추가 | ✅ 안 함 |
| production-materials 변경 | ✅ 0 |
| GP / KCos 블록 변경 | ✅ 0 |

---

## 9. 후속

`WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-ENTRY-ALIGNMENT-V1` (별도 WO)
— IR 판정: 목록·`/new` = **C. legacy 호환 route**, `/:id/edit` = **B. 내부 액션·딥링크(유지 필수)**.
