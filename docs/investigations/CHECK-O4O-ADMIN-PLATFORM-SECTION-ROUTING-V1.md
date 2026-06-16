# CHECK-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1

> WO: WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1 (Phased B — 1차 routing 뼈대)
> 작업일: 2026-06-16
> 상태: PASS (정적 검증 — tsc/build. browser smoke 배포 후 보류)
> 선행: `IR-O4O-PLATFORM-ADMIN-SURFACE-DESIGN-V1` (01f7987a1)

## 1. 작업 목적

Neture 서비스 admin(`/admin`)과 분리된 platform-admin section `/admin/platform` 의 route/layout/guard 뼈대를 도입한다. Tier 2(platform-scoped) 기능을 받을 표면을 만들되, **neture:admin 과 platform:admin/super_admin 권한을 섞지 않는다.** 별도 앱/도메인·backend 변경 없음.

## 2. 변경 파일 목록 (Neture only)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/role-constants.ts` | `PLATFORM_ROLES = ['platform:admin','platform:super_admin']` 추가 (neture:admin 과 구분) |
| `services/web-neture/src/components/auth/RoleGuard.tsx` | `PlatformRoute` guard 추가 + PLATFORM_ROLES import/re-export |
| `services/web-neture/src/pages/admin/platform/PlatformAdminLandingPage.tsx` | 신규 — platform section landing(안내) |
| `services/web-neture/src/App.tsx` | lazy import + `/admin/platform` sibling route(PlatformRoute guard) |
| `docs/investigations/CHECK-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1.md` | 본 문서 |

→ backend/API/DB/공유 모듈/OperatorGroupKey/Tier1 route/GP·KCos·KPA **무변경**.

## 3. `/admin/platform` route 구조

- App.tsx: Neture admin 블록(`<Route element={<AdminRoute><AdminLayoutWrapper/></AdminRoute>}>` 하위 `/admin/*`) **밖**에 **sibling** 로 추가:
  ```
  <Route path="/admin/platform" element={<PlatformRoute><PlatformAdminLandingPage /></PlatformRoute>} />
  ```
- 즉 `/admin/platform` 은 Neture 서비스 admin sidebar(AdminLayoutWrapper)·neture:admin guard 와 **분리**. 자체 PlatformRoute guard + self-contained landing.
- 기존 `/admin/*` 자식 라우트(neture:admin)와 path 충돌 없음(specific exact path).

## 4. 적용한 guard

- `PlatformRoute` = `RouteGuard(allowedRoles=PLATFORM_ROLES)`, **requireMembership 없음**(cross-service surface — 'neture' 멤버십 무관).
- 동작:
  - `neture:admin` 단독 → PLATFORM_ROLES 미포함 → `RouteGuard` 가 `Navigate('/')` (차단). ✅
  - `platform:admin` → 통과(멤버십 게이트 없음 — neture 멤버 아니어도 접근). ✅
  - `platform:super_admin` → 통과. ✅
- 기존 `AdminRoute`(neture:admin) 는 무변경 — `/admin/*` Tier 1 그대로.

## 5. platform landing page 구성

- 헤더 "O4O 플랫폼 관리" + platform admin 배지 + cross-service 안내 배너(platform 권한 전용 명시).
- Tier 2 카드 3종 ("연결 예정" 배지 + backend API 경로 표기):
  - 플랫폼 계정 관리 (`/api/v1/admin/platform-accounts`)
  - 플랫폼 서비스 관리 (`/api/v1/admin/platform-services`)
  - Global 사용자 관리 (`/api/v1/admin/users`)
- Tier 1 안내 섹션(운영자 관리/역할 관리/서비스 대상 정책은 Neture admin 유지 — 이동 안 함, 후속 결정 안내).
- `/admin` 으로 돌아가기 링크.
- **실제 list/관리 UI 미구현**(후속 WO).

## 6. sidebar 진입점 추가 여부와 판단 근거

- **추가하지 않음(route-only).** 근거: Neture admin sidebar 는 정적 `getAdminMenu()`(neture:admin 전체 노출)라, platform 링크를 무조건 추가하면 neture:admin 단독 사용자에게도 노출되어 클릭 시 차단(UX 함정). role 기반 조건 노출은 AdminLayoutWrapper 런타임 role 판단이 필요 → WO §6.5 의 "복잡하면 route 만 추가" 채택.
- 현재 `/admin/platform` 은 직접 URL 로 접근. 역할 기반 진입점은 후속(§9)에서 platform section 본 UI 와 함께 정리.

## 7. Tier 1 미이동 근거

- 운영자 관리/역할 관리/서비스 대상 정책 = **neture:admin guard, 이미 Neture admin 에서 정상 동작 + "(플랫폼)" 라벨/배너**.
- 지금 `/admin/platform` 으로 옮기면 route/guard/IA 변경 범위가 커지고, 정상 동작 화면을 흔든다. → WO §4.2 대로 **이동하지 않음**. 소속 최종 결정은 `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1`.

## 8. Tier 2 후속 UI 범위

- `WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1`: `/admin/platform/accounts`·`/admin/platform/services` 화면 + backend platform API 연결(목록/상세/상태). global users 노출 범위는 정책 결정 후.

## 9. typecheck / build 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| web-neture | `tsc --noEmit` | PASS (EXIT 0) |
| web-neture | `vite build` | PASS (✓ built) |

(backend·공유 모듈·타 서비스 미변경 → 재검증 불필요.)

## 10. browser smoke 결과 / 보류 사유

- **보류(배포 후)**: 본 변경은 미배포 — 운영 환경 smoke 는 배포 후 수행.
- **권한 경계(neture:admin 차단) 검증 제약**: 사용 가능 계정(sohae2100)은 neture:admin + platform:super_admin **동시 보유** → `/admin/platform` 접근 가능(차단 미발생). **pure neture:admin-only 계정 부재로 "차단" 검증 불가** — CHECK 명시(미검증 항목).
- 배포 후 체크리스트:
  1. platform 권한 계정 → `/admin/platform` 접근 → "O4O 플랫폼 관리" landing + 3 카드(연결 예정) 표시
  2. `/admin`(Neture 서비스 admin) 기존 동작 정상(분리 확인)
  3. Tier 1(`/admin/operators`·`/admin/roles`·`/admin/settings/service-audience`) 기존 위치·동작 유지
  4. (pure neture:admin 계정 확보 시) `/admin/platform` 접근 시 `/` 리다이렉트(차단) 확인
  5. console/pageerror/4xx-5xx 없음

## 11. 후속 WO 목록

| WO | 범위 |
|---|---|
| `WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1` | platform-accounts/services frontend 연결 |
| `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` | Tier 1(운영자/역할/service-audience) 이동 여부 결정 + (이동 시) 역할 기반 진입점 |
| `IR-O4O-PLATFORM-ADMIN-APP-BOOTSTRAP-PLAN-V1` (장기 C) | 별도 앱/도메인 설계 |

## 12. commit hash

- (commit 후 기재)
