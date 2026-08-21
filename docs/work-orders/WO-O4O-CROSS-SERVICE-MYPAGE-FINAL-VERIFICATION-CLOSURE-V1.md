# WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-VERIFICATION-CLOSURE-V1

* **대상**: Agent D
* **성격**: My Page 전체 트랙 최종 검증 공백 2건 해소 + `FINAL CLOSED`
* **선행 상태**

  * `CROSS-SERVICE MY PAGE TRACK = CLOSED_WITH_FOLLOWUPS`
  * `MUST_FIX_BEFORE_CLOSE = 0`
* **남은 검증 공백**

  1. `pending / rejected` 상태 실제 렌더 미검증
  2. GlycoPharm / PharmacyHub mobile `390×844` smoke 미실시

---

## 1. 목표

코드 공통화와 production 결함 수정은 모두 완료됐다.

이번 WO에서는 새 기능을 개발하지 않고 **검증 공백 2건만 닫는다.**

```text
A. pending / rejected UX 최종 검증
B. GP mobile smoke
C. PH mobile smoke
→ CROSS-SERVICE MY PAGE TRACK = FINAL CLOSED
```

---

## 2. 시작

최신 `origin/main` 기준.

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git rev-parse HEAD
git rev-parse origin/main
```

다른 세션 dirty/staged/untracked 파일:

```text
수정 금지
삭제 금지
stash 금지
```

`git add .` 금지. path-specific stage만 사용.

---

## 3. 선행 상태 확인

현재 main에서 다음 선행 결과가 유지되는지 확인한다.

```text
VIEW_DUPLICATED = 0
CORE_ONLY = 0
MUST_FIX_BEFORE_CLOSE = 0
dead route/nav/card = 0
role mismatch = 0
```

이번 WO에서는 전체 census를 다시 처음부터 수행하지 않는다.

---

# PART A — pending / rejected 검증

## 4. 테스트 계정 존재 여부

먼저 안전한 테스트 계정에서 실제로 다음 상태가 존재하는지 확인한다.

```text
pending
rejected
```

대상 서비스는 해당 상태 계약이 실제 존재하는 서비스만.

실사용자 계정을 사용하지 않는다.

---

## 5. 실제 테스트 계정이 존재하는 경우

production 브라우저에서 실제 로그인 후 확인한다.

최소:

```text
로그인
→ My Page
→ Shell 유지
→ 현재 membership/status 표시
→ role/status label
→ Profile 진입 가능 여부
→ Settings 진입 가능 여부
→ 허용된 navigation
→ 새로고침
```

확인:

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
redirect loop = 0
dead end = 0
Shell 유실 = 0
잘못된 role/status label = 0
```

---

## 6. 적절한 테스트 계정이 없는 경우

**검증만을 위해 production membership 상태를 변경하지 않는다.**

금지:

```text
active → pending 변경
active → rejected 변경
membership INSERT
승인/반려 강제 write
role 변경
DB 직접 조작
```

대신 다음 3단 증거로 최종 판정한다.

```text
1. guard / route 계약
2. render branch / component path
3. status normalizer / mapping
```

각 서비스별로:

```text
pending branch
rejected branch
Shell 경로
Profile/Settings 접근 조건
```

을 확인한다.

테스트 계정 부재 사실을 CHECK에 명확히 기록한다.

---

## 7. pending / rejected 완료 기준

다음 중 하나면 PASS 가능하다.

### A. 실제 production 렌더 PASS

또는

### B. 적절한 테스트 계정 없음 + 3단 정적 계약 증거 PASS

단:

```text
코드상 unreachable branch
잘못된 guard ordering
Shell 밖 early return
dead navigation
```

이 발견되면 MUST_FIX다.

---

# PART B — GlycoPharm mobile smoke

## 8. 환경

실제 production:

```text
viewport 390×844
```

정상 로그인 세션 사용.

---

## 9. GP 검증 경로

최소:

```text
/mypage
/mypage/profile
/mypage/settings
/mypage/requests
/mypage/certificates
/mypage/credits
/mypage/enrollments
```

실제 current-main route 기준 확인 후 수행.

---

## 10. GP mobile 확인

```text
MyPageShell 정상
navigation 표시
활성 항목 자동 노출
가로 nav scroll 정상
page-level horizontal overflow 없음
user summary 정상
card/grid stacking 정상
긴 label 잘림 없음
button/touch target 접근 가능
뒤로가기 정상
새로고침 정상
```

합격:

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead nav = 0
mobile 기능 소실 = 0
double shell = 0
```

---

# PART C — PharmacyHub mobile smoke

## 11. 환경

실제 production:

```text
viewport 390×844
```

TEST-ACCOUNTS 기준 interactive login.

stale demo 자동채움 버튼은 사용하지 않는다.

---

## 12. PH 검증 경로

최소:

```text
/account
/store-owner/account
```

해당 role에서 실제 존재하는:

```text
Profile
Security
navigation
store-owner sidebar
```

까지 확인한다.

---

## 13. PH mobile 확인

`/account`:

```text
MyPageShell 정상
title/nav 정상
Profile 정상
Security 진입 정상
double shell 없음
overflow 없음
```

`/store-owner/account`:

```text
compatibility URL 유지
store-owner sidebar 정상
내 계정 활성 표시
thin wrapper 정상
double shell 없음
```

합격:

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
mobile 기능 소실 = 0
navigation loop = 0
```

---

# PART D — 회귀 확인

## 14. 선행 결함 최소 재확인

이번 최종 closure에서 최소 다음은 current production에서 다시 확인한다.

```text
KCos role label 정상
Neture role badge 중복 없음
Neture auth bootstrap 오문구 없음
KPA qualification loading Shell 유지
KCos leaf title 정상
notification dead target 0
```

전체 기능 테스트를 반복할 필요는 없다.

---

## 15. Production write

원칙:

```text
production write = 0
```

이번 WO에서 금지:

```text
Profile write
Password write
Request state write
Membership/role write
Notification read/write
DB 직접 write
```

검증은 read-only.

---

## 16. 결함 발견 시

이번 My Page 공통화 범위의 실제 결함이면:

```text
원인 확인
→ 최소 수정
→ 관련 typecheck/build
→ 표준 배포
→ 동일 mobile/browser 재검증
```

까지 중간 승인 없이 수행한다.

다음이면 중지:

```text
신규 backend 계약
DB schema/migration
Identity 변경
membership lifecycle 재설계
새 테스트 계정 생성
실사용자 상태 변경
다른 세션 WIP 충돌
```

---

## 17. 정적 검증

코드 수정이 발생하면 영향 서비스 기준 최소:

```text
@o4o/account-ui build (공통 package 변경 시)
GP typecheck/build
PH typecheck/build
영향 받은 다른 서비스 typecheck/build
```

코드 변경 0이면 불필요한 전체 build는 하지 않는다.

---

# PART E — FINAL CLOSE

## 18. 완료 기준

다음 전부 충족:

```text
pending/rejected:
- 실제 렌더 PASS
  또는
- 테스트 계정 부재 + 3단 정적 증거 PASS

GP mobile 390×844 PASS
PH mobile 390×844 PASS

white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead nav/card = 0
double shell = 0
mobile 기능 소실 = 0

MUST_FIX_BEFORE_CLOSE = 0
```

---

## 19. Help/Support 상태

선행 FINAL AUDIT 판정 유지:

```text
MYPAGE HELP/SUPPORT TRACK = FINAL CLOSED
```

의미:

```text
현재 공통화 대상 완료
self-read 문의는 별도 신규 기능
```

이번 WO에서 Help backend를 만들지 않는다.

---

## 20. My Page 전체 최종 판정

§18이 모두 충족되면:

```text
CROSS-SERVICE MY PAGE TRACK = FINAL CLOSED
```

로 변경한다.

의미:

```text
현재 존재하는 5서비스 My Page 기능의
공통화
adoption
route/navigation
role/membership UX
desktop/mobile runtime
production 검증
완료
```

이지, 미구현 신규 기능까지 모두 개발됐다는 뜻은 아니다.

---

## 21. 기존 backlog 유지

다음은 FINAL CLOSE blocker 아님.

```text
email 변경
탈퇴 3축
sessions UI
Help self-read 문의 계약
FAQ
Activity backend
Activity type enum
membership metadata self-read
Neture membership none 가입 동선
PH 복수 role 표현
조회 실패 삼킴 계약화
notification 장기 followup
KPA 고아 page
PH 로그인 demo autofill 401
```

이번 WO에서 처리하지 않는다.

---

## 22. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-FINAL-VERIFICATION-CLOSURE-V1.md
```

포함:

```text
1. 기준 commit / deployed revision
2. pending/rejected 테스트 계정 census
3. 실제 렌더 또는 3단 정적 증거
4. GP mobile 390×844
5. PH mobile 390×844
6. 선행 결함 최소 회귀
7. production browser
8. production write
9. 코드 수정 여부
10. typecheck/build
11. 잔존 backlog
12. MUST_FIX_BEFORE_CLOSE
13. CROSS-SERVICE MY PAGE FINAL CLOSED 판정
14. CHECK/commit/push
```

선행 FINAL AUDIT CHECK의:

```text
CLOSED_WITH_FOLLOWUPS
```

상태를 필요 시:

```text
FINAL CLOSED
```

로 정합화한다.

history와 기존 미확인 기록을 삭제하지 말고 **후속 검증으로 해소됐다는 경위**를 남긴다.

---

## 23. Git

```text
git add . 금지
path-specific stage
다른 세션 dirty/staged/untracked 파일 미접촉
```

완료 후:

```text
이번 WO 범위 dirty 0
push 완료
origin/main 반영 확인
```

---

## 24. 최종 보고

```text
1. 기준 commit / deployed revision
2. pending/rejected 검증 방식
3. pending/rejected 결과
4. GP mobile 결과
5. PH mobile 결과
6. 선행 결함 회귀
7. production browser
8. production write
9. 코드 수정
10. typecheck/build
11. 잔존 backlog
12. MUST_FIX_BEFORE_CLOSE
13. CROSS-SERVICE MY PAGE FINAL CLOSED 여부
14. CHECK/commit/push
15. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 25. 실행 원칙

중간 승인 없이:

```text
최신 main 확인
→ pending/rejected 테스트 가능성 확인
→ 실제 렌더 또는 3단 정적 증거
→ GP mobile smoke
→ PH mobile smoke
→ 필요한 최소 회귀 확인
→ 결함 있으면 최소 수정/배포/재검증
→ CHECK
→ 선행 CHECK 상태 정합
→ path-specific commit
→ push
```

까지 한 번에 완료한다.

**이번 작업의 목적은 새 My Page 기능을 만드는 것이 아니라, 마지막 검증 공백 두 건을 닫아 지금까지의 cross-service My Page 공통화 작업을 공식적으로 종료하는 것이다.**

---

## 부기 — 실행 시점 저장소 실측 (WO 원문 아님)

> 착수 전 직접 측정한 사실이다. 결론이 아니라 출발점이며, 실행 시점에 재확인할 것. 원문(§1~§25)과 충돌하면 원문이 우선한다.

### A. 기준

* base `origin/main` = `602252395` (선행 FINAL AUDIT CHECK 커밋)
* 선행 코드 수정 3건: `c9fd2d6a4` · `142943486` · `6777d7503`
* 착수 시점 작업트리 clean. 다만 **다른 세션이 동시에 진행 중**(guide 공통화 · signage · main-site 정리 트랙이 최근 커밋에 있음). §2 대로 dirty/untracked 가 생기면 미접촉하고 path-specific stage 만 사용할 것.

### B. §9 GP route — **WO 원문의 `/mypage/requests` 는 실재하지 않는다**

`services/web-glycopharm/src/App.tsx` 실측 7 route:

```
736: mypage
741: mypage/profile
746: mypage/settings
752: mypage/enrollments
757: mypage/certificates
762: mypage/credits
768: mypage/my-requests      ← 원문의 "/mypage/requests" 아님
```

§9 가 "실제 current-main route 기준 확인 후 수행" 이라고 단서를 달았으므로 **`/mypage/my-requests` 로 검증**하면 된다. `/mypage/requests` 로 접속해 404 가 나오는 것을 dead route 결함으로 오판하지 말 것 — 애초에 정의된 적 없는 경로다. 다만 **nav item 이나 card 가 `/mypage/requests` 를 가리키고 있다면 그것은 실제 dead link** 이므로 구분해서 볼 것.

### C. §12 PH route — 두 경로는 서로 다른 컴포넌트다

`services/web-pharmacy-hub/src/App.tsx` 실측:

```
205: <Route path="/account" element={<MyProfilePage />} />          ← MyPageShell 직접 소비
476: <Route path="account" element={<AccountPage />} />              ← store-owner 하위 트리
```

476행은 `/store-owner/*` 하위이며 주변에 `info`(매장 정보)가 함께 있다(`WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1`). 즉 §13 의 "thin wrapper / double shell 없음" 판정 대상은 **`AccountPage` 가 store-owner sidebar 안에서 `MyPageShell` 을 또 렌더하는가** 이다. 두 파일을 각각 열어 Shell 중첩 여부를 정적으로 먼저 확인한 뒤 브라우저로 확인하면 판정이 빠르다.

PH `pages/account/` 에는 `MyProfilePage.tsx` · `navItems.ts` 2파일뿐이다. §12 의 "Security 진입" 이 별도 route 가 아니라 **동일 화면 내 섹션**일 수 있으니, route 부재를 기능 소실로 오판하지 말 것.

### D. §6 3단 정적 증거 — 축 1(guard)은 이미 5서비스 전부에 실재한다

`MembershipStatusNotice` / `MembershipStatusBadge` 소비처 실측:

```
services/web-glycopharm/src/components/auth/MembershipGate.tsx
services/web-k-cosmetics/src/components/auth/MembershipGate.tsx
services/web-kpa-society/src/components/auth/MembershipGate.tsx
services/web-neture/src/components/auth/MembershipGate.tsx
services/web-pharmacy-hub/src/components/MembershipGate.tsx
services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx
services/web-neture/src/pages/mypage/MyPageHub.tsx
services/web-pharmacy-hub/src/pages/account/MyProfilePage.tsx
services/web-pharmacy-hub/src/pages/JoinStatusPage.tsx
```

**5서비스 모두 `MembershipGate` 를 갖고 있고 공통 컴포넌트를 소비한다.** 축 1(guard/route 계약)은 여기서 확인된다. 축 2(render branch)는 각 `MembershipGate` 의 분기, 축 3(normalizer)은 `packages/account-ui/src/adapters/membershipNormalizers.ts` 다.

**§7 이 요구하는 결함 유형은 "컴포넌트가 있다"가 아니라 다음 4가지다.** 존재 확인으로 PASS 처리하지 말 것:

* `코드상 unreachable branch` — 선행 WO 에서 KCos in-page `MyPageAuthRequired` 5건이 `ProtectedRoute` 때문에 도달 불가로 판정됐다. **`MembershipGate` 에도 같은 일이 일어날 수 있다** — 상위 `ProtectedRoute`/route guard 가 pending/rejected 를 먼저 가로채 로그인이나 다른 화면으로 보내면 Gate 의 pending 분기는 죽은 코드다. **guard ordering 을 route 트리 위에서부터 따라갈 것.**
* `잘못된 guard ordering`
* `Shell 밖 early return` — Gate 가 `MyPageLayout` 바깥에서 return 하면 선행 M4(KPA qualifications 로딩 Shell 밖)와 같은 결함이다
* `dead navigation`

`membershipNormalizers.ts:46` 은 status 미지정 시 `?? 'pending'` 으로 기본값을 넣는다. **응답 파싱 실패나 필드명 불일치가 조용히 `pending` 으로 표시될 수 있다.** 정상 회원에게 pending 이 보이는 경로가 없는지 축 3 확인 시 함께 볼 것.

### E. §4 테스트 계정 — 기대치를 낮게 잡을 것

`docs/local/TEST-ACCOUNTS.local.md` 에 `pending`/`rejected` 라벨이 붙은 전용 계정은 확인되지 않았다. 선행 FINAL AUDIT 도 같은 이유로 미검증으로 남겼다. 따라서 **§7-B(정적 3단 증거) 경로가 현실적인 기본값**이다.

§16 이 "새 테스트 계정 생성"을 중지 조건으로 명시했고 §6 이 상태 변경을 전부 금지했으므로, **검증을 위해 계정을 만들거나 상태를 바꾸지 말 것.** §7-B 는 §7-A 의 열등한 대체재가 아니라 원문이 허용한 **동등한 PASS 경로**다.

자격증명은 CHECK·커밋 메시지·보고서 어디에도 적지 말 것(CLAUDE.md §15).

### F. §14 회귀 재확인 — 근거 커밋

| 재확인 항목 | 근거 커밋 |
|---|---|
| KCos role label 정상 | `c9fd2d6a4` (`MyProfilePage.tsx`) |
| Neture role badge 중복 없음 | `c9fd2d6a4` (`MyPageHub.tsx`) |
| KPA qualification loading Shell 유지 | `c9fd2d6a4` (`MyQualificationsPage.tsx`) |
| Neture auth bootstrap 오문구 없음 | `142943486` (4 files, `isLoading` 분기 선행) |
| KCos leaf title 정상 | `6777d7503` (`프로필` / `설정`) |

Neture 오문구는 **auth bootstrap 중 수 초간만** 나타나던 증상이다. 페이지 로드 완료 후 스냅샷만 찍으면 재발해도 안 보인다. **로드 직후(bootstrap 중) 상태를 봐야** 회귀가 잡힌다.

### G. §18 — "0" 항목을 측정 없이 적지 말 것

§18 의 합격 기준은 대부분 `= 0` 형태다. **관측하지 않은 항목을 0 으로 적는 것이 이번 WO 의 주된 실패 모드다.** JS exception / 401·403 / 404 / 5xx 는 브라우저 console + network 를 실제로 확인한 결과여야 하고, 확인하지 않았으면 0 이 아니라 **미확인**으로 적는다. 선행 WO 는 GP·PH mobile 을 "미실시 — 미확인"으로 정직하게 남겼고 그래서 이번 WO 가 존재한다. 같은 기준을 유지할 것.

### H. §22 선행 CHECK 정합화 방식

`docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1.md` 에서 손댈 곳은 다음이며, **삭제는 하지 않는다**:

* 5행 판정 줄 · 324행 트랙 선언 블록 · 329~334행 "FINAL CLOSED 를 선언하지 않는 이유"
* 151행(pending/rejected 미검증) · 229·232행(GP·PH mobile 미실시) · 283행(backlog B7) 의 **미확인 기록은 원문 보존**하고, 본 WO 로 해소됐다는 경위를 덧붙인다

직전 Help/Support CHECK 정합화(`b4a030629`, 29 insertions / **1 deletion**)가 정확한 선례다. 같은 형태로 처리할 것. **WO 문서 자체는 수정하지 않는다.**

### I. 검증 환경

* KCos 프로덕션 도메인 = `k-cosmetics.site` (`k-cosmetics.co.kr` 은 외부 쇼핑몰)
* 로그인 API 는 **serviceKey 필수** — 없으면 정상 계정도 401
* API 실 진입점 = `api.neture.co.kr` (run.app 직접 URL 은 `/health` 까지 404)
* §11 의 "stale demo 자동채움 버튼 미사용" 은 선행 backlog(PH 로그인 화면 낡은 비밀번호 자동채움 → 항상 401)를 가리킨다. 이 버튼을 눌러 401 을 받고 결함으로 보고하는 것은 **범위 밖 기존 항목의 재발견**이다.

### J. 이번 WO 의 위험

목적지가 `FINAL CLOSED` 로 명시돼 있다. **§18 조건을 실제로 충족했을 때만 선언한다.** §7 의 4가지 결함 유형이 나오면 그것은 MUST_FIX 이고, 최소 수정·배포·재검증(§16)까지 마친 뒤에야 close 가 성립한다. 검증 공백을 닫으러 갔다가 **결함을 새로 찾는 것도 정상 결과**다. 닫지 못하면 닫지 못한 이유를 정확히 남기는 편이 낫다.
