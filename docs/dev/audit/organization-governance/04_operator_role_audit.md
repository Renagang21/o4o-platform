# 운영자(Global Operator) 권한 구조 조사 결과

**Date:** 2026-01-04  
**조사 범위:** Global Operator Role, Permissions, Scopes

---

## 🎯 조사 목표

운영자(Global Operator)의 권한 구조가 다음 기준과 일치하는지 조사:
- 모든 지부/분회를 생성·삭제·편집할 수 있어야 함
- OrganizationMember 엔티티에 포함되지 않아야 함
- 조직 스코프(role assignment)를 갖지 않아야 함
- 모든 조직 데이터를 조직 스코프 없이 조회 가능해야 함
- 테마 마켓플레이스 승인/관리 권한만을 가짐

---

## 🔍 주요 발견 사항

### ✅ 1. RoleAssignment scopeType 구조 (정상)

**파일:** [`packages/organization-core/src/entities/RoleAssignment.ts:64-83`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/RoleAssignment.ts#L64-L83)

```typescript
/**
 * 권한 스코프 타입
 * - global: 전역 권한 (모든 리소스에 대한 권한)  ✅
 * - organization: 조직 권한 (특정 조직에 대한 권한)  ✅
 */
@Column({
  type: 'varchar',
  length: 50,
  default: 'global',
})
scopeType!: 'global' | 'organization';

/**
 * 스코프 ID
 * scopeType='organization'인 경우 조직 ID
 * scopeType='global'인 경우 null  ✅
 */
@Column({ type: 'uuid', nullable: true })
scopeId?: string;
```

**평가:**
- `scopeType='global'`은 조직과 무관한 전역 권한
- **운영자는 scopeType='global', scopeId=null로 설정 가능**
- ✅ 구조 정상

---

### ✅ 2. super_admin 역할 정의 (정상)

**파일:** [`packages/types/src/auth/roles.ts`](file:///c:/Users/sohae/o4o-platform/packages/types/src/auth/roles.ts)

```typescript
export const UserRoles = {
  SUPER_ADMIN: 'super_admin',  // ✅
  ADMIN: 'admin',
  // ...
} as const;
```

**파일:** [`packages/organization-core/src/services/PermissionService.ts:34`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/services/PermissionService.ts#L34)

```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],  // ✅ 모든 권한
  admin: [
    'organizations:read',
    'organizations:write',
    // ...
  ],
  // ...
};
```

**평가:**
- `super_admin` 역할 존재
- 모든 권한(`*`) 보유
- ✅ 역할 정의 정상

---

### ⚠️ 3. 운영자의 OrganizationMember 포함 여부 (확인 필요)

**현재 상황:**
- `OrganizationMember` 엔티티: 조직과 사용자의 M:N 관계 표현
- **운영자가 OrganizationMember에 포함되는지 여부는 미확인**

**권장:**
- 운영자는 **어떤 조직의 멤버도 아니어야 함**
- `OrganizationMember` 테이블에 운영자 레코드가 없어야 함
- 운영자는 **조직 외부의 절대 권한자**로 동작

**확인 방법:**
```sql
-- 운영자 계정의 OrganizationMember 레코드 확인
SELECT om.* 
FROM organization_members om
INNER JOIN users u ON om.user_id = u.id
WHERE u.role = 'super_admin';
-- 결과: 0건이어야 정상
```

**우선순위:** **P1** (확인 및 정책 수립 필요)

---

### ⚠️ 4. 운영자 전용 기능 범위 (명확화 필요)

**현재 정의:**
- `super_admin` 역할은 모든 권한(`*`) 보유

**확인 필요:**
- 운영자가 실제로 수행할 수 있는 기능은?
  - ✅ 모든 조직 생성/수정/삭제
  - ✅ 모든 조직 데이터 조회
  - ❓ 테마 마켓플레이스 승인/관리
  - ❓ 사용자 계정 관리
  - ❓ 시스템 설정 관리

**권장:**
- 운영자 역할의 **명확한 책임 범위** 정의
- 운영자 전용 메뉴/화면 설계

**우선순위:** **P1**

---

### ✅ 5. 조직 스코프 없이 조회 가능 (정상)

**파일:** [`packages/organization-core/src/services/PermissionService.ts:234`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/services/PermissionService.ts#L234)

```typescript
// super_admin은 모든 권한
if (userRoles.includes('super_admin')) {
  return true;  // ✅ 스코프 검사 없이 즉시 허용
}
```

**평가:**
- `super_admin`은 조직 스코프와 무관하게 모든 권한 보유
- ✅ 정상

---

## 📊 운영자 권한 구조 평가

### ✅ 잘 구현된 부분

1. **전역 권한 스코프**
   - `scopeType='global'`로 조직 독립적 권한 표현 가능

2. **super_admin 역할 정의**
   - 모든 권한(`*`) 보유
   - 스코프 제약 없음

3. **OrganizationMember 분리**
   - 엔티티 구조상 운영자를 조직 멤버로 강제하지 않음

### ⚠️ 개선 필요 사항

1. **운영자 개념 명확화**
   - "super_admin" vs "Global Operator" 용어 통일
   - 역할 이름과 개념의 일치

2. **운영자 책임 범위 정의**
   - 운영자가 할 수 있는 것/할 수 없는 것 명확화
   - 운영자 전용 기능 목록화

3. **OrganizationMember 정책 수립**
   - 운영자는 절대 OrganizationMember에 포함되지 않도록 제약
   - 코드 레벨 또는 DB 레벨 검증

---

## 📝 문제 목록 요약

| ID | 문제 | 우선순위 | 조치 |
|----|------|----------|------|
| OP-01 | 운영자의 OrganizationMember 포함 여부 미확인 | P1 | DB 확인 및 정책 수립 |
| OP-02 | 운영자 책임 범위 미정의 | P1 | 운영자 기능 범위 명확화 문서 작성 |
| OP-03 | "super_admin" vs "Global Operator" 용어 불일치 | P2 | 용어 통일 (코드/문서) |

---

## 🎯 권장 조치 사항

### 1. 운영자 정책 수립

**문서:** `docs/architecture/global-operator-policy.md` (신규 생성 권장)

**내용:**
```markdown
# Global Operator 정책

## 정의
- Global Operator는 O4O 플랫폼의 최상위 운영자
- 모든 조직과 독립적으로 시스템 전체를 관리

## 권한
- 모든 조직(지부/분회) 생성/수정/삭제
- 모든 조직 데이터 조회
- 테마 마켓플레이스 승인/관리
- 시스템 설정 관리

## 제약
- Global Operator는 어떤 조직의 멤버도 아님
- OrganizationMember 테이블에 레코드 없음
- 조직별 게시글/댓글 작성 불가 (시스템 공지만 가능)
```

### 2. OrganizationMember 제약 조건 추가

**DB Migration:**
```sql
-- 운영자는 OrganizationMember에 포함될 수 없음
ALTER TABLE organization_members
ADD CONSTRAINT chk_no_global_operators
CHECK (
  user_id NOT IN (
    SELECT user_id 
    FROM role_assignments 
    WHERE role = 'super_admin' 
    AND scope_type = 'global'
  )
);
```

**비고:** 이는 예시이며, 실제 구현 시 성능 고려 필요

### 3. 역할 이름 통일

**제안:**

| 현재 | 변경 후 | 이유 |
|------|---------|------|
| `super_admin` | `platform_operator` | "운영자" 개념 명확화 |
| RoleAssignment.role | RoleAssignment.role | 그대로 유지 |
| 주석: "최고 관리자" | "전체 운영자" | 일관성 |

---

## 🔗 관련 문서

- [00_overview.md](./00_overview.md) - 조사 개요
- [01_db_audit.md](./01_db_audit.md) - DB 조사 결과
- [02_backend_audit.md](./02_backend_audit.md) - 백엔드 조사 결과
- [03_frontend_audit.md](./03_frontend_audit.md) - 프론트엔드 조사 결과
- [99_fix_plan.md](./99_fix_plan.md) - 정비 제안서 (최종)
