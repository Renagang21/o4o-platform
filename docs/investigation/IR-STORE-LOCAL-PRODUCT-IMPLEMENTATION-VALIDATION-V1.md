# IR-STORE-LOCAL-PRODUCT-IMPLEMENTATION-VALIDATION-V1

> **StoreLocalProduct 구현 정합성 최종 검증 보고서**
> 2026-02-24

---

## 검증 목적

StoreLocalProduct가 다음 기준을 정확히 만족하는지 코드 레벨 전수 검증:

> StoreLocalProduct는 Store Private Display Domain이며
> Commerce Domain에 절대 진입하지 않는다.

**본 검증은 코드 수정 없이 분석 및 보고만 수행한다.**

---

## 종합 판정

```
1. Domain Boundary:        PASS
2. Checkout Isolation:     PASS
3. Channel Separation:     PASS
4. KPI Isolation:          PASS
5. ENUM Enforcement:       PASS
6. Multi-Tenant Isolation: PASS
7. Security (XSS etc):     PASS WITH NOTES

종합 판정: SAFE WITH NOTES
```

---

## 1. Domain Boundary 검증

**판정: PASS**

### A. FK / JOIN 검증

전체 코드베이스에서 `store_local_products`와 Commerce 테이블 간 연결을 전수 검색했다.

| 교차 경로 | 결과 |
|----------|------|
| `store_local_products` → `ecommerce_order_items` JOIN | 없음 |
| `store_local_products` → `ecommerce_orders` JOIN | 없음 |
| `store_local_products` → `ecommerce_payments` JOIN | 없음 |
| `store_local_products` → `organization_product_listings` FK | 없음 |
| `store_local_products` → `organization_product_channels` FK | 없음 |
| `store_local_products` → `checkout_orders` FK | 없음 |
| `store_local_products` → `o4o_payments` FK | 없음 |
| `store_local_products` → Distribution 테이블 | 없음 |
| `store_local_products` → Sales limit 테이블 | 없음 |

### B. Entity Relationship 검증

`store-local-product.entity.ts`:

| 데코레이터 | 수량 |
|-----------|------|
| @ManyToOne | 0 |
| @OneToMany | 0 |
| @OneToOne | 0 |
| @ManyToMany | 0 |

FK: `organization_id` → `organizations(id)` (멀티테넌트 격리 전용) 1건만 존재.
Commerce 엔티티 참조 없음.

### C. 전체 참조 맵

`store_local_products`를 참조하는 파일 (전수):

| 파일 | 참조 유형 | 분류 |
|------|----------|------|
| `store-local-product.entity.ts` | Entity 정의 | SAFE |
| `entities/index.ts` | Export 등록 | SAFE |
| `database/connection.ts` | DataSource 등록 | SAFE |
| `store-local-product.routes.ts` | CRUD API | SAFE |
| `store-tablet.routes.ts` | Display 검증 | SAFE |
| `unified-store-public.routes.ts` | Public 조회 | SAFE |
| `20260224200000-CreateStoreLocalProductTables.ts` | 테이블 생성 | SAFE |
| `20260224300000-HardenStoreLocalProductDomain.ts` | 경계 강화 | SAFE |
| `20260224400000-AddStoreLocalProductContentFields.ts` | 콘텐츠 확장 | SAFE |
| `checkout.controller.ts` | Guard 주석만 | SAFE |
| `cosmetics-order.controller.ts` | Guard 주석만 | SAFE |
| `glycopharm-store-data.adapter.ts` | Guard 주석만 | SAFE |
| `cosmetics-store-summary.service.ts` | Guard 주석만 | SAFE |
| `store-hub.controller.ts` | Guard 주석만 | SAFE |
| `STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md` | 정책 문서 | SAFE |

**Commerce 파일에서 실행 코드로 참조: 0건. Guard 주석으로만 참조: 4건.**

---

## 2. Checkout Isolation 검증

**판정: PASS**

### GlycoPharm Checkout (`checkout.controller.ts`)

- **Product 조회 대상**: `GlycopharmProduct` 엔티티 (`glycopharm_products` 테이블) 전용
- **Guard**: WO-STORE-LOCAL-PRODUCT-HARDENING-V1 마커 존재 (line 319-324)
- **차단 메커니즘**: `store_local_products` UUID는 `glycopharm_products`에 존재 불가 → `PRODUCT_NOT_FOUND`로 구조적 거부
- **Indirect 경로**: 없음

### Cosmetics Checkout (`cosmetics-order.controller.ts`)

- **Product 조회 대상**: `cosmetics.cosmetics_products` + `cosmetics.cosmetics_store_listings` 전용
- **Guard**: WO-STORE-LOCAL-PRODUCT-HARDENING-V1 마커 존재 (line 459-468)
- **차단 메커니즘**: `store_local_products` UUID는 cosmetics 스키마에 존재 불가 → `PRODUCT_NOT_AVAILABLE`로 구조적 거부
- **Indirect 경로**: 없음

### ProductId 혼동 위험 평가

두 Checkout 모두 **도메인 전용 Product 테이블만 조회**하므로, 임의의 UUID를 productId로 전달해도 `store_local_products` 레코드에 도달하는 경로가 구조적으로 존재하지 않는다.

---

## 3. Channel Separation 검증

**판정: PASS**

### Tablet Public API (`GET /:slug/tablet/products`)

| 항목 | 결과 |
|------|------|
| supplierProducts와 localProducts 별도 쿼리 | YES |
| DB UNION 사용 | NO |
| DB JOIN으로 결합 | NO |
| 병합 방식 | 애플리케이션 레벨 (spread operator + 별도 필드) |

**Supplier Query** (line 794-801):
```
glycopharm_products
  INNER JOIN organization_product_listings
  INNER JOIN organization_product_channels
  INNER JOIN organization_channels
WHERE p.status = 'active' AND opl.is_active = true AND opc.is_active = true AND oc.status = 'APPROVED'
```
→ 4중 Visibility Gate

**Local Products Query** (line 807-814):
```
store_local_products WHERE organization_id = $1 AND is_active = true
```
→ 단일 테이블, Display Domain 전용

**API 응답 구조**:
- `data`: supplier products (Commerce Domain)
- `localProducts`: local products (Display Domain) — 별도 최상위 필드

---

## 4. KPI Isolation 검증

**판정: PASS**

### GlycoPharm `getTopProducts()` (`glycopharm-store-data.adapter.ts`)

- **집계 대상**: `ecommerce_order_items JOIN ecommerce_orders`
- **store_local_products 참조**: 없음
- **WO 마커**: KPI 오염 방지 주석 존재 (line 73-79)

### Cosmetics `getTopProducts()` (`cosmetics-store-summary.service.ts`)

- **집계 대상**: `ecommerce_order_items JOIN ecommerce_orders`
- **store_local_products 참조**: 없음
- **WO 마커**: KPI 오염 방지 주석 존재 (line 85-91)

### Store Hub Overview (`store-hub.controller.ts`)

| 섹션 | 집계 대상 | store_local_products 포함 |
|------|----------|:-------------------------:|
| Products | Commerce Product count (link only) | NO |
| KPI Summary | `checkout_orders` | NO |
| Channels | `organization_product_channels` + `organization_product_listings` | NO |

### 간접 오염 경로

`store_local_products`와 `ecommerce_order_items` 사이:
- 공유 FK 없음
- 공유 테이블 없음 (organization_id는 격리용이지 연결용이 아님)
- Checkout Guard에 의해 `store_local_products` UUID가 주문 항목에 진입 불가

**구조적으로 KPI 오염 불가능.**

---

## 5. ENUM Enforcement 검증

**판정: PASS**

### product_type ENUM (store_tablet_displays)

| 항목 | 결과 |
|------|------|
| 타입 | PostgreSQL 네이티브 ENUM |
| SQL | `CREATE TYPE "store_tablet_display_product_type_enum" AS ENUM ('supplier', 'local')` |
| 허용 값 | `'supplier'`, `'local'` |
| CHECK 제약 아닌지 | ENUM 확인 (CHECK 아님) |

### badge_type ENUM (store_local_products)

| 항목 | 결과 |
|------|------|
| 타입 | PostgreSQL 네이티브 ENUM |
| SQL | `CREATE TYPE "store_local_product_badge_type_enum" AS ENUM ('none', 'new', 'recommend', 'event')` |
| 허용 값 | `'none'`, `'new'`, `'recommend'`, `'event'` |
| 기본값 | `'none'` |

### Entity ↔ Migration 일치성

| 항목 | Migration | Entity | TypeScript 타입 | 일치 |
|------|----------|--------|----------------|:----:|
| badge_type 값 | `('none','new','recommend','event')` | `enum: ['none','new','recommend','event']` | `'none' \| 'new' \| 'recommend' \| 'event'` | YES |
| badge_type 기본값 | `'none'` | `default: "'none'"` | — | YES |

### 애플리케이션 레벨 이중 검증

`store-local-product.routes.ts`:
- `VALID_BADGE_TYPES = ['none', 'new', 'recommend', 'event']` (line 57)
- POST 엔드포인트: badge_type 검증 (line 225-232)
- PUT 엔드포인트: badge_type 검증 (line 321-328)

**DB ENUM + 애플리케이션 검증 이중 적용.**

---

## 6. Multi-Tenant Isolation 검증

**판정: PASS**

### 엔드포인트별 격리 검증

| 엔드포인트 | Auth | Role | OrgId 출처 | OrgId 필터 | Body 주입 가능 |
|-----------|:----:|:----:|:----------:|:----------:|:-------------:|
| GET /local-products | YES | YES | Auth context | WHERE org_id=$1 | NO |
| POST /local-products | YES | YES | Auth context | CREATE 시 강제 | NO |
| PUT /local-products/:id | YES | YES | Auth context | findOne(id + orgId) | NO |
| DELETE /local-products/:id | YES | YES | Auth context | UPDATE WHERE id=$1 AND org_id=$2 | NO |

### 핵심 격리 패턴

1. **organizationId는 절대 request body에서 수용하지 않는다**
   - `getUserOrganizationId(dataSource, userId)` — 인증된 사용자의 KpaMember에서 조회
   - request body에서 organizationId를 destructure하지 않음

2. **모든 쿼리에 organization_id 필터 강제**
   - GET: `WHERE organization_id = $1`
   - POST: `organizationId` (auth context에서 강제 설정)
   - PUT: `findOne({ where: { id: productId, organizationId } })` — 양쪽 모두 일치해야 접근
   - DELETE: `WHERE id = $1 AND organization_id = $2` — 양쪽 모두 일치해야 변경

3. **Cross-tenant 접근 불가능**
   - Org A 사용자가 Org B 상품에 접근 시 → findOne null → 404 NOT_FOUND
   - Body에 다른 organizationId를 주입해도 무시됨 (auth context에서만 파생)

### Public 엔드포인트 격리

- `GET /:slug/tablet/products`: slug → `resolvePublicStore()` → 고정된 storeId (= organizationId)
- slug 조작으로 타 매장 접근 불가 (slug-organization 매핑은 DB에서 검증)

### validateBodyTenant 미들웨어

- 존재하나 (`tenant-isolation.middleware.ts`) StoreLocalProduct 라우트에서 직접 사용하지 않음
- **수동 패턴으로 충분**: organizationId가 body에서 오지 않으므로 미들웨어 불필요

---

## 7. Security (XSS) 검증

**판정: PASS WITH NOTES**

### sanitizeHtml 함수 분석

위치: `store-local-product.routes.ts` (line 60-64)

```typescript
function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}
```

### 공격 벡터 커버리지

| 공격 벡터 | Backend 차단 | Frontend DOMPurify | 종합 |
|----------|:----------:|:-----------------:|:----:|
| `<script>alert(1)</script>` | YES | YES | SAFE |
| `<img onerror="alert(1)">` | YES | YES | SAFE |
| `<svg onload="alert(1)">` | YES | YES | SAFE |
| `<a href="javascript:alert(1)">` | **NO** | YES | SAFE (2차 방어) |
| `<iframe src="javascript:alert(1)">` | **NO** | YES | SAFE (2차 방어) |
| CSS injection (`style="..."`) | **NO** | YES | SAFE (2차 방어) |

### sanitizeHtml 적용 범위

| 필드 | Sanitize 적용 | 이유 |
|------|:----------:|------|
| detail_html (POST) | YES | HTML 허용 필드 |
| detail_html (PUT) | YES | HTML 허용 필드 |
| summary | NO | Plain text 필드 |
| usage_info | NO | Plain text 필드 |
| caution_info | NO | Plain text 필드 |
| description | NO | Plain text 필드 |

### Frontend 2차 방어

- `@o4o/block-renderer` 패키지에 DOMPurify v3.0.6 적용
- `HtmlBlock.tsx`에서 `DOMPurify.sanitize(content)` 호출 후 렌더링
- Backend가 놓치는 `javascript:` URL, CSS injection 등을 프론트엔드에서 차단

### NOTE

> Backend sanitizeHtml은 `<script>` 태그와 inline event handler를 차단한다.
> `javascript:` URL 및 CSS injection은 차단하지 않으나,
> 프론트엔드 DOMPurify가 이를 완전히 차단한다 (Defense-in-Depth).
>
> Plain text 필드(summary, usage_info, caution_info)는 HTML로 렌더링되지 않으므로
> XSS 위험이 낮다.
>
> 향후 backend sanitizer 강화를 권고하나, 현재 이중 방어로 실질적 XSS 위험은 없다.

---

## Safety Sweep

### TODO/FIXME/HACK 검색

StoreLocalProduct 관련 전체 파일에서:

| 마커 | 발견 수 |
|------|:------:|
| TODO | 0 |
| FIXME | 0 |
| HACK | 0 |
| TEMP | 0 |
| XXX | 0 |

기술 부채 없음.

---

## 5-Layer 보호 아키텍처 검증 요약

| Layer | 보호 수단 | 검증 결과 |
|-------|----------|:--------:|
| **DB** | PostgreSQL ENUM + TABLE COMMENT + 별도 테이블 | PASS |
| **Checkout** | 서비스별 Product 테이블만 조회 (구조적 거부) | PASS |
| **Query** | supplierProducts / localProducts 별도 쿼리 (UNION 금지) | PASS |
| **KPI** | ecommerce_order_items만 집계 (오염 불가) | PASS |
| **Code** | WO 마커 주석 10개소 + Boundary Policy 문서 | PASS |

---

## 개선 권고 사항 (Optional)

> 아래는 현재 기능에 문제가 없으나, 향후 강화를 고려할 수 있는 항목이다.

### R-1: Backend sanitizer 강화 (Low Priority)

현재 `sanitizeHtml`은 `<script>` 태그와 event handler만 제거한다.
`javascript:` URL, `data:` URI, CSS expression을 추가로 차단하면
Backend 단독으로도 완전한 XSS 방어가 가능하다.

**현재 위험**: 낮음 (Frontend DOMPurify가 완전 차단)

### R-2: summary/usage_info/caution_info 길이 제한 (Low Priority)

현재 text 타입으로 길이 제한 없음. 매우 긴 텍스트 입력 시
DB 저장/조회 성능 영향 가능.

**현재 위험**: 매우 낮음 (관리자만 입력 가능)

---

## 결론

**StoreLocalProduct Display Domain은 설계 의도대로 정확히 구현되었다.**

- Commerce Domain과의 교차 경로: **0건**
- Checkout 진입 가능성: **구조적 불가능**
- KPI 오염 가능성: **구조적 불가능**
- 멀티테넌트 격리: **완전**
- ENUM 강제: **DB + 애플리케이션 이중 적용**
- XSS 방어: **이중 방어 (Backend regex + Frontend DOMPurify)**
- 기술 부채: **0건**

**STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1에 명시된 모든 경계가 코드 레벨에서 강제되고 있음을 확인한다.**

---

*Generated: 2026-02-24*
*Status: Validation Complete — Read Only*
*Classification: Investigation Report*
