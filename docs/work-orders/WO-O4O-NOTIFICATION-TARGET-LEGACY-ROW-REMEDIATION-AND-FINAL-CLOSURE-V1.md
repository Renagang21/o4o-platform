# WO-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1

* **대상**: Agent D
* **성격**: Notification legacy dead-target production row 정리 + 잔존 dead route 판정/교정 + Notifications 트랙 FINAL CLOSE
* **선행 상태**

  * `MYPAGE NOTIFICATIONS TRACK = CLOSED_WITH_FOLLOWUPS`
  * `WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1 = PASS_WITH_MUST_FIX`
* **잔존 MUST_FIX**

  * MF-1: 기존 production notification row의 dead `targetUrl`
  * MF-2: `/hub/products/{id}` `DEAD_ROUTE`

---

## 1. 목표

알림 표시 계층 공통화와 producer→consumer target 계약 감사는 완료됐다.

현재 Notifications 트랙을 막는 것은 두 가지다.

```text
MF-1
producer 수정 이전에 생성된 production row가
여전히 dead targetUrl을 보유

MF-2
/hub/products/{id}
→ 현행 consumer route tree에 유효한 destination 없음
```

이번 WO는 이 두 건을 닫고:

```text
MYPAGE NOTIFICATIONS TRACK = FINAL CLOSED
```

까지 종료하는 작업이다.

---

## 2. 선행 문서 오기 정정

선행 WO §10의:

```text
FOLLOWUP / BLOCKED 로 남기고
억지로 route를 만든다.
```

는 오기다.

정본:

```text
FOLLOWUP / BLOCKED 로 남기고
억지로 route를 만들지 않는다.
```

실행 결과에는 영향 없으며, 관련 CHECK/WO 문서에 최소 정정 또는 정정 주석을 남긴다.

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

다른 세션 dirty/staged/untracked 파일은:

```text
수정 금지
삭제 금지
stash 금지
```

`git add .` 금지, path-specific stage만 사용.

---

# PART A — MF-1 production legacy row remediation

## 4. production census 재산출

과거 보고 숫자:

```text
Neture 2건
GP/KCos 5건
총 7건
```

을 그대로 사용하지 않는다.

**실행 시점 production DB에서 다시 census**한다.

대상은 notification row 중:

```text
producer 수정 이전 생성
+
현재 dead/invalid targetUrl 보유
```

인 row만.

각 row 기록:

```text
id
serviceKey
recipient/user scope
type
title
createdAt
targetUrl
metadata/deepLink/linkUrl
producer 추정
현재 target 판정
```

---

## 5. row 분류

각 legacy row를 다음 중 하나로 판정한다.

```text
A. 올바른 현행 destination이 확정됨
B. 정보성 알림이라 target 불필요
C. 행동이 필요한데 destination 자체가 없음
D. producer/의미 불명확
```

`C/D`를 임의 route로 메우지 않는다.

---

## 6. production UPDATE 허용 범위

이번 WO에서는 MF-1을 닫기 위해 **제한적 production UPDATE를 명시적으로 허용**한다.

허용:

```text
notification legacy target 관련 필드 교정
targetUrl
필요 시 동일 의미의 metadata target field
```

조건:

```text
사전 census로 row ID/조건 확정
target 의미가 검증된 row만
최소 필드만 변경
before snapshot
after 재조회
건수 일치 확인
```

---

## 7. production UPDATE 금지

다음 변경 금지:

```text
notification INSERT
notification DELETE
title 변경
message 변경
recipient 변경
userId 변경
serviceKey 변경
type 변경
read/unread 변경
createdAt 변경
membership 변경
role 변경
실사용자 계정 변경
범위 밖 일괄 UPDATE
```

---

## 8. row별 remediation 원칙

### A. 올바른 destination 확정

```text
dead target
→ existing valid target로 교정
```

### B. 정보성 알림

실제 사용자 행동이 필요 없고 클릭 대상이 본질적으로 불필요하면:

```text
targetUrl → null/미지정
```

이 현재 notification contract에 안전한지 확인 후 적용.

### C. destination 없음

production row를 임의 route로 바꾸지 않는다.

```text
BLOCKED
```

로 유지.

### D. 의미 불명확

수정하지 않는다.

---

## 9. UPDATE 안전 절차

반드시:

```text
1. 대상 row SELECT
2. before snapshot
3. 정확한 predicate 확인
4. transaction 내 UPDATE
5. affected row count 확인
6. COMMIT
7. 재조회
8. 예상 외 row 변경 0 확인
```

가능하면 row ID 기반으로 수행한다.

넓은 문자열 조건만으로 UPDATE하지 않는다.

---

# PART B — MF-2 `/hub/products/{id}`

## 10. producer 추적

`/hub/products/{id}`를 생산하는 모든 code path를 찾는다.

확인:

```text
producer file
producer function
trigger
recipient
serviceKey
notification title/message
대상 product/entity
target 생성 방식
```

미조사 0.

---

## 11. 알림 의미 확정

이 알림을 받은 사용자가 클릭 후 실제로 무엇을 해야 하는지 확정한다.

질문:

```text
단순 상품 등록/변경 알림인가?
상품 상세를 봐야 하는가?
승인/검토를 해야 하는가?
매장/공급자 화면에서 행동해야 하는가?
관리자 업무인가?
```

메시지와 producer context로 증명한다.

---

## 12. 현행 destination 재탐색

현재 main route tree에서 실제 대체 destination을 찾는다.

조사:

```text
web-kpa-society
web-glycopharm
web-k-cosmetics
web-neture
web-pharmacy-hub
admin-dashboard
operator/supplier/store-owner routes
```

대상 데이터가 실제 표시되는 기존 화면이 있는지 확인한다.

---

## 13. MF-2 판정

반드시 다음 중 하나로 확정한다.

### A. 기존 valid route 존재

```text
producer target 수정
→ existing route 사용
```

### B. 정보성 알림

클릭 자체가 필요 없는 알림이라면:

```text
target 제거
```

로 계약 정정.

### C. 행동 필요 + destination 없음

```text
MUST_FIX 유지
신규 사용자 기능 필요
```

이번 WO에서 새 화면/route를 만들지 않는다.

### D. admin-only 업무

recipient 자체가 잘못됐다면:

```text
notification recipient/producer contract 문제
```

로 별도 blocker 판정.

임의 admin redirect 금지.

---

## 14. producer 수정 원칙

허용:

```text
existing valid route로 target 교정
불필요 target 제거
기존 route helper/config 재사용
```

금지:

```text
새 frontend page
새 route
새 proxy
새 notification entity
DB schema/migration
새 cross-service router
```

---

# PART C — 전체 target 재검증

## 15. census 재실행

MF-1/MF-2 교정 후 선행 target audit을 다시 실행한다.

최종 분포 필수:

```text
VALID
MISSING_TARGET
DEAD_ROUTE
WRONG_SERVICE
ADMIN_ONLY
ROLE_MISMATCH
UNKNOWN
```

완료 기준:

```text
UNKNOWN = 0
WRONG_SERVICE = 0
DEAD_ROUTE = 0
ADMIN_ONLY 오류 = 0
ROLE_MISMATCH = 0
```

`MISSING_TARGET`은 정보성 알림 등 근거가 있으면 정상 잔존 가능.

---

## 16. legacy production row 재검증

UPDATE 후:

```text
dead target row = 0
```

를 다시 확인한다.

단, C/D 분류 row가 남는다면 FINAL CLOSE 불가.

---

## 17. Frontend resolver 회귀

선행 공통 resolver:

```text
resolveNotificationTarget
```

은 producer 결함을 숨기는 용도로 사용하지 않는다.

확인:

```text
내부 route validation 유지
//host 차단 유지
외부 navigation 차단 유지
fallback 오용 없음
```

가능하면 frontend 무변경 유지.

---

# PART D — Production browser

## 18. MF-1 브라우저 확인

교정된 legacy row 중 production UI에 실제 보이는 샘플을 이용해:

```text
로그인
→ 알림 열기
→ legacy 알림 클릭
→ 404 없음
→ 기대 destination 도달
```

확인.

target 제거형 알림은:

```text
클릭 불가 또는 안전한 비탐색
```

동작을 확인한다.

---

## 19. MF-2 브라우저 확인

실제 알림 샘플이 있으면:

```text
로그인
→ 해당 알림
→ 클릭
→ 기대 destination
```

확인.

샘플이 없으면:

```text
producer payload
→ resolver
→ route tree
```

3단 증거로 대체 가능.

DB 직접 알림 생성 금지.

---

## 20. 5서비스 대표 회귀

최소:

```text
KPA
GP
KCos
Neture
PH
```

에서 알림 UI/target 대표 경로를 확인한다.

기능 없는/empty 서비스는:

```text
dead entry 0
JS exception 0
```

확인.

---

## 21. Browser 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
wrong service navigation = 0
dead notification link = 0
external leak = 0
```

---

# PART E — 검증/배포

## 22. 정적 검증

producer/backend 수정 시:

```text
api-server typecheck
관련 unit test
관련 notification test
```

frontend 수정 발생 시:

```text
@o4o/account-ui build
영향 서비스 typecheck/build
```

---

## 23. 배포

기존 표준 production workflow만 사용한다.

금지:

```text
새 workflow
새 secret
새 IAM
새 env
새 infra
```

배포 후 실제 revision/run 기록.

---

## 24. Backend/DB 변경 범위

허용:

```text
notification producer target 수정
legacy notification row target UPDATE
```

금지:

```text
schema
migration
entity 변경
notification table 구조 변경
Identity
membership
role hierarchy
```

---

# PART F — FINAL CLOSE

## 25. MUST_FIX 기준

다음 중 하나라도 남으면 FINAL CLOSE 금지.

```text
legacy production dead target row
/hub/products/{id} dead route
actual notification 404
wrong-service target
admin-only wrong target
role mismatch
unknown target
```

최종:

```text
MUST_FIX_BEFORE_CLOSE = 0
```

필수.

---

## 26. Notifications FINAL CLOSE

모든 조건 충족 시 선행:

```text
MYPAGE NOTIFICATIONS TRACK
= CLOSED_WITH_FOLLOWUPS
```

를:

```text
MYPAGE NOTIFICATIONS TRACK
= FINAL CLOSED
```

로 변경한다.

다음은 blocker 아님:

```text
adapter 5벌
조회 실패 삼킴
ForumNotification 소비 0
SSE 미소비
KPA dead service key constant
Neture unread-count 중복
message mojibake
deriveServiceKey 장기 정비
```

---

## 27. CHECK

작성:

```text
docs/checks/CHECK-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1.md
```

포함:

```text
1. 기준 commit / deployed revision
2. 선행 §10 typo 정정
3. production legacy row census
4. row classification
5. before snapshot
6. UPDATE predicate
7. affected row count
8. after verification
9. MF-2 producer
10. MF-2 semantic analysis
11. MF-2 destination decision
12. producer correction
13. final target census
14. resolver regression
15. production browser
16. 5서비스 회귀
17. production write
18. typecheck/test/build
19. backend/DB/schema
20. 잔존 followup
21. MUST_FIX_BEFORE_CLOSE
22. Notifications FINAL CLOSE 판정
23. CHECK/commit/push
```

선행 Notifications CHECK와 target audit CHECK도 필요하면 최종 상태를 정합화한다.

---

## 28. 중지 조건

다음이 필요하면 임의 확장하지 않는다.

```text
새 사용자 destination 화면 필요
새 frontend route 필요
notification recipient architecture 변경
DB schema/migration
notification entity 재설계
Identity/membership/role 계약 변경
다른 세션 WIP 충돌
```

특히 MF-2가:

```text
행동 필요 + destination 없음
```

으로 확정되면 `BLOCKED` 보고 후 중지한다.

---

## 29. Git

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

## 30. 최종 보고

```text
1. 기준 commit / deployed revision
2. legacy row 재산출 건수
3. row 분류
4. production UPDATE 건수
5. before/after
6. MF-2 root cause
7. MF-2 최종 판정
8. producer 수정
9. final target census
10. production browser
11. 5서비스 회귀
12. production write
13. typecheck/test/build
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

## 31. 실행 원칙

중간 승인 없이:

```text
최신 main 확인
→ production legacy row census
→ row 의미 분류
→ 제한적 target UPDATE
→ MF-2 producer/의미/route 조사
→ 최소 producer 교정 또는 blocker 판정
→ target census 재실행
→ 정적 검증
→ 배포
→ production browser
→ Notifications CHECK 정합
→ 신규 CHECK
→ path-specific commit
→ push
```

까지 한 번에 진행한다.

**이번 작업의 핵심은 dead link를 숨기는 것이 아니라, 과거에 이미 생성된 알림 row와 현재 producer가 모두 실제 소비 서비스의 살아 있는 destination만 가리키도록 계약을 끝까지 닫는 것이다.**

---

# 부기 — 실행 시점 저장소 실측 (원문 아님)

> 아래는 WO 원문이 아니라, 착수 시점(2026-08-20) 저장소·프로덕션 계약 실측이다.
> 원문과 충돌하면 **원문이 우선**한다. 여기 적힌 경로·수치는 **모집단의 출발점일 뿐 결론이 아니다.**

## A. 기준

- 기준 `origin/main` = `31ec7bcd5`
- 선행 audit commit = `24eb1b620` (backend producer 3파일 + CHECK 1)
- 선행 CHECK 2건:
  - `docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md` — `CLOSED_WITH_FOLLOWUPS`
  - `docs/checks/CHECK-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1.md` — `PASS_WITH_MUST_FIX`
- §26 의 FINAL CLOSED 전환 대상은 **전자**다. 후자는 audit 기록이므로 판정을 덮어쓰지 말고, 필요하면 "후속 WO 로 MUST_FIX 해소" 참조 줄만 최소 추가한다.

## B. §2 typo 정정의 정확한 위치

정정 대상은 `docs/work-orders/WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1.md` §10 마지막 줄이다.

- 원문은 이미 push 된 커밋(`c9d80d2aa`)에 있으므로 **history 재작성 금지**. 후속 커밋에서 정정 주석을 덧붙이는 방식만 사용한다.
- 선행 audit 은 이미 "만들지 않는다" 독법으로 실행됐다(해당 CHECK §의 M-1 서술이 근거). 따라서 **실행 결과 재작업은 없다.** 문서 표기만 정합화한다.

## C. 공통 resolver 의 실제 키 계약 — MF-2 판정에 직결

`packages/account-ui/src/notifications/resolveTarget.ts` 는 **`metadata.targetUrl` 하나만 읽는다.**
`linkUrl` · `deepLink` 는 읽지 않는다.

MF-2 의 `/hub/products/{id}` 는 `marketTrialOperatorController.ts:1516` 에서 **`linkUrl` 키**로 기록된다.

```ts
const metadata = JSON.stringify({ trialId, productId, linkUrl: `/hub/products/${productId}` });
```

즉 **현재 소비 계층에서는 클릭해도 이동 자체가 일어나지 않는다**(resolver 가 `null` 반환). 선행 audit 의 `DEAD_ROUTE` 라벨은 producer 계약 기준 판정으로는 맞지만, **실사용자 체감은 404 가 아니라 "무반응"** 이다. §11 의미 확정과 §13 판정에서 이 차이를 구분해 기록한다. `targetUrl` 을 새로 써 넣는 순간 비로소 이동이 발생하므로, **유효 destination 을 확정하기 전에 `targetUrl` 을 채우지 않는다.**

## D. MF-2 producer 실측

- 파일: `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` (약 1495~1527)
- trigger: Trial → 정식 등록 전환 시 1회 (`market_trials.notificationSentAt` 로 중복 방지)
- 수신자: `market_trial_participants.rewardType = 'product'` 이고 `users.isActive = true` 인 **일반 참여자**. 운영자·관리자 아님
- title/message: `참여하신 Trial 상품이 정식 등록되었습니다` / `"{productName}" 상품이 정식 등록되었습니다. 지금 바로 확인해보세요.`
- **raw `INSERT INTO notifications`** 이며 컬럼 목록에 `serviceKey` 가 없다 → 저장 `serviceKey = NULL` (선행 F-4)
- metadata 보유 식별자: `trialId`, `productId`

관측된 route 후보(결론 아님 — §12 에서 직접 판정할 것):

| 후보 | 존재 | 주의 |
|---|---|---|
| `/market-trial/:id` (`MarketTrialDetailPage`) | 있음 (web-neture `App.tsx:776`) | metadata 에 `trialId` 있음. 다만 "상품이 정식 등록됨" 의미와 일치하는지 §11 에서 증명할 것 |
| `/market-trial/my` (`MyParticipationsPage`) | 있음 (`App.tsx:775`) | 참여자 관점 목록 |
| `/store/product/:offerId` | 있음 (`App.tsx:975`) | **파라미터가 `offerId` 이고 metadata 는 `productId` 다. 동일 식별자로 가정하지 말 것** |
| `/hub/products/:id` | **없음** | `/hub` 는 `/workspace/hub` 로 redirect 될 뿐 (`App.tsx:1261`) |

`serviceKey = NULL` 이면 어느 서비스 벨에 뜨는지가 §11 의미 확정의 전제다. **먼저 이 알림이 실제로 어느 서비스 UI 에 노출되는지 확인한 뒤** destination 을 정한다. 노출 서비스와 route 소속이 어긋나면 그것은 §13-D(recipient/producer contract 문제)이지 target 교정 대상이 아니다.

## E. MF-1 census 실행 경로

- 프로덕션 DB 직접 TCP 불가. `cloud-sql-proxy` 경유 (CLAUDE.md §0, `SETUP.md` 가 정본)
- SELECT 계열 read-only census 는 직접 수행 가능
- **§6 이 이번 WO 에 한해 제한적 production UPDATE 를 명시 승인한다.** 이는 CLAUDE.md §0 의 "데이터 변경은 사용자 승인 필요" 를 이 범위에서 충족한 것으로 본다. 단 승인 범위는 **notification target 필드뿐**이며, §7 금지 목록 밖으로 한 칸이라도 넘어가면 중지·보고한다
- 과거 보고 숫자(neture 2 / GP·KCos 5 = 7)는 §4 지시대로 **재산출한다.** 그 숫자를 predicate 에 넣지 말 것

교정 이전 producer 가 내보낸 dead 값 2종(census 출발점, 전수 아님):

```text
/admin/o4o-product-db/store-requests   ← store-product-request-notify.ts (24eb1b620 이전)
/admin/contact-inquiries               ← public-contact-inquiry.controller.ts (24eb1b620 이전)
```

`notifications.metadata` 는 JSON 문자열 컬럼이다. **넓은 `LIKE '%admin%'` 만으로 UPDATE 하지 말 것** (§9). row ID 열거 기반이 원칙이다.

## F. 교정 후 producer 의 현행 target (UPDATE 목표값 근거)

```text
store-product-request-notify.ts   neture → /operator/product-candidates
                                  kpa    → /store/handled-products
                                  그 외  → 미지정 (의도적)
public-contact-inquiry.controller.ts     → /operator/contacts
```

legacy row 의 `serviceKey` 가 위 매핑의 어느 갈래에 해당하는지 **row 별로 확인한 뒤** 목표값을 정한다. producer 가 서비스별로 값을 달리하므로 **단일 값 일괄 치환은 오교정**이다.

## G. 다른 세션 WIP

착수 시점 작업트리 clean, `HEAD == origin/main == 31ec7bcd5`. 다만 이 트랙은 병렬 세션이 잦다. 착수 직전 `git status -sb` 를 다시 확인하고, 본인 것이 아닌 dirty/untracked 파일은 **접촉하지 않는다**(§3·§29). 격리 worktree 에서 작업하되 커밋은 path-specific 으로 한정한다.

## H. §17 회귀 확인 지점

frontend 무변경 유지가 목표다. 회귀 확인은 코드 대조로 충분하다.

- `packages/account-ui/src/notifications/resolveTarget.ts` diff 0
- 5개 서비스 헤더/바텀내비에서 `fallback` 주입 0 (선행 audit 결론 — 재확인만)
- `toInternalPath` 의 `//host` · `/\host` · 외부 URL 차단 유지

resolver 에 `linkUrl` 폴백을 추가해 MF-2 를 덮는 것은 **§17 위반**이다(producer 결함 은폐). MF-2 는 producer 에서 닫는다.

## I. §25 FINAL CLOSE 판단의 비대칭

`MUST_FIX_BEFORE_CLOSE = 0` 이 아니면 FINAL CLOSED 를 선언하지 않는다. 특히 §8-C/D 로 분류된 legacy row 가 1건이라도 남으면 §16 에 따라 close 불가다.
**닫을 수 없으면 닫지 않고 그대로 보고한다.** 무리한 close 보다 `BLOCKED` 보고가 옳다(§28).

## J. 보고

§30 의 19개 항목 순서를 그대로 지키고, 마지막 줄에 CLAUDE.md §16-5 의 `문서 정합:` 한 줄을 포함한다.
