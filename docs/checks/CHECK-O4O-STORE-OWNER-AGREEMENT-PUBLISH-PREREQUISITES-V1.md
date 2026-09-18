# CHECK-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1

> **WO**: [`WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1`](../work-orders/WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1.md) · closure 인계 [`…-CLOSURE-HANDOFF-V1`](../work-orders/WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-CLOSURE-HANDOFF-V1.md)
> **상태**: COMPLETE (2026-09-18) — PR #222 merge `d8edbf95a` · production migration Job `o4o-api-migrations-lrkfj` SUCCESS · revision `o4o-core-api-03711-gh4` · 실운영 DELETE 0 · acceptance backfill 0 · **계약은 여전히 DRAFT(미게시)**
> **날짜**: 2026-09-18 · **작성**: Claude Code (Opus 5)
> **원칙**: 검증하지 않은 것을 PASS 로 쓰지 않는다. 개별 사업자번호·주소·전화 출력 0.

---

## 1. 시작 Git / main / branch

- main `e5e6ac07f`(→ 작업 중 `e6d768582`) · PR #222 branch `work/store-owner-termination-lifecycle-v1` head `b1c8832e8`(인계 기준 `c27e3d77e` 이후 타 세션이 main rollover 를 병합해 둔 상태) · PR CI = **API Server Jest fail**.
- 분리 worktree `C:/tmp/o4o-store-owner-closure` 에서 진행(메인 트리 무접촉 · 타 세션 dirty 파일 0).

## 2. PR #222 정합 방식

- `git merge origin/main`(docs 2건 · conflict 0) → 인계 §3.2 핵심 파일 conflict 0.
- 최종 diff 대비 main: 13 파일(+1,335/−5) + 본 closure 의 test 2 파일. `.github/workflows` diff 0 · `temp-store-owner|*.tmp.spec` 0(§3.3 PASS).
- PR CI 실패 원인 = baseline rollover(`d51e1e694`)가 도입한 spec 2건의 **오탐**(rollover 시점 "incremental 비어 있음" 가정): ① `canonical-database-bootstrap-incremental-migration-separation.spec` "no runtime module imports a historical migration source" 가 `manifest.ts` 의 정상 incremental import 까지 offender 로 잡음 → historical manifest 에 있는 파일만 offender 로 좁히고 비공허(non-vacuous) 검증 추가 ② 격리 harness `syntheticExpectedStates` 가 baseline[0] 을 기준으로 삼아 template(실 incremental 적용됨)과 불일치 → `EXPECTED_SCHEMA_STATES[INCREMENTAL_MIGRATIONS.length]` 기준 + S07 은 합성 states 계약. 커밋 `c5ae05ca5`. 구현 코드 변경 0.

## 3. ① document type / acceptance (`ded496f17`)

`store_owner_agreement` canonical document_type · `user_policy_acceptances` 재사용 · terms / store_owner_agreement mandatory agreement 구분 · service/role/published 재검증 · Store API 직접 호출 `428 STORE_OWNER_AGREEMENT_REQUIRED`. 재구현 0.

## 4. ② Store gate (`55c60e081`)

공통 `StoreOwnerAgreementGate` · KPA/KCos/PH Store Workspace 연결 · published agreement 없음 → no-op(운영 현재 상태) · 있음+미동의 → 차단 · PR 에 fail-closed UX 보강 포함.

## 5. ③ 사업자정보 5항목 gate (`75058fc0c` · `33c75d925`)

businessName · representativeName · businessNumber · businessAddress · businessPhone. KCos frontend + backend 승인 직전 재검증 · PH 가입정보 + backend 재검증 · 누락 시 `STORE_OWNER_BUSINESS_INFO_REQUIRED`. 승인 fixture 는 5항목을 채워 계약에 맞춤(구현 완화 0).

## 6. ④ termination case schema

`store_owner_termination_cases` — 16 컬럼(id · service_key · organization_id · user_id · status · requested_at · requested_by · return_requested · return_completed_at · termination_effective_at · purge_due_at · purge_completed_at · cancelled_at · failure_reason · created_at · updated_at) · FK 3(org RESTRICT · user RESTRICT · requested_by SET NULL) · status CHECK 8값 · open-case partial UNIQUE(user, org, service · status ∉ purge_completed/cancelled) · index 2.

## 7. migration fingerprint

`CreateStoreOwnerTerminationCases1789701000000` = baseline `2026-09-18-id685` 뒤 첫 incremental(manifest [0] · minimumEpoch13 `1789690338676` 이상). expected state 2 = `73d74984bd0448560639742fcce3c8922295f6b967f8bd71dd28f352552756d0` · 5771 lines — **최신 main baseline 기준으로 격리 PostgreSQL 15.19 에서 재산출(fresh bootstrap id685 + incremental 1 → POST ASSERTION PASS)**, PR 등록값과 동일(인계 STOP 조건 1 해당 없음). `check-migration-contract` 21/21.

## 8. 반환 package

`store-owner-termination.service.ts` — return package 생성 · 실제 SELECT 실행 · manifestHash 산출 · 반환 완료 기록(격리 fixture 로 검증 · §15).

## 9. shared-data 분류

SERVICE_SCOPED(대상 서비스 종료 시 삭제) · ORGANIZATION_SHARED(다른 활성 Store 서비스 있으면 보존 · 마지막 종료 시만 파기) · SUPPLIER_OWNED(보존) · SYSTEM_LOG(보유기간 정책) — purge inventory/preview 분류 · 격리 fixture 로 보존/삭제 경계 검증.

## 10. 7일 deadline

종료 적용 시 `purge_due_at = +7일` · scheduler 가 overdue 감지만(실삭제 0).

## 11. GCS 3단계 purge

① Store DB 참조 정리(`store_execution_assets` 는 재시도 근거로 보존) → ② GCS/media 삭제 → ③ 성공 후 `store_execution_assets` 삭제 + `purge_completed`.

## 12. GCS 실패 `PURGE_INCOMPLETE` 재시도

GCS 실패 시 case `failed / PURGE_INCOMPLETE` · DB 참조만 지우고 성공 처리 금지 · 재시도는 운영자 `purge-preview → POST purge {mode:"apply"}` 명시 실행(scheduler 자동 재시도 0).

## 13. scheduler destructive 0

`store-owner-termination.job.ts` — 종료 적용 + purge overdue 감지만. 실삭제 경로는 admin API `{mode:"apply"}` 뿐.

## 14. targeted tests (worktree · 최신 main 정합 후)

`store-owner-backcompat-servicekey` · `store-owner-membership-gate` · `store-owner-service-scoped-org` · `kpa-me-context-store-owner-contract` · `MembershipApprovalService.bareRoleContract` · `MembershipApprovalService.rejection` · `store-owner-termination.service` (+ `terms-acceptance-gate`) — **8 suites · 140/140 pass** (`--runInBand`). `canonical-database-bootstrap-incremental-migration-separation` 21/21(수정 후).

## 15. isolated PostgreSQL test

docker `postgres:15`(15.19) · `O4O_ISOLATED_PG_URL`: `store-owner-termination.integration.spec` **PASS** · `terms-acceptance-isolated-pg` PASS · `database-state-classifier-schema-drift-…` **35 pass / 1 skip**(legacy history file opt-in) — harness 수정 전 S05/S07/S08 오탐 FAIL → 수정 후 PASS. main(incremental 0)에서는 harness 수정이 동작 불변(`[0] ?? [0]`).

## 16. CI / CodeQL / build·typecheck

- PR #222 최종(`c5ae05ca5`): API Server Jest **pass** · Code Quality pass · Build Applications(admin-dashboard) pass · CodeQL pass · Analyze(typescript) pass · SonarCloud pass.
- 로컬: api-server `tsc --noEmit` 0 · shared-space-ui vitest 100/100 · tsc 0 · store-ui-core vitest 99/99 · web-kpa-society/web-k-cosmetics/web-pharmacy-hub `tsc -b` 0.
- **무관 실패(수정 0 · 보고만)**: `packages/store-ui-core` `tsc --noEmit` 3건(`storeWorkspace.test.tsx` Mock 타입 · main `fb08c0dd1` 부터 동일 · CI 는 vitest 만 실행).
- merge 후 main `d8edbf95a`: **CI Pipeline success** · CodeQL success · Deploy Web/Admin/API success.

## 17. production migration job

Deploy API run `35344154220` → Job 실행 `o4o-api-migrations-lrkfj`: `manifest 1 · expected states 2` · `CLASSIFICATION = LEGACY_ESTABLISHED` · `PREFIX 0/1` · `LEGACY_HISTORY_FINGERPRINT = MATCH` · `PRE ASSERTION PASS`(0ca1a71b… 5745) · `PENDING 1 → EXECUTED 1` · `LIVE = EXPECTED = 73d74984… 5771` · `POST ASSERTION PASS` · **`MIGRATION_JOB = SUCCESS`** → revision `o4o-core-api-03711-gh4` 100%.

## 18. production table row 0

read-only(Cloud SQL Auth Proxy · `default_transaction_read_only` · ROLLBACK): `typeorm_migrations` 최신 = `CreateStoreOwnerTerminationCases1789701000000` · 16 컬럼 · 제약 5(PK · FK 3 · CHECK) · 인덱스 4(PK · status_due · org_service · UQ open_case) · **row 0**.

## 19. production scheduler smoke

revision 03711 로그: `[store-owner-termination] scheduler started (hourly)` → `scheduled run done` `terminated 0 · overduePurges 0` · `✅ Store Owner Termination routes registered at /api/v1/admin/store-owner-terminations`. 비인증 `GET`/`POST /api/v1/admin/store-owner-terminations` → **401**(미존재 경로 대조 404). 실데이터 종료 POST 0.
gate: published `store_owner_agreement` 0 → Store Workspace 기존 접근 그대로(no-op) — 계약 미게시 유지.

## 20. existing store_owner census (read-only · 개별 값 출력 0)

| serviceKey | active_store_owner_count | COMPLETE | INCOMPLETE |
|---|---|---|---|
| kpa-society | 1 | 0 | 1 |
| k-cosmetics | 0 | 0 | 0 |
| pharmacy-hub | 0 | 0 | 0 |

기준: `role_assignments`(is_active · `kpa:store_owner`/`cosmetics:store_owner`/`pharmacy-hub:store_owner`) × `users.businessInfo` 5항목(alias: pharmacyName/companyName · ceoName · address1 포함). 참고: WO-2C(`09d322654`) reset 이후 users 총 1(cleanup user) — 위 1건이 그 계정. businessInfo write 0.

## 21. 실제 운영 데이터 DELETE 0

termination case 생성 0 · `mode=apply` 0 · store data DELETE 0 · GCS DELETE 0 · organization anonymize 0 · role/membership 종료 0.

## 22. acceptance backfill 0

`user_policy_acceptances` 0 row(reset 이후) · store_owner_agreement acceptance 0.

## 23. role / membership 비의도 write 0

role_assignments · service_memberships write 0(모든 운영 접근 read-only 트랜잭션 ROLLBACK).

## 24. 최종 commit / push

- PR branch: `c5ae05ca5`(test 오탐 2건) push → PR #222 merge `d8edbf95a`(merge commit · repo 관례).
- main 문서 마감 commit: (아래 git 표)
- 상위 WO `CLOSED` · 계약 baseline `DRAFT — 게시 선행조건 완료, 게시 대기`(시행일 placeholder 유지 · ACTIVE 아님) · CANONICAL-INDEX 변경 0(게시 WO 에서).

| 항목 | 값 |
|---|---|
| main CI (`d8edbf95a`) | CI Pipeline · CodeQL · Deploy API/Web/Admin 전부 success |
| 문서 commit | 본 CHECK + 상위 WO CLOSED + 인계 WO CLOSED + baseline 상태 갱신 (docs 만 · 코드 0) |

## 25. 매장 경영자 이용계약 v1.0 게시 가능 여부

**가능(선행조건 4건 완료 · 인계 §7.2 후속 게시 WO 범위)**: 시행일 확정 → DRAFT→ACTIVE → `render-policy-plain --verify` → KPA/KCos/PH `store_owner_agreement` v1 publish → 기존 store_owner 명시적 acceptance(현재 1명 · businessInfo INCOMPLETE → 보완 UX 검증 필요) → 428 → 동의 → Store Workspace PASS → CANONICAL-INDEX §7.
