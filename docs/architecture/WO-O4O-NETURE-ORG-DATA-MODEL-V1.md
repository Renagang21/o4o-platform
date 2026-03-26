# WO-O4O-NETURE-ORG-DATA-MODEL-V1

> **Status**: Design Phase (코드 변경 없음)
> **Date**: 2026-03-26
> **Prerequisite**: WO-O4O-ORGANIZATION-ROLE-STANDARD-V1 (확정됨)
> **Freeze 예외**: NETURE-DOMAIN-ARCHITECTURE-FREEZE 예외 승인 필요

---

## 1. 목적

`neture_suppliers`를 O4O Organization 표준 구조에 통합한다.
Neture는 5개 서비스 중 **유일하게 organization 미연결** 서비스이다.

---

## 2. 현재 구조 (AS-IS)

### 2.1 neture_suppliers 필드 (36개 컬럼)

```
neture_suppliers
 ├── [Identity]      id, slug, name, user_id
 ├── [Public Profile] logo_url, category, short_description, description
 ├── [Business]      business_number, representative_name, business_address,
 │                   business_type, manager_name, manager_phone, tax_email
 ├── [Contact]       contact_email, contact_phone, contact_website, contact_kakao
 ├── [Visibility]    contact_{email,phone,website,kakao}_visibility
 ├── [Commerce]      pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain
 ├── [Approval]      status, approved_by, approved_at, rejected_reason
 └── [Timestamps]    created_at, updated_at
```

### 2.2 현재 관계

```
users.id ← neture_suppliers.user_id (1:1, no FK constraint)
neture_suppliers.id ← supplier_product_offers.supplier_id (FK CASCADE)
neture_suppliers.id ← neture_supplier_library_items.supplier_id (FK CASCADE)
neture_suppliers.id ← neture_settlements.supplier_id (code-level)
neture_suppliers.id ← neture_shipments.supplier_id (code-level)
```

### 2.3 문제

| 문제 | 설명 |
|------|------|
| Organization 미연결 | `organization_id` 없음 — 플랫폼 표준 위반 |
| 사업자 데이터 임베딩 | business_number 등 7개 필드가 neture_suppliers에 직접 저장 |
| organization_members 미사용 | user↔org 관계가 user_id 직접 참조로만 존재 |
| organization_service_enrollments 미사용 | 서비스 등록 관리 불가 |

---

## 3. 목표 구조 (TO-BE)

### 3.1 K-Cosmetics Bridge 패턴 적용

**참조 구현**: `cosmetics_stores` + `organizations` bridge (WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1)

K-Cosmetics가 동일한 문제를 이미 해결:
- `cosmetics_stores`에 `organization_id` 컬럼 추가
- 승인된 store마다 `organizations` 레코드 생성
- `organization_members` 자동 생성 (owner)
- `organization_service_enrollments` 자동 생성

### 3.2 Neture 적용 구조

```
users (Identity SSOT) [FROZEN]
 ├── role_assignments → neture:supplier [FROZEN]
 ├── service_memberships → serviceKey='neture' [FROZEN]
 └── organization_members (role='owner') [NEW]
       └── organization_id → organizations [NEW]
             ├── name, code, type='supplier'
             ├── business_number, address, phone
             └── organization_service_enrollments (service_code='neture') [NEW]

neture_suppliers [EXISTING — 구조 유지 + organization_id 추가]
 ├── organization_id → organizations [NEW COLUMN]
 ├── [기존 36개 컬럼 전부 유지]
 └── [모든 기존 FK 참조 유지 — 변경 없음]
```

### 3.3 필드 분류 (이동 vs 유지)

#### organizations로 동기화 (SYNC — 양쪽 유지)

| 필드 | organizations 컬럼 | 방향 |
|------|-------------------|------|
| `name` | `organizations.name` | neture_suppliers → organizations |
| `business_number` | `organizations.business_number` | neture_suppliers → organizations |
| `business_address` | `organizations.address` | neture_suppliers → organizations |
| `contact_phone` | `organizations.phone` | neture_suppliers → organizations |
| `slug` | `organizations.code` = `'neture-{slug}'` | neture_suppliers → organizations |

#### neture_suppliers에 유지 (서비스 전용)

| 카테고리 | 필드 | 이유 |
|----------|------|------|
| **Public Profile** | logo_url, category, short_description, description | Neture 고유 |
| **Business Detail** | representative_name, manager_name, manager_phone, business_type, tax_email | 정산/세금 전용 |
| **Contact** | contact_email, contact_website, contact_kakao + 4 visibility | Neture 고유 가시성 |
| **Commerce** | pricing_policy, moq, shipping_* (3개) | Neture 전용 |
| **Approval** | status, approved_by, approved_at, rejected_reason | 워크플로우 상태 |

---

## 4. Migration 전략

### 4.1 원칙

```
1. neture_suppliers를 제거하지 않는다 (기존 FK 보존)
2. Read → Write 순으로 전환
3. Organization 먼저 생성, 이후 연결
4. 양방향 sync로 호환성 유지
```

### 4.2 Phase별 실행 계획

#### Phase 2-A: Organization 생성 + 연결 (Migration)

```sql
-- Step 1: neture_suppliers에 organization_id 컬럼 추가
ALTER TABLE neture_suppliers
  ADD COLUMN organization_id UUID;

-- Step 2: ACTIVE supplier마다 organizations 레코드 생성
INSERT INTO organizations (id, name, code, type, business_number, address, phone, created_by_user_id, "isActive")
SELECT
  gen_random_uuid(),
  ns.name,
  'neture-' || ns.slug,
  'supplier',
  ns.business_number,
  ns.business_address,
  ns.contact_phone,
  ns.user_id,
  true
FROM neture_suppliers ns
WHERE ns.status = 'ACTIVE'
ON CONFLICT (code) DO NOTHING;

-- Step 3: neture_suppliers.organization_id 연결
UPDATE neture_suppliers ns
SET organization_id = o.id
FROM organizations o
WHERE o.code = 'neture-' || ns.slug;

-- Step 4: organization_members 생성 (supplier owner)
INSERT INTO organization_members (organization_id, user_id, role, is_primary, joined_at)
SELECT ns.organization_id, ns.user_id, 'owner', true, ns.created_at
FROM neture_suppliers ns
WHERE ns.organization_id IS NOT NULL
  AND ns.user_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Step 5: organization_service_enrollments 생성
INSERT INTO organization_service_enrollments (organization_id, service_code, status)
SELECT ns.organization_id, 'neture', 'active'
FROM neture_suppliers ns
WHERE ns.organization_id IS NOT NULL
  AND ns.status = 'ACTIVE'
ON CONFLICT (organization_id, service_code) DO NOTHING;

-- Step 6: Index 추가
CREATE INDEX idx_neture_suppliers_org_id
  ON neture_suppliers (organization_id) WHERE organization_id IS NOT NULL;
```

#### Phase 2-B: Supplier Service 업데이트 (Code)

**approveSupplier()** 수정:
```typescript
// 기존 로직 유지 +
// 1. organizations 레코드 생성
// 2. neture_suppliers.organization_id 연결
// 3. organization_members 생성 (owner)
// 4. organization_service_enrollments 생성
```

**registerSupplier()** 수정:
```typescript
// PENDING 상태에서도 organizations 레코드 생성 (isActive=false)
// 승인 시 isActive=true로 전환
```

**updateSupplierProfile()** 수정:
```typescript
// business_number, business_address, name 변경 시
// organizations 레코드도 동기화
```

#### Phase 3: Read 경로 전환 (점진적)

```
현재: getSupplierProfile() → neture_suppliers에서 직접 읽기
목표: getSupplierProfile() → neture_suppliers + organizations JOIN
      (organizations가 사업자 SSOT)
```

**이 Phase는 Phase 2 안정화 후 별도 WO로 진행.**

---

## 5. 영향도 분석

### 5.1 변경되는 것

| 대상 | 변경 내용 |
|------|----------|
| `neture_suppliers` 테이블 | `organization_id` 컬럼 추가 |
| `organizations` 테이블 | Neture supplier 레코드 추가 (data only) |
| `organization_members` 테이블 | Neture supplier owner 레코드 추가 (data only) |
| `organization_service_enrollments` 테이블 | Neture enrollment 레코드 추가 (data only) |
| `supplier.service.ts` | approve/register/update에 org sync 로직 추가 |

### 5.2 변경되지 않는 것

| 대상 | 이유 |
|------|------|
| `neture_suppliers` 기존 컬럼 | 전부 유지 — backward compatible |
| `supplier_product_offers.supplier_id` | FK 대상 변경 없음 (여전히 neture_suppliers.id) |
| `neture_settlements.supplier_id` | 변경 없음 |
| `neture_shipments.supplier_id` | 변경 없음 |
| 모든 기존 API 응답 | 필드 추가만, 제거 없음 |
| `role_assignments` | 변경 없음 (FROZEN) |
| `service_memberships` | 변경 없음 (FROZEN) |

### 5.3 리스크

| 리스크 | 완화 |
|--------|------|
| organizations.code 충돌 | `'neture-{slug}'` prefix로 서비스 격리 |
| PENDING supplier의 org 처리 | isActive=false로 생성, 승인 시 true |
| 기존 supplier에 org 없음 | Migration에서 backfill |
| 양방향 sync 불일치 | organizations를 SSOT로 지정, neture_suppliers는 denormalized copy |

---

## 6. 참조 구현 비교

### K-Cosmetics Bridge (이미 운영 중)

```
cosmetics_stores
 ├── organization_id → organizations [BRIDGE]
 ├── business_number (denormalized)
 ├── owner_name, address, region (store-specific)
 └── status (draft/pending/approved/rejected/suspended)
```

**Migration**: `20260311200000-CosmeticsStoreOrgBridge.ts`

### Neture Bridge (이번 WO)

```
neture_suppliers
 ├── organization_id → organizations [NEW — 동일 패턴]
 ├── business_number (denormalized — 기존 유지)
 ├── representative_name, business_address, ... (supplier-specific)
 └── status (PENDING/ACTIVE/INACTIVE/REJECTED)
```

**동일한 패턴, 동일한 전략.**

---

## 7. 완료 기준

### Phase 2-A (Migration)
- [ ] `neture_suppliers.organization_id` 컬럼 존재
- [ ] 모든 ACTIVE supplier에 `organizations` 레코드 존재
- [ ] 모든 ACTIVE supplier owner가 `organization_members`에 존재
- [ ] 모든 ACTIVE supplier가 `organization_service_enrollments`에 등록
- [ ] 기존 supplier API 응답 변경 없음

### Phase 2-B (Code)
- [ ] `approveSupplier()` → org 자동 생성 + 연결
- [ ] `registerSupplier()` → org 사전 생성 (isActive=false)
- [ ] `updateSupplierProfile()` → 사업자 정보 org sync
- [ ] TypeScript 빌드 통과

---

*Version: 1.0*
*Author: AI Assistant*
*Approved: Pending*
