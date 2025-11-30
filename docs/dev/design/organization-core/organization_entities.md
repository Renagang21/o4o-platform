# Organization-Core 엔티티 설계

**버전**: v1.0
**작성일**: 2025-11-30
**목적**: organization-core의 데이터 모델 정의 및 ERD

---

## 📋 목차

1. [엔티티 개요](#1-엔티티-개요)
2. [Organization 엔티티](#2-organization-엔티티)
3. [OrganizationMember 엔티티](#3-organizationmember-엔티티)
4. [RoleAssignment 확장](#4-roleassignment-확장)
5. [ERD](#5-erd)
6. [인덱스 전략](#6-인덱스-전략)
7. [마이그레이션 전략](#7-마이그레이션-전략)

---

## 1. 엔티티 개요

organization-core는 3개의 핵심 엔티티로 구성됩니다:

| 엔티티 | 테이블명 | 역할 | 소유자 |
|--------|----------|------|--------|
| **Organization** | `organizations` | 조직 마스터 데이터 | organization-core |
| **OrganizationMember** | `organization_members` | 조직-회원 다대다 연결 | organization-core |
| **RoleAssignment (확장)** | `role_assignments` | 조직 권한 관리 (기존 확장) | 기존 RBAC |

---

## 2. Organization 엔티티

### 2.1 목적

전사 조직 데이터의 최상위 구조. 계층 구조(트리)를 지원하며 모든 도메인에서 재사용 가능합니다.

### 2.2 필드 정의

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

@Entity('organizations')
@Index(['code'], { unique: true })
@Index(['parentId'])
@Index(['type'])
@Index(['isActive'])
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;  // 조직명 (예: "서울지부")

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;  // 조직 코드 (예: "SEOUL") - 고유값

  @Column({
    type: 'enum',
    enum: ['national', 'division', 'branch'],
    default: 'branch'
  })
  type: 'national' | 'division' | 'branch';  // 조직 유형

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;  // 상위 조직 ID (null = 최상위)

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Organization;

  @OneToMany(() => Organization, org => org.parent)
  children: Organization[];

  @Column({ type: 'int', default: 0 })
  level: number;  // 계층 레벨 (0: 본부, 1: 지부, 2: 분회)

  @Column({ type: 'text' })
  path: string;  // 계층 경로 (예: "/national/seoul/gangnam")

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;  // 확장 필드 (주소, 연락처 등)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;  // 활성 여부

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual field: 하위 조직 개수
  @Column({ type: 'int', default: 0 })
  childrenCount: number;
}
```

### 2.3 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | UUID | ✅ | 조직 고유 ID (PK) |
| `name` | VARCHAR(255) | ✅ | 조직명 (예: "서울지부", "강남분회") |
| `code` | VARCHAR(100) | ✅ | 조직 코드 (예: "SEOUL", "GANGNAM") - **고유값** |
| `type` | ENUM | ✅ | 조직 유형 (`national`, `division`, `branch`) |
| `parentId` | UUID | ❌ | 상위 조직 ID (null = 최상위 조직) |
| `level` | INT | ✅ | 계층 레벨 (0: 본부, 1: 지부, 2: 분회) |
| `path` | TEXT | ✅ | 계층 경로 (예: "/national/seoul/gangnam") |
| `metadata` | JSONB | ❌ | 확장 필드 (주소, 전화번호, 설명 등) |
| `isActive` | BOOLEAN | ✅ | 활성 여부 (기본값: true) |
| `childrenCount` | INT | ✅ | 하위 조직 개수 (캐시 필드) |
| `createdAt` | TIMESTAMP | ✅ | 생성일시 (자동) |
| `updatedAt` | TIMESTAMP | ✅ | 수정일시 (자동) |

### 2.4 계층 구조 예시

```
대한약사회 (id: org-national, parentId: null, level: 0, path: "/national")
 ├─ 서울지부 (id: org-seoul, parentId: org-national, level: 1, path: "/national/seoul")
 │   ├─ 강남분회 (id: org-gangnam, parentId: org-seoul, level: 2, path: "/national/seoul/gangnam")
 │   └─ 강서분회 (id: org-gangseo, parentId: org-seoul, level: 2, path: "/national/seoul/gangseo")
 └─ 부산지부 (id: org-busan, parentId: org-national, level: 1, path: "/national/busan")
     └─ 해운대분회 (id: org-haeundae, parentId: org-busan, level: 2, path: "/national/busan/haeundae")
```

### 2.5 metadata 필드 활용

```typescript
// 예시: 약사회 지부 조직 메타데이터
{
  "address": "서울특별시 강남구 테헤란로 123",
  "phone": "02-1234-5678",
  "email": "seoul@yaksa.or.kr",
  "website": "https://seoul.yaksa.or.kr",
  "description": "서울특별시 지역 약사회",
  "establishedDate": "1990-03-15"
}

// 예시: 화장품 매장 조직 메타데이터
{
  "storeCode": "STORE-001",
  "address": "서울시 강남구 삼성동 123",
  "managerName": "김매니저",
  "phone": "02-9876-5432",
  "businessHours": "09:00-21:00",
  "squareMeters": 150
}
```

### 2.6 비즈니스 로직

#### path 자동 생성 로직

```typescript
// OrganizationService.ts
async createOrganization(dto: CreateOrganizationDto): Promise<Organization> {
  const org = new Organization();
  org.name = dto.name;
  org.code = dto.code;
  org.type = dto.type;
  org.parentId = dto.parentId;

  if (dto.parentId) {
    const parent = await this.findById(dto.parentId);
    org.level = parent.level + 1;
    org.path = `${parent.path}/${dto.code.toLowerCase()}`;
  } else {
    org.level = 0;
    org.path = `/${dto.code.toLowerCase()}`;
  }

  return await this.repository.save(org);
}
```

#### 하위 조직 조회 (재귀)

```typescript
async getDescendants(organizationId: string): Promise<Organization[]> {
  const org = await this.findById(organizationId);

  // path LIKE 방식으로 하위 조직 조회
  return await this.repository
    .createQueryBuilder('org')
    .where('org.path LIKE :path', { path: `${org.path}/%` })
    .orderBy('org.level', 'ASC')
    .addOrderBy('org.name', 'ASC')
    .getMany();
}
```

---

## 3. OrganizationMember 엔티티

### 3.1 목적

조직과 회원(User)을 연결하는 **다대다(M:N) 연결 테이블**입니다.

한 회원이 여러 조직에 소속될 수 있으며, 각 조직에서 다른 역할을 가질 수 있습니다.

### 3.2 필드 정의

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './Organization';
import { User } from '../user/User';  // 기존 User 엔티티

@Entity('organization_members')
@Index(['organizationId', 'userId'], { unique: true })
@Index(['userId'])
@Index(['organizationId'])
@Index(['isPrimary'])
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['admin', 'manager', 'member', 'moderator'],
    default: 'member'
  })
  role: 'admin' | 'manager' | 'member' | 'moderator';

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;  // 주 소속 조직 여부 (한 사용자당 1개만 true)

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;  // 확장 필드 (직책, 부서 등)

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;  // 가입일

  @Column({ type: 'timestamp', nullable: true })
  leftAt?: Date;  // 탈퇴일

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3.3 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | UUID | ✅ | 연결 ID (PK) |
| `organizationId` | UUID | ✅ | 조직 ID (FK → organizations.id) |
| `userId` | UUID | ✅ | 회원 ID (FK → users.id) |
| `role` | ENUM | ✅ | 조직 내 역할 (`admin`, `manager`, `member`, `moderator`) |
| `isPrimary` | BOOLEAN | ✅ | 주 소속 조직 여부 (기본값: false) |
| `metadata` | JSONB | ❌ | 확장 필드 (직책, 부서, 직급 등) |
| `joinedAt` | TIMESTAMP | ✅ | 조직 가입일 |
| `leftAt` | TIMESTAMP | ❌ | 조직 탈퇴일 (null = 활성 회원) |
| `createdAt` | TIMESTAMP | ✅ | 레코드 생성일시 (자동) |
| `updatedAt` | TIMESTAMP | ✅ | 레코드 수정일시 (자동) |

### 3.4 역할(Role) 정의

| 역할 | 설명 | 권한 예시 |
|------|------|-----------|
| `admin` | 조직 관리자 | 조직 설정 변경, 멤버 관리, 콘텐츠 관리 |
| `manager` | 조직 매니저 | 멤버 관리, 콘텐츠 관리 |
| `member` | 일반 회원 | 콘텐츠 읽기/쓰기 |
| `moderator` | 조직 중재자 | 콘텐츠 관리 (삭제/수정) |

### 3.5 비즈니스 로직

#### 주 소속 조직 설정 (isPrimary)

한 사용자는 **하나의 주 소속 조직**만 가질 수 있습니다.

```typescript
async setPrimaryOrganization(userId: string, organizationId: string): Promise<void> {
  // 1. 기존 주 소속 조직 해제
  await this.repository.update(
    { userId, isPrimary: true },
    { isPrimary: false }
  );

  // 2. 새 주 소속 조직 설정
  await this.repository.update(
    { userId, organizationId },
    { isPrimary: true }
  );
}
```

#### 조직 탈퇴 처리

```typescript
async leaveOrganization(userId: string, organizationId: string): Promise<void> {
  await this.repository.update(
    { userId, organizationId, leftAt: null },
    { leftAt: new Date() }
  );
}
```

#### 활성 멤버 조회

```typescript
async getActiveMembers(organizationId: string): Promise<OrganizationMember[]> {
  return await this.repository.find({
    where: {
      organizationId,
      leftAt: null  // 탈퇴하지 않은 멤버만
    },
    relations: ['user'],
    order: {
      joinedAt: 'ASC'
    }
  });
}
```

---

## 4. RoleAssignment 확장

### 4.1 목적

기존 RBAC 시스템의 `RoleAssignment` 엔티티에 **조직 스코프(scopeType/scopeId)** 필드를 추가합니다.

### 4.2 필드 추가

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('role_assignments')
@Index(['userId'])
@Index(['scopeType', 'scopeId'])
export class RoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;  // 예: "admin", "instructor", "moderator"

  // ✅ 신규 추가: 조직 스코프
  @Column({
    type: 'enum',
    enum: ['global', 'organization'],
    default: 'global'
  })
  scopeType: 'global' | 'organization';

  @Column({ type: 'uuid', nullable: true })
  scopeId?: string;  // organizationId (scopeType='organization'인 경우)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 4.3 권한 예시

#### 전역 관리자 (Global Admin)

```typescript
{
  userId: "user-kim",
  role: "super_admin",
  scopeType: "global",
  scopeId: null
}
// → 모든 조직에 대한 관리자 권한
```

#### 조직 관리자 (Organization Admin)

```typescript
{
  userId: "user-park",
  role: "admin",
  scopeType: "organization",
  scopeId: "org-seoul"
}
// → 서울지부에 대한 관리자 권한만
```

#### 조직 강사 (Organization Instructor)

```typescript
{
  userId: "user-choi",
  role: "instructor",
  scopeType: "organization",
  scopeId: "org-busan"
}
// → 부산지부에서만 강사 권한
```

### 4.4 권한 검증 로직

```typescript
// AuthGuard.ts
async hasPermission(
  userId: string,
  permission: string,
  organizationId?: string
): Promise<boolean> {
  const assignments = await this.roleAssignmentRepository.find({
    where: { userId, isActive: true }
  });

  for (const assignment of assignments) {
    // 1. 전역 권한 체크
    if (assignment.scopeType === 'global') {
      return this.roleHasPermission(assignment.role, permission);
    }

    // 2. 조직 권한 체크
    if (assignment.scopeType === 'organization' && assignment.scopeId === organizationId) {
      return this.roleHasPermission(assignment.role, permission);
    }
  }

  return false;
}
```

---

## 5. ERD

### 5.1 전체 ERD

```
┌─────────────────────────┐
│       User (기존)        │
│─────────────────────────│
│ id (PK)                 │
│ email                   │
│ name                    │
│ ...                     │
└─────────────────────────┘
            │
            │ 1
            │
            │ N
┌─────────────────────────┐         ┌─────────────────────────┐
│  OrganizationMember     │    N    │    Organization         │
│─────────────────────────│ ◄────── │─────────────────────────│
│ id (PK)                 │         │ id (PK)                 │
│ organizationId (FK) ────┼────────►│ name                    │
│ userId (FK) ────────────┼─────┐   │ code (UNIQUE)           │
│ role                    │     │   │ type (ENUM)             │
│ isPrimary               │     │   │ parentId (FK) ──┐       │
│ metadata                │     │   │ level               │   │
│ joinedAt                │     │   │ path                │   │
│ leftAt                  │     │   │ metadata            │   │
│ createdAt               │     │   │ isActive            │   │
│ updatedAt               │     │   │ childrenCount       │   │
└─────────────────────────┘     │   │ createdAt           │   │
                                │   │ updatedAt           │   │
                                │   └─────────────────────┘   │
                                │            │                │
                                │            │ Self-Reference │
                                │            └────────────────┘
                                │
                                │
                                │
                                │
┌─────────────────────────┐     │
│   RoleAssignment (확장)  │     │
│─────────────────────────│     │
│ id (PK)                 │     │
│ userId (FK) ────────────┼─────┘
│ role                    │
│ scopeType (ENUM)        │
│ scopeId (FK) ───────────┼───────────┐
│ isActive                │           │
│ createdAt               │           │
│ updatedAt               │           │
└─────────────────────────┘           │
                                      │
                                      ▼
                        (scopeType='organization' 시
                         scopeId → Organization.id)
```

### 5.2 관계 정의

| 관계 | 타입 | 설명 |
|------|------|------|
| User ↔ OrganizationMember | 1:N | 한 사용자가 여러 조직에 소속 |
| Organization ↔ OrganizationMember | 1:N | 한 조직이 여러 회원 보유 |
| Organization ↔ Organization | 1:N (Self) | 계층 구조 (parentId) |
| RoleAssignment → Organization | N:1 | 조직 스코프 권한 (선택적) |
| RoleAssignment → User | N:1 | 사용자 권한 할당 |

---

## 6. 인덱스 전략

### 6.1 Organization 인덱스

```sql
-- 조직 코드 조회 (고유값)
CREATE UNIQUE INDEX idx_organizations_code ON organizations(code);

-- 상위 조직 조회
CREATE INDEX idx_organizations_parent_id ON organizations(parent_id);

-- 조직 유형 필터링
CREATE INDEX idx_organizations_type ON organizations(type);

-- 활성 조직 필터링
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- 계층 경로 조회 (LIKE 검색)
CREATE INDEX idx_organizations_path ON organizations USING gin(path gin_trgm_ops);
```

### 6.2 OrganizationMember 인덱스

```sql
-- 중복 가입 방지
CREATE UNIQUE INDEX idx_org_members_org_user ON organization_members(organization_id, user_id);

-- 사용자별 조직 목록 조회
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

-- 조직별 멤버 목록 조회
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);

-- 주 소속 조직 조회
CREATE INDEX idx_org_members_is_primary ON organization_members(is_primary) WHERE is_primary = true;

-- 활성 멤버 조회 (leftAt IS NULL)
CREATE INDEX idx_org_members_active ON organization_members(organization_id, left_at) WHERE left_at IS NULL;
```

### 6.3 RoleAssignment 인덱스

```sql
-- 사용자별 권한 조회
CREATE INDEX idx_role_assignments_user_id ON role_assignments(user_id);

-- 조직 스코프 권한 조회
CREATE INDEX idx_role_assignments_scope ON role_assignments(scope_type, scope_id);

-- 활성 권한 조회
CREATE INDEX idx_role_assignments_active ON role_assignments(user_id, is_active) WHERE is_active = true;
```

---

## 7. 마이그레이션 전략

### 7.1 테이블 생성 순서

```typescript
// 1. organizations 테이블 생성
// 2. organization_members 테이블 생성
// 3. role_assignments 테이블에 scopeType/scopeId 컬럼 추가
```

### 7.2 초기 데이터 (Seed)

```typescript
// install hook에서 실행
async function seedDefaultOrganization(dataSource: DataSource) {
  const orgRepo = dataSource.getRepository(Organization);

  // 최상위 조직 (본부) 생성
  const national = new Organization();
  national.name = '본부';
  national.code = 'NATIONAL';
  national.type = 'national';
  national.level = 0;
  national.path = '/national';
  national.isActive = true;

  await orgRepo.save(national);
}
```

### 7.3 RoleAssignment 마이그레이션

```typescript
// 기존 RoleAssignment 레코드에 기본값 설정
await queryRunner.query(`
  UPDATE role_assignments
  SET scope_type = 'global', scope_id = NULL
  WHERE scope_type IS NULL
`);
```

---

## 8. 제약 조건 (Constraints)

### 8.1 Organization

- `code`는 **UNIQUE** (중복 불가)
- `parentId`는 **자기 자신을 참조할 수 없음**
- `level`은 **0 이상**
- `path`는 **항상 '/'로 시작**

### 8.2 OrganizationMember

- `(organizationId, userId)` 조합은 **UNIQUE** (중복 가입 방지)
- `isPrimary=true`는 **한 사용자당 최대 1개**
- `leftAt`이 NULL이 아니면 **탈퇴 상태**

### 8.3 RoleAssignment

- `scopeType='organization'`인 경우 `scopeId` **필수**
- `scopeType='global'`인 경우 `scopeId` **NULL**

---

## 9. 삭제 정책 (Cascade)

### 9.1 Organization 삭제 시

```typescript
// 하위 조직이 있는 경우 삭제 불가
if (org.childrenCount > 0) {
  throw new BadRequestException('하위 조직이 존재하여 삭제할 수 없습니다.');
}

// 멤버가 있는 경우 삭제 불가
const memberCount = await this.orgMemberRepository.count({ where: { organizationId } });
if (memberCount > 0) {
  throw new BadRequestException('소속 멤버가 존재하여 삭제할 수 없습니다.');
}
```

### 9.2 User 삭제 시

```typescript
// OrganizationMember: SET NULL (소프트 삭제 권장)
// RoleAssignment: CASCADE (자동 삭제)
```

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
