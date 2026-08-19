# WO-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1

* **대상**: Agent D
* **성격**: My Page `Settings / Security` 기능 census → 공통화 → 5서비스 adoption → production 검증
* **선행 완료**

  * `PROFILE TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1](../checks/CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1.md)
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1.md)
  * `MYPAGE HOME/HUB TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1.md)
  * `MYPAGE REQUESTS TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1.md)

---

## 1. 목표

My Page의 다음 개별 기능인 **설정 / 보안(Settings / Security)** 을 5서비스 기준으로 공통화한다.

핵심:

```text
5서비스 Settings/Security 기능 census
→ 공통 계정/보안 View 분리
→ 기존 Profile/Security Core 재사용
→ 서비스별 설정은 Extension 유지
→ 5서비스 adoption
→ production desktop/mobile 검증
```

이번 WO는 이미 완료된 Profile write 계약을 다시 설계하지 않는다.

---

## 2. 대상 서비스

```text
KPA-Society
GlycoPharm
K-Cosmetics
Neture
Pharmacy-Hub
```

---

## 3. 시작

최신 `origin/main` 기준.

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git rev-parse HEAD
git rev-parse origin/main
```

다른 세션 dirty/staged 파일은 수정·삭제·stash하지 않는다.

```text
git add . 금지
path-specific stage만 사용
```

공유 main이 dirty/behind인 경우 다른 세션 WIP를 건드리지 않는 안전한 worktree 사용 가능.

---

## 4. Settings/Security 모집단 재산출

현재 main에서 개인 사용자 관점의 설정/보안 관련 route/page/component를 전수 조사한다.

대표 범위:

```text
/mypage/settings
/mypage/security
/account
/account/settings
비밀번호 변경
계정 설정
보안 설정
로그인/세션 관련 개인 설정
서비스별 개인 환경설정
```

과거 CHECK 수치를 모집단으로 재사용하지 않는다.

---

## 5. 기능 census

화면 수가 아니라 아래 기능 단위로 5서비스를 판정한다.

```text
1. 설정 Home/Section
2. 비밀번호 변경
3. 이름/닉네임/연락처 편집 진입
4. 이메일 표시
5. 이메일 변경
6. 계정 상태 표시
7. 로그아웃
8. 전체 기기 로그아웃 / 세션 관리
9. 계정 탈퇴/회원 탈퇴
10. 알림/수신 설정
11. 개인정보/약관 진입
12. 서비스별 환경설정
13. 인증/권한 guard
14. empty/loading/error
15. mobile UX
16. 서비스별 고유 Security 기능
```

각 항목 기록:

```text
route
page/component
API
write/read 여부
data source
permission
role/capability gate
desktop/mobile
공통 component 사용 여부
```

판정:

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

**미조사 0 필수.**

---

## 6. 선행 Profile/Security 자산 우선 재사용

먼저 현재 공통 자산을 전수 확인한다.

대표:

```text
AccountSecuritySettings
SecuritySection
PasswordChangeModal
AccountProfileSection
MyPageAuthRequired
MyPageShell
MyPageNavigation
```

같은 기능을 새로 만들지 않는다.

기존 공통 자산으로 충분하면 adoption만 수행한다.

---

## 7. 공통화 목표

공통 Settings/Security 구조는 최소로 유지한다.

개념:

```text
MyPageSettingsView
├─ AccountSection
├─ SecuritySection
├─ Privacy/LegalLinks
├─ SessionActions
└─ ServiceExtension
```

실제 코드에서는 필요 이상으로 wrapper/component를 늘리지 않는다.

신규 package 생성 금지.

가능하면 `@o4o/account-ui` 안에서 additive 확장한다.

---

## 8. Profile과 경계

Profile Track은 이미 `FINAL CLOSED`.

다음은 Profile 소유:

```text
name
firstName
lastName
nickname
phone
```

Settings/Security에서는 이를 다시 구현하지 않고:

```text
내 프로필 진입
→ canonical Profile route
```

로 연결한다.

금지:

```text
self-profile API 재설계
Profile field ownership 변경
AccountProfileSection 재작성
```

---

## 9. 비밀번호 변경

5서비스에서 실제 비밀번호 변경 경로를 전수 확인한다.

공통화 대상:

```text
현재 비밀번호 입력
새 비밀번호
확인
validation
success/error feedback
loading
```

가능하면 기존:

```text
SecuritySection
PasswordChangeModal
AccountSecuritySettings
```

중 canonical 자산으로 수렴한다.

서비스별 별도 password UI 복사본을 남기지 않는다.

---

## 10. Identity V2 계약 유지

비밀번호 관련 backend 계약을 함부로 바꾸지 않는다.

서비스별 credential 구조가 존재하는 경우 현재 canonical 계약을 따른다.

이번 WO에서 금지:

```text
users.password / service_credentials write 정책 재설계
serviceKey 처리 변경
operator password contract 변경
Identity V2 재설계
```

UI 공통화가 목표다.

---

## 11. 이메일

현재 이메일은 표시와 변경 계약을 분리해서 판정한다.

```text
email display
email change
email verification
```

현재 canonical email change 계약이 없다면:

```text
email 표시 = 현재 기능 유지
email 변경 = NOT_IMPLEMENTED
```

로 기록한다.

**email 변경을 이번 WO에서 새로 구현하지 않는다.**

기존 followup R4와 같은 항목이면 별도 backlog 유지.

---

## 12. 계정 탈퇴

서비스별 탈퇴/withdrawal 기능을 조사한다.

다음 구분 필수:

```text
플랫폼 계정 탈퇴
서비스 membership 탈퇴
서비스 이용 중지
```

서로 다른 의미를 하나로 합치지 않는다.

실제 기능이 없으면 `NOT_IMPLEMENTED`.

탈퇴 backend/lifecycle 신설 금지.

---

## 13. 세션 / 전체 기기 로그아웃

현행 기능이 있으면 census에 포함한다.

공통화 대상은 UI/진입 구조.

다음은 이번 범위 밖:

```text
refresh token architecture 변경
SessionSync 재도입
Redis 재도입
새 세션 저장소 설계
```

현재 auth 계약만 사용한다.

---

## 14. 알림 설정과 경계

알림 기능 자체는 후속 `Notifications` 트랙이다.

이번 WO에서는:

```text
알림 설정 진입점
수신 설정 toggle 존재 여부
```

만 조사한다.

알림 backend/model 자체는 공통화하지 않는다.

---

## 15. 약관 / 개인정보 링크

Settings 화면에 존재하면 다음을 확인한다.

```text
이용약관
개인정보처리방침
서비스 정책
```

공통화 대상은 링크 표현 구조.

문서 자체 정책/법정문서 내용을 수정하지 않는다.

dead link/404는 MUST_FIX 후보.

---

## 16. 서비스별 Extension

정상 잔존 가능.

예:

### KPA

```text
직역/회원 관련 설정
약사회 개인 환경
```

### GlycoPharm

```text
서비스 이용 관련 개인 설정
```

### K-Cosmetics

```text
매장/교육 관련 개인 설정
```

### Neture

```text
supplier/partner 개인 설정
business profile 진입
```

### Pharmacy-Hub

```text
store-owner/account 관련 진입
가입 상태 관련 설정
```

공통 Core에 억지로 흡수하지 않는다.

---

## 17. 권한/guard

기존:

```text
MyPageAuthRequired
service membership guard
role/capability helper
```

를 재사용한다.

새 role 판정 로직을 만들지 않는다.

의도된 guard와 잘못된 401/403을 구분한다.

---

## 18. 죽은/중복 Settings 화면 처리

다음은 명확히 판정한다.

```text
동일 기능 UI 2벌 이상
→ VIEW_DUPLICATED

공통 component는 있으나 서비스가 로컬 복사본 사용
→ CORE_ONLY

route/menu는 있으나 화면 dead
→ MUST_FIX 또는 제거

소비처 없는 legacy component
→ 제거 후보
```

화면을 thin wrapper로 바꾸는 방식 허용.

---

## 19. 5서비스 adoption

공통 Settings/Security Core를 만든 경우 반드시:

```text
KPA
GP
KCos
Neture
PH
```

전부 adoption 여부를 판정한다.

기능이 없는 서비스에 억지로 새 설정 화면을 만들지 않는다.

---

## 20. 완료 census 기준

목표:

```text
미조사          = 0
VIEW_DUPLICATED = 0
CORE_ONLY       = 0
```

근거 있는:

```text
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

는 잔존 가능.

---

## 21. Backend 원칙

먼저 현행 endpoint를 확인한다.

이번 WO에서 신규 backend 계약은 만들지 않는다.

다음이 필요하면 중지/후속:

```text
email 변경 endpoint 신설
계정 탈퇴 lifecycle 신설
새 session API
Identity contract 변경
DB schema/migration
```

---

## 22. 정적 검증

공통 package 변경 시 최소:

```text
@o4o/account-ui build

KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

backend를 건드린 경우 관련 security/auth test까지 수행.

기존 unrelated 오류는 인과관계 분리 기록.

---

## 23. Production browser

기능이 실제 존재하는 모든 서비스에서 production 검증.

최소:

```text
로그인
→ My Page
→ Settings/Security 진입
→ Account 정보 표시
→ 비밀번호 UI 진입
→ 존재하는 설정/법정문서 링크 확인
→ 뒤로가기
→ 새로고침
```

desktop/mobile 모두 수행.

---

## 24. 비밀번호 production write

실제 비밀번호 변경은 복구 리스크가 있으므로 기본적으로 **UI + API 계약 검증 중심**으로 한다.

실제 write가 필요하다면:

```text
TEST-ACCOUNTS만 사용
현재 credential 안전 확보
변경
새 비밀번호로 재로그인
원래 비밀번호로 복원
복원 로그인 확인
```

까지 한 사이클로 수행한다.

실사용자 write 0.

평문 credential을 코드/로그/CHECK/Git에 기록하지 않는다.

복원 실패 가능성이 있으면 write하지 않는다.

---

## 25. Browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead settings link = 0
중복 Security UI = 0
mobile 기능 소실 = 0
double shell = 0
```

---

## 26. 결함 발견 시

이번 Settings/Security 범위 결함이면:

```text
원인 확인
→ 최소 수정
→ typecheck/build/test
→ 배포
→ production 재검증
```

까지 중간 승인 없이 수행.

다음이면 중지:

```text
DB schema/migration
Identity V2 변경
email verification 설계
membership lifecycle 변경
새 auth/session backend
다른 세션 WIP 충돌
```

---

## 27. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit
2. 5서비스 Settings/Security 모집단
3. 16기능 census
4. Before / After
5. 기존 공통 자산
6. Settings/Security Core
7. Password
8. Profile 연결
9. Email
10. Withdrawal
11. Session/logout
12. Legal/privacy links
13. Service Extension
14. 5서비스 adoption
15. desktop/mobile
16. production browser
17. production write 여부
18. backend/DB/schema
19. 잔존 followup
20. MUST_FIX_BEFORE_CLOSE
21. CHECK/commit/push
```

---

## 28. FINAL CLOSE

다음 전부 충족 시:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

중복 Settings/Security UI 수렴 완료
기존 Profile/Security canonical 자산 재사용
5서비스 adoption 판정 완료
dead link = 0
desktop/mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0
```

최종:

```text
MYPAGE SETTINGS/SECURITY TRACK = FINAL CLOSED
```

---

## 29. 후속

종료 후 다음 후보:

```text
Membership / 회원·역할 상태
Notifications
Activity / 이력
Help / 문의
```

이번 WO에서는 착수하지 않는다.

---

## 30. Git

```text
git add . 금지
path-specific stage
다른 세션 dirty/staged 파일 미접촉
```

완료 후:

```text
이번 WO 범위 dirty 0
push 완료
origin/main 반영 확인
```

---

## 31. 최종 보고

```text
1. 기준 commit / deployed revision
2. 5서비스 census
3. Before / After
4. 공통 Settings/Security Core
5. Password
6. Profile 연결
7. Email
8. Withdrawal
9. Session/logout
10. Legal/privacy
11. Service Extension
12. 5서비스 adoption
13. desktop/mobile
14. production browser
15. production write
16. typecheck/build/test
17. backend/DB/schema
18. 잔존 followup
19. MYPAGE SETTINGS/SECURITY FINAL CLOSED 여부
20. CHECK/commit/push
21. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 32. 실행 원칙

중간 승인 없이:

```text
현재 main census
→ 기존 Security/Profile 자산 조사
→ 공통화
→ 5서비스 adoption
→ 정적 검증
→ 배포
→ production desktop/mobile
→ CHECK
→ path-specific commit
→ push
```

까지 한 번에 완료한다.

**이번 작업의 핵심은 인증 구조를 새로 만드는 것이 아니라, 이미 존재하는 계정·보안 기능의 화면과 진입 경험을 하나의 My Page 계약으로 수렴시키는 것이다.**

---

## 부기 — 작성 시점 사실 (2026-08-19)

선행 트랙에서 이미 main 에 존재하는 My Page 공통 자산 (신규 생성 금지, 재사용·additive 확장 대상):

```text
packages/account-ui/src/components/MyPageShell.tsx
packages/account-ui/src/components/MyPageLayout.tsx        (re-export shim)
packages/account-ui/src/components/MyPageNavigation.tsx
packages/account-ui/src/components/MyPageUserSummary.tsx
packages/account-ui/src/components/MyPageEntryCardGrid.tsx
packages/account-ui/src/components/MyPageActivityFeed.tsx
packages/account-ui/src/components/MyPageAppreciationCard.tsx
packages/account-ui/src/components/MyRequestsInbox.tsx
packages/account-ui/src/adapters/requestNormalizers.ts
```

§6 의 Security/Profile 자산 목록은 **후보**이므로 실제 파일명·경로를 현재 main 에서 먼저 확인한 뒤 canonical 을 판정한다.

서비스별 My Page 진입 축 (선행 트랙 확정):

```text
KPA-Society      /mypage  (MyDashboardPage)
GlycoPharm       /mypage  (MyPageHub) + navItems.ts
K-Cosmetics      /mypage  (MyPageHub)
Neture           /mypage  (MyPageHub) + navItems.ts
Pharmacy-Hub     /account (+ /store-owner/account 호환 계약 유지 — /mypage 신설 금지)
```

**신규 UI package 생성 금지** — `services/web-kpa-society/Dockerfile` 이 패키지를 선별 COPY 하므로 신규 패키지는 빌드를 깨뜨린다. 공통화는 `@o4o/account-ui` additive 확장으로 수행한다.

검증 도메인 주의: K-Cosmetics 정본은 **`k-cosmetics.site`** 다. `k-cosmetics.co.kr` 은 플랫폼과 무관한 외부 쇼핑몰이므로 검증에 사용하지 않는다.

인증 주의:

- PharmacyHub 로그인 화면의 **데모 계정 채우기 버튼은 stale password** 라 401 이 난다. 검증 수단으로 사용하지 않고 `docs/local/TEST-ACCOUNTS.local.md` 기준 interactive login 을 사용한다.
- **로그인 API 는 `serviceKey` 가 필수**다. 없으면 `users.password` 로 검증돼 정상 계정도 401 이 난다. "UI 는 되는데 curl 만 401" 이면 이 원인이다.
- 자격증명은 코드·스크립트·CHECK·Git·shell history·로그 어디에도 평문으로 남기지 않는다 (§24 포함).
