# O4O Platform 회원/조직/인증 구조 전수 조사 - Phase 2 요약

**작성일**: 2025-11-30
**조사자**: Claude (Anthropic)
**조사 목적**: 약사회 지부·분회 서비스 구현을 위한 현재 시스템 구조 파악 및 개선 방안 도출

---

## 1. 조사 개요

### 1.1 조사 범위

| 영역 | 조사 대상 | 문서 |
|------|-----------|------|
| **회원 데이터** | User/Member 엔티티, 필드 구조, 확장 메커니즘 | `01_user_member_structure_audit.md` |
| **조직 구조** | Organization/Branch/Division 엔티티, 계층 구조 | `02_organization_structure_audit.md` |
| **RBAC** | Role/Permission/RoleAssignment, 권한 시스템 | `03_rbac_structure_audit.md` |

### 1.2 핵심 발견 사항

**긍정적 발견**:
- ✅ 견고한 User 엔티티 구조
- ✅ P0 RBAC 시스템 (RoleAssignment) 구현 완료
- ✅ 역할 신청/승인 프로세스 (RoleEnrollment) 존재
- ✅ 멀티테넌트 기반 준비 (tenant_id)
- ✅ Forum 패키지에 조직 유사 구조 (YaksaCommunity)

**문제점 발견**:
- ❌ **Organization 엔티티 부재** (P0)
- ❌ **조직 계층 구조 미지원** (P0)
- ❌ **조직 기반 권한 제어 불가** (P0)
- ❌ 약사 필수 필드 부재 (면허번호 등)
- ❌ 회원-조직 연결 구조 없음

---

## 2. 현재 시스템 구조 분석

### 2.1 User (회원) 구조

#### 핵심 필드
```typescript
@Entity('users')
class User {
  id: string
  email: string
  password: string
  name?: string
  phone?: string

  // 상태
  status: UserStatus  // ACTIVE | PENDING | APPROVED | SUSPENDED
  isActive: boolean
  isEmailVerified: boolean

  // 역할 (DEPRECATED - 하위 호환용)
  role: UserRole
  roles: string[]
  dbRoles?: Role[]

  // 직접 권한
  permissions: string[]

  // 비즈니스 정보 (JSON)
  businessInfo?: BusinessInfo

  // 멀티테넌트
  domain?: string

  // 타임스탬프
  createdAt: Date
  updatedAt: Date
}
```

#### 문제점
| 문제 | 우선순위 |
|------|----------|
| 약사 면허번호 필드 없음 | **P0** |
| 조직(지부/분회) 참조 필드 없음 | **P0** |
| 회원 등급 필드 없음 | P1 |
| 회원 탈퇴 처리 메커니즘 없음 | P1 |

### 2.2 Organization (조직) 구조

#### 현재 상태
**결론**: Organization 엔티티 **존재하지 않음**

**발견된 조직 관련 구조**:
1. **tenant_id** (Post 엔티티)
   - 멀티테넌트 격리용
   - 단순 문자열 (FK 아님)
   - 조직 메타데이터 없음

2. **YaksaCommunity** (Forum 패키지)
   - 포럼 커뮤니티 전용
   - 지부/분회 개념 존재 (type: BRANCH | DIVISION)
   - **계층 구조 미지원** (parentId 없음)

#### 문제점
| 문제 | 영향 | 우선순위 |
|------|------|----------|
| Organization 엔티티 없음 | 조직 정보 저장 불가 | **P0** |
| 계층 구조 미지원 | 지부-분회 관계 표현 불가 | **P0** |
| 회원-조직 연결 없음 | 소속 조직 조회 불가 | **P0** |
| 조직 설정 저장 불가 | 지부/분회별 정책 설정 불가 | P1 |

### 2.3 RBAC (역할/권한) 구조

#### 현재 구조
```
User ──1:N──> RoleAssignment ──N:1──> Role ──N:N──> Permission
```

**RoleAssignment** (신규 P0 시스템):
```typescript
@Entity('role_assignments')
class RoleAssignment {
  id: string
  userId: string
  role: string  // 'admin', 'supplier', 'seller'

  isActive: boolean
  validFrom: Date
  validUntil?: Date

  assignedAt: Date
  assignedBy?: string
}
```

**Role**:
```typescript
@Entity('roles')
class Role {
  id: string
  name: string  // 'admin', 'supplier'
  displayName: string
  isActive: boolean
  isSystem: boolean
  permissions: Permission[]  // N:N
}
```

**Permission**:
```typescript
@Entity('permissions')
class Permission {
  id: string
  key: string  // 'users.view', 'content.create'
  category: string
  appId?: string  // 앱 기반 격리
}
```

#### 문제점
| 문제 | 영향 | 우선순위 |
|------|------|----------|
| RoleAssignment에 조직 범위 없음 | "서울지부 관리자" 표현 불가 | **P0** |
| Permission에 조직 격리 없음 | 조직별 권한 제어 불가 | **P0** |
| 약사 역할 없음 | 약사 회원 구분 불가 | P1 |
| 권한 상속 미지원 | 상위 조직 관리자 권한 상속 불가 | P2 |

---

## 3. 약사회 서비스 요구사항 분석

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

## 4. 핵심 문제점 요약

### 4.1 P0 (긴급) - 서비스 런칭 불가 수준

| 문제 | 영향 | 문서 참조 |
|------|------|----------|
| **Organization 엔티티 부재** | 지부/분회 데이터 저장 불가 | 02번 문서 |
| **조직 계층 구조 미지원** | 상하 관계 표현 불가 | 02번 문서 |
| **회원-조직 연결 구조 없음** | 소속 조직 조회 불가 | 01번 문서 |
| **조직 기반 권한 제어 불가** | "지부 관리자" 역할 불가 | 03번 문서 |
| **약사 면허번호 필드 부재** | 약사 식별 불가 | 01번 문서 |

### 4.2 P1 (높음) - 핵심 기능 제약

| 문제 | 영향 |
|------|------|
| 회원 등급 필드 부재 | 정회원/준회원 구분 불가 |
| 회원 탈퇴 처리 메커니즘 부재 | 탈퇴 회원 관리 불가 |
| 조직 설정 저장 불가 | 지부/분회별 정책 설정 불가 |
| 약사 역할 부재 | 약사 회원 권한 제어 불가 |

### 4.3 P2 (중간) - 편의성 문제

| 문제 | 영향 |
|------|------|
| 휴면 회원 처리 필드 부재 | 1년 미접속 회원 자동 처리 불가 |
| 보수교육 이수 내역 저장 구조 부재 | 교육 이력 관리 불가 |
| 권한 상속 미지원 | 상위 조직 관리자 권한 수동 부여 필요 |

---

## 5. 권장 해결 방안

### 5.1 Phase 1 (P0) - 조직 구조 구축

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

**최종 업데이트**: 2025-11-30
**문서 버전**: 1.0
**작성자**: Claude (Anthropic)
