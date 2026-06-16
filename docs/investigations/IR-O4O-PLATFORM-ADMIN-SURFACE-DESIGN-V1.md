# IR-O4O-PLATFORM-ADMIN-SURFACE-DESIGN-V1

> **성격**: read-only 설계 조사 IR — 코드/route/앱/도메인/guard/DB 수정 0. 문서 1개만 생성.
> **목적**: O4O platform-admin 기능의 장기 surface 위치(A: Neture 내 정식 그룹 / B: `/admin/platform` 별도 section / C: 별도 앱·도메인)를 비교·결정하고 1차 구현 WO 범위 확정.
> **작성일**: 2026-06-16
> **조사 기준 commit**: `9e20599f1` (main, working tree clean — 외부 세션 WIP 미접촉)
> **선행**: `IR-O4O-NETURE-ADMIN-PLATFORM-SCOPE-SEPARATION-V1`(52804e82b, 상세 인벤토리) · `WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1`(d25378ce4, 1차 표면 분리) · `CHECK-O4O-ADMIN-SCOPE-STABILIZATION-CLOSURE-V1`(5f2f54ff9)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **platform-admin 후보는 "guard 2-tier" 로 갈린다 — 이 사실이 surface 결정의 핵심이다.**
> 권장: **Phased B** — 진정한 platform-scoped 기능은 `/admin/platform` 별도 section(platform guard)으로, 현재 neture-scoped 항목은 당분간 Neture admin 1차 라벨 분리 유지. **C(별도 앱)는 장기 후보로 보류.**
>
> 1. **Tier 1 (neture-scoped, frontend 존재, 1차 라벨됨)**: 운영자 관리(`/admin/operators`→`/neture/admin/operators`) · 역할 관리(`/admin/roles`) · 서비스 대상 정책(`/admin/settings/service-audience`→`/neture/admin/service-audience-policies`). guard = **neture:admin**(neture:admin 사용 가능).
> 2. **Tier 2 (platform-scoped, backend만 존재, frontend 없음)**: `/admin/platform-accounts` · `/admin/platform-services`(admin write) · global `/admin/users`. guard = **platform:admin / platform:super_admin** — **neture:admin 으로는 접근 불가(403)**.
> 3. **별도 admin/platform 앱 없음** — `services/` 에 platform-admin 앱 부재. `web-account`(account-web)는 최소 계정 대시보드(handoff+dashboard)로 platform-admin 아님(단, 모노레포가 추가 앱을 수용한다는 선례).
> 4. **공유 `OperatorGroupKey` = 고정 13-key enum**(packages/ui), 4 서비스 operator shell 소비. "플랫폼 관리" 정식 group key 추가 = **shared 모듈 변경 × 4 소비처**.
> 5. **결정적 함의**: Tier 2 를 neture:admin 사이드바(A)에 두면 **guard mismatch(neture:admin 클릭 시 403)**. Tier 2 는 platform guard 아래 **별도 section(B)** 또는 앱(C)이 자연스럽다. Tier 1 은 neture-guarded 라 A 유지 가능.

---

## 1. 현재 platform-admin 후보 기능 목록 + frontend 소비 여부

| 기능 | route(frontend) | backend | guard | frontend 소비 | tier |
|---|---|---|---|:--:|:--:|
| 운영자 관리(neture operators 지정) | `/admin/operators` | `/neture/admin/operators` | **neture:admin** | ✅ (Neture admin, 1차 라벨) | 1 |
| 역할 관리(RBAC) | `/admin/roles` | 공유 `@o4o/ui` RoleManagementPage | neture:admin(+platform bypass) | ✅ (Neture admin, 1차 라벨) | 1 |
| 서비스 대상 정책(cross-service) | `/admin/settings/service-audience` | `/neture/admin/service-audience-policies` | **neture:admin** | ✅ (Neture admin, 1차 라벨) | 1 |
| 플랫폼 계정 관리 | — | `/api/v1/admin/platform-accounts` | **platform:super_admin/admin** | ❌ **없음** | 2 |
| 플랫폼 서비스 관리(admin write) | — | `/api/v1/admin/platform-services` (PATCH) | **requireAdmin(platform)** | ❌ **없음** | 2 |
| global user/admin 관리 | (`/admin/users` route = Neture operator page 재사용) | `/api/v1/admin/users` | **platform:admin/super_admin** | ❌ (Neture `/admin/users`는 `/operator/members` neture endpoint 호출) | 2 |
| 플랫폼 서비스 **목록(read)** | KPA `MyServicesSection`/`RecommendedServicesSection` | `/api/v1/platform-services`(public) | public | ✅ (서비스 discovery, **admin 아님**) | — |

→ **Tier 1 = neture-scoped, 이미 Neture admin 에 존재. Tier 2 = platform-scoped, frontend 부재.**

## 2. platform backend API 현황 (상세는 선행 IR)

- `/api/v1/admin/platform-accounts` (`requireRole(['platform:super_admin','platform:admin'])`): 전 admin 계정 목록 / 비밀번호 재설정 / 활성·비활성 (super_admin 보호 로직 포함).
- `/api/v1/admin/platform-services` (`requireAuth`+`requireAdmin`): 서비스 카탈로그 목록 + 상태/진입 URL/승인정책 PATCH(서비스별). + public read `/api/v1/platform-services`.
- global `/api/v1/admin/users` (`requireRole(['platform:admin','platform:super_admin'])`): 전 사용자 CRUD + role_assignments.
- 공통: **platform-level role 요구**(neture:admin ≠ platform:admin). Neture scope guard `platformBypass=true` 라 platform:super_admin 은 Neture 도 접근하나, 역방향(neture:admin → platform API)은 불가.

## 3. Neture admin 내부에 남은 platform 후보

- Tier 1 3종(운영자/역할/서비스 대상 정책)이 1차 라벨 "(플랫폼)" + 배너로 표면 분리됨(`WO-...-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1`). **기능·route·guard 무변경**, neture:admin 접근 가능.
- Tier 2 는 Neture frontend 에 surface 없음.

## 4. 권한 guard 분석 (결정 요인)

| 항목 | guard | neture:admin 접근 | platform:super_admin 접근 |
|---|---|:--:|:--:|
| Tier 1 (operators/roles/service-audience) | neture:admin (`requireNetureScope`) | ✅ | ✅ (platformBypass) |
| Tier 2 (platform-accounts/services/users) | platform:admin / super_admin | ❌ **403** | ✅ |

→ **Tier 2 를 neture:admin 사이드바에 노출하면 neture:admin 사용자에게 403** — surface 를 guard tier 로 나눠야 한다.

## 5. 배포 / 도메인 영향

- Cloud Run: `neture-web` / `glycopharm-web` / `k-cosmetics-web` / `kpa-society-web` + `o4o-core-api`. **별도 admin/platform 도메인·서비스 없음.**
- Neture admin = `neture.co.kr/admin`(동일 SPA). `admin.neture.co.kr` 별도 frontend 부재.
- `web-account`(account-web) 앱 존재(빌드 가능, 최소 계정 대시보드) — 배포 목록 미기재. **모노레포가 추가 앱을 수용한다는 선례**(C 실현 가능성 근거)이나 현재 platform-admin 아님.

## 6. 공유 `OperatorGroupKey` 확장 필요 여부

- 고정 13-key enum(`packages/ui/operator-shell/types.ts`) + `STANDARD_GROUPS`(label/icon). 4 서비스(GP/KCos/KPA/Neture) operator shell 이 소비.
- "플랫폼 관리" **정식 group key** 추가 = packages/ui shared 변경 → 4 소비처 영향(optional/backward-compat 가능하나 contract 변경 + Shared Module Protocol 검증 ×4).
- **B(별도 section/layout)는 자체 route+layout 이라 OperatorGroupKey 확장 불필요** — shared 변경 회피.

## 7. 선택지 A/B/C 비교표

| 기준 | A (Neture 내 정식 그룹) | B (`/admin/platform` section) | C (별도 앱/도메인) |
|---|---|---|---|
| 구현 비용 | 낮음(라벨/그룹) | 중간(route+layout+guard) | 높음(앱+도메인+인증+쿠키) |
| 인증/배포 재사용 | ✅ Neture 그대로 | ✅ 동일 앱/도메인 | ❌ 신규 설정 |
| Tier 1(neture-scoped) 수용 | ✅ | ✅ | ✅ |
| **Tier 2(platform-scoped) 수용** | ❌ **guard mismatch(403)** | ✅ platform guard로 분리 | ✅ 가장 명확 |
| IA 명확성(service vs platform) | 낮음(같은 사이드바) | 중간~높음(route section) | 가장 높음 |
| 공유 OperatorGroupKey 변경 | 정식 그룹 시 필요(×4) | 불필요 | 불필요 |
| 장기 보안/감사/조직 분리 | 약함 | 중간 | 강함 |
| 지금 단계 적합성 | Tier1만 OK | **권장** | 과함(보류) |

## 8. 반드시 확인한 항목 (요약)

- 8.1 platform accounts UI: backend만, **frontend 부재**. 붙일 후보 = B의 `/admin/platform` 또는 C.
- 8.2 platform services UI: admin write backend만, frontend 부재(public read 는 KPA discovery 용). 붙일 후보 = B/C.
- 8.3 운영자 지정 흐름: `/admin/operators` 는 **neture operators 만** 지정(neture-scoped). 여러 서비스 operator 지정 기능은 없음 → 현재는 Neture service admin 으로도 정당(단 "운영자 지정=platform" 정책이면 B로 이동 후보).
- 8.4 역할 관리/RBAC: `/admin/roles` 공유 컴포넌트, neture:admin guard. cross-service RBAC 전면 관리는 platform `/admin/users` role_assignments(platform guard, frontend 부재) — Tier 2.
- 8.5 service-audience: cross-service 데이터, neture-guarded(Tier 1). B 이동 후보(또는 Neture 유지).
- 8.6 guard: §4 — Tier 1 neture:admin / Tier 2 platform:admin·super_admin. **surface 를 guard tier 로 분리 필요.**

## 9. 권장 surface 결정안 — **Phased B**

1. **인터럽 (완료됨)**: Tier 1(operators/roles/service-audience)은 현재 Neture admin 1차 라벨·배너 분리 유지(A-lite). neture-guarded 라 문제 없음. **추가 작업 불필요.**
2. **Phase 1 (권장 1차 구현)**: **`/admin/platform` 별도 section**(B) 도입 — platform:admin/super_admin guard. 여기에 **Tier 2 frontend(플랫폼 계정 / 플랫폼 서비스)**를 backend API 가 이미 있으므로 **필요 시** 연결. Neture service admin 사이드바와 IA·layout 분리.
3. **Tier 1 이동 여부**: 정책 결정 — "운영자 지정/RBAC/cross-service 정책"을 platform 소속으로 본다면 `/admin/platform` 으로 이동(단 neture operators 지정은 neture-scoped 라 기능적으로는 Neture 유지도 가능). 1차에는 **이동 강제하지 않음**(라벨 분리로 충분).
4. **공유 OperatorGroupKey 변경 회피**: B는 자체 route/layout → shared enum 미변경(4 서비스 무영향).
5. **C(별도 앱) 보류**: platform 기능이 커지거나(계정/서비스/감사/조직 분리 수요) 보안 격리가 필요해질 때 `IR-O4O-PLATFORM-ADMIN-APP-BOOTSTRAP-PLAN-V1` 로 승격. web-account 선례로 실현 가능하나 현재 과함.

> **A 단독은 비권장**: Tier 2(platform guard)를 neture:admin 사이드바에 넣으면 403 mismatch. A는 Tier 1 한정으로만 성립.
> **C 단독은 시기상조**: 비용 대비 현재 platform 기능 규모 작음.

## 10. 1차 구현 WO 제안

| WO(가칭) | 범위 | 선행 |
|---|---|---|
| **WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1** (option B) | Neture(또는 admin host) 에 `/admin/platform` route section + platform layout + **platform:admin/super_admin route guard**. 초기 화면은 placeholder/landing + (있으면) 기존 Tier 1 진입 정리. platform-accounts/services UI 연결은 **별도 단계**(필요 시) | 본 IR 결정(B) |
| WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1 (후속) | `/admin/platform` 에 platform-accounts(목록/비번재설정/활성) + platform-services(목록/상태) frontend 연결 | section 라우팅 |
| IR-O4O-PLATFORM-ADMIN-APP-BOOTSTRAP-PLAN-V1 (장기, C) | 별도 앱/도메인/인증/쿠키/migration 설계 | platform 기능 확대 시 |

## 11. 장기 분리 방향

- 단기: B section(platform guard) — service admin ↔ platform admin IA 분리, 신규 앱 없이.
- 중기: Tier 1 항목의 platform 소속 확정 + platform-accounts/services UI 연결.
- 장기(조건부): C 별도 앱(보안/감사/조직 분리 수요 발생 시). 공유 OperatorGroupKey "플랫폼 관리" 정식 그룹은 A를 선택할 때만 필요 — B/C에서는 불필요.

---

## 부록 — 산출/제약 + 핵심 파일

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (read-only IR) |
| 생성 문서 | `docs/investigations/IR-O4O-PLATFORM-ADMIN-SURFACE-DESIGN-V1.md` (유일) |
| 조사 기준 commit | `9e20599f1` |
| 권장 | **Phased B** (`/admin/platform` section, platform guard) |
| guard tier | Tier1 neture:admin / Tier2 platform:admin·super_admin |
| 별도 admin 앱 | 없음 (web-account = 계정 대시보드, platform-admin 아님) |
| 공유 enum 변경 | B/C 불필요, A(정식 그룹) 시 필요(×4) |
| Finance | 제외(별도 IR) |
| git status | working tree clean (외부 세션 WIP 미접촉) |
| commit hash | `01f7987a1` |

**핵심 참조 파일**:
`apps/api-server/src/routes/admin/{platform-accounts,users}.routes.ts` · `apps/api-server/src/routes/platform-services/admin-platform-services.routes.ts` ·
`packages/security-core/src/service-configs.ts`(NETURE platformBypass=true) ·
`packages/ui/src/operator-shell/{types.ts,constants.ts}`(OperatorGroupKey/STANDARD_GROUPS) ·
`services/web-neture/src/{config/operatorMenuGroups.ts,components/layouts/AdminLayoutWrapper.tsx,pages/admin/{OperatorsPage,ServiceAudiencePolicyPage}.tsx,pages/operator/RoleManagementPage.tsx}` ·
`services/web-kpa-society/src/api/platform-services.ts`(public read 선례) · `services/web-account/`(추가 앱 선례)
