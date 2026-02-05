# Phase 2-A: API 로그인 응답 조사 결과

**조사 일시**: 2026-02-05
**환경**: Production (백엔드 코드 기준)
**조사 방법**: 백엔드 소스 코드 분석

---

## API 정보

### Endpoint
- **URL**: `POST /api/v1/auth/login`
- **Controller**: `apps/api-server/src/modules/auth/controllers/auth.controller.ts`
- **Service**: `apps/api-server/src/services/authentication.service.ts`
- **Method**: `login()`

---

## 응답 구조 요약

### Response Format
```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "user": { ... },
    "tokens": { ... }  // 조건부 (cross-origin 또는 includeLegacyTokens: true)
  }
}
```

---

## User 객체 상세 (핵심)

### User 필드 출처
- **Source**: `user.toPublicData()` 메소드
- **Location**: `apps/api-server/src/entities/User.ts:476-518`

### User 응답 구조
```typescript
{
  // 식별 정보
  id: string,
  email: string,

  // 이름 정보
  displayName: string,
  firstName?: string,
  lastName?: string,
  fullName: string,

  // 연락처
  phone?: string,
  contactEnabled: boolean,
  kakaoOpenChatUrl?: string,
  kakaoChannelUrl?: string,

  // ============================================
  // 🔥 Role 필드 (Phase 4 충돌 핵심)
  // ============================================

  // 1. role (단일 string) - DEPRECATED
  role: string,

  // 2. roles (배열) - 실제 사용
  roles: string[],

  // 3. activeRole (객체 | null) - UI용
  activeRole: {
    id: string,
    name: string,
    displayName: string
  } | null,

  // 4. dbRoles (배열) - Role 엔티티 목록
  dbRoles: Array<{
    id: string,
    name: string,
    displayName: string
  }>,

  // 5. canSwitchRoles (boolean) - UI 플래그
  canSwitchRoles: boolean,

  // ============================================

  // 상태/권한
  status: string,
  permissions: string[],
  scopes: string[],  // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1

  // 약사 정보 (KPA 전용)
  pharmacistFunction?: string,
  pharmacistRole?: string,

  // 메타데이터
  isActive: boolean,
  isEmailVerified: boolean,
  lastLoginAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Role 필드 상세 분석

### 1. `user.role` (단일 string)

**타입**: `string`

**출처**: User 엔티티의 `role` 컬럼
```tsx
// apps/api-server/src/entities/User.ts:78-84
@Column({
  type: 'enum',
  enum: UserRole,
  default: UserRole.USER
})
role!: UserRole;
```

**특징**:
- ⚠️ **DEPRECATED** (Phase P0 주석)
- 단일 값만 저장
- UserRole enum 사용 (legacy unprefixed roles)

**Phase 4 이후 값 예시**:
- `"admin"` (변경 없음)
- `"operator"` (변경 없음)
- **Prefixed roles 저장 안 됨** (단일 값이므로)

---

### 2. `user.roles` (배열)

**타입**: `string[]`

**출처**: `getRoleNames()` 메소드
```tsx
// apps/api-server/src/entities/User.ts:374-379
getRoleNames(): string[] {
  if (this.dbRoles && this.dbRoles.length > 0) {
    return this.dbRoles.map(r => r.name);
  }
  return this.roles || [this.role];
}
```

**우선순위**:
1. `dbRoles` (Role 엔티티 배열) - 우선
2. `roles` (User 컬럼) - 대체
3. `[role]` (단일 값 배열화) - 최종 fallback

**User 컬럼**:
```tsx
// apps/api-server/src/entities/User.ts:94-98
@Column({
  type: 'simple-array',
  default: () => `'${UserRole.USER}'`
})
roles!: string[];
```

**특징**:
- ✅ 배열 형식
- ⚠️ **DEPRECATED** (Phase P0 주석)
- Legacy + Phase 4 prefixed roles 모두 저장 가능

**Phase 4 이후 값 예시**:
```json
{
  "roles": ["admin", "kpa:admin"]
}
```

---

### 3. `user.dbRoles` (Role 엔티티 배열)

**타입**: `Array<{ id, name, displayName }>`

**출처**: User 엔티티의 ManyToMany 관계
```tsx
// apps/api-server/src/entities/User.ts:108-114
@ManyToMany('Role', 'users', { eager: true })
@JoinTable({
  name: 'user_roles',
  joinColumn: { name: 'user_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
})
dbRoles?: Role[];
```

**특징**:
- ⚠️ **DEPRECATED** (Phase P0 주석)
- Role 테이블과 ManyToMany 관계
- Eager loading (자동 로드)
- UI 표시용 (id, name, displayName)

**Phase 4 이후 값 예시**:
```json
{
  "dbRoles": [
    { "id": "role-001", "name": "admin", "displayName": "Administrator" },
    { "id": "role-002", "name": "kpa:admin", "displayName": "KPA Admin" }
  ]
}
```

---

### 4. `user.activeRole` (현재 활성 role)

**타입**: `{ id, name, displayName } | null`

**출처**: `getActiveRole()` 메소드
```tsx
// apps/api-server/src/entities/User.ts:434-446
getActiveRole(): Role | null {
  // If activeRole is explicitly set, use it
  if (this.activeRole) {
    return this.activeRole;
  }

  // Fallback: return first dbRole if available
  if (this.dbRoles && this.dbRoles.length > 0) {
    return this.dbRoles[0];
  }

  return null;
}
```

**특징**:
- ⚠️ **DEPRECATED** (Phase P0 주석)
- UI 표시용 (현재 선택된 role)
- Multiple roles 지원 시 사용
- activeRole 설정 없으면 첫 번째 dbRole 반환

---

## Phase 4 마이그레이션 영향 분석

### 데이터베이스 마이그레이션 결과

**Phase 4 마이그레이션**:
- **File**: `apps/api-server/src/database/migrations/20260205070000-Phase4MultiServiceRolePrefixMigration.ts`

**동작**:
```sql
-- GlycoPharm admin 예시
UPDATE users
SET roles = array_append(roles, 'glycopharm:admin')
WHERE 'admin' = ANY(roles)
  AND EXISTS (SELECT 1 FROM glycopharm_applications WHERE user_id = users.id AND status = 'approved')
  AND NOT ('glycopharm:admin' = ANY(roles));
```

**결과**:
- `role` 컬럼: **변경 없음** (단일 값, 기존 유지)
- `roles` 배열: **Prefixed role 추가됨** (Dual-format)

### Phase 4 이후 API 응답 예시

**KPA Admin 사용자**:
```json
{
  "user": {
    "id": "user-001",
    "email": "admin@kpa.kr",

    // 🔥 충돌 지점
    "role": "admin",  // Legacy unprefixed (단일 값, 변경 없음)
    "roles": ["admin", "kpa:admin"],  // Legacy + Prefixed (배열, 추가됨)

    "dbRoles": [
      { "id": "role-001", "name": "admin", "displayName": "Administrator" },
      { "id": "role-002", "name": "kpa:admin", "displayName": "KPA Admin" }
    ],

    "activeRole": {
      "id": "role-001",
      "name": "admin",
      "displayName": "Administrator"
    }
  }
}
```

**GlycoPharm Admin 사용자**:
```json
{
  "user": {
    "role": "admin",
    "roles": ["admin", "glycopharm:admin"],

    "dbRoles": [
      { "id": "role-001", "name": "admin", "displayName": "Administrator" },
      { "id": "role-003", "name": "glycopharm:admin", "displayName": "GlycoPharm Admin" }
    ]
  }
}
```

---

## 관측 메모

### 1. Legacy + Prefixed Dual-Format 확인

✅ **Phase 4 마이그레이션은 Dual-Format 방식**
- Legacy roles 유지
- Prefixed roles 추가
- `roles` 배열에 **모두 포함**

### 2. `role` vs `roles` 불일치

⚠️ **단일 `role` 필드는 Phase 4 변경 사항 반영 안 됨**
- `role`: `"admin"` (변경 없음)
- `roles`: `["admin", "kpa:admin"]` (prefixed 추가됨)

### 3. Deprecated 경고

⚠️ **User 엔티티 주석에 명시**:
```tsx
/**
 * @deprecated Phase P0: DO NOT USE for authorization
 * Use role_assignments table for RBAC instead.
 */
```

- `role`, `roles`, `dbRoles`, `activeRole` 모두 deprecated
- RoleAssignmentService 사용 권장
- 하지만 여전히 API 응답에 포함됨

### 4. 프론트엔드 기대값 불일치 (Phase 1 발견사항과 연결)

❌ **AuthContext가 기대하는 타입**:
```tsx
// services/web-kpa-society/src/contexts/AuthContext.tsx
interface ApiUser {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;  // 단일 string 기대
  roles?: string[];  // 배열도 지원
  [key: string]: unknown;
}
```

✅ **API가 실제로 반환하는 것**:
- `role`: string (legacy)
- `roles`: string[] (legacy + prefixed)

✅ **호환성**: 프론트엔드는 `role`과 `roles` 모두 처리 가능

❌ **문제**: AdminAuthGuard가 `user.role` (단일 string)만 체크
- `user.role = "admin"` → ✅ 통과
- `user.roles = ["admin", "kpa:admin"]` → ❌ 체크 안 함

---

## 서비스 A/B 차이 여부

**결론**: ❌ 차이 없음

- 서비스 A (`/`): 동일한 `AuthProvider` 사용
- 서비스 B (`/demo`): 동일한 `AuthProvider` 사용
- API 응답 구조 동일
- 차이점은 **AuthGuard 권한 검사 로직**에서만 발생 (Phase 1 확인)

---

## Phase 2-A 결론

### 확인된 사실

1. **API는 `role`과 `roles` 둘 다 반환**
   - `role`: string (deprecated, legacy only)
   - `roles`: string[] (preferred, legacy + prefixed)

2. **Phase 4 마이그레이션은 Dual-Format**
   - Legacy roles 유지: `"admin"`, `"operator"`
   - Prefixed roles 추가: `"kpa:admin"`, `"glycopharm:admin"`
   - `roles` 배열에 모두 포함

3. **프론트엔드 호환성은 존재**
   - AuthContext는 `role`과 `roles` 모두 처리 가능
   - API 응답 형식 문제 없음

4. **문제는 AuthGuard 소비 방식** (Phase 2-B에서 조사)
   - AdminAuthGuard가 `user.role` (단일 string)만 체크
   - `user.roles` 배열을 체크하지 않음
   - Prefixed roles 인식 못함

---

## Phase 2-B 조사 방향

다음 질문에 답하기:

1. **AuthContext는 API 응답을 어떻게 저장하는가?**
   - `role` 필드만 저장?
   - `roles` 배열도 저장?
   - 변환 로직 존재 여부?

2. **AdminAuthGuard는 무엇을 읽는가?**
   - `user.role` (단일 string)?
   - `user.roles` (배열)?
   - 둘 다?

3. **`user.role`과 `user.roles` 중 어느 것이 우선인가?**
   - AuthContext 저장 우선순위
   - AuthGuard 체크 우선순위

---

**Phase 2-A 조사 완료**

**Next Step**: Phase 2-B - AuthContext 저장/변환 조사

---

*조사 완료 시각: 2026-02-05*
*조사자: Claude Code*
