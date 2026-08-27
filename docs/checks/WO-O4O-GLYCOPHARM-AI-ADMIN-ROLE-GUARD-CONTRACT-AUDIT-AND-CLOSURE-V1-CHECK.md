# WO-O4O-GLYCOPHARM-AI-ADMIN-ROLE-GUARD-CONTRACT-AUDIT-AND-CLOSURE-V1

GlycoPharm 의 AI 운영 화면과 `/api/ai/admin/*` guard 사이의 권한 계약 전수 확인 및 정합.

- 기준 커밋: `origin/main` `449568b0c`
- 작업 브랜치: `work/glycopharm-ai-admin-role-guard-v1`
- 조사 경로: 메뉴 → frontend route → page → API client → endpoint → guard → **실제 데이터 의미**

---

## 1. 모집단 — 현재 코드에서 재산출

과거 "2화면" 숫자를 그대로 쓰지 않고 다시 산출했다. GlycoPharm 소스 전체에서 AI admin API 참조는 2건이다.

    services/web-glycopharm/src/pages/operator/AiBillingPage.tsx:42        /api/ai/admin
    services/web-glycopharm/src/pages/operator/AiUsageDashboardPage.tsx:81 /api/ai/admin

메뉴에 노출되는 AI 항목은 `config/operatorMenuGroups.ts` `analytics` 그룹의 **3건**이다.

| # | 메뉴 | route | page | endpoint | guard(before) |
|:--:|---|---|---|---|---|
| 1 | AI 리포트 | `/operator/ai-report` | `AiReportPage` + `aiReportConfig.tsx` | **없음** | `OperatorRoute` |
| 2 | AI 사용량 | `/operator/ai-usage` | `AiUsageDashboardPage` | `analytics/summary`, `by-scope`, `by-model`, `recent`, `quotas/status` | `OperatorRoute` |
| 3 | AI 정산 | `/operator/ai-billing` | `AiBillingPage` | `billing`, `billing/:id`, `billing/generate`, `billing/:id/adjustment`, `confirm`, `paid`, `export.csv` | `OperatorRoute` |

`OperatorRoute` = `isOperatorOrAbove(roles,'glycopharm')` → `glycopharm:operator` / `glycopharm:admin` / `platform:super_admin`.

backend `/api/ai/admin/*` 는 **모든 endpoint 가** `authenticate + requireAdmin` 이고,
`requireAdmin` 은 `roleAssignmentService.hasAnyRole(user.id, ['platform:super_admin'])` 단독이다
(`apps/api-server/src/common/middleware/auth/authorization.middleware.ts:58`, WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1).

→ 메뉴는 operator 이상에게 보이는데 API 는 super_admin 전용 = **MENU_GUARD_MISMATCH 2건 (#2, #3)**.

`/operator/analytics`(운영 분석)는 `/api/v1/operator/analytics/*` + serviceKey 파라미터로 **이미 서비스 축이 있는** 별개 기능이다. AI 축 모집단이 아니다.

---

## 2. 판정 — UNJUDGED = 0

| # | 기능 | 판정 | 근거 |
|:--:|---|:--:|---|
| 1 | AI 리포트 | **D. DEAD_OR_LEGACY** | backend 계약 0건. `aiReportConfig.tsx` 가 `mode: 'full'` 로 `kpiData` 등을 전부 하드코딩. API 호출이 없어 403 도 발생하지 않는다 |
| 2 | AI 사용량 | **B. PLATFORM_SUPER_ADMIN_ONLY** | 3장 |
| 3 | AI 정산 | **B. PLATFORM_SUPER_ADMIN_ONLY** | 3장 |

A(서비스 admin 기능) / C(read 개방 + write 유지) 를 택하지 않은 이유는 3장이 결정한다. 선호가 아니라 **데이터에 서비스 축이 존재하지 않는다는 사실**이다.

---

## 3. 핵심 판정 — "서비스 자체 사용량/비용 조회" 인가?

WO 지시대로 analytics / quotas·status / billing 을 성격별로 나눠 보고, 하나의 prefix 라는 이유로 같은 권한을 적용하지 않았다.
그래서 **데이터 축을 직접 확인**했다.

**(1) `ai_usage_logs` 에 serviceKey 축이 없다.**
`apps/api-server/src/entities/AIUsageLog.ts` 컬럼: `userId, scope, costEstimated, provider, model, requestId, promptTokens, completionTokens, totalTokens, durationMs, status, errorMessage, errorType, createdAt`.
→ serviceKey / tenant 컬럼 **자체가 없다.**

**(2) `scope` 는 서비스 축이 아니라 기능 축이다.**
`modules/ai-policy/ai-policy-scope.ts` 의 `AiPolicyScope` = `CARE_CHAT | CARE_INSIGHT | STORE_INSIGHT | PRODUCT_TAGGING | AI_PROXY | ...`.
`SERVICE_FOR_SCOPE` 의 값은 `care` / `store` / `proxy` — `glycopharm`, `kpa-society` 같은 **serviceKey 가 아니다.**

**(3) quota 계층도 같은 축이다.**
`ai_usage_quota.layer ∈ {global, service, scope, user}` 이고, `layer='service'` 의 `layer_key` 는 (2)의 `care/store/proxy` 다.
`ai-quota.service.ts` 가 `SERVICE_FOR_SCOPE[scope]` 를 그대로 layer_key 로 사용한다.

**(4) billing 의 `service_key` 도 같다.**
`ai-billing.service.ts` `generate(month)` 는 `ai_usage_aggregate WHERE layer='service'` 를 읽어 `ai_billing_summary.service_key` 에 넣는다 → 값은 `care/store/proxy`.
`list({status, period})` 에 서비스 필터가 없다 → **전 서비스 정산 행이 그대로 반환된다.**

**(5) analytics 쿼리에 필터가 없다.**
`analytics/summary|by-scope|by-model|recent` 의 WHERE 절은 기간 조건뿐이다.
`by-scope` 는 `GROUP BY scope` 로 **다른 서비스의 AI 사용량까지 그대로 노출**한다.

### 결론

- `glycopharm:admin` 에게 이 endpoint 를 열면 = **플랫폼 전역 AI 사용량·비용·정산 전면 공개** = cross-service leak.
- A 로 만들려면 serviceKey 축을 **신설**해야 한다 → `ai_usage_logs` schema/migration + 집계 재설계. 8장(금지)의 `DB schema/migration`, `AI 기능 재설계` 에 정면으로 걸린다.
- C(GET 만 개방)도 성립하지 않는다. 개방 대상인 GET 자체가 이미 전역 데이터다. "실제 업무 의미가 뒷받침할 때만" 이라는 단서를 충족하지 못한다.
- `billing/generate|confirm|paid|adjustment` 는 **플랫폼 전체 월 정산 확정** 행위다. 서비스 운영자의 권한 범위가 아니다.

→ **B 확정. backend guard 를 완화하지 않는다.**

---

## 4. 수정 — 4장 B 원칙 그대로

backend `requireAdmin` **무변경**. GlycoPharm 의 메뉴/route 진입점만 실제 권한에 맞춘다.

| 파일 | 변경 |
|---|---|
| `packages/ui/src/operator-shell/types.ts` | `UnifiedMenuItem.platformOnly?: boolean` 추가 (additive, optional) |
| `packages/ui/src/operator-shell/filterMenuByRole.ts` | 3번째 인자 `isPlatformAdmin = false`. `platformOnly` 항목은 `isPlatformAdmin === true` 일 때만 통과하고, 키는 결과 객체에서 제거 |
| `services/web-glycopharm/src/lib/role-constants.ts` | `hasPlatformAdminRole()` 추가 — `platform:super_admin` 단독 판정 (`glycopharm:admin` 은 false) |
| `services/web-glycopharm/src/config/operatorMenuGroups.ts` | `AI 사용량`, `AI 정산` 에 `platformOnly: true` + 근거 주석 |
| `services/web-glycopharm/src/components/layouts/OperatorLayoutWrapper.tsx` | `isPlatformAdmin` 산출 후 `filterMenuByRole(UNIFIED_MENU, isAdmin, isPlatformAdmin)` |
| `services/web-glycopharm/src/components/auth/RoleGuard.tsx` | `PlatformRoute` 추가 — `allowedRoles={['platform:super_admin']}`, `enforceMembership={false}` |
| `services/web-glycopharm/src/App.tsx` | `/operator/ai-usage`, `/operator/ai-billing` 를 `PlatformRoute` 로 감쌈 |

- **권한 확대 0.** 넓힌 곳이 없고 좁힌 곳만 있다.
- **403 을 empty 로 숨기지 않았다.** 거부는 `RoleGuard` 의 `AccessDenied` 화면으로 명시된다.
- `enforceMembership={false}` 는 cross-service surface 라서다. `platform:super_admin` 은 `MembershipGate` 를 어차피 bypass 하므로 실질 동작은 동일하고, Neture 의 `PlatformRoute` 계약과 일치한다.

### 다른 서비스 무영향 근거

`filterMenuByRole` 호출처 전수:

    web-glycopharm   filterMenuByRole(UNIFIED_MENU, isAdmin, isPlatformAdmin)   <- 유일한 3-인자
    web-k-cosmetics  filterMenuByRole(UNIFIED_MENU, isAdmin)
    web-kpa-society  filterMenuByRole(UNIFIED_MENU, isAdmin)
    web-neture       filterMenuByRole(UNIFIED_MENU, false)
    web-pharmacy-hub filterMenuByRole(UNIFIED_MENU, isAdmin)

`isPlatformAdmin` 기본값 `false` + `platformOnly` 를 사용하는 메뉴 항목은 GlycoPharm 2건뿐 → 나머지 4개 서비스의 렌더 결과 **불변**.

---

## 5. 보안 경계 (코드 기준)

| 주체 | 메뉴 노출 | route 진입 | API 결과 |
|---|:--:|---|---|
| 미인증 | ✕ | ✕ (`/login` redirect) | 401 |
| `glycopharm:operator` | ✕ (before ○) | ✕ AccessDenied (before ○ → 화면 진입 후 전부 403) | 403 |
| `glycopharm:admin` | ✕ (before ○) | ✕ AccessDenied (before ○ → 화면 진입 후 전부 403) | 403 |
| `kpa:admin` / `k-cosmetics:admin` / `neture:admin` | ✕ (GlycoPharm 운영 메뉴 자체 미노출) | ✕ | 403 |
| `platform:super_admin` | ○ | ○ | 200 |

- **serviceKey 변경 공격 / query·body scope 확대**: 해당 endpoint 들은 serviceKey 파라미터를 받지 않는다(3장 (5)). 확대할 scope 표면이 없다. `analytics/recent?scope=` 는 존재하지만 `requireAdmin` 뒤라 서비스 admin 은 도달 자체가 불가능하다.
- **타 서비스 데이터 노출**: 변경 후 `platform:super_admin` 외에는 도달 경로가 없다.
- 변경 전에도 backend 403 이 실제 유출은 막고 있었다. 실제 결함은 **유출**이 아니라 **사용할 수 없는 기능을 메뉴에 노출한 것**이다.

---

## 6. 회귀 — 다른 서비스 AI Admin

`/api/ai/admin/*` 소비처 전수:

    services/web-neture/src/pages/admin/ai/*     (AiAdminDashboardPage / AiCostPage / AiEnginesPage 등)
    services/web-glycopharm/src/pages/operator/AiUsageDashboardPage.tsx, AiBillingPage.tsx

- **KPA-Society / K-Cosmetics / PharmacyHub**: `/api/ai/admin` 참조 **0건**. 이번 변경과 무관.
- **Neture**: 직전 WO(`WO-O4O-NETURE-OPERATOR-AI-GUARD-AND-MENU-VISIBILITY-FINAL-CLOSURE-V1`)가 이미 `getAdminMenu(isPlatformAdmin)` 로 AI 항목을 `platform:super_admin` 에게만 노출하고 `/operator/ai-*` 를 canonical `/admin/*` 로 redirect 해 두었다. 이번 변경은 Neture 파일을 **한 줄도 건드리지 않으며**, `filterMenuByRole(UNIFIED_MENU, false)` 2-인자 호출 그대로다. → Neture 계약 회귀 없음.
- 새 role 신설 0 / role rank 변경 0 / 전역 `requireAdmin` 완화 0 / DB schema·migration 0.

---

## 7. 검증

| 검증 | 결과 |
|---|---|
| `pnpm --filter @o4o/ui run type-check` | exit 0 |
| `node scripts/dev.mjs type-check:frontend` | exit 0 |
| ESLint (변경 7파일) | **error 0** / warning 2 (`filterMenuByRole.ts` 의 destructure omit 변수 — lint-ratchet 은 error 수만 집계, baseline 69 불변) |
| production E2E | 9장 |

---

## 8. 범위 밖 발견 (이번 WO 에서 수정하지 않음)

1. **AI 리포트(`/operator/ai-report`) 는 mock 상수 화면이다.** `aiReportConfig.tsx` 의 KPI·노출·트렌드 값이 전부 하드코딩이고 backend 계약이 없다. 운영자에게 **실측처럼 보이는 허구 수치**를 보여준다. Neture 도 같은 성격의 화면을 은퇴시킨 전례가 있다. 다만 이번 WO 는 권한 계약이 목표이고 8장이 AI 기능 재설계를 금지하므로 **D 판정만 남기고 손대지 않았다.** → 별도 WO 권장.
2. **`filterMenuByRole` 은 CI 에서 테스트되지 않는다.** `ci-pipeline.yml` 은 api-server Jest / admin-dashboard Vitest / multi-tenant Vitest 만 실행하고 `packages/ui` 의 vitest 는 실행하지 않는다. 지금 테스트를 추가해도 CI 가 돌리지 않아 **거짓 안심**이 된다. → 메뉴 가시성 회귀를 잠글 자동 검증 부재를 잔여로 명시. 별도 WO 권장.

---

## 9. 종료 판정

배포 후 production E2E 결과로 갱신한다. (커밋 시점: 미완료)
