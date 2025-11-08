# DB 스키마 현황 조사 (Database Schema - Current State)

> **조사 일시**: 2025-01-08
> **목적**: 사용자 관련 테이블 구조, 역할 관리, 확장 필드의 현재 상태 파악

---

## 1. User 엔티티 (단일 사용자 테이블)

### 1.1 파일 위치
**위치**: `apps/api-server/src/entities/User.ts`

### 1.2 테이블 구조

#### 기본 필드
| 필드명 | 타입 | 제약 | 설명 | 인덱스 |
|--------|------|------|------|--------|
| `id` | UUID | PK | 사용자 ID | ✅ PK |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 | ✅ UNIQUE |
| `password` | VARCHAR(255) | NOT NULL | bcrypt 해시 | - |
| `firstName` | VARCHAR(100) | NULLABLE | 이름 | - |
| `lastName` | VARCHAR(100) | NULLABLE | 성 | - |
| `name` | VARCHAR(200) | NULLABLE | 전체 이름 | - |
| `avatar` | VARCHAR(500) | NULLABLE | 아바타 URL | - |

#### 역할 필드 (중복/혼재)
**증거** (User.ts:L40-78):
```typescript
// 1. 레거시 단일 역할
@Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
role!: UserRole;

// 2. 레거시 다중 역할 (문자열 배열)
@Column({ type: 'simple-array', default: () => `'${UserRole.CUSTOMER}'` })
roles!: string[];

// 3. 신규 다중 역할 (ManyToMany)
@ManyToMany('Role', 'users', { eager: true })
@JoinTable({ name: 'user_roles', ... })
dbRoles?: Role[];

// 4. 활성 역할 (ManyToOne)
@ManyToOne('Role', { nullable: true, eager: true })
@JoinColumn({ name: 'active_role_id' })
activeRole?: Role | null;
```

**현황**:
- ❌ **3중 역할 필드**: `role`, `roles[]`, `dbRoles[]` **혼재**
- ❌ **데이터 중복**: 같은 정보를 3곳에 저장
- ⚠️ **마이그레이션 미완료**: 레거시 필드 제거 안 됨
- ✅ **신규 구조 준비**: `dbRoles`, `activeRole` 구현됨

#### 상태 및 권한 필드
| 필드명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `status` | ENUM(UserStatus) | `PENDING` | 사용자 상태 |
| `permissions` | JSON | `[]` | 직접 부여된 권한 |
| `isActive` | BOOLEAN | `true` | 활성 여부 |
| `isEmailVerified` | BOOLEAN | `false` | 이메일 인증 여부 |

#### 승인 관련 필드
**증거** (User.ts:L126-133):
```typescript
@Column({ type: 'timestamp', nullable: true })
approvedAt?: Date;

@Column({ type: 'varchar', length: 255, nullable: true })
approvedBy?: string; // 승인한 관리자 ID
```

**현황**:
- ✅ **승인 필드 존재**: `approvedAt`, `approvedBy`
- ❌ **현재 미사용**: signup 시 `ACTIVE`로 바로 생성 (승인 흐름 생략)
- ❌ **승인 로그 부재**: 상태 전이 이력 미저장

#### 비즈니스 정보 (역할별 확장)
**증거** (User.ts:L46-47):
```typescript
@Column({ type: 'json', nullable: true })
businessInfo?: BusinessInfo;
```

**타입 정의** (`apps/api-server/src/types/user.ts` 추정):
```typescript
interface BusinessInfo {
  companyName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  // 역할별 특화 필드들...
}
```

**현황**:
- ✅ **JSON 필드**: 유연한 구조
- ❌ **타입 검증 부재**: 역할별 필수 필드 검증 안 됨
- ❌ **스키마 미정의**: 역할별 businessInfo 구조 문서화 안 됨

#### 소셜 로그인 필드
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `provider` | VARCHAR(100) | `local`, `google`, `kakao` 등 |
| `provider_id` | VARCHAR(255) | 외부 제공자 사용자 ID |

#### 보안 필드
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `lastLoginAt` | TIMESTAMP | 마지막 로그인 시각 |
| `lastLoginIp` | VARCHAR(50) | 마지막 로그인 IP |
| `loginAttempts` | INTEGER | 로그인 시도 횟수 |
| `lockedUntil` | TIMESTAMP | 계정 잠금 해제 시각 |
| `refreshTokenFamily` | VARCHAR(255) | 토큰 계열 관리 |
| `resetPasswordToken` | VARCHAR(255) | 비밀번호 재설정 토큰 |
| `resetPasswordExpires` | TIMESTAMP | 토큰 만료 시각 |

#### 드롭쉬핑 관계 (OneToOne)
**증거** (User.ts:L177-180):
```typescript
// 양방향 관계 (실제 정의는 Supplier, Seller, Partner 엔티티에서)
supplier?: any;  // Will be set via OneToOne in Supplier entity
seller?: any;    // Will be set via OneToOne in Seller entity
partner?: any;   // Will be set via OneToOne in Partner entity
```

**현황**:
- ✅ **역할별 확장 테이블**: Supplier, Seller, Partner 별도 테이블 존재
- ✅ **OneToOne 관계**: User ↔ Supplier/Seller/Partner
- ⚠️ **부분 분리**: 드롭쉬핑 역할만 별도 테이블, 일반 역할은 통합

#### 타임스탬프
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `createdAt` | TIMESTAMP | 생성 시각 (자동) |
| `updatedAt` | TIMESTAMP | 수정 시각 (자동) |

### 1.3 인덱스
**증거** (User.ts:L11-13):
```typescript
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['isActive'])
```

**현황**:
- ✅ `email`: UNIQUE 인덱스
- ✅ `role`: 일반 인덱스 (역할 필터링 성능)
- ✅ `isActive`: 일반 인덱스
- ❌ `status` 인덱스 **없음** (승인 대기 필터링 시 풀스캔)

### 1.4 Helper 메소드

#### 역할 체크
**증거** (User.ts:L198-214):
```typescript
hasRole(role: UserRole | string): boolean {
  const hasDbRole = this.dbRoles?.some(r => r.name === role) || false;
  const hasLegacyRoles = this.roles?.includes(role) || false;
  const hasLegacyRole = this.role === role;
  return hasDbRole || hasLegacyRoles || hasLegacyRole;
}

isAdmin(): boolean {
  return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
}

isSupplier(): boolean {
  return this.hasRole('supplier') || !!this.supplier;
}
```

**현황**:
- ✅ **3중 체크**: `role`, `roles[]`, `dbRoles[]` 모두 확인
- ⚠️ **성능 저하**: 매번 3곳 검사
- ⚠️ **데이터 불일치 위험**: 3곳이 서로 다를 가능성

#### 권한 체크
**증거** (User.ts:L217-263):
```typescript
getAllPermissions(): string[] {
  if (this.isAdmin()) {
    // 관리자는 모든 권한 반환 (하드코딩)
    return ['users.view', 'users.create', ...];
  }

  const rolePermissions = this.dbRoles?.flatMap(role => role.getPermissionKeys()) || [];
  const directPermissions = this.permissions || [];
  return [...new Set([...rolePermissions, ...directPermissions])];
}

hasPermission(permission: string): boolean {
  return this.getAllPermissions().includes(permission);
}
```

**현황**:
- ✅ **역할 + 직접 권한**: 합산하여 반환
- ❌ **관리자 권한 하드코딩**: 코드에 권한 목록 직접 작성
- ⚠️ **성능 문제**: 매번 배열 합산 및 중복 제거

#### 역할 전환
**증거** (User.ts:L303-329):
```typescript
getActiveRole(): Role | null {
  if (this.activeRole) return this.activeRole;
  if (this.dbRoles && this.dbRoles.length > 0) {
    return this.dbRoles[0];  // 첫 번째 역할을 기본값으로
  }
  return null;
}

canSwitchToRole(roleId: string): boolean {
  return this.dbRoles?.some(r => r.id === roleId) || false;
}

hasMultipleRoles(): boolean {
  return this.dbRoles ? this.dbRoles.length > 1 : false;
}
```

**현황**:
- ✅ **역할 전환 준비**: 메소드 구현됨
- ❌ **API/UI 미연결**: FE에서 사용 안 함

---

## 2. Role 엔티티 (역할 정의 테이블)

### 2.1 예상 구조 (미조사)
**위치**: `apps/api-server/src/entities/Role.ts` (추정)

**추정 스키마**:
```typescript
@Entity('roles')
class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;  // 'admin', 'supplier', 'seller' 등

  @Column()
  displayName: string;  // '관리자', '공급자' 등

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', default: () => "'[]'" })
  permissions: string[];  // 권한 목록

  @ManyToMany('User', 'dbRoles')
  users: User[];
}
```

**확인 필요**:
- [ ] 실제 파일 존재 여부
- [ ] permissions 저장 방식 (JSON vs 별도 테이블)
- [ ] 역할 계층 구조 (상속) 유무

---

## 3. user_roles 조인 테이블 (ManyToMany)

### 3.1 구조
**증거** (User.ts:L67-71):
```typescript
@JoinTable({
  name: 'user_roles',
  joinColumn: { name: 'user_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
})
```

**스키마**:
| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `user_id` | UUID | FK → users.id | 사용자 ID |
| `role_id` | UUID | FK → roles.id | 역할 ID |

**인덱스** (추정):
- PK: `(user_id, role_id)`
- IDX: `user_id`
- IDX: `role_id`

**현황**:
- ✅ **다중 역할 지원**: 완전 구현됨
- ❌ **데이터 미이행**: 레거시 `role`, `roles[]` 필드에서 아직 마이그레이션 안 됨

---

## 4. 드롭쉬핑 역할별 확장 테이블

### 4.1 Supplier (공급자)
**위치**: `apps/api-server/src/entities/Supplier.ts` (추정)

**예상 스키마**:
```typescript
@Entity('suppliers')
class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  companyName: string;

  @Column({ nullable: true })
  taxId?: string;

  @Column({ type: 'enum', enum: SupplierStatus })
  status: SupplierStatus;  // PENDING, APPROVED, REJECTED

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  approvedBy?: string;

  // ... 기타 공급자 전용 필드
}
```

### 4.2 Seller (판매자)
**위치**: `apps/api-server/src/entities/Seller.ts` (추정)

**예상 스키마**: Supplier와 유사

### 4.3 Partner (파트너)
**위치**: `apps/api-server/src/entities/Partner.ts` (추정)

**예상 스키마**: Supplier와 유사

**확인 필요**:
- [ ] 실제 파일 확인
- [ ] 필드 구조 확인
- [ ] 승인 흐름 사용 여부

---

## 5. 감사 로그 (Approval Log)

### 5.1 예상 구조
**위치**: `apps/api-server/src/entities/ApprovalLog.ts` (추정)

**증거** (User.ts:L165-169):
```typescript
@OneToMany('ApprovalLog', 'user')
approvalLogs?: any[];

@OneToMany('ApprovalLog', 'admin')
adminActions?: any[];
```

**예상 스키마**:
```typescript
@Entity('approval_logs')
class ApprovalLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.approvalLogs)
  user: User;  // 신청자

  @ManyToOne(() => User, admin => admin.adminActions)
  admin: User;  // 승인/거부한 관리자

  @Column({ type: 'enum' })
  action: 'APPROVE' | 'REJECT';

  @Column({ type: 'enum' })
  targetRole: UserRole;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

**현황**:
- ✅ **관계 정의됨**: User 엔티티에 relation 존재
- ⏳ **실제 사용 미확인**: 승인 흐름 미사용 중
- ⏳ **테이블 생성 여부 미확인**

---

## 6. 관련 테이블 (미조사)

### 6.1 UserSession
**위치**: `apps/api-server/src/entities/UserSession.ts`

### 6.2 UserAction
**위치**: `apps/api-server/src/entities/UserAction.ts`

### 6.3 UserActivityLog
**위치**: `apps/api-server/src/entities/UserActivityLog.ts`

### 6.4 RefreshToken
**증거** (User.ts:L162-163):
```typescript
@OneToMany('RefreshToken', 'user')
refreshTokens?: any[];
```

### 6.5 LinkedAccount (소셜 로그인 연결)
**증거** (User.ts:L171-172):
```typescript
@OneToMany('LinkedAccount', 'user')
linkedAccounts?: any[];
```

**확인 필요**:
- [ ] 각 테이블의 실제 구조
- [ ] 현재 사용 여부
- [ ] 인덱스 및 제약 조건

---

## 7. 마이그레이션 파일 (미조사)

### 7.1 사용자 관련 마이그레이션
**예상 위치**:
- `apps/api-server/src/database/migrations/*-CreateUsersTable.ts`
- `apps/api-server/src/database/migrations/*-AddRolesSupport.ts`
- `apps/api-server/src/database/migrations/*-AddActiveRole.ts`

**확인 필요**:
- [ ] 역할 필드 추가 순서 (role → roles → dbRoles → activeRole)
- [ ] 데이터 마이그레이션 유무 (레거시 → 신규)
- [ ] 인덱스 추가 이력

---

## 8. 격차 요약 (DB)

| 항목 | 현재 상태 | 목표 (역할 분리형) | 격차 |
|------|----------|-------------------|------|
| **역할 필드** | 3중 구조 (role/roles/dbRoles) | dbRoles + activeRole만 | ⚠️ High (정리 필요) |
| **역할 테이블** | 부분 구현 (Role 엔티티) | 완전 구현 + 데이터 이행 | ⚠️ Medium |
| **확장 테이블** | 드롭쉬핑만 (Supplier/Seller/Partner) | 모든 역할 (또는 JSON으로 통합) | ⚠️ Medium |
| **승인 로그** | 관계만 정의 | 실제 사용 + 이력 저장 | ⚠️ High |
| **상태 인덱스** | 없음 | status 인덱스 필요 | ⚠️ Low |
| **businessInfo** | JSON (검증 없음) | 역할별 스키마 검증 | ⚠️ Medium |

---

## 9. 주요 발견사항

### 9.1 3중 역할 필드 혼재 (데이터 중복)
**증거**:
```typescript
role: UserRole;          // 1. 레거시 단일
roles: string[];         // 2. 레거시 다중
dbRoles: Role[];         // 3. 신규 다중 (ManyToMany)
activeRole: Role | null; // 4. 현재 활성 역할
```

**문제**:
- ❌ **데이터 중복**: 같은 정보를 4곳에 저장
- ❌ **불일치 위험**: 4곳이 서로 다를 수 있음
- ❌ **성능 저하**: hasRole()이 3곳을 모두 체크
- ⚠️ **마이그레이션 미완료**: 레거시 필드 제거 안 됨

### 9.2 승인 흐름 부분 구현
- ✅ **필드 존재**: `status`, `approvedAt`, `approvedBy`
- ✅ **로그 관계**: `ApprovalLog` OneToMany 정의
- ❌ **실제 미사용**: signup 시 `ACTIVE`로 즉시 생성
- ⚠️ **드롭쉬핑만 사용**: Supplier/Seller/Partner만 승인 흐름 존재

### 9.3 역할별 확장: 부분 분리
- ✅ **드롭쉬핑**: Supplier, Seller, Partner **별도 테이블**
- ❌ **일반 역할**: admin, editor, subscriber는 **users 테이블에만**
- ⚠️ **일관성 부재**: 역할별로 **다른 방식** 사용

---

## 10. DB 개선 우선순위

### 10.1 High Priority
1. **레거시 역할 필드 정리**: `role`, `roles[]` 제거 (마이그레이션)
2. **승인 흐름 활성화**: `PENDING` → `APPROVED` 전이 구현
3. **ApprovalLog 사용**: 상태 전이 이력 저장
4. **status 인덱스 추가**: 승인 대기 필터링 성능

### 10.2 Medium Priority
1. **businessInfo 스키마 정의**: 역할별 JSON 스키마 검증
2. **Role 엔티티 확인**: 실제 구현 여부 및 데이터 확인
3. **드롭쉬핑 엔티티 확인**: Supplier/Seller/Partner 스키마 조사

### 10.3 Low Priority
1. **관련 테이블 조사**: UserSession, UserAction, RefreshToken 등
2. **마이그레이션 이력 확인**: 변경 순서 및 데이터 이행 확인

---

## 11. 다음 단계

1. ✅ 현재 흐름 다이어그램 작성 (`04_flows_current.md`)
2. ⏳ ACL 매트릭스 작성 (`05_acl_matrix_current.md`)
3. ⏳ 격차 분석 (`06_gap_analysis.md`)

---

**작성**: Claude Code
**검증**: ⏳ Pending
