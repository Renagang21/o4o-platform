# IR-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-AUDIT-V1

**작성 일자**: 2026-05-30
**작업 성격**: 조사 전용 (Investigation Only) — 코드 / DB / migration / commit 일절 없음
**상위 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md) §11 W5 의 사전 조사
**조사 도구**: 4개 병렬 Explore agent — backend / frontend dashboard / routes·menu·capability / GlucoseView residue
**선행 commit**: `cc334b1a3` (GlycoPharm membership guard) 기준 HEAD

---

## 0. 핵심 결론 (TL;DR)

> **GlycoPharm Care 정리 진행도 ~85%.** 라우트 / 메뉴 / 페이지 / API / DB 는 이미 정리 완료. **현재 5건의 잔재 + 1건의 정책 결정 항목**이 남아 있음.
>
> 1. **사용자 노출 잔재 (C)** — Admin dashboard 의 `ADMIN_KPI_KEYS` 화이트리스트에 `total-patients` / `high-risk-patients` / `open-care-alerts` 3개가 남아 backend KPI 응답을 렌더하려 함. backend 는 이미 STUB=0 만 반환하지만 frontend whitelist 와 backend STUB pipeline 모두 정리 필요.
> 2. **재도입 대비 보존 (B)** — `OperatorAlertMetrics` interface + alert logic / `AlertItem.type='care'` / `OperatorCapability.CARE` — 모두 메뉴 항목 0개로 사실상 비활성이나, 향후 Care 재도입 시 type contract 보존 의도 추정.
> 3. **dead code (D)** — `GROUP_TO_DOMAIN.care` orphan 매핑, `(counts['care-alerts'] || 0) === 0` always-true check.
> 4. **정리 이력 주석 (F)** — 6개 WO 주석 잔존, 트래킹 목적이라 유지.
> 5. **GlucoseView 잔재 — 5개 서비스 공유 패턴**: MemberBadges.tsx 의 `glucoseview:admin/operator` 뱃지 + RoleManagementPage SERVICE_OPTIONS + UserDetailPage SERVICE_LABELS — Neture/Cosmetics/KPA 도 같은 패턴 사용 중이라 단독 정리 위험. **정책 결정 IR 필요**.
> 6. **유지해야 할 표현 (A)** — CGM 카테고리, '당뇨인의 날' 캠페인 mock, `customer` 역할 ("당뇨인 정규"), `당뇨` 도메인 키워드 — GlycoPharm 사업 본질.

W5 진행 방향 권고: **단순 어휘 정리 아님**. (1) C 항목 frontend whitelist + backend STUB 정리는 작은 단위 WO 가능. (2) 보존 B 항목은 명시적 정책 결정 후 처리. (3) GlucoseView 공유 패키지 정리는 5개 서비스 함께 보는 별도 IR.

---

## 1. Executive Summary

| 구분 | 발견 건수 | 권장 처리 |
|------|:--------:|----------|
| A 현행 운영 필요 | ≥ 5 | 유지 |
| B 재도입 대비 보존 | 4 | 정책 결정 후 처리 |
| C 사용자 노출 잔재 (제거 대상) | 3+ | 작은 WO 로 즉시 정리 가능 |
| D dead code | 4 | 정리 가능 (저우선) |
| E shared 계약 위험 | 2 | 5개 서비스 횡단 IR 필요 |
| F 정리 이력 주석 / 마이그레이션 | 35+ | 유지 (감사 증거) |
| G GlucoseView 잔재 | 1 (table drop 완료) + 공유 packages | E 와 함께 처리 |

---

## 2. 현재 GlycoPharm 정책 기준 (사용자 명시)

- GlycoPharm = KPA-Society 와 같은 구조
- GlycoPharm 본질 = 당뇨 관련 커뮤니티 + 약국 경영자
- **Care 기능은 현재 운영자 공통화 / 구조 판단에서 현행 기능이 아님**
- 기존 Care 관련 기능은 **삭제된 상태로 취급**
- 향후 Care 는 다른 방식으로 재도입 가능 — 그러나 현재 dashboard / operator 공통화에서 기존 Care 잔재를 현행 기능처럼 다루지 않음
- **GlucoseView 는 코드 기준에서 완전히 삭제된 것으로 취급**

본 IR 의 모든 분류 기준은 이 정책에 정렬됨.

---

## 3. 검색 결과 요약 (분류별 통계)

| Class | 위치 수 | 대표 예 |
|:-----:|:------:|--------|
| A | 5+ | CGM 카테고리, customer 역할, 당뇨 캠페인 mock |
| B | 4 | OperatorAlertMetrics, AlertItem type, OperatorCapability.CARE, GROUP_TO_DOMAIN.care |
| C | 3 | ADMIN_KPI_KEYS 의 total-patients/high-risk-patients/open-care-alerts |
| D | 4 | care-alerts always-true check, /care*+/patients* dead routes, PharmacyPatients 파일 부재, ENABLED_CAPABILITIES.CARE (메뉴 없음) |
| E | 2 | MemberBadges glucoseview:role, SERVICE_OPTIONS/SERVICE_LABELS glucoseview |
| F | 35+ | WO 주석 6개, GlucoseView migration 28개, 정책 주석 등 |
| G | 1 + 공유 | glucoseview_customers DROP 완료 (migration `20260600000000`) + 공유 패키지 |

---

## 4. Backend Care/Patient 잔재

### 4.1 operator-dashboard.service.ts

| line | 발견 | class |
|-----:|------|:-----:|
| 29, 55 | `// WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: care/patient_health_profiles 쿼리 제거` | F |
| 56-60 | KPI 응답 = `active-pharmacies` / `active-products` / `total-orders` 만 (Care KPI 없음) | A (cleanup 완료) |
| 88-93 | STUB 0 4개 (`openCareAlerts`, `careAdoptionRate`, `highRiskPatients`, `weeklyCareActivity`) 를 `computeOperatorAlerts()` 에 넘김 | **C** (응답 pipeline 잔재) |

### 4.2 operator-alert.utils.ts

| line | 발견 | class |
|-----:|------|:-----:|
| 16-23 | `OperatorAlertMetrics` interface 에 `openCareAlerts`, `careAdoptionRate`, `highRiskPatients`, `weeklyCareActivity` 필드 | **B** (재도입 대비 type contract) |
| 40-97 | Care 메트릭 alert logic (4개 조건) | **B** (logic 보존, 그러나 input 항상 0 — never triggers) |

### 4.3 action-definitions.ts

| line | 발견 | class |
|-----:|------|:-----:|
| 38-43 | `// WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1: 'care-alerts' 정의 제거` | F |
| 74-76 | `(counts['care-alerts'] || 0) === 0` always-true check | **D** (의도된 dead check) |

### 4.4 insight-rules.ts

- glycopharm 분기 (line 88-92): `applications.pending` / `products.draft` 만 체크. **Care/patient rule 0건** ✅
- 전 서비스 분기에 Care rule 0건 (완전 cleanup 됨)

### 4.5 controllers / entities

| 파일:line | 발견 | class |
|----------|------|:-----:|
| pharmacy.controller.ts:28 | `{ id: 'cgm_device', name: 'CGM 기기', description: '연속혈당측정기' }` | **A** (혈당측정기 카테고리 — GlycoPharm 핵심) |
| pharmacy.controller.ts:194-198 | `// WO-O4O-GLUCOSEVIEW-POST-DROP-CLEANUP-V1 ... 향후 Care Core 기반으로 재설계` | F |
| public.controller.ts:48 | `title: '당뇨병 환자용 신규 영양제 Trial'` | A (정적 trial mock) |
| public.controller.ts:58 | `supplier: 'GlucoseView'` | **F** (정적 mock, 정리 가능 but 안전) |
| public.controller.ts:65 | `title: '당뇨인의 날 캠페인'` | A (정적 캠페인 mock) |
| roles.ts:72 | `'customer'` (당뇨인 정규 역할) | A (deprecate marker 없음) |

### 4.6 Capabilities

**`capabilities.CARE` enum 은 backend 에 존재하지 않음** ✅. `roles.ts` 에 platform/kpa/neture/glycopharm/cosmetics/lms service key 만 정의. 백엔드는 cleanup 완료.

---

## 5. Frontend Care/Patient 잔재

### 5.1 GlycoPharmAdminDashboard.tsx (**핵심 C 잔재**)

| line | 발견 | class |
|-----:|------|:-----:|
| 56-58 | `ADMIN_KPI_KEYS` 에 `'total-patients'`, `'high-risk-patients'`, `'open-care-alerts'` 3개 화이트리스트 포함 | **C** |
| 260, 265 | `const totalPatients = getKpiValue(...)` → networkStats 에 `'회원 수'` 라벨로 렌더 | **C** (시각 라벨은 '회원 수' 지만 key 는 total-patients) |

> Backend 가 STUB=0 만 반환하지만 frontend 는 **이 키를 화이트리스트로 받을 준비** 가 되어 있음. 정상 정리 시 ADMIN_KPI_KEYS 에서 제거 + backend STUB pipeline 제거 함께 권장.

### 5.2 GlycoPharmOperatorDashboard.tsx

| line | 발견 | class |
|-----:|------|:-----:|
| 31 | `AlertItem.type: 'network' \| 'commerce' \| 'care' \| 'system'` | **B** (backend 계약과 type 일치, 'care' 보존) |

### 5.3 OperatorAlerts.tsx

| line | 발견 | class |
|-----:|------|:-----:|
| 14 | 동일 `'care'` type 유니온 | **B** |

### 5.4 operatorConfig.ts (buildGlycoPharmOperatorConfig)

- pass-through builder, **하드코딩된 patient/Care KPI 없음** ✅

### 5.5 dashboard.ts

| line | 발견 | class |
|-----:|------|:-----:|
| 36 | `'customer': '/patient'` in GLYCOPHARM_DASHBOARD_MAP | **E** (route mapping — 향후 patient-facing portal 재도입 대비 추정) |

### 5.6 api/public.ts

| line | 발견 | class |
|-----:|------|:-----:|
| 75 | `'당뇨인용 신규 영양제 Trial'` static fallback | A |
| 85 | `supplier: 'GlucoseView'` static fallback | **F/G** |

---

## 6. Dashboard KPI 분석

### 6.1 Operator dashboard (5-Block)

- KPI: `active-pharmacies`, `active-products`, `total-orders` (STUB=0) — Care KPI 0건 ✅
- AI Summary: applications.pending / products.draft — Care 메시지 0건 ✅
- Action Queue: draft-products 만 — Care 항목 0건 ✅
- **Operator 영역은 정리 완료**

### 6.2 Admin dashboard (구조적 잔재)

| KPI key | Frontend whitelist | Backend STUB | 실제 렌더 |
|---------|:------------------:|:------------:|:--------:|
| total-patients | ✅ ADMIN_KPI_KEYS | (응답 형태 모름 — backend KPI 응답에 포함 안 됨) | networkStats 에 '회원 수' 라벨 위치 잡고 있음 |
| high-risk-patients | ✅ ADMIN_KPI_KEYS | (응답 형태 모름) | structure metrics 위치 확보 |
| open-care-alerts | ✅ ADMIN_KPI_KEYS | computeOperatorAlerts input STUB=0 | structure metrics 위치 확보 |

**구조적 위험**: Frontend whitelist 는 backend 가 이 key 들로 응답할 것을 기대함. backend 가 응답 안 하면 placeholder/blank 위치만 차지. backend 가 STUB pipeline 을 살려두는 한, frontend 도 정리 어려움.

**권고**: **frontend whitelist + backend STUB pipeline 동시 정리** (W5 가 W5a + W5b 로 쪼개질 수 있음).

---

## 7. AI Summary / Insight 분석

- insight-rules.ts: Care/patient rule **완전 제거 완료** ✅
- backend operator-dashboard.service.ts 의 `computeOperatorAlerts(STUB metrics)` 호출은 alert 결과로 0 건 반환 → frontend OperatorAlerts 에 표시될 'care' type alert 없음
- 잠재 위험: `OperatorAlertMetrics` interface 가 보존되어 있어 type 호환성을 유지. backend 가 향후 STUB 을 실 데이터로 바꾸면 즉시 alert 동작

**판정**: AI summary / insight layer 는 **현재 정상 cleanup 상태**. 추가 작업 없음.

---

## 8. Menu / Route 분석

### 8.1 Routes (App.tsx)

| path | 상태 | class |
|------|------|:-----:|
| `/care*` | 없음 | D (이미 제거) |
| `/patients*` | 없음 | D |
| `/store/services` (PharmacyPatients) | 제거됨, App.tsx line 65-66 주석으로 명시 | D + F |
| `/patient` (dashboard.ts:36 mapping) | App.tsx 에 매핑 — 확인 필요 | E |

### 8.2 Menu (operatorMenuGroups.ts)

| line | 발견 | class |
|-----:|------|:-----:|
| 95 | `// care group removed — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1` 주석만 | F |
| 157 | `care: 'common'` GROUP_TO_DOMAIN 매핑 (orphan — 바인딩되는 메뉴 항목 0개) | **D/B 경계** |
| 169 | DOMAIN_GROUP_ORDER.common = `['analytics', 'system']` (care 미포함) | A (정상 정리) |

---

## 9. Capabilities / Role 분석

### 9.1 operatorCapabilities.ts:13

`OperatorCapability.CARE` **ENABLED_CAPABILITIES 에 active**.

### 9.2 참조 위치

- `OperatorLayoutWrapper.tsx:18` import → `GlycoOperatorSidebar.tsx` 에 `capabilities={ENABLED_CAPABILITIES}` 전달
- `GlycoOperatorSidebar` 가 menu group 을 capability 로 gate
- 그러나 **UNIFIED_MENU 에 care group 의 menu item 0개** → capability 활성화의 visible effect 없음

### 9.3 판정

| 측면 | 판정 |
|------|:----:|
| 정의 (operatorCapabilities.ts:13) | **B** (재도입 대비 보존?) 또는 **D** (실효 0) |
| 참조 (Layout → Sidebar) | A (gating 메커니즘 자체는 유효) |
| Visible effect | **0** (메뉴 항목 없음) |

### 9.4 Role 분석

`roles.ts` 의 `customer` ("당뇨인 정규") — **유지 (A)**. deprecation marker 없음. service membership 용으로 활용 중.

---

## 10. GlucoseView 잔재 여부

### 10.1 Backend / DB

| 위치 | 상태 |
|------|:----:|
| `glucoseview_customers` 테이블 | **DROP 완료** (migration `20260600000000-DropGlucoseviewAndCgmTables.ts`) — G/A |
| Featured 제거 migration | 완료 |
| 테스트 계정 cleanup migrations | 완료 |
| `pharmacy.controller.ts:194-198` | "향후 Care Core 기반으로 재설계" 주석 — F |
| service-scopes.ts:38 | "glucoseview 제거됨" 주석 — F |

### 10.2 Frontend (web-glycopharm)

| 위치 | class |
|------|:-----:|
| `api/public.ts:85` `supplier: 'GlucoseView'` (fallback mock) | F/G (제거 안전, 실행 영향 미미) |

### 10.3 공유 Packages (E 분류 — **위험**)

| 위치 | 발견 |
|------|------|
| `packages/operator-ux-core/src/member-list/MemberBadges.tsx:50-51` | `'glucoseview:admin'`, `'glucoseview:operator'` 뱃지 정의 |
| `packages/ui/src/pages/operator/RoleManagementPage.tsx:70` | `SERVICE_OPTIONS` 에 `{ value: 'glucoseview', label: 'GlucoseView' }` |
| `packages/ui/src/operator-user-detail/UserDetailPage.tsx:5,50` | "5개 서비스 공통 (Neture, GlycoPharm, K-Cosmetics, KPA, GlucoseView)" 주석 + SERVICE_LABELS 에 `glucoseview: 'GlucoseView'` |
| `packages/cms-core/src/entities/Channel.entity.ts:56`, `CmsContent.entity.ts:48` | 주석 예시 — F |
| `packages/security-core/src/service-scope-guard.ts:32` | 주석 — F |
| `packages/platform-core/*` (2) | 주석/type — F |

**위험 이유**: 이 패턴은 Neture, GlycoPharm, K-Cosmetics, KPA, GlucoseView **5개 서비스 공유**. GlucoseView 만 제거하면 패키지 일관성이 깨짐. 함께 검토 필요.

### 10.4 정리 권고

- glucoseview_customers 테이블 DROP 은 정리 완료 (G/A) — 추가 작업 없음
- 공유 packages 의 glucoseview 잔재는 **별도 IR 로 분리** (Neture/Cosmetics/KPA 와 함께 5개 서비스 정합성 결정)

---

## 11. 삭제 / 보류 / 유지 후보 분류

### 11.1 즉시 정리 가능 (C / D)

| ID | 위치 | 내용 | 난이도 |
|----|------|------|:------:|
| C1 | GlycoPharmAdminDashboard.tsx:56-58 | ADMIN_KPI_KEYS 에서 `total-patients`/`high-risk-patients`/`open-care-alerts` 제거 | 소 |
| C2 | operator-dashboard.service.ts:88-93 | STUB metrics 4개 (openCareAlerts/careAdoptionRate/highRiskPatients/weeklyCareActivity) 를 computeOperatorAlerts 호출에서 제거 (또는 0 ↔ undefined alignment) | 소 |
| D1 | operatorMenuGroups.ts:157 | `care: 'common'` GROUP_TO_DOMAIN orphan 매핑 제거 | 매우 소 |
| D2 | action-definitions.ts:74-76 | `(counts['care-alerts'] || 0) === 0` always-true check 정리 | 소 |
| F1 | public.ts:85 / public.controller.ts:58 | `'GlucoseView'` supplier mock 라벨 → "예시 공급자" 등 중립 표현 | 매우 소 |

### 11.2 정책 결정 후 처리 (B)

| ID | 위치 | 결정 사항 |
|----|------|----------|
| B1 | operator-alert.utils.ts:16-97 | OperatorAlertMetrics + alert logic 유지 vs 제거. **재도입 대비**라면 유지 / Care 영구 폐기라면 제거 |
| B2 | OperatorAlerts.tsx:14 + GlycoPharmOperatorDashboard.tsx:31 | AlertItem `type: 'care'` 유니온 멤버 유지 vs 제거 (backend 계약 type 과 동기화 필요) |
| B3 | operatorCapabilities.ts:13 | OperatorCapability.CARE ENABLED_CAPABILITIES 포함 유지 vs 제거 (현재 visible effect 0) |
| B4 | dashboard.ts:36 | `'customer': '/patient'` 라우트 mapping — patient-facing portal 재도입 가능성 |

### 11.3 5개 서비스 횡단 IR 필요 (E)

| ID | 위치 | 결정 |
|----|------|------|
| E1 | packages/operator-ux-core/src/member-list/MemberBadges.tsx:50-51 | `glucoseview:admin/operator` 뱃지 제거 + Neture/KPA/Cosmetics 와 함께 정합 검토 |
| E2 | packages/ui/src/pages/operator/RoleManagementPage.tsx:70 + UserDetailPage.tsx | SERVICE_OPTIONS / SERVICE_LABELS 에서 glucoseview 제거 + 5개 서비스 enumeration 정합 |

### 11.4 유지 (A)

- `customer` 역할 (당뇨인 정규)
- CGM 카테고리 정의
- '당뇨인의 날' / '당뇨병 환자용 신규 영양제 Trial' mock data
- GlycoPharm 사업 본질 표현 (당뇨, 약국 경영자, 혈당관리)

### 11.5 정리 이력 / 마이그레이션 (F)

- 6개 WO 주석 잔존 (감사 증거)
- GlucoseView migration 28개 (drop / cleanup 기록)
- 정책 주석 (service-scopes.ts:38 등)

→ **유지 권장**.

---

## 12. 후속 WO / IR 후보

| ID (가칭) | 범위 | 분류 | 우선순위 |
|----------|------|:----:|:-------:|
| **W5a** `WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-PATIENT-KPI-WHITELIST-CLEANUP-V1` | GlycoPharmAdminDashboard.tsx:56-58 ADMIN_KPI_KEYS 에서 3개 키 제거 + (선택) backend STUB pipeline 정리 | C | 높음 |
| **W5b** `WO-O4O-GLYCOPHARM-BACKEND-CARE-ALERT-METRICS-CLEANUP-V1` | operator-dashboard.service.ts:88-93 의 STUB 4개 제거 + computeOperatorAlerts 호출 인자 정리. **B1 결정 의존** | C+B | 중간 |
| **W5c** `WO-O4O-GLYCOPHARM-MENU-DOMAIN-MAPPING-CARE-ORPHAN-CLEANUP-V1` | operatorMenuGroups.ts:157 `care: 'common'` 제거 + action-definitions.ts:74-76 dead check 정리 | D | 낮음 |
| **W5d** `WO-O4O-GLYCOPHARM-GLUCOSEVIEW-SUPPLIER-MOCK-CLEANUP-V1` | public.ts:85 / public.controller.ts:58 의 'GlucoseView' supplier mock 라벨 중립화 | F→정리 | 매우 낮음 |
| **I-α** `IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1` | OperatorAlertMetrics / AlertItem.type='care' / OperatorCapability.CARE / dashboard.ts '/patient' route 의 보존 vs 제거 정책 결정 | B | 중간 |
| **I-β** `IR-O4O-SHARED-PACKAGES-GLUCOSEVIEW-RESIDUE-CLEANUP-V1` | 5개 서비스 공유 packages 의 glucoseview 잔재 (MemberBadges, SERVICE_OPTIONS, SERVICE_LABELS) 정리 — Neture/KPA/Cosmetics 와 함께 정합 검토 | E | 중간 |

---

## 13. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) / [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) / [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) 정합 점검.

| 원칙 | 결과 | 발견 |
|------|:----:|------|
| §3 참여 주체 (공급자/운영사업자/매장) | ✅ | GlycoPharm 의 매장 경영자(약국) 모델 정합. customer 역할 (당뇨인) 도 정합 |
| §5 HUB 철학 (매장 HUB 운영) | ✅ | 매장HUB 축은 별도 axis 로 정상 유지 (operator/Care 와 분리) |
| §6 AI 역할 (수신 + 능동) | △ | AI Summary 영역에 Care rule 0건은 정합. operator-alert.utils.ts 의 보존된 Care alert logic 은 향후 AI 능동 영역 재도입 시 활용 가능 (B 보존 의도와 일치) |
| §7 Drift 방지 (도메인 어휘 격리) | ❌ | Admin dashboard ADMIN_KPI_KEYS 의 Care 어휘 (total-patients/high-risk-patients/open-care-alerts) drift. backend STUB pipeline 도 같은 어휘 보존 |
| Boundary Policy | ✅ | Domain Primary Boundary 위반 없음 (Care 가 service boundary 를 가로지르지 않음) |
| OPERATOR-DASHBOARD-STANDARD 6 Workspace | △ | Operator dashboard 는 5-Block 정합 (Care 미포함). Admin dashboard 의 patient KPI 는 운영자 6 Workspace 와 무관한 별도 트랙 |
| §11.2 Operator vs Admin scope | △ | Care KPI 가 Admin 영역에만 위치 — operator/admin 분리 자체는 정상이나 admin 의 Care KPI 가 실데이터 없이 잔존 → operator 영역 정합성에는 영향 없으나 admin 영역에 drift 잔존 |

> **종합**: Operator 영역은 §7 Drift 방지 정합. Admin 영역에 부분 drift (C 잔재). 정책 결정 (B) 항목은 §6 AI 역할 재도입 가능성과 §3 참여 주체 정의의 향후 진화 여부에 의존.

---

## 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 작성 문서 | `docs/investigations/IR-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-AUDIT-V1.md` |
| 코드 / DB / migration 수정 | **없음** ✅ |
| 핵심 발견 | (1) Admin ADMIN_KPI_KEYS 화이트리스트 + backend STUB pipeline 의 patient/Care KPI 잔재 — 즉시 정리 가능 (2) AlertItem.type='care' / OperatorAlertMetrics / OperatorCapability.CARE 보존 — 정책 결정 필요 (3) 공유 packages 의 glucoseview 잔재 — 5개 서비스 횡단 별도 IR 필요 |
| 즉시 삭제 가능 | C1 / C2 / D1 / D2 / F1 (총 5건, §11.1) |
| 보류해야 할 항목 | B1 / B2 / B3 / B4 (§11.2 — Care 재도입 정책 결정 필요) |
| 정책 결정 필요 | I-α (Care 재도입), I-β (공유 packages glucoseview 5개 서비스 횡단) |
| 후속 WO 제안 | W5a (Admin KPI whitelist), W5b (backend STUB pipeline), W5c (menu domain orphan), W5d (GlucoseView supplier mock) — §12 표 |
| Commit 여부 | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 조사 완료. 본 IR 문서 commit 은 사용자 승인 후 단일 파일 path-restricted commit 으로 진행 예정. W5 진행 방향은 본 IR 의 §11~§12 를 근거로 결정 가능.
