# Phase 2-C: AuthGuard 소비 구조 조사

**조사 일시**: 2026-02-05
**조사 대상**: AdminAuthGuard.tsx, BranchAdminAuthGuard.tsx
**조사 방법**: 소스 코드 분석 (관측만, 판단 없음)

---

## AdminAuthGuard 조사

### 파일 정보
- **위치**: `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx`
- **라인 수**: 177줄
- **용도**: `/demo/admin/*` 경로 보호 (지부 관리자)

---

### 권한 검사 함수

**함수명**: `checkBranchAdminRole(user: User): boolean`
**위치**: 86-116줄

```tsx
function checkBranchAdminRole(user: User): boolean {
  const role = user.role;  // ← 🔥 user.role (단일 string) 읽기

  // 슈퍼 관리자
  if (role === 'super_admin' || role === 'membership_super_admin') {
    return true;
  }

  // 지부 관리자
  if (role === 'membership_branch_admin' || role === 'membership_branch_operator') {
    return true;
  }

  // 지역 관리자
  if (role === 'membership_district_admin') {
    return true;
  }

  // admin 역할
  if (role === 'admin') {
    return true;
  }

  // 개발 환경에서는 임시 허용
  if (import.meta.env.DEV) {
    console.warn('[DEV MODE] Branch admin access allowed for testing');
    return true;
  }

  return false;
}
```

---

### 🔥 핵심 관찰 1: 참조 필드

**접근하는 필드**: `user.role` (단일 string)

**코드 증거**:
```tsx
const role = user.role;  // ← 86줄
```

**`user.roles` 배열 접근 시도**: ❌ **전혀 없음**

**검색 결과**:
- `user.role`: 1회 (86줄)
- `user.roles`: 0회
- `roles` 변수: 0회 (role이라는 단일 변수만 사용)

---

### 🔥 핵심 관찰 2: Prefixed role 문자열 존재 여부

**검색 키워드**:
- `'kpa:'`: ❌ **없음**
- `'platform:'`: ❌ **없음**
- `'kpa:admin'`: ❌ **없음**
- `'kpa:operator'`: ❌ **없음**

**결과**: Prefixed role 문자열 **단 한 줄도 존재하지 않음**

---

### 🔥 핵심 관찰 3: 체크하는 role 목록 (Legacy only)

**허용되는 roles**:
1. `'super_admin'` - Legacy
2. `'membership_super_admin'` - Legacy
3. `'membership_branch_admin'` - Legacy
4. `'membership_branch_operator'` - Legacy
5. `'membership_district_admin'` - Legacy
6. `'admin'` - Legacy

**모든 role 문자열**: **Legacy unprefixed only**

**Phase 4 prefixed roles**: **완전히 없음**

---

### 판단 기준 요약

**AdminAuthGuard 판단 기준**:
1. `user.role` (단일 string) 읽기
2. Legacy unprefixed roles와 **정확히 일치** 검사
3. Prefixed roles 체크 로직 **없음**

**결과**:
- `user.role = 'admin'` → ✅ 통과
- `user.role = 'kpa:admin'` → ❌ 차단 (일치하는 조건 없음)
- `user.roles = ['admin', 'kpa:admin']` → ❌ 접근 불가능 (필드 자체 없음)

---

## BranchAdminAuthGuard 조사

### 파일 정보
- **위치**: `services/web-kpa-society/src/components/branch-admin/BranchAdminAuthGuard.tsx`
- **라인 수**: 204줄
- **용도**: `/demo/branch/:branchId/admin/*` 경로 보호 (분회 관리자)

---

### 권한 검사 함수

**함수명**: `checkBranchAdminRole(user: User, _branchId: string): boolean`
**위치**: 116-143줄

```tsx
function checkBranchAdminRole(user: User, _branchId: string): boolean {
  const role = user.role;  // ← 🔥 user.role (단일 string) 읽기

  // 슈퍼 관리자는 모든 분회 접근 가능
  if (role === 'super_admin' || role === 'membership_super_admin') {
    return true;
  }

  // 지부 관리자는 소속 지부의 모든 분회 접근 가능 (매핑된 역할 포함)
  if (role === 'district_admin' || role === 'membership_district_admin') {
    // TODO: 지부-분회 관계 확인 로직 추가
    return true;
  }

  // 분회 관리자 권한 확인 (매핑된 역할 포함)
  if (role === 'branch_admin' || role === 'membership_branch_admin') {
    // TODO: 해당 분회에 대한 권한이 있는지 확인
    // 향후 API에서 user.managedBranches 등의 필드로 확인
    return true;
  }

  // admin 역할도 허용
  if (role === 'admin') {
    return true;
  }

  return false;
}
```

---

### 🔥 핵심 관찰 1: 참조 필드

**접근하는 필드**: `user.role` (단일 string)

**코드 증거**:
```tsx
const role = user.role;  // ← 117줄
```

**`user.roles` 배열 접근 시도**: ❌ **전혀 없음**

**검색 결과**:
- `user.role`: 1회 (117줄)
- `user.roles`: 0회
- `roles` 변수: 0회

---

### 🔥 핵심 관찰 2: Prefixed role 문자열 존재 여부

**검색 키워드**:
- `'kpa:'`: ❌ **없음**
- `'platform:'`: ❌ **없음**
- `'kpa:branch_admin'`: ❌ **없음**
- `'kpa:branch_operator'`: ❌ **없음**

**결과**: Prefixed role 문자열 **단 한 줄도 존재하지 않음**

---

### 🔥 핵심 관찰 3: 체크하는 role 목록 (Legacy only)

**허용되는 roles**:
1. `'super_admin'` - Legacy
2. `'membership_super_admin'` - Legacy
3. `'district_admin'` - Legacy
4. `'membership_district_admin'` - Legacy
5. `'branch_admin'` - Legacy
6. `'membership_branch_admin'` - Legacy
7. `'admin'` - Legacy

**모든 role 문자열**: **Legacy unprefixed only**

**Phase 4 prefixed roles**: **완전히 없음**

---

### 판단 기준 요약

**BranchAdminAuthGuard 판단 기준**:
1. `user.role` (단일 string) 읽기
2. Legacy unprefixed roles와 **정확히 일치** 검사
3. Prefixed roles 체크 로직 **없음**
4. `_branchId` 파라미터는 **사용되지 않음** (TODO 주석)

**결과**:
- `user.role = 'branch_admin'` → ✅ 통과
- `user.role = 'kpa:branch_admin'` → ❌ 차단 (일치하는 조건 없음)
- `user.roles = ['branch_admin', 'kpa:branch_admin']` → ❌ 접근 불가능

---

## Guard별 차이 분석

### AdminAuthGuard vs BranchAdminAuthGuard

| 항목 | AdminAuthGuard | BranchAdminAuthGuard |
|------|----------------|----------------------|
| **참조 필드** | `user.role` | `user.role` |
| **`user.roles` 접근** | ❌ 없음 | ❌ 없음 |
| **Prefixed roles** | ❌ 없음 | ❌ 없음 |
| **Legacy roles** | ✅ 6개 | ✅ 7개 |
| **DEV 우회** | ✅ 있음 | ❌ 없음 |
| **분회 구분** | N/A | ❌ TODO (미구현) |

**공통점**:
- ✅ 둘 다 `user.role` (단일 string) 읽기
- ✅ 둘 다 Legacy unprefixed roles만 체크
- ✅ 둘 다 Prefixed roles 체크 없음

**차이점**:
- AdminAuthGuard: DEV 모드에서 모든 사용자 허용
- BranchAdminAuthGuard: DEV 모드 우회 없음, TODO 주석 있음 (분회별 권한 검사 미구현)

---

## 종합 판정

### Phase 4 충돌 원인

**체크 항목**:
- [x] **AuthContext 구조** - `user.role` (단일 string)만 저장, `user.roles` 배열 없음
- [x] **AuthGuard 소비 방식** - `user.role`만 읽기, Legacy roles만 체크
- [x] **둘 다** - 양쪽 모두 Phase 4를 지원하지 않음

### 구조적 분석

**Phase 4 충돌 메커니즘 (최종 확정)**:

```
┌─────────────────────────────────────────────────────────┐
│ API 응답 (Phase 2-A 확인)                                │
├─────────────────────────────────────────────────────────┤
│ user.role  = "admin"                      (Legacy)       │
│ user.roles = ["admin", "kpa:admin"]       (Phase 4 추가) │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ AuthContext 저장 (Phase 2-B 확인)                        │
├─────────────────────────────────────────────────────────┤
│ user.role  = "admin"                      (저장됨)       │
│ user.roles = ???                          (필드 자체 없음)│
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ AuthGuard 체크 (Phase 2-C 확인)                          │
├─────────────────────────────────────────────────────────┤
│ const role = user.role;  // "admin"                      │
│                                                          │
│ if (role === 'admin') return true;          ✅ Legacy    │
│ if (role === 'kpa:admin') return true;      ❌ 없음      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 결과                                                     │
├─────────────────────────────────────────────────────────┤
│ user.role = "admin"           → ✅ 접근 허용 (Legacy)    │
│ user.role = "kpa:admin"       → ❌ 접근 차단 (미지원)    │
│ user.roles = ["admin", ...]   → ❌ 접근 불가능 (필드 없음)│
└─────────────────────────────────────────────────────────┘
```

---

### 충돌 원인 상세

#### 1. AuthContext 구조 문제

**원인**: User 인터페이스가 단일 `role` (string)만 정의
```tsx
interface User {
  role?: string;  // 단일 string
  // roles 필드 없음
}
```

**영향**:
- API의 `user.roles` 배열 정보 **완전히 폐기**
- Phase 4 prefixed roles가 프론트엔드에 **전달 불가능**

#### 2. AuthGuard 소비 방식 문제

**원인**: `user.role` (단일 string) 기준 판단
```tsx
const role = user.role;  // 단일 값만 읽기
if (role === 'admin') return true;  // Legacy roles만 체크
```

**영향**:
- Prefixed roles (`kpa:admin`, `kpa:branch_admin`) **인식 불가능**
- `user.roles` 배열에 접근 시도조차 없음

#### 3. 양방향 불일치 (복합 문제)

**Phase 4 설계**:
- Dual-format: Legacy + Prefixed roles 공존
- `user.roles` 배열에 모두 저장

**프론트엔드 구조**:
- Single-format: Legacy role만 유지
- `user.role` 단일 필드만 사용

**결과**:
- Phase 4 정보가 프론트엔드에 **존재하지 않음**
- AuthGuard가 아무리 수정되어도 **접근할 방법 없음**

---

## 관측 메모

### 1. DEV 모드 우회의 의미

**AdminAuthGuard** (109-112줄):
```tsx
if (import.meta.env.DEV) {
  console.warn('[DEV MODE] Branch admin access allowed for testing');
  return true;
}
```

**의미**:
- 개발 환경에서는 **모든 사용자** 관리자 권한 부여
- Phase 4 충돌이 개발 환경에서 **발견되지 않는 이유**
- 프로덕션 배포 후에만 문제 발생

**위험**:
- 개발 환경 테스트로는 Phase 4 충돌 **검증 불가능**
- 프로덕션 배포 후 즉시 장애 발생 가능성

### 2. TODO 주석의 의미

**BranchAdminAuthGuard** (126-127줄, 133-134줄):
```tsx
// TODO: 지부-분회 관계 확인 로직 추가
// TODO: 해당 분회에 대한 권한이 있는지 확인
```

**현재 상태**:
- 분회별 권한 검사 **미구현**
- 모든 `branch_admin` role이 **모든 분회 접근 가능**

**Phase 4와의 관계**:
- Phase 4는 `kpa:branch_admin` 등 서비스별 role 도입
- 하지만 분회별 권한 검사는 **별개 이슈**
- Phase 4 적용 시 이 TODO도 함께 해결 필요

### 3. `membership_*` prefix의 의미

**AdminAuthGuard, BranchAdminAuthGuard 공통**:
```tsx
if (role === 'admin') return true;
if (role === 'membership_branch_admin') return true;
```

**관찰**:
- Legacy roles에 **두 가지 형식** 공존
  - Unprefixed: `admin`, `branch_admin`
  - Membership prefixed: `membership_branch_admin`
- 이는 Phase 4 이전의 **레거시 namespace**

**Phase 4와의 관계**:
- Phase 4는 `kpa:`, `platform:` 등 **서비스별 prefix**
- `membership_*`는 **이전 시대의 prefix**
- 역사적으로 **두 번째 prefix 시도**

### 4. 코드의 일관성

**AdminAuthGuard와 BranchAdminAuthGuard**:
- ✅ 동일한 패턴 사용 (`const role = user.role`)
- ✅ 동일한 체크 방식 (Legacy roles 정확 일치)
- ✅ 동일한 문제 공유 (Prefixed roles 미지원)

**일관성의 의미**:
- 이것은 **버그가 아니라 설계**
- 두 파일 모두 **의도적으로 단일 role 기준**
- Phase 4 미지원은 **구조적 문제**

---

## Phase 2-C 최종 결론 (사실 진술만)

### 확인된 사실

1. **AdminAuthGuard와 BranchAdminAuthGuard 모두 `user.role` (단일 string)만 읽음**
   - 코드 증거: `const role = user.role;`
   - `user.roles` 배열 접근 시도 **전혀 없음**

2. **Prefixed role 문자열이 코드에 단 한 줄도 존재하지 않음**
   - `'kpa:'`, `'platform:'` 등 검색 결과 **0건**
   - Phase 4 prefixed roles 체크 로직 **없음**

3. **Legacy unprefixed roles만 체크**
   - `'admin'`, `'branch_admin'`, `'membership_*'` 등
   - Phase 4 이전의 role 형식만 지원

4. **DEV 모드 우회로 인한 테스트 맹점**
   - AdminAuthGuard: DEV 모드에서 모든 사용자 허용
   - Phase 4 충돌이 개발 환경에서 **발견 불가능**

5. **분회별 권한 검사 미구현**
   - TODO 주석만 존재
   - 모든 관리자가 모든 분회 접근 가능

### Phase 4 충돌 최종 확정

**충돌 원인**: **AuthContext 구조 + AuthGuard 소비 방식 (둘 다)**

**메커니즘**:
1. API는 `user.roles = ["admin", "kpa:admin"]` 반환 (Dual-format)
2. AuthContext는 `user.role = "admin"`만 저장 (`user.roles` 필드 없음)
3. AuthGuard는 `user.role` 읽고 Legacy roles만 체크
4. Prefixed roles (`kpa:admin`)는 **절대 인식 불가능**

**Phase 4 배포 후 예상 시나리오**:
- 사용자 role이 `kpa:admin`으로 변경됨
- `user.role = "kpa:admin"` 저장됨
- AdminAuthGuard: `if (role === 'admin')` → ❌ 불일치
- AdminAuthGuard: `if (role === 'kpa:admin')` → ❌ 조건 자체가 없음
- **결과**: 403 Forbidden

---

**Phase 2-C 조사 완료**

**Phase 2 전체 조사 완료**

**Status**: ✅ Phase 4 충돌 원인 **구조적으로 확정**

---

*조사 완료 시각: 2026-02-05*
*조사자: Claude Code*
