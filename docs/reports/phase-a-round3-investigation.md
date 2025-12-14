# Phase A Round 3: Issue Confirmation Deep Investigation

**Date**: 2025-12-14
**Branch**: feature/cms-core
**Status**: Completed

---

## Executive Summary

Round 3 조사 결과, P0/P1 이슈 중 **실제로 문제가 확정된 항목**과 **문제가 아닌 것으로 확인된 항목**을 분리했습니다.

### 핵심 발견

| ID | 이슈 | 결과 | 심각도 |
|----|------|------|--------|
| P0-1 | Navigation 3패턴 혼재 | **CONFIRMED - 심각** | Critical |
| P0-2 | Template-View-Navigation mismatch | **CONFIRMED - 심각** | Critical |
| P0-3 | User.role deprecated 잔존 | **CONFIRMED** | Medium |
| P0-4 | Product 공통구조 불명확 | Not an issue | - |
| P1-1 | Member 필드 중복 | **CONFIRMED** | Low |
| P1-2 | ACF naming 혼재 | Not an issue | - |
| P1-3 | ACF manifest↔DB sync 부재 | Not an issue (sync exists) | - |
| P1-4 | Category CPT/ACF 혼재 | Not an issue | - |
| P1-5 | View Template naming 불일관 | **CONFIRMED** (part of P0-2) | Medium |

---

## [Round 3 Confirmed Issues]

### Issue #1: Navigation System Disconnect (Critical)

**문제 상태**: CONFIRMED

**Root Cause**:
Manifest에 정의된 navigation 패턴(`menus.admin`, `navigation.menus`, `navigation.admin`)이
**프론트엔드에서 전혀 사용되지 않음**.

프론트엔드는 `wordpressMenuFinal.tsx` 파일에 **하드코딩된 메뉴**를 사용.

**Evidence**:
```typescript
// apps/admin-dashboard/src/hooks/useAdminMenu.ts
import { wordpressMenuItems } from '@/config/wordpressMenuFinal';
// ...
const allMenuItems = injectCPTMenuItems([...wordpressMenuItems], cptMenuItems);
```

```typescript
// apps/admin-dashboard/src/config/wordpressMenuFinal.tsx
export const wordpressMenuItems: MenuItem[] = [
  // 368줄의 하드코딩된 메뉴 정의
];
```

**Impact**:
- AppStore에서 앱 설치 시 메뉴가 자동 등록되지 않음
- 개발자가 새 앱 추가 시 `wordpressMenuFinal.tsx`를 수동 수정해야 함
- Manifest의 navigation 정의가 무의미함
- 3가지 manifest 패턴 불일치는 실제로는 문제가 아님 (모두 무시되므로)

**Affected Services**: All apps (40+ manifests with navigation definitions)

---

### Issue #2: Route/View Static Configuration (Critical)

**문제 상태**: CONFIRMED

**Root Cause**:
`App.tsx`에 300줄 이상의 **하드코딩된 Route 정의**가 있음.
Manifest의 `viewTemplates`, `frontendRoutes`가 동적으로 사용되지 않음.

**Evidence**:
```typescript
// apps/admin-dashboard/src/App.tsx (1458줄)
<Routes>
  <Route path="/admin/membership/dashboard" element={...} />
  <Route path="/admin/membership/members" element={...} />
  // ... 100+ more routes
</Routes>
```

**Impact**:
- 새 앱 추가 시 App.tsx 수동 수정 필요
- viewTemplates manifest가 라우팅에 사용되지 않음
- 동적 라우팅 불가능
- 앱 비활성화 시 라우트가 여전히 존재 (404 또는 오류 발생 가능)

**Affected Services**: All apps with viewTemplates/frontendRoutes

---

### Issue #3: User.role Deprecated Fields Still Present

**문제 상태**: CONFIRMED

**Root Cause**:
User entity에 `@deprecated` 표시된 `role`, `roles`, `dbRoles`, `activeRole` 필드가 여전히 존재하고,
일부 코드에서 여전히 사용됨.

**Evidence**:
```typescript
// apps/api-server/src/modules/auth/entities/User.ts
/**
 * @deprecated Phase P0: DO NOT USE for authorization
 */
@Column({ type: 'varchar', length: 50, default: 'customer' })
role!: UserRole;

/**
 * @deprecated Phase P0: DO NOT USE for authorization
 */
@Column({ type: 'simple-array', default: '' })
roles!: string[];
```

**Usage in code**:
- `account-linking.service.ts`
- Migration scripts (expected)
- Admin creation scripts

**Impact**:
- RBAC 마이그레이션 불완전
- role_assignments 테이블과 중복 데이터
- 권한 체크 시 혼란 가능성

**Severity**: Medium (마이그레이션 진행 중이므로)

---

### Issue #4: Member/User Field Duplication

**문제 상태**: CONFIRMED (Low Priority)

**Root Cause**:
`membership-yaksa` Member entity가 User와 중복 필드를 가짐.

**Duplicated Fields**:
| Field | User | Member | Issue |
|-------|------|--------|-------|
| phone | O | O | 중복 |
| email | O | O | 중복 |
| name | O | O | 중복 |

**Evidence**:
```typescript
// packages/membership-yaksa/src/backend/entities/Member.ts
@Column({ type: 'varchar', length: 20, nullable: true })
phone?: string;

@Column({ type: 'varchar', length: 255, nullable: true })
email?: string;

@Column({ type: 'varchar', length: 100 })
name!: string;
```

**Impact**:
- 데이터 불일치 가능성 (User.phone ≠ Member.phone)
- 업데이트 시 양쪽 동기화 필요
- 불필요한 저장 공간

**Severity**: Low (현재 기능에 영향 없음, 장기적 기술 부채)

---

## [Issues NOT Confirmed as Problems]

### P0-4: Product 공통구조 불명확

**결과**: Not an issue

**Reason**:
- ProductMaster.productType enum으로 분류 (COSMETICS, HEALTH, etc.)
- ProductMaster.attributes JSONB로 도메인별 확장
- Extension App들이 적절히 확장 패턴 사용

---

### P1-2: ACF naming 혼재 (camelCase vs snake_case)

**결과**: Not an issue

**Reason**:
- ACF field keys: 모두 **camelCase** 사용 (`skinType`, `drugCode`)
- Database tables: **snake_case** 사용 (`cosmetics_skin_types`) - 이는 정상
- 일관된 패턴 적용됨

---

### P1-3: ACF manifest↔DB sync 부재

**결과**: Not an issue (sync mechanism exists)

**Reason**:
lifecycle `install.ts`에서 `registerACFGroup()` 함수로 DB에 동기화:

```typescript
// packages/forum-cosmetics/src/lifecycle/install.ts
async function registerACFGroup(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO cms_acf_group (id, group_id, name, label, description, status, metadata)
    VALUES (...)
    ON CONFLICT (group_id) DO UPDATE SET ...
  `);
}
```

---

### P1-4: Category CPT/ACF 혼재

**결과**: Not an issue

**Reason**:
- Category는 독립 Entity로 관리 (ForumCategory, CosmeticsCategory)
- ACF는 Post 메타데이터 용도로만 사용
- 역할이 명확히 분리됨

---

## [Root Causes]

### RC-1: 아키텍처 단절 (Navigation/Routes)

**원인**:
초기 개발 시 manifest 기반 동적 로딩 시스템을 설계했으나,
프론트엔드에서 실제로 구현하지 않고 하드코딩으로 진행함.

**결과**:
- Manifest navigation → 무시됨
- Manifest viewTemplates → 무시됨
- 모든 UI 경로 하드코딩

### RC-2: RBAC 마이그레이션 미완료

**원인**:
Phase P0에서 role_assignments 기반 RBAC를 도입했으나,
기존 User.role 필드를 완전히 제거하지 않음.

**결과**:
- deprecated 필드 잔존
- 일부 레거시 코드에서 여전히 사용

### RC-3: Member 도메인 분리 과정에서 필드 복제

**원인**:
membership-yaksa를 설계할 때 User와의 관계를 userId 참조로 설정했으나,
조회 편의성을 위해 일부 필드를 복제함.

**결과**:
- phone, email, name 중복
- 데이터 동기화 부담

---

## [Impact Analysis]

### High Impact

| Issue | 영향 서비스 | 영향 강도 |
|-------|------------|----------|
| Navigation Disconnect | 모든 AppStore 앱 (40+) | High |
| Route Static Config | 모든 앱 | High |

### Medium Impact

| Issue | 영향 서비스 | 영향 강도 |
|-------|------------|----------|
| User.role deprecated | auth, RBAC 관련 | Medium |

### Low Impact

| Issue | 영향 서비스 | 영향 강도 |
|-------|------------|----------|
| Member field duplication | membership-yaksa | Low |

---

## [Refactoring Requirements Draft]

### RR-1: Dynamic Navigation System (P0)

**목적**: Manifest 기반 동적 메뉴 로딩 구현

**범위**:
1. NavigationRegistry 서비스 구현
2. AppStore 설치 시 메뉴 자동 등록
3. `wordpressMenuFinal.tsx` 제거 또는 fallback으로 전환
4. manifest 패턴 표준화 (`menus.admin` 채택)

**예상 리소스**: 3-5일

---

### RR-2: Dynamic Route System (P0)

**목적**: Manifest 기반 동적 라우팅 구현

**범위**:
1. RouteRegistry 서비스 구현
2. App.tsx의 하드코딩된 Route → 동적 생성
3. viewTemplates manifest 활용
4. AppRouteGuard와 통합

**예상 리소스**: 5-7일

---

### RR-3: User.role Deprecated Field Removal (P1)

**목적**: RBAC 마이그레이션 완료

**범위**:
1. User entity에서 deprecated 필드 제거
2. 관련 코드 마이그레이션 완료 확인
3. role_assignments 전용 사용 검증

**예상 리소스**: 2-3일

---

### RR-4: Member Field Deduplication (P2)

**목적**: Member/User 필드 중복 제거

**범위**:
1. Member.phone, email, name → User 참조로 변경
2. 기존 데이터 마이그레이션
3. 조회 로직 수정

**예상 리소스**: 3-5일 (데이터 마이그레이션 포함)

---

## Files Examined

### Navigation Investigation
- `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx`
- `apps/admin-dashboard/src/hooks/useAdminMenu.ts`
- `apps/admin-dashboard/src/components/layout/AdminSidebar.tsx`
- 40+ manifest files with navigation definitions

### Route Investigation
- `apps/admin-dashboard/src/App.tsx`
- Manifest viewTemplates across packages

### User/Member Investigation
- `apps/api-server/src/modules/auth/entities/User.ts`
- `packages/membership-yaksa/src/backend/entities/Member.ts`

### ACF Investigation
- `packages/cms-core/src/entities/CmsAcfFieldGroup.entity.ts`
- `packages/forum-cosmetics/src/lifecycle/install.ts`
- Various manifest ACF definitions

---

## Next Steps

이 보고서를 기반으로 **Phase A - Step 5: CMS Core Refactoring Work Order**를 생성할 수 있습니다.

### 권장 우선순위

1. **RR-1 + RR-2**: Navigation + Route 동적 시스템 (함께 진행 권장)
2. **RR-3**: User.role 제거 (독립적 진행 가능)
3. **RR-4**: Member 필드 정리 (장기 과제)

---

*Report Generated: 2025-12-14*
*Analyst: Claude Code*
*Branch: feature/cms-core*
