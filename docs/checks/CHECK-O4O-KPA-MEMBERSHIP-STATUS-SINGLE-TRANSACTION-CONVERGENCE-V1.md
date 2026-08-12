# CHECK-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1

- **WO**: `WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1`
- **선행 작업**: [`CHECK-O4O-KPA-OPERATOR-MEMBER-WRITE-ATOMICITY-AND-COLUMN-FIX-V1`](CHECK-O4O-KPA-OPERATOR-MEMBER-WRITE-ATOMICITY-AND-COLUMN-FIX-V1.md) §2 잔여 구간(위임 서비스 manager 주입)
- **일자**: 2026-08-12
- **판정**: **PASS** (코드 4개 · 문서 1개 · 신규 테스트 26건 추가 · typecheck 및 영향범위 테스트 통과 · migration 0 · 운영 DB write 0 · 배포 0)

---

## 1. transaction 경계

### 1-1. `MembershipApprovalService` — 호출자 transaction 참여 계약

파일: [`apps/api-server/src/services/approval/MembershipApprovalService.ts`](../../apps/api-server/src/services/approval/MembershipApprovalService.ts)

- 신규 타입 `MembershipTxExecutor = { query(sql, parameters?): Promise<any> }`
  TypeORM 의 `QueryRunner` 와 transaction `EntityManager` 가 모두 **구조적으로** 이를 만족한다.
- `SuspendParams` / `ReactivateParams` / `WithdrawMemberParams` 에 **선택 필드** `manager?: MembershipTxExecutor` 추가.
- 각 메서드를 **wrapper + core** 로 분리했다.
  - `suspendMembershipCore` / `reactivateMembershipCore` / `withdrawMembershipCore`
    — 순수 write 로직. begin / commit / rollback / release 를 **포함하지 않는다**. 실패 시 기존 구조화 로그 후 그대로 throw.
  - public 메서드 = 경계 소유자. `params.manager` 가 있으면 core 를 그대로 실행하고,
    없으면 기존과 동일하게 `AppDataSource.createQueryRunner()` → `connect` → `startTransaction` → commit / rollback → `release`.
- 헬퍼 `activateRoleAssignment` / `deactivateRoleAssignment` 의 첫 인자 타입을
  `import('typeorm').QueryRunner` → `MembershipTxExecutor` 로 완화 (본문은 `.query()` 만 사용하므로 동작 변화 없음).
- "대상 행 0건" 처리: core 는 `return null` 만 하고, **자체 transaction 경로에서만** wrapper 가 rollback 한다.
  주입 경로에서 rollback 을 호출하면 호출자 transaction 을 무단으로 되돌리게 되므로 금지한다.

### 1-2. `PATCH /api/v1/kpa/members/:id/status`

파일: [`apps/api-server/src/routes/kpa/controllers/member.controller.ts`](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts)

| 이전 | 이후 |
|---|---|
| delegate(`MembershipApprovalService`) 가 **자체 transaction** 으로 먼저 commit → 이후 별도 transaction 에서 `kpa_members` · `kpa_member_services` 저장 | delegate + `kpa_members` + `kpa_member_services` 가 **단일 `dataSource.transaction`** |

```
dataSource.transaction(manager => {
  // suspended | rejected            → suspendMembership({..., manager})
  // withdrawn                       → withdrawMembership({..., manager})
  // suspended → active              → reactivateMembership({..., manager})
  // pending  → active (승인)         → inline users / profile / service_memberships (기존)
  manager.save(KpaMember, member)          // delegate 의 projection sync 뒤에 저장 (기존 최종 상태 유지)
  manager.save/create(KpaMemberService …)  // kpa-a 서비스 레코드 동기화
})
```

- 이 transaction 안에서 covered 되는 필수 write: `service_memberships`, `users`, `kpa_pharmacist_profiles` · `kpa_student_profiles`,
  `role_assignments`, `organization_members`(탈퇴 정리), `neture_suppliers`(재활성 복구), `kpa_members`, `kpa_member_services`.
- **중첩 transaction 0 / 별도 connection 0**: delegate 가 동일 manager 를 쓰므로 `SELECT … FOR UPDATE` 행 잠금도 같은 transaction 안에서 성립한다.
  이전처럼 미커밋 행에 대한 교차 connection lock 대기가 생기지 않는다.
- delegate 호출 순서는 이전과 동일(delegate → `kpa_members` 저장)이라 최종 상태값은 변하지 않는다.
- 상태 의미 · 권한 규칙(`isPlatformAdmin: false`, `serviceKeys: ['kpa-society']`) · 응답 계약은 **변경 없음**.

### 1-3. transaction 밖에 남긴 것 (기존 계약 유지)

`pharmacy_owner` 자동 활성화(`organizationOpsService` / `roleAssignmentService` / `StoreSlugService`), 알림, 이메일, audit log —
모두 **commit 이후 non-blocking** 이며 실패해도 `warnings[]` 로만 노출한다는 기존 정책을 그대로 둔다.

---

## 2. 기존 독립 소비처 호환 방식

`manager` 는 **선택 필드** 이며, 미주입 시 wrapper 가 기존 자체 transaction 을 그대로 수행한다. 호출부 수정이 필요 없다.

| 소비처 | 호출 | 상태 |
|---|---|---|
| `controllers/operator/MembershipConsoleController.ts:745` | `suspendMembership` | manager 미주입 — 기존 동작 유지 |
| `controllers/operator/MembershipConsoleController.ts:919` | `suspendMembership` | 동일 |
| `controllers/operator/MembershipConsoleController.ts:1005` | `reactivateMembership` | 동일 |
| `routes/kpa/controllers/member.controller.ts:1569` (회원 탈퇴 처리) | `withdrawMembership` | 동일 |
| `PATCH /kpa/members/:id/status` | suspend / withdraw / reactivate | **manager 주입** (본 WO) |

---

## 3. 실패 주입 결과

| 주입 지점 | 기대 | 결과 |
|---|---|---|
| delegate 실패 (`suspendMembership` reject) | transaction rollback · `kpa_members` 저장 0 · 500 | commit 0 / rollback 1 / KpaMember save 0 / 500 |
| **delegate 성공 후 `kpa_members` 저장 실패** | 위임분까지 전체 rollback · 500 | commit 0 / rollback 1 / 500 — 선행 WO 의 잔여 구간 해소 |
| 승인 경로 `UPDATE service_memberships` 실패 | 전체 rollback · 500 (200 아님) | 유지 (선행 WO 회귀) |
| core 내부 write 실패 · manager 주입 | rollback 호출 없이 throw (호출자 소유) | 확인 |
| core 내부 write 실패 · manager 미주입 | 기존대로 rollback 후 throw | 확인 |

---

## 4. 테스트 · typecheck

| 항목 | 결과 |
|---|---|
| 신규 [`MembershipApprovalService.txManagerInjection.test.ts`](../../apps/api-server/src/services/approval/__tests__/MembershipApprovalService.txManagerInjection.test.ts) | **21/21 PASS** (suspend·withdraw·reactivate × 주입/미주입 × 정상·실패·0건) |
| 확장 [`member.controller.writeAtomicity.test.ts`](../../apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.writeAtomicity.test.ts) | **17/17 PASS** (기존 12 + 신규 5) |
| 영향 범위 (`src/routes/kpa`, `src/services/approval`, `src/controllers/operator/__tests__`, `kpa-role-guard`, `kpa-boundary-regression`) | **10 suites / 154 tests PASS** |
| `npx tsc --noEmit -p tsconfig.json` (apps/api-server) | **PASS** (오류 0) |
| 실제 API runtime smoke | **미수행** — 운영 회원 데이터를 변경하는 write API. WO 의 "운영 DB write 하지 않는다" 조건에 해당 |

기존 테스트 1건(`위임 실패 … txStarted === 0`)은 **이전 설계(위임을 transaction 밖에서 먼저 수행)를 고정하던 단언**이므로,
새 계약(위임이 transaction 안에서 실행 → rollback 1)으로 갱신했다. 판정 자체(삼키지 않고 500 · `kpa_members` 저장 0)는 그대로 유지한다.

---

## 5. DB · 배포

- 신규 테이블 / 컬럼 / migration / backfill: **없음**
- 운영 DB write: **0건** · 운영 DB 조회: **0건**
- 배포: **수행하지 않음**
- 서비스 경계 유지: 운영자 경로는 `serviceKeys: ['kpa-society']` · `isPlatformAdmin: false` 고정, 행 잠금 규칙(`FOR UPDATE`) 변경 없음

---

## 6. 변경 파일 · commit · push

- 코드 4개(소스 2 · 테스트 2) · 문서 1개, 총 5개 (경로 한정 stage):
  - `apps/api-server/src/services/approval/MembershipApprovalService.ts`
  - `apps/api-server/src/routes/kpa/controllers/member.controller.ts`
  - `apps/api-server/src/services/approval/__tests__/MembershipApprovalService.txManagerInjection.test.ts`
  - `apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.writeAtomicity.test.ts` (수정)
  - `docs/checks/CHECK-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1.md`
- 다른 세션 소유의 dirty · 미추적 파일은 **접촉하지 않음**
- commit / push 결과는 완료 보고에 기재

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
