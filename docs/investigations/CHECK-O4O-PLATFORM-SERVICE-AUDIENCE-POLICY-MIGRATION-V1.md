# CHECK-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1

> WO: WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1
> 작업일: 2026-06-16
> 상태: PASS (tsc/build. browser smoke 배포 후 보류)
> 선행: `IR-O4O-SERVICE-AUDIENCE-POLICY-OWNERSHIP-DECISION-V1` · platform section(`/admin/platform`) 시리즈

## 1. 작업 목적

서비스 대상 정책(cross-service drug-gate governance)의 **소유권·guard를 neture:admin → platform-admin 으로 정렬**한다. 정책값/gate 로직/DB/schema/API path 무변경 — **"누가 수정하는가"만 변경, "어떻게 작동하는가"는 불변.**

## 2. 소유권 결정 내용

- `service_audience_policies.isPharmacyTargetService` 는 `offer.service` / `partner-contract.service` 의 drug-service 연결 gate 기준값 → **여러 serviceKey 에 영향을 주는 cross-service governance** → platform-admin 소유.
- **pure neture:admin 의 수정권 회수 수용**(IR 결정). frontend = PlatformRoute, backend = platform role.

## 3. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/controllers/admin-service-audience.controller.ts` | guard `requireNetureScope('neture:admin')` → `requireRole(['platform:admin','platform:super_admin'])` (GET+PUT, `router.use`) |
| `services/web-neture/src/App.tsx` | `/admin/platform/service-audience` nested route 추가(PlatformRoute, ServiceAudiencePolicyPage 재사용) |
| `services/web-neture/src/pages/admin/platform/PlatformSectionLayout.tsx` | local nav 에 "서비스 대상 정책" 추가 |
| `services/web-neture/src/pages/admin/platform/PlatformAdminLandingPage.tsx` | crosslink 카드 → `/admin/platform/service-audience`, badge "이동 완료" |
| `services/web-neture/src/pages/admin/ServiceAudiencePolicyPage.tsx` | legacy route(`/admin/settings/...`) deprecated banner(route-aware) + platform 안내 문구 갱신 |
| `docs/investigations/CHECK-...-MIGRATION-V1.md` | 본 문서 |

→ gate 로직/정책값/DB/schema/공유 모듈/운영자 관리/역할 관리/GP·KCos·KPA **무변경**.

## 4. frontend 신규 route

- `/admin/platform/service-audience` (PlatformSectionLayout nested, PlatformRoute = platform:admin/super_admin). 기존 `ServiceAudiencePolicyPage` 재사용. platform 안내 문구 표시.
- local nav: 플랫폼 홈 / 계정 / 서비스 / 사용자 조회 / 역할 관리 / **서비스 대상 정책**.

## 5. 기존 route deprecated 처리

- `/admin/settings/service-audience` (AdminRoute 하위) **route/page 보존**(hard delete 안 함).
- 같은 `ServiceAudiencePolicyPage` 가 `useLocation` 으로 legacy 경로 감지 → **상단 amber deprecated banner + "플랫폼으로 이동"(`/admin/platform/service-audience`)** 표시.

## 6. backend guard 변경 전/후

| | 전 | 후 |
|---|---|---|
| import | `requireNetureScope` | `requireRole` (auth.middleware) |
| guard | `router.use(requireNetureScope('neture:admin'))` | `router.use(requireRole(['platform:admin','platform:super_admin']))` |
| 적용 | GET / + PUT /:serviceKey | 동일(둘 다 platform) |

- 조회(GET)도 cross-service governance 설정이므로 platform 기준 정렬(frontend 도 PlatformRoute).
- 영향: pure neture:admin → legacy 페이지 GET 403(deprecated banner 로 안내) + platform route 진입 불가(수정권 회수, 의도). platform:super_admin → 양 route GET 200.

## 7. API path 유지 사유

- API path `/api/v1/neture/admin/service-audience-policies` **유지**(rename 안 함). frontend client(`serviceAudiencePolicyApi`) 재사용. guard/소유권만 platform 전환.
- → **path 는 아직 neture/admin prefix 이나 소유권·guard 는 platform-admin.** path 정리는 별도 후속(`WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-API-PATH-ALIGN-V1`).

## 8. 정책값 / DB / gate 로직 무변경 확인

- `service_audience_policies` 값/row/seed **미변경**, migration **없음**, entity/schema **미변경**.
- `service-audience.service.ts`(resolver) · `offer.service.ts` · `partner-contract.service.ts` (drug gate 사용처) **미변경** — 동작 불변.
- 본 WO = guard(누가 수정) 만. gate(어떻게 작동) 불변.

## 9. typecheck / build 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| api-server | `tsc -p tsconfig.build.json` | 변경 controller 신규 에러 **0** (잔여 1건 = 기존 baseline `market-trial/marketTrialController.ts:105`, 본 WO 무관) |
| web-neture | `tsc --noEmit` | PASS (EXIT 0) |
| web-neture | `vite build` | PASS (✓ built) |

## 10. browser smoke 결과 / 보류 사유

- **배포 후 보류** — 미배포. **운영 데이터 보호: PUT(저장) 미실행, 조회/route 렌더 중심.**
- 배포 후 체크리스트(`SMOKE-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-POST-DEPLOY-V1`):
  1. `/admin/platform/service-audience` 렌더 + GET 200(platform:super_admin) + 정책 목록 표시
  2. platform section nav 에 "서비스 대상 정책" 표시
  3. landing 카드 → `/admin/platform/service-audience` 이동, badge "이동 완료"
  4. legacy `/admin/settings/service-audience` 진입 → deprecated banner + "플랫폼으로 이동"
  5. roles/accounts/services/users 무회귀, `/admin/operators` 무회귀
  6. 정책값 변경 없음(저장 미실행), console/4xx-5xx 없음

## 11. 후속 작업 목록

| WO/IR | 범위 |
|---|---|
| `WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-API-PATH-ALIGN-V1` | API path neture/admin → platform prefix 정리(guard 안정화 후) |
| `WO-O4O-PLATFORM-SERVICE-AUDIENCE-LEGACY-ROUTE-CLEANUP-V1` | `/admin/settings/service-audience` 제거(운영 smoke + 사용중단 확인 후) |
| `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1` | 운영자 관리 등 남은 frontend/backend guard 불일치 점검 |

## 12. commit hash

- (commit 후 기재)
