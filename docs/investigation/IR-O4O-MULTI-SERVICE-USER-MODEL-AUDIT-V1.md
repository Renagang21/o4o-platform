# IR-O4O-MULTI-SERVICE-USER-MODEL-AUDIT-V1

> **조사 일시**: 2026-03-10
> **상태**: 완료
> **유형**: Investigation Report (코드 수정 없음)

---

## 1. 조사 목적

E2E 테스트에서 다음 현상이 발견됨:

```
Neture에서 test-id@o4o.com 가입 완료 후
GlycoPharm에서 동일 이메일로 가입 시도 →
"이미 가입된 이메일입니다" (409 Conflict)
```

대표 설계 의도는 **Global User + Service Membership** 모델:
```
한 이메일 → 여러 서비스 가입 가능
```

현재 구현이 이 설계와 일치하는지 조사.

---

## 2. 판정 결과

### **현재 구현: MODEL B — 플랫폼 단일 사용자**

```
users.email UNIQUE (글로벌)
→ 한 이메일 = 하나의 계정 (전체 플랫폼 공유)
→ 다른 서비스 가입 불가
```

### **설계 의도와의 차이**

| 항목 | 설계 의도 | 현재 구현 | 상태 |
|------|----------|----------|------|
| 이메일 유일성 | 서비스별 유일 | **글로벌 유일** | **불일치** |
| 다중 서비스 가입 | 가능 | **불가능** | **불일치** |
| 서비스 구분 | service_membership 테이블 | users.service_key (1회 설정) | **불완전** |
| 역할 구분 | 서비스별 역할 | 서비스 접두사 역할 (role_assignments) | **부분 일치** |
| 승인 권한 | 서비스 운영자 승인 | **플랫폼 관리자만 승인** | **불일치** |

---

## 3. users 테이블 구조

### 스키마 (주요 컬럼)

| 컬럼 | 타입 | Nullable | Default | 비고 |
|------|------|----------|---------|------|
| `id` | UUID | NO | auto | PK |
| `email` | VARCHAR(255) | NO | — | **UNIQUE (3중 보장)** |
| `password` | VARCHAR(255) | NO | — | bcrypt |
| `name` | VARCHAR(200) | NO | '운영자' | 표시명 |
| `status` | ENUM | NO | PENDING | 6가지 상태 |
| `service_key` | VARCHAR(100) | YES | — | **서비스 구분 (1회 설정)** |
| `isActive` | BOOLEAN | NO | true | 계정 활성화 |
| `domain` | VARCHAR(255) | YES | — | 멀티테넌트 |

### email UNIQUE 제약 (3중)

```
1. @Index(['email'], { unique: true })           — Entity 데코레이터
2. @Column({ unique: true })                     — 컬럼 레벨
3. IDX_97672ac88f789774dd47f7c8be ON users(email) — DB 인덱스
```

### UserStatus ENUM

```typescript
ACTIVE    = 'active'      // 로그인 가능
INACTIVE  = 'inactive'    // 비활성
PENDING   = 'pending'     // 승인 대기 (가입 시 기본값)
APPROVED  = 'approved'    // 승인됨
SUSPENDED = 'suspended'   // 정지
REJECTED  = 'rejected'    // 거부
```

### service_key 컬럼

```typescript
@Column({ type: 'varchar', length: 100, nullable: true, name: 'service_key' })
serviceKey?: string;
```

- **1회만 설정됨** (가입 시 `data.service || 'platform'`)
- 동일 사용자가 여러 서비스에 속할 수 없는 구조
- 서비스 멤버십 테이블 없음

### Phase3-E 이후 삭제된 컬럼

- ~~`role`~~ — 삭제됨
- ~~`roles`~~ — 삭제됨
- ~~`active_role_id`~~ — 삭제됨

---

## 4. role_assignments 테이블 구조

### 스키마

| 컬럼 | 타입 | Nullable | Default | 비고 |
|------|------|----------|---------|------|
| `id` | UUID | NO | auto | PK |
| `user_id` | UUID | NO | — | FK → users.id (CASCADE) |
| `role` | VARCHAR(50) | NO | — | 역할명 (접두사 포함) |
| `is_active` | BOOLEAN | NO | true | RBAC 결정 기준 |
| `scope_type` | VARCHAR(50) | YES | 'global' | 'global' 또는 'organization' |
| `scope_id` | UUID | YES | — | organization UUID |

### 핵심 발견

```
service_key 컬럼 없음
service 컬럼 없음
```

서비스 구분은 **역할 이름의 접두사**로만 수행:
```
kpa:admin, kpa:pharmacist, kpa:branch_admin
neture:admin, neture:operator, neture:seller
glycopharm:admin, glycopharm:operator
glucoseview:admin, glucoseview:operator
cosmetics:admin, cosmetics:operator
platform:super_admin
```

### Unique 제약

```sql
UNIQUE ("user_id", "role", "is_active")
```

- 같은 사용자 = 여러 역할 가능 (서비스별 다른 역할)
- 같은 역할 2개 불가 (is_active 동일 시)

---

## 5. Register API 로직 (핵심 버그 위치)

### 엔드포인트

```
POST /api/v1/auth/register
```

### 처리 흐름

```
1. DTO 검증 (비밀번호, 이름, 동의)
     ↓
2. 이메일 존재 확인
   → 존재하면 → 409 "Email already exists" ← ★ 여기가 문제
     ↓
3. 비밀번호 해싱
     ↓
4. 역할 계산 (student→'user', 기본→'customer')
     ↓
5. 트랜잭션 시작
   ├─ User 생성 (status=PENDING, serviceKey=data.service||'platform')
   ├─ [KPA 전용] kpa_members 생성
   ├─ [KPA 전용] kpa_pharmacist_profiles 생성
   └─ RoleAssignment 생성 (scopeType=null, scopeId=null)
     ↓
6. 이메일 인증 발송 (비차단)
     ↓
7. 201 Created 반환 (토큰 없음, 자동 로그인 없음)
```

### 버그: 이메일 존재 시 처리

```typescript
// auth.controller.ts, line 325-329
const existingUser = await userRepository.findOne({ where: { email: data.email } });
if (existingUser) {
  return BaseController.error(res, 'Email already exists', 409);
}
```

**현재 동작**: 이메일 존재 → 무조건 409 거부
**정상 동작 (설계 의도)**: 이메일 존재 → 해당 서비스 멤버십 확인 → 없으면 추가

### RoleAssignment 생성 코드

```typescript
// auth.controller.ts, line 448-456
const assignment = new RoleAssignment();
assignment.userId = newUser.id;
assignment.role = effectiveRole;     // 'customer' 또는 'user' (서비스 접두사 없음!)
assignment.isActive = true;
assignment.validFrom = new Date();
assignment.assignedAt = new Date();
// scopeType = null (Entity 기본값 'global')
// scopeId = null
```

**추가 발견**: 가입 시 생성되는 역할에 **서비스 접두사가 없음**
- 가입 시: `customer` 또는 `user`
- 운영자 계정: `neture:operator`, `glycopharm:admin` (별도 할당)

---

## 6. 로그인/JWT 모델

### 로그인 시 역할 로딩

```typescript
const userRoles = await roleAssignmentService.getRoleNames(user.id);
// → 해당 사용자의 모든 active role 반환 (서비스 필터링 없음)
```

### JWT Payload

```typescript
{
  userId: string,
  email: string,
  role: string,          // roles[0] (primary)
  roles: string[],       // ALL active roles (서비스 구분 없이 전부)
  domain: string,        // 'neture.co.kr' (정보용, 필터링 안 함)
  permissions: string[],
  scopes: string[],
}
```

### 핵심 발견

```
domain 파라미터 = 정보용 (필터링/격리 기능 없음)
로그인 시 모든 active role 반환 (서비스 구분 없음)
requireAuth: JWT payload에서 roles 직접 할당 (DB 쿼리 없음)
```

---

## 7. 회원 승인 API 권한 구조

### 글로벌 Admin API

```
PATCH /api/v1/admin/users/:id/status
```

**필요 역할**: `admin`, `super_admin`, `manager` (비접두사)

### hasRole() 매칭 로직

```typescript
hasRole(role: string): boolean {
  return this.roles.some(r =>
    r === roleStr ||                    // 정확 일치
    r === `platform:${roleStr}`         // platform: 접두사만 지원
  );
}
```

**결과**:
- `platform:admin` → `admin` 매칭 **가능**
- `neture:admin` → `admin` 매칭 **불가**
- `glycopharm:operator` → `operator` 매칭 **불가**

### 서비스별 승인 엔드포인트 현황

| 서비스 | 엔드포인트 | 대상 | 역할 요구 |
|--------|-----------|------|----------|
| KPA | `PATCH /kpa/branches/:id/pending-members/:id/approve` | 분회 회원 | 분회 관리자 (SQL 체크) |
| Neture | `POST /neture/admin/suppliers/:id/approve` | 공급자 | `neture:admin` |
| GlucoseView | `POST /glucoseview/pharmacists/:id/approve` | 약사 | `glucoseview:admin` |
| **회원 계정 승인** | `PATCH /admin/users/:id/status` | **users.status** | **admin/super_admin/manager (글로벌만)** |

**결론**: 서비스 운영자가 회원 계정을 승인할 수 있는 경로가 없음

---

## 8. 구조 판정: 하이브리드 (불완전 구현)

### 다중 서비스를 위한 설계 요소 (존재함)

```
✅ users.service_key 컬럼
✅ 서비스 접두사 역할 (neture:admin, kpa:operator 등)
✅ 서비스별 scope guard (requireNetureScope, requireGlucoseViewScope)
✅ 서비스별 도메인 + 프론트엔드
✅ KPA 전용 테이블 (kpa_members, kpa_member_services)
✅ CORS 설정에 모든 서비스 도메인 등록
```

### 단일 사용자로 동작하는 요소 (문제)

```
❌ users.email UNIQUE (글로벌) → 다중 서비스 가입 차단
❌ Register API: 기존 이메일 → 무조건 409
❌ users.service_key: 1회만 설정 (멀티 불가)
❌ service_memberships 테이블 미존재
❌ 가입 시 역할에 서비스 접두사 없음 (customer/user만)
❌ Admin API: 글로벌 역할만 허용 → 서비스 운영자 접근 불가
❌ JWT domain: 정보용 (격리 기능 없음)
```

---

## 9. 두 가지 해결 방향

### 방향 A: 단일 사용자 모델 수용 (현재 동작 유지)

```
한 이메일 = 한 계정 (전체 서비스 공유)
가입은 한 번만, 서비스 전환은 역할 추가로 처리
```

**필요 작업**:
1. 서비스 운영자가 해당 서비스 역할을 추가할 수 있는 API
2. `hasRole()` 수정: 서비스 접두사 매칭 지원
3. 각 서비스 프론트엔드: "이미 가입된 계정" → 로그인 유도

**장점**: 변경 최소화
**단점**: 설계 의도와 불일치

### 방향 B: 다중 서비스 멤버십 모델 구현 (설계 의도 복원)

```
한 이메일 = 한 계정 + 여러 서비스 멤버십
각 서비스별 독립 가입/승인
```

**필요 작업**:
1. `service_memberships` 테이블 신설
2. Register API 수정: 기존 사용자 → 서비스 멤버십 추가
3. 서비스별 역할 자동 할당 (접두사 포함)
4. 서비스 운영자 승인 API 신설
5. 로그인 시 서비스별 역할 필터링

**장점**: 설계 의도 복원, 확장성
**단점**: 구조 변경 범위 큼

---

## 10. 실제 데이터 검증 결과

### E2E 테스트에서 생성된 계정

| 이메일 | service_key | role_assignment | users.status |
|--------|------------|-----------------|-------------|
| test-id@o4o.com | neture (추정) | customer/user | PENDING |
| test-glycopharm@o4o.com | glycopharm (추정) | customer/user | PENDING |
| test-kpa@o4o.com | kpa-society (추정) | customer/user | PENDING |
| test-kcosmetics@o4o.com | k-cosmetics (추정) | customer/user | PENDING |
| test-glucoseview@o4o.com | — (가입 실패) | — | — |

### 교차 가입 테스트

```
test-id@o4o.com (Neture 가입 후)
→ GlycoPharm 가입 시도
→ "이미 가입된 이메일입니다" (409)
```

---

## 11. 결론

### 현재 구현은 MODEL B (플랫폼 단일 사용자)

```
email UNIQUE (글로벌)
register → 기존 email → 거부
service_key → 1회 설정
```

### 설계 의도는 MODEL A (Global User + Service Membership)

```
email → 하나의 계정
서비스 멤버십 → 여러 개 가능
각 서비스 독립 승인
```

### 핵심 원인

Register API가 **기존 사용자의 서비스 멤버십 추가**를 지원하지 않음.
이는 `service_memberships` 테이블이 없고, register 로직이 email 존재 시 무조건 거부하기 때문.

### 추천

**대표님 판단에 따라 방향 A 또는 B 선택 필요.**

이 결정은 플랫폼 아키텍처 수준의 선택이므로,
수정 WO를 만들기 전에 **방향 확정**이 선행되어야 함.

---

*Investigation completed: 2026-03-10*
*Author: Claude Code (IR-O4O-MULTI-SERVICE-USER-MODEL-AUDIT-V1)*
