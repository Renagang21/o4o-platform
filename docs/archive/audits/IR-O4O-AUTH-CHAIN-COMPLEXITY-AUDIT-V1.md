# IR-O4O-AUTH-CHAIN-COMPLEXITY-AUDIT-V1 — 조사 결과 보고서

> **조사일:** 2026-03-10
> **조사 범위:** 5개 웹 서비스의 Auth Chain 전체 구조
> **대상 서비스:** web-neture, web-glycopharm, web-k-cosmetics, web-glucoseview, web-kpa-society

---

## 1. 전체 통계 요약

| 항목 | 수치 | 의미 |
|------|------|------|
| AuthContext 복사본 | **5개** | 동일 역할의 코드가 5곳에 각각 다르게 구현 |
| 총 Auth 코드 라인 | **~1,600줄** | 5개 파일 합계 |
| mapApiRole 함수 | **5개** | 각각 다른 매핑 테이블 |
| 에러 메시지 중복 | **5세트** | 동일 메시지가 5곳에 복제 |
| 응답 파싱 패턴 | **4가지** | 서비스마다 다른 fallback 체인 |
| RBAC roles[] 대응 | **2/5** | glycopharm, kpa-society만 배열 지원 |

---

## 2. 서비스별 AuthContext 구조

### 2.1 파일 위치 및 규모

| Service | 파일 | Lines | 주요 함수 |
|---------|------|------:|-----------|
| **web-neture** | `contexts/AuthContext.tsx` | 193 | login, logout, checkSession, switchRole |
| **web-glycopharm** | `contexts/AuthContext.tsx` | 407 | login, logout, checkSession, refreshToken, switchRole, selectRole, serviceUserLogin |
| **web-k-cosmetics** | `contexts/AuthContext.tsx` | 200 | login, logout, checkSession, switchRole |
| **web-glucoseview** | `contexts/AuthContext.tsx` | 215 | login, logout, checkSession, updateUser |
| **web-kpa-society** | `contexts/AuthContext.tsx` | 498 | login, logout, checkAuth, loginAsTestAccount, setActivityType, serviceUserLogin |

### 2.2 구조 차이 요약

| 기능 | neture | glycopharm | k-cosmetics | glucoseview | kpa-society |
|------|:------:|:----------:|:-----------:|:-----------:|:-----------:|
| Token 방식 | Cookie | **Bearer** | Cookie | Cookie | **AuthClient** |
| Session Check | useEffect 자동 | useEffect 자동 | **Lazy (수동)** | useEffect 자동 | useCallback 자동 |
| Token Refresh | ❌ | ✅ | ❌ | ❌ | ✅ (AuthClient) |
| Service User | ❌ | ✅ | ❌ | ❌ | ✅ |
| Role Switching | ✅ | ✅ | ✅ | ❌ | ❌ |
| Test Account | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approval Status | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 3. Login API 호출 방식 비교

### 3.1 Endpoint 및 Token 저장

| Service | Login Endpoint | Token Storage | 로그인 호출 방식 |
|---------|---------------|---------------|-----------------|
| **web-neture** | `POST /api/v1/auth/login` | httpOnly Cookie | `fetch(credentials:'include')` |
| **web-glycopharm** | `POST /api/v1/auth/login` | localStorage (`glycopharm_access_token`) | `fetch` + Bearer Header |
| **web-k-cosmetics** | `POST /api/v1/auth/login` | httpOnly Cookie | `fetch(credentials:'include')` |
| **web-glucoseview** | `POST /api/v1/auth/login` | httpOnly Cookie | `fetch(credentials:'include')` |
| **web-kpa-society** | `POST /api/v1/auth/login` | localStorage (`@o4o/auth-client`) | `authClient.login()` |

### 3.2 Token 방식 3가지

```
Type A: httpOnly Cookie (neture, k-cosmetics, glucoseview)
  → credentials: 'include'
  → 로컬 토큰 저장 없음
  → cross-domain에서 동작하지 않을 수 있음

Type B: Bearer Token (glycopharm)
  → localStorage에 직접 저장
  → Authorization: Bearer {token} 헤더
  → 수동 refresh 로직 필요

Type C: AuthClient (kpa-society)
  → @o4o/auth-client 패키지 사용
  → 토큰 관리 자동화
  → 가장 추상화된 방식
```

---

## 4. checkSession / 세션 복원 비교

### 4.1 응답 파싱 체인

| Service | checkSession 파싱 | 버그 여부 |
|---------|------------------|:---------:|
| **web-neture** | `data.data?.user ∥ data.user` | ✅ 정상 |
| **web-glycopharm** | `data.data?.user ∥ data.data ∥ data.user ∥ data` | ⚠️ 수정됨 (기존: `data.data` 폴백 시 wrapper 반환) |
| **web-k-cosmetics** | `data.data?.user ∥ data.user` | ✅ 정상 |
| **web-glucoseview** | `data.data?.user ∥ data.data ∥ data.user` | ⚠️ `data.data` 폴백 시 wrapper `{ user: {...} }` 반환 가능 |
| **web-kpa-society** | `data.data.user ∥ data.data` (AuthClient 내부) | ✅ 정상 |

### 4.2 Login 응답 파싱 체인

| Service | login 파싱 | 비고 |
|---------|----------|------|
| **web-neture** | `data.data?.user ∥ data.user` | 정상 |
| **web-glycopharm** | `data.data?.user ∥ data.user` | 정상 |
| **web-k-cosmetics** | `data.data?.user ∥ data.user` | 정상 |
| **web-glucoseview** | `data.data?.user ∥ data.user` | 정상 |
| **web-kpa-society** | `response.user` (AuthClient) | 정상 |

### 4.3 세션 복원 실패 시 동작

| Service | 401 처리 | catch 처리 |
|---------|---------|-----------|
| **web-neture** | 무시 (세션 없음 간주) | 무시 |
| **web-glycopharm** | `refreshAccessToken()` 시도 | `clearStoredTokens()` |
| **web-k-cosmetics** | 무시 | 무시 |
| **web-glucoseview** | 무시 | 무시 |
| **web-kpa-society** | 토큰 없으면 호출 자체 생략 | `setUser(null)` |

---

## 5. User 객체 타입 비교

### 5.1 필드 비교

| 필드 | neture | glycopharm | k-cosmetics | glucoseview | kpa-society |
|------|:------:|:----------:|:-----------:|:-----------:|:-----------:|
| id | ✅ | ✅ | ✅ | ✅ | ✅ |
| email | ✅ | ✅ | ✅ | ✅ | ✅ |
| name | ✅ | ✅ | ✅ | ✅ | ✅ |
| roles[] | ✅ | ✅ | ✅ | ✅ | ✅ |
| role (singular) | ❌ | ❌ | ❌ | ✅ deprecated | ✅ deprecated |
| status | ❌ | ✅ | ❌ | ❌ | ❌ |
| approvalStatus | ❌ | ❌ | ❌ | ✅ | ❌ |
| phone | ❌ | ❌ | ❌ | ✅ | ❌ |
| pharmacyName | ❌ | ❌ | ❌ | ✅ | ❌ |
| isStoreOwner | ❌ | ❌ | ❌ | ❌ | ✅ |
| activityType | ❌ | ❌ | ❌ | ❌ | ✅ |
| kpaMembership | ❌ | ❌ | ❌ | ❌ | ✅ |
| membershipType | ❌ | ❌ | ❌ | ❌ | ✅ |
| profileImage | ❌ | ✅ | ❌ | ❌ | ❌ |

### 5.2 UserRole 타입 정의

| Service | UserRole 타입 | 기본값 |
|---------|-------------|--------|
| **web-neture** | `'admin' ∥ 'supplier' ∥ 'partner' ∥ 'user'` | `'user'` |
| **web-glycopharm** | `'admin' ∥ 'pharmacy' ∥ 'supplier' ∥ 'partner' ∥ 'operator' ∥ 'consumer'` | `'consumer'` |
| **web-k-cosmetics** | `'admin' ∥ 'supplier' ∥ 'seller' ∥ 'partner' ∥ 'operator'` | `'seller'` |
| **web-glucoseview** | `'pharmacist' ∥ 'admin' ∥ 'partner'` | `'pharmacist'` |
| **web-kpa-society** | `string[]` (free-form, 매핑 없음) | `'pharmacist'` |

---

## 6. Role 매핑 비교 (핵심 문제)

### 6.1 mapApiRole 매핑 테이블

| API Role | neture | glycopharm | k-cosmetics | glucoseview | kpa-society |
|----------|:------:|:----------:|:-----------:|:-----------:|:-----------:|
| `admin` | admin | operator | admin | admin | 그대로 |
| `super_admin` | admin | operator | admin | admin | 그대로 |
| `operator` | ❌**user** | operator | operator | ❌**pharmacist** | 그대로 |
| `supplier` | supplier | supplier | supplier | ❌**pharmacist** | 그대로 |
| `partner` | partner | partner | partner | partner | 그대로 |
| `seller` | user | pharmacy | seller | pharmacist | 그대로 |
| `customer` | user | pharmacy | seller | pharmacist | 그대로 |
| `user` | user | pharmacy | seller | pharmacist | 그대로 |
| `pharmacy` | ❌**user** | pharmacy | ❌**seller** | ❌**pharmacist** | 그대로 |
| 미매핑 기본값 | user | consumer | seller | pharmacist | pharmacist |

### 6.2 `operator` Role 처리 현황

| Service | `operator` API role 매핑 | 매핑 결과 | 버그 |
|---------|------------------------|----------|:----:|
| **web-neture** | 매핑 없음 | → `'user'` (기본값 폴백) | ✅ **버그** |
| **web-glycopharm** | `'operator' → 'operator'` | 정상 | ✅ 수정됨 |
| **web-k-cosmetics** | `'operator' → 'operator'` | 정상 | ❌ |
| **web-glucoseview** | 매핑 없음 | → `'pharmacist'` (기본값 폴백) | ✅ **버그** |
| **web-kpa-society** | 매핑 없음 (그대로 사용) | `'operator'` | ❌ |

### 6.3 RBAC roles[] 지원 현황

| Service | `apiUser.roles[]` 사용 | `apiUser.role` 사용 | RBAC 대응 |
|---------|:---------------------:|:-------------------:|:---------:|
| **web-neture** | ❌ | ✅ singular만 | **미대응** |
| **web-glycopharm** | ✅ 배열 우선 | ✅ 폴백 | **대응 완료** |
| **web-k-cosmetics** | ❌ | ✅ singular만 | **미대응** |
| **web-glucoseview** | ❌ | ✅ singular만 | **미대응** |
| **web-kpa-society** | ✅ `apiUser.roles ∥ [role]` | ✅ 폴백 | **대응 완료** |

---

## 7. Dashboard 노출 로직 비교

### 7.1 프로필 메뉴 대시보드 링크

| Service | 노출 방식 | 판정 기준 | 구현 위치 |
|---------|----------|----------|----------|
| **web-neture** | `ROLE_DASHBOARDS[roles[0]]` | roles[0] 기준 | `AccountMenu.tsx:93-94` |
| **web-glycopharm** | `roleDashboardLinks` 조건부 | `isOperator`, `isPharmacy` 분리 판정 | `Header.tsx:47-50` |
| **web-k-cosmetics** | `ROLE_DASHBOARDS[roles[0]]` | roles[0] 기준 | `Header.tsx:52` |
| **web-glucoseview** | N/A | 대시보드 링크 없음 (단일 역할) | — |
| **web-kpa-society** | `hasAnyRole(roles, PLATFORM_ROLES)` | roles 배열 순회 | `Header.tsx:101` |

### 7.2 ROLE_DASHBOARDS 경로 비교

| Role | neture | glycopharm | k-cosmetics |
|------|--------|------------|-------------|
| admin | `/workspace/admin` | `/admin` | `/admin` |
| operator | ❌ 없음 | `/operator` | `/operator` |
| supplier | `/account/supplier` | `/supplier` | `/supplier` |
| partner | `/account/partner` | `/partner` | `/partner` |
| user/consumer | `/` | `/` | — |
| pharmacy | — | `/care` | — |
| seller | — | — | `/seller` |

### 7.3 로그인 후 기본 이동 경로

| Service | 기본 리다이렉트 방식 |
|---------|------------------|
| **web-neture** | `navigate(ROLE_DASHBOARDS[role])` |
| **web-glycopharm** | `navigate(getDefaultRouteByRole(role))` (auth-utils.ts) |
| **web-k-cosmetics** | `navigate(ROLE_DASHBOARDS[role])` |
| **web-glucoseview** | 고정 `/` |
| **web-kpa-society** | 고정 `/` (KPA는 단일 대시보드) |

---

## 8. 에러 메시지 비교

### 8.1 로그인 에러 메시지 중복

다음 5개 에러 메시지가 **5개 서비스에 거의 동일하게 복제**되어 있다:

| Error Code | 메시지 | 중복 수 |
|------------|--------|:------:|
| `INVALID_USER` | 등록되지 않은 이메일입니다 | **5/5** |
| `INVALID_CREDENTIALS` | 비밀번호가 올바르지 않습니다 | **5/5** |
| `ACCOUNT_NOT_ACTIVE` | 가입 승인 대기 중입니다... | **5/5** |
| `ACCOUNT_LOCKED` | 로그인 시도가 너무 많아... | **5/5** |
| `429 Rate Limit` | 로그인 시도가 너무 많습니다... | **5/5** |
| 기본 에러 | 로그인에 실패했습니다 | **4/5** (glucoseview 미세 차이) |

### 8.2 메시지 불일치

| Service | 기본 에러 메시지 |
|---------|---------------|
| neture, glycopharm, k-cosmetics, kpa | `로그인에 실패했습니다.` |
| glucoseview | `이메일 또는 비밀번호가 올바르지 않습니다.` |

---

## 9. 코드 복잡성 분석

### 9.1 중복 코드 통계

| 로직 | 복사본 수 | 총 라인 (추정) | 공통화 가능 |
|------|:--------:|:------------:|:---------:|
| `mapApiRole()` 함수 | 5 | ~60줄 | ✅ |
| checkSession 로직 | 5 | ~120줄 | ✅ |
| login 로직 | 5 | ~200줄 | ✅ (부분) |
| logout 로직 | 5 | ~50줄 | ✅ |
| 에러 메시지 매핑 | 5 | ~40줄 | ✅ |
| switchRole 로직 | 3 | ~15줄 | ✅ |
| ServiceUser 로직 | 2 | ~100줄 | ✅ |
| **합계** | — | **~585줄** | — |

### 9.2 불일치 목록

| # | 불일치 항목 | 영향 |
|---|-----------|------|
| 1 | **응답 파싱 fallback 체인** — 4가지 패턴 공존 | 세션 복원 실패 (glycopharm 이미 발생) |
| 2 | **operator 매핑 누락** — neture, glucoseview에서 `'user'`로 폴백 | 운영자 대시보드 접근 불가 |
| 3 | **RBAC roles[] 미대응** — 3개 서비스에서 singular role만 사용 | 다중 역할 사용자 권한 판정 오류 |
| 4 | **Token 방식 3가지 혼재** — Cookie / Bearer / AuthClient | 인증 문제 디버깅 난이도 증가 |
| 5 | **UserRole 타입 서비스별 다름** — 5개 서비스 × 5가지 enum | 통합 관리 불가 |
| 6 | **ROLE_DASHBOARDS 경로 불일치** — admin 경로가 `/admin` vs `/workspace/admin` | 서비스 간 일관성 없음 |
| 7 | **에러 메시지 미세 차이** — glucoseview만 다른 기본 메시지 | 사용자 경험 불일치 |

---

## 10. 공통화 가능 영역

### 10.1 즉시 공통화 가능 (의존성 없음)

| 함수/상수 | 역할 | 공통화 방식 | 예외 처리 |
|----------|------|-----------|----------|
| `parseAuthResponse(data)` | API 응답에서 user 객체 추출 | 단일 함수로 통합 | 없음 — 모든 서비스 동일 API |
| `mapApiRoles(apiUser)` | API role → 정규화된 roles[] | RBAC 기반 통합 매핑 | 서비스별 도메인 role 추가 매핑은 옵션 |
| `AUTH_ERROR_MESSAGES` | 에러 코드 → 표시 메시지 | 상수 객체로 통합 | 없음 |
| `normalizeUser(apiUser)` | API 응답 → 정규화된 User 객체 | 공통 기본 필드 + 서비스별 확장 | kpa-society: kpaMembership 등 |

### 10.2 부분 공통화 가능 (서비스별 차이 있음)

| 함수 | 공통화 가능 부분 | 서비스별 차이 |
|------|---------------|-------------|
| `checkSession()` | 파싱 + role 매핑 | Token 방식 (Cookie vs Bearer vs AuthClient) |
| `login()` | 에러 처리 + user 파싱 | Token 저장 방식, 반환 타입 |
| `logout()` | API 호출 | Token 정리 방식 |

### 10.3 공통화 불가 (서비스 고유)

| 기능 | 해당 서비스 | 사유 |
|------|-----------|------|
| `approvalStatus` 매핑 | glucoseview | 의료 서비스 고유 승인 흐름 |
| `kpaMembership` 파싱 | kpa-society | KPA 고유 조직 구조 |
| `loginAsTestAccount` | kpa-society | 테스트 전용 |
| `setActivityType` | kpa-society | KPA 고유 약사 자격 |
| `serviceUserLogin` | glycopharm, kpa-society | Phase 2 고유 기능 |

---

## 11. 위험도 평가

### 11.1 버그 재발 가능성: **높음**

```
현재 상태: operator 매핑 누락이 이미 2개 서비스에서 발견
위험: RBAC 역할 추가 시 5개 서비스 모두 수정 필요
영향: 운영자/관리자 대시보드 접근 불가, 권한 오판정
```

### 11.2 권한 오판정 위험: **중간~높음**

```
현재 상태:
- neture: operator → user로 매핑 (권한 하락)
- glucoseview: operator → pharmacist로 매핑 (권한 변질)
- 3개 서비스: roles[] 미대응 (다중 역할 사용자 1개 역할만 인식)

잠재 위험:
- 운영자가 일반 사용자로 인식됨
- 다중 역할 사용자의 보조 역할 무시
- 서비스별 동일 사용자의 권한이 다르게 판정
```

### 11.3 유지보수 비용: **높음**

```
현재 상태:
- Auth 버그 1건 수정 시 5개 파일 점검 필요
- 에러 메시지 변경 시 5개 파일 수정 필요
- RBAC 정책 변경 시 5개 매핑 테이블 갱신 필요

비용 추정:
- Auth 관련 수정 1건 = 실제 수정 5건 + 빌드 5회 + 배포 5회
- 수정 누락 확률: 높음 (glycopharm만 수정하고 나머지 방치한 이번 케이스가 대표적)
```

---

## 12. 구조 문제 요약

### 문제 1: 5중 복제 (가장 심각)

```
동일 Auth 로직이 5개 서비스에 복제
→ 한 곳 수정 시 나머지 4곳도 수정해야 함
→ 수정 누락 시 서비스별 동작 불일치 발생
→ 이번 glycopharm operator 버그가 정확히 이 패턴
```

### 문제 2: 응답 파싱 불안정

```
/auth/me 응답 구조: { success, data: { user: {...} } }
/auth/login 응답 구조: { success, data: { message, user: {...}, tokens: {...} } }

→ 서비스마다 다른 fallback 체인으로 추측 파싱
→ glucoseview의 data.data 폴백은 잠재적 버그
→ 백엔드 응답 구조 1곳에서 정의하면 해결
```

### 문제 3: RBAC 부분 대응

```
Phase3-E RBAC 마이그레이션 이후:
- users.role 컬럼 삭제됨
- JWT payload에 roles[] 배열 포함
- /auth/me, /auth/login 모두 roles[] 반환

그러나:
- 3개 서비스(neture, k-cosmetics, glucoseview)는 여전히 apiUser.role (singular)만 사용
- 다중 역할 사용자의 보조 역할이 무시됨
```

### 문제 4: Token 방식 분산

```
Type A (Cookie): neture, k-cosmetics, glucoseview
  → cross-domain 환경에서 불안정할 수 있음
  → refresh 메커니즘 없음

Type B (Bearer): glycopharm
  → 수동 토큰 관리
  → refresh 로직 직접 구현

Type C (AuthClient): kpa-society
  → @o4o/auth-client 패키지 사용
  → 토큰 관리 자동화
  → 가장 안정적
```

---

## 13. 공통화 설계 방향 (다음 WO 참조)

### 추천 구조

```
packages/auth-utils/
  src/
    parseAuthResponse.ts    — API 응답 파싱 통일
    mapApiRoles.ts          — RBAC roles[] 매핑 통일
    normalizeUser.ts        — User 객체 정규화
    errorMessages.ts        — 에러 코드→메시지 매핑
    types.ts                — 공통 Auth 타입
    index.ts
```

### 서비스별 AuthContext 변경 범위

| Service | 예상 변경 | 비고 |
|---------|---------|------|
| **web-neture** | 중간 — 파싱/매핑 교체, operator 수정 | Token 방식 유지 |
| **web-glycopharm** | 최소 — 이미 수정됨, 공통 함수 교체만 | Bearer 방식 유지 |
| **web-k-cosmetics** | 중간 — 파싱/매핑 교체 | Token 방식 유지 |
| **web-glucoseview** | 중간 — 파싱/매핑 교체, operator 수정, 파싱 버그 수정 | Token 방식 유지 |
| **web-kpa-society** | 최소 — 이미 RBAC 대응됨, 에러 메시지만 교체 | AuthClient 유지 |

---

## 14. 이 문서에서 수행하지 않은 것

```
❌ 코드 수정
❌ 파일 생성
❌ 리팩토링
❌ 공통화 구현
❌ API 변경
```

모든 변경은 다음 WO로 진행한다:
**WO-O4O-AUTH-CHAIN-UNIFICATION-V1**

---

*Generated: 2026-03-10*
*Status: Investigation Complete*
*Next: WO-O4O-AUTH-CHAIN-UNIFICATION-V1*
