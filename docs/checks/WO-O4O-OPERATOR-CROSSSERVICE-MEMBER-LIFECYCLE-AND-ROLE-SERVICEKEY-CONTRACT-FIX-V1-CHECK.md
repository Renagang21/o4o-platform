# WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-LIFECYCLE-AND-ROLE-SERVICEKEY-CONTRACT-FIX-V1 — CHECK

> 선행 WO: [WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1](WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1-CHECK.md) §7-A 의 D3 · D4.
> 대상 서비스: KPA-Society · K-Cosmetics · Neture · Pharmacy-Hub (GlycoPharm 은 공유 모듈 회귀 확인 대상).

## 1. D3 — 회원 재활성화 lifecycle 결함

**증상**: 공통 회원관리에서 `active → suspended` 는 정상, `suspended → active` 는 HTTP 200 이면서 상태 무변화.

**확정 원인** (`apps/api-server/src/controllers/operator/MembershipConsoleController.ts` `updateMemberStatus`):

1. 비활성화는 `approvalService.suspendMembership()` 위임 → `service_memberships.status='suspended'` + role_assignments 비활성화. **`users` 는 건드리지 않는다**(서비스 경계 계약).
2. 활성화(`approved`/`active`) 분기는 `SELECT id FROM service_memberships WHERE status IN ('pending','rejected')` 로만 대상을 찾는다. `suspended` 는 이 목록에 없다.
3. 대상이 0건이면 `UPDATE users SET status='active' ... WHERE status IN ('PENDING','pending','ACTIVE','active','inactive','deleted','rejected')` 로 떨어진다. 이 화이트리스트는 **의도적으로** `suspended` 를 제외한다(WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1 — 타 서비스가 정지시킨 계정 되살리기 금지).
4. 게다가 suspend 가 `users` 를 안 바꿨으므로 `users.status` 는 여전히 `active` 다. 결국 **membership 은 suspended 인 채로 아무 write 도 일어나지 않고 200** 이 반환된다.

정리하면 결함은 화이트리스트가 아니라 **활성화 분기에 membership 재활성화 축이 아예 없었던 것**이다.

**canonical lifecycle 확정**

| 축 | 값 | 의미 | 쓰는 주체 |
|---|---|---|---|
| `service_memberships.status` | `pending` / `active` / `rejected` / `suspended` / `withdrawn` | 서비스 단위 자격 | 서비스 운영자 |
| `users.status` | `active` / `pending` / `suspended` / `deleted` … | 플랫폼 단위 계정 | platform admin 전용 |
| `role_assignments.is_active` | boolean | 권한 | membership 전이에 종속 |

* `approved` = "내 서비스에서 이 회원을 활성 상태로 만든다" — 대상이 `pending`/`rejected` 면 승인, `suspended`/`withdrawn` 이면 재활성화.
* `suspended` 의 역동작은 이미 canonical 경로가 있다 — `MembershipApprovalService.reactivateMembership()` (membership + user + role_assignments 단일 transaction, `POST /operator/members/:userId/reactivate` 와 `PATCH /kpa/members/:id/status` 가 이미 사용).

**수정** — 활성화 분기에 그 canonical 경로를 연결한다 (단건 `updateMemberStatus` + `batchUpdateStatus` 동일):

```text
pending/rejected membership 있음   → approveMembership()      (기존)
없고 suspended/withdrawn 있음      → reactivateMembership()   (신규 연결)
둘 다 없음                          → users 화이트리스트 UPDATE (기존, 멱등)
```

경계 불변: `reactivateMembershipCore` 는 비-platform-admin 이면 `service_key = ANY(scope.serviceKeys)` 로만 되살리고 `users.status='suspended'`(플랫폼 조치)는 해제하지 않는다. 즉 D3 수정이 CROSS-SERVICE-ISOLATION 계약을 되돌리지 않는다.

## 2. D4 — Role serviceKey 계약 불일치

**확정 원인**: 축이 두 개인데 변환 지점이 없었다.

| 축 | 저장/보유 | 값 예시 |
|---|---|---|
| canonical service key | `service_memberships.service_key`, `ServiceScope.serviceKeys` | `kpa-society` · `k-cosmetics` |
| role prefix | `roles.service_key`(20260318100000-ExtendRolesTable seed), role 이름 접두 | `kpa` · `cosmetics` |

`RoleController.getRoles` 는 `req.query.service` 를 **두 축에 그대로** 흘려보냈다.

* UI `SERVICE_OPTIONS` = role prefix(`kpa`) → `scope.serviceKeys.includes('kpa')` 실패 → **403**
* canonical(`kpa-society`) 을 보내면 scope 는 통과하나 `getRolesByService('kpa-society')` → **0건**
* 무필터 경로는 `scope.serviceKeys`(canonical)로 카탈로그를 뒤진다 → KPA·K-Cosmetics 운영자에게 **자기 서비스 역할이 한 건도 안 나온다**. `@o4o/ui` UserDetailPage 역할 추가 모달의 "할당 가능한 역할이 없습니다" 가 같은 원인.
  (self-map 서비스 neture/glycopharm/pharmacy-hub 는 우연히 동작 — 그래서 지금까지 드러나지 않았다.)

**수정 계약**: **UI·API 는 canonical service key 하나만 쓴다. role prefix 변환은 backend 의 `roles` 테이블 경계 한 곳에서만 한다.**

* `packages/ui/.../RoleManagementPage.tsx` `SERVICE_OPTIONS` → canonical (`kpa-society` · `k-cosmetics` · `pharmacy-hub` 추가).
* `RoleController` 에 단일 변환 함수 `toRoleCatalogKey(canonical)` = `resolveRolePrefixFromCanonicalServiceKey` (`@o4o/security-core` SSOT). 로컬 매핑 상수 신설 없음, 문자열 치환 없음.
* 입력 정규화는 `resolveCanonicalServiceKey(service)` 로 한 번 — 레거시 prefix 쿼리(`?service=kpa`)도 canonical 로 접혀 403 이 나지 않는다(하위호환).
* `createRole` 도 같은 함수로 접어 저장 축(prefix)을 유지 — 스키마·데이터 변경 없음.

## 3. 변경 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/controllers/operator/MembershipConsoleController.ts` | D3 — 활성화 분기에 `reactivateMembership` 위임 추가 (단건 + batch) |
| `apps/api-server/src/controllers/operator/RoleController.ts` | D4 — `toRoleCatalogKey` 변환 지점 신설, get/create 적용 |
| `packages/ui/src/pages/operator/RoleManagementPage.tsx` | D4 — `SERVICE_OPTIONS` canonical 전환 |
| `apps/api-server/src/controllers/operator/__tests__/MembershipConsoleController.crossServiceIsolation.test.ts` | D3 회귀 테스트 추가 |

**API 신설 0 · route 변경 0 · DB schema/migration 0 · 데이터 backfill 0.**

## 4. 정적 검증

공유 worktree 는 **다른 세션의 미커밋 변경**(`packages/action-log-core/**` 7파일 worktree 삭제, `appstore.routes.ts` / `AppStoreService.ts` staged)이 있어
`@o4o/action-log-core` 해석이 깨진다. 해당 파일은 불가침이므로 손대지 않고, 격리 worktree
`/c/tmp/wo-verify-d3d4` (detached @ `origin/main` **a8acc2b05**) 에 본 WO 4파일만 얹어 검증했다.

| 항목 | 명령 | 결과 |
|---|---|---|
| api-server 회귀 테스트 | `jest MembershipConsoleController.crossServiceIsolation.test.ts` | **15/15 PASS** (신규 D3 위임 테스트 포함) |
| api-server typecheck | `pnpm --filter @o4o/api-server type-check` | **PASS** (0 error) |
| `@o4o/ui` typecheck | `pnpm --filter @o4o/ui type-check` | **PASS** (0 error) |
| KPA-Society typecheck / build | `tsc --noEmit` · `vite build` | **PASS** / **PASS** |
| K-Cosmetics typecheck / build | `tsc --noEmit` · `vite build` | **PASS** / **PASS** |
| Neture typecheck / build | `tsc --noEmit` · `vite build` | **PASS** / **PASS** |
| Pharmacy-Hub typecheck / build | `tsc -b --force` · `vite build` | **PASS** / **PASS** |
| GlycoPharm 공유모듈 회귀 | `tsc -b --force` · `vite build` | **PASS** / **PASS** |

검증 중 관측한 선행 결함 1건 — **본 WO 와 무관하며 현재 main 에서 이미 해소**되었다.
`6ce7c84bb` 시점 `web-pharmacy-hub` 는 `App.tsx` 의 `RoleEntryPage`(110) · `ROLES`(178) 미사용 import 로
`noUnusedLocals` TS6133 2건이 나 `tsc -b` 가 실패했다(도입 = `769f562d5`, 다른 세션 WO).
후속 커밋 `ee8ba929f` 가 두 import 를 제거해 `a8acc2b05` 기준 EXIT 0 이다. 배포 차단 요인 아니며
본 WO 는 `services/web-pharmacy-hub/**` 를 한 줄도 수정하지 않았다(범위 외 수정 금지). 해당 세션에 통보했다.

부수 관측: `packages/financial-core` 는 `src` 가 비어 `tsup` 이 "No input files" 로 실패한다 —
`origin/main` 선행 상태이며 본 WO 와 무관하다.

## 5. 서비스별 lifecycle E2E

## 6. 서비스별 role E2E

## 7. 결론
