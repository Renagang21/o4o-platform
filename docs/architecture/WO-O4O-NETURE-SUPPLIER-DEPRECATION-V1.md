# WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1

> **Status**: Design Phase (코드 변경 없음)
> **Date**: 2026-03-26
> **Prerequisite**: Phase 2-A/2-B/3 프로덕션 배포 + 안정성 검증 완료
> **Freeze 예외**: NETURE-DOMAIN-ARCHITECTURE-FREEZE 예외 승인 필요

---

## 1. 목적

Phase 3 (Read Path Switch) 이후, `neture_suppliers`의 business 필드를
`organizations` SSOT로 완전 전환하고 supplier를 Neture 전용 extension으로 축소한다.

---

## 2. 전제조건 (Gate)

Phase 4 구현 전 **반드시** 아래 3가지 검증을 프로덕션에서 통과해야 한다.

### Gate 1 — 데이터 일치성

```sql
SELECT COUNT(*)::int AS mismatch_count
FROM neture_suppliers s
JOIN organizations o ON o.id = s.organization_id
WHERE s.name != o.name
   OR COALESCE(s.business_number, '') != COALESCE(o.business_number, '')
   OR COALESCE(s.business_address, '') != COALESCE(o.address, '');
```

**기대값**: `0`

### Gate 2 — Org 커버리지

```sql
SELECT COUNT(*)::int AS orphan_count
FROM neture_suppliers
WHERE status = 'ACTIVE' AND organization_id IS NULL;
```

**기대값**: `0`

### Gate 3 — Fallback 빈도

Cloud Run 로그에서 `Org data read failed` / `Org batch read failed` 검색:

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=o4o-core-api AND textPayload:\"Org data read failed\" OR textPayload:\"Org batch read failed\"" \
  --project=netureyoutube --limit=50 --freshness=7d
```

**기대값**: 0건 또는 일시적 오류만 존재

---

## 3. 현재 구조 (Phase 3 완료 상태)

```
READ:  org?.field ?? supplier.field  (org primary + supplier fallback)
WRITE: supplier → org sync (side-effect)
```

### 3.1 Phase 3에서 전환된 메서드 (4개)

| 메서드 | org-primary 필드 | fallback |
|--------|-----------------|----------|
| `getSupplierProfile()` | name, businessNumber, businessAddress | supplier + prefill |
| `getSupplierBySlug()` | name | supplier |
| `getAllSuppliers()` | name (batch) | supplier |
| `getSuppliers()` | name (batch) | supplier |

### 3.2 아직 supplier 직접 읽기 중인 코드 (전환 대상)

| 파일 | 패턴 | 필드 |
|------|------|------|
| `neture.routes.ts` L286,339,397 | `ns.name AS supplier_name` (SQL JOIN) | name |
| `admin.service.ts` L41,73 | `ns.name AS "supplierName"` (SQL JOIN) | name |
| `partner-commission.service.ts` L147,181 | `ns.name AS supplier_name` (SQL JOIN) | name |
| `store-product-library.controller.ts` | `s.name AS "supplierName"` (SQL JOIN) | name |
| `supplier.service.ts` L102,146,184,285 | `supplier.name` (write response) | name |

---

## 4. 목표 구조 (Phase 4 완료 상태)

```
READ:  org.field  (org only, no fallback)
WRITE: org → supplier reverse-sync (denormalized copy)
```

### 4.1 필드 최종 소유권

| 필드 | SSOT | neture_suppliers | 방향 |
|------|------|-----------------|------|
| `name` | `organizations.name` | denormalized copy | org → supplier |
| `business_number` | `organizations.business_number` | denormalized copy | org → supplier |
| `business_address` | `organizations.address` | denormalized copy | org → supplier |
| `contact_phone` | `organizations.phone` | **supplier remains SSOT** | supplier → org |

> **contact_phone 예외**: visibility 설정이 supplier에 존재하므로 supplier가 SSOT 유지.
> org.phone은 연락처 사본 (sync 방향 유지).

### 4.2 neture_suppliers 유지 필드 (Extension)

| 카테고리 | 필드 | 이유 |
|----------|------|------|
| **Identity** | id, slug, user_id, organization_id | FK 참조 + bridge |
| **Public Profile** | logo_url, category, short_description, description | Neture 고유 |
| **Business Detail** | representative_name, manager_name, manager_phone, business_type, tax_email | 정산/세금 전용 |
| **Contact** | contact_email, contact_phone, contact_website, contact_kakao + 4 visibility | Neture 고유 가시성 |
| **Commerce** | pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain | Neture 전용 |
| **Approval** | status, approved_by, approved_at, rejected_reason | 워크플로우 상태 |
| **Timestamps** | created_at, updated_at | 표준 |
| **Deprecated** | name, business_number, business_address | denormalized copy (org → supplier) |

---

## 5. Phase 4 실행 계획

### Phase 4-A: Write Path 전환

**원칙**: `updateSupplierProfile()` → org에 먼저 쓰고, supplier에 역복사

**변경 대상**: `supplier.service.ts`

```typescript
// BEFORE (Phase 2-B)
supplier.businessNumber = data.businessNumber;
await this.supplierRepo.save(supplier);
await this.syncOrgBusinessData(supplier);  // supplier → org

// AFTER (Phase 4-A)
await this.updateOrgBusinessData(supplier.organizationId, {
  business_number: data.businessNumber,
  address: data.businessAddress,
});
supplier.businessNumber = data.businessNumber;  // reverse-sync
await this.supplierRepo.save(supplier);
```

**영향 범위**:
- `updateSupplierProfile()` — business 필드 write 순서 전환
- `registerSupplier()` — org 생성이 primary (이미 Phase 2-B에서 구현)
- `approveSupplier()` — org 활성화가 primary (이미 Phase 2-B에서 구현)

### Phase 4-B: SQL JOIN 전환

**대상**: `neture_suppliers` name을 직접 JOIN하는 모든 raw SQL

| 파일 | 현재 | 전환 후 |
|------|------|--------|
| `neture.routes.ts` | `JOIN neture_suppliers ns ... ns.name` | `JOIN organizations o ON o.id = ns.organization_id ... COALESCE(o.name, ns.name)` |
| `admin.service.ts` | `JOIN neture_suppliers ns ... ns.name` | 동일 패턴 |
| `partner-commission.service.ts` | `LEFT JOIN neture_suppliers ns ... ns.name` | 동일 패턴 |
| `store-product-library.controller.ts` | `s.name AS "supplierName"` | 동일 패턴 |

**SQL 전환 패턴**:

```sql
-- BEFORE
SELECT ns.name AS supplier_name
FROM supplier_product_offers spo
JOIN neture_suppliers ns ON ns.id = spo.supplier_id

-- AFTER (Phase 4-B — COALESCE for safety)
SELECT COALESCE(o.name, ns.name) AS supplier_name
FROM supplier_product_offers spo
JOIN neture_suppliers ns ON ns.id = spo.supplier_id
LEFT JOIN organizations o ON o.id = ns.organization_id
```

> **COALESCE 패턴 사용**: org.name이 NULL인 경우 (migration 전 데이터) supplier fallback 유지

### Phase 4-C: Read Fallback 제거

**전제**: Gate 1~3 통과 + Phase 4-B 안정 확인 후

**변경 대상**: `supplier.service.ts` — 4개 메서드

```typescript
// BEFORE (Phase 3)
name: org?.name ?? supplier.name

// AFTER (Phase 4-C)
name: org?.name ?? supplier.name  // fallback 유지 (defensive)
```

> **결정**: Phase 4-C에서도 fallback은 **제거하지 않는다**.
> 이유: 비용 0 (null coalescing), 안전성 ∞. Defensive coding 원칙.
> supplier.name 컬럼 삭제 시점(Phase 5)에서만 제거.

### Phase 4-D: Deprecation 표시

**Entity 수정**: `NetureSupplier.entity.ts`

```typescript
/** @deprecated WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1: Use organizations.name via organizationId */
@Column()
name: string;

/** @deprecated WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1: Use organizations.business_number via organizationId */
@Column({ name: 'business_number', type: 'varchar', length: 20, nullable: true })
businessNumber: string | null;

/** @deprecated WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1: Use organizations.address via organizationId */
@Column({ name: 'business_address', type: 'text', nullable: true })
businessAddress: string | null;
```

---

## 6. 영향도 분석

### 6.1 변경되는 것

| 대상 | 변경 내용 | Phase |
|------|----------|-------|
| `supplier.service.ts` updateSupplierProfile | write: org first → supplier reverse-sync | 4-A |
| `neture.routes.ts` 3개 SQL | JOIN organizations 추가 | 4-B |
| `admin.service.ts` 2개 SQL | JOIN organizations 추가 | 4-B |
| `partner-commission.service.ts` 2개 SQL | JOIN organizations 추가 | 4-B |
| `store-product-library.controller.ts` | JOIN organizations 추가 | 4-B |
| `NetureSupplier.entity.ts` | @deprecated 주석 3개 | 4-D |

### 6.2 변경되지 않는 것

| 대상 | 이유 |
|------|------|
| API 응답 스키마 | 필드명/타입 동일 유지 |
| Frontend 코드 | Backend에서 동일 스키마 제공 |
| supplier_product_offers FK | neture_suppliers.id 참조 유지 |
| 기존 read fallback | 제거하지 않음 (defensive) |
| contact_phone SSOT | supplier에서 유지 (visibility 때문) |

### 6.3 리스크

| 리스크 | 확률 | 완화 |
|--------|------|------|
| org.name NULL (migration 미적용 데이터) | 낮음 | COALESCE fallback |
| SQL JOIN 성능 | 매우 낮음 | organizations PK index |
| write 순서 전환 중 불일치 | 낮음 | transaction 내 처리 |

---

## 7. Phase 5 (미래 — 이 WO 범위 밖)

```
Phase 5: neture_suppliers에서 deprecated 컬럼 삭제
- ALTER TABLE neture_suppliers DROP COLUMN name;
- ALTER TABLE neture_suppliers DROP COLUMN business_number;
- ALTER TABLE neture_suppliers DROP COLUMN business_address;
- 이 시점에서 fallback 코드 제거
- 별도 WO 필요 (높은 리스크 — 모든 참조 제거 선행)
```

---

## 8. 완료 기준

### Phase 4-A (Write Path)
- [ ] `updateSupplierProfile()` → org primary write
- [ ] supplier에 reverse-sync 동작 확인
- [ ] TypeScript 빌드 통과

### Phase 4-B (SQL JOIN)
- [ ] `neture.routes.ts` 3개 SQL → org JOIN
- [ ] `admin.service.ts` 2개 SQL → org JOIN
- [ ] `partner-commission.service.ts` 2개 SQL → org JOIN
- [ ] `store-product-library.controller.ts` → org JOIN
- [ ] 모든 SQL에서 COALESCE fallback 유지
- [ ] TypeScript 빌드 통과

### Phase 4-C (Fallback 유지 결정)
- [ ] ~~Read fallback 제거~~ → **유지 결정** (Phase 5까지)

### Phase 4-D (Deprecation)
- [ ] Entity 3개 필드에 @deprecated 주석
- [ ] TypeScript 빌드 통과

---

## 9. 참조

| 문서 | 역할 |
|------|------|
| `WO-O4O-NETURE-ORG-DATA-MODEL-V1.md` | Phase 2 설계 (bridge 패턴) |
| `O4O-ORGANIZATION-ROLE-STANDARD-V1.md` | Organization 표준 정의 |
| `20260326600000-NetureSupplierOrgBridge.ts` | Phase 2-A migration |
| `20260311200000-CosmeticsStoreOrgBridge.ts` | K-Cosmetics 참조 구현 |

---

*Version: 1.0*
*Author: AI Assistant*
*Gate: Phase 2-3 프로덕션 안정 확인 후 실행*
