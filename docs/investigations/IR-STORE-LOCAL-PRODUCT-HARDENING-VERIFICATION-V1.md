# IR-STORE-LOCAL-PRODUCT-HARDENING-VERIFICATION-V1

> **정적 검증 결과 보고서**
> WO-STORE-LOCAL-PRODUCT-HARDENING-V1 경계 고정 완료 검증

---

## 검증 일시

2026-02-24

## 검증 대상

StoreLocalProduct Display Domain 경계가 코드 레벨에서 강제되는지 정적 분석으로 확인.

---

## Phase 1: DB 레벨 강제 — ENUM 강화

| 항목 | 결과 |
|------|------|
| `store_tablet_display_product_type_enum` ENUM 생성 | ✅ Migration 20260224300000 |
| `store_tablet_displays.product_type` varchar → ENUM 전환 | ✅ USING 절 포함 |
| `store_local_products` TABLE COMMENT | ✅ Display Domain 명시 |
| `store_tablet_displays` TABLE COMMENT | ✅ Checkout 연결 없음 명시 |

---

## Phase 2: Checkout Guard 명시화

### GlycoPharm Checkout (`checkout.controller.ts`)

- **위치**: 상품 검증 섹션 (Section 3)
- **보호 메커니즘**: `GlycopharmProduct` 엔티티만 조회 → `store_local_products` UUID는 `PRODUCT_NOT_FOUND`로 거부
- **WO 마커**: `WO-STORE-LOCAL-PRODUCT-HARDENING-V1: Checkout Guard` ✅

### Cosmetics Checkout (`cosmetics-order.controller.ts`)

- **위치**: 제품 존재/활성 검증 섹션
- **보호 메커니즘**: `cosmetics.cosmetics_products` / `cosmetics_store_listings`만 조회 → `store_local_products` UUID는 `PRODUCT_NOT_AVAILABLE`로 거부
- **WO 마커**: `WO-STORE-LOCAL-PRODUCT-HARDENING-V1: Checkout Guard` ✅

### 교차 경로 검증

```
core/checkout/*           → store_local_products 참조: 0건
packages/ecommerce-core/* → store_local_products 참조: 0건
```

**결론**: store_local_products → ecommerce_order_items 교차 경로 **없음** (구조적 보장)

---

## Phase 3: Tablet Public Query 분리 고정

### `unified-store-public.routes.ts` — `GET /:slug/tablet/products`

| 쿼리 | 소스 | Domain |
|------|------|--------|
| `supplierProducts` | 4중 Visibility Gate (product + listing + channel + approval) | Commerce Domain |
| `localProducts` | `store_local_products WHERE is_active = true` | Display Domain |

- **DB UNION**: 금지 (애플리케이션 레벨 merge만 허용) ✅
- **WO 마커**: `WO-STORE-LOCAL-PRODUCT-HARDENING-V1: Query Separation Guard` ✅

---

## Phase 4: KPI 오염 방지

### GlycoPharm KPI (`glycopharm-store-data.adapter.ts`)

- `getTopProducts()`: `ecommerce_order_items JOIN ecommerce_orders`만 집계
- `store_local_products` 참조: 없음
- **WO 마커**: `WO-STORE-LOCAL-PRODUCT-HARDENING-V1: KPI 오염 방지` ✅

### Cosmetics KPI (`cosmetics-store-summary.service.ts`)

- `getTopProducts()`: `ecommerce_order_items JOIN ecommerce_orders`만 집계
- `store_local_products` 참조: 없음
- **WO 마커**: `WO-STORE-LOCAL-PRODUCT-HARDENING-V1: KPI 오염 방지` ✅

### Store Hub (`store-hub.controller.ts`)

- `GET /store-hub/overview` Section A: Commerce Product만 집계
- `store_local_products` 참조: 없음
- **WO 마커**: `WO-STORE-LOCAL-PRODUCT-HARDENING-V1: KPI 오염 방지` ✅

---

## Phase 5: 정적 검증 결과

### 전체 파일 참조 맵

`store_local_products` 테이블명을 참조하는 파일 (전체):

| 파일 | 참조 유형 | 허용 여부 |
|------|----------|----------|
| `store-local-product.entity.ts` | Entity 정의 | ✅ |
| `entities/index.ts` | Export | ✅ |
| `database/connection.ts` | DataSource 등록 | ✅ |
| `store-local-product.routes.ts` | CRUD API | ✅ |
| `store-tablet.routes.ts` | Display 검증 | ✅ |
| `unified-store-public.routes.ts` | Public 조회 | ✅ |
| `20260224200000-CreateStoreLocalProductTables.ts` | 테이블 생성 | ✅ |
| `20260224300000-HardenStoreLocalProductDomain.ts` | 경계 강화 | ✅ |
| `checkout.controller.ts` | Guard 주석만 | ✅ |
| `cosmetics-order.controller.ts` | Guard 주석만 | ✅ |
| `glycopharm-store-data.adapter.ts` | Guard 주석만 | ✅ |
| `cosmetics-store-summary.service.ts` | Guard 주석만 | ✅ |
| `store-hub.controller.ts` | Guard 주석만 | ✅ |

### 금지 경로 검증

| 경로 | 결과 |
|------|------|
| `store_local_products` → `ecommerce_order_items` JOIN | ❌ 없음 |
| `store_local_products` → `ecommerce_orders` JOIN | ❌ 없음 |
| `store_local_products` → `organization_product_listings` FK | ❌ 없음 |
| `store_local_products` → `organization_product_channels` FK | ❌ 없음 |
| `store_local_products` → Distribution Policy 참조 | ❌ 없음 |
| `store_local_products` → Sales Limit 참조 | ❌ 없음 |

### TypeScript 타입 검사

```
tsc --noEmit --project apps/api-server/tsconfig.json
```

- 신규 파일 에러: **0건**
- 기존 에러 (pre-existing): `@o4o/*` 모듈 해석, EcommerceOrder 타입 불일치 (변경 없음)

---

## Hard Boundary 체크리스트

- [x] store_local_products → ecommerce_order_items 연결 없음
- [x] store_local_products → organization_product_listings 연결 없음
- [x] store_local_products → organization_product_channels 연결 없음
- [x] Distribution policy 연결 없음
- [x] Sales limit 연결 없음
- [x] Frozen Core 수정 없음
- [x] DB ENUM 강제 적용
- [x] Checkout Guard 주석 6개소 배치
- [x] KPI 오염 방지 주석 3개소 배치
- [x] Query Separation Guard 주석 1개소 배치

---

## 결론

**WO-STORE-LOCAL-PRODUCT-HARDENING-V1: 경계 고정 완료**

StoreLocalProduct Display Domain은 다음 5개 레이어에서 보호된다:

1. **DB 레벨**: PostgreSQL ENUM + TABLE COMMENT
2. **Checkout 레벨**: 서비스별 Product 테이블만 조회 (구조적 거부)
3. **Query 레벨**: supplierProducts / localProducts 별도 쿼리 (UNION 금지)
4. **KPI 레벨**: ecommerce_order_items만 집계 (오염 불가)
5. **코드 레벨**: WO 마커 주석으로 향후 개발자에게 경고
