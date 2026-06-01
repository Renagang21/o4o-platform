# IR-O4O-OPERATOR-DASHBOARD-DEADCODE-AUDIT-V1

> **Status**: Complete (READ-ONLY Investigation)
> **Date**: 2026-03-16
> **Scope**: Operator Dashboard 시스템 전체 Dead Code 조사
> **코드 수정**: 없음
> **선행 WO**: WO-O4O-COPILOT-ENGINE-INTEGRATION-V1, WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1, WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1

---

## 1. 조사 범위

| 조사 영역 | 범위 |
|-----------|------|
| Copilot Legacy | `operator-copilot.service.ts`, `operator-copilot.controller.ts` vs 신규 `copilot/` |
| Legacy Dashboard API | `admin/dashboard/summary`, `admin/dashboard/quick-stats` 등 |
| 중복 컨트롤러 | operator vs admin 대시보드 컨트롤러 중복 |
| Frontend Legacy | 미사용 대시보드 컴포넌트, 후크, API 호출 |
| 타입/인터페이스 | 5-Block 인터페이스 중복 정의, 미사용 export |
| Route 등록 | main.ts 중복 등록, 라우트 충돌 |

---

## 2. 조사 결과 요약

| 영역 | Dead Code 수 | 위험도 | 제거 안전성 |
|------|:------------:|:------:|:----------:|
| Copilot Legacy 모듈 | 2 파일 (~575 lines) | LOW | SAFE |
| Legacy Dashboard API | 4 엔드포인트 | LOW | MIGRATION 필요 |
| 중복 컨트롤러 | 1 컨트롤러 | LOW | SAFE |
| Frontend Dead Code | 6 파일 | LOW | SAFE |
| 타입 중복 정의 | 4 컨트롤러 × 6 인터페이스 | LOW | 통합 권장 |
| Route 중복 등록 | 2 경로 | LOW | 통합 권장 |

---

## 3. Copilot Legacy 모듈

### 3-1. 현황

**구 모듈** (`operator-copilot`):

| 파일 | 라인 수 | 상태 |
|------|:-------:|:----:|
| `apps/api-server/src/modules/operator/operator-copilot.service.ts` | 367 | **DEAD** |
| `apps/api-server/src/modules/operator/operator-copilot.controller.ts` | 204 | **DEAD** |

**신 모듈** (`copilot/`):

| 파일 | 라인 수 | 상태 |
|------|:-------:|:----:|
| `apps/api-server/src/copilot/copilot-engine.service.ts` | 127 | ACTIVE |
| `apps/api-server/src/copilot/copilot-engine.controller.ts` | 76 | ACTIVE |
| `apps/api-server/src/copilot/insight-rules.ts` | 302 | ACTIVE |

### 3-2. 기능 대체 현황

| 구 엔드포인트 | 신규 대체 | 상태 |
|--------------|----------|:----:|
| `GET /api/v1/operator/copilot/kpi` | `/api/v1/{service}/operator/dashboard` KPIs 블록 | **대체 완료** |
| `GET /api/v1/operator/copilot/stores` | 서비스별 대시보드에 통합 | **대체 완료** |
| `GET /api/v1/operator/copilot/suppliers` | 서비스별 대시보드에 통합 | **대체 완료** |
| `GET /api/v1/operator/copilot/products` | 서비스별 대시보드에 통합 | **대체 완료** |
| `GET /api/v1/operator/copilot/trends` | 서비스별 대시보드에 통합 | **대체 완료** |
| `GET /api/v1/operator/copilot/alerts` | 서비스별 대시보드에 통합 | **대체 완료** |
| `GET /api/v1/operator/copilot/ai-summary` | `CopilotEngineService.generateInsights()` | **대체 완료** |

### 3-3. 소비자 분석

| 소비자 유형 | 참조 수 | 상세 |
|------------|:-------:|------|
| Frontend import | 0 | 모든 프론트엔드가 `/api/v1/{service}/operator/dashboard`로 전환 |
| Backend import | 0 | main.ts 라우트 등록만 존재 |
| 외부 서비스 | 0 | 확인되지 않음 |

**판정**: `operator-copilot` 모듈은 **소비자 0건**, **완전 대체 완료**. 즉시 제거 안전.

### 3-4. 제거 시 영향

```
main.ts (lines 1197-1204):
  try {
    const { createOperatorCopilotRouter } = await import('./modules/operator/operator-copilot.controller.js');
    app.use('/api/v1/operator', createOperatorCopilotRouter(AppDataSource));
  } catch (operatorCopilotError) {
    logger.error('Failed to register Operator Copilot routes:', operatorCopilotError);
  }
```

- 제거 시 try/catch로 감싸져 있어 에러 발생 없음
- 프로덕션 영향: **NONE**

---

## 4. Legacy Dashboard API 엔드포인트

### 4-1. DEAD 엔드포인트

| 서비스 | 엔드포인트 | 컨트롤러 | 대체 엔드포인트 | 상태 |
|--------|-----------|---------|--------------|:----:|
| Neture | `GET /api/v1/neture/admin/dashboard/summary` | `admin.controller.ts:585-607` | `/api/v1/neture/operator/dashboard` | **DEAD** |
| Neture | `GET /api/v1/neture/admin/dashboard/partner-kpi` | `admin.controller.ts:614` | `/api/v1/neture/operator/dashboard` KPIs | **DEAD** |
| Cosmetics | `GET /api/v1/cosmetics/admin/dashboard/summary` | `cosmetics.controller.ts:527` | `/api/v1/cosmetics/operator/dashboard` | **DEAD** |
| GlycoPharm | `GET /api/v1/glycopharm/admin/dashboard` | `admin-dashboard.controller.ts:34` | `/api/v1/glycopharm/operator/dashboard` | **DEAD** |

### 4-2. ALIVE 엔드포인트 (역할 분리로 유지)

| 서비스 | 엔드포인트 | 용도 | 판정 |
|--------|-----------|------|:----:|
| Neture | `/supplier/dashboard/summary` | Supplier 전용 대시보드 (다른 역할) | ALIVE |
| Neture | `/partner/dashboard/summary` | Partner 전용 대시보드 (다른 역할) | ALIVE |
| KPA | `/api/v1/kpa/admin/dashboard/stats` | Admin 전용 (Operator와 별도) | ALIVE |
| KPA | `/api/v1/kpa/branch-admin/dashboard/*` | Branch Admin 전용 (org-scoped) | ALIVE |
| GlucoseView | `/api/v1/glucoseview/operator/dashboard` | 통합 완료, 레거시 없음 | ALIVE |

### 4-3. UNCLEAR 엔드포인트 (추가 조사 필요)

| 엔드포인트 | 위치 | 상태 |
|-----------|------|:----:|
| `GET /api/v1/admin/dashboard/sales-summary` | `routes/admin/dashboard.routes.ts` | Frontend 소비자 미확인 |
| `GET /api/v1/admin/dashboard/order-status` | `routes/admin/dashboard.routes.ts` | Frontend 소비자 미확인 |
| `GET /api/v1/admin/dashboard/user-growth` | `routes/admin/dashboard.routes.ts` | Frontend 소비자 미확인 |

---

## 5. 중복 컨트롤러

### 5-1. GlycoPharm 이중 대시보드

| 컨트롤러 | 엔드포인트 | 형식 | Guard |
|---------|-----------|------|-------|
| `operator.controller.ts` | `/api/v1/glycopharm/operator/dashboard` | 5-Block (신형) | `glycopharm:operator` |
| `admin-dashboard.controller.ts` | `/api/v1/glycopharm/admin/dashboard` | 4-Block (구형) | `glycopharm:admin` |

**판정**: `admin-dashboard.controller.ts`는 구형 Admin UI 호환용으로 유지 중이나, Frontend 전환 후 제거 가능.

### 5-2. KPA 다중 Operator 엔드포인트

| 엔드포인트 | 용도 | 판정 |
|-----------|------|:----:|
| `GET /api/v1/kpa/operator/summary` | 운영 요약 | ALIVE (별도 목적) |
| `GET /api/v1/kpa/operator/dashboard` | 5-Block 통합 | ALIVE |
| `GET /api/v1/kpa/operator/forum-analytics` | 포럼 분석 | ALIVE (별도 목적) |
| `GET /api/v1/kpa/operator/district-summary` | 분회 요약 | ALIVE (별도 목적) |

**판정**: KPA는 의도적 다중 엔드포인트. Dead code 없음.

---

## 6. Frontend Dead Code

### 6-1. Admin Dashboard 내 Dead Code

| 파일 | 라인 수 | 상태 | 제거 안전성 |
|------|:-------:|:----:|:----------:|
| `apps/admin-dashboard/src/api/dashboard.ts` | ~200 | **DEAD** (하드코딩 fallback, EcommerceApi 참조) | SAFE |
| `apps/admin-dashboard/src/hooks/useDashboardStats.ts` | 171 | **DEAD** (import 0건) | SAFE |
| `apps/admin-dashboard/src/hooks/useDashboardLayout.ts` | 122 | **DEAD** (import 0건) | SAFE |
| `apps/admin-dashboard/src/components/dashboard/DashboardGrid.tsx` | 54 | **DEAD** (import 0건) | SAFE |
| `apps/admin-dashboard/src/components/help/DashboardHelp.tsx` | 120+ | **DEAD** (import 0건) | SAFE |
| `apps/admin-dashboard/src/components/shortcodes/admin/PlatformStats.tsx` | 150+ | **DEAD** (import 0건) | SAFE |

### 6-2. API 호출 규칙 위반

| 파일 | 위반 내용 | 심각도 |
|------|----------|:------:|
| `components/shortcodes/dropshipping/partner/PartnerDashboard.tsx:62` | `fetch()` + 수동 Bearer 토큰 (CLAUDE.md §1 위반) | MEDIUM |
| `pages/AdminDashboard.tsx:21-36` | 하드코딩 Mock 데이터 + 디버그 배너 | LOW |

### 6-3. Frontend 소비자 미연결 (Orphaned)

| Frontend 호출 | Backend 엔드포인트 | 상태 |
|--------------|------------------|:----:|
| `/api/v1/dropshipping/partner/dashboard/summary` | 미확인 | ORPHANED |
| `/partnerops/dashboard/summary` | 미확인 | ORPHANED |

---

## 7. 타입/인터페이스 중복

### 7-1. 5-Block 인터페이스 중복 정의

**정의 위치**: 동일한 6개 인터페이스가 4개 컨트롤러 + 2개 copilot 파일에 반복 정의

| 인터페이스 | 정의 횟수 | 정식 출처 |
|-----------|:---------:|----------|
| `KpiItem` | 6회 | `packages/operator-ux-core/src/types.ts` |
| `AiSummaryItem` | 8회 (copilot 2회 포함) | `packages/operator-ux-core/src/types.ts` |
| `ActionItem` | 6회 | `packages/operator-ux-core/src/types.ts` |
| `ActivityItem` | 6회 | `packages/operator-ux-core/src/types.ts` |
| `QuickActionItem` | 6회 | `packages/operator-ux-core/src/types.ts` |
| `OperatorDashboardConfig` | 6회 | `packages/operator-ux-core/src/types.ts` |

**중복 파일 목록**:
1. `modules/neture/controllers/operator-dashboard.controller.ts` (lines 27-38)
2. `routes/glycopharm/controllers/operator.controller.ts` (lines 27-38)
3. `routes/cosmetics/controllers/operator-dashboard.controller.ts` (lines 27-38)
4. `routes/glucoseview/controllers/operator-dashboard.controller.ts` (lines 26-37)
5. `copilot/copilot-engine.service.ts` (lines 20-25)
6. `copilot/insight-rules.ts` (lines 19-24)

**권장**: `apps/api-server/src/types/operator-dashboard.types.ts` 공통 파일 생성 또는 `@o4o/operator-ux-core`에서 직접 import.

### 7-2. operator-core vs operator-ux-core 패키지 이중성

| 패키지 | 용도 | 사용 현황 |
|--------|------|:--------:|
| `@o4o/operator-core` | Legacy Signal 패턴 | **미사용** (export만 존재) |
| `@o4o/operator-ux-core` | 5-Block 통합 대시보드 | **ACTIVE** (13+ 파일) |

**판정**: `@o4o/operator-core` 타입은 `operator-ux-core`에 의해 완전 대체됨. Legacy 문서화 또는 정리 권장.

### 7-3. KPA Frontend inline aiSummary 생성

| 파일 | 패턴 | 라인 수 |
|------|------|:-------:|
| `services/web-kpa-society/src/pages/operator/operatorConfig.ts` | `.push()` 기반 aiSummary 구성 | ~50 |
| `services/web-kpa-society/src/pages/branch-operator/BranchOperatorDashboard.tsx` | `.push()` 기반 aiSummary 구성 | ~30 |
| `services/web-kpa-society/src/pages/pharmacy/PharmacyDashboardPage.tsx` | `.push()` 기반 aiSummary 구성 | ~65 |
| `services/web-kpa-society/src/pages/admin/KpaOperatorDashboardPage.tsx` | `.push()` 기반 aiSummary 구성 | ~33 |

**판정**: Backend CopilotEngine과 별도로 Frontend에서 Client-side insight 생성. 통합 가능 후보.

---

## 8. Route 등록 이슈

### 8-1. 중복 등록

| 경로 | 1차 등록 | 2차 등록 | 영향 |
|------|:--------:|:--------:|:----:|
| `/api/v1/admin/apps` | main.ts:594 | main.ts:830 | 2차가 1차 덮어씀 |
| `/api/auth` | main.ts:568 | main.ts:826 | 의도적 Legacy 지원 |

### 8-2. 라우트 충돌 위험

| 기본 경로 | 라우터 수 | 위험도 |
|----------|:---------:|:------:|
| `/api/v1/care` | 12 | LOW (sub-path 분리됨) |
| `/api/v1/products` | 5 | LOW (sub-path 분리됨) |
| `/api/v1/neture` | 3 | LOW (sub-path 분리됨) |

**판정**: Express.js는 동일 base path에 여러 라우터 등록을 지원하며, 각 라우터가 고유 sub-path를 사용하므로 충돌 없음.

---

## 9. 정리 우선순위 매트릭스

### Tier 1: 즉시 제거 가능 (SAFE)

| 대상 | 코드량 | 소비자 | 제거 방법 |
|------|:------:|:------:|----------|
| `operator-copilot.service.ts` | 367 lines | 0 | `git rm` |
| `operator-copilot.controller.ts` | 204 lines | 0 | `git rm` |
| main.ts copilot 라우트 등록 (L1197-1204) | 8 lines | 0 | Edit |
| `admin-dashboard/src/api/dashboard.ts` | ~200 lines | 0 | `git rm` |
| `admin-dashboard/src/hooks/useDashboardStats.ts` | 171 lines | 0 | `git rm` |
| `admin-dashboard/src/hooks/useDashboardLayout.ts` | 122 lines | 0 | `git rm` |
| `admin-dashboard/src/components/dashboard/DashboardGrid.tsx` | 54 lines | 0 | `git rm` |
| `admin-dashboard/src/components/help/DashboardHelp.tsx` | 120+ lines | 0 | `git rm` |
| `admin-dashboard/src/components/shortcodes/admin/PlatformStats.tsx` | 150+ lines | 0 | `git rm` |
| **합계** | **~1,400 lines** | | |

### Tier 2: Frontend 전환 후 제거

| 대상 | 전제 조건 | 영향 |
|------|----------|------|
| `neture/admin/dashboard/summary` API | AdminDashboardPage.tsx → `/operator/dashboard` 전환 | Frontend 수정 필요 |
| `neture/admin/dashboard/partner-kpi` API | 위와 동일 | Frontend 수정 필요 |
| `cosmetics/admin/dashboard/summary` API | 해당 Frontend → `/operator/dashboard` 전환 | Frontend 수정 필요 |
| `glycopharm/admin-dashboard.controller.ts` | GlycoPharmAdminDashboard.tsx → `/operator/dashboard` 전환 | Frontend 수정 필요 |

### Tier 3: 구조 개선 (선택)

| 대상 | 권장 사항 |
|------|----------|
| 5-Block 인터페이스 중복 (4 컨트롤러 × 6 인터페이스) | 공통 types 파일로 통합 |
| `@o4o/operator-core` 패키지 | Legacy 문서화 또는 아카이브 |
| KPA Frontend inline aiSummary (4 페이지) | 공통 유틸리티 추출 또는 Backend CopilotEngine 통합 |
| main.ts `/api/v1/admin/apps` 중복 등록 | 1차 등록 제거 (L594) |

---

## 10. 서비스별 상태 요약

| 서비스 | Operator Dashboard | Admin Dashboard | Dead Code |
|--------|:------------------:|:---------------:|:---------:|
| **Neture** | 5-Block (ACTIVE) | Legacy 2건 (DEAD) | 2 API |
| **GlycoPharm** | 5-Block (ACTIVE) | 4-Block (DEAD) | 1 컨트롤러 |
| **K-Cosmetics** | 5-Block (ACTIVE) | Legacy 1건 (DEAD) | 1 API |
| **GlucoseView** | 5-Block (ACTIVE) | 없음 | 없음 |
| **KPA Society** | 5-Block + 확장 (ACTIVE) | Admin 별도 (ALIVE) | 없음 |
| **Platform** | Copilot Engine (ACTIVE) | Legacy Copilot (DEAD) | 2 파일 |

---

## 11. 후속 WO 권장

| WO ID (제안) | 내용 | 우선순위 |
|-------------|------|:--------:|
| WO-O4O-OPERATOR-COPILOT-LEGACY-CLEANUP-V1 | operator-copilot 모듈 삭제 + main.ts 정리 | HIGH |
| WO-O4O-ADMIN-DASHBOARD-DEADCODE-CLEANUP-V1 | Admin Dashboard Frontend dead code 제거 (6 파일) | MEDIUM |
| WO-O4O-OPERATOR-DASHBOARD-TYPE-CONSOLIDATION-V1 | 5-Block 인터페이스 공통 파일 통합 | LOW |
| WO-O4O-LEGACY-ADMIN-API-SUNSET-V1 | Neture/Cosmetics/GlycoPharm admin dashboard API 제거 (Frontend 전환 선행) | LOW |

---

*Investigation completed: 2026-03-16*
*Investigator: AI Agent (Claude Opus 4.6)*
*Classification: READ-ONLY — No code modifications made*
