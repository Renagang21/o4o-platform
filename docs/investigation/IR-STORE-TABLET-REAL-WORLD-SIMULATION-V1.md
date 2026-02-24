# IR-STORE-TABLET-REAL-WORLD-SIMULATION-V1

> **Store Tablet Real-World Simulation 검증 보고서**
> 코드 수정 금지. 구조 변경 금지. '의도대로 작동하는가?'만 판단.
> 2026-02-24

---

## 종합 판정

```
1. Local Product Creation:          PASS
2. Multi-Tablet Creation:           PASS (NOTE: 이름 중복 허용, 태블릿 수 제한 없음)
3. Mixed Display Composition:       PASS
4. Public Tablet Visibility:        PASS
5. Cross-Service Isolation:         PASS
6. Orphan Handling:                 SAFE WITH NOTE (soft delete → zombie display)
7. Boundary Violation Attempts:     PASS (3건 모두 구조적 차단)

Final Verdict: SAFE WITH NOTES
```

---

## 1. Local Product Creation Flow

**대상 파일**: `store-local-product.routes.ts`

### 시뮬레이션: 매장 A 운영자가 자체 상품 "약국 비타민C" 생성

```
POST /api/v1/store/local-products
Authorization: Bearer {jwt}
Body: {
  "name": "약국 비타민C",
  "description": "매장 자체 비타민C 1000mg",
  "category": "supplements",
  "priceDisplay": "15000",
  "badgeType": "new",
  "highlightFlag": true,
  "detailHtml": "<p>상세 설명</p>"
}
```

### 검증 항목

| 검증 항목 | 코드 위치 | 결과 | 상세 |
|----------|:-------:|:----:|------|
| 인증 필수 | `store-local-product.routes.ts:91-94` | PASS | `requireAuth` 미들웨어 적용 |
| 역할 검증 | `store-local-product.routes.ts:100` | PASS | `isStoreOwnerRole()` — pharmacy_owner 또는 kpa:branch_admin/operator 필수 |
| organizationId 서버 주입 | `store-local-product.routes.ts:109,200,236` | PASS | `getUserOrganizationId(dataSource, userId)` — DB에서 추출, body 값 무시 |
| name 필수 검증 | `store-local-product.routes.ts:216-223` | PASS | 빈 문자열, null 차단 |
| badgeType ENUM 검증 | `store-local-product.routes.ts:225-232` | PASS | `VALID_BADGE_TYPES = ['none', 'new', 'recommend', 'event']` |
| detailHtml XSS sanitize | `store-local-product.routes.ts:245` | PASS | `sanitizeHtml()` — `<script>` 태그 + event handler 제거 |
| galleryImages 배열 검증 | `store-local-product.routes.ts:249` | PASS | `Array.isArray()` 확인, 아닌 경우 `[]` |

### Entity 구조 확인

| 컬럼 | Entity 타입 | Commerce 연관 | 상태 |
|------|------------|:------------:|:----:|
| id | UUID PK | 없음 | PASS |
| organizationId | UUID (서버 주입) | 없음 | PASS |
| name | varchar(200) | 없음 | PASS |
| badgeType | PostgreSQL ENUM | 없음 | PASS |
| priceDisplay | numeric(12,2) | **표시 전용, 계산 불가** | PASS |
| detailHtml | text (sanitized) | 없음 | PASS |

**결론**: `StoreLocalProduct`에는 `EcommerceOrder`, `EcommerceOrderItem`, `checkout` 관련 관계가 **단 하나도 없다**.
Entity에 FK 참조, ManyToOne 관계, 또는 Commerce 엔티티 import가 존재하지 않는다.

**판정: PASS**

---

## 2. Multi-Tablet Creation

**대상 파일**: `store-tablet.routes.ts`

### 시뮬레이션: 매장 A가 태블릿 3대 등록

```
POST /api/v1/store/tablets  → { "name": "1번 카운터", "location": "입구" }
POST /api/v1/store/tablets  → { "name": "2번 카운터", "location": "상담실" }
POST /api/v1/store/tablets  → { "name": "3번 카운터", "location": "대기석" }
```

### 검증 항목

| 검증 항목 | 코드 위치 | 결과 | 상세 |
|----------|:-------:|:----:|------|
| 인증 + 역할 검증 | `store-tablet.routes.ts:60-98` | PASS | `authenticateAndGetOrg()` — 인증 + organizationId 추출 통합 |
| organizationId 서버 주입 | `store-tablet.routes.ts:87,219` | PASS | DB에서 추출, `repo.create({ organizationId })` |
| name 필수 검증 | `store-tablet.routes.ts:208-215` | PASS | 빈 문자열 차단 |
| 멀티테넌트 격리 | `store-tablet.routes.ts:177-183` | PASS | `WHERE organization_id = $1` 필터 |
| 소유권 확인 (PUT) | `store-tablet.routes.ts:249-251` | PASS | `findOne({ where: { id, organizationId } })` |

### Notes

| 항목 | 현황 | 위험 수준 |
|------|------|:--------:|
| 이름 중복 허용 | 동일 조직 내 같은 name 태블릿 생성 가능 | LOW — 운영 편의 문제, 보안 이슈 아님 |
| 태블릿 수 제한 없음 | MAX 제한 쿼리 없음 | LOW — 프로덕션 규모에서 무시 가능 |
| soft delete | `is_active = false` 처리 (`store-tablet.routes.ts:292`) | 별도 분석 (항목 6) |

**판정: PASS** (NOTE: 이름 중복 및 수량 제한 미적용)

---

## 3. Mixed Display Composition

**대상 파일**: `store-tablet.routes.ts` (PUT /tablets/:id/displays)

### 시뮬레이션: 태블릿 1번에 supplier 2개 + local 1개 혼합 진열

```
PUT /api/v1/store/tablets/{tabletId}/displays
Body: {
  "displays": [
    { "productType": "supplier", "productId": "{opl-uuid-1}", "sortOrder": 1, "isVisible": true },
    { "productType": "local",    "productId": "{local-uuid-1}", "sortOrder": 2, "isVisible": true },
    { "productType": "supplier", "productId": "{opl-uuid-2}", "sortOrder": 3, "isVisible": true }
  ]
}
```

### 검증 항목

| 검증 항목 | 코드 위치 | 결과 | 상세 |
|----------|:-------:|:----:|------|
| productType ENUM 검증 | `store-tablet.routes.ts:117` | PASS | `['supplier', 'local'].includes(item.productType)` |
| supplier 상품 존재+소유 검증 | `store-tablet.routes.ts:124-132` | PASS | `organization_product_listings WHERE id = $1 AND organization_id = $2 AND is_active = true` |
| local 상품 존재+소유 검증 | `store-tablet.routes.ts:133-141` | PASS | `store_local_products WHERE id = $1 AND organization_id = $2 AND is_active = true` |
| 태블릿 소유권 확인 | `store-tablet.routes.ts:381-384` | PASS | `store_tablets WHERE id = $1 AND organization_id = $2` |
| displays 배열 검증 | `store-tablet.routes.ts:395-402` | PASS | `Array.isArray(displays)` |
| 트랜잭션 처리 | `store-tablet.routes.ts:416-436` | PASS | `dataSource.transaction()` — DELETE + INSERT atomic |

### Cross-Org Display 차단 시뮬레이션

```
시나리오: 매장 A가 매장 B의 local product UUID를 진열에 추가 시도
→ validateDisplayItems() line 134-141:
  SELECT id FROM store_local_products WHERE id = {B's productId} AND organization_id = {A}
→ 결과: 0건 (organization_id 불일치)
→ 응답: 400 "Local product not found"
→ 차단: PASS
```

```
시나리오: productType = 'invalid_type' 시도
→ line 117: !['supplier', 'local'].includes('invalid_type') → true
→ 응답: 400 "Invalid product_type"
→ 차단: PASS
```

**판정: PASS**

---

## 4. Public Tablet Visibility

**대상 파일**: `unified-store-public.routes.ts`

### 시뮬레이션: 소비자가 매장 A 태블릿 상품 조회

```
GET /api/v1/stores/pharmacy-a-slug/tablet/products
(인증 불필요 — Public endpoint)
```

### 검증 항목

| 검증 항목 | 코드 위치 | 결과 | 상세 |
|----------|:-------:|:----:|------|
| slug 기반 매장 해석 | `unified-store-public.routes.ts:53-93` | PASS | `resolvePublicStore()` → `StoreSlugService.findBySlug()` |
| storeId + serviceKey DB에서 추출 | `unified-store-public.routes.ts:92` | PASS | `{ storeId: record.storeId, serviceKey: record.serviceKey }` |
| Supplier: 4중 Visibility Gate | `unified-store-public.routes.ts:794` | PASS | `queryTabletVisibleProducts()` — product.status + listing.is_active + channel.is_active + channel.status='APPROVED' |
| Local: 단순 조회 (Display Domain) | `unified-store-public.routes.ts:807-814` | PASS | `WHERE organization_id = $1 AND is_active = true` |
| DB UNION 금지 | `unified-store-public.routes.ts:782-787` | PASS | 주석으로 명시: "DB UNION 금지. 애플리케이션 레벨 merge만 허용" |
| detail_html 목록 제외 | `unified-store-public.routes.ts:808-809` | PASS | SELECT에 `detail_html`, `usage_info`, `caution_info` 없음 |
| 응답 구조 분리 | `unified-store-public.routes.ts:816-820` | PASS | `{ data: supplierResult.data, localProducts: [...] }` — 별도 키 |

### Query Separation Guard 확인

```
WO-STORE-LOCAL-PRODUCT-HARDENING-V1에 의해:
├─ supplierProducts: 4중 Gate 쿼리 (Commerce Domain)
│  → organization_product_listings JOIN organization_product_channels JOIN organization_channels
│  → p.status = 'active', opl.is_active, opc.is_active, oc.status = 'APPROVED'
│
└─ localProducts: 단순 org 필터 쿼리 (Display Domain)
   → store_local_products WHERE organization_id = $1 AND is_active = true
   → Checkout 진입 불가 (구조적 보장)
```

**판정: PASS**

---

## 5. Cross-Service Isolation

### 시뮬레이션: GlycoPharm 매장의 태블릿이 Cosmetics 상품을 보여주는가?

### 분석

| 격리 지점 | 메커니즘 | 상태 |
|----------|---------|:----:|
| Slug Resolution | `StoreSlugService.findBySlug(slug)` → DB에서 `serviceKey` 추출 | PASS |
| serviceKey 소비자 주입 불가 | URL param에 serviceKey 없음, DB 레코드에서만 추출 | PASS |
| Supplier Products Gate | `queryTabletVisibleProducts(ds, storeId, serviceKey)` — serviceKey 기반 필터 | PASS |
| Local Products Gate | `organization_id = $1` — 조직 단위 격리 (서비스 무관) | PASS |
| Tablet Request 격리 | `POST /:slug/tablet/requests` — `pharmacy_id = resolved.pharmacy.id`로 상품 검증 (`store-tablet.routes.ts:872`) | PASS |

### 공격 시나리오

```
시나리오: GlycoPharm 매장 slug로 Cosmetics 상품 접근 시도
├─ GET /api/v1/stores/pharmacy-a-slug/tablet/products
├─ resolvePublicStore("pharmacy-a-slug")
│  → storeId = 'org-uuid-123', serviceKey = 'kpa'
├─ queryTabletVisibleProducts(ds, 'org-uuid-123', 'kpa')
│  → opl.service_key = ANY('kpa'::text[])
│  → Cosmetics 상품은 service_key = 'cosmetics'이므로 결과 제외
└─ 결론: Cross-service 상품 조회 구조적 불가능
```

**판정: PASS**

---

## 6. Orphan Handling

### 시뮬레이션: Local Product 삭제 후 Display에 미치는 영향

### 6-A. Local Product 삭제 (Soft Delete)

```
DELETE /api/v1/store/local-products/{localProductId}
→ store-local-product.routes.ts:393-396:
  UPDATE store_local_products SET is_active = false WHERE id = $1 AND organization_id = $2
```

**이것은 soft delete이다.** 레코드가 남아있고 `is_active = false`로만 변경된다.

### 6-B. Display 참조 상태

| 단계 | 상태 | 결과 |
|------|------|------|
| 삭제 전 | display: `product_type='local', product_id={uuid}` → local product `is_active=true` | 정상 |
| 삭제 후 | display: `product_type='local', product_id={uuid}` → local product `is_active=false` | **Zombie Display** |
| Public 조회 | `localProducts WHERE is_active = true` | local product 목록에서 제외 |
| Display 조회 | `store_tablet_displays WHERE tablet_id = $1` | **display 레코드는 남아있음** |

### 6-C. FK CASCADE 분석

```
store_tablet_displays Entity:
  @ManyToOne('StoreTablet', 'displays')  → StoreTablet FK: CASCADE 적용
  product_id → soft reference (FK 없음)   → StoreLocalProduct FK: 없음

store_tablets Entity:
  soft delete (is_active = false)         → CASCADE 트리거되지 않음
```

| 시나리오 | CASCADE 발동 | Display 상태 | 위험 |
|----------|:----------:|:-----------:|:----:|
| Tablet hard delete | YES | Display도 삭제됨 | N/A (발생하지 않음) |
| Tablet soft delete | NO | **Display 잔존** | NOTE |
| Local Product soft delete | NO | **Display 잔존** | NOTE |
| Supplier Listing deactivate | NO | Display 잔존 (but Public에서 4-gate로 제외) | SAFE |

### 6-D. 자연 방어선

Local Product soft delete 후에도:
1. **Public 엔드포인트**: `store_local_products WHERE is_active = true` → 비활성 상품 자동 제외
2. **Display 저장 시 재검증**: `validateDisplayItems()` → `is_active = true` 검사 → 비활성 상품으로 Display 수정 시 차단
3. **데이터 무결성**: zombie display는 존재하지만, Public에서 노출되지 않음

### NOTE

```
Zombie Display Condition:
- store_tablet_displays 레코드에 product_type='local', product_id=X가 존재
- store_local_products에서 해당 id의 is_active = false
- 관리자 화면(GET /tablets/:id/displays)에서는 보이지만
  Public 화면(GET /:slug/tablet/products)에서는 localProducts 쿼리에서 제외

Impact: 관리자 UI에서 "없는 상품" 참조 표시 가능 (UX 이슈, 보안 이슈 아님)
Mitigation: Display 저장 시 재검증으로 정리됨 (운영자가 Display 재구성 시 자연 해소)
```

**판정: SAFE WITH NOTE** (zombie display 잔존 가능, Public 노출 없음, UX 이슈만 존재)

---

## 7. Boundary Violation Attempts

### 7-A. Local Product UUID → Checkout 주입 시도

```
시나리오: 악의적 소비자가 StoreLocalProduct UUID를 Checkout에 전달

POST /api/v1/glycopharm/checkout
Body: {
  "items": [{ "productId": "{store-local-product-uuid}", "quantity": 1 }]
}
```

**방어 경로**:
```
checkout.controller.ts:
  const product = await glycopharmProductRepo.findOne({
    where: { id: item.productId, pharmacy_id: storeId, status: 'active' }
  });
  → store_local_products UUID로 glycopharm_products 조회 → NULL
  → 응답: "상품을 찾을 수 없습니다" (400)
```

| 방어 레이어 | 메커니즘 | 차단 여부 |
|-----------|---------|:--------:|
| Checkout Product Lookup | `glycopharm_products WHERE id = $1` — 별도 테이블 | **차단** |
| OrganizationProductListing | `external_product_id` = GlycopharmProduct.id — 일치 불가 | **차단** |
| Distribution Policy Guard | `neture_supplier_products` JOIN — 매칭 불가 | **차단** |

**결론**: StoreLocalProduct UUID는 `glycopharm_products` 테이블에 존재하지 않으므로 Checkout 진입이 **구조적으로 불가능**하다.

**판정: PASS**

### 7-B. Cross-Org Display 주입 시도

```
시나리오: 매장 A 운영자가 매장 B의 StoreLocalProduct를 태블릿에 추가 시도

PUT /api/v1/store/tablets/{tabletA-id}/displays
Body: {
  "displays": [
    { "productType": "local", "productId": "{매장B-local-product-uuid}", "sortOrder": 1 }
  ]
}
```

**방어 경로**:
```
store-tablet.routes.ts validateDisplayItems() line 133-141:
  SELECT id FROM store_local_products
  WHERE id = {매장B UUID} AND organization_id = {매장A orgId} AND is_active = true
  → 결과: 0건 (organization_id 불일치)
  → 응답: 400 "Local product not found: {uuid}"
```

**판정: PASS**

### 7-C. productType 조작 시도

```
시나리오: productType에 존재하지 않는 값 주입

Body: {
  "displays": [
    { "productType": "commerce", "productId": "{uuid}", "sortOrder": 1 }
  ]
}
```

**방어 경로**:
```
store-tablet.routes.ts validateDisplayItems() line 117:
  !['supplier', 'local'].includes('commerce') → true
  → 응답: 400 "Invalid product_type: commerce. Must be 'supplier' or 'local'"
```

**판정: PASS**

---

## 방어 아키텍처 요약

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STORE TABLET SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: Authentication                                           │
│  ├─ requireAuth middleware (JWT)                                   │
│  └─ isStoreOwnerRole() (pharmacy_owner / kpa:branch_admin)         │
│                                                                     │
│  Layer 2: Organization Isolation                                   │
│  ├─ getUserOrganizationId() — DB에서 추출, body 무시               │
│  ├─ ALL queries: WHERE organization_id = $1                        │
│  └─ findOne({ id, organizationId }) — 소유권 확인                  │
│                                                                     │
│  Layer 3: Display Guard                                            │
│  ├─ productType ENUM: ['supplier', 'local'] only                   │
│  ├─ supplier: organization_product_listings + org_id 검증           │
│  └─ local: store_local_products + org_id 검증                      │
│                                                                     │
│  Layer 4: Commerce Boundary                                        │
│  ├─ StoreLocalProduct entity: Commerce 관계 없음                    │
│  ├─ Checkout: glycopharm_products 테이블만 참조                     │
│  └─ EcommerceOrderItem: StoreLocalProduct FK 없음                  │
│                                                                     │
│  Layer 5: Public Visibility                                        │
│  ├─ Slug → storeId + serviceKey (DB 기반, 주입 불가)                │
│  ├─ Supplier: 4중 Visibility Gate                                  │
│  ├─ Local: is_active = true 필터                                   │
│  └─ DB UNION 금지, 애플리케이션 레벨 merge                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 검증 매트릭스

| # | 시뮬레이션 | 대상 파일 | 판정 |
|:-:|-----------|----------|:----:|
| 1 | Local Product Creation | `store-local-product.routes.ts` | **PASS** |
| 2 | Multi-Tablet Creation | `store-tablet.routes.ts` | **PASS** (NOTE) |
| 3 | Mixed Display Composition | `store-tablet.routes.ts` (validateDisplayItems) | **PASS** |
| 4 | Public Tablet Visibility | `unified-store-public.routes.ts:779-828` | **PASS** |
| 5 | Cross-Service Isolation | `unified-store-public.routes.ts` (resolvePublicStore) | **PASS** |
| 6 | Orphan Handling | `store-local-product.routes.ts:362`, `store-tablet.routes.ts:284` | **SAFE WITH NOTE** |
| 7-A | Local→Checkout Injection | `checkout.controller.ts` (glycopharm_products lookup) | **PASS** |
| 7-B | Cross-Org Display Injection | `store-tablet.routes.ts:133-141` (validateDisplayItems) | **PASS** |
| 7-C | productType Manipulation | `store-tablet.routes.ts:117` (ENUM guard) | **PASS** |

---

## Notes 상세

| # | 항목 | 설명 | 위험 수준 | 조치 필요 |
|:-:|------|------|:--------:|:--------:|
| N-1 | 태블릿 이름 중복 허용 | 같은 조직 내 동일 이름 태블릿 생성 가능 | LOW | 선택 |
| N-2 | 태블릿 수 제한 없음 | 조직당 MAX 태블릿 수 미제한 | LOW | 선택 |
| N-3 | Zombie Display | Soft delete 시 display 레코드 잔존 | LOW | 선택 |
| N-4 | Display 배열 크기 제한 없음 | PUT /displays에 배열 크기 검증 없음 | LOW | 선택 |

**모든 NOTE는 보안 이슈가 아닌 운영/UX 수준 개선 사항이다.**

---

## 결론

**IR-STORE-TABLET-REAL-WORLD-SIMULATION-V1: SAFE WITH NOTES**

Store Tablet 시스템은 5-Layer 방어 아키텍처로 구성되어 있으며,
의도한 대로 작동한다.

| 영역 | 검증 결과 |
|------|:--------:|
| 생성 흐름 (Local Product + Tablet) | 인증/역할/조직 격리 완비 |
| 진열 구성 (Mixed Display) | product_type ENUM + 소유권 이중 검증 |
| 공개 노출 (Public Visibility) | 4-gate (supplier) + is_active (local) + slug 격리 |
| 서비스 격리 (Cross-Service) | serviceKey DB 기반 추출, 주입 불가 |
| 삭제 처리 (Orphan) | Soft delete → zombie 가능하나 Public 노출 없음 |
| 경계 위반 (Boundary) | Checkout 구조적 차단, Cross-org 차단, ENUM 차단 |

**StoreLocalProduct는 Display Domain으로서 Commerce 경계를 침범하지 않으며,
멀티테넌트 격리가 모든 경로에서 일관되게 적용되어 있다.**

---

*Generated: 2026-02-24*
*Status: Simulation Complete*
*Classification: Investigation Report*
