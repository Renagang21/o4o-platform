# RBAC (Role-Based Access Control) 구조 전수 조사

**작성일**: 2025-11-30
**조사 범위**: Role/Permission 엔티티, RoleAssignment, 권한 시스템
**조사 대상 파일**:
- `/apps/api-server/src/entities/Role.ts`
- `/apps/api-server/src/entities/Permission.ts`
- `/apps/api-server/src/entities/RoleAssignment.ts`
- `/apps/api-server/src/types/auth.ts`
- `/apps/api-server/src/database/migrations/1810000000000-CreateRolePermissionTables.ts`
- `/apps/api-server/src/database/migrations/3000000000000-CreateZeroDataRoleManagementTables.ts`

---

## 1. 현재 RBAC 구조 개요

### 1.1 핵심 엔티티

O4O Platform은 **이중 RBAC 시스템**을 운영 중:

| 시스템 | 엔티티 | 상태 | 비고 |
|--------|--------|------|------|
| **레거시** | `User.role`, `User.roles`, `User.dbRoles` | DEPRECATED | 하위 호환용 유지 |
| **신규 (P0)** | `RoleAssignment` | ACTIVE | 권장 사용 |

### 1.2 엔티티 관계도

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│    User     │──1:N──│RoleAssignment│──N:1──│     Role     │
└─────────────┘       └──────────────┘       └──────────────┘
                                                      │
                                                      │ N:N
                                                      │
                                              ┌───────▼──────┐
                                              │  Permission  │
                                              └──────────────┘
```

---

## 2. Role 엔티티 구조

### 2.1 Role 필드 정의

**파일**: `/apps/api-server/src/entities/Role.ts`

```typescript
@Entity('roles')
class Role {
  id: string (UUID)
  name: string (unique, indexed)  // 'admin', 'supplier', 'seller'
  displayName: string             // 'Administrator'
  description?: string
  isActive: boolean
  isSystem: boolean               // 시스템 역할 (삭제 불가)
  createdAt: Date
  updatedAt: Date
}
```

### 2.2 Role - Permission 관계

```typescript
@ManyToMany('Permission', 'roles', { eager: true })
@JoinTable({
  name: 'role_permissions',
  joinColumn: { name: 'role_id' },
  inverseJoinColumn: { name: 'permission_id' }
})
permissions!: Permission[]

@ManyToMany('User', 'roles')
users?: User[]
```

**테이블 구조**:
```sql
CREATE TABLE role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);
```

### 2.3 Role 헬퍼 메서드

```typescript
class Role {
  // 권한 확인
  hasPermission(permissionKey: string): boolean {
    return this.permissions?.some(p => p.key === permissionKey && p.isActive) || false;
  }

  hasAnyPermission(permissionKeys: string[]): boolean {
    return permissionKeys.some(key => this.hasPermission(key));
  }

  hasAllPermissions(permissionKeys: string[]): boolean {
    return permissionKeys.every(key => this.hasPermission(key));
  }

  // 활성 권한 목록
  getActivePermissions(): Permission[] {
    return this.permissions?.filter(p => p.isActive) || [];
  }

  getPermissionKeys(): string[] {
    return this.getActivePermissions().map(p => p.key);
  }
}
```

---

## 3. Permission 엔티티 구조

### 3.1 Permission 필드 정의

**파일**: `/apps/api-server/src/entities/Permission.ts`

```typescript
@Entity('permissions')
class Permission {
  id: string (UUID)
  key: string (unique, indexed)  // 'users.view', 'content.create'
  description: string
  category: string (indexed)      // 'users', 'content', 'admin'
  appId?: string (indexed)        // 앱 소속 권한 (NULL = 시스템)
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 3.2 Permission 패턴

**권한 키 구조**: `{category}.{action}`

| 카테고리 | 예시 권한 | 설명 |
|----------|-----------|------|
| `users` | `users.view`, `users.edit`, `users.delete` | 회원 관리 |
| `content` | `content.create`, `content.publish` | 콘텐츠 관리 |
| `categories` | `categories:read`, `categories:write` | 카테고리 |
| `tags` | `tags:read`, `tags:write` | 태그 |
| `admin` | `admin.settings`, `admin.analytics` | 시스템 관리 |
| `acf` | `acf.manage` | 커스텀 필드 |
| `cpt` | `cpt.manage` | 커스텀 포스트 타입 |
| `api` | `api.access`, `api.admin` | API 접근 |

### 3.3 Permission 헬퍼 메서드

```typescript
class Permission {
  static parseKey(key: string): { category: string; action: string } {
    const [category, action] = key.split('.');
    return { category, action };
  }

  getCategory(): string {
    return Permission.parseKey(this.key).category;
  }

  getAction(): string {
    return Permission.parseKey(this.key).action;
  }
}
```

---

## 4. RoleAssignment 엔티티 (신규 P0 시스템)

### 4.1 RoleAssignment 필드 정의

**파일**: `/apps/api-server/src/entities/RoleAssignment.ts`

```typescript
@Entity('role_assignments')
@Unique(['userId', 'role', 'isActive'])  // 동일 역할 1회만 active
class RoleAssignment {
  id: string (UUID)

  userId: string (indexed, FK to users)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User

  role: string (indexed)  // 'admin', 'supplier', 'seller'

  isActive: boolean (indexed, default: true)

  // 유효 기간
  validFrom: Date (default: NOW())
  validUntil?: Date  // NULL = 무기한

  // 할당 정보
  assignedAt: Date (default: NOW())
  assignedBy?: string (FK to users)

  createdAt: Date
  updatedAt: Date
}
```

### 4.2 핵심 제약사항

#### Unique Constraint
```sql
CREATE UNIQUE INDEX "UQ_role_assignments_user_role_active"
ON "role_assignments" ("user_id", "role")
WHERE "is_active" = true;
```

**의미**: 한 회원은 동일 역할을 **1번만 active** 상태로 보유 가능

#### Indexes
```typescript
@Index(['userId'])
@Index(['role'])
@Index(['isActive'])
@Index(['userId', 'isActive'])
@Index(['userId', 'role'])
```

### 4.3 RoleAssignment 헬퍼 메서드

```typescript
class RoleAssignment {
  // 현재 시점 유효성 검사
  isValidNow(): boolean {
    if (!this.isActive) return false;

    const now = new Date();

    // validFrom 체크
    if (this.validFrom > now) return false;

    // validUntil 체크
    if (this.validUntil && this.validUntil < now) return false;

    return true;
  }

  // 역할 활성화/비활성화
  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }

  // 유효 기간 설정
  setValidityPeriod(from: Date, until?: Date): void {
    this.validFrom = from;
    this.validUntil = until;
  }
}
```

---

## 5. User의 역할/권한 조회 메서드

### 5.1 레거시 Role 필드 (DEPRECATED)

**User 엔티티**:
```typescript
@Entity('users')
class User {
  // DEPRECATED 필드들
  role: UserRole  // 단일 역할 (enum)
  roles: string[]  // 다중 역할 배열
  dbRoles?: Role[]  // ManyToMany 관계
  activeRole?: Role  // 활성 역할

  permissions: string[]  // 직접 부여된 권한
}
```

**문제점**:
- ❌ 역할 할당 이력 추적 불가
- ❌ 유효 기간 관리 불가
- ❌ 할당자 기록 불가
- ❌ 임시 권한 부여 불가

### 5.2 User 역할 확인 메서드

```typescript
class User {
  // 역할 확인
  hasRole(role: UserRole | string): boolean {
    // 1. 신규 dbRoles 확인
    const hasDbRole = this.dbRoles?.some(r => r.name === role) || false;
    // 2. 레거시 roles 배열 확인
    const hasLegacyRoles = this.roles?.includes(role) || false;
    // 3. 레거시 role 필드 확인
    const hasLegacyRole = this.role === role;
    return hasDbRole || hasLegacyRoles || hasLegacyRole;
  }

  hasAnyRole(roles: (UserRole | string)[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  }
}
```

### 5.3 User 권한 확인 메서드

```typescript
class User {
  // 모든 권한 반환 (Role + 직접 부여)
  getAllPermissions(): string[] {
    // 레거시 관리자는 모든 권한
    if (this.isAdmin()) {
      return [
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'content.view', 'content.create', 'content.edit', 'content.delete',
        'admin.settings', 'admin.analytics', ...
      ];
    }

    // Role 권한 + 직접 부여 권한 병합
    const rolePermissions = this.dbRoles?.flatMap(role => role.getPermissionKeys()) || [];
    const directPermissions = this.permissions || [];
    return [...new Set([...rolePermissions, ...directPermissions])];
  }

  hasPermission(permission: string): boolean {
    return this.getAllPermissions().includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.some(p => userPermissions.includes(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.every(p => userPermissions.includes(p));
  }
}
```

---

## 6. UserRole Enum 정의

### 6.1 현재 UserRole 목록

**파일**: `/apps/api-server/src/types/auth.ts`

```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDOR = 'vendor',
  SELLER = 'seller',
  USER = 'user',           // 일반 회원 (기존 CUSTOMER)
  BUSINESS = 'business',
  PARTNER = 'partner',     // 제휴 마케팅, 커미션
  SUPPLIER = 'supplier',   // 공급자 (드랍쉬핑)

  // 레거시
  MANAGER = 'manager',
  CUSTOMER = 'customer'    // DEPRECATED: USER 사용 권장
}
```

### 6.2 역할별 권한 매핑 (추정)

| 역할 | 주요 권한 | 용도 |
|------|-----------|------|
| `super_admin` | 전체 권한 | 시스템 관리자 |
| `admin` | 대부분 권한 | 관리자 |
| `manager` | 콘텐츠 관리 | 매니저 |
| `supplier` | 상품 등록, 재고 관리 | 공급자 |
| `seller` | 상품 판매, 주문 관리 | 판매자 |
| `partner` | 제휴 링크, 커미션 조회 | 파트너 |
| `user` | 기본 권한 | 일반 회원 |

**문제**: 역할-권한 매핑이 **코드에 하드코딩**되어 있음 (DB 기반 아님)

---

## 7. 약사회 서비스 역할 요구사항 분석

### 7.1 약사회 필요 역할 목록

| 역할 | 설명 | 권한 | 현재 UserRole 매핑 |
|------|------|------|-------------------|
| `pharmacist` | 정회원 (면허 보유) | 교육 이수, 포럼 작성 | ❌ 없음 |
| `pharmacist_student` | 준회원 (약학대생) | 일부 교육 제한 | ❌ 없음 |
| `branch_admin` | 지부 관리자 | 지부 회원 관리, 교육 관리 | ❌ 없음 |
| `division_admin` | 분회 관리자 | 분회 회원 관리, 포럼 관리 | ❌ 없음 |
| `national_admin` | 본회 관리자 | 전체 조직 관리 | `admin` (유사) |
| `education_manager` | 교육 담당자 | 교육 과정 관리, 이수 승인 | ❌ 없음 |

### 7.2 조직 기반 역할 필요성

**문제**: 현재 역할은 **전역(global) 범위**만 지원

**예시**:
- "서울지부 관리자" ≠ "경기지부 관리자"
- 두 사람 모두 `branch_admin` 역할이지만, **관리 범위가 다름**

**현재 시스템**:
```typescript
// 불가능
RoleAssignment {
  userId: 'user1',
  role: 'branch_admin',
  // ❌ organizationId 필드 없음
}
```

**필요 구조**:
```typescript
// 조직 범위 역할
RoleAssignment {
  userId: 'user1',
  role: 'branch_admin',
  scopeType: 'organization',
  scopeId: 'seoul-branch-uuid'  // 서울지부
}

RoleAssignment {
  userId: 'user2',
  role: 'branch_admin',
  scopeType: 'organization',
  scopeId: 'gyeonggi-branch-uuid'  // 경기지부
}
```

---

## 8. 조직 단위 권한 제어 가능 여부

### 8.1 현재 권한 시스템의 범위

**Permission 엔티티**:
```typescript
@Entity('permissions')
class Permission {
  id: string
  key: string  // 'users.view'
  category: string
  appId?: string  // 앱 소속 (앱 기반 격리)
  // ❌ organizationId 없음
}
```

**문제점**:
- ✅ 앱별 권한 격리 가능 (`appId`)
- ❌ **조직별 권한 격리 불가**

### 8.2 조직 기반 권한 제어 사례

#### 케이스 1: "서울지부 회원만 조회"
```typescript
// 필요 권한: 'users.view' + organizationId = 'seoul-branch'

// 현재 시스템
hasPermission('users.view')  // ✅ 가능
// ❌ 하지만 어떤 조직의 회원을 볼 수 있는지 구분 불가

// 필요 시스템
hasPermission('users.view', { organizationId: 'seoul-branch' })
```

#### 케이스 2: "강남분회 포럼 게시글 작성"
```typescript
// 필요 권한: 'forum.post' + organizationId = 'gangnam-division'

// 현재 시스템
// ❌ 조직 범위 권한 미지원
// → Forum Community 가입으로 우회

// 필요 시스템
hasPermission('forum.post', { organizationId: 'gangnam-division' })
```

### 8.3 권한 상속 (계층 기반)

**요구사항**:
- 서울지부 관리자 = 모든 하위 분회 관리 가능
- 본회 관리자 = 모든 지부/분회 관리 가능

**필요 로직**:
```typescript
async hasOrganizationPermission(
  userId: string,
  permission: string,
  targetOrgId: string
): Promise<boolean> {
  // 1. 해당 조직에 대한 직접 권한 확인
  const directRole = await roleAssignmentRepo.findOne({
    where: {
      userId,
      role: 'branch_admin',
      scopeId: targetOrgId,
      isActive: true
    }
  });
  if (directRole) return true;

  // 2. 상위 조직 권한 확인 (상속)
  const ancestors = await getAncestorOrganizations(targetOrgId);
  for (const ancestor of ancestors) {
    const ancestorRole = await roleAssignmentRepo.findOne({
      where: {
        userId,
        role: 'branch_admin',
        scopeId: ancestor.id,
        isActive: true
      }
    });
    if (ancestorRole) return true;
  }

  return false;
}
```

---

## 9. 역할 신청/승인 프로세스

### 9.1 RoleEnrollment (역할 신청)

**파일**: `/apps/api-server/src/database/migrations/3000000000000-CreateZeroDataRoleManagementTables.ts`

```typescript
@Entity('role_enrollments')
class RoleEnrollment {
  id: string (UUID)
  userId: string (FK to users)
  role: string  // 신청 역할

  status: 'PENDING' | 'APPROVED' | 'REJECTED'

  applicationData: JSONB  // 신청 시 제출 데이터
  reviewedAt?: Date
  reviewedBy?: string (FK to users)
  reviewNote?: string

  createdAt: Date
  updatedAt: Date
}
```

**관계**:
```typescript
@ManyToOne(() => User, { onDelete: 'CASCADE' })
user!: User

@ManyToOne(() => User, { onDelete: 'SET NULL' })
reviewer?: User
```

### 9.2 역할 신청 → 승인 → 할당 흐름

```
1. 회원이 역할 신청
   → RoleEnrollment(status=PENDING) 생성
   → applicationData에 증빙 서류 등 저장

2. 관리자가 신청 검토
   → KYC 서류 확인
   → RoleEnrollment(status=APPROVED, reviewedBy=adminId)

3. 시스템이 역할 할당
   → RoleAssignment(userId, role, isActive=true) 생성
   → enrollmentId로 RoleEnrollment 참조

4. 역할 활성화
   → 회원은 해당 역할 권한 획득
```

### 9.3 KYC Documents

```typescript
@Entity('kyc_documents')
class KycDocument {
  id: string
  userId: string (FK to users)
  enrollmentId?: string (FK to role_enrollments)

  documentType: string  // 'business_license', 'id_card'
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string

  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  verifiedAt?: Date
  verifiedBy?: string (FK to users)
  verificationNote?: string

  createdAt: Date
  updatedAt: Date
}
```

**용도**:
- 공급자(Supplier) 신청 시 사업자등록증
- 판매자(Seller) 신청 시 통신판매업 신고증
- **약사 신청 시 약사 면허증** (추가 필요)

---

## 10. 역할별 프로필 (Profile) 구조

### 10.1 현재 프로필 엔티티

역할 승인 시 자동 생성되는 프로필:

```typescript
// 공급자 프로필
@Entity('supplier_profiles')
class SupplierProfile {
  id: string
  userId: string (unique, FK to users)
  companyName: string
  taxId?: string
  businessEmail?: string
  bankName?: string
  accountNumber?: string
  warehouseAddress?: string
  metadata: JSONB
}

// 판매자 프로필
@Entity('seller_profiles')
class SellerProfile {
  id: string
  userId: string (unique, FK to users)
  storeName: string
  storeUrl?: string
  salesChannel?: string
  companyName?: string
  taxId?: string
  bankName?: string
  accountNumber?: string
  metadata: JSONB
}

// 파트너 프로필
@Entity('partner_profiles')
class PartnerProfile {
  id: string
  userId: string (unique, FK to users)
  partnerType?: string
  platform?: string
  channelUrl?: string
  followerCount?: number
  defaultCommissionRate?: number
  metadata: JSONB
}
```

### 10.2 패턴 분석

**공통 패턴**:
1. 역할 = RoleAssignment
2. 프로필 = OneToOne 엔티티 (역할별)
3. 프로필은 역할 승인 후 자동 생성

**약사 역할 적용**:
```typescript
@Entity('pharmacist_profiles')
class PharmacistProfile {
  id: string
  userId: string (unique, FK to users)

  // 약사 정보
  licenseNumber: string (encrypted, indexed)
  pharmacyName?: string
  employmentType: 'independent' | 'employed'
  licenseIssueDate: Date

  // 조직 정보
  organizationId?: string (FK to organizations)

  // 교육 정보
  certifications: JSONB

  metadata: JSONB
  createdAt: Date
  updatedAt: Date
}
```

---

## 11. 문제점 요약

### 11.1 조직 기반 권한 제어 불가 (P0)

| 문제 | 영향 | 우선순위 |
|------|------|----------|
| RoleAssignment에 조직 범위 없음 | "서울지부 관리자" 표현 불가 | **P0** |
| Permission에 조직 격리 없음 | 조직별 권한 제어 불가 | **P0** |
| 권한 상속 미지원 | 상위 조직 관리자 권한 상속 불가 | P1 |

### 11.2 역할 부족 (P1)

| 문제 | 영향 |
|------|------|
| `pharmacist` 역할 없음 | 약사 회원 구분 불가 |
| `branch_admin`, `division_admin` 없음 | 지부/분회 관리자 표현 불가 |
| `education_manager` 없음 | 교육 담당자 권한 불가 |

### 11.3 프로필 부족 (P1)

| 문제 | 영향 |
|------|------|
| `pharmacist_profiles` 없음 | 약사 면허번호 등 저장 불가 |

---

## 12. 권장 해결 방안

### 12.1 단기 (P0) - 조직 범위 역할 지원

#### ① RoleAssignment 확장
```typescript
@Entity('role_assignments')
class RoleAssignment {
  id: string
  userId: string
  role: string

  // NEW: 범위 정의
  scopeType: 'global' | 'organization' | 'app'
  scopeId?: string  // organizationId (scopeType=organization)

  isActive: boolean
  validFrom: Date
  validUntil?: Date
}
```

**예시**:
```typescript
// 전역 관리자
{ userId: 'admin1', role: 'admin', scopeType: 'global', scopeId: null }

// 서울지부 관리자
{ userId: 'user1', role: 'branch_admin', scopeType: 'organization', scopeId: 'seoul-uuid' }

// 강남분회 관리자
{ userId: 'user2', role: 'division_admin', scopeType: 'organization', scopeId: 'gangnam-uuid' }
```

#### ② Permission 확장 (선택적)
```typescript
@Entity('permissions')
class Permission {
  id: string
  key: string
  category: string
  appId?: string
  organizationId?: string  // NEW: 조직 전용 권한
}
```

### 12.2 중기 (P1) - 약사 역할 추가

#### ① UserRole Enum 확장
```typescript
enum UserRole {
  // 기존
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ...

  // NEW: 약사회 역할
  PHARMACIST = 'pharmacist',
  PHARMACIST_STUDENT = 'pharmacist_student',
  BRANCH_ADMIN = 'branch_admin',
  DIVISION_ADMIN = 'division_admin',
  EDUCATION_MANAGER = 'education_manager',
}
```

#### ② PharmacistProfile 생성
```typescript
@Entity('pharmacist_profiles')
class PharmacistProfile {
  id: string
  userId: string (unique)
  licenseNumber: string (encrypted)
  pharmacyName?: string
  employmentType: 'independent' | 'employed'
  organizationId?: string
  certifications: JSONB
}
```

### 12.3 장기 (P2) - 권한 상속 로직

```typescript
// 조직 계층 기반 권한 확인
async hasOrganizationPermission(
  userId: string,
  permission: string,
  targetOrgId: string
): Promise<boolean> {
  // 직접 권한 확인
  const directRole = await this.checkDirectRole(userId, targetOrgId);
  if (directRole) return true;

  // 상위 조직 권한 확인 (상속)
  const ancestors = await this.getAncestorOrganizations(targetOrgId);
  for (const ancestor of ancestors) {
    const ancestorRole = await this.checkDirectRole(userId, ancestor.id);
    if (ancestorRole) return true;
  }

  return false;
}
```

---

## 13. 다음 문서

- **04_member_org_integration_map.md**: 회원-조직-권한 통합 관계도
- **05_member_org_rbac_issues.md**: 통합 이슈 및 우선순위별 해결 방안
