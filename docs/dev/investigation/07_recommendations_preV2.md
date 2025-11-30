# 최소 추천 정리 (Pre-V2 Recommendations)

> **조사 일시**: 2025-01-08
> **목적**: 역할 분리형 전환 설계(V2)로 넘어가기 전 최소 선행 정리 항목

---

## 1. 전제 조건 (Prerequisites)

역할 분리형 시스템으로 전환하기 전에 **반드시 해결해야 할** 최소 정리 항목입니다.
이를 해결하지 않으면:
- ❌ 데이터 불일치 발생
- ❌ 마이그레이션 실패
- ❌ 사용자 로그인 불가
- ❌ 권한 체크 오류

---

## 2. 용어/상수 표준화 (Terminology Standardization)

### 2.1 현재 문제점

**역할 enum 불일치**:
```typescript
// API: apps/api-server/src/entities/User.ts
enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  PARTNER = 'partner',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// FE: apps/admin-dashboard/src/pages/users/UsersListClean.tsx
type ActiveTab = 'all' | 'administrator' | 'editor' | 'subscriber';
//                         ^^^^^^^^^^ 'admin'과 불일치
```

**상태 값 불일치**:
```typescript
// User 엔티티
enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  APPROVED = 'approved'  // ACTIVE와 중복?
}

// FE 인터페이스
status: 'active' | 'inactive' | 'pending';  // 'inactive'는 어디서?
```

### 2.2 표준화 작업

**Task 1**: 역할 Enum 통일

| 기존 (FE) | 표준 (API) | 설명 |
|----------|----------|------|
| `administrator` | `admin` | 관리자 |
| `editor` | `editor` | 에디터 (유지) |
| `subscriber` | `customer` | 구독자 → 고객 |
| - | `supplier` | 공급자 (신규) |
| - | `seller` | 판매자 (신규) |
| - | `partner` | 파트너 (신규) |

**Action**:
1. ✅ API의 `UserRole` enum을 **유일한 소스**로 정의
2. ✅ FE는 API의 enum을 **import**하여 사용
3. ✅ 하드코딩된 문자열 (`'administrator'` 등) **모두 제거**

**Task 2**: 상태 값 정리

| 상태 | 설명 | 사용 시점 |
|------|------|----------|
| `PENDING` | 승인 대기 | 회원가입 직후, 역할 신청 시 |
| `APPROVED` | 승인됨 (활성) | 관리자 승인 후 |
| `REJECTED` | 거부됨 | 관리자 거부 시 |
| `SUSPENDED` | 정지됨 | 관리자가 정지 시 |
| `INACTIVE` | 비활성 | 사용자가 탈퇴 시 |

**Action**:
1. ✅ `ACTIVE` 제거 (중복) → `APPROVED`로 통일
2. ✅ FE의 `'inactive'` → `'SUSPENDED'` 또는 `'INACTIVE'`로 명확화
3. ✅ DB 마이그레이션: 기존 `ACTIVE` → `APPROVED` 변환

---

## 3. 공통 컴포넌트 분리 (Shared Components Extraction)

### 3.1 현재 문제점

**중복 코드**:
- 사용자 목록 테이블 (UsersListClean.tsx) → 역할별 복사될 예정
- 사용자 폼 (UserForm.tsx) → 역할별 복사될 예정
- 승인 버튼 → 여러 곳에 흩어져 있을 가능성

### 3.2 공통 컴포넌트 추출

**Task 3**: 재사용 가능한 컴포넌트 분리

| 컴포넌트 | 역할 | 파일 위치 (제안) |
|----------|------|------------------|
| `UserListBase` | 사용자 목록 테이블 (공통 로직) | `components/users/UserListBase.tsx` |
| `UserFormBase` | 사용자 폼 (공통 필드) | `components/users/UserFormBase.tsx` |
| `ApprovalButton` | 승인/거부 버튼 | `components/users/ApprovalButton.tsx` |
| `RoleChip` | 역할 표시 칩 | `components/users/RoleChip.tsx` |
| `StatusBadge` | 상태 표시 뱃지 | `components/users/StatusBadge.tsx` |

**UserListBase 예시**:
```typescript
interface UserListBaseProps<T> {
  users: T[];
  columns: ColumnDef<T>[];
  actions?: ActionDef<T>[];
  onSelect?: (selectedIds: string[]) => void;
  onEdit?: (user: T) => void;
  onDelete?: (user: T) => void;
}

export function UserListBase<T extends BaseUser>(props: UserListBaseProps<T>) {
  // 공통 로직: 정렬, 페이지네이션, 선택, 검색 등
}
```

**사용 예시**:
```typescript
// SuppliersList.tsx
function SuppliersList() {
  return (
    <UserListBase
      users={suppliers}
      columns={supplierColumns}  // 공급자 전용 컬럼
      actions={supplierActions}  // 공급자 전용 액션
    />
  );
}
```

---

## 4. 서버 미들웨어로 권한 일원화 (Centralized ACL Middleware)

### 4.1 현재 문제점

**권한 체크 산재**:
- ⏳ 컨트롤러 내부에서 권한 체크 (추정)
- ⏳ 프론트엔드에서도 메뉴 필터링
- ❌ 일관성 없음, 누락 가능성

### 4.2 미들웨어 기반 ACL

**Task 4**: 권한 체크 미들웨어 구현

**파일**: `apps/api-server/src/middleware/rbac.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/api-error';

/**
 * 역할 기반 접근 제어 미들웨어
 * @param allowedRoles - 허용된 역할 목록
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const userRoles = req.user.getRoleNames();  // ['supplier', 'customer']
    const hasRole = userRoles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      throw new UnauthorizedError(
        `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`,
        'FORBIDDEN'
      );
    }

    next();
  };
}

/**
 * 권한 기반 접근 제어 미들웨어 (향후 구현)
 * @param requiredPermissions - 필요한 권한 목록
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const hasPermission = req.user.hasAllPermissions(requiredPermissions);

    if (!hasPermission) {
      throw new UnauthorizedError(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        'FORBIDDEN'
      );
    }

    next();
  };
}
```

**사용 예시**:
```typescript
// apps/api-server/src/routes/suppliers.routes.ts
import { requireRole } from '../middleware/rbac.middleware';

// 공급자 목록 조회 (관리자 또는 본인만)
router.get('/suppliers',
  authenticate,
  requireRole('admin', 'supplier'),  // ← 미들웨어로 권한 체크
  asyncHandler(async (req, res) => {
    // 컨트롤러는 비즈니스 로직만 처리
  })
);
```

**프론트엔드는 보조**:
- ✅ 메뉴 필터링: UX 개선용 (보안 아님)
- ✅ 버튼 비활성화: UX 개선용 (보안 아님)
- ❌ **실제 권한 체크는 API에서만**

---

## 5. 레거시 필드 정리 계획 (Legacy Field Cleanup Plan)

### 5.1 현재 문제점

**3중 역할 필드 혼재**:
```typescript
// User 엔티티
role: UserRole;          // 1. 레거시 단일
roles: string[];         // 2. 레거시 다중
dbRoles: Role[];         // 3. 신규 다중 (ManyToMany)
activeRole: Role | null; // 4. 현재 활성 역할
```

### 5.2 단계별 정리 계획

**Phase 1**: 데이터 마이그레이션 (안전)
1. ✅ 모든 `role` 값을 `dbRoles`로 복사
2. ✅ 모든 `roles[]` 값을 `dbRoles`로 복사
3. ✅ 중복 제거
4. ✅ `activeRole` 설정 (첫 번째 dbRole 또는 role)
5. ✅ 검증: `role`, `roles[]`, `dbRoles[]` 일치 확인

**Phase 2**: 코드 전환 (점진적)
1. ✅ `hasRole()` 메소드 간소화:
   ```typescript
   // Before
   hasRole(role: string): boolean {
     const hasDbRole = this.dbRoles?.some(r => r.name === role) || false;
     const hasLegacyRoles = this.roles?.includes(role) || false;  // ← 제거
     const hasLegacyRole = this.role === role;  // ← 제거
     return hasDbRole || hasLegacyRoles || hasLegacyRole;
   }

   // After
   hasRole(role: string): boolean {
     return this.dbRoles?.some(r => r.name === role) || false;
   }
   ```

2. ✅ API 응답에서 `role`, `roles[]` 제거:
   ```typescript
   // Before
   user: {
     role: user.role,  // ← 제거
     roles: user.getRoleNames(),  // ← 제거
     dbRoles: user.dbRoles,
     activeRole: user.getActiveRole()
   }

   // After
   user: {
     roles: user.dbRoles,  // dbRoles를 roles로 rename
     activeRole: user.getActiveRole()
   }
   ```

3. ✅ FE에서 `user.role` 사용 제거:
   ```typescript
   // Before
   if (user.role === 'admin') { ... }

   // After
   if (user.hasRole('admin')) { ... }
   // 또는
   if (user.activeRole?.name === 'admin') { ... }
   ```

**Phase 3**: 레거시 필드 제거 (마지막)
1. ✅ DB에서 `role`, `roles` 컬럼 제거 (ALTER TABLE)
2. ✅ User 엔티티에서 필드 제거
3. ✅ 마이그레이션 파일 작성

---

## 6. 테스트 데이터 준비 (Test Data Preparation)

### 6.1 테스트 시나리오

**Task 5**: 역할별 테스트 계정 생성

| 역할 | 이메일 | 상태 | 목적 |
|------|--------|------|------|
| `super_admin` | `superadmin@test.com` | APPROVED | 모든 권한 테스트 |
| `admin` | `admin@test.com` | APPROVED | 일반 관리 권한 테스트 |
| `supplier` | `supplier@test.com` | APPROVED | 공급자 기능 테스트 |
| `supplier` | `supplier-pending@test.com` | PENDING | 승인 대기 테스트 |
| `seller` | `seller@test.com` | APPROVED | 판매자 기능 테스트 |
| `partner` | `partner@test.com` | APPROVED | 파트너 기능 테스트 |
| `customer` | `customer@test.com` | APPROVED | 일반 고객 테스트 |

**Seeder 스크립트**:
```typescript
// apps/api-server/src/database/seeds/test-users.seed.ts
export async function seedTestUsers() {
  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);

  // 역할 조회
  const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
  const supplierRole = await roleRepo.findOne({ where: { name: 'supplier' } });
  // ...

  // 테스트 계정 생성
  const testUsers = [
    {
      email: 'admin@test.com',
      password: 'Test1234!',
      name: 'Test Admin',
      dbRoles: [adminRole],
      activeRole: adminRole,
      status: UserStatus.APPROVED
    },
    // ...
  ];

  for (const userData of testUsers) {
    const existing = await userRepo.findOne({ where: { email: userData.email } });
    if (!existing) {
      await userRepo.save(userData);
    }
  }
}
```

---

## 7. 문서화 (Documentation)

### 7.1 필수 문서

**Task 6**: 다음 문서 작성

| 문서 | 경로 | 목적 |
|------|------|------|
| 역할 정의 | `docs/roles-and-permissions.md` | 각 역할의 설명 및 권한 |
| API 명세 | `docs/api/user-management.md` | 사용자 관리 API 엔드포인트 |
| 마이그레이션 가이드 | `docs/migration/role-field-cleanup.md` | 레거시 필드 정리 절차 |
| 승인 흐름 | `docs/flows/approval-flow.md` | 역할 신청/승인 프로세스 |

---

## 8. 모니터링 및 로깅 (Monitoring & Logging)

### 8.1 로그 추가

**Task 7**: 주요 이벤트 로깅

| 이벤트 | 로그 레벨 | 포함 정보 |
|--------|----------|----------|
| 회원가입 | INFO | `email`, `role`, `status` |
| 로그인 | INFO | `userId`, `email`, `ip` |
| 역할 변경 | WARN | `userId`, `before`, `after`, `changedBy` |
| 승인/거부 | WARN | `userId`, `role`, `action`, `approvedBy`, `reason` |
| 권한 거부 | WARN | `userId`, `requestedResource`, `requiredPermission` |

**구현**:
```typescript
import { Logger } from '@nestjs/common';

// 승인 시
logger.warn('User role approved', {
  userId: user.id,
  email: user.email,
  role: targetRole,
  approvedBy: admin.id,
  approvedAt: new Date()
});
```

---

## 9. 체크리스트 (Pre-V2 Checklist)

### 9.1 필수 완료 항목 (Must-Have)

- [ ] **용어/상수 표준화**
  - [ ] UserRole enum 통일 (FE ↔ API)
  - [ ] UserStatus enum 정리 (ACTIVE → APPROVED)
  - [ ] 하드코딩 문자열 제거

- [ ] **공통 컴포넌트 분리**
  - [ ] UserListBase 추출
  - [ ] UserFormBase 추출
  - [ ] ApprovalButton, RoleChip, StatusBadge 추출

- [ ] **권한 미들웨어**
  - [ ] requireRole() 미들웨어 구현
  - [ ] 주요 라우트에 적용

- [ ] **레거시 필드 마이그레이션**
  - [ ] role → dbRoles 데이터 이행
  - [ ] roles[] → dbRoles 데이터 이행
  - [ ] 데이터 검증 (불일치 제로)

- [ ] **테스트 데이터**
  - [ ] 역할별 테스트 계정 생성
  - [ ] Seeder 스크립트 작성

### 9.2 권장 완료 항목 (Nice-to-Have)

- [ ] **문서화**
  - [ ] 역할 정의 문서
  - [ ] API 명세 문서
  - [ ] 마이그레이션 가이드

- [ ] **로깅**
  - [ ] 주요 이벤트 로깅 추가
  - [ ] 로그 모니터링 대시보드 (선택)

---

## 10. 다음 단계 (Next Steps)

1. ✅ **현황 조사 완료** (01~07 문서)
2. ⏳ **Pre-V2 작업 착수** (이 문서의 체크리스트)
3. ⏳ **V2 설계안 작성** (역할 분리형 전환 설계)
4. ⏳ **V2 구현 시작** (P0 → P1 → P2)

---

**작성**: Claude Code
**최종 업데이트**: 2025-01-08
**다음 문서**: `V2_design.md` (역할 분리형 전환 설계안)
