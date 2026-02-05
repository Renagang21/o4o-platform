# Phase 2-B: AuthContext role 저장 구조 조사

**조사 일시**: 2026-02-05
**조사 파일**: `services/web-kpa-society/src/contexts/AuthContext.tsx`
**조사 방법**: 소스 코드 분석 (관측만, 판단 없음)

---

## 조사 파일

**위치**: `services/web-kpa-society/src/contexts/AuthContext.tsx`
**라인 수**: 407줄
**관련 Work Orders**:
- WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1 (Role 매핑 제거)
- WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY (Service User 인증)

---

## User 인터페이스 정의

### Frontend User Type

**위치**: `AuthContext.tsx:91-98`

```tsx
export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;  // ← 단일 string (optional)
  pharmacistFunction?: PharmacistFunction;
  pharmacistRole?: PharmacistRole;
}
```

**관찰**:
- ✅ `role` 필드 존재 (단일 string)
- ❌ `roles` 필드 **없음**
- ❌ `dbRoles` 필드 **없음**
- ❌ `activeRole` 필드 **없음**

**결론**: Frontend User 인터페이스는 **`role` (단일 string)만 지원**

---

## API 응답 타입 정의

### ApiUser Type

**위치**: `AuthContext.tsx:179-187`

```tsx
interface ApiUser {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;  // ← 단일 string
  roles?: string[];  // ← 배열 (optional)
  [key: string]: unknown;
}
```

**관찰**:
- ✅ `role` 필드 존재 (단일 string)
- ✅ `roles` 필드 존재 (배열)
- ✅ 둘 다 optional
- ✅ `[key: string]: unknown` - 추가 필드 허용

**결론**: ApiUser는 **`role`과 `roles` 둘 다 정의**되어 있음

---

## API 응답 → User 객체 변환

### createUserFromApiResponse 함수

**위치**: `AuthContext.tsx:204-214`

```tsx
/**
 * API 응답에서 User 객체 생성
 *
 * WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1:
 * - role 매핑 제거 (API role을 그대로 사용)
 * - KPA 프론트는 role 문자열을 해석하지 않음
 */
function createUserFromApiResponse(apiUser: ApiUser): User {
  // P1-T3: Get pharmacistFunction/Role from API response (not localStorage)
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    role: apiUser.role || 'pharmacist', // ← 🔥 매핑 없이 그대로 사용
    pharmacistFunction: (apiUser as any).pharmacistFunction as PharmacistFunction | undefined,
    pharmacistRole: (apiUser as any).pharmacistRole as PharmacistRole | undefined,
  };
}
```

**관찰**:

### 🔥 핵심 발견 1: `apiUser.role`만 사용

**출처**: `apiUser.role` (단일 string)

**저장 위치**: `User.role` (단일 string)

**`apiUser.roles` 배열**: **완전히 무시됨**

**fallback**: `apiUser.role`이 없으면 `'pharmacist'` 기본값

### 🔥 핵심 발견 2: 변환 로직 없음

**WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1 주석**:
```tsx
// role 매핑 제거 (API role을 그대로 사용)
// KPA 프론트는 role 문자열을 해석하지 않음
```

**의미**:
- ✅ API 응답의 `role` 값을 **그대로** 저장
- ❌ Legacy → Prefixed 변환 **없음**
- ❌ Prefixed → Legacy 변환 **없음**
- ❌ `roles` 배열 → `role` 단일 값 선택 로직 **없음**

### 🔥 핵심 발견 3: `roles` 배열은 **사용되지 않음**

**코드에서 `apiUser.roles` 참조**: ❌ **전혀 없음**

**결과**:
- Phase 4 마이그레이션으로 추가된 prefixed roles (`kpa:admin` 등)은
- `apiUser.roles` 배열에만 존재하므로
- **AuthContext에 전달되지 않음**

---

## 로그인 시 role 처리

### login 함수

**위치**: `AuthContext.tsx:251-261`

```tsx
const login = async (email: string, password: string): Promise<User> => {
  const response = await authClient.login({ email, password });

  if (response.success && response.user) {
    const userData = createUserFromApiResponse(response.user as ApiUser);
    setUser(userData);  // ← State에 저장
    return userData;
  } else {
    throw new Error('로그인 응답 형식이 올바르지 않습니다.');
  }
};
```

**흐름**:
1. `authClient.login()` 호출
2. API 응답의 `response.user` 획득
3. `createUserFromApiResponse()` 변환
4. `setUser(userData)` State 저장

**role 처리**:
- `response.user.role` → `userData.role` (단일 string)
- `response.user.roles` → **무시됨**

---

## Refresh/Rehydrate 시 role 처리

### checkAuth 함수

**위치**: `AuthContext.tsx:229-245`

```tsx
const checkAuth = useCallback(async () => {
  try {
    const response = await authClient.api.get('/auth/me');
    const data = response.data as { success: boolean; data: ApiUser };

    if (data.success && data.data) {
      setUser(createUserFromApiResponse(data.data));  // ← 동일한 변환
    } else {
      setUser(null);
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    setUser(null);
  } finally {
    setIsLoading(false);
  }
}, []);
```

**흐름**:
1. `/auth/me` API 호출
2. API 응답의 `data.data` (ApiUser) 획득
3. `createUserFromApiResponse()` 변환
4. `setUser()` State 저장

**role 처리**:
- Login과 **동일**
- `apiUser.role` → `user.role` (단일 string)
- `apiUser.roles` → **무시됨**

---

## localStorage / sessionStorage 연계

### 조사 결과: ❌ **없음**

**검색 키워드**:
- `localStorage`
- `sessionStorage`
- `getItem`
- `setItem`

**결과**: AuthContext.tsx에서 **role 관련 storage 사용 없음**

**주석 발견** (299-306줄):
```tsx
/**
 * P1-T3: 약사 직능 설정
 * - DB에 저장 (localStorage 제거)
 * - API 호출하여 서버에 업데이트
 */
```

**의미**: 이전에는 localStorage 사용했으나 **제거됨** (P1-T3)

---

## Phase 4 분기 코드 존재 여부

### 조사 결과: ❌ **없음**

**검색 키워드**:
- `kpa:admin`
- `prefixed`
- `Phase 4`
- `migration`
- `role prefix`

**결과**: AuthContext.tsx에 Phase 4 관련 분기 코드 **전혀 없음**

**WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1 주석만 존재**:
```tsx
// WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1
// Role 자동 매핑 제거됨
// KPA는 더 이상 API role을 해석하지 않음
// 운영자 여부는 서버 응답(KpaMember 기반)으로만 판단
```

**의미**: Phase 0에서 role 해석 제거, Phase 4 지원은 **계획되지 않음**

---

## 저장 필드 요약

### React State

**State 정의**: `const [user, setUser] = useState<User | null>(null);`

**저장되는 필드**:
```tsx
{
  id: string,
  email: string,
  name: string,
  role: string,  // ← 🔥 단일 string만 저장됨
  pharmacistFunction?: PharmacistFunction,
  pharmacistRole?: PharmacistRole
}
```

**저장되지 않는 필드**:
- ❌ `roles` (배열) - API 응답에 있으나 **무시**
- ❌ `dbRoles` (배열) - API 응답에 있으나 **무시**
- ❌ `activeRole` (객체) - API 응답에 있으나 **무시**

---

## 실제 사용 기준

### AuthContext에서 "정식 role"로 취급되는 필드

**필드**: `user.role` (단일 string)

**근거 코드**:
1. **User 인터페이스** (91-98줄): `role?: string` (단일 string만 정의)
2. **createUserFromApiResponse** (204-214줄): `role: apiUser.role` (단일 값만 추출)
3. **useAuth hook** (400-406줄): `user.role` 반환

**사용 위치**:
- AdminAuthGuard: `user.role` 읽음 (Phase 1 확인)
- BranchAdminAuthGuard: `user.role` 읽음 (Phase 1 확인)
- 기타 컴포넌트: `user.role` 기준 판단

**`user.roles` 배열 사용**: ❌ **불가능** (저장 자체가 안 됨)

---

## 변환/가공 로직

### 로그인 시 role 가공 여부

**결과**: ❌ **없음**

**근거**: `createUserFromApiResponse()` 함수
```tsx
role: apiUser.role || 'pharmacist', // 매핑 없이 그대로 사용
```

**동작**:
- `apiUser.role` 값을 **그대로** 복사
- fallback만 적용 (`'pharmacist'`)
- 변환/매핑/선택 로직 **없음**

### Refresh 시 role 가공 여부

**결과**: ❌ **없음**

**근거**: `checkAuth()` 함수
- `createUserFromApiResponse()` 동일하게 사용
- 로그인과 **완전히 동일한 처리**

### Legacy / Prefixed 분기 존재 여부

**결과**: ❌ **없음**

**근거**:
- Phase 4 관련 코드 **전혀 없음**
- Legacy와 Prefixed 구분 로직 **없음**
- `apiUser.roles` 배열 참조 **없음**

---

## 관측 메모

### 1. 🔥 **Critical Finding: `apiUser.roles` 배열이 완전히 무시됨**

**API 응답 구조** (Phase 2-A 확인):
```json
{
  "user": {
    "role": "admin",  // ← Legacy unprefixed
    "roles": ["admin", "kpa:admin"],  // ← Legacy + Prefixed
    "dbRoles": [...],
    "activeRole": {...}
  }
}
```

**AuthContext 저장**:
```tsx
{
  role: "admin",  // ← apiUser.role만 사용
  // roles 배열은 저장 안 됨
}
```

**결과**:
- Phase 4 prefixed roles (`kpa:admin`, `kpa:branch_admin` 등)는
- `apiUser.roles` 배열에만 존재
- **AuthContext에 전달되지 않음**
- **AuthGuard가 접근할 방법 없음**

### 2. Phase 4 Dual-Format과의 정합성

**Phase 2-A 확인**:
- API는 `role` (legacy)과 `roles` (legacy + prefixed) 모두 반환

**Phase 2-B 확인**:
- AuthContext는 `role` (legacy)만 저장
- `roles` 배열 **무시**

**정합성**: ❌ **불일치**
- API가 제공하는 prefixed roles 정보가
- 프론트엔드에 전달되지 않음

### 3. WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1의 의도와 부작용

**의도** (주석):
```tsx
// role 매핑 제거 (API role을 그대로 사용)
// KPA 프론트는 role 문자열을 해석하지 않음
```

**의도된 효과**:
- 프론트엔드가 role 값을 해석/변환하지 않음
- 백엔드 응답을 그대로 사용

**실제 효과**:
- ✅ `apiUser.role` (단일 값)은 그대로 사용됨
- ❌ `apiUser.roles` (배열)은 **완전히 무시됨**

**부작용**:
- Phase 4 prefixed roles가 프론트엔드에 전달 안 됨
- "API role을 그대로 사용"하려는 의도와 **모순**
- `role` (단일 값)만 "그대로" 사용, `roles` (배열)는 무시

### 4. 잠재적 불일치 지점 (Phase 2-C에서 확정)

**Phase 2-A + Phase 2-B 종합**:

| 위치 | `role` (단일) | `roles` (배열) |
|------|--------------|----------------|
| **API 응답** | `"admin"` (legacy) | `["admin", "kpa:admin"]` (legacy + prefixed) |
| **AuthContext 저장** | `"admin"` (legacy) | ❌ 저장 안 됨 |
| **AuthGuard 접근** | `user.role` = `"admin"` | ❌ 접근 불가능 |

**예상 시나리오**:
- AdminAuthGuard가 `user.role` 체크
- `user.role = "admin"` (legacy)만 확인 가능
- Prefixed roles (`kpa:admin`)는 **확인 불가능**

**Phase 2-C에서 확정 필요**:
- AdminAuthGuard가 실제로 `user.role`을 체크하는가?
- `user.roles` 배열을 체크하려고 시도하는가?
- 시도한다면 어떻게 실패하는가?

---

## Phase 2-B 결론 (사실 진술만)

### 확인된 사실

1. **AuthContext는 `user.role` (단일 string)만 저장**
   - User 인터페이스 정의: `role?: string`
   - `user.roles` 필드 자체가 **존재하지 않음**

2. **API 응답의 `apiUser.roles` 배열은 완전히 무시됨**
   - `createUserFromApiResponse()` 함수에서 참조 안 함
   - Phase 4 prefixed roles 정보가 **손실됨**

3. **변환/가공 로직 없음**
   - `apiUser.role` 값을 그대로 복사
   - Legacy / Prefixed 구분 로직 없음
   - Phase 4 분기 코드 없음

4. **로그인과 Refresh 처리 동일**
   - 둘 다 `createUserFromApiResponse()` 사용
   - 동일한 방식으로 `user.role` 저장

5. **localStorage / sessionStorage 사용 없음**
   - P1-T3에서 제거됨
   - Role 관련 client-side storage 없음

### Phase 2-C 조사 방향

다음 질문에 답하기:

1. **AdminAuthGuard는 무엇을 읽는가?**
   - `user.role` (단일 string) 읽기 시도?
   - `user.roles` (배열) 읽기 시도?
   - 후자라면 `undefined` 반환 → 접근 차단 확정

2. **BranchAdminAuthGuard는 무엇을 읽는가?**
   - 동일한 패턴인가?

3. **Phase 4 충돌 최종 확정**
   - AuthGuard가 `user.role`만 체크 → Legacy roles만 인식
   - Prefixed roles (`kpa:admin` 등) 인식 불가능 확정

---

**Phase 2-B 조사 완료**

**Next Step**: Phase 2-C - AuthGuard 소비 방식 조사

---

*조사 완료 시각: 2026-02-05*
*조사자: Claude Code*
