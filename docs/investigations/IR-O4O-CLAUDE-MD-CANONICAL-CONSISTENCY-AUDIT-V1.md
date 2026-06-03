# IR-O4O-CLAUDE-MD-CANONICAL-CONSISTENCY-AUDIT-V1

> **조사 요청서 (Investigation Result)**
>
> 코드 수정 없음 / CLAUDE.md 수정 없음 / Baseline 수정 없음 / UI 수정 없음
>
> 본 IR 은 최근 정비된 O4O 최상위 기준 문서들이 CLAUDE.md 전체와 정합한지 read-only 로 조사한다.

- **작성일:** 2026-05-23
- **분류:** Investigation Result (Read Only)
- **기준 문서:**
  - [`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md)
  - [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md)
  - [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md)
  - [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md)
  - [`O4O-OPERATOR-CANONICAL-WORKFLOW-V1`](../architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md)
- **조사 대상:** `CLAUDE.md` (437줄, 16개 섹션 + 상세 규칙 목록 + §15)
- **상태:** Read-Only IR / 후속 Fix WO 입력 자산 준비

---

## 1. 조사 목적

CLAUDE.md 가 새 Canonical 체인과 충돌하는지를 6개 영역으로 점검:

1. 우선순위 체인 정합성
2. Operator 정의 정합성
3. Dashboard / Workspace 정합성
4. Supplier / HubProducer 정합성
5. Store / Community / AI 책임 경계
6. 오래된 서비스/용어 잔재

---

## 2. CLAUDE.md 정합성 판정 (요약)

| 영역 | 판정 | Drift 등급 |
|------|------|:---------:|
| 1. 우선순위 체인 | 정렬 됨 (경미한 누락) | LOW |
| 2. Operator 정의 | 정렬 됨 (Canonical 정렬 노트 존재) | OK |
| 3. Dashboard / Workspace | 부분 정렬 (§11 핵심 규칙에 6 Workspace 미명시) | **MED** |
| 4. Supplier / HubProducer | 부분 정렬 (Legacy 표시 부재) | **MED** |
| 5. Store / Community / AI 책임 경계 | 정렬 됨 (직접 정의 없음, 간접 정렬) | OK |
| 6. 오래된 서비스/용어 잔재 | 정렬 됨 (GlucoseView 미소한 불일치 1건) | LOW |

**종합:** CLAUDE.md 는 이전 WO 체인 (Philosophy 등록 / 3-ROLE-FLOW 등록 / Operator 정의 정렬 / Non-Approval UX Baseline 등록) 으로 **이미 상당 수준 정합**. HIGH Drift 없음. MED 2건 + LOW 2건 의 **개선 권장 항목** 만 잔존.

---

## 3. HIGH / MEDIUM / LOW Drift 목록

### MED Drift (개선 권장)

#### D1 — §11 핵심 규칙에 6 Workspace 진입 허브 정의 누락 (MED)

**위치:** [CLAUDE.md §11 핵심 규칙 L267-270](../../CLAUDE.md)

**현재 문구:**

```text
2. **Dashboard**: 5-Block 구조 (`KPI` + `AI Summary` + `Action Queue` + `Activity Log` + `Quick Actions`)
   — `OperatorDashboardLayout` 컴포넌트 사용
3. **AI Summary**: Backend `CopilotEngineService.generateInsights()` 사용
   — Frontend client-side 생성 금지
```

**충돌:**

- `OPERATOR-DASHBOARD-STANDARD-V1 §5` 헤더 (2026-05-23 추가) 의 **"Dashboard 는 A~F 6 Workspace 진입 허브"** 원칙이 CLAUDE.md §11 핵심 규칙에 반영되지 않음.
- §11 헤더 (line 251-252) 에는 검수·승인 UX + Non-Approval UX Baseline 참조가 추가되어 있어 사용자가 detail 문서로 진입 가능하나, **CLAUDE.md 자체 본문 (§11 핵심 규칙) 만 읽었을 때 "Dashboard = 5-Block (KPI / AI Summary / Action Queue ...)"** 으로만 인식됨.
- Action Queue 가 6축 다축화 / Quick Actions 가 6 Workspace 균형이라는 표준이 CLAUDE.md 에서 보이지 않음.

**왜 MED:** detail 문서 참조 라인은 존재 (line 252) 하므로 정합성 체인은 끊어지지 않음. 그러나 CLAUDE.md 단독 독해 시 새 Canonical 의 핵심 (6 Workspace 진입 허브) 이 보이지 않음.

**제안 수정 방향 (Fix WO 시):**

- §11 핵심 규칙 #2 에 "6 Workspace 진입 허브" 한 줄 추가:
  ```text
  2. **Dashboard**: 5-Block 구조 — A~F 6 Workspace 진입 허브 (검수·승인 편향 금지). 상세는 OPERATOR-DASHBOARD-STANDARD-V1 §5-6~§5-9 참조.
  ```
- 또는 §11 헤더 Canonical 정렬 노트 (L256-258) 를 확장해 Dashboard 6 Workspace 원칙 1줄 추가.

---

#### D2 — §14 F4 (Platform Content Policy) 에 HubProducer='supplier' Legacy 표시 부재 (MED)

**위치:** [CLAUDE.md §14 F4 L332](../../CLAUDE.md)

**현재 문구:**

```text
| F4 | **Platform Content Policy** — HUB 3축 모델 (Producer/Visibility/ServiceScope) | 2026-02-23 | `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` |
```

**충돌:**

- [`PLATFORM-CONTENT-POLICY-V1 §3.1 / §3.2 / §6.3`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) 가 2026-05-23 갱신으로 **`HubProducer='supplier'` 를 Legacy / 명문화된 예외** 로 분류함.
- CLAUDE.md §14 F4 의 한 줄 요약 "HUB 3축 모델 (Producer/Visibility/ServiceScope)" 만 보면 모든 Producer 가 동등하게 Canonical 인 것처럼 읽힘.
- [`IR-O4O-HUBPRODUCER-POLICY-ALIGNMENT-AUDIT-V1`](IR-O4O-HUBPRODUCER-POLICY-ALIGNMENT-AUDIT-V1.md) 와 [`O4O-3-ROLE-FLOW-BASELINE-V1 §6.1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) 의 정렬 결과가 CLAUDE.md 의 최상위 view 에 반영되지 않음.

**왜 MED:** Freeze 문서 자체에는 명문화되어 있어 정합성은 유지되나, CLAUDE.md 의 한 줄 요약이 정합 상태를 충분히 표현하지 않음.

**제안 수정 방향:**

- F4 행 끝에 "(`HubProducer='supplier'` 는 Legacy 명문화 — 2026-05-23)" 주석 1행 추가.

---

#### D3 — `§ 사업 철학 SSOT` Row 4 가 너무 broad — Operator UX 자매 baseline 명시 부재 (MED → LOW 경계)

**위치:** [CLAUDE.md § 사업 철학 SSOT L12-17](../../CLAUDE.md)

**현재 표:**

```
| 순위 | 문서 | 역할 |
| 1 | CLAUDE.md | 기술/운영 규칙 |
| 2 | PHILOSOPHY-V1 | 사업 철학 SSOT |
| 3 | 3-ROLE-FLOW-BASELINE-V1 | 3자 Canonical Flow SSOT |
| 4 | 영역별 Freeze / Baseline / IR | 도메인·계층별 세부 규칙 |
```

**충돌:**

- Row 4 가 매우 broad 한 단일 bucket — Operator UX 의 자매 baselines (`OPERATOR-CANONICAL-WORKFLOW-V1` 검수 UX + `OPERATOR-NON-APPROVAL-UX-BASELINE-V1` 5 Workspace UX) 가 명시되지 않음.
- 상세 규칙 문서 목록 (line 343 이하) 에는 두 baseline 모두 등재되어 있으나, 우선순위 체인 자체에는 별도 row 가 없음.
- 결과: 우선순위 체인만 보면 Operator UX baseline 의 위치가 다른 모든 영역별 문서와 동등하게 보임.

**왜 MED→LOW:** 등재는 완료 (상세 규칙 문서 목록). 우선순위 체인의 표현 정밀도 문제만 잔존.

**제안 수정 방향 (선택):**

- Row 4 를 두 단계로 분리:
  ```
  | 4 | Operator UX baselines (Canonical Workflow + Non-Approval UX) | Operator UX 영역 SSOT |
  | 5 | 영역별 Freeze / Baseline / IR | 도메인·계층별 세부 규칙 |
  ```
- 또는 Row 4 의 "역할" 컬럼에 "단, Operator UX 영역은 CANONICAL-WORKFLOW + NON-APPROVAL-UX-BASELINE 자매 구조" 한 줄 추가.

---

### LOW Drift (개선 후순위)

#### D4 — PHILOSOPHY §4 (Canonical Flow) 가 우선순위 적용 항목 명시에서 누락 (LOW)

**위치:** [CLAUDE.md § 사업 철학 SSOT L21-22](../../CLAUDE.md)

**현재 문구:**

```text
- O4O-BUSINESS-PHILOSOPHY-V1 의 §3 (참여 주체) / §5 (HUB 철학) / §6 (AI 역할) / §7 (Drift 방지) 정의는 ...
```

**충돌:**

- PHILOSOPHY-V1 의 §4 (Canonical Flow — `공급자 → 운영사업자 → AI 활용 / 보완 / 큐레이션 / 구성 → 매장 HUB → 매장 실행 → 고객 경험 개선`) 는 우선순위 적용 §- 명시에 빠져 있음.
- §4 는 3-ROLE-FLOW-BASELINE-V1 §3 (Canonical Data Flow) 의 원점이며 사업 철학 차원의 흐름 정의이다.
- §3 / §5 / §6 / §7 만 명시되어 있어, "§4 흐름 정의" 가 cherry-picked 누락된 것처럼 보임.

**왜 LOW:** §4 가 정렬에서 빠진 것이 아니라 *적용 항목 명시*에서 빠진 것. 실제 정합성은 PHILOSOPHY 본문 + 3-ROLE-FLOW 본문에서 유지됨.

**제안 수정 방향:**

- L21 의 §3 / §5 / §6 / §7 나열에 §4 추가:
  ```text
  O4O-BUSINESS-PHILOSOPHY-V1 의 §3 (참여 주체) / §4 (Canonical Flow) / §5 (HUB 철학) / §6 (AI 역할) / §7 (Drift 방지) 정의는 ...
  ```

---

#### D5 — §6 인프라 서비스 목록과 OPERATOR-DASHBOARD-STANDARD §2-1 GlucoseView 불일치 (LOW)

**위치:**
- [CLAUDE.md §6 L156-166](../../CLAUDE.md) — 5개 서비스만 (`o4o-core-api`, `neture-web`, `glycopharm-web`, `k-cosmetics-web`, `kpa-society-web`)
- [`OPERATOR-DASHBOARD-STANDARD-V1 §2-1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) — GlucoseView role 명시 (`glucoseview:admin / glucoseview:operator`)

**충돌:**

- CLAUDE.md §6 에는 GlucoseView 서비스가 인프라 목록에 없음.
- OPERATOR-DASHBOARD-STANDARD-V1 §2-1, §6-5, §8 에는 GlucoseView 가 role / Capability / 정비 대상으로 명시되어 있음.
- GlucoseView 가 **계획됨 / 미배포 / 폐기** 중 어느 상태인지 CLAUDE.md 만으로는 알 수 없음.

**왜 LOW:** Operator Standard 의 GlucoseView 는 KPI 매트릭스 (§6-5) 에서 일부 capability 만 매핑 (Network / Care / Content / Analytics) — 부분적 정의. CLAUDE.md §6 의 인프라 목록과 일치시킬지, 또는 GlucoseView 를 미배포로 명시할지 정책 결정 필요.

**제안 수정 방향:**

- (Option A) GlucoseView 가 미배포라면 OPERATOR-DASHBOARD-STANDARD-V1 §2-1 / §6-5 / §8 에서 GlucoseView 행을 "TBD / Planned" 로 표시.
- (Option B) GlucoseView 가 배포 예정이라면 CLAUDE.md §6 에 "(예정)" 표시로 추가.
- 본 IR 은 결정하지 않음 — 사용자 / 도메인 확정 필요.

---

### 정렬 확인됨 (No Drift)

#### V1 — Operator 정의 정합성

CLAUDE.md §11 Admin / Operator 역할 구분 표:
- L256-258 에 **Canonical 정렬 노트** 가 명시되어 있음 — 사업적 정의는 PHILOSOPHY §3.2 ("서비스 운영 사업자")
- L263 "Operator | 운영 + 콘텐츠 + 모니터링 (권한 매트릭스 — 사업적 정의는 위 노트 참조)" — Drift 방지 표현 명시
- 검색 결과: "승인 관리자" / "상태 관리 역할" / "AI 리포트 조회자" 등 Drift 표현 **CLAUDE.md 본문에 잔존하지 않음**

**Status: 정렬 완료.**

#### V2 — Store / Community / AI 책임 경계

CLAUDE.md 는 Store / Community / AI 의 책임을 직접 정의하지 않음 — 정의는 PHILOSOPHY §3.3 / §3.4 / §6 에 위임.
- §5 O4O Store & Order: Store Production Material Canonical 참조 (line 145-152) — 정렬됨
- §10 KPA Society 구조: Forum 의 community 소속 명시 (line 243) — 정렬됨
- §11 핵심 규칙 #3: AI Summary 가 Backend CopilotEngineService 사용 (기술 정책) — PHILOSOPHY §6 (AI = 보조 도구) 와 무충돌

**Status: 정렬 완료 (간접 정렬).**

#### V3 — Operator UX 자매 baseline 등재

상세 규칙 문서 목록 (L398-399):
- `Operator Canonical Workflow V1` (검수·승인 UX) — 등재
- `Operator Non-Approval UX Baseline V1` (5 Workspace) — 등재

§11 헤더 (L251-252):
- 검수·승인 UX 참조 라인
- 검수 외 5개 Workspace UX 참조 라인

**Status: 등재 완료.**

---

## 4. 즉시 수정 필요 항목

본 IR 의 조사 결과 **즉시 수정 필요한 HIGH Drift 는 없음**.

다만 MED 3건은 **다음 사이클 (CLAUDE.md Fix WO)** 에서 처리 권장:

| 우선순위 | 항목 | 수정 규모 |
|:-------:|------|---------|
| 1 | D1 — §11 핵심 규칙 #2 에 6 Workspace 진입 허브 1줄 추가 | 1-2 줄 |
| 2 | D2 — §14 F4 에 HubProducer='supplier' Legacy 표시 1줄 | 1줄 |
| 3 | D3 — § 사업 철학 SSOT Row 4 분리 또는 주석 | 1-3 줄 |
| 4 | D4 — § 사업 철학 SSOT 적용 항목에 §4 추가 | 1 단어 |
| 5 | D5 — GlucoseView 상태 결정 (별도 확정 필요) | 결정 후 표시 |

총 예상 수정량: **5-10 줄**. 매우 가벼운 정합성 fix.

---

## 5. CLAUDE.md 정합성 종합 판정

```text
PHILOSOPHY 등록      ✅ (line 8-26)
3-ROLE-FLOW 등록     ✅ (line 8-26)
Operator 정의 정렬   ✅ (line 254-263)
Operator UX 등재     ✅ (line 251-252, line 398-399)
6 Workspace 정의     ⚠ (§11 핵심 규칙 부분 누락 — MED)
HubProducer Legacy   ⚠ (§14 F4 표시 누락 — MED)
우선순위 체인 정밀화 ⚠ (Row 4 broad — MED→LOW)
PHILOSOPHY §4 적용   △ (명시 누락 — LOW)
GlucoseView          △ (서비스 목록 불일치 — LOW)
```

**결론:** CLAUDE.md 는 정합 체인에서 **사실상 정렬됨**. 잔존 Drift 는 모두 **표현 정밀도 / 명시 누락** 차원이며, 정합성 자체를 위협하지 않음. Fix WO 의 작업 규모는 5-10 줄 수정으로 종결 가능.

---

## 6. 후속 WO 권장 순서

### 1단계 — 즉시

**`WO-O4O-CLAUDE-MD-CANONICAL-CONSISTENCY-FIX-V1`** (단일 WO, 5-10 줄 수정)

범위:
- D1 — §11 핵심 규칙 #2 에 6 Workspace 진입 허브 명시
- D2 — §14 F4 에 HubProducer Legacy 주석
- D3 — § 사업 철학 SSOT Row 4 분리 또는 명시
- D4 — § 사업 철학 SSOT 적용 항목에 PHILOSOPHY §4 추가

금지:
- §0 환경 원칙 / §1-§10 기술 규칙 변경 금지 (정합성 fix 만)
- 코드 / API / Baseline 변경 금지

### 2단계 — 사용자 결정 후

**D5 GlucoseView 상태 결정** — 별도 사용자 / 도메인 결정 필요. 본 IR 의 단일 미해결 항목.

### 3단계 — 다음 사이클

CLAUDE.md 정합성 fix 완료 후 다음 진행 후보:

| # | 작업 |
|---|------|
| 1 | `WO-O4O-OPERATOR-SIDEBAR-WORKSPACE-GROUP-V1` (Phase 1 #2 — Sidebar 정렬) |
| 2 | `WO-O4O-OPERATOR-INTEGRATION-STATE-WORKSPACE-RECLASSIFY-V1` (Phase 1 #3) |
| 3 | `IR-O4O-OPERATOR-WORKSPACE-A-ASSET-INGESTION-DESIGN-V1` (Phase 2 — Workspace A 화면 설계) |
| 4 | `WO-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-IMPLEMENTATION-V1` (실제 코드 구현) |

---

## 7. 확인 항목

| 항목 | 결과 |
|------|------|
| 6 audit 영역 모두 점검 완료 | ✅ §3 |
| HIGH Drift 존재 여부 | ✅ **없음** |
| MED Drift 식별 | ✅ 3건 (D1, D2, D3) |
| LOW Drift 식별 | ✅ 2건 (D4, D5) |
| 정렬 확인 항목 | ✅ V1 (Operator 정의), V2 (Store/Community/AI), V3 (Operator UX 등재) |
| 즉시 fix 가능한 항목과 결정 필요 항목 분리 | ✅ §4 |
| 후속 WO 권장 순서 | ✅ §6 |

---

**작성:** Claude Code (조사)
**상태:** Read-Only IR / `WO-O4O-CLAUDE-MD-CANONICAL-CONSISTENCY-FIX-V1` 입력 자산 준비 완료
