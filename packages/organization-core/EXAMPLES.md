# Organization-Core Phase 2 - RBAC Examples

**Version**: 1.0.0 (Phase 2)
**Date**: 2025-11-30

---

## 📋 목차

1. [권한 할당 예제](#1-권한-할당-예제)
2. [권한 검증 예제](#2-권한-검증-예제)
3. [계층적 권한 상속 예제](#3-계층적-권한-상속-예제)
4. [도메인 연동 예제](#4-도메인-연동-예제)

---

## 1. 권한 할당 예제

### 1.1 전역 관리자 할당

```typescript
import { PermissionService } from '@o4o/organization-core';

const permissionService = new PermissionService(dataSource);

// super_admin 권한 할당 (전역)
await permissionService.assignRole(
  'user-admin',     // userId
  'super_admin',    // role
  'global',         // scopeType
  undefined         // scopeId (전역은 null)
);

// 검증
const hasPermission = await permissionService.hasPermission(
  'user-admin',
  'organization.manage'
);
// → true (super_admin은 모든 권한)
```

### 1.2 조직 관리자 할당

```typescript
// 서울지부 관리자 할당
await permissionService.assignRole(
  'user-seoul-admin',   // userId
  'admin',              // role
  'organization',       // scopeType
  'org-seoul'           // scopeId (조직 ID)
);

// 검증
const hasPermission = await permissionService.hasPermissionWithInheritance(
  'user-seoul-admin',
  'organization.manage',
  'org-seoul'
);
// → true
```

### 1.3 조직 매니저 할당

```typescript
// 강남분회 매니저 할당
await permissionService.assignRole(
  'user-gangnam-manager',
  'manager',
  'organization',
  'org-gangnam'
);
```

---

## 2. 권한 검증 예제

### 2.1 기본 권한 검증

```typescript
// 전역 권한 확인
const hasGlobalPermission = await permissionService.hasPermission(
  'user-admin',
  'organization.read'
);

// 조직 권한 확인 (직접 권한만)
const hasOrgPermission = await permissionService.hasPermission(
  'user-seoul-admin',
  'organization.manage',
  { organizationId: 'org-seoul' }
);
```

### 2.3 범용 유틸리티 함수 사용

```typescript
import {
  canManageOrganization,
  canManageMembers,
  isSuperAdmin,
  isOrganizationAdmin
} from '@o4o/organization-core';

// 조직 관리 권한 확인
const canManage = await canManageOrganization(
  dataSource,
  'user-seoul-admin',
  'org-seoul'
);
// → true

// 전역 관리자 확인
const isSuperAdminUser = await isSuperAdmin(
  dataSource,
  'user-admin'
);
// → true

// 조직 관리자 확인
const isAdmin = await isOrganizationAdmin(
  dataSource,
  'user-seoul-admin',
  'org-seoul'
);
// → true
```

---

## 3. 계층적 권한 상속 예제

### 3.1 상위 조직 → 하위 조직 권한 상속

```
대한약사회 (org-national)
 └─ 서울지부 (org-seoul)
     ├─ 강남분회 (org-gangnam)
     └─ 강서분회 (org-gangseo)
```

```typescript
// 서울지부 관리자 할당
await permissionService.assignRole(
  'user-seoul-admin',
  'admin',
  'organization',
  'org-seoul'
);

// 강남분회에 대한 권한 확인 (상속)
const hasPermissionForGangnam = await permissionService.hasPermissionWithInheritance(
  'user-seoul-admin',
  'organization.manage',
  'org-gangnam'  // 강남분회 (하위 조직)
);
// → true (서울지부 권한이 강남분회에 상속됨)

// 강서분회에 대한 권한 확인 (상속)
const hasPermissionForGangseo = await permissionService.hasPermissionWithInheritance(
  'user-seoul-admin',
  'organization.manage',
  'org-gangseo'  // 강서분회 (하위 조직)
);
// → true (서울지부 권한이 강서분회에 상속됨)

// 부산지부에 대한 권한 확인 (상속 없음)
const hasPermissionForBusan = await permissionService.hasPermissionWithInheritance(
  'user-seoul-admin',
  'organization.manage',
  'org-busan'  // 부산지부 (다른 조직)
);
// → false (서울지부와 무관)
```

### 3.2 path 기반 상속 로직

```typescript
// Organization.path를 이용한 계층 구조
// org-seoul: path="/national/seoul"
// org-gangnam: path="/national/seoul/gangnam"

// org-gangnam.path.startsWith("/national/seoul/") → true
// → 서울지부 권한이 강남분회에 상속됨
```

---

## 4. 도메인 연동 예제

### 4.1 Forum 연동

```typescript
import { canManageResource } from '@o4o/organization-core';

// 서울지부 게시판에 게시글 작성 권한 확인
const canWrite = await canManageResource(
  dataSource,
  'user-seoul-member',
  'forum.write',
  'org-seoul'
);

if (!canWrite) {
  throw new Error('Permission denied: forum.write for org-seoul');
}

// 게시글 작성
const post = await forumPostService.createPost({
  title: '서울지부 공지',
  content: '...',
  organizationId: 'org-seoul'
});
```

### 4.2 LMS 연동

```typescript
// 부산지부 강의 관리 권한 확인
const canManageCourse = await canManageResource(
  dataSource,
  'user-busan-instructor',
  'lms.manage',
  'org-busan'
);

if (!canManageCourse) {
  throw new Error('Permission denied: lms.manage for org-busan');
}

// 강의 생성
const course = await lmsService.createCourse({
  title: '부산지부 보수교육',
  organizationId: 'org-busan',
  instructorId: 'user-busan-instructor'
});
```

### 4.3 Dropshipping 연동

```typescript
// 강남분회 공동구매 상품 등록 권한 확인
const canManageProduct = await canManageResource(
  dataSource,
  'user-gangnam-manager',
  'organization.manage',
  'org-gangnam'
);

if (!canManageProduct) {
  throw new Error('Permission denied: organization.manage for org-gangnam');
}

// 공동구매 상품 등록
const product = await dropshippingService.createProduct({
  name: '강남분회 공동구매 상품',
  organizationId: 'org-gangnam',
  price: 10000
});
```

---

## 5. 테스트 시나리오

### 5.1 전역 관리자 (Super Admin)

```typescript
describe('Super Admin Permissions', () => {
  it('should have access to all organizations', async () => {
    // 전역 관리자 할당
    await permissionService.assignRole('user-admin', 'super_admin', 'global');

    // 모든 조직 접근 가능
    expect(await permissionService.hasPermission('user-admin', 'organization.manage')).toBe(true);
    expect(await permissionService.hasPermission('user-admin', 'forum.manage')).toBe(true);
    expect(await permissionService.hasPermission('user-admin', 'lms.manage')).toBe(true);
  });
});
```

### 5.2 조직 관리자 (Organization Admin)

```typescript
describe('Organization Admin Permissions', () => {
  it('should have access to assigned organization and descendants', async () => {
    // 서울지부 관리자 할당
    await permissionService.assignRole('user-seoul', 'admin', 'organization', 'org-seoul');

    // 서울지부 접근 가능
    expect(
      await permissionService.hasPermissionWithInheritance(
        'user-seoul',
        'organization.manage',
        'org-seoul'
      )
    ).toBe(true);

    // 강남분회 접근 가능 (하위 조직)
    expect(
      await permissionService.hasPermissionWithInheritance(
        'user-seoul',
        'organization.manage',
        'org-gangnam'
      )
    ).toBe(true);

    // 부산지부 접근 불가
    expect(
      await permissionService.hasPermissionWithInheritance(
        'user-seoul',
        'organization.manage',
        'org-busan'
      )
    ).toBe(false);
  });
});
```

### 5.3 조직 멤버 (Organization Member)

```typescript
describe('Organization Member Permissions', () => {
  it('should have read/write access but not manage', async () => {
    // 서울지부 멤버 할당
    await permissionService.assignRole('user-member', 'member', 'organization', 'org-seoul');

    // 읽기 가능
    expect(
      await permissionService.hasPermissionWithInheritance(
        'user-member',
        'organization.read',
        'org-seoul'
      )
    ).toBe(true);

    // 관리 불가
    expect(
      await permissionService.hasPermissionWithInheritance(
        'user-member',
        'organization.manage',
        'org-seoul'
      )
    ).toBe(false);
  });
});
```

---

**작성일**: 2025-11-30
**버전**: Phase 2
**상태**: RBAC 완료 ✅
