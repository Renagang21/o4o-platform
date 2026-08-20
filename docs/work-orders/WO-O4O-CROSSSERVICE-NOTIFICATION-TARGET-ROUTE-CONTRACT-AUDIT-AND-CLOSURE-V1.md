# WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1

* **대상**: Agent D
* **성격**: Notification producer → consumer route 계약 전수감사 + 잘못된 target 교정 + Notifications 트랙 FINAL CLOSE
* **선행 상태**

  * `MYPAGE NOTIFICATIONS TRACK = CLOSED_WITH_FOLLOWUPS`
  * 잔존 MUST_FIX: Neture 알림 target route 404 1건

---

## 1. 목표

알림 UI 공통화는 완료됐지만, production에서 다음 결함이 확인됐다.

```text
Neture 알림:
"신규 상품 등록 요청 접수"

producer target:
 /admin/o4o-product-db/store-requests

consumer:
 web-neture

결과:
 404
```

이번 WO는 이 한 건만 임시 수정하지 않는다.

**알림 producer가 생성하는 모든 target URL/route와 실제 consumer frontend route tree의 계약을 cross-service로 전수 검증**한다.

흐름:

```text
notification producer census
→ target 계약 census
→ consumer 서비스 매핑
→ 실제 route tree 대조
→ 잘못된 target 판정
→ 최소 교정
→ production browser 검증
→ Notifications FINAL CLOSE
```

---

## 2. 대상

서비스:

```text
KPA-Society
GlycoPharm
K-Cosmetics
Neture
Pharmacy-Hub
```

조사 범위:

```text
API notification producer
service/domain notification service
controller/service/event handler
metadata.targetUrl
targetUrl
targetRoute
link
url
notification payload destination
frontend notification resolver
frontend route tree
```

Admin Dashboard는 **consumer 판별에는 포함**하지만, 무조건 일반 사용자 알림의 목적지로 인정하지 않는다.

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

다른 세션 staged/dirty/untracked 파일:

```text
수정 금지
삭제 금지
stash 금지
```

`git add .` 금지.

path-specific stage만 사용.

---

## 4. Producer 모집단 전수조사

현재 main에서 알림을 **생성하는 코드**를 전수 조사한다.

검색 대상 예:

```text
createNotification
NotificationService
notificationRepository
notifications.insert
new Notification
targetUrl
targetRoute
metadata:
notify*
notification*
```

각 producer에 대해 기록:

```text
producer file
producer function
trigger/event
serviceKey/service scope
recipient type
notification type
title/message
target field
target value
target 생성 방식
consumer frontend
```

과거 CHECK의 일부 producer 목록을 모집단으로 재사용하지 않는다.

현재 main에서 재산출한다.

**미조사 producer = 0 필수.**

---

## 5. Target 종류 분류

각 알림 target을 다음 중 하나로 판정한다.

```text
STATIC_ROUTE
DYNAMIC_ROUTE
METADATA_ROUTE
NO_TARGET
EXTERNAL_TARGET
ADMIN_TARGET
UNKNOWN
```

예:

```text
'/mypage/requests'
'/forum/posts/' + postId
metadata.targetUrl
null
```

동적 route는 실제 패턴까지 기록한다.

---

## 6. Consumer 매핑

각 producer가 만든 알림을 **어느 frontend에서 사용자가 소비하는지** 확정한다.

예:

```text
kpa notification
→ web-kpa-society

glycopharm notification
→ web-glycopharm

k-cosmetics notification
→ web-k-cosmetics

neture notification
→ web-neture

pharmacy-hub notification
→ web-pharmacy-hub
```

단순 `serviceKey` 추측으로 끝내지 말고:

```text
notification API scope
frontend fetch call
NotificationBell/Sheet 소비처
실제 로그인 도메인
```

을 근거로 확정한다.

---

## 7. 실제 Route Tree 대조

각 target을 해당 consumer frontend의 실제 route tree와 대조한다.

확인:

```text
route 존재
route param 형식
nested route/basePath
role guard
auth guard
consumer app 소유 route인지
```

특히 다음 혼동을 전수 확인:

```text
/admin/*
/operator/*
/supplier/*
/store-owner/*
/mypage/*
/account/*
```

---

## 8. 판정 라벨

각 target을 반드시 다음 중 하나로 판정한다.

```text
VALID
WRONG_SERVICE
DEAD_ROUTE
ADMIN_ONLY
ROLE_MISMATCH
MISSING_TARGET
LEGACY_ROUTE
EXTERNAL_VALID
UNKNOWN
```

의미:

### VALID

현재 consumer에서 정상 진입 가능.

### WRONG_SERVICE

다른 frontend가 소유한 route를 target으로 넣음.

### DEAD_ROUTE

어느 현행 consumer에도 route 없음.

### ADMIN_ONLY

admin-dashboard 전용 route를 일반 사용자 알림에 넣음.

### ROLE_MISMATCH

target route는 존재하지만 해당 알림 recipient가 접근 불가능.

### MISSING_TARGET

사용자 액션이 필요한 알림인데 target 없음.

### LEGACY_ROUTE

현재 compatibility route이거나 폐기 예정 route.

---

## 9. M-1 우선 교정

기존 blocker:

```text
apps/api-server/src/modules/neture/services/store-product-request-notify.ts

ADMIN_TARGET_URL =
'/admin/o4o-product-db/store-requests'
```

을 최우선 조사한다.

반드시 먼저 다음을 확정한다.

```text
이 알림 recipient가 누구인가
web-neture에서 무엇을 해야 하는 알림인가
실제 사용자 destination이 존재하는가
admin-dashboard route가 잘못 들어간 것인지
알림 자체가 admin용이어야 하는지
```

**목적지를 추측해서 임의로 `/mypage/...`로 바꾸지 않는다.**

---

## 10. 수정 원칙

수정 우선순위:

```text
1. 이미 존재하는 올바른 consumer route로 교정
2. 기존 route helper/config 재사용
3. producer의 static target만 최소 수정
```

금지:

```text
새 frontend page 신설
새 admin proxy page 신설
404를 숨기기 위한 fallback redirect
새 backend notification model
DB schema/migration
새 cross-service router
```

실제 destination 자체가 없다면:

```text
FOLLOWUP / BLOCKED
```

로 남기고 억지로 route를 만든다.

> **[정정 주석 — WO-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1 §2, 2026-08-20]**
> 위 문장은 **오기**다. 정본은 다음과 같다.
>
> ```text
> FOLLOWUP / BLOCKED
> 로 남기고 억지로 route를 만들지 않는다.
> ```
>
> 원문 커밋(`c9d80d2aa`)은 이미 push 되어 history 재작성을 하지 않으므로 본 주석으로 정정한다.
> 선행 audit 은 이미 "만들지 않는다" 독법(본 문서 부기 B)으로 실행됐으므로 **실행 결과 영향은 없다.**

---

## 11. Route SSOT 조사

같은 destination route가 여러 producer에 하드코딩되어 있으면 공통 상수/config가 이미 있는지 조사한다.

기존 SSOT가 있으면 재사용.

없더라도 이번 WO에서 거대한 routing abstraction을 만들지 않는다.

단순 문자열 1~2개 교정을 위해 새 package를 만들지 않는다.

---

## 12. Frontend Resolver 재검증

선행 Notifications WO에서 도입된:

```text
resolveNotificationTarget
```

계약을 다시 확인한다.

검증:

```text
내부 absolute path 허용
//host 차단
외부 URL 차단/정책
fallback 처리
null 처리
```

이번 WO에서 producer 계약을 고치는 것이 우선이며,

```text
resolver fallback으로 dead producer target을 숨겨서 PASS
```

하지 않는다.

---

## 13. Role 접근성

route가 존재해도 recipient가 접근할 수 없으면 실패다.

예:

```text
supplier 알림 → supplier-only route
store_owner 알림 → store-owner route
일반 member 알림 → admin route
```

확인:

```text
recipient role
route guard
expected role
```

`ROLE_MISMATCH`를 dead route와 구분한다.

---

## 14. Admin 알림 경계

Admin Dashboard용 알림과 사용자용 알림을 분리한다.

다음 경우는 정상일 수 있다.

```text
admin recipient
→ admin-dashboard route
```

하지만:

```text
일반 web-neture 사용자
→ /admin/*
```

이면 결함 가능성이 높다.

실제 recipient 계약으로 판정한다.

---

## 15. Dynamic target 검증

동적 route:

```text
/forum/:id
/requests/:id
/product/:id
```

는 문자열 prefix만 보고 PASS 하지 않는다.

최소 확인:

```text
route pattern
실제 id 형식
consumer param 명
실제 production 샘플 target
```

---

## 16. Null target

모든 알림에 링크가 필요한 것은 아니다.

예:

```text
단순 안내
시스템 공지
```

는 `NO_TARGET`이 정상일 수 있다.

`MISSING_TARGET`은:

```text
메시지가 명확히 사용자 행동을 요구하지만
destination이 없는 경우
```

에만 사용한다.

---

## 17. Cross-service 오염

알림 target이 다른 서비스로 잘못 이동하는지 확인한다.

예:

```text
KPA → GP
KCos → Neture
Neture → Admin
PH → KPA
```

최종 기준:

```text
cross-service wrong navigation = 0
```

---

## 18. Production browser 검증

수정 대상뿐 아니라 대표 target을 5서비스에서 실제 production으로 확인한다.

최소:

```text
로그인
→ 알림 열기
→ target 있는 알림 클릭
→ 기대 서비스/화면 도착
→ 뒤로가기
```

각 서비스에서 target 알림이 production 데이터에 없다면:

```text
API payload
route resolver
route tree
```

3단 증거로 대체 가능하되 이유를 CHECK에 기록한다.

---

## 19. M-1 production 재검증

Neture에서 반드시:

```text
로그인
→ Notifications
→ "신규 상품 등록 요청 접수"
→ 클릭
```

후:

```text
404 = 0
잘못된 admin route 이동 = 0
기대 destination 도달
console error = 0
```

를 확인한다.

해당 알림 샘플이 더 이상 없다면 동일 producer가 생성한 테스트계정 샘플 또는 API payload 기준 대체 증거를 확보한다.

DB 직접 insert 금지.

---

## 20. Production write

기본 write 0.

알림 생성 테스트가 기존 안전한 사용자 흐름으로 가능하고 복구 불필요하면 TEST-ACCOUNTS에 한해 허용 가능.

금지:

```text
DB 직접 notification insert
실사용자 알림 생성
실사용자 상태 변경
admin 운영 데이터 변경
```

---

## 21. 정적 검증

수정 범위에 맞춰 최소:

```text
api-server typecheck
관련 frontend typecheck/build
@o4o/account-ui build
```

producer 수정 시 관련 unit/security test가 있으면 수행.

신규 route를 만드는 작업은 원칙적으로 없어야 한다.

---

## 22. 전수 census 완료 기준

최종 producer/target census:

```text
미조사 producer = 0
UNKNOWN target = 0
WRONG_SERVICE = 0
DEAD_ROUTE = 0
ADMIN_ONLY 오류 = 0
ROLE_MISMATCH = 0
```

근거 있는:

```text
NO_TARGET
EXTERNAL_VALID
LEGACY_ROUTE
```

는 정상 잔존 가능.

---

## 23. MUST_FIX

다음은 closure blocker:

```text
실제 notification click 404
wrong-service navigation
일반 사용자 → admin-only route
recipient role 접근 불가
알림 action destination dead
```

최종:

```text
MUST_FIX_BEFORE_CLOSE = 0
```

필수.

---

## 24. Notifications 트랙 종료

이 WO가 PASS하면 선행:

```text
MYPAGE NOTIFICATIONS TRACK
= CLOSED_WITH_FOLLOWUPS
```

를:

```text
MYPAGE NOTIFICATIONS TRACK
= FINAL CLOSED
```

로 정합화한다.

단, 다음 followup은 blocker 아님:

```text
adapter 5벌 잔존
조회 실패 삼킴
ForumNotification 소비 0
SSE 미소비
KPA dead service key constant
Neture unread-count 중복
message mojibake
```

이번 WO에 섞지 않는다.

---

## 25. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1.md
```

포함:

```text
1. 기준 commit / deployed revision
2. producer 모집단
3. target census
4. consumer mapping
5. route tree 대조
6. target 판정 matrix
7. M-1 root cause
8. M-1 correction
9. 기타 발견 결함
10. role accessibility
11. cross-service contamination
12. frontend resolver 검증
13. static/typecheck/build/test
14. production browser
15. production write
16. backend/DB/schema
17. 잔존 followup
18. MUST_FIX_BEFORE_CLOSE
19. Notifications FINAL CLOSE 판정
20. CHECK/commit/push
```

기존 Notifications CHECK도:

```text
CLOSED_WITH_FOLLOWUPS
→ FINAL CLOSED
```

로 정합화한다.

---

## 26. 중지 조건

다음이 필요하면 임의 확장하지 말고 중지/보고:

```text
새 사용자 destination 화면 필요
새 frontend route 필요
DB schema/migration
notification entity 재설계
admin/user notification architecture 재설계
Identity/membership 계약 변경
다른 세션 WIP 충돌
```

---

## 27. Git

```text
git add . 금지
path-specific stage
다른 세션 staged/dirty/untracked 파일 미접촉
```

완료:

```text
이번 WO 범위 dirty 0
push 완료
origin/main 반영 확인
```

---

## 28. 최종 보고

```text
1. 기준 commit / deployed revision
2. 전체 producer 수
3. 전체 target 수
4. target 판정 분포
5. consumer mapping
6. M-1 root cause
7. M-1 수정
8. 추가 발견 결함/수정
9. role 접근성
10. cross-service navigation
11. production browser
12. production write
13. typecheck/build/test
14. backend/DB/schema
15. 잔존 followup
16. MUST_FIX_BEFORE_CLOSE
17. MYPAGE NOTIFICATIONS FINAL CLOSED 여부
18. CHECK/commit/push
19. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 29. 실행 원칙

중간 승인 없이:

```text
최신 main 확인
→ producer 전수 census
→ target 전수 census
→ consumer/route 대조
→ 판정
→ 최소 교정
→ 정적 검증
→ 배포
→ production browser
→ Notifications CHECK 정합
→ 신규 CHECK
→ path-specific commit
→ push
```

까지 한 번에 진행한다.

**이번 작업의 핵심은 알림 UI를 다시 공통화하는 것이 아니라, 알림 생산자가 내보내는 목적지가 실제 소비 서비스에서 살아 있는 route라는 cross-service 계약을 확정하는 것이다.**

---

## 부기 (실행 시점 사실 · 알려진 함정)

> 본문 §1~§29 는 발주 원문이다. 아래는 착수 시점의 저장소 실측 사실과 선행 트랙에서 확인된 함정이며, 원문과 충돌하면 원문이 우선한다.
> 아래 경로 목록은 **모집단의 출발점일 뿐 결론이 아니다.** §4 대로 현재 main 에서 직접 재산출한다.

### A. 기준 상태

* 기준 commit: `685508ec1` (`HEAD == origin/main`)
* 선행 Notifications CHECK: `docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md` (`1ca32bf3f` + `685508ec1`), 현재 `CLOSED_WITH_FOLLOWUPS`
* 선행 WO: `docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md`

### B. §10 원문 오기 — 판독 결과

§10 마지막 줄이 원문에 다음과 같이 적혀 있다.

```text
실제 destination 자체가 없다면:
FOLLOWUP / BLOCKED
로 남기고 억지로 route를 만든다.
```

**같은 §10 의 금지 목록이 "새 frontend page 신설 / 새 admin proxy page 신설" 을 명시하고, §26 중지 조건이 "새 frontend route 필요" 를 중지 사유로 두고 있다.** 따라서 정합적 판독은 **"억지로 route 를 만들지 않는다"** 이며, 이 WO 는 그 해석으로 실행한다. destination 이 없으면 `FOLLOWUP / BLOCKED` 로 남기고 route 를 만들지 않는다. 판단이 갈리면 중지·보고한다.

### C. Producer 모집단 출발점 (실측 — §4 재산출 전제)

`apps/api-server/src` 에서 `targetUrl|createNotification|notificationService.(create|notify)` 로 걸리는 파일 **27개**. 아래에는 테스트·엔티티·타입 파일이 섞여 있으므로 **실제 producer 로 확정하려면 각 파일을 열어 확인해야 한다.**

```text
modules/neture/services/store-product-request-notify.ts   ← M-1 (§9 최우선)
modules/neture/services/offer-service-approval.service.ts
modules/neture/services/partner-contract.service.ts
modules/neture/services/neture-settlement.service.ts
modules/neture/services/supplier.service.ts
modules/neture/controllers/contact.controller.ts
modules/auth/controllers/auth-register.controller.ts
modules/auth/controllers/handoff.controller.ts
modules/contact-inquiry/public-contact-inquiry.controller.ts
modules/lms/services/CourseService.ts
routes/glycopharm/services/glycopharm-member.service.ts
routes/kpa/controllers/member.controller.ts
routes/kpa/controllers/contact-request.controller.ts
routes/kpa/controllers/kpa-checkout.controller.ts
routes/o4o-store/controllers/qr.controller.ts
routes/o4o-store/controllers/operator-qr.controller.ts
routes/platform/store-public/store-public-tablet.handler.ts
services/NotificationService.ts                            ← 공통 진입 (producer 아님, 계약 SSOT)
services/marketTrial.notification.ts
services/degradation/degradation-execution.ts
```

제외 후보(코드가 아니거나 producer 가 아님 — 근거를 CHECK 에 남길 것):

```text
routes/kpa/controllers/__tests__/*.test.ts   (5건, 테스트)
routes/o4o-store/entities/operator-qr-template.entity.ts   (엔티티)
types/graceful-degradation-types.ts          (타입)
apps/api-server/notification.service.legacy.txt   (텍스트 파일, 코드 아님)
```

**주의**: 위 grep 패턴은 `targetUrl` 를 쓰지 않는 producer 를 놓칠 수 있다. §4 의 다른 키워드(`new Notification`, `notify*`, `metadata:`)로도 교차 검색해 모집단을 확정하라. **미조사 producer 0** 이 요건이다.

### D. M-1 확인된 사실 (§9 출발점, 결론 아님)

```text
apps/api-server/src/modules/neture/services/store-product-request-notify.ts

// 관리자 검토 화면(admin-dashboard O4O 상품 DB) / 매장 요청 목록(handled-products 상단 '내 등록 요청')
const ADMIN_TARGET_URL = '/admin/o4o-product-db/store-requests';
const STORE_TARGET_URL = '/store/handled-products';
```

**주석이 이미 `ADMIN_TARGET_URL` 을 "admin-dashboard 화면" 이라고 명시하고 있다.** 즉 producer 는 admin recipient 를 의도했을 가능성이 있다. §14 대로 **실제 recipient 계약**(누구에게 broadcast 되는가)을 먼저 확정하라. recipient 가 admin 이면 `ADMIN_ONLY` 가 정상일 수 있고, 일반 Neture 사용자에게도 broadcast 되고 있다면 그 broadcast 대상 결정 로직이 결함이다. **§9 대로 목적지를 추측해 `/mypage/...` 로 바꾸지 말 것.**

`STORE_TARGET_URL = '/store/handled-products'` 도 같은 파일에 있으므로 이쪽 경로의 유효성도 함께 판정한다.

### E. Frontend resolver (§12 재검증 대상)

선행 WO 산출물. 이 파일들이 판정 기준이다.

```text
packages/account-ui/src/notifications/resolveTarget.ts      ← resolveNotificationTarget
packages/account-ui/src/notifications/NotificationListBody.tsx
packages/account-ui/src/components/NotificationSheet.tsx
packages/account-ui/src/components/NotificationBell.tsx

services/web-kpa-society/src/lib/notificationRouting.ts     ← 서비스 fallback
services/web-neture/src/lib/notificationRouting.ts
```

resolver 는 내부 절대경로 검증 → 서비스 fallback → `null` 순으로 동작한다. **§12 경고가 핵심이다** — dead producer target 이 fallback 으로 그럴듯한 화면에 도착해도 그것은 PASS 가 아니다. producer 계약 자체를 판정하라.

### F. Route tree 대조 지점 (§7)

각 consumer 의 route 정의 위치를 먼저 특정한 뒤 대조한다. 서비스마다 구조가 다르므로 추측하지 말고 실제 라우터 파일을 열어라.

```text
services/web-kpa-society/src/     (KPA store 프론트는 이 패키지다)
services/web-glycopharm/src/
services/web-k-cosmetics/src/
services/web-neture/src/
services/web-pharmacy-hub/src/
apps/admin-dashboard/src/         ← §2 대로 consumer 판별에는 포함, 사용자 알림 목적지로는 불인정
```

PH 는 `/mypage` 가 없고 `/account` · `/store-owner/account` 축이다 — target 이 `/mypage/*` 를 가리키면 PH 에서는 DEAD 다.

### G. 검증 함정

* 로그인 API 는 **`serviceKey` 필수**. 없으면 `users.password` 로 검증돼 정상 계정도 401 이 된다.
* K-Cosmetics 프로덕션 도메인은 **`k-cosmetics.site`** (`k-cosmetics.co.kr` 은 무관한 외부 쇼핑몰).
* PH 로그인 화면 데모 버튼 비밀번호는 stale 하다. 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 만 신뢰한다 (CLAUDE.md §15).
* 배포 후 stale chunk 로 구버전이 보일 수 있다 — 캐시 버스트 후 재확인.
* **선행 4트랙 모두, 정적 분석은 통과했으나 실제 브라우저에서만 결함이 드러났다.** §18·§19 는 스냅샷이 아니라 실제 이동 결과와 네트워크 응답으로 판정한다.
* 선행 WO 검증 시 **모든 테스트 계정의 `unreadCount = 0`** 이었다. §18 의 "target 알림이 production 데이터에 없다면 3단 증거로 대체" 조항이 실제로 발동할 가능성이 높다 — 그 경우 이유를 CHECK 에 명시하라.
* `Notification` 과 `ForumNotification` 은 **별개 entity·별개 route** 다. 통합은 §26 중지 조건이다.

### H. §24 선행 CHECK 정합화

`docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md` 의 판정을 `FINAL CLOSED` 로 갱신하는 것은 **이 WO 가 §22·§23 을 전부 충족했을 때만** 한다. MUST_FIX 가 남으면 선행 CHECK 도 그대로 둔다. CLAUDE.md §16 상 `docs/checks/**` 는 기록물이므로, 이번처럼 **명시적으로 지시된 정합화 외에는 손대지 않는다.**

### I. Git

* main 직접 작업. path-specific stage 만 사용하고 `git add .` 는 금지한다.
* 착수 시점에 다른 세션의 untracked 파일 `packages/shared-space-ui/src/ForumWritePageShell.tsx` 가 있었다. 이런 파일은 stage·수정·삭제·stash 하지 않는다.
* push 된 커밋은 amend·force-push 하지 않는다.
* 완료 조건은 저장소 전체 clean 이 아니라 **이번 WO 범위 미커밋 0건 + `HEAD == origin/main`** 이다.
