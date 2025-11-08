# DB 스키마 베이스라인 (Zero-Data)

> **작성일**: 2025-01-08
> **Phase**: P0
> **목적**: 역할 분리형 전환을 위한 Zero-Data 기반 스키마 정의

---

## 원칙

1. **Zero-Data 전제**: 기존 사용자 데이터 의존 없음
2. **레거시 필드 사용 중지**: `role`, `roles[]` 필드 deprecated 표기
3. **신청-승인-할당 모델**: enrollment → approval → assignment
4. **역할별 프로필 분리**: supplier_profiles, seller_profiles, partner_profiles
5. **감사 추적**: 모든 상태 전이를 audit_logs에 기록

---

## 1. users 테이블 (슬림화)

### 1.1 기본 구조

```sql
CREATE TABLE users (
  -- 기본 필드
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- 프로필
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  name VARCHAR(200),
  avatar VARCHAR(500),

  -- 상태
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,

  -- 소셜 로그인
  provider VARCHAR(100) DEFAULT 'local',
  provider_id VARCHAR(255),

  -- 보안
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(50),
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  refresh_token_family VARCHAR(255),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP,

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_is_active ON users(is_active);
```

### 1.2 레거시 필드 (DEPRECATED - 사용 중지)

```typescript
// User 엔티티에서 deprecated 표기
@Column({ type: 'enum', enum: UserRole, nullable: true })
/** @deprecated Use role_assignments instead */
role?: UserRole;

@Column({ type: 'simple-array', nullable: true })
/** @deprecated Use role_assignments instead */
roles?: string[];

@ManyToMany('Role', 'users', { eager: false })
/** @deprecated Use role_assignments instead */
dbRoles?: Role[];

@ManyToOne('Role', { nullable: true, eager: false })
/** @deprecated Use role_assignments.active instead */
activeRole?: Role | null;
```

**정리 전략**:
- P0: deprecated 주석 추가, 읽기 전용 유지 (기존 코드 호환)
- P1: 모든 참조 코드 제거
- P2: 컬럼 삭제 마이그레이션

---

## 2. role_enrollments 테이블 (역할 신청)

사용자가 특정 역할을 신청한 이력을 저장합니다.

```sql
CREATE TABLE role_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 신청 역할
  role VARCHAR(50) NOT NULL, -- 'supplier', 'seller', 'partner'

  -- 상태
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, ON_HOLD

  -- 승인/반려 정보
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_note TEXT,

  -- 신청 메타데이터
  application_data JSONB, -- 신청 시 제출한 정보

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrollments_user_id ON role_enrollments(user_id);
CREATE INDEX idx_enrollments_role ON role_enrollments(role);
CREATE INDEX idx_enrollments_status ON role_enrollments(status);
CREATE INDEX idx_enrollments_created_at ON role_enrollments(created_at DESC);
```

### 2.1 상태 전이

```
PENDING → APPROVED → (role_assignment 생성)
        → REJECTED
        → ON_HOLD → APPROVED / REJECTED
```

---

## 3. role_assignments 테이블 (역할 할당)

승인된 역할을 사용자에게 실제로 할당합니다.

```sql
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES role_enrollments(id) ON DELETE SET NULL,

  -- 역할
  role VARCHAR(50) NOT NULL, -- 'admin', 'supplier', 'seller', 'partner'

  -- 활성 상태
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- 유효 기간 (옵션)
  valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP,

  -- 할당 정보
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- 제약: 한 사용자는 동일 역할을 한 번만 active로 가질 수 있음
  CONSTRAINT unique_active_role_per_user UNIQUE(user_id, role)
    WHERE (is_active = true)
);

CREATE INDEX idx_assignments_user_id ON role_assignments(user_id);
CREATE INDEX idx_assignments_role ON role_assignments(role);
CREATE INDEX idx_assignments_is_active ON role_assignments(is_active);
CREATE INDEX idx_assignments_user_active ON role_assignments(user_id, is_active);
```

### 3.1 RBAC 판정 규칙

```typescript
// 서버 미들웨어에서 사용
function hasRole(userId: string, role: string): Promise<boolean> {
  return db.role_assignments.exists({
    user_id: userId,
    role: role,
    is_active: true,
    valid_from: { lte: NOW() },
    OR: [
      { valid_until: null },
      { valid_until: { gte: NOW() } }
    ]
  });
}
```

---

## 4. 역할별 프로필 테이블

### 4.1 supplier_profiles (공급자)

```sql
CREATE TABLE supplier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- 기업 정보
  company_name VARCHAR(200) NOT NULL,
  tax_id VARCHAR(100),
  business_registration JSONB, -- 사업자등록증 정보

  -- 연락처
  business_email VARCHAR(255),
  business_phone VARCHAR(50),
  business_address TEXT,

  -- 은행 정보
  bank_name VARCHAR(100),
  account_number VARCHAR(100),
  account_holder VARCHAR(100),

  -- 메타데이터
  metadata JSONB,

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_profiles_user_id ON supplier_profiles(user_id);
```

### 4.2 seller_profiles (판매자)

```sql
CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- 판매 채널 정보
  store_name VARCHAR(200) NOT NULL,
  store_url VARCHAR(500),
  sales_channel VARCHAR(100), -- 'smartstore', 'coupang', etc.

  -- 기업 정보
  company_name VARCHAR(200),
  tax_id VARCHAR(100),

  -- 연락처
  business_email VARCHAR(255),
  business_phone VARCHAR(50),

  -- 정산 정보
  bank_name VARCHAR(100),
  account_number VARCHAR(100),
  account_holder VARCHAR(100),

  -- 메타데이터
  metadata JSONB,

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);
```

### 4.3 partner_profiles (파트너)

```sql
CREATE TABLE partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- 파트너 정보
  partner_type VARCHAR(50), -- 'affiliate', 'influencer', etc.
  platform VARCHAR(100), -- 'youtube', 'instagram', 'blog', etc.
  channel_url VARCHAR(500),
  follower_count INTEGER,

  -- 개인/기업 정보
  is_business BOOLEAN DEFAULT false,
  company_name VARCHAR(200),
  tax_id VARCHAR(100),

  -- 연락처
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- 정산 정보
  bank_name VARCHAR(100),
  account_number VARCHAR(100),
  account_holder VARCHAR(100),

  -- 메타데이터
  metadata JSONB,

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_profiles_user_id ON partner_profiles(user_id);
```

---

## 5. kyc_documents 테이블 (KYC 문서)

```sql
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES role_enrollments(id) ON DELETE CASCADE,

  -- 문서 정보
  document_type VARCHAR(50) NOT NULL, -- 'business_registration', 'id_card', etc.
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- 검증 상태
  verification_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  verification_note TEXT,

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_enrollment_id ON kyc_documents(enrollment_id);
CREATE INDEX idx_kyc_documents_verification_status ON kyc_documents(verification_status);
```

---

## 6. audit_logs 테이블 (감사 로그)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 정보
  event_type VARCHAR(100) NOT NULL, -- 'enrollment.created', 'enrollment.approved', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'enrollment', 'assignment', etc.
  entity_id UUID NOT NULL,

  -- 주체 (누가)
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR(50),
  actor_ip VARCHAR(50),

  -- 대상 (누구에게)
  target_user_id UUID REFERENCES users(id),

  -- 변경 내용
  changes JSONB, -- { before: {}, after: {} }
  metadata JSONB,

  -- 타임스탬프
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target_user_id ON audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### 6.1 주요 이벤트 타입

- `enrollment.created` - 역할 신청 생성
- `enrollment.approved` - 신청 승인
- `enrollment.rejected` - 신청 거부
- `enrollment.on_hold` - 신청 보류
- `assignment.created` - 역할 할당
- `assignment.revoked` - 역할 회수
- `user.status_changed` - 사용자 상태 변경

---

## 7. 데이터 시드 (관리자 1계정)

```sql
-- 관리자 계정 생성
INSERT INTO users (id, email, password, name, status, is_active, is_email_verified)
VALUES (
  'admin-uuid-000-000-000-000-000000000000',
  'admin@neture.co.kr',
  '$2b$10$...',  -- bcrypt hash of 'admin123!@#'
  'System Admin',
  'ACTIVE',
  true,
  true
);

-- 관리자 역할 할당
INSERT INTO role_assignments (user_id, role, is_active, assigned_by)
VALUES (
  'admin-uuid-000-000-000-000-000000000000',
  'admin',
  true,
  'admin-uuid-000-000-000-000-000000000000'  -- self-assigned
);
```

---

## 8. TypeORM 엔티티 매핑

### 8.1 RoleEnrollment

```typescript
@Entity('role_enrollments')
export class RoleEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.enrollments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  role: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_HOLD';

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy?: User;

  @Column({ type: 'text', nullable: true })
  reviewNote?: string;

  @Column({ type: 'jsonb', nullable: true })
  applicationData?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => KycDocument, doc => doc.enrollment)
  documents: KycDocument[];
}
```

### 8.2 RoleAssignment

```typescript
@Entity('role_assignments')
export class RoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.assignments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => RoleEnrollment, { nullable: true })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment?: RoleEnrollment;

  @Column({ type: 'varchar', length: 50 })
  role: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil?: Date;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  assignedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 9. 마이그레이션 순서

### P0 마이그레이션

```typescript
// 1. 레거시 필드에 deprecated 주석 (코드 수정)
// 2. 새 테이블 생성
await queryRunner.query(`
  CREATE TABLE role_enrollments (...);
  CREATE TABLE role_assignments (...);
  CREATE TABLE supplier_profiles (...);
  CREATE TABLE seller_profiles (...);
  CREATE TABLE partner_profiles (...);
  CREATE TABLE kyc_documents (...);
  CREATE TABLE audit_logs (...);
`);

// 3. 인덱스 생성
await queryRunner.query(`
  CREATE INDEX idx_enrollments_user_id ...;
  CREATE INDEX idx_assignments_user_id ...;
  ...
`);

// 4. 관리자 계정 시드
await queryRunner.query(`
  INSERT INTO users ...;
  INSERT INTO role_assignments ...;
`);
```

### P1 마이그레이션 (레거시 제거)

```typescript
// 1. 레거시 필드 제거 (모든 코드에서 참조 제거 후)
await queryRunner.query(`
  ALTER TABLE users DROP COLUMN role;
  ALTER TABLE users DROP COLUMN roles;
  -- dbRoles, activeRole은 FK 제거
`);

// 2. user_roles 조인 테이블 제거
await queryRunner.query(`
  DROP TABLE user_roles;
`);

// 3. Role 엔티티 제거 여부 결정
```

---

## 10. 검증 체크리스트

- [x] 모든 테이블 생성 성공 (마이그레이션 완료)
- [x] 인덱스 생성 확인 (마이그레이션 포함)
- [x] FK 제약 조건 확인 (마이그레이션 포함)
- [x] 관리자 계정 시드 성공 (시드 마이그레이션 완료)
- [x] TypeORM 엔티티 매핑 확인 (6개 엔티티 생성 완료)
- [x] 레거시 필드에 deprecated 표기 (User.ts 업데이트 완료)
- [ ] audit_logs에 이벤트 기록 확인 (Phase B에서 API 구현 시 테스트)

---

**작성**: Claude Code
**상태**: ✅ Phase A 구현 완료 (2025-01-08)
**구현 파일**:
- `apps/api-server/src/entities/RoleEnrollment.ts`
- `apps/api-server/src/entities/RoleAssignment.ts`
- `apps/api-server/src/entities/KycDocument.ts`
- `apps/api-server/src/entities/SupplierProfile.ts`
- `apps/api-server/src/entities/SellerProfile.ts`
- `apps/api-server/src/entities/PartnerProfile.ts`
- `apps/api-server/src/database/migrations/3000000000000-CreateZeroDataRoleManagementTables.ts`
- `apps/api-server/src/database/migrations/3000000000001-SeedZeroDataAdminAndTestEnrollments.ts`

**다음**: Phase B (API 엔드포인트 & RBAC 미들웨어)
