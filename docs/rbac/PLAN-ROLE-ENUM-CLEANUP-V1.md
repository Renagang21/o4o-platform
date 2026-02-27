# PLAN-ROLE-ENUM-CLEANUP-V1

> **Work Order**: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 2 → Phase 5 실행 기반
> **기준일**: 2026-02-27
> **상태**: PLAN (코드 변경 없음)
> **의존**: ROLE-PHILOSOPHY-V1.md (§6 UserRole enum 정리 결정)

---

## 0. 요약

| 항목 | 값 |
|------|-----|
| 변경 대상 파일 수 | **4개** (types/auth.ts + DTO 관련 파일들) |
| 예상 커밋 수 | **2개** |
| 예상 리스크 | **낮음** (enum 추가만, 기존 값 제거 없음) |
| 롤백 방법 | git revert 1개 커밋 |

---

## 1. 현재 UserRole enum 상태

### 1-1. `types/auth.ts:5` — 현재 상태

```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',  ✅ 있음
  ADMIN       = 'admin',        ✅ 있음
  VENDOR      = 'vendor',       ✅ 있음
  SELLER      = 'seller',       ✅ 있음
  USER        = 'user',         ✅ 있음
  BUSINESS    = 'business',     ✅ 있음
  PARTNER     = 'partner',      ✅ 있음
  SUPPLIER    = 'supplier',     ✅ 있음
  MANAGER     = 'manager',      ✅ 있음 (legacy)
  CUSTOMER    = 'customer'      ✅ 있음 (deprecated)
  // ❌ OPERATOR 없음 — requireAdmin에서 'operator' 사용 중인데 enum 미등록
}
```

---

## 2. enum에 없는 role 값 목록 (코드에서 사용 중)

### 2-1. `operator` — ❌ 누락 (심각)

**사용 위치**:
- `common/middleware/auth.middleware.ts:165` — `requireAdmin` 배열에 `'operator'` 사용
- `routes/operator-notification.routes.ts:23,30` — `requireRole(['admin','super_admin','operator'])`
- `routes/admin/users.routes.ts` — Assignable 목록에 없음 (누락)
- `pages/settings/AuthSettings.tsx:31` — `{ role: 'operator', label: '운영자' }`
- BackfillMigration — `users.role = 'operator'` 처리 대상

**결정**: `OPERATOR = 'operator'` 추가 (ROLE-PHILOSOPHY-V1 §6 확정)

### 2-2. `administrator` — ❌ 별칭 (오타/중복)

**사용 위치**:
- `types/roles.ts:111` — `LegacyRole`에 포함
- `dto/auth/me-response.dto.ts:20` — 응답 타입에 포함
- `controllers/admin/adminDashboardController.ts` (7개 위치)
- `controllers/admin/adminStatsController.ts` (4개 위치)
- `controllers/admin/adminApprovalController.ts` (5개 위치)
- `controllers/approvalController.ts` (1개 위치)
- `routes/cosmetics/cosmetics.routes.ts:56` — legacyRoles에 포함
- `routes/glycopharm/controllers/*.ts` — legacyRoles에 포함

**분석**: `administrator`는 DB role_assignments에 존재하지 않는 값.
BackfillMigration 대상도 아님. 레거시 방어 코드에서만 사용.

**결정**: enum에 추가하지 않음. Guard 코드에서 제거 (PLAN-ROLE-GUARD-REFACTOR-V1 §4 커밋 4).
`dto/auth/me-response.dto.ts:20`에서 타입 제거.

### 2-3. `superadmin` — ❌ 오타 (underscore 없음)

**사용 위치**:
- `modules/sites/sites.routes.ts:36` — `['admin', 'superadmin', 'super_admin', 'manager']`

**결정**: enum에 추가하지 않음. 해당 코드에서 `'superadmin'` 제거 (PLAN-ROLE-GUARD-REFACTOR-V1 §2 커밋 5).

### 2-4. `moderator` — ⚠️ 보류

**사용 위치**:
- `routes/kpa/entities/kpa-organization-join-request.entity.ts:20` — `RequestedRole` 타입
- `routes/kpa/controllers/organization-join-request.controller.ts:32` — `VALID_ROLES` 배열
- `routes/users.routes.ts:87` — roles 목록에 포함
- `routes/admin/users.routes.ts:28,45` — Assignable 목록에 포함
- `services/forum/ForumNotificationService.ts:349,356` — moderator 알림 기능

**분석**: KPA 가입 신청 역할과 포럼 모더레이터 두 가지 맥락에서 사용.
실제 DB에 `moderator` 역할 보유 사용자가 있을 가능성 있음.

**결정**: 보류. Phase 5에서 DB 실존 여부 확인 후 결정.
enum에 미추가 (현재 코드는 string literal로 사용 중이므로 기능 정상).

### 2-5. `affiliate` — ⚠️ 보류

**사용 위치**:
- `routes/content/content-assets.routes.ts:459` — `requireRole(['partner','affiliate','seller','supplier'])`
- `routes/admin/users.routes.ts:28-29,45-46` — Assignable 목록에 포함
- `schemas/ds_partner.schema.ts:32` — default_value 'affiliate'
- `scripts/seed-partners.ts:167` — partnerTypes 배열

**분석**: `partner` 역할로 통합 가능한지 검토 필요.
dropshipping 파트너 타입의 세부 분류로 사용됨 (influencer, blogger, affiliate).

**결정**: 보류. `partner`와의 통합 여부는 Commerce/Dropshipping WO에서 결정.
enum에 미추가.

### 2-6. `vendor_manager` — ⚠️ 보류

**사용 위치**:
- `routes/admin/users.routes.ts:28,45` — Assignable 목록에만 포함

**분석**: 코드에서 이 역할을 실제로 체크하는 Guard가 없음.
단순히 관리자가 사용자에게 할당할 수 있는 역할 목록에만 포함.

**결정**: 보류. `vendor`의 sub-role 여부 결정 필요.
실제 사용 패턴이 없으면 Phase 5에서 제거.

### 2-7. `beta_user` — ⚠️ 보류

**사용 위치**:
- `routes/admin/users.routes.ts:28-29,45-46` — Assignable 목록에만 포함

**분석**: Guard 체크 없음. 기능 플래그로 대체 가능.

**결정**: 보류. 실사용 여부 확인 후 기능 플래그 또는 유지 결정.

### 2-8. `staff` — ❌ 제거 대상

**사용 위치**:
- `routes/v1/smtp.routes.ts:13,31,37` — `requireRole(['admin','staff'])`
- `routes/operator-notification.routes.ts:23` — `requireRole(['admin','super_admin','operator','staff'])`
- `database/migrations/20260212000001-CreateCosmeticsStoreTables.ts:71` — 코스메틱 스토어 member role default

**분석**: SMTP 라우트에서만 독립적으로 사용.
ROLE-PHILOSOPHY-V1에서 `operator`로 대체 결정.

**결정**: enum에 추가하지 않음. SMTP 라우트에서 `'staff'` → `'operator'`로 교체.
Cosmetics store의 `staff`는 `CosmeticsStoreMemberRole.STAFF` (다른 레이어)이므로 영향 없음.

---

## 3. enum 정리 전략

### 3-1. 추가할 값 (확정)

```typescript
// types/auth.ts 변경 후
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN       = 'admin',
  OPERATOR    = 'operator',    // ✅ 신규 추가 — 서비스운영자
  MANAGER     = 'manager',
  VENDOR      = 'vendor',
  SELLER      = 'seller',
  USER        = 'user',
  BUSINESS    = 'business',
  PARTNER     = 'partner',
  SUPPLIER    = 'supplier',
  CUSTOMER    = 'customer',   // Deprecated
}
```

### 3-2. 제거하지 않는 값 (BC 유지)

- `CUSTOMER`: deprecated이나 참조 코드 다수. 제거 시 컴파일 오류 가능성.
- 기타 모든 현재 값: 제거 없음.

### 3-3. 미추가 결정 (보류)

- `moderator`, `affiliate`, `vendor_manager`, `beta_user` — Phase 5 재검토
- `staff` — `operator` 교체 후 Guard에서 제거

---

## 4. DTO 정리

### 4-1. `dto/auth/me-response.dto.ts:20`

```typescript
// 현재
role: 'customer' | 'seller' | 'supplier' | 'partner' | 'admin' | 'administrator' | 'manager';

// 변경 후
role: 'customer' | 'seller' | 'supplier' | 'partner' | 'admin' | 'operator' | 'manager';
// 'administrator' 제거, 'operator' 추가
```

---

## 5. DB와의 충돌 가능성 분석

| enum 값 | DB 존재 가능성 | 충돌 위험 |
|---------|-------------|---------|
| OPERATOR = 'operator' | ✅ 높음 (BackfillMigration 대상) | 없음 — 기존 DB 값과 일치 |
| 'administrator' 제거 | 낮음 (BackfillMigration 미처리) | `SELECT COUNT(*) FROM role_assignments WHERE role='administrator'` 확인 필요 |
| 'superadmin' 제거 | 없음 (오타) | 없음 |
| 'staff' 제거 | 낮음 | `SELECT COUNT(*) FROM role_assignments WHERE role='staff'` 확인 필요 |

---

## 6. 적용 순서

```
커밋 1: feat(types): add OPERATOR to UserRole enum
  파일: apps/api-server/src/types/auth.ts
  변경: OPERATOR = 'operator' 추가

커밋 2: fix(dto): update me-response role type, remove administrator alias
  파일: apps/api-server/src/dto/auth/me-response.dto.ts
  변경: 'administrator' → 'operator' 교체
```

> **주의**: Phase 4 (Guard Refactor)를 먼저 완료한 후 진행.
> `administrator` 체크 코드가 먼저 제거되어야 DTO 변경이 의미 있음.

---

## 7. 테스트 체크리스트

- [ ] `tsc --noEmit` — TypeScript 컴파일 오류 없음
- [ ] `UserRole.OPERATOR` 사용 가능 확인
- [ ] requireAdmin에서 `'operator'` 체크 정상 동작
- [ ] `/api/v1/auth/me` 응답의 `role` 필드에 `'operator'` 포함 가능
- [ ] 기존 `admin`, `super_admin` 역할 동작 변화 없음

---

## 8. 롤백 전략

```bash
# 커밋 1 롤백 (enum 추가 취소)
git revert <커밋1해시>

# 커밋 2 롤백 (DTO 변경 취소)
git revert <커밋2해시>
```

---

*Phase 2 산출물 — 코드 변경 없음*
*실행: Phase 5 실행 WO (PLAN-ROLE-DB-NORMALIZATION-V1 이후)*
