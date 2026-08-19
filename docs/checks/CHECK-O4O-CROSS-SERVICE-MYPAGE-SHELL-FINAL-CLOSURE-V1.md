# CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1

> **WO**: [`WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1.md)
> **선행 CHECK**: [`CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1`](CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1.md) (`PASS_WITH_OPEN`)
> **판정**: **MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED**
> **작성일**: 2026-08-19

---

## 1. 기준 commit / deployed revision

| 항목 | 값 |
|---|---|
| WO commit | `6b41a8f85` |
| 시작 시점 `origin/main` | `6b41a8f85` → 작업 중 `c4ee67595` 로 진행 (다세션) |
| 구현 commit | `8bdd84396` (GP 3페이지 navigation adoption) |
| 배포 workflow | `Deploy Web Services (Cloud Run)` run `32210691199` — **success** |
| 배포 대상 | `deploy-glycopharm: success` (나머지 5 서비스 skipped — 변경 없음) |
| PH 검증 대상 | 기존 배포본 (이번 WO 에서 PH 코드 변경 0) |

---

## 2. OPEN-A 결과 — PharmacyHub 인증 화면 browser 검증

**CLOSED.**

- WO §4 판단: 시작 시점 `git status` / `git diff --cached --name-only` 모두 비어 있고 병행 세션 GP 변경은 `ed7d6ed17` 로 main 반영 완료 → **§4-A 경로** 적용.
- 로그인 수단: PH 로그인 화면의 **데모 계정 채우기 버튼을 사용하지 않고**(stale password → 401), `docs/local/TEST-ACCOUNTS.local.md` 의 `pharmacy-hub:store_owner` 계정으로 브라우저 interactive 로그인. 자격증명은 코드·스크립트·CHECK·Git·shell history 어디에도 남기지 않았다.
- `EXTERNAL_BLOCKER` 없음 — 정상 로그인 성공.

---

## 3. OPEN-B 결과 — GlycoPharm 3페이지 navigation adoption

**CLOSED.**

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/pages/mypage/MyCertificatesPage.tsx` | `navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}` 주입 + 미인증 분기를 Shell 안에서 렌더 |
| `services/web-glycopharm/src/pages/mypage/MyCreditsPage.tsx` | 동일 |
| `services/web-glycopharm/src/pages/mypage/MyEnrollmentsPage.tsx` | 동일 |

- nav config 는 선행 WO 가 만든 `pages/mypage/navItems.ts` 를 그대로 소비 — 새 config·새 route·새 기능 없음.
- 본문 View(`MyCertificatesView` / `MyCreditsView` / `MyEnrollmentsView`) 는 무변경.
- nav 7 항목의 path 가 `App.tsx` 의 실제 route 7개(`mypage`, `/profile`, `/enrollments`, `/my-requests`, `/certificates`, `/credits`, `/settings`)와 1:1 일치 — **dead nav 0**.

---

## 4. GP 3페이지 production browser

기준 URL: `https://glycopharm.co.kr` · 계정 = GlycoPharm 약국 (store_owner)

| 경로 | Shell | navigation | 활성 표시 | 본문 | 판정 |
|---|:---:|:---:|:---:|---|:---:|
| `/mypage/certificates` | 단일 | 7항목 표시 | `학습 결과` | "완료한 강의가 없습니다" + 강의 둘러보기 | PASS |
| `/mypage/credits` | 단일 | 7항목 표시 | `크레딧` | 보유 230 C + 적립내역 2건 | PASS |
| `/mypage/enrollments` | 단일 | 7항목 표시 | `내 수강` | 상태 필터 5개 + empty state | PASS |

- nav 링크 실클릭 회귀: `/mypage/credits` → `설정` 클릭 → `/mypage/settings` SPA 전환 정상(전체 리로드 없음).
- 이중 shell 0 / header·본문 회귀 0.

---

## 5. PH 2경로 authenticated browser

기준 URL: `https://pharmacyhub.co.kr`

| 경로 | 결과 |
|---|---|
| `/account` | `MyPageShell` 렌더 — 제목 `내 프로필` + `마이페이지` navigation(`내 프로필` 활성 / `가입 상태`) + 프로필 카드 + 보안 설정 + 세션. 이중 shell 없음. 새로고침(full navigation) 후 동일. **PASS** |
| `/store-owner/account` | URL 유지. 매장 셸(사이드바 `설정 › 내 계정` 활성) 안에서 thin wrapper 로 동일 프로필 본문 렌더. **공통 My Page Shell 이 이중으로 씌워지지 않음**(navigation 중복 없음). 알림 벨 유지. **PASS** |

- 두 경로를 강제 redirect 로 합치거나 compatibility 계약을 제거하지 않았다(WO §8 준수).

---

## 6. desktop / mobile

| 대상 | desktop 1440×900 | mobile 390×844 |
|---|:---:|:---:|
| GP `/mypage/certificates` | PASS | PASS (nav 가로 스크롤 + 활성 항목 자동 노출) |
| GP `/mypage/credits` | PASS | PASS |
| GP `/mypage/enrollments` | PASS | PASS |
| PH `/account` | PASS | PASS |
| PH `/store-owner/account` | PASS | PASS |

- page-level horizontal overflow 0 (긴 nav 는 자체 `overflow-x` 컨테이너 안에서만 스크롤).
- header wrapping 정상 · touch target 정상 · mobile nav loss 0.

---

## 7. console / network

| 항목 | 결과 |
|---|:---:|
| console error | 0 (5경로 전부) |
| JS exception | 0 |
| white screen | 0 |
| unexpected 401 / 403 | 0 |
| 404 | 0 |
| 5xx | 0 |
| navigation loop | 0 |

관측된 API 응답: `auth/me` 200 · `users/me/profile` 200 · `notifications/unread-count` 200 · `credits/me` 200 · `credits/me/transactions` 200 · `lms/enrollments/me` 200 · `public/services/{svc}/footer-legal` 200.

---

## 8. 코드 수정

- 수정 파일 3건 (GP My Page 3페이지) — §3 표 참조.
- backend API · DB schema/migration · Identity · membership 정책 · 새 My Page 기능 · Profile Core: **변경 0** (WO §14 금지 준수).
- PH 코드 변경 0 (검증만).
- demo credential / login fixture / TEST-ACCOUNTS 변경 0 (WO §9 준수).

---

## 9. typecheck / build

| 대상 | 결과 |
|---|:---:|
| `@o4o/account-ui` 등 GP workspace 의존 패키지 build | PASS |
| GlycoPharm `pnpm run type-check` (`tsc -b`) | **PASS** (에러 0) |
| PharmacyHub | 변경 없음 → 재검증 불필요 (WO §15 "수정 발생 시") |
| 공통 component | 변경 없음 → 5서비스 전체 재검증 불필요 |
| CI `Deploy Web Services` | success |

---

## 10. baseline 문서 정합

`docs/baseline/O4O-MYPAGE-CANONICAL-V1.md` 가 **stale 임을 현재 main 에서 재확인** (4 service 만 기술, PharmacyHub `/account` 축 미반영).

→ **§5.1 "Pharmacy-Hub 축 (구현 사실 기록)"** 만 추가했다.

- 기록 내용: canonical route `/account` · `MyPageShell` 채택(`basePath='/account'`) · nav 2항목 · profile/password 계약은 §2 매트릭스와 동일 · `/store-owner/account` 는 thin wrapper 이며 제거·강제 redirect 금지.
- **§1~§4(결정 · 매트릭스 · 허용/금지 · 원칙)는 손대지 않았다.** 새 정책 없음. route 명칭 통일 여부는 본 baseline 이 결정하지 않는다고 명시.

---

## 11. 잔존 followup

| # | 내용 | 판정 |
|---|---|---|
| F1 | GP `MySettingsPage` / `MyProfilePage` breadcrumb 누락 | **FOLLOWUP (blocker 아님)** — GP 는 `MyPageHub` 만 breadcrumb 를 갖고 `MyRequestsPage` 를 포함한 나머지 서브페이지는 모두 breadcrumb 이 없다. 즉 Shell 구조 누락이 아니라 **일관된 서비스 UX 선택**이다. 공통화를 위해 불필요한 breadcrumb 를 강제하지 않는다(WO §11). |
| F2 | PH 로그인 화면 데모 계정 버튼의 stale password (401) | **FOLLOWUP** — 이번 Shell closure 범위 밖(WO §9). 별도 WO 대상. |
| F3 | `O4O-MYPAGE-CANONICAL-V1` 의 `/mypage` vs PH `/account` route 명칭 통일 | **FOLLOWUP** — 정책 결정 필요, 별건. |

Shell/Layout 범위 `MUST_FIX_BEFORE_CLOSE` = **0**.

---

## 12. MYPAGE SHELL/LAYOUT 최종 판정

```text
OPEN-A                     = CLOSED
OPEN-B                     = CLOSED
GP 3페이지 navigation      = PASS
PH /account authenticated  = PASS
PH /store-owner/account    = PASS
desktop / mobile           = PASS
unexpected runtime/network = 0
미조사                      = 0
VIEW_DUPLICATED            = 0
CORE_ONLY                  = 0
MUST_FIX_BEFORE_CLOSE      = 0

MYPAGE SHELL/LAYOUT TRACK  = FINAL CLOSED
```

WO §17 의 후속 기능 공통화(My Page Home/Hub · Requests · Settings/Security · Membership · Notifications · Activity · Help · 서비스별 Extension)는 이번 WO 에서 **착수하지 않았다.**

---

## 13. CHECK / commit / push

| 항목 | 값 |
|---|---|
| 구현 commit | `8bdd84396` |
| 문서 commit | 본 CHECK + baseline §5.1 + 선행 CHECK 판정 정합화 |
| stage 방식 | path-specific (`git add .` 미사용), `git diff --cached --name-only` 로 본 세션 변경만 확인 |
| 최종 상태 | `HEAD == origin/main` · 본 WO 범위 미커밋 0 |
