# IR-NETURE-SUPPLIER-TO-PRODUCT-FLOW-AUDIT-V1

> Neture 공급자 가입 신청 → 승인 → 상품 등록 시점까지의 구조를 코드 기준으로 조사
> Audit Date: 2026-02-28 | Status: READ-ONLY INVESTIGATION

---

## 1️⃣ 공급자 가입 신청 단계

### 핵심 발견: 별도 Application 엔티티 없음

Neture는 `SupplierApplication` 같은 별도 신청 엔티티가 **없다**.
`NetureSupplier` 엔티티 자체가 신청서이자 최종 공급자 레코드를 겸한다.

### 상태 전이 구조

```
사용자 (users)
    │
    │  POST /api/v1/neture/supplier/register
    │  Body: { name, slug, contactEmail }
    │
    ▼
NetureSupplier row 생성
    status = PENDING
    userId = 인증 사용자 ID
    slug = 고유 식별자
    (그 외 모든 필드 NULL 또는 기본값)

생성되는 것:
  ✅ neture_suppliers row (1개)

생성되지 않는 것:
  ❌ Contract 없음
  ❌ Dashboard Item 없음
  ❌ role_assignments 변경 없음
  ❌ users.status 변경 없음
```

### 중복 신청 방지 로직

| 검증 | 위치 | 방식 |
|------|------|------|
| 동일 userId 중복 | neture.service.ts:151 | `supplierRepo.findOne({ where: { userId } })` |
| 동일 slug 중복 | neture.service.ts:160 | `supplierRepo.findOne({ where: { slug } })` |

→ 둘 다 존재 시 409 Conflict 반환 (`USER_ALREADY_HAS_SUPPLIER`, `SLUG_ALREADY_EXISTS`)

### 관련 파일 목록

| 파일 | 역할 |
|------|------|
| [NetureSupplier.entity.ts](apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts) | 엔티티 정의 (status enum: PENDING/ACTIVE/INACTIVE/REJECTED) |
| [neture.service.ts:135-193](apps/api-server/src/modules/neture/neture.service.ts#L135-L193) | `registerSupplier()` 비즈니스 로직 |
| [neture.routes.ts:225-250](apps/api-server/src/modules/neture/neture.routes.ts#L225-L250) | `POST /supplier/register` 라우트 |

---

## 2️⃣ 운영자 승인 단계

### 승인 로직 실행 흐름

```
POST /api/v1/neture/admin/suppliers/:id/approve
    │
    │  Auth: requireAuth + requireNetureScope('neture:admin')
    │
    ▼
approveSupplier(supplierId, approvedByUserId)
    │
    ├── 1. Supplier 조회 (supplierRepo.findOne)
    │       ↓ 없으면 → SUPPLIER_NOT_FOUND
    │
    ├── 2. 상태 검증 (status === PENDING만 허용)
    │       ↓ 아니면 → INVALID_STATUS
    │
    └── 3. 상태 변경 + 저장 (단순 .save())
            supplier.status     = ACTIVE
            supplier.approvedBy = 승인자 UUID
            supplier.approvedAt = NOW()
            ↓
            supplierRepo.save(supplier)

변경되는 것:
  ✅ neture_suppliers.status → ACTIVE
  ✅ neture_suppliers.approved_by → 승인자 UUID
  ✅ neture_suppliers.approved_at → timestamp

변경되지 않는 것:
  ❌ Contract 생성 없음
  ❌ Dashboard Item 생성 없음
  ❌ users.status 변경 없음
  ❌ role_assignments 변경 없음
  ❌ 트랜잭션 래퍼 없음 (단순 save)
```

### 거절/비활성화 흐름

```
POST /admin/suppliers/:id/reject   (PENDING → REJECTED)
    supplier.status = REJECTED
    supplier.rejectedReason = reason
    (단순 save, 트랜잭션 없음)

POST /admin/suppliers/:id/deactivate   (ACTIVE → INACTIVE)
    supplier.status = INACTIVE
    + 캐스케이드: product_approvals → revoked
    + 캐스케이드: organization_product_listings → is_active=false
    (Raw SQL 사용, 트랜잭션 없음 — 부분 실패 가능)
```

### 상태 전이 다이어그램

```
         ┌──────────┐
         │  PENDING  │ ◄── 최초 생성
         └────┬──┬───┘
     approve  │  │  reject
              ▼  ▼
       ┌──────┐  ┌──────────┐
       │ACTIVE│  │ REJECTED │ (최종 상태)
       └──┬───┘  └──────────┘
          │  deactivate
          ▼
       ┌──────────┐
       │ INACTIVE │
       └──────────┘
```

**주의**: REJECTED → ACTIVE 재승인 경로 없음. INACTIVE → ACTIVE 재활성화 경로도 없음.

### 관련 파일 목록

| 파일 | 역할 |
|------|------|
| [neture.service.ts:198-232](apps/api-server/src/modules/neture/neture.service.ts#L198-L232) | `approveSupplier()` |
| [neture.service.ts:237-272](apps/api-server/src/modules/neture/neture.service.ts#L237-L272) | `rejectSupplier()` |
| [neture.service.ts:302-354](apps/api-server/src/modules/neture/neture.service.ts#L302-L354) | `deactivateSupplier()` + 캐스케이드 |
| [neture.routes.ts:270-293](apps/api-server/src/modules/neture/neture.routes.ts#L270-L293) | `POST /admin/suppliers/:id/approve` |
| [neture-scope.middleware.ts](apps/api-server/src/middleware/neture-scope.middleware.ts) | `requireNetureScope('neture:admin')` |

---

## 3️⃣ 상품 등록 전 게이트 검증

### 이중 검증 구조

상품 생성(`POST /supplier/products`)은 **2단계 게이트**로 보호된다:

```
요청 도달
    │
    ├── Gate 1: requireActiveSupplier (미들웨어, 라우트 레벨)
    │   ├── user.id → supplierRepo.findOne({ where: { userId } })
    │   ├── supplier 없음 → 401 NO_SUPPLIER
    │   ├── supplier.status !== ACTIVE → 403 SUPPLIER_NOT_ACTIVE
    │   └── 통과 → req.supplierId 세팅
    │
    └── Gate 2: createSupplierProduct() 내부 (서비스 레벨)
        ├── supplierRepo.findOne({ where: { id: supplierId } })
        ├── supplier.status !== ACTIVE → SUPPLIER_NOT_ACTIVE
        └── 통과 → 상품 생성 진행
```

### 게이트 검증 체크리스트

| 검증 항목 | 존재 여부 | 위치 | 방식 |
|----------|:--------:|------|------|
| Supplier ACTIVE 체크 | ✅ (2중) | neture.routes.ts:176 + neture.service.ts:1243-1248 | 미들웨어 + 서비스 |
| 계약 상태 체크 | ❌ | — | 공급자 승인에 계약 개념 없음 |
| 중복 상품명 방지 | ❌ | — | 동일 supplier가 동일 이름 상품 생성 가능 |
| 인증 사용자-공급자 연결 | ✅ | neture.routes.ts:182 | `userId` → `supplier.userId` 매핑 |
| Slug 유효성 | ❌ | — | 상품에는 slug 없음 |

### 두 미들웨어 비교

| 미들웨어 | 용도 | 상태 제한 |
|---------|------|----------|
| `requireActiveSupplier` | 쓰기 작업 (상품 생성, 수정, 프로필 수정) | ACTIVE만 허용 |
| `requireLinkedSupplier` | 읽기 작업 (상품 조회, 대시보드, 프로필 조회) | 모든 상태 허용 (PENDING/REJECTED 포함) |

### 관련 파일 목록

| 파일 | 역할 |
|------|------|
| [neture.routes.ts:176-197](apps/api-server/src/modules/neture/neture.routes.ts#L176-L197) | `requireActiveSupplier` 미들웨어 |
| [neture.routes.ts:204-217](apps/api-server/src/modules/neture/neture.routes.ts#L204-L217) | `requireLinkedSupplier` 미들웨어 |
| [neture.service.ts:118-128](apps/api-server/src/modules/neture/neture.service.ts#L118-L128) | `getSupplierByUserId()` |

---

## 4️⃣ 공급자 상품 등록 시 생성 구조

### 상품 생성 실행 흐름

```
POST /api/v1/neture/supplier/products
    │  Auth: requireAuth + requireActiveSupplier
    │  Body: { name, category?, description?, purpose?, distributionType?, acceptsApplications? }
    │
    ▼
createSupplierProduct(supplierId, data)
    │
    ├── 1. name 검증 (빈 문자열 차단)
    │       ↓ 없으면 → MISSING_NAME
    │
    ├── 2. Supplier ACTIVE 검증 (서비스 레벨 재검증)
    │       ↓ 아니면 → SUPPLIER_NOT_ACTIVE
    │
    └── 3. 상품 row 생성
            productRepo.create({
              supplierId,
              name,
              category:              입력값 || null
              description:           입력값 || null
              purpose:               입력값 || CATALOG (기본값)
              distributionType:      입력값 || PRIVATE (기본값)
              isActive:              false (항상)
              approvalStatus:        PENDING (항상)
              acceptsApplications:   입력값 ?? true (기본값)
              allowedSellerIds:      [] (빈 배열)
            })
            ↓
            productRepo.save()

생성되는 것:
  ✅ neture_supplier_products row (1개)

생성되지 않는 것:
  ❌ product_approvals row 없음 (이 시점에)
  ❌ organization_product_listings 없음 (이 시점에)
  ❌ 어떤 다른 테이블에도 기록 없음
```

### 기본값 정책 (WO-NETURE-SUPPLIER-PRODUCT-CREATE-MINIMUM-V2)

| 필드 | 기본값 | 의미 |
|------|--------|------|
| `purpose` | `CATALOG` | 정보 제공용 (판매 아님) |
| `distributionType` | `PRIVATE` | 지정 판매자 전용 |
| `isActive` | `false` | **항상 비활성** — 관리자 승인 후 활성화 |
| `approvalStatus` | `PENDING` | **항상 승인 대기** |
| `acceptsApplications` | `true` | 파트너 신청 가능 |
| `allowedSellerIds` | `[]` | 빈 배열 |

### 상품 승인 흐름 (참고)

```
POST /api/v1/neture/admin/products/:id/approve
    │
    ▼
approveProduct(productId, adminUserId)
    │
    ├── approvalStatus = APPROVED
    ├── isActive = true
    │
    ├── [distributionType === PUBLIC인 경우]
    │   └── autoExpandPublicProduct()
    │       → 모든 활성 조직에 organization_product_listings 자동 생성
    │       → listing.is_active = false (판매자가 가격 설정 후 활성화)
    │
    └── 트랜잭션 커밋
```

### distributionType별 후속 처리

| distributionType | 승인 시 자동 listing | 비고 |
|-----------------|:-------------------:|------|
| `PUBLIC` | ✅ 전체 활성 조직 | autoExpandPublicProduct() |
| `SERVICE` | ❌ | 운영자 승인 필요 (별도 플로우) |
| `PRIVATE` | ❌ | 지정 판매자만 접근 |

### 관련 파일 목록

| 파일 | 역할 |
|------|------|
| [NetureSupplierProduct.entity.ts](apps/api-server/src/modules/neture/entities/NetureSupplierProduct.entity.ts) | 엔티티 (approvalStatus, distributionType, purpose enum) |
| [neture.service.ts:1226-1288](apps/api-server/src/modules/neture/neture.service.ts#L1226-L1288) | `createSupplierProduct()` |
| [neture.service.ts:421-472](apps/api-server/src/modules/neture/neture.service.ts#L421-L472) | `approveProduct()` + auto-listing |
| [neture.routes.ts:619-648](apps/api-server/src/modules/neture/neture.routes.ts#L619-L648) | `POST /supplier/products` 라우트 |
| [auto-listing.utils.ts](apps/api-server/src/utils/auto-listing.utils.ts) | `autoExpandPublicProduct()` |

---

## 최종 산출물

### 1️⃣ 전체 구조 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: Supplier Registration                                  │
│                                                                 │
│  POST /api/v1/neture/supplier/register                          │
│  Auth: requireAuth                                              │
│      │                                                          │
│      ▼                                                          │
│  neture_suppliers 생성                                          │
│    status = PENDING                                             │
│    userId = 인증 사용자                                          │
│    (중복 체크: userId, slug)                                     │
│                                                                 │
│  ❌ Contract 없음 | ❌ Dashboard 없음 | ❌ RBAC 변경 없음        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 2: Operator Approval                                      │
│                                                                 │
│  POST /api/v1/neture/admin/suppliers/:id/approve                │
│  Auth: requireAuth + requireNetureScope('neture:admin')         │
│      │                                                          │
│      ▼                                                          │
│  neture_suppliers.status → ACTIVE                               │
│  neture_suppliers.approved_by → 승인자 UUID                     │
│  neture_suppliers.approved_at → NOW()                           │
│  (단순 save — 트랜잭션 없음)                                     │
│                                                                 │
│  ❌ Contract 없음 | ❌ Dashboard 없음 | ❌ RBAC 변경 없음        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 3: Product Creation                                       │
│                                                                 │
│  POST /api/v1/neture/supplier/products                          │
│  Auth: requireAuth + requireActiveSupplier                      │
│      │                                                          │
│      ├── Gate 1: requireActiveSupplier (미들웨어)               │
│      ├── Gate 2: supplier.status === ACTIVE (서비스)            │
│      │                                                          │
│      ▼                                                          │
│  neture_supplier_products 생성                                  │
│    isActive = false                                             │
│    approvalStatus = PENDING                                     │
│    distributionType = PRIVATE (기본)                             │
│    purpose = CATALOG (기본)                                     │
│                                                                 │
│  ❌ Listing 없음 | ❌ Approval row 없음                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 4: Product Approval (참고)                                │
│                                                                 │
│  POST /api/v1/neture/admin/products/:id/approve                 │
│  Auth: requireAuth + requireNetureScope('neture:admin')         │
│      │                                                          │
│      ▼                                                          │
│  neture_supplier_products.approvalStatus → APPROVED             │
│  neture_supplier_products.isActive → true                       │
│  [PUBLIC일 때] → autoExpandPublicProduct()                      │
│                  → organization_product_listings 일괄 생성      │
│  (트랜잭션 사용 ✅)                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2️⃣ 상태 전이 표

| 단계 | 엔티티 | 테이블 | 상태 필드 | 값 |
|------|--------|--------|----------|-----|
| 신청 | Supplier | neture_suppliers | status | `PENDING` |
| 승인 | Supplier | neture_suppliers | status | `ACTIVE` |
| 거절 | Supplier | neture_suppliers | status | `REJECTED` |
| 비활성화 | Supplier | neture_suppliers | status | `INACTIVE` |
| 상품 등록 | SupplierProduct | neture_supplier_products | approvalStatus | `PENDING` |
| 상품 등록 | SupplierProduct | neture_supplier_products | isActive | `false` |
| 상품 승인 | SupplierProduct | neture_supplier_products | approvalStatus | `APPROVED` |
| 상품 승인 | SupplierProduct | neture_supplier_products | isActive | `true` |
| 상품 반려 | SupplierProduct | neture_supplier_products | approvalStatus | `REJECTED` |

### 3️⃣ 게이트 검증 체크리스트 결과

| 검증 항목 | 존재 여부 | 위치 | 비고 |
|----------|:--------:|------|------|
| Supplier ACTIVE 체크 (미들웨어) | ✅ | neture.routes.ts:176-197 | `requireActiveSupplier` |
| Supplier ACTIVE 체크 (서비스) | ✅ | neture.service.ts:1243-1248 | 이중 검증 |
| 계약 상태 체크 | ❌ | — | 공급자 승인에 계약 개념 없음 |
| 중복 신청 방지 (userId) | ✅ | neture.service.ts:151 | 409 응답 |
| 중복 신청 방지 (slug) | ✅ | neture.service.ts:160 | 409 응답 |
| 중복 상품명 방지 | ❌ | — | 동일 이름 상품 생성 가능 |
| 상품 승인 상태 검증 | ✅ | neture.service.ts:430-432 | PENDING만 승인 가능 |
| 승인 시 트랜잭션 | ✅ | neture.service.ts:435-467 | 상품 승인 시만 (공급자 승인에는 없음) |

### 4️⃣ 구조상 모호 지점 식별

| # | 지점 | 설명 | 위치 |
|---|------|------|------|
| A1 | **승인과 Supplier 생성 책임 미분리** | `NetureSupplier`가 신청서와 최종 엔티티를 겸함. 별도 Application 없음 → 신청 시점의 원본 데이터 보존 불가 (승인 후 프로필 수정 시 원본 덮어씀) | NetureSupplier.entity.ts |
| A2 | **공급자 승인에 트랜잭션 없음** | `approveSupplier()`는 단순 `.save()` 1회. 현재는 단일 테이블 변경이라 문제 없으나, 향후 승인 시 부수 효과 추가되면 부분 실패 가능 | neture.service.ts:211-214 |
| A3 | **비활성화 캐스케이드에 트랜잭션 없음** | `deactivateSupplier()`는 3개 SQL (supplier update, approvals revoke, listings deactivate)을 트랜잭션 없이 순차 실행 → 중간 실패 시 불일치 | neture.service.ts:315-342 |
| A4 | **REJECTED/INACTIVE → ACTIVE 복원 경로 없음** | 거절/비활성화된 공급자를 재활성화하는 API 없음. 현재는 수동 DB 수정 필요 | — |
| A5 | **공급자 승인 시 RBAC 연동 없음** | KPA에서는 승인 시 `roleAssignmentService.assignRole()` 호출하나, Neture에서는 RBAC 미연동. `requireNetureScope`로 별도 체계 사용 | neture.service.ts:198-232 |
| A6 | **상품 생성은 row만 생성** | `createSupplierProduct()`는 `neture_supplier_products` 1개 row만 생성. `product_approvals`, `organization_product_listings` 등 후속 테이블은 이 시점에 생성되지 않음. 관리자 상품 승인 시점에서야 listing 생성 | neture.service.ts:1226-1288 |
| A7 | **Contract 시스템은 공급자가 아닌 파트너에 귀속** | `NetureSellerPartnerContract`는 Seller↔Partner 간 계약. 공급자(Supplier) 등록/승인 흐름과 무관. 공급자 자격에 대한 계약 개념 자체가 없음 | NetureSellerPartnerContract.entity.ts |

---

## 부록: 엔티티 관계 정리

```
NetureSupplier (neture_suppliers)
    │  status: PENDING/ACTIVE/INACTIVE/REJECTED
    │  userId: users.id (1:1)
    │
    ├── 1:N ──► NetureSupplierProduct (neture_supplier_products)
    │              approvalStatus: PENDING/APPROVED/REJECTED
    │              isActive: true/false
    │              distributionType: PUBLIC/SERVICE/PRIVATE
    │              purpose: CATALOG/APPLICATION/ACTIVE_SALES
    │
    └── (관계 없음) NetureSellerPartnerContract
                     → Seller↔Partner 계약 (공급자 흐름과 별개)
```

### Supplier vs Partner 구분

| 개념 | 엔티티 | 신청 | 승인 | 계약 | 대시보드 |
|------|--------|------|------|------|---------|
| **공급자 (Supplier)** | NetureSupplier | POST /supplier/register | POST /admin/suppliers/:id/approve | ❌ 없음 | ❌ 없음 (승인 시) |
| **파트너 (Partner)** | NeturePartnerApplication | POST /partner/applications | approvePartnerApplication() | ✅ NetureSellerPartnerContract | ✅ NeturePartnerDashboardItem |

공급자 승인은 **단순 상태 변경**이고, 파트너 승인은 **트랜잭션 내 4단계** (신청 승인 + 계약 생성 + 대시보드 등록 + 중복 검증)이다.

---

*Audit completed: 2026-02-28*
*Scope: Neture supplier registration → approval → product creation*
*Changes: NONE (audit only)*
