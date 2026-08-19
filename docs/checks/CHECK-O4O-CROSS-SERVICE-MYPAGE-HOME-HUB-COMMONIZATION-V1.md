# CHECK-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1

> **WO**: [`docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1.md`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1.md)
> **작성일**: 2026-08-19 · **상태**: ACTIVE (완료 기록)
> **선행 CLOSED 트랙**: PROFILE TRACK · MYPAGE SHELL/LAYOUT TRACK

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| WO 기준 commit | `0ab13af9d` |
| 작업 중 origin/main 선행 | `34ff7b05f` (rebase 로 흡수, force-push 없음) |
| 구현 commit | `86c71b834` — feat(mypage): My Page Home/Hub 공통 진입면 확정 |
| 배포 CI run | `32219612757` — `Deploy Web Services (Cloud Run)` · conclusion **success** (detect-changes + 5 web 서비스 + kpa-branch + summary 전 job success) |

---

## 2. 5서비스 Home/Hub route/page census (현재 main 재산출)

| 서비스 | 개인영역 첫 진입 route | source page | Shell |
|---|---|---|---|
| KPA-Society | `/mypage` | `services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx` | `layouts/MyPageLayout.tsx` → 공통 `MyPageShell` |
| GlycoPharm | `/mypage` | `services/web-glycopharm/src/pages/mypage/MyPageHub.tsx` | 공통 `MyPageShell` |
| K-Cosmetics | `/mypage` | `services/web-k-cosmetics/src/pages/mypage/MyPageHub.tsx` | 공통 `MyPageShell` |
| Neture | `/mypage` | `services/web-neture/src/pages/mypage/MyPageHub.tsx` | 공통 `MyPageShell` |
| Pharmacy-Hub | `/account` (+ `/store-owner/account`) | `services/web-pharmacy-hub/src/pages/account/MyProfilePage.tsx` | 공통 `MyPageShell` |

- PH 는 Home/Hub 화면이 존재하지 않고 `/account` 첫 화면이 곧 Profile 이다. WO §11 이 `/mypage` 신설·route 강제 통일·불필요한 Dashboard 신설을 금지하므로 **신설하지 않았다**.

---

## 3. 12기능 census

판정 어휘: `FULLY_COMMON` / `CORE_ONLY` / `VIEW_DUPLICATED` / `SERVICE_SPECIFIC` / `NOT_IMPLEMENTED` / `OUT_OF_SCOPE`

| # | 기능 | KPA | GP | KCos | Neture | PH | After 판정 |
|---|---|---|---|---|---|---|---|
| 1 | 사용자 요약 | 손수 구현 → `MyPageUserSummary` | 공통 | 공통 | 공통 | 공통(Profile Core 카드) | **FULLY_COMMON** |
| 2 | 내 프로필 진입 | 공통 카드 + 요약 액션 | 공통 | 공통 | 공통 | 자기 자신(현재 화면) | **FULLY_COMMON** |
| 3 | 설정 / 보안 진입 | `/mypage/settings` | 동 | 동 | 동 | `보안 설정` 섹션(공통 Profile Core) | **FULLY_COMMON** |
| 4 | 가입·승인 상태 | 미표시 | `MyPageUserSummary` 배지(승인됨) | 배지 | 배지 | `가입 상태` nav → `/join/status` | **FULLY_COMMON** (표시 구조) |
| 5 | 내 요청·신청내역 진입 | 카드 | 카드 | 카드 | NOT_IMPLEMENTED | NOT_IMPLEMENTED | **FULLY_COMMON** (`MyPageEntryCardGrid`) |
| 6 | 내 활동 / 이력 | 손수 카드 → `MyPageActivityFeed` | 없음 | 없음 | 손수 카드 → `MyPageActivityFeed` | 없음 | **FULLY_COMMON** |
| 6-a | 감사 활동 | inline style 사본 | Tailwind 사본 | Tailwind 사본 | 없음 | 없음 | **FULLY_COMMON** (`MyPageAppreciationCard`) |
| 7 | 알림 | 글로벌 헤더 `NotificationBell` | 동 | 동 | 동 | 동 | **OUT_OF_SCOPE** (Home 면 밖 · WO §12) |
| 8 | 주요 업무 바로가기 | 손수 grid → `MyPageEntryCardGrid` | 공통 | 공통 | 공통 | 없음 | **FULLY_COMMON** |
| 9 | 매장/사업자/공급자 영역 진입 | 헤더 `내 약국`·`약국 운영 허브` | `QuickActionsSection` | `대시보드로 이동` | `공급자 대시보드`(role gate) | 헤더 `내 약국`·`매장 허브` | **SERVICE_SPECIFIC** (Extension slot) |
| 10 | 회원 / 역할 상태 | `RoleBadgeGroup`(분회+역할) | `RoleBadgeGroup` | `RoleBadge` | `RoleBadgeGroup` | 역할 배지 | **FULLY_COMMON** |
| 11 | 도움말 / 문의 | footer | footer | footer | footer | footer | **OUT_OF_SCOPE** (Home 면 밖) |
| 12 | 서비스별 고유 Home 기능 | 학습·포럼 통계 타일 5종 | — | — | 사업자 정보 | 가입 상태 | **SERVICE_SPECIFIC** (정당) |

```text
미조사          = 0
VIEW_DUPLICATED = 0
CORE_ONLY       = 0
```

---

## 4. Before / After

**Before** — Home/Hub 면에 남아 있던 중복 4건

1. 감사 활동 카드 3벌 (KPA inline style · GP Tailwind · KCos Tailwind)
2. 최근 활동 카드 2벌 (KPA · Neture)
3. KPA 손수 만든 사용자 요약 블록 — 공통 `MyPageUserSummary` 미사용 (5서비스 중 유일)
4. KPA 손수 만든 바로가기 grid — 공통 `MyPageEntryCardGrid` 미사용 (유일)

**After**

- 1 → `MyPageAppreciationCard` (신규, `@o4o/account-ui`)
- 2 → `MyPageActivityFeed` (신규, `@o4o/account-ui`)
- 3 → `MyPageShell` 의 `userSummary` slot + 공통 `MyPageUserSummary`
- 4 → 공통 `MyPageEntryCardGrid` (6 카드)
- `MyDashboardPage.tsx` 699줄 → 약 300줄. 죽은 `aStyles` 전체와 `trial*` style 제거.

---

## 5. 공통 Home/Hub Core

신규 UI package 생성 없음 (web-kpa Dockerfile 선별 COPY 위험 회피). `@o4o/account-ui` 안에만 2개 추가.

| 컴포넌트 | 경로 | 역할 |
|---|---|---|
| `MyPageActivityFeed` | `packages/account-ui/src/components/MyPageActivityFeed.tsx` | 최근 활동 카드 표현 구조 |
| `MyPageAppreciationCard` | `packages/account-ui/src/components/MyPageAppreciationCard.tsx` | 감사 활동 카드 표현 구조 |

export 는 `packages/account-ui/src/index.ts` 에 WO 주석과 함께 추가.

**Core 원칙(§6) 준수 확인**

- serviceKey / 서비스명 if·switch: 0
- role 문자열 직접 비교: 0 (Core 안에 없음 — 역할 판정은 서비스 코드에 잔류)
- 서비스별 route 하드코딩: 0 (`href` 는 전부 props)
- 서비스별 lifecycle 판정: 0
- 데이터 조회·모델 재정의: 0 (두 컴포넌트 모두 순수 표시. 합계·목록 계산은 호출부. 서비스마다 appreciation 응답 형태가 달라 파싱을 Core 로 끌어올리지 않았다)

---

## 6. UserSummary

- 5서비스 전부 `MyPageUserSummary` 사용 (PH 는 Profile Core 의 동등 카드).
- KPA 는 `MyPageShell.userSummary` slot 으로 주입. 아바타 `👤`, 이름은 공통 `getUserDisplayName(user)`, 액션 `프로필 수정` → `/mypage/profile`.
- 역할/소속 표기는 `RoleBadgeGroup` (KPA: 소속 분회 배지 + 역할 배지).

---

## 7. Entry / Action

- 진입 카드는 5서비스 모두 `MyPageEntryCardGrid` → `MyPageHubCard`.
- KPA `columns={3}` · 6 카드: 프로필 / 내 포럼 / 학습 결과 / 내 자격 / 내 신청 / 설정.
- GP 4 카드 · KCos 4 카드 · Neture 4 카드(프로필/포럼/사업자 정보/설정).
- Primary Action(업무 대시보드 이동 · 로그아웃)은 기존 `QuickActionsSection` 유지 — 새 개념을 만들지 않았다.
- **dead link 0** — 모든 nav item·카드 대상 route 가 각 서비스 `App.tsx` 에 실재함을 정적 확인 + 프로덕션 브라우저로 재확인.

---

## 8. Status 표시

- WO §9 준수: 서비스별 status 값을 하나의 enum 으로 재설계하지 **않았다**.
- 표시 구조만 기존 자산으로 수렴 — `MyPageShell.statusNotice` slot + `MyPageUserSummary` 내 배지.
- 별도 `StatusSummary` 컴포넌트를 새로 만들지 않았다 (실 소비처 부족 · §10/§15 과공통화 금지).

---

## 9. Service Extension

| 서비스 | Extension | 게이트 |
|---|---|---|
| KPA | 학습·포럼 통계 타일 5종 (수강 중 / 수료 / 수료증 / 작성 글 / 이벤트) | 없음 (전 회원) |
| GP | 상태 배지 · 매장 진입 | 기존 role SSOT |
| KCos | `대시보드로 이동` → `/store` | 기존 role SSOT |
| Neture | `사업자 정보` nav·카드 + `공급자 대시보드` | `SUPPLIER_ONLY_ROLES` (`services/web-neture/src/lib/role-constants`) — 신규 SSOT 만들지 않음 |
| PH | `가입 상태` → `/join/status` | 기존 계약 유지 |

- 신규 role/capability SSOT 생성 0.
- 비공급자에 대한 Neture 공급자 기능 노출 0 (기존 게이트 불변).

---

## 10. 5서비스 adoption

| 서비스 | 판정 | 근거 |
|---|---|---|
| KPA-Society | **ADOPTED** | UserSummary + EntryCardGrid + ActivityFeed + AppreciationCard 전부 공통 전환 |
| GlycoPharm | **ADOPTED** | AppreciationCard 공통 전환 (나머지는 이미 공통) |
| K-Cosmetics | **ADOPTED** | AppreciationCard 공통 전환 |
| Neture | **ADOPTED** | ActivityFeed 공통 전환 |
| Pharmacy-Hub | **SERVICE_SPECIFIC (정당)** | Home/Hub 화면 자체가 없고 `/account` 첫 화면 = Profile. WO §11 이 `/mypage` 신설·Dashboard 신설을 금지. 이미 `MyPageShell` + `PHARMACY_HUB_ACCOUNT_NAV_ITEMS` 위에 있음 |

---

## 11. desktop / mobile

- 검증 뷰포트: desktop **1440×900**, mobile **390×844**.
- 5서비스 × 2 뷰포트 = 10 케이스 전부 실브라우저 확인.
- 모바일 기능 진입 소실 0 — nav 항목 수가 desktop 과 동일 (KPA 9 / GP 7 / KCos 7 / Neture 3~4(공급자 4) / PH 2).
- double shell 0.
- `MyPageActivityFeed` 는 좁은 폭에서 meta 가 제목을 밀지 않도록 flex 배치를 사용.

---

## 12. production browser 검증

계정은 `docs/local/TEST-ACCOUNTS.local.md` 기준. **본 문서에 자격증명을 남기지 않는다.**

| 서비스 | URL | desktop | mobile | 비고 |
|---|---|:---:|:---:|---|
| KPA-Society | `https://kpa-society.co.kr/mypage` | PASS | PASS | Home → Profile → Settings → 뒤로가기 → 새로고침 전부 정상. `MyPageAppreciationCard` 는 합계 0 + `hideWhenEmpty` 로 미표시 = 기존 동작 보존 |
| GlycoPharm | `https://glycopharm.co.kr/mypage` | PASS | PASS | 감사 활동 카드 공통 빈 상태 렌더 |
| K-Cosmetics | `https://k-cosmetics.site/mypage` | PASS | PASS | 정본 도메인 `k-cosmetics.site` 사용 (`k-cosmetics.co.kr` 미사용) |
| Neture | `https://neture.co.kr/mypage` | PASS | PASS | 공급자 계정 — `최근 활동` 공통 카드 + 공급자 Extension 정상 |
| Pharmacy-Hub | `https://pharmacyhub.co.kr/account` | PASS | PASS | 데모 계정 버튼(stale 401) 미사용, interactive login |

§18 합격 기준 실측:

```text
백지 화면            = 0
JS exception         = 0
의도치 않은 401/403  = 0   (비로그인 상태의 /auth/me · /auth/refresh 401 은 정상 bootstrap)
404                  = 0
5xx                  = 0
dead card/link       = 0
navigation loop      = 0
잘못된 role 노출     = 0
mobile 진입 소실     = 0
double shell         = 0
```

- KPA 로그인 후 네트워크 전량 200 (`/kpa/me-context`, `/kpa/mypage/summary`, `/kpa/mypage/activities`, `/appreciation/my-received`, `/appreciation/my-sent`, `/kpa/credits/me`, `/notifications/unread-count`).
- Neture 비로그인 시 `MyPageAuthRequired` 정상 표시 = 의도된 guard (결함 아님).

---

## 13. backend / DB / schema 변경 여부

```text
신규 API             = 0
role contract 변경   = 0
membership 정책 변경 = 0
DB schema/migration  = 0
Identity 변경        = 0
```

frontend-only. WO §13 blocker 사유 발생 없음.

---

## 14. 잔존 후속 기능

WO §22 대로 **착수하지 않았다** (후속 WO 후보):

```text
Requests / 신청·승인 내역
Settings / Security
Membership / 회원·역할 상태
Notifications
Activity / 이력 (데이터 계약 자체)
Help / 문의
```

- Neture 는 개인 활동 원장 API 계약이 아직 없어 `MyPageActivityFeed items={[]}` 로 빈 상태만 렌더한다. 계약 신설은 WO §12/§13 범위 밖.

---

## 15. MUST_FIX_BEFORE_CLOSE

```text
0 건
```

---

## 16. CHECK / commit / push

| 항목 | 값 |
|---|---|
| 구현 commit | `86c71b834` (7 files, +432 / −571) |
| 배포 | CI run `32219612757` success |
| CHECK commit | 본 문서 (path-specific stage) |
| 완료 조건 | WO 범위 미커밋 0건 · `HEAD == origin/main` |

**최종 판정**

```text
MYPAGE HOME/HUB TRACK = FINAL CLOSED
```
