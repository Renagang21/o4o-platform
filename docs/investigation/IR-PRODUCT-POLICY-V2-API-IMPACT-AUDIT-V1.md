# IR-PRODUCT-POLICY-V2-API-IMPACT-AUDIT-V1 — 결과 보고

> **Phase 4 — API 재설계 정합성 점검**
> **Date**: 2026-02-25
> **Status**: 조사 완료
> **판정**: 🟡 수정 후 실행

---

## 요약

Product Policy Core v2 전환 시 `organization_product_applications`, `neture_supplier_requests` 제거 및 Listing `external_product_id` FK 전환의 API/서비스/쿼리 레벨 영향을 전수 조사하였다.

**결론: 즉시 실행 불가. 단계적 전환 필요.**

| 영역 | 영향도 | 설명 |
|------|--------|------|
| Application 제거 | 🔴 HIGH | 8개 API 중단, 승인 워크플로우 전면 단절 |
| SupplierRequest 제거 | 🔴 HIGH | 23개 API 중단, 체크아웃 검증 실패 |
| Listing FK 전환 | 🔴 HIGH | Storefront 4개 핵심 쿼리 전면 실패 |
| Catalog 필터 | 🟡 MEDIUM | distribution_type 로직 재설계 필요 |
| Storefront 쿼리 | 🔴 HIGH | 4중 게이트 JOIN 전면 수정 필요 |

---

## 1. Application 영향 분석

### 1-A. 참조 파일 목록

| 파일 | 라인 | 역할 |
|------|------|------|
| `routes/kpa/controllers/operator-product-applications.controller.ts` | 1-250+ | 운영자 승인/거절 |
| `routes/kpa/controllers/pharmacy-products.controller.ts` | 103-325 | 약국 신청/카탈로그 |
| `routes/kpa/entities/organization-product-application.entity.ts` | 전체 | Entity 정의 |
| `routes/kpa/kpa.routes.ts` | 185, 217 | 라우트 등록 |
| `database/connection.ts` | 219, 648 | Entity 등록 |
| `database/migrations/20260215000020-*` | 전체 | 테이블 생성 |

### 1-B. 라우트 목록 (8개)

**운영자 패널** (`/api/v1/kpa/operator/product-applications`):

| 메서드 | 경로 | 기능 | 제거 시 |
|--------|------|------|---------|
| GET | `/` | 신청 목록 (필터/페이지네이션) | 🔴 500 |
| GET | `/stats` | 상태별 건수 (pending/approved/rejected) | 🔴 500 |
| PATCH | `/:id/approve` | 승인 + 자동 Listing 생성 | 🔴 500 |
| PATCH | `/:id/reject` | 거절 + 사유 기록 | 🔴 500 |

**약국 측** (`/api/v1/kpa/pharmacy/products`):

| 메서드 | 경로 | 기능 | 제거 시 |
|--------|------|------|---------|
| GET | `/catalog` | B2B 카탈로그 + 신청상태 | 🟡 degraded (isApplied/isApproved 플래그 실패) |
| POST | `/apply` | 제품 신청/재신청 | 🔴 500 |
| GET | `/applications` | 내 신청 목록 | 🔴 500 |
| GET | `/approved` | 승인된 제품 목록 | 🔴 500 |

**대시보드** (`/api/v1/home/preview`):

| 메서드 | 경로 | 기능 | 제거 시 |
|--------|------|------|---------|
| GET | (내장 쿼리) | Pending 건수 KPI | ✅ graceful (`safeQuery` 래핑) |

### 1-C. 쿼리/Repository 사용 지점

| 위치 | 쿼리 방식 | 상세 |
|------|-----------|------|
| operator-product-applications.controller.ts:42 | TypeORM `findAndCount` | 필터 + 페이지네이션 |
| operator-product-applications.controller.ts:102 | Raw SQL `SELECT status, COUNT(*)` | 상태별 통계 |
| operator-product-applications.controller.ts:125 | TypeORM `findOne` | 승인 대상 조회 |
| operator-product-applications.controller.ts:130 | TypeORM `save` (트랜잭션) | 상태 변경 |
| pharmacy-products.controller.ts:154 | Raw SQL `EXISTS` subquery | 카탈로그 isApplied 플래그 |
| pharmacy-products.controller.ts:204 | TypeORM `save` | 신청 생성 |
| pharmacy-products.controller.ts:256 | TypeORM `find` | 내 신청 목록 |

### 1-D. 제거 시 500 발생 예상 지점

| 지점 | 심각도 | 이유 |
|------|--------|------|
| 운영자 승인 패널 4개 API | 🔴 CRITICAL | TypeORM Repository 실패 |
| 약국 신청 3개 API | 🔴 CRITICAL | TypeORM save/find 실패 |
| 카탈로그 EXISTS subquery | 🟡 MEDIUM | SQL subquery 에러 (테이블 없음) |
| 대시보드 KPI | ✅ LOW | safeQuery 래핑으로 graceful 처리 |

---

## 2. SupplierRequest 영향 분석

### 2-A. PRIVATE 승인 흐름도

```
[Seller] → POST /api/v1/neture/supplier/requests
           (status=PENDING, sellerId=강제)
    ↓
[Supplier] → GET /supplier/requests?status=pending
    ↓
[Supplier] → POST /supplier/requests/:id/approve
             (PENDING → APPROVED, decidedBy=supplierId)
    ↓                        ↓
   또는                  [Supplier] → POST /:id/reject
    ↓                      (PENDING → REJECTED, rejectReason 기록)
[APPROVED]
    ↓                      ↓                    ↓
POST /:id/suspend    POST /:id/reactivate  POST /:id/revoke
(→ SUSPENDED)        (SUSPENDED → APPROVED) (→ REVOKED, terminal)
```

**상태 머신**: PENDING → APPROVED ↔ SUSPENDED → REVOKED (6개 상태)

### 2-B. neture_supplier_requests 직접 참조 지점 (23개 API)

**Supplier 측 (8개)**:
| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/supplier/requests` | 받은 요청 목록 |
| GET | `/supplier/requests/:id` | 요청 상세 |
| POST | `/supplier/requests/:id/approve` | 승인 |
| POST | `/supplier/requests/:id/reject` | 거절 |
| POST | `/supplier/requests/:id/suspend` | 공급 중지 |
| POST | `/supplier/requests/:id/reactivate` | 공급 재개 |
| POST | `/supplier/requests/:id/revoke` | 공급 종료 |
| GET | `/supplier/requests/:id/events` | 감사 이력 |

**Seller 측 (3개)**:
| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | `/supplier/requests` | 공급 요청 생성 |
| GET | `/seller/my-products` | 내 승인 제품 |
| GET | `/seller/available-supply-products` | 신청 가능 제품 |

**Admin 측 (6개)**:
| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/admin/requests` | 전체 요청 조회 |
| POST | `/admin/requests/:id/approve` | 관리자 승인 |
| POST | `/admin/requests/:id/reject` | 관리자 거절 |
| POST | `/admin/requests/:id/suspend` | 관리자 중지 |
| POST | `/admin/requests/:id/revoke` | 관리자 종료 |

### 2-C. allowedSellerIds 구조

```
allowedSellerIds는 SupplierRequest 승인과 독립적으로 관리됨.

관리 방법:
  PATCH /api/v1/neture/supplier/products/:id
  Body: { distributionType: 'PRIVATE', allowedSellerIds: ['seller1', 'seller2'] }

승인 시 자동 연동: ❌ 없음 (수동 관리)
```

| 항목 | 값 |
|------|------|
| 저장 위치 | `neture_supplier_products.allowed_seller_ids` (text[]) |
| 관리 주체 | Supplier (수동 입력) |
| 승인과 연동 | ❌ 독립적 |
| 쿼리 사용 | `WHERE distribution_type='PRIVATE' AND allowed_seller_ids @> [sellerId]` |

### 2-D. 제거 시 기능 단절 위치

| 컴포넌트 | 영향 | 심각도 |
|----------|------|--------|
| Checkout 검증 (`checkout-guard.service.ts`) | 주문 불가 | 🔴 CRITICAL |
| Seller Dashboard (my-products) | 제품 목록 불가 | 🔴 CRITICAL |
| Seller 공급 신청 | 신규 관계 생성 불가 | 🔴 CRITICAL |
| Supplier 요청 관리 | 승인/거절 불가 | 🔴 CRITICAL |
| Admin 관리 | 전체 모니터링 불가 | 🔴 CRITICAL |
| 이벤트 감사 이력 | 이력 소실 | 🟡 HIGH |

---

## 3. Listing FK 전환 영향 분석

### 3-A. external_product_id 현재 구조

```typescript
// organization-product-listing.entity.ts
@Column({ type: 'varchar', length: 200 })
external_product_id: string;

// 유니크 제약: (organization_id, service_key, external_product_id)
// 타입: VARCHAR(200) — UUID를 문자열로 저장
// DB FK 제약: ❌ 없음 (애플리케이션 레벨 참조)
```

### 3-B. external_product_id 의존 코드

| 파일 | 라인 | 사용 방식 |
|------|------|-----------|
| `unified-store-public.routes.ts` | 173 | `opl.external_product_id = p.id::text` (B2C 쿼리) |
| `unified-store-public.routes.ts` | 202 | `opl.external_product_id = p.id::text` (상세 쿼리) |
| `unified-store-public.routes.ts` | 291 | `opl.external_product_id = p.id::text` (태블릿 쿼리) |
| `unified-store-public.routes.ts` | 319 | `opl.external_product_id = p.id::text` (태블릿 상세) |
| `unified-store-public.routes.ts` | 584 | `opl.external_product_id = p.id::text` (카테고리) |
| `store-hub.controller.ts` | 308 | `gp.id::text = opl.external_product_id` (KPI) |
| `operator-product-applications.controller.ts` | 170 | 승인 시 Listing 생성 |
| `pharmacy-products.controller.ts` | 154 | 카탈로그 isListed 플래그 |

### 3-C. FK 전환 시 수정 대상 파일

| 파일 | 수정 내용 | 심각도 |
|------|-----------|--------|
| `unified-store-public.routes.ts` | 5개 JOIN 조건 수정 | 🔴 CRITICAL |
| `store-hub.controller.ts` | 1개 JOIN 조건 수정 | 🟡 MEDIUM |
| `operator-product-applications.controller.ts` | Listing 생성 로직 수정 | 🔴 CRITICAL |
| `pharmacy-products.controller.ts` | EXISTS subquery 수정 | 🟡 MEDIUM |
| `organization-product-listing.entity.ts` | FK 컬럼 타입/이름 변경 | 🔴 CRITICAL |
| 마이그레이션 | 유니크 제약 재정의 | 🔴 CRITICAL |

---

## 4. Storefront 영향 분석

### 4-A. 4중 가시성 게이트 구조

```sql
-- unified-store-public.routes.ts: queryVisibleProducts()
WHERE p.status = 'active'                              -- GATE 1: 제품 활성
  AND opl.is_active = true                             -- GATE 2: Listing 활성
  AND opc.is_active = true                             -- GATE 3: 채널 제품 활성
  AND oc.status = 'APPROVED' AND oc.channel_type = 'B2C'  -- GATE 4: 채널 승인
```

### 4-B. Storefront에서 영향받는 엔드포인트

| 엔드포인트 | 기능 | FK 변경 시 |
|-----------|------|-----------|
| `GET /:slug/products` | 공개 제품 목록 | 🔴 0건 반환 |
| `GET /:slug/products/featured` | 추천 제품 | 🔴 0건 반환 |
| `GET /:slug/products/:id` | 제품 상세 | 🔴 404 |
| `GET /:slug/tablet/products` | 태블릿 제품 | 🔴 0건 반환 |
| `GET /:slug/categories` | 카테고리 목록 | 🔴 0건 반환 |

### 4-C. Storefront에서 영향 없는 부분

| 엔드포인트 | 이유 |
|-----------|------|
| Tablet Request 제출 | direct TypeORM lookup, FK 미사용 |
| Local Product 관리 | 별도 테이블 (`store_local_products`) |
| Tablet Product Pool | Listing 메타데이터만 사용, JOIN 없음 |
| Channel Product 관리 | Listing CRUD, FK JOIN 없음 |
| Checkout 주문 생성 | productId 직접 사용, FK 미검증 |

### 4-D. 발견: Supplier ACTIVE 상태 미검증

```
⚠️ Storefront 쿼리에 Supplier ACTIVE 상태 체크가 없음

체크 존재:
  ✅ 운영자 승인 시 (operator-product-applications.controller.ts:156)
  ✅ Neture 서비스 레이어 (neture.service.ts)

체크 미존재:
  ❌ unified-store-public.routes.ts (4중 게이트에 supplier JOIN 없음)
  ❌ store-hub.controller.ts (KPI 쿼리)

위험: Supplier 비활성화 후에도 Listing/Channel이 활성이면 제품이 공개 노출됨
```

---

## 5. 제거 가능 범위

### 즉시 제거 가능 (Safe)

| 대상 | 조건 |
|------|------|
| 없음 | 모든 테이블이 운영 중 사용됨 |

### 조건부 제거 가능 (대체 구현 필요)

| 대상 | 선행 조건 |
|------|-----------|
| `organization_product_applications` | v2 승인 모델 구현 + 기존 API 마이그레이션 |
| `neture_supplier_requests` | v2 Seller-Supplier 관계 모델 구현 + Checkout Guard 수정 |

### 제거 불가 (Storefront 필수)

| 대상 | 이유 |
|------|------|
| `organization_product_listings` | Storefront 4중 게이트 핵심 JOIN 대상 |
| `organization_product_channels` | 채널별 가시성 제어 |
| `neture_supplier_products` | 카탈로그 소스 |

---

## 6. 수정 필요 API 목록

### Application 제거 시 수정 대상 (8개 API + 2개 쿼리)

| # | API | 수정 내용 |
|---|-----|-----------|
| 1 | `GET /operator/product-applications` | v2 승인 모델로 전환 |
| 2 | `GET /operator/product-applications/stats` | v2 통계 쿼리로 전환 |
| 3 | `PATCH /operator/product-applications/:id/approve` | v2 승인 로직 + Listing 생성 |
| 4 | `PATCH /operator/product-applications/:id/reject` | v2 거절 로직 |
| 5 | `GET /pharmacy/products/catalog` (EXISTS subquery) | isApplied/isApproved 플래그 제거 또는 v2 대체 |
| 6 | `POST /pharmacy/products/apply` | v2 신청 로직 |
| 7 | `GET /pharmacy/products/applications` | v2 신청 목록 |
| 8 | `GET /pharmacy/products/approved` | v2 승인 목록 |
| 9 | 대시보드 KPI (safeQuery) | 이미 graceful, 수정 불필요 |
| 10 | 데모 시드 (tableExists) | 이미 방어적, 수정 불필요 |

### SupplierRequest 제거 시 수정 대상 (23개 API + 1개 Guard)

| # | 영역 | 수정 대상 |
|---|------|-----------|
| 1-8 | Supplier 8개 API | v2 관계 관리 API로 전환 |
| 9-11 | Seller 3개 API | v2 공급 가능 제품 조회로 전환 |
| 12-16 | Admin 5개 API | v2 관리 API로 전환 |
| 17-23 | Event/기타 | v2 이벤트 모델 전환 |
| 24 | `checkout-guard.service.ts` | v2 Seller-Supplier 검증 로직 |

### Listing FK 전환 시 수정 대상 (6개 파일)

| # | 파일 | 수정 지점 수 |
|---|------|-------------|
| 1 | `unified-store-public.routes.ts` | 5개 JOIN |
| 2 | `store-hub.controller.ts` | 1개 JOIN |
| 3 | `operator-product-applications.controller.ts` | 1개 Listing 생성 |
| 4 | `pharmacy-products.controller.ts` | 2개 EXISTS subquery |
| 5 | `organization-product-listing.entity.ts` | 컬럼 정의 |
| 6 | 신규 마이그레이션 | FK/유니크 제약 재정의 |

---

## 7. 위험도 등급

| 영역 | 등급 | 근거 |
|------|------|------|
| Application 테이블 제거 | 🔴 **HIGH** | 8개 운영 API 즉시 500 |
| SupplierRequest 테이블 제거 | 🔴 **HIGH** | 23개 API + Checkout Guard 실패 |
| Listing FK 전환 | 🔴 **HIGH** | Storefront 5개 쿼리 전면 실패 |
| Catalog 필터 변경 | 🟡 **MEDIUM** | distribution_type 로직 재설계 |
| allowedSellerIds 구조 | 🟢 **LOW** | 독립적, 직접 영향 없음 |

**종합 등급**: 🔴 **HIGH** — 세 영역 모두 운영 중단 위험

---

## 8. Phase 실행 가능 여부 판정

### 🟡 수정 후 실행 (CONDITIONAL GO)

**즉시 실행 불가 이유:**
1. Application 제거 → 약국 제품 승인 워크플로우 전면 중단
2. SupplierRequest 제거 → Neture Seller 생태계 + Checkout 검증 중단
3. FK 전환 → 공개 Storefront 전면 블랭크

**실행 조건 (순차적):**

```
Phase 4-A: v2 데이터 모델 설계 (Application + SupplierRequest 통합)
Phase 4-B: v2 API 구현 (기존 API와 병행 운영)
Phase 4-C: Listing FK 전환 마이그레이션 (Storefront JOIN 동시 수정)
Phase 4-D: 기존 API deprecated 표시
Phase 4-E: 데이터 마이그레이션 (기존 → v2)
Phase 4-F: 기존 테이블 제거 (모든 참조 확인 후)
```

**필수 선행 작업:**
- [ ] v2 승인 모델 Entity 설계
- [ ] v2 API 엔드포인트 설계 (기존 8+23개 대체)
- [ ] Storefront JOIN 수정 계획 (5개 쿼리)
- [ ] Checkout Guard 수정 계획
- [ ] 데이터 마이그레이션 스크립트 설계
- [ ] 롤백 계획

---

## 조사 질문 체크리스트

| 질문 | 답변 | 상세 |
|------|------|------|
| Application 제거 시 깨지는 컨트롤러 존재? | **Yes** | `operator-product-applications.controller.ts`, `pharmacy-products.controller.ts` (8개 API) |
| SupplierRequest 제거 시 Seller Dashboard 깨짐? | **Yes** | `seller/my-products`, `seller/available-supply-products` + Checkout Guard 실패 |
| external_product_id 직접 JOIN 존재? | **Yes** | `unified-store-public.routes.ts` 5개, `store-hub.controller.ts` 1개 |
| Storefront 쿼리 영향 있음? | **Yes** | 4중 게이트 INNER JOIN 전면 실패 → 0건 반환 |
| PUBLIC이 Application 요구하는 로직 존재? | **Yes** | `pharmacy-products.controller.ts` 카탈로그에서 `distribution_type = 'PUBLIC'` 필터 + EXISTS application check |

---

## 부록: 추가 발견사항

### A. Supplier ACTIVE 미검증 (Storefront 보안 갭)

Storefront 4중 게이트에 Supplier 상태 검증이 없음.
Supplier 비활성화 후에도 Listing/Channel이 활성이면 제품 공개 노출 가능.
→ v2 전환 시 5중 게이트로 강화 권장.

### B. allowedSellerIds와 SupplierRequest의 독립성

`allowedSellerIds`는 승인 흐름과 무관하게 Supplier가 수동 관리.
SupplierRequest 승인 시 자동으로 allowedSellerIds에 추가되지 않음.
→ v2에서 통합 여부 설계 필요.

### C. Neture는 별도 아키텍처

Neture의 `product_id`는 비정규화된 VARCHAR 문자열 (FK 없음).
Glycopharm Storefront의 `external_product_id`와는 완전 독립.
→ FK 전환이 Neture에 영향 없음.

### D. DB FK 제약 부재

`external_product_id`에 PostgreSQL FK 제약이 없음 (애플리케이션 레벨 참조).
→ v2에서 명시적 FK 제약 추가 권장.

---

*조사 완료: 2026-02-25*
*조사자: Claude Code (IR-PRODUCT-POLICY-V2-API-IMPACT-AUDIT-V1)*
