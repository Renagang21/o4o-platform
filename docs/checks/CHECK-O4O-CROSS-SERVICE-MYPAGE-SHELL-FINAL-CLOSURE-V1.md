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
| 구현 commit | — |
| 배포 workflow | `Deploy Web Services (Cloud Run)` run `32210691199` — **success** |
| 배포 대상 | — |
| PH 검증 대상 | 기존 배포본 (이번 WO 에서 PH 코드 변경 0) |

---

## 2. OPEN-A 결과 — PharmacyHub 인증 화면 browser 검증

**CLOSED.**

- 로그인 수단: PH 로그인 화면의 **데모 계정 채우기 버튼을 사용하지 않고**(stale password → 401), `docs/local/TEST-ACCOUNTS.local.md` 의 `pharmacy-hub:store_owner` 계정으로 브라우저 interactive 로그인. 자격증명은 코드·스크립트·CHECK·Git·shell history 어디에도 남기지 않았다.
- `EXTERNAL_BLOCKER` 없음 — 정상 로그인 성공.

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
 `/mypage/certificates` | PASS | PASS (nav 가로 스크롤 + 활성 항목 자동 노출) |
 `/mypage/credits` | PASS | PASS |
 `/mypage/enrollments` | PASS | PASS |
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

- backend API · DB schema/migration · Identity · membership 정책 · 새 My Page 기능 · Profile Core: **변경 0** (WO §14 금지 준수).
- PH 코드 변경 0 (검증만).
- demo credential / login fixture / TEST-ACCOUNTS 변경 0 (WO §9 준수).

---

## 9. typecheck / build

| 대상 | 결과 |
|---|:---:|
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
| F1 | — | 즉 Shell 구조 누락이 아니라 **일관된 서비스 UX 선택**이다. 공통화를 위해 불필요한 breadcrumb 를 강제하지 않는다(WO §11). |
| F2 | PH 로그인 화면 데모 계정 버튼의 stale password (401) | **FOLLOWUP** — 이번 Shell closure 범위 밖(WO §9). 별도 WO 대상. |
| F3 | `O4O-MYPAGE-CANONICAL-V1` 의 `/mypage` vs PH `/account` route 명칭 통일 | **FOLLOWUP** — 정책 결정 필요, 별건. |

Shell/Layout 범위 `MUST_FIX_BEFORE_CLOSE` = **0**.

---

## 12. MYPAGE SHELL/LAYOUT 최종 판정

```text
OPEN-A                     = CLOSED
OPEN-B                     = CLOSED
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
