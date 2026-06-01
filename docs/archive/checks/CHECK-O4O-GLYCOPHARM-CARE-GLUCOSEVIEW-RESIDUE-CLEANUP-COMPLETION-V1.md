# CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-COMPLETION-V1

**검증 일자**: 2026-05-31
**검증 환경**: HEAD (main) `cef1dadcc` 시점 정적 코드 / git history / TypeScript 검증
**검증 도구**: Grep / Git log / TypeScript compiler / packages build
**작업 성격**: 검증 및 문서화 전용 — 코드/DB/source 수정 없음
**선행 IR**: [IR-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-AUDIT-V1](IR-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-AUDIT-V1.md), [IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1](IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1.md)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **CONDITIONAL PASS** — 사용자 노출 UI / badge / option / label / service key contract / Care alert pipeline 은 모두 active code 잔재 0건. 그러나 본 CHECK 조사 중 **api-server backend 2건의 GlucoseView active code 잔재** 가 추가로 발견됨 — 본 GlucoseView WO 의 범위 외 누락. 별도 보완 WO 필요.
>
> 1. **W5a/W5b/W5d/W5c-v2** — Care 잔재 정리 모두 검증 통과 (active 0건)
> 2. **GlucoseView shared/service/admin-dashboard** — UI/contract/option/label 모두 정리 완료
> 3. **신규 발견 (보완 필요)**:
>    - `apps/api-server/src/modules/auth/dto/register.dto.ts:249-256` — `// GlucoseView 전용 필드` (displayName, 약국명) **active code 잔재**
>    - `apps/api-server/src/modules/auth/controllers/password.controller.ts:28` — `'https://glucoseview.co.kr'` **CORS allowed origin active**
> 4. **TypeScript 신규 오류 0건** — 5개 서비스 + api-server 모두 통과
> 5. **Source file 수정 0건** (본 CHECK 는 검증만)

판정 사유: 본 WO 명시 범위 (shared packages + service code UI 잔재) 의 active 정리는 100% 완료. 그러나 사용자 검증 항목 #5 의 "apps/api-server active service registry" 영역에서 추가 잔재 2건 발견 → CONDITIONAL.

---

## 1. Executive Summary

### 1.1 정리 완료 항목 (PASS)

| WO | Commit | 범위 | 상태 |
|----|--------|------|:----:|
| W5a | `741e59b4e` | Admin Dashboard ADMIN_KPI_KEYS 3개 키 | ✅ |
| I-α | `d3b56d525` | 정책 IR — 옵션 A 영구 폐기 | ✅ |
| W5b | `1c65e0ad0` | backend Care alert metrics cluster | ✅ |
| W5d | `c94ed8e49` | GlycoPharm frontend type/intro/guard | ✅ |
| W5c-v2 | `14240d0ad` | shared package CARE type contract + 3 service orphan | ✅ |
| GlucoseView | `3abfdfe7b` | shared/service/admin-dashboard UI 잔재 | ✅ |

### 1.2 추가 발견 (보완 필요)

| ID | 위치 | 분류 | 우선순위 |
|----|------|:----:|:--------:|
| A1 | `register.dto.ts:249-256` GlucoseView 전용 필드 (displayName, 약국명) | active code | 중간 |
| A2 | `password.controller.ts:28` `'https://glucoseview.co.kr'` CORS origin | active code | 낮음 |

---

## 2. 검증 대상 commit 목록

```
3abfdfe7b refactor(operator): WO-O4O-SHARED-PACKAGES-GLUCOSEVIEW-RESIDUE-CLEANUP-V1
14240d0ad refactor(operator): WO-O4O-OPERATOR-SHARED-CARE-TYPE-CONTRACT-REMOVAL-V1 (W5c-v2)
c94ed8e49 refactor(glycopharm): WO-O4O-GLYCOPHARM-FRONTEND-CARE-TYPE-UNION-CLEANUP-V1 (W5d)
1c65e0ad0 refactor(glycopharm): WO-O4O-GLYCOPHARM-BACKEND-CARE-ALERT-METRICS-CLEANUP-V1 (W5b)
d3b56d525 docs(glycopharm): IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1 (I-α)
741e59b4e refactor(glycopharm): WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-PATIENT-KPI-WHITELIST-CLEANUP-V1 (W5a)
```

6개 commit 모두 `origin/main` push 완료, history 검증.

---

## 3. W5a Admin KPI whitelist 검증

**Commit**: `741e59b4e`
**파일**: [services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx](../../services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx)

### 3.1 ADMIN_KPI_KEYS 검증

| 키 | 제거 확인 | 코드 잔존 (active) |
|----|:---------:|:------------------:|
| `total-patients` | ✅ | 0 |
| `high-risk-patients` | ✅ | 0 |
| `open-care-alerts` | ✅ | 0 |

### 3.2 유지 KPI

`active-pharmacies` / `pending-applications` / `active-products` — GlycoPharm 운영 정합 ✅

### 3.3 사용자 노출 Care/환자 KPI

active code 0건. 정리 사유 주석 1건 (line 55 정리 trace, F 보존).

**판정**: ✅ PASS

---

## 4. W5b Backend Care alert metrics 검증

**Commit**: `1c65e0ad0`
**파일**: 3개 (operator-alert.utils.ts / operator-dashboard.service.ts / action-definitions.ts)

### 4.1 OperatorAlertMetrics 필드 검증

| 필드 | 제거 확인 |
|------|:---------:|
| `openCareAlerts` | ✅ |
| `careAdoptionRate` | ✅ |
| `highRiskPatients` | ✅ |
| `weeklyCareActivity` | ✅ |

→ interface 는 `pendingApplications` + `pendingApprovals?` + `draftProducts?` 만 유지.

### 4.2 Care 관련 THRESHOLDS

| THRESHOLD | 제거 확인 |
|-----------|:---------:|
| `CARE_ALERTS_WARNING/CRITICAL` | ✅ |
| `CARE_ADOPTION_LOW` | ✅ |
| `HIGH_RISK_WARNING/CRITICAL` | ✅ |
| `WEEKLY_CARE_INACTIVE` | ✅ |

→ `PENDING_APPS_INFO` / `PENDING_APPROVALS_INFO` 만 유지.

### 4.3 computeOperatorAlerts() Care 규칙 블록 4개

모두 제거 ✅. Network 규칙 2개 (Pending applications + Pharmacist approvals) 만 유지.

### 4.4 operator-dashboard.service.ts STUB metric 주입

`computeOperatorAlerts({ pendingApplications: 0, draftProducts })` 로 정합. Care 4 STUB 키 제거 ✅.

### 4.5 action-definitions.ts always-true check

`(counts['care-alerts'] || 0) === 0` always-true check 제거 ✅. 조건: `if ((counts['pending-apps'] || 0) > 0)` 로 단순화.

### 4.6 grep 잔존 검색 (active code)

| 검색어 | 코드 잔존 |
|-------|:--------:|
| `openCareAlerts/careAdoptionRate/highRiskPatients/weeklyCareActivity` | **0** ✅ |
| `CARE_ALERTS\|CARE_ADOPTION\|HIGH_RISK\|WEEKLY_CARE` | **0** ✅ |
| `'care-alerts'` (active) | **0** ✅ (3건 모두 주석 — F 보존) |

**판정**: ✅ PASS

---

## 5. W5d Frontend Care type/intro/guard 검증

**Commit**: `c94ed8e49`
**파일**: 5개

### 5.1 AlertItem.type union 검증

| 위치 | 'care' 멤버 |
|------|:----------:|
| `OperatorAlerts.tsx:14` | 제거 ✅ |
| `GlycoPharmOperatorDashboard.tsx:31` | 제거 ✅ |

### 5.2 FeatureIntroPage 검증

- FeatureType union: `'store' | 'mypage'` ✅ (care 멤버 제거)
- FEATURE_CONFIG.care entry 제거 ✅
- lucide-react import 의 'Users' 아이콘 동반 제거 ✅

### 5.3 SoftGuard feature union (App.tsx:365)

`feature: 'store' | 'mypage'` — 'care' 멤버 제거 ✅

### 5.4 ENABLED_CAPABILITIES (operatorCapabilities.ts)

`OperatorCapability.CARE` 라인 제거 ✅. enum 자체 (packages/types) 는 W5c-v2 에서 별도 정리됨.

### 5.5 사용자 노출 Care 진입점

active code 0건. 'care' 잔존 모두 정리 사유 주석 (F 보존).

**판정**: ✅ PASS

---

## 6. W5c-v2 Shared CARE type contract 검증

**Commit**: `14240d0ad`
**파일**: 6개 (3 packages + 3 services)

### 6.1 packages/types/src/operator-capability.ts

`OperatorCapability.CARE` enum 멤버 제거 ✅. 현재 enum: USER_MANAGEMENT/MEMBERSHIP_APPROVAL/CONTENT_MANAGEMENT/COMMUNITY/SIGNAGE/STORE_MANAGEMENT/ANALYTICS/SETTINGS (8개).

### 6.2 packages/ui/src/operator-shell/types.ts

`OperatorGroupKey` union 에서 `'care'` 멤버 제거 ✅.

### 6.3 packages/ui/src/operator-shell/constants.ts

STANDARD_GROUPS care entry 제거 ✅. `HeartPulse` lucide-react import 동반 제거 ✅.

### 6.4 서비스별 GROUP_TO_DOMAIN.care orphan

| 서비스 | 제거 확인 |
|--------|:---------:|
| web-glycopharm | ✅ |
| web-kpa-society | ✅ |
| web-k-cosmetics | ✅ |
| web-neture | N/A (다른 패턴, care orphan 없음) |

### 6.5 grep 잔존 검색

| 검색어 | active 코드 잔존 |
|-------|:----------------:|
| `OperatorCapability.CARE` | **0** ✅ (docs 다수 + 정리 사유 주석 — F) |
| `key: 'care'` (STANDARD_GROUPS) | **0** ✅ |
| `HeartPulse` | **0** ✅ (정리 사유 주석 1건 — F) |
| `care: 'common'` GROUP_TO_DOMAIN | **0** ✅ |

**판정**: ✅ PASS

---

## 7. GlucoseView shared residue 검증

**Commit**: `3abfdfe7b`
**파일**: 15개

### 7.1 packages/operator-ux-core/src/member-list/MemberBadges.tsx

| 항목 | 제거 확인 |
|------|:---------:|
| `'glucoseview:admin'` ROLE_STYLES | ✅ |
| `'glucoseview:operator'` ROLE_STYLES | ✅ |
| `glucoseview: 'GlucoseView'` SERVICE_LABELS | ✅ |

### 7.2 packages/ui/src/pages/operator/RoleManagementPage.tsx

`SERVICE_OPTIONS` 의 `{ value: 'glucoseview', label: 'GlucoseView' }` 제거 ✅

### 7.3 packages/ui/src/operator-user-detail/UserDetailPage.tsx

SERVICE_LABELS `glucoseview: 'GlucoseView'` 제거 + 헤더 주석 "5개 → 4개 서비스" 정정 ✅

### 7.4 platform-core service key union (3 파일)

| 파일 | union 'glucoseview' 제거 |
|------|:------------------------:|
| `platform-store-policy.entity.ts` | ✅ |
| `platform-store-payment-config.entity.ts` | ✅ |
| `platform-store-slug.entity.ts` | ✅ |

### 7.5 services 정리

| 파일 | 제거 |
|------|------|
| `web-account/UserProfileCard.tsx` | 'GlucoseView 관리자/운영자' 2 라벨 ✅ |
| `web-neture/ContentUtilizationGuide.tsx` | SUPPORTED_SERVICES glucoseview object ✅ |
| `web-neture/SupplierOrdersPage.tsx` | SERVICE_ICONS glucoseview ✅ |
| `web-neture/MyHandledProductsPage.tsx` | SERVICE_ICONS glucoseview ✅ |
| `web-neture/PartnerOverviewPage.tsx` | URLS/ICONS/LABELS 3 entry ✅ |
| `web-neture/admin/ai/AiCostPage.tsx` | mock service block ✅ |
| `web-neture/admin/ai/AssetQualityPage.tsx` | mock service block ✅ |
| `web-neture/admin/ai/ContextAssetListPage.tsx` | ca-7 글루코스뷰 card + broken /images/brand-glucoseview.jpg + /about/glucoseview link ✅ |

### 7.6 apps/admin-dashboard/src/config/service-entry.ts

glucosecare routePatterns 의 `'/admin/glucoseview'` alias 제거 ✅

### 7.7 grep 잔존 검색

| 검색어 | active 코드 잔존 |
|-------|:----------------:|
| `glucoseview` / `GlucoseView` (사용자 노출 UI / badge / option / label) | **0** ✅ |
| service key union | **0** ✅ |

**판정**: ✅ PASS (본 WO 범위 내)

---

## 8. 잔존 care/glucoseview 검색 결과와 분류

### 8.1 Care 잔존 (모두 F 보존)

| 위치 | 분류 |
|------|:----:|
| `docs/investigations/IR-*.md` 다수 | F (정책/감사 문서) |
| `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx:55` | F (W5a 정리 trace) |
| `services/web-glycopharm/src/config/operatorCapabilities.ts:19` | F (W5d 정리 trace) |
| `packages/ui/src/operator-shell/constants.ts:9` | F (W5c-v2 정리 trace) |
| `packages/ai-core/src/orchestration/execute.ts:91-92` | F (JSDoc 예제) |
| `apps/api-server/src/utils/operator-alert.utils.ts:21, 48` | F (`pendingApprovals?` GlucoseView 잔재 주석, I-β 별도 트랙) |
| 기타 `WO-O4O-...CARE-CLEANUP/REMOVAL/DEAD-CODE-REMOVAL` 주석 | F (정리 이력 trace) |

→ active code 잔존 **0건** ✅

### 8.2 GlucoseView 잔존 분류

| 위치 | 분류 | 비고 |
|------|:----:|------|
| `docs/investigations/IR-*.md`, `docs/architecture/*`, `docs/rbac/RBAC-ROLE-CATALOG-V1.md`, `docs/investigations/IR-GLYCOPHARM-WEB-CURRENT-STATE-AUDIT-PHASE1-V1.md` | F | 정책/감사 문서 |
| migration 파일 다수 (1737100*, 1771200000016, 1739700000000, 20260205070000, 20260600000000 등) | F | 이미 실행된 변경 이력 |
| `apps/api-server/src/config/service-scopes.ts`, `bootstrap/register-routes.ts:812`, `utils/scope-assignment.utils.ts:68` | F | 정리 사유 trace |
| `packages/cms-core/CmsContent.entity.ts:48`, `Channel.entity.ts:56` | F | entity docstring |
| `packages/security-core/service-scope-guard.ts:32` | F | 주석 example |
| `packages/operator-ux-core/MemberBadges.tsx`, `packages/ui/*.tsx`, `packages/platform-core/*.entity.ts`, `web-account/UserProfileCard.tsx`, `web-neture/**/*.tsx` (정리 사유 주석) | F | W5c-v2 / GlucoseView WO 정리 trace |
| `web-glycopharm/UX-TRUST-RULES-V1.md` | F | 문서 |
| `web-neture/components/product/ProductForm.tsx:70`, `ProductServiceApprovalPage.tsx:36` | F | `WO-NETURE-EXCLUDE-GLUCOSEVIEW-*` 주석 |
| `web-glycopharm/api/public.ts:85` `supplier: 'GlucoseView'` | F | mock supplier 라벨 (별도 mock 중립화 트랙) |
| `apps/api-server/__tests__/security/cross-service.spec.ts`, `kpa-role-guard.spec.ts` | F | 테스트 fixture — cross-service 차단 검증 목적 |
| `apps/api-server/utils/operator-alert.utils.ts:21, 48` `pendingApprovals?` | F | W5b 시 의도적 보존 |
| `apps/api-server/modules/auth/entities/ServiceMembership.ts:46` | F | 주석 (`// 'neture' \| 'glycopharm' \| 'kpa-society' \| 'glucoseview' \| ...`) |
| `scripts/care-data-accumulation-test.{mjs,py,sh}`, `scripts/care-e2e-operation-test-v2.mjs` | F (broken test) | 이미 삭제된 `/glucoseview/customers` endpoint 호출. test fixture |
| **`apps/api-server/src/modules/auth/dto/register.dto.ts:249-256`** | **❌ A1 (active code)** | **GlucoseView 전용 필드** (displayName, 약국명) — 본 WO 누락 |
| **`apps/api-server/src/modules/auth/controllers/password.controller.ts:28`** | **❌ A2 (active code)** | **`'https://glucoseview.co.kr'` CORS allowed origin** — 본 WO 누락 |

### 8.3 신규 발견 active code (CONDITIONAL 사유)

**A1 — register.dto.ts GlucoseView 전용 필드** (`apps/api-server/src/modules/auth/dto/register.dto.ts:249-256`):
```ts
// --- GlucoseView 전용 필드 ---

/** GlucoseView: 표시 이름 (사이트에서 보일 이름) */
... displayName ...

/** GlucoseView: 약국명 */
... pharmacyName ...
```
- DTO 입력 필드. 외부 클라이언트가 보낼 수 있는 필드 — backend 가 받아도 무시되지만, 명시적 GlucoseView 전용 정의가 남음.
- 본 WO 의 "active service registry" 범주에 해당.

**A2 — password.controller.ts CORS allowed origin** (`apps/api-server/src/modules/auth/controllers/password.controller.ts:28`):
```ts
'https://glucoseview.co.kr',
```
- 비밀번호 재설정 흐름의 CORS allowlist. GlucoseView 도메인이 호출자 origin 인 경우 허용. GlucoseView 서비스가 운영 종료된 상태라면 dead allowlist.
- 본 WO 의 "active service registry / scope" 범주에 해당.

---

## 9. TypeScript / build 결과

### 9.1 packages 빌드

- `@o4o/types` build: success
- `@o4o/ui` build: success
- `@o4o/operator-ux-core` build: success
- `@o4o/platform-core` build: success

### 9.2 5개 서비스 + api-server typecheck

| 영역 | TS errors | 신규 |
|------|----------:|:----:|
| web-glycopharm | 22 (pre-existing — W5c-v2 / GlucoseView 시점과 동일) | **0** ✅ |
| web-kpa-society | **0** | **0** ✅ |
| web-k-cosmetics | **0** | **0** ✅ |
| web-neture | **0** | **0** ✅ |
| api-server | **0** | **0** ✅ |

pre-existing 22 errors: GlycoPharm DashboardLayout/InstructorDashboardPage 의 unused/CSS property — 본 Care/GlucoseView 작업과 무관.

---

## 10. Working tree 격리 상태

### 10.1 CHECK 시작 시점

```
nothing to commit, working tree clean
```

### 10.2 CHECK 문서 작성 후 시점

```
?? docs/investigations/CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-COMPLETION-V1.md
```

- modified source 0
- 다른 세션 WIP 0
- 본 CHECK 가 만든 untracked 1 (이 문서)

### 10.3 commit 시 staging 정책

- CHECK 문서 1개만 path-restricted `git add` (사용자 승인 후)
- `git add .` 금지

---

## 11. 최종 판정

### 판정: ⚠️ **CONDITIONAL PASS**

| 기준 | 결과 |
|------|:----:|
| Care active code 잔재 0건 | ✅ |
| W5a/W5b/W5d/W5c-v2 검증 통과 | ✅ |
| GlucoseView UI/badge/option/label/service key 잔재 0 (본 WO 범위) | ✅ |
| 남은 항목이 F (문서/주석/migration/test fixture) | ✅ |
| 신규 TypeScript 오류 없음 | ✅ |
| Source file 수정 없음 (본 CHECK 범위) | ✅ |
| **api-server backend active code 잔재 (A1 + A2)** | ❌ — 본 GlucoseView WO 누락 |

### CONDITIONAL 사유

본 GlucoseView WO (`3abfdfe7b`) 의 명시 범위 (shared packages / service UI / admin-dashboard) 는 100% 정리 완료. 그러나 `apps/api-server/src/modules/auth/` 영역의 GlucoseView active code 2건 (register.dto 전용 필드 + password.controller CORS origin) 이 본 WO 작업 시 누락됨.

이는 **PASS → FAIL 강등 사유는 아니나**, "GlucoseView 삭제 잔재 정리 1차 완료" 의 closure 를 완전하게 하기 위해 **별도 보완 WO** 필요. CHECK 정책의 "active service registry에 glucoseview가 남음" 기준에 해당.

---

## 12. 남은 보완 후보

| ID (가칭) | 범위 | 우선순위 |
|----------|------|:--------:|
| **W-Patch-A1** `WO-O4O-API-SERVER-AUTH-DTO-GLUCOSEVIEW-FIELDS-CLEANUP-V1` | `register.dto.ts:249-256` GlucoseView 전용 displayName / pharmacyName 필드 + line 7 docstring 정정 | 중간 |
| **W-Patch-A2** `WO-O4O-API-SERVER-AUTH-PASSWORD-GLUCOSEVIEW-CORS-CLEANUP-V1` | `password.controller.ts:28` `'https://glucoseview.co.kr'` CORS origin entry | 낮음 |
| (선택) `WO-O4O-GLYCOPHARM-PUBLIC-API-GLUCOSEVIEW-MOCK-CLEANUP-V1` | `web-glycopharm/api/public.ts:85` `supplier: 'GlucoseView'` mock 중립화 (W6 패턴) | 매우 낮음 |
| (선택) `WO-O4O-SCRIPTS-DEAD-GLUCOSEVIEW-TEST-CLEANUP-V1` | `scripts/care-*.{mjs,py,sh}` broken test scripts (이미 삭제된 endpoint 호출) | 매우 낮음 |
| **Future-α** `IR-O4O-CARE-CORE-REINTRODUCTION-ARCHITECTURE-V1` | 새 Care Core 설계 IR | 사업 결정 트리거 시 |

W-Patch-A1 + A2 만 처리되면 **GlucoseView 1차 정리 PASS** 로 closure 가능.

---

## 13. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| **판정** | **CONDITIONAL PASS** |
| **작성 문서** | `docs/investigations/CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-COMPLETION-V1.md` |
| **Care active code 잔존** | **0건** ✅ |
| **GlucoseView active code 잔존** | **2건** ❌ (A1 register.dto + A2 password.controller CORS) |
| **유지한 잔존 항목** | 문서/주석/migration/test fixture/JSDoc/감사 trace — 모두 F 보존 (§8) |
| **TypeScript 결과** | 5 서비스 + api-server 신규 에러 0 / web-glycopharm 22 pre-existing |
| **Source file 수정** | 없음 ✅ |
| **다른 세션 WIP 미포함** | ✅ working tree clean |
| **Commit 여부** | **사용자 승인 대기** — 본 CHECK 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 검증 완료. 본 CHECK 문서 commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정. CONDITIONAL PASS 판정 — Care 잔재는 1차 완료, GlucoseView 잔재는 backend 2건 보완 후 완전 closure 가능.
