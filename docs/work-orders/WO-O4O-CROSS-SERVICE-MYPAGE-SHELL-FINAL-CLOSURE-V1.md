# WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1

- **대상 에이전트**: Agent D
- **성격**: My Page Shell/Layout 공통화 잔여 2건 종료 + production 최종 검증 + FINAL CLOSE
- **선행 WO**: [`WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1`](WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1.md)
- **선행 CHECK**: [`docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1.md`](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1.md)
- **현재 판정**: `PASS_WITH_OPEN`

---

## 1. 목표

My Page Shell/Layout 공통화 구현과 5서비스 adoption은 완료됐지만 다음 2건이 남아 있다.

```text
OPEN-A
PharmacyHub 인증 상태
/account
/store-owner/account
production browser 미검증

OPEN-B
GlycoPharm
MyCertificatesPage
MyCreditsPage
MyEnrollmentsPage
navItems adoption 미완료
```

이번 WO의 목표는 이 두 건만 닫고:

```text
MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED
```

로 종료하는 것이다.

새 기능 공통화는 시작하지 않는다.

---

## 2. 시작

최신 `origin/main` 기준.

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git pull --ff-only origin main
git rev-parse HEAD
git rev-parse origin/main
```

확인:

```text
HEAD == origin/main
이번 세션 외 staged/dirty 파일 미접촉
```

공유 main index 오염 이력이 있으므로 `git diff --cached --name-only` 필수.

---

## 3. 선행 구현 확인

현재 main에 다음이 포함돼 있는지 확인한다.

```text
MyPageShell
MyPageUserSummary
MyPageEntryCardGrid
MyPageNavigation 확장
MyPageLayout re-export shim
5서비스 adoption
```

선행 구현을 다시 설계하거나 재작성하지 않는다.

---

## 4. OPEN-B — GlycoPharm 3페이지 adoption

대상:

```text
MyCertificatesPage.tsx
MyCreditsPage.tsx
MyEnrollmentsPage.tsx
```

선행 WO 당시 다른 세션 WIP라 접촉하지 못했다.

먼저 현재 main 상태를 확인한다.

### A. 병행 세션 변경이 이미 main 반영됨

3페이지에 필요한 My Page navigation adoption을 진행한다.

예상 최소 변경:

```text
navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}
```

실제 컴포넌트 계약을 확인한 뒤 적용한다.

### B. 아직 미커밋 WIP가 존재

접촉하지 않는다.

```text
git diff
git diff --cached
```

로 소유권 확인 후 충돌이면 중지하고 보고한다.

> **작성 시점 사실(2026-08-19)**: 병행 세션의 GP My Page 변경은 `ed7d6ed17` 로 이미 main 에 반영됐다.
> 즉 시작 시점 기준으로는 **A 경로**가 유력하나, 실행 시점에 다시 확인한 뒤 판단한다.

---

## 5. GP 3페이지 완료 검증

각 페이지:

```text
/certificates
/credits
/enrollments
```

실제 route는 현재 코드 기준 확인.

확인:

```text
공통 MyPageShell 유지
MyPageNavigation 표시
현재 route 활성 표시
desktop 정상
mobile 정상
본문 회귀 없음
breadcrumb/header 회귀 없음
dead nav 0
```

3페이지 전부 통과해야 OPEN-B CLOSED.

---

## 6. OPEN-A — PharmacyHub 인증 browser 검증

대상:

```text
/account
/store-owner/account
```

검증 사용자:

```text
PharmacyHub 정상 테스트 계정
```

stale demo password 버튼은 검증 수단으로 사용하지 않는다.

기존 안전한 로그인 세션 또는 `docs/local/TEST-ACCOUNTS.local.md` 기준 interactive login을 사용한다.

자격증명을:

```text
코드
스크립트
Git
CHECK
shell history
로그
```

에 평문으로 남기지 않는다.

---

## 7. PharmacyHub `/account`

인증 후:

```text
login
→ /account
→ MyPageShell 렌더
→ 사용자 요약
→ navigation
→ Profile content
→ 새로고침
```

확인:

```text
Shell 정상
이중 shell 없음
내 프로필 정상
navigation 정상
desktop/mobile 정상
예상 외 401/403/404/5xx 0
console exception 0
```

---

## 8. PharmacyHub `/store-owner/account`

기존 compatibility route 검증.

```text
login as store_owner
→ /store-owner/account
```

확인:

```text
기존 URL 유지
thin wrapper 정상
이중 shell 없음
Profile 내용 정상
store-owner sidebar 회귀 없음
desktop/mobile 정상
```

`/account`와 `/store-owner/account`를 하나로 강제 redirect하거나 기존 compatibility 계약을 제거하지 않는다.

---

## 9. stale demo password 처리

PharmacyHub 로그인 화면의 stale demo password는 이번 Shell closure 범위 밖이다.

이번 WO에서:

```text
demo credential 수정
login fixture 정책 변경
TEST-ACCOUNTS 변경
```

하지 않는다.

단, 정상 로그인 검증을 막는 유일한 원인이고 다른 인증 방법이 전혀 없으면:

```text
EXTERNAL_BLOCKER
```

로 정확히 보고한다.

억지 PASS 금지.

---

## 10. 문서 canonical 정합

선행 보고에서:

```text
docs/baseline/O4O-MYPAGE-CANONICAL-V1.md
```

가 4서비스만 다루고 PharmacyHub `/account` 축을 반영하지 않는 것으로 발견됐다.

현재 main에서 재확인한다.

실제로 stale이면 **현재 구현 사실만 문서에 최소 반영**한다.

포함 대상:

```text
PharmacyHub My Page 축
/account
/store-owner/account compatibility
MyPageShell adoption 여부
```

새 정책을 만들지 않는다.

---

## 11. 기존 breadcrumb 불일치

선행 발견:

```text
GP MySettingsPage
GP MyProfilePage
breadcrumb 누락
```

이번 Shell closure의 blocker인지 확인한다.

### 단순 Shell 구조 누락이면

최소 정합화 가능.

### 서비스 UX 차이 또는 후속 기능 사안이면

```text
FOLLOWUP
```

으로 남기고 Shell FINAL CLOSE를 막지 않는다.

공통화를 위해 불필요한 breadcrumb를 강제하지 않는다.

---

## 12. Production browser matrix

이번 WO에서 최종 확인:

```text
GP Certificates
GP Credits
GP Enrollments

PH /account
PH /store-owner/account
```

desktop:

```text
1440×900 수준
```

mobile:

```text
390×844 수준
```

확인:

```text
nav visible
active route visible
content accessible
horizontal overflow 정상
header wrapping 정상
touch target 정상
```

---

## 13. Browser/runtime 기준

최종 기준:

```text
white screen = 0
JS exception = 0
unexpected 401 = 0
unexpected 403 = 0
404 = 0
5xx = 0
dead link = 0
navigation loop = 0
mobile nav loss = 0
double shell = 0
```

의도된 role guard는 실패로 세지 않는다.

---

## 14. 결함 발견 시

이번 Shell/Layout 범위 결함이면:

```text
원인 증명
→ 최소 수정
→ 정적검증
→ commit/push
→ 표준 배포
→ 동일 production browser 재검증
```

까지 중간 승인 없이 수행.

금지:

```text
새 backend API
DB schema/migration
Identity 변경
membership 정책 변경
새 My Page 기능 개발
Profile Core 재설계
```

---

## 15. 정적 검증

수정 발생 시 필수:

```text
@o4o/account-ui build
GlycoPharm typecheck/build
PharmacyHub typecheck/build
```

공통 component 변경 시 5서비스 전체 소비처 typecheck/build.

---

## 16. FINAL CLOSE 기준

다음 모두 충족:

```text
OPEN-A = CLOSED
OPEN-B = CLOSED

GP 3페이지 navigation adoption PASS
PH /account authenticated PASS
PH /store-owner/account PASS

desktop/mobile PASS
unexpected runtime/network error 0

미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

Shell/Layout 범위 MUST_FIX_BEFORE_CLOSE = 0
```

최종:

```text
MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED
```

---

## 17. 다음 기능 공통화 후보

FINAL CLOSE 후에만 정리한다.

후속 후보:

```text
My Page Home / Hub
Requests / 신청·승인 내역
Settings / Security
Membership / 역할 상태
Notifications
Activity / 이력
Help / 문의
서비스별 Extension
```

이번 WO에서는 착수하지 않는다.

---

## 18. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1.md
```

포함:

```text
1. 기준 commit
2. OPEN-A 결과
3. OPEN-B 결과
4. GP 3페이지 browser
5. PH 2경로 authenticated browser
6. desktop/mobile
7. console/network
8. 코드 수정
9. typecheck/build
10. baseline 문서 정합
11. 잔존 followup
12. MYPAGE SHELL/LAYOUT 최종 판정
13. CHECK/commit/push
```

선행 CHECK 상태도 필요하면:

```text
PASS_WITH_OPEN
→ FINAL CLOSED
```

로 정합화한다.

---

## 19. Git

```text
git add . 금지
path-specific stage
다른 세션 staged/dirty 파일 미접촉
```

완료 후:

```text
HEAD == origin/main
이번 WO 범위 dirty 0
```

필수.

---

## 20. 최종 보고

```text
1. 기준 commit / deployed revision
2. GP 3페이지 adoption
3. PH authenticated /account
4. PH /store-owner/account
5. desktop/mobile
6. console/network
7. 코드 수정
8. test/build
9. baseline 문서 정합
10. 잔존 followup
11. MYPAGE SHELL/LAYOUT FINAL CLOSED 여부
12. CHECK/commit/push
13. 최종 작업트리
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

---

## 21. 실행 원칙

중간 승인 없이:

```text
최신 main 확인
→ GP 병행 WIP 해소 여부 확인
→ 3페이지 navigation adoption
→ PH authenticated browser 검증
→ desktop/mobile
→ 필요 시 최소 수정
→ 정적검증
→ 배포
→ 재검증
→ baseline 문서 정합
→ CHECK
→ path-specific commit
→ push
```

까지 한 번에 진행한다.

**이번 WO의 목적은 새로운 My Page 기능을 만드는 것이 아니라,
이미 구현된 공통 Shell/Layout의 마지막 OPEN 2건을 닫고 이후 기능 공통화의 기준면을 확정하는 것이다.**
