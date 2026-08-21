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

## 5. 서비스별 lifecycle E2E (production)

검증 계정 = E2E fixture `o4o-e2e-auth-main@neture.co.kr` (`44fa7733-…f757`). **실사용자 데이터 미접촉.**

| 서비스 | 경로 | 비활성화 | 재활성화 | 새로고침 후 | 원복 |
|---|---|---|---|---|---|
| KPA-Society | `/operator/members` drawer (`PATCH /kpa/members/:id/status`) | PASS (`renagang21`) | **PASS** | 활성 유지 · `kpa:store_owner` 복원 | 완료 |
| K-Cosmetics | `/admin/members` drawer (`PATCH /operator/members/:userId/status`) | PASS (활성4/정지1) | **PASS** (활성5/정지0) | 5개 membership 전부 `active` | 완료 |
| Neture | 공통 `PATCH /operator/members/:userId/status` (Neture 운영자 토큰) | PASS (5개 → `suspended`) | **PASS** (5개 → `active`) | 상세 재조회 유지 | 완료 |
| Pharmacy-Hub | `/operator/members` drawer (공통 endpoint) | PASS (활성8→7) | **PASS** (활성7→8) | 새로고침 후 활성8 유지 | 완료 |

수정 전이라면 재활성화는 4서비스 모두 **200 + 무변화** 였다. 현재는 실제 상태 전이가 관측된다.

`users.status` 는 4서비스 전 구간에서 `suspended`(2026-08-14 선행 값) 그대로다 —
서비스 운영자 조치가 플랫폼 축을 건드리지 않는다는 경계가 유지됨을 뜻한다.

**관측 (수정 대상 아님)**: `suspend`/`reactivate` 는 `service_key = ANY(scope.serviceKeys)` 로 동작하므로
다중 서비스 scope 운영자가 실행하면 자기 scope 안의 membership 전체에 적용된다.
이는 `suspendMembershipCore` 의 선행 동작이며 본 WO 의 `reactivate` 는 그것을 대칭으로 되돌릴 뿐이다
(WO 금지 조항 "서비스 간 membership 상태 동시 변경" 을 새로 도입하지 않았다). 별도 WO 판단 대상.

## 6. 서비스별 role E2E (production)

**canonical serviceKey 필터 (D4)**

| 필터 값 | KPA 운영자 | Neture 운영자 | Pharmacy-Hub |
|---|---|---|---|
| `kpa-society` | 200 / 8 | 200 / 8 | (lockedServiceKey) |
| `k-cosmetics` | 200 / 7 | 200 / 7 | — |
| `neture` | 200 / 5 | 200 / 5 | — |
| `glycopharm` | 200 / 7 | 200 / 7 | — |
| `pharmacy-hub` | 200 / 3 | 200 / 3 | **200 / 3** (`?service=pharmacy-hub`) |
| 무필터 | 200 / 33 (scope 6키 합집합, 수정 전 0) | 200 | — |
| `platform` · `lms` | 403 | 403 | — |

`platform`·`lms` 403 은 scope guard 정상 동작이며 결함이 아니다.
프로덕션 DOM 의 `<option value>` 는 `''|platform|neture|glycopharm|kpa-society|k-cosmetics|pharmacy-hub|lms` — canonical 전환이 배포에 반영됐다.
역할 추가 모달도 채워진다(KPA 31 / Neture 30). 수정 전 "할당 가능한 역할이 없습니다".

**역할 부여 → 회수 → 원복**

| 서비스 | 대상 역할 | 부여 | 회수 | 상태 |
|---|---|---|---|---|
| KPA-Society | `kpa:student` | `POST 200` (11→12) | PASS | 비활성 = 권한 없음 (원복) |
| K-Cosmetics | `cosmetics:partner` | `POST 200` (10→11) | PASS | 비활성 = 권한 없음 (원복) |
| Neture | `neture:partner` | `POST 200` (11→12) | PASS | 비활성 = 권한 없음 (원복) |
| Pharmacy-Hub | — | **미실행** | — | 아래 사유 |

* 회수는 공통 UI 계약상 hard delete 가 아니라 `is_active=false` 다. 기존 `kpa:store_owner` 비활성 행과 동일한 형태이므로
  **유효 권한 기준 원상복구**이며, row 자체는 남는다. 이를 숨기지 않고 기록한다.
* Pharmacy-Hub 는 `services/web-pharmacy-hub/src/App.tsx` 에 `members/:id` (UserDetailPage) route 가 없어
  **역할 부여/회수 UI 진입점이 존재하지 않는다.** 우회 API 호출로 "검증했다" 고 적지 않고 미실행으로 보고한다.
  role 카탈로그 read 는 위 표대로 PASS.

**기타 브라우저 검증**: desktop(1440) · mobile(390) 양쪽에서 Neture `/admin/roles` · Neture 회원 상세 deep link + 새로고침 ·
Pharmacy-Hub `/operator/roles` · `/operator/members` 로드 — 예상치 못한 4xx/5xx 0 · 가로 overflow 0 · white screen 0 · JS exception 0.
GlycoPharm 은 공유 `RoleManagementPage` + 공유 backend 를 통해 `glycopharm` 필터 200/7 로 확인했고, typecheck·build 회귀도 PASS(§4).

## 7. 결론

D3 · D4 **완료**. API 신설 0 · route 변경 0 · DB schema/migration/backfill 0.

**범위 밖에서 발견한 결함 (본 WO 에서 고치지 않음 — 별도 WO 제안)**

1. **KPA 회원 목록 id 축 혼용** — 목록이 `id = kpa_members.id ?? service_memberships.id` 를 반환한다.
   `kpa_members` 행이 없는 계정은 `PATCH /kpa/members/:id/status` 가 **404 Member not found**.
   (`o4o-e2e-auth-main@neture.co.kr` 재현. `kpa_members` 행이 있는 `renagang21` 은 정상 → 위 §5 는 후자로 수행.)
2. **KPA drawer "전체 상세 페이지 →" 404** — 링크가 `users.id` 가 아니라 위 목록 `id` 를 쓴다.
   `GET /operator/members/{kpa_members.id}` → 404. 1번과 같은 결함 계열.
3. **Neture 회원 drawer "비활성화" 의 계약 불일치** — 공통 `…/status` (suspend) 가 아니라
   `PATCH /operator/members/:membershipId/reject` 를 호출한다. 결과는 `suspended` 가 아닌 `rejected` 이고,
   같은 drawer 에 되돌리는 버튼이 없어 회원 상세의 "멤버십 승인" 으로만 복구된다(복구 확인 완료).
   라벨(비활성화)과 실제 축(거부)이 다르다.
4. **Pharmacy-Hub 회원 상세 route 부재** — §6 참조.

**선행 실패 (본 WO 무관, 은폐하지 않음)**

* CI Pipeline "Code Quality Check" — `TS2307: Cannot find module 'date-fns'`
  (`apps/admin-dashboard/src/pages/services/ServiceOverview.tsx` · `apps/main-site/src/components/forum/notifications/NotificationItem.tsx`).
  본 WO 검증 중 관측했고 `18797cfd9` · `2ee6c8113` 에서도 동일 실패했다.
  다른 세션이 `a066ef81a` (WO-O4O-CI-FRONTEND-TYPECHECK-BASELINE-RECOVERY-V1) 로 phantom import 를 제거해 해소했다.
* `packages/financial-core` — `src` 가 비어 `tsup` 이 "No input files" 로 실패 (§4).
