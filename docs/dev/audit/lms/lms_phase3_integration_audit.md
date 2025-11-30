# LMS Phase 3 시스템 연동 요소 조사

> **작성일**: 2025-11-30
> **버전**: 1.0
> **목적**: LMS 신규 코어 설계를 위한 O4O Platform 연동 가능 요소 식별
> **조사 기준**: 실제 엔티티/코드 기반, Core/Extension 패턴 적용

---

## Executive Summary

### 조사 목적
LMS는 완전 신규 도메인(Core App + Extension App)으로 개발됩니다.
이 문서는 LMS Core가 O4O Platform 내부 시스템과 어떻게 연결되어야 하는지 조사하여 정확한 설계 기반을 확보합니다.

### 핵심 발견사항

| 연동 영역 | 재사용 가능 여부 | 필수 신규 개발 | 상태 |
|-----------|------------------|----------------|------|
| **User/Member** | ✅ 완전 재사용 | Profile 확장 필요 | 양호 |
| **RBAC** | ✅ 패턴 재사용 | LMS 역할 정의 | 양호 |
| **Organization** | ⚠️ 미존재 | 전체 구조 신규 | 중요 |
| **Notification** | ✅ 부분 재사용 | LMS 알림 타입 확장 | 양호 |
| **Block/CPT/ACF** | ✅ 패턴 재사용 | LMS Builder 개발 | 우수 |

### 권장 아키텍처 패턴
```
lms-core (Core App)
  ├─ Course CPT + ACF Fields
  ├─ LearnerProfile (User 확장)
  ├─ Instructor/Manager Role (RBAC 확장)
  ├─ LMS Notification Types (알림 확장)
  └─ OrganizationId (신규 Organization 연동)

lms-yaksa (Extension App)
  └─ Pharmacist License Profile
```

---

## A. User/Member 구조 연동성

### A.1 조사 결과 요약

**✅ LMS에서 User 엔티티 완전 재사용 가능**

O4O Platform의 User 엔티티는 LMS enrollment/progress 저장에 적합한 구조를 가지고 있습니다.

### A.2 User 엔티티 분석

**파일**: `/apps/api-server/src/entities/User.ts`

**핵심 필드**:
```typescript
@Entity('users')
class User {
  id: string (UUID)                    // ✅ LMS Enrollment FK로 사용 가능
  email: string (unique)
  name: string
  phone: string                        // ✅ 출석 체크 시 유용
  status: UserStatus                   // ACTIVE | PENDING | SUSPENDED
  isActive: boolean

  // Legacy RBAC (deprecated)
  role: UserRole
  roles: string[]

  // Direct permissions
  permissions: string[]

  // Timestamp
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date
}
```

**LMS 활용 가능 필드**:
- ✅ `id`: Enrollment.userId, Progress.userId FK
- ✅ `email`: 수강 확인 메일, 수료증 발급
- ✅ `name`: 수강생 목록, 수료증 이름
- ✅ `phone`: 오프라인 출석 체크
- ✅ `status`: 수강 자격 검증 (ACTIVE만 등록 가능)

### A.3 Profile 확장 패턴 분석

**기존 Profile 엔티티**:
- `SellerProfile` (`seller_profiles`)
- `PartnerProfile` (`partner_profiles`)
- `SupplierProfile` (`supplier_profiles`)

**공통 패턴**:
```typescript
@Entity('seller_profiles')
class SellerProfile {
  id: string (UUID)
  userId: string (unique)              // ✅ OneToOne with User

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  // Domain-specific fields
  storeName: string
  businessEmail: string
  metadata: Record<string, any>        // ✅ 확장 가능한 메타데이터

  createdAt: Date
  updatedAt: Date
}
```

### A.4 LMS Profile 설계 권장안

**LearnerProfile (학습자 프로필)**:
```typescript
@Entity('learner_profiles')
class LearnerProfile {
  id: string (UUID)
  userId: string (unique)              // FK to users

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  // === 학습 정보 ===
  totalEnrollments: number             // 총 수강 건수
  completedCourses: number             // 완료 과정 수
  totalLearningHours: number           // 총 학습 시간

  // === 선호도/설정 ===
  preferredLanguage: string            // 선호 언어
  learningGoals: string[]              // 학습 목표
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }

  // === 메타데이터 ===
  metadata: Record<string, any>        // 확장 가능한 추가 정보

  createdAt: Date
  updatedAt: Date
}
```

**PharmacistProfile (약사 면허 정보 - Extension)**:
```typescript
// lms-yaksa Extension에서 정의
@Entity('pharmacist_profiles')
class PharmacistProfile {
  id: string (UUID)
  userId: string (unique)              // FK to users

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  // === 면허 정보 ===
  licenseNumber: string                // 면허번호
  licenseIssueDate: Date               // 발급일
  licenseExpiryDate: Date              // 만료일 (갱신 필요 시)

  // === 근무 정보 ===
  pharmacyName: string                 // 약국명
  pharmacyAddress: string              // 약국 주소
  position: string                     // 직위 (약사, 관리약사 등)

  // === 평점 인정 정보 ===
  accreditedHours: number              // 인정받은 평점 시간
  lastAccreditedAt: Date               // 마지막 평점 인정일

  // === 검증 ===
  isVerified: boolean                  // 면허 검증 완료 여부
  verifiedAt: Date                     // 검증 시각
  verifiedBy: string                   // 검증자 (관리자 ID)

  createdAt: Date
  updatedAt: Date
}
```

### A.5 Enrollment/Progress 엔티티 설계

**Enrollment (수강 등록)**:
```typescript
@Entity('lms_enrollments')
class Enrollment {
  id: string (UUID)
  userId: string                       // ✅ FK to users (핵심 연동점)
  courseId: string                     // FK to lms_courses
  organizationId?: string              // FK to organizations (옵션)

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped'
  enrolledAt: Date
  startedAt?: Date
  completedAt?: Date

  // Progress tracking
  progressPercentage: number           // 0-100
  lastAccessedAt?: Date

  metadata: Record<string, any>

  createdAt: Date
  updatedAt: Date
}
```

**Progress (학습 진행)**:
```typescript
@Entity('lms_progress')
class Progress {
  id: string (UUID)
  userId: string                       // ✅ FK to users
  enrollmentId: string                 // FK to lms_enrollments
  lessonId: string                     // FK to lms_lessons

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  status: 'not_started' | 'in_progress' | 'completed'
  completedAt?: Date

  // 학습 데이터
  timeSpent: number                    // 초 단위
  attempts: number                     // 시도 횟수
  score?: number                       // 점수 (있는 경우)

  metadata: Record<string, any>

  createdAt: Date
  updatedAt: Date
}
```

### A.6 User 확장 Best Practice

**✅ 권장 패턴**:
1. **User 엔티티 직접 수정 금지**
2. **OneToOne Profile 엔티티 생성**
3. **userId FK로 연결**
4. **CASCADE DELETE 설정**
5. **metadata 필드로 확장성 확보**

**예시 관계 코드**:
```typescript
// User 엔티티에서 (lazy loading)
@OneToOne('LearnerProfile', 'user')
learnerProfile?: LearnerProfile

// LMS 서비스에서 조회
const user = await userRepository.findOne({
  where: { id: userId },
  relations: ['learnerProfile']
})
```

---

## B. RBAC 구조 연동 가능성

### B.1 조사 결과 요약

**✅ RoleAssignment 구조 LMS에 적합**

현재 RBAC 구조는 `scopeType: "organization"` 패턴을 수용할 수 있는 확장 가능한 설계입니다.

### B.2 RoleAssignment 엔티티 분석

**파일**: `/apps/api-server/src/entities/RoleAssignment.ts`

**현재 구조**:
```typescript
@Entity('role_assignments')
class RoleAssignment {
  id: string (UUID)
  userId: string                       // ✅ FK to users
  role: string                         // ✅ 'admin' | 'supplier' | 'seller' | 'partner'
  isActive: boolean                    // ✅ 활성 상태

  validFrom: Date                      // ✅ 유효 시작
  validUntil?: Date                    // ✅ 유효 종료 (임시 권한)

  assignedAt: Date
  assignedBy?: string                  // ✅ 할당자 (관리자 ID)

  createdAt: Date
  updatedAt: Date
}
```

**LMS 활용 가능 구조**:
- ✅ `role` 필드에 'lms_instructor', 'lms_manager' 추가 가능
- ✅ `isActive` 로 역할 활성화/비활성화 제어
- ✅ `validFrom`/`validUntil` 로 임시 강사 권한 관리
- ✅ `assignedBy` 로 권한 부여 이력 추적

### B.3 RBAC 정책 분석

**파일**: `/docs/dev/investigations/user-refactor_2025-11/zerodata/04_rbac_policy.md`

**핵심 원칙**:
```typescript
// 1. 서버 중심: 모든 권한 판정은 서버에서만 수행
// 2. Assignments 기반: role_assignments.is_active 상태로 판정
// 3. 명시적 거부: 권한 없으면 403 Forbidden 반환

// 예시: requireRole 미들웨어
export function requireRole(...roles: string[]) {
  return async (req, res, next) => {
    const assignments = await RoleAssignment.find({
      where: { userId, isActive: true }
    })

    const activeAssignments = assignments.filter(a => a.isValidNow())
    const userRoles = activeAssignments.map(a => a.role)

    if (!roles.some(role => userRoles.includes(role))) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    next()
  }
}
```

### B.4 LMS 역할 정의 권장안

**LMS Core Roles**:
```typescript
// LMS 역할 추가
enum LMSRole {
  LMS_ADMIN = 'lms_admin',             // LMS 전체 관리자
  LMS_INSTRUCTOR = 'lms_instructor',   // 강사
  LMS_MANAGER = 'lms_manager',         // 교육 담당자 (기관별)
  LMS_LEARNER = 'lms_learner'          // 학습자 (기본값)
}
```

**RoleAssignment 활용 예시**:
```typescript
// 강사 권한 부여
await RoleAssignment.create({
  userId: '강사-UUID',
  role: 'lms_instructor',
  isActive: true,
  validFrom: new Date(),
  validUntil: null,                    // 무기한
  assignedBy: '관리자-UUID'
})

// 임시 강사 권한 (6개월)
await RoleAssignment.create({
  userId: '임시강사-UUID',
  role: 'lms_instructor',
  isActive: true,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6개월 후
  assignedBy: '관리자-UUID'
})
```

### B.5 Organization 스코프 확장 (Phase 2)

**현재 RoleAssignment에 없는 필드**:
- ❌ `scopeType` (organization, global 등)
- ❌ `scopeId` (조직 ID)

**확장 권장안 (Phase 2)**:
```typescript
// Phase 2: Organization-scoped RBAC
@Entity('role_assignments')
class RoleAssignment {
  // ... 기존 필드

  // === Organization Scope (Phase 2 추가) ===
  scopeType?: 'global' | 'organization' | 'branch'
  scopeId?: string                     // FK to organizations (nullable)

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'scope_id' })
  scope?: Organization
}
```

**활용 예시**:
```typescript
// 서울지부 교육담당자
await RoleAssignment.create({
  userId: '담당자-UUID',
  role: 'lms_manager',
  isActive: true,
  scopeType: 'organization',
  scopeId: '서울지부-UUID',            // ✅ 조직 스코프
  assignedBy: '관리자-UUID'
})

// 전국 강사
await RoleAssignment.create({
  userId: '강사-UUID',
  role: 'lms_instructor',
  isActive: true,
  scopeType: 'global',                 // ✅ 전국 권한
  scopeId: null,
  assignedBy: '관리자-UUID'
})
```

### B.6 LMS RBAC 미들웨어 권장안

```typescript
// apps/api-server/src/middleware/lms-rbac.ts

import { requireRole } from './rbac.js'

/**
 * LMS 강사 또는 관리자 권한 요구
 */
export const requireLMSInstructor = requireRole('lms_instructor', 'lms_admin')

/**
 * LMS 관리자 권한 요구
 */
export const requireLMSAdmin = requireRole('lms_admin')

/**
 * 강의 소유자 또는 관리자만 접근
 */
export function requireCourseOwnerOrAdmin() {
  return async (req, res, next) => {
    const userId = req.user?.id
    const courseId = req.params.courseId

    // 관리자 체크
    const isAdmin = await hasRole(userId, 'lms_admin')
    if (isAdmin) return next()

    // 강의 소유자 체크
    const course = await Course.findOne({ where: { id: courseId } })
    if (course?.instructorId === userId) return next()

    return res.status(403).json({ error: 'FORBIDDEN' })
  }
}
```

**라우트 적용**:
```typescript
// LMS API 라우트
router.post('/courses', requireLMSInstructor, createCourse)
router.put('/courses/:courseId', requireCourseOwnerOrAdmin(), updateCourse)
router.delete('/courses/:courseId', requireLMSAdmin, deleteCourse)
```

### B.7 RBAC 확장 체크리스트

**✅ Phase 1 (Core App 출시)**:
- [x] RoleAssignment에 LMS 역할 추가 (`lms_instructor`, `lms_manager`, `lms_admin`)
- [x] LMS RBAC 미들웨어 구현
- [x] API 라우트에 권한 체크 적용
- [ ] 역할별 권한 매트릭스 문서화

**⏳ Phase 2 (Organization 연동)**:
- [ ] `scopeType`, `scopeId` 필드 추가
- [ ] Organization 엔티티 구현
- [ ] 조직별 권한 체크 미들웨어
- [ ] 조직 계층 권한 상속 로직

---

## C. Organization 구조 연동 방식

### C.1 조사 결과 요약

**❌ Organization 엔티티 미존재**

**현재 상태**:
- O4O Platform에 `Organization`, `Branch`, `Group` 엔티티 없음
- `tenant_id` 필드만 일부 엔티티(Post, PostMeta)에 존재
- 조직 계층 구조 미지원

**참고**: `/docs/dev/audit/member_organization/02_organization_structure_audit.md`

### C.2 현재 Tenant 구조 분석

**tenantContext 미들웨어**:
```typescript
// apps/api-server/src/middleware/tenant-context.middleware.ts

export function tenantContext(req, res, next) {
  // Strategy 1: X-Tenant-Id 헤더
  const headerTenantId = req.headers['x-tenant-id']

  // Strategy 2: 서브도메인 추출
  // branch1.neture.co.kr → 'branch1'
  const subdomain = extractSubdomain(req.hostname)

  req.tenantId = headerTenantId || subdomain || null
  next()
}
```

**제약사항**:
- ✅ 콘텐츠 격리 가능 (`tenant_id` 필드)
- ❌ 조직 메타데이터 저장 불가 (이름, 주소, 담당자 등)
- ❌ 조직 계층 구조 표현 불가 (상위/하위 관계)
- ❌ 회원의 조직 소속 표현 불가

### C.3 YaksaCommunity 구조 분석 (참고용)

**파일**: `/packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts`

**YaksaCommunity 엔티티**:
```typescript
enum CommunityType {
  PERSONAL = 'personal',
  BRANCH = 'branch',                   // ✅ 지부
  DIVISION = 'division',               // ✅ 분회
  GLOBAL = 'global'
}

@Entity('yaksa_forum_community')
class YaksaCommunity {
  id: string
  name: string
  description?: string
  type: CommunityType                  // ✅ 조직 타입 구분
  ownerUserId: string
  requireApproval: boolean
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}
```

**특징**:
- ✅ 조직 타입 구분 (branch, division)
- ❌ 조직 계층 관계 미표현 (parentId 없음)
- ❌ 조직 멤버십 구조 단순 (CommunityMember)

**시사점**:
- YaksaCommunity는 포럼 전용 구조
- LMS는 범용 Organization 엔티티 필요

### C.4 Organization 엔티티 설계 권장안

**Organization (조직 엔티티 - 신규 개발 필수)**:
```typescript
@Entity('organizations')
class Organization {
  id: string (UUID)
  name: string                         // 조직명
  code: string (unique)                // 조직 코드 (seoul, gangnam 등)
  type: OrganizationType               // 조직 타입

  // === 계층 구조 ===
  parentId?: string                    // ✅ 상위 조직 FK
  level: number                        // 계층 레벨 (0: 본부, 1: 지부, 2: 분회)
  path: string                         // 계층 경로 (예: /national/seoul/gangnam)

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Organization

  @OneToMany(() => Organization, 'parent')
  children?: Organization[]

  // === 조직 정보 ===
  description?: string
  address?: string
  phone?: string
  email?: string

  // === 담당자 ===
  managerId?: string                   // ✅ FK to users

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager?: User

  // === 메타데이터 ===
  metadata: Record<string, any>        // 확장 가능

  // === 상태 ===
  isActive: boolean

  createdAt: Date
  updatedAt: Date
}

enum OrganizationType {
  NATIONAL = 'national',               // 본부
  BRANCH = 'branch',                   // 지부
  DIVISION = 'division'                // 분회
}
```

**OrganizationMember (조직 멤버십)**:
```typescript
@Entity('organization_members')
@Unique(['organizationId', 'userId'])
class OrganizationMember {
  id: string (UUID)
  organizationId: string               // ✅ FK to organizations
  userId: string                       // ✅ FK to users

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  role: OrganizationRole               // 조직 내 역할
  isPrimary: boolean                   // 주 소속 여부

  joinedAt: Date
  leftAt?: Date

  metadata: Record<string, any>

  createdAt: Date
  updatedAt: Date
}

enum OrganizationRole {
  MEMBER = 'member',                   // 일반 회원
  MANAGER = 'manager',                 // 관리자
  ADMIN = 'admin'                      // 운영자
}
```

### C.5 LMS와 Organization 연동 패턴

**Course 엔티티에 organizationId 추가**:
```typescript
@Entity('lms_courses')
class Course {
  id: string
  title: string
  instructorId: string

  // === Organization 연동 ===
  organizationId?: string              // ✅ 조직별 과정
  visibility: 'public' | 'organization' | 'private'

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization

  // ...
}
```

**활용 시나리오**:
```typescript
// 1. 전국 공통 과정 (organizationId = null)
const course = await Course.create({
  title: '약사 윤리 교육',
  visibility: 'public',
  organizationId: null                 // 전국 공통
})

// 2. 서울지부 전용 과정
const seoulCourse = await Course.create({
  title: '서울지부 신입회원 교육',
  visibility: 'organization',
  organizationId: 'seoul-branch-uuid'  // ✅ 서울지부만
})

// 3. 강남분회 전용 과정
const gangnamCourse = await Course.create({
  title: '강남분회 정기 교육',
  visibility: 'organization',
  organizationId: 'gangnam-division-uuid'
})
```

**조직별 수강생 필터링**:
```typescript
// 서울지부 소속 수강생 조회
const members = await OrganizationMember.find({
  where: {
    organizationId: 'seoul-branch-uuid',
    role: In(['member', 'manager', 'admin'])
  },
  relations: ['user']
})

const learners = members.map(m => m.user)
```

### C.6 조직별 통계/리포트 구현

**조직별 수강 현황**:
```typescript
// LMS Dashboard - 조직별 통계
interface OrganizationLMSStats {
  organizationId: string
  organizationName: string
  totalEnrollments: number             // 총 수강 건수
  activeEnrollments: number            // 진행 중 수강
  completedEnrollments: number         // 완료 수강
  completionRate: number               // 완료율
  avgLearningHours: number             // 평균 학습 시간
}

// 조회 쿼리
async function getOrganizationStats(organizationId: string) {
  const enrollments = await Enrollment.find({
    where: { organizationId },
    relations: ['user']
  })

  const completed = enrollments.filter(e => e.status === 'completed')

  return {
    organizationId,
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter(e => e.status === 'in_progress').length,
    completedEnrollments: completed.length,
    completionRate: (completed.length / enrollments.length) * 100,
    avgLearningHours: calculateAvgHours(enrollments)
  }
}
```

### C.7 Organization 구현 체크리스트

**✅ Phase 1 (필수 구현)**:
- [ ] `organizations` 테이블 생성
- [ ] `organization_members` 테이블 생성
- [ ] Organization 엔티티 구현 (계층 구조 포함)
- [ ] OrganizationMember 엔티티 구현
- [ ] Organization CRUD API
- [ ] 조직 멤버 관리 API

**⏳ Phase 2 (확장)**:
- [ ] 조직 계층 쿼리 최적화 (Closure Table 패턴)
- [ ] 조직별 권한 관리 (RoleAssignment scopeId 연동)
- [ ] 조직별 대시보드/통계
- [ ] 조직 간 과정 공유 기능

**주의사항**:
- ⚠️ Organization은 **LMS 전용이 아닌 범용 구조**로 설계
- ⚠️ Forum, DigitalSignage 등 다른 앱도 활용 가능하도록 설계
- ⚠️ `organization-core` 패키지로 분리 권장

---

## D. Notification/Event 연동성

### D.1 조사 결과 요약

**✅ Notification 엔티티 재사용 가능**

현재 Notification 시스템은 LMS 알림에 활용 가능한 구조입니다.

### D.2 Notification 엔티티 분석

**파일**: `/apps/api-server/src/entities/Notification.ts`

**현재 구조**:
```typescript
@Entity('notifications')
class Notification {
  id: string
  userId: string                       // ✅ FK to users (수신자)

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User

  channel: NotificationChannel         // 'in_app' | 'email'
  type: NotificationType               // ✅ 알림 타입

  title: string                        // 알림 제목
  message?: string                     // 알림 내용
  metadata?: Record<string, any>       // ✅ 추가 데이터

  isRead: boolean
  readAt?: Date

  createdAt: Date
}

type NotificationChannel = 'in_app' | 'email'

type NotificationType =
  | 'order.new'
  | 'order.status_changed'
  | 'settlement.new_pending'
  | 'settlement.paid'
  | 'price.changed'
  | 'stock.low'
  | 'role.approved'
  | 'role.application_submitted'
  | 'custom'                           // ✅ 커스텀 타입
```

**LMS 활용 가능 구조**:
- ✅ `userId` → 수강생에게 알림 발송
- ✅ `channel` → in_app (앱 알림), email (메일)
- ✅ `type` → LMS 전용 타입 추가 가능
- ✅ `metadata` → 강의 ID, 진도율 등 저장

### D.3 LMS Notification 타입 정의

**NotificationType 확장**:
```typescript
// apps/api-server/src/entities/Notification.ts

type NotificationType =
  // ... 기존 타입
  | 'custom'

  // === LMS 알림 타입 (추가) ===
  | 'lms.enrollment.new'               // ✅ 신규 수강 등록
  | 'lms.enrollment.approved'          // ✅ 수강 승인
  | 'lms.course.start_reminder'        // ✅ 강의 시작 알림
  | 'lms.course.deadline_reminder'     // ✅ 마감 임박 알림
  | 'lms.lesson.completed'             // ✅ 레슨 완료
  | 'lms.course.completed'             // ✅ 과정 완료
  | 'lms.certificate.issued'           // ✅ 수료증 발급
  | 'lms.assignment.new'               // ✅ 과제 등록
  | 'lms.assignment.due'               // ✅ 과제 마감 임박
  | 'lms.quiz.result'                  // ✅ 퀴즈 결과
  | 'lms.attendance.reminder'          // ✅ 출석 체크 알림
```

### D.4 LMS Notification 활용 예시

**수강 등록 승인 알림**:
```typescript
// apps/api-server/src/services/lms-notification.service.ts

async function notifyEnrollmentApproved(enrollment: Enrollment) {
  await Notification.create({
    userId: enrollment.userId,
    channel: 'in_app',
    type: 'lms.enrollment.approved',
    title: '수강 신청이 승인되었습니다',
    message: `"${enrollment.course.title}" 과정의 수강 신청이 승인되었습니다. 지금 바로 학습을 시작하세요!`,
    metadata: {
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.title
    }
  })

  // 이메일 알림도 발송
  await Notification.create({
    userId: enrollment.userId,
    channel: 'email',
    type: 'lms.enrollment.approved',
    title: '수강 신청이 승인되었습니다',
    message: generateEmailHTML(enrollment),
    metadata: { enrollmentId: enrollment.id }
  })
}
```

**강의 마감 임박 알림**:
```typescript
async function sendDeadlineReminders() {
  const upcomingDeadlines = await Enrollment.find({
    where: {
      status: 'in_progress',
      deadlineAt: Between(
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 이내
      )
    },
    relations: ['course', 'user']
  })

  for (const enrollment of upcomingDeadlines) {
    await Notification.create({
      userId: enrollment.userId,
      channel: 'in_app',
      type: 'lms.course.deadline_reminder',
      title: '강의 마감이 7일 남았습니다',
      message: `"${enrollment.course.title}" 과정의 마감일이 ${formatDate(enrollment.deadlineAt)}입니다. 서둘러 완료하세요!`,
      metadata: {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        deadlineAt: enrollment.deadlineAt,
        progressPercentage: enrollment.progressPercentage
      }
    })
  }
}
```

**수료증 발급 알림**:
```typescript
async function notifyCertificateIssued(certificate: Certificate) {
  await Notification.create({
    userId: certificate.userId,
    channel: 'email',
    type: 'lms.certificate.issued',
    title: '수료증이 발급되었습니다',
    message: `축하합니다! "${certificate.course.title}" 과정의 수료증이 발급되었습니다.`,
    metadata: {
      certificateId: certificate.id,
      certificateUrl: certificate.downloadUrl,
      courseId: certificate.courseId
    }
  })
}
```

### D.5 Event 구조 조사 (일정 관리)

**현재 상태**:
- ❌ Event 엔티티 없음
- ❌ Calendar/Schedule 엔티티 없음

**LMS 필수 Event 기능**:
- 강의 일정 (온라인/오프라인)
- 출석 체크 일정
- 과제 마감 일정
- 시험 일정

**Event 엔티티 설계 권장안**:
```typescript
@Entity('lms_events')
class LMSEvent {
  id: string
  courseId: string                     // ✅ FK to lms_courses

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course!: Course

  type: EventType                      // 이벤트 타입
  title: string
  description?: string

  // === 일정 ===
  startAt: Date
  endAt: Date
  timezone: string                     // 'Asia/Seoul'

  // === 장소 (오프라인 강의) ===
  location?: string
  address?: string

  // === 온라인 강의 ===
  onlineUrl?: string                   // Zoom, Google Meet 등

  // === 출석 ===
  requiresAttendance: boolean
  attendanceCode?: string              // 출석 코드

  // === 메타데이터 ===
  metadata: Record<string, any>

  createdAt: Date
  updatedAt: Date
}

enum EventType {
  LECTURE = 'lecture',                 // 강의
  WORKSHOP = 'workshop',               // 워크샵
  EXAM = 'exam',                       // 시험
  ASSIGNMENT_DUE = 'assignment_due',   // 과제 마감
  WEBINAR = 'webinar'                  // 웨비나
}
```

**Attendance (출석) 엔티티**:
```typescript
@Entity('lms_attendance')
class Attendance {
  id: string
  eventId: string
  userId: string

  @ManyToOne(() => LMSEvent)
  @JoinColumn({ name: 'event_id' })
  event!: LMSEvent

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  status: 'present' | 'absent' | 'late' | 'excused'

  checkedInAt?: Date
  checkedInMethod: 'code' | 'qr' | 'manual'

  note?: string                        // 비고 (사유 등)

  createdAt: Date
  updatedAt: Date
}
```

### D.6 Notification/Event 연동 체크리스트

**✅ Phase 1 (Notification 활용)**:
- [ ] `NotificationType`에 LMS 타입 추가
- [ ] LMS Notification Service 구현
- [ ] 수강 등록/승인 알림
- [ ] 강의 시작/마감 알림
- [ ] 수료증 발급 알림

**⏳ Phase 2 (Event 구현)**:
- [ ] `lms_events` 테이블 생성
- [ ] `lms_attendance` 테이블 생성
- [ ] Event CRUD API
- [ ] 출석 체크 API (코드/QR)
- [ ] 일정 알림 자동 발송 (cron job)

**📧 Email 지원 여부**:
- ✅ `channel: 'email'` 지원
- ⚠️ 실제 SMTP 설정 필요 (SmtpSettings 엔티티 있음)
- ⚠️ 이메일 템플릿 구현 필요

---

## E. Block Editor/CPT/ACF 재사용성

### E.1 조사 결과 요약

**✅ Block Editor, CPT, ACF 모두 LMS 재사용 가능**

O4O Platform의 콘텐츠 빌더 시스템은 LMS Course/Lesson 구성에 적합한 구조입니다.

### E.2 CustomPostType (CPT) 구조 분석

**파일**: `/apps/api-server/src/entities/CustomPostType.ts`

**CPT 엔티티**:
```typescript
@Entity('custom_post_types')
class CustomPostType {
  id: string
  slug: string (unique)                // ✅ 'course', 'lesson'
  name: string                         // '강의', '레슨'
  description?: string
  icon: string
  active: boolean

  // === WordPress-like Settings ===
  public: boolean
  hasArchive: boolean
  showInMenu: boolean
  supports: string[]                   // ['title', 'editor', 'thumbnail']
  taxonomies: string[]                 // ['category', 'tag']

  // === Default Presets ===
  defaultViewPresetId?: string
  defaultTemplatePresetId?: string

  createdAt: Date
  updatedAt: Date
}
```

**LMS 활용 예시**:
```typescript
// Course CPT 등록
await CustomPostType.create({
  slug: 'lms-course',
  name: '강의 과정',
  description: 'LMS 강의 과정 관리',
  icon: 'academic-cap',
  active: true,
  public: true,
  hasArchive: true,
  showInMenu: true,
  supports: ['title', 'editor', 'thumbnail', 'excerpt'],
  taxonomies: ['lms-category', 'lms-tag']
})

// Lesson CPT 등록
await CustomPostType.create({
  slug: 'lms-lesson',
  name: '레슨',
  description: 'LMS 레슨 관리',
  icon: 'book-open',
  active: true,
  public: false,                       // 과정 내부에서만 보임
  supports: ['title', 'editor', 'video']
})
```

### E.3 CustomPost 구조 분석

**파일**: `/apps/api-server/src/entities/CustomPost.ts`

**CustomPost 엔티티**:
```typescript
@Entity('custom_posts')
class CustomPost {
  id: string
  title: string
  slug: string (unique)
  cptSlug: string                      // ✅ FK to custom_post_types

  @ManyToOne(() => CustomPostType)
  @JoinColumn({ name: 'posttypeslug', referencedColumnName: 'slug' })
  postType!: CustomPostType

  status: 'draft' | 'publish' | 'private' | 'trash'

  // === Custom Fields (JSON) ===
  fields: Record<string, any>          // ✅ ACF 필드 저장

  // === Content ===
  content?: string                     // Rich text / Block Editor

  // === SEO/Meta ===
  meta?: {
    seoTitle?: string
    seoDescription?: string
    featured?: boolean
    thumbnail?: string
    tags?: string[]
  }

  authorId?: string
  viewCount: number
  publishedAt?: Date

  createdAt: Date
  updatedAt: Date
}
```

**LMS Course 활용**:
```typescript
// Course를 CustomPost로 생성
await CustomPost.create({
  title: '약사 윤리 교육',
  slug: 'pharmacist-ethics-101',
  cptSlug: 'lms-course',               // ✅ Course CPT
  status: 'publish',

  // ACF Fields (강의 전용 필드)
  fields: {
    duration: 120,                     // 수강 시간 (분)
    level: 'beginner',                 // 난이도
    instructorId: '강사-UUID',
    price: 50000,                      // 가격
    maxEnrollments: 100,               // 최대 수강 인원
    startDate: '2025-02-01',
    endDate: '2025-02-28',
    certificateTemplate: 'template-1'
  },

  // Block Editor Content (강의 소개)
  content: JSON.stringify({
    blocks: [
      { type: 'heading', data: { text: '강의 소개' } },
      { type: 'paragraph', data: { text: '이 강의는...' } },
      { type: 'image', data: { url: 'course-thumbnail.jpg' } }
    ]
  }),

  meta: {
    thumbnail: 'course-cover.jpg',
    tags: ['윤리', '필수교육']
  },

  authorId: '관리자-UUID'
})
```

### E.4 ACFFieldGroup 구조 분석

**파일**: `/apps/api-server/src/entities/ACFFieldGroup.ts`

**ACFFieldGroup 엔티티**:
```typescript
@Entity('acf_field_groups')
class ACFFieldGroup {
  id: string
  title: string
  key: string (unique)                 // 'group_course_fields'
  description?: string

  // === Location Rules ===
  location: LocationGroup[]            // ✅ CPT별 필드 그룹

  position: 'normal' | 'side' | 'acf_after_title'
  style: 'default' | 'seamless'
  labelPlacement: 'top' | 'left'

  isActive: boolean
  menuOrder: number

  @OneToMany(() => ACFField, 'fieldGroup')
  fields!: ACFField[]

  createdAt: Date
  updatedAt: Date
}

// Location Rule 예시
location: [
  {
    rules: [
      {
        param: 'post_type',
        operator: '==',
        value: 'lms-course'            // ✅ Course CPT에만 적용
      }
    ]
  }
]
```

**LMS Course ACF 정의**:
```typescript
// Course Field Group 생성
await ACFFieldGroup.create({
  title: 'Course Settings',
  key: 'group_lms_course',
  description: 'LMS 강의 설정 필드',

  location: [
    {
      rules: [
        { param: 'post_type', operator: '==', value: 'lms-course' }
      ]
    }
  ],

  position: 'normal',
  isActive: true,

  fields: [
    // ACFField 엔티티로 정의 (아래 참고)
  ]
})
```

**ACFField 예시**:
```typescript
// apps/api-server/src/entities/ACFField.ts

await ACFField.create({
  fieldGroupId: 'group_lms_course',
  key: 'field_course_duration',
  name: 'duration',
  label: '수강 시간 (분)',
  type: 'number',
  required: true,
  defaultValue: 60,
  placeholder: '120',
  order: 1
})

await ACFField.create({
  fieldGroupId: 'group_lms_course',
  key: 'field_course_level',
  name: 'level',
  label: '난이도',
  type: 'select',
  required: true,
  choices: {
    beginner: '초급',
    intermediate: '중급',
    advanced: '고급'
  },
  order: 2
})

await ACFField.create({
  fieldGroupId: 'group_lms_course',
  key: 'field_course_instructor',
  name: 'instructorId',
  label: '강사',
  type: 'user',                        // User 선택 필드
  required: true,
  order: 3
})
```

### E.5 Page 블록 에디터 구조 분석

**파일**: `/apps/api-server/src/entities/Page.ts`

**Page 엔티티 (블록 에디터)**:
```typescript
@Entity('pages')
class Page {
  id: string
  title: string
  slug: string (unique)

  // === Block Editor Content ===
  content: { blocks: Block[] }         // ✅ 블록 기반 콘텐츠

  status: 'draft' | 'publish' | 'private' | 'archived'
  type: string                         // 'page'
  template?: string

  seo: SEOMetadata
  customFields: Record<string, any>

  authorId: string
  createdAt: Date
  updatedAt: Date
}

interface Block {
  id: string
  type: string                         // 'heading', 'paragraph', 'image', 'video'
  data: unknown
  order: number
}
```

**LMS 강의 소개 페이지 활용**:
```typescript
// Course 소개 페이지 (Block Editor)
await Page.create({
  title: '약사 윤리 교육 - 소개',
  slug: 'course-pharmacist-ethics-101',

  content: {
    blocks: [
      {
        id: 'block-1',
        type: 'heading',
        data: { text: '약사 윤리 교육', level: 1 },
        order: 1
      },
      {
        id: 'block-2',
        type: 'paragraph',
        data: { text: '이 강의는 약사의 기본 윤리를 다룹니다.' },
        order: 2
      },
      {
        id: 'block-3',
        type: 'video',
        data: { url: 'intro-video.mp4', thumbnail: 'thumb.jpg' },
        order: 3
      },
      {
        id: 'block-4',
        type: 'lms-course-info',         // ✅ 커스텀 블록 (LMS 전용)
        data: {
          duration: 120,
          level: 'beginner',
          price: 50000
        },
        order: 4
      }
    ]
  },

  status: 'publish',
  type: 'page',
  authorId: '관리자-UUID'
})
```

### E.6 LMS Builder 권장 아키텍처

**Option 1: CPT + ACF (권장)**
```
Course (CustomPost)
  ├─ CPT: lms-course
  ├─ ACF Fields: duration, level, instructor, price
  ├─ Content: Block Editor (강의 소개)
  └─ Taxonomy: lms-category, lms-tag

Lesson (CustomPost)
  ├─ CPT: lms-lesson
  ├─ ACF Fields: courseId, order, duration, videoUrl
  └─ Content: Block Editor (레슨 내용)
```

**Option 2: 전용 엔티티 + Block Editor (확장성 우수)**
```
Course (독립 엔티티)
  ├─ 기본 필드: title, description, instructorId
  ├─ Blocks: Block Editor (강의 소개 페이지)
  └─ ACF Fields: 추가 메타데이터

Lesson (독립 엔티티)
  ├─ 기본 필드: title, courseId, order
  ├─ Blocks: Block Editor (레슨 콘텐츠)
  └─ ACF Fields: 비디오, 문서 등
```

**권장**: **Option 1 (CPT + ACF)**
- ✅ 기존 시스템 재사용 극대화
- ✅ Admin UI 자동 생성 가능
- ✅ Block Editor 통합 용이
- ✅ Taxonomy (카테고리/태그) 자동 지원

### E.7 Block Editor 커스텀 블록 정의

**LMS 전용 블록 등록**:
```typescript
// packages/block-registry/src/lms-blocks.ts

export const lmsCourseInfoBlock = {
  name: 'lms-course-info',
  title: '강의 정보',
  icon: 'academic-cap',
  category: 'lms',

  attributes: {
    duration: { type: 'number' },
    level: { type: 'string' },
    price: { type: 'number' },
    maxEnrollments: { type: 'number' }
  },

  render: (data) => {
    return `
      <div class="lms-course-info">
        <div class="info-item">
          <span class="label">수강 시간:</span>
          <span class="value">${data.duration}분</span>
        </div>
        <div class="info-item">
          <span class="label">난이도:</span>
          <span class="value">${data.level}</span>
        </div>
        <div class="info-item">
          <span class="label">수강료:</span>
          <span class="value">${data.price.toLocaleString()}원</span>
        </div>
      </div>
    `
  }
}

export const lmsVideoPlayerBlock = {
  name: 'lms-video-player',
  title: 'LMS 비디오 플레이어',
  icon: 'play-circle',
  category: 'lms',

  attributes: {
    videoUrl: { type: 'string' },
    thumbnail: { type: 'string' },
    duration: { type: 'number' },
    trackProgress: { type: 'boolean', default: true }
  },

  render: (data) => {
    return `
      <div class="lms-video-player" data-track="${data.trackProgress}">
        <video src="${data.videoUrl}" poster="${data.thumbnail}" controls>
        </video>
        <div class="video-info">
          <span>Duration: ${formatDuration(data.duration)}</span>
        </div>
      </div>
    `
  }
}
```

### E.8 Block/CPT/ACF 활용 체크리스트

**✅ Phase 1 (Core 기능)**:
- [ ] `lms-course` CPT 등록
- [ ] `lms-lesson` CPT 등록
- [ ] Course ACF Field Group 정의
- [ ] Lesson ACF Field Group 정의
- [ ] LMS 카테고리/태그 Taxonomy 등록

**⏳ Phase 2 (UI Builder)**:
- [ ] LMS 커스텀 블록 개발 (course-info, video-player)
- [ ] 강의 빌더 UI (Admin Dashboard)
- [ ] 레슨 에디터 UI
- [ ] 드래그앤드롭 커리큘럼 편집

**📦 재사용 가능 컴포넌트**:
- ✅ Block Editor (`packages/block-renderer`)
- ✅ CPT Registry (`packages/cpt-registry`)
- ✅ ACF System (ACFFieldGroup, ACFField 엔티티)

---

## F. LMS Core 설계 체크리스트

### F.1 필수 엔티티

**✅ User 연동**:
- [x] User 엔티티 재사용
- [ ] LearnerProfile 엔티티 생성 (OneToOne with User)
- [ ] PharmacistProfile 엔티티 생성 (Extension - lms-yaksa)

**✅ Course/Lesson**:
- [ ] Course CPT 등록 또는 독립 엔티티
- [ ] Lesson CPT 등록 또는 독립 엔티티
- [ ] Course-Lesson 관계 정의 (OneToMany)

**✅ Enrollment/Progress**:
- [ ] Enrollment 엔티티 (userId FK)
- [ ] Progress 엔티티 (userId FK)
- [ ] Certificate 엔티티 (수료증)

**⚠️ Organization (필수 신규 개발)**:
- [ ] Organization 엔티티 (계층 구조)
- [ ] OrganizationMember 엔티티
- [ ] Course.organizationId 연동

**✅ Notification/Event**:
- [ ] NotificationType에 LMS 타입 추가
- [ ] LMSEvent 엔티티 (일정 관리)
- [ ] Attendance 엔티티 (출석 체크)

### F.2 RBAC 확장

**✅ Role 정의**:
- [ ] `lms_admin` (LMS 관리자)
- [ ] `lms_instructor` (강사)
- [ ] `lms_manager` (교육 담당자)
- [ ] `lms_learner` (학습자 - 기본)

**✅ RoleAssignment**:
- [x] 기존 RoleAssignment 재사용
- [ ] LMS 역할 RBAC 미들웨어 구현

**⏳ Phase 2 (Organization Scope)**:
- [ ] RoleAssignment.scopeType 추가
- [ ] RoleAssignment.scopeId 추가 (FK to organizations)

### F.3 API 엔드포인트

**Course API**:
- [ ] `GET /lms/courses` (과정 목록)
- [ ] `GET /lms/courses/:id` (과정 상세)
- [ ] `POST /lms/courses` (과정 생성 - instructor)
- [ ] `PUT /lms/courses/:id` (과정 수정 - owner/admin)
- [ ] `DELETE /lms/courses/:id` (과정 삭제 - admin)

**Enrollment API**:
- [ ] `POST /lms/enrollments` (수강 신청)
- [ ] `GET /lms/enrollments/my` (내 수강 목록)
- [ ] `GET /lms/enrollments/:id/progress` (진도 조회)
- [ ] `PUT /lms/enrollments/:id/progress` (진도 업데이트)

**Progress API**:
- [ ] `POST /lms/progress` (레슨 진행 기록)
- [ ] `GET /lms/progress/:enrollmentId` (수강별 진도)

**Certificate API**:
- [ ] `POST /lms/certificates` (수료증 발급)
- [ ] `GET /lms/certificates/:id` (수료증 조회)
- [ ] `GET /lms/certificates/:id/download` (PDF 다운로드)

**Organization API** (Phase 2):
- [ ] `GET /organizations` (조직 목록)
- [ ] `GET /organizations/:id/members` (조직 멤버)
- [ ] `GET /organizations/:id/courses` (조직 전용 과정)

### F.4 Admin Dashboard UI

**Course Management**:
- [ ] 과정 목록/생성/수정/삭제
- [ ] 과정 빌더 (Block Editor + ACF)
- [ ] 커리큘럼 편집 (드래그앤드롭)

**Enrollment Management**:
- [ ] 수강 신청 목록
- [ ] 수강 승인/거부
- [ ] 진도 현황 대시보드

**Learner Management**:
- [ ] 학습자 목록
- [ ] 학습 이력 조회
- [ ] 수료증 발급

**Statistics**:
- [ ] 과정별 수강 현황
- [ ] 조직별 통계 (Phase 2)
- [ ] 강사별 통계

### F.5 App Manifest

**lms-core manifest**:
```typescript
// apps/api-server/src/app-manifests/lms-core.manifest.ts

export const lmsCoreManifest = {
  appId: 'lms-core',
  name: 'LMS Core',
  displayName: 'Learning Management System',
  version: '1.0.0',
  icon: 'academic-cap',
  category: 'education',
  type: 'core',

  provides: {
    apis: [
      { path: '/lms/courses', method: 'GET', description: 'List courses' },
      { path: '/lms/enrollments', method: 'POST', description: 'Enroll course' }
    ],
    shortcodes: [
      { name: 'lms-course-list', description: 'Display course list' },
      { name: 'lms-my-courses', description: 'Display user courses' }
    ],
    blocks: [
      { name: 'lms-course-info', title: 'Course Info' },
      { name: 'lms-video-player', title: 'LMS Video Player' }
    ]
  },

  dependencies: {
    // Organization 의존성 (Phase 2)
    // 'organization-core': '^1.0.0'
  },

  permissions: {
    scopes: ['lms.read', 'lms.write', 'lms.manage'],
    requiredRole: 'lms_instructor'
  },

  ownsTables: [
    'lms_courses',
    'lms_lessons',
    'lms_enrollments',
    'lms_progress',
    'lms_certificates',
    'lms_events',
    'lms_attendance',
    'learner_profiles'
  ],

  ownsCPT: ['lms-course', 'lms-lesson'],
  ownsACF: ['group_lms_course', 'group_lms_lesson']
}
```

**lms-yaksa manifest** (Extension):
```typescript
// packages/lms-yaksa/src/lms-yaksa.manifest.ts

export const lmsYaksaManifest = {
  appId: 'lms-yaksa',
  name: 'LMS Yaksa Extension',
  displayName: '약사회 LMS 확장',
  version: '1.0.0',
  type: 'extension',

  dependencies: {
    'lms-core': '^1.0.0'               // ✅ lms-core 의존
  },

  provides: {
    apis: [
      { path: '/lms/pharmacist/license', method: 'GET', description: 'Get license info' }
    ]
  },

  ownsTables: [
    'pharmacist_profiles',
    'lms_accreditation_logs'           // 평점 인정 로그
  ],

  ownsACF: ['group_pharmacist_license']
}
```

---

## G. 권장 아키텍처 패턴

### G.1 전체 구조도

```
O4O Platform
  │
  ├─ [Core Systems] (기존 재사용)
  │   ├─ User (users 테이블)
  │   ├─ RoleAssignment (role_assignments)
  │   ├─ Notification (notifications)
  │   ├─ CustomPostType (custom_post_types)
  │   ├─ ACFFieldGroup (acf_field_groups)
  │   └─ Page (pages - Block Editor)
  │
  ├─ [신규 개발 필수]
  │   ├─ Organization (organizations) ⚠️
  │   └─ OrganizationMember (organization_members) ⚠️
  │
  └─ [LMS Apps]
      │
      ├─ lms-core (Core App)
      │   ├─ Course (CPT or 독립 엔티티)
      │   ├─ Lesson (CPT or 독립 엔티티)
      │   ├─ Enrollment (lms_enrollments)
      │   ├─ Progress (lms_progress)
      │   ├─ Certificate (lms_certificates)
      │   ├─ LMSEvent (lms_events)
      │   ├─ Attendance (lms_attendance)
      │   └─ LearnerProfile (learner_profiles)
      │
      └─ lms-yaksa (Extension App)
          └─ PharmacistProfile (pharmacist_profiles)
```

### G.2 데이터 흐름도

**수강 신청 흐름**:
```
1. User 로그인
   ↓
2. Course 목록 조회 (CPT or 독립 엔티티)
   ↓
3. Enrollment 생성
   - userId (FK to users) ✅
   - courseId (FK to courses)
   - organizationId (FK to organizations) ⚠️ Phase 2
   ↓
4. Notification 발송
   - type: 'lms.enrollment.new'
   - userId (FK to users) ✅
   ↓
5. Progress 추적
   - userId (FK to users) ✅
   - enrollmentId (FK to enrollments)
```

**권한 체크 흐름**:
```
1. API 요청 (예: POST /lms/courses)
   ↓
2. RBAC 미들웨어
   - RoleAssignment 조회 (userId + isActive) ✅
   - role = 'lms_instructor' 체크
   ↓
3. 권한 확인
   - 있음: next()
   - 없음: 403 Forbidden
```

**조직별 과정 관리 흐름** (Phase 2):
```
1. 관리자가 Organization 생성
   - 서울지부 (type: 'branch')
   ↓
2. Course 생성 시 organizationId 지정
   - visibility: 'organization'
   - organizationId: '서울지부-UUID'
   ↓
3. 수강 신청 시 조직 멤버십 체크
   - OrganizationMember.find({ userId, organizationId })
   - 멤버가 아니면 거부
```

### G.3 Phase별 개발 계획

**Phase 1: Core LMS (MVP)**
- ✅ User/RoleAssignment 재사용
- ✅ Course/Lesson CPT 등록
- ✅ Enrollment/Progress 구현
- ✅ Notification 연동 (LMS 타입 추가)
- ✅ Block Editor 활용 (강의 소개 페이지)
- ⚠️ Organization 미지원 (전국 공통 과정만)

**Phase 2: Organization 연동**
- ⚠️ Organization 엔티티 신규 개발
- ⚠️ OrganizationMember 엔티티
- ⚠️ Course.organizationId 추가
- ⚠️ RoleAssignment.scopeId 추가
- ⚠️ 조직별 통계/대시보드

**Phase 3: Advanced Features**
- 📧 이메일 알림 강화
- 📅 LMSEvent/Attendance 구현
- 📜 Certificate PDF 생성
- 🎨 LMS 커스텀 블록 추가
- 📊 고급 통계/분석

### G.4 기술 스택 권장

**Backend**:
- ✅ TypeORM (기존 재사용)
- ✅ Express.js (기존 재사용)
- ✅ PostgreSQL (기존 재사용)

**Frontend (Admin Dashboard)**:
- ✅ React (기존 재사용)
- ✅ Ant Design (기존 재사용)
- ✅ Block Editor (`packages/block-renderer`)

**새로 추가할 라이브러리**:
- 📜 `pdfkit` (수료증 PDF 생성)
- 📧 `nodemailer` (이미 있음 - SmtpSettings)
- 🎥 비디오 플레이어 (React Player 등)

---

## H. 결론 및 다음 단계

### H.1 핵심 요약

**재사용 가능 시스템** ✅:
1. **User 엔티티**: LMS enrollment/progress FK로 완전 재사용
2. **RoleAssignment**: LMS 역할 추가만으로 RBAC 구현 가능
3. **Notification**: LMS 알림 타입 추가로 재사용
4. **CPT/ACF**: Course/Lesson 구조에 완벽 적합
5. **Block Editor**: 강의 소개/레슨 콘텐츠 빌더로 활용

**필수 신규 개발** ⚠️:
1. **Organization 엔티티**: 조직 계층 구조 (지부/분회)
2. **OrganizationMember**: 조직 멤버십 관리
3. **LMS 전용 엔티티**: Enrollment, Progress, Certificate, LMSEvent

**권장 접근법**:
- **Phase 1**: Organization 없이 전국 공통 과정으로 MVP 출시
- **Phase 2**: Organization 구조 추가 후 조직별 관리 기능 확장

### H.2 즉시 시작 가능한 작업

**✅ 설계 완료 후 바로 시작**:
1. LearnerProfile 엔티티 생성
2. lms-course CPT 등록
3. Course ACF Field Group 정의
4. Enrollment/Progress 엔티티 생성
5. LMS RBAC 미들웨어 구현
6. NotificationType에 LMS 타입 추가

**⏳ 선행 작업 필요**:
1. Organization 엔티티 설계 (전사 논의 필요)
2. RoleAssignment scope 확장 (RBAC 정책 변경)

### H.3 리스크 요소

**🔴 Critical**:
- Organization 구조 부재 → Phase 1에서 우회 (전국 공통만)
- Organization 설계 실패 시 Phase 2 전체 영향

**🟡 Medium**:
- Email 알림 SMTP 설정 필요
- 수료증 PDF 생성 라이브러리 선택

**🟢 Low**:
- Block Editor 커스텀 블록 개발 학습 곡선
- ACF 필드 복잡도 관리

### H.4 다음 단계

**1. Organization 설계 회의** (우선순위 1):
- [ ] Organization 엔티티 스키마 확정
- [ ] 조직 계층 구조 정의 (본부/지부/분회)
- [ ] OrganizationMember 권한 모델 정의
- [ ] 다른 앱(Forum, DigitalSignage)과의 공유 방안 논의

**2. LMS Core 스키마 설계** (우선순위 2):
- [ ] Enrollment/Progress/Certificate 엔티티 상세 설계
- [ ] Course/Lesson 구조 결정 (CPT vs 독립 엔티티)
- [ ] ACF Field 목록 확정
- [ ] API 엔드포인트 명세서 작성

**3. Prototype 개발** (우선순위 3):
- [ ] Phase 1 MVP 범위 확정 (Organization 제외)
- [ ] lms-core App Manifest 작성
- [ ] Backend API 개발 시작
- [ ] Admin UI Prototype 개발

**4. 문서화**:
- [ ] LMS 엔티티 ERD 작성
- [ ] API 명세서 (Swagger)
- [ ] 사용자 가이드 (관리자/강사/학습자)

---

**문서 작성일**: 2025-11-30
**작성자**: Claude (AI Assistant)
**조사 기준**: 실제 코드 및 엔티티 기반 분석
**권장 검토자**: Backend 팀, PM, 아키텍트
