# KPA-Society 회원 가입·로그인·역할 분기 개발 상태 조사 결과

**조사 일자**: 2026-02-05
**조사 대상**: kpa-society.co.kr
**문서 버전**: v1.0

---

## 1. 조사 개요

### 1.1. 조사 목적

kpa-society.co.kr의 현재 개발 상태가 다음 기능들을 합의된 운영 흐름에 맞게 수용하고 있는지 확인:
- 회원 가입
- 승인
- 로그인
- 역할 분기(약사 / 약대생)
- 서비스별 데이터 분리
- 포럼 닉네임 연계

### 1.2. 기준 흐름 (정답 기준)

1. 회원 가입 (최소 정보 입력)
2. 운영자 승인
3. 승인 후 첫 로그인 (역할 미확정 상태 감지)
4. 역할 선택 + 추가 정보 입력
5. 역할 확정
6. 이후 로그인부터는 자동 역할 분기
7. 역할 변경은 프로필에서 요청

---

## 2. 조사 결과 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| A. 회원 가입 입력 구조 | ⚠️ 일부 구현 | lastName/firstName 통합, nickname 없음 |
| B. 승인 상태 관리 구조 | ⚠️ 구조는 있으나 미사용 | status 필드 있지만 즉시 ACTIVE |
| C. 로그인 후 역할 미확정 처리 | ⚠️ 일부 구현 | localStorage 기반, API 미연동 |
| D. 역할 선택 및 추가 정보 수집 | ⚠️ 일부 구현 | 약사/약대생 구분 없음 |
| E. 이후 로그인 자동 분기 | ⚠️ 일부 구현 | 기본 분기 로직 존재 |
| F. 서비스별 데이터 분리 | ❌ 미구현 | DB 레벨 분리 없음 |
| G. 포럼과 닉네임 연계 | ❌ 미구현 | nickname 필드 없음 |
| H. 역할 변경 요청 구조 | ❌ 미구현 | 요청→승인 구조 없음 |

---

## 3. 상세 조사 결과

### A. 회원 가입 입력 구조

**상태**: ⚠️ 일부 구현 / 구조 불완전

#### 조사 내용

**Frontend (RegisterPage.tsx)**

**위치**: [services/web-kpa-society/src/pages/auth/RegisterPage.tsx](services/web-kpa-society/src/pages/auth/RegisterPage.tsx:14-26)

```typescript
const [formData, setFormData] = useState({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',           // ❌ lastName/firstName 분리 안됨
  phone: '',
  licenseNumber: '',  // 약사 면허번호
  pharmacyName: '',
  pharmacyAddress: '',
  branch: '',
  agreeTerms: false,
  agreePrivacy: false,
});
// ❌ nickname 필드 없음
```

**Backend (User Entity)**

**위치**: [apps/api-server/src/modules/auth/entities/User.ts](apps/api-server/src/modules/auth/entities/User.ts:25-34)

```typescript
@Column({ type: 'varchar', length: 100, nullable: true })
firstName?: string;  // ✅ 필드는 있음

@Column({ type: 'varchar', length: 100, nullable: true })
lastName?: string;   // ✅ 필드는 있음

@Column({ type: 'varchar', length: 200, nullable: true })
name?: string;       // ✅ 통합 필드 (Frontend에서 사용)

// ❌ nickname 필드 없음
```

**Backend (RegisterRequestDto)**

**위치**: [apps/api-server/src/modules/auth/dto/register.dto.ts](apps/api-server/src/modules/auth/dto/register.dto.ts:22-24)

```typescript
@IsString()
@MinLength(2, { message: 'Name must be at least 2 characters' })
name: string;  // ✅ name만 받음 (lastName/firstName 분리 안됨)
```

#### 문제점

1. **lastName/firstName 분리 안됨**
   - Frontend: `name` 단일 필드로만 입력
   - Backend: Entity에는 firstName/lastName 필드가 있지만 사용 안함
   - DTO: name만 받음

2. **nickname 필드 없음**
   - Frontend: nickname 입력 필드 없음
   - Backend: User 엔티티에 nickname 칼럼 없음
   - 요청서 기준: "nickname (포럼 표시명)" 필수

3. **입력 순서**
   - 요청서 기준: "성 → 이름" 순서
   - 현재: "성명" 단일 필드

4. **역할 하드코딩**
   - RegisterPage.tsx:52: `role: 'pharmacist'`
   - 약사/약대생 구분 없음

---

### B. 승인 상태 관리 구조

**상태**: ⚠️ 구조는 있으나 미사용

#### 조사 내용

**User Entity 승인 관련 필드**

**위치**: [apps/api-server/src/modules/auth/entities/User.ts](apps/api-server/src/modules/auth/entities/User.ts:54-59)

```typescript
@Column({
  type: 'enum',
  enum: UserStatus,
  default: UserStatus.PENDING  // ✅ 기본값은 PENDING
})
status!: UserStatus;

@Column({ type: 'timestamp', nullable: true })
approvedAt?: Date;  // ✅ 승인 시각 필드 존재

@Column({ type: 'varchar', length: 255, nullable: true })
approvedBy?: string;  // ✅ 승인자 필드 존재
```

**회원가입 시 status 설정**

**위치**: [apps/api-server/src/modules/auth/controllers/auth.controller.ts](apps/api-server/src/modules/auth/controllers/auth.controller.ts:202)

```typescript
user.status = UserStatus.ACTIVE; // ❌ 즉시 ACTIVE로 설정
```

#### 문제점

1. **승인 로직 미작동**
   - User 엔티티에는 PENDING 기본값이지만
   - 회원가입 시 즉시 ACTIVE로 설정됨
   - 운영자 승인 단계 없음

2. **Frontend 승인 대기 페이지**
   - RegisterPage.tsx:64: `navigate('/register/pending')`
   - 승인 대기 페이지로 이동하지만 실제로는 이미 ACTIVE 상태

3. **로그인 차단 없음**
   - 승인 전 사용자도 로그인 가능

---

### C. 로그인 후 역할 미확정 처리

**상태**: ⚠️ 일부 구현 / 구조 불완전

#### 조사 내용

**AuthContext 역할 관련 타입**

**위치**: [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx:76-98)

```typescript
/**
 * 약사 직능 (Function)
 * 직능은 권한(Role)이 아닌 화면/업무 흐름을 위한 속성
 */
export type PharmacistFunction = 'pharmacy' | 'hospital' | 'industry' | 'other';

/**
 * 약사 직역 (Role)
 * 직역은 안내/온보딩 용도 메타데이터 (권한과 무관)
 */
export type PharmacistRole = 'general' | 'pharmacy_owner' | 'hospital' | 'other';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  pharmacistFunction?: PharmacistFunction;  // ✅ 직능 필드 있음
  pharmacistRole?: PharmacistRole;          // ✅ 직역 필드 있음
}
```

**LoginPage 역할 미확정 감지**

**위치**: [services/web-kpa-society/src/pages/LoginPage.tsx](services/web-kpa-society/src/pages/LoginPage.tsx:34-44)

```typescript
const loggedInUser = await login(email, password);

// 직능/직역 미선택 시 게이트로 이동
const isAdmin = loggedInUser.role === 'district_admin' ||
                loggedInUser.role === 'branch_admin' ||
                loggedInUser.role === 'super_admin';

if (!isAdmin && (!loggedInUser.pharmacistFunction || !loggedInUser.pharmacistRole)) {
  // ✅ 역할 미확정 감지
  navigate('/demo/select-function');
} else {
  navigate('/');
}
```

**localStorage 기반 저장**

**위치**: [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx:312-331)

```typescript
const setPharmacistFunction = (fn: PharmacistFunction) => {
  if (user) {
    const updatedUser = { ...user, pharmacistFunction: fn };
    setUser(updatedUser);
    localStorage.setItem(`kpa_function_${user.id}`, fn);  // ❌ localStorage
  }
};

const setPharmacistRole = (role: PharmacistRole) => {
  if (user) {
    const updatedUser = { ...user, pharmacistRole: role };
    setUser(updatedUser);
    localStorage.setItem(`kpa_pharmacist_role_${user.id}`, role);  // ❌ localStorage
  }
};
```

#### 문제점

1. **localStorage 기반**
   - 브라우저 로컬에만 저장
   - 다른 기기/브라우저에서 로그인 시 다시 선택 필요
   - DB에 저장되지 않음

2. **Backend 연동 없음**
   - User 엔티티에 pharmacistFunction, pharmacistRole 필드 없음
   - API 서버는 이 정보를 모름

3. **약사/약대생 구분 없음**
   - 요청서: "약사 / 약대생" 구분
   - 현재: PharmacistFunction (직능) 구분만 존재
   - 약대생 타입 없음

---

### D. 역할 선택 및 추가 정보 수집

**상태**: ⚠️ 일부 구현 / 구조 불완전

#### 조사 내용

**역할 선택 화면 존재**

- Route: `/demo/select-function`
- LoginPage.tsx:44에서 미확정 시 이동

**역할 타입 정의**

**위치**: [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx:79-89)

```typescript
export type PharmacistFunction = 'pharmacy' | 'hospital' | 'industry' | 'other';
export type PharmacistRole = 'general' | 'pharmacy_owner' | 'hospital' | 'other';
```

#### 문제점

1. **약사/약대생 구분 없음**
   - 요청서 기준:
     - 약사: 면허번호 직접 입력 (5자리 숫자)
     - 약대생: 면허번호 자동 생성
   - 현재: 둘 다 `pharmacist` role로만 가입

2. **추가 정보 수집 구조 없음**
   - 역할에 따른 입력 항목 분기 없음
   - 약사 면허번호 검증 없음 (RegisterPage에는 입력 필드만 있음)

3. **역할 확정 후 변경 불가**
   - localStorage 기반이므로 실제로는 변경 가능
   - 요청서 기준: "역할 확정 이후 role 값이 고정되는 구조"

---

### E. 이후 로그인 자동 분기

**상태**: ⚠️ 일부 구현 / 구조 불완전

#### 조사 내용

**LoginPage 자동 분기 로직**

**위치**: [services/web-kpa-society/src/pages/LoginPage.tsx](services/web-kpa-society/src/pages/LoginPage.tsx:36-51)

```typescript
const isAdmin = loggedInUser.role === 'district_admin' ||
                loggedInUser.role === 'branch_admin' ||
                loggedInUser.role === 'super_admin';

if (!isAdmin && (!loggedInUser.pharmacistFunction || !loggedInUser.pharmacistRole)) {
  navigate('/demo/select-function');  // ✅ 미확정 시 게이트로
} else if (returnTo) {
  navigate(returnTo);  // ✅ returnTo 파라미터 지원
} else {
  navigate('/');  // ✅ 기본: 홈으로
}
```

**AuthContext 복원 로직**

**위치**: [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx:214-227)

```typescript
function createUserFromApiResponse(apiUser: ApiUser): User {
  const mappedRole = mapApiRoleToKpaRole(apiUser.role);
  const savedFunction = localStorage.getItem(`kpa_function_${apiUser.id}`) as PharmacistFunction | null;
  const savedPharmacistRole = localStorage.getItem(`kpa_pharmacist_role_${apiUser.id}`) as PharmacistRole | null;

  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    role: mappedRole,
    pharmacistFunction: savedFunction || undefined,  // ✅ localStorage에서 복원
    pharmacistRole: savedPharmacistRole || undefined,  // ✅ localStorage에서 복원
  };
}
```

#### 문제점

1. **localStorage 의존**
   - 브라우저 변경/초기화 시 역할 정보 손실
   - 다시 게이트로 이동

2. **역할 기반 메뉴/페이지 분기 미확인**
   - 요청서: "접근 페이지, 메뉴, 포럼 권한이 자동 분기"
   - 현재: 기본 분기 로직만 존재

---

### F. 서비스별 데이터 분리 보장

**상태**: ❌ 미구현 (추가 설계 필요)

#### 조사 내용

**Frontend에서 service 파라미터 전달**

**위치**: [services/web-kpa-society/src/pages/auth/RegisterPage.tsx](services/web-kpa-society/src/pages/auth/RegisterPage.tsx:50-54)

```typescript
body: JSON.stringify({
  ...formData,
  role: 'pharmacist',
  service: 'kpa-society',  // ✅ service 파라미터 전달
}),
```

**Backend User Entity**

**위치**: [apps/api-server/src/modules/auth/entities/User.ts](apps/api-server/src/modules/auth/entities/User.ts)

```typescript
// ❌ service 관련 필드 없음
// ❌ serviceKey 필드 없음
// ❌ organizationId 필드 없음 (domain 필드만 있음)

@Column({ type: 'varchar', length: 255, nullable: true })
domain?: string;  // ⚠️ 멀티테넌트용 domain 필드만 존재
```

#### 문제점

1. **DB 레벨 분리 없음**
   - User 테이블에 service 식별자 없음
   - 모든 약사회/분회가 같은 users 테이블 공유

2. **로그인 토큰에 서비스 정보 없음**
   - JWT에 service 정보 미포함 확인 필요

3. **데이터 격리 불가능**
   - 동일 사용자가 여러 약사회 서비스에 자동 연결될 위험

---

### G. 포럼과 닉네임 연계

**상태**: ❌ 미구현

#### 조사 내용

**Forum Post 타입 (KPA Society)**

```typescript
export interface ForumPost {
  authorName: string;  // ❌ User.name 사용 (nickname 아님)
}
```

**Forum Core 검색 API**

**위치**: [packages/forum-core/src/backend/services/forum.search.service.ts](packages/forum-core/src/backend/services/forum.search.service.ts)

```typescript
author?: {
  id: string;
  username?: string;
  nickname?: string;  // ⚠️ 옵션 필드이지만 KPA에서 사용 안함
};
```

**User Entity**

```typescript
// ❌ nickname 칼럼 없음

@Column({ type: 'varchar', length: 200, nullable: true })
name?: string;  // ✅ 이 필드만 포럼에서 사용
```

#### 문제점

1. **nickname 필드 없음**
   - User 엔티티에 nickname 칼럼 없음
   - Forum에서 User.name 직접 사용

2. **실명 노출**
   - 포럼에서 실명(name) 표시
   - 요청서 기준: "nickname (포럼 표시명)"

---

### H. 역할 변경 요청 수용 가능 구조

**상태**: ❌ 미구현 (추가 설계 필요)

#### 조사 내용

**현재 역할 변경 방식**

**위치**: [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx:312-331)

```typescript
// ❌ 즉시 변경 (localStorage)
const setPharmacistFunction = (fn: PharmacistFunction) => {
  localStorage.setItem(`kpa_function_${user.id}`, fn);
};

const setPharmacistRole = (role: PharmacistRole) => {
  localStorage.setItem(`kpa_pharmacist_role_${user.id}`, role);
};
```

#### 문제점

1. **즉시 변경 구조**
   - localStorage에서 즉시 변경
   - 요청→승인 흐름 없음

2. **프로필 페이지 연계 없음**
   - 요청서: "역할 변경은 프로필에서 요청"
   - 현재: 프로필 연계 구조 없음

3. **확장 불가능**
   - 요청 → 승인 형태로 확장 불가능

---

## 4. 핵심 발견 사항

### 4.1. 구조적 문제

1. **Backend-Frontend 불일치**
   - Frontend: name 단일 필드
   - Backend Entity: firstName/lastName 필드 있지만 사용 안함

2. **승인 로직 우회**
   - User.status 기본값은 PENDING
   - 회원가입 시 즉시 ACTIVE로 변경
   - 운영자 승인 단계 없음

3. **localStorage 의존**
   - 역할 정보가 브라우저에만 저장
   - 서버는 역할 정보를 모름
   - 다른 기기에서 로그인 시 정보 손실

### 4.2. 기능 누락

1. **약사/약대생 구분 없음**
   - 요청서: 약사(면허번호 입력) vs 약대생(자동 생성)
   - 현재: 둘 다 pharmacist role

2. **nickname 필드 없음**
   - 포럼에서 실명(name) 사용
   - 익명성 보호 불가

3. **서비스별 데이터 분리 없음**
   - User 테이블에 service 식별자 없음
   - 모든 약사회가 같은 데이터 공유

---

## 5. 권장 조치사항

### 5.1. 긴급 (P0)

1. **승인 로직 활성화**
   - auth.controller.ts:202 수정
   - `user.status = UserStatus.PENDING` 유지
   - 승인 전 로그인 차단 로직 추가

2. **서비스별 데이터 분리**
   - User 테이블에 `serviceKey` 또는 `organizationId` 칼럼 추가
   - 로그인/가입 시 서비스 식별자 저장
   - 조회 시 서비스 필터 적용

### 5.2. 높음 (P1)

1. **lastName/firstName 분리**
   - RegisterPage에 "성", "이름" 별도 필드 추가
   - RegisterRequestDto에 firstName, lastName 필드 추가
   - auth.controller.ts에서 분리 저장

2. **nickname 필드 추가**
   - User 테이블에 `nickname` 칼럼 추가
   - 회원가입 시 필수 입력
   - 포럼에서 nickname 사용하도록 수정

3. **역할 정보 DB 저장**
   - User 테이블에 `pharmacistFunction`, `pharmacistRole` 칼럼 추가
   - localStorage 대신 DB에 저장
   - API 응답에 포함

### 5.3. 중간 (P2)

1. **약사/약대생 구분**
   - User 테이블에 `userType` 칼럼 추가 ('pharmacist' | 'student')
   - 역할 선택 화면에 약사/약대생 선택 추가
   - 약대생: 면허번호 자동 생성 로직

2. **역할 변경 요청→승인 구조**
   - `role_change_requests` 테이블 생성
   - 프로필 페이지에 역할 변경 요청 UI 추가
   - 운영자 승인 페이지 추가

---

## 6. 참고 파일 위치

### Frontend

| 파일 | 경로 |
|------|------|
| 회원가입 페이지 | [services/web-kpa-society/src/pages/auth/RegisterPage.tsx](services/web-kpa-society/src/pages/auth/RegisterPage.tsx) |
| 로그인 페이지 | [services/web-kpa-society/src/pages/LoginPage.tsx](services/web-kpa-society/src/pages/LoginPage.tsx) |
| Auth Context | [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx) |

### Backend

| 파일 | 경로 |
|------|------|
| Auth Controller | [apps/api-server/src/modules/auth/controllers/auth.controller.ts](apps/api-server/src/modules/auth/controllers/auth.controller.ts) |
| User Entity | [apps/api-server/src/modules/auth/entities/User.ts](apps/api-server/src/modules/auth/entities/User.ts) |
| Register DTO | [apps/api-server/src/modules/auth/dto/register.dto.ts](apps/api-server/src/modules/auth/dto/register.dto.ts) |

---

## 7. 결론

kpa-society.co.kr의 현재 개발 상태는 **기본 구조는 갖추고 있으나, 요청서 기준 흐름을 완전히 만족하지 못함**.

**주요 Gap:**
1. 승인 로직 우회 (즉시 ACTIVE)
2. localStorage 기반 역할 관리 (DB 미연동)
3. 약사/약대생 구분 없음
4. nickname 필드 없음 (실명 노출)
5. 서비스별 데이터 분리 없음

**권장:**
- P0 항목부터 순차 개발
- 본 조사 결과 기반으로 정비/개발 작업 요청서 작성

---

**조사 완료일**: 2026-02-05
**다음 단계**: 정비/개발 작업 요청서 작성
