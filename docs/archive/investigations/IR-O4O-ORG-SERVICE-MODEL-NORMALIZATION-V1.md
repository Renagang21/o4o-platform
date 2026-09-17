# IR-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1

## Organization-Service 모델 정규화 실행 설계서

> **작성일**: 2026-02-20
> **상태**: Phase A 마이그레이션 파일 생성 완료 — 배포 전 승인 대기
> **선행 문서**: `IR-O4O-BUSINESS-CORE-AUDIT-PHASE1-V1.md`
> **범위**: 마이그레이션 SQL + 코드 영향 매트릭스 + RBAC 변경 + Storefront 통합
> **Phase A 마이그레이션**: `apps/api-server/src/database/migrations/20260221000000-OrgServiceModelNormalizationPhaseA.ts`
>
> ### DB 컬럼명 주의사항 (SnakeNamingStrategy 주석 처리됨)
> - `organizations` 테이블: camelCase quoted (`"parentId"`, `"isActive"`, `"childrenCount"`, `"createdAt"`, `"updatedAt"`)
> - `kpa_organizations` 테이블: snake_case (`parent_id`, `is_active`, `created_at`, `updated_at`)
> - `platform_store_slugs` 테이블: 명시적 name 사용 (`store_id`, `service_key`, `is_active`)

---

## 0. Executive Summary

현행 O4O 조직 체계는 **이중 조직 테이블 + PK 공유 + 이중 RBAC 체인**으로 구성되어 있으며,

본 문서는 이를 **범용 조직 모델**로 정규화하는 4단계 실행 설계를 제시한다.

| 단계 | 내용 | 영향 파일 | 위험도 |
|------|------|----------|--------|
| Phase A | 마이그레이션 SQL (비파괴적) | 1 migration | 🟢 Low |
| Phase B | 엔티티/컨트롤러 코드 변경 | 40+ files | 🔴 High |
| Phase C | RBAC 통합 | 12+ files | 🔴 High |
| Phase D | Storefront Config 통합 | 8+ files | 🟡 Medium |

**총 예상 변경**: 55+ 파일, 10 엔티티, 15+ 컨트롤러, 6+ 서비스/미들웨어

---

## 1. 현행 구조 (AS-IS)

### 1-A. 이중 조직 체계

```
┌─────────────────┐     ┌─────────────────────────┐
│  organizations   │     │  kpa_organizations       │
│  (Frozen Core)   │     │  (KPA Active)            │
├─────────────────┤     ├─────────────────────────┤
│ id (UUID PK)    │     │ id (UUID PK)            │
│ name            │     │ name                     │
│ code (UNIQUE)   │     │ type (assoc/branch/group)│
│ type            │     │ parent_id (self FK)      │
│ parentId (self) │     │ storefront_config (JSONB)│
│ level, path     │     │ description, address...  │
│ metadata (JSONB)│     │ is_active                │
│ isActive        │     └────────┬────────────────┘
└─────────────────┘              │ PK 공유 (id = id)
                                 │
                    ┌────────────▼────────────────┐
                    │                              │
                    │  (Active)                    │
                    ├─────────────────────────────┤
                    │ id (UUID PK → kpa_orgs FK)  │
                    │ name, code, slug             │
                    │ business_number              │
                    │ created_by_user_id           │
                    │ storefront_config (JSONB)    │
                    │ template_profile             │
                    │ storefront_blocks (JSONB)    │
                    └─────────────────────────────┘
```

### 1-B. 이중 RBAC 체인

| 서비스 | 조직 해석 경로 | 소유자 판별 |
|--------|---------------|------------|
| KPA | `userId → kpa_members.user_id → kpa_members.organization_id` | `roles[]` contains `kpa:branch_admin` |

### 1-C. 핵심 문제

| # | 문제 | 영향 |
|---|------|------|
| P1 | — | 서비스 독립 운영 차단 |
| P2 | 이중 RBAC: 동일 사용자/약국에 대해 2개 해석 경로 | 코드 복잡성, 불일치 위험 |
| P3 | 이중 Storefront Config: 동기화 정책 없음 | 설정 불일치 |
| P4 | Organization-Service 매핑 테이블 없음 | 다중 서비스 조직 지원 불가 |
| P5 | Store Hub가 org→pharmacy 매핑 불가 → 상품 수 0 표시 | 기능 누락 |

---

## 2. 목표 구조 (TO-BE)

### 2-A. 통합 조직 모델

```
┌─────────────────────────────────────┐
│  organizations (확장)                │
├─────────────────────────────────────┤
│ id (UUID PK)                        │
│ name                                │
│ code (UNIQUE)                       │
│ type (association/branch/group/...) │
│ parent_id (self FK)                 │
│ level, path                         │
│ metadata (JSONB)                    │
│ is_active                           │
│ address, phone, description         │  ← kpa_organizations에서 승격
│ business_number                     │  ← 승격
│ storefront_config (JSONB)           │  ← 통합 단일 Source of Truth
│ template_profile                    │  ← 승격
│ storefront_blocks (JSONB)           │  ← 승격
│ created_by_user_id                  │  ← 승격
└──────────┬──────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────────────┐
│  organization_service_enrollments    │
├─────────────────────────────────────┤
│ id (UUID PK)                        │
│ organization_id (FK → organizations)│
│ service_code (FK → platform_services│
│ status (active/suspended/...)       │
│ enrolled_at                         │
│ config (JSONB)                      │  ← 서비스별 확장 설정
│ UNIQUE(organization_id, service_code│
└──────────┬──────────────────────────┘
           │
           │ Service-specific extensions
           ▼
┌─────────────────────────────────────┐
│                                      │
├─────────────────────────────────────┤
│ organization_id (PK+FK)             │
│ enabled_services (JSONB)            │
│ hero_image                          │
│ logo                                │
│ slug (UNIQUE, legacy — 이동 고려)    │
│ owner_name                          │
└─────────────────────────────────────┘
```

### 2-B. 통합 RBAC 체인

```
모든 서비스 공통:
  userId → kpa_members.user_id → kpa_members.organization_id
  (kpa_members를 "organization_members"로 범용화)

소유자 판별 통합:
  organization_service_enrollments에서
  service_code + organization_id로 서비스 가입 여부 확인
```

---

## 3. Phase A: 마이그레이션 SQL 설계 (비파괴적)

> **원칙**: 기존 테이블/컬럼 삭제 없음. 새 구조를 추가하고 데이터를 복사.
> **organization-core Frozen 정책**: organizations 테이블 구조 변경이므로 **명시적 WO 승인 필요**

### Migration A-1: organizations 테이블 확장

```sql
-- ============================================================
-- A-1: organizations 테이블에 storefront/약국 컬럼 추가
-- ============================================================

-- 주소/연락처 (kpa_organizations에서 승격)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_number VARCHAR(20);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

-- Storefront (통합)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS storefront_config JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS template_profile VARCHAR(30) DEFAULT 'BASIC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS storefront_blocks JSONB;

-- 인덱스
CREATE INDEX IF NOT EXISTS IDX_organizations_business_number
  ON organizations(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS IDX_organizations_created_by_user_id
  ON organizations(created_by_user_id) WHERE created_by_user_id IS NOT NULL;
```

### Migration A-2: organization_service_enrollments 생성

```sql
-- ============================================================
-- A-2: 조직-서비스 가입 junction table
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_service_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_code VARCHAR(50) NOT NULL REFERENCES platform_services(code),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, service_code)
);

CREATE INDEX IDX_org_svc_enroll_org ON organization_service_enrollments(organization_id);
CREATE INDEX IDX_org_svc_enroll_svc ON organization_service_enrollments(service_code);
CREATE INDEX IDX_org_svc_enroll_status ON organization_service_enrollments(status);
```

### Migration A-3: 데이터 마이그레이션 (kpa_organizations → organizations)

```sql
-- ============================================================
-- A-3: kpa_organizations 데이터를 organizations에 동기 (UPSERT)
-- ============================================================

-- 3a: kpa_organizations → organizations (계층 구조 포함)
INSERT INTO organizations (id, name, code, type, "parentId", "isActive", address, phone, description, storefront_config, metadata)
SELECT
  k.id,
  k.name,
  COALESCE(o_existing.code, 'kpa-' || REPLACE(k.id::text, '-', '') ),
  k.type,
  k.parent_id,
  k.is_active,
  k.address,
  k.phone,
  k.description,
  k.storefront_config,
  '{}'::jsonb
FROM kpa_organizations k
LEFT JOIN organizations o_existing ON o_existing.id = k.id
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  "parentId" = EXCLUDED."parentId",
  "isActive" = EXCLUDED."isActive",
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  description = EXCLUDED.description,
  storefront_config = EXCLUDED.storefront_config;

UPDATE organizations o SET
  business_number = gp.business_number,
  created_by_user_id = gp.created_by_user_id,
  template_profile = gp.template_profile,
  storefront_blocks = gp.storefront_blocks,
  storefront_config = COALESCE(o.storefront_config, '{}'::jsonb) || COALESCE(gp.storefront_config, '{}'::jsonb)
WHERE o.id = gp.id;

-- 3c: organization_service_enrollments 시딩
-- 모든 kpa_organizations → kpa-society 서비스
INSERT INTO organization_service_enrollments (organization_id, service_code, status)
SELECT k.id, 'kpa-society', 'active'
FROM kpa_organizations k
WHERE k.is_active = true
ON CONFLICT (organization_id, service_code) DO NOTHING;

INSERT INTO organization_service_enrollments (organization_id, service_code, status)
WHERE gp.status = 'active'
ON CONFLICT (organization_id, service_code) DO NOTHING;
```

### Migration A-5 (선택적): 뷰 생성 — 호환성 유지

```sql
-- ============================================================
-- A-5: 호환성 뷰 (기존 쿼리 점진 전환용)
-- ============================================================

SELECT
  o.id,
  o.name,
  o.code,
  o.address,
  o.phone,
  ext.owner_name,
  o.business_number,
  pss.slug,
  o.description,
  ext.hero_image,
  ext.logo,
  CASE WHEN o."isActive" THEN 'active' ELSE 'inactive' END AS status,
  ext.sort_order,
  o.created_by_user_id,
  NULL::varchar(100) AS created_by_user_name,
  ext.enabled_services,
  o.storefront_config,
  o.template_profile,
  o.storefront_blocks,
  o.created_at,
  o.updated_at
FROM organizations o
JOIN organization_service_enrollments ose
LEFT JOIN platform_store_slugs pss
```

---

## 4. Phase B: 코드 영향 매트릭스

### 4-A. 엔티티 파일 (10건)

| # | 엔티티 | 파일 | FK 대상 | 변경 내용 | 위험도 |
|---|--------|------|---------|----------|--------|
| E1 | KpaOrganization | `routes/kpa/entities/kpa-organization.entity.ts` | (자기참조) | **삭제 또는 뷰 래퍼** — organizations로 통합 | 🔴 |
| E2 | — | — | kpa_organizations.id | **FK → organizations.id 변경**, PK 공유 제거 | 🔴 |
| E3 | KpaMember | `routes/kpa/entities/kpa-member.entity.ts` | kpa_organizations.id | FK → organizations.id 변경 | 🟡 |
| E4 | OrganizationChannel | `routes/kpa/entities/organization-channel.entity.ts` | kpa_organizations.id | FK → organizations.id 변경 | 🟡 |
| E5 | OrganizationProductListing | `routes/kpa/entities/organization-product-listing.entity.ts` | kpa_organizations.id | FK → organizations.id 변경 | 🟡 |
| E6 | KpaBranchOfficer | `routes/kpa/entities/kpa-branch-officer.entity.ts` | kpa_organizations.id | FK → organizations.id 변경 | 🟡 |
| E7 | KpaSteward | `routes/kpa/entities/kpa-steward.entity.ts` | kpa_organizations.id | FK → organizations.id 변경 | 🟡 |
| E8 | KpaApplication | `routes/kpa/entities/kpa-application.entity.ts` | kpa_organizations.id | FK → organizations.id 변경 | 🟡 |
| E9 | KpaOrganizationJoinRequest | `routes/kpa/entities/kpa-organization-join-request.entity.ts` | (organization_id 컬럼) | FK 추가: → organizations.id | 🟢 |
| E10 | KpaBranchSettings | `routes/kpa/entities/kpa-branch-settings.entity.ts` | kpa_organizations.id | FK → organizations.id 변경 | 🟡 |

### 4-B. 컨트롤러 파일 (15건 이상)

| # | 컨트롤러 | 파일 | 현행 쿼리 대상 | 변경 |
|---|---------|------|---------------|------|
| C1 | store-hub | `routes/kpa/controllers/store-hub.controller.ts` | kpa_organizations | → organizations |
| C2 | pharmacy-store-config | `routes/kpa/controllers/pharmacy-store-config.controller.ts` | kpa_organizations | → organizations |
| C3 | kpa-store-template | `routes/kpa/controllers/kpa-store-template.controller.ts` | — | → organizations (단일) |
| C4 | organization | `routes/kpa/controllers/organization.controller.ts` | kpa_organizations | → organizations |
| C5 | member | `routes/kpa/controllers/member.controller.ts` | kpa_organizations | → organizations |
| C6 | application | `routes/kpa/controllers/application.controller.ts` | kpa_organizations | → organizations |
| C7 | operator-summary | `routes/kpa/controllers/operator-summary.controller.ts` | kpa_organizations | → organizations |
| C8 | branch-admin-dashboard | `routes/kpa/controllers/branch-admin-dashboard.controller.ts` | kpa_organizations | → organizations |
| C9 | branch-public | `routes/kpa/controllers/branch-public.controller.ts` | kpa_organizations | → organizations |
| C10 | steward | `routes/kpa/controllers/steward.controller.ts` | kpa_organizations | → organizations |
| C11 | organization-join-request | `routes/kpa/controllers/organization-join-request.controller.ts` | kpa_organizations | → organizations |
| C12 | admin-force-asset | `routes/kpa/controllers/admin-force-asset.controller.ts` | kpa_organizations | → organizations |
| C13 | admin-dashboard | `routes/kpa/controllers/admin-dashboard.controller.ts` | kpa_organizations | → organizations |
| C14 | — | — | — | → organizations + extensions |
| C15 | — | — | — | → organizations + extensions |

### 4-C. 미들웨어 (8건 CRITICAL)

| # | 파일 | PK 공유 의존 | 변경 내용 |
|---|------|-------------|----------|
| G1 | — | pharmacy.id = kpa_org.id 가정 | organizations.id 직접 사용 |
| G2 | `routes/platform/unified-store-public.routes.ts` | — | slug → organizations + extensions 해석 |
| G3 | — | pharmacy 조회 | organizations + enrollment 확인 |
| G4 | — | — | organizations 기반으로 변경 |
| G5 | — | pharmacy CRUD | organizations + extensions CRUD |
| G6 | `modules/care/care-pharmacy-context.middleware.ts` | `created_by_user_id` 조회 | organizations.created_by_user_id 조회 |
| G7 | — | pharmacy 기반 | organizations 기반 |
| G8 | — | pharmacy.id | organizations.id |

### 4-D. 마이그레이션 파일 (6건 — 참조만)

기존 마이그레이션은 수정하지 않음. 새 마이그레이션으로 구조 전환.

| # | 마이그레이션 | 내용 |
|---|-------------|------|
| M1 | `20260206190000-CreateKpaFoundationTables.ts` | kpa_organizations CREATE |
| M2 | `20260212100000-SeedKpaOrganizationsFullHierarchy.ts` | kpa_organizations SEED |
| M3 | `20260215000010-AddKpaStorefrontConfig.ts` | storefront_config 추가 |
| M4 | `20260215200001-CreateOrganizationChannels.ts` | organization_channels FK |
| M5 | `20260215300001-AddFkListingOrganization.ts` | product_listing FK |
| M6 | `20260215300002-AddFkPharmacyOrganization.ts` | **PK 공유 FK 생성** |

### 4-E. 시드/스크립트 (2건)

| # | 파일 | 변경 |
|---|------|------|
| S1 | `modules/admin/seed-demo.controller.ts` | kpa_organizations 시드 → organizations 시드 |
| S2 | — | 약국 시드 → organizations + extensions 시드 |

---

## 5. Phase C: RBAC 변경 설계

### 5-A. 현행 이중 해석 체인

```
[KPA 체인]
  JWT.userId
    → SELECT organization_id FROM kpa_members WHERE user_id = $1
    → kpa_organizations.id
    → 역할 확인: roles[] contains 'kpa:branch_admin'

  JWT.userId
    → 역할 확인: user.pharmacist_role = 'pharmacy_owner'
```

### 5-B. 통합 목표

```
[통합 체인]
  JWT.userId
    → SELECT organization_id FROM kpa_members WHERE user_id = $1
    → organizations.id
    → 서비스 가입 확인: organization_service_enrollments
    → 역할: roles[] (기존 KPA 방식으로 통일)
```

### 5-C. 변경이 필요한 해석 함수들

| # | 위치 | 현행 함수 | 변경 |
|---|------|----------|------|
| R1 | `store-hub.controller.ts:25-32` | `getUserOrganizationId()` via kpa_members | **유지** — kpa_members 테이블 자체는 존속 |
| R2 | `pharmacy-products.controller.ts:30-39` | `getUserOrganizationId()` via kpa_members | **유지** |
| R3 | `care-pharmacy-context.middleware.ts:54-72` | — | → `organizations.created_by_user_id` 쿼리 |
| R4 | — | `pharmacyRepo.findOne({ created_by_user_id })` | → `organizationRepo` 또는 `organizations.created_by_user_id` |
| R5 | `store-hub.controller.ts:34-39` | `isPharmacyOwnerRole()` — roles array 검사 | **유지** |
| R6 | `pharmacy-products.controller.ts:44-46` | `getPharmacistRole()` — user.pharmacist_role 검사 | → roles array 통일 검토 |

### 5-D. 결정 사항

| 항목 | 결정 | 근거 |
|------|------|------|
| kpa_members 테이블 | **유지** | 이미 범용적 org membership 역할 수행 |
| kpa_members.organization_id FK | → organizations.id | 통합 조직 참조 |
| user.pharmacist_role 필드 | **Phase 2에서 정리** | 현재 단일 `pharmacy_owner` 값만 사용, roles[]로 통일 가능하나 범위 초과 |

### 5-E. Branch Scope Middleware

**파일**: `routes/kpa/middleware/branch-scope.middleware.ts`

현행: `kpa_members.organization_id !== branchId` 검사
변경: **없음** — kpa_members는 organizations.id를 참조하므로 동일하게 동작

---

## 6. Phase D: Storefront Config 통합 설계

### 6-A. 현행 이중 저장

| 위치 | 컬럼 | 내용 |
|------|------|------|
| `kpa_organizations.storefront_config` | JSONB | 매장 기본 설정 |

### 6-B. 통합 전략

**병합 규칙**:

### 6-C. 영향 받는 읽기/쓰기 경로

| # | 경로 | 현행 Source | 변경 후 Source |
|---|------|-----------|---------------|
| W1 | KPA Store Hub config 저장 | kpa_organizations.storefront_config | organizations.storefront_config |
| W2 | — | — | organizations.storefront_config |
| W3 | Template profile 변경 | — | organizations.template_profile |
| W4 | Block layout 저장 | — | organizations.storefront_blocks |
| R1 | Public store config 조회 | — | organizations 직접 조회 |
| R2 | Store Hub overview | kpa_organizations.name | organizations.name |
| R3 | Layout controller | — | organizations.storefront_blocks |

### 6-D. 호환성 고려

- 뷰 성능: 단순 JOIN이므로 인덱스만 있으면 성능 영향 미미

---

## 7. 실행 로드맵

### Phase 0: 사전 조건 (WO 승인)

| # | 조건 | 상태 |
|---|------|------|
| PRE-1 | organization-core Frozen 해제 (organizations 테이블 확장 허용) | ❗ **승인 필요** |
| PRE-2 | Retail Stable Rule 영향 검토 완료 | ✅ 미해당 (Visibility Gate의 4중 조건에 organizations 미포함) |
| PRE-3 | 현행 데이터 백업 | 실행 전 수행 |

### Phase 1: 비파괴적 마이그레이션 (Safe)

```
순서: A-1 → A-2 → A-3 → A-4 → A-5
소요: 1 migration 파일
영향: 기존 코드 0% 변경 — 새 테이블/컬럼만 추가
롤백: 컬럼/테이블 DROP으로 완전 복원 가능
```

### Phase 2: 엔티티 전환 (Breaking)

```
       → E3-E10 (종속 엔티티 FK 변경)
조건: Phase 1 마이그레이션 실행 후
영향: TypeORM 엔티티 관계 전면 재정의
위험: 🔴 High — 모든 컨트롤러에 영향
```

### Phase 3: 컨트롤러/서비스 전환

```
조건: Phase 2 엔티티 전환 후
영향: SQL 쿼리 / TypeORM 쿼리 전면 변경
위험: 🔴 High
```

### Phase 4: RBAC 통합

```
       → R6 (pharmacist_role 통일 검토)
조건: Phase 3 완료 후
영향: 인증/인가 흐름 변경
위험: 🔴 High — 인증 오류 시 서비스 접근 차단
```

### Phase 5: Storefront 통합

```
순서: W1-W4 (쓰기 경로 전환) → R1-R3 (읽기 경로 전환)
조건: Phase 2 완료 후 (Phase 3과 병행 가능)
영향: 매장 설정 저장/조회 경로 변경
위험: 🟡 Medium
```

### Phase 6: 정리 (최종)

```
- kpa_organizations 테이블 → DROP 또는 뷰로 대체
- 레거시 FK/인덱스 정리
```

---

## 8. Retail Stable Rule 영향 분석

> CLAUDE.md §13-A: Retail Stable Rule (FROZEN) 5개 항목 검증

| # | Stable 항목 | 영향 여부 | 근거 |
|---|------------|----------|------|
| 1 | Visibility Gate 4중 정의 | ❌ 미해당 | — |
| 2 | Sales Limit 계산 기준 | ❌ 미해당 | `status='PAID'` — checkout_orders 기준, organizations 변경 무관 |
| 3 | Payment atomic transition | ❌ 미해당 | `transitionStatus()` + `internalOrderId` — 조직 구조 변경 무관 |
| 4 | TTL orphan 정리 정책 | ❌ 미해당 | 15분 CREATED→CANCELLED — 조직 구조 변경 무관 |
| 5 | PaymentCore ↔ Service 분리 | ❌ 미해당 | 계층 분리 — 조직 구조 변경 무관 |

**결론**: Retail Stable Rule 5개 항목 모두 **미해당**. 단, Visibility Gate의 `p.status='active'` 경로는 Phase 3에서 뷰 호환성 확인 필수.

---

## 9. 리스크 요약

| # | 리스크 | 레벨 | 완화 방안 |
|---|--------|------|----------|
| R1 | organization-core Frozen 해제 필요 | 🔴 | WO 승인 절차 |
| R2 | 55+ 파일 동시 변경 | 🔴 | Phase별 순차 실행, 뷰로 점진 전환 |
| R3 | PK 공유 제거 시 FK CASCADE 영향 | 🔴 | 데이터 백업 + 트랜잭션 마이그레이션 |
| R4 | RBAC 전환 시 인증 장애 | 🔴 | — |
| R5 | Storefront config 병합 데이터 손실 | 🟡 | — |
| R6 | 프론트엔드 API 응답 형식 변경 | 🟡 | API 응답 인터페이스 유지, 내부 구현만 변경 |

---

## 10. 결정 필요 사항

| # | 항목 | 선택지 | 권고 |
|---|------|-------|------|
| D1 | organization-core Frozen 해제 | WO 발행 / 별도 extension 테이블로 우회 | **WO 발행 권고** (Extension으로 우회 시 복잡성 증가) |
| D2 | kpa_members 테이블 이름 변경 | `organization_members`로 rename / 현상 유지 | **현상 유지 권고** (Phase 2에서 검토) |
| D3 | — | 즉시 / 뷰 전환 후 3개월 | **뷰 전환 후 3개월** |
| D4 | pharmacist_role → roles[] 통일 | 이번 WO / Phase 2 | **Phase 2** (범위 초과) |
| D5 | 실행 일정 | 즉시 / 다음 스프린트 | **사전 조건(PRE-1) 승인 후** |

---

## 부록 A: 전체 파일 영향 목록

### A-1. KpaOrganization 참조 파일 (40건)

**엔티티** (10):
- `routes/kpa/entities/kpa-organization.entity.ts`
- `routes/kpa/entities/kpa-member.entity.ts`
- `routes/kpa/entities/organization-channel.entity.ts`
- `routes/kpa/entities/organization-product-listing.entity.ts`
- `routes/kpa/entities/kpa-branch-officer.entity.ts`
- `routes/kpa/entities/kpa-branch-settings.entity.ts`
- `routes/kpa/entities/kpa-branch-news.entity.ts`
- `routes/kpa/entities/kpa-branch-doc.entity.ts`
- `routes/kpa/entities/kpa-steward.entity.ts`
- `routes/kpa/entities/kpa-application.entity.ts`

**컨트롤러** (13):
- `routes/kpa/controllers/store-hub.controller.ts`
- `routes/kpa/controllers/pharmacy-store-config.controller.ts`
- `routes/kpa/controllers/kpa-store-template.controller.ts`
- `routes/kpa/controllers/organization.controller.ts`
- `routes/kpa/controllers/member.controller.ts`
- `routes/kpa/controllers/application.controller.ts`
- `routes/kpa/controllers/operator-summary.controller.ts`
- `routes/kpa/controllers/branch-admin-dashboard.controller.ts`
- `routes/kpa/controllers/branch-public.controller.ts`
- `routes/kpa/controllers/steward.controller.ts`
- `routes/kpa/controllers/organization-join-request.controller.ts`
- `routes/kpa/controllers/admin-force-asset.controller.ts`
- `routes/kpa/controllers/admin-dashboard.controller.ts`

**기타** (3):
- `routes/kpa/kpa.routes.ts` (entity 등록)
- `database/connection.ts` (entity 등록)
- `__tests__/kpa-branch-cms-runtime.spec.ts` (테스트)

**마이그레이션** (6): 수정 불필요 (새 마이그레이션으로 전환)
