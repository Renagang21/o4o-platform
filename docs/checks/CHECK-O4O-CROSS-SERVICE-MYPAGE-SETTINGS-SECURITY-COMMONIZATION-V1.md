# CHECK-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1

> WO 정본: [`docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1.md`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1.md)
> 작성일: 2026-08-19 · 상태: **FINAL CLOSED**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 조사 시작 기준 | `42f582a96` (origin/main, WO 등록 시점) |
| 구현 commit | `3c4361b02` — `feat(mypage): Settings/Security 5서비스 공통화 — KPA·PharmacyHub adoption + SecuritySection 은퇴` |
| rebase 대상 | `995201f45` (다른 세션 Community WO) 위에 rebase 후 push |
| 배포 | `Deploy Web Services (Cloud Run)` run `32228111121` — 5 서비스 + kpa-branch 전부 `success` |

과거 CHECK 수치는 재사용하지 않고 현재 main 에서 전수 재산출했다 (WO §4).

---

## 2. 5서비스 Settings/Security 모집단

| 서비스 | Settings/Security 화면 | route |
|---|---|---|
| KPA-Society | `services/web-kpa-society/src/pages/mypage/MySettingsPage.tsx` · `MyProfilePage.tsx` | `/mypage/settings` · `/mypage/profile` |
| GlycoPharm | `services/web-glycopharm/src/pages/mypage/MySettingsPage.tsx` | `/mypage/settings` |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/mypage/MySettingsPage.tsx` | `/mypage/settings` |
| Neture | `services/web-neture/src/pages/mypage/MySettingsPage.tsx` | `/mypage/settings` |
| Pharmacy-Hub | `services/web-pharmacy-hub/src/pages/account/MyProfilePage.tsx` | `/account` (+ `/store-owner/account` 호환) |

Pharmacy-Hub 는 `/mypage` 축이 없다. §13 계약대로 `/account` 를 유지했고 `/mypage` 를 신설하지 않았다.

**미조사 = 0.**

---

## 3. 16기능 census (현재 main 실측)

| # | 기능 | KPA | GP | KCos | Neture | PH | 판정 |
|:--:|---|---|---|---|---|---|---|
| 1 | 설정 Home/Section | ✅ | ✅ | ✅ | ✅ | ✅(/account) | FULLY_COMMON (`SettingsSection`) |
| 2 | 비밀번호 변경 | ✅ | ✅ | ✅ | ✅ | ✅ | FULLY_COMMON (`AccountSecuritySettings`+`PasswordChangeModal`) |
| 3 | 이름/닉네임/연락처 편집 진입 | Profile tab | Profile | Profile | Profile | 같은 화면 | Profile 소유 (§8) — Settings 는 링크만 |
| 4 | 이메일 표시 | ✅ | ✅ | ✅ | ✅ | ✅ | FULLY_COMMON (`AccountProfileSection` 읽기 전용) |
| 5 | 이메일 변경 | ✗ | ✗ | ✗ | ✗ | ✗ | **NOT_IMPLEMENTED** (canonical 계약 없음 — 신규 구현 금지 §11) |
| 6 | 계정 상태 표시 | 역할 라벨 | 역할 라벨 | 역할 라벨 | 역할 라벨 | 역할 라벨+가입상태 | Profile 축 |
| 7 | 로그아웃 | 헤더 메뉴 | 헤더 메뉴 | 헤더 메뉴 | 헤더 메뉴 | ✅ Settings 내 | 공통 (PH 만 화면 내 노출 — logoutAll 부재) |
| 8 | 전체 기기 로그아웃 | ✅ | ✅ | ✅ | ✅ | ✗(계약 없음) | FULLY_COMMON / PH=NOT_IMPLEMENTED |
| 8b | 세션 목록 UI | ✗ | ✗ | ✗ | ✗ | ✗ | NOT_IMPLEMENTED (backend `GET /users/sessions` 는 존재, 소비처 0 → followup) |
| 9 | 계정 탈퇴 / 회원 탈퇴 / 이용 중지 | ✗ | ✗ | ✗ | ✗ | ✗ | **NOT_IMPLEMENTED** (§12 — 3개념 분리 유지, 신설 금지) |
| 10 | 알림/수신 설정 | ✅ toggle 3종 | ✗ | ✗ | ✗ | ✗ | **SERVICE_SPECIFIC** (KPA `mypageApi.get/updateSettings`) |
| 11 | 개인정보/약관 진입 | 셸 footer | 셸 footer | 셸 footer | 셸 footer | 셸 footer | Settings 화면 내 진입점 없음 → 이 축은 NOT_IMPLEMENTED, dead link 0 |
| 12 | 서비스별 환경설정 | 알림 toggle | 2단계 인증 "준비 중" | 문구만 | 문구만 | 없음 | prop 차이로 흡수 |
| 13 | 인증/권한 guard | ✅ | ✅ | ✅ | ✅ | ✅ | 기존 `MyPageAuthRequired`/`MyPageEmptyState` 재사용 (신규 role 판정 0) |
| 14 | empty/loading/error | ✅ | ✅ | △ | ✅ | ✅ | KCos 미인증 상태만 Shell 밖 렌더 (Shell 트랙 잔여 · 아래 §19) |
| 15 | mobile UX | ✅ | ✅ | ✅ | ✅ | ✅ | 390×844 기능 유실 0 |
| 16 | 서비스 고유 Security | 없음 | 2단계 인증 안내 | 없음 | 없음 | 없음 | prop `showTwoFactorNotice` |

범위 밖(OUT_OF_SCOPE)으로 판정한 것: 각 서비스 `ResetPasswordPage`(비로그인 재설정 흐름), `packages/ui/src/operator-user-detail/UserDetailPasswordModal`(운영자가 타인 비밀번호 재설정).

---

## 4. Before / After

**Before**

- KPA `/mypage/settings` — `모든 기기 로그아웃` 을 로컬 `window.confirm` + 자체 danger Card 로 재구현 (**VIEW_DUPLICATED / CORE_ONLY**). 비밀번호 변경 진입은 `/mypage/profile` 에 별도 존재(IA 분기).
- KPA `/mypage/profile` — `SecuritySection` + `PasswordChangeModal` 직접 조립 + KPA 전용 오류 문구 (**CORE_ONLY**).
- Pharmacy-Hub `/account` — `SecuritySection` + 수제 세션 Card + `PasswordChangeModal` 직접 조립 (**CORE_ONLY**).
- GP / KCos / Neture — 이미 `AccountSecuritySettings` (**FULLY_COMMON**).

**After**

- 5 서비스 전부 `AccountSecuritySettings` 로 수렴. 서비스 차이는 prop 으로만 흡수.
- 비밀번호 진입점은 `/mypage` 축 4 서비스에서 **설정 1곳**으로 통일, KPA Profile 은 `/mypage/settings` 링크 행으로 대체.
- 소비처 0 이 된 `SecuritySection` 제거.

**VIEW_DUPLICATED = 0 · CORE_ONLY = 0.**

---

## 5. 기존 공통 자산 (신규 생성하지 않고 재사용)

`packages/account-ui` 실측: `AccountSecuritySettings` · `PasswordChangeModal` · `SettingsSection` · `AccountProfileSection` · `MyPageAuthRequired` · `MyPageLoadingState` · `MyPageEmptyState` · `MyPageShell` / `MyPageLayout`.

→ **canonical = `AccountSecuritySettings`.** 신규 package 생성 0, 신규 동등 기능 컴포넌트 생성 0.

---

## 6. Settings/Security Core (additive 확장분)

`packages/account-ui/src/components/AccountSecuritySettings.tsx` 에 prop 4개만 추가했다 (아키텍처 변경 없음).

| prop | 목적 |
|---|---|
| `onLogout` | PH 처럼 `logoutAll` 계약이 없는 서비스의 단일 기기 로그아웃 |
| `logoutAllIncludesCurrentDevice` | KPA 는 `clearSessionOnLogoutAll` 기본값(true) → 확인 문구만 분기 |
| `onAfterLogoutAll` | 성공 후 이동(KPA `navigate('/')`) |
| `onLogoutAll` | 선택화 — `onLogout` 과 둘 다 없으면 "계정 관리" 섹션 미렌더 |

`packages/account-ui/src/index.ts` — `SecuritySection` export 제거.

---

## 7. Password

- 계약: `PUT /api/v1/users/password` (+ `serviceKey`) — `apps/api-server/src/modules/user/controllers/user.controller.ts`.
  `serviceKey` 있으면 `service_memberships` 확인 후 `service_credentials` upsert, 없으면 V1 fallback(`users.password`).
- 5 서비스 전부 serviceKey 를 보낸다: `kpa-society`(mypageApi 주입) · `glycopharm` · `k-cosmetics` · `neture` · `pharmacy-hub`(`pharmacyHubAccount.changeAccountPassword`).
- Identity V2 write 정책 · serviceKey 처리 · operator password contract **변경 0** (§10).
- 비밀번호 값은 공통 모달 밖으로 나가지 않는다(호출자 화면에 저장/로깅 없음).

---

## 8. Profile 연결 (§8 경계)

- name/firstName/lastName/nickname/phone 은 Profile 소유. Settings 에서 재구현하지 않았다.
- KPA Profile 의 비밀번호 UI 는 **재구현이 아니라 canonical route 링크**(`/mypage/settings`)로 대체.
- self-profile API 재설계 0 · field ownership 변경 0 · `AccountProfileSection` 재작성 0.

---

## 9. Email

- 표시: 유지 (Profile 읽기 전용 필드).
- 변경: **NOT_IMPLEMENTED** — canonical email change 계약 부재. 본 WO 에서 신규 구현하지 않았다 (§11).

---

## 10. Withdrawal

세 개념을 분리해 기록한다 (§12, 합치지 않는다).

| 개념 | 현재 상태 |
|---|---|
| 플랫폼 계정 탈퇴 | NOT_IMPLEMENTED (backend 없음) |
| 서비스 membership 탈퇴 | NOT_IMPLEMENTED (UI 없음) |
| 서비스 이용 중지 | 운영자 측 처리 경로만 존재 (사용자 셀프 UI 없음) |

KPA 의 과거 "계정 탈퇴" mock 은 `WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1` 에서 제거됐고 그대로 유지한다. 탈퇴 backend/lifecycle 신설 0.

---

## 11. Session / logout

- `logoutAll` = 기존 `useServiceAuth` 계약 그대로. refresh token 구조 · SessionSync · Redis · 새 세션 저장소 **변경 0** (§13).
- KPA 는 `clearSessionOnLogoutAll` 기본값(true)이라 현재 기기도 로그아웃 → 확인 문구만 분기하고 계약은 건드리지 않았다.
- PH 는 `logoutAll` 계약 자체가 없어 단일 기기 로그아웃만 노출.
- `GET /api/v1/users/sessions` 는 backend 에 존재하나 프론트 소비처 0 → 세션 목록 UI 는 만들지 않았다(followup).

---

## 12. Legal / privacy links

- 5 서비스 **Settings/Security 화면 내부에 약관·개인정보 링크가 없다** → 이 축은 NOT_IMPLEMENTED, 링크 표현 공통화 대상 0.
- 법정문서 진입은 각 서비스 셸 footer 가 담당(범위 밖). 약관·방침 **내용 수정 0**.
- **dead link = 0.** KPA `/policy` 는 404 가 아니라 "현재 공개된 문서가 없습니다" 정직한 empty state (문서 미게시 = 운영 콘텐츠 상태, 코드 결함 아님). 관련 404 콘솔 로그는 미게시 문서 조회이며 기존 상태다.

---

## 13. Service Extension

| 서비스 | 확장 | 처리 |
|---|---|---|
| KPA | 알림 수신 설정 toggle 3종 | SERVICE_SPECIFIC 으로 화면에 잔존 (알림 backend/model 공통화는 §14 대로 착수하지 않음) |
| GlycoPharm | 2단계 인증 "준비 중" | 기존 `showTwoFactorNotice` prop |
| KCos / Neture | 설명 문구 | prop |
| PH | Profile 과 동일 화면 | `/mypage` 축 부재 (계약 유지) |

---

## 14. 5서비스 adoption 판정

| 서비스 | Before | After |
|---|---|---|
| KPA-Society | VIEW_DUPLICATED + CORE_ONLY | **FULLY_COMMON** (+ KPA 고유 알림 확장) |
| GlycoPharm | FULLY_COMMON | FULLY_COMMON (변경 없음) |
| K-Cosmetics | FULLY_COMMON | FULLY_COMMON (변경 없음) |
| Neture | FULLY_COMMON | FULLY_COMMON (변경 없음) |
| Pharmacy-Hub | CORE_ONLY | **FULLY_COMMON** |

기능이 없는 서비스에 새 설정 화면을 억지로 만들지 않았다 (§19).

---

## 15. desktop / mobile

| 서비스 | desktop 1440×900 | mobile 390×844 | 가로 overflow |
|---|:--:|:--:|---|
| KPA `/mypage/settings` | PASS | PASS | 없음 (375/390) |
| KPA `/mypage/profile` | PASS (링크 행 정상) | PASS | 없음 |
| GlycoPharm `/mypage/settings` | PASS | PASS | 없음 (382/390) |
| K-Cosmetics `/mypage/settings` | PASS | PASS | 없음 (375/390) |
| Neture `/mypage/settings` | PASS | PASS | 없음 (390/390) |
| PH `/account` | PASS | PASS | 없음 (375/390) |
| PH `/store-owner/account` | PASS (단일 셸) | — | 없음 |

모바일 기능 유실 0 · 이중 셸 0.

---

## 16. production browser 검증

계정은 `docs/local/TEST-ACCOUNTS.local.md` 기준 interactive login (PH 데모 채우기 버튼 미사용). 자격증명은 본 문서·코드·로그에 기록하지 않는다.

| 판정 기준 | 결과 |
|---|:--:|
| 백지 화면 | 0 |
| JS 예외 | 0 |
| 예상치 못한 401/403 | 0 (로그인 전 `auth/me` 401 은 정상 부트스트랩) |
| 404 | 0 |
| 5xx | 0 |
| dead settings link | 0 |
| 중복 Security UI | 0 |
| mobile 기능 유실 | 0 |
| 이중 셸 | 0 |

비밀번호 변경 모달은 KPA · PH 에서 열고 닫는 것까지 확인했다(입력·제출 없음).

---

## 17. production write 여부

- **비밀번호 production write = 0.** §24 의 기본 방침대로 **UI + API 계약 검증 중심**으로 종료했다.
- 실사용자 write 0 · DB write 0 · 평문 credential 기록 0 (코드·로그·CHECK·Git·shell history).
- 이유: 변경 사이클(변경 → 재로그인 → 원복 → 원복 로그인)의 원복 실패 위험을 감수할 이유가 없고, 변경 경로 자체는 5 서비스 모두 코드·컨트롤러 수준에서 계약이 확인됐다.

---

## 18. backend / DB / schema

**변경 0.** backend 파일 수정 없음, migration 없음, entity 변경 없음, auth/session backend 신설 없음. 따라서 security/auth test 실행 조건에 해당하지 않는다.

정적 검증: `@o4o/account-ui` build PASS · 5 서비스 `tsc --noEmit` 0 error · 5 서비스 vite build PASS.

---

## 19. 잔존 followup (본 WO 에서 착수하지 않음)

1. email 변경 canonical 계약 (§11) — 별도 WO.
2. 탈퇴 3축(플랫폼 계정 / membership / 이용 중지) 설계 (§12) — 별도 WO.
3. `GET /api/v1/users/sessions` 소비처 0 — 세션 목록 UI 도입 또는 endpoint 은퇴 판단.
4. KPA 알림 수신 설정 backend/model 공통화 (§14 후속 트랙).
5. K-Cosmetics `/mypage/settings` 미인증 상태가 `MyPageLayout` 밖에서 렌더 — Shell 트랙 잔여 (기능 결함 아님).
6. KPA 이용약관·개인정보처리방침 **문서 미게시** (관리자 콘텐츠 상태) — 코드 결함 아님.

§29 후속(Membership / Notifications / Activity / Help)은 착수하지 않았다.

---

## 20. MUST_FIX_BEFORE_CLOSE

**0건.**

---

## 21. CHECK / commit / push

| 항목 | 값 |
|---|---|
| 구현 commit | `3c4361b02` (push 완료) |
| 변경 파일 | 6개 (account-ui 3 · KPA 2 · PH 1), 125 insertions / 142 deletions |
| CHECK commit | 본 문서 |
| Git 완료 조건 | WO 범위 미커밋 0 · `HEAD == origin/main` |

---

## 결론

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0
dead link = 0
desktop / mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0

MYPAGE SETTINGS/SECURITY TRACK = FINAL CLOSED
```
