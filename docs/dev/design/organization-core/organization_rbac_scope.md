# Organization-Core RBAC 확장 설계

**버전**: v1.0
**작성일**: 2025-11-30
**목적**: 조직 스코프 기반 권한 관리 시스템 설계

---

## 📋 목차

1. [RBAC 확장 개요](#1-rbac-확장-개요)
2. [RoleAssignment 확장](#2-roleassignment-확장)
3. [권한 검증 로직](#3-권한-검증-로직)
4. [계층적 권한 상속](#4-계층적-권한-상속)
5. [권한 시나리오](#5-권한-시나리오)
6. [구현 가이드](#6-구현-가이드)

---

## 1. RBAC 확장 개요

### 1.1 배경

기존 O4O Platform의 RBAC 시스템은 **전역 권한(Global Permissions)**만 지원합니다.

organization-core 도입으로 **조직 단위 권한(Organization-Scoped Permissions)**이 필요합니다.

**기존 구조:**
```typescript
{
  userId: "user-kim",
  role: "admin",
  // 전역 관리자 (모든 리소스에 대한 권한)
}
```

**확장 구조:**
```typescript
{
  userId: "user-park",
  role: "admin",
  scopeType: "organization",
  scopeId: "org-seoul",
  // 서울지부 관리자 (서울지부 리소스에만 권한)
}
```

### 1.2 설계 목표

1. **기존 RBAC 시스템과의 호환성 유지**
   - 기존 RoleAssignment 레코드는 `scopeType='global'`로 자동 변환
   - 마이그레이션 후에도 기존 권한 동작 보장

2. **조직 단위 권한 지원**
   - 특정 조직에 대한 권한 할당
   - 조직별 역할 관리 (admin, manager, member)

3. **계층적 권한 상속 (선택적)**
   - 상위 조직 권한이 하위 조직에 자동 상속
   - 예: 서울지부 관리자 → 강남분회 자동 관리 권한

4. **확장성**
   - 향후 다른 스코프 타입 추가 가능 (예: 'course', 'project')

---

## 2. RoleAssignment 확장

### 2.1 기존 구조

```typescript
@Entity('role_assignments')
export class RoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;  // 예: "admin", "instructor", "moderator"

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2.2 확장 구조

```typescript
@Entity('role_assignments')
@Index(['userId', 'scopeType', 'scopeId'])
@Index(['scopeType', 'scopeId'])
export class RoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;  // 예: "admin", "instructor", "moderator"

  // ✅ 신규 필드: 조직 스코프
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

### 2.3 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `scopeType` | ENUM | ✅ | 권한 스코프 타입 (`global`, `organization`) |
| `scopeId` | UUID | ❌ | 스코프 ID (조직 ID) - `scopeType='organization'`인 경우 필수 |

### 2.4 제약 조건

**비즈니스 규칙:**

1. `scopeType='global'`인 경우 `scopeId=null` 필수
2. `scopeType='organization'`인 경우 `scopeId` 필수 (organizationId)
3. `(userId, role, scopeType, scopeId)` 조합은 고유값 (중복 불가)

**데이터베이스 제약:**

```sql
-- scopeType='organization'인 경우 scopeId 필수
ALTER TABLE role_assignments
ADD CONSTRAINT chk_org_scope
CHECK (
  (scope_type = 'global' AND scope_id IS NULL) OR
  (scope_type = 'organization' AND scope_id IS NOT NULL)
);

-- 중복 권한 방지
CREATE UNIQUE INDEX idx_role_assignments_unique
ON role_assignments(user_id, role, scope_type, scope_id)
WHERE is_active = true;
```

---

## 3. 권한 검증 로직

### 3.1 기본 권한 검증

```typescript
// PermissionService.ts
async hasPermission(
  userId: string,
  permission: string,
  context?: PermissionContext
): Promise<boolean> {
  const assignments = await this.roleAssignmentRepository.find({
    where: { userId, isActive: true }
  });

  for (const assignment of assignments) {
    // 1. 전역 권한 체크
    if (assignment.scopeType === 'global') {
      if (await this.roleHasPermission(assignment.role, permission)) {
        return true;
      }
    }

    // 2. 조직 권한 체크
    if (assignment.scopeType === 'organization' && context?.organizationId) {
      if (assignment.scopeId === context.organizationId) {
        if (await this.roleHasPermission(assignment.role, permission)) {
          return true;
        }
      }
    }
  }

  return false;
}
```

### 3.2 PermissionContext

```typescript
interface PermissionContext {
  organizationId?: string;  // 조직 ID
  resourceType?: string;    // 리소스 타입 (예: 'forum_post', 'course')
  resourceId?: string;      // 리소스 ID
}
```

### 3.3 Guard 사용 예시

```typescript
// OrganizationController.ts
@Controller('api/organization')
export class OrganizationController {
  @Put(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission('organization.manage')
  async updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: User
  ) {
    // 권한 검증 (자동)
    // PermissionGuard가 hasPermission(user.id, 'organization.manage', { organizationId: id }) 호출
    return await this.organizationService.update(id, dto);
  }
}
```

---

## 4. 계층적 권한 상속

### 4.1 상속 규칙

**기본 원칙:**
- 상위 조직의 권한은 **하위 조직에 자동 상속**
- 예: 서울지부 관리자 → 강남분회, 강서분회 자동 관리 권한

**예시:**
```typescript
// 서울지부 관리자 권한
{
  userId: "user-kim",
  role: "admin",
  scopeType: "organization",
  scopeId: "org-seoul"  // 서울지부
}

// → 자동 상속 조직:
// - org-gangnam (강남분회)
// - org-gangseo (강서분회)
// - org-seocho (서초분회)
// ... (서울지부의 모든 하위 조직)
```

### 4.2 계층적 권한 검증 로직

```typescript
// PermissionService.ts
async hasPermissionWithInheritance(
  userId: string,
  permission: string,
  organizationId: string
): Promise<boolean> {
  const assignments = await this.roleAssignmentRepository.find({
    where: { userId, isActive: true, scopeType: 'organization' }
  });

  for (const assignment of assignments) {
    if (!assignment.scopeId) continue;

    // 1. 직접 권한 체크
    if (assignment.scopeId === organizationId) {
      if (await this.roleHasPermission(assignment.role, permission)) {
        return true;
      }
    }

    // 2. 상위 조직 권한 체크 (상속)
    const targetOrg = await this.organizationRepository.findOne({
      where: { id: organizationId }
    });

    const assignmentOrg = await this.organizationRepository.findOne({
      where: { id: assignment.scopeId }
    });

    if (targetOrg && assignmentOrg) {
      // targetOrg.path가 assignmentOrg.path로 시작하면 하위 조직
      if (targetOrg.path.startsWith(`${assignmentOrg.path}/`)) {
        if (await this.roleHasPermission(assignment.role, permission)) {
          return true;
        }
      }
    }
  }

  return false;
}
```

### 4.3 상속 예시

```
대한약사회 (org-national)
 └─ 서울지부 (org-seoul)
     ├─ 강남분회 (org-gangnam)
     └─ 강서분회 (org-gangseo)
```

**권한 할당:**
```typescript
{
  userId: "user-kim",
  role: "admin",
  scopeType: "organization",
  scopeId: "org-seoul"  // 서울지부 관리자
}
```

**권한 검증:**
```typescript
// ✅ org-seoul에 대한 권한: O
await hasPermissionWithInheritance("user-kim", "organization.manage", "org-seoul");
// → true

// ✅ org-gangnam (하위 조직)에 대한 권한: O (상속)
await hasPermissionWithInheritance("user-kim", "organization.manage", "org-gangnam");
// → true

// ❌ org-busan (다른 조직)에 대한 권한: X
await hasPermissionWithInheritance("user-kim", "organization.manage", "org-busan");
// → false
```

---

## 5. 권한 시나리오

### 5.1 전역 관리자 (Super Admin)

```typescript
{
  userId: "user-super",
  role: "super_admin",
  scopeType: "global",
  scopeId: null
}
```

**권한:**
- ✅ 모든 조직에 대한 관리 권한
- ✅ 모든 리소스(Forum, LMS, Dropshipping)에 대한 관리 권한
- ✅ 시스템 설정 변경 권한

**사용 사례:**
- 플랫폼 전체 관리자
- 시스템 운영자
- 개발자

---

### 5.2 조직 관리자 (Organization Admin)

```typescript
{
  userId: "user-seoul-admin",
  role: "admin",
  scopeType: "organization",
  scopeId: "org-seoul"  // 서울지부
}
```

**권한:**
- ✅ 서울지부 조직 설정 변경
- ✅ 서울지부 멤버 관리 (추가/삭제/역할 변경)
- ✅ 서울지부 게시글 관리 (Forum)
- ✅ 서울지부 교육과정 관리 (LMS)
- ✅ 서울지부 하위 조직(강남분회, 강서분회) 관리 (상속)
- ❌ 다른 지부(부산지부) 관리 불가

**사용 사례:**
- 지부장
- 지부 관리자
- 지부 운영자

---

### 5.3 조직 매니저 (Organization Manager)

```typescript
{
  userId: "user-gangnam-manager",
  role: "manager",
  scopeType: "organization",
  scopeId: "org-gangnam"  // 강남분회
}
```

**권한:**
- ✅ 강남분회 멤버 관리
- ✅ 강남분회 콘텐츠 관리 (게시글, 댓글)
- ❌ 강남분회 조직 설정 변경 불가 (admin만 가능)
- ❌ 상위 조직(서울지부) 관리 불가

**사용 사례:**
- 분회장
- 분회 운영자

---

### 5.4 조직 중재자 (Organization Moderator)

```typescript
{
  userId: "user-seoul-mod",
  role: "moderator",
  scopeType: "organization",
  scopeId: "org-seoul"  // 서울지부
}
```

**권한:**
- ✅ 서울지부 게시글/댓글 삭제
- ✅ 서울지부 신고 처리
- ❌ 멤버 관리 불가
- ❌ 조직 설정 변경 불가

**사용 사례:**
- 커뮤니티 중재자
- 게시판 관리자

---

### 5.5 LMS 강사 (Organization Instructor)

```typescript
{
  userId: "user-busan-instructor",
  role: "instructor",
  scopeType: "organization",
  scopeId: "org-busan"  // 부산지부
}
```

**권한:**
- ✅ 부산지부 교육과정 생성/수정
- ✅ 부산지부 수강생 관리
- ✅ 부산지부 강의 자료 업로드
- ❌ 다른 지부 교육과정 접근 불가

**사용 사례:**
- LMS 강사
- 교육 담당자

---

## 6. 구현 가이드

### 6.1 마이그레이션

```typescript
// migrations/AddRoleAssignmentScope.ts
export class AddRoleAssignmentScope1701234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. scopeType 컬럼 추가
    await queryRunner.addColumn(
      'role_assignments',
      new TableColumn({
        name: 'scope_type',
        type: 'enum',
        enum: ['global', 'organization'],
        default: "'global'",
        isNullable: false
      })
    );

    // 2. scopeId 컬럼 추가
    await queryRunner.addColumn(
      'role_assignments',
      new TableColumn({
        name: 'scope_id',
        type: 'uuid',
        isNullable: true
      })
    );

    // 3. 기존 레코드 기본값 설정
    await queryRunner.query(`
      UPDATE role_assignments
      SET scope_type = 'global', scope_id = NULL
      WHERE scope_type IS NULL
    `);

    // 4. 인덱스 추가
    await queryRunner.createIndex(
      'role_assignments',
      new TableIndex({
        name: 'idx_role_assignments_scope',
        columnNames: ['scope_type', 'scope_id']
      })
    );

    // 5. 제약 조건 추가
    await queryRunner.query(`
      ALTER TABLE role_assignments
      ADD CONSTRAINT chk_org_scope
      CHECK (
        (scope_type = 'global' AND scope_id IS NULL) OR
        (scope_type = 'organization' AND scope_id IS NOT NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('role_assignments', 'scope_id');
    await queryRunner.dropColumn('role_assignments', 'scope_type');
  }
}
```

### 6.2 PermissionGuard 구현

```typescript
// guards/PermissionGuard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
    private organizationService: OrganizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler()
    );

    if (!requiredPermission) {
      return true;  // 권한 요구사항 없음
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.params.id || request.body.organizationId;

    // 1. 전역 권한 체크
    if (await this.permissionService.hasPermission(user.id, requiredPermission, { organizationId: null })) {
      return true;
    }

    // 2. 조직 권한 체크 (상속 포함)
    if (organizationId) {
      return await this.permissionService.hasPermissionWithInheritance(
        user.id,
        requiredPermission,
        organizationId
      );
    }

    return false;
  }
}
```

### 6.3 Decorator 정의

```typescript
// decorators/RequirePermission.ts
export const RequirePermission = (permission: string) =>
  SetMetadata('permission', permission);
```

### 6.4 사용 예시

```typescript
// OrganizationController.ts
@Controller('api/organization')
@UseGuards(AuthGuard, PermissionGuard)
export class OrganizationController {
  @Get()
  @RequirePermission('organization.read')
  async list(@Query() query: ListOrganizationDto) {
    return await this.service.list(query);
  }

  @Post()
  @RequirePermission('organization.manage')
  async create(@Body() dto: CreateOrganizationDto) {
    return await this.service.create(dto);
  }

  @Put(':id')
  @RequirePermission('organization.manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto
  ) {
    return await this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('organization.manage')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
```

### 6.5 권한 할당 API

```typescript
// RoleAssignmentController.ts
@Controller('api/role-assignment')
export class RoleAssignmentController {
  @Post()
  @RequirePermission('role.assign')
  async assignRole(@Body() dto: AssignRoleDto) {
    return await this.service.assign(dto);
  }
}

// AssignRoleDto
export class AssignRoleDto {
  userId: string;
  role: string;
  scopeType: 'global' | 'organization';
  scopeId?: string;  // scopeType='organization'인 경우 필수
}
```

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
