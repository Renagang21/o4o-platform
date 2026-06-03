# IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> O4O 플랫폼에서 사용자 계정 관리의 canonical 위치를 확정하기 위한 구조 조사. **각 서비스 `/mypage` 유지 vs `web-account` 통합 vs 혼합형 vs 최소 계정센터** 중 결정.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1](CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1.md)
  - [IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1](IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md)
  - [O4O-IDENTITY-ARCHITECTURE-V2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md)
- **참조 SSOT:** Identity V2 4-Layer 모델 (Identity / Credential / Membership / Role)
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음.

---

## 0. 최종 권장안

### Option D — **각 서비스 `/mypage` canonical + `web-account` 최소 계정센터 (서비스 목록 + 열기)**

**한 줄 요약:** 비밀번호 변경이 service-scoped credential (V2 L2) 인 이상, 설정 UI 는 서비스별 `/mypage` 가 자연스럽다. `web-account` 는 "내가 가입한 서비스 목록 + 서비스 열기" 만 담당하는 minimum viable account center 로 유지한다.

| Option | 적합도 | 비고 |
|---|:---:|---|
| A. 각 서비스 `/mypage` canonical (web-account 폐기) | ⚪ 부분적 | web-account 의 미래 가치까지 폐기는 과잉 |
| B. web-account 통합 (모든 설정 이관) | ❌ 비추천 | service_credentials 모델과 정면 충돌 |
| C. 혼합형 (Identity → web-account, 서비스별 → mypage) | △ 가능 | UX 분리 위험 (이름은 web-account, 비밀번호는 mypage — 사용자 혼란) |
| **D. 최소 계정센터** | ✅ **권장** | 현재 구현 상태와 100% 일치, V2 정합, 가장 작은 결정 |

### 권장의 핵심 근거 3 가지

1. **Identity V2 의 L2 Credential 이 service-scoped 라서** 비밀번호 변경 UI 가 본질적으로 서비스별이다. web-account 가 비밀번호 변경 UI 를 제공하려면 "어느 서비스의 비밀번호?" 를 매번 묻는 UX 가 되며 V2 모델의 자연스러운 표현이 아님.

2. **현재 4 service 의 `/mypage` 가 이미 V2 Phase 2 정렬 완료** — `PUT /users/password` with `serviceKey` 가 4 service 모두 적용됨 (선행 WO Identity V2 Phase 1/2). 변경 없이 그대로 canonical 로 인정 가능.

3. **`web-account` 의 minimum viable 기능 (서비스 목록 + 열기) 은 이미 구현되어 있음** — 코드 자체 변경 없이 향후 배포만 결정하면 됨. 추가 기능을 욕심내지 않으면 minimal 배포 가능.

### 즉시 결정 항목

| 결정 항목 | 권고 |
|---|---|
| canonical 위치 | 각 서비스 `/mypage`, `/mypage/settings`, `/mypage/profile` |
| web-account 의 역할 | 최소 계정센터 — 서비스 목록 + Handoff 만 |
| web-account 배포 | **별건 IR 의 영역** (`IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` 제안) |
| 비밀번호 변경 위치 | 각 서비스 `/mypage/settings` (V2 Phase 2 정렬 그대로) |
| 프로필 수정 위치 | 각 서비스 `/mypage/profile` (현재 그대로) |
| 서비스별 정보 위치 | 각 서비스 `/mypage` (포인트/자격/수강 등 — 본질적으로 service-scoped) |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 범위 | `services/web-{4 service,account}/src/pages/mypage,components,App.tsx` + `apps/api-server` (auth/users API) + Identity V2 docs |

---

## 2. 산출물 1 — 4 service MyPage 기능 목록

### 2.1 공통 패턴 (모든 4 service)

| 파일 | 호출 backend API | 분류 |
|---|---|:---:|
| `MyPageHub.tsx` | (read-only profile from auth context) | L1 Identity 표시 |
| `MyProfilePage.tsx` | `PUT /api/v1/users/profile` (name/nickname/phone) | L1 Identity 수정 |
| `MySettingsPage.tsx` | `PUT /api/v1/users/password` **with `serviceKey: '<svc>'`** | L2 Credential (service-scoped) |

→ **3 공통 page 모두 `@o4o/account-ui` 의 `MyPageLayout`/`QuickActionsSection` 컴포넌트 사용 — 이미 부분 공통화 진행 중.**

### 2.2 서비스별 추가 기능

| Service | 추가 page | 분류 |
|---|---|:---:|
| **KPA Society** | MyDashboard, MyCredits, MyCertificates, MyEnrollments, MyCompletions, MyForumDashboard, MyRequests, MyQualifications, AnnualReportForm, PersonalStatusReport, ForumMemberManagement | L3 Membership + 서비스 도메인 (LMS, Forum, Reports, Pharmacy 자격) |
| **K-Cosmetics** | MyCredits, MyCertificates, MyEnrollments | L3 + LMS 도메인 |
| **GlycoPharm** | (3 공통 만) | — |
| **Neture** | (3 공통 만) | — |

### 2.3 Identity V2 4-Layer 매핑

| L | Layer | MyPage 의 어디 |
|:---:|---|---|
| L1 | Identity (users) | `MyPageHub` 표시 + `MyProfilePage` 수정 (name/nickname/phone) |
| L2 | Credential (service_credentials) | `MySettingsPage` (비밀번호 변경, service-scoped) |
| L3 | Membership (service_memberships) | `MyPageHub` 의 status 배지 + KPA 의 가입 흐름 page |
| L4 | Role (role_assignments) | `MyPageHub` 의 역할 표시 |

**중요:** L2 (Credential) 가 service-scoped 라 `MySettingsPage` 의 비밀번호 변경이 본질적으로 서비스별. 4 service 모두 `serviceKey: '<svc>'` 명시 (V2 Phase 2 적용).

---

## 3. 산출물 2 — web-account 현재 기능 목록

### 3.1 라우트 (`services/web-account/src/App.tsx`)

```
/handoff → HandoffPage (incoming SSO)
/        → DashboardPage (계정 홈, AccountLayout 래핑)
```

→ **2 개 라우트.** 별도 `/profile`, `/settings`, `/password`, `/security` 등 없음.

### 3.2 DashboardPage 기능

| 기능 | 상태 | API |
|---|:---:|---|
| `UserProfileCard` — 이름/이메일/역할 표시 | ✅ | 없음 (AuthContext 의 user 사용) |
| 가입 서비스 목록 (active) | ✅ | `GET /api/v1/auth/services` |
| 서비스 "열기" 버튼 (Handoff 발급) | ✅ | `POST /api/v1/auth/handoff` |
| "내 정보 편집" | ❌ 없음 | — |
| 비밀번호 변경 | ❌ 없음 | — |
| 알림 설정 / 보안 / 탈퇴 | ❌ 없음 | — |
| 가입/이메일 인증 | ❌ 없음 (Service Join 은 각 서비스 사이트에서) | — |

### 3.3 배포 상태 (선행 CHECK 인용)

| 항목 | 값 |
|---|---|
| Cloud Run 서비스 | `account-center-web` (1 revision, 2026-03-13 placeholder) |
| `.run.app` 실제 응답 | Google "Congratulations" 기본 페이지 |
| GitHub Actions deploy 등재 | ❌ (`services/web-account/**` trigger path 없음) |
| `account.neture.co.kr` DNS | CNAME → `ghs.googlehosted.com` |
| SSL handshake | ❌ 실패 (도메인 매핑 미완) |
| 4 service → web-account 진입 링크 | ❌ 0 건 |
| `service-catalog.ts` 의 `O4O_SERVICES` | ❌ `account` 미등록 (`// Account Center (향후)` 주석) |

→ web-account 는 **미배포 + 미연결 상태의 미래 계정센터 후보** (선행 CHECK 의 위치 규정).

---

## 4. 산출물 3 — 기능별 canonical 위치 매트릭스

| 기능 | Layer | 현재 위치 | 권장 위치 (Option D) | 사유 |
|---|:---:|---|---|---|
| 이메일 / 이름 표시 | L1 | 각 service `/mypage` + (잠재) web-account dashboard | **양쪽 모두 OK (read-only)** | UserProfileCard 가 이미 양쪽에 있음 |
| 이름 / 닉네임 / 연락처 수정 | L1 | 각 service `/mypage/profile` (`PUT /users/profile`) | **각 service `/mypage/profile`** | API 자체가 공통 — 각 서비스에서 호출해도 동일 effect. 굳이 web-account 로 분리할 필요 없음 |
| 비밀번호 변경 | L2 | 각 service `/mypage/settings` (`PUT /users/password` with serviceKey) | **각 service `/mypage/settings`** | V2 L2 service-scoped — 서비스별 분리가 본질 |
| 비밀번호 재설정 (이메일) | L2 | 각 service login 화면의 "비밀번호 찾기" (serviceKey 주입) | **각 service login** | V2 Phase 1 정렬 — 변경 없음 |
| 이메일 인증 | L1 | 각 service `/auth/verify-email` (선행 WO 로 4 service 모두 추가) | **각 service** | 토큰 도착지가 service URL |
| 내 가입 서비스 목록 보기 | L3 | KPA `/mypage/dashboard` 일부 / 향후 web-account dashboard | **양쪽 모두 OK — web-account 가 통합 view** | web-account 의 minimum viable 기능 |
| 서비스 가입 신청 | L3 | 각 service Register 흐름 (Service Join API 는 Switcher 에서 deprecated) | **각 service** | 가입 = 서비스별 사업자 승인 흐름 |
| 서비스 이용 상태 (active/pending) | L3 | 각 service `/mypage` 의 status 배지 + web-account dashboard 의 ServiceCard | **양쪽 모두 OK** | 본인 정보 통합 view 허용 |
| 서비스 전환 / 열기 | — | web-account DashboardPage 의 "열기" (Handoff) + 각 service 의 (없음) | **web-account** | Handoff 의 유일한 outbound 호출처 |
| 서비스별 역할 확인 | L4 | UserProfileCard 의 role 표시 (4 service + web-account 둘 다) | **양쪽 모두 OK** | read-only |
| 포인트 / 크레딧 | 서비스 도메인 | KPA / K-Cos `/mypage/credits` | **각 service** | 도메인별 데이터 |
| 수강 / 자격 / 인증서 | LMS 도메인 | KPA / K-Cos `/mypage/{enrollments,qualifications,certificates,completions}` | **각 service** | LMS 도메인별 |
| 매장 경영자 정보 | 서비스 도메인 | (KPA-Store 등) | **각 service** | 도메인별 |
| 운영자/관리자 진입 | L4 | StoreUserDropdown 의 "관리자 콘솔" / "운영 대시보드" 링크 (각 service) | **각 service** | 권한이 서비스별 |
| 탈퇴 / 계정 중지 | L1 + L3 | (현재 미구현) | **(향후 결정)** | 본 IR 범위 외 |

**핵심 분류:**
- **canonical 위치 = 각 service `/mypage`**: 비밀번호 / 프로필 / 서비스별 데이터
- **web-account 의 추가 가치 = 통합 view + Handoff**: 가입 서비스 목록 + 서비스 열기 (모든 정보는 read-only)

---

## 5. 산출물 4 — Option A/B/C/D 비교표

### 비교 매트릭스

| 차원 | A: mypage canonical | B: web-account 통합 | C: 혼합형 (Identity→web-account / 서비스별→mypage) | D: 최소 계정센터 |
|---|:---:|:---:|:---:|:---:|
| Identity V2 L2 정합 (service-scoped credential) | ✅ | ❌ web-account 에서 비밀번호 변경 시 "어느 서비스?" UX 필요 | △ Identity 는 분리 가능하나 비밀번호는 여전히 서비스별 | ✅ |
| 현재 구현과의 정합 | ✅ 100% 일치 | ❌ 새 화면 / 라우트 / API 다수 필요 | △ web-account 에 profile/identity 신설 필요 | ✅ 100% 일치 |
| 코드 변경 규모 | 0 | 大 (web-account 화면 신설 + 4 service mypage 일부 폐지) | 中 (web-account 에 Identity 화면 추가 + 각 service profile 이관) | 0 (web-account 배포만 별건) |
| 사용자 UX 일관성 | ✅ 서비스 진입 = 그 서비스에서 모든 관리 | ✅ 한 곳에서 모두 (단, 비밀번호 UX 가 어색) | ❌ 이름 변경은 web-account, 비밀번호는 mypage — 혼란 | ✅ "관리 = 그 서비스, 통합 view = 계정센터" 명확 |
| 서비스별 독립 사업자 원칙 | ✅ 완벽 | △ 약화 가능 | △ 부분 약화 | ✅ 강화 (web-account 가 "본인 view" 만 담당) |
| 사용자의 통합 정보 조회 | ❌ 각 서비스 별도 조회 | ✅ 한 곳 | ✅ 한 곳 (Identity 만) | ✅ 한 곳 (서비스 목록 + 상태) |
| 배포/운영 부담 | 낮음 (현 상태) | 高 (web-account 풀 배포 + 매핑 + 진입 링크 + 권한 설계) | 中 | 낮음 (web-account 최소 배포만 별건) |
| web-account 의 미래 가치 | ❌ 폐기 시사 | ✅ 최대 | △ 부분 활용 | ✅ 명확한 minimum scope |
| Handoff outbound 호출처 | ❌ web-account 가 유일한 호출처라 mypage 만 두면 Handoff 가 dead | ✅ web-account 가 살아남음 | ✅ | ✅ |
| 정책 안정성 | ✅ 현재 그대로 유지 | ❌ 큰 결정 + 후행 작업 다수 | △ 분리 기준 설정 비용 | ✅ "최소" 라는 명확한 boundary |

→ **D 가 다른 모든 차원에서 우월하거나 동등.** 유일한 단점 = "통합 계정센터 UX 의 완성도가 낮음" 인데, 그건 web-account 의 미래 확장 여지로 남기면 됨.

### A vs D 의 미세 차이

A 는 web-account 를 사실상 폐기하는 입장. D 는 web-account 를 "최소 기능으로 살린다" 입장. **D 가 A 보다 우월한 이유:**

- web-account 의 현재 코드 (DashboardPage + ServiceCard + Handoff) 가 이미 minimum viable account center 형태로 만들어져 있음 — 폐기하는 것은 sunk cost loss
- Handoff API + outbound 호출처가 web-account 1 곳에 있는데 web-account 를 죽이면 Handoff outbound 흐름도 dead (선행 IR 확정)
- 사용자가 여러 서비스 가입 시 "내가 어디에 가입했지?" 를 한 곳에서 확인할 가치 있음

### B/C 의 비정합 위험

B (전면 통합): 비밀번호 변경 UI 가 web-account 에 있으면 **사용자가 비밀번호 변경 시 어느 서비스의 credential 인지 매번 선택**해야 함. UX 가 V2 모델의 자연스러운 표현이 아님 (서비스 진입 → 그 서비스 비밀번호 변경 이 자연스럽다).

C (혼합형): "이름은 web-account 에서, 비밀번호는 mypage 에서" — 사용자가 어디 가야 할지 매번 고민. 분리 기준이 직관적이지 않음.

---

## 6. 산출물 5 — Identity V2 정합성 판단

| 질문 | 답 |
|---|---|
| service_credentials 가 서비스별인 상황에서 비밀번호 변경은 각 서비스에 남는 것이 자연스러운가? | ✅ **그렇다.** V2 L2 의 자연스러운 표현 |
| 공통 users identity 정보는 web-account 에 두는 것이 자연스러운가? | △ **양쪽 모두 가능.** API (`PUT /users/profile`) 가 공통이라 어느 frontend 에서 호출해도 동일 effect. UX 일관성 측면에서 "서비스 진입 = 그 서비스에서 모든 관리" 가 더 일관적 |
| 서비스별 membership/role/status 는 각 service mypage 에 두는 것이 자연스러운가? | ✅ **그렇다.** 본질적으로 도메인 데이터 |
| web-account 에서 모든 서비스 상태를 보여주는 것이 독립 사업자 원칙과 충돌하는가? | ❌ **충돌하지 않음.** 본인 정보의 통합 view 와 운영자/사업자 간 cross-service 조회는 별개. 본인 view 는 정당 |
| 사용자 본인에게 자신의 가입 서비스 목록을 보여주는 것은 허용 가능한가? | ✅ **허용.** F6 Boundary Policy 는 운영자 측 cross-service 조회만 제한 |
| 운영자/사업자 관점에서 다른 서비스의 정보가 노출되는 문제는 없는가? | ✅ **없음.** web-account 는 본인 view 만 — 운영자 관점 데이터 노출 0 |

→ **D 가 V2 모델과 가장 정합.**

---

## 7. 산출물 6 — web-account 배포 필요성 판단

본 IR 의 영역과 별건이지만 권고:

| 옵션 | 권고 |
|---|---|
| A. 당장 배포 필요 | ⚪ 우선순위 낮음 (각 서비스 mypage 가 충분) |
| B. 보류 | △ 가능하나 minimum viable 기능이 이미 있어 sunk |
| **C. 축소 배포** | ✅ **권고 — 최소 계정센터로 배포** (서비스 목록 + Handoff) |
| D. 폐기 아님, 미래 후보 (현 상태 유지) | ⚪ C 와 같은 보수적 위치 |

**권고: C. 축소 배포** — 단, 본 IR 의 즉시 결정 영역이 아님. 별건 IR (`IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1`) 의 책임.

배포 시 필요 작업 (참고용):
1. `deploy-web-services.yml` 의 trigger path 와 deploy step 에 `services/web-account/**` 추가
2. `account.neture.co.kr` 도메인 매핑 완료 (Cloud Run domain mapping)
3. 4 service user dropdown 에 "계정센터" 또는 "내 서비스" 링크 추가 (각 service 별 별건 WO)
4. `service-catalog.ts` 의 `O4O_SERVICES` 에 `account` 등록 여부 결정 (필요한지 별건 정책)

---

## 8. 산출물 7 — 현재 구조 vs O4O 철학 충돌 체크

| 차원 | Option D 채택 시 | 충돌 |
|---|:---:|:---:|
| O4O 는 공통 Core + 독립 서비스 구조 | ✅ 정합 — `/mypage` 가 service-specific, web-account 가 본인 view 통합 | 없음 |
| 각 서비스는 독립 사업자 성격 | ✅ 정합 — 운영자/관리자 진입 / 서비스별 데이터는 각 service | 없음 |
| 사용자 계정 관리는 공통 identity + 서비스별 membership 분리 | ✅ V2 L1/L2/L3/L4 매트릭스 그대로 반영 | 없음 |
| 각 서비스 mypage 유지가 독립 사업자 원칙과 더 잘 맞는가 | ✅ 그렇다 — 사용자가 "이 서비스의 내 정보" 를 그 서비스에서 관리 | 없음 |
| web-account 통합이 서비스별 독립성을 흐릴 위험 | ✅ D 채택 시 위험 회피 (최소 기능만) | 없음 |
| 사용자가 자신의 서비스 이용 상태를 한 곳에서 보는 것 | ✅ 허용 (본인 view) | 없음 |
| service_credentials 독립 구조와 계정센터 UX 충돌 | ✅ D 채택 시 회피 (web-account 에 비밀번호 UI 없음) | 없음 |

→ **충돌 0 건.** Option D 는 O4O 의 모든 철학 원칙과 정합.

---

## 9. 산출물 8 — 최종 권장안

### 최종 권장: **Option D**

**구성:**
- canonical 계정 관리 위치 = **각 서비스 `/mypage`, `/mypage/profile`, `/mypage/settings`**
- web-account 의 역할 = **최소 계정센터** (서비스 목록 + Handoff outbound)
- 비밀번호 변경 위치 = 각 서비스 `/mypage/settings` (V2 Phase 2 정렬 그대로)
- 프로필 수정 위치 = 각 서비스 `/mypage/profile` (현재 그대로)
- 서비스별 정보 (포인트/자격/수강/매장 등) 위치 = 각 서비스 `/mypage/*` (현재 그대로)

**즉시 코드 변경: 없음.** 본 권고는 현재 구현 상태를 그대로 canonical 로 확정하는 결정.

### 즉시 효과

- 4 service mypage 의 V2 Phase 2 정렬을 doc 으로 공식 인정
- web-account 의 미래 활성화 시 경로 명확 (최소 계정센터)
- 추가 큰 결정 / WO 발생 없음 — 안정화 사이클 종료

---

## 10. 산출물 9 — 후속 WO/IR 제안

### 본 IR 의 직접 후속

**없음.** 본 IR 의 권장 Option D 채택 시 즉시 코드 변경 없음.

### 별건 후속 (사용자 결정 사안)

| 후속 | 우선순위 | 비고 |
|---|:---:|---|
| `IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` | 中 | 최소 계정센터로 배포 시점 결정 (deploy-web-services 등재 + DNS 매핑 + 4 service 진입 링크) |
| `WO-O4O-MYPAGE-CANONICAL-DOC-V1` | 低 | 본 IR 의 권고를 baseline doc (`docs/baseline/O4O-MYPAGE-CANONICAL-V1.md`) 으로 승격 — 향후 drift 방지 |
| `WO-O4O-ADMIN-DASHBOARD-OPERATOR-CARD-CLEANUP-V1` | 매우 低 | 선행 IR 의 dead code 정리 (별건) |

### 본 IR 이 결정하지 않는 것

- web-account 의 실제 배포 시점 — 별건 IR
- 4 service user dropdown 에 web-account 진입 링크 추가 — web-account 배포 결정 후 별건 WO
- 탈퇴 / 계정 중지 UX 의 canonical 위치 — 본 IR 범위 외 (미구현)
- 통합 알림 설정 / 보안 / 2FA 등 미래 기능의 canonical — 본 IR 범위 외
- `@o4o/account-ui` 공통 패키지 확장 — Operator Core Design 영역

---

## 11. Drift 방지 원칙 (요약)

본 IR 의 권고를 향후 drift 없이 유지하려면:

```text
원칙:
1. 계정 관리 UI 는 각 서비스 /mypage canonical.
2. 비밀번호 변경은 PUT /users/password with serviceKey — 서비스별 분리 유지.
3. 프로필 수정은 PUT /users/profile — API 가 공통이므로 어디서 호출하든 OK,
   단 UI 진입은 각 서비스 /mypage/profile 유지.
4. web-account 는 본인 view (서비스 목록 + Handoff) 만 — 비밀번호/프로필 UI 추가 금지.
5. 새 계정 관리 기능 추가 시 본 IR 의 매트릭스를 기준으로 위치 결정.
6. service_credentials 와 service_memberships 의 service-scoped 특성을 UI 에서도 보존.
```

---

## 12. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 새 WO 후보 | 0 (본 IR 직접 후속) |
| 별건 후속 IR 후보 | 2 (web-account 배포 / mypage canonical doc) |
| Identity V2 정합 강화 | ✅ V2 L1/L2/L3/L4 매트릭스를 UI 측에 명문화 |
| 사이클 정리 | 본 IR 로 "계정 관리 위치" 의 큰 결정이 종료. 안정화 사이클 마무리 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. 4 service MyPage 파일 목록
find services/web-{glycopharm,kpa-society,k-cosmetics,neture}/src/pages/mypage \
  -name '*.tsx' -o -name '*.ts' | sort

# 2. MyPage 의 backend API 호출 패턴
grep -rn "/auth/me\|/users/password\|/users/profile\|/auth/change-password" \
  services/web-{glycopharm,kpa-society,k-cosmetics,neture}/src/pages/mypage

# 3. 비밀번호 변경의 serviceKey 명시 확인
grep -rn "serviceKey:.*'" services/web-*/src/pages/mypage/MySettingsPage.tsx

# 4. web-account 라우트
cat services/web-account/src/App.tsx

# 5. web-account 의 page 목록
ls services/web-account/src/pages
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — 최종 권장 Option D (각 서비스 /mypage canonical + web-account 최소 계정센터).*
*Decision Required: Option D 채택 확정 + 별건 후속 (web-account 배포 IR / canonical doc WO) 진행 여부.*
