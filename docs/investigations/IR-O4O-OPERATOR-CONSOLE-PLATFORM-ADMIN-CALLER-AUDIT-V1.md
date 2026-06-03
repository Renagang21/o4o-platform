# IR-O4O-OPERATOR-CONSOLE-PLATFORM-ADMIN-CALLER-AUDIT-V1

> **조사 요청서 (Investigation Report)**
>
> 코드 수정 없음 / 데이터 수정 없음 / 정책 변경 없음
>
> `IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1` 의 권장안 Option B(`backend default scope + explicit opt-out`) 적용 전, 현재 운영 환경에서 `platform admin 무필터 조회` 에 실제 의존 중인 caller 가 존재하는지를 전수 조사한 보고서.

- **작성일:** 2026-05-23
- **분류:** Investigation Report (Read Only)
- **선행:**
  - [IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1](IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1.md) — Option B 권장
  - [IR-O4O-NETURE-ADMIN-USERS-SCOPE-AUDIT-V1](IR-O4O-NETURE-ADMIN-USERS-SCOPE-AUDIT-V1.md) — 원 문제
  - [CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1](CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1.md) — leak 검증
- **참조 SSOT:**
  - `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (F6)
  - `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md`
  - CLAUDE.md §7
- **버전:** V1

---

## 0. 조사 목적

Option B 적용 시 platform admin 호출에 `serviceKey` 또는 `all=true` 미전달 → 400 응답으로 break 가 발생한다. 본 IR 은:

1. 현재 7 개 endpoint 의 **전체 caller inventory** 작성
2. 각 caller 의 `serviceKey` 전달 패턴 분류 (A/B/C/D)
3. 실제 운영에서 **의도된 cross-service 사용** 여부 확정
4. Option B 적용 시 **break 예상 범위 / 우선순위**
5. **W1 진행 가능 여부 판정**

을 수행한다.

> 본 IR 은 코드를 수정하지 않는다. 다만 §7 의 판정으로 W1 (실제 backend 수정 WO) 의 착수 가능 여부를 결정한다.

---

## 1. 조사 대상 Endpoint (7 개)

| # | Endpoint | Domain | 위험도 (이전 IR 기준) |
|---|----------|--------|:---------------------:|
| 1 | `GET /operator/members` | User × Service Membership | MEDIUM (FE 부분 mitigation) |
| 2 | `GET /operator/members/stats` | 동일 | MEDIUM |
| 3 | `GET /operator/stores` | Store Ops (orgId) | **HIGH** (FE mitigation 부재) |
| 4 | `GET /operator/products` | Broadcast / Product Master | **HIGH** |
| 5 | `GET /operator/analytics/summary` | Action Logs | MEDIUM |
| 6 | `GET /operator/analytics/actions` | 동일 | MEDIUM |
| 7 | `GET /operator/analytics/breakdown` | 동일 | MEDIUM |

> 단건 조회/수정(`/operator/members/:id`, `/operator/stores/:id` 등) 은 Type B (resource access) 로 Option B 영향 밖.

---

## 2. Caller Inventory — 전체 매핑

### 2.1 Frontend 콜러 매트릭스

| Service | File | Endpoint | serviceKey 전달 | Caller Role Context |
|---------|------|----------|:--------------:|:-------------------:|
| **web-neture** | `UsersManagementPage.tsx` | `/operator/members` + `/stats` + `?limit=1000` | **YES** (WO-FIX-V1) | platform:super_admin · neture:admin · neture:operator |
| web-neture | `AnalyticsPage.tsx` | `/operator/analytics/{summary,actions,insight}` | **YES** (`SERVICE_KEY='neture'`) | neture:operator |
| web-neture | `StoreManagementPage.tsx` | `/operator/stores?...` | **NO** | neture:operator (auto-scoped via `injectServiceScope`) |
| **web-kpa-society** | `UsersPage.tsx` | `/operator/members?...` | **NO** | kpa:operator (auto-scoped) |
| web-kpa-society | `MemberManagementPage.tsx` | `/operator/members?...` | **NO** | kpa:operator |
| web-kpa-society | `OperatorStoresPage.tsx` | `/operator/stores?...` | **NO** | kpa:operator |
| web-kpa-society | `KpaOperatorDashboard.tsx` | `/operator/stores?limit=1` (KPI count) | **NO** | kpa:operator |
| web-kpa-society | `AnalyticsPage.tsx` | `/operator/analytics/*` | **NO** | kpa:operator |
| **web-glycopharm** | `UsersPage.tsx` | `/operator/members?...` | **NO** | glycopharm:operator |
| web-glycopharm | `StoresPage.tsx` | `/operator/stores?...` | **NO** | glycopharm:operator |
| web-glycopharm | `ProductsPage.tsx` | `/operator/products?...` | **NO** | glycopharm:operator |
| web-glycopharm | `AnalyticsPage.tsx` | `/operator/analytics/*` | **YES** (`SERVICE_KEY='glycopharm'`) | glycopharm:operator |
| **web-k-cosmetics** | `UsersPage.tsx` | `/operator/members?...` + `/stats` + `?limit=1000` | **NO** | cosmetics:operator |
| web-k-cosmetics | `StoresPage.tsx` | `/operator/stores?...` | **NO** | cosmetics:operator |
| web-k-cosmetics | `ProductsPage.tsx` | `/operator/products?...` | **NO** | cosmetics:operator |
| **apps/admin-dashboard** | `api/pop.api.ts` | `/operator/products?...` | **NO** | platform admin (POP 제작 도구) |
| apps/admin-dashboard | `pages/operator/AuthAnalyticsPage.tsx` | `/operator/analytics/auth/logs` | **NO** | platform admin |

### 2.2 단건 콜러 (Type B — Option B 영향 밖)

전 frontend 의 `EditUserModal.tsx`, `UserDetailPage.tsx`, `StoreDetailPage.tsx`, `ProductDetailPage.tsx` — UUID 기반 단건 조회/수정. backend `checkServiceBoundary(userId/storeId, scope.serviceKeys)` 적용. **Option B 영향 없음.**

### 2.3 External / Cron / Script Callers

| 위치 | 결과 |
|------|------|
| `scripts/` | **0건** (grep no match) |
| `**/*.{sh,py,js,mjs,cjs}` | **0건** |
| `apps/api-server` 내 service-to-service | 0건 — endpoint 언급은 모두 *route 정의 / 컨트롤러 자체 / metadata* 로, 외부 caller 아님 |

→ 외부 호출자는 **발견되지 않음**.

---

## 3. serviceKey 전달 패턴 분류 (A / B / C / D)

| 분류 | 정의 | 해당 caller |
|------|------|------------|
| **A. 항상 serviceKey 전달** | 호출 시 무조건 `serviceKey` 또는 `SERVICE_KEY` 상수를 query 에 포함 | web-neture `UsersManagementPage` · web-neture `AnalyticsPage` · web-glycopharm `AnalyticsPage` |
| **B. 조건부 전달** | 일부 조건에서만 전달 | **0건** — 분류 B 에 해당하는 caller 없음 |
| **C. 미전달 (service-scoped operator)** | serviceKey 미전달이지만 caller role 이 service operator → backend `injectServiceScope` 자동 적용으로 safe | kpa `UsersPage` · kpa `MemberManagementPage` · kpa `OperatorStoresPage` · kpa `KpaOperatorDashboard` · kpa `AnalyticsPage` · glycopharm `UsersPage` · glycopharm `StoresPage` · glycopharm `ProductsPage` · k-cosmetics `UsersPage` · k-cosmetics `StoresPage` · k-cosmetics `ProductsPage` · web-neture `StoreManagementPage` |
| **D. 미전달 + platform admin 컨텍스트 (위험)** | serviceKey 미전달 + caller 가 platform admin 권한으로 호출 가능 → cross-service leak 발생 | **admin-dashboard `pop.api.ts`** (platform admin 도구) · 그 외 분류 C 의 모든 caller 도 *platform:super_admin 보유자가 해당 web 에 접근하면* D 로 전환 |

**분류 D 의 이중성**

분류 C 의 모든 caller 는 *service operator 단독 사용 시* 안전하다. 그러나 **platform:super_admin 보유자가 해당 service web 에 진입하면** 즉시 D 로 전환되어 cross-service leak 이 발생한다 — 이것이 본 IR 시리즈가 다루는 핵심 leak surface. 단, *어떤 운영자도 의도적으로 platform admin 으로 service-scoped web 에 접근하지는 않음* (운영적 관행) — 따라서 leak 은 "*실수 / 우연* 의 리스크" 이지 "*의도된 의존*" 이 아님.

**진짜 분류 D — 운영적으로 의존 중인 caller**

운영 환경에서 *의도적으로* platform admin 의 무필터 동작에 의존하고 있는 caller:

| File | Endpoint | 의존 형태 | 영향 |
|------|----------|----------|------|
| `apps/admin-dashboard/src/api/pop.api.ts` | `/operator/products?...` | POP 제작 도구 — platform admin 이 cross-service 상품 풀을 조회한다고 *추정됨* | Option B 적용 시 **break** — `?all=true` 또는 `?serviceKey=<key>` 명시 필요 |

→ **운영적 의존 caller 는 1 건.** 그 외 모든 분류 C caller 는 service operator 사용으로 안전.

---

## 4. 실제 운영 영향도

### 4.1 의도된 cross-service 사용 여부

| Caller | cross-service 의도? | 판정 |
|--------|:------------------:|:----:|
| service-scoped frontends (kpa / glyco / cosmetics) 의 모든 list page | **NO** — 각 web 은 본인 서비스 회원/매장/상품만 보는 것이 명백한 의도 | legacy drift (의도 없음) |
| web-neture `/admin/users` | **NO** — Neture 회원 관리 의도 (WO-FIX-V1 으로 확정) | 의도 없음 |
| web-neture `/operator/stores` | **NO** — Neture 매장 관리 의도 | 의도 없음 (구조적 leak 잔존) |
| **admin-dashboard `pop.api.ts`** | **확정 필요** — POP 제작이 cross-service 상품을 필요로 하는지 명시 SSOT 없음. 코드 주석상 "platform 상품 관리" 로 표현되어 *cross-service 가능성 있음* | **사용자 / 도메인 확정 필요** |
| `platform-hub.controller.ts` | **YES** (의도된 cross-service) | 본 IR 의 검토 대상 밖 (별도 endpoint) |

→ **확정 필요 caller 1 건** (admin-dashboard POP api). 다른 모든 caller 는 *legacy drift* 로 판정.

### 4.2 의존도 판정

| 판정 | caller |
|------|--------|
| **required** (의도된 cross-service 의존) | 0 건 — `/operator/*` 범위에서. (platform-hub 는 별도 endpoint 라 본 IR 밖) |
| **optional** (필요 시만 cross-service) | 1 건 후보 (admin-dashboard pop.api.ts — POP 제작 의도 확정 필요) |
| **legacy drift** (의도 없이 노출) | 모든 분류 C caller (service-scoped frontend) — Option B 적용 시 변경 없이 정상 동작 |

---

## 5. Option B Break 예상 범위

### 5.1 Break 시나리오 분류

Option B 적용 시 platform admin caller 가 serviceKey/all=true 둘 다 미전달 → 400.

| 시나리오 | 발생 조건 | 영향 |
|---------|----------|------|
| **S-A** | service operator (kpa:operator 등) 가 본인 서비스 web 사용 | **영향 없음** — `injectServiceScope` 자동 적용 |
| **S-B** | platform:super_admin 이 service-scoped web 사용 | 현재 *cross-service leak* → Option B 후 *400* . 의미적으로는 leak 방지가 옳지만 사용자 체감은 break |
| **S-C** | admin-dashboard `pop.api.ts` (platform admin context) | **확정적 break** — fix: 1줄 (`?serviceKey=...` 또는 `?all=true` 추가) |
| **S-D** | 외부 도구 / curl / cron | 발견된 caller 0 — 위험 가시화 가능 (400 응답으로 즉시 표면화) |

### 5.2 Break 우선순위 — 깨지는 화면 / API 목록

| 영역 | 항목 | 우선순위 |
|------|------|:--------:|
| admin-dashboard | POP 상품 목록 조회 (`pop.api.ts:66`) | **HIGH** — fix 사소 (1줄) |
| platform:super_admin (sohae2100 등) | service-scoped web 의 list page 접근 시 데이터 0건 표시 | MEDIUM — 운영적으로 *옳은 동작* (해당 web 은 본인 서비스 operator 의 도구임) |
| Auth Analytics (admin-dashboard) | `/operator/analytics/auth/logs` | LOW — analytics 는 `serviceKey` query 지원 + 별도 sub-path |
| 그 외 service-scoped frontend | 영향 없음 (분류 C, 자동 scoped) | — |

### 5.3 깨지는 운영 흐름

운영 흐름 단위로는 **2 가지 break 만** 예상:

1. **admin-dashboard POP 제작** — platform admin 이 상품 풀 조회 시 결과 0건. 즉시 fix 필요 (Option B WO 와 동시 또는 선행).
2. **platform:super_admin 이 service web 의 admin/operator 페이지에 진입하는 운영 패턴** — 이 패턴 자체가 leak 의 원인이었으므로, Option B 가 break 시키는 것은 *의도된 정합화*.

---

## 6. Boundary 우회 재발 가능성

### 6.1 신규 frontend 추가 시

| 항목 | 현재 (Option A) | Option B 적용 후 |
|------|----------------|------------------|
| 신규 service operator frontend | safe (auto-scope) | safe (변경 없음) |
| 신규 service operator + serviceKey 누락 + platform admin caller | **leak 발생** | **400 — 명시 강제** |
| 신규 platform admin tool | **leak 발생** (default 무필터) | **400 — `?all=true` 명시 강제** |

→ Option B 적용 후 **재발 surface = 0**. 명시 opt-in 만 허용되므로 silent leak 불가.

### 6.2 외부 API caller 영향

- 코드베이스 grep 결과: 외부 caller **0 건**.
- 잠재 외부 caller (curl / postman / 운영 스크립트) 의 경우: Option B 적용 시 즉시 400 으로 표면화 → **silent corruption 위험 없음**.
- 호환성 위험: 발견된 외부 caller 없으므로 측정된 호환성 영향 = 0.

### 6.3 curl / 운영 스크립트 영향

`scripts/` 와 `**/*.{sh,py,js,mjs,cjs}` 전수 grep — `/operator/{members,stores,products,analytics}` 호출 **0 건**. 운영 환경에서 *발견 가능한 외부 스크립트 영향* 없음.

---

## 7. Current Structure vs O4O Philosophy Conflict Check (필수)

| 차원 | Current | O4O Philosophy / Policy | 충돌 |
|------|---------|------------------------|:----:|
| F6 Rule 3 "예외 없이" | 5+ endpoint filter exemption | 예외 없이 필터 | **충돌** (silent drift 누적) |
| Operator endpoint 책임 | platform admin 도 사용 (cross-service) | Operator = service operator 의 도구 | **충돌** |
| platform-hub 책임 분리 | cross-service aggregation 전용 별도 endpoint 존재 | URL ↔ caller capability 1:1 | **책임 중복** |
| URL 의미 ↔ 데이터 범위 | `kpa-society.co.kr/operator/members` 가 cross-service 데이터 반환 가능 | URL 컨텍스트 = 데이터 범위 | **의미 단절** |
| platform-scope vs service-scope role | platform admin 이 service operator UI 진입 시 무필터 | service-scoped UI = service-scoped 데이터 | **부분 충돌** |

→ **부분 충돌 — 구조 수정 권장**. Option B 가 모든 충돌 차원을 해소.

---

## 8. 종합 판정 — W1 진행 가능 여부

### 8.1 정량 요약

| 지표 | 값 |
|------|------|
| 조사 endpoint 수 | 7 |
| Frontend 콜러 (list/stats) | 16 곳 |
| 분류 A (안전, 변경 불필요) | **3** |
| 분류 C (자동 scoped, Option B 영향 0) | **12** |
| 분류 D (운영적 의존 — fix 필요) | **1** (admin-dashboard `pop.api.ts`) |
| 외부 caller | 0 |
| 의도된 cross-service 의존 | 0 (operator endpoint 범위에서) |

### 8.2 W1 (`WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1`) 진행 가능 여부

| 차원 | 판정 |
|------|------|
| 호환성 위험 수준 | **LOW** — 1 건 명시적 fix (1 줄) + service operator 영향 0 |
| 의도된 cross-service caller 존재 | **0** — break 가 *기대된 동작* 인 케이스만 존재 |
| 외부 caller 영향 | **0** — 미발견 |
| 정책 정합 | **PASS** — F6 Rule 3 위반 해소 |
| Conflict Check | **부분 충돌 → Option B 로 정합** |

→ **PASS — W1 진행 가능**.

### 8.3 W1 진행 시 동반 작업

W1 의 backend WO 와 *동시 / 동반* 처리 권장 사항:

| # | 항목 |
|---|------|
| **(a)** | admin-dashboard `pop.api.ts:66` 의 `/operator/products` 호출에 `?serviceKey=<key>` 또는 `?all=true` 명시 추가. 어느 쪽인지 사용자 / 도메인 확정 필요 — POP 제작이 platform-level cross-service 인지 service-scoped 인지 |
| (b) | admin-dashboard `AuthAnalyticsPage.tsx:42` 의 `/operator/analytics/auth/logs` 호출은 별도 sub-path 라 본 7-endpoint 와 분리 — 그러나 동일 패턴 점검 권장 |
| (c) | service-scoped frontend (kpa/glyco/cosmetics) 의 list page 는 변경 없이 통과 — 단, 회귀 테스트 권장 |
| (d) | platform:super_admin 의 service web 진입 정책 — RouteGuard 강화 또는 명시적 안내 화면 추가 검토 (선택, 후속) |

---

## 9. 사용자 확정 필요 항목

| # | 항목 | 본 IR 권고 |
|---|------|:----------:|
| 1 | W1 (Option B 구현) 진행 가능 여부 | **PASS** (§8.2) |
| 2 | admin-dashboard POP 제작이 cross-service 의도인지 | **사용자 확정 필요** — 본 IR 의 단일 미해결 항목 |
| 3 | W1 동시 동반: admin-dashboard pop.api.ts fix | **권장** — 1 줄 |
| 4 | W3 (F6 정책 문서 amendment) 동반 시점 | W1 코드 변경 시점에 동반 |
| 5 | `all=true` 호출의 감사 로그 | **권장** — 별도 task 가능 |
| 6 | platform admin 의 service web 접근 패턴 (RouteGuard 강화) | **후속** — 본 IR 범위 밖, 별도 IR 가능 |

---

## 10. 본 IR 이 결정하지 않는 것

- W1 의 실제 코드 변경 (별도 WO)
- admin-dashboard POP 의 cross-service 의도 확정 (사용자 / 도메인 결정)
- 운영 환경의 외부 caller 실제 트래픽 측정 (gateway log 분석 — 본 IR 의 read-only 범위 밖)
- RouteGuard 강화 (별도 IR/WO)

---

## 11. 후속 작업

| # | 산출물 | 비고 |
|---|--------|------|
| **다음** | `WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1` | W1 — Option B backend 구현 + admin-dashboard pop.api.ts fix |
| 동반 | `WO-O4O-BOUNDARY-POLICY-V1-AMENDMENT-V1` | W3 — F6 정책 문서 동기화 |
| 선택 | `IR-O4O-PLATFORM-ADMIN-ROUTEGUARD-V1` | platform admin 의 service web 진입 정책 정비 |
| 선택 | `IR-O4O-OPERATOR-CONSOLE-PRODUCTION-TRAFFIC-AUDIT-V1` | 운영 gateway log 기반 caller 패턴 측정 |

---

*Version: V1 (2026-05-23)*
*Status: Investigation Report — W1 진행 가능 (PASS)*
*Next: 사용자 검토 → admin-dashboard POP 의도 확정 → W1 착수*
