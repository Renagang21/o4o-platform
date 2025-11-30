# 조직 구조 조사 (v1.1)

> **작성일**: 2025-11-30
> **버전**: 1.1 (정정판)
> **평가 기준**: 레퍼런스 구현 분석 및 신규 개발 전제

**조사 범위**: Organization/Branch/Group 엔티티, 조직 계층 구조, 멀티테넌트 구조
**조사 대상 파일**:
- `/apps/api-server/src/entities/*.ts` (전체 엔티티)
- `/apps/api-server/src/middleware/tenant-context.middleware.ts`
- `/packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts`

---

## 1. 조사 결과 요약

### 1.1 핵심 발견 사항

**Organization 엔티티**: **존재하지 않음**

다음 엔티티는 O4O Platform에서 **발견되지 않음**:
- ❌ `Organization`
- ❌ `Branch`
- ❌ `Division`
- ❌ `Group`
- ❌ `Tenant` (엔티티)
- ❌ `Company`
- ❌ CPT: `organization`

### 1.2 조직 관련 구조 발견 항목

| 항목 | 위치 | 용도 | 조직 계층 지원 |
|------|------|------|----------------|
| `tenant_id` 필드 | Post 엔티티 | 멀티테넌트 격리 | ❌ |
| `tenantContext` 미들웨어 | `/middleware/tenant-context.middleware.ts` | 서브도메인 기반 격리 | ❌ |
| `YaksaCommunity` | Forum 패키지 | 포럼 커뮤니티 | **부분 지원** |

**결론**:
약사회 지부/분회 구조를 지원하는 **조직 엔티티는 존재하지 않음**.
현재 시스템은 조직 계층을 **미지원** 상태.

---

## 2. 멀티테넌트 구조 분석

### 2.1 `tenant_id` 필드

**Post 엔티티**:
```typescript
@Entity('posts')
class Post {
  tenant_id: string | null  // VARCHAR(64)
  // NULL = 전역(global) 콘텐츠
  // 값 존재 = 특정 테넌트 소속
}
```

**PostMeta 엔티티**:
```typescript
@Entity('post_meta')
class PostMeta {
  tenant_id: string | null
}
```

**사용 목적**:
- 블로그/포럼 게시글의 테넌트 격리
- 서브도메인별 콘텐츠 분리
- 예: `branch1.neture.co.kr` → `tenant_id = 'branch1'`

**제약사항**:
- ✅ 콘텐츠 격리 가능
- ❌ 조직 계층 구조 미표현
- ❌ 조직 메타데이터 (이름, 주소, 담당자 등) 저장 불가
- ❌ 상위/하위 조직 관계 불가
- ❌ 회원의 조직 소속 표현 불가

### 2.2 `tenantContext` 미들웨어

**파일**: `/apps/api-server/src/middleware/tenant-context.middleware.ts`

```typescript
export function tenantContext(req: Request, res: Response, next: NextFunction): void {
  // Strategy 1: X-Tenant-Id 헤더
  const headerTenantId = req.headers['x-tenant-id'];

  // Strategy 2: 서브도메인 추출
  // branch1.neture.co.kr → 'branch1'
  const subdomain = extractSubdomain(host);

  // Strategy 3: JWT 토큰 (미구현)
  // const user = req.user;
  // if (user && user.tenantId) { ... }

  req.tenantId = tenantId || null;
  next();
}
```

**추출 로직**:
```typescript
function extractSubdomain(host: string): string | null {
  // branch1.neture.co.kr → 'branch1'
  // www.neture.co.kr → 'www' (제외 대상)
  // localhost → null

  const nonTenantSubdomains = [
    'www', 'api', 'admin', 'auth', 'cdn', 'static',
    'assets', 'media', 'shop', 'forum', 'signage', 'funding'
  ];

  if (nonTenantSubdomains.includes(subdomain)) return null;
  return subdomain;
}
```

**시사점**:
- 서브도메인을 **tenant ID**로 사용
- `tenant_id`는 **단순 문자열** (조직 엔티티 FK 아님)
- 조직 정보는 **별도 저장되지 않음**

**약사회 적용 가능성**:
```
seoul.yaksa.kr → tenant_id = 'seoul' (서울지부)
gangnam.seoul.yaksa.kr → tenant_id = 'gangnam' (강남분회)
```

**문제점**:
- ❌ `seoul`과 `gangnam`의 상하 관계 표현 불가
- ❌ `seoul` 조직명, 담당자, 연락처 저장 불가
- ❌ 회원이 `seoul`에 소속되었는지 User 테이블에서 확인 불가

---

## 3. Forum 패키지의 Community 구조

### 3.1 YaksaCommunity 엔티티

**파일**: `/packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts`

```typescript
enum CommunityType {
  PERSONAL = 'personal',  // 개인 커뮤니티
  BRANCH = 'branch',      // 지부
  DIVISION = 'division',  // 분회
  GLOBAL = 'global'       // 전국 공통
}

@Entity('yaksa_forum_community')
class YaksaCommunity {
  id: string (UUID)
  name: string (최대 200자)
  description?: string
  type: CommunityType
  ownerUserId: string  // FK to users
  requireApproval: boolean
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
```

**관계**:
```typescript
@ManyToOne('User')
@JoinColumn({ name: 'ownerUserId' })
owner?: User
```

**메서드**:
```typescript
canUserManage(userId: string, userRole: string): boolean {
  // 슈퍼관리자 또는 관리자 또는 소유자
  if (['Super Administrator', 'Administrator'].includes(userRole)) return true;
  if (this.ownerUserId === userId) return true;
  return false;
}
```

### 3.2 YaksaCommunityMember 엔티티

```typescript
enum CommunityMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

@Entity('yaksa_forum_community_member')
@Unique(['communityId', 'userId'])
class YaksaCommunityMember {
  id: string
  communityId: string  // FK to yaksa_forum_community
  userId: string       // FK to users
  role: CommunityMemberRole
  joinedAt: Date
}
```

### 3.3 Community 구조의 특징

#### 장점
- ✅ 지부/분회 개념 (`BRANCH`, `DIVISION`)
- ✅ 회원 멤버십 관리 (`YaksaCommunityMember`)
- ✅ 역할 기반 권한 (owner/admin/member)

#### 한계
- ❌ **계층 구조 미지원**: 지부-분회 상하 관계 없음
- ❌ **포럼 전용**: 게시글에만 적용, 교육/공동구매에는 미연동
- ❌ **User 엔티티와 분리**: User에서 "내 소속 지부" 조회 불가
- ❌ **조직 메타데이터 부족**: 주소, 연락처, 설정 등 불가

**현재 구조**:
```
YaksaCommunity(id=1, type=BRANCH, name='서울지부')
YaksaCommunity(id=2, type=BRANCH, name='경기지부')
YaksaCommunity(id=3, type=DIVISION, name='강남분회')
YaksaCommunity(id=4, type=DIVISION, name='서초분회')
```

**문제**: `강남분회`가 `서울지부` 소속인지 알 수 없음 (parentId 필드 부재)

---

## 4. 조직 계층 구조 지원 여부

### 4.1 요구사항: 약사회 조직 구조

```
대한약사회 (전국 본회)
├── 서울지부
│   ├── 강남분회
│   ├── 서초분회
│   ├── 송파분회
│   └── 강동분회
├── 경기지부
│   ├── 수원분회
│   ├── 성남분회
│   └── 고양분회
└── 부산지부
    ├── 해운대분회
    └── 사하분회
```

**필요 기능**:
1. 계층 조회: "강남분회의 상위 지부는?"
2. 자식 조회: "서울지부의 모든 분회 목록"
3. 경로 조회: "강남분회 → 서울지부 → 대한약사회"
4. 권한 상속: "서울지부 관리자 = 모든 하위 분회 관리 가능"

### 4.2 현재 시스템의 계층 구조 지원

**결론**: **미지원**

| 기능 | 현재 구현 | 지원 여부 |
|------|-----------|-----------|
| 상위 조직 참조 | ❌ `parentId` 필드 없음 | ❌ |
| 조직 경로 추적 | ❌ `path` 또는 `ancestors` 없음 | ❌ |
| 계층 쿼리 | ❌ Closure Table 없음 | ❌ |
| 권한 상속 | ❌ 조직 기반 권한 미구현 | ❌ |
| 조직 이동 | ❌ 엔티티 자체 없음 | ❌ |

### 4.3 계층 구조 구현 패턴 후보

#### 패턴 1: Adjacency List (인접 목록)
```typescript
@Entity('organizations')
class Organization {
  id: string
  parentId?: string  // FK to organizations.id (self-reference)
  name: string
  type: 'national' | 'branch' | 'division'
  level: number  // 0=본회, 1=지부, 2=분회
}
```

**장점**: 단순, 이동 용이
**단점**: 깊은 계층 쿼리 성능 저하, N+1 문제

#### 패턴 2: Materialized Path (경로 저장)
```typescript
@Entity('organizations')
class Organization {
  id: string
  path: string  // '/1/5/12' (조상 ID 경로)
  name: string
  type: 'national' | 'branch' | 'division'
}
```

**장점**: 조상 쿼리 빠름 (`path LIKE '/1/5/%'`)
**단점**: 이동 시 자손 전체 path 업데이트 필요

#### 패턴 3: Closure Table (추천)
```typescript
@Entity('organizations')
class Organization {
  id: string
  name: string
  type: 'national' | 'branch' | 'division'
}

@Entity('organization_closure')
class OrganizationClosure {
  ancestorId: string   // FK to organizations.id
  descendantId: string // FK to organizations.id
  depth: number        // 0=자기자신, 1=직속 자식, 2=손자...
}
```

**예시 데이터**:
```
Organization
├─ id=1, name='대한약사회', type='national'
├─ id=2, name='서울지부', type='branch'
└─ id=3, name='강남분회', type='division'

organization_closure
├─ (1, 1, 0) - 본회 → 본회
├─ (1, 2, 1) - 본회 → 서울지부
├─ (1, 3, 2) - 본회 → 강남분회
├─ (2, 2, 0) - 서울지부 → 서울지부
├─ (2, 3, 1) - 서울지부 → 강남분회
└─ (3, 3, 0) - 강남분회 → 강남분회
```

**장점**:
- ✅ 조상/자손 쿼리 단일 JOIN
- ✅ 깊이 제한 없음
- ✅ 이동 시 일부 행만 수정

**단점**:
- ❌ 저장 공간 증가 (O(n²))
- ❌ 구현 복잡도

**권장 이유**:
약사회 조직은 최대 3단계 (본회-지부-분회) + 변경 빈도 낮음 → Closure Table 최적

---

## 5. 회원 ↔ 조직 연결 구조

### 5.1 현재 연결 방식

**User 엔티티**:
```typescript
domain?: string  // 멀티테넌트용 (조직 아님)
```

**YaksaCommunityMember**:
```typescript
communityId: string  // FK to yaksa_forum_community
userId: string       // FK to users
role: 'owner' | 'admin' | 'member'
```

### 5.2 문제점

#### ① User에서 조직 조회 불가
```typescript
// 불가능한 쿼리
const user = await userRepo.findOne({ where: { id: userId } });
const organization = user.organization; // ❌ 필드 없음
```

#### ② 조직에서 회원 조회 비효율
```typescript
// 가능하지만 JOIN 필요
const members = await communityMemberRepo.find({
  where: { communityId: 'community-uuid' },
  relations: ['user']
});
```

#### ③ 다중 조직 소속 불가
```typescript
// 회원이 여러 조직에 소속될 수 없음
// 예: "강남분회 + 약무발전위원회" 동시 소속 불가
```

### 5.3 권장 연결 구조

#### 방법 1: User에 조직 참조 추가 (1:1)
```typescript
@Entity('users')
class User {
  id: string
  organizationId?: string  // FK to organizations
  organizationType?: 'branch' | 'division'
  organizationJoinedAt?: Date

  @ManyToOne('Organization')
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization
}
```

**장점**: 단순, User에서 직접 조회 가능
**단점**: 다중 소속 불가

#### 방법 2: 중간 테이블 (N:N)
```typescript
@Entity('organization_members')
class OrganizationMember {
  id: string
  organizationId: string  // FK to organizations
  userId: string          // FK to users
  role: 'admin' | 'member'
  isPrimary: boolean      // 주 소속 조직
  joinedAt: Date

  @ManyToOne('Organization')
  organization: Organization

  @ManyToOne('User')
  user: User
}
```

**장점**:
- ✅ 다중 소속 지원
- ✅ 조직별 역할 관리
- ✅ 이력 추적 가능

**단점**:
- ❌ 쿼리 복잡도 증가

**권장**: 방법 2 (약사는 위원회 등 다중 소속 가능)

---

## 6. 조직 단위 설정 저장 구조

### 6.1 현재 구조

**Settings 엔티티**:
```typescript
@Entity('settings')
class Settings {
  id: string
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'json'
  category?: string
  description?: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}
```

**문제점**:
- ✅ 전역 설정 저장 가능
- ❌ **조직별 설정 저장 불가**
- ❌ `organizationId` 필드 없음

**예시**: "서울지부 포럼 공지사항 자동 승인 OFF" 설정 불가

### 6.2 요구사항: 조직별 설정

| 설정 항목 | 전역 기본값 | 지부별 오버라이드 | 분회별 오버라이드 |
|-----------|-------------|-------------------|-------------------|
| 포럼 게시물 승인 필요 | true | 서울지부: false | 강남분회: true |
| 교육 이수 필수 | true | 경기지부: false | - |
| 공동구매 참여 가능 | true | - | 해운대분회: false |

### 6.3 권장 구조

```typescript
@Entity('organization_settings')
class OrganizationSetting {
  id: string
  organizationId: string  // FK to organizations
  key: string             // 'forum.requireApproval'
  value: any
  type: 'string' | 'number' | 'boolean' | 'json'
  createdAt: Date
  updatedAt: Date
}

// Unique constraint: (organizationId, key)
```

**설정 조회 로직**:
```typescript
async getOrganizationSetting(
  orgId: string,
  key: string
): Promise<any> {
  // 1. 조직 설정 확인
  const orgSetting = await orgSettingRepo.findOne({
    where: { organizationId: orgId, key }
  });
  if (orgSetting) return orgSetting.value;

  // 2. 상위 조직 설정 확인 (상속)
  const parent = await getParentOrganization(orgId);
  if (parent) return getOrganizationSetting(parent.id, key);

  // 3. 전역 설정 확인
  const globalSetting = await settingRepo.findOne({ where: { key } });
  return globalSetting?.value ?? null;
}
```

---

## 7. 조직 단위 서비스 연동

### 7.1 포럼 (Forum)

**현재 구조**:
```typescript
// YaksaCommunity = 조직 역할
@Entity('yaksa_forum_community')
class YaksaCommunity {
  id: string
  type: 'personal' | 'branch' | 'division' | 'global'
}

// 게시글
@Entity('forum_post')
class ForumPost {
  id: string
  communityId: string  // FK to yaksa_forum_community
  authorId: string     // FK to users
}
```

**연동 방식**:
- Community ID로 조직 구분
- 회원은 Community에 가입해야 게시글 작성 가능

**문제점**:
- ❌ Community ≠ Organization (별도 개념)
- ❌ 회원의 주 소속 조직과 무관하게 Community 가입 필요
- ❌ "서울지부 소속 회원은 자동으로 서울지부 포럼 접근" 불가

### 7.2 LMS (학습 관리)

**조사 결과**: LMS 엔티티 **미발견**

**요구사항**:
- 지부별 교육 과정
- 분회별 이수율 통계
- "서울지부 소속 약사 중 미이수자" 필터링

**필요 구조** (추정):
```typescript
@Entity('lms_courses')
class LMSCourse {
  id: string
  title: string
  organizationId?: string  // NULL = 전국, 값 = 특정 조직 전용
}

@Entity('lms_enrollments')
class LMSEnrollment {
  id: string
  userId: string
  courseId: string
  progress: number
  completedAt?: Date
}
```

### 7.3 공동구매 (Dropshipping/Order)

**현재 구조**:
```typescript
@Entity('orders')
class Order {
  id: string
  buyerId: string  // FK to users
  // organizationId: 없음
}
```

**문제점**:
- ❌ "강남분회 공동구매" 표현 불가
- ❌ 조직별 주문 통계 불가
- ❌ "서울지부 소속 회원만 참여 가능" 제한 불가

**권장 추가 필드**:
```typescript
@Entity('orders')
class Order {
  id: string
  buyerId: string
  buyerOrganizationId?: string  // 구매 시점 조직 스냅샷
  restrictedOrganizationId?: string  // NULL = 전국, 값 = 특정 조직 전용
}
```

### 7.4 공지사항 (Post)

**현재 구조**:
```typescript
@Entity('posts')
class Post {
  id: string
  tenant_id: string | null  // 멀티테넌트 격리
  author_id: string
}
```

**연동 가능성**:
- ✅ `tenant_id = 'seoul'` → 서울지부 공지
- ❌ 하지만 `tenant_id`는 단순 문자열 (조직 FK 아님)
- ❌ "서울지부 및 모든 하위 분회에 공지" 불가 (계층 미지원)

---

## 8. 문제점 요약

### 8.1 조직 엔티티 부재 (P0)

| 문제 | 영향 | 우선순위 |
|------|------|----------|
| Organization 엔티티 없음 | 조직 정보 저장 불가 | **P0** |
| 계층 구조 미지원 | 지부-분회 관계 표현 불가 | **P0** |
| 조직 메타데이터 저장 불가 | 주소, 연락처, 설정 관리 불가 | P1 |
| User-Organization 연결 없음 | 회원 소속 조직 조회 불가 | **P0** |

### 8.2 현재 구조의 한계

| 한계 | 설명 |
|------|------|
| `tenant_id` = 단순 문자열 | FK가 아니므로 JOIN 불가, 메타데이터 없음 |
| Forum Community ≠ Organization | 별도 개념으로 중복 관리 필요 |
| 조직 설정 저장 불가 | 지부/분회별 정책 설정 불가 |
| 조직 기반 권한 제어 불가 | "서울지부 관리자" 역할 구현 불가 |

### 8.3 서비스 연동 문제

| 서비스 | 문제 |
|--------|------|
| 포럼 | Community 가입 필수 (주 소속과 무관) |
| LMS | 조직별 교육 과정 미지원 |
| 공동구매 | 조직 전용 구매 불가 |
| 공지사항 | 계층 기반 공지 불가 |

---

## 9. 권장 해결 방안

### 9.1 단기 (P0) - Organization 엔티티 구축

#### ① Organization 엔티티 생성
```typescript
@Entity('organizations')
class Organization {
  id: string (UUID)
  parentId?: string  // FK to organizations.id (self-reference)

  name: string
  code: string (unique)  // 'SEOUL', 'SEOUL_GANGNAM'
  type: 'national' | 'branch' | 'division'
  level: number  // 0=본회, 1=지부, 2=분회

  // 메타데이터
  address?: string
  phone?: string
  email?: string
  managerUserId?: string  // 담당자

  // 상태
  isActive: boolean

  createdAt: Date
  updatedAt: Date
}
```

#### ② OrganizationClosure 테이블 생성
```typescript
@Entity('organization_closure')
class OrganizationClosure {
  ancestorId: string   // FK to organizations.id
  descendantId: string // FK to organizations.id
  depth: number

  // Composite Primary Key: (ancestorId, descendantId)
}
```

#### ③ OrganizationMember 테이블 생성
```typescript
@Entity('organization_members')
class OrganizationMember {
  id: string
  organizationId: string  // FK to organizations
  userId: string          // FK to users
  role: 'admin' | 'member'
  isPrimary: boolean
  joinedAt: Date
  leftAt?: Date
}

// Unique: (organizationId, userId)
```

### 9.2 중기 (P1) - 조직 설정 및 권한

#### ① OrganizationSetting 테이블
```typescript
@Entity('organization_settings')
class OrganizationSetting {
  id: string
  organizationId: string
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'json'
  createdAt: Date
  updatedAt: Date
}
```

#### ② 조직 기반 권한 확장
```typescript
@Entity('role_assignments')
class RoleAssignment {
  id: string
  userId: string
  role: string
  scopeType: 'global' | 'organization'
  scopeId?: string  // organizationId (scopeType=organization)
  isActive: boolean
}

// 예: "강남분회 관리자"
// { userId: '...', role: 'branch_admin', scopeType: 'organization', scopeId: 'gangnam-uuid' }
```

### 9.3 장기 (P2) - 서비스 통합

#### ① Forum-Organization 통합
```typescript
// Community 생성 시 Organization 자동 연동
@Entity('yaksa_forum_community')
class YaksaCommunity {
  id: string
  organizationId?: string  // NEW: FK to organizations
  type: 'personal' | 'organization' | 'global'
}
```

#### ② Post에 Organization 참조 추가
```typescript
@Entity('posts')
class Post {
  id: string
  tenant_id?: string  // DEPRECATED (하위 호환)
  organizationId?: string  // NEW: FK to organizations
}
```

#### ③ Order에 Organization 참조 추가
```typescript
@Entity('orders')
class Order {
  id: string
  buyerOrganizationId?: string  // 구매자 소속 조직
  targetOrganizationId?: string  // 조직 전용 구매
}
```

---

## 10. 마이그레이션 전략

### 10.1 Phase 1: 엔티티 생성 (영향도 低)
1. `organizations` 테이블 생성
2. `organization_closure` 테이블 생성
3. `organization_members` 테이블 생성
4. 초기 데이터 입력 (본회, 지부, 분회)

**영향**: 기존 코드 무영향 (새 테이블만 추가)

### 10.2 Phase 2: User 연동 (영향도 中)
1. `organization_members` 테이블에 회원 데이터 입력
2. User Service에 조직 조회 메서드 추가
3. JWT payload에 `organizationId` 추가

**영향**: User 관련 API 응답 구조 변경 가능

### 10.3 Phase 3: 서비스 통합 (영향도 高)
1. Forum: `YaksaCommunity.organizationId` 추가
2. Post: `organizationId` 추가 (tenant_id 병행)
3. Order: `buyerOrganizationId` 추가
4. LMS: 조직별 교육 과정 지원

**영향**: 각 서비스 비즈니스 로직 수정 필요

---

## 11. 다음 문서

- **03_rbac_structure_audit.md**: 역할/권한 시스템 조사
- **04_member_org_integration_map.md**: 회원-조직-권한 통합 관계도
- **05_member_org_rbac_issues.md**: 통합 이슈 및 해결 방안
