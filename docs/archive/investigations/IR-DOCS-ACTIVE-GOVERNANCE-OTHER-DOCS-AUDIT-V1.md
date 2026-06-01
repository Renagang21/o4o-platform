# IR-DOCS-ACTIVE-GOVERNANCE-OTHER-DOCS-AUDIT-V1

> **목적**: prefix 없거나 비표준 명명인 문서 중 active governance 역할 문서 선별
> **범위**: docs/baseline, docs/architecture, docs/platform, docs/rules, docs/rbac, docs/reference (조사만)
> **날짜**: 2026-05-07
> **선행 IR**: IR-DOCS-HIGH-RISK-CANONICAL-RENAME-RECLASSIFICATION-V1

---

## 1. 조사 분류 기준

### 분류 코드

| 코드 | 설명 |
|------|------|
| **AG** | ACTIVE GOVERNANCE — 현재도 신규 개발 판단 기준 |
| **AS** | ACTIVE STANDARD — 표준/정책 문서, 위반 금지 조항 포함 |
| **AC** | ACTIVE CONTRACT — 계약적 선언, 변경 금지 |
| **AB** | ACTIVE BASELINE — frozen/stable 선언 |
| **AR** | ARCHITECTURE REFERENCE — 구조 설명, 현재 참조용 |
| **HR** | HISTORY/REPORT — 완료 기록, 이력 문서 |
| **LO** | LOW-PRIORITY OTHER — 드래프트, 낮은 활용도 |

### Rename 권고 코드

| 코드 | 설명 |
|------|------|
| **KAI** | KEEP AS IS — 현재 파일명 유지 |
| **SR** | SAFE TO RENAME — 기술적 위험 없음 |
| **RL** | RENAME LATER — 가능하지만 우선순위 낮음 |
| **DNR** | DO NOT RENAME — canonical 또는 high cross-ref |
| **MR** | MOVE TO REPORTS — reports/ 또는 investigations/ 이관 후보 |

---

## 2. 조사 결과 — 영역별

---

### 2.1 docs/baseline/ — 미분류 또는 비표준 후보

#### 2.1.1 core-boundary.md (lowercase)

| 항목 | 값 |
|------|------|
| 실제 제목 | Core Boundary |
| Status | Active (Phase G2 App Architecture) |
| 내용 성격 | Core vs Domain 상호작용 규칙, 패키지 의존 규칙 |
| 변경 금지 선언 | 명시 없음 (CLAUDE.md §3, §5 참조) |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | README.md 1건 (인덱스) |
| AI agent entry-point | 없음 |

**판정**: `AR` — 아키텍처 참조 문서. CLAUDE.md §3에서 이미 규칙 선언됨.

**Rename 권고**: `SR` — CORE-BOUNDARY-V1.md 로 uppercase + version 추가
- 기술 위험: 참조 1건(README만), CLAUDE.md 링크 없음
- 우선순위: 낮음

---

#### 2.1.2 NETURE-SUPPLIER-CODE-AUDIT-V1.md (baseline에 위치)

| 항목 | 값 |
|------|------|
| 실제 제목 | 공급자 상품 등록/수정 코드 정비 기초 자료 |
| 작성일 | 2026-03-26 |
| 내용 성격 | 코드 파일 현황 분석 (기초 자료) — 사전 조사 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | IR-NETURE-APPROVAL-REQUEST-STATE-AND-COUNT-TRUTH-AUDIT-V1.md 1건 (단순 링크) |

**판정**: `HR` — 사전 조사(audit) 기록. baseline이 아니라 investigations/가 적합.

**Rename 권고**: `MR` — `docs/investigations/IR-NETURE-SUPPLIER-CODE-AUDIT-V1.md`로 이관
- 기술 위험: docs/ 내 참조 1건 → 동시 업데이트 필요
- CLAUDE.md 링크: 없음

---

#### 2.1.3 TYPEORM-ENTITY-REGISTRATION-CLEANUP-REPORT-V1.md (baseline에 위치)

| 항목 | 값 |
|------|------|
| 실제 제목 | TypeORM 엔티티 등록 누락 정비 완료 보고 |
| 내용 성격 | 완료 보고서 — WO 실행 결과 기록 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `HR` — 완료 보고서. baseline이 아니라 reports/가 적합.

**Rename 권고**: `MR` — `docs/reports/TYPEORM-ENTITY-REGISTRATION-CLEANUP-REPORT-V1.md`로 이관
- 기술 위험: 참조 0건 → 무위험

---

#### 2.1.4 CHECKOUT-STABLE-DECLARATION-V1.md (내부 헤더: IR- prefix)

| 항목 | 값 |
|------|------|
| 실제 제목 (내부) | IR-O4O-CHECKOUT-STABLE-DECLARATION-V1 |
| Status | Stable (v0.80+ 기준) |
| 내용 성격 | Checkout Layer 안정화 선언 + legacy cleanup 이력 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | reports/IR-O4O-COSMETICS-PAYMENT-LEGACY-SWEEP-V1.md 1건 |

**주목**: 파일명(`CHECKOUT-STABLE-DECLARATION-V1`)과 내부 헤더(`IR-O4O-CHECKOUT-STABLE-DECLARATION-V1`)가 불일치.

**판정**: `AB` — Stable 선언이 포함된 baseline. 그러나 CLAUDE.md 미등재 = 낮은 active usage.

**Rename 권고**: `RL` — 내부 헤더와 파일명 불일치는 혼란 원인. 향후 `IR-O4O-CHECKOUT-STABLE-DECLARATION-V1.md`로 rename 또는 investigations/로 이관 검토.
- 우선순위: 낮음 (참조 1건)

---

#### 2.1.5 KPA-SIGNAGE-STRUCTURE-V1.md

| 항목 | 값 |
|------|------|
| Status | Frozen (구조 정비 완료) |
| 내용 성격 | KPA 시그니지 구조 기준선 (freeze 선언) |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AB` — Frozen baseline. CLAUDE.md 미등재 = 낮은 active usage. 현재 파일명 적절.

**Rename 권고**: `KAI` — 파일명 이미 표준, freeze 선언 문서이므로 이관 불필요.

---

#### 2.1.6 NETURE-DOMAIN-ARCHITECTURE-FREEZE-V1.md vs V3.md

| 항목 | V1 | V3 |
|------|----|----|
| CLAUDE.md 참조 | **있음** (`docs/architecture/...` 오기재, 실제 경로는 `docs/baseline/`) | IR 참조 있음 |
| docs/ 참조 | `IR-NETURE-STRUCTURE-FREEZE-V1.md` | `IR-NETURE-APPROVAL-REQUEST-*` |
| 내용 범위 | Price & Distribution Architecture | Layer 1~4 + Campaign 분리 |
| Status | FREEZE APPROVED | FREEZE APPROVED |
| 명시적 V1 대체 선언 | 없음 | 없음 |

**주목**: CLAUDE.md 339번 라인에서 V1을 참조하지만, IR 문서들은 V3를 최신 기준으로 사용. 두 문서가 병존 — V3가 V1을 사실상 대체했을 가능성 있으나 명시적 supersede 선언 없음.

**판정**: 양쪽 모두 `AB` — 별도 WO로 "V1 obsolete 선언 + CLAUDE.md V3 업데이트" 검토 필요.

**Rename 권고**: `DNR` (두 파일 모두) — 현재 문서 관계 불명확. 내용 검토 후 별도 WO 필요.

---

#### 2.1.7 STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md

| 항목 | 값 |
|------|------|
| Status | Active (Platform-wide) |
| 내용 성격 | StoreLocalProduct 경계 정책 선언, 변경 금지 조항 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | `investigation/IR-STORE-LOCAL-PRODUCT-IMPLEMENTATION-VALIDATION-V1.md` 2건 |

**판정**: `AC` — Active contract 성격. docs/ 내 2건 참조. 현재 파일명 적절.

**Rename 권고**: `KAI` — POLICY suffix + V1 번호 포함, 파일명 표준.

---

#### 2.1.8 USER-DOMAIN-SSOT-V1.md

| 항목 | 값 |
|------|------|
| Status | Active |
| 내용 성격 | User Domain 단일 소스 선언 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 (직접 참조 없음) |

**판정**: `AG` — SSOT 선언은 active governance. CLAUDE.md 미등재가 아쉬움.

**Rename 권고**: `KAI` — 파일명 표준.

---

#### 2.1.9 NETURE-DOMAIN-BOUNDARY-V1.md

| 항목 | 값 |
|------|------|
| 내용 성격 | Neture 도메인 책임 범위 및 타 도메인과의 경계 정의 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AR` — 경계 정의 문서. 현재 파일명 표준.

**Rename 권고**: `KAI`

---

#### 2.1.10 ROLE-POLICY-AND-GUARD-V1.md

| 항목 | 값 |
|------|------|
| Status | Active Policy + Frozen Baseline |
| 내용 성격 | Admin/Operator 역할 정책 및 Guard 기준선 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AG` — Active Policy + Frozen 이중 선언. CLAUDE.md §11 내용과 겹치지만 독립 baseline.

**Rename 권고**: `KAI` — 파일명 표준.

---

#### 2.1.11 O4O-AI-USAGE-FLOW-BASELINE-V1.md

| 항목 | 값 |
|------|------|
| Status | Active Baseline |
| 내용 성격 | AI 활용 흐름 기준 표준 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AB` — Active Baseline. 파일명 표준.

**Rename 권고**: `KAI`

---

#### 2.1.12 STORE-UI-CORE-FREEZE-V1.md

| 항목 | 값 |
|------|------|
| Status | FROZEN |
| CLAUDE.md 참조 | 없음 (F3 Store Layer에서 간접 포함) |
| docs/ 참조 | 없음 |

**판정**: `AB` — Frozen. 파일명 표준.

**Rename 권고**: `KAI`

---

### 2.2 docs/architecture/ — lowercase + 비표준 후보

#### 2.2.1 dropshipping-domain-rules.md (lowercase)

| 항목 | 값 |
|------|------|
| 실제 제목 | Dropshipping Domain Rules (DS-1) |
| Status | Active (Version 1.0.0) |
| 내용 성격 | 금지 항목, FK 강결합 금지 원칙, Core 테이블 직접 수정 금지 — 적극적 정책 선언 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AC` — Active Contract 성격. 금지 조항이 명시적. lowercase 파일명은 비표준.

**Rename 권고**: `SR` — `DROPSHIPPING-DOMAIN-RULES-V1.md`로 uppercase + V-number 추가
- 기술 위험: 참조 0건 → 무위험

---

#### 2.2.2 dropshipping-order-relay.md (lowercase)

| 항목 | 값 |
|------|------|
| 실제 제목 | Dropshipping Order Relay Architecture (DS-4.1) |
| Status | Active (Version 1.0.0) |
| 내용 성격 | 주문 중계 아키텍처 설계 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AR` — Architecture Reference. lowercase 비표준.

**Rename 권고**: `SR` — `DROPSHIPPING-ORDER-RELAY-ARCHITECTURE-V1.md`
- 기술 위험: 0건

---

#### 2.2.3 dropshipping-settlement-model.md (lowercase)

| 항목 | 값 |
|------|------|
| 실제 제목 | Dropshipping Settlement Model Architecture (DS-4.2) |
| Status | Active |
| 내용 성격 | 정산 모델 아키텍처 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AR` — Architecture Reference.

**Rename 권고**: `SR` — `DROPSHIPPING-SETTLEMENT-MODEL-V1.md`
- 기술 위험: 0건

---

#### 2.2.4 dropshipping-state-model.md (lowercase)

| 항목 | 값 |
|------|------|
| 실제 제목 | Dropshipping State Model Architecture (DS-4.3) |
| Status | Awaiting Approval |
| 내용 성격 | 상태 모델 아키텍처 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**주목**: Status: "Awaiting Approval" — 아직 미승인 상태.

**판정**: `LO` — Awaiting Approval = draft 수준. 실제 시스템에 반영 불명확.

**Rename 권고**: `SR` — `DROPSHIPPING-STATE-MODEL-V1.md`
- 기술 위험: 0건

---

#### 2.2.5 docs/architecture/ui/global-header-standard-v1.md (lowercase)

| 항목 | 값 |
|------|------|
| 실제 제목 | O4O Global Header / Layout / Navigation Standard v1.0 |
| Status | Active Standard |
| 내용 성격 | 모든 서비스가 따라야 할 Global Header 표준 원칙 |
| CLAUDE.md 참조 | 없음 |
| docs/ 참조 | 없음 |

**판정**: `AS` — Active Standard. 표준 원칙 선언. lowercase + 위치(ui/)가 비표준.

**Rename 권고**: `SR` — `O4O-GLOBAL-HEADER-STANDARD-V1.md`로 uppercase 정규화
- 기술 위험: 0건

---

### 2.3 docs/platform/promotion/ — UNDERSCORE 파일 6개

| 파일명 | Status | 내용 성격 | 판정 |
|--------|:---:|------|:---:|
| `PROMOTION_CORE_EXTENSION_BOUNDARY_V1.md` | **Draft** | Core vs 확장 경계 정의 | `LO` |
| `PROMOTION_DATA_MODEL_AND_API_SCOPE_V1.md` | **Draft** | 데이터 모델 + API 범위 | `LO` |
| `PROMOTION_PHASE1_EXECUTION_PLAN_V1.md` | **Draft** | Phase 1 실행 계획 | `LO` |
| `PROMOTION_SERVICE_SLOT_MATRIX_V1.md` | **Draft** | 서비스별 슬롯 매트릭스 | `LO` |
| `PROMOTION_SLOT_CATALOG_V1.md` | **Draft** | 공통 슬롯 카탈로그 | `LO` |
| `PROMOTION_UI_COMPONENT_STRATEGY_V1.md` | **Draft** | UI 컴포넌트 전략 | `LO` |

**공통 관찰**:
- 6개 전부 `Status: Draft`
- CLAUDE.md 참조 없음 (docs/ 내 cross-ref 없음)
- 파일명이 `UNDERSCORE_NAMING` — O4O 표준(`-` hyphen)과 불일치
- WO 없이 설계 문서만 존재 — 실행 여부 불명확

**Rename 권고**: `RL` — 일괄 `PROMOTION-*-V1.md` (underscore→hyphen) 정규화 가능
- 우선순위: 낮음 (draft 상태, 참조 없음)
- 단, Draft → Active 전환 전에 rename이 더 안전

---

### 2.4 docs/rbac/ — PLAN-/RBAC-DATA-NORMALIZATION 계열

| 파일명 | 내부 WO-ID | 내용 성격 | 판정 |
|--------|-----------|------|:---:|
| `PLAN-ROLE-DB-NORMALIZATION-V1.md` | WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 2 기반 | 역할 DB 정규화 계획 | `HR` |
| `PLAN-ROLE-ENUM-CLEANUP-V1.md` | Phase 2 기반 | Enum 정리 계획 | `HR` |
| `PLAN-ROLE-GUARD-REFACTOR-V1.md` | Phase 4 기반 | Guard 리팩터 계획 | `HR` |
| `PLAN-ROLE-UI-RENAMING-V1.md` | Phase 기반 | UI 이름 변경 계획 | `HR` |
| `RBAC-DATA-NORMALIZATION-DRYRUN-V1.md` | WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1 STEP 1 | Dry run 실행 기록 | `HR` |
| `RBAC-DATA-NORMALIZATION-EXECUTION-V1.md` | WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1 STEP 2-3 | 실행 기록 | `HR` |
| `ROLE-PHILOSOPHY-V1.md` | WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 1 | 역할 철학 결정 문서 | `HR` |

**공통 관찰**:
- PLAN- 파일들: WO Phase 실행 계획이었으나 WO-RBAC-FULL-STABILIZATION-V1 완료로 이미 실행됨
- RBAC-DATA-NORMALIZATION-*: 실행 기록 (완료)
- ROLE-PHILOSOPHY-V1: 역할 결정 이력 — 현재 RBAC-FREEZE-DECLARATION이 canonical
- CLAUDE.md 참조: 없음
- docs/ 외부 cross-ref: 없음

**Rename 권고**: `MR` — `docs/reports/` 또는 `docs/work-orders/` 이관 후보
- PLAN- → `docs/work-orders/WO-*` 또는 `docs/reports/`
- RBAC-DATA-NORMALIZATION-* → `docs/work-orders/` (실행 기록)
- ROLE-PHILOSOPHY-V1 → `docs/reports/` (이력)

---

### 2.5 docs/reference/ — 낮은 활용도 후보

| 파일명 | 내용 성격 | CLAUDE.md 참조 | 판정 |
|--------|------|:---:|:---:|
| `KPA-SOCIETY-PHASE2-MEMBERSHIP-DATA-MODEL.md` | Phase 2 설계 문서 | 없음 | `HR` |
| `KPA-SOCIETY-PHASE2-SERVICE-NAVIGATION-RULES.md` | Phase 2 설계 문서 | 없음 | `HR` |
| `KPA-SOCIETY-PHASE2-SIGNUP-AND-APPROVAL-FLOW.md` | Phase 2 설계 문서 | 없음 | `HR` |
| `kpa-society-auth-current-state.md` (lowercase) | Phase 0 완료 조사 (2026-02-06) | 없음 | `HR` |
| `ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md` | 완료 (CLOSED) | **CLAUDE.md 있음** | `HR` (완료) |

**관찰**:
- KPA-SOCIETY-PHASE2 3개: "Phase 2 설계 문서" 선언 — Phase 2가 완료되었는지 불명확
- `kpa-society-auth-current-state.md`: lowercase + Phase 0 Complete (2026-02-06) = 오래된 조사 기록
- `ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md`: Status CLOSED. CLAUDE.md에서 참조되지만 "규칙 문서"가 아니라 "완료된 분석 문서" — CLAUDE.md §2 ESM 규칙의 참조로 사용됨

**ESM 특수 케이스**: Status CLOSED이지만 CLAUDE.md에서 ESM 규칙의 근거 문서로 참조됨. 단순 삭제/이관 불가.

**Rename 권고**:
- `kpa-society-auth-current-state.md` → `SR`: `KPA-SOCIETY-AUTH-CURRENT-STATE-V1.md`로 uppercase + rename 가능 (참조 0건)
- KPA-SOCIETY-PHASE2 3개 → `RL`: Phase 2 완료 여부 확인 후 이관
- `ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md` → `KAI`: CLAUDE.md 링크 있음, 이관 위험

---

## 3. 최종 판정 총괄표

### 3A. 즉시 안전 Rename 후보 (SAFE TO RENAME, 참조 0건)

| # | 현재 파일명 | 권고 새 파일명 | 이유 |
|---|-----------|------------|------|
| 1 | `docs/architecture/dropshipping-domain-rules.md` | `DROPSHIPPING-DOMAIN-RULES-V1.md` | lowercase → uppercase + V-number |
| 2 | `docs/architecture/dropshipping-order-relay.md` | `DROPSHIPPING-ORDER-RELAY-ARCHITECTURE-V1.md` | lowercase |
| 3 | `docs/architecture/dropshipping-settlement-model.md` | `DROPSHIPPING-SETTLEMENT-MODEL-V1.md` | lowercase |
| 4 | `docs/architecture/dropshipping-state-model.md` | `DROPSHIPPING-STATE-MODEL-V1.md` | lowercase + Awaiting Approval |
| 5 | `docs/architecture/ui/global-header-standard-v1.md` | `O4O-GLOBAL-HEADER-STANDARD-V1.md` | lowercase |
| 6 | `docs/reference/kpa-society-auth-current-state.md` | `KPA-SOCIETY-AUTH-CURRENT-STATE-V1.md` | lowercase + Phase 0 완료 |

**공통 조건**: CLAUDE.md 참조 없음, docs/ 참조 없음, 파일 이동 없음 (제자리 rename)

---

### 3B. 위치 이관 후보 (MOVE TO REPORTS/WORK-ORDERS)

| # | 현재 경로 | 권고 경로 | 이유 |
|---|----------|----------|------|
| 1 | `docs/baseline/NETURE-SUPPLIER-CODE-AUDIT-V1.md` | `docs/investigations/IR-NETURE-SUPPLIER-CODE-AUDIT-V1.md` | 사전 조사 기록, baseline 부적합 |
| 2 | `docs/baseline/TYPEORM-ENTITY-REGISTRATION-CLEANUP-REPORT-V1.md` | `docs/reports/TYPEORM-ENTITY-REGISTRATION-CLEANUP-REPORT-V1.md` | 완료 보고서, 참조 0건 |
| 3 | `docs/rbac/PLAN-ROLE-DB-NORMALIZATION-V1.md` | `docs/work-orders/WO-PLAN-ROLE-DB-NORMALIZATION-V1.md` | 완료된 WO 계획 |
| 4 | `docs/rbac/PLAN-ROLE-ENUM-CLEANUP-V1.md` | `docs/work-orders/WO-PLAN-ROLE-ENUM-CLEANUP-V1.md` | 완료된 WO 계획 |
| 5 | `docs/rbac/PLAN-ROLE-GUARD-REFACTOR-V1.md` | `docs/work-orders/WO-PLAN-ROLE-GUARD-REFACTOR-V1.md` | 완료된 WO 계획 |
| 6 | `docs/rbac/PLAN-ROLE-UI-RENAMING-V1.md` | `docs/work-orders/WO-PLAN-ROLE-UI-RENAMING-V1.md` | 완료된 WO 계획 |
| 7 | `docs/rbac/RBAC-DATA-NORMALIZATION-DRYRUN-V1.md` | `docs/work-orders/WO-RBAC-DATA-NORMALIZATION-DRYRUN-V1.md` | 실행 기록 |
| 8 | `docs/rbac/RBAC-DATA-NORMALIZATION-EXECUTION-V1.md` | `docs/work-orders/WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1.md` | 실행 기록 |
| 9 | `docs/rbac/ROLE-PHILOSOPHY-V1.md` | `docs/reports/ROLE-PHILOSOPHY-V1.md` | 역할 결정 이력 |

**주의**: NETURE-SUPPLIER-CODE-AUDIT에 참조 1건 존재 → 동시 링크 업데이트 필요

---

### 3C. Rename 금지 (DO NOT RENAME / DO NOT TOUCH)

| 파일명 | 이유 |
|--------|------|
| `docs/baseline/core-boundary.md` | 참조 1건만, rename 가능하지만 우선순위 낮음 (RL) |
| `docs/baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V1.md` | CLAUDE.md 339 참조 → 내용 검토 + V3 관계 정리 선행 필요 |
| `docs/baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md` | IR 문서 2건 참조 → V1과 동시 처리 필요 |
| `docs/reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md` | CLAUDE.md 링크 있음, ESM 규칙 근거 |
| `docs/baseline/CHECKOUT-STABLE-DECLARATION-V1.md` | 내부 헤더와 파일명 불일치 — 내용 검토 선행 필요 |

---

### 3D. 현재 파일명 유지 (KEEP AS IS)

| 파일명 | 판정 | 이유 |
|--------|:---:|------|
| `KPA-SIGNAGE-STRUCTURE-V1.md` | AB | Frozen, 파일명 표준 |
| `STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md` | AC | Active Contract, 파일명 표준 |
| `USER-DOMAIN-SSOT-V1.md` | AG | Active Governance, 파일명 표준 |
| `NETURE-DOMAIN-BOUNDARY-V1.md` | AR | 파일명 표준 |
| `ROLE-POLICY-AND-GUARD-V1.md` | AG | Active Policy, 파일명 표준 |
| `O4O-AI-USAGE-FLOW-BASELINE-V1.md` | AB | 파일명 표준 |
| `STORE-UI-CORE-FREEZE-V1.md` | AB | Frozen, 파일명 표준 |
| 모든 PROMOTION_* 파일 | LO | Draft 상태, Active 전환 후 일괄 처리 권장 |

---

### 3E. 후순위 OTHER (낮은 활용도 / Draft)

| 파일명 | 이유 |
|--------|------|
| `docs/platform/promotion/PROMOTION_*` 6개 | Status: Draft 전부, CLAUDE.md 미등재, 참조 없음 |
| `docs/reference/KPA-SOCIETY-PHASE2-*.md` 3개 | Phase 2 설계 문서, 완료 여부 미확인 |
| `docs/rbac/ROLE-PHILOSOPHY-V1.md` | 역할 결정 이력, RBAC-FREEZE가 canonical |

---

## 4. 특수 이슈: NETURE-DOMAIN-ARCHITECTURE V1 vs V3

### 현황

| 항목 | V1 | V3 |
|------|----|----|
| CLAUDE.md 참조 | 있음 (오기재 경로) | 없음 |
| IR 문서 참조 | 있음 (구형) | 있음 (최신) |
| Frozen Date | 2026-03-01 | 2026-03-01 |
| 명시적 supersede | 없음 | 없음 |

### 권고

별도 WO 수행:
1. V1 내용과 V3 내용 차이 분석
2. V3가 V1을 완전 대체하는지 확인
3. V1에 "Superseded by V3" 헤더 추가 (또는 V3에 선행 문서 명시)
4. CLAUDE.md:339 링크를 V3로 업데이트

**이 작업은 이번 IR 범위 외** — 별도 WO 권장.

---

## 5. 다음 단계 WO 권고

### Phase 3C — 즉시 실행 (LOW risk, 참조 0건)

```
WO-DOCS-NAMING-PHASE3C-LOWERCASE-NORMALIZATION-V1
```

작업:
- docs/architecture/ lowercase 4개 → uppercase + V-number
- docs/architecture/ui/global-header-standard-v1.md → uppercase
- docs/reference/kpa-society-auth-current-state.md → uppercase

총 6개 파일, CLAUDE.md 업데이트 없음, 참조 업데이트 없음

---

### Phase 4A — 이관 (MEDIUM risk)

```
WO-DOCS-BASELINE-MISPLACED-FILES-MIGRATION-V1
```

작업:
- `docs/baseline/NETURE-SUPPLIER-CODE-AUDIT-V1.md` → `docs/investigations/`
- `docs/baseline/TYPEORM-ENTITY-REGISTRATION-CLEANUP-REPORT-V1.md` → `docs/reports/`

참조 1건 업데이트 포함

---

### Phase 4B — RBAC 이관 (MEDIUM risk)

```
WO-DOCS-RBAC-COMPLETED-PLANS-MIGRATION-V1
```

작업:
- `docs/rbac/PLAN-ROLE-*.md` 4개 → `docs/work-orders/`
- `docs/rbac/RBAC-DATA-NORMALIZATION-*.md` 2개 → `docs/work-orders/`
- `docs/rbac/ROLE-PHILOSOPHY-V1.md` → `docs/reports/`

참조 없음 → 무위험

---

### Phase 4C — Promotion underscore 정규화 (LOW risk)

```
WO-DOCS-PROMOTION-NAMING-NORMALIZATION-V1
```

작업:
- 6개 파일 `PROMOTION_*` → `PROMOTION-*` (underscore→hyphen)

Draft 상태 전환 후 처리 권장

---

### 별도 WO — NETURE-DOMAIN-ARCHITECTURE 버전 정리

```
WO-DOCS-NETURE-DOMAIN-ARCH-VERSION-CLARIFICATION-V1
```

작업:
- V1 vs V3 내용 비교 + supersede 관계 명시
- CLAUDE.md:339 링크 V3로 업데이트

---

## 6. Active Governance 문서 중 CLAUDE.md 미등재 목록 (관리 공백)

아래 문서는 Active 역할이지만 CLAUDE.md에 없음 → 향후 등재 검토 필요.

| 문서 | 역할 | 중요도 |
|------|------|:---:|
| `STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md` | AC — 경계 정책 | 높음 |
| `USER-DOMAIN-SSOT-V1.md` | AG — SSOT 선언 | 높음 |
| `ROLE-POLICY-AND-GUARD-V1.md` | AG — 역할 정책 | 높음 |
| `KPA-SIGNAGE-STRUCTURE-V1.md` | AB — Frozen | 보통 |
| `dropshipping-domain-rules.md` | AC — 금지 조항 | 보통 |
| `global-header-standard-v1.md` | AS — 표준 | 보통 |

---

*IR 완료: 2026-05-07*
*다음 WO 권고: WO-DOCS-NAMING-PHASE3C → WO-DOCS-BASELINE-MISPLACED-FILES-MIGRATION-V1 → WO-DOCS-RBAC-COMPLETED-PLANS-MIGRATION-V1*
*Status: Investigation Complete*
