# IR-O4O-ADMIN-DASHBOARD-OPERATOR-API-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI 변경 없음.**
>
> `apps/admin-dashboard` SPA 가 `/api/v1/operator/*` 계열 API 를 호출하는 부분이 F6 Boundary Policy 와 정합하는지 audit.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1](IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1.md) (4 service)
  - [CHECK-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1](CHECK-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1.md) (4 service 정렬 완료)
- **참조 SSOT:** `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (F6)
- **검증 환경:** Production (`api.neture.co.kr`, project `netureyoutube`)
- **검증 채널:** 코드 정적 분석 + Cloud Run 로그 (read-only)
- **수정 행위:** **없음** (조사 전용)
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음.

---

## 0. 최종 결론

### ✅ admin-dashboard 의 backend `/operator/*` 호출 = **정렬 완료, drift 없음**

| 호출 | endpoint | 분류 | 상태 |
|---|---|:---:|:---:|
| `pop.api.ts:67-70` | `GET /operator/products` (POP 제작) | **B. cross-service** | ✅ 이미 `all=true` 명시 |
| `AuthAnalyticsPage.tsx:42` | `GET /operator/analytics/auth/logs` | scope 무관 (resolveOperatorScope 미사용) | ✅ strict-400 대상 아님 |
| `OperatorCard.tsx:31` | (commented out) `// /api/v1/operator/stats` | D. dead code | ✅ 무영향 |

→ **즉시 수정 필요 항목: 0 건. 정책 결정 필요 항목: 0 건.**

production 14 일 로그 교차검증:
- `/operator/products?all=true`: **200 OK** (2026-05-23 2회) — admin-dashboard pop 호출 정상 작동
- `/operator/analytics/auth/logs`: 호출 0 건 (사용 빈도 매우 낮음, 다만 404/400 도 0)

선행 IR + WO 결과를 고려하면, **F6 Boundary Policy 의 모든 strict-400 endpoint (members×2 + products + stores + analytics×3) 의 frontend 정렬은 4 service + admin-dashboard 합쳐 완료된 상태**.

### 즉시 WO 후보

**없음.** admin-dashboard 의 operator API 호출은 이미 정렬되어 있어 추가 작업 불필요.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 (0 commits 차이) |
| 조사 범위 | `apps/admin-dashboard/src` + apps/api-server backend (cross-reference) + Cloud Run logs (14 일) |

---

## 2. 산출물 1 — admin-dashboard 의 `/operator/*` 호출 전수 목록

### 2.1 grep 결과 (전체)

```
$ grep -rn "/api/v1/operator/\|'/operator/\|`/operator/\|\"/operator/" apps/admin-dashboard/src
```

| 라인 | 위치 | 종류 |
|---|---|---|
| `admin-menu.static.tsx:296` | `path: '/operator/kpa/snapshots'` | **internal route** (admin SPA 의 라우트 path, backend API 아님) |
| `admin-menu.static.tsx:302` | `path: '/operator/kpa/force-assets'` | 동일 |
| `pop.api.ts:70` | `/api/v1/operator/products?...` | **backend API 호출** |
| `platform.routes.tsx:138,147,157,166,175,202,211,220` | 8건 `path: '/operator/...'` | **internal route** |
| `OperatorCard.tsx:31` | `// const response = ... /api/v1/operator/stats` | **commented out (dead)** |
| `AdminSnapshotBrowserPage.tsx:295` | `navigate('/operator/kpa/force-assets', ...)` | **internal route navigation** |
| `AuthAnalyticsPage.tsx:42` | `/api/v1/operator/analytics/auth/logs` | **backend API 호출** |

### 2.2 정리

| 분류 | 건수 |
|---|:---:|
| backend API 호출 (live) | **2** |
| backend API 호출 (commented out / dead) | **1** |
| internal SPA route 또는 navigate | **11** |

→ **실제 backend `/api/v1/operator/*` 호출은 2 개만.** 나머지는 admin-dashboard 자체의 SPA 라우트 path (당연히 audit 대상 외).

---

## 3. 산출물 2 — endpoint 별 serviceKey / all=true 전달 여부

### 3.1 pop.api.ts:67-70

[apps/admin-dashboard/src/api/pop.api.ts:60-71](apps/admin-dashboard/src/api/pop.api.ts#L60-L71):
```ts
const query = new URLSearchParams();
if (params?.page) query.set('page', String(params.page));
if (params?.limit) query.set('limit', String(params.limit));
if (params?.search) query.set('search', params.search);
// WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1:
// POP 제작은 platform 레벨 cross-service 도구로 정의. backend Option B 가
// platform admin caller 에 명시 opt-in 을 요구하므로 all=true 를 강제 전달.
query.set('all', 'true');

const response = await authClient.api.get<any>(
  `/api/v1/operator/products?${query.toString()}`,
);
```

| 항목 | 값 |
|---|---|
| serviceKey | ❌ 미전달 (의도된 — cross-service 도구) |
| `all=true` | ✅ **명시** (line 67) |
| 의도 | platform 레벨 cross-service POP 제작 도구. 모든 서비스의 상품 후보를 본다. |
| 정합성 | ✅ F6 Boundary Policy `all=true` opt-in 정합 |
| logCrossServiceQuery audit | ✅ backend 가 자동 기록 (resolveOperatorScope crossService=true 분기) |

### 3.2 AuthAnalyticsPage.tsx:42

[apps/admin-dashboard/src/pages/operator/AuthAnalyticsPage.tsx:39-43](apps/admin-dashboard/src/pages/operator/AuthAnalyticsPage.tsx#L39-L43):
```ts
const params: Record<string, string> = { limit: '200' };
if (status) params.status = status;
const res = await authClient.api.get<AuthLogsResponse>('/api/v1/operator/analytics/auth/logs', { params });
```

| 항목 | 값 |
|---|---|
| serviceKey | ❌ 미전달 |
| `all=true` | ❌ 미전달 |
| backend 의 scope 분기 | **`resolveOperatorScope` 미사용** (선행 IR §2 분류, analytics.routes.ts:205 의 auth/logs 핸들러는 별도 분기) |
| 정합성 | ✅ scope 무관 endpoint — 두 query 모두 불필요 |

### 3.3 OperatorCard.tsx:31

```ts
// const response = await authClient.api.get('/api/v1/operator/stats');
```

→ **commented out (dead code).** 실제 호출 없음.

---

## 4. 산출물 3 — Backend strict-400 endpoint 와의 매칭표

선행 IR §2 의 strict-400 endpoint (resolveOperatorScope 사용) 와 admin-dashboard 호출의 매칭:

| Backend strict-400 endpoint | admin-dashboard 호출 | 정렬 |
|---|---|:---:|
| `GET /operator/members` | (없음) | — |
| `GET /operator/members/stats` | (없음) | — |
| `GET /operator/products` | ✅ pop.api.ts:70 — `all=true` 명시 | ✅ 정합 |
| `GET /operator/stores` | (없음) | — |
| `GET /operator/analytics/summary` | (없음) | — |
| `GET /operator/analytics/actions` | (없음) | — |
| `GET /operator/analytics/insight` | (없음) | — |
| `GET /operator/analytics/auth/logs` (scope 무관) | ✅ AuthAnalyticsPage.tsx:42 | ✅ 무관 |

→ admin-dashboard 가 호출하는 strict-400 endpoint 는 **products 1 개**, 그 1 개도 이미 정렬됨.

---

## 5. 산출물 4 — production 400 로그 교차검증 (14 일)

```
=== /operator/products?all=true ===
2026-05-23T06:28:18  status=200  /operator/products?page=1&limit=20&all=true
2026-05-23T06:11:10  status=200  /operator/products?limit=5&all=true

=== /operator/analytics/auth/logs ===
(최근 14d 호출 0건)
```

→ **admin-dashboard 의 호출이 production 에서 400 받은 적 없음.** 2 회 발생한 호출 모두 200 OK.

`/operator/analytics/auth/logs` 는 호출 자체가 0 — admin-dashboard 의 AuthAnalyticsPage 가 실 사용되지 않거나, Rena 가 거기에 접속할 일이 거의 없는 화면.

선행 IR 의 production 400 로그 (products / stores / analytics) 는 모두 **service-specific frontend 의 미정렬 호출**이었음. admin-dashboard 측은 정렬 상태였음을 본 IR 이 확인.

---

## 6. 산출물 5 — 위험도 분류표

| 호출 | 분류 | 사유 |
|---|---|---|
| pop.api.ts:70 | **D. 정상** | `all=true` 명시 + 200 OK 확인 + 코드 주석에 의도 명시 |
| AuthAnalyticsPage.tsx:42 | **D. 정상** | scope 무관 endpoint (resolveOperatorScope 미사용) |
| OperatorCard.tsx:31 | **D. 정상 (commented)** | 이미 dead code. cleanup 가치는 있으나 본 IR 범위 외 |

→ A (즉시 수정) / B (정책 결정) / C (보류) **모두 0 건**.

---

## 7. 산출물 6 — 수정 필요 후보

### 즉시 수정: 없음

admin-dashboard 의 backend operator 호출 2 건 모두 이미 정합. 추가 작업 불필요.

### 부차 cleanup (별건, 본 IR 범위 외)

- `OperatorCard.tsx:31` 의 commented out 호출 라인 — dead code 정리 (별건 cleanup IR)

---

## 8. 산출물 7 — 정책 결정 필요 항목

### 결정 필요: 없음

선행 WO 들이 모든 4 service frontend 의 strict-400 endpoint 호출을 정렬했고, admin-dashboard 도 이미 정렬되어 있음. F6 Boundary Policy 의 의도 (silent platform admin exemption 제거 → 명시 opt-in) 가 monorepo 전체에서 일관 적용된 상태.

### 향후 정책 논의 거리 (본 IR 범위 외)

| 항목 | 결정 위치 |
|---|---|
| origin header 기반 serviceKey 자동 추론 (F6 정책 완화) | 별건 정책 논의 — **본 IR 비권장** (silent exemption 으로 회귀) |
| platform admin cross-service 호출의 audit 로그 보강 | 이미 `logCrossServiceQuery` 가 처리 — 추가 보강은 별건 |
| admin-dashboard 가 operator endpoint 를 호출하는 것의 적정성 (vs admin 전용 endpoint 신설) | 사용 빈도 매우 낮음 (pop 1 건) — 별도 admin endpoint 신설은 과잉 |

---

## 9. 산출물 8 — 후속 WO 제안

### 즉시 WO: 없음

본 IR 의 결과 = "admin-dashboard 의 operator 호출은 이미 정렬됨". WO 후보 없음.

### 부차 cleanup WO (선택 사항)

**`WO-O4O-ADMIN-DASHBOARD-OPERATOR-CARD-CLEANUP-V1`** (제안, 우선순위 낮음)
- `OperatorCard.tsx:31` 의 commented out 호출 라인 제거
- 매우 작은 cleanup — 별건으로 미루어도 무방

---

## 10. 산출물 9 — 현재 구조 vs O4O 철학 충돌 체크

| 차원 | 현재 (audit 결과) | 충돌 |
|---|:---:|:---:|
| admin-dashboard 는 platform admin 전용인가 | ✅ 그렇다 (routes/platform.routes.tsx 의 `AdminProtectedRoute requiredRoles=['admin','super_admin','operator']`) | 없음 |
| platform admin 의 cross-service 조회는 명시적 opt-in 인가 | ✅ pop.api.ts 가 `all=true` 명시 | 없음 |
| admin-dashboard 가 operator endpoint 를 호출하는 것이 적절한가 | △ 사용 빈도 매우 낮음 (1 endpoint, pop 도구). admin 전용 endpoint 신설 vs 현재 형태 유지 — 본 IR 의 핵심 아님 | 없음 |
| 서비스별 독립 운영자 원칙과 충돌 | ❌ admin-dashboard 의 cross-service 도구 (pop 제작) 는 platform admin 의 정당한 역할. service operator 원칙과 충돌 아님 | 없음 |
| F6 Boundary Policy 와 정합 | ✅ `all=true` 명시 + audit 로그 + 200 OK | 없음 |
| silent platform admin exemption 복구 방향 | ❌ 본 IR 은 이를 권장하지 않음. 정책 완화 비제안 | 없음 |

→ **충돌 0 건.** F6 Boundary Policy 의 의도가 admin-dashboard 측에서도 정확히 구현됨.

---

## 11. 본 IR 이 결정하지 않는 것

- `OperatorCard.tsx:31` 의 commented out 정리 — 별건 cleanup IR
- admin-dashboard 의 internal SPA 라우트 (`/operator/...` 11 건) 의 활성/dead 분류 — 본 IR 범위 외 (backend API 호출 audit 가 본 IR 의 범위)
- F6 Boundary Policy fix 의 재설계 — 별건 정책 논의 (본 IR 비권장)
- admin-dashboard vs 4 service frontend 의 통합/공통화 — Operator Core Design 영역

---

## 12. 본 IR 가 확정하는 것 (선행 IR 결과 통합)

본 IR + 선행 IR + 선행 WO 들을 통합한 **monorepo 전체의 F6 Boundary Policy frontend 정렬 상태**:

| Endpoint | 4 service frontend | admin-dashboard | 정렬 완료 |
|---|:---:|:---:|:---:|
| `GET /operator/members` | ✅ 4 service 정렬 (선행 WO 1) | (호출 없음) | ✅ |
| `GET /operator/members/stats` | ✅ | (호출 없음) | ✅ |
| `GET /operator/products` | ✅ 2 service 정렬 (선행 WO 2) | ✅ all=true 명시 (본 IR 확인) | ✅ |
| `GET /operator/stores` | ✅ 3 service 정렬 (선행 WO 2) | (호출 없음) | ✅ |
| `GET /operator/analytics/{summary,actions,insight}` | ✅ 4 service 정렬됨 | (호출 없음) | ✅ |
| `GET /operator/analytics/auth/logs` (scope 무관) | (호출 없음) | ✅ 무관 endpoint | ✅ |

→ **7 strict-400 endpoint 모두 monorepo 전체 정렬 완료.**

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. admin-dashboard 의 /operator/* 호출 전수
grep -rn "/api/v1/operator/\|'/operator/\|\`/operator/\|\"/operator/" \
  apps/admin-dashboard/src

# 2. backend strict-400 endpoint 와 매칭
grep -rn "resolveOperatorScope\|PLATFORM_ADMIN_SCOPE_REQUIRED" \
  apps/api-server/src/{controllers,routes}/operator

# 3. production 호출 결과 검증
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND httpRequest.requestUrl:"operator/products"
  AND httpRequest.requestUrl:"all=true"' \
  --limit=10 --project=netureyoutube --freshness=14d \
  --format="value(timestamp,httpRequest.status,httpRequest.requestUrl)"

gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND httpRequest.requestUrl:"operator/analytics/auth/logs"' \
  --limit=10 --project=netureyoutube --freshness=14d \
  --format="value(timestamp,httpRequest.status,httpRequest.requestUrl)"
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — admin-dashboard operator API 호출 정합. 즉시 WO 후보 0 건. 부차 cleanup 1 건 (선택).*
*Next: 본 IR 종료. F6 Boundary Policy frontend 정렬은 monorepo 전체 완료 상태.*
