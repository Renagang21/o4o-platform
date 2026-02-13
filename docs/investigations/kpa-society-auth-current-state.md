# KPA-Society 회원 가입 · 로그인 구조 현황 조사 결과

> **Phase 0 – 기초 사실 확인 (구현 변경·설계 판단 없음)**
>
> 조사일: 2026-02-06
> 조사 범위: kpa-society.co.kr 3개 서비스의 회원 가입/로그인 현황

---

## 1. 서비스별 회원 흐름 요약 표

### A. 커뮤니티 서비스 (기준 URL: `/`)

| 항목 | 현재 상태 |
|------|----------|
| **회원 가입 경로** | 모달 (`RegisterModal.tsx`) — URL 변경 없음 |
| **회원 가입 페이지** | 레거시 `RegisterPage.tsx` 존재하나 **라우트 미등록** (WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1) |
| **로그인 경로** | 모달 (`LoginModal.tsx`) — URL 변경 없음 |
| **로그인 페이지** | `/login` 접근 시 → `/` 리다이렉트 + 로그인 모달 자동 오픈 (`App.tsx:120-129`) |
| **사용 API** | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` |
| **토큰 저장** | **localStorage** (`o4o_accessToken`, `o4o_refreshToken`) |
| **AuthContext** | `AuthProvider` — 앱 최상위 단일 인스턴스 (`App.tsx:146`) |
| **토큰 전략** | `strategy: 'localStorage'` (`AuthContext.tsx:64-69`) |
| **약사/약대생 구분** | **없음** — role은 고정 `'pharmacist'` (`RegisterModal.tsx:96`) |
| **약국 개설자 처리** | **없음** — 약국명/주소는 선택사항 필드로만 존재 |
| **승인 상태** | 가입 후 `PENDING` → 운영자 승인 후 `ACTIVE` |
| **승인 대기 화면** | `RegisterPendingPage.tsx` — "약사면허 확인 후 1-2영업일" 안내 |

#### 커뮤니티 가입 필드

| 필드 | 필수 | 위치 |
|------|------|------|
| 이메일 | O | `RegisterModal.tsx:234-243` |
| 비밀번호 | O | `:252-269` |
| 비밀번호 확인 | O | `:275-285` |
| 성명 | O | `:293-302` |
| 연락처 | O | `:308-318` |
| 약사면허번호 | O | `:332-341` |
| 소속 분회 | X | `:349-360` (드롭다운 5개 분회) |
| 약국명 | X | `:366-373` |
| 이용약관 동의 | O | `:394-402` |
| 개인정보처리방침 동의 | O | `:417-425` |

#### 커뮤니티 로그인 후 분기

| 조건 | 리다이렉션 |
|------|----------|
| 관리자 (district_admin, branch_admin, super_admin) | `/` (직능 선택 불필요) |
| 일반 회원 + 직능/직역 선택 완료 | `/` 또는 returnTo |
| 일반 회원 + 직능/직역 미선택 | `/demo/select-function` (게이트 페이지) |

---

### B. 지부/분회 서비스 데모 (기준 URL: `/demo`)

| 항목 | 현재 상태 |
|------|----------|
| **라우트** | `/demo/*` → `DemoLayoutRoutes()` (`App.tsx:305-306`) |
| **자체 회원 가입** | **없음** — `/demo/register` → `/` 리다이렉트 + 회원가입 모달 |
| **자체 로그인** | **없음** — `/demo/login` → `/` 리다이렉트 + 로그인 모달 |
| **인증 Context 공유** | **완전히 공유** — 글로벌 `AuthProvider` 사용 |
| **별도 토큰** | **없음** — 커뮤니티와 동일한 localStorage 토큰 |
| **별도 승인 흐름** | **없음** |
| **DemoHeader 인증** | `useAuth()` 훅으로 글로벌 인증 상태 접근 (`DemoHeader.tsx:103`) |
| **커뮤니티 계정 접근** | **가능** — 동일한 AuthContext |

---

### C. 분회 서비스 (기준 URL: `/branch-services/{branchId}`)

| 항목 | 현재 상태 |
|------|----------|
| **라우트** | `/branch-services/:branchId/*` → `BranchRoutes` (`App.tsx:200`) |
| **분회 허브** | `/branch-services` → `BranchServicesPage` (`App.tsx:199`) |
| **자체 회원 가입** | **없음** |
| **자체 로그인** | **없음** — BranchHeader에 "본부 로그인" 버튼 (글로벌 모달 연동, `BranchHeader.tsx:199-202`) |
| **인증 Context 공유** | **완전히 공유** — 글로벌 `AuthProvider` 사용 |
| **별도 토큰** | **없음** |
| **분회 단위 회원 분리** | **없음** — TODO 주석만 존재 (`BranchAdminAuthGuard.tsx:147-157`) |
| **분회 전용 승인 흐름** | **없음** |
| **BranchHeader 인증** | `useAuth()` 훅으로 글로벌 인증 상태 접근 (`BranchHeader.tsx:88`) |
| **BranchAdminAuthGuard** | 관리자 권한 체크 (글로벌 role 기반, 분회별 세분화 없음) |
| **OrganizationContext** | 조직 메타데이터 관리 전용 — 인증과 분리 |

#### BranchAdminAuthGuard 허용 역할

| Legacy roles | Phase 4 prefixed roles |
|-------------|----------------------|
| `admin`, `super_admin` | `platform:admin`, `platform:super_admin` |
| `district_admin`, `membership_district_admin` | `kpa:admin`, `kpa:district_admin` |
| `branch_admin`, `membership_branch_admin` | `kpa:branch_admin`, `kpa:branch_operator` |
| `membership_super_admin` | |

---

## 2. 공통점 / 차이점 비교 표

### 2.1 공통 조사 체크리스트

| 항목 | 커뮤니티 서비스 | 지부/분회 데모 | 분회 서비스 |
|------|---------------|--------------|-----------|
| **회원 가입 경로** | 모달 (RegisterModal) | 없음 (커뮤니티 리다이렉트) | 없음 |
| **로그인 경로** | 모달 (LoginModal) | 없음 (커뮤니티 리다이렉트) | "본부 로그인" 버튼 |
| **사용 API** | `/api/v1/auth/register`, `/login` | 동일 (공유) | 동일 (공유) |
| **토큰 저장 위치** | localStorage | localStorage (공유) | localStorage (공유) |
| **AuthContext 공유** | 원본 소유 | **공유** | **공유** |
| **서비스 이동 시 로그인 유지** | — | **유지됨** | **유지됨** |
| **승인 상태 처리** | PENDING → ACTIVE | 없음 (커뮤니티 의존) | 없음 (커뮤니티 의존) |
| **사용자 식별 키** | email + id | 동일 | 동일 |

### 2.2 공통점

1. **단일 AuthProvider**: 3개 서비스 모두 앱 최상위의 동일한 `AuthProvider` 사용
2. **동일 토큰**: localStorage의 `o4o_accessToken`, `o4o_refreshToken` 공유
3. **동일 API**: 모든 서비스가 `api.neture.co.kr`의 동일 엔드포인트 사용
4. **모달 기반 인증**: 페이지 이동 없이 모달로 로그인/가입 처리
5. **자동 토큰 갱신**: 401 응답 시 AuthClient가 자동으로 `/auth/refresh` 호출

### 2.3 차이점

1. **가입 진입점**: 커뮤니티만 RegisterModal 보유, 나머지 2개는 커뮤니티로 리다이렉트
2. **권한 체크**: 분회 서비스만 `BranchAdminAuthGuard` 추가 (관리자 영역 보호)
3. **컨텍스트 추가 레이어**: 분회 서비스는 `BranchProvider` (분회 메타데이터), 전체는 `OrganizationProvider`
4. **헤더 구현**: 각 서비스별 별도 헤더 (Header, DemoHeader, BranchHeader) — 인증 로직은 동일

---

## 3. API 서버 인증 구조

### 3.1 회원 가입 흐름 (서버)

```
POST /api/v1/auth/register
  → User 생성 (status: PENDING, serviceKey: 'kpa-society')
  → 자동 로그인 없음
  → 응답: { pendingApproval: true }

POST /api/v1/kpa/members/apply (별도 호출)
  → KpaMember 생성 (status: pending)
  → 약사면허, 약국 정보 저장
```

### 3.2 로그인 흐름 (서버)

```
POST /api/v1/auth/login
  → JWT 발급 (accessToken + refreshToken)
  → 전달 방식: localStorage 전략 시 JSON body, 아니면 httpOnly cookies
  → 응답: { user, tokens? }

GET /api/v1/auth/me
  → 현재 사용자 정보 반환
  → scopes, pharmacistFunction, pharmacistRole 포함
```

### 3.3 User 엔티티 KPA 관련 필드

| 필드 | 타입 | 용도 |
|------|------|------|
| `role` | enum (단일값) | Deprecated — 하위 호환 |
| `roles` | text[] (배열) | Phase 4 역할 배열 |
| `status` | enum | PENDING / ACTIVE / SUSPENDED 등 |
| `serviceKey` | varchar | 서비스 격리 키 (`'kpa-society'`) |
| `pharmacistFunction` | varchar | 직능 (pharmacy/hospital/industry/other) |
| `pharmacistRole` | varchar | 직역 (general/pharmacy_owner/hospital/other) |

### 3.4 KpaMember 엔티티 (별도 테이블)

| 필드 | 타입 | 용도 |
|------|------|------|
| `user_id` | UUID FK | auth-core User 연결 |
| `organization_id` | UUID FK | KPA 조직 연결 |
| `role` | enum | member / operator / admin |
| `status` | enum | pending / active / suspended / withdrawn |
| `license_number` | varchar | 약사면허번호 |
| `pharmacy_name` | varchar | 소속 약국명 |
| `pharmacy_address` | varchar | 약국 주소 |

### 3.5 인증 미들웨어 종류

| 미들웨어 | 용도 |
|---------|------|
| `requireAuth` | 필수 인증 (토큰 없으면 401) |
| `optionalAuth` | 선택 인증 (토큰 없어도 진행) |
| `requireAdmin` | `platform:admin` 또는 `platform:super_admin` 필수 |
| `requireRole(roles)` | 특정 역할 필수 |
| `requireKpaScope(scope)` | **KPA 전용** — `kpa:*` prefixed roles만 허용 |
| `requirePlatformUser` | Platform User만 (Service User 거부) |
| `requireServiceUser` | Service User만 (Platform User 거부) |

### 3.6 이중 토큰 체계

| 토큰 종류 | 저장 위치 | 용도 |
|----------|----------|------|
| Platform User 토큰 | localStorage (`o4o_accessToken`) | 일반 사용자 인증 |
| Service User 토큰 | localStorage (`kpa_pharmacy_service_*`) | 약국 경영 서비스 전용 |

---

## 4. "현재 가능한 것 / 불가능한 것" 목록

### 현재 가능한 것

| # | 항목 |
|---|------|
| 1 | 커뮤니티에서 가입 후 데모/분회 서비스에 **즉시 접근** (동일 토큰) |
| 2 | 서비스 간 이동 시 **로그인 상태 자동 유지** (단일 AuthProvider) |
| 3 | 커뮤니티/데모/분회 모두 **동일 사용자 정보** 표시 |
| 4 | 관리자 역할 기반 **분회 관리 영역 접근 제어** (BranchAdminAuthGuard) |
| 5 | 토큰 만료 시 **자동 갱신** (AuthClient interceptor) |
| 6 | `serviceKey` 필드로 **서비스별 사용자 필터링** (DB 레벨) |

### 현재 불가능한 것

| # | 항목 | 근거 |
|---|------|------|
| 1 | **분회별 회원 분리** — 특정 분회에만 속한 회원 구분 불가 | `BranchAdminAuthGuard`에 TODO 주석만 존재 |
| 2 | **서비스별 독립 가입** — 데모/분회 서비스에서 직접 가입 불가 | 모든 가입은 커뮤니티 RegisterModal을 통해서만 |
| 3 | **서비스별 독립 승인** — 서비스마다 다른 승인 절차 불가 | 단일 User.status만 존재 (PENDING/ACTIVE) |
| 4 | **분회별 권한 세분화** — "A분회 관리자이지만 B분회는 접근 불가" 처리 불가 | 글로벌 role만 체크, branchId 매칭 없음 |
| 5 | **약대생 구분 가입** — 약대생 전용 가입 흐름 없음 | role이 `'pharmacist'`로 고정 |
| 6 | **KpaMember와 User 상태 연동** — User.status와 KpaMember.status가 독립적 | 별도 엔티티로 상태 동기화 메커니즘 없음 |
| 7 | **다중 조직 소속** — 하나의 사용자가 여러 분회에 동시 가입 불가 | KpaMember는 단일 organization_id FK |

---

## 5. 아키텍처 다이어그램 (현재 상태)

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx                            │
│  ┌─────────────────────────────────────────────────┐ │
│  │              AuthProvider (단일)                  │ │
│  │  ┌───────────────────────────────────────────┐  │ │
│  │  │         LoginModalProvider                 │  │ │
│  │  │  ┌─────────────────────────────────────┐  │  │ │
│  │  │  │      OrganizationProvider            │  │  │ │
│  │  │  │                                      │  │  │ │
│  │  │  │  ┌──────────┐ ┌──────────┐          │  │  │ │
│  │  │  │  │  /       │ │  /demo/* │          │  │  │ │
│  │  │  │  │커뮤니티  │ │  데모    │          │  │  │ │
│  │  │  │  │ Header   │ │DemoHeader│          │  │  │ │
│  │  │  │  └──────────┘ └──────────┘          │  │  │ │
│  │  │  │                                      │  │  │ │
│  │  │  │  ┌────────────────────────────────┐ │  │  │ │
│  │  │  │  │ /branch-services/:branchId/*   │ │  │  │ │
│  │  │  │  │  분회 서비스                     │ │  │  │ │
│  │  │  │  │  BranchHeader                   │ │  │  │ │
│  │  │  │  │  ┌──────────────────────────┐  │ │  │  │ │
│  │  │  │  │  │  BranchProvider (분회별)  │  │ │  │  │ │
│  │  │  │  │  └──────────────────────────┘  │ │  │  │ │
│  │  │  │  └────────────────────────────────┘ │  │  │ │
│  │  │  └─────────────────────────────────────┘  │  │ │
│  │  └───────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

토큰 저장: localStorage
  ├── o4o_accessToken      (Platform User)
  ├── o4o_refreshToken     (Platform User)
  └── kpa_pharmacy_service_* (Service User, 약국 전용)

API: api.neture.co.kr
  ├── /api/v1/auth/*        (인증 공통)
  ├── /api/v1/kpa/*         (KPA 전용)
  └── /api/v1/kpa/members/* (KPA 회원)
```

---

## 6. 조사 완료 체크

- [x] 커뮤니티 서비스: 회원 가입 존재 여부 **명확** (RegisterModal 모달 기반)
- [x] 커뮤니티 서비스: 로그인 상태 공유 여부 **명확** (3개 서비스 모두 공유)
- [x] 지부/분회 데모: 회원 가입 존재 여부 **명확** (없음, 커뮤니티 리다이렉트)
- [x] 지부/분회 데모: 로그인 상태 공유 여부 **명확** (완전 공유)
- [x] 분회 서비스: 회원 가입 존재 여부 **명확** (없음)
- [x] 분회 서비스: 로그인 상태 공유 여부 **명확** (완전 공유)
- [x] "공통 계정 적용 시 걸림돌" 사실로 정리 **완료** (섹션 4)
- [x] 해결책·개선안 **포함되지 않음**

---

*조사 완료: 2026-02-06*
*문서 버전: 1.0*
*상태: Phase 0 Complete*
