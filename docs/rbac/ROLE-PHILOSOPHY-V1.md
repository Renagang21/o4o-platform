# ROLE-PHILOSOPHY-V1 — O4O Platform 역할 철학 결정 문서

> **Work Order**: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 1
> **기준일**: 2026-02-27
> **상태**: DRAFT — 검토 후 FREEZE
> **선결**: IR-ROLE-INVENTORY-SNAPSHOT-V1.md (Phase 0 완료)

---

## 0. 설계 원칙 (Design Principles)

> 이 문서의 모든 결정은 아래 4개 원칙에서 도출된다.

1. **단일 소스 원칙**: 역할의 단일 진실은 `role_assignments` 테이블이다.
2. **레이어 분리 원칙**: Platform Role ≠ Organization Role. 두 레이어는 독립 운영된다.
3. **명확성 원칙**: 역할 이름은 의미가 명확해야 한다. 동음이의어 금지.
4. **점진적 이행 원칙**: 기존 DB 데이터를 즉시 파괴하지 않는다. 이행 경로를 명시한다.

---

## 1. 역할 레이어 정의 (Layer Definition)

### Layer A: Platform Role (role_assignments)

**정의**: 플랫폼 전체에서 사용자의 신분과 권한을 나타낸다.
**SSOT**: `role_assignments` 테이블
**형식**: 단순 문자열 (예: `super_admin`, `admin`, `operator`)
**소유자**: 플랫폼 관리자

```
역할 계층 (권한 포함 관계):
super_admin
  └── admin
        └── operator  ← "플랫폼 서비스 운영자" (아래 §2에서 확정)
              └── manager
                    └── [commerce roles: vendor/seller/supplier/partner]
                          └── user
                                └── customer (deprecated)
```

### Layer B: Organization Role (organization_members.role)

**정의**: 특정 조직(KPA 분회, 약국, 매장 등) 내에서의 역할이다.
**SSOT**: `organization_members.role` 컬럼
**형식**: 단순 문자열 (예: `owner`, `admin`, `operator`, `member`)
**소유자**: 조직 관리자

> ⚠️ Layer A의 `operator`와 Layer B의 `operator`는 이름이 같지만 **완전히 다른 개념**이다.
> Phase 3 이후 Layer B의 `operator`는 UI에서 "조직운영자"로 표시해 혼동을 방지한다.

---

## 2. Platform Role 확정 목록

### 2-1. 핵심 결정: `operator`의 공식 의미

> **결정**: `operator` = "플랫폼 서비스 운영자" (Platform Service Operator)
>
> - 플랫폼이 직접 운영하는 서비스(KPA, GlycoPharm 등)를 담당하는 직원/운영팀
> - `admin`보다 권한이 낮으나 `manager`보다 높다
> - `requireAdmin`에 포함된다 (현행 유지)

### 2-2. Platform Role 공식 목록

| 역할 | 한국어 | 의미 | requireAdmin 포함 | UserRole enum |
|------|--------|------|:-----------------:|:-------------:|
| `super_admin` | 슈퍼관리자 | 플랫폼 최고 권한 | ✅ | ✅ |
| `admin` | 관리자 | 플랫폼 관리자 | ✅ | ✅ |
| `operator` | 서비스운영자 | 플랫폼 서비스 담당 운영자 | ✅ | ❌ → 추가 필요 |
| `manager` | 매니저 | 특정 영역 관리 담당 | ❌ | ✅ |
| `vendor` | 벤더 | 드랍쉬핑 판매자 | ❌ | ✅ |
| `seller` | 셀러 | 커머스 판매자 | ❌ | ✅ |
| `supplier` | 공급자 | 상품 공급자 | ❌ | ✅ |
| `partner` | 파트너 | 제휴/커미션 파트너 | ❌ | ✅ |
| `business` | 비즈니스 | B2B 사업자 | ❌ | ✅ |
| `user` | 사용자 | 일반 회원 | ❌ | ✅ |

### 2-3. 제거/통합 결정

| 역할 | 결정 | 사유 |
|------|------|------|
| `customer` | ❌ 제거 (→ `user`) | Deprecated. `user`와 동일 의미 |
| `administrator` | ❌ 제거 (→ `admin`) | 오타 또는 alias. `admin`으로 통합 |
| `superadmin` | ❌ 제거 (→ `super_admin`) | 오타 (underscore 누락) |
| `moderator` | ⚠️ 보류 | 실사용 여부 확인 필요. 현재 KPA join request에만 사용 |
| `affiliate` | ⚠️ 보류 | `partner`와 통합 여부 결정 필요 |
| `vendor_manager` | ⚠️ 보류 | `vendor`의 sub-role 여부 결정 필요 |
| `beta_user` | ⚠️ 보류 | 기능 플래그로 대체 가능 |
| `staff` | ❌ 제거 | SMTP 라우트에만 사용. `operator`로 대체 |

---

## 3. Organization Role 확정 목록

### 3-1. KPA Member Role (organization_members)

```
owner    → 약국/조직 소유자 (최고 권한)
admin    → 조직 관리자
operator → 조직 운영담당 (UI 표시: "조직운영자")
member   → 일반 조직원
```

> **UI 표시 규칙**: Layer B의 `operator`는 반드시 "조직운영자"로 표시.
> Layer A의 `operator`(서비스운영자)와 구분.

### 3-2. Cosmetics Store Role

```
owner   → 매장 소유자
manager → 매장 관리자 (CosmeticsStoreMemberRole.MANAGER)
staff   → 매장 직원 (CosmeticsStoreMemberRole.STAFF)
```

---

## 4. Prefixed Role 정책

### 4-1. 현재 상태

- `types/roles.ts`에 `PrefixedRole` 타입과 `ROLE_REGISTRY`가 정의되어 있다.
- 실제 DB에 prefixed role이 얼마나 존재하는지 불명확하다.
- KPA 마이그레이션(20260205040103-KpaRolePrefixMigration.ts)이 일부 처리했을 수 있다.

### 4-2. 결정: Prefixed Role 사용 범위

> **결정**: Prefixed role은 **서비스별 권한 세분화**가 필요한 경우에만 사용한다.
> 플랫폼 전역 권한(admin, super_admin, operator)은 unprefixed 유지.

```
사용: kpa:operator, kpa:admin, kpa:district_admin 등 (KPA 전용)
사용: glycopharm:operator, glycopharm:pharmacy 등 (GlycoPharm 전용)
미사용: platform:admin (→ 그냥 'admin' 사용)
미사용: platform:operator (→ 그냥 'operator' 사용)
```

### 4-3. Prefixed Role 이행 타임라인

```
현재 (Phase3-E): role_assignments에 unprefixed role이 주요 데이터
Phase 5 (목표): KPA, GlycoPharm의 서비스별 역할 확인 후 prefixed 활성화
Phase 6 (미래): platform:* prefix는 사용하지 않기로 결정 (불필요)
```

---

## 5. Role Guard 표준화 원칙

### 5-1. 현재 문제

코드베이스에 3가지 방식이 혼재한다:

```typescript
// 방식 1: requireAdmin (RA 직접 쿼리) — 권장
requireAdmin

// 방식 2: requireRole 배열 (JWT payload 체크) — 사용 가능
requireRole(['admin', 'super_admin'])

// 방식 3: 로컬 배열 리터럴 체크 — 제거 대상
const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
if (!user.roles?.some(r => legacyRoles.includes(r))) { throw 403; }
```

### 5-2. 표준 원칙

| 사용 목적 | 권장 방법 | 이유 |
|----------|-----------|------|
| 관리자 접근 제어 | `requireAdmin` | RA 직접 쿼리 (항상 최신) |
| 특정 역할 접근 제어 | `requireRole([...])` | JWT payload 기반 (성능) |
| 도메인별 레거시 체크 | → `requireRole`로 교체 | 일관성 |

### 5-3. `legacyRoles` 배열 체크 교체 우선순위

Phase 2G가 플랫폼 코어를 정리했다. 남은 도메인별 파일은 각 서비스 WO에서 처리:
- `cosmetics.routes.ts` → cosmetics WO
- `glycopharm/controllers/*.ts` → glycopharm WO
- `glucoseview/glucoseview.routes.ts` → glucoseview WO

---

## 6. `UserRole` enum 정리 결정

### 6-1. 추가할 값

```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN       = 'admin',
  OPERATOR    = 'operator',    // ✅ 추가 — 서비스운영자
  MANAGER     = 'manager',
  VENDOR      = 'vendor',
  SELLER      = 'seller',
  USER        = 'user',
  BUSINESS    = 'business',
  PARTNER     = 'partner',
  SUPPLIER    = 'supplier',
  CUSTOMER    = 'customer',    // Deprecated — 유지 (BC)
}
// 제거: 없음 (BC 유지)
// 미추가: moderator, affiliate, vendor_manager, beta_user (Phase 5에서 재검토)
```

### 6-2. 이 결정의 영향

- `requireAdmin`에서 `['admin','super_admin','operator']`가 사용하는 값들이 모두 enum에 존재하게 됨
- 타입 안전성 향상
- 기존 코드 변경 없음

---

## 7. UI 명칭 표준 (Korean Label)

| DB 값 | 영문 Label | 한국어 Label |
|--------|-----------|-------------|
| `super_admin` | Super Admin | 슈퍼관리자 |
| `admin` | Admin | 관리자 |
| `operator` | Service Operator | 서비스운영자 |
| `manager` | Manager | 매니저 |
| `vendor` | Vendor | 벤더 |
| `seller` | Seller | 셀러 |
| `supplier` | Supplier | 공급자 |
| `partner` | Partner | 파트너 |
| `business` | Business | 비즈니스 |
| `user` | User | 사용자 |
| `customer` | Customer (deprecated) | 고객 (deprecated) |
| **org: operator** | **Org Operator** | **조직운영자** |
| **org: admin** | **Org Admin** | **조직관리자** |
| **org: member** | **Member** | **조직원** |

---

## 8. 변경 불필요 항목 (현행 유지)

다음은 현행 구조가 올바르며 변경하지 않는다:

- `requireAdmin` 로직: `['admin','super_admin','operator']` 체크 — **유지**
- `requireAuth` 로직: `user.roles = payload.roles || []` — **유지**
- `organization_members.role` 컬럼 구조 — **유지** (Business Role SSOT)
- KPA prefixed roles (`kpa:operator` 등) — **유지** (이미 정의됨)
- `role_assignments` 단일 소스 원칙 — **유지** (Phase3-E 완료)

---

## 9. Phase 2 이후 작업 범위 (Preview)

| Phase | 작업 | 범위 |
|-------|------|------|
| Phase 2 | 이 문서 기반 적용 계획 작성 | 파일 목록 + 변경 내용 |
| Phase 3 | UI 텍스트: `operator` → `서비스운영자`, `조직운영자` 분리 | admin-dashboard |
| Phase 4 | 코드 Guard: `legacyRoles` 배열 → `requireRole` 교체 | glycopharm, glucoseview, cosmetics |
| Phase 5 | `UserRole` enum에 OPERATOR 추가 | types/auth.ts |
| Phase 5 | DB: 불명확 역할 값 정리 (moderator, affiliate 등) | role_assignments |
| Phase 6 | Freeze: ROLE-PHILOSOPHY-V1 확정 | 이 문서 |

---

*Draft: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 1*
*Status: DRAFT — 검토 후 FREEZE*
*See also: IR-ROLE-INVENTORY-SNAPSHOT-V1.md*
