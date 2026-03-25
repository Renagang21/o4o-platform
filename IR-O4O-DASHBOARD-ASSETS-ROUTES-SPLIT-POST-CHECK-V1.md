# IR-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-POST-CHECK-V1

> **WO-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-V1 완료 후 Post-Check 조사 보고서**
> 기준 브랜치: `feature/dashboard-assets-routes-split`
> 기준 커밋: `d0ef2f008`
> 조사일: 2026-03-23

---

## 1. 전체 판정

| 항목 | 판정 |
|------|------|
| dashboard assets routes split 최종 상태 | **SAFE** |
| oversized 정비 1차 완료 여부 | **YES** — 1,010줄 → 66줄 (route only) |
| push 가능 상태 | **YES** — 0 신규 tsc 오류, 10/10 route 보존, importer 호환 |

---

## 2. 파일별 상세 표

| 파일 | 줄 수 | 역할 | 판정 | 책임 혼합 | 비고 |
|------|-------|------|------|----------|------|
| `dashboard-assets.routes.ts` | 66 | Route 등록 전용 | **SAFE** | 없음 | business logic 0%, 순수 registration |
| `dashboard-assets.types.ts` | 80 | Type 정의 + 순수 helper | **SAFE** | 허용 수준 | `deriveDashboardStatus`, `computeExposure` 모두 순수 함수 |
| `dashboard-assets.query-handlers.ts` | 355 | 5개 GET handler | **SAFE** | ⚠️ 경미 | signals(supplier/seller)가 cross-domain이나 blocking 아님 |
| `dashboard-assets.mutation-handlers.ts` | 203 | 4개 PATCH/POST/DELETE | **SAFE** | 없음 | 단일 entity(CmsMedia) lifecycle 관리 |
| `dashboard-assets.copy-handlers.ts` | 350 | Copy dispatch + 3개 private 함수 | **SAFE** | 없음 | 단일 copy domain 응집도 |

---

## 3. 조사 항목별 결과

### 3.1 Route Facade 안전성 — SAFE

- `dashboard-assets.routes.ts` 66줄: 순수 route 등록만 수행
- business logic 잔존: **0건**
- 10개 route 모두 동일 HTTP method / path / middleware(`authenticate`) / 순서 유지
- importer: `register-routes.ts` 1곳, `createDashboardAssetsRoutes` export 변경 없음

### 3.2 Handler 책임 분리 — SAFE

- **query-handlers**: 5개 GET handler, query domain 집중
- **mutation-handlers**: 4개 PATCH/POST/DELETE, CmsMedia lifecycle 단일 책임
- **copy-handlers**: POST /copy + 3개 private copy 함수, copy domain 전용
- god-handler 후보: **없음** (각 handler 40~60줄)

### 3.3 `copy-handlers.ts` 350줄 별도 판단 — **유지 가능**

| 항목 | 결과 |
|------|------|
| 큰 이유 | copy dispatch(70줄) + 3개 source-type 함수(각 55줄) |
| 응집도 | **단일 copy domain** — 3함수 모두 동일 패턴(lookup → validate → options → create → save) |
| 분할 시 overhead | 3 파일 × 55줄 + dispatcher 30줄 → boilerplate 증가 30%+ |
| 판정 | **유지 가능** — 현재 상태가 적절한 단일 책임 묶음 |

Phase 2에서 copy variant가 독립 진화 시 분리 고려.

### 3.4 `query-handlers.ts` 355줄 별도 판단 — **유지 가능**

| 항목 | 결과 |
|------|------|
| 5개 handler 응집도 | 3개(list, copied-source-ids, kpi)는 dashboard asset query. 2개(supplier-signal, seller-signal)는 cross-domain(approval) |
| signals 분리 실익 | 각 30줄 × 2 = 60줄. 별도 파일 생성 시 import/boilerplate 증가 대비 실익 미미 |
| 판정 | **유지 가능** — signals가 cross-domain이나 blocking 수준 아님 |

후속 서비스 확장 시 signals를 partnership module로 이동 고려.

### 3.5 Types/Helper 적절성 — SAFE

- `deriveDashboardStatus()`: 순수 함수 (4줄 logic), DB 조회 없음, 3개 파일에서 import
- `computeExposure()`: 순수 함수 (15줄 logic), DB 조회 없음, query-handlers에서만 import
- god-helper 후보: **없음**
- type + helper 혼합: 허용 수준 (types 30줄 + helpers 50줄 = 80줄)

### 3.6 Dead Code / Orphan — SAFE

| 항목 | 결과 |
|------|------|
| 미사용 handler/helper/type | **0건** |
| import만 남은 함수 | **0건** |
| stale code | **0건** |
| 중복 status derivation | **없음** — `deriveDashboardStatus()` 1곳 정의, 2곳 import |
| 중복 exposure 계산 | **없음** — `computeExposure()` 1곳 정의, 1곳 import |
| 미호출 route handler | **0건** |

모든 type 사용 확인:
- `DashboardAssetSourceType` → copy-handlers (validation + type annotation)
- `TitleMode`, `DescriptionMode`, `TemplateType` → CopyOptions interface 내부
- `CopyOptions`, `CopyAssetRequest`, `CopyAssetResponse` → copy-handlers
- `ExposureLocation` → `computeExposure()` return type

### 3.7 API / Route 정합성 — SAFE

| 항목 | 결과 |
|------|------|
| 10개 route 전부 유지 | ✅ |
| path 중복/누락 | 없음 |
| middleware 연결 | `authenticate` 10/10 유지 |
| request/response 구조 | 변경 없음 |
| `register-routes.ts` 호환 | ✅ `createDashboardAssetsRoutes(dataSource)` 동일 |

### 3.8 Oversized 잔존 여부

| 파일 | 줄 수 | 판정 |
|------|-------|------|
| `query-handlers.ts` | 355 | **해소됨** — 500줄 미만, 5개 handler 분산 |
| `copy-handlers.ts` | 350 | **해소됨** — 500줄 미만, copy domain 단일 책임 |
| `types.ts` | 80 | **해소됨** — 적정 수준 |

**이번 분해로 oversized risk 완전 해소.**

---

## 4. 잔존 이슈

| 이슈 | 심각도 | 범위 | 조치 |
|------|--------|------|------|
| supplier/seller signals cross-domain | MINOR | query-handlers 60줄 | 현재 유지, Phase 2에서 partnership module 이동 고려 |
| auth/dashboardId 검증 반복 (9회) | MINOR | 전체 handler 108줄 | 공통 guard middleware 추출 고려 (Phase 2) |

**Blocking 이슈: 0건**

---

## 5. 다음 Oversized 정비 추천

### 완료 현황

| # | 대상 | 원본 줄 수 | 결과 | 상태 |
|---|------|-----------|------|------|
| 1 | `main.ts` | 1,019 | 66줄 (+ bootstrap/) | ✅ 완료 |
| 2 | `auth.middleware.ts` | 1,019 | 51줄 (+ auth/) | ✅ 완료 |
| 3 | `dashboard-assets.routes.ts` | 1,010 | 66줄 (+ handlers) | ✅ 완료 (현재) |

### 다음 후보 (남은 상위 5개)

| 순위 | 파일 | 줄 수 | 유형 | 분해 패턴 |
|------|------|-------|------|----------|
| **1** | `IncidentEscalationService.ts` | 976 | Service | types 추출 + class 분리 |
| **2** | `GracefulDegradationService.ts` | 967 | Service | types 추출 + handler 분리 |
| **3** | `AppManager.ts` | 951 | Service | lifecycle phase 분리 |
| **4** | `block-registry.service.ts` | 937 | Service | query/cache 분리 |
| **5** | `tenant-consolidation.service.ts` | 921 | Service | merge/split handler 분리 |

### 추천: 1순위 + 2순위 묶음 WO

`IncidentEscalationService.ts`(976줄)와 `GracefulDegradationService.ts`(967줄)는 동일 패턴:
- 대량 type/interface 정의(35~40%)가 service class와 혼합
- types 추출만으로 각 350줄+ 감소 가능
- **묶음 WO 권장**: `WO-O4O-INFRASTRUCTURE-SERVICES-TYPES-EXTRACTION-V1`

---

*조사 완료: 2026-03-23*
*조사자: AI (Claude)*
*상태: 완료 — Push 승인*
