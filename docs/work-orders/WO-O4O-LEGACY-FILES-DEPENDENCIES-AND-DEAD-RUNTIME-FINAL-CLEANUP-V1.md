# WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1

> **상태: 핸드오프 (미실행)**
> 등록일: 2026-09-03 · 등록 시 origin/main HEAD: `9abf305fc`
> 이 문서는 실행 대상 작업요청서이며, 본 커밋 시점에는 **어떤 정리도 수행되지 않았다.**
> 실행 세션은 §3 시작 기준을 먼저 수행한다.

---

## 1. 목적

현재 main 기준으로 남아 있는 레거시 파일, 소비처 0 dependency, dead route/controller, 중복 진입점, 낡은 setup 문서, fallback residue를 전수조사하고 실제로 제거 가능한 것은 이번 WO에서 한 번에 정리한다.

목표:

```text
current main census
→ ACTIVE / DEAD / COMPATIBILITY / HISTORY 분류
→ dead residue 제거
→ dependency 정리
→ runtime 중복 정리
→ 문서 현행화
→ 전체 회귀검증
→ CHECK
→ commit/push
→ CI green
```

이번 작업은 새로운 기능 개발이나 공통화 설계가 아니다.

---

## 2. 선행 원칙

이미 CLOSED 된 축은 다시 설계하거나 복구하지 않는다.

```text
consumer commerce retirement
ecommerce-core retirement
B2B final closure
Channel stack retirement
Header/Footer commonization
Operator commonization 본체
My Store commonization 본체
```

과거 파일이 남아 있다는 이유만으로 retired 기능을 복원하지 않는다.

---

## 3. 시작 기준

최신 main에서 시작한다.

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

충돌 가능성이 있으면 격리 worktree를 사용한다.

`git add .` 금지.

---

## 4. 전체 legacy census

repo 전체에서 다음을 조사한다.

```text
legacy
deprecated
retired
obsolete
dead
unused
compat
fallback
TODO
FIXME
TEMP
old
v1
```

단 문자열 존재만으로 삭제 판정하지 않는다.

각 후보를:

```text
ACTIVE
COMPATIBILITY_REQUIRED
HISTORY_ONLY
DEAD
DEFERRED_MAJOR
```

중 하나로 판정한다.

완료 시:

```text
UNKNOWN = 0
UNJUDGED = 0
```

---

## 5. 낡은 setup / README 문서

특히:

```text
apps/api-server/README-LOCAL-SETUP.md
```

등 로컬 개발 안내 문서를 census한다.

확인:

```text
현재 repo 경로와 일치하는가
PostgreSQL/Cloud SQL 실행 방식이 현재와 같은가
사용하지 않는 Linux/Windows 명령이 남았는가
retired 서비스/port/env 안내가 있는가
현재 CLAUDE.md 또는 canonical setup 문서와 충돌하는가
```

판정:

```text
현행화
다른 canonical 문서로 통합
삭제
```

중 하나.

낡은 문서를 보존할 이유가 없으면 제거한다.

---

## 6. 소비처 0 package dependency 전수조사

특히 과거 후보:

```text
@o4o/operator-core
@o4o/auth-context
```

를 포함해 workspace dependency를 전수조사한다.

각 dependency에 대해:

```text
package.json 선언
실제 import
dynamic import
build script
test
config
generated output
```

을 확인한다.

실제 소비처 0이면 서비스별 `package.json`에서 제거한다.

package 자체가 repo 전체에서 소비처 0이면 package retirement까지 판정한다.

**기지 사실 (census 시 혼동 금지):**

```text
@o4o/operator-core     소비처 0 인데 package.json dependency 3건 잔존 → 제거 후보
@o4o/screen-content-core  import 0 은 정상 상태 (계약 전용 package) → 제거 후보 아님
```

두 케이스는 겉보기(=import 0)가 같으므로, 판정 근거를 각각 CHECK에 명시한다.

---

## 7. package retirement 기준

package 삭제는 다음이 모두 참일 때만 한다.

```text
runtime import 0
test import 0
build dependency 0
config consumer 0
external publish 필요 없음
historical compatibility 필요 없음
```

부분 소비가 살아 있으면 package 전체를 삭제하지 않는다.

---

## 8. dashboard dead code

admin/operator/store dashboard의 dead page/module/helper를 조사한다.

최소:

```text
route consumer
menu consumer
lazy import
API consumer
test consumer
```

를 확인한다.

라우트와 메뉴가 모두 없고 runtime consumer도 0이면 제거한다.

단 숨은 deep-link compatibility가 있으면 유지 이유를 기록한다.

---

## 9. `/account/supplier/*` legacy route

다음 축을 전수조사한다.

```text
/account/supplier/*
supplier account
supplier workspace
partner workspace
Neture supplier
```

중복 route인지, compatibility alias인지, dead legacy인지 판정한다.

동일 기능이 canonical route로 이미 수렴했다면:

```text
dead page
dead router
dead menu
dead adapter
```

를 제거한다.

외부 deep link 계약이 있으면 alias로 유지할 수 있다.

---

## 10. CSV import legacy

`csv-import` 관련 전체 consumer를 census한다.

확인:

```text
admin route
operator route
API
service
worker
UI
docs
tests
```

현재 공식 import pipeline이 별도로 있다면 legacy CSV import는 retire한다.

다만 실제 운영 importer이면 삭제하지 않는다.

---

## 11. silent swallow 전수조사

다음 패턴을 조사한다.

```text
catch {}
catch (_) {}
catch { return null }
.catch(() => ...)
console only 후 정상 처리
```

모두 수정 대상이라는 뜻은 아니다.

분류:

```text
EXPECTED_BEST_EFFORT
INTENTIONAL_FALLBACK
BUG_MASKING
DEAD
```

`BUG_MASKING`은 이번 WO에서 수정한다.

대규모 error architecture 재설계는 하지 않는다.

---

## 12. Admin ↔ Operator 승인 기능 중복

현재 승인 기능 중:

```text
Admin
Operator
Service operator
Platform admin
```

에 동일 business mutation이 중복 구현돼 있는지 조사한다.

확인:

```text
route
controller
service
authorization
UI
API client
```

이미 canonical ownership이 정해진 기능이면 중복 entry를 제거하거나 thin wrapper로 수렴한다.

새 권한 체계를 만들지 않는다.

---

## 13. 권한 진입점 중복

다음 형태를 전수조사한다.

```text
같은 기능에 admin route + operator route 중복
role-only legacy entry
membership gate 없는 과거 wrapper
서비스별 복제된 auth adapter
```

현재 Identity/RBAC canonical contract와 충돌하는 dead entry는 정리한다.

Identity 전체 재설계는 범위 밖이다.

---

## 14. notification fallback residue

다음 후보를 조사한다.

```text
legacy notification adapter
fallback email
fallback push
dead SMS branch
no-op notifier
deprecated event consumer
```

runtime producer/consumer가 0이면 제거한다.

실제 운영 fallback이면 유지 이유를 기록한다.

---

## 15. order ↔ settlement cross-link residue

주문/정산 간 과거 dead integration을 census한다.

확인:

```text
dead route
dead service
unused mapper
legacy payment reference
obsolete settlement status bridge
```

현재 canonical B2B/financial-core 계약과 충돌하지 않게 정리한다.

consumer-commerce retirement 축을 복구하지 않는다.

---

## 16. retired route / 410 / 404 계약 보호

레거시 제거 과정에서 다음을 구분한다.

```text
실제 dead 파일
vs
의도적으로 유지되는 retirement contract
```

예:

```text
410 retirement endpoint
compatibility alias
retired 안내 page
```

는 consumer가 있거나 명시 계약이면 유지한다.

"legacy"라는 이름만으로 삭제하지 않는다.

---

## 17. dead tests 정리

삭제된 runtime을 존재한다고 가정하는 stale test를 찾는다.

분류:

```text
ACTIVE CONTRACT
RETIREMENT GUARD
STALE EXISTENCE ASSERTION
```

stale existence assertion은 제거/현행화한다.

retirement guard는 유지한다.

---

## 18. docs/history 정리

다음은 runtime 삭제 대상과 분리한다.

```text
docs/checks
docs/baseline
migration history
retirement CHECK
```

과거 의사결정 증거는 dead code가 아니므로 무리하게 삭제하지 않는다.

단 current canonical을 오해하게 만드는 active README/guide는 정리한다.

---

## 19. generated / temp residue

repo 내부에 남은:

```text
tmp
scratch
.generated
dist
coverage
debug output
old audit output
```

이 git tracked/untracked 상태로 잘못 남아 있는지 확인한다.

실제 source가 아니면 제거하거나 `.gitignore`를 현행화한다.

다른 세션 WIP 경로는 건드리지 않는다.

---

## 20. branch/worktree/backup은 코드 수정과 분리

로컬에 남아 있는 과거 후보:

```text
C:\tmp\o4o-signage-followup
backup/pre-reset-main-20260826
drop 대상으로 판정된 signage/channel branch/commit
```

등은 census 및 안전 판정까지만 할 수 있다.

다른 사용자가 수동 삭제해야 하거나 destructive Git 작업이 필요하면 CHECK에 명시하고 자동 삭제하지 않는다.

---

## 21. API route 최종 residue audit

repo 전체 route를 대상으로:

```text
registered
unregistered
dead controller
dead frontend client
consumer 0
```

를 조사한다.

특히 파일은 존재하지만 router registration이 없는 controller/service를 찾는다.

실제 dead이면 제거한다.

---

## 22. frontend route 최종 residue audit

5개 주요 서비스 및 admin/operator UI에서:

```text
route만 존재
menu만 존재
component만 존재
API client만 존재
```

하는 비대칭 residue를 찾는다.

판정:

```text
ACTIVE
DEEPLINK_COMPAT
RETIRED_INFO
DEAD
```

DEAD는 제거한다.

---

## 23. dependency graph 회귀

dependency 제거 후:

```text
pnpm install --frozen-lockfile
workspace resolution
lockfile 정합
```

을 확인한다.

불필요한 dependency 제거 때문에 lockfile 변경이 발생하면 정상 범위로 포함한다.

---

## 24. 테스트

최소:

```text
api-server typecheck
전체 Jest
lint-ratchet
check-unsafe-routes
check-typeorm-entities
```

공통 package 수정 시 해당 package test/build.

영향 frontend는:

```text
typecheck
test
build
```

까지 수행한다.

Vitest만 돌리고 완료 판정하지 않는다.

---

## 25. 5서비스 회귀

최소:

```text
KPA
GlycoPharm
K-Cosmetics
Neture
PharmacyHub
```

에서 레거시 정리로 인해:

```text
route 404 오발
menu broken
white screen
missing import
build failure
```

가 없는지 확인한다.

---

## 26. Admin / Operator 회귀

Admin Dashboard와 Operator 관련 영향을 받았다면:

```text
login
main route
deep link
refresh
핵심 승인/관리 entry
```

를 최소 smoke한다.

---

## 27. consumer-commerce / B2B 회귀

이번 청소 작업에서:

```text
consumer commerce retirement
B2B canonical contract
```

를 깨뜨리지 않는다.

최소 static/test guard로 확인한다.

---

## 28. production smoke

배포 후 read-only 중심으로:

```text
주요 서비스 root
store/operator/admin entry
retired page
canonical replacement page
```

를 확인한다.

실제 주문/결제 write는 하지 않는다.

---

## 29. production DB

이번 작업은 기본적으로 file/runtime/dependency cleanup이다.

DB census가 결론에 필수적이지 않으면 수행하지 않는다.

필요하지만 안전한 credential이 없으면:

```text
NO_PRODUCTION_DB_CENSUS
```

로 기록한다.

---

## 30. CHECK

작성:

```text
docs/checks/WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1-CHECK.md
```

반드시 포함:

```text
전체 census 수
ACTIVE
COMPATIBILITY_REQUIRED
HISTORY_ONLY
DEAD
DEFERRED_MAJOR

삭제 파일
수정 파일
retained legacy
dependency 제거
package 제거 여부
dead route/controller
dead frontend
README/setup 정리
silent swallow 판정
Admin/Operator 중복 판정
notification fallback
order/settlement residue

local branch/worktree/backup 판정

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

다음처럼 별도 큰 설계가 필요한 것만 남긴다.

```text
schema migration
Identity/RBAC 전면 재설계
새 notification architecture
settlement architecture 재설계
암호화 저장 포맷 v2
외부 API compatibility 확인 필요
```

작은 dead file, dead dependency, stale route, stale test는 이번에 끝낸다.

---

## 32. 중지 조건

다음이면 해당 축만 중지한다.

```text
외부 consumer가 있는 API 발견
다른 세션이 동일 파일 수정 중
package 삭제가 대규모 architecture 변경으로 확대
runtime consumer 여부를 안전하게 판정할 수 없음
```

그 외 작은 residue는 중간 승인 없이 계속 정리한다.

---

## 33. 완료 기준

```text
repo-wide legacy census 완료

UNKNOWN = 0
UNJUDGED = 0

dead file 정리
dead route/controller 정리
dead frontend residue 정리
소비처 0 dependency 정리
가능한 dead package 정리
낡은 active README/setup 현행화
csv-import 상태 종결
silent swallow bug masking 정리
Admin/Operator 중복 진입점 정리
notification fallback residue 정리
order/settlement dead cross-link 정리

retirement/compatibility/history 문서는 필요한 것만 유지

consumer-commerce retirement 회귀 없음
B2B canonical 회귀 없음

api-server typecheck PASS
전체 Jest PASS
lint-ratchet PASS
unsafe-routes PASS
typeorm-entities PASS

영향 frontend/package
test + typecheck + build PASS

production smoke PASS

다른 세션 WIP 미접촉
path-specific stage
commit
push
CI green
HEAD == origin/main
```

이 WO 가 끝나면 **"파일이 남아 있어서 언젠가 정리해야 하는 일반 레거시 코드 청소" 트랙 자체를 종료**하는 것이 목표다.
