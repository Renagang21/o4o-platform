# CHECK-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1

> **작업명:** WO-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1
> **유형:** 역할 관리 1차 이동(frontend) — `/admin/platform/roles` 추가 + 기존 `/admin/roles` 보존+deprecated 안내. backend/DB **변경 0**.
> **결과: PASS — `/admin/platform/roles`(PlatformRoute, 공통 RoleManagementPage 재사용) 추가, section nav + landing 카드 연결, 기존 `/admin/roles` 기능 보존+이동 배너. backend roles API/guard 무변경. web-neture typecheck 0.**
> 선행: IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1 (역할 관리=B 종착) · WO-...-TIER1-CROSSLINK-CARDS-V1 — 2026-06-17

---

## 1. 수정/추가 파일 (5 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/admin/platform/PlatformRolesPage.tsx` | **신규** — 공통 `@o4o/ui` RoleManagementPage 재사용 + platform 성격 안내(isAdmin=platform role) |
| `services/web-neture/src/App.tsx` | lazy import + `<Route path="roles">`(PlatformRoute 하위) |
| `services/web-neture/src/pages/admin/platform/PlatformSectionLayout.tsx` | local nav '역할 관리' 추가 |
| `services/web-neture/src/pages/admin/platform/PlatformAdminLandingPage.tsx` | Tier 1 역할 관리 카드 → `/admin/platform/roles`, 배지 '이동 완료' |
| `services/web-neture/src/pages/operator/RoleManagementPage.tsx` | 기존 `/admin/roles` 상단 deprecated 이동 배너(기능 보존) |
| `docs/investigations/CHECK-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1.md` | 본 CHECK |

> **backend roles API/guard/schema/seed/DB 변경 0.** operators·service-audience route 미접촉. Neture admin sidebar 미변경.

## 2. 이동 구조

- **신규** `/admin/platform/roles` (PlatformRoute 하위 — guard `platform:admin`/`platform:super_admin`). 화면 = 공통 `RoleManagementPage`(`apiClient/isAdmin/toast`) 재사용 + platform 안내 배너. backend CUD 는 기존대로 `isPlatformAdmin` 전용(무변경) → guard 정합(frontend platform guard ↔ backend platform CUD).
- **기존** `/admin/roles` (AdminRoute, `pages/operator/RoleManagementPage` wrapper) **유지** — 기능 그대로, 상단에 **deprecated 이동 배너**(amber) + "플랫폼 역할 관리로 이동" 버튼(`/admin/platform/roles`). **hard delete 0**.
- landing Tier 1 카드: 역할 관리 → `/admin/platform/roles`, 배지 '이동 완료'. section nav '역할 관리' 추가.

## 3. 정책 준수 (§4)

- **platform guard 하위 배치** — `/admin/platform/roles` 는 PlatformRoute(상위 PlatformSectionLayout). neture:admin only 비허용(정적).
- **기존 /admin/roles 즉시 삭제 안 함** — 보존 + 안내 배너(회귀/북마크 방지). redirect 대신 1차 권장(보존+banner) 채택 — `/admin/roles`(AdminRoute, neture:admin 포함)을 redirect 하면 pure neture:admin 동선이 끊길 수 있어 보존이 안전.
- **backend 무변경** — roles API guard/CUD(isPlatformAdmin)/schema/seed 그대로.
- **운영자 관리·서비스 대상 정책 미이동** — 이번 WO 대상은 역할 관리뿐.

## 4. guard 정합

| route | guard | backend CUD |
|------|------|------|
| `/admin/platform/roles` (신규) | PlatformRoute(platform:admin/super_admin) | isPlatformAdmin → **정합** |
| `/admin/roles` (기존) | AdminRoute(neture:admin+platform:super_admin) | isPlatformAdmin(neture:admin 변경 불가, 기존 동작 유지) |

→ platform 이동본은 frontend·backend 모두 platform 기준으로 **정합**. 기존 route 의 frontend 과대허용(neture:admin)은 본 WO 에서 손대지 않음(보존) — guard 불일치 전수 정리는 `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1`.

## 5. 검증

- **web-neture typecheck PASS** (clean run EXIT 0).
- 정적: route(PlatformRoute 하위) 추가, 공통 컴포넌트 재사용, nav/landing 연결, 기존 route 기능 보존+배너. backend/DB import·변경 0.
- **browser smoke 미수행** — 배포 후 권장: `/admin/platform/roles` 진입·역할 화면 렌더, nav '역할 관리' 표시, landing 카드 이동, `/admin/roles` deprecated 배너+이동 버튼, accounts/services/users 무회귀. (role CUD 미실행 — 조회/이동만.)
- **negative guard 미검증** — pure neture:admin-only 계정 부재(통합 계정만). 정적: PlatformRoute 에 neture:admin 미포함.

## 6. 불변 확인 (§7)

- backend roles API/guard/schema/seed/permission matrix **변경 0**. DB migration 0.
- `/admin/roles` hard delete 0(기능 보존). 운영자 관리/서비스 대상 정책 route **미이동**. service-audience guard 미변경. Neture admin sidebar 대규모 정리 0. GP/KCos/KPA 미접촉.

## 7. 완료 판정

**PASS.** `/admin/platform/roles`(platform guard, 공통 RoleManagementPage) 추가 + nav/landing 연결, 기존 `/admin/roles` 기능 보존+이동 안내, backend 무변경, guard 정합(platform), typecheck 통과. 역할 관리 1차 이동 완료(기존 동선 비파괴).

## 8. 후속

1. `SMOKE-O4O-PLATFORM-ROLES-MENU-MIGRATION-POST-DEPLOY-V1` — 배포 후 /admin/platform/roles 렌더·기존 route 배너·무회귀(role CUD 미실행).
2. `IR-O4O-SERVICE-AUDIENCE-POLICY-OWNERSHIP-DECISION-V1` — 서비스 대상 정책 운영 책임/guard 결정(이동 선행).
3. `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1` — operators/audience/roles frontend↔backend guard 불일치 전수(기존 /admin/roles 과대허용 포함).
4. (후속) 기존 `/admin/roles` 안정화 후 redirect/제거 검토.

---

*Date: 2026-06-17 · platform 역할 관리 1차 이동 · PASS · /admin/platform/roles(PlatformRoute, 공통 RoleManagementPage 재사용) + nav/landing 연결, 기존 /admin/roles 보존+deprecated 배너 · backend roles API/guard/DB 무변경, guard 정합(platform) · operators·audience 미이동 · web-neture typecheck 0 · 후속 post-deploy smoke/audience ownership/guard reconcile.*
