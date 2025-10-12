# 백엔드 Role 시스템 조사 보고서

**작성일**: 2025-10-12
**목적**: 프론트엔드 드랍쉬핑 플랫폼 개발을 위한 백엔드 Role 관리 및 전환 기능 현황 파악

---

## 📊 1. 현재 구현 상태 요약

### ✅ Role 관리 시스템: **완전 구현**
- 데이터베이스 기반 역할 시스템 구축 완료
- 13개의 역할 정의 (roles 테이블)
- 21개의 세분화된 권한 정의 (permissions 테이블)
- 다대다 관계 지원 (user_roles 테이블)

### ⚠️ Role 전환 기능: **부분 구현**
- 관리자에 의한 Role 변경 API 구현됨
- **사용자 자신의 Active Role 전환 기능 미구현**
- 복수 Role 보유 시 우선 순위/전환 메커니즘 미구현

---

## 🗄️ 2. 데이터베이스 구조

### 2.1 Users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Legacy Role 필드 (하위 호환성)
  role VARCHAR NOT NULL DEFAULT 'customer',     -- 단일 역할 (enum)
  roles TEXT NOT NULL DEFAULT 'customer',       -- 배열 (simple-array)
  permissions JSON NOT NULL DEFAULT '[]',       -- 직접 부여된 권한

  -- 복수 Role 지원 (ManyToMany via user_roles)
  -- dbRoles는 user_roles 테이블을 통해 관리됨

  status VARCHAR NOT NULL DEFAULT 'pending',
  isActive BOOLEAN NOT NULL DEFAULT true,
  -- ... 기타 필드
);
```

**중요**:
- `role` 필드: legacy, 하위 호환성 유지용
- `dbRoles` 관계: 신규 데이터베이스 기반 역할 시스템 (우선 사용)
- **현재 Active Role 저장 필드 없음**

### 2.2 Roles 테이블
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,          -- 'admin', 'seller', 'supplier' 등
  displayName VARCHAR(100) NOT NULL,         -- 'Administrator', 'Seller' 등
  description TEXT,
  isActive BOOLEAN DEFAULT true,
  isSystem BOOLEAN DEFAULT false,            -- 시스템 역할 (삭제 불가)
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 User_Roles 테이블 (다대다 관계)
```sql
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```

**현황**:
- 전체 사용자: 34명
- 모든 사용자가 최소 1개 이상의 Role 매핑 완료

### 2.4 Permissions 테이블
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,          -- 'users.view', 'content.create' 등
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,             -- 'users', 'content', 'admin' 등
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.5 Role_Permissions 테이블
```sql
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

---

## 🎭 3. 등록된 역할 정보

| Role Name      | Display Name        | 권한 수 | 시스템 역할 | 설명                    |
|----------------|---------------------|-----|---------|-----------------------|
| super_admin    | Super Administrator | 21  | ✅       | 모든 권한을 가진 최고 관리자     |
| admin          | Administrator       | 21  | ✅       | 전체 관리 권한              |
| moderator      | Moderator           | 10  | ❌       | 콘텐츠 관리 및 사용자 관리       |
| manager        | Manager             | 9   | ❌       | 콘텐츠 및 사용자 관리          |
| vendor_manager | Vendor Manager      | 9   | ❌       | 벤더 및 콘텐츠 관리           |
| vendor         | Vendor              | 4   | ❌       | 콘텐츠 관리 권한             |
| supplier       | Supplier            | 3   | ❌       | 공급자 계정                |
| seller         | Seller              | 3   | ❌       | 마켓플레이스 판매자            |
| partner        | Partner             | 3   | ❌       | 파트너 계정                |
| business       | Business            | 3   | ❌       | 비즈니스 계정               |
| beta_user      | Beta User           | 3   | ❌       | 베타 테스터                |
| affiliate      | Affiliate           | 2   | ❌       | 제휴 마케팅 계정             |
| customer       | Customer            | 2   | ❌       | 일반 고객                 |

### 현재 사용자 분포
| Role       | 사용자 수 |
|------------|-------|
| seller     | 9명    |
| admin      | 6명    |
| partner    | 5명    |
| supplier   | 4명    |
| customer   | 9명    |
| vendor     | 1명    |

---

## 🔐 4. 권한 체계 (21개 권한)

### Users (6개)
- `users.view` - 사용자 조회
- `users.create` - 사용자 생성
- `users.edit` - 사용자 수정
- `users.delete` - 사용자 삭제
- `users.suspend` - 사용자 정지/해제
- `users.approve` - 사용자 승인

### Content (6개)
- `content.view` - 콘텐츠 조회
- `content.create` - 콘텐츠 생성
- `content.edit` - 콘텐츠 수정
- `content.delete` - 콘텐츠 삭제
- `content.publish` - 콘텐츠 발행
- `content.moderate` - 콘텐츠 관리

### Admin (4개)
- `admin.settings` - 시스템 설정 관리
- `admin.analytics` - 분석 데이터 조회
- `admin.logs` - 시스템 로그 조회
- `admin.backup` - 백업 관리

### ACF, CPT, Shortcodes (3개)
- `acf.manage` - 커스텀 필드 관리
- `cpt.manage` - 커스텀 포스트 타입 관리
- `shortcodes.manage` - 숏코드 관리

### API (2개)
- `api.access` - API 접근
- `api.admin` - 관리자 API 접근

---

## 🔌 5. 발견된 API 목록

### 5.1 인증 관련 API

#### POST /api/auth/login
**요청**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "seller",                 // ⚠️ 단일 role만 반환
    "status": "active",
    "businessInfo": {...}
  }
}
```

**JWT 토큰 페이로드**:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "seller",                  // ⚠️ 단일 role만 포함
  "iat": 1234567890,
  "exp": 1234567890
}
```

**⚠️ 문제점**:
- 복수 Role을 가진 사용자의 경우 모든 Role 정보가 반환되지 않음
- JWT 토큰에 단일 Role만 포함됨

#### GET /api/auth/status
인증 상태 및 사용자 정보 조회

**응답**:
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "seller",                 // ⚠️ 단일 role만 반환
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLoginAt": "2024-01-15T00:00:00.000Z"
  },
  "tokenInfo": {
    "issuedAt": "2024-01-15T00:00:00.000Z",
    "expiresAt": "2024-01-22T00:00:00.000Z"
  }
}
```

### 5.2 Role 조회 API

#### GET /api/v1/users/roles
**인증**: 불필요 (Public)
**설명**: 시스템에 등록된 모든 역할 정의 조회

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "value": "admin",
      "label": "Administrator",
      "permissions": ["users.view", "users.create", ...],
      "permissionCount": 21,
      "isSystem": true,
      "description": "Full administrative access"
    },
    {
      "value": "seller",
      "label": "Seller",
      "permissions": ["content.view", "content.create", "api.access"],
      "permissionCount": 3,
      "isSystem": false,
      "description": "Seller account for marketplace"
    }
    // ... 기타 역할
  ]
}
```

#### GET /api/v1/users/:id/role
**인증**: 필요 (본인 또는 관리자)
**설명**: 특정 사용자의 역할 정보 조회

**응답**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "seller",                 // ⚠️ 단일 role만 반환
    "status": "active",
    "permissions": ["content.view", "content.create", "api.access"],
    "roleLabel": "Seller"
  }
}
```

**⚠️ 문제점**:
- 복수 Role을 가진 사용자의 모든 Role 정보가 반환되지 않음

#### GET /api/v1/users/:id/permissions
**인증**: 필요 (본인 또는 관리자)
**설명**: 특정 사용자의 모든 권한 조회 (DB roles + 직접 권한)

**응답**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "seller",                 // Legacy 필드
    "permissions": [                  // ✅ 모든 권한 포함
      "content.view",
      "content.create",
      "api.access"
    ],
    "permissionsDetailed": [
      {
        "key": "content.view",
        "description": "View content",
        "category": "content",
        "granted": true
      }
      // ...
    ],
    "groupedPermissions": {
      "content": [...],
      "users": [...],
      "admin": [...]
    },
    "totalPermissions": 21,
    "grantedPermissions": 3
  }
}
```

#### GET /api/v1/users/:id/permissions/check?permission=content.create
**인증**: 필요 (본인 또는 관리자)
**설명**: 특정 권한 보유 여부 확인

**응답**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "role": "seller",
    "permission": "content.create",
    "granted": true
  }
}
```

#### GET /api/v1/users/roles/statistics
**인증**: 필요 (관리자 전용)
**설명**: 역할별 사용자 분포 통계

**응답**:
```json
{
  "success": true,
  "data": {
    "roleDistribution": [
      {
        "role": "seller",
        "label": "Seller",
        "count": 9,
        "permissions": 3
      }
      // ...
    ],
    "totalUsers": 34,
    "summary": {
      "admins": 6,
      "activeUsers": 34,
      "pendingUsers": 0
    }
  }
}
```

### 5.3 Role 변경 API

#### PUT /api/v1/users/:id/role
**인증**: 필요 (관리자 전용)
**설명**: 관리자가 특정 사용자의 역할 변경

**요청**:
```json
{
  "role": "supplier",
  "reason": "User requested upgrade to supplier account"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "oldRole": "seller",
    "newRole": "supplier",
    "permissions": ["content.view", "content.create", "api.access"],
    "updatedAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "User role updated successfully"
}
```

**제약사항**:
- 자기 자신을 Admin으로 승격 불가
- 마지막 Admin을 강등 불가
- 활동 로그 자동 기록 (UserActivityLog)

### 5.4 사용자 정보 조회 API

#### GET /api/v1/users
**인증**: 필요 (관리자 전용)
**쿼리 파라미터**:
- `page` (기본값: 1)
- `limit` (기본값: 10)
- `search` (이메일 또는 이름 검색)
- `status` (active, pending, suspended 등)
- `role` (역할 필터링)

#### GET /api/v1/users/:id
**인증**: 필요 (관리자 전용)
**설명**: 특정 사용자 상세 정보 조회

---

## ❌ 6. 구현 필요 항목

### 6.1 필수 (High Priority)

#### 1. Active Role 필드 추가
**문제점**:
- 복수 Role 보유 시 현재 활성 Role을 저장할 필드 없음

**해결방안**:
```sql
ALTER TABLE users ADD COLUMN active_role_id UUID REFERENCES roles(id);
CREATE INDEX idx_users_active_role ON users(active_role_id);
```

**User 엔티티 수정**:
```typescript
@ManyToOne(() => Role)
@JoinColumn({ name: 'active_role_id' })
activeRole?: Role;
```

#### 2. Role 전환 API 구현
**엔드포인트**: `PATCH /api/users/me/active-role`
**요청**:
```json
{
  "roleId": "uuid"  // 또는 "roleName": "seller"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "activeRole": {
      "id": "uuid",
      "name": "seller",
      "displayName": "Seller",
      "permissions": ["content.view", "content.create", "api.access"]
    },
    "availableRoles": [
      {
        "id": "uuid",
        "name": "seller",
        "displayName": "Seller"
      },
      {
        "id": "uuid",
        "name": "supplier",
        "displayName": "Supplier"
      }
    ]
  },
  "message": "Active role switched to Seller"
}
```

**구현 로직**:
```typescript
async switchActiveRole(userId: string, roleId: string) {
  // 1. 사용자가 해당 Role을 보유하고 있는지 확인
  const userRole = await userRolesRepository.findOne({
    where: { user_id: userId, role_id: roleId }
  });

  if (!userRole) {
    throw new Error('User does not have this role');
  }

  // 2. active_role_id 업데이트
  await userRepository.update(
    { id: userId },
    { active_role_id: roleId }
  );

  // 3. JWT 토큰 재발급 (선택사항)
  const newToken = generateToken(user);

  return { user, newToken };
}
```

#### 3. 로그인 API 수정
**변경사항**:
- 복수 Role 정보 반환
- Active Role 정보 반환

**수정된 응답**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "seller",                 // Legacy (하위 호환성)
    "activeRole": {                   // ✅ 신규 추가
      "id": "uuid",
      "name": "seller",
      "displayName": "Seller"
    },
    "roles": [                        // ✅ 신규 추가
      {
        "id": "uuid",
        "name": "seller",
        "displayName": "Seller"
      },
      {
        "id": "uuid",
        "name": "supplier",
        "displayName": "Supplier"
      }
    ],
    "status": "active",
    "businessInfo": {...}
  }
}
```

#### 4. 사용자 가능 Role 조회 API
**엔드포인트**: `GET /api/users/me/roles`
**인증**: 필요
**설명**: 현재 로그인한 사용자가 보유한 모든 Role 조회

**응답**:
```json
{
  "success": true,
  "data": {
    "activeRole": {
      "id": "uuid",
      "name": "seller",
      "displayName": "Seller",
      "permissions": ["content.view", "content.create", "api.access"]
    },
    "availableRoles": [
      {
        "id": "uuid",
        "name": "seller",
        "displayName": "Seller",
        "isActive": true
      },
      {
        "id": "uuid",
        "name": "supplier",
        "displayName": "Supplier",
        "isActive": false
      }
    ]
  }
}
```

### 6.2 권장 (Medium Priority)

#### 1. Role 전환 로그 기록
- 사용자가 언제 어떤 Role로 전환했는지 추적
- UserActivityLog에 `ROLE_SWITCH` 활동 타입 추가

#### 2. Role 전환 알림
- 중요한 Role 전환 시 관리자에게 알림
- 예: Customer → Seller 전환 시 승인 필요 여부

#### 3. Role 전환 제약 규칙
- 특정 Role 전환은 관리자 승인 필요
- 예: Seller → Supplier 전환은 자동 불가, 관리자 승인 필요

### 6.3 선택 (Low Priority)

#### 1. Role 전환 히스토리 조회
**엔드포인트**: `GET /api/users/me/role-history`

#### 2. Role별 대시보드 설정
- Role에 따라 다른 초기 대시보드 페이지 표시

---

## 📖 7. 프론트엔드 개발 가이드

### 7.1 초기 로그인 플로우

```typescript
// 1. 로그인 API 호출
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await loginResponse.json();

// 2. 토큰 저장
localStorage.setItem('authToken', token);

// 3. 사용자 정보 저장
localStorage.setItem('user', JSON.stringify(user));

// 4. 현재 역할 확인
console.log('Current role:', user.role);

// ⚠️ 복수 Role 정보는 별도 API 호출 필요
const rolesResponse = await fetch(`/api/v1/users/${user.id}/role`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data: roleData } = await rolesResponse.json();
console.log('Role info:', roleData);
```

### 7.2 Role 전환 UI 구현 (구현 필요)

```typescript
// ⚠️ 현재 미구현 - 백엔드 API 추가 필요
async function switchRole(roleId: string) {
  const response = await fetch('/api/users/me/active-role', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ roleId })
  });

  const { data } = await response.json();

  // 새로운 토큰이 발급된 경우 업데이트
  if (data.newToken) {
    localStorage.setItem('authToken', data.newToken);
  }

  // 사용자 정보 업데이트
  localStorage.setItem('activeRole', data.activeRole.name);

  // 페이지 새로고침 또는 상태 업데이트
  window.location.reload();
}
```

### 7.3 권한 체크

```typescript
// User 정보에서 권한 확인
async function checkPermission(permission: string): Promise<boolean> {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // API로 권한 확인
  const response = await fetch(
    `/api/v1/users/${user.id}/permissions/check?permission=${permission}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { data } = await response.json();
  return data.granted;
}

// 컴포넌트에서 사용
if (await checkPermission('content.create')) {
  // 콘텐츠 생성 버튼 표시
}
```

### 7.4 Role별 라우팅 가드

```typescript
// React Router 예시
function ProtectedRoute({
  children,
  requiredRole
}: {
  children: React.ReactNode;
  requiredRole: string;
}) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}

// 사용
<Route
  path="/seller/dashboard"
  element={
    <ProtectedRoute requiredRole="seller">
      <SellerDashboard />
    </ProtectedRoute>
  }
/>
```

---

## ⚠️ 8. 주의사항 및 제약사항

### 8.1 현재 시스템 제약

1. **복수 Role 전환 기능 없음**
   - 사용자가 Seller와 Supplier Role을 동시에 보유해도 전환 불가
   - 백엔드 API 구현 필요

2. **JWT 토큰 제한**
   - 현재 JWT에 단일 Role만 포함
   - Role 전환 시 토큰 재발급 고려 필요

3. **Role 우선순위 규칙 없음**
   - 복수 Role 보유 시 어떤 Role이 기본인지 규칙 미정의
   - 시스템 정책 수립 필요

### 8.2 보안 고려사항

1. **Role 전환 검증**
   - 사용자가 실제로 보유한 Role로만 전환 가능하도록 검증
   - 백엔드에서 반드시 검증 필요

2. **민감한 Role 전환 제한**
   - Admin, Super Admin으로의 전환은 불가
   - 특정 Role 조합은 승인 필요

3. **활동 로그 기록**
   - 모든 Role 전환은 로그에 기록
   - 감사 추적 가능

### 8.3 성능 최적화

1. **캐싱**
   - Role 및 Permission 정보는 5분 캐시 (현재 구현됨)
   - 프론트엔드에서도 로컬 캐싱 고려

2. **Permission 체크 최소화**
   - 필요한 경우에만 API 호출
   - 초기 로그인 시 모든 권한 정보 가져와 로컬 저장

---

## 🔄 9. 마이그레이션 상태

### 완료된 작업
- ✅ 데이터베이스 Role 시스템 구축
- ✅ 모든 사용자 user_roles 테이블로 마이그레이션 완료 (34명)
- ✅ Middleware 및 Service를 데이터베이스 Role 시스템으로 전환
- ✅ User 엔티티 헬퍼 메서드 구현 (`hasRole`, `hasAnyRole`, `isAdmin`, `getAllPermissions`)

### Legacy 필드 현황
- `users.role` (VARCHAR): 하위 호환성 유지, 여전히 사용 중
- `users.roles` (TEXT): 하위 호환성 유지, 사용 중
- 신규 시스템 (`user_roles` 테이블)과 병행 운영 중

---

## 📌 10. 구현 우선순위 요약

### 즉시 구현 필요 (P0)
1. **Active Role 필드 추가** (데이터베이스 스키마 변경)
2. **Role 전환 API 구현** (`PATCH /api/users/me/active-role`)
3. **로그인 API 수정** (복수 Role 정보 반환)

### 단기 구현 필요 (P1)
4. **사용자 가능 Role 조회 API** (`GET /api/users/me/roles`)
5. **Role 전환 로그 기록**
6. **JWT 토큰 구조 개선** (복수 Role 정보 포함)

### 중기 구현 고려 (P2)
7. Role 전환 제약 규칙 정의
8. Role별 대시보드 설정
9. Role 전환 히스토리 조회

---

## 📞 11. 연락처 및 참고 자료

### 관련 파일
- **엔티티**: `src/entities/User.ts`, `src/entities/Role.ts`, `src/entities/Permission.ts`
- **컨트롤러**: `src/controllers/v1/userRole.controller.ts`
- **라우트**: `src/routes/v1/userRole.routes.ts`, `src/routes/auth.ts`
- **미들웨어**: `src/middleware/admin.ts`, `src/middleware/dropshipping-auth.ts`
- **마이그레이션 스크립트**: `scripts/seed-roles-permissions.ts`, `scripts/migrate-user-roles.ts`

### API 엔드포인트 목록
```
# 인증
POST   /api/auth/login
GET    /api/auth/status

# Role 조회
GET    /api/v1/users/roles                        (Public)
GET    /api/v1/users/:id/role                     (Auth: Self or Admin)
GET    /api/v1/users/:id/permissions              (Auth: Self or Admin)
GET    /api/v1/users/:id/permissions/check        (Auth: Self or Admin)
GET    /api/v1/users/roles/statistics             (Auth: Admin)

# Role 변경
PUT    /api/v1/users/:id/role                     (Auth: Admin)

# ⚠️ 미구현
PATCH  /api/users/me/active-role                  (Role 전환 - 필요)
GET    /api/users/me/roles                        (내 Role 목록 - 필요)
```

---

**보고서 작성**: Claude Code
**검토 필요**: 백엔드 개발팀, 프론트엔드 개발팀
**다음 단계**: Active Role 전환 기능 설계 및 구현
