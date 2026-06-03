# IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI 변경 없음.**
>
> `/operator/members` 외 다른 operator console endpoint 에 `serviceKey` 누락 drift 가 남아 있는지 4 service 전수 audit. **F6 Boundary Policy 의 frontend 정렬 일관성 검사.**

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-GLYCOPHARM-OPERATOR-USERS-400-AUDIT-V1](IR-O4O-GLYCOPHARM-OPERATOR-USERS-400-AUDIT-V1.md) (1 endpoint 확정)
  - [CHECK-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1](CHECK-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1.md) (members 수정 완료)
- **참조 SSOT:**
  - `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (F6)
- **검증 환경:** Production (`api.neture.co.kr`, Cloud Run `o4o-core-api`, project `netureyoutube`)
- **검증 채널:** 코드 정적 분석 + Cloud Run 로그 (read-only)
- **수정 행위:** **없음** (조사 전용)
- **사전 동기화:** origin/main 와 0 commits 차이. 본 IR 작업 중 평행 세션의 staged 파일 1 건 (`apps/api-server/src/routes/admin/seed-test-accounts.ts`) 발견 — 본 IR commit 안 함으로 무영향.

---

## 0. 최종 결론

### 추가 drift 4 endpoint 확정 + 실 production 400 발생 중

| Endpoint | 영향 service | 실 400 (7d) | 우선순위 |
|---|---|:---:|:---:|
| `GET /operator/products` | GP, K-Cos | ✅ 5+회 | **A 즉시** |
| `GET /operator/stores` | GP, KPA, K-Cos | ✅ 6+회 | **A 즉시** |
| `GET /operator/analytics/summary` | (KPA 의심) | ✅ 3+회 | B 검증 후 |
| `GET /operator/analytics/actions` | (KPA 의심) | ✅ 1+회 | B 검증 후 |
| `GET /operator/analytics/insight` | (KPA 의심) | ✅ 1+회 | B 검증 후 |

**핵심 관찰:**
- Members WO 가 이미 회수한 패턴과 정확히 동일 drift 가 **Products / Stores** 에 잔존. 같은 frontend 정렬 작업으로 즉시 해결 가능.
- Analytics 는 GP/Neture 가 axios `params: {serviceKey, days}` 패턴으로 이미 정렬됨. KPA 의 `platformApi.get('/...', {serviceKey, days})` 만 ApiClient 시그니처 검증 후 결정 필요 (의심).
- 4 service 의 detail endpoint (`/:id`, `/:id/channels`, `/:id/products` 등) 는 backend 가 resolveOperatorScope 미사용 → 400 가능성 없음 (audit 대상 외).

### 즉시 WO 후보 (1 건 — endpoint 별 분리 비권고)

**`WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1`** — Products / Stores list 호출 (+ KPA dashboard 부수 호출) 의 frontend 정렬. Members WO 패턴 그대로 재사용.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 (0 commits 차이) |
| 조사 범위 | 4 service (`web-{glycopharm,kpa-society,k-cosmetics,neture}`) + `apps/api-server/src/controllers/operator/*` + `apps/api-server/src/routes/operator/*` + Cloud Run logs |

---

## 2. 산출물 1 — Backend scope-strict (400) endpoint 목록

`resolveOperatorScope` + `PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE` 사용 endpoint = **platform admin 가 serviceKey/all 미명시 시 400** 발생.

| Endpoint | Method | Controller : line | resolveOperatorScope 위치 |
|---|---|---|---|
| `/api/v1/operator/members` | GET | `MembershipConsoleController.getMembers:47` | line 60 |
| `/api/v1/operator/members/stats` | GET | `MembershipConsoleController.getStats:1159` | line 1163 |
| `/api/v1/operator/products` | GET | `ProductConsoleController.getProducts:29` | line 42 |
| `/api/v1/operator/stores` | GET | `StoreConsoleController.getStores:61` | line 73 |
| `/api/v1/operator/analytics/summary` | GET | inline (`analytics.routes.ts:44`) | line 50 |
| `/api/v1/operator/analytics/actions` | GET | inline (`analytics.routes.ts:124`) | line 133 |
| `/api/v1/operator/analytics/insight` | GET | inline (`analytics.routes.ts:267`) | line 273 |

**Strict 400 endpoint 합계: 7 개.** 다른 detail/특수 endpoint (예: `/operator/stores/:storeId`, `/operator/stores/channels`, `/operator/analytics/auth/logs`, `/operator/roles/*`) 는 resolveOperatorScope 미사용 → 400 가능성 없음.

---

## 3. 산출물 2 — Frontend serviceKey 전달 매트릭스

### 3.1 핵심 매트릭스 (실 frontend 호출 기준)

| Endpoint | GP | KPA | K-Cos | Neture | 비고 |
|---|:---:|:---:|:---:|:---:|---|
| `/operator/members` (list) | ✅ | ✅ | ✅ | ✅ | **prior WO 로 정렬 완료** |
| `/operator/members/stats` | ✅ | ✅ | ✅ | ✅ | 동일 |
| **`/operator/products` (list)** | ❌ | (N/A — page 없음) | ❌ | (N/A) | **drift 2 service** |
| **`/operator/stores` (list)** | ❌ | ❌ | ❌ | ✅ | **drift 3 service** |
| `/operator/stores?limit=1` (대시보드 stats) | (N/A) | ❌ (KPA OperatorDashboard:64) | (N/A) | (N/A) | drift 1 곳 |
| `/operator/analytics/summary` | ✅ axios | ⚠️ ApiClient — 검증 필요 | (N/A — page 없음) | ✅ axios | KPA 1 곳 의심 |
| `/operator/analytics/actions` | ✅ axios | ⚠️ 동일 | (N/A) | ✅ axios | 동일 |
| `/operator/analytics/insight` | ✅ axios | ⚠️ 동일 | (N/A) | ✅ axios | 동일 |

> **N/A** 표시: 해당 service 의 frontend 에 그 page 가 존재하지 않음 (예: Neture 는 ProductsPage 자체 없음 — 공급자 product API 별도).

### 3.2 정렬된 (✅) 사례의 코드 패턴

**Members (prior WO):**
```ts
params.set('serviceKey', 'glycopharm');  // 또는 'kpa-society' / 'k-cosmetics'
```

**Stores (Neture, 이미 정렬):**
[services/web-neture/src/pages/operator/StoreManagementPage.tsx:70-79](services/web-neture/src/pages/operator/StoreManagementPage.tsx#L70-L79):
```ts
const params = new URLSearchParams({
  page: String(currentPage),
  limit: '20',
  ...
  // WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1:
  // platform:super_admin 으로 /admin/stores 진입 시에도 Neture-scoped 로 강제.
  serviceKey: 'neture',
});
```

**Analytics (GP / Neture, 이미 정렬):**
[services/web-glycopharm/src/pages/operator/AnalyticsPage.tsx:66](services/web-glycopharm/src/pages/operator/AnalyticsPage.tsx#L66):
```ts
await api.get('/operator/analytics/summary', {
  params: { serviceKey: SERVICE_KEY, days },
});
```

### 3.3 미정렬 (❌) 사례 — drift 위치

#### Products

| 파일 | 라인 | 호출 |
|---|---|---|
| `services/web-glycopharm/src/pages/operator/ProductsPage.tsx` | 83-96 | `params` 에 page/limit/sortBy/sortOrder/search 만, serviceKey 없음 |
| `services/web-k-cosmetics/src/pages/operator/ProductsPage.tsx` | 73-86 | 동일 패턴 |

#### Stores

| 파일 | 라인 | 호출 |
|---|---|---|
| `services/web-glycopharm/src/pages/operator/StoresPage.tsx` | 37-48 | `glycoStoresApi.listStores` adapter — qs 에 page/limit/sortBy/sortOrder/search 만. **`StoresConfig.serviceKey: 'glycopharm'` 은 라벨용 상수일 뿐, qs 에 안 들어감** |
| `services/web-kpa-society/src/pages/operator/OperatorStoresPage.tsx` | 39-50 | 동일 (kpaStoresApi.listStores) |
| `services/web-k-cosmetics/src/pages/operator/StoresPage.tsx` | 88-101 | params 에 직접 — serviceKey 없음 |
| `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` | 64 | `${PLATFORM_API_BASE}/api/v1/operator/stores?limit=1` (대시보드 stats) — serviceKey 없음 |

#### Analytics (KPA 만 의심)

| 파일 | 라인 | 호출 |
|---|---|---|
| `services/web-kpa-society/src/pages/operator/AnalyticsPage.tsx` | 74, 92, 105 | `platformApi.get('/operator/analytics/summary', {serviceKey: SERVICE_KEY, days})` — **ApiClient.get 의 두번째 인자 시그니처 미확인.** axios 와 다르면 (`{params: ...}` wrap 누락) serviceKey 가 query 로 안 갈 위험 |

---

## 4. 산출물 3 — drift 발견 목록 (실 production 400 교차검증)

Cloud Run 로그 (`netureyoutube`, 최근 7 일) 의 status=400 + 해당 endpoint 매칭:

```
=== 400 on operator/products (7d) ===
2026-05-23T07:19:38  /operator/products?limit=3
2026-05-23T06:28:18  /operator/products?page=1&limit=20
2026-05-23T06:28:17  /operator/products
2026-05-23T06:11:08  /operator/products?limit=5

=== 400 on operator/stores (7d) ===
2026-05-24T00:40:26  /operator/stores?limit=1
2026-05-24T00:39:59  /operator/stores?limit=1
2026-05-24T00:37:47  /operator/stores?limit=1
2026-05-23T07:19:37  /operator/stores?limit=3
2026-05-23T06:28:17  /operator/stores
2026-05-23T06:11:07  /operator/stores?limit=5

=== 400 on operator/analytics (7d) ===
2026-05-23T07:19:38  /operator/analytics/summary?days=7
2026-05-23T06:28:17  /operator/analytics/summary
2026-05-23T06:11:08  /operator/analytics/insight?days=7
2026-05-23T06:11:08  /operator/analytics/actions?limit=5
2026-05-23T06:11:08  /operator/analytics/summary?days=7
```

→ **3 endpoint 그룹 모두 실 400 발생 중.** Drift 가 가설이 아니라 production 사실.

`/operator/stores?limit=1` 의 3 회 (2026-05-24T00:37 ~ 00:40) 는 KPA OperatorDashboard 의 대시보드 stats 호출 패턴과 일치 — drift 위치 직접 식별.

---

## 5. 산출물 4 — 위험도 분류

### A. 즉시 수정 필요 (실 400 + frontend 정렬로 즉시 해결)

| Endpoint | 영향 파일 | 패턴 |
|---|---|---|
| `/operator/products` | web-glycopharm/ProductsPage / web-k-cosmetics/ProductsPage | `params.set('serviceKey', '<svc>')` 1 줄 추가 |
| `/operator/stores` | web-glycopharm/StoresPage (glycoStoresApi.listStores) / web-kpa-society/OperatorStoresPage (kpaStoresApi.listStores) / web-k-cosmetics/StoresPage | `qs.set('serviceKey', '<svc>')` 1 줄 추가 |
| `/operator/stores?limit=1` (KPA 대시보드) | web-kpa-society/KpaOperatorDashboard:64 | URL 에 `&serviceKey=kpa-society` 추가 |

**합계: 4 파일.** Members WO 와 동일 패턴, 매우 낮은 회귀 위험.

### B. 검증 후 결정 (KPA Analytics 의심)

| Endpoint | 영향 파일 | 검증 |
|---|---|---|
| `/operator/analytics/{summary,actions,insight}` | web-kpa-society/AnalyticsPage (platformApi.get) | `ApiClient.get` 의 두번째 인자가 axios style `config` (config.params 가 query) 인지, 또는 직접 query object 로 받는지 확인. 후자면 이미 정렬, 전자면 정렬 필요 |

본 IR 시간 내 ApiClient 의 정확한 시그니처 확인 보류 — 즉시 WO 진입 시 1 회 확인 후 분기.

### C. 보류 (admin-dashboard 별건)

- `/operator/analytics/auth/logs` — `apps/admin-dashboard/src/pages/operator/AuthAnalyticsPage.tsx:42` 에서 호출. **resolveOperatorScope 미사용** → 400 가능성 없음. 본 IR 범위 외.

### D. 정상

- Members (prior WO 로 정렬)
- Neture 의 모든 화면 (StoreManagementPage / UsersManagementPage / AnalyticsPage — 모두 serviceKey 명시)
- 4 service 의 detail endpoint (`/stores/:id`, `/products/:id` 등) — backend resolveOperatorScope 미사용
- `/operator/roles/*` — `RoleController` 가 `scope.isPlatformAdmin` 을 직접 사용, resolveOperatorScope 미사용. 400 분기 없음

---

## 6. 산출물 5 — Neture canonical pattern

3 가지 정렬 패턴이 monorepo 에 공존:

### Pattern 1: URLSearchParams.set (Members / Stores)
```ts
const params = new URLSearchParams();
params.set('serviceKey', 'neture');
params.set('page', ...);
const data = await apiFetch(`/api/v1/operator/<endpoint>?${params}`);
```

### Pattern 2: URLSearchParams 객체 인자 (Neture StoreManagement)
```ts
const params = new URLSearchParams({
  page: String(currentPage),
  ...,
  serviceKey: 'neture',
});
```

### Pattern 3: axios config.params (Analytics)
```ts
await api.get('/operator/analytics/summary', {
  params: { serviceKey: SERVICE_KEY, days },
});
```

→ **3 패턴 모두 같은 의도를 표현하지만 형태가 다름.** WO 시점에 각 파일의 기존 패턴을 그대로 유지하면서 serviceKey 만 추가하면 일관성 보존.

`SERVICE_KEY` 상수화도 가능하나 본 IR 범위 외 — 별건 (Operator Core Design) 의 책임.

---

## 7. 산출물 6 — 즉시 WO 후보

### `WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1` (제안)

| 항목 | 내용 |
|---|---|
| 범위 | 분류 A 의 4 파일 + 분류 B 의 KPA AnalyticsPage 1 파일 (ApiClient 시그니처 확인 후 분기) |
| 영향 파일 | 최대 5 |
| 패턴 | 각 파일의 기존 query 빌더에 serviceKey 1 줄 추가 (Members WO 와 동일) |
| Backend 변경 | 0 |
| DB / migration | 0 |
| 회귀 위험 | 매우 낮음 — 비-platform-admin 호출자에게는 resolveOperatorScope first branch 즉시 return → 무영향 |
| 검증 | platform admin 계정 (Rena) 으로 각 화면 접근 → 200 OK + Network 탭에 serviceKey 확인 |
| 정합 기준 | F6 Boundary Policy + Members WO 와 동일 패턴 |

### 분리 vs 통합 결정 (제안: 통합 1 WO)

- endpoint 별 분리 (WO-products / WO-stores / WO-analytics) 도 가능하나, **동일 패턴 5 파일 정렬**이므로 통합 WO 가 합리적
- Members WO (3 파일 정렬) 와 동일 절차 — 사이즈 작음

---

## 8. 산출물 7 — 보류 / 정책 판단 필요 항목

| 항목 | 이유 | 결정 위치 |
|---|---|---|
| admin-dashboard 의 operator/* 호출 audit | 본 IR 의 범위 = 4 service. admin-dashboard 는 platform admin 전용 SPA 로 별도 audit 가치 | 별건 IR (`IR-O4O-ADMIN-DASHBOARD-OPERATOR-API-AUDIT-V1`) |
| KPA `ApiClient` 시그니처 표준화 | KPA platformApi 의 get 시그니처가 axios 와 다르면 다른 호출처에도 잠재 영향. 본 IR 범위 외 | KPA 의 별건 정비 IR |
| `SERVICE_KEY` 상수 / API helper 공통화 | DRY 측면의 가치 있으나 본 IR 의 즉시 작업과 독립 | Operator Core Design (별건) |
| `/operator/roles/*` 의 scope.isPlatformAdmin 직접 사용 패턴 | 400 분기는 없으나, 다른 패턴이라 audit 가치 | 별건 |
| backend 가 origin header 로 serviceKey 자동 추론 가능 여부 | Boundary Policy 의 명시 opt-in 원칙과 상충 — 정책 변경 필요 | 정책 논의 (보류) |

---

## 9. 산출물 8 — Neture canonical pattern 정리 (재요약)

본 IR 의 §6 참조. 정렬 패턴은 3 가지이지만 의도는 1 가지 — **"이 frontend 가 호출하는 endpoint 는 본 service 의 데이터만 본다"** 를 query string 으로 명시.

```text
원칙 (F6 Boundary Policy + Members WO 적용 후 통합):

1. service-specific frontend 가 platform admin scope 의 endpoint 를 호출할 때:
   → query 에 serviceKey=<자기 service> 를 항상 명시
2. 명시는 axios config.params, URLSearchParams.set, 객체 인자 중 기존 패턴 유지
3. service operator (비-platform-admin) 에게는 무영향 (resolveOperatorScope 의 first branch 가 자동 service-scoped)
4. platform admin 의 cross-service 조회는 별도 `all=true` opt-in (UI 상 거의 없음 — admin-dashboard 의 영역)
```

---

## 10. 산출물 9 — 현재 구조 vs O4O 철학 충돌 체크

| 차원 | 현재 (drift 잔존) | 정렬 후 | 충돌 |
|---|:---:|:---:|:---:|
| 각 service 운영자는 자기 service 데이터만 본다 | ✅ backend 가 자동 scope (영향 없음) | ✅ 정합 | 없음 |
| platform admin 의 cross-service 조회는 명시적 opt-in | ✅ backend 가 강제 (Boundary fix) | ✅ 정합 | 없음 |
| frontend 가 backend boundary 를 우회하거나 모호하게 만드는가 | ❌ — frontend 가 단순히 안 보내서 400 받는 것. 우회 아님 | ✅ 정합 | 없음 |
| 4 service 간 공통화 drift | ❌ — Neture 만 정렬, 3 service 미정렬 (members 제외) | ✅ 정합 (WO 후) | **현재 있음** |
| O4O 독립 서비스 운영자 원칙과 충돌 | ❌ — frontend 정렬 누락은 원칙과 무관 (오히려 backend 가 원칙을 강제) | — | 없음 (구조적 충돌 아님) |

→ **drift 는 frontend 일관성 문제이지 정책 충돌이 아님.** WO 1 건으로 해소 가능.

---

## 11. 본 IR 이 결정하지 않는 것

- WO 의 실제 실행 (코드 변경) — 본 IR 은 조사 전용
- KPA ApiClient.get 시그니처 분석 — WO 진입 시 1 회 확인
- admin-dashboard 의 operator endpoint 호출 audit — 별건 IR
- SERVICE_KEY 상수화 / API helper 공통화 — 별건 (Operator Core Design)
- Boundary Policy fix 의 재설계 (origin header 자동 추론) — 별건 정책 논의

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. Backend strict-400 endpoint 식별 (resolveOperatorScope)
grep -rn "resolveOperatorScope\|PLATFORM_ADMIN_SCOPE_REQUIRED" \
  apps/api-server/src/{controllers,routes}/operator

# 2. Frontend serviceKey 전달 매트릭스
grep -rn "params.set('serviceKey'\|qs.set('serviceKey'\|serviceKey: '\|'serviceKey'," \
  services/web-{glycopharm,kpa-society,k-cosmetics,neture}/src

# 3. 4 service 의 list endpoint 호출처
grep -rn "/api/v1/operator/(members\|products\|stores\|analytics)" \
  services/web-{glycopharm,kpa-society,k-cosmetics,neture}/src

# 4. Cloud Run 실 400 발생 확인
for endpoint in members products stores analytics; do
  echo "=== $endpoint ==="
  gcloud logging read "resource.type=cloud_run_revision
    AND resource.labels.service_name=\"o4o-core-api\"
    AND httpRequest.status=400
    AND httpRequest.requestUrl:\"operator/$endpoint\"" \
    --limit=10 --project=netureyoutube --freshness=7d \
    --format="value(timestamp,httpRequest.requestUrl)"
done
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — 추가 drift 4 endpoint 확정 (실 400 교차검증). 즉시 WO 후보 1 건 제시.*
*Decision Required: `WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1` 진입 여부.*
