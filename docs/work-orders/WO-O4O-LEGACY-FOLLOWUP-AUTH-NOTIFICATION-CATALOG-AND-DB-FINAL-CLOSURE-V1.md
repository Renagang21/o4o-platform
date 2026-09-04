# WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1

**등재일:** 2026-09-04
**상태:** 등재 완료 · **실행 대기** (핸드오프 — 실행 지시 시 착수)
**선행:** [`docs/checks/CHECK-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1.md`](../checks/CHECK-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1.md) (PR #193 merged · `eff7816d0`)

---

## 1. 목적

직전 `WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1`에서 남긴 4개 후속 항목을 다시 잘게 나누지 않고 한 번에 최종 정리한다.

대상:

```text
1. requirePermission 계열 제거 + user.permissions JWT snapshot 분기 정리
2. NotificationType dead member 19 정리
   + notifySupplierSettlementPaid → settlement.paid 수렴
3. sellerops / supplierops / partnerops 카탈로그 은퇴
4. store_events / organization_product_applications production DROP 준비·승인 가능 상태 확정
```

이번 WO 완료 시 일반 레거시 런타임/권한 잔재/알림 잔재/카탈로그 잔재/DB 잔여 정리 트랙을 종료한다.

---

## 2. 선행 기준

최신 main에서 다음을 확인한다.

```text
docs/checks/CHECK-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1.md
CLAUDE.md
docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md
docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md
```

직전 CHECK의 판정:

```text
requirePermission 계열 → DEAD_UNMOUNTED / contract 변경 필요
NotificationType dead member 19 → 후속
sellerops/supplierops/partnerops → catalog retirement 후속
store_events / organization_product_applications → DROP_READY
```

을 current main에서 재확인한다.

---

## 3. 시작

```bash
git fetch origin
git status -sb
git branch --show-current
git pull --ff-only origin main
```

다른 세션 WIP:

```text
수정 금지
restore 금지
stash 금지
stage 금지
```

필요하면 격리 worktree 사용.

`git add .` 금지.

---

# A. requirePermission / JWT snapshot 잔재

## 4. 전체 census

다음 키워드를 repo-wide 조사한다.

```text
requirePermission
user.permissions
permissions:
hasPermission
permission snapshot
JWT permissions
```

각 참조를 분류:

```text
ACTIVE_CANONICAL
LEGACY_ROLE_SNAPSHOT
DEAD_UNMOUNTED
COMPATIBILITY
TEST_ONLY
```

완료 시:

```text
UNKNOWN = 0
UNJUDGED = 0
```

---

## 5. canonical 기준

기존 Identity/RBAC 기준을 따른다.

권한 판단의 우선 축:

```text
active service membership
service scope
organization ownership
role/capability
platform admin boundary
```

JWT 내부에 오래된 `user.permissions` snapshot이 있다고 해서 그것을 권한 SSOT로 사용하지 않는다.

---

## 6. 제거 원칙

다음은 제거 대상:

```text
mount되지 않는 requirePermission wrapper
실제 route consumer 0
JWT permissions snapshot만 보는 legacy 분기
canonical membership/role guard와 중복된 권한 검사
```

다음은 유지 가능:

```text
실제 mounted route의 active canonical capability check
외부 compatibility contract
```

단순 문자열 이름만 보고 삭제하지 않는다.

---

## 7. contract 수렴

가능하면:

```text
route-specific legacy permission check
→ canonical membership/role/capability guard
```

로 수렴한다.

새 RBAC framework는 만들지 않는다.

---

## 8. 회귀 검증

최소:

```text
active member allow
suspended member deny
wrong service deny
wrong org deny
platform admin 경계 유지
role-only legacy 우회 0
```

를 확인한다.

---

# B. NotificationType / settlement notification

## 9. NotificationType census

`NotificationType` 전체 enum/union/member를 조사한다.

직전 후속:

```text
dead member 19
```

를 current main에서 다시 확인한다.

각 member를 분류:

```text
ACTIVE_PRODUCER
ACTIVE_CONSUMER
SERIALIZED_COMPAT
DEAD
HISTORY_ONLY
```

---

## 10. dead member 제거

다음 조건이면 제거한다.

```text
producer 0
consumer 0
DB/API serialized contract 0
test-only history 아님
```

19개가 모두 dead이면 이번 WO에서 전부 제거한다.

일부가 실제 consumer를 가지면 유지 이유를 CHECK에 기록한다.

---

## 11. settlement notification 수렴

대상:

```text
notifySupplierSettlementPaid
→ settlement.paid
```

실제 producer/consumer를 조사한다.

목표:

```text
legacy 전용 helper 제거
canonical event/type 재사용
```

새 notification transport는 만들지 않는다.

---

## 12. fallback/serialization 보호

알림 type 변경 시 확인:

```text
DB 저장값
event payload
frontend switch
API response
test fixture
```

과거 serialized 값 호환성이 필요하면 alias/compatibility layer는 유지할 수 있다.

---

# C. sellerops / supplierops / partnerops 카탈로그 은퇴

## 13. census

다음 축을 전수조사한다.

```text
sellerops
supplierops
partnerops
catalog
registry
route registration
menu/nav
lazy import
plugin manifest
build entry
```

각 항목을 분류:

```text
ACTIVE_RUNTIME
COMPATIBILITY
DEAD_CATALOG
HISTORY_ONLY
```

---

## 14. 은퇴 기준

다음이 모두 참이면 retire:

```text
runtime route 0
menu/nav 0
actual consumer 0
build entry 불필요
외부 plugin 계약 없음
```

---

## 15. 제거 범위

가능하면 한 번에:

```text
catalog registration
dead route entry
dead lazy import
dead manifest
dead package dependency
dead frontend page
dead test
```

를 정리한다.

실제 살아 있는 partner-core/F7 등은 이름이 비슷하다는 이유로 건드리지 않는다.

---

## 16. 재등록 방지

가능하면 static guard를 추가한다.

```text
sellerops registry 재등록 금지
supplierops registry 재등록 금지
partnerops legacy catalog 재등록 금지
```

---

# D. DROP_READY 테이블 2개 최종 처리

## 17. 대상

```text
store_events
organization_product_applications
```

직전 판정:

```text
DROP_READY
```

를 current main에서 재확인한다.

---

## 18. 최종 정적 검증

각 테이블에 대해:

```text
entity
migration
raw SQL
repository
query builder
API
worker
cron
test
docs
FK
view
trigger
```

재검색.

목표:

```text
runtime consumer = 0
runtime writer = 0
```

---

## 19. production DB 검증

안전한 production DB access가 가능할 때만 다음을 확인한다.

```text
table 존재
row count
최근 row timestamp
FK
index
view dependency
trigger dependency
```

없으면:

```text
NO_PRODUCTION_DB_CENSUS
```

로 기록하고 실제 DROP은 수행하지 않는다.

---

## 20. destructive gate

이번 WO에서 자동 production DROP은 하지 않는다.

최종 판정:

```text
DROP_APPROVED_READY
RETAIN
BLOCKED_NO_PROD_CENSUS
```

중 하나.

---

## 21. migration 정책

중요:

```text
database/migrations/*
```

가 merge 후 CI/CD에서 자동 실행되는 구조라면, production DROP migration 파일 작성 자체를 자동 destructive change로 간주한다.

따라서 명시적 production DROP 승인 없이는 migration도 작성하지 않는다.

---

## 22. 사용자 승인 가능 상태 만들기

DROP 가능 판정 시 CHECK에 반드시 적는다.

```text
대상 table
row count
FK/view/trigger
rollback/backup 근거
예상 영향
실행 migration 초안 또는 SQL 계획
```

단 실제 실행은 별도 승인 전까지 하지 않는다.

---

# E. 전체 residue 재감사

## 23. repo-wide 최종 검색

이번 WO 마감 직전에 다시 검색:

```text
requirePermission
user.permissions
NotificationType
notifySupplierSettlementPaid
sellerops
supplierops
partnerops
store_events
organization_product_applications
legacy
deprecated
```

새로운 작은 residue는 이번에 정리한다.

---

## 24. dead test / stale guard

분류:

```text
ACTIVE_CONTRACT
RETIREMENT_GUARD
STALE
```

STALE은 제거/현행화.

retirement guard는 유지.

---

## 25. dependency 정리

제거로 인해 생긴:

```text
zero-consumer dependency
dead import
unused package export
lockfile residue
```

를 같이 정리한다.

---

# F. 검증

## 26. backend

최소:

```text
api-server typecheck
전체 Jest
lint-ratchet
check-unsafe-routes
check-typeorm-entities
```

---

## 27. frontend/package

영향 범위 전체:

```text
typecheck
test
build
```

Admin/Operator/Neture/K-Cosmetics/공통 package 영향이 있으면 모두 포함한다.

Vitest만으로 완료 판정하지 않는다.

---

## 28. production smoke

read-only 중심으로:

```text
admin/operator auth entry
notification consumer 화면/route
settlement read
catalog 은퇴 route
B2B live route
```

를 확인한다.

실사용 금전 write 0.

---

## 29. DB

production DB 접근이 없으면:

```text
NO_PRODUCTION_DB_CENSUS
```

명시.

DROP을 추측으로 수행하지 않는다.

---

# G. CHECK

## 30. 작성

```text
docs/checks/CHECK-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1.md
```

반드시 포함:

```text
requirePermission census
user.permissions JWT snapshot census
removed/retained auth paths

NotificationType member census
dead 19 최종 결과
settlement.paid 수렴 결과

sellerops/supplierops/partnerops catalog census
retired/retained 목록

store_events 최종 판정
organization_product_applications 최종 판정

production DB census 여부
DROP 승인 필요 여부

tests
typecheck/build
production smoke
CI

UNKNOWN
UNJUDGED
DEFERRED
```

---

## 31. DEFERRED 허용 기준

이번 작업은 가능한 한 다 닫는다.

남길 수 있는 것은:

```text
production DB destructive execution
외부 API compatibility 확인
Identity/RBAC 전면 재설계
notification architecture 신규 설계
```

뿐이다.

작은 dead code는 이번에 정리한다.

---

## 32. 중지 조건

다음이면 해당 축만 중지한다.

```text
다른 세션이 동일 파일 수정 중
외부 consumer 발견
JWT permission 제거가 현재 active 권한 contract 변경으로 확대
catalog 제거가 live plugin/runtime을 끊음
production DROP에 사용자 승인 필요
```

그 외는 중간 승인 없이 계속 진행한다.

---

## 33. 완료 기준

```text
requirePermission legacy residue 정리
user.permissions JWT snapshot legacy 분기 정리
권한 회귀 0

NotificationType dead member 정리
notifySupplierSettlementPaid canonical settlement.paid 수렴

sellerops/supplierops/partnerops legacy catalog 은퇴

store_events
→ DROP_APPROVED_READY / RETAIN / BLOCKED_NO_PROD_CENSUS

organization_product_applications
→ DROP_APPROVED_READY / RETAIN / BLOCKED_NO_PROD_CENSUS

작은 legacy residue DEFERRED = 0

consumer commerce 회귀 0
B2B canonical 회귀 0
Identity/RBAC 회귀 0

api-server typecheck PASS
전체 Jest PASS
lint-ratchet PASS
unsafe-routes PASS
typeorm-entities PASS

영향 frontend/package
typecheck + test + build PASS

production smoke PASS
실사용 금전 write 0
POS 개발 0

CHECK 작성
path-specific stage
commit
push
CI green
HEAD == origin/main
```

이번 WO가 끝나면 **일반 레거시 코드·권한 잔재·알림 잔재·legacy catalog 정리 트랙은 CLOSED**로 본다. 남는 것이 있다면 production DB DROP처럼 명시적 파괴적 승인이 필요한 운영 작업만 별도로 남긴다.
