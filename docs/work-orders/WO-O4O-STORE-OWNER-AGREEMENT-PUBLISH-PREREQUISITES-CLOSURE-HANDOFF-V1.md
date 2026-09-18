# WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-CLOSURE-HANDOFF-V1

> **상태:** READY FOR CLAUDE CODE · HANDOFF ONLY  
> **상위 WO:** `docs/work-orders/WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1.md`  
> **대상 계약:** `docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md` (DRAFT)  
> **기존 PR:** #222 — `work/store-owner-termination-lifecycle-v1`  
> **PR head 인계 기준:** `c27e3d77ebca9345c03c5ef2ff5c530b8b1d4896`  
> **main 인계 기준:** `6b3b5d4acf29d447e7e4689bc3ed4d90fb4274e3`  
> **목적:** 이미 구현·검증된 매장 경영자 계약 게시 선행조건을 재구현하지 않고, 최신 main 정합 → 최종 CI → production migration/deploy → read-only smoke → CHECK까지 닫는다.
>
> **중요:** 이 WO는 **새 기능 구현 WO가 아니다.** 현재 PR #222를 안전하게 마무리하는 closure/handoff 작업이다.

---

# 1. 현재 상태와 절대 재작업 금지 범위

## 1.1 이미 main에 반영된 선행조건 ①~③

다음은 이미 main에 들어갔으므로 **다시 구현하지 않는다.**

### ① 계약 문서유형 + agreement acceptance + backend gate

커밋:

`ded496f1790ff725f4bfe0697270c8f85f93e6a0`

완료 내용:

- `store_owner_agreement` canonical document type
- `user_policy_acceptances` 재사용
- terms / store_owner_agreement mandatory agreement 구분
- service / role / published document 검증
- Store API 직접 호출의 `428 STORE_OWNER_AGREEMENT_REQUIRED` 차단

### ② K-Cosmetics / PharmacyHub 사업자정보 5항목 gate

커밋:

`75058fc0ce8c6e2be7a5b3025d926276371193b0`

완료 내용:

- 필수: 상호/매장명 · 대표자명 · 사업자등록번호 · 사업장 주소 · 사업장 연락처
- K-Cosmetics frontend + backend 승인 직전 재검증
- PharmacyHub 가입정보 + backend 승인 직전 재검증
- KPA 기존 business gate 유지

### ③ Store Workspace 계약 UX gate

커밋:

`55c60e08166645cb1b054d740aa172518cc359f5`

완료 내용:

- 공통 `StoreOwnerAgreementGate`
- KPA Society / K-Cosmetics / PharmacyHub Store Workspace 연결
- published agreement 없음 → no-op
- published agreement 있음 + 미동의 → Store UI 진입 차단
- 명시적 동의 후 Store UI 접근

PR #222에는 이후 fail-closed UX 보강도 포함되어 있다.

## 1.2 현재 계약 상태

매장 경영자 이용계약은 아직:

`DRAFT — 게시 선행조건 완료 전`

이다.

이번 WO에서 **ACTIVE 전환·게시하지 않는다.**

## 1.3 production destructive state

현재까지:

- production `store_owner_termination_cases` migration 적용 **안 함**
- production 종료 case 생성 **0**
- production 매장 데이터 삭제 **0**
- production GCS 삭제 **0**
- 기존 store_owner agreement acceptance backfill **0**

이 상태를 유지하면서 migration/deploy까지만 완료한다.

---

# 2. PR #222에서 이미 구현·검증된 종료 lifecycle

## 2.1 PR / branch

PR:

`#222 — WO: Store owner agreement publish prerequisites — termination lifecycle`

branch:

`work/store-owner-termination-lifecycle-v1`

인계 시 head:

`c27e3d77ebca9345c03c5ef2ff5c530b8b1d4896`

**새 브랜치에서 동일 구현을 복사하지 않는다. 기존 PR을 이어서 사용한다.**

## 2.2 migration

신규 migration:

`1789701000000-CreateStoreOwnerTerminationCases.ts`

신규 table:

`store_owner_termination_cases`

핵심:

- service_key
- organization_id
- user_id
- status
- requested_at / requested_by
- return_requested / return_completed_at
- termination_effective_at
- purge_due_at
- purge_completed_at
- failure_reason
- timestamps

open-case partial unique + status/due index + org/service index 포함.

## 2.3 schema fingerprint

격리 PostgreSQL 15에서 fresh bootstrap + incremental 1..8 적용 후 확정:

`73d74984bd0448560639742fcce3c8922295f6b967f8bd71dd28f352552756d0`

line count:

`5771`

운영 DB fingerprint를 정본으로 채택한 값이 아니다.

`expected-schema-states.ts`에 등록되어 있다.

## 2.4 lifecycle service

PR #222에서 구현된 최소 기능:

- 종료 case 생성
- 반환 package 생성
- 반환 완료 기록
- 종료 예정 / 종료 적용
- 공개 surface 비활성
- purge inventory / preview
- service scoped / organization shared / supplier owned / system log 분류
- 종료 + 7일 purge due 추적
- scheduler는 종료 적용 + purge overdue 감지만 수행
- **scheduler 실삭제 금지**
- 실제 purge는 admin API `{mode:"apply"}`만 허용

## 2.5 shared-data 보호

확정 원칙:

- SERVICE_SCOPED → 대상 서비스 종료 시 삭제
- ORGANIZATION_SHARED → 다른 활성 Store 서비스가 있으면 보존
- 마지막 Store 서비스 종료 시에만 organization-shared Store 데이터 파기
- SUPPLIER_OWNED → 보존
- SYSTEM_LOG → 별도 보유기간 정책에 따라 보존

## 2.6 GCS / media

PR 최신 구현은 3단계 purge 구조다.

1. Store DB 참조 정리
   - 단 `store_execution_assets`는 재시도 근거로 보존
2. GCS / media 삭제
3. 성공 후 `store_execution_assets` 삭제 + case `purge_completed`

GCS 실패:

`failed / PURGE_INCOMPLETE`

로 남아야 한다.

**DB 참조만 지우고 성공 처리 금지.**

재시도는 scheduler가 자동 실행하지 않는다.

운영자:

`purge-preview → POST purge {mode:"apply"}`

로 명시 재시도한다.

## 2.7 실 SQL 검증

임시 GitHub Actions PostgreSQL 15에서 아래가 실제 SQL로 PASS했다.

검증 run:

`35314588013`

결과:

- WO regression suites PASS
- isolated lifecycle fixture PASS

격리 fixture 검증:

1. 대상 서비스 Store row 삭제
2. 다른 Store 서비스가 있으면 organization-shared row 보존
3. supplier/operator original 보존
4. 마지막 Store 종료 시 shared Store row 삭제
5. organization 식별정보 정리
6. `organization_members.left_at / updated_at` canonical snake_case 사용
7. return-package 실제 SELECT 실행
8. manifestHash 생성

## 2.8 발견·수정된 schema drift

초기 테스트에서:

`organization_members."leftAt" / "updatedAt"`

사용 오류가 발견됐다.

실제 canonical DB column:

`left_at / updated_at`

로 PR에서 수정 완료.

fixture도 동일하게 정렬되어 있다.

## 2.9 테스트 fixture FK 보강

`organization_service_enrollments.service_code`는 `platform_services.code` FK다.

격리 fixture가 `kpa-society / pharmacy-hub / k-cosmetics` service row를 먼저 seed하도록 수정되어 실 SQL PASS했다.

---

# 3. Claude Code가 수행할 남은 작업

## 3.1 기존 PR부터 사용

새 구현 브랜치를 만들지 않는다.

가능하면 분리 worktree:

`work/store-owner-termination-lifecycle-v1`

를 사용한다.

시작:

```bash
git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -10
```

다른 세션 dirty 파일이 있으면 절대 포함하지 않는다.

## 3.2 최신 main 정합

인계 시 main:

`6b3b5d4acf29d447e7e4689bc3ed4d90fb4274e3`

PR head:

`c27e3d77ebca9345c03c5ef2ff5c530b8b1d4896`

main이 더 진행돼 있으면 최신 `origin/main`에 PR branch를 정합한다.

권고:

- 분리 worktree
- rebase 또는 repository 운영관례에 맞는 merge
- conflict가 없을 때만 진행

다음 핵심 파일에서 conflict가 발생하면 임의 선택하지 말고 중지·보고한다.

- `apps/api-server/src/database/incremental/manifest.ts`
- `apps/api-server/src/database/incremental/expected-schema-states.ts`
- `apps/api-server/src/services/startup.service.ts`
- `apps/api-server/src/modules/policy-acceptance/*`
- `apps/api-server/src/utils/store-owner.utils.ts`
- `MembershipApprovalService.ts`

특히 새로운 migration이 main에 추가됐다면
`1789701000000`의 manifest 순서·fingerprint가 더 이상 final state가 아닐 수 있다.

그 경우 기존 fingerprint를 억지로 유지하지 말고 **최신 main + 전체 incremental 기준으로 isolated PostgreSQL 15에서 다시 산출**한다.

## 3.3 임시 검증 흔적 0 확인

PR 최종 diff에는 다음이 없어야 한다.

- TEMP workflow
- debug CodeQL SARIF print
- `*.tmp.spec.ts`

확인:

```bash
git diff origin/main...HEAD -- .github/workflows
git ls-files | grep -E 'temp-store-owner|\.tmp\.spec'
```

영구 유지:

- `store-owner-termination.service.spec.ts`
- `store-owner-termination.integration.spec.ts`

## 3.4 WO 관련 테스트 전부 통과

최소 다음을 직접 실행한다.

```bash
pnpm --filter '@o4o/api-server' exec jest \
  src/__tests__/store-owner-backcompat-servicekey.spec.ts \
  src/__tests__/store-owner-membership-gate.spec.ts \
  src/__tests__/store-owner-service-scoped-org.spec.ts \
  src/__tests__/kpa-me-context-store-owner-contract.spec.ts \
  src/services/approval/__tests__/MembershipApprovalService.bareRoleContract.test.ts \
  src/services/approval/__tests__/MembershipApprovalService.rejection.test.ts \
  src/__tests__/store-owner-termination.service.spec.ts \
  --runInBand
```

격리 PostgreSQL:

`store-owner-termination.integration.spec.ts`

실 DB fixture로 PASS해야 한다.

이미 인계 전에 targeted CI PASS 이력이 있으나,
**최신 main 정합 후 다시 실행**한다.

## 3.5 business-info gate 테스트 원칙

구현을 느슨하게 만들어 기존 테스트를 통과시키지 않는다.

K-Cosmetics / PharmacyHub store_owner 승인 fixture에
필수 사업자정보 5항목을 넣어 테스트를 새 계약에 맞춘다.

필수:

- businessName
- representativeName
- businessNumber
- businessAddress
- businessPhone

실제 승인에서는 누락 시:

`STORE_OWNER_BUSINESS_INFO_REQUIRED`

이어야 한다.

## 3.6 pending agreement DB 경계

`isStoreOwner(dataSource,...)`에서 agreement pending 판정도 같은 DataSource 경계를 사용해야 한다.

전역 AppDataSource singleton을 다시 잡아 테스트/transaction 격리를 깨뜨리지 않는다.

PR의 최신 구현을 유지하고 회귀 확인한다.

## 3.7 API / frontend build

최소:

```text
api-server build/typecheck
shared-space-ui test/typecheck
store-ui-core test/typecheck
web-kpa-society typecheck/build
web-k-cosmetics typecheck/build
web-pharmacy-hub typecheck/build
```

전체 CI는 repository 기준을 따른다.

다른 WO 때문에 발생한 unrelated failure는 수정하지 말고 정확히 분리 보고한다.

단, **이번 WO가 원인인 실패는 모두 닫아야 한다.**

## 3.8 PR #222 최종 CI

최신 main 정합 후 PR #222의:

- CodeQL
- CI Pipeline
- migration contract guard
- targeted Store termination tests

를 확인한다.

모두 green 또는 unrelated-known failure가 명확히 분리되어야 merge 가능하다.

---

# 4. production migration / deploy

## 4.1 승인

상위 WO가 이미 `store_owner_termination_cases` migration 작성·production 적용을 승인했다.

추가 사용자 승인 없이 migration 자체는 진행 가능하다.

다만 **실 운영 매장 purge는 별도 명시 승인 없이는 금지**다.

## 4.2 migration 표준

반드시:

`docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md`

를 따른다.

직접 psql DDL 금지.

canonical:

`deploy-api.yml → o4o-api-migrations Cloud Run Job → 성공 → API revision deploy`

순서다.

## 4.3 production migration 기대

적용 migration:

`CreateStoreOwnerTerminationCases1789701000000`

production post assertion:

- migration SUCCESS
- expected schema fingerprint match
- `store_owner_termination_cases` 존재
- constraint/index 존재
- row count = 0

기존 데이터 backfill 없음.

## 4.4 production deploy 후 read-only smoke

실운영 매장 write 없이 확인한다.

### A. schema

- table 존재
- expected columns
- FK 3
- status CHECK
- open-case unique partial index
- index 2
- row = 0

### B. gate

아직 `store_owner_agreement`가 published되지 않았으므로:

`published agreement 없음 → Store Workspace 기존 접근 PASS`

이어야 한다.

이번 WO에서 계약을 publish하지 않는다.

### C. termination scheduler

로그에서:

- job start
- case 0이면 terminated 0
- overduePurges 0
- destructive purge 0

확인.

### D. API

admin route mount 여부만 확인한다.

실운영 종료 case를 생성하지 않는다.

허용 예:

- 인증 없는 요청이 정상적으로 차단되는지
- admin GET list가 빈 목록/현 상태를 반환하는지

실데이터 종료 POST 금지.

## 4.5 production 실삭제 금지

이번 WO의 production delete:

`0`

이어야 한다.

금지:

- real termination case 생성
- `mode=apply`
- store data DELETE
- GCS DELETE
- organization anonymize
- role/membership 실제 종료

---

# 5. 기존 store_owner 사업자정보 census

게시 전에 기존 store_owner의 필수 5항목 completeness를 read-only로 집계한다.

대상:

- KPA Society
- K-Cosmetics
- PharmacyHub

보고값만:

```text
serviceKey
active_store_owner_count
COMPLETE
INCOMPLETE
```

개별 사업자번호·주소·전화번호 출력 금지.

누락값을 임의 생성하거나 보정하지 않는다.

이 WO에서는 기존 계정 businessInfo write 0.

INCOMPLETE가 존재해도 계약 게시 작업에서 보완 UX로 처리할 수 있도록 수만 보고한다.

---

# 6. 문서 마감

## 6.1 상위 WO

`WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1.md`

를 실행 완료 상태로 갱신한다.

상태:

`CLOSED`

단, 계약 자체 게시 완료를 의미하지 않는다.

## 6.2 계약 baseline

`O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md`

상태를:

`DRAFT — 게시 선행조건 완료, 게시 대기`

로 갱신한다.

시행일 placeholder는 유지한다.

ACTIVE로 바꾸지 않는다.

## 6.3 CHECK

신규:

`docs/checks/CHECK-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1.md`

최소 기록:

1. 시작 Git / main / branch
2. PR #222 정합 방식
3. ① document type / acceptance
4. ② Store gate
5. ③ 사업자정보 5항목 gate
6. ④ termination case schema
7. migration fingerprint
8. 반환 package
9. shared-data 분류
10. 7일 deadline
11. GCS 3단계 purge
12. GCS 실패 `PURGE_INCOMPLETE` 재시도
13. scheduler destructive 0
14. targeted tests
15. isolated PostgreSQL test
16. CI / CodeQL
17. production migration job
18. production table row 0
19. production scheduler smoke
20. existing store_owner COMPLETE/INCOMPLETE census
21. 실제 운영 데이터 DELETE 0
22. acceptance backfill 0
23. role/membership 비의도 write 0
24. 최종 commit / push

## 6.4 CANONICAL-INDEX

이번 WO에서 추가하지 않는다.

계약이 실제:

`ACTIVE + published`

되는 후속 게시 WO에서 등록한다.

---

# 7. 완료조건과 후속

## 7.1 완료조건

다음 모두 충족해야 이 closure WO가 끝난다.

```text
PR #222 latest main aligned
migration manifest/order valid
expected schema state valid

targeted WO regressions PASS
isolated PostgreSQL lifecycle PASS
CodeQL PASS
build/typecheck PASS

production migration SUCCESS
store_owner_termination_cases row = 0
production real termination case = 0
production real purge/delete = 0

store_owner_agreement unpublished
published agreement absent → existing Store access PASS

business-info census reported
acceptance backfill = 0
unrelated role/membership write = 0

parent WO = CLOSED
agreement baseline = DRAFT — 게시 선행조건 완료, 게시 대기
CHECK written
HEAD == origin/main
```

## 7.2 후속 작업 — 이번 WO에서 실행 금지

이 closure 완료 뒤 별도 작업으로만 진행한다.

`O4O 매장 경영자 이용계약 v1.0 게시 WO`

후속 범위:

1. 시행일 확정
2. DRAFT → ACTIVE
3. `render-policy-plain --verify`
4. KPA / K-Cosmetics / PharmacyHub `store_owner_agreement v1` 게시
5. 기존 store_owner explicit acceptance
6. 428 → 동의 → Store Workspace PASS
7. INCOMPLETE businessInfo 보완 UX 검증
8. CANONICAL-INDEX §7
9. 게시 CHECK

이번 closure에서 위 작업을 선행하지 않는다.

## 7.3 완료 보고 형식

Claude Code는 다음 순서로 보고한다.

1. 시작 main / branch / PR 상태
2. 최신 main 정합 결과
3. 충돌 여부
4. 임시 검증 파일 0 확인
5. migration / fingerprint
6. agreement type / acceptance
7. Store gate
8. KCos / PH business gate
9. 사업자정보 census
10. termination lifecycle
11. return package
12. shared-data protection
13. GCS 3단계 purge
14. GCS failure retry
15. scheduler destructive boundary
16. targeted tests
17. isolated PG
18. build / typecheck / CodeQL / CI
19. production migration
20. production smoke
21. 실제 데이터 DELETE 0
22. acceptance backfill 0
23. CHECK
24. parent WO / baseline 상태
25. commit SHA / push
26. HEAD == origin/main
27. 매장 경영자 이용계약 v1.0 게시 가능 여부

---

## STOP 조건

다음이면 임의 진행하지 말고 보고한다.

1. 최신 main에 새 incremental migration이 추가되어 기존 fingerprint가 final state가 아니게 된 경우
2. migration manifest / expected state conflict
3. 동일 대상 파일을 다른 세션이 dirty 상태로 수정 중인 경우
4. shared-data 분류가 불명확한 신규 Store table 발견
5. GCS object가 다른 org/service에서 공유되는지 판정 불가
6. production migration post assertion mismatch
7. production에서 termination case row가 예상과 달리 이미 존재
8. 실제 운영 데이터 DELETE가 필요해지는 상황
9. 계약을 게시해야 테스트할 수 있는 상황 — 게시는 후속 WO 범위
