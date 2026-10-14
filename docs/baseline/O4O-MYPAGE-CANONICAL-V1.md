# O4O My Home — 계정 관리 위치 Canonical V1

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 사용자 승인에 따른 [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md)이 본문 전체의 PharmacyHub/PH 운영·경로 보존·후속 UI 구현 의무를 대체한다. Locked 상태의 공통 Option D·다른 서비스 계정 계약은 유지한다. PH `/account`·`/store-owner/account`·가입·계정 UI는 복구하지 않으며 종전 구현은 이력이다. 실행 범위는 [폐기 정책 WO](../work-orders/WO-O4O-PHARMACYHUB-CANONICAL-RETIREMENT-POLICY-V1.md)를 따른다.


> **2026-10-11 사용자 결정**: 개인 통합 공간의 사용자용 이름은 **My Home**이다. 참여 서비스·커뮤니티 활동·경영 현황·계정 설정과 공통 직접 진입은 [My Home 정본](O4O-MY-HOME-CANONICAL-V1.md)을 따른다. 아래 서비스별 계정 관리 위치·domain 경로는 종전 정책 및 구현 기록이며, 현행 `neture.co.kr` 공통 계정 정책은 [인증·가입 정본](O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)이 우선한다. 기존 보안 계약·기술 식별자·web-account 제한은 유지한다. 화면 구현·배포는 이번 문서 작업에서 수행하지 않았다.
>
> **Baseline — 계정 관리 계약과 종전 UI 위치 기록. 개인 통합 공간 전체의 범위는 My Home 정본에서 정한다.**
>
> 본 문서는 [IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1](../investigations/IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md) 의 **Option D** 채택을 baseline 으로 승격하여, 향후 web-account 에 비밀번호 / 프로필 / 서비스별 기능을 과도하게 추가하는 drift 를 방지한다.

- **버전:** V1 (2026-05-24) · **최종 갱신:** 2026-10-11 · **정비 WO:** [WO-O4O-MY-HOME-DOCUMENT-ALIGNMENT-V1](../work-orders/WO-O4O-MY-HOME-DOCUMENT-ALIGNMENT-V1.md)
- **상태:** ACTIVE — 계정 관리 계약 유지, 개인 통합 공간은 My Home 정본 적용.
- **개정 이력:** **부분 갱신 2026-09-23**: `WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1` 로 password 인증이 은퇴해 §2 매트릭스의 비밀번호 2행을 정정했다. **canonical 위치 결정(Option D: web-account = 서비스 목록 + Handoff outbound 전용, 계정 관리는 각 service `/mypage`)은 불변**이며, 근거였던 "비밀번호가 서비스별" 논거만 소멸했다(결론은 그대로 — 인증 자체가 Google 단일이 되어 web-account 에 로그인/자격 UI 를 둘 이유가 더 없다). **부분 갱신 2026-09-29**: `WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1` 정책(§5 승인)으로 로그인이 **Google + 이메일·비밀번호 병행**이 되어 §2 비밀번호 2행 · 로그인 수단 행 · §4 원칙 2 를 다시 정정했다. 새 비밀번호는 `user_password_credentials`(users.id 1:1) 단일 경로이며 은퇴한 `service_credentials`·서비스별 password 의 부활이 아니다. Option D 결정은 그대로 불변이다(web-account 에 로그인/자격 UI 를 두지 않는다). 아래 이메일·비밀번호 관련 API 는 **승인된 계약**이며 구현은 PR #257(S1 보안 수정 `61a44a337` 포함 — Google 가입 `email_verified` 필수 · forgot 발송 조건. [IR §12-1](../investigations/IR-O4O-GOOGLE-AND-ID-AUTH-FINAL-STATUS-AUDIT-V1.md) 의 blocker 는 이 수정으로 닫힘) — 그 병합 · 배포 전 runtime 에는 없다. **부분 갱신 2026-10-01**: §2 비밀번호 재설정 행 · §4 원칙 2 — forgot/reset 은 기존 비밀번호 수단의 복구 전용, 첫 비밀번호 추가는 로그인 상태 `POST /auth/password` 뿐(정책 변경 — [IDENTITY-V3 §3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md)).
- **선행 산출물:** [IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1](../investigations/IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md)
- **상위 SSOT:**
  - `CLAUDE.md` (사업 철학 priority chain)
  - [O4O-IDENTITY-ARCHITECTURE-V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) (4-Layer 모델 · 현행 Identity SSOT) — ~~[V2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md)~~ 는 SUPERSEDED(2026-09-17), 역사적 참조로만 남긴다
  - [O4O-BUSINESS-PHILOSOPHY-V1](O4O-BUSINESS-PHILOSOPHY-V1.md) (독립 사업자 원칙)

---

## 1. 결정 (Decision)

**Option D 채택 당시 결정 — 종전 위치 정책 기록:**

> **계정 관리 UI 의 canonical 위치 = 각 서비스 `/mypage`, `/mypage/profile`, `/mypage/settings`.**
> **web-account 는 최소 계정센터 — "내 서비스 목록 + active 서비스 열기 (Handoff outbound)" 만 담당.**

### 1.1 채택 사유 (요약)

1. ~~**Identity V2 의 L2 (`service_credentials`) 가 service-scoped** → 비밀번호 변경 UI 가 본질적으로 서비스별. web-account 가 비밀번호 UI 를 제공하면 "어느 서비스의 비밀번호?" UX 가 어색.~~ → **논거 소멸(2026-09-23)**: password 축 자체가 은퇴했다. 결론(web-account 에 자격 UI 를 두지 않는다)은 유지되며, 근거는 "web-account 는 인증 진입점이 아니라 세션 소비자(Handoff outbound 전용)" 로 바뀐다.
2. ~~**현재 4 service `/mypage` 가 이미 V2 Phase 2 정렬 완료** — `PUT /users/password` with `serviceKey` 가 4 service 모두 적용됨.~~ → **근거 소멸(2026-09-24)**: `PUT /users/password` 는 은퇴했고 password 축은 스키마에서도 제거됐다. 결론(각 service `/mypage` canonical)은 **그대로 유지**된다 — 근거는 "계정 관리 UI 는 서비스 맥락에서 소비된다" 로 바뀐다.
3. **web-account 의 minimum viable 기능 (서비스 목록 + Handoff outbound) 이미 구현됨** — 향후 배포만 별건 결정.

### 1.2 기각된 옵션

| Option | 기각 사유 |
|---|---|
| A. mypage canonical (web-account 폐기) | sunk cost loss + Handoff outbound 흐름 dead |
| B. web-account 통합 (전면 이관) | service_credentials 모델과 정면 충돌 |
| C. 혼합형 (Identity → web-account / 서비스별 → mypage) | UX 분리 위험 (이름은 web-account, 비밀번호는 mypage — 사용자 혼란) |

---

## 2. 계정 관리 계약 · 종전 기능별 위치 매트릭스

My Home의 참여·활동·경영 요약은 아래 상세 화면으로만 한정하지 않는다. 공통 계정의 현행 위치는 인증·가입 정본을 따르고, 독립 서비스의 실제 업무는 해당 서비스에 남긴다. 아래 `/mypage/*`는 현재 또는 과거 기술 경로이며 사용자용 명칭은 My Home이다.

| 기능 | Identity Layer ([V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) §1) | Canonical 위치 |
|---|:---:|---|
| 이름 / 닉네임 / 연락처 수정 | L1 Identity | **각 service `/mypage/profile`** (`PUT /users/profile`) |
| 비밀번호 설정 / 변경 | L2 Auth Identity (계정 단위 · 서비스 무관) | **각 service `/mypage/settings`** (`POST /auth/password` · 로그인 상태 · 기존 비밀번호가 있으면 현재 비밀번호 필수, 없으면 Google 가입자도 비밀번호 수단을 **추가** — 같은 users.id, 병합 아님 · **첫 비밀번호 추가는 이 경로(로그인 상태)뿐**(2026-10-01) · Admin / `platform:*` 역할은 거부). 은퇴한 `PUT /users/password`(serviceKey 별, 2026-09-23)는 복원하지 않는다. 구현 상태: API = PR #257(병합 · 배포 후 활성) · `/mypage/settings` UI = 미구현(후속) |
| 비밀번호 재설정 (이메일) | L2 Auth Identity (계정 단위) | **각 service `/forgot-password` → `/reset-password`** (`POST /auth/password/forgot` — 존재 여부 비노출 · 재설정 메일은 **비밀번호 수단이 있는 계정에만** 발송 — 수단이 없는 Google 전용 계정은 이메일이 인증돼 있어도 발송 0(2026-10-01 정책 변경, 종전 "수단 보유 또는 이메일 인증된 계정") / `POST /auth/password/reset` — 30분 · 1회용 토큰, 기존 수단 교체만(첫 비밀번호 생성 0), 성공 시 전역 세션 폐기) · Admin / `platform:*` 대상 제외 |
| 로그인 수단 (Google · 이메일/비밀번호 병행) | L2 Auth Identity | **각 service 로그인 화면** — Google: `GoogleContinue` (`POST /auth/google/login` · 미등록 계정은 동의 후 `/auth/google/signup`) / 이메일: `POST /auth/email/login` · 가입 `/signup`(`POST /auth/email/signup`, 계정만 생성 — membership·role 없음). 이메일 동일성으로 Google 계정과 자동 병합하지 않는다. **Admin 은 Google 전용** (password 세션 서버 거부) |
| 이메일 인증 | L1 Identity | **각 service `/auth/verify-email`** (토큰 도착지) |
| 서비스 가입 신청 | L3 Membership | **각 service Register 흐름** |
| 서비스 이용 상태 (active/pending) 보기 | L3 Membership | **각 service `/mypage` 의 status 배지** + (선택) web-account 의 통합 view |
| **내 가입 서비스 목록 (통합 view)** | L3 | **web-account DashboardPage** (read-only) |
| **서비스 전환 / 열기 (Handoff outbound)** | — | **web-account** (유일한 outbound 호출처) |
| 서비스별 역할 확인 | L4 Role | **각 service `/mypage` + web-account UserProfileCard** (양쪽 read-only) |
| 포인트 / 크레딧 | 서비스 도메인 | **각 service `/mypage/credits`** |
| 수강 / 자격 / 인증서 | LMS 도메인 | **My Home에서 참여·학습 현황 요약과 이동 제공**. 강좌 상세 업무는 독립 study 서비스, 분회 연수 이력·학점·자격은 분회에 유지. 종전 `/mypage/{enrollments,qualifications,certificates,completions}`는 기술 경로 기록 |
| 매장 경영 현황 | Store / 서비스 도메인 | **My Home에서 권한 있는 매장·사업의 경영 통계·요약 확인**, 실제 매장 운영은 내 매장. 개인·매장·사업 가입 원장을 합치지 않음 |
| 운영자 / 관리자 진입 | L4 Role | **각 service** (StoreUserDropdown 의 "관리자 콘솔" / "운영 대시보드" 링크) |
| 탈퇴 / 계정 중지 | L1 + L3 | **(향후 결정 — 본 baseline 범위 외)** |

---

## 3. web-account 의 허용 범위 (Scope Lock)

### 3.1 허용 기능 (Allowed)

| 기능 | 구현 위치 | 비고 |
|---|---|---|
| 사용자 프로필 read-only 표시 | `UserProfileCard.tsx` | 이름 / 이메일 / 역할 (수정 불가) |
| 내 가입 서비스 목록 (active) | `DashboardPage` + `GET /api/v1/auth/services` | 통합 view |
| 서비스 "열기" 버튼 (Handoff outbound) | `DashboardPage.handleOpen` + `POST /api/v1/auth/handoff` | active membership 보유 서비스만 |
| 가입 안내 footer 문구 | `DashboardPage` | "다른 서비스 가입은 각 서비스 사이트에서" |
| Handoff inbound exchange | `HandoffPage` + `POST /api/v1/auth/handoff/exchange` | SSO 도착지 |

### 3.2 금지 기능 (Forbidden — Drift 방지)

| 금지 기능 | 사유 |
|---|---|
| 비밀번호 설정 · 변경 UI | 계정 설정은 My Home에서 공통 계정 관리로 연결하며 현행 위치는 인증·가입 정본을 따른다(종전 `/mypage/settings` 경로 유지). 비밀번호는 계정(`users.id`) 단위 하나지만 web-account 는 자격(로그인 수단) UI 를 두지 않는다 (§4 원칙 4). ~~V2 L2 service-scoped 근거~~는 2026-09-23 소멸 |
| 프로필 수정 UI (`PUT /users/profile`) | API는 공통이며 My Home 계정 설정에서 프로필 관리로 연결. 현행 공통 계정 위치는 인증·가입 정본, 종전 `/mypage/profile`은 기술 경로 |
| 알림 설정 / 보안 설정 / 2FA | 향후 결정 (별건) — 본 baseline 시점에는 금지 |
| 서비스 가입 신청 UI | 가입 = 서비스별 사업자 승인 흐름. 각 service Register 가 canonical |
| 운영자 / 관리자 화면 진입 링크 | 권한이 서비스별 — 각 service 에서 진입 |
| 포인트 / 크레딧 / 수강 / 자격 등 도메인 데이터 | 본질적으로 service-scoped |
| 탈퇴 / 계정 중지 (지금 시점) | 미구현. 향후 위치 결정 시 본 baseline 갱신 필요 |

### 3.3 새 기능 추가 시 결정 절차

새로운 계정 관련 기능을 추가하려 할 때:

1. 그 기능이 §2 매트릭스의 어느 항목에 해당하는가?
   - 기존 항목에 해당 → 매트릭스의 canonical 위치에 추가
   - 기존 항목에 없음 → 아래 2 로 진행
2. 기능의 Identity Layer 를 식별 ([V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) 기준):
   - L1 (공통 Identity) → My Home 계정 설정에서 공통 프로필 관리로 연결. 현행 공통 계정 위치는 `neture.co.kr`, 종전 기술 경로는 `/mypage/profile`
   - 로그인 수단 · 비밀번호(계정 단위, `POST /auth/password`) → My Home 계정 설정에서 기존 보안 계약 적용. 종전 기술 경로는 `/mypage/settings`이며 web-account 확장은 금지
   - ~~L2 (service-scoped credential)~~ → 은퇴(2026-09-23). 서비스별 자격 축은 없으며 되살리지 않는다
   - L3 (membership) → My Home의 참여 상태 요약과 해당 서비스의 신청·참여 화면 연결. 원장과 승인 판정은 도메인별 유지
   - L4 (role) → 각 service (권한별)
   - 도메인 데이터 (LMS / Pharmacy / Store 등) → My Home에서는 본인 현황·권한 있는 경영 통계 요약, 실제 업무는 해당 독립 서비스·내 매장. 종전 `/mypage/*` 경로와 원장은 일괄 개명하지 않음
3. web-account 에 추가하려면 **본 baseline §3.2 의 금지 목록에 추가되지 않는 경우에만 허용** — baseline 변경이 필요한 경우 별도 WO 로 본 문서 갱신 후 진행.

---

## 4. 계정 관리 Drift 방지 6 원칙

현행 위치는 인증·가입 정본, 개인 통합 공간의 범위·명칭은 My Home 정본을 따른다. 보안·web-account 제한·원장 경계는 유지한다.

```text
1. 개인 통합 공간은 My Home, 공통 계정은 neture.co.kr에서 관리한다. 기존 /mypage 경로는 기술 식별자로 유지한다.
2. 로그인 수단은 Google + 이메일·비밀번호 병행(2026-09-29). 비밀번호 설정·변경은 POST /auth/password,
   재설정은 /auth/password/forgot·reset — 계정(users.id) 단위 하나이며 서비스별 비밀번호는 없다.
   forgot/reset 은 기존 비밀번호의 복구 전용 — 첫 비밀번호 추가는 로그인 상태 POST /auth/password 뿐(2026-10-01).
   Admin / platform:* 은 Google 전용.
3. 프로필 수정은 PUT /users/profile — API 가 공통이므로 어디서 호출하든 OK,
   UI 진입은 My Home 계정 설정에서 연결하며 기존 /mypage/profile 경로의 호환성을 유지한다.
4. web-account 는 본인 view (서비스 목록 + Handoff) 만 — 자격(로그인 수단) / 프로필 UI 추가 금지.
5. 새 계정 관리 기능 추가 시 본 baseline §2 매트릭스 + §3.3 결정 절차 적용.
6. `service_memberships` 의 service-scoped 특성을 UI 에서도 보존.
   (`service_credentials` 는 2026-09-24 에 DROP — 서비스별 자격 축 자체가 없다.)
```

---

## 5. 현재 정합 상태 (2026-05-24 기준)

| 영역 | 정합 상태 | 근거 |
|---|:---:|---|
| 3 service `/mypage` (KPA / K-Cos / Neture) | ✅ Option D 와 일치 | 현재 구현 |
| 4 service `/mypage/settings` 의 비밀번호 변경 | ~~✅ V2 Phase 2 적용 (`serviceKey` 명시)~~ → **은퇴 (2026-09-23)** · 승인된 계약(2026-09-29 정책): 계정 단위 `POST /auth/password` — API 는 PR #257 병합 · 배포 후 활성, `/mypage/settings` UI 는 미구현(후속) | ~~`WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1`~~ · `WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1` · `WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1` |
| 4 service `/mypage/profile` 의 프로필 수정 | ✅ `PUT /users/profile` 직접 호출 | 현재 구현 |
| web-account 코드 | ✅ 최소 계정센터 형태 (서비스 목록 + Handoff) | 현재 구현 |
| web-account 배포 | ⏭ 미배포 (별건 IR) | placeholder revision (2026-03-13) |
| 4 service → web-account 진입 링크 | ⏭ 0 건 (별건) | 본 baseline 범위 외 |

→ **2026-05-24 당시 구현이 본 baseline과 정합했던 기록**이다. 현재 My Home 정책의 구현 완료나 은퇴 서비스의 존속을 뜻하지 않는다.

### 5.1 Pharmacy-Hub 축 (2026-08-19 추가 — 구현 사실 기록)

> **SUPERSEDED — PH 이력:** 아래 현재 구현·canonical route·제거/redirect 금지·후속 구현 서술은 종전 계약이며 완전 폐기로 대체됐다. 운영 유지·복구 근거로 사용하지 않는다.

본 baseline V1 작성(2026-05-24) 시점에는 3 service(KPA / K-Cos / Neture)만 존재했다.
이후 신설된 **Pharmacy-Hub** 는 `/mypage` 축을 만들지 않고 **`/account`** 를 개인 계정
canonical route 로 사용한다. 아래는 **현재 구현 사실의 기록**이며 §1~§4 의 정책 변경이 아니다.

| 항목 | Pharmacy-Hub 현재 구현 |
|---|---|
| 개인 계정 canonical route | **`/account`** (`services/web-pharmacy-hub/src/pages/account/MyProfilePage.tsx`) |
| Shell | `@o4o/account-ui` 의 `MyPageShell` 채택 (`basePath='/account'`) |
| nav 축 | `PHARMACY_HUB_ACCOUNT_NAV_ITEMS` — 내 프로필(`/account`) · 가입 상태(`/join/status`) |
| 프로필 수정 | `PATCH /users/me/profile` — §2 매트릭스 L1 항목과 동일 계약 |
| 비밀번호 변경 | ~~`PUT /users/password` with `serviceKey='pharmacy-hub'`~~ → **은퇴 (2026-09-23)** (`changeAccountPassword` 제거). 승인된 계약은 §2 의 계정 단위 `POST /auth/password`(PR #257 병합 · 배포 후 활성)이며 `/account` UI 는 미구현(후속) |
| `/store-owner/account` | 매장 셸 URL 유지용 **thin wrapper**(`withShell={false}`). 같은 화면을 두 벌 구현하지 않으며 공통 Shell 을 이중으로 씌우지 않는다. 이 URL 은 store-ui-core 사이드바(설정 › 내 계정)가 가리키므로 **제거·강제 redirect 하지 않는다.** |

즉 Pharmacy-Hub 는 **route 이름만 `/mypage` 대신 `/account`** 일 뿐, §4 Drift 방지 원칙
(서비스별 계정 UI · web-account 금지 범위)은 그대로 지킨다. ~~service-scoped credential~~ 은 2026-09-23 은퇴 — 비밀번호는 계정 단위다.
route 명칭 통일 여부는 본 baseline 이 결정하지 않는다(별건).

근거: `WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1` §13 ·
`WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1` ·
[CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1.md)

---

## 6. Identity 정합성 (V2 → V3 갱신 2026-10-01)

| 차원 | Option D 적용 시 |
|---|:---:|
| L1 (Identity) 분리 정합 | ✅ |
| ~~L2 (Credential) service-scoped 정합~~ → 로그인 수단 계정 단위(V3 L2: Google · 이메일·비밀번호) 정합 — 계정 관리 UI는 My Home에서 공통 계정으로 연결, web-account 확장 금지 | ✅ |
| L3 (Membership) service-scoped 정합 | ✅ |
| L4 (Role) service-scoped 정합 | ✅ |
| 본인 view 와 운영자 view 분리 | ✅ |
| 독립 사업자 원칙 (`O4O-BUSINESS-PHILOSOPHY-V1` §3) | ✅ |
| F6 Boundary Policy (운영자 cross-service 제한 vs 본인 통합 view 허용) | ✅ |

→ 충돌 0 건.

---

## 7. 본 baseline 의 범위 / 비범위

### ✅ 본 baseline 이 결정함

- 계정 관리 계약과 종전 UI 위치 (§2). 현행 공통 계정 위치는 인증·가입 정본, 개인 통합 공간은 My Home 정본이 우선
- web-account 의 허용 / 금지 기능 (§3)
- Drift 방지 원칙 (§4)
- 새 기능 추가 시 결정 절차 (§3.3)

### ⏭ 본 baseline 이 결정하지 않음 (별건)

- web-account 의 실제 배포 시점 → `IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` (제안)
- 4 service user dropdown 에 web-account 진입 링크 추가 → web-account 배포 결정 후 별건 WO
- 탈퇴 / 계정 중지 UX 의 canonical 위치 → 미구현, 향후 별건
- 통합 알림 설정 / 보안 / 2FA → 미구현, 향후 별건
- `@o4o/account-ui` 공통 패키지 확장 → Operator Core Design 영역
- backend API (`/users/profile`, `/auth/password`) 의 변경 → Identity 정본([V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md)) 과 해당 WO 의 책임 (`/users/password` 는 2026-09-23 은퇴)

---

## 8. 본 baseline 변경 시 절차

본 baseline 의 §1 (결정), §2 (매트릭스), §3 (허용/금지), §4 (원칙) 변경은:

1. 별도 IR 로 변경 사유 + 영향 분석 작성
2. Identity architecture [V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) 와의 정합 재확인 (V2 는 SUPERSEDED — 기준으로 쓰지 않는다)
3. WO 로 본 baseline 갱신 (V1 → V2 등 버전 증가)
4. 영향받는 frontend 코드 정렬 WO 별도 진행

**§3.2 의 금지 기능 중 어느 하나라도 web-account 에 추가하려면 본 절차를 거쳐야 한다.** 예외 없이.

---

## 부록 — 참조

- 결정 근거 IR: [IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1](../investigations/IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md)
- 위치 규정 CHECK: [CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1](../archive/checks/CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1.md)
- Identity (현행): [O4O-IDENTITY-ARCHITECTURE-V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) · 역사적 참조: [O4O-IDENTITY-ARCHITECTURE-V2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) (SUPERSEDED)
- Handoff 정책: [IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1](../investigations/IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md)
- Boundary Policy: `docs/architecture/O4O-BOUNDARY-POLICY-V1.md`
- 사업 철학: [O4O-BUSINESS-PHILOSOPHY-V1](O4O-BUSINESS-PHILOSOPHY-V1.md)
- web-account 위치 규정 (memory): `web-account 는 legacy 가 아니라 각 서비스에서 진입하는 계정센터`

---

*Version: V1 (2026-05-24)*
*Status: ACTIVE — 계정 관리 계약 유지. 현행 개인 통합 공간은 My Home 정본 적용. web-account 제한 변경 시 §8 절차 필수*
*2026-10-11 적용 관계: My Home 명칭·개인 공간 범위는 새 정본, 공통 계정 위치는 인증·가입 정본을 따른다. web-account 확장·배포 결정과 화면 구현은 별건.*
