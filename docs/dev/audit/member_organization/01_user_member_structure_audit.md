# User/Member 데이터 구조 전수 조사

**작성일**: 2025-11-30
**조사 범위**: 회원 데이터 구조, 필드 정의, 확장 메커니즘
**조사 대상 파일**:
- `/apps/api-server/src/entities/User.ts`
- `/apps/api-server/src/entities/BusinessInfo.ts`
- `/apps/api-server/src/types/auth.ts`
- `/apps/api-server/src/database/migrations/1700000000000-CreateUsersTable.ts`

---

## 1. User Entity 구조 분석

### 1.1 핵심 필드 목록

O4O Platform의 사용자는 **단일 User 엔티티**로 관리되며, Member 개념은 별도 엔티티로 분리되어 있지 않음.

#### 기본 식별 정보
```typescript
id: string (UUID)
email: string (unique, indexed)
password: string (bcrypt hashed)
firstName?: string
lastName?: string
name?: string
avatar?: string
phone?: string  // Phase 3-3: 결제 자동 입력용
```

#### 상태 및 인증
```typescript
status: UserStatus  // ACTIVE | INACTIVE | PENDING | APPROVED | SUSPENDED | REJECTED
isActive: boolean
isEmailVerified: boolean
provider?: string  // 'local', 'google', 'kakao' 등
provider_id?: string
```

#### 역할 및 권한 (RBAC)
```typescript
// DEPRECATED 필드 (하위 호환용)
role: UserRole  // 단일 역할 (레거시)
roles: string[]  // 다중 역할 배열 (레거시)
dbRoles?: Role[]  // ManyToMany 관계 (레거시)
activeRole?: Role  // 활성 역할 (레거시)

// 현재 사용 권장 구조
permissions: string[]  // 직접 부여된 권한 배열
```

**중요**: 모든 `role`, `roles`, `dbRoles`, `activeRole` 필드는 **DEPRECATED** 상태이며, 신규 개발 시 `role_assignments` 테이블 사용 권장

#### 비즈니스 정보
```typescript
businessInfo?: BusinessInfo  // JSON 타입 (한국 전자상거래법 준수)

interface BusinessInfo {
  businessName?: string        // 사업자명 (상호명)
  businessNumber?: string      // 사업자등록번호
  businessType?: string        // 사업자 유형 (개인/법인)
  ceoName?: string            // 대표자명
  address?: string            // 사업장 주소
  telecomLicense?: string     // 통신판매업 신고번호
  phone?: string
  email?: string
  website?: string
  metadata?: Record<string, any>
}
```

#### 보안 및 세션 관리
```typescript
refreshTokenFamily?: string
lastLoginAt?: Date
lastLoginIp?: string
loginAttempts: number
lockedUntil?: Date
resetPasswordToken?: string
resetPasswordExpires?: Date
```

#### 승인 프로세스
```typescript
approvedAt?: Date
approvedBy?: string  // 승인한 관리자 ID
onboardingCompleted: boolean
```

#### 멀티테넌트 지원
```typescript
domain?: string  // 멀티테넌트 도메인 식별자
```

#### 타임스탬프
```typescript
createdAt: Date
updatedAt: Date
```

### 1.2 관계 (Relations)

```typescript
// 인증 관련
refreshTokens?: RefreshToken[]
approvalLogs?: ApprovalLog[]
adminActions?: ApprovalLog[]
linkedAccounts?: LinkedAccount[]
accountActivities?: AccountActivity[]

// 드랍쉬핑 역할 프로필
supplier?: Supplier  // OneToOne
seller?: Seller      // OneToOne
partner?: Partner    // OneToOne
```

---

## 2. 약사회 서비스 필수 필드 부재 분석

### 2.1 존재하지 않는 필드

다음 필드들은 약사회 서비스 요구사항에 필수적이나 **현재 존재하지 않음**:

| 필드명 | 용도 | 우선순위 |
|--------|------|----------|
| `licenseNumber` | 약사 면허번호 | **P0** |
| `pharmacyName` | 소속 약국명 | P1 |
| `employmentType` | 근무 형태 (개국/근무약사) | P1 |
| `licenseIssueDate` | 면허 발급일 | P2 |
| `licenseExpiryDate` | 면허 만료일 | P2 |
| `certifications` | 보수교육 이수 내역 | P2 |
| `organizationId` | 소속 지부/분회 ID | **P0** |
| `membershipStatus` | 회원 자격 상태 | P1 |
| `membershipStartDate` | 가입일 | P1 |
| `membershipEndDate` | 탈퇴/휴면일 | P2 |
| `specializations` | 전문 분야 (임상/약무 등) | P3 |

### 2.2 확장 가능성

#### 방법 1: `businessInfo` JSON 활용
현재 `businessInfo` 필드를 확장하여 약사 정보 저장 가능:

```typescript
businessInfo: {
  // 기존 전자상거래 필드
  businessName: "홍길동 약국",
  businessNumber: "123-45-67890",

  // 약사 정보 (추가 가능)
  licenseNumber: "A12345",
  pharmacyName: "홍길동 약국",
  employmentType: "개국약사",

  metadata: {
    certifications: [...],
    specializations: [...]
  }
}
```

**문제점**:
- JSON 필드 내 데이터는 **인덱싱 불가** (검색/필터링 성능 저하)
- 타입 안정성 부족
- 약사 특화 유효성 검사 불가능
- 면허번호 등 민감 정보 암호화 어려움

#### 방법 2: 별도 `PharmacistProfile` 엔티티 생성 (권장)

```typescript
@Entity('pharmacist_profiles')
class PharmacistProfile {
  id: string
  userId: string  // FK to users
  licenseNumber: string (unique, indexed, encrypted)
  pharmacyName?: string
  employmentType: 'independent' | 'employed'
  licenseIssueDate: Date
  certifications: JSON
  organizationId?: string  // FK to organizations (미구현)
  ...
}
```

**장점**:
- 필드별 인덱싱 가능
- 타입 안정성 보장
- 암호화/마스킹 적용 용이
- 약사회 전용 비즈니스 로직 분리

---

## 3. User Entity의 확장 메커니즘

### 3.1 현재 지원되는 확장 방법

#### ① BusinessInfo (JSON)
- 위치: `User.businessInfo` 필드
- 타입: `JSON` (PostgreSQL JSONB)
- 용도: 전자상거래 사업자 정보
- **제약**: 인덱싱 불가, 타입 검증 제한적

#### ② OneToOne 프로필 엔티티
현재 드랍쉬핑 역할별로 분리된 프로필:

```typescript
// Supplier 역할
supplier?: Supplier {
  userId: string
  companyName: string
  taxId: string
  bankAccount: {...}
  warehouseInfo: {...}
}

// Seller 역할
seller?: Seller {
  userId: string
  storeName: string
  salesChannel: string
  bankAccount: {...}
}

// Partner 역할
partner?: Partner {
  userId: string
  partnerType: string
  platform: string
  defaultCommissionRate: number
}
```

**패턴 분석**:
- 역할별 프로필 = OneToOne 관계
- 역할 할당 = `role_assignments` 테이블
- 프로필은 역할 승인 후 자동 생성

**적용 가능성**:
약사 역할도 동일 패턴 적용 가능:
```typescript
// Pharmacist 역할
pharmacist?: Pharmacist {
  userId: string
  licenseNumber: string
  pharmacyName: string
  organizationId: string  // 소속 지부/분회
  certifications: JSON
}
```

#### ③ JSON metadata 필드 (확장 가능)
```typescript
User.businessInfo.metadata?: Record<string, any>
```

### 3.2 CPT (Custom Post Type) / ACF (Advanced Custom Fields) 지원 여부

**현재 구현 상태**:
- CPT/ACF는 **Post 엔티티 전용**으로 구현됨
- User 엔티티에는 **지원되지 않음**

**조사 결과**:
- `/apps/api-server/src/entities/CustomField.ts`: Post 메타데이터 전용
- `/apps/api-server/src/entities/ACFField.ts`: Post 필드 그룹 전용
- User 확장 필드는 별도 엔티티 또는 JSON 필드 활용 필요

---

## 4. 회원 등급 (Member Tier) 구조

### 4.1 현재 회원 등급 관련 필드

**User 엔티티**:
- 등급 필드 **존재하지 않음**

**Order 엔티티**:
```typescript
buyerGrade: string  // RetailerGrade (주문 생성 시 스냅샷)
```

**Product 엔티티**:
```typescript
tierPricing?: {
  bronze?: number
  silver?: number
  gold?: number
  platinum?: number
}
```

### 4.2 약사회 회원 등급 요구사항

약사회 서비스에서 필요한 등급 구조:

| 등급명 | 조건 | 혜택 |
|--------|------|------|
| 정회원 | 면허 보유 + 가입 승인 | 교육 이수, 포럼 접근 |
| 준회원 | 약학대생 | 일부 교육 제한 |
| 명예회원 | 초청 | 전체 접근 |
| 휴면회원 | 1년 미접속 | 접근 제한 |

**권장 구현 방법**:
```typescript
@Entity('users')
class User {
  memberTier?: 'full' | 'associate' | 'honorary' | 'dormant'
  memberTierUpdatedAt?: Date
  memberTierReason?: string
}
```

또는 별도 테이블:
```typescript
@Entity('member_tiers')
class MemberTier {
  userId: string
  tier: string
  validFrom: Date
  validUntil?: Date
  reason: string
}
```

---

## 5. 회원 상태 (Member Status) 관리

### 5.1 현재 상태 관리

```typescript
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}
```

**흐름**:
1. 회원가입 → `PENDING`
2. 관리자 승인 → `APPROVED` + `approvedAt` 기록
3. 계정 비활성화 → `INACTIVE`
4. 정책 위반 → `SUSPENDED`

### 5.2 약사회 요구사항 매핑

| 약사회 상태 | 현재 UserStatus | 추가 필요 여부 |
|-------------|-----------------|----------------|
| 가입 대기 | PENDING | O |
| 정회원 | APPROVED + isActive=true | O |
| 휴면회원 | INACTIVE | X (휴면 사유 구분 필요) |
| 탈퇴 | - | **P0** (soft delete 필요) |
| 자격 정지 | SUSPENDED | O |

**권장 추가 필드**:
```typescript
withdrawnAt?: Date
withdrawnReason?: string
dormancyStartDate?: Date  // 1년 미접속 시 자동 설정
```

---

## 6. 회원-조직 연결 구조

### 6.1 현재 조직 참조 필드

**User 엔티티**:
```typescript
domain?: string  // 멀티테넌트 식별자
```

**문제점**:
- `domain`은 서브도메인 기반 멀티테넌트용
- 조직 계층 구조 (지부/분회) 미지원
- 회원이 속한 조직 ID 저장 불가

### 6.2 약사회 조직 구조 요구사항

```
대한약사회 (GLOBAL)
├── 서울지부 (BRANCH)
│   ├── 강남분회 (DIVISION)
│   └── 서초분회 (DIVISION)
└── 경기지부 (BRANCH)
    ├── 수원분회 (DIVISION)
    └── 성남분회 (DIVISION)
```

**필요 필드**:
```typescript
organizationId?: string  // FK to organizations
organizationType?: 'branch' | 'division'
organizationJoinedAt?: Date
```

### 6.3 포럼 패키지의 조직 구조 참고

**발견**: `packages/forum-yaksa` 패키지에 **유사 구조 존재**

```typescript
// YaksaCommunity.ts
enum CommunityType {
  PERSONAL = 'personal',
  BRANCH = 'branch',      // 지부
  DIVISION = 'division',  // 분회
  GLOBAL = 'global'
}

@Entity('yaksa_forum_community')
class YaksaCommunity {
  id: string
  name: string
  type: CommunityType
  ownerUserId: string
  requireApproval: boolean
  metadata?: Record<string, unknown>
}

@Entity('yaksa_forum_community_member')
class YaksaCommunityMember {
  id: string
  communityId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
}
```

**시사점**:
- 포럼은 **Community** 개념으로 조직 구현
- 회원은 **CommunityMember**로 조직에 소속
- User 엔티티에는 **조직 참조 필드 없음**

**문제**:
- 포럼 Community ≠ 실제 약사회 조직
- 회원이 `users` 테이블에서 조직 정보 조회 불가
- 지부/분회 기반 권한 제어 불가

---

## 7. 회원 데이터 연동 현황

### 7.1 Post (포럼/공지)

```typescript
@Entity('posts')
class Post {
  author_id: string  // FK to users.id
  tenant_id: string | null  // 멀티테넌트 격리
}
```

**연동 방식**:
- `author_id`로 작성자 식별
- `tenant_id`로 지부/분회 격리 가능 (현재 미활용)

### 7.2 Order (공동구매)

```typescript
@Entity('orders')
class Order {
  buyerId: string  // FK to users.id
  buyerName: string
  buyerEmail: string
  buyerGrade: string  // 주문 시점 회원 등급 스냅샷
}
```

**연동 방식**:
- `buyerId`로 구매자 식별
- `buyerGrade`로 등급별 가격 적용 (tierPricing)
- **문제**: User에 등급 필드 없음 (Order 생성 시 어디서 가져오는지 불명확)

### 7.3 Forum Community

```typescript
@Entity('yaksa_forum_community_member')
class YaksaCommunityMember {
  userId: string  // FK to users.id
  communityId: string
  role: 'owner' | 'admin' | 'member'
}
```

**연동 방식**:
- `userId`로 회원 식별
- Community별 멤버십 관리
- **문제**: User에서 "내가 속한 Community" 조회 불가 (역방향 참조)

### 7.4 LMS (학습 관리)

**조사 결과**: LMS 관련 엔티티 **미발견**

추정 구조:
```typescript
// 추정 (미구현)
class LMSEnrollment {
  userId: string
  courseId: string
  progress: number
  completedAt?: Date
}
```

**약사회 요구사항**:
- 보수교육 이수 내역 저장
- 지부/분회별 교육 이수율 통계
- 미이수 회원 필터링

---

## 8. 문제점 요약

### 8.1 데이터 구조 문제

| 문제 | 영향도 | 우선순위 |
|------|--------|----------|
| 약사 면허번호 필드 부재 | **P0** | **긴급** |
| 조직(지부/분회) 참조 필드 부재 | **P0** | **긴급** |
| 회원 등급 필드 부재 | P1 | 높음 |
| 회원 탈퇴 처리 메커니즘 부재 | P1 | 높음 |
| 휴면 회원 처리 필드 부재 | P2 | 중간 |
| 보수교육 이수 내역 저장 구조 부재 | P2 | 중간 |

### 8.2 확장성 문제

| 문제 | 영향도 |
|------|--------|
| JSON 필드 인덱싱 불가 | 검색 성능 저하 |
| User ACF 미지원 | 동적 필드 확장 불가 |
| 역방향 조직 조회 불가 | "내 지부/분회" 조회 비효율 |

### 8.3 연동 문제

| 문제 | 영향도 |
|------|--------|
| Order.buyerGrade 출처 불명확 | 데이터 정합성 위험 |
| 포럼 Community ≠ 실제 조직 | 조직 중복 관리 |
| LMS 엔티티 미발견 | 교육 이수 관리 불가 |

---

## 9. 권장 해결 방안

### 9.1 단기 (P0)

#### ① PharmacistProfile 엔티티 생성
```typescript
@Entity('pharmacist_profiles')
class PharmacistProfile {
  id: string
  userId: string (FK, unique)
  licenseNumber: string (encrypted, indexed)
  pharmacyName?: string
  employmentType: 'independent' | 'employed'
  organizationId?: string  // FK to organizations
  licenseIssueDate: Date
  createdAt: Date
  updatedAt: Date
}
```

#### ② Organization 엔티티 생성 (→ 02번 문서 참조)

#### ③ User 필드 추가
```typescript
withdrawnAt?: Date
dormancyStartDate?: Date
memberTier?: string
```

### 9.2 중기 (P1)

- LMS Enrollment 엔티티 설계
- 회원 등급 자동 산정 로직
- 휴면 회원 자동 전환 배치

### 9.3 장기 (P2)

- User ACF 지원 검토
- 조직 계층 쿼리 최적화
- 통합 회원 대시보드

---

## 10. 다음 문서

- **02_organization_structure_audit.md**: 조직(지부/분회) 구조 전수 조사
- **03_rbac_structure_audit.md**: RBAC 및 권한 시스템 조사
- **04_member_org_integration_map.md**: 회원-조직-권한 통합 맵
- **05_member_org_rbac_issues.md**: 발견된 문제점 및 해결 방안
