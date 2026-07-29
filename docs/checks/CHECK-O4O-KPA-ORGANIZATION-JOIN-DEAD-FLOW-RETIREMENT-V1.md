# CHECK-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1

> WO: **WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1** (KPA 조직 가입 / 역할 상향 dead flow 은퇴)
> 실행일: 2026-07-29 · commit `3e1734820` · main 직접 · 상태: **DONE**
> 선행: [CHECK-...-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1](CHECK-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1.md) §C (org-join HOLD → 본 WO 로 은퇴 결정)

---

## 1. 목표 / 확정 정책

KPA 는 **별도 조직 가입 / 역할 상향 채널을 유지하지 않는다.** 가입·역할 변경은 기존
canonical 회원·조직 관리(`PATCH /api/v1/kpa/members/:id/status`)로 일원화한다.
dead flow(조직 가입 승인 컨트롤러 + orphan 물리 테이블 + dead KPI)를 **은퇴**하고,
신규 UI 로 되살리거나 승인 핸들러의 provisioning 을 신규 canonical 경로로 승격하지 않는다.

## 2. Pre-gate (실행 전 게이트)

| 항목 | 결과 |
|------|------|
| main == origin/main | ✅ `7cc0db2a9` 동일 |
| 선행 commit 조상 확인 | ✅ `581c440cb` / `d2fca8b43` 모두 HEAD 조상 |
| 타 세션 미커밋 파일 | ⚠️ 존재(product-ai / store-ai / web-neture / scripts/data) → **커밋에서 제외**(path-specific) |
| 프로덕션 row census `kpa_organization_join_requests` | ✅ **0행** |
| inbound FK | ✅ **0** |
| view/trigger/function 의존 | ✅ **0** (단일 pg_depend 'n' = self-owned PK constraint, DROP TABLE 시 동반 제거) |

## 3. 조사 결과 (dead flow 실체)

- 조직 가입 승인 컨트롤러(`organization-join-request.controller.ts`)는 물리 테이블이 아니라
  **shared `kpa_approval_requests`(entity_type='membership')** 를 read/write 했다.
- 해당 `entity_type='membership'` 은 프로덕션 전 생애 **0건**(INSERT 경로 부재) = dead.
- `kpa_organization_join_requests` 물리 테이블은 **완전 orphan**(코드 0 참조) — 유일한 dangling
  참조는 `action-definitions.ts` member-pending 카드의 KPI term 이었음(lockstep 대상).
- 따라서: (a) dead 승인 컨트롤러/KPI 은퇴 + (b) orphan 물리 테이블 DROP + (c) **shared
  `kpa_approval_requests` 테이블은 다른 entity_type 에서 live 이므로 보존**.

## 4. 변경 내역 (Scope 별)

### Scope A — 승인 채널 은퇴
- `git rm apps/api-server/src/routes/kpa/controllers/organization-join-request.controller.ts` (630줄)
  — create/my/pending/approve/reject/batch 라우트 + `applyApproval()` side effect(addMember/
  updateMemberRole/users.status='active'/승인·거절 이메일/audit log/reviewer metadata) + dead
  reviewUrl `/operator/kpa/organization-join-requests` 전부 제거.
- `kpa.routes.ts` — import + `router.use('/organization-join-requests', ...)` mount + ROUTE MANIFEST 주석 제거.
- 공유 `OrganizationMemberService`(@o4o/organization-core) · `emailService` 모듈은 **유지**(call site 만 제거).

### Scope B — 대시보드 dead 의존 제거 + canonical 재정합
- `operator-summary.controller.ts` · `operator-dashboard.service.ts`
  - `approval.membershipPending`(entity_type='membership', 항상 0) 제거 — `instructorPending`/`coursePending` 유지.
  - recentActivity `org_join` 항목 + 소스 쿼리 제거 — `member_join`(kpa_members) 만으로 조립.
- **district-summary** 승인 대기 source 재정합(WO 판단 #2 realign): dead
  `kpa_approval_requests(entity_type='membership')` → **canonical `kpa_members.status='pending'`**.
  `kpis.pendingApprovals` + `pendingRequests.{total,items}` shape 보존(프론트 `KpaAdminDashboardPage`
  는 `req.requested_role`/`request_type`/`created_at` 를 fallback 과 함께 렌더 → 호환).
- **action-definitions** `member-pending` 카드: dead 2 term(`kpa_approval_requests` membership +
  orphan `kpa_organization_join_requests`) → `SELECT COUNT(*) FROM kpa_members WHERE status='pending'`
  단일 source. **orphan-table term 제거 = DROP 마이그레이션 lockstep 선행조건.**

### Scope C — 프론트 정리
- `git rm services/web-kpa-society/src/types/joinRequest.ts` (importer 0 확인).
- `api/operator.ts` `RecentActivityEvent.type` union 에서 `'org_join'` 제거.
- `AnalyticsPage.tsx` `org_join_approve`/`org_join_reject` 라벨 제거(getActionLabel fallback 존재).

### Scope D — forward-only DROP 마이그레이션
- 신규 `20270215000000-DropKpaOrganizationJoinRequestsDeadTable.ts`
  (직전 counter `20270214000000` +1일 규칙).
- 가드: `hasTable` → 없으면 no-op / row count ≠ 0 → throw / inbound FK ≠ 0 → throw.
- `DROP TABLE IF EXISTS`(CASCADE 미사용). `down()` = 빈 구조 복원(PK + 2 index).
- **entity 파일 없음**(orphan 테이블에 entity 미존재) → registry/barrel 수정 불필요.
- **shared `kpa_approval_requests` 는 DROP 대상 아님.**

### Scope E — canonical 경로 보존 (검증만, 데이터 불변)
- `PATCH /kpa/members/:id/status`, `service_memberships`, `kpa_members`, `organizations`,
  `organization_members`, `role_assignments`, `kpa:store_owner`, 회원 수정/정지/복구/탈퇴,
  canonical 승인 KPI, 공유 provisioning service 전부 미변경.

### Scope F — 문서/주석 정리
- `OperatorRoutes.tsx` 주석 · `role.utils.ts` JSDoc `@example`(→ `member.controller`) ·
  dashboard/summary JSDoc 의 live 서술 갱신. 과거 마이그레이션/IR/CHECK 는 보존.

## 5. 검증 (typecheck / build)

| 대상 | 결과 |
|------|------|
| api-server `tsc --noEmit` (WO scope) | ✅ routes/kpa · migrations/20270215 · role.utils 오류 0 (기존 `src/scripts/*` 오류는 WO 무관·build tsconfig 에서 제외) |
| api-server `tsc -p tsconfig.build.json --noEmit` | ✅ EXIT 0 |
| web-kpa-society `tsc --noEmit` | ✅ EXIT 0 |

## 6. 배포 / 마이그레이션 (프로덕션)

- push `3e1734820` → CI **Deploy API Server** ✅ success (Build/Docker/Deploy/**Run database
  migrations**/Verify 전부 통과) · **Deploy Web Services** ✅ success.
- 배포 후 프로덕션 스키마 census:

| 검증 | 기대 | 실측 |
|------|------|------|
| `to_regclass('kpa_organization_join_requests')` | NULL | ✅ NULL(제거) |
| index `PK_kpa_org_join_requests`/`IDX_kojr_org_status`/`IDX_kojr_user_status` | 0 | ✅ 0 |
| `typeorm_migrations` 기록 | 1 | ✅ `DropKpaOrganizationJoinRequestsDeadTable20270215000000` |
| `kpa_approval_requests`(shared) 보존 | 존재 | ✅ 존재 |
| `kpa_members`(canonical) 보존 | 존재 | ✅ 존재 |

## 7. Smoke (프로덕션 API)

| 검증 | 기대 | 실측 |
|------|------|------|
| `/health` | 200 | ✅ 200 |
| `/api/v1/kpa/organization-join-requests/my` | 404(mount 제거) | ✅ 404 |
| `/api/v1/kpa/organization-join-requests/pending` | 404 | ✅ 404 |
| `/api/v1/kpa/operator/summary` (no auth) | 401(guard 유지) | ✅ 401 |
| `/api/v1/kpa/operator/district-summary` (no auth) | 401 | ✅ 401 |
| district-summary (auth) | 정상 shape·kpa_members 재정합 | ✅ `{kpis:{totalMembers:5,pendingApprovals:0},pendingRequests:{total:0,items:[]}}` |
| operator/summary (auth) `approval` | membershipPending 없음 | ✅ `{instructorPending:0,coursePending:0}` |
| operator/summary (auth) `recentActivity` type | org_join 없음 | ✅ `['member_join']` |

## 8. 회귀 영향

- `KpaAdminDashboardPage`("승인 대기" KPI + "최근 가입 신청" 목록): source 가 dead(항상 0) →
  canonical `kpa_members.status='pending'` 로 바뀌었으나 **값·shape 회귀 0**(dead 값은 언제나 0였음,
  프론트 fallback 렌더 유지).
- 5-Block operator 대시보드: `approval.membershipPending`/`org_join` 는 downstream 조립에서 미소비
  (fetchSecondaryCounts `pendingMembers` = canonical, 불변) → 화면 회귀 0.
- 공유 `kpa_approval_requests` / `OrganizationMemberService` / `emailService` 다른 소비처 무영향.

## 9. STOP 조건 점검

프로덕션 0행 · 실 create 경로 없음 · 운영자 검수 UI 없음 · 외부 client/job 소비자 없음 ·
inbound 의존 없음 · shared provisioning 제거 아님(call site 만 제거) · 동일 파일 타 세션 미편집.
→ **STOP 조건 해당 없음. 전 Scope 실행 완료.**

## 10. 롤백 계약

- 코드: `git revert 3e1734820`.
- 스키마: 마이그레이션 `down()` 이 빈 구조(PK + 2 index) 복원. dead 테이블이므로 데이터 복원 무의미.
- 되돌릴 경우에도 컨트롤러/타입은 revert 로 복구되나 flow 자체가 dead 이므로 런타임 소비처 없음.

## 11. 결론

**CLOSED.** KPA 조직 가입 / 역할 상향 dead flow(승인 컨트롤러 + orphan 물리 테이블 + dead KPI·
recentActivity·프론트 타입/라벨) 전면 은퇴. 승인 대기 KPI 는 canonical `kpa_members.status='pending'`
로 재정합(회귀 0). shared `kpa_approval_requests` · canonical 회원/조직/role_assignment 데이터
전부 보존. 프로덕션 배포·마이그레이션·census·smoke 전 항목 통과.
