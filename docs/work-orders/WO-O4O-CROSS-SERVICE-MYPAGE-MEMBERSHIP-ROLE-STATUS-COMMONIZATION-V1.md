# WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1

* **대상**: Agent D
* **성격**: My Page `Membership / 회원·역할 상태` 기능 census → 공통화 → 5서비스 adoption → production 검증
* **선행 완료**

  * `PROFILE TRACK = FINAL CLOSED`
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED`
  * `MYPAGE HOME/HUB TRACK = FINAL CLOSED`
  * `MYPAGE REQUESTS TRACK = FINAL CLOSED`
  * `MYPAGE SETTINGS/SECURITY TRACK = FINAL CLOSED`

---

## 1. 목표

My Page의 다음 개별 기능인 **회원 상태 / 서비스 역할 / 가입·승인 상태(Membership / Role Status)** 를 5서비스 기준으로 공통화한다.

핵심:

```text
5서비스 Membership/Role Status census
→ 공통 표시 모델 분리
→ 서비스별 lifecycle/role 정책은 유지
→ 공통 Status View/Core 구현
→ 5서비스 adoption
→ production desktop/mobile 검증
```

이번 WO는 membership lifecycle 자체를 새로 설계하거나 통합하지 않는다.

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

---

## 4. 모집단 재산출

현재 main에서 개인 사용자 관점의 membership/role/status 관련 route/page/component를 전수 조사한다.

대표 범위:

```text
/mypage
/mypage/membership
/mypage/status
/account
/join/status
가입 상태
서비스 회원 상태
역할 표시
승인/대기/거절 상태
store-owner / supplier / operator 등 역할 진입
```

과거 CHECK 수치를 재사용하지 않는다.

---

## 5. 기능 census

화면 수가 아니라 아래 기능 단위로 5서비스를 판정한다.

```text
1. 서비스 membership 존재 여부
2. membership 현재 상태
3. 가입 승인 상태
4. 거절/반려 상태
5. 활성/비활성 상태
6. 역할(role) 표시
7. 복수 역할 표시
8. 역할별 기능 진입
9. 가입일/승인일 등 상태 메타데이터
10. membership 없음 상태
11. pending/rejected 사용자 UX
12. role/membership 기반 visibility
13. Home/Navigation 진입
14. empty/loading/error
15. mobile UX
16. 서비스별 membership extension
```

각 항목 기록:

```text
route
page/component
API
data source
status enum
role source
visibility rule
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

## 6. Requests와 경계

Requests와 Membership을 섞지 않는다.

```text
Requests
= 내가 무엇을 신청했고 처리 결과가 무엇인가

Membership
= 지금 현재 내가 이 서비스에서 어떤 상태/역할인가
```

신청 이력은 Requests 트랙 소유.

이번 WO는 **현재 상태의 표현과 기능 진입**만 다룬다.

---

## 7. 공통화 목표

공통화 대상은 membership/role의 **표시 구조와 진입 경험**이다.

개념:

```text
MyPageMembershipStatus
├─ MembershipSummary
├─ StatusBadge
├─ RoleBadgeGroup
├─ StatusDescription
├─ StatusMetadata
├─ AvailableActions
└─ ServiceExtension
```

실제 필요한 컴포넌트만 최소 추가한다.

신규 package 생성 금지.

가능하면 기존 `@o4o/account-ui` 자산을 확장한다.

---

## 8. 기존 자산 우선 재사용

먼저 현재 공통 자산을 조사한다.

대표:

```text
MyPageUserSummary
RoleBadgeGroup
statusNotice slot
MyPageEntryCardGrid
MyPageShell
MyPageNavigation
```

같은 표현을 새로 만들지 않는다.

기존 자산으로 충분하면 adoption만 한다.

---

## 9. 최소 공통 View Model

서비스별 backend enum을 하나로 통합하지 않는다.

필요하면 frontend adapter에서 최소 표시 모델로 변환한다.

예:

```text
membershipExists
status
statusLabel
statusTone
roles
description
joinedAt
approvedAt
actions
metadata
```

공통 View는 이 모델만 소비한다.

---

## 10. 상태값 원칙

서비스별 status enum은 그대로 유지한다.

예:

```text
pending
active
approved
rejected
inactive
suspended
withdrawn
```

실제 enum이 다르더라도 backend를 재설계하지 않는다.

공통화 대상:

```text
label
tone
description
action availability
```

서비스별 status → 표시 모델 변환은 adapter/config에서 처리한다.

---

## 11. Role 원칙

role 자체를 공통 enum으로 재설계하지 않는다.

예:

```text
member
store_owner
supplier
partner
operator
admin
```

서비스별 기존 role SSOT 유지.

공통화 대상은:

```text
역할 표시
복수 role badge
역할별 진입 카드
visibility
```

이다.

---

## 12. 권한 판정

공통 View 내부에 다음을 하드코딩하지 않는다.

```text
serviceKey별 분기
서비스명별 분기
role 문자열 직접 비교
status 문자열 직접 비교
```

기존:

```text
role/capability helper
membership helper
service config
```

를 재사용한다.

---

## 13. 서비스별 lifecycle 유지

근거 있는 차이는 `SERVICE_SPECIFIC`으로 유지한다.

예:

### KPA

```text
회원/직역/약사회 관련 상태
복수 역할
승인 상태
```

### GlycoPharm

```text
서비스 가입/승인 상태
약사 관련 역할
```

### K-Cosmetics

```text
회원/매장 관련 상태
운영 승인 상태
```

### Neture

```text
member / supplier / partner
공급자 역할 게이팅
```

### Pharmacy-Hub

```text
operator / store_owner
가입 상태
매장 연결/승인 상태
```

이들을 하나의 membership state machine으로 합치지 않는다.

---

## 14. pending / rejected UX

각 서비스에서 pending/rejected 사용자가 My Page에서 무엇을 보는지 확인한다.

확인:

```text
Shell 유지 여부
현재 상태 표시
재신청/문의 진입 여부
Profile/Settings 접근 가능 여부
dead end 여부
```

의도된 제한은 정상.

단, 상태 화면이 Shell 밖에서 렌더되거나 navigation이 사라지는 경우 공통화 범위에서 정렬한다.

---

## 15. membership 없음 상태

membership이 없는 로그인 사용자의 UX를 전수 확인한다.

예:

```text
가입 안내
서비스 신청
권한 없음
빈 상태
```

`401/403`만 던지고 끝나는 구조와 의도된 UX를 구분한다.

새 membership 생성 API는 만들지 않는다.

---

## 16. 역할별 기능 진입

Home/Hub와 연결되는 role 기반 entry를 점검한다.

예:

```text
매장 관리
공급자 관리
파트너 영역
운영자 영역
```

잘못된 역할에 노출되지 않아야 한다.

dead entry 0.

---

## 17. 복수 역할

복수 role이 가능한 서비스는 모두 확인한다.

공통화 대상:

```text
RoleBadgeGroup
label
order
visibility
```

권한 우선순위 자체는 변경하지 않는다.

---

## 18. Service Extension

서비스별 추가 상태 표현은 Extension으로 유지한다.

예:

```text
직역
면허
매장 연결
공급자 승인
조직 소속
서비스 승인
```

공통 Membership Core에 억지로 흡수하지 않는다.

---

## 19. Settings와 경계

다음은 Settings 소유:

```text
비밀번호
로그아웃
세션
알림 toggle
```

Membership 화면에서는 필요한 경우 진입 링크만 제공한다.

Settings/Security Core를 재작성하지 않는다.

---

## 20. Operator/Admin 제외

이번 WO는 개인 My Page 관점이다.

범위 밖:

```text
운영자 회원 승인 콘솔
관리자 role 변경
비밀번호 강제 변경
membership 관리자 편집
대량 승인/반려
```

운영자가 보는 상태 관리 화면은 별도 영역이다.

---

## 21. Backend 원칙

먼저 현행 API/data source를 전수 확인한다.

신규 backend 계약을 만들지 않는다.

다음이 필요하면 blocker/followup:

```text
새 membership endpoint
role contract 변경
status enum 재설계
membership lifecycle 변경
DB schema/migration
```

이번 WO에서 확장하지 않는다.

---

## 22. 죽은/중복 UI 처리

명확히 판정한다.

```text
동일 membership 상태 UI 2벌 이상
→ VIEW_DUPLICATED

공통 자산 있으나 로컬 조립
→ CORE_ONLY

route/menu는 있으나 실제 화면 dead
→ MUST_FIX 또는 제거

legacy 상태 component 소비처 0
→ 제거 후보
```

thin wrapper 전환 허용.

---

## 23. 5서비스 adoption

공통 Core를 만들었다면 반드시:

```text
KPA
GP
KCos
Neture
PH
```

전부 adoption 여부를 판정한다.

기능이 없는 서비스에 억지로 새 membership 페이지를 만들지 않는다.

---

## 24. 완료 census 기준

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

## 25. Mobile

반드시 실측:

```text
role badge wrap
status label 잘림 없음
action 접근 가능
long service label 처리
horizontal overflow 없음
navigation 유지
```

---

## 26. Production browser

기능이 존재하는 모든 서비스에서 실제 production 검증.

최소:

```text
로그인
→ My Page
→ 현재 membership/role 상태 확인
→ role badge
→ 상태별 entry/action
→ 역할 전용 영역 진입
→ 뒤로가기
→ 새로고침
```

가능하면:

```text
active 계정
pending/rejected 또는 membership 없는 테스트 계정
```

을 구분해 검증한다.

실사용자 상태를 변경하지 않는다.

---

## 27. Production write

기본 **write 0**.

membership status/role 변경은 이번 WO에서 수행하지 않는다.

금지:

```text
role 변경
membership 승인/반려
상태 강제 변경
실사용자 membership write
```

필요한 검증은 기존 테스트 계정의 현재 상태를 read-only로 사용한다.

---

## 28. Browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead role entry = 0
잘못된 role 노출 = 0
잘못된 status label = 0
mobile 기능 소실 = 0
double shell = 0
```

의도된 role/membership guard는 실패로 세지 않는다.

---

## 29. 결함 발견 시

이번 Membership/Role Status 범위 결함이면:

```text
원인 확인
→ 최소 수정
→ typecheck/build
→ 배포
→ production 재검증
```

까지 중간 승인 없이 진행.

다음이면 중지:

```text
DB schema/migration
membership lifecycle 재설계
Identity 변경
role hierarchy 변경
신규 backend 계약
다른 세션 WIP 충돌
```

---

## 30. 정적 검증

공통 package 변경 시 최소:

```text
@o4o/account-ui build

KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

backend 무변경이면 backend test 불필요.

관련 backend 변경 발생 시 membership/security regression 추가.

---

## 31. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit
2. 5서비스 모집단
3. 16기능 census
4. API/data source
5. Before / After
6. 공통 Membership/Role Core
7. status mapping
8. role mapping/display
9. pending/rejected UX
10. membership 없음 UX
11. role-based entry
12. Service Extension
13. 5서비스 adoption
14. desktop/mobile
15. production browser
16. production write 여부
17. backend/DB/schema
18. 잔존 followup
19. MUST_FIX_BEFORE_CLOSE
20. CHECK/commit/push
```

---

## 32. FINAL CLOSE

다음 전부 충족 시:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

중복 Membership/Role UI 수렴 완료
5서비스 adoption 판정 완료
잘못된 role/status 노출 = 0
dead role entry = 0
desktop/mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0
```

최종:

```text
MYPAGE MEMBERSHIP/ROLE STATUS TRACK = FINAL CLOSED
```

---

## 33. 후속

종료 후 다음 후보:

```text
Notifications
Activity / 이력
Help / 문의
```

이번 WO에서는 착수하지 않는다.

---

## 34. Git

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

## 35. 최종 보고

```text
1. 기준 commit / deployed revision
2. 5서비스 census
3. Before / After
4. 공통 Membership/Role Core
5. status mapping
6. role 표시
7. pending/rejected UX
8. membership 없음 UX
9. role-based entry
10. Service Extension
11. 5서비스 adoption
12. desktop/mobile
13. production browser
14. production write
15. typecheck/build/test
16. backend/DB/schema
17. 잔존 followup
18. MYPAGE MEMBERSHIP/ROLE STATUS FINAL CLOSED 여부
19. CHECK/commit/push
20. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 36. 실행 원칙

중간 승인 없이:

```text
현재 main census
→ API/data source 조사
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

**이번 작업의 핵심은 회원제도 자체를 통합하는 것이 아니라, 사용자가 My Page에서 자신의 현재 서비스 상태와 역할을 일관되게 이해하고 올바른 기능으로 진입할 수 있도록 표현 계층을 공통화하는 것이다.**

---

## 부기 (실행 시점 사실 · 알려진 함정)

> 본문 §1~§36 은 발주 원문이다. 아래는 착수 시점의 저장소 사실과 선행 트랙에서 확인된 함정이며, 원문과 충돌하면 원문이 우선한다.

### A. 기준 상태

* 기준 commit: `9897eef5b` (`HEAD == origin/main`, 작업트리 clean)
* 선행 5트랙 CHECK: Shell `0d7a47707` · Home/Hub `08b68a60d` · Requests `732743649` · Settings/Security `ada123e72`

### B. §8 재사용 가능한 기존 공통 자산 (실측 경로)

`packages/account-ui/src/components/` 에 이미 존재하며, 전부 `packages/account-ui/src/index.ts` 에서 export 된다.

```text
RoleBadge.tsx            → RoleBadge, RoleBadgeGroup   (§8·§17 1순위 재사용 대상)
MyPageUserSummary.tsx    → 사용자 요약 + 역할 표시
MyPageEntryCardGrid.tsx  → §16 role 기반 entry
MyPageHubCard.tsx        → 개별 entry 카드
MyPageShell.tsx          → §14 Shell 유지 판정 기준
MyPageNavigation.tsx     → §14 navigation 소실 판정 기준
MyPageLayout.tsx         → 레이아웃
MyPageAuthRequired.tsx   → §15 미인증/무권한 UX
MyPageEmptyState.tsx     → §15 빈 상태
MyPageLoadingState.tsx   → §5-14 loading
RequestStatusBadge.tsx   → status badge 선례 (DEFAULT_STATUS_CONFIG 패턴)
MyPageActivityFeed.tsx / MyPageAppreciationCard.tsx  → Home/Hub 트랙 산출물
MyRequestsInbox.tsx      → §6 경계 확인용 (Requests 소유, 침범 금지)
```

`RequestStatusBadge` 의 `DEFAULT_STATUS_CONFIG` + 서비스 override 패턴이 §10 (label/tone/description 만 공통화) 의 검증된 선례다. 새 status badge 를 만들기 전에 이 패턴을 먼저 검토한다.

`packages/account-ui/src/adapters/requestNormalizers.ts` 는 §9 "frontend adapter 에서 최소 표시 모델로 변환" 의 선례다. membership adapter 도 같은 위치·같은 형태를 우선 검토한다.

### C. §7 신규 package 금지의 실제 이유

`services/web-kpa-society/Dockerfile` 은 monorepo package 를 **선별 COPY** 한다. 신규 package 를 만들면 COPY 라인 누락으로 KPA 빌드가 깨진다. 확장은 반드시 기존 `@o4o/account-ui` 안에서 한다.

### D. 서비스별 진입 축 (실측)

```text
KPA-Society   /mypage            (프론트 = services/web-kpa-society)
GlycoPharm    /mypage
K-Cosmetics   /mypage
Neture        /mypage
Pharmacy-Hub  /account · /store-owner/account   ← /mypage 없음. §23 "억지로 새 페이지 금지" 적용 대상
```

### E. Membership/Role SSOT (CLAUDE.md §14 F9·F11)

```text
role_assignments      = RBAC 단일 소스 (F9)
service_memberships   = 서비스 membership (F11)
organization_members  = 업무상 역할 · status 컬럼 없음 → left_at IS NULL 로 활성 판정
kpa_members           = KPA 회원 자격 (status='pending' 이 canonical 온보딩)
kpa_pharmacist_profiles = 자격(Qualification)
```

* `users.role` 사용 금지 (F11). role 은 membership 에서 파생한다.
* **KPA 회원 자격 조직(`kpa_members`) ≠ 매장 조직(`organization_members`)** — 두 축을 혼용하면 403 이 난다 (`wo-kpa-signage-canonical-api-403-resolution`). 매장 조직은 `useStoreOrganizationId()`.
* §21 대로 이 테이블들에 대한 schema/lifecycle 변경은 blocker.

### F. 검증 함정

* 로그인 API 는 **`serviceKey` 필수**. 없으면 `users.password` 로 검증돼 정상 계정도 401 이 된다. "UI 는 되는데 curl 만 401" 이면 이 원인이다.
* K-Cosmetics 프로덕션 도메인은 **`k-cosmetics.site`** (`k-cosmetics.co.kr` 은 무관한 외부 쇼핑몰).
* PH 로그인 화면의 데모 버튼 비밀번호는 stale 하다. 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 만 신뢰한다 (CLAUDE.md §15).
* 배포 후 stale chunk 로 구버전이 보일 수 있다 — 캐시 버스트 후 재확인.
* Requests 트랙에서 실제 브라우저 검증으로만 잡힌 결함이 2건 있었다 (raw enum 노출 · 같은 신청의 label 불일치). §26 은 스냅샷이 아니라 **실제 렌더 문자열**을 판정한다.

### G. §12 anti-hardcoding 자체 점검

공통 컴포넌트 커밋 전 아래를 실행하고, 매칭이 주석 외에 남으면 §12 위반이다.

```bash
grep -nE "serviceKey|kpa|glycopharm|cosmetics|neture|pharmacy|role ===|status ===" \
  packages/account-ui/src/components/<새-또는-변경-컴포넌트>.tsx
```

props 타입 선언(`serviceKey?: string;`)은 허용되나, 그 값으로 분기하면 위반이다.

### H. Git

* main 직접 작업. path-specific stage 만 사용하고 `git add .` 는 금지한다.
* 다른 세션의 dirty/untracked 파일은 stage·수정·stash 하지 않는다. 경로가 충돌하면 중지·보고한다.
* push 된 커밋은 amend·force-push 하지 않는다.
* 완료 조건은 저장소 전체 clean 이 아니라 **이번 WO 범위 미커밋 0건 + `HEAD == origin/main`** 이다.
