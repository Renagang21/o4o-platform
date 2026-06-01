# IR-O4O-ROLE-ASSIGNMENTS-SCHEMA-V1

**조사일**: 2026-02-23
**조사자**: Claude Code
**상태**: 완료
**심각도**: HIGH — CMS POST 엔드포인트 500 에러 유발

---

## 1. 현상

`POST /api/v1/cms/contents` 및 `POST /api/v1/cms/supplier/contents` 호출 시:

```
column RoleAssignment.user_id does not exist
```

`roleAssignmentService.hasAnyRole()` 또는 `getActiveRoles()` 호출 시 발생.

---

## 2. 조사 결과

### A. 두 개의 RoleAssignment Entity 존재 (동일 테이블명)

| 항목 | Entity A (Auth Module) | Entity B (Organization-Core) |
|------|----------------------|---------------------------|
| 파일 | `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` | `packages/organization-core/src/entities/RoleAssignment.ts` |
| 테이블 | `role_assignments` | `role_assignments` |
| userId 컬럼 | `@Column({ name: 'user_id', type: 'uuid' })` | `@Column({ type: 'uuid' })` ← **name 누락** |
| isActive | `@Column({ name: 'is_active' })` | 암시적 camelCase |
| 추가 컬럼 | `valid_from`, `valid_until`, `assigned_at`, `assigned_by` | `scopeType`, `scopeId` |

### B. TypeORM NamingStrategy

```typescript
// connection.ts L443-444
// NamingStrategy 설정 - 주석 처리 (데이터베이스가 이미 camelCase 사용)
// namingStrategy: new SnakeNamingStrategy(),
```

**SnakeNamingStrategy가 비활성화됨.** Entity B의 `userId` 프로퍼티는 명시적 `name` 없이 정의되어 있어, TypeORM이 camelCase `userId`로 쿼리함. 실제 DB 컬럼은 `user_id` (snake_case).

### C. 마이그레이션 파일

**`role_assignments` 테이블 CREATE TABLE 마이그레이션 없음.**

- `apps/api-server/src/database/migrations/` 내 role_assignments 관련 파일 미발견
- organization-core의 `lifecycle/install.ts`가 ALTER TABLE로 `scope_type`/`scope_id` 추가 시도하나, 테이블 존재를 전제
- 테이블은 TypeORM synchronize 또는 수동 생성으로 추정

### D. Entity 등록 상태

```typescript
// connection.ts L80, L468
import { RoleAssignment } from '../modules/auth/entities/RoleAssignment.js';
// entities 배열에 등록됨
```

Entity A (Auth)가 DataSource에 등록됨. Entity B (Organization-Core)는 organization-core 패키지 내부에서 사용.

---

## 3. Root Cause 판정

**원인: Entity 이중 정의 + 컬럼명 매핑 불일치**

1. Auth Module의 Entity A가 `@Column({ name: 'user_id' })`로 명시적 snake_case 사용
2. Organization-Core의 Entity B가 `@Column({ type: 'uuid' })`만 정의 — name 누락
3. SnakeNamingStrategy 비활성화로 Entity B는 `userId` (camelCase)로 쿼리
4. 실제 DB 컬럼은 `user_id` (snake_case) → **불일치**

### 에러 발생 경로

```
roleAssignmentService.getActiveRoles(userId)
  → repository.find({ where: { userId, isActive: true } })
  → TypeORM generates: SELECT ... WHERE "RoleAssignment"."userId" = $1
  → DB has column "user_id" not "userId"
  → ERROR: column RoleAssignment.user_id does not exist
```

실제로는 TypeORM이 `userId` 프로퍼티를 `user_id`로 변환하려다 실패하는 것이 아니라, 테이블 자체가 존재하지 않거나 스키마가 다를 수 있음.

---

## 4. 가능한 시나리오

### 시나리오 1: 테이블 미존재 (가능성 높음)
- CREATE TABLE 마이그레이션이 없음
- TypeORM `synchronize: false` (production)
- 테이블이 생성된 적 없을 수 있음

### 시나리오 2: 테이블 존재하나 컬럼명 불일치
- 테이블이 수동/synchronize로 생성됨
- Entity A vs B 간 컬럼명 충돌

---

## 5. 영향 범위

| 영역 | 영향 |
|------|------|
| POST /cms/contents | roleAssignment fallback 실패 → hotfix로 try/catch 적용 완료 |
| POST /cms/supplier/contents | 동일 → hotfix 적용 완료 |
| Auth 로그인 | 영향 없음 (JWT 기반, roleAssignment 미사용) |
| 기존 GET /cms/contents | 영향 없음 (roleAssignment 미사용) |
| 향후 RBAC 기반 기능 | roleAssignment 의존 시 동일 에러 예상 |

---

## 6. 현재 대응 상태

| 조치 | 상태 | WO |
|------|------|-----|
| supplier 엔드포인트 try/catch | 완료 | WO-O4O-CMS-HOTFIX-SUPPLIER-ROLE-V1 |
| admin 엔드포인트 try/catch | 완료 | WO-O4O-CMS-HOTFIX-SERVICE-ADMIN-ROLE-GUARD-V1 |
| plain role 매칭 추가 | 완료 | 동일 hotfix |

---

## 7. 수정 권고안 (별도 WO 필요)

### 권고 1: role_assignments 테이블 마이그레이션 생성
- Entity A 기준으로 CREATE TABLE IF NOT EXISTS 마이그레이션 작성
- 프로덕션 배포 시 자동 실행

### 권고 2: Entity 이중 정의 해소
- Organization-Core의 Entity B가 Auth Module의 Entity A를 import하도록 통합
- 또는 Entity B에 명시적 `name` 매핑 추가

### 권고 3: Admin 테스트 계정 역할 설정
- 프로덕션에 `platform:admin` 또는 `glycopharm:admin` 역할을 가진 계정 필요
- seed 또는 admin API로 역할 할당

---

## 8. 참조 파일

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` | Entity A (Auth) |
| `packages/organization-core/src/entities/RoleAssignment.ts` | Entity B (Org-Core) |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | Service (Entity A 사용) |
| `apps/api-server/src/database/connection.ts` | DataSource 설정 |
| `packages/organization-core/src/lifecycle/install.ts` | Org-Core 설치 훅 |
