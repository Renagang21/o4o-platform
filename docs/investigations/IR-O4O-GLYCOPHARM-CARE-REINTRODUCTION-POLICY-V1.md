# IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1

**작성 일자**: 2026-05-30
**작업 성격**: 정책 결정 IR (Policy Decision Investigation) — 코드 / DB / migration / commit 일절 없음
**상위 IR**: [IR-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-AUDIT-V1](IR-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-AUDIT-V1.md)
**선행 작업**: W5a (`741e59b4e` Admin KPI whitelist) / W5c (no-op closure)
**인접 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1.md) (`ec2bcc9c1`, 5개 서비스 capability 정합 트랙)
**조사 도구**: 2개 병렬 Explore agent — shared packages 영향 / GlycoPharm Care contract 잔재 결합 매핑

---

## 0. 핵심 결론 (TL;DR)

> **정책 권고: 옵션 A 영구 폐기 (Patient-centric Care contract 완전 제거).**
>
> 1. **사용자 정책 전제 정합** — "GlycoPharm = KPA-Society 와 같은 구조" + "기존 Care 잔재를 현행 기능처럼 다루지 않음" 이 strict 적용되면 patient-centric Care contract 는 **legacy**.
> 2. **재도입 시 패러다임 변경** — 코드 주석 ("향후 Care Core 기반으로 재설계") + 정책 전제 ("다른 방식으로 재도입") 모두 **새 Core 설계** 시사. 즉 patient-centric metric (highRiskPatients/total-patients/openCareAlerts) 은 재도입 시에도 그대로 재사용되지 않을 가능성이 높음.
> 3. **단독 제거 가능 항목 4건** — Frontend AlertItem type union 'care' (2 파일), GROUP_TO_DOMAIN.care orphan, ENABLED_CAPABILITIES.CARE — 모두 단독 제거 시 영향 0건.
> 4. **결합 클러스터 1건** (Backend Alert) — OperatorAlertMetrics interface + computeOperatorAlerts logic + STUB metrics 묶음. Care care 필드 4개만 제거 (interface 자체는 pendingApplications 등 공유 필드 유지).
> 5. **Shared package 정리 가능** — `OperatorCapability.CARE` (packages/types) / `OperatorGroupKey 'care'` (packages/ui) / `STANDARD_GROUPS care entry` (packages/ui) — GlycoPharm 의 ENABLED_CAPABILITIES 만 정리하면 KPA/Neture/K-Cosmetics 영향 없음. shared package level 정리는 별도 트랙 (W5c-v2).
> 6. **재도입 시 보존 가치** — FeatureIntroPage 'care' config (UI asset), SoftGuard pattern (구조), computeOperatorAlerts pattern (logic shape — care 필드 빼고 일반화) 는 별도 보존 가능. **별도 Care Core 설계 시 새 metric/contract** 권고.

I-α 의 정책 결정: **옵션 A**. 후속 WO 4건으로 분리하여 결합도 낮은 순으로 진행.

---

## 1. Executive Summary

### 정책 판단

| 옵션 | 내용 | 권장 |
|------|------|:----:|
| **A** | 영구 폐기 — patient-centric Care contract 모두 정리, 재도입 시 새 Core 처음부터 설계 | ✅ **권장** |
| B | 부분 보존 — type contract 만 유지 (AlertItem.type='care', OperatorCapability.CARE 등) | △ (정의만 잔존, dead type 유지 비용) |
| C | 현상 유지 — 모두 그대로 | ❌ (orphan / dead code 누적) |

### 옵션 A 권장 근거 4가지

1. **사용자 정책 전제 정합**: "GlycoPharm = KPA-Society 같은 구조" → KPA 는 Care 컨셉 없음. 정합하려면 patient-centric Care contract 제거.
2. **재도입 패러다임 변경 시사**: 코드 주석 "향후 Care Core 기반으로 재설계" → 새 Core 설계 시 기존 patient-centric metric (highRiskPatients 등) 그대로 재사용 가능성 낮음.
3. **GlucoseView 완전 폐기와 정합**: GlucoseView 패러다임 (환자 데이터 수집·분석) 이 Care contract 의 모태 — 그 패러다임이 폐기된 이상 contract 도 동반 폐기 자연.
4. **시각화 / 유지 비용**: dead type / orphan 매핑은 향후 dashboard 정합 검토 시 noise. type 정리가 reader cognitive load 낮춤.

### 영향 범위 요약

| Layer | 정리 가능 항목 | 단독 가능 | 결합 필요 |
|-------|:-------------:|:---------:|:---------:|
| Frontend (GlycoPharm) | 4 | 4 | 0 |
| Backend (GlycoPharm) | 3 | 0 | 3 (cluster) |
| Shared packages | 3 | 1 | 2 |

총 **10건** 정리 후보. 단독 가능 5건 / 결합 5건.

---

## 2. 현재 GlycoPharm Care 정책 전제 (사용자 명시)

- GlycoPharm = KPA-Society 와 **같은 구조**
- GlycoPharm 본질 = 당뇨 관련 커뮤니티 + 약국 경영자 (patient management 아님)
- **Care 기능은 현재 운영자 공통화 / 구조 판단에서 현행 기능 아님**
- 기존 Care 관련 기능은 **삭제된 상태로 취급**
- 향후 Care 재도입 가능성은 있으나 **현재 dashboard / operator 공통화에서는 기존 Care 잔재를 현행 기능처럼 다루지 않음**
- GlucoseView 는 **완전 삭제된 것으로 취급**

본 IR 의 모든 권고는 이 정책 전제와 정렬됨.

---

## 3. 남아 있는 Care 관련 contract 목록 (10건 전체)

### 3.1 Frontend (GlycoPharm web)

| # | 위치 | 종류 | 결합도 |
|:-:|------|------|:------:|
| F1 | `OperatorAlerts.tsx:14` `AlertItem.type='network'\|'commerce'\|'care'\|'system'` | type union member | **낮음** (unused) |
| F2 | `GlycoPharmOperatorDashboard.tsx:31` 동일 type union | type union member | **낮음** |
| F3 | `operatorMenuGroups.ts:157` `care: 'common'` GROUP_TO_DOMAIN | orphan mapping | **낮음** |
| F4 | `operatorCapabilities.ts:26` ENABLED_CAPABILITIES.CARE | capability enable | **낮음** (visible effect 0) |
| F5 | `FeatureIntroPage.tsx:15,23` FeatureType 'care' + config | UI asset | **중간** (App.tsx SoftGuard 의존) |
| F6 | `App.tsx:365` SoftGuard `feature: 'care'` | route guard | **중간** (F5 와 묶음) |
| F7 | `operatorMenuGroups.ts:95` 주석 "care group removed — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1" | 정리 이력 주석 | 없음 (F 유지) |
| F8 | `dashboard.ts:36` `'customer': '/patient'` | role-route mapping | **독립** (Care 와 무관) |

### 3.2 Backend (api-server glycopharm)

| # | 위치 | 종류 | 결합도 |
|:-:|------|------|:------:|
| B1 | `operator-alert.utils.ts:15-23` `OperatorAlertMetrics` interface (care 필드 4개) | interface | **매우 높음** |
| B2 | `operator-alert.utils.ts:36-126` alert logic (care 규칙 4개) | function logic | **매우 높음** |
| B3 | `operator-dashboard.service.ts:88-93` STUB metrics 입력 | STUB pipeline | **매우 높음** (B1/B2 와 묶음) |
| B4 | `action-definitions.ts:74-76` `(counts['care-alerts'] || 0) === 0` always-true check | dead check | 낮음 (단독 가능) |

### 3.3 Shared packages

| # | 위치 | 종류 | 결합도 |
|:-:|------|------|:------:|
| S1 | `packages/types/src/operator-capability.ts:19` `OperatorCapability.CARE` enum | enum 멤버 | **중간** (F4 가 사라지면 dead) |
| S2 | `packages/ui/src/operator-shell/types.ts:41` `OperatorGroupKey 'care'` | type union | **높음** (KPA/Neture/K-Cos 의 GROUP_TO_DOMAIN.care orphan 들과 동시 정리) |
| S3 | `packages/ui/src/operator-shell/constants.ts:56` STANDARD_GROUPS care entry (icon=HeartPulse, capability=CARE) | UI standard | **중간** (S1/S2 와 묶음) |

### 3.4 인접 서비스 orphan (S2 제거 시 동반 정리 필요)

| # | 위치 | 종류 |
|:-:|------|------|
| O1 | `web-kpa-society/src/config/operatorMenuGroups.ts:150` `care: 'common'` | orphan mapping |
| O2 | `web-k-cosmetics/src/config/operatorMenuGroups.ts:128` `care: 'common'` | orphan mapping |

---

## 4. 보존해야 할 항목 (옵션 A 적용 시에도 보존)

| ID | 항목 | 보존 사유 |
|----|------|----------|
| Keep-1 | F7 정리 이력 주석 (operatorMenuGroups.ts:95) | 감사 증거 — 정리 작업 history tracking |
| Keep-2 | F8 `'customer': '/patient'` (dashboard.ts:36) | `customer` 역할은 active ("당뇨인 정규", roles.ts:72). Care 와 무관한 별도 mapping. 단, `/patient` 라우트 실재 여부 별도 확인 필요 (followup) |
| Keep-3 | Backend `OperatorAlertMetrics.pendingApplications`, `draftProducts` 등 비-Care 필드 | Alert pipeline 의 일반 골격 유지 |
| Keep-4 | FeatureIntroPage 의 'care' UI asset (당뇨인 관리 기능 설명, detail chips) | Care Core 재도입 시 UI 보존. 단 SoftGuard 가 제거되면 unreachable — code-level 은 제거하되 설계 문서로 보존 권장 |
| Keep-5 | `customer` role 정의 (roles.ts:72) | 당뇨인 정규 역할, deprecation marker 없음 — 활용 중 |

---

## 5. 제거 가능한 항목 (옵션 A 적용)

### 5.1 단독 제거 가능 (작업 비용 매우 낮음)

| ID | 항목 | TS 영향 | 런타임 영향 |
|----|------|:-------:|:----------:|
| F1 | AlertItem.type 'care' (OperatorAlerts.tsx:14) | 0 | 0 (unused union member) |
| F2 | AlertItem.type 'care' (GlycoPharmOperatorDashboard.tsx:31) | 0 | 0 |
| F3 | GROUP_TO_DOMAIN.care (operatorMenuGroups.ts:157) | **TS 에러** (Record strict — S2 제거 필요) | 0 |
| F4 | ENABLED_CAPABILITIES.CARE 제거 | S1 살아있는 한 OK | 0 (메뉴 항목 0) |
| B4 | action-definitions.ts:74-76 always-true check | 0 | 0 (always-true dead branch) |

→ F1, F2, F4, B4 는 즉시 단독 제거 가능. F3 는 S2 와 묶음.

### 5.2 결합 클러스터 1 — Backend Alert (B1+B2+B3)

| 단계 | 작업 | 영향 |
|:----:|------|------|
| 1 | `OperatorAlertMetrics` interface 에서 care 필드 4개 제거 (openCareAlerts/careAdoptionRate/highRiskPatients/weeklyCareActivity) | B1 |
| 2 | `computeOperatorAlerts` 에서 해당 alert 규칙 4개 블록 제거 (line 40-97) | B2 |
| 3 | `operator-dashboard.service.ts:88-93` STUB 4개 라인 제거 | B3 |
| 4 | TS 컴파일 확인 — operatorAlerts 배열 type 일관성 유지 | 검증 |

→ 한 번의 commit 으로 묶어 처리 (W5b).

### 5.3 결합 클러스터 2 — FeatureIntro (F5+F6)

| 단계 | 작업 | 영향 |
|:----:|------|------|
| 1 | App.tsx 의 SoftGuard `feature='care'` 라우트 제거 | F6 |
| 2 | FeatureIntroPage 의 FeatureType union 에서 'care' 제거 + FEATURE_CONFIG.care entry 제거 | F5 |
| 3 | care 안내 UI asset 은 design doc 또는 별도 archive 로 보존 (선택) | Keep-4 |

→ 한 commit (W5d-Feature).

### 5.4 결합 클러스터 3 — Shared package (S1+S2+S3+O1+O2)

| 단계 | 작업 | 영향 |
|:----:|------|------|
| 1 | GlycoPharm operatorCapabilities.ts ENABLED_CAPABILITIES.CARE 제거 (F4) | 사전 정리 |
| 2 | KPA/K-Cosmetics operatorMenuGroups.ts 의 GROUP_TO_DOMAIN.care orphan 제거 (O1, O2) — **단, S2 제거 시 strict Record 에러 발생하므로 동시** | TS 에러 회피 |
| 3 | `packages/types/operator-capability.ts:19` OperatorCapability.CARE 제거 (S1) | enum 축소 |
| 4 | `packages/ui/operator-shell/types.ts:41` OperatorGroupKey 'care' 제거 (S2) | type union 축소 |
| 5 | `packages/ui/operator-shell/constants.ts:56` STANDARD_GROUPS care entry 제거 (S3) | UI standard 축소 |
| 6 | 4개 서비스 web 전체 typecheck — Record / capability 참조 깨짐 없는지 확인 | 검증 |

→ 한 commit (W5c-v2, shared package WO). [`IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1`](IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1.md) (`ec2bcc9c1`) 와 정합 확인 필요.

---

## 6. shared package 영향 항목 (상세)

### 6.1 `OperatorCapability.CARE` (S1)

- **정의**: `packages/types/src/operator-capability.ts:19`
- **사용**: GlycoPharm `operatorCapabilities.ts:26` (ENABLED_CAPABILITIES 의 일부)
- **다른 서비스**: KPA / Neture / K-Cosmetics 모두 **미참조**
- **STANDARD_GROUPS 결합**: `packages/ui/operator-shell/constants.ts:56` 의 care group entry 가 `capability: OperatorCapability.CARE` 로 결합
- **제거 영향**: GlycoPharm 의 ENABLED_CAPABILITIES.CARE 제거 → STANDARD_GROUPS care entry 제거 → enum 제거 순. 다른 서비스 무영향.

### 6.2 `OperatorGroupKey 'care'` (S2)

- **정의**: `packages/ui/src/operator-shell/types.ts:28-42`
- **사용**: 5개 서비스 (GlycoPharm/KPA/K-Cosmetics) 의 `Record<OperatorGroupKey, OperatorDomainKey>` 타입 `GROUP_TO_DOMAIN` 에서 strict 멤버 요구
- **active 메뉴 항목**: 5개 서비스 모두 **0건** — orphan
- **제거 영향**: 3개 서비스 operatorMenuGroups.ts 동시 정리 필요 (orphan `care: 'common'` 매핑 제거). Neture 는 GROUP_TO_DOMAIN 자체가 다른 패턴이라 영향 무.

### 6.3 STANDARD_GROUPS care entry (S3)

- **정의**: `packages/ui/operator-shell/constants.ts:56` `{ key: 'care', label: 'Care', icon: HeartPulse, capability: OperatorCapability.CARE }`
- **사용**: OperatorShell sidebar rendering — 모든 서비스 sidebar 가 이 standard 사용
- **현재 visible effect**: 모든 서비스 UNIFIED_MENU 의 care group 항목 0개 → standard entry 는 정의 있어도 렌더 안 됨
- **제거 영향**: sidebar rendering 의 그룹 순회 시 'care' key 미존재. constants 와 type 동시 정리 필요.

---

## 7. backend 영향 항목 (상세)

### 7.1 결합 클러스터 — Alert pipeline (B1+B2+B3)

```
operator-dashboard.service.ts:88-93
  ↓ (metrics 입력)
operator-alert.utils.ts:OperatorAlertMetrics interface (B1)
  ↓
computeOperatorAlerts(metrics) (B2 — care 규칙 4개 포함)
  ↓
return { kpis, aiSummary, operatorAlerts, actionQueue, activityLog, quickActions }
  ↓
frontend: AlertItem type union 'care' 항목 수신 (F1/F2 type)
  ↓
OperatorAlerts.tsx 렌더 — 현재 alert.level 만 분기, alert.type 은 unused
```

**현재 상태**:
- B3 의 STUB 값은 모두 0 → B2 의 care 규칙은 never trigger → 'care' type alert 0건 → F1/F2 의 type union 'care' 멤버는 실제 데이터로 채워지지 않음.
- 즉 **현재 cluster 전체가 dead pipeline** — 정리 안전.

**제거 순서** (역방향 의존 = end-to-start):
1. operator-dashboard.service.ts:88-93 STUB 제거 (B3) → metrics 객체에서 care 필드 4개 사라짐
2. operator-alert.utils.ts:OperatorAlertMetrics 에서 care 필드 4개 제거 (B1) → TS 컴파일 통과 (이미 B3 에서 호출부 정리)
3. operator-alert.utils.ts:36-126 의 care 규칙 4개 블록 제거 (B2) → never-reached 코드 제거
4. Frontend F1/F2 의 'care' union 멤버 제거 — 백엔드 응답에 'care' type alert 없음 보장

### 7.2 B4 — care-alerts always-true check

- 위치: `action-definitions.ts:74-76`
- 현재: `(counts['care-alerts'] || 0) === 0` always-true (care-alerts ActionDefinition 자체 제거됨)
- 영향: condition 이 항상 true → 항상 진입하는 dead branch
- 단독 제거 가능, B1~B3 cluster 와 무관

---

## 8. frontend 영향 항목 (상세)

### 8.1 단독 항목 (F1, F2, F3, F4)

- 모두 옵션 A 적용 시 영향 0
- F3 (GROUP_TO_DOMAIN.care) 는 S2 정리와 동시 진행 필요 (strict Record)

### 8.2 결합 클러스터 — FeatureIntro (F5+F6)

```
App.tsx:365 SoftGuard feature='care'
  ↓
FeatureIntroPage.tsx:15 FeatureType 'care'
  ↓
FeatureIntroPage.tsx:23 FEATURE_CONFIG.care (당뇨인 관리 UI 안내)
```

- 라우트 path 추정: `/care` 또는 `/patient/care` (App.tsx 라우트 정의 확인 필요)
- F5 의 UI asset 은 design doc 으로 보존 권장 (Keep-4)
- 코드에서는 F5+F6 함께 제거

### 8.3 F8 — dashboard.ts `'customer': '/patient'` (별도)

- Care 와 무관 (customer 는 당뇨인 정규 역할, /patient 는 환자 portal 추정)
- **별개 조사**: `/patient` 라우트가 App.tsx 에 실재하는지 확인 필요. dead mapping 가능성.
- W5d 또는 별도 mini-WO 로 처리

---

## 9. Care 재도입 시 권장 구조

### 9.1 새 Care Core 설계 (별도 IR 후보)

| 영역 | 권장 |
|------|------|
| 도메인 | Patient-centric 이 아닌 의약품·약사 상담·복약 안내 등 약국 운영 직접 지원 영역 (추정 — GlycoPharm 사업 모델 기준) |
| Core 위치 | `apps/api-server/src/modules/care-core/` 또는 `packages/care-core/` — Operator Core 와 분리 |
| Capability 모델 | `OperatorCapability.CARE` 대신 세분화된 `care:consultation` / `care:medication` 등 sub-capability |
| Alert 모델 | 새 `CareAlertMetrics` interface 신설 — 기존 patient-centric 4개 필드 미재사용 |
| UI 모델 | FeatureIntroPage design 은 보존하되 detail chips ('당뇨인 등록·관리' 등) 는 새 안내로 교체 |

### 9.2 보존 가치 contract (재도입 시 재사용)

| 항목 | 재사용 형태 |
|------|----------|
| `computeOperatorAlerts` **함수 구조** | care 규칙은 새로 작성하되 함수 shape (metrics → AlertItem[]) 유지 |
| `AlertItem` type 자체 | 'care' union 멤버는 다시 추가 가능 |
| SoftGuard pattern | App.tsx 라우트 가드 구조 재사용 |
| FeatureIntroPage 컴포넌트 | UI 컴포넌트 자체는 재사용, FEATURE_CONFIG 만 갱신 |

### 9.3 폐기 권장 contract (재도입 시 재사용 안 함)

| 항목 | 폐기 사유 |
|------|----------|
| `OperatorAlertMetrics.openCareAlerts` | care-alerts ActionDefinition 자체 폐기, semantic 불명 |
| `OperatorAlertMetrics.highRiskPatients` | patient-centric, 새 Core 패러다임 미정 |
| `OperatorAlertMetrics.careAdoptionRate` | adoption rate 측정 패러다임 변경 가능 |
| `OperatorAlertMetrics.weeklyCareActivity` | 주간 활동 metric 불명확 |
| `action-definitions.ts care-alerts` | 이미 제거됨 + 쿼리 non-existent 컬럼 |

---

## 10. 제거 / 보류 / 재설계 Matrix

| ID | 항목 | A 제거 | B 보존 | C 현상 |
|:--:|------|:------:|:------:|:------:|
| F1 | AlertItem.type 'care' (OperatorAlerts) | **제거** | 보존 (재도입 대비) | 유지 |
| F2 | AlertItem.type 'care' (Dashboard) | **제거** | 보존 | 유지 |
| F3 | GROUP_TO_DOMAIN.care | **제거** (S2 동반) | 보존 | 유지 |
| F4 | ENABLED_CAPABILITIES.CARE | **제거** | 보존 | 유지 |
| F5 | FeatureIntroPage 'care' config | **제거** (design 문서로 보존) | 보존 | 유지 |
| F6 | SoftGuard 'care' feature | **제거** (F5 동반) | 보존 | 유지 |
| F7 | 정리 이력 주석 | 유지 | 유지 | 유지 |
| F8 | dashboard.ts '/patient' | (별도 조사 필요) | 별도 | 별도 |
| B1 | OperatorAlertMetrics care 필드 | **제거** | 보존 | 유지 |
| B2 | computeOperatorAlerts care 규칙 | **제거** | 보존 | 유지 |
| B3 | operator-dashboard.service STUB | **제거** | 보존 | 유지 |
| B4 | action-definitions always-true check | **제거** | 제거 (영향 무) | 유지 |
| S1 | OperatorCapability.CARE | **제거** | 보존 | 유지 |
| S2 | OperatorGroupKey 'care' | **제거** (O1/O2 동반) | 보존 | 유지 |
| S3 | STANDARD_GROUPS care entry | **제거** | 보존 | 유지 |
| O1 | KPA GROUP_TO_DOMAIN.care | **제거** (S2 동반) | 보존 | 유지 |
| O2 | K-Cos GROUP_TO_DOMAIN.care | **제거** (S2 동반) | 보존 | 유지 |

**옵션 A 적용 시 총 14건 제거 / 1건 유지 / 2건 별도** (F7 유지 / F8+B4-separate 별도).

---

## 11. 후속 WO 후보

옵션 A 권장 시 다음 4개 WO 로 분리 진행 (결합도 + 영향 범위 기준):

### W5b — Backend Alert Cluster

`WO-O4O-GLYCOPHARM-BACKEND-CARE-ALERT-METRICS-CLEANUP-V1`

- 범위: B1 + B2 + B3 (OperatorAlertMetrics care 필드 4개 + alert logic 4 규칙 + STUB metrics)
- 부수: B4 (action-definitions always-true check) 도 같은 commit 으로 묶기
- 영향: backend 단독, frontend 변경 없음 (AlertItem.type='care' 응답이 0건이 되어도 type union 'care' 멤버 존재로 type 안전)

### W5d-Frontend — Frontend Type Union & FeatureIntro

`WO-O4O-GLYCOPHARM-FRONTEND-CARE-TYPE-UNION-CLEANUP-V1`

- 범위: F1 + F2 (AlertItem 'care' union) + F5 + F6 (FeatureIntroPage + SoftGuard)
- 부수: F8 dashboard.ts '/patient' mapping 별도 조사 (라우트 실재 여부) — 결과에 따라 같은 commit 가능
- 영향: GlycoPharm web 단독

### W5c-v2 — Shared Package CARE Type Removal

`WO-O4O-OPERATOR-SHARED-CARE-TYPE-CONTRACT-REMOVAL-V1`

- 범위: S1 (OperatorCapability.CARE) + S2 (OperatorGroupKey 'care') + S3 (STANDARD_GROUPS care entry) + F3/F4/O1/O2 (각 서비스 GROUP_TO_DOMAIN.care orphan 정리)
- 영향: **5개 서비스 web typecheck 모두 통과 필요** — `packages/types` + `packages/ui` 동시 변경. 가장 큰 commit
- 권고: [`IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1`](IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1.md) 의 capability 정합 트랙과 함께 진행 권장

### Future-α — Care Core 재도입 설계 IR

`IR-O4O-CARE-CORE-REINTRODUCTION-ARCHITECTURE-V1`

- 범위: 새 Care Core 설계 (도메인 / Capability 모델 / Alert 모델 / UI 모델)
- 트리거: GlycoPharm 사업 측에서 Care 기능 재도입 결정 시
- 본 IR 의 §9 권장사항을 base 로 출발

---

## 12. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) / [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) / [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) 대비 정합 점검.

| 원칙 | 옵션 A 정합 | 옵션 B/C 정합 |
|------|:----------:|:-------------:|
| §3 참여 주체 (공급자/운영사업자/매장) | ✅ — Care 가 새 Core 로 재도입되면 새 참여 주체 정의 가능 | △ — 기존 patient-centric 어휘가 GlycoPharm 약국 경영자 모델과 dissonance |
| §5 HUB 철학 | ✅ — Care 가 HUB 외부 별도 Core 가 될 가능성 명확 | △ |
| §6 AI 역할 (수신 + 능동) | ✅ — computeOperatorAlerts 의 일반 골격은 보존 (B1/B2 의 일반 필드만), Care 능동 영역은 별도 재도입 | ✅ |
| §7 Drift 방지 (도메인 어휘 격리) | ✅ — patient-centric 어휘 완전 제거 → drift 해소 | ❌ — Care 어휘 (patient/care/highRisk) 잔존 |
| Boundary Policy | ✅ — Care 가 별도 Core 가 되면 boundary 명확 | △ |
| OPERATOR-DASHBOARD-STANDARD §11.2 Operator vs Admin | ✅ — Admin KPI whitelist (W5a 완료) + B 클러스터 정리 후 admin/operator 정합 | △ |
| Cross-service capability 일관성 (인접 IR ec2bcc9c1) | ✅ — 5개 서비스 capability 매트릭스 정합 | ❌ — GlycoPharm 만 CARE active 이상 |

> **종합**: 옵션 A 는 모든 philosophy 원칙과 정합. 옵션 B/C 는 §7 Drift 방지 및 cross-service capability 일관성과 충돌.

> **드리프트 회피 전략**: Care 재도입은 별도 Core IR 로 명시적 의사결정 — 현재 잔재가 미래 재도입의 "기본값" 역할을 하면 안 됨. 잔재 정리 후 명시적 설계를 통한 재도입이 §7 정합.

---

## 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 작성 문서 | `docs/investigations/IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1.md` |
| 코드 / DB / migration 수정 | **없음** ✅ |
| Care 재도입 정책 판단 | **옵션 A 영구 폐기 권장** — patient-centric Care contract 완전 정리, 재도입 시 새 Care Core 처음부터 설계 |
| 유지할 항목 | F7 (정리 이력 주석), F8 (`'customer': '/patient'` — 별도 조사), Keep-1~5 (§4) |
| 제거 가능한 항목 | 단독 4건 (F1/F2/F4/B4) + 결합 클러스터 3개 (W5b backend / W5d-Frontend feature intro / W5c-v2 shared package) |
| shared package 영향 항목 | S1 OperatorCapability.CARE, S2 OperatorGroupKey 'care', S3 STANDARD_GROUPS care entry — W5c-v2 로 묶음 |
| backend 영향 항목 | B1/B2/B3 alert cluster + B4 always-true check — W5b 로 묶음 |
| 후속 WO 제안 | W5b (backend) / W5d-Frontend / W5c-v2 (shared) + Future-α (Care Core 재설계) |
| Commit 여부 | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 정책 판단 IR 완료. 권장 옵션 A. 후속 3 WO + 1 future IR 로 분리 진행 권고. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
