# WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1

> **상태**: 등재 완료 · **미실행** (핸드오프 전용)
> **선행**: `WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1` (PR #191 — merge 후 CHECK 가 main 에 존재)

## 1. 목적

직전 `WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1`에서 대규모 dead file/dependency/runtime 정리를 수행했다.

이번 WO는 그 CHECK에 남은:

```text
UNJUDGED 4
DEFERRED 2
```

를 한 번에 최종 판정하고, 안전하게 정리 가능한 것은 이번에 모두 닫아 **레거시 정리 트랙 자체를 종료**하는 작업이다.

대상:

```text
1. Admin/Operator 승인 기능 중복
2. 권한 진입점 중복
3. notification fallback residue
4. order/settlement residue
5. cosmetics-seller-extension 의 @o4o/ui 미선언 dependency
6. store_events / organization_product_applications DROP 여부
```

---

## 2. 선행 기준

반드시 current main에서 확인한다.

```text
docs/checks/WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1-CHECK.md
```

그리고 기존 canonical 기준:

```text
docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md
docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md
CLAUDE.md
```

직전 CHECK의 수치와 판정을 출발점으로 사용하되, current main에서 재확인한다.

---

## 3. 시작 기준

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

## 4. 원칙

이번 WO는 작은 residue를 또 DEFERRED하지 않는다.

다음처럼 **대규모 아키텍처 변경이 필요한 경우만** 남길 수 있다.

```text
schema redesign
Identity/RBAC 전면 재설계
notification system 신규 설계
settlement architecture 재설계
외부 API 계약 확인 필요
production destructive DB operation
```

그 외 dead route, duplicate entry, stale fallback, dependency 결함은 이번에 정리한다.

---

# A. Admin / Operator 승인 기능 중복

## 5. 전체 census

Admin / Operator / service operator에서 실제 approval mutation을 전수조사한다.

최소:

```text
route
controller
service
frontend page
API client
authorization
target entity
business action
```

예:

```text
approve
reject
suspend
activate
verify
publish
```

동일한 business mutation이 여러 entry에 존재하는지 확인한다.

완료:

```text
UNKNOWN = 0
UNJUDGED = 0
```

---

## 6. 판정 기준

각 중복 후보를:

```text
CANONICAL_OWNER
COMPATIBILITY_WRAPPER
SERVICE_SPECIFIC
DEAD_DUPLICATE
```

중 하나로 판정한다.

단순 route 이름이 다르다는 이유로 중복으로 보지 않는다.

---

## 7. 정리 원칙

동일 mutation이 실제로 중복 구현돼 있다면:

```text
공통 service/core 재사용
+
entry-specific auth wrapper 유지
```

가 우선이다.

dead duplicate라면 제거한다.

새 approval framework는 만들지 않는다.

---

# B. 권한 진입점 중복

## 8. auth entry census

다음 형태를 전수조사한다.

```text
admin route
operator route
service operator route
role-only legacy route
membership 없는 legacy wrapper
JWT snapshot-only gate
```

같은 business action에 여러 auth 진입점이 있는지 확인한다.

---

## 9. canonical auth 기준

기존 Identity/RBAC canonical을 따른다.

최소:

```text
service membership
service scope
organization ownership
role/capability
platform admin boundary
```

이미 retire된 role-only legacy entry는 제거한다.

---

## 10. 중복 제거

동일 기능에:

```text
/admin/*
/operator/*
/service/*
```

3벌이 있어도 business owner가 실제로 하나라면 중복 mutation logic을 하나로 수렴한다.

단 UI entry가 역할상 필요한 경우 thin wrapper는 유지 가능.

---

# C. notification fallback residue

## 11. census

repo-wide로 조사:

```text
notification
notify
email fallback
sms fallback
push fallback
no-op notifier
console fallback
catch-and-ignore notification
deprecated notifier
```

각 경로의:

```text
producer
consumer
transport
failure handling
runtime usage
```

을 확인한다.

---

## 12. 판정

각 fallback을:

```text
ACTIVE_REQUIRED
BEST_EFFORT_INTENTIONAL
DEAD_FALLBACK
BUG_MASKING
```

으로 판정한다.

---

## 13. 정리

다음은 제거 대상:

```text
runtime producer 0
consumer 0
no-op only
console-only stale fallback
retired service 전용
```

`BUG_MASKING`이면 실패를 조용히 삼키지 않도록 현재 error contract에 맞춰 수정한다.

새 notification architecture는 만들지 않는다.

---

# D. order / settlement residue

## 14. census

다음 키워드/축을 중심으로 전수조사한다.

```text
order
settlement
payout
payment settlement
financial-core
checkout_orders
neture_orders
refund
commission
seller settlement
```

특히 과거 consumer commerce residue와 현재 B2B settlement를 구분한다.

---

## 15. 분류

각 연결을:

```text
ACTIVE_B2B
ACTIVE_FINANCIAL
LEGACY_CONSUMER
DEAD_CROSSLINK
COMPATIBILITY
```

으로 판정한다.

---

## 16. 정리

다음은 제거한다.

```text
consumer-order 전용 settlement adapter
retired seller-order bridge
dead payment reference
unused mapper
dead status synchronization
```

다음은 보호한다.

```text
supplier→store B2B settlement
financial-core canonical
refund canonical
Neture/PharmacyHub live fulfillment
```

---

# E. cosmetics-seller-extension dependency

## 17. `@o4o/ui` 미선언 dependency 정리

대상:

```text
cosmetics-seller-extension
@o4o/ui
```

current main에서 확인:

```text
실제 import 존재 여부
package.json declaration
workspace resolution
transitive resolution에 우연히 기대고 있는지
build/test 시 실제 필요 여부
```

---

## 18. 판정

### 실제 import 있음

`package.json`에 명시 dependency 추가.

### import 없음

stale import/config/type residue가 있으면 제거.

### 패키지 자체 dead

consumer census 후 package retirement까지 가능.

목표는:

```text
undeclared dependency = 0
```

이다.

---

# F. DB DROP 후보 2개

## 19. 대상

```text
store_events
organization_product_applications
```

이번 WO에서 반드시 최종 판정한다.

---

## 20. 정적 census

각 테이블에 대해 repo-wide로 확인:

```text
entity
migration
raw SQL
repository
query builder
API
service
worker
admin/operator UI
tests
docs
```

분류:

```text
ACTIVE
WRITE_ONLY
READ_ONLY
DEAD
HISTORY_ONLY
```

---

## 21. production DB 확인

DROP 판단에 production 상태가 필요하면 안전한 credential이 있을 때만 확인한다.

최소:

```text
table 존재 여부
row count
최근 created_at / updated_at
FK
index
view/trigger dependency
```

안전한 credential이 없으면:

```text
NO_PRODUCTION_DB_CENSUS
```

로 기록한다.

---

## 22. DROP gate

다음이 모두 충족될 때만 DROP 가능 판정:

```text
runtime consumer 0
runtime writer 0
raw SQL consumer 0
external dependency 0
FK/view/trigger dependency 0
production 사용 증거 없음
rollback 근거 확보
```

---

## 23. destructive operation 정책

실제 production DROP은 자동으로 수행하지 않는다.

이번 WO에서는:

```text
DROP_READY
RETAIN
BLOCKED_NO_PROD_CENSUS
```

중 하나로 최종 판정한다.

migration 작성까지 안전하면 작성 가능하나, production 적용은 별도 destructive approval 없이는 하지 않는다.

---

# G. residue 전수검증

## 24. repo-wide 재검색

이번 WO 종료 직전에 다음을 다시 검색한다.

```text
legacy
deprecated
fallback
duplicate
settlement
approval
operator
admin
store_events
organization_product_applications
cosmetics-seller-extension
```

새 UNJUDGED를 남기지 않는다.

---

## 25. dead test / stale assertion

runtime 삭제 후 stale test가 남지 않았는지 확인한다.

분류:

```text
ACTIVE_CONTRACT
RETIREMENT_GUARD
STALE
```

STALE은 제거/현행화.

---

## 26. docs 정합

current canonical 문서와 runtime이 맞는지 확인한다.

필요 시:

```text
docs/baseline
docs/checks
active README
```

현행화.

과거 CHECK/history는 삭제하지 않는다.

---

# H. 검증

## 27. backend

최소:

```text
api-server typecheck
전체 Jest
lint-ratchet
check-unsafe-routes
check-typeorm-entities
```

---

## 28. frontend / package

영향 받은 모든 서비스/package에 대해:

```text
typecheck
test
build
```

를 수행한다.

특히 Admin / Operator / K-Cosmetics 영향이 있으면 반드시 포함한다.

Vitest만으로 완료 판정하지 않는다.

---

## 29. production smoke

배포 후 read-only 중심으로 확인:

```text
Admin approval entry
Operator approval entry
핵심 auth entry
notification 관련 화면/route
B2B order read
settlement read
```

실사용 금전 write는 하지 않는다.

---

## 30. DB census

안전한 credential이 없으면:

```text
NO_PRODUCTION_DB_CENSUS
```

명시.

DROP 가능 여부를 추측하지 않는다.

---

# I. CHECK / 마감

## 31. CHECK

작성:

```text
docs/checks/WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1-CHECK.md
```

반드시 포함:

```text
Admin/Operator 승인 중복 census
권한 진입점 중복 census
notification fallback census
order/settlement residue census

cosmetics-seller-extension @o4o/ui 판정

store_events 판정
organization_product_applications 판정

removed
retained
compatibility
DROP_READY
BLOCKED

tests
typecheck/build
production smoke
NO_PRODUCTION_DB_CENSUS

UNKNOWN
UNJUDGED
DEFERRED
```

---

## 32. 중지 조건

다음이면 해당 축만 중지한다.

```text
다른 세션이 동일 파일 수정 중
외부 consumer가 있는 API 발견
DB DROP 판단에 production 확인 필수인데 credential 없음
수정이 Identity/RBAC 전면 재설계로 확대
수정이 notification/settlement 신규 architecture 설계로 확대
```

나머지 작은 residue는 중간 승인 없이 계속 정리한다.

---

## 33. 완료 기준

```text
UNJUDGED 4 → 0

Admin/Operator 승인 중복 최종 판정
권한 진입 중복 최종 판정
notification fallback 최종 판정
order/settlement residue 최종 판정

cosmetics-seller-extension undeclared dependency = 0

store_events
→ DROP_READY / RETAIN / BLOCKED_NO_PROD_CENSUS 중 하나

organization_product_applications
→ DROP_READY / RETAIN / BLOCKED_NO_PROD_CENSUS 중 하나

작은 dead residue DEFERRED = 0

consumer commerce 재유입 0
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

이번 WO가 끝나면 **일반 레거시 파일/런타임/의존성 정리 트랙은 CLOSED**로 선언한다. DB DROP 2건은 `DROP_READY`까지 판정되면 코드 정리 트랙에서는 종결하고, 실제 production DROP만 별도 파괴적 운영 작업으로 남긴다.
