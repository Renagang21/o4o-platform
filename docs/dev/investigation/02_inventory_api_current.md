# API 현황 조사 (API Inventory - Current State)

> **조사 일시**: 2025-01-08
> **목적**: API 엔드포인트, 권한 처리, 인증/가입 흐름의 현재 구조 파악

---

## 1. 인증 엔드포인트 (`/auth`)

### 1.1 주요 파일
**위치**: `apps/api-server/src/routes/auth.ts`

### 1.2 엔드포인트 목록

| Method | Path | 설명 | 요청 | 응답 | 권한 |
|--------|------|------|------|------|------|
| POST | `/auth/login` | 로그인 | `{ email, password }` | `{ token, user }` | Public |
| POST | `/auth/signup` | 회원가입 (신규) | `{ email, password, passwordConfirm, name, tos }` | `{ token, user, redirectUrl }` | Public |
| POST | `/auth/register` | 회원가입 (레거시) | `{ email, password, name }` | `{ token, user, redirectUrl }` | Public |
| GET | `/auth/verify` | 토큰 검증 | - | `{ success, user }` | Auth Required |
| POST | `/auth/logout` | 로그아웃 | - | `{ success }` | Auth Required |
| GET | `/auth/status` | 인증 상태 확인 | - | `{ authenticated, user, tokenInfo }` | Auth Required |

### 1.3 로그인 응답 구조
**증거** (auth.ts:L76-99):
```typescript
{
  success: true,
  message: 'Login successful',
  token,
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,  // ← 레거시 단일 role
    activeRole: activeRole ? {
      id: activeRole.id,
      name: activeRole.name,
      displayName: activeRole.displayName
    } : null,
    roles: user.dbRoles?.map(...),  // ← 다중 역할 지원
    canSwitchRoles: user.hasMultipleRoles(),
    status: user.status,
    businessInfo: user.businessInfo
  }
}
```

**현황**:
- ✅ **다중 역할 정보 반환**: `roles`, `activeRole`, `canSwitchRoles`
- ⚠️ **FE에서 미사용**: FE는 여전히 `user.role`만 사용
- ✅ **역할 전환 준비됨**: API는 지원하나 FE UI 없음

### 1.4 회원가입 로직
**증거** (auth.ts:L104-192):
```typescript
// L149: 기본 역할 할당
user.role = UserRole.CUSTOMER;

// L150: 즉시 활성화 (승인 대기 없음)
user.status = UserStatus.ACTIVE;

// L162-177: 역할별 리다이렉트 경로
const getRedirectPath = (role: UserRole): string => {
  switch (role) {
    case UserRole.SELLER: return '/seller/dashboard';
    case UserRole.PARTNER: return '/partner/portal';
    case UserRole.SUPPLIER: return '/supplier/dashboard';
    case UserRole.ADMIN: return '/admin';
    default: return '/';
  }
};
```

**현황**:
- ✅ **즉시 활성화**: `ACTIVE` 상태로 바로 생성 (승인 절차 없음)
- ❌ **역할 신청 불가**: 가입 시 역할 선택 불가, 무조건 `CUSTOMER`
- ✅ **역할별 리다이렉트**: 준비되어 있으나 **가입 시 사용 안 됨** (CUSTOMER 고정)

---

## 2. 사용자 관리 엔드포인트

### 2.1 주요 사용자 API 파일
- `apps/api-server/src/routes/user.ts`
- `apps/api-server/src/routes/users.routes.ts`
- `apps/api-server/src/routes/v1/users.routes.ts`
- `apps/api-server/src/routes/admin/users.routes.ts`

### 2.2 예상 엔드포인트 (미조사)

| Method | Path | 설명 | 증거 파일 |
|--------|------|------|----------|
| GET | `/users` | 사용자 목록 조회 | UsersListClean.tsx:L92 |
| GET | `/users/:id` | 사용자 상세 조회 | (추정) |
| POST | `/users` | 사용자 생성 | (추정) |
| PATCH | `/users/:id` | 사용자 수정 | UsersListClean.tsx:L292 |
| DELETE | `/users/:id` | 사용자 삭제 | UsersListClean.tsx:L333 |

**확인 필요**:
- [ ] 실제 엔드포인트 경로 확인
- [ ] 역할별 필터링 쿼리 파라미터
- [ ] 승인/거부 엔드포인트 유무
- [ ] 역할 변경 검증 로직

---

## 3. 권한 처리 (Middleware)

### 3.1 인증 미들웨어
**위치**: `apps/api-server/src/middleware/auth.middleware.js` (추정)

**사용 예시** (auth.ts:L215, L224, L234):
```typescript
router.get('/verify', authenticate, asyncHandler(async (req: Request, res) => {
  // 인증된 사용자만 접근 가능
}));
```

**현황**:
- ✅ **인증 체크**: `authenticate` 미들웨어 존재
- ⏳ **권한 체크**: 세분화된 미들웨어 유무 미확인

### 3.2 역할 기반 접근 제어 (RBAC) - 미확인

**예상 위치**:
- `apps/api-server/src/middleware/rbac.middleware.js` (?)
- `apps/api-server/src/middleware/permissions.middleware.js` (?)

**확인 필요**:
- [ ] 역할 체크 미들웨어 존재 여부
- [ ] 권한(Permission) 체크 미들웨어
- [ ] 컨트롤러 내부 권한 체크 vs 미들웨어 권한 체크

---

## 4. 드롭쉬핑 역할 전용 엔드포인트

### 4.1 공급자 (Supplier) API
**위치**: `apps/api-server/src/routes/admin/suppliers.routes.ts`

**예상 엔드포인트**:
- GET `/admin/suppliers` - 공급자 목록
- GET `/admin/suppliers/:id` - 공급자 상세
- POST `/admin/suppliers/:id/approve` - 승인
- POST `/admin/suppliers/:id/reject` - 거부

### 4.2 판매자 (Seller) API
**위치**:
- `apps/api-server/src/routes/ds-seller-authorization.routes.ts`
- `apps/api-server/src/routes/ds-seller-authorization-v2.routes.ts`
- `apps/api-server/src/routes/admin/seller-authorization.routes.ts`

### 4.3 파트너 (Partner) API
**위치**: `apps/api-server/src/routes/partners.ts`

**현황**:
- ✅ **역할별 전용 API 존재**: 공급자, 판매자, 파트너
- ❌ **사용자 API와 분리**: `/users` API와 **통합되지 않음**
- ⚠️ **일관성 부재**: 단일 사용자 관리 vs 역할별 분리 API **혼재**

---

## 5. 역할 전환 API (미확인)

### 5.1 예상 경로
**위치**: `apps/api-server/src/routes/v1/userRoleSwitch.routes.ts`

**추정 엔드포인트**:
- POST `/v1/users/:id/switch-role` - 역할 전환
- GET `/v1/users/:id/available-roles` - 전환 가능한 역할 목록

**확인 필요**:
- [ ] 실제 구현 여부
- [ ] 역할 전환 검증 로직
- [ ] FE에서 사용 여부

---

## 6. 승인 시스템 (Approval System)

### 6.1 승인 관련 라우트
**위치**: `apps/api-server/src/routes/v1/approval.routes.ts`

**예상 엔드포인트**:
- GET `/v1/approvals` - 승인 대기 목록
- POST `/v1/approvals/:id/approve` - 승인
- POST `/v1/approvals/:id/reject` - 거부

**드롭쉬핑 승인**:
**위치**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L129`
```typescript
{ id: 'ds-approvals', label: '승인 관리', path: '/dropshipping/approvals' }
```

**현황**:
- ✅ **드롭쉬핑 승인**: 전용 화면 **존재**
- ❌ **일반 사용자 승인**: 화면 **없음** (회원가입 즉시 활성화)
- ⚠️ **승인 흐름 미사용**: 현재 signup은 `ACTIVE` 상태로 즉시 생성

---

## 7. JWT 토큰 구조

### 7.1 토큰 생성
**증거** (auth.ts:L63-67):
```typescript
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  env.getString('JWT_SECRET'),
  { expiresIn: '7d' }
);
```

**Payload**:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "customer",  // ← 단일 역할만
  "iat": 1234567890,
  "exp": 1234567890
}
```

**현황**:
- ✅ **단일 역할**: 토큰에 `role` (단일) 저장
- ❌ **다중 역할 미반영**: `roles[]` 토큰에 없음
- ❌ **역할 전환 시 토큰 재발급** 필요

---

## 8. 오류 처리

### 8.1 커스텀 에러 클래스
**위치**: `apps/api-server/src/utils/api-error.js` (추정)

**사용 예시** (auth.ts:L39, L44, L54):
```typescript
if (!user) {
  throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
}

if (!user.password) {
  throw new UnauthorizedError('Please use social login', 'SOCIAL_LOGIN_REQUIRED');
}

if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
  throw new BadRequestError('Account not active', 'ACCOUNT_NOT_ACTIVE', { status: user.status });
}
```

**에러 코드**:
- `INVALID_CREDENTIALS`
- `SOCIAL_LOGIN_REQUIRED`
- `ACCOUNT_NOT_ACTIVE`
- `EMAIL_EXISTS` (auth.ts:L138)
- `PASSWORD_MISMATCH` (auth.ts:L125)
- `TOS_NOT_ACCEPTED` (auth.ts:L130)
- `SIGNUP_DISABLED` (auth.ts:L115)

---

## 9. 환경 변수 의존성

### 9.1 Auth 관련 환경 변수
**증거** (auth.ts):
```typescript
env.getString('JWT_SECRET')              // L65, L157
env.getNumber('BCRYPT_ROUNDS', 12)       // L142
env.getString('AUTH_ALLOW_SIGNUP', 'true')  // L114
```

**현황**:
- ✅ `JWT_SECRET`: 필수
- ✅ `BCRYPT_ROUNDS`: 기본값 12
- ✅ `AUTH_ALLOW_SIGNUP`: 회원가입 허용 여부 (기본 true)

---

## 10. 격차 요약 (API)

| 항목 | 현재 상태 | 목표 (역할 분리형) | 격차 |
|------|----------|-------------------|------|
| **인증 응답** | 다중 역할 정보 **포함** | ✅ 이미 지원됨 | ✅ OK |
| **회원가입** | 즉시 ACTIVE | 역할 신청 → 승인 흐름 | ⚠️ High |
| **역할 할당** | 관리자가 수동 변경 | 신청 + 승인 프로세스 | ⚠️ High |
| **사용자 API** | 통합 `/users` | 역할별 전용 API | ⚠️ Medium |
| **권한 체크** | 미들웨어 (추정) | 세분화된 permission 체크 | ⏳ 미확인 |
| **승인 시스템** | 드롭쉬핑만 **사용** | 모든 역할에 **적용** | ⚠️ High |
| **JWT 토큰** | 단일 role | 다중 roles + activeRole | ⚠️ Medium |

---

## 11. 주요 발견사항

### 11.1 API는 다중 역할을 지원하나 FE는 미사용
- ✅ **로그인 응답**: `roles[]`, `activeRole`, `canSwitchRoles` 반환
- ❌ **FE에서 무시**: FE는 `user.role`만 사용
- ⚠️ **불일치**: API ↔ FE 간 **데이터 구조 불일치**

### 11.2 승인 흐름 부재
- ✅ **회원가입**: 즉시 `ACTIVE` 상태로 생성
- ❌ **승인 대기**: `PENDING` 상태로 생성 후 승인 **미사용**
- ⚠️ **드롭쉬핑만 예외**: 공급자/판매자/파트너는 **별도 승인 흐름 존재**

### 11.3 역할별 API 분리 vs 통합 사용자 API
- ✅ **역할별 API**: `/admin/suppliers`, `/admin/sellers` 등 **존재**
- ❌ **사용자 API**: `/users`는 **단일 통합 API**
- ⚠️ **일관성 부재**: 두 가지 접근 방식 **혼재**

---

## 12. 다음 단계

1. ⏳ 권한 미들웨어 상세 조사
2. ⏳ 역할 전환 API 구현 여부 확인
3. ✅ DB 스키마 조사 (`03_schema_current.md`)
4. ⏳ 실제 흐름 다이어그램 작성 (`04_flows_current.md`)

---

**작성**: Claude Code
**검증**: ⏳ Pending
