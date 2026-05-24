# O4O MyPage Canonical V1

> **Baseline — 계정 관리 UI 의 canonical 위치 고정 문서.**
>
> 본 문서는 [IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1](../investigations/IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md) 의 **Option D** 채택을 baseline 으로 승격하여, 향후 web-account 에 비밀번호 / 프로필 / 서비스별 기능을 과도하게 추가하는 drift 를 방지한다.

- **버전:** V1 (2026-05-24)
- **상태:** Baseline (Locked)
- **선행 산출물:** [IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1](../investigations/IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md)
- **상위 SSOT:**
  - `CLAUDE.md` (사업 철학 priority chain)
  - [O4O-IDENTITY-ARCHITECTURE-V2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) (4-Layer 모델)
  - [O4O-BUSINESS-PHILOSOPHY-V1](O4O-BUSINESS-PHILOSOPHY-V1.md) (독립 사업자 원칙)

---

## 1. 결정 (Decision)

**Option D 채택:**

> **계정 관리 UI 의 canonical 위치 = 각 서비스 `/mypage`, `/mypage/profile`, `/mypage/settings`.**
> **web-account 는 최소 계정센터 — "내 서비스 목록 + active 서비스 열기 (Handoff outbound)" 만 담당.**

### 1.1 채택 사유 (요약)

1. **Identity V2 의 L2 (`service_credentials`) 가 service-scoped** → 비밀번호 변경 UI 가 본질적으로 서비스별. web-account 가 비밀번호 UI 를 제공하면 "어느 서비스의 비밀번호?" UX 가 어색.
2. **현재 4 service `/mypage` 가 이미 V2 Phase 2 정렬 완료** — `PUT /users/password` with `serviceKey` 가 4 service 모두 적용됨. 변경 없이 canonical 인정.
3. **web-account 의 minimum viable 기능 (서비스 목록 + Handoff outbound) 이미 구현됨** — 향후 배포만 별건 결정.

### 1.2 기각된 옵션

| Option | 기각 사유 |
|---|---|
| A. mypage canonical (web-account 폐기) | sunk cost loss + Handoff outbound 흐름 dead |
| B. web-account 통합 (전면 이관) | service_credentials 모델과 정면 충돌 |
| C. 혼합형 (Identity → web-account / 서비스별 → mypage) | UX 분리 위험 (이름은 web-account, 비밀번호는 mypage — 사용자 혼란) |

---

## 2. 기능별 Canonical 위치 매트릭스

| 기능 | Identity V2 Layer | Canonical 위치 |
|---|:---:|---|
| 이름 / 닉네임 / 연락처 수정 | L1 Identity | **각 service `/mypage/profile`** (`PUT /users/profile`) |
| 비밀번호 변경 | L2 Credential | **각 service `/mypage/settings`** (`PUT /users/password` with `serviceKey`) |
| 비밀번호 재설정 (이메일) | L2 Credential | **각 service login 의 "비밀번호 찾기"** (serviceKey 주입) |
| 이메일 인증 | L1 Identity | **각 service `/auth/verify-email`** (토큰 도착지) |
| 서비스 가입 신청 | L3 Membership | **각 service Register 흐름** |
| 서비스 이용 상태 (active/pending) 보기 | L3 Membership | **각 service `/mypage` 의 status 배지** + (선택) web-account 의 통합 view |
| **내 가입 서비스 목록 (통합 view)** | L3 | **web-account DashboardPage** (read-only) |
| **서비스 전환 / 열기 (Handoff outbound)** | — | **web-account** (유일한 outbound 호출처) |
| 서비스별 역할 확인 | L4 Role | **각 service `/mypage` + web-account UserProfileCard** (양쪽 read-only) |
| 포인트 / 크레딧 | 서비스 도메인 | **각 service `/mypage/credits`** |
| 수강 / 자격 / 인증서 | LMS 도메인 | **각 service `/mypage/{enrollments,qualifications,certificates,completions}`** |
| 매장 경영자 정보 | 서비스 도메인 | **각 service `/mypage/*`** |
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
| 비밀번호 변경 UI | V2 L2 service-scoped — "어느 서비스의 비밀번호?" UX 어색 |
| 프로필 수정 UI (`PUT /users/profile`) | API 는 공통이나 UI 진입은 각 service `/mypage/profile` canonical |
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
2. 기능의 Identity V2 Layer 를 식별:
   - L1 (공통 Identity) → 각 service `/mypage/profile` 권장 (UI 진입 일관성)
   - L2 (service-scoped credential) → **반드시** 각 service `/mypage/settings`
   - L3 (membership) → 각 service `/mypage` (도메인별)
   - L4 (role) → 각 service (권한별)
   - 도메인 데이터 (LMS / Pharmacy / Store 등) → 각 service `/mypage/*`
3. web-account 에 추가하려면 **본 baseline §3.2 의 금지 목록에 추가되지 않는 경우에만 허용** — baseline 변경이 필요한 경우 별도 WO 로 본 문서 갱신 후 진행.

---

## 4. Drift 방지 6 원칙

```text
1. 계정 관리 UI 는 각 service /mypage canonical.
2. 비밀번호 변경은 PUT /users/password with serviceKey — 서비스별 분리 유지.
3. 프로필 수정은 PUT /users/profile — API 가 공통이므로 어디서 호출하든 OK,
   단 UI 진입은 각 service /mypage/profile 유지.
4. web-account 는 본인 view (서비스 목록 + Handoff) 만 — 비밀번호 / 프로필 UI 추가 금지.
5. 새 계정 관리 기능 추가 시 본 baseline §2 매트릭스 + §3.3 결정 절차 적용.
6. service_credentials 와 service_memberships 의 service-scoped 특성을 UI 에서도 보존.
```

---

## 5. 현재 정합 상태 (2026-05-24 기준)

| 영역 | 정합 상태 | 근거 |
|---|:---:|---|
| 4 service `/mypage` (KPA / GP / K-Cos / Neture) | ✅ Option D 와 일치 | 현재 구현 |
| 4 service `/mypage/settings` 의 비밀번호 변경 | ✅ V2 Phase 2 적용 (`serviceKey` 명시) | `WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1` |
| 4 service `/mypage/profile` 의 프로필 수정 | ✅ `PUT /users/profile` 직접 호출 | 현재 구현 |
| web-account 코드 | ✅ 최소 계정센터 형태 (서비스 목록 + Handoff) | 현재 구현 |
| web-account 배포 | ⏭ 미배포 (별건 IR) | placeholder revision (2026-03-13) |
| 4 service → web-account 진입 링크 | ⏭ 0 건 (별건) | 본 baseline 범위 외 |

→ **현재 구현이 본 baseline 과 100% 정합.** baseline 채택으로 인한 즉시 코드 변경 없음.

---

## 6. Identity V2 정합성

| 차원 | Option D 적용 시 |
|---|:---:|
| L1 (Identity) 분리 정합 | ✅ |
| L2 (Credential) service-scoped 정합 | ✅ |
| L3 (Membership) service-scoped 정합 | ✅ |
| L4 (Role) service-scoped 정합 | ✅ |
| 본인 view 와 운영자 view 분리 | ✅ |
| 독립 사업자 원칙 (`O4O-BUSINESS-PHILOSOPHY-V1` §3) | ✅ |
| F6 Boundary Policy (운영자 cross-service 제한 vs 본인 통합 view 허용) | ✅ |

→ 충돌 0 건.

---

## 7. 본 baseline 의 범위 / 비범위

### ✅ 본 baseline 이 결정함

- 계정 관리 UI 의 canonical 위치 (§2)
- web-account 의 허용 / 금지 기능 (§3)
- Drift 방지 원칙 (§4)
- 새 기능 추가 시 결정 절차 (§3.3)

### ⏭ 본 baseline 이 결정하지 않음 (별건)

- web-account 의 실제 배포 시점 → `IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` (제안)
- 4 service user dropdown 에 web-account 진입 링크 추가 → web-account 배포 결정 후 별건 WO
- 탈퇴 / 계정 중지 UX 의 canonical 위치 → 미구현, 향후 별건
- 통합 알림 설정 / 보안 / 2FA → 미구현, 향후 별건
- `@o4o/account-ui` 공통 패키지 확장 → Operator Core Design 영역
- backend API (`/users/profile`, `/users/password`) 의 변경 → Identity V2 Phase 3+ 의 책임

---

## 8. 본 baseline 변경 시 절차

본 baseline 의 §1 (결정), §2 (매트릭스), §3 (허용/금지), §4 (원칙) 변경은:

1. 별도 IR 로 변경 사유 + 영향 분석 작성
2. Identity V2 architecture 와의 정합 재확인
3. WO 로 본 baseline 갱신 (V1 → V2 등 버전 증가)
4. 영향받는 frontend 코드 정렬 WO 별도 진행

**§3.2 의 금지 기능 중 어느 하나라도 web-account 에 추가하려면 본 절차를 거쳐야 한다.** 예외 없이.

---

## 부록 — 참조

- 결정 근거 IR: [IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1](../investigations/IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md)
- 위치 규정 CHECK: [CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1](../investigations/CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1.md)
- Identity V2: [O4O-IDENTITY-ARCHITECTURE-V2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md)
- Handoff 정책: [IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1](../investigations/IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md)
- Boundary Policy: `docs/architecture/O4O-BOUNDARY-POLICY-V1.md`
- 사업 철학: [O4O-BUSINESS-PHILOSOPHY-V1](O4O-BUSINESS-PHILOSOPHY-V1.md)
- web-account 위치 규정 (memory): `web-account 는 legacy 가 아니라 각 서비스에서 진입하는 계정센터`

---

*Version: V1 (2026-05-24)*
*Status: Baseline (Locked) — 변경 시 §8 절차 필수*
*Next: 본 baseline 채택 후 코드 변경 0. web-account 배포 결정은 별건 IR.*
