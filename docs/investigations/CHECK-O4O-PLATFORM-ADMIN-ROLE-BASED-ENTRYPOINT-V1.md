# CHECK-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1

> WO: WO-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1
> 작업일: 2026-06-16
> 상태: PASS (tsc/build. browser smoke 배포 후 보류)
> 선행: `WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1`(a4e93fc1e) · `SMOKE-...-POST-DEPLOY-V1`(938203c03, PARTIAL PASS)

## 1. 작업 목적

`/admin/platform`(현재 route-only)에 **platform 권한자 전용 진입점**을 추가한다. platform:admin/super_admin 에게만 노출, neture:admin 단독에는 미노출. 기능/route/backend/Tier 1 무변경 — 진입점 추가만.

## 2. 변경 파일 목록 (Neture only)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/role-constants.ts` | `hasPlatformAdminRole(roles)` helper 추가 (PLATFORM_ROLES 재사용) |
| `services/web-neture/src/pages/admin/AdminDashboardPage.tsx` | platform 권한자 전용 `PlatformEntryCard`(→ `/admin/platform`) 조건부 렌더 |
| `docs/investigations/CHECK-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1.md` | 본 문서 |

→ backend/API/DB/공유 모듈/route/sidebar config/Tier1/platform UI/GP·KCos·KPA **무변경**.

## 3. platform role 판정 방식

- `hasPlatformAdminRole(roles)` = `roles.some(r => PLATFORM_ROLES.includes(r))`, `PLATFORM_ROLES = ['platform:admin','platform:super_admin']`.
- **neture:admin 단독 → false** (platform role 아님). 빈/null → false.
- `useAuth().user?.roles` 로 현재 사용자 역할 조회(기존 auth context 재사용, 신규 API 없음).

## 4. 진입점 추가 위치 (WO §6.3 권장안 채택)

- **Neture admin 대시보드(`/admin` = AdminDashboardPage) 상단 card** — 컴포넌트 내부 role 판단으로 조건부 렌더.
- 정적 sidebar(`getAdminMenu`)에 추가하지 않음 → neture:admin 단독 오노출 차단(WO §4.2).
- 카드: "O4O 플랫폼 관리" + 설명 + "플랫폼 관리로 이동 →"(`/admin/platform`).
- **success + error 두 branch 모두**에 렌더(대시보드 데이터 실패 시에도 platform 진입점 노출 보장).

## 5. neture:admin 오노출 방지 방식

- 카드는 `{showPlatform && <PlatformEntryCard />}` — `showPlatform = hasPlatformAdminRole(user?.roles)`.
- neture:admin 단독 사용자: `hasPlatformAdminRole(['neture:admin']) === false` → **카드 미렌더**(정적 보장).
- sidebar 미추가 → 다른 노출 경로 없음.

## 6. PLATFORM_ROLES 재사용 / route 유지 확인

- `PLATFORM_ROLES` 상수 재사용(신규 role 정책 없음).
- `/admin/platform`·`/admin/platform/accounts`·`/admin/platform/services` route 및 `PlatformRoute` guard **무변경**(진입점만 추가).
- Tier 1(운영자/역할/서비스 대상 정책) Neture admin 위치·라벨·배너 **무변경**.

## 7. 알려진 제약 (진입점 도달 범위)

- `/admin`(AdminDashboardPage)의 상위 guard `AdminRoute` = `ADMIN_ROLES`(**neture:admin / platform:super_admin**) + neture membership. 즉 `platform:admin`(super 아님, neture 멤버 아님)은 `/admin` 자체에 도달 못함 → **카드 진입점은 platform:super_admin(및 neture:admin 보유 platform 계정)에게 도달.**
- 순수 `platform:admin` 은 `/admin/platform` 을 **직접 URL** 로만 접근(PlatformRoute 는 platform:admin 허용). 모든 platform 역할에 보편적 진입점(예: global header)을 주려면 후속 `WO-O4O-PLATFORM-ADMIN-GLOBAL-ENTRYPOINT-V1`(선택). 본 WO 는 §6.3 권장(대시보드 카드) 범위.

## 8. Neture admin 무회귀

- `/admin` 기존 4-Block 대시보드 + 헤더 유지(카드만 추가). operators/roles/service-audience/platform/* 전부 무변경.

## 9. typecheck / build 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| web-neture | `tsc --noEmit` | PASS (EXIT 0) |
| web-neture | `vite build` | PASS (✓ built) |

## 10. browser smoke 결과 / 보류 사유

- **배포 후 보류** — 본 frontend 미배포.
- **pure neture:admin-only 미노출 검증 제약**: 사용 계정(sohae2100)이 platform:super_admin 보유 → 카드 노출됨(미노출 케이스 직접 검증 불가). 코드 정적: `hasPlatformAdminRole(['neture:admin']) === false` → 미렌더 보장.
- 배포 후 체크리스트(`SMOKE-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-POST-DEPLOY-V1`):
  1. platform:super_admin 계정 → `/admin` 진입 → "O4O 플랫폼 관리" 카드 표시
  2. 카드 클릭 → `/admin/platform` 이동 → accounts/services 정상
  3. Neture admin 4-Block + Tier 1 무회귀
  4. (pure neture:admin-only 계정 확보 시) `/admin` 에 카드 **미표시** 확인
  5. console/4xx-5xx 없음

## 11. pure neture:admin-only 검증 여부

- 미검증(계정 부재) — 코드 정적 보장 기록(§5). 후속 smoke 에서 계정 확보 시 1회 확인.

## 12. 후속 WO 목록

| WO | 범위 |
|---|---|
| `SMOKE-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-POST-DEPLOY-V1` | 배포 후 진입점 노출/이동 + 미노출 검증 |
| `IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1` | global users UI 범위 |
| `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` | Tier 1 이동 결정 |
| `WO-O4O-PLATFORM-ADMIN-GLOBAL-ENTRYPOINT-V1` (선택) | 순수 platform:admin 보편 진입점 |

## 13. commit hash

- (commit 후 기재)
