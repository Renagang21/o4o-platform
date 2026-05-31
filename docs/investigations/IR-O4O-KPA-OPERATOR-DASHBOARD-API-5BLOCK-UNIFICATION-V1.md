# IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1

**작성 일자**: 2026-05-31
**작업 성격**: 정책 결정 IR (Policy Decision Investigation) — 코드 / DB / migration / route / API / frontend 수정 일절 없음
**상위 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md) §12 I1
**선행 CHECK**: [CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1](CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1.md) (Tier 1 + 2 종결)
**조사 도구**: 3개 병렬 Explore agent — KPA frontend / KPA backend / 3 서비스 5-Block 구조 비교

---

## 0. 핵심 결론 (TL;DR)

> ✅ **권장: Option B — `/operator/dashboard` backend endpoint 추가 + `/operator/summary` 유지 + frontend 점진 전환**
>
> 1. **KPA frontend 는 이미 5-Block 사용 중** — `OperatorDashboardLayout` 공통 컴포넌트 + `buildKpaOperatorConfig` 가 `OperatorDashboardConfig` 형태로 조립. **출력 형태 = 5-Block 통일**
> 2. **차이는 backend 만** — KPA 는 `/operator/summary` 응답 후 frontend 가 5-block 조립 (AI Summary / Action Queue 모두 frontend rule-based generation). 3 서비스는 backend `/operator/dashboard` 가 직접 5-Block 반환.
> 3. **`/operator/dashboard` 이전에 있었으나 폐기 이력** (`WO-KPA-A-OPERATOR-DASHBOARD-FIRST-STABILIZATION-V1` — "CopilotEngineService import 제거, 프론트엔드 미사용") — 재도입은 frontend rule-based logic 을 backend 로 이동하는 패턴.
> 4. **재사용 가능한 backend service 다수**: `ContentQueryService` / `SignageQueryService` / `ForumQueryService` + summary 의 17 query — 활용도 100%/100%/70%/60% (Block 별).
> 5. **KPA 특수성 보존**: 2축 AxisNavigation (frontend dynamic 으로 유지) + OperatorRoleGuideCard (KPA 만) + role-aware isAdmin 분기.
> 6. **현 시점 즉시 진행 보다 Tier 4 정책 결정 사이클의 일부로 처리 권장** — 1인 개발 속도 고려, 사용자 체감 영향 0 (frontend output 이미 동일), 우선순위 중간.

권고 단계: ① 본 IR 로 정책 확정 (Option B) → ② 별도 WO 분할 (W-KPA-Dashboard-Foundation + Frontend-Adapter + Summary-Compat) → ③ CHECK smoke

---

## 1. Executive Summary

| 측면 | 현재 KPA | Neture/GlycoPharm/K-Cos (baseline) | gap |
|------|---------|-----------------------------------|-----|
| Frontend OperatorDashboardLayout 사용 | ✅ | ✅ | 동일 |
| Backend 단일 `/operator/dashboard` endpoint | ❌ (`/operator/summary` + 6 보조) | ✅ | KPA 만 미정합 |
| AI Summary 생성 위치 | **frontend rule-based** (operatorConfig.ts:122-192) | **backend rule-based** (insight-rules.ts `generateRuleBasedInsights`) | 위치 차이 |
| Action Queue 생성 위치 | **frontend rule-based** (operatorConfig.ts:195-253) | **backend response** | 위치 차이 |
| KPI Grid source | frontend assemble (summary + 5 별도 fetch) | backend assemble | 위치 차이 |
| Activity Log source | backend `summary.recentActivity/recentItems` | backend response | 동일 |
| Quick Actions | frontend hardcoded + role-based | backend hardcoded | 위치 차이 |
| AxisNavigationSection | KPA 2축 (buildKpaAxes) | GlycoPharm/K-Cos 도 axis 사용, Neture 미사용 | KPA 특수성 보존 가능 |
| Role-aware (isAdmin) 분기 | ✅ (KPA 만) | 미사용 | KPA 특수성 |
| OperatorRoleGuideCard | ✅ (KPA 만) | 미사용 | KPA 특수성 |

### 권고: ✅ **Option B 진행 (점진 전환)**

---

## 2. 현재 KPA operator dashboard 구조

### 2.1 Frontend 구조

**Entry**: [`services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx`](../../services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx)

**호출 API (7개)**:

| Endpoint | 용도 | Response 사용처 |
|----------|------|----------------|
| `GET /operator/summary` | Core (content, signage, forum, approval, recentActivity) | extData.summary → operatorConfig builder |
| `GET /members?status=pending&pageSize=1` | 회원 승인 대기 count | KPI 'pending' |
| `GET /pharmacy-requests/pending?limit=1` | 약국 서비스 신청 대기 | KPI 'pharmacy-requests' |
| `GET /operator/stores?serviceKey=kpa-society&limit=1` | 매장 통계 (storeStats) | KPI + AxisNavigation |
| `GET /operator/product-applications/stats` | 상품 신청 대기 | KPI 'product-applications' |
| `GET /members?pageSize=1` (Admin) | 전체 회원 수 | KPI 'total-members' |
| `GET /organization-join-requests/pending?limit=1` (Admin) | 서비스 신청 대기 | KPI 'service-apps' |

→ **7 fetch** (Operator 5 + Admin 2). `Promise.allSettled` 로 개별 실패 격리.

### 2.2 Block 조립 위치

| Block | Source | 조립 방식 | 위치 |
|-------|--------|----------|------|
| **KPI Grid** | summary + 5 보조 fetch | **frontend 동적 조립** | [operatorConfig.ts:58-117](../../services/web-kpa-society/src/pages/operator/operatorConfig.ts#L58-L117) |
| **AI Summary** | summary KPI count 값 기반 규칙 | **frontend rule-based** (LLM 미호출) | operatorConfig.ts:122-192 |
| **Action Queue** | summary KPI count 값 기반 조건부 | **frontend rule-based** | operatorConfig.ts:195-253 |
| **Recent Activity** | `summary.content.recentItems`, `signage.recentMedia`, `forum.recentPosts`, `summary.recentActivity` | **backend response** → frontend sort/filter/limit 15 | operatorConfig.ts:256-301 |
| **Quick Actions** | hardcoded + isAdmin 분기 | **frontend hardcoded** | operatorConfig.ts:304-322 |
| **AxisNavigationSection** | summary + storeStats + extData | **frontend 동적 생성** (buildKpaAxes 함수) | KpaOperatorDashboard.tsx:157-198 |
| **OperatorRoleGuideCard** | static | **KPA 만** 상단 표시 | KpaOperatorDashboard.tsx |

### 2.3 Backend `/operator/summary` 상세

**파일**: [`apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts`](../../apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts) (313줄, line 49-252)

- Route: `GET /api/v1/kpa/operator/summary`
- 인증: `authenticate` + `requireKpaScope('kpa:operator')`
- 응답: `{ success: true, data: { content, signage, forum, approval, store, recentActivity } }`
- 내부: `Promise.all([...])` 로 **17 concurrent query**
- 재사용 service: `ContentQueryService` / `SignageQueryService` / `ForumQueryService` (각각 home/forum/news router 와 공유)

**응답 shape (inline interface, 별도 type 파일 없음)**:

```ts
{
  content: { totalPublished, pendingDraft, pendingApproval, recentItems[5] },
  signage: { totalMedia, totalPlaylists, pendingMedia, pendingPlaylists, recentMedia[3], recentPlaylists[3] },
  forum: { totalPosts, pendingRequests, recentPosts[5] },
  approval: { instructorPending, coursePending, membershipPending },
  store: { forcedExpirySoon },
  recentActivity: { type, label, timestamp }[]
}
```

### 2.4 폐기된 `/operator/dashboard` 흔적

[operator-summary.controller.ts:22-23](../../apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts#L22-L23) 주석:

```
// WO-KPA-A-OPERATOR-DASHBOARD-FIRST-STABILIZATION-V1: CopilotEngineService import 제거
// /operator/dashboard 엔드포인트 삭제 — 프론트엔드 미사용 (프론트는 /operator/summary 사용)
```

→ 한 번 시도되었다가 frontend 미사용으로 인해 폐기된 이력. **재도입 시 본 IR 의 정합 흐름과는 무관** (당시는 단순 frontend 전환 안 됨, 현재는 명확한 5-Block 정합 목적).

---

## 3. KPA `/operator/summary` API 분석

§2.3 이미 상세 — 17 query / 3 module service / 1 inline response type.

### 3.1 Service 재사용성

| Service | 다른 사용처 | 5-Block 도입 시 재활용 |
|---------|-----------|---------------------|
| `ContentQueryService` | `/news`, `/home/notices` | ✅ 100% |
| `SignageQueryService` | `/home/signage` | ✅ 100% |
| `ForumQueryService` | `/home/forum-hub`, `/forum/*` | ✅ 100% |

→ **재사용성 매우 높음**. 새 dashboard endpoint 는 동일 service 호출 + 추가 5 query (members/pharmacy-requests/stores/product-applications/organization-join) 로 충분.

### 3.2 KPA-specific endpoint 다수

[summary 외 KPA operator endpoints](../../apps/api-server/src/routes/kpa/kpa.routes.ts) — 약 20개 (audit-logs, contact-requests, approvals, product-applications, blog/pop/qr, resources, legal-documents, ai/summarize-selection, lms 등). 일부는 dashboard quick action 으로 통합 가능.

---

## 4. KPA frontend dashboard 조립 구조

§2.1 + §2.2 이미 상세. 핵심:

### 4.1 5-Block 출력 형태는 이미 통일

`OperatorDashboardLayout` 공통 컴포넌트 (`@o4o/operator-ux-core`) 사용 → 다른 3 서비스와 **rendering 형태 동일**.

### 4.2 차이는 조립 위치

| 영역 | 현재 KPA | 3 서비스 |
|------|---------|---------|
| AI Summary 생성 | frontend rule-based (operatorConfig.ts:122-192) | backend `generateRuleBasedInsights(service, copilotMetrics)` |
| Action Queue 생성 | frontend rule-based (operatorConfig.ts:195-253) | backend response |
| KPI Grid 조립 | frontend (summary + 5 보조) | backend response |

→ 전환 = **frontend rule-based logic 을 backend 로 이동**. 사용자 시각적 차이 0.

### 4.3 KPA 특수성 (Option B 에서도 frontend 유지)

- **AxisNavigationSection**: `buildKpaAxes(extData)` 가 summary + storeStats 사용 → frontend 동적 유지 (backend 응답에 storeStats 포함되면 가능)
- **OperatorRoleGuideCard**: static content, KPA 만 상단 표시 → frontend 유지
- **isAdmin role-aware 분기**: backend dashboard endpoint 가 isAdmin 파라미터 / scope 기반 응답 분기 가능

---

## 5. Neture / GlycoPharm / K-Cosmetics 5-Block 구조 비교

### 5.1 공통 endpoint 패턴

| 서비스 | endpoint | controller |
|--------|----------|-----------|
| Neture | `/api/v1/neture/operator/dashboard` | `modules/neture/controllers/operator-dashboard.controller.ts` |
| GlycoPharm | `/api/v1/glycopharm/operator/dashboard` | `routes/glycopharm/services/operator-dashboard.service.ts` |
| K-Cosmetics | `/api/v1/cosmetics/operator/dashboard` | `routes/cosmetics/controllers/operator-dashboard.controller.ts` |
| **KPA (제안)** | `/api/v1/kpa/operator/dashboard` | (신규) |

### 5.2 공통 타입

- **frontend**: `packages/operator-ux-core/src/types.ts` — `OperatorDashboardConfig` (5 required + 2 optional block)
- **backend**: `apps/api-server/src/types/operator-dashboard.types.ts` — 동일 shape (이중화)

### 5.3 Block 별 비교

| Block | Neture | GlycoPharm | K-Cosmetics | KPA 현재 |
|-------|--------|-----------|------------|---------|
| KPI Grid | 8개 | 3개 (1 STUB) | 5개 | 6 + Admin 2 (frontend 조립) |
| AI Summary | backend rule-based | backend rule-based | backend rule-based | **frontend rule-based** |
| Action Queue | 4개 (backend) | 1개 (backend) | 3개 (backend) | **frontend dynamic** |
| Activity Log | 5 source UNION | audit-based | recent orders | **summary recentActivity (backend, frontend sort)** |
| Quick Actions | 7개 (backend hardcoded) | 3개 (backend) | 4개 (backend) | **frontend hardcoded + isAdmin** |
| Operator Alerts | ❌ | ✅ (computeOperatorAlerts) | ❌ | ❌ |

### 5.4 Frontend pass-through builder 패턴

- Neture: `buildNetureOperatorConfig(data)` — backend response 그대로
- GlycoPharm: `buildGlycoPharmOperatorConfig(data)` — backend response 그대로 + OperatorAlerts 추가
- K-Cosmetics: `buildKCosmeticsOperatorConfig(result.config)` — backend response 그대로 + AxisNavigation
- **KPA (현재)**: `buildKpaOperatorConfig(extData, isAdmin)` — **summary 만 받아 frontend 가 5-Block 조립** ← 가장 큰 차이

---

## 6. KPA 특수성 분석

### 6.1 보존해야 할 KPA 고유 요소

| 요소 | 5-Block 도입 시 처리 |
|------|--------------------|
| 2축 AxisNavigation (커뮤니티 / 매장HUB) | frontend `buildKpaAxes` 유지. backend dashboard response 에 `storeStats` 포함하여 axes 데이터 공급 |
| isAdmin role-aware (Admin KPI 2개 추가) | backend dashboard 가 user scope 기반 응답 분기 (Admin role 이면 추가 KPI 응답) |
| OperatorRoleGuideCard | frontend static, KPA dashboard 만 표시 — 영향 없음 |
| 7 fetch (Operator 5 + Admin 2) 의 보조 endpoint 들 | backend dashboard 가 모든 KPI 응답으로 통합 → 보조 fetch 제거 가능 |

### 6.2 KPA-specific block (5-Block 외)

- 약국 서비스 신청 (`pharmacy-requests`) — 매장 HUB 운영 KPI 의 일부
- 상품 신청 (`product-applications`) — 매장 HUB 운영 KPI 의 일부
- 강의 / 강사 / 멤버십 승인 — Community 운영 KPI 의 일부
- 강제노출 만료 임박 (store-asset-controls) — KPA-specific 알림

→ **모두 KPA dashboard response 의 KPI / ActionQueue / Alert 항목으로 자연스럽게 매핑** 가능. 별도 block 없이 5-Block 내에서 수용.

---

## 7. Backend `/operator/dashboard` 도입 가능성

### 7.1 활용 가능한 기존 source

| Block | 기존 source 활용 | 비고 |
|-------|:-------------:|------|
| KPI Grid | **100%** | summary 17 query + 보조 5 endpoint 모두 backend 에서 통합 가능 |
| AI Summary | **70%** | insight-rules.ts 의 `generateRuleBasedInsights` 가 KPA 케이스 이미 보유 (line 88-92 검색 결과). 추가 KPA-specific rule 작성 필요 |
| Action Queue | **60%** | summary count 값 → action 변환 로직 필요 (frontend operatorConfig.ts:195-253 의 logic 을 backend 로 이동) |
| Recent Activity | **100%** | summary.recentActivity 이미 backend 에서 생성 |
| Quick Actions | **40%** | hardcoded — backend 에서 응답 형태로 변환 (다른 3 서비스 패턴 따름) |

### 7.2 신규 controller / service 범위

신규 추가:
- `apps/api-server/src/routes/kpa/controllers/operator-dashboard.controller.ts` (또는 `modules/kpa/controllers/`)
- `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts`
- `buildKpaDashboardConfig(scope, isAdmin)` builder (frontend operatorConfig.ts 의 logic 이식)

재사용:
- `ContentQueryService` / `SignageQueryService` / `ForumQueryService` (변경 없음)
- summary 의 SQL 쿼리 17건 (재사용 또는 service layer 로 분리)
- `generateRuleBasedInsights('kpa', metrics)` (이미 존재, 추가 rule 작성)

### 7.3 리스크 / 회귀 가능성

| 리스크 | 분석 |
|-------|------|
| `/operator/summary` 기존 사용처 회귀 | **낮음** — summary 유지. /home/notices, /home/signage, /home/forum-hub, /news 등 다른 사용처 무영향 |
| Action Queue / AI Summary 메시지 변경 | **중간** — backend 로 이동 시 메시지 표현 변경 가능성. 시각적 검증 필요 |
| isAdmin 분기 처리 | **중간** — scope guard 와 응답 분기 정합 필요 |
| AxisNavigationSection storeStats 의존 | **낮음** — backend response 에 storeStats 포함하면 정합 |
| frontend operatorConfig.ts 의 polish (정렬, severity 등) 손실 | **중간** — frontend 의 sort/limit/severity 정합 backend 로 이식 필요 |
| DB query 증가 | **낮음** — 기존 summary 와 동일 query, 추가 KPI 들은 이미 별도 fetch 중 → 통합 시 오히려 정합 |

---

## 8. 전환 전략 옵션 A/B/C/D 비교

### Option A — 현 구조 유지

| 측면 | 평가 |
|------|------|
| 장점 | 무중단. 1인 개발 부담 0. 이미 안정 동작. |
| 단점 | cross-service 일관성 부재. KPA 만 다른 패턴 — 신규 개발자 cognitive load. AI Summary / Action Queue frontend 로직 4 서비스 분산. |
| 리스크 | 낮음 (변경 없음) |
| 권장 | ❌ — Tier 2 가 어휘 정합까지 마쳤으므로 구조 정합도 단계적으로 따라가는 것이 자연스러움 |

### Option B — backend `/operator/dashboard` 추가 + 기존 summary 유지 + frontend 점진 ✅

| 측면 | 평가 |
|------|------|
| 장점 | 기존 사용처 (home/news/forum) 영향 0. KPA dashboard 만 새 endpoint 사용. KPA frontend operatorConfig 의 rule-based 로직을 backend insight-rules + action-definitions 패턴으로 이동 (다른 3 서비스와 정합). 단계적 검증 가능. |
| 단점 | summary endpoint 와 일부 중복 source (단, 둘 다 동일 service 호출이므로 데이터 일관성 보장). |
| 리스크 | 중간 (시각 검증 + isAdmin 분기 정합) |
| 권장 | ✅ **권장** — 안전성 + cross-service 정합 + KPA 특수성 보존 균형 |

### Option C — summary 폐기 후 dashboard 즉시 전환

| 측면 | 평가 |
|------|------|
| 장점 | 구조 깔끔. SSOT 단일. |
| 단점 | summary 의 다른 사용처 (home/news/forum/admin tools) 광역 회귀 위험. 폐기된 `/operator/dashboard` 재도입 이력 — 검증 부담 큼. |
| 리스크 | **높음** |
| 권장 | ❌ |

### Option D — shared OperatorDashboard API contract (4 서비스 횡단)

| 측면 | 평가 |
|------|------|
| 장점 | 4 서비스 완전 정합. operator-ux-core / api-server 양쪽 타입 단일화. 향후 추가 서비스 도입 용이. |
| 단점 | 범위 매우 큼 (4 서비스 + 2 type 파일 + 다수 builder). 1인 개발 속도와 맞지 않음. 본 IR 의 즉시 범위 외. |
| 리스크 | 매우 높음 |
| 권장 | △ — Option B 완료 후 별도 IR (`IR-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-CONTRACT-STANDARDIZATION-V1`) 로 추후 검토 |

---

## 9. 권장안

### 최종 권장: ✅ **Option B**

**근거**:

1. **사용자 체감 영향 0** — frontend `OperatorDashboardLayout` 이미 5-Block 사용 중. 시각 변화 없음.
2. **재사용 가능한 backend service 충분** — Content/Signage/Forum QueryService + summary 의 17 query.
3. **insight-rules.ts 의 KPA 케이스 일부 존재** — `generateRuleBasedInsights('kpa', metrics)` 추가 rule 작성으로 frontend 로직 이식 가능.
4. **summary 유지** — 다른 사용처 (home/news/forum router) 영향 0.
5. **KPA 특수성 보존** — AxisNavigationSection + OperatorRoleGuideCard frontend 유지. isAdmin 분기는 backend response 분기로 정합.
6. **점진 전환** — frontend 가 새 endpoint 사용 시 기존 summary fetch 제거 가능 (네트워크 호출 7 → 1).
7. **1인 개발 속도 부담 작음** — Foundation WO + Adapter WO + CHECK 의 3 단계로 분할 가능. 각 단계 작음.

### 단, 즉시 진행 보다 **Tier 4 정책 결정 사이클의 일부로 처리** 권장

본 IR 작성 시점에 다음이 동시 트랙으로 진행 중:
- I2 GlycoPharm Event Offer approval scope
- I3 4 서비스 AxisNavigation 정합
- Iα K-Cos operator menu admin entry mix
- 외부 세션: ecommerce_orders vs checkout_orders schema diff IR + safe-fallback 작업 (commit `8ccb79f55`)

→ Tier 4 IR 들이 모두 완료된 후 KPA dashboard 5-Block 도입 WO 진행이 자연스러움. **본 IR 의 권고는 "정책 결정 Option B 확정", 즉시 코드 작업은 별도 trigger 시.**

---

## 10. 예상 후속 WO

| ID (가칭) | 범위 | 의존성 |
|-----------|------|-------|
| **WO-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-FOUNDATION-V1** | backend 신규 `/api/v1/kpa/operator/dashboard` endpoint + controller + service + builder. 기존 summary 호출 query 재사용. response shape = `OperatorDashboardConfig`. `generateRuleBasedInsights('kpa')` 호출 + KPA-specific rule 추가. Action Queue / Quick Actions 응답 형태 정합. | 본 IR Option B 확정 후 |
| **WO-O4O-KPA-OPERATOR-DASHBOARD-FRONTEND-ADAPTER-V1** | frontend `KpaOperatorDashboard.tsx` + `operatorConfig.ts` 가 새 endpoint 사용. 기존 7 fetch → 1 fetch. `buildKpaOperatorConfig` 는 pass-through builder 로 단순화. AxisNavigationSection + OperatorRoleGuideCard 그대로 유지. | Foundation 완료 후 |
| **WO-O4O-KPA-OPERATOR-SUMMARY-COMPATIBILITY-LAYER-V1** (선택) | `/operator/summary` 유지하되 dashboard 로 사용처 이전. summary 의 dashboard 전용 응답 부분 (recentActivity 등) 은 dashboard endpoint 로 이동 — 점진 정리 | Adapter 완료 후 |
| **CHECK-O4O-KPA-OPERATOR-DASHBOARD-5BLOCK-SMOKE-V1** | 브라우저 smoke test — 시각 일관성 / fetch 횟수 감소 / isAdmin 분기 / Activity Log 동일성 / Action Queue 메시지 동등성 | 모든 WO 완료 후 |
| **IR-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-CONTRACT-STANDARDIZATION-V1** (선택, Future) | 4 서비스 + 2 type 파일 (operator-ux-core + api-server) 단일화 — 향후 별도 IR | Option D 영역 |

---

## 11. 리스크와 회귀 가능성

### 11.1 직접 리스크

| 항목 | 리스크 | 완화 |
|------|:------:|------|
| AI Summary 메시지 표현 변경 (frontend → backend) | 중간 | backend insight-rules.ts 에 KPA-specific rule 추가 시 기존 메시지 문구 보존. CHECK smoke 로 시각 검증 |
| Action Queue 항목 순서 / severity | 중간 | backend response 의 정렬 / severity 가 frontend operatorConfig 와 정합하도록 builder 검증 |
| isAdmin 분기 (Admin KPI 2개 추가) | 중간 | backend dashboard endpoint 가 user.roles 기반 응답 분기. 또는 frontend 에서 isAdmin 별 추가 fetch (호환 layer) |
| storeStats 의존 (AxisNavigation) | 낮음 | backend response 에 storeStats 포함하면 정합 |
| `/operator/summary` 회귀 (다른 사용처) | 매우 낮음 | summary 변경 없음 |

### 11.2 간접 리스크

| 항목 | 리스크 |
|------|:------:|
| `/operator/dashboard` 폐기 이력 재도입 — 신규 개발자 cognitive load | 낮음 (본 IR 로 문서화) |
| frontend / backend type 이중화 (operator-ux-core vs api-server types) — 본 IR 외 별도 IR 필요 | 낮음 |
| 외부 세션의 ecommerce_orders safe-fallback 작업과 충돌 | 낮음 (다른 영역) |

---

## 12. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) + [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) 정합 점검.

| 원칙 | Option A (유지) | **Option B (권장)** | Option C (즉시 전환) |
|------|:-------------:|:-------------------:|:-------------------:|
| §3 참여 주체 (Operator) | ✅ | ✅ | ✅ |
| §5 HUB 철학 (매장 HUB) | ✅ KPA AxisNavigation 보존 | ✅ 동일 | ✅ |
| §6 AI 역할 (수신 + 능동) | △ frontend rule-based — AI Summary 영역이 backend 가 아니라 frontend 에 분산 | ✅ backend `generateRuleBasedInsights` 통합 — AI 영역의 SSOT 정합 | ✅ |
| §7 Drift 방지 (도메인 어휘 격리) | ✅ | ✅ | ✅ |
| **공통화 + 운영 흐름 정합 §2** | ❌ KPA 만 다른 패턴 — drift | ✅ **4 서비스 backend dashboard endpoint 정합** | ✅ |
| OPERATOR-DASHBOARD-STANDARD 5-Block | ✅ frontend output 정합 | ✅ frontend + backend 정합 | ✅ |
| KPA canonical reference (§13 O4O 공통 구조 원칙) | △ KPA 가 reference 이면서 dashboard 만 다른 패턴은 모순 | ✅ KPA reference 정합 강화 | ✅ |
| 1인 개발 속도 | ✅ 부담 0 | △ 3 WO + 1 CHECK 분할로 관리 가능 | ❌ 대형 변경 위험 |

> **종합**: Option B 가 모든 원칙과 정합. Option A 는 §2 공통화 + §13 KPA canonical reference 와 부분 충돌. Option C 는 § 정렬 점수는 같으나 1인 개발 속도와 회귀 리스크에서 부적합.

### 12.1 운영자 관점

> "운영자는 '핵심 요약 + 설명 + 링크 중심' dashboard 를 원함" — `OPERATOR-DASHBOARD-STANDARD-V1 §5-6~§5-9`.

- 현재 KPA frontend output 이 이미 이 형태 — Option B 도입해도 시각 변화 0
- backend 로 logic 이동 시 메시지 일관성 / severity 정합 / sort 정밀도가 frontend 의 한계 (operatorConfig.ts 의 한정된 levelOrder / splice(3) 패턴) 보다 정밀해질 가능성

### 12.2 1인 개발 속도

- 본 IR 작성 자체로 정책 결정 ✅ (즉시 코드 작업 없음)
- Tier 4 정책 결정 사이클의 일부로 처리
- Foundation WO + Adapter WO + Compat WO + CHECK 의 4 단계 분할 가능 — 각 단계 작음
- 외부 세션 작업 (ecommerce_orders, sidebar 공통화) 과 충돌 영역 0

---

## 13. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 작성 문서 | `docs/investigations/IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1.md` |
| 현재 KPA 구조 요약 | `/operator/summary` (17 query) + 6 보조 fetch → frontend `buildKpaOperatorConfig` 가 5-Block 조립. AI Summary + Action Queue 가 frontend rule-based. `OperatorDashboardLayout` 공통 컴포넌트 사용 — output 형태는 5-Block 통일. KPA 특수성: AxisNavigationSection 2축 + OperatorRoleGuideCard + isAdmin 분기 |
| 5-Block 비교 결과 | 3 서비스 모두 backend `/operator/dashboard` endpoint + `generateRuleBasedInsights` + pass-through builder. KPA 만 backend `/operator/summary` + frontend rule-based 조립. frontend output 은 동일 |
| 권장 옵션 | **Option B** — backend `/operator/dashboard` 추가, 기존 summary 유지, frontend 점진 전환 |
| 즉시 WO 필요 여부 | ❌ 즉시 진행 보다 Tier 4 정책 결정 사이클의 일부로 처리 권장. 본 IR 로 정책 확정만 |
| 보류 항목 | Option D 의 4 서비스 횡단 contract 단일화 (별도 IR `IR-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-CONTRACT-STANDARDIZATION-V1`), `/operator/dashboard` Compat layer 결정 (Adapter 완료 후) |
| 코드 / DB / migration / route / API / frontend 수정 | **없음** ✅ |
| 다른 세션 WIP 미포함 | ✅ (외부 세션 ecommerce_orders schema diff IR `IR-O4O-ECOMMERCE-ORDERS-VS-CHECKOUT-ORDERS-SCHEMA-DIFF-V1.md` 격리) |
| Commit 여부 | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 정책 결정 IR 완료. 권장 옵션 B (backend dashboard endpoint 추가, summary 유지, 점진 전환). 후속 4 단계 WO + CHECK 로 분할 진행 가능. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
