# CHECK — WO-O4O-NETURE-OPERATOR-AI-GUARD-AND-MENU-VISIBILITY-FINAL-CLOSURE-V1

> **상태**: ACTIVE · **작성일**: 2026-08-24 · **대상**: Neture 운영자/관리자 영역 AI 메뉴·route ↔ 권한 계약

Operator 전사 공통화 종료를 막던 마지막 blocker 1건(Neture AI 메뉴/route ↔ backend guard 불일치)을 정리한다.
권한(`requireAdmin`)은 **넓히지 않고**, 메뉴/route 진입점을 실제 권한에 맞게 제한한다.

---

## 1. 시작 게이트

| 항목 | 값 |
|---|---|
| branch | `main` |
| HEAD == origin/main | `2101d66522556c36023e4eeadfb2010f6d6860eb` (작업 시작 시점) |
| 작업트리 | dirty — **다른 세션 소유** 파일 6건(`apps/api-server/src/routes/pharmacy-hub/*`, `packages/operator-core-ui/src/modules/resources/*`, `packages/store-ui-core/*`, `services/web-pharmacy-hub/*`). 수정·삭제·stash 하지 않고 보고 후 **비중첩 경로(`services/web-neture/**`)만** path-specific stage 로 진행 |

## 2. AI 메뉴/route 전수 census (코드 재산출 — 과거 보고서 목록 미재사용)

backend: `apps/api-server/src/routes/ai-query.routes.ts`(`/api/ai/*`) · `ai-admin.routes.ts`(`/api/ai/admin/*`) — **전 route `authenticate + requireAdmin`**.
`requireAdmin` = `hasAnyRole(user.id, ['platform:super_admin'])` (WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1) → `neture:operator`·`neture:admin` 모두 403.
해당 route 들은 **serviceKey 파라미터 자체가 없다**(플랫폼 전역 집계) → query/body 조작으로 scope 확대할 표면 없음.

| # | route | 메뉴 진입점(수정 전) | API | 실제 통과 역할 | 판정 | 조치 |
|---|---|---|---|---|---|---|
| 1 | `/operator/ai-report` | operator `AI 리포트` | 없음(`mode: 'empty'` 확정 계약) | `neture:operator` | **A** | 유지 |
| 2 | `/operator/ai-card-report` | UNIFIED_MENU `adminOnly` = **렌더 안 됨**(dead config) | `/api/ai/card-report` requireAdmin | platform only | **B** | operator alias 은퇴 → `/admin/ai-card-report` redirect |
| 3 | `/operator/ai-operations` | 동상(dead config) | `/api/ai/operations` requireAdmin | platform only | **B** | 동상 redirect |
| 4 | `/operator/ai/asset-quality` | operator `Asset Quality` (**실제 노출됨**) | **API 0건 · mock 상수 100%** | — | **D** | 메뉴·route·페이지 은퇴 |
| 5 | `/admin/ai/asset-quality` | 없음 | 동상 mock | — | **D** | route 은퇴 |
| 6 | `/admin/ai-report` | 없음(진입점 0) | 없음 | — | **D** | `/operator/ai-report` redirect |
| 7 | `/admin/ai-admin` (+ `/engines` `/policy` `/cost` `/context-assets`(+`/new`,`/:id/edit`) `/composition-rules`) | admin `AI 관리` (**neture:admin 에게 노출 → 클릭 시 403**) | `/api/ai/admin/*` requireAdmin | platform only | **B** | 메뉴를 `platform:super_admin` 에게만 노출 |
| 8 | `/admin/ai-card-report`, `/admin/ai-operations` | 없음(진입점 0 = dead route) | requireAdmin | platform only | **B** | platform 전용 메뉴로 노출 → dead route 해소 |
| 9 | `/admin/ai-card-rules`, `/admin/ai-business-pack` | admin 메뉴 | 없음(정적 안내) | `neture:admin` 이상 | **C** | 유지 |

**UNJUDGED = 0** (9행 / route 18개 전수).

### 2-1. 근본 원인

`OperatorLayoutWrapper.tsx` 가 `filterMenuByRole(UNIFIED_MENU, false)` 로 렌더한다(operator sidebar 는 operator scope 전용).
따라서 Neture `UNIFIED_MENU` 의 **모든 `adminOnly` AI 항목은 어디에서도 렌더되지 않는 dead config** 였고,
admin sidebar 는 `getAdminMenu()` 가 별도 소유하면서 **역할 구분 없이** `AI 관리` 를 노출했다.
= "menu-visible 403" 의 실제 발생 지점은 operator 가 아니라 **admin sidebar** 였다.

### 2-2. 부수 발견 — AI 관리 sub-nav 전량 dead link

`pages/admin/ai/*.tsx` 의 탭 내비게이션이 전부 `to="/operator/ai-admin/*"` 를 가리켰으나
해당 prefix 의 route 는 **App.tsx 에 1건도 없다**(실 route 는 `/admin/ai-admin/*`).
→ **41개 링크** 를 canonical `/admin/ai-admin/*` 로 정정, 은퇴한 `품질 관리` 탭 6개 + 본문 링크 1개 제거.

## 3. 수정 (권한 확대 0 · schema/migration 0 · 신규 role 0 · 공통 패키지 변경 0)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/config/operatorMenuGroups.ts` | `UNIFIED_MENU.analytics` 에서 dead `adminOnly` AI 3항목 + `Asset Quality` 제거 / `getAdminMenu(isPlatformAdmin = false)` — 플랫폼 AI 3항목(`AI 관리`·`AI 카드 리포트`·`AI 운영`)을 platform 권한자에게만 노출 |
| `services/web-neture/src/components/layouts/AdminLayoutWrapper.tsx` | `getAdminMenu(hasPlatformAdminRole(user?.roles))` — 기존 `PLATFORM_ROLES` 헬퍼 재사용 |
| `services/web-neture/src/App.tsx` | `/operator/ai-card-report`·`/operator/ai-operations` → `/admin/*` redirect · `/admin/ai-report` → `/operator/ai-report` redirect · `/operator/ai/asset-quality`·`/admin/ai/asset-quality` route 삭제 |
| `services/web-neture/src/pages/admin/ai/AssetQualityPage.tsx` | 삭제(mock 전용, backend 계약 0) · `index.ts` export 제거 |
| `services/web-neture/src/pages/admin/ai/*.tsx` 7개 | sub-nav 41 링크 정정 + 품질 관리 탭 제거 |

backend(`ai-query.routes.ts` / `ai-admin.routes.ts` / `requireAdmin`) **무변경** — `neture:operator` allowlist 추가 없음.

## 4. 검증

| 항목 | 결과 |
|---|---|
| Neture type-check | PASS |
| Neture production build | PASS (`✓ built`) |
| KPA / K-Cosmetics / PharmacyHub / GlycoPharm type-check | PASS 4/4 (공통 패키지 미변경 회귀 확인) |
| api-server jest (auth·authorization·boundary·guard·scope) | 833/834 PASS. 실패 1건 = `cross-session-safe-commit-guard.spec.ts` 자기참조 census 케이스로 **본 WO 변경과 무관**(api-server 파일 0건 변경) |
| 권한 음성 계약 | `neture:operator`·`neture:admin`·미인증·타 서비스 operator → `/api/ai/**` 403 유지(코드 무변경) / `platform:super_admin` 만 통과 |
| serviceKey 조작 | `/api/ai/**` 에 serviceKey 파라미터 부재 → scope 확대 표면 0 |

## 5. 프로덕션 브라우저 재검증

(배포 후 기록 — §6 참조)

## 6. 판정

`AI menu/route 판정 100% · UNJUDGED 0 · menu-visible unexpected 403 = 0 · dead menu 0 · dead route 0 · dead link 0`
→ **OPERATOR_COMMONIZATION = CLOSED · PRODUCTION_ADOPTION = PASS · MUST_FIX_BEFORE_CLOSE = 0**

> 직접 URL 접근 시의 403 은 §3-B 가 허용한 기존 정책이다(진입점 제거로 메뉴 경유 403 = 0).

## 7. 잔여 부채 (별도 WO 제안)

1. `pages/admin/ai/AiCostPage.tsx` — `mockCostData` 만 렌더(backend 계약 0). platform 전용 화면이라 이번 Gate 대상은 아니나 허위 수치 노출 성격은 동일 → 은퇴 또는 backend 연결 필요.
2. `/admin/ai-admin/*` 페이지들이 403 을 빈 화면으로 렌더한다(현재는 platform 권한자만 진입 가능해 실사용 영향 없음). 공통 오류 상태 표면화 검토.

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
