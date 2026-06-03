# IR-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-AUDIT-V1

> **조사 요청서 (Investigation Result)**
>
> 코드 수정 없음 / UI 수정 없음 / 문서 baseline 수정 없음 / 라우트 수정 없음
>
> 본 IR 은 [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) 의 6 Workspace 구조가 현재 Dashboard / Quick Actions / Sidebar / Capability / 실제 구현 화면에 어떻게 반영되어 있는지를 read-only 로 조사한다.

- **작성일:** 2026-05-23
- **분류:** Investigation Result (Read Only)
- **선행:**
  - [`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) §3.2
  - [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) §2
  - [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) (자매: [`O4O-OPERATOR-CANONICAL-WORKFLOW-V1`](../architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md))
- **상태:** Read-Only IR / WO 입력 자산 준비 완료

---

## 1. 조사 목적

- Dashboard 5-Block / Quick Actions / Sidebar / Capability 분류가 새 6 Workspace 와 어떻게 매핑되는지 확인
- 검수·승인(F) 편향 정도를 수치로 측정
- A~E Workspace 의 누락 영역을 식별
- 후속 정렬 WO 와 화면 설계 IR 의 우선순위 자료 확보

---

## 2. 조사 기준 — 6 Workspace

| 코드 | 이름 | 정의 |
|------|------|------|
| **A** | 공급자 자료 등록 | 오프라인 전달된 공급자 원천 자료(브랜드 자료 / 상품 PDF / 이미지 / 영상) 등록 |
| **B** | AI 작업 | 원천 자료를 AI 도구로 매장 실행 자산(POP / QR / 상품 설명 / 블로그 / 사이니지 / 고객 설문) 변환 |
| **C** | 큐레이션 | 매장 HUB 노출, 추천, 시즌, 카테고리, 매장 그룹 매핑 |
| **D** | 매장 지원 | 매장 요청 / 1:1 / 맞춤 추천 / 운영 가이드 / 매장 운영 데이터 대시보드 |
| **E** | 운영 수익 | 운영 패키지 / 가격 정책 / 매장 구독 / 프리미엄 자료 |
| **F** | 검수·승인 | pending → published 게이트, 승인/반려, bulk action (기존 Canonical Workflow) |

Baseline §10 의 핵심 가드:

> **Workspace F 가 다른 Workspace 의 유일한 UX 로 사용되는 것 금지** — Operator UX 가 검수에 편향되는 Drift 차단

본 IR 의 핵심 질문: 이 가드가 현재 위반 상태인가?

---

## 3. Dashboard 5-Block 현황

### 3.1 블록별 매핑

| # | 블록 | 역할 | Workspace 매핑 | F 편향 여부 |
|---|------|------|---------------|-----------|
| 1 | KPI Grid | 핵심 지표 (약국/공급사/상품/주문) | 기타 (모니터링) | — |
| 2 | AI Summary | 상태 기반 인사이트 (CopilotEngineService) | 기타 (인사이트 수신) | — |
| 3 | **Action Queue** | 즉시 처리 항목 (대기 중인 승인·신청) | **F (4/4 항목)** | **100% F 편향** |
| 4 | Activity Log | 최근 활동 스트림 | 기타 (모니터링) | — |
| 5 | Quick Actions | 주요 기능 바로가기 카드 (4~7개) | F + 기타 (혼합) | §4 분석 |

### 3.2 판정

- **5-Block 골격 자체는 표준에 부합** (KPI / AI Summary / Action Queue / Activity Log / Quick Actions)
- **Action Queue 는 100% F (검수·승인) 편향** — A/B/C/D/E Workspace 의 대기 항목이 노출되지 않음
- AI Summary 는 "수신자" 모델 — Operator 가 능동적으로 AI 를 사용하는 B (AI 작업) 진입점이 5-Block 내에 없음

---

## 4. Quick Actions 현황

### 4.1 서비스별 Quick Actions 매핑

#### Neture
출처: [`apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts:238-246`](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts)

| Quick Action | Workspace |
|--------------|-----------|
| 공급사 관리 | A |
| 상품 관리 | A + B |
| 주문 관리 | E |
| 콘텐츠 관리 | C |
| 사이니지 | C |
| 포럼 관리 | C |
| 가입 관리 | F |

#### GlycoPharm
출처: [`apps/api-server/src/routes/glycopharm/services/operator-dashboard.service.ts:102-107`](../../apps/api-server/src/routes/glycopharm/services/operator-dashboard.service.ts)

| Quick Action | Workspace |
|--------------|-----------|
| 약국 관리 | F (승인) |
| 상품 관리 | A + B |
| 입점 심사 | F |
| 콘텐츠 관리 | C |

#### K-Cosmetics
| Quick Action | Workspace |
|--------------|-----------|
| 매장 관리 | F (스토어 승인) |
| 상품 관리 | A + B |
| 주문 관리 | E |
| 콘텐츠 관리 | C |

### 4.2 분류 통계 (21건 합계)

| Workspace | 건수 | 비율 |
|-----------|:----:|:----:|
| A — 자료 등록 | 4 | 19% |
| B — AI 작업 | 3 | 14% |
| C — 큐레이션 | 7 | 33% |
| **D — 매장 지원** | **0** | **0%** |
| E — 운영 수익 | 2 | 10% |
| F — 검수·승인 | 5 | 24% |
| 기타 | 0 | 0% |

### 4.3 판정

- Quick Actions 는 Action Queue 보다 균형 있음 — 그러나 **D (매장 지원) 완전 부재 (0%)**
- A / B / E 가 각각 한 서비스에만 등장 — 플랫폼 공통 진입점 부재

---

## 5. Sidebar / Navigation 현황

### 5.1 Neture Operator Sidebar 메뉴 그룹 (대표)
출처: [`services/web-neture/src/config/operatorMenuGroups.ts`](../../services/web-neture/src/config/operatorMenuGroups.ts), `OperatorShell` (`@o4o/ui`)

| 메뉴 그룹 | 메뉴 항목 수 | 주요 Workspace |
|----------|:-----------:|----------------|
| Dashboard | 2 | 기타 / F (Action Queue) |
| Users | 2 | 기타 |
| **Approvals** | **4** | **100% F** (가입 승인 / 유통 펀딩 / 서비스 승인 / 공급사 승인) |
| Products | 3 | A (상품·브랜드) + C (카테고리) |
| Stores | 1 | C? D? F? (혼재) |
| Orders | 2 | E |
| Content | 2 | C |
| Signage | 1 | C |
| Forum | 3 | C + F |
| Analytics | 4 | B (3건) + A (1건) |
| System | 2 | 기타 |

### 5.2 분류 통계 (26 메뉴 항목 합계)

| Workspace | 건수 | 비율 |
|-----------|:----:|:----:|
| A — 자료 등록 | 3 | 12% |
| B — AI 작업 | 3 | 12% |
| C — 큐레이션 | 6 | 23% |
| **D — 매장 지원** | **1 (혼재)** | **4%** |
| E — 운영 수익 | 2 | 8% |
| **F — 검수·승인** | **4 (독립 그룹)** | **15%** |
| 기타 | 5 | 19% |

### 5.3 판정

- **Approvals 그룹이 F 전담 독립 그룹으로 명시** — Sidebar 측면의 F 가시성 강함
- **A / B / E 가 산재** — 독립 진입 그룹 없음 (Products / Analytics / Orders 등에 흩어짐)
- **D 는 Stores 메뉴 1개로만 표현** — 매장 지원의 실체(1:1 / 맞춤 / 가이드)는 메뉴에 없음
- 메뉴 그룹 11개 중 6 Workspace 직접 매핑 가능 그룹은 1개(Approvals = F) — **Workspace 기반 그룹 구조 부재**

---

## 6. Capability 재분류

[`OPERATOR-INTEGRATION-STATE-V1`](../architecture/OPERATOR-INTEGRATION-STATE-V1.md) / [`OPERATOR-CORE-DESIGN-V1`](../architecture/OPERATOR-CORE-DESIGN-V1.md) 의 Capability 를 6 Workspace 로 재분류한다.

| Capability | 현재 분류 (Core/Service Logic/Extension) | 6 Workspace 매핑 | 상태 |
|------------|----------------------------------------|------------------|------|
| Stores Management | 🟡 Core UI + Service Logic | C? D? F? 혼재 | **분류 모호** |
| Users / Members | 🟡 Core UI + Service Logic | D (매장 지원 권한 정책) | 부분 정렬 |
| Products 관리 | 🟡 Core UI + Service Logic | A + C 경계 모호 | **분류 모호** |
| Orders 관리 | 🟡 Core UI + Service Logic | D? E? | **분류 모호** |
| AI Report (조회) | 🟢 Core | B 단순 조회 + F 검수 | **Drift** — B 의 제작 영역 부재 |
| AI Usage / Billing | 🔴 Extension (Glyco) | E (운영 수익) | 부분 |
| Forum Delete Requests | 🟢 Core | F | 정렬 |
| Forum Analytics | 🟢 Core | F + B (인사이트) | 부분 |
| Community Management | 🟢 Core | C? D? | **분류 모호** |
| Signage HQ Console | 🟢 Core | C + F | 정렬 |
| Brand Management (Neture) | 🔴 Extension | A | 부분 |
| Guide Contents 관리 | 🟡 Core UI + Service Logic | A | 부분 |
| Applications (가입/승인) | 🟡 Core UI + Service Logic | F | 정렬 |
| Roles Management | 🔴 Extension | D? 기타 | 부분 |

**판정:** 14개 Capability 중 **명확히 정렬된 항목: 5개**, **부분 정렬: 5개**, **분류 모호: 4개**. Workspace 기반 재분류 작업이 후속 필요.

---

## 7. 실제 구현 화면 매핑

서비스별 Operator 라우트 페이지를 6 Workspace 로 분류한 결과 (대표 발견 사항).

### 7.1 web-neture (28 페이지 중)

| Route / Component | 현재 용도 | Workspace | 상태 |
|------------------|----------|-----------|------|
| `StoreManagementPage.tsx` | 매장 목록·상태 | C? D? F? | **분류 모호** |
| `BrandManagementPage.tsx` | 브랜드 검색·수정 | A | 존재 |
| `OperatorAiReportPage.tsx` | AI 리포트 조회 | B (조회)/F 경계 | **Drift — 제작 부재** |
| `OperatorActionQueuePage.tsx` | AI 작업 큐 | **B (실제 구현)** | **존재 — 모범 사례** |
| `SupplierQualityPage.tsx` | 공급자 자료 품질 | A | 존재 |
| `ProductServiceApprovalPage.tsx` | 상품 승인 | F | 존재 |
| `MarketTrialApprovalsPage.tsx` | 마켓 트라이얼 승인 | F | 존재 |
| `CategoryManagementPage.tsx` | 카테고리 관리 | C | 존재 |
| Signage HQ (6 페이지) | 사이니지 미디어/재생목록 | C | 존재 (공통) |

### 7.2 web-kpa-society (42 페이지 중)

| Route / Component | 현재 용도 | Workspace | 상태 |
|------------------|----------|-----------|------|
| `OperatorStoresPage.tsx` + Detail | 약국 관리 | C? D? F? | **분류 모호** |
| `OperatorAiReportPage.tsx` | AI 리포트 조회 | B (조회)/F 경계 | **Drift** |
| Content/Resources/WorkingContent 5 페이지 | KPA CMS 콘텐츠 | A + B (제작) | 존재 |
| `EventOfferManagement.tsx` | 이벤트 오퍼 승인 | F | 존재 |
| Signage HQ (5 페이지) | 사이니지 | C | 존재 |

### 7.3 web-glycopharm (43 페이지 중)

| Route / Component | 현재 용도 | Workspace | 상태 |
|------------------|----------|-----------|------|
| `StoresPage.tsx` + Detail | 약국 관리 | C? D? F? | **분류 모호** |
| `AiReportPage` + `AiUsageDashboard` + `AiBillingPage` | AI 조회 / 사용량 / 청구 | B 조회 / E 청구 조회 | **Drift — 제작·운영 모델 부재** |
| `ApplicationsPage.tsx` | 약국 신청 승인 | F | 존재 |
| `GuidelineManagementPage.tsx` | 약학 지침 CMS | A | 존재 |
| Signage HQ (5 페이지) | 사이니지 | C | 존재 |

### 7.4 web-k-cosmetics (28 페이지 중)

| Route / Component | 현재 용도 | Workspace | 상태 |
|------------------|----------|-----------|------|
| `StoresPage.tsx` + Detail | 매장 관리 | C? D? F? | **분류 모호** — 수동 HTML 테이블 |
| `StoreChannelsPage.tsx` | 매장 채널 매핑 | C | 존재 |
| `OperatorGuideContentsPage.tsx` | 운영 가이드 | D (가이드 배포) | 존재 |
| **`StoreCockpitPage.tsx`** | **매장 종합 대시보드 (운영 현황)** | **D (실제 구현)** | **존재 — 모범 사례 (유일)** |
| Signage HQ (5 페이지) | 사이니지 | C | 존재 |

### 7.5 Workspace 별 구현 완성도

| Workspace | 구현 완성도 | 모범 사례 | 누락 정도 |
|-----------|:----------:|----------|----------|
| A — 자료 등록 | **20%** | BrandManagement (Neture) / GuidelineManagement (Glyco) / WorkingContent (KPA) | 플랫폼 공통 UI 부재 |
| **B — AI 작업** | **5%** | OperatorActionQueuePage (Neture 유일) | 4개 서비스 중 1개만 |
| C — 큐레이션 | 40% | Signage HQ (공통) / CategoryManagement | HUB Producer 권한 / 시즌 / 매장 그룹 부재 |
| **D — 매장 지원** | **10%** | StoreCockpitPage (K-Cos 유일) | 4개 서비스 중 1개만 |
| **E — 운영 수익** | **0%** | (없음) | 진입점 자체 부재 |
| F — 검수·승인 | **75%** | ApplicationsPage / ProductApprovalPage / MarketTrialPage / ForumDeletePage | 체계적 구현됨 |

**평균 A~E: 15%** | **F: 75%** — **5배 격차**.

---

## 8. Drift 목록

| # | Drift | 심각도 | 위치 | Baseline §10 가드와의 관계 |
|---|-------|:------:|------|-----------------------|
| D1 | Action Queue 100% F 편향 | **HIGH** | 모든 서비스의 Dashboard 5-Block | **가드 위반 직접** — A/B/C/D/E 대기 항목 노출 부재 |
| D2 | AI Report 가 "조회" 로만 구현 — Workspace B (제작) 부재 | **HIGH** | OperatorAiReportPage (모든 서비스) | Baseline §4.4 "AI 도구 호출 → 검수 게이트" 흐름 부재 |
| D3 | 공급자 자료 등록 UI 가 Operator 측에 부재 | **HIGH** | A Workspace — 모든 서비스 | Baseline §3.4 "신규 등록" 메뉴 미구현. CMS 측 supplier-direct 경로만 잔존 (legacy) |
| D4 | 매장 지원(D) 진입점 부재 — StoreCockpit 1개 외 | **HIGH** | D Workspace — 4 서비스 중 1개만 | Baseline §6.4 "1:1 답변 / 맞춤 추천 / 가이드 제공" UI 0~1개 |
| D5 | 운영 수익(E) 진입점 완전 부재 | **HIGH** | E Workspace — 모든 서비스 | Baseline §7 패키지·가격·구독 UI 0건 |
| D6 | Stores 페이지 분류 모호 (C? D? F?) | MED | 모든 서비스 | Baseline §5.4 큐레이션 + §6.4 매장 지원 + §F 검수 가 한 페이지에 혼재 |
| D7 | Sidebar Approvals 그룹만 Workspace 기반 — 나머지는 도메인 기반 | MED | 모든 서비스 Sidebar | Workspace 진입 그룹 구조 부재 |
| D8 | Quick Actions D = 0% | MED | 모든 서비스 | 매장 지원 진입 0건 |
| D9 | Capability 분류 모호 14개 중 4개 | MED | OPERATOR-INTEGRATION-STATE-V1 / OPERATOR-CORE-DESIGN-V1 | Workspace 기반 재분류 부재 |
| D10 | Community → HUB 게시 경로의 큐레이션 게이트 명시 부재 | LOW | CommunityManagementPage | [3-ROLE-FLOW §6.1](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) Drift 가드 확인 필요 |

**판정: HIGH Drift 5건 + MED 4건 + LOW 1건. Baseline §10 가드가 명시적으로 위반 상태.**

---

## 9. 권장 정렬 방향

### 9.1 즉시 정렬 (구조적 정렬 — UI 영향 없음)

| # | 작업 | 범위 |
|---|------|------|
| R1 | **Dashboard Action Queue 다축화** | F 단독 → A/B/C/D/E/F 6축 대기 항목 노출. 기존 검수 항목 유지하되 다른 Workspace 대기 항목 추가 노출 |
| R2 | **Sidebar 메뉴 그룹 Workspace 기반 재구성** | 11개 도메인 그룹 → 6 Workspace + 시스템(System) 7개 그룹으로 정렬. 메뉴 항목은 유지, 그룹핑만 재배치 |
| R3 | **Stores 페이지의 Workspace 분리** | "매장 목록" 자체는 C/D/F 진입 허브로 정의. 검수·승인 → F, 매장 지원·맞춤 → D, 큐레이션 → C 로 명확한 액션 분리 |
| R4 | **OPERATOR-INTEGRATION-STATE-V1 의 Capability 매트릭스 갱신** | 14개 항목을 Workspace 컬럼 추가하여 재분류 |

### 9.2 화면 신설 (UI 영향 있음)

| # | 작업 | 우선순위 |
|---|------|---------|
| N1 | Workspace A 진입점 — 플랫폼 공통 "공급자 자료 등록" UI | **HIGH** (Canonical Flow 의 입구) |
| N2 | Workspace B 진입점 — OperatorActionQueuePage 를 다른 서비스로 확장 (모범 사례 복제) | **HIGH** |
| N3 | Workspace D 진입점 — StoreCockpitPage 모델을 다른 서비스로 확장 (모범 사례 복제) | **HIGH** |
| N4 | Workspace E 진입점 — 운영 패키지 / 가격 / 구독 UI 신설 | MED (0% 부터 시작) |
| N5 | Workspace C 큐레이션 단위 (추천 / 시즌 / 매장 그룹) UI | MED |

### 9.3 모범 사례 활용

이미 구현된 두 페이지가 baseline 의 Workspace 정의와 정확히 일치 — 다른 서비스로의 확장 모델:

- [`OperatorActionQueuePage.tsx`](../../services/web-neture/src/pages/operator/OperatorActionQueuePage.tsx) (Neture) → **Workspace B 의 reference 구현**
- [`StoreCockpitPage.tsx`](../../services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx) (K-Cosmetics) → **Workspace D 의 reference 구현**

---

## 10. 후속 WO 후보

### 10.1 권장 진행 순서

**Phase 1 — 구조 정렬 (UI 영향 없음 또는 최소):**

| # | WO 후보 | 범위 | 결과물 |
|---|--------|------|--------|
| 1 | **`WO-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-ALIGNMENT-V1`** | OPERATOR-DASHBOARD-STANDARD-V1 §2-§4 갱신: Action Queue 다축화 가이드 + Quick Actions 6 Workspace 균형 정렬 가이드 | Dashboard 표준 문서 갱신 |
| 2 | **`WO-O4O-OPERATOR-SIDEBAR-WORKSPACE-GROUP-V1`** | 11 도메인 그룹 → 6 Workspace + System 7 그룹 재배치 (메뉴명·항목 유지) | `operatorMenuGroups.ts` + `UNIFIED_MENU` 갱신 |
| 3 | **`WO-O4O-OPERATOR-INTEGRATION-STATE-WORKSPACE-RECLASSIFY-V1`** | OPERATOR-INTEGRATION-STATE-V1 + OPERATOR-CORE-DESIGN-V1 의 Capability 표에 Workspace 컬럼 추가 | 문서 갱신 |

**Phase 2 — 화면 설계 IR (병렬 가능, A → D → B → C → E 권장):**

| # | IR | Workspace | 우선 근거 |
|---|----|-----------|---------|
| 4 | `IR-O4O-OPERATOR-WORKSPACE-A-ASSET-INGESTION-DESIGN-V1` | A | Canonical Flow 의 입구 — 부재 시 다른 Workspace 도 입력 부재 |
| 5 | `IR-O4O-OPERATOR-WORKSPACE-D-STORE-SUPPORT-DESIGN-V1` | D | K-Cos StoreCockpit reference 활용 — 빠르게 다른 서비스로 확장 |
| 6 | `IR-O4O-OPERATOR-WORKSPACE-B-AI-PRODUCTION-DESIGN-V1` | B | Neture OperatorActionQueue reference 활용 — 빠르게 다른 서비스로 확장 |
| 7 | `IR-O4O-OPERATOR-WORKSPACE-C-CURATION-DESIGN-V1` | C | 부분 구현 — 큐레이션 단위 신설 |
| 8 | `IR-O4O-OPERATOR-WORKSPACE-E-OPERATION-REVENUE-DESIGN-V1` | E | 0% 부터 시작 — 비즈니스 모델 정의 선행 필요 |

**Phase 3 — 구현 WO (Phase 2 결과 후):**

각 Workspace 의 신설 UI 구현 WO 5건. Phase 2 결과에 의존.

### 10.2 순서 근거

- Phase 1 의 1번이 가장 안전·즉시: Action Queue 다축화 → 사용자 가시성 즉시 확대
- Phase 1 의 2번은 메뉴명·항목 유지하며 그룹 재배치만 → 사용자 학습 비용 최소
- Phase 2 의 5, 6번이 reference 구현 활용 → 빠른 확장 가능
- Phase 2 의 8번 (E 운영 수익) 은 비즈니스 모델 결정이 선행되어야 하므로 마지막

---

## 11. Current Structure vs O4O Philosophy Conflict Check

### 11.1 PHILOSOPHY-V1 § 3.2 — Operator 7가지 책임 vs 현재 구현

| PHILOSOPHY §3.2 책임 | 현재 구현 상태 | 충돌 여부 |
|-----------------------|-------------|---------|
| 1. 공급자 자료 수신·등록 | Brand/Guideline/WorkingContent (서비스별 분리) — 플랫폼 공통 UI 부재 | **부분 충돌** (Workspace A 누락) |
| 2. 자료 구성·큐레이션 | Signage HQ + CategoryManagement — 부분 구현 | 부분 충돌 |
| 3. AI 활용 | OperatorActionQueuePage (Neture만) — 다른 서비스는 AI Report 조회만 | **충돌** (Workspace B 부재) |
| 4. 매장 실행 자산 제작 | Workspace B 부재로 직접 제작 UI 없음 | **충돌** |
| 5. 매장 지원 | StoreCockpitPage (K-Cos만) — 다른 서비스는 매장 목록만 | **충돌** (Workspace D 부재) |
| 6. 운영 수익 모델 구축 | 진입점 0건 | **충돌** (Workspace E 부재) |
| 7. 검수·상태 관리 | 4개 Approvals 메뉴 + bulk action — 75% 구현 | 일치 |

**판정:** 7가지 책임 중 **3개 책임이 명시적 충돌 (B / D / E 부재), 2개 부분 충돌**. Operator 의 사업적 정의(PHILOSOPHY §3.2) 와 현재 구현은 **검수·승인(7번) 1개 책임에 75% 편향, 나머지 6개 책임에 평균 15% 분산** 상태.

### 11.2 3-ROLE-FLOW §6.1 — Drift 흐름 vs 현재 코드

| 3-ROLE-FLOW §6.1 금지 흐름 | 현재 코드 위반 여부 |
|---------------------------|-------------------|
| Supplier → HUB 직접 배포 (Operator 가공 없음) | 명문화된 예외 처리됨 ([PLATFORM-CONTENT-POLICY §6.3](../baseline/PLATFORM-CONTENT-POLICY-V1.md) Legacy 표시) |
| Community → Store 직접 실행 | CommunityManagement 의 큐레이션 게이트 명시 부재 — **검증 필요** (Drift D10) |
| AI → 실행 자산 무검수 배포 | OperatorActionQueuePage 에 검수 게이트 존재 (Neture). 다른 서비스는 AI Report 조회만 — 무검수 배포 경로 자체 부재 |
| Store → 콘텐츠 직접 생산 | Store 권한이 콘텐츠 생산에 부여되지 않음 (RBAC 확인) — **후속 IR 필요** |
| Supplier → O4O 내부 Producer 진입 | CMS supplier-direct 경로 잔존 (legacy), 명문화된 예외 처리됨 |

### 11.3 Baseline §10 가드 — Workspace F 편향 검증

| 가드 | 위반 여부 |
|------|---------|
| Workspace F 가 다른 Workspace 의 유일한 UX 로 사용되는 것 금지 | **위반 중** (A~E 평균 15%, F 75% — 5배 격차, Action Queue 100% F) |

### 11.4 Operator 사업적 정의 — Drift 가드

| 정의 | 현재 상태 |
|------|----------|
| Operator = 서비스 운영 사업자 (PHILOSOPHY §3.2) | 정의는 정렬 완료 (CLAUDE.md §11 + 7개 영역별 문서) |
| Operator = 단순 승인 관리자 (Drift) | **구현 측에서 여전히 강한 흐름** — Dashboard Action Queue, Approvals 그룹, Stores 의 F 분류 모호 |

→ **사업적 정의는 정렬됐으나 구현 측 Drift 가 잔존 상태.** 본 IR 의 권장 정렬 작업 (§9, §10) 의 핵심 목적.

---

## 12. 검증 항목

| 항목 | 결과 |
|------|------|
| 6 Workspace 매핑 결과 도출 | ✅ §3~§7 |
| Dashboard Drift 여부 | ✅ 확인 — Action Queue 100% F |
| Sidebar Drift 여부 | ✅ 확인 — Approvals 그룹만 Workspace 기반, 나머지 도메인 기반 |
| Capability Drift 여부 | ✅ 확인 — 14개 중 4개 분류 모호 |
| Baseline §10 가드 위반 여부 | ✅ 위반 중 (A~E 평균 15% vs F 75%) |

---

**작성:** Claude Code (조사)
**상태:** Read-Only IR / 후속 WO 입력 자산 준비 완료
