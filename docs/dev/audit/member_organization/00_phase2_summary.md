# O4O Platform 회원/조직/인증 구조 조사 보고서 (v1.1)

> **작성일**: 2025-11-30
> **버전**: 1.1 (정정판)
> **목적**: 약사회 조직 도메인 개발을 위한 현재 구조 확장 가능성 평가

---

## 수정 이력

### v1.1 (2025-11-30)
- **평가 기준 정정**: "부재 = 문제" 평가 방식 폐기
- **전제 조건 변경**: 약사회 도메인을 organization-core App으로 신규 개발 예정
- **평가 기준**: 확장 가능성 중심 평가 (Multi-tenant 기준 제외)
- **최종 평가**: 1/5 (v1.0) → 4/5 (v1.1)

### v1.0 (2025-11-30 초안)
- 초기 조사 (부재 = 문제 방식으로 평가)

---

## 요약

O4O Platform은 **도메인 확장에 적합한 기반 구조**를 갖추고 있습니다. 현재 User/RBAC 구조는 organization-core 앱 추가 시 큰 변경 없이 통합 가능하며, 확장 포인트가 명확하게 설계되어 있습니다.

### 전체 평가: 4/5 (도메인 확장 준비 완료)

| 영역 | 현재 상태 | 확장 가능성 | 권장 조치 |
|-----|---------|-----------|---------|
| **User 구조** | ✅ 우수 | 도메인 프로필 확장 가능 | P1: metadata 패턴 표준화 |
| **Organization** | 🟡 부재 (예정) | organization-core 개발 필요 | P0: Core App 개발 |
| **RBAC** | ✅ 우수 | scopeType/scopeId 추가 가능 | P1: 조직 범위 확장 |
| **통합** | ✅ 양호 | User ↔ Organization 연결 설계 | P1: 관계 정의 |

**평가 이유**:
- ✅ User 엔티티는 확장 메커니즘 보유 (metadata, businessInfo)
- ✅ RoleAssignment는 조직 기반 권한 지원 가능 (scopeType/scopeId 추가)
- ✅ YaksaCommunity는 organization-core의 레퍼런스 구현
- 🟡 Organization 엔티티는 신규 개발 필요 (예정됨)

---

## 1. 조사 개요

### 1.1 조사 배경

약사회 도메인 개발을 위해 다음을 평가:
1. 현재 User/Member 구조가 조직 멤버십을 지원할 수 있는가?
2. Organization 구조를 신규 개발할 때 기존 구조와 호환되는가?
3. RBAC 구조가 조직 기반 권한을 확장할 수 있는가?

### 1.2 조사 방법

- **엔티티 분석**: User, Role, Permission, RoleAssignment 구조 검토
- **레퍼런스 확인**: YaksaCommunity 구현 패턴 분석
- **확장성 평가**: organization-core 추가 시나리오 검증
- **평가 기준**: "확장 가능" vs "구조 재설계 필요"

### 1.3 조사 범위

| 영역 | 조사 대상 | 문서 |
|------|-----------|------|
| **회원 데이터** | User/Member 엔티티, 필드 구조, 확장 메커니즘 | `01_user_member_structure_audit.md` |
| **조직 구조** | Organization/Branch/Division 엔티티, 계층 구조 | `02_organization_structure_audit.md` |
| **RBAC** | Role/Permission/RoleAssignment, 권한 시스템 | `03_rbac_structure_audit.md` |

---

## 2. 핵심 발견사항

### 2.1 User 엔티티 (apps/api-server/src/entities/User.ts)

#### 장점: 확장 가능한 구조

✅ **도메인별 프로필 확장 메커니즘 보유**
```typescript
@Entity('users')
class User {
  // 도메인 확장 필드
  businessInfo?: BusinessInfo;  // JSON - 사업자 정보
  domain?: string;               // Multi-tenant 지원
  // metadata?: Record<string, any>; // 주석 처리됨 (확장 가능)

  // 도메인 프로필 패턴 (Dropshipping 예시)
  supplier?: any;  // OneToOne in Supplier entity
  seller?: any;    // OneToOne in Seller entity
  partner?: any;   // OneToOne in Partner entity
}
```

✅ **약사회 도메인 추가 시 확장 시나리오**
```typescript
// User 엔티티는 변경 불필요
// organization-core 앱에서 정의:
@Entity('pharmacist_profiles')
export class PharmacistProfile {
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  licenseNumber!: string;

  @Column()
  licenseDate!: Date;
}
```

#### 확장 가능성 평가: ✅ 우수
- 도메인 프로필 OneToOne 패턴 활용 가능
- businessInfo JSON 필드로 도메인 메타데이터 저장
- 기존 User 구조 변경 없이 확장 가능

### 2.2 Organization 구조

#### 현재 상태
🟡 **Organization 엔티티 부재** (신규 개발 예정)

#### 레퍼런스 구현 존재: YaksaCommunity

YaksaCommunity (packages/forum-yaksa/src/backend/entities/)는 조직 구조의 레퍼런스 구현:

```typescript
@Entity('yaksa_forum_community')
export class YaksaCommunity {
  id: string;
  name: string;
  type: CommunityType; // PERSONAL | BRANCH | DIVISION | GLOBAL
  ownerUserId: string;
  requireApproval: boolean;
  metadata: Record<string, unknown>;
}

@Entity('yaksa_forum_community_member')
export class YaksaCommunityMember {
  communityId: string;
  userId: string;
  role: CommunityMemberRole; // OWNER | ADMIN | MEMBER
  joinedAt: Date;
}
```

#### 권장 패턴
organization-core 앱 개발 시 YaksaCommunity 패턴 활용:
1. **Organization 엔티티**: 조직 기본 정보
2. **OrganizationMember 엔티티**: User ↔ Organization 관계
3. **OrganizationHierarchy**: 상하위 조직 관계 (선택)

#### 확장 가능성 평가: ✅ 레퍼런스 구현 활용 가능
- YaksaCommunity 패턴을 organization-core로 일반화
- 기존 시스템과 충돌 없이 신규 앱으로 개발 가능
- User 엔티티 변경 불필요 (OneToMany 관계)

### 2.3 RBAC 구조

#### 우수한 확장 가능성

✅ **RoleAssignment 구조** (apps/api-server/src/entities/RoleAssignment.ts)

현재:
```typescript
@Entity('role_assignments')
class RoleAssignment {
  userId: string;
  role: string;
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
  assignedBy?: string;
}
```

✅ **조직 기반 권한 확장 시나리오**
```typescript
@Entity('role_assignments')
class RoleAssignment {
  userId: string;
  role: string;

  // 조직 범위 추가 (P1)
  scopeType?: string; // 'global' | 'organization' | 'branch'
  scopeId?: string;   // organizationId or branchId

  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
}
```

**예시**:
```typescript
// 전국약사회 회장: global scope
{ userId: 'user1', role: 'president', scopeType: 'global', scopeId: null }

// 서울시약사회 지부장: organization scope
{ userId: 'user2', role: 'branch_president', scopeType: 'organization', scopeId: 'org-seoul' }

// 강남구분회 총무: branch scope
{ userId: 'user3', role: 'secretary', scopeType: 'branch', scopeId: 'branch-gangnam' }
```

✅ **Permission 구조**: App 기반 권한 관리
```typescript
@Entity('permissions')
class Permission {
  key: string;        // 'users.view', 'content.create'
  description: string;
  category: string;
  appId?: string;     // 앱 소유권 명시
}
```

organization-core 앱 개발 시 전용 권한 정의 가능:
- `organization.view`
- `organization.manage`
- `members.approve`

#### 확장 가능성 평가: ✅ 우수
- RoleAssignment에 scopeType/scopeId 추가만으로 조직 범위 지원
- 기존 RBAC 로직 하위 호환 유지 가능
- Permission의 appId로 도메인별 권한 격리 지원

---

## 3. 통합 평가

### 3.1 User + Organization 통합 시나리오

**약사회 회원 가입 플로우**:

1. **회원가입**: User 엔티티 생성 (기존 로직)
2. **약사 인증**: PharmacistProfile 생성 (organization-core)
3. **지부/분회 가입**: OrganizationMember 생성
4. **권한 부여**: RoleAssignment 생성 (scopeType: 'organization')

```typescript
// 1. User 생성 (기존)
const user = await userRepository.create({
  email: 'pharmacist@example.com',
  name: '홍길동',
  role: UserRole.USER
});

// 2. 약사 프로필 생성 (organization-core)
const profile = await pharmacistProfileRepository.create({
  userId: user.id,
  licenseNumber: '12345',
  licenseDate: new Date('2020-01-01')
});

// 3. 조직 멤버 등록 (organization-core)
const member = await organizationMemberRepository.create({
  organizationId: 'org-seoul',
  userId: user.id,
  role: 'member',
  joinedAt: new Date()
});

// 4. 역할 할당 (기존 RBAC 확장)
const assignment = await roleAssignmentRepository.create({
  userId: user.id,
  role: 'pharmacist',
  scopeType: 'organization',
  scopeId: 'org-seoul',
  isActive: true
});
```

### 3.2 기존 구조와의 호환성

| 기존 기능 | organization-core 추가 후 | 호환성 |
|---------|------------------------|-------|
| User 로그인 | 변경 없음 | ✅ 완전 호환 |
| JWT 토큰 | user.organizations 추가 | ✅ 호환 |
| RBAC 미들웨어 | scopeType 고려 추가 | ✅ 하위 호환 |
| Admin 대시보드 | Organization 메뉴 추가 | ✅ 호환 |
| YaksaCommunity | organization-core 통합 | 🟡 마이그레이션 필요 |

---

## 4. 약사회 서비스 요구사항 분석

### 3.1 조직 구조 요구사항

```
대한약사회 (본회)
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

### 3.2 회원 데이터 요구사항

| 필드 | 용도 | 우선순위 | 현재 상태 |
|------|------|----------|-----------|
| `licenseNumber` | 약사 면허번호 | **P0** | ❌ 없음 |
| `organizationId` | 소속 지부/분회 | **P0** | ❌ 없음 |
| `pharmacyName` | 소속 약국명 | P1 | ❌ 없음 |
| `employmentType` | 근무 형태 | P1 | ❌ 없음 |
| `memberTier` | 회원 등급 | P1 | ❌ 없음 |
| `certifications` | 보수교육 이수 내역 | P2 | ❌ 없음 |

### 3.3 역할 요구사항

| 역할 | 설명 | 현재 UserRole | 우선순위 |
|------|------|---------------|----------|
| `pharmacist` | 정회원 (면허 보유) | ❌ 없음 | P1 |
| `branch_admin` | 지부 관리자 | ❌ 없음 | **P0** |
| `division_admin` | 분회 관리자 | ❌ 없음 | **P0** |
| `education_manager` | 교육 담당자 | ❌ 없음 | P1 |
| `pharmacist_student` | 준회원 (약학대생) | ❌ 없음 | P2 |

---

## 5. 개선 필요 사항

### P0 (긴급 - organization-core 개발 전)
**결론**: 없음. 현재 구조는 확장 준비 완료 상태.

### P1 (단기 - organization-core 개발 시)

#### 1. RoleAssignment 확장
**파일**: apps/api-server/src/entities/RoleAssignment.ts

```typescript
@Column({ name: 'scope_type', type: 'varchar', length: 50, nullable: true })
scopeType?: string; // 'global' | 'organization' | 'branch'

@Column({ name: 'scope_id', type: 'varchar', length: 255, nullable: true })
scopeId?: string;

@Index(['scopeType', 'scopeId'])
```

#### 2. User 메타데이터 표준화
**파일**: apps/api-server/src/entities/User.ts

```typescript
// 주석 해제 및 타입 정의
@Column({ type: 'json', nullable: true })
metadata?: UserMetadata;

interface UserMetadata {
  pharmacistProfile?: {
    licenseNumber: string;
    licenseDate: string;
  };
  organizations?: {
    primaryOrgId: string;
    joinedOrgs: string[];
  };
}
```

#### 3. Organization-Core App 개발
**위치**: packages/organization-core/ (신규)

엔티티:
- Organization
- OrganizationMember
- OrganizationHierarchy (선택)

서비스:
- OrganizationService
- MembershipService

API:
- `/organizations` - 조직 CRUD
- `/organizations/:id/members` - 멤버 관리
- `/organizations/:id/hierarchy` - 계층 구조

### P2 (중기 - 향후 개선)

#### 1. YaksaCommunity → Organization 통합
현재 YaksaCommunity를 organization-core 구조로 마이그레이션

#### 2. Multi-tenant 완전 지원
User.domain 필드 활용 (현재 선택적)

#### 3. Organization 기반 데이터 격리
tenant-context 미들웨어 확장

---

## 6. 권장 개발 로드맵

### Phase 1: Organization Core 개발 (2주)
- [ ] Organization 엔티티 설계
- [ ] OrganizationMember 엔티티 설계
- [ ] CRUD API 개발
- [ ] Admin UI: 조직 관리 페이지

### Phase 2: RBAC 확장 (1주)
- [ ] RoleAssignment에 scopeType/scopeId 추가
- [ ] RBAC 미들웨어 업데이트
- [ ] 권한 체크 로직 수정

### Phase 3: 약사회 도메인 구현 (2주)
- [ ] PharmacistProfile 엔티티
- [ ] 약사 인증 플로우
- [ ] 지부/분회 가입 플로우
- [ ] 약사회 전용 대시보드

### Phase 4: 통합 테스트 (1주)
- [ ] User + Organization 통합 테스트
- [ ] RBAC 조직 범위 테스트
- [ ] 멤버십 플로우 테스트

---

## 7. 참고: 권장 해결 방안 (v1.0)

### 7.1 Phase 1 (P0) - 조직 구조 구축

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
  managerUserId?: string

  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### ② OrganizationClosure 테이블 (계층 관리)
```typescript
@Entity('organization_closure')
class OrganizationClosure {
  ancestorId: string   // FK to organizations.id
  descendantId: string // FK to organizations.id
  depth: number        // 0=자기자신, 1=직속 자식, 2=손자

  // Composite PK: (ancestorId, descendantId)
}
```

**선택 이유**: Closure Table 패턴
- ✅ 조상/자손 쿼리 단일 JOIN
- ✅ 깊이 제한 없음
- ✅ 약사회는 최대 3단계 (본회-지부-분회) → 최적

#### ③ OrganizationMember 테이블 (회원-조직 연결)
```typescript
@Entity('organization_members')
class OrganizationMember {
  id: string
  organizationId: string  // FK to organizations
  userId: string          // FK to users
  role: 'admin' | 'member'
  isPrimary: boolean      // 주 소속 조직
  joinedAt: Date
  leftAt?: Date
}
```

### 5.2 Phase 2 (P0) - 조직 기반 권한 확장

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
  assignedAt: Date
  assignedBy?: string
}
```

**예시**:
```typescript
// 전역 관리자
{ userId: 'admin1', role: 'admin', scopeType: 'global', scopeId: null }

// 서울지부 관리자
{ userId: 'user1', role: 'branch_admin', scopeType: 'organization', scopeId: 'seoul-uuid' }
```

### 5.3 Phase 3 (P1) - 약사 프로필 및 역할

#### ① PharmacistProfile 엔티티
```typescript
@Entity('pharmacist_profiles')
class PharmacistProfile {
  id: string
  userId: string (unique, FK to users)

  licenseNumber: string (encrypted, indexed)
  pharmacyName?: string
  employmentType: 'independent' | 'employed'
  licenseIssueDate: Date

  organizationId?: string  // FK to organizations

  certifications: JSONB
  metadata: JSONB

  createdAt: Date
  updatedAt: Date
}
```

#### ② UserRole Enum 확장
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

### 5.4 Phase 4 (P1) - 조직 설정 시스템

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
```

---

## 6. 마이그레이션 전략

### 6.1 단계별 구현 순서

| Phase | 작업 | 영향도 | 소요 시간 (추정) |
|-------|------|--------|------------------|
| **Phase 1** | Organization/OrganizationClosure/OrganizationMember 생성 | 低 | 2일 |
| **Phase 2** | RoleAssignment 확장 (scopeType/scopeId) | 中 | 1일 |
| **Phase 3** | PharmacistProfile 생성, UserRole 확장 | 中 | 1일 |
| **Phase 4** | OrganizationSetting 생성 | 低 | 0.5일 |
| **Phase 5** | 서비스 통합 (Forum/LMS/Order) | 高 | 3일 |

**총 소요 시간**: 약 7.5일

### 6.2 영향도 분석

#### Phase 1 (Organization 생성)
- ✅ 기존 코드 무영향 (새 테이블만 추가)
- ✅ 점진적 마이그레이션 가능

#### Phase 2 (RoleAssignment 확장)
- ⚠️ RoleAssignment 쿼리 수정 필요
- ⚠️ JWT payload에 organizationId 추가 가능

#### Phase 3 (PharmacistProfile)
- ✅ 신규 엔티티로 기존 코드 무영향
- ⚠️ 회원가입 플로우 수정 필요

#### Phase 4 (OrganizationSetting)
- ✅ 신규 엔티티로 기존 코드 무영향

#### Phase 5 (서비스 통합)
- ⚠️ Forum: YaksaCommunity-Organization 연동
- ⚠️ Post: organizationId 추가
- ⚠️ Order: 조직 전용 구매 지원

---

## 7. 기대 효과

### 7.1 조직 구조 구축 후

**가능해지는 기능**:
1. ✅ "서울지부 소속 약사 목록" 조회
2. ✅ "강남분회 → 서울지부 → 본회" 계층 탐색
3. ✅ "서울지부 및 모든 하위 분회에 공지" 발송
4. ✅ 지부/분회별 통계 (회원 수, 교육 이수율 등)

### 7.2 조직 기반 권한 구축 후

**가능해지는 기능**:
1. ✅ "서울지부 관리자" 역할 생성
2. ✅ "강남분회 회원만 게시글 작성" 권한 제어
3. ✅ 상위 조직 관리자 권한 자동 상속
4. ✅ 조직별 포럼/교육/공동구매 접근 제어

### 7.3 약사 프로필 구축 후

**가능해지는 기능**:
1. ✅ 약사 면허번호 기반 회원 검증
2. ✅ 보수교육 이수 내역 관리
3. ✅ "미이수 약사" 필터링 및 알림
4. ✅ 약사/약학대생 등급별 서비스 차등 제공

---

## 8. 위험 요소 및 대응 방안

### 8.1 데이터 마이그레이션

**위험**: 기존 회원의 조직 소속 정보 부재
**대응**:
- 초기 데이터 입력 시 관리자가 수동 배정
- 회원이 프로필에서 소속 조직 선택 (승인 프로세스)

### 8.2 성능 문제

**위험**: 조직 계층 쿼리 성능 저하
**대응**:
- Closure Table 사용 (단일 JOIN 쿼리)
- 자주 조회되는 경로는 캐싱

### 8.3 권한 충돌

**위험**: 레거시 Role 시스템과 신규 RoleAssignment 충돌
**대응**:
- User.hasRole() 메서드는 양쪽 모두 확인 (하위 호환)
- 신규 기능은 RoleAssignment만 사용
- 레거시 필드는 DEPRECATED 마킹 유지

---

## 9. 다음 단계

### 9.1 즉시 조치 필요 (P0)

1. **조직 구조 설계 최종 승인**
   - Organization/OrganizationClosure/OrganizationMember 스키마 검토
   - 조직 코드 체계 확정 (예: 'SEOUL', 'SEOUL_GANGNAM')

2. **마이그레이션 계획 수립**
   - Phase별 상세 일정 확정
   - 테스트 계획 수립

3. **초기 조직 데이터 준비**
   - 지부/분회 목록 확정
   - 각 조직 메타데이터 (주소, 연락처 등) 수집

### 9.2 후속 조치 (P1)

1. **약사 프로필 필드 최종 확정**
   - 면허번호 암호화 방식 결정
   - 보수교육 데이터 구조 설계

2. **서비스 통합 우선순위 결정**
   - Forum 먼저? LMS 먼저? 공동구매 먼저?
   - 각 서비스별 조직 연동 방식 설계

3. **권한 정책 문서화**
   - 역할별 권한 매트릭스 작성
   - 조직 범위 권한 규칙 정의

---

## 10. 관련 문서

### 10.1 상세 조사 보고서

1. **01_user_member_structure_audit.md**
   - User 엔티티 필드 분석
   - 약사 필수 필드 부재 상세
   - 회원 확장 메커니즘 조사

2. **02_organization_structure_audit.md**
   - Organization 엔티티 부재 상세
   - 계층 구조 패턴 비교 (Adjacency List vs Closure Table)
   - 조직-서비스 연동 방안

3. **03_rbac_structure_audit.md**
   - Role/Permission/RoleAssignment 구조 분석
   - 조직 기반 권한 제어 방안
   - 약사 역할 설계

### 10.2 참고 자료

- `/apps/api-server/src/entities/User.ts`
- `/apps/api-server/src/entities/Role.ts`
- `/apps/api-server/src/entities/RoleAssignment.ts`
- `/packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts`
- `/apps/api-server/src/middleware/tenant-context.middleware.ts`

---

---

## 8. 결론

O4O Platform의 현재 구조는 **조직 도메인 확장에 매우 적합**합니다.

### 강점
1. ✅ User 엔티티: 확장 메커니즘 보유
2. ✅ RBAC: 조직 범위 추가 가능
3. ✅ 레퍼런스 구현: YaksaCommunity 활용 가능
4. ✅ App 기반 아키텍처: 도메인 격리 우수

### 권장사항
1. **P0 작업 없음**: 현재 구조로 organization-core 개발 가능
2. **P1 작업**: RoleAssignment 확장, Organization 엔티티 개발
3. **아키텍처 유지**: Core + Extension 패턴 활용

### 최종 평가: 4/5
- 감점 이유: Organization 엔티티 부재 (단, 신규 개발 예정이므로 문제 아님)
- 개선 방향: organization-core 개발로 5/5 달성 가능

---

**최종 업데이트**: 2025-11-30
**문서 버전**: 1.1 (정정판)
**작성자**: Claude (Anthropic)
