# CHECK-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1

> WO: WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1
> 작업일: 2026-06-16
> 상태: PASS (tsc/build + **live backend API 검증**. UI browser smoke 는 배포 후 보류)
> 선행: `WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1`(11d14a050) · `SMOKE-...-POST-DEPLOY-V1`(2ff3a3614, PARTIAL PASS)

## 1. 작업 목적

`/admin/platform` 아래 Tier 2 platform-admin UI 를 1차 연결한다 — **계정 관리(`/admin/platform/accounts`) + 서비스 관리(`/admin/platform/services`)**. 기존 backend platform API 재사용(신규 API/DB 없음). global users 는 보류. platform guard 유지, Tier 1 미이동.

## 2. 변경 파일 목록 (Neture only)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/api/platform.ts` | 신규 — platform API client(getAccounts/resetPassword/setAccountStatus/getServices) + 타입 |
| `services/web-neture/src/pages/admin/platform/PlatformSectionLayout.tsx` | 신규 — section local nav(플랫폼 홈/계정/서비스) + Outlet |
| `services/web-neture/src/pages/admin/platform/PlatformAccountsPage.tsx` | 신규 — 계정 목록 + 비밀번호 재설정(modal) + 활성 토글(confirm) |
| `services/web-neture/src/pages/admin/platform/PlatformServicesPage.tsx` | 신규 — 서비스 목록 read-only |
| `services/web-neture/src/pages/admin/platform/PlatformAdminLandingPage.tsx` | 수정 — Tier 2 카드 → 실제 route 링크(global users 는 "연결 예정"), 레이아웃 컨테이너 위임 |
| `services/web-neture/src/App.tsx` | nested route(PlatformSectionLayout + index/accounts/services) + lazy import |
| `docs/investigations/CHECK-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1.md` | 본 문서 |

→ backend/API/DB/공유 모듈/Tier1 route/sidebar/GP·KCos·KPA **무변경**.

## 3. 연결한 backend API (재사용 — live 검증)

| API | guard | 용도 | live 검증 |
|---|---|---|---|
| `GET /api/v1/admin/platform-accounts` | platform:admin/super_admin | 계정 목록 | **200, 2건** |
| `PATCH /api/v1/admin/platform-accounts/:id/password` `{newPassword}` | 동일 | 비밀번호 재설정 | (modal 연결, 미실행) |
| `PATCH /api/v1/admin/platform-accounts/:id/status` `{isActive}` | 동일 | 활성 토글 | (confirm 연결, 미실행) |
| `GET /api/v1/admin/platform-services` | requireAdmin(platform) | 서비스 목록 | **200, 8건** |

- live 검증(platform:super_admin 토큰, 운영 backend): 양 GET 모두 200·success. mount path·authz 정상.

## 4. platform accounts response shape

`{ id, email, name, roles[], isActive, status, createdAt, lastLoginAt }` — adapter `PlatformAccount` 와 **정확히 일치**(live 응답 필드 확인).

## 5. platform services response shape

`{ id, code, name, shortDescription, entryUrl, serviceType, approvalRequired, visibilityPolicy, isFeatured, featuredOrder, status, iconEmoji, createdAt, updatedAt }` — adapter `PlatformService` 가 사용 필드 전부 포함(visibilityPolicy/createdAt/updatedAt 등 미사용 필드는 무시, 무해).

## 6. /admin/platform/accounts 구현 범위

- 목록 테이블: 이름/이메일 · 역할(badge) · 상태(활성/비활성) · 최근 로그인.
- **비밀번호 재설정**: modal(새 비번 8자 이상) → `PATCH /:id/password`. (위험 동작 — modal 필수)
- **활성/비활성 토글**: `window.confirm` → `PATCH /:id/status`.
- 서버측 보호(SELF_LOCK / LAST_SUPER_ADMIN / SUPER_ADMIN_ONLY) 403 메시지를 toast 로 **그대로 표시**(우회 없음).
- loading / empty / error(권한 오류 포함) 상태 구현.

## 7. /admin/platform/services 구현 범위

- **read-only** 목록 카드: 아이콘 · 서비스명 · code · 상태(활성/숨김) · 대표 여부 · 유형 · 승인필요 · entryUrl.
- 상태 변경(PATCH /:code)은 **연결하지 않음**(WO §6.3 — 후속 분리).
- loading / empty / error 상태 구현.

## 8. read-only / action 연결 여부

- accounts: read + 비밀번호 재설정 + 활성 토글(action 연결).
- services: **read-only**(action 미연결).

## 9. landing card 연결 결과

- 플랫폼 계정 관리 → `/admin/platform/accounts` (Link).
- 플랫폼 서비스 관리 → `/admin/platform/services` (Link).
- Global 사용자 관리 → **"연결 예정"** 유지(링크 없음).

## 10. Global users 보류 근거

- global `/admin/users` 는 전체 사용자/개인정보·회원 데이터 관리와 연결될 수 있어 범위·위험이 큼 → WO §3/§7 대로 미구현. 후속 `IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1`.

## 11. Tier 1 미이동 / platform guard 유지 확인

- 운영자 관리/역할 관리/서비스 대상 정책 = Neture admin 그대로(이동·변경 없음). landing 안내만.
- `/admin/platform/*` 전부 상위 `PlatformRoute`(platform:admin/super_admin) 하위 — neture:admin 단독 차단(membership 불요). nested 구조라 단일 guard 적용.
- sidebar 진입점 미추가(route-only 유지).

## 12. typecheck / build 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| web-neture | `tsc --noEmit` | PASS (EXIT 0) |
| web-neture | `vite build` | PASS (✓ built) |

(backend·공유 모듈·타 서비스 미변경.)

## 13. browser smoke 결과 / 보류 사유

- **API 레벨: PASS** — live 운영 backend 에서 platform-accounts(200/2건)·platform-services(200/8건) shape·authz 검증(platform:super_admin 토큰).
- **UI 레벨: 배포 후 보류** — 본 frontend 미배포. 배포 후 체크리스트:
  1. platform 권한 계정 → `/admin/platform` 진입 → 카드 클릭 → `/admin/platform/accounts`·`/services` 이동
  2. accounts: 목록(2건) 표시, 비밀번호 재설정 modal 열림, 활성 토글 confirm
  3. services: 목록(8건) read-only 표시
  4. 서버측 보호(본인/마지막 super_admin 비활성) 시 403 메시지 표시
  5. Neture `/admin` 무회귀, Tier 1 유지
  6. (pure neture:admin 계정 확보 시) `/admin/platform/*` 차단 확인
  7. console/4xx-5xx 없음

## 14. 후속 WO 목록

| WO | 범위 |
|---|---|
| `IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1` | global users UI 범위 + 회원 데이터 관리 분리 조사 |
| `WO-O4O-PLATFORM-SERVICES-STATUS-MUTATION-UI-V1` (선택) | services 상태 변경(PATCH /:code) 연결 |
| `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` | Tier 1 이동 여부 |
| `WO-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1` | platform 권한자 한정 진입점 노출 |

## 15. commit hash

- (commit 후 기재)
