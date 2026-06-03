# O4O Operator Dashboard Standard V1

> **운영자 대시보드 개발 시 반드시 따라야 하는 플랫폼 표준**
>
> Date: 2026-03-16
> Status: Active Standard
> Version: 1.1
> 근거: IR-O4O-ADMIN-OPERATOR-ROLE-ARCHITECTURE-AUDIT-V1

---

## 1. Admin / Operator 역할 정의

> **Canonical 정렬 (2026-05-23):**
> 본 표는 **Dashboard / 권한 매트릭스** 관점의 Operator 정의이다. Operator 의 **사업적 정의** 는 [`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md §3.2`](../../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) — **"서비스 운영 사업자"** 이다.
>
> 사업적 정의 (PHILOSOPHY §3.2):
>
> ```text
> Operator = 서비스 운영 사업자
>   - 공급자 자료 수신·등록 (오프라인 전달 후)
>   - 자료 구성·큐레이션
>   - AI 활용 (능동적 도구 사용)
>   - 매장 실행 자산 제작 (POP / QR / 블로그 / 상품 상세 설명 / 사이니지 등)
>   - 매장 지원
>   - 운영 서비스 제공
>   - 운영 수익 모델 구축
> ```
>
> 본 §1-1 의 "운영 + 콘텐츠 + 모니터링" 은 Dashboard 권한 매트릭스에 반영된 **부분 집합** 이다. Operator 가 "단순 승인 관리자" 로 축소된 의미는 아니다.

### 1-1. 역할 구분 (Dashboard / 권한 매트릭스 관점)

| 역할 | 범위 | 핵심 기능 |
|------|------|----------|
| **Admin** | 구조 + 정책 + 거버넌스 + 금융 | 승인 관리, 사용자 CRUD, 정산/커미션, 시스템 설정, AI 정책 |
| **Operator** | 운영 + 콘텐츠 + 모니터링 | Dashboard 조회, 콘텐츠 CRUD, 사이니지, 포럼, AI 리포트 |

Admin은 "무엇을 허용할지" 결정하고, Operator는 "허용된 것을 운영"한다.

> 사업적 의미의 "운영" 은 단순 상태 관리가 아니라 PHILOSOPHY §3.2 의 7가지 책임을 포함한다.

### 1-2. 기능별 역할 매핑

| 기능 영역 | Admin | Operator |
|----------|:-----:|:--------:|
| Dashboard (5-Block) | ✅ | ✅ |
| 신청 승인/거부 | ✅ | ✅ |
| 사용자 관리 (CRUD) | ✅ | 조회만 |
| 상품 승인 | ✅ | ❌ |
| 상품 운영 (목록/관리) | ❌ | ✅ |
| 매장 관리 | ✅ | ✅ |
| 정산/금융 | ✅ | ❌ |
| 시스템 설정 | ✅ | ❌ |
| 콘텐츠 CRUD | ❌ | ✅ |
| 사이니지 관리 | ❌ | ✅ |
| 포럼/커뮤니티 관리 | ❌ | ✅ |
| AI 정책/엔진 설정 | ✅ | ❌ |
| AI 리포트 조회 | ❌ | ✅ |

### 1-3. 역할 상속

Operator scope는 Admin scope를 포함한다:

```
require{Service}Scope('{service}:operator')
  → {service}:operator 허용
  → {service}:admin 도 허용 (scope role mapping)
```

따라서 Admin 사용자는 Operator UI에도 접근 가능하다.

---

## 2. Role 명명 규칙

### 2-1. 서비스 접두사 패턴

```
{serviceKey}:{roleName}
```

| 서비스 | Admin Role | Operator Role |
|--------|-----------|--------------|
| Neture | `neture:admin` | `neture:operator` |
| GlycoPharm | `glycopharm:admin` | `glycopharm:operator` |
| K-Cosmetics | `cosmetics:admin` | `cosmetics:operator` |
| KPA Society | `kpa:admin` | `kpa:operator` |

### 2-2. 플랫폼 Bypass

`platform:super_admin`은 모든 서비스에 대한 bypass를 가진다 (KPA 제외).

---

## 3. Guard 표준

### 3-1. Backend Guard 패턴

모든 서비스는 동일한 Guard 체인을 사용한다:

```typescript
// ✅ 표준 패턴
router.get('/operator/dashboard',
  requireAuth,
  require{Service}Scope('{service}:operator'),
  controller.getDashboard
);

router.post('/admin/approve',
  requireAuth,
  require{Service}Scope('{service}:admin'),
  controller.approve
);
```

**금지 패턴:**

```typescript
// ❌ 인라인 역할 체크
const isOperatorOrAdmin = (req) => { ... };

// ❌ 레거시 Guard
requireAdmin  // → 플랫폼 레벨 Guard, 서비스 레벨에서 사용 금지

// ❌ 직접 role 비교
if (user.roles.includes('admin')) { ... }
```

### 3-2. Scope Guard 설정

서비스별 Scope Guard는 `@o4o/security-core`의 `createMembershipScopeGuard`로 생성:

```typescript
// packages/security-core/src/service-configs.ts
{
  serviceKey: '{service}',
  allowedRoles: ['{service}:admin', '{service}:operator'],
  platformBypass: true,  // platform:super_admin bypass 허용
  scopeRoleMapping: {
    '{service}:admin': ['{service}:admin'],
    '{service}:operator': ['{service}:operator', '{service}:admin'],
  }
}
```

### 3-3. Frontend Guard 패턴

```tsx
// ✅ Operator 영역
<ProtectedRoute allowedRoles={['admin', 'operator']}>
  <OperatorLayout />
</ProtectedRoute>

// ✅ Admin 영역
<ProtectedRoute allowedRoles={['admin']}>
  <AdminLayout />
</ProtectedRoute>
```

---

## 4. UI 레이아웃 표준

### 4-1. 레이아웃 분리

| 항목 | 표준 |
|------|------|
| Admin Layout | 독립 레이아웃 파일 |
| Operator Layout | 독립 레이아웃 파일 |
| 메뉴 위치 | **좌측 사이드바** (Capability Group 접이식) |
| Route 접두사 | `/operator/*`, `/admin/*` |

**금지:**
- 상단 수평 바를 operator 메뉴로 사용
- Admin/Operator를 같은 Layout에서 role 파라미터로 분기

### 4-2. Operator Sidebar — 11-Capability Group (Legacy — sub-capability 으로 재해석)

> **Canonical 정렬 (2026-05-23):**
> 본 §4-2 의 11 Capability Group 은 [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) 의 **6 Workspace + System 구조** 와 정렬된다.
> 11 Capability Group 자체는 삭제되지 않으며, **6 Workspace 의 하위 capability** 로 재해석된다. Sidebar 표준 그룹은 §4-2-A 의 새 **8 Group** (Dashboard + 6 Workspace + System) 구조를 따른다.
> 메뉴명 변경은 본 정렬의 필수 결과가 아니다 — §4-2-C 메뉴명 유지 원칙 참조.

기존 11 Capability Group (sub-capability 으로 사용):

```
 1. Dashboard      — 대시보드 (필수)
 2. Users          — 회원 관리
 3. Approvals      — 신청/승인 관리
 4. Products       — 상품 관리
 5. Stores         — 매장 관리
 6. Orders         — 주문 관리
 7. Content        — 콘텐츠 관리
 8. Signage        — 사이니지
 9. Forum          — 포럼/커뮤니티
10. Analytics      — AI 리포트
11. System         — 설정/감사 로그
```

> 각 capability 는 §4-2-B 매핑표에 따라 6 Workspace 의 하위로 배치된다.

---

### 4-2-A. Operator Sidebar — 8 Group 표준 (Dashboard + 6 Workspace + System)

모든 서비스의 Operator Sidebar 는 다음 **8 개 Group** 을 기준으로 구성한다.
서비스에 해당 Workspace 가 없으면 해당 Group 을 생략한다.

```
 1. Dashboard            — Operator 전체 현황 / 6 Workspace 진입 허브 (필수)
 2. Workspace A — 자료 등록  — 공급자 자료 등록, 원천 자료 관리
 3. Workspace B — AI 작업    — 자료 정리, 실행 자산 초안 생성, AI 작업 큐
 4. Workspace C — 큐레이션   — HUB 노출, 콘텐츠 구성, 사이니지/콘텐츠/상품 설명 배포
 5. Workspace D — 매장 지원  — 매장 요청, 매장별 지원, 실행 상태 확인
 6. Workspace E — 운영 수익  — 운영 패키지, 유료 지원, 수익 항목 관리
 7. Workspace F — 검수·승인  — 신청, 승인, 반려, 상태 관리 (기존 O4O-OPERATOR-CANONICAL-WORKFLOW-V1)
 8. System              — 설정, 감사 로그, 권한, 시스템 관리
```

**그룹 순서는 위 번호를 따른다.** 서비스별 추가 그룹이 필요하면 7-8 사이 또는 8 다음에 삽입한다.

**원칙:**

- Dashboard 는 6 Workspace 진입 허브 — §5 Dashboard 표준 참조.
- Workspace A~F 는 [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) 정의 그대로.
- System 은 인프라·권한·감사 관련 기능 — 모든 Workspace 에 종속되지 않는 메타 영역.
- 서비스에 Workspace 구현이 없으면 해당 Group 을 생략하되, **Approvals (Workspace F) 만 남고 A~E 가 모두 생략된 상태는 Drift** 로 본다 (§4-2-D 참조).

---

### 4-2-B. 11 Capability → 6 Workspace 매핑

| 기존 11 Capability | 새 Group 배치 | 매핑 강도 | 비고 |
|--------------------|---------------|:--------:|------|
| Dashboard | 1. Dashboard | 직접 | 6 Workspace 진입 허브로 역할 확장 |
| Users | 7. Workspace F (검수·승인) 또는 8. System | **서비스별 분류 필요** | 회원 관리는 검수 / 권한 관점에서 분기 |
| Approvals | 7. Workspace F (검수·승인) | 직접 | 본 capability 의 canonical 위치 |
| Products | 2. Workspace A (자료 등록) + 4. Workspace C (큐레이션) | **서비스별 분류 필요** | 상품 마스터 등록 (A) + HUB 노출 큐레이션 (C) |
| Stores | 5. Workspace D (매장 지원) | 직접 | 매장 목록·운영 데이터는 D 의 핵심 |
| Orders | 6. Workspace E (운영 수익) 또는 5. Workspace D (매장 지원) | **서비스별 분류 필요** | 주문 자체는 E (수익) / 매장 운영 관점은 D |
| Content | 2. Workspace A (자료 등록) + 3. Workspace B (AI 작업) + 4. Workspace C (큐레이션) | **서비스별 분류 필요** | 콘텐츠 라이프사이클 전체 — 등록·가공·배포 분리 |
| Signage | 4. Workspace C (큐레이션) | 직접 | 사이니지는 큐레이션의 한 채널 |
| Forum | 4. Workspace C (큐레이션) + 5. Workspace D (매장 지원) | **서비스별 분류 필요** | 커뮤니티 콘텐츠 큐레이션 (C) + 매장 응답 (D) |
| Analytics | 3. Workspace B (AI 작업) + 1. Dashboard | 분기 | AI 리포트 (B) + KPI/요약 (Dashboard) |
| System | 8. System | 직접 | 변경 없음 |

**원칙:**

- "직접" 매핑은 서비스 간 변동 없이 적용.
- **"서비스별 분류 필요"** 매핑은 단정하지 않는다 — 각 서비스의 도메인 특성에 따라 Sidebar 구성 시 결정.
- 단일 capability 가 여러 Workspace 에 걸치는 경우, 메뉴 항목 자체를 분리 (예: "콘텐츠 등록" / "콘텐츠 AI 가공" / "콘텐츠 큐레이션") 하거나 하위 메뉴로 배치 가능.

---

### 4-2-C. 메뉴명 유지 원칙

본 정렬은 메뉴명을 일률적으로 변경하는 작업이 아니다.

| 원칙 | 적용 |
|------|------|
| 기존 서비스별 메뉴명은 유지할 수 있다 | 사용자 학습 비용 최소화 |
| Sidebar **Group 기준** 만 8 Group (Dashboard + 6 Workspace + System) 구조를 따른다 | 그룹 헤더 / 그룹 순서가 정렬 대상 |
| 메뉴 항목명은 서비스의 도메인 표현 유지 가능 | "약국 관리" / "매장 관리" / "스토어 관리" 등 서비스별 명칭 유지 가능 |
| 단, 메뉴 항목이 **어느 Workspace 에 속하는가** 는 §4-2-B 매핑에 따른다 | Sidebar Group 헤더 = Workspace, 메뉴 항목 = 도메인 표현 |

**예시:**

```text
기존 메뉴: 콘텐츠 관리
새 소속: §4-2-B 매핑 — A 자료 등록 / B AI 작업 / C 큐레이션 중 서비스별 결정

기존 메뉴: 사이니지
새 소속: C 큐레이션 (직접)

기존 메뉴: 매장 관리
새 소속: D 매장 지원 (직접) — 단, 매장 승인 액션은 F 검수·승인 으로 분기 권장
```

---

### 4-2-D. Drift Guard (Sidebar)

다음 상태는 본 표준에 대한 **Drift** 로 본다.

| # | Drift | 설명 |
|---|-------|------|
| SG1 | Operator Sidebar 가 Approvals / 검수·승인 중심으로만 구성됨 | A~E Workspace Group 이 보이지 않거나 Approvals 하위에 흡수됨 |
| SG2 | A~E Workspace 진입 메뉴가 Sidebar 에 부재 | 6 Workspace 중 일부가 메뉴 진입점 자체 없음 (구현 진행 단계와 별개로 Group 자체는 표시) |
| SG3 | AI 작업 (Workspace B) 이 Analytics 또는 AI 리포트 조회로만 표현됨 | AI 능동 작업 큐 / 산출물 검수 게이트 표현 부재 |
| SG4 | 매장 지원 (Workspace D) 이 단순 Stores 관리로만 축소됨 | 1:1 응답 / 매장별 맞춤 큐레이션 / 운영 가이드 진입 부재 |
| SG5 | 운영 수익 (Workspace E) Group 이 완전히 부재함 | 진입점 자체가 없음 |
| SG6 | 기존 11 Capability 가 §4-2-B 매핑 없이 그대로 표준 그룹으로 남음 | 본 §4-2-A 의 8 Group 구조를 따르지 않음 |

**Drift 발견 시:**

- Drift 자체는 본 표준 위반이다.
- 본 §4-2-D 의 Drift 정의 자체는 문서 기준이며, **본 WO 에서는 코드 / UI 수정을 수행하지 않는다**.
- 후속 구현 WO 에서 Drift 항목을 해소한다 (§4-2-E 참조).

---

### 4-2-E. 후속 구현 WO 분리

본 §4-2 / §4-2-A / §4-2-B / §4-2-C / §4-2-D 는 **문서 정렬** 만 다룬다. 실제 Sidebar 코드 / UI / 메뉴 데이터 변경은 별도 WO 로 분리한다.

후속 WO 후보:

| WO | 범위 |
|----|------|
| `WO-O4O-OPERATOR-SIDEBAR-WORKSPACE-GROUP-IMPLEMENTATION-V1` | 서비스별 `operatorMenuGroups.ts` / `UNIFIED_MENU` 데이터를 8 Group 구조로 재배치 |
| `WO-O4O-OPERATOR-INTEGRATION-STATE-WORKSPACE-RECLASSIFY-V1` | [`OPERATOR-INTEGRATION-STATE-V1`](../../architecture/OPERATOR-INTEGRATION-STATE-V1.md) 의 Capability 매트릭스 갱신 |
| `IR-O4O-OPERATOR-WORKSPACE-A-ASSET-INGESTION-DESIGN-V1` | Workspace A 진입 화면 설계 (메뉴 표시 후 실제 클릭 도착지) |

각 후속 WO 의 우선순위는 [`IR-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-AUDIT-V1 §10`](../../investigations/IR-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-AUDIT-V1.md) 참조.

---

### 4-3. Admin Sidebar

Admin Sidebar는 서비스별로 다를 수 있으나, 다음 그룹을 우선 사용한다:

```
 1. Overview       — 대시보드
 2. Users          — 사용자/운영자 관리
 3. Approvals      — 승인 관리 (공급자, 상품, 서비스)
 4. Products       — 상품 마스터/카탈로그
 5. Finance        — 정산/커미션/파트너
 6. Content        — 광고/스폰서
 7. Analytics      — AI 정책/엔진
 8. System         — 시스템 설정
```

---

## 5. Dashboard 표준

> **Canonical 정렬 (2026-05-23):**
> 본 §5 의 Dashboard 표준은 [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) 의 **6 Workspace 구조**와 정렬된다.
>
> 6 Workspace:
>
> ```text
> A — 공급자 자료 등록
> B — AI 작업
> C — 큐레이션
> D — 매장 지원
> E — 운영 수익
> F — 검수·승인 (기존 O4O-OPERATOR-CANONICAL-WORKFLOW-V1)
> ```
>
> **Dashboard 원칙:**
>
> - Operator Dashboard 는 Workspace F (검수·승인) 의 대기열만 보여주는 화면이 **아니다**.
> - Operator Dashboard 는 **A~F 6개 Workspace 의 현재 상태와 다음 행동을 요약하는 진입 허브** 이다.
> - 5-Block 골격은 유지하되, 각 블록의 항목 구성·노출 우선순위는 6 Workspace 균형을 따른다.

### 5-1. 5-Block Architecture

모든 Operator Dashboard는 5-Block 구조를 사용한다:

```
Block 1: KPI Grid       — 핵심 지표 카드 (동적)
Block 2: AI Summary     — CopilotEngine 기반 인사이트
Block 3: Action Queue   — 즉시 처리 항목
Block 4: Activity Log   — 최근 활동 스트림
Block 5: Quick Actions  — 바로가기 링크
```

**Dashboard 설계 원칙:** 운영자가 즉시 상태를 파악하고 행동을 결정할 수 있어야 한다.

```
KPI (지표) → AI Summary (인사이트) → Action Queue (행동)
```

### 5-2. API 패턴

```
GET /api/v1/{service}/operator/dashboard
→ { kpis, aiSummary, actionQueue, activityLog, quickActions }
```

### 5-3. 프론트엔드 컴포넌트

```tsx
import { OperatorDashboardLayout } from '@o4o/operator-ux-core';

<OperatorDashboardLayout config={dashboardConfig} />
```

### 5-4. AI Summary 생성

```typescript
// ✅ 표준: Backend CopilotEngineService
const insights = await copilotEngine.generateInsights(serviceKey, kpiData);

// ❌ 금지: Frontend에서 client-side push() 기반 생성
```

### 5-5. Admin Dashboard

Admin Dashboard도 5-Block 형식을 사용한다. 4-Block 레거시는 마이그레이션 대상이다.

---

### 5-6. Action Queue — 6 Workspace 다축화

> **Canonical 정렬 — 작업 2:** Action Queue 는 Workspace F 의 검수 대기열만 표시하는 영역이 아니다.

Action Queue 는 다음 6개 축의 "다음 행동이 필요한 항목" 을 노출할 수 있어야 한다.

| 축 | 항목 예시 | Workspace |
|----|----------|:---------:|
| 등록 대기 자료 | 오프라인 전달받은 공급자 원천 자료 중 등록되지 않은 항목 | **A** |
| AI 작업 대기 | 등록된 원천 자료 중 AI 가공이 시작되지 않은 항목 / AI 산출물 검수 대기 | **B** |
| HUB 큐레이션 대기 | AI 산출물 / 콘텐츠 중 HUB 배포가 결정되지 않은 항목 | **C** |
| 매장 지원 대기 | 매장 요청 응답 대기 / 매장별 맞춤 큐레이션 미배포 | **D** |
| 운영 수익 검토 대기 | 패키지 구성 미완 / 가격 정책 미정 / 매장 구독 갱신 | **E** |
| 검수·승인 대기 | pending 상태의 신청·콘텐츠·자료 | **F** |

**원칙:**

- Action Queue 는 한 축에 편향되지 않는다 — 6개 축 중 데이터가 있는 모든 축의 항목을 노출한다.
- 서비스별 구현 단계에 따라 일부 축은 항목 0건일 수 있다 — 그 경우에도 축 자체는 노출 가능 영역으로 둔다.
- Action Queue 가 100% Workspace F 항목으로만 구성되면 **Drift** 로 본다 (§5-9 참조).

본 §5-6 은 **문서 기준만** 정의한다. 실제 Backend API / UI 구현은 별도 WO 대상이다.

---

### 5-7. Quick Actions — 6 Workspace 균형

> **Canonical 정렬 — 작업 3:** Quick Actions 는 검수·승인 진입만 제공하는 영역이 아니다.

Quick Actions 는 6개 Workspace 의 대표 진입 액션을 균형 있게 제공한다.

| 축 | 대표 액션 | 도착 화면 (구현 별도) |
|----|----------|---------------------|
| A | 공급자 자료 등록 | Workspace A 진입 (자료 등록 폼) |
| B | AI 작업 시작 | Workspace B 진입 (AI 작업 큐) |
| C | HUB 큐레이션 관리 | Workspace C 진입 (HUB 큐레이션) |
| D | 매장 지원 현황 보기 | Workspace D 진입 (매장 지원 대시보드) |
| E | 운영 수익 항목 검토 | Workspace E 진입 (운영 패키지 관리) |
| F | 승인 대기 항목 확인 | Workspace F 진입 (목록 유지형 검수 콘솔) |

**원칙:**

- 각 서비스는 구현 상태에 따라 일부 액션을 숨길 수 있다.
- 그러나 **Dashboard 표준은 6 Workspace 균형을 기준으로 한다** — 검수·승인 액션만 노출되도록 설계하지 않는다.
- 권한이 없는 액션은 비활성화 표시하되 자리 자체는 유지한다 (Workspace 인지 확보).

본 §5-7 은 **문서 기준만** 정의한다. 실제 도착 화면 (Workspace A/B/C/D/E) 의 구현은 별도 WO 대상이다.

---

### 5-8. AI Summary — 표현 정렬

> **Canonical 정렬 — 작업 4:** AI Summary 는 Operator 의 AI 활용 *전체* 가 아니다.

**AI Summary 의 위치:**

- AI Summary 는 운영자에게 KPI / 상태 / 인사이트를 **요약 제공하는 보조 영역** 이다.
- AI Summary 는 Operator 가 AI 결과를 **수신** 하는 형태이다.

**Operator 의 AI 활용 전체:**

- Workspace B (AI 작업) 는 운영자가 AI 를 **능동적으로 사용** 해 자료를 정리하고 매장 실행 자산(POP / QR / 상품 설명 / 블로그 / 사이니지 / 고객 설문) 초안을 만드는 작업 공간이다.
- AI Summary (수신) ≠ Workspace B (능동 사용). 두 영역은 분리된다.

**Drift 표시:**

> Dashboard 의 AI Summary 만 보고 "Operator 의 AI 활용은 완료" 라고 판단하면 Drift 다. Workspace B 의 진입점이 별도로 존재해야 한다 (§5-7 Quick Actions B 액션 / Sidebar 의 Workspace B 메뉴).

본 §5-8 은 §5-4 (AI Summary 생성 — Backend CopilotEngineService) 를 대체하지 않는다. 본 §5-8 은 **표현 정렬** 만 다룬다.

---

### 5-9. Drift Guard

다음 상태는 본 표준에 대한 **Drift** 로 본다.

| # | Drift | 검증 위치 |
|---|-------|----------|
| G1 | Operator Dashboard 가 Workspace F (검수·승인) 의 대기열만 보여주는 구조로 축소됨 | §5 전체 |
| G2 | Action Queue 가 승인 / 반려 / 검수 항목만 표시하고 A~E Workspace 의 다음 행동을 제공하지 않음 | §5-1 Block 3 + §5-6 |
| G3 | AI Summary 를 AI 활용의 전부로 간주하고 Workspace B (능동 사용) 진입점이 부재 | §5-1 Block 2 + §5-8 |
| G4 | 공급자 자료 등록 / AI 작업 / 큐레이션 / 매장 지원 / 운영 수익 진입점이 모두 Sidebar 하위 메뉴로만 흩어지고 Dashboard 에서 보이지 않음 | §5-1 Block 5 + §5-7 |

**Drift 발견 시:**

- Drift 자체는 본 표준 위반이다. 즉시 fix WO 대상.
- 단, 본 §5-9 의 Drift 정의 자체는 문서 기준이며, **본 WO 에서는 코드 / UI 수정을 수행하지 않는다**.
- 후속 구현 WO 에서 Drift 항목을 해소한다 (§5-10 참조).

---

### 5-10. 후속 구현 WO 분리

본 §5-6 / §5-7 / §5-8 / §5-9 는 **문서 정렬** 만 다룬다. 실제 코드 / API / UI 변경은 별도 WO 로 분리한다.

후속 WO 후보:

| WO | 범위 |
|----|------|
| `WO-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-IMPLEMENTATION-V1` | Action Queue 6축 다축화 / Quick Actions 6 Workspace 균형의 실제 API · UI 구현 |
| `WO-O4O-OPERATOR-SIDEBAR-WORKSPACE-GROUP-V1` | 11 도메인 그룹 → 6 Workspace + System 그룹 재배치 |
| `WO-O4O-OPERATOR-INTEGRATION-STATE-WORKSPACE-RECLASSIFY-V1` | OPERATOR-INTEGRATION-STATE-V1 의 Capability 매트릭스를 6 Workspace 기준으로 재분류 |

각 후속 WO 의 우선순위는 [`IR-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-AUDIT-V1 §10`](../../investigations/IR-O4O-OPERATOR-DASHBOARD-WORKSPACE-ENTRY-AUDIT-V1.md) 참조.

---

## 6. KPI 설계 표준

### 6-1. KPI 설계 원칙

| 원칙 | 설명 |
|------|------|
| **실시간성** | 운영 상태를 즉시 반영 |
| **행동 연결** | KPI → Action Queue로 연결 가능해야 함 |
| **서비스 격리** | 반드시 `serviceKey` 기준 필터 |
| **Backend 계산** | 모든 집계는 Backend에서 수행, Frontend 계산 금지 |

### 6-2. KPI 카드 구조

각 KPI 카드는 다음 필드를 포함한다:

```typescript
interface KpiItem {
  id: string;          // 고유 식별자 (e.g., 'active_pharmacies')
  label: string;       // 표시 이름
  value: number;       // 현재 값
  trend?: string;      // 변화 추세 (e.g., '+3', '-2%')
  link?: string;       // 관련 페이지 이동 경로
}
```

### 6-3. KPI 수량 제한

Dashboard KPI는 **최소 4개, 최대 8개**만 표시한다.

과도한 KPI는 인지 부하를 발생시킨다. 추가 지표가 필요하면 해당 기능 페이지에서 제공한다.

### 6-4. KPI Capability 분류

KPI는 Capability Layer 기준으로 분류한다. 서비스는 필요한 Capability만 사용한다.

| Capability | 설명 | 대표 KPI |
|-----------|------|---------|
| **Network** | 조직, 약국, 사용자 | 활성 조직, 대기 신청, 등록 사용자 |
| **Commerce** | 상품, 주문 | 활성 상품, 총 주문, 매출 |
| **Care** | 환자, 건강 데이터 | 전체 환자, 고위험 환자, 코칭 세션, 활성 알림 |
| **Content** | 콘텐츠 | 게시 콘텐츠, 초안 콘텐츠 |
| **Signage** | 디지털 사이니지 | 활성 플레이리스트, 미디어 자산 |
| **Community** | 포럼, 커뮤니티 | 게시글, 포럼 신청 |
| **Analytics** | AI 운영 | AI 응답 수, Context Asset |

### 6-5. 서비스별 KPI 적용

| 서비스 | Network | Commerce | Care | Content | Signage | Community | Analytics |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Neture** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **GlycoPharm** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **K-Cosmetics** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **KPA** | ✅ | — | — | ✅ | ✅ | ✅ | ✅ |

### 6-6. KPI → Action Queue 연결

KPI는 Action Queue와 연결되어야 한다. 문제가 있는 KPI가 즉시 행동으로 이어진다.

| KPI 예시 | Action Queue 항목 |
|---------|-----------------|
| 대기 신청 > 0 | "N건의 신청 검토 필요" |
| 고위험 환자 > 0 | "고위험 환자 N명 코칭 필요" |
| 초안 상품 > 0 | "상품 N개 검토 대기" |

### 6-7. KPI 금지 패턴

| 금지 | 이유 |
|------|------|
| 단순 로그 카운트 (e.g., 총 로그인 수) | 운영 행동으로 연결되지 않음 |
| Frontend 집계 | Backend에서 계산해야 함 |
| 서비스 혼합 데이터 | 서비스 격리 위반 |
| 9개 이상 KPI 카드 | 인지 부하 초과 |

---

## 7. Route 구조 표준

### 7-1. Backend Route

```
/api/v1/{service}/operator/*    — Operator API
/api/v1/{service}/admin/*       — Admin API
/api/v1/operator/*              — Extension Layer (공통 기능)
```

### 7-2. Frontend Route

```
/operator/*                     — Operator UI
/admin/*                        — Admin UI
```

Neture의 `/workspace/operator` 접두사는 레거시이며 신규 서비스에서 사용하지 않는다.

---

## 8. 서비스별 현재 상태 및 정비 대상

| 서비스 | Operator Sidebar | Admin UI | Dashboard | Guard | 정비 |
|--------|:---:|:---:|:---:|:---:|------|
| **Neture** | ✅ 8그룹 | ✅ 8그룹 | ✅ 5-Block | ✅ Scope Guard | 기준 서비스 |
| **KPA** | ✅ 9그룹 | ✅ 5그룹 | ✅ 5-Block | ✅ Scope Guard | aiSummary Backend 전환 필요 |
| **GlycoPharm** | ⚠️ 11그룹 (누락 있음) | ⚠️ 4-Block | ✅ 5-Block | ⚠️ 혼합 | 메뉴 누락 추가, Guard 통일 |
| **K-Cosmetics** | ✅ 9그룹 | ⚠️ 최소 | ✅ 5-Block | ✅ Scope Guard | Admin 확장 필요 |

---

## 9. 신규 서비스 Operator 구축 체크리스트

새로운 서비스에 Operator Dashboard를 추가할 때:

**Backend:**
- [ ] `packages/security-core/src/service-configs.ts`에 서비스 Scope Config 추가
- [ ] `apps/api-server/src/middleware/{service}-scope.middleware.ts` 생성
- [ ] `GET /api/v1/{service}/operator/dashboard` 엔드포인트 (5-Block 형식)
- [ ] `require{Service}Scope('{service}:operator')` Guard 적용
- [ ] KPI: Capability 선정 → 4~8개 KPI 선택 → Backend 집계 쿼리 구현
- [ ] KPI: 모든 쿼리에 serviceKey 필터 적용 (서비스 격리)
- [ ] Action Queue: KPI와 연결된 즉시 처리 항목 구현
- [ ] CopilotEngine: 서비스별 insight rules 등록

**Frontend:**
- [ ] `OperatorLayout.tsx` 생성 (좌측 사이드바 + Capability Group)
- [ ] 11-Capability Group 기준 메뉴 구성 (해당 없는 그룹 생략)
- [ ] `OperatorDashboardLayout` 컴포넌트 사용
- [ ] `ProtectedRoute allowedRoles={['admin', 'operator']}` 적용
- [ ] KPI 카드에 trend, actionLink 포함

**Admin (필요 시):**
- [ ] 별도 `AdminLayout.tsx` 생성
- [ ] `ProtectedRoute allowedRoles={['admin']}` 적용
- [ ] Admin Dashboard도 5-Block 형식

---

> 📄 근거: `docs/archive/audits/IR-O4O-ADMIN-OPERATOR-ROLE-ARCHITECTURE-AUDIT-V1.md`
> 📄 참조: `docs/baseline/BASELINE-OPERATOR-OS-V1.md`

*Version: 1.1*
*Status: Active Standard*
