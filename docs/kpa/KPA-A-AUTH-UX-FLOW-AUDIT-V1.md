# KPA-a Auth UX Flow Audit V1

> WO-KPA-A-AUTH-UX-FLOW-AUDIT-V1 | As-Is 조사 결과 | 2026-02-27

---

## 1. As-Is 사용자 여정 다이어그램

### 1-1. 전체 상태 머신

```
Guest
  │
  ├─ POST /auth/register (service=kpa-society)
  │   → users.status = 'pending'
  │   → kpa_members.status = 'pending'
  │   → 화면: RegisterPendingPage (/demo/register/pending)
  │         "운영자 검토 후 승인이 완료되면 서비스 이용이 가능합니다"
  │
  ▼
PENDING (로그인 불가)
  │
  │  ❌ POST /auth/login → 403 ACCOUNT_NOT_ACTIVE
  │     "가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다."
  │
  │  운영자 승인: PATCH /kpa/members/:id/status → 'active'
  │  → users.status = 'active', kpa_members.status = 'active'
  │  → roleAssignmentService.assignRole(kpa:pharmacist/kpa:student)
  │
  ▼
APPROVED + No ActivityType
  │
  │  POST /auth/login → 성공, JWT 발급
  │
  │  ┌─────────────── 직능 미설정 판정 ───────────────┐
  │  │                                                  │
  │  │  1. FunctionGateModal (모달) — 전역 오버레이     │
  │  │  2. ActivityTypePrompt (배너) — 대시보드 인라인  │
  │  │  3. FunctionGatePage (페이지) — /demo/select-function (레거시)  │
  │  │                                                  │
  │  └──────────────────────────────────────────────────┘
  │
  │  사용자 직능 선택 → PATCH /auth/me/profile { activityType }
  │  → kpa_pharmacist_profiles.activity_type 갱신 (SSOT)
  │  → kpa_members.activity_type 갱신 (mirror)
  │
  ▼
APPROVED + ActivityType Set
  │
  │  정상 이용
  │  /auth/me → pharmacistRole, pharmacistFunction, isStoreOwner
  │
  ├── 일반 약사 → /dashboard (커뮤니티 + 직능 배지)
  ├── 약국 개설자 → /dashboard + 약국경영 탭 + /store 접근 가능
  ├── 약대생 → /dashboard (FunctionGate 면제)
  ├── 운영자 → /operator (자동 리다이렉트)
  └── 지부 관리자 → /branch-services (자동 리다이렉트)
```

### 1-2. Pending 상태 UX 상세

| 항목 | 현재 동작 |
|------|----------|
| **로그인 가능 여부** | **불가** — `authentication.service.ts:177` 에서 `ACCOUNT_NOT_ACTIVE` 403 반환 |
| **허용 status** | `ACTIVE` 또는 `APPROVED`만 허용 |
| **JWT 발급** | 미발급 — pending 유저에게는 토큰 자체가 생성되지 않음 |
| **접근 가능 라우트** | 공개 라우트만 (포럼 목록, 공지사항 등) |
| **사용자 안내** | LoginModal 내 amber 에러: "가입 승인 대기 중입니다" |
| **가입 직후 화면** | `RegisterPendingPage`: 승인 절차 안내 + 1~2 영업일 처리 안내 |
| **승인 알림** | 이메일 알림 (운영자 승인 시) |

**핵심**: Pending 상태에서는 **아무 보호 라우트에도 접근 불가**. 로그인 자체가 차단되므로 프론트 가드가 동작할 일이 없음.

### 1-3. 이중 상태 시스템

```
users.status      kpa_members.status    결과
─────────────     ──────────────────    ────────────────
pending           pending               로그인 불가
active            pending               로그인 가능, KPA 기능 제한 (requireOrgRole 차단)
active            active                정상 이용
suspended         *                     로그인 불가
```

**현재 승인 로직**: `PATCH /kpa/members/:id/status` → `'active'` 시 `users.status`와 `kpa_members.status`를 **동시에** active로 전환. 중간 상태(users=active, members=pending)는 정상 흐름에서 발생하지 않음.

---

## 2. 중복 진입점 목록 + 충돌 가능성 분석

### 2-1. 직능 미설정 처리 — 3중 진입점

| # | 컴포넌트 | 타입 | 경로/위치 | 등장 조건 | 해제 조건 | API 소스 |
|---|---------|------|----------|----------|----------|---------|
| G1 | **FunctionGateModal** | 모달 오버레이 | 전역 (AuthModalContext) | `user.activityType == null` AND NOT exempt | activityType 설정 또는 exempt 자동 닫힘 | `/auth/me` (AuthContext) |
| G2 | **ActivityTypePrompt** | 인라인 배너 | Dashboard 내부 | `kpa_members.activity_type == null` AND NOT student | 선택 완료 또는 "나중에 하기" | `/kpa/members/me` (직접 fetch) |
| G3 | **FunctionGatePage** | 독립 페이지 | `/demo/select-function` (레거시) | `user.activityType == null` (URL 직접 접근) | 선택 완료 → /dashboard 리다이렉트 | `/auth/me` (AuthContext) |

### 2-2. 충돌 시나리오

**시나리오: 승인 직후 첫 로그인**

```
1. 사용자 로그인 성공
2. RoleBasedHome: 일반 사용자 → CommunityHomePage 표시
3. 사용자가 /dashboard 이동
4. DashboardRoute 렌더 → UserDashboardPage
5. FunctionGateModal: user.activityType=null → 모달 등장 ①
6. UserDashboardPage 내부: ActivityTypePrompt fetch → activity_type=null → 배너 등장 ②
7. 사용자: 모달 뒤에 배너가 숨어있음 (동시 렌더)
8. 모달에서 선택 → setActivityType() → checkAuth()
9. user.activityType 갱신 → 모달 자동 닫힘
10. 배너: member.activity_type이 아직 로컬 state → 여전히 표시? (race condition)
```

**판정**: G1(모달)과 G2(배너)가 **동시에 등장**할 수 있음. 모달 선택 후 배너 state 갱신은 별도 경로이므로 **잔존 가능성 있음**.

### 2-3. 면제 규칙 비교

| 대상 | G1 (Modal) | G2 (Prompt) | G3 (Page) |
|------|-----------|------------|----------|
| `kpa:admin` | 면제 ✅ | 미고려 (student만 면제) | 미고려 |
| `kpa:operator` | 면제 ✅ | 미고려 | 미고려 |
| `kpa:student` | 면제 ✅ | 면제 ✅ | 미고려 |
| `membershipRole='admin'` | 면제 ✅ | 미고려 | 미고려 |
| `membershipRole='operator'` | 면제 ✅ | 미고려 | 미고려 |
| 일반 약사 | 표시 | 표시 | 표시 |

**불일치**: G2(ActivityTypePrompt)는 `membership_type === 'student'`만 면제. admin/operator에게도 배너가 뜰 수 있음 (단, admin/operator는 /dashboard에 오지 않으므로 실무적 영향 낮음).

### 2-4. 판정 조건 소스 불일치

| 컴포넌트 | 판정 소스 | 테이블 | 불일치 가능성 |
|---------|----------|--------|-------------|
| G1 (Modal) | `user.activityType` from AuthContext | `kpa_pharmacist_profiles` via `/auth/me` | SSOT 기준 |
| G2 (Prompt) | `member.activity_type` from 직접 fetch | `kpa_members` via `/kpa/members/me` | Mirror 기준 |
| G3 (Page) | `user.activityType` from AuthContext | `kpa_pharmacist_profiles` via `/auth/me` | SSOT 기준 |

**SSOT 정렬 전에는** profiles와 members 값이 다를 수 있어 G1은 "미설정"으로 보이지만 G2는 "설정됨"으로 판단하는 상황이 가능했음. **SSOT 정렬 후**에는 양방향 동기화로 불일치 해소.

---

## 3. 현재 상태 판정 조건식 정리표

### 3-1. "직능 미설정" 판정

| 위치 | 조건식 | 의미 |
|------|--------|------|
| `FunctionGateModal.tsx:55` | `!user?.activityType` | profiles 기반 null 체크 |
| `ActivityTypePrompt.tsx:44` | `!member.activity_type` | members 기반 null 체크 |
| `FunctionGatePage.tsx:useEffect` | `user?.activityType` 존재 시 /dashboard 리다이렉트 | profiles 기반 |
| `UserDashboardPage.tsx:59` | `ACTIVITY_TYPE_LABELS[user.activityType]` | 배지 표시 (null이면 미표시) |

### 3-2. "면제" 판정

| 위치 | 조건식 | 면제 대상 |
|------|--------|----------|
| `FunctionGateModal.tsx:48-49` | `hasAnyRole(user.roles, FUNCTION_GATE_EXEMPT_ROLES) \|\| hasBranchRole(user.membershipRole)` | kpa:admin, kpa:operator, kpa:student, branch admin/operator |
| `ActivityTypePrompt.tsx:44` | `member.membership_type === 'student'` | 약대생만 |

### 3-3. "약국 개설자" 판정

| 위치 | 조건식 | 소스 |
|------|--------|------|
| `PharmacyGuard.tsx:74` | `user.isStoreOwner === true` | `/auth/me` → `organization_members.role='owner'` |
| `UserDashboardPage.tsx:40` | `user.isStoreOwner === true` | 동일 |
| `KpaGroupbuyPage.tsx:28` | `user?.isStoreOwner === true` | 동일 |

### 3-4. "로그인 차단" 판정

| 위치 | 조건식 | 반환 |
|------|--------|------|
| `authentication.service.ts:177` | `user.status !== ACTIVE && user.status !== APPROVED` | 403 `ACCOUNT_NOT_ACTIVE` |
| `auth.middleware.ts:100` | `!user.isActive` | 401 `USER_INACTIVE` |
| `kpa-org-role.middleware.ts:68` | `kpa_members.status !== 'active'` | 403 `NO_ACTIVE_MEMBERSHIP` |

### 3-5. 역할 기반 라우트 분기

| 조건 | 목적지 | 위치 |
|------|--------|------|
| `hasAnyRole(roles, PLATFORM_ROLES)` | `/operator` | `RoleBasedHome`, `DashboardRoute`, `getDefaultRouteByRole()` |
| `membershipRole === 'admin' \|\| 'operator'` | `/branch-services` | `getDefaultRouteByRole()` |
| 일반 사용자 | `/dashboard` | 기본값 |
| 미로그인 | `/login` (모달) | `LoginRedirect` |

---

## 4. 직능 설정 후 UX 분석

### 4-1. 설정 성공 후 동작

| 항목 | 현재 동작 |
|------|----------|
| **API 호출** | `PATCH /auth/me/profile { activityType }` → SSOT + mirror 동시 갱신 |
| **checkAuth()** | 즉시 호출 → `/auth/me` 재요청 → user 객체 갱신 |
| **isStoreOwner 재계산** | 서버: `derivePharmacistQualification()` → organization_members 기반 (activity_type 무관) |
| **UI 즉시 반영** | React state 업데이트 → 리렌더 → 탭/배지/가드 즉시 반영 |
| **성공 메시지** | **없음** — 모달/배너가 닫히는 것으로 "성공" 암시 |
| **새로고침 필요** | 불필요 — `checkAuth()` 호출로 상태 동기화 |
| **리다이렉트** | FunctionGatePage만 `/dashboard`로 이동, Modal/Prompt는 현재 위치 유지 |

### 4-2. 설정 실패 시 동작

| 컴포넌트 | 실패 처리 |
|---------|----------|
| FunctionGateModal | silent catch → 모달 유지 (재시도 가능) |
| ActivityTypePrompt | silent catch → 배너 유지 (재시도 가능) |
| FunctionGatePage | silent catch → 페이지 유지 (재시도 가능) |

### 4-3. 사용자 혼란 지점

| # | 혼란 지점 | 설명 | 심각도 |
|---|---------|------|--------|
| **C1** | **성공 피드백 부재** | 직능 선택 후 "저장되었습니다" 같은 확인 메시지가 없음. 모달이 닫히거나 배너가 사라지는 것만으로 성공 인지 | MEDIUM |
| **C2** | **모달+배너 동시 등장** | Dashboard 진입 시 FunctionGateModal과 ActivityTypePrompt가 동시에 렌더. 모달 뒤 배너가 숨어있다가 모달 닫힌 후 다시 노출 가능 | HIGH |
| **C3** | **레거시 경로 잔존** | `/demo/select-function`(FunctionGatePage)이 독립 페이지로 존재. "뒤로 가기"가 없어 stuck 가능 | MEDIUM |
| **C4** | **면제 기준 불일치** | Modal은 admin/operator 면제, Prompt는 student만 면제. admin이 실수로 /dashboard에 오면 Prompt가 뜸 | LOW |
| **C5** | **Pending 재로그인 시 맥락 상실** | 승인 대기 중 다시 로그인 시도 시 amber 에러만 표시. "언제 승인되나" 추가 정보 없음 | MEDIUM |

---

## 5. To-Be 단일 UX 흐름 제안 (개념안)

### 5-1. 상태 기반 단일 분기

```typescript
// App.tsx 또는 AuthGate 컴포넌트
function AuthGate({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spinner />;

  // State 1: 미로그인
  if (!user) return children; // 공개 페이지 표시

  // State 2: Pending 승인 대기
  if (user.status === 'pending') return <PendingApprovalPage />;

  // State 3: 직능 미설정 (면제 제외)
  if (!user.activityType && !isExempt(user)) return <ActivitySetupPage />;

  // State 4: 정상
  return children;
}
```

### 5-2. 컴포넌트 통합 제안

| 현재 | To-Be | 이유 |
|------|-------|------|
| FunctionGateModal + FunctionGatePage + ActivityTypePrompt | **ActivitySetupPage** (단일 전용 페이지) | 3개 경로 → 1개 페이지, 상태 머신에서 자동 분기 |
| LoginModal (amber 에러) | **PendingApprovalPage** (전용 페이지) | 에러 메시지보다 안내 페이지가 UX적으로 우수 |
| RegisterPendingPage | PendingApprovalPage와 통합 | 동일 목적 (승인 대기 안내) |

### 5-3. To-Be 상태 전이도

```
Guest
  │
  ├─ 가입 → PendingApprovalPage
  │        "운영자 승인 후 이용 가능합니다"
  │        [로그인 시도] → 동일 페이지 유지 (로그인 차단)
  │
  │  [운영자 승인]
  │
  ▼
ActivitySetupPage
  │  "직능 분류를 선택해주세요"
  │  [약국 개설] [근무 약사] [병원] [산업] [기타] [미활동]
  │  [저장] → PATCH /auth/me/profile → /dashboard 리다이렉트
  │
  ▼
Dashboard (정상 이용)
  │
  ├── 역할별 자동 분기
  │   ├── admin/operator → /operator
  │   ├── branch admin → /branch-services
  │   └── 일반 → /dashboard
  │
  └── 직능 변경: /mypage/profile에서 수정 가능
```

### 5-4. 면제 규칙 통합

```typescript
function isExempt(user: User): boolean {
  // 운영 역할: 직능 선택 불필요
  if (hasAnyRole(user.roles, [ROLES.KPA_ADMIN, ROLES.KPA_OPERATOR])) return true;
  // 지부 관리자: 직능 선택 불필요
  if (hasBranchRole(user.membershipRole)) return true;
  // 약대생: 직능 선택 불필요
  if (user.membershipType === 'student') return true;
  return false;
}
```

---

## 6. UX 수정 우선순위 제안

### P0 — 즉시 개선

| # | 항목 | 현재 문제 | 수정 방향 |
|---|------|----------|----------|
| **UX-1** | **모달+배너 중복 제거** | FunctionGateModal과 ActivityTypePrompt 동시 등장 | ActivityTypePrompt 제거, FunctionGateModal로 단일화. 또는 Modal 없이 Prompt만 유지 |
| **UX-2** | **레거시 FunctionGatePage 정리** | `/demo/select-function` 독립 페이지 잔존 | `/select-function` → FunctionGateRedirect (모달 열기) 리다이렉트만 유지, 페이지 제거 |

### P1 — UX 미려화

| # | 항목 | 현재 문제 | 수정 방향 |
|---|------|----------|----------|
| **UX-3** | **성공 피드백 추가** | 직능 선택 후 확인 메시지 없음 | toast 또는 "직능이 저장되었습니다" 확인 UI 추가 |
| **UX-4** | **Pending 안내 개선** | LoginModal amber 에러만 표시 | Pending 전용 안내 카드 (승인 절차, 예상 시간, 문의처) |
| **UX-5** | **면제 기준 통일** | Modal과 Prompt 면제 기준 다름 | 단일 `isExempt()` 함수로 통합 |

### P2 — 구조적 재편 (별도 WO)

| # | 항목 | 수정 방향 |
|---|------|----------|
| **UX-6** | 상태 기반 AuthGate 패턴 도입 | App.tsx 최상위에서 user 상태 기반 단일 분기 |
| **UX-7** | PendingApprovalPage 전용 구현 | 승인 대기 → 전용 페이지 (로그인 불가 상태에서도 정보 표시) |
| **UX-8** | ActivitySetupPage 전용 구현 | 직능 선택 → 전용 페이지 (모달/배너 제거) |

---

## 7. 검증 완료 체크리스트

- [x] Pending UX: 로그인 불가 확인 (`authentication.service.ts:177`)
- [x] Pending 안내: LoginModal amber 에러 + RegisterPendingPage 확인
- [x] 직능 미설정 처리: 3개 컴포넌트 전수 수집 (Modal/Prompt/Page)
- [x] 동시 등장 시나리오 분석 (C2: Modal+Prompt)
- [x] 면제 기준 불일치 확인 (C4: Modal vs Prompt)
- [x] 레거시 경로 식별 (C3: `/demo/select-function`)
- [x] 판정 조건 소스: 3개 컴포넌트의 API 소스 차이 문서화
- [x] 역할별 라우트 분기: 5개 경로 전수 확인
- [x] 성공 피드백 부재 식별 (C1)
- [x] To-Be 단일 흐름 개념안 제시

---

*Document Version: 1.0*
*Created: 2026-02-27*
*Audit Type: UX Flow Investigation (코드 수정 없음)*
