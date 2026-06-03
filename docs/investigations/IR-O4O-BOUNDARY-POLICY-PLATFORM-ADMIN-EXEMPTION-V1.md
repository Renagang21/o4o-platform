# IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1

> **조사 요청서 (Investigation Report)**
>
> 코드 수정 없음 / 데이터 수정 없음 / 정책 변경 없음
>
> Backend operator 콘솔 컨트롤러군의 `if (!scope.isPlatformAdmin)` 분기 — 즉 **platform admin 호출자에 대해 service boundary 필터를 비활성화하는 구조** — 가 O4O Boundary Policy(F6, FROZEN) 와 정합한지 조사한 보고서.

- **작성일:** 2026-05-23
- **분류:** Investigation Report (Read Only)
- **선행:**
  - [IR-O4O-NETURE-ADMIN-USERS-SCOPE-AUDIT-V1](IR-O4O-NETURE-ADMIN-USERS-SCOPE-AUDIT-V1.md) — 본 문제의 단일 endpoint 발견
  - [CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1](CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1.md) — leak 재현 검증
- **참조 SSOT:**
  - `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (F6, FROZEN)
  - `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md`
  - CLAUDE.md §7
- **버전:** V1

---

## 0. 조사 목적

`WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1` 이후 Neture `/admin/users` 의 cross-service leak 은 frontend 차원에서 차단되었다. 그러나 **backend exemption 구조 자체는 그대로 남아있다.**

본 IR 은:

1. exemption 패턴이 backend 전반에서 **얼마나 광범위**한가
2. 본 패턴이 **언제·왜** 도입되었는가
3. F6 Boundary Policy 와 **정합한가**
4. O4O Business Philosophy V1 와 **정합한가**
5. 미래 재발 가능성과 **위험 수준**
6. 정합화 방안 A/B/C 비교
7. 본 IR 의 권장 방향

을 확정하여, 후속 WO 의 수정 범위 / 우선순위 / 정책 변경 필요 여부 판단의 근거를 만든다.

> **본 IR 은 코드를 수정하지 않는다.** §6 의 권장 방향은 *제안* 이며, 채택 시 별도 WO 가 필요하다.

---

## 1. 조사 대상

### 1.1 코드 경로

| 항목 | 위치 |
|------|------|
| Service Scope 결정 | [apps/api-server/src/utils/serviceScope.ts](apps/api-server/src/utils/serviceScope.ts) |
| 핵심 exemption 패턴 | `if (!scope.isPlatformAdmin)` / `scope.isPlatformAdmin ? '' : <filter>` |
| Boundary Policy SSOT | `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` |
| Business Philosophy SSOT | `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` |
| Platform Hub (별도 존재) | [apps/api-server/src/modules/platform/platform-hub.controller.ts](apps/api-server/src/modules/platform/platform-hub.controller.ts) — cross-service aggregation 전용 endpoint |

### 1.2 정책 인용

**F6 Boundary Policy §4 Rule 3** (FROZEN, 2026-02-24):

> 모든 신규 개발은 아래 5개 규칙을 **예외 없이** 따른다.
>
> ### Rule 3: Domain Primary Boundary 필터 필수
>
> 모든 데이터 조회/변경 쿼리에 해당 Domain의 Primary Boundary를 적용한다.

→ **platform admin 우회 조항은 정책 문서에 명시되지 않는다.**

---

## 2. 조사 결과

### 2.1 Exemption 패턴 분포 — 5 개 이상의 endpoint

`scope.isPlatformAdmin` 분기로 boundary 필터를 비활성화하는 위치:

| Controller / Route | 메서드 | Endpoint | Domain | serviceKey query 지원 | 위험도 |
|--------------------|--------|----------|--------|:--------------------:|:-----:|
| `MembershipConsoleController` | `getMembers` | `GET /operator/members` | User × Service Membership | **YES** (수정됨) | Mitigated (frontend) |
| `MembershipConsoleController` | `getStats` | `GET /operator/members/stats` | 동일 | **YES** (수정됨) | Mitigated (frontend) |
| `StoreConsoleController` | `getStores` | `GET /operator/stores` | Store Ops (orgId) | **NO** | **Unmitigated** |
| `ProductConsoleController` | `getProducts` | `GET /operator/products` | Broadcast/Product Master | **NO** | **Unmitigated** |
| `ProductConsoleController` | (stats query) | 동일 응답에 stats 포함 | 동일 | **NO** | **Unmitigated** |
| `analytics.routes.ts` (3 endpoints) | `/summary`, `/actions`, `/breakdown` | `GET /operator/analytics/*` | Action Logs | **YES** (`serviceKey` query) | Caller 의존 |

**Type 분류**

본 IR 은 `isPlatformAdmin` 분기를 4 유형으로 분류한다.

| 유형 | 설명 | 적법성 |
|------|------|------|
| **A. Filter exemption** | List/Stats 쿼리에서 platform admin 이면 service_key 필터 제거 | **본 IR 의 검토 대상** (F6 Rule 3 충돌 가능) |
| **B. Resource access bypass** | `checkServiceBoundary(userId, ...)` — 단건 resource 의 소유권 검증 우회 | 적법 (단건 access control 의 일반적 패턴) |
| **C. Authorization gate** | `if (!scope.isPlatformAdmin) return 403` — platform admin 만 수행 가능한 작업의 가드 | 적법 (RBAC 의 일반적 패턴) |
| **D. Capability-aware logic** | `roles = scope.isPlatformAdmin ? getAllRoles() : getScopedRoles()` — 호출 결과 자체가 capability 의존 | 의존 (대상이 단순 데이터 조회면 A로 분류) |

→ **본 IR 의 검토 대상은 유형 A 만이다.** B/C 는 본 IR 의 권장에서 변경 대상이 아님.

### 2.2 도입 시점 및 의도

| Commit | 일자 | WO | 변경 |
|--------|------|----|------|
| `2e7711992` | 2026-03-11 | `WO-O4O-OPERATOR-CONSOLE-V1` | **최초 도입** — Operator Console (회원/상품/매장) 컨트롤러 신설 시점에 이미 `isPlatformAdmin` 분기 포함 |
| `1600f377d` | 2026-03-16 | `WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1` | **부분 강화** — non-platform-admin 의 service_key 필터 강제 (P0/P1 격리). platform admin 분기는 *유지* |
| `71fff186d` | 2026-05-23 | `WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1` | **Neture 단일 endpoint 완화** — frontend 가 `serviceKey=neture` 강제 전달. backend exemption 구조는 *유지* |

**의도 추정**

- 도입 시점(2026-03-11) 이전인 2026-02-24 에 **F6 Boundary Policy 가 이미 FROZEN** 상태였다.
- 그럼에도 Operator Console 신설 시 `if (!scope.isPlatformAdmin)` 분기로 platform admin 무필터를 *기본 동작* 으로 둠.
- 도입 의도는 commit log 에 명시되지 않음.
- 추정: **Operator Console 을 *platform-level 관리 도구로도* 동시에 사용하려는 설계** — 즉 같은 endpoint 가 (i) 서비스 운영자의 scoped 조회와 (ii) 플랫폼 관리자의 cross-service 조회 양쪽을 처리.

**그러나** 이 의도는:

- F6 Rule 3 **"예외 없이"** 조항과 충돌
- Business Philosophy V1 §3.2 의 *"Operator = 서비스 운영 사업자"* 정의와 충돌
- 별도 존재하는 `platform-hub.controller.ts` (Platform Global Hub) 의 책임 영역 침범

### 2.3 별도 존재하는 Platform Hub Controller

[apps/api-server/src/modules/platform/platform-hub.controller.ts:1-12](apps/api-server/src/modules/platform/platform-hub.controller.ts#L1-L12):

```ts
/**
 * Platform Hub Controller — Global Aggregation + Cross-Service Trigger Proxy
 *
 * WO-PLATFORM-GLOBAL-HUB-V1
 *
 * 플랫폼 통합 허브의 백엔드.
 * 모든 서비스 데이터를 집계하고, cross-service trigger를 프록시한다.
 *
 * Security:
 * - platform:admin / platform:super_admin 전용
 * - 서비스별 trigger는 화이트리스트 기반
 */
```

→ **cross-service aggregation 의 정식 endpoint 가 이미 존재.** Operator Console 의 platform admin 무필터 분기는 이 책임을 *중복으로 떠안고 있다*. 책임 분리 측면에서도 분기 자체가 anti-pattern.

### 2.4 우회 / 재발 가능성

| 경로 | 재발 가능성 |
|------|:----------:|
| Neture web `/admin/users` 의 platform:super_admin 호출 | **차단** — frontend 가 `serviceKey=neture` 강제 (WO-FIX-V1) |
| Neture web 의 다른 화면이 `/operator/members` 를 `serviceKey` 없이 호출 | **재발 가능** |
| KPA / GlycoPharm / Cosmetics web 의 platform admin 호출 | **재발 가능** — 동일 endpoint, 동일 분기 |
| **`/operator/stores`** (platform admin 호출) | **현재도 cross-service** — frontend fix 없음 |
| **`/operator/products`** (platform admin 호출) | **현재도 cross-service** — frontend fix 없음 |
| `/operator/analytics/*` | `serviceKey` query 미전달 시 cross-service |
| 외부 도구 / curl / API 클라이언트 | **항상 재발 가능** — frontend 가드 자체가 무관 |

**판정**

본 fix(WO-FIX-V1) 는 단일 endpoint(Neture members) 의 frontend 측 우회만 닫음. **Backend 의 구조적 문제는 그대로** 이며, 그 영향은 **5 개 이상 endpoint** 와 **외부 호출자 전체** 에 잠재.

### 2.5 Boundary Policy 정합 검토

| Rule | 조항 | 현재 구조의 정합성 |
|------|------|:-----------------:|
| Rule 1 — UUID 단독 조회 금지 | "Domain Primary Boundary 조건을 함께 적용" | **준수** (resource access 는 boundary check 적용) |
| **Rule 3 — Domain Primary Boundary 필터 필수** | **"모든 데이터 조회/변경 쿼리에 ... Primary Boundary 적용"** + **"예외 없이"** | **위반** (platform admin 분기에서 필터 부재) |
| Rule 4 — serviceKey 스푸핑 금지 | "URL 경로 파라미터에서만 추출" | 부분 위반 — `MembershipConsole.getMembers` 는 query 에서 `serviceKey` 수용 |

→ **F6 Rule 3 위반은 명백.** 정책 문서가 "예외 없이" 라고 명시한 점에 비추어, 본 분기는 정책 silent drift 에 해당.

### 2.6 Business Philosophy 정합 검토

[O4O-BUSINESS-PHILOSOPHY-V1 §3.2](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md):

> 운영사업자는 단순 승인 관리자나 시스템 운영자가 아니다.
>
> 운영사업자는 ... 매장 실행 자산을 생산·구성·운영한다.

[O4O-BUSINESS-PHILOSOPHY-V1 §7 Drift 방지 원칙]:

> **금지:** Operator = 승인 관리자

**판정**

- Operator Console endpoint(`/operator/*`) 은 *서비스 운영자(Operator)* 의 도구.
- platform admin 이 같은 endpoint 로 cross-service 조회를 하는 것은 Operator 정의의 *역방향 확장*.
- 의미적 책임 분리 측면에서, **platform admin 의 cross-service 조회는 `platform-hub` 영역**, **service operator 의 scoped 조회는 `operator` 영역** 으로 정렬되어야 함.

---

## 3. Conflict Check (필수 포함)

### Current Structure vs O4O Philosophy Conflict Check

| 차원 | Current | O4O Philosophy / Policy | 충돌 여부 |
|------|---------|------------------------|:--------:|
| Boundary Rule 3 ("예외 없이") | platform admin 분기에서 필터 비활성 | 예외 없이 필터 필수 | **충돌** |
| Operator endpoint 의미 | platform admin 도 사용 (cross-service) | Operator = 서비스 운영자 도구 | **충돌** |
| 책임 분리 | 같은 endpoint 가 operator + platform admin 동시 처리 | platform-hub 가 cross-service 전용 | **충돌** (책임 중복) |
| Resource access (단건) | platform admin bypass | RBAC 일반 패턴으로 적법 | 정합 |
| Authorization gate (RBAC) | platform admin only 분기 | RBAC 일반 패턴으로 적법 | 정합 |

**종합 판정: 부분 충돌 (구조 수정 권장)**

- 단건 access control / authorization gate 는 적법.
- **List/Stats 의 filter exemption 은 F6 Rule 3 + Business Philosophy 양쪽과 충돌.**
- 충돌 강도: 정책 문서가 "예외 없이" 라고 명시한 점에 비추어 **명시적 위반**. silent drift 가 약 2.5 개월간 누적 (2026-03-11 → 2026-05-23).

---

## 4. 위험도 평가

| 차원 | 평가 |
|------|------|
| **현재 leak 노출** | HIGH — 5 개 이상 endpoint 에서 platform admin 호출 시 cross-service 데이터 반환. `/operator/stores`, `/operator/products` 는 frontend mitigation 도 부재 |
| **재발 가능성** | HIGH — backend 구조 변경 없이는 새로운 frontend 화면 / 외부 호출에서 동일 leak 재발 |
| **악용 시나리오** | MEDIUM — platform admin 자체가 신뢰된 role 이라 의도적 악용은 낮음. 그러나 *실수에 의한 노출* 가능 |
| **정책 신뢰도** | HIGH — "예외 없이" 조항이 silent drift 로 5+ endpoint 에서 위반되는 상태가 누적 → F6 의 구속력 약화 |
| **수정 비용** | MEDIUM — backend 5 endpoint 의 분기 통일 + frontend 호출 패턴 검토 |
| **호환성 위험** | MEDIUM — 현재 platform admin 의 무필터 조회에 의존하는 외부 도구 / 디버깅 흐름이 있을 수 있음 |

**종합 위험도: 중-고 (Medium-High)** — 보안 사고 수준은 아니지만 정책 위반 + 재발 가능성으로 인해 시간이 갈수록 누적되는 구조적 부채.

---

## 5. 정합화 방안 비교 (A / B / C)

### Option A — 현 상태 유지 (Frontend 강제 패턴 확장)

**내용**: 각 frontend 화면이 자신의 `serviceKey` 를 명시적으로 backend 에 전달. backend exemption 구조는 유지.

**장점**

- 즉시 구현 가능 — 추가 backend 작업 없음
- 외부 도구 / platform-hub 의 cross-service 조회는 유지

**단점**

- F6 Rule 3 "예외 없이" 명시적 위반 잔존
- 신규 frontend 화면 / 외부 호출자가 누락 시 leak 재발
- 5+ endpoint × N 개 frontend caller 의 곱셈적 리뷰 부담
- silent drift 누적 가속화

**적합 상황**: 시간 / 비용 제약으로 단기 대증요법만 가능한 경우

---

### Option B — Backend Default Service Scope (Explicit Opt-out)

**내용**:

- Operator Console endpoint 의 default 동작을 **항상 scoped 조회** 로 변경
- platform admin 이 cross-service 조회를 원할 경우 **명시적 `?all=true` query 또는 `?serviceKey=<key>` 필수**
- `all=true` 와 `serviceKey` 미지정 시 platform admin 도 400 에러 (또는 빈 결과)

**예시 (검토용 — 실제 구현은 별도 WO)**

```ts
if (!scope.isPlatformAdmin) {
  // service operator: scope.serviceKeys 자동 적용
} else if (serviceKey && serviceKey !== 'all') {
  // platform admin + 명시적 serviceKey
} else if (req.query.all === 'true') {
  // platform admin + 명시적 cross-service 요청 (감사 로그 권장)
} else {
  return res.status(400).json({ success: false, error: 'serviceKey or all=true required for platform admin' });
}
```

**장점**

- F6 Rule 3 와 정합 — 명시적 opt-out 만 허용 (silent exemption 제거)
- 신규 caller 의 default 가 safe → silent leak 위험 0
- Platform Hub controller 와의 책임 분리 명확
- 감사 가능 (`all=true` 호출만 별도 로깅)

**단점**

- 기존 호출자 중 platform admin 으로 무필터 조회에 의존하던 케이스가 있다면 break — 사전 조사 필요
- 5+ endpoint 동시 수정 (backend WO 1 건 + 회귀 테스트)

**적합 상황**: F6 정책 정합과 재발 차단을 동시 확보하려는 경우 (본 IR 권장)

---

### Option C — Platform Admin 전용 Endpoint 분리

**내용**:

- `/operator/*` 는 service operator 전용 (platform admin 진입 자체를 거부 또는 강제 scoping)
- platform admin 의 cross-service 조회는 별도 `/platform/admin/*` 또는 기존 `/platform/hub/*` 확장

**장점**

- 책임 분리 최강 — endpoint 자체가 caller capability 와 1:1
- Business Philosophy §3.2 의 "Operator ≠ platform admin" 정의와 가장 정합
- 신규 endpoint 의 정책이 처음부터 깨끗

**단점**

- 가장 큰 작업 규모 — 신규 endpoint 5+ 추가 + frontend 호출 분기
- platform admin 이 동일 데이터를 보려면 endpoint 가 2 종이 됨
- Operator Console 의 admin/operator 통합 UI 패턴 재설계 필요

**적합 상황**: 장기적으로 platform-level 관리 도구를 독립적으로 키울 계획이 있는 경우

---

### 비교 매트릭스

| 항목 | A | B | C |
|------|:--:|:--:|:--:|
| F6 Rule 3 정합 | NO | YES | YES |
| Business Philosophy §3.2 정합 | 부분 | YES | YES |
| 재발 가능성 | HIGH | LOW | LOW |
| 구현 비용 | 0 | 중 | 고 |
| 호환성 위험 | 낮음 | 중 | 높음 |
| 책임 분리 | NO | 부분 | YES |
| 정책 신뢰도 회복 | NO | YES | YES |

---

## 6. 본 IR 의 권장 방향

### 6.1 권장: **Option B (Backend Default Service Scope + Explicit Opt-out)**

**근거**

1. **F6 Rule 3 "예외 없이" 와 정합** — silent exemption 을 explicit opt-in 으로 전환하여 정책의 구속력 회복
2. **재발 가능성 0** — backend default 가 safe 이므로 신규 frontend / 외부 호출자가 모두 자동으로 scoped
3. **호환성 부담 관리 가능** — `all=true` 와 `serviceKey` query 로 기존 cross-service 호출 케이스 명시적 수용
4. **C 의 endpoint 분리 비용 회피** — `/operator/*` 와 `/platform/*` 두 차원의 endpoint 설계 부담을 한 차례 미룰 수 있음

### 6.2 적용 범위 (제안 — WO 시작 시 사전 조사 권장)

| Endpoint | Option B 적용 우선순위 |
|----------|:--------------------:|
| `GET /operator/stores` (Store Ops 도메인, orgId boundary) | **HIGH** — 현재 frontend mitigation 부재 |
| `GET /operator/products` (Broadcast 도메인) + stats | **HIGH** — 동일 |
| `GET /operator/members` + `/stats` | MEDIUM — frontend 가 이미 `serviceKey=neture` 강제. 그러나 backend default 가 여전히 unsafe — 정책 정합 차원에서 통일 권장 |
| `GET /operator/analytics/*` | MEDIUM — 이미 `serviceKey` query 지원, default 만 safe 로 전환 |

---

## 7. 본 IR 이 결정하지 않는 것

- 실제 Option B 의 backend 변경 코드 (별도 WO)
- `all=true` 요청의 감사 로그 정책 (별도 WO 또는 본 WO 의 후속)
- 외부 호출자 / 디버깅 도구의 영향도 조사 (별도 IR 가능)
- `/platform/admin/*` 신규 endpoint 신설 여부 (Option C 채택 시 별도 IR)

---

## 8. WO 후보

| # | 산출물 | 비고 |
|---|--------|------|
| **W1** | `WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1` | Option B 채택 시 — 5 endpoint backend 변경 + 감사 로그 |
| W2 | `IR-O4O-OPERATOR-CONSOLE-PLATFORM-ADMIN-CALLER-AUDIT-V1` | W1 사전 — 현재 platform admin 호출 패턴 운영 데이터 조사 (영향도 측정) |
| W3 | `WO-O4O-BOUNDARY-POLICY-V1-AMENDMENT-V1` | Option B 채택 시 — F6 정책 문서에 "platform admin opt-out 명시" 조항 추가 (Freeze 변경 — 명시적 WO 필요) |
| W4 | `IR-O4O-PLATFORM-ADMIN-ENDPOINT-SEPARATION-V1` | Option C 채택 시 — 별도 endpoint 설계 |

순서: **W2 → W1 (+W3 병행) → 필요 시 W4**.

---

## 9. 사용자 확정 필요 항목

| # | 항목 | 본 IR 권고 |
|---|------|:----------:|
| 1 | exemption 패턴이 F6 Rule 3 위반인지 / 정책 예외인지 확정 | **위반으로 판정** (§2.5, §3) |
| 2 | 권장 방안 — A / B / C 중 선택 | **B** (§6.1) |
| 3 | Option B 적용 범위 — HIGH 만 / 전체 / 단계적 | **단계적**: HIGH 우선, MEDIUM 다음 sprint |
| 4 | `all=true` 미지정 시 platform admin 응답 — 400 / 빈 결과 / 경고 + 빈 결과 | **400** — 명시적 caller 에러 인식 우선 |
| 5 | W3 (F6 정책 문서 amendment) 동반 여부 | **동반 권장** — 코드 변경 시 정책 문서 동기화 |
| 6 | W2 (caller audit) 선행 여부 | **권장** — 호환성 위험 사전 측정 |

---

## 10. 부록 — Exemption 분기 전수 매핑

| 파일 | Line | 패턴 | 유형 |
|------|------|------|------|
| `serviceScope.ts` | 42-44 | `extractServiceScope`: platform admin → empty keys | 적법 (scope 정의) |
| `MembershipConsoleController.ts` | 88 | `getMembers` filter exemption | **A** |
| `MembershipConsoleController.ts` | 245, 449, 580, 689, 757, 1091 | `checkServiceBoundary` bypass | B |
| `MembershipConsoleController.ts` | 997 | role assign — scope check | B/C |
| `MembershipConsoleController.ts` | 1163 | `getStats` filter exemption | **A** (수정됨, default 는 여전히 무필터) |
| `StoreConsoleController.ts` | 47 | `assertStoreAccess` bypass | B |
| `StoreConsoleController.ts` | 81 | `getStores` filter exemption | **A** |
| `StoreConsoleController.ts` | 146 | stats params | **A** |
| `StoreConsoleController.ts` | 162, 171 | JOIN exemption | **A** |
| `StoreConsoleController.ts` | 582 | scope passthrough to service | D |
| `ProductConsoleController.ts` | 50 | `getProducts` filter exemption | **A** |
| `ProductConsoleController.ts` | 112, 115, 179 | stats / scope exemption | **A** |
| `RoleController.ts` | 32 | list — capability-aware | D |
| `RoleController.ts` | 84, 123, 157 | create/update/delete auth gate | C |
| `analytics.routes.ts` | 51, 142, 278 | platform admin → requestedService 기반 | **A** (semi-mitigated by `serviceKey` query) |

→ **유형 A (filter exemption) 가 약 11 곳** 에서 발견. 본 IR 의 권장 Option B 적용 범위와 일치.

---

*Version: V1 (2026-05-23)*
*Status: Investigation Report — 사용자 확정 대기*
*Next: 사용자 검토 → §9 확정 → WO 단계 진입 또는 후속 IR 작성*
