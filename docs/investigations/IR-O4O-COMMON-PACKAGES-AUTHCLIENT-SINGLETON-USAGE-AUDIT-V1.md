# IR-O4O-COMMON-PACKAGES-AUTHCLIENT-SINGLETON-USAGE-AUDIT-V1

> **Common Packages 의 `@o4o/auth-client` Singleton 직접 사용 전수 감사 (Read-Only Audit)**
>
> 코드 수정 없음 / 데이터 수정 없음 / 정책 변경 없음
>
> [WO-O4O-STORE-PRODUCTS-AUTHCLIENT-INJECTION-FIX-V1](../../) (commit `66aa8e2c6`) 의 후속. store-products-ui 와 동일 패턴의 잠재 결함을 다른 공통 패키지 / 서비스 코드에서 전수 조사·분류한다.

- **작성일:** 2026-05-24
- **분류:** Audit (Read-Only — Grep + 코드 정적 분석 + Cloud Run 로그)
- **선행:** [WO-O4O-STORE-PRODUCTS-AUTHCLIENT-INJECTION-FIX-V1](../../) commit `66aa8e2c6`, [WO-O4O-STORE-PRODUCTS-UNUSED-AUTHCLIENT-DEP-CLEANUP-V1](../../) commit `7981e9499`
- **버전:** V1
- **Status:** Audit Complete — 즉시 1 건, dead code 3 건, 안전 10 건

---

## 0. Executive Summary

### 발견 건수

| 분류 | 건수 | 즉시 조치 |
|---|:---:|:---:|
| **A. High Risk** | 1 | **YES — 후속 WO 권고** |
| B. Medium Risk | 0 | — |
| C. Low Risk | 0 | — |
| **D. Legacy / Dead Code** | 3 | 별도 cleanup IR 가치 |
| **E. Safe / Intended** | 10 | 무시 (현재 구조 정합) |
| **합계** | **14** | |

### 즉시 WO 필요

**`WO-O4O-GLYCOPHARM-USE-STORE-HUB-AUTHCLIENT-FIX-V1`** (권고) — [services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts](../../services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts) 의 singleton 사용을 glycopharm 의 localStorage-strategy `api` (`@/lib/apiClient`) 로 교체. store-products-ui 와 동일 결함이 GlycoPharm `StoreOverviewPage` / `StoreHubPage` / `HubEventOffersPage` 에 잠재. 영향 endpoint 4 종 (`/glycopharm/pharmacy/cockpit/*`, `/glycopharm/pharmacy/products`).

### Dead Code Cleanup 후보

`packages/forum-yaksa/src/admin-ui/pages/*` (3 파일) — admin-dashboard 가 잘못된 package name (`@o4o/forum-core-yaksa`) 으로 import 시도하고 catch 로 placeholder 폴백 처리 (실제 디렉터리 package name 은 `@o4o-apps/forum-yaksa`). 작성 후 한 번도 wired up 된 적 없음.

---

## 1. Background — store-products-ui 401 사건 요약

### 원인

[packages/store-products-ui/src/api.ts](../../packages/store-products-ui/src/api.ts) (수정 전):

```typescript
import { authClient } from '@o4o/auth-client';   // ← cookie-strategy singleton
...
const res = await authClient.api.get(...);
```

### 현상

- KPA 서비스(`localStorage` strategy)의 `/store/my-products` 진입 시 `GET /api/v1/store/products?page=1&limit=20` 요청에 **`Authorization: Bearer` 헤더가 붙지 않음**
- singleton 의 cookie strategy 는 localStorage 토큰을 읽지 않음
- `withCredentials: true` 로 쿠키를 전송하려 하나 `kpa-society.co.kr` 도메인 쿠키는 `api.neture.co.kr` cross-origin 요청에 실리지 않음
- 결과: `requireAuth` 미들웨어가 `AUTH_REQUIRED` 401 반환 (응답 body 74 bytes, 무인증 baseline 과 byte-level 일치로 확정)

### 해결

[packages/store-products-ui/src/api.ts](../../packages/store-products-ui/src/api.ts) (수정 후):

```typescript
export function configureStoreProductsApi(api: StoreProductsApiClient): void {
  _api = api;
}

function getApi(): StoreProductsApiClient {
  if (!_api) throw new Error('...not configured...');
  return _api;
}
```

각 서비스 (KPA / Neture / Glyco / K-Cosmetics) 의 authClient 정의 파일에서 모듈 로드 시점에 `configureStoreProductsApi(authClient.api)` 1 회 호출 — 자신의 localStorage-strategy `authClient.api` 주입.

### 본 IR 의 적용 패턴

각 발견 위치를 다음 3 기준으로 비교:

1. **import 대상**: `authClient` (singleton, cookie default) vs `AuthClient` (class, 서비스가 전략 선택) vs 개별 utility (`getAccessToken` 등, axios 와 무관)
2. **소비 서비스**: cookie-strategy app 만 vs localStorage-strategy service 도 포함
3. **실제 wired-up 여부**: 라우트/페이지에 실제로 mount 되는가 vs dead path

---

## 2. Search Method

### 2.1 검색 패턴

```bash
# 1. authClient singleton import (직접 위험 패턴)
grep -rn "from '@o4o/auth-client'" packages/ services/

# 2. 호출 형태 (Authorization 헤더 누락 가능 코드)
grep -rn "authClient.api" packages/ services/

# 3. AuthClient 클래스 직접 사용 (서비스가 전략 결정 — 안전)
grep -rn "new AuthClient(" packages/ services/

# 4. 의존 그래프 — 각 package 가 어느 app 에서 import 되는지
grep -rn "from '@o4o/<package-name>'" packages/ services/ apps/
```

### 2.2 검색 범위

- `packages/**` — 본 IR 의 1 차 대상
- `services/**` — 서비스 내부에서 singleton 을 직접 잘못 import 한 케이스 적발 (HIGH 1 건 발견)
- `apps/**` — admin-dashboard 의 consumer 분석에 사용

### 2.3 분류 보조 정보

| 채널 | 용도 |
|---|---|
| `apps/admin-dashboard/src/App.tsx:77` | `new AuthClient(getAuthApiUrl(), { strategy: 'cookie' })` — admin-dashboard 는 **cookie strategy** 확정 |
| `services/web-{kpa-society, neture, glycopharm, k-cosmetics}` | 모두 localStorage strategy 확정 (이전 WO 에서 검증) |
| `packages/auth-context/src/AuthProvider.tsx:38` | default `strategy = 'cookie'` |

---

## 3. Findings Table

총 14 건. 위험도 / 소비처 / 권장 조치 매트릭스.

| # | 위치 | import | 사용 패턴 | 소비처 | Strategy 정합 | 위험도 |
|:-:|---|---|---|---|:-:|:-:|
| 1 | [services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts:18](../../services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts#L18) | `import { authClient } from '@o4o/auth-client'` | `authClient.api.get` × 4 endpoint | glycopharm StoreOverviewPage / StoreHubPage / HubEventOffersPage (localStorage svc) | **불일치 (singleton=cookie, svc=localStorage)** | **A** |
| 2 | [packages/utils/src/hooks/usePresets.ts:2](../../packages/utils/src/hooks/usePresets.ts#L2) | `import { authClient }` | `authClient.api.get` × 1 | admin-dashboard 5 file | 일치 (둘 다 cookie) | E |
| 3 | [packages/utils/src/hooks/usePresetData.ts:2](../../packages/utils/src/hooks/usePresetData.ts#L2) | 동일 | `authClient.api` × 2 | admin-dashboard | 일치 | E |
| 4 | [packages/utils/src/hooks/usePreset.ts:2](../../packages/utils/src/hooks/usePreset.ts#L2) | 동일 | `authClient.api` × 1 | admin-dashboard | 일치 | E |
| 5 | [packages/forum-core/src/admin-ui/pages/ForumBoardList.tsx:5](../../packages/forum-core/src/admin-ui/pages/ForumBoardList.tsx#L5) | 동일 | `authClient.api` × 2 | admin-dashboard `apps.routes.tsx:8` lazy mount | 일치 | E |
| 6 | [packages/forum-core/src/admin-ui/pages/ForumCategories.tsx:4](../../packages/forum-core/src/admin-ui/pages/ForumCategories.tsx#L4) | 동일 | `authClient.api` × 5 | admin-dashboard `apps.routes.tsx:9` lazy mount | 일치 | E |
| 7 | [packages/forum-core/src/admin-ui/pages/ForumPostDetail.tsx:5](../../packages/forum-core/src/admin-ui/pages/ForumPostDetail.tsx#L5) | 동일 | `authClient.api` × 7 | admin-dashboard `apps.routes.tsx:10` lazy mount | 일치 | E |
| 8 | [packages/forum-core/src/admin-ui/pages/ForumPostForm.tsx:5](../../packages/forum-core/src/admin-ui/pages/ForumPostForm.tsx#L5) | 동일 | `authClient.api` × 4 | admin-dashboard `apps.routes.tsx:11` lazy mount | 일치 | E |
| 9 | [packages/forum-yaksa/src/admin-ui/pages/YaksaCommunityList.tsx:2](../../packages/forum-yaksa/src/admin-ui/pages/YaksaCommunityList.tsx#L2) | 동일 | `authClient.api` × 1 | **wrong package name (`@o4o/forum-core-yaksa`) — never loaded** | n/a | **D** |
| 10 | [packages/forum-yaksa/src/admin-ui/pages/YaksaCommunityDetail.tsx:3](../../packages/forum-yaksa/src/admin-ui/pages/YaksaCommunityDetail.tsx#L3) | 동일 | `authClient.api` × 2 | 동일 — never loaded | n/a | **D** |
| 11 | [packages/forum-yaksa/src/admin-ui/pages/YaksaCommunityDashboard.tsx:2](../../packages/forum-yaksa/src/admin-ui/pages/YaksaCommunityDashboard.tsx#L2) | 동일 | `authClient.api` × 2 | 동일 — never loaded | n/a | **D** |
| 12 | [packages/auth-context/src/AuthProvider.tsx:3](../../packages/auth-context/src/AuthProvider.tsx#L3) | `import { AuthClient, AuthStrategy }` — **class import, not singleton** | Provider 자체가 strategy 인자 받음 | admin-dashboard (`App.tsx`) | 일치 (Provider 의도) | E |
| 13 | [packages/auth-context/src/CookieAuthProvider.tsx:2](../../packages/auth-context/src/CookieAuthProvider.tsx#L2) | `import { cookieAuthClient }` — 별개 cookie 전용 client | (현재 어떤 app 도 import 안 함) | dead | n/a | **D-leaning E** (별개 client, 위험 없음) |
| 14 | [packages/auth-context/src/SSOAuthProvider.tsx:3](../../packages/auth-context/src/SSOAuthProvider.tsx#L3) | `import { ssoClient }` — SSO 전용 client | (현재 어떤 app 도 import 안 함) | dead | n/a | **D-leaning E** (별개 client, 위험 없음) |

### 3.1 store-products-ui 와의 비교

| 차원 | store-products-ui (수정 전) | 본 IR #1 (useStoreHub) | 본 IR #2-8 (admin-dashboard consumers) | 본 IR #9-11 (Yaksa) |
|---|:---:|:---:|:---:|:---:|
| singleton import | YES | YES | YES | YES |
| `authClient.api.X` 사용 | YES | YES | YES | YES |
| 소비 서비스의 strategy | localStorage | **localStorage** | cookie | n/a (never mount) |
| 실제 실행 경로 | YES (KPA `/store/my-products`) | YES (glyco store routes) | YES (admin-dashboard) | NO |
| 401 발생 | **YES (확인)** | **잠재 (로그 트래픽 부족)** | NO | NO |

---

## 4. High Risk Items

### A-1. `services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts`

#### 4.1 위치 및 코드

[useStoreHub.ts:18, 168-179](../../services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts#L168-L179):

```typescript
import { authClient } from '@o4o/auth-client';   // ← cookie singleton in localStorage service
...
const fetchData = useCallback(async () => {
  ...
  const api = authClient.api;
  try {
    const [aiRes, actionsRes, signageRes, productsRes] = await Promise.allSettled([
      api.get('/glycopharm/pharmacy/cockpit/ai-summary'),
      api.get('/glycopharm/pharmacy/cockpit/today-actions'),
      api.get('/glycopharm/pharmacy/cockpit/franchise-services'),
      api.get('/glycopharm/pharmacy/products?pageSize=1'),
    ]);
    ...
```

#### 4.2 소비 페이지

[services/web-glycopharm/src/App.tsx](../../services/web-glycopharm/src/App.tsx) 에서 다음 라우트들이 useStoreHub 를 직간접 사용:

| 라우트 | 페이지 | App.tsx |
|---|---|:-:|
| `/store/` (index) | StoreOverviewPage | L656 |
| `/hub/` (index, GlycoStoreHubPage) | StoreHubPage | L465 |
| `/hub/event-offers` | HubEventOffersPage | L470 |

또한 [services/web-glycopharm/src/api/storeHub.ts](../../services/web-glycopharm/src/api/storeHub.ts) 도 useStoreHub 를 import — 더 깊은 의존 그래프.

#### 4.3 예상 실패 유형

`AUTH_REQUIRED` 401 — store-products-ui 와 동일 패턴.

- glycopharm 의 authClient (localStorage strategy) 는 모듈 로드 시 토큰을 localStorage 에 저장
- useStoreHub 가 가져온 **singleton authClient** 는 cookie strategy 기본 → `Authorization` 헤더 안 붙음
- `withCredentials: true` 가 시도하는 쿠키는 `.glycopharm.co.kr` 도메인 → `api.neture.co.kr` 에 실리지 않음
- 4 개 endpoint 모두 401

#### 4.4 로그 검증

```
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND httpRequest.requestUrl=~"glycopharm/pharmacy/cockpit"'
  --freshness=24h --project=netureyoutube
```

→ 24h 트래픽 0 건. 운영 사용자가 아직 해당 페이지를 활발히 안 쓰는 것으로 추정. 결함은 잠재 상태로 존재.

#### 4.5 권장 조치

1-line fix (singleton → 로컬 strategy-일치 `api`):

```diff
- import { authClient } from '@o4o/auth-client';
+ import { api } from '@/lib/apiClient';   // glycopharm localStorage authClient.api
  ...
- const api = authClient.api;
+ // (use the module-level `api` directly)
```

→ store-products-ui 와 달리 packages 가 아닌 service 내부 파일이므로 주입 구조 불필요. 단일 import 교체로 충분.

**후속 WO 명**: `WO-O4O-GLYCOPHARM-USE-STORE-HUB-AUTHCLIENT-FIX-V1`

---

## 5. Medium / Low Risk Items

**없음.** 본 audit 결과 medium / low 분류 항목 0 건. 모든 적발 항목이 A (High) 또는 D (Dead) 또는 E (Safe) 로 분기됨.

---

## 6. Legacy / Dead Code Candidates

### 6.1 `packages/forum-yaksa/src/admin-ui/pages/*` (3 file)

#### 증거

- 디렉터리: `packages/forum-yaksa/`
- `package.json` name: `@o4o-apps/forum-yaksa` (note: `o4o-apps` scope)
- admin-dashboard 의 lazy import: `@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityList` 등 — **존재하지 않는 package name**

[apps/admin-dashboard/src/routes/apps.routes.tsx:13-31](../../apps/admin-dashboard/src/routes/apps.routes.tsx#L13-L31):

```typescript
const YaksaCommunityList = lazy(() =>
  // @ts-expect-error Package not yet implemented
  import('@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityList').catch(() => ({
    default: () => <div className="p-6">Yaksa Community List - Coming Soon</div>,
  }))
);
```

`// @ts-expect-error Package not yet implemented` 주석이 명시. catch → "Coming Soon" placeholder. **3 페이지 모두 한 번도 wired up 된 적 없음.**

#### 분류 사유

- D (Dead Code) 우선 — 코드는 존재하나 실행 경로 없음
- 본 IR 의 401 패턴 위험은 0 (실행 안 됨)
- 단, package name 정렬 또는 admin-ui 디렉터리 삭제 둘 중 하나 필요

#### 권장 조치

별도 cleanup IR 또는 WO 로 분리:

- **옵션 (a)**: `forum-yaksa` 의 `admin-ui/pages/*` 삭제 (서비스로 의도된 적 없음을 confirm)
- **옵션 (b)**: package.json name 을 `@o4o/forum-core-yaksa` 로 정렬하고 본 IR 의 A-1 패턴 fix (admin-dashboard 가 cookie strategy 이므로 그 시점에는 정합 — 단, admin 외 다른 svc 가 import 시 회귀 가능)
- 본 IR 권고: (a) — 명확한 dead code 제거

### 6.2 `packages/auth-context/src/CookieAuthProvider.tsx`, `SSOAuthProvider.tsx`

#### 증거

```bash
grep -rn "CookieAuthProvider\|SSOAuthProvider" --include="*.ts" --include="*.tsx"
```

→ 자기 자신 + `auth-context` 내부 index/build script 외 어떤 app 도 import 안 함. admin-dashboard 도 일반 `AuthProvider` 만 사용.

#### 분류 사유

- 본 IR 의 위험 매트릭스에서는 import 대상이 `cookieAuthClient` / `ssoClient` 로 별개 객체이며 **singleton `authClient` 와 다름** → 401 패턴 직접 위험 없음
- 그러나 어디서도 사용 안 되는 dead Provider → cleanup 가치
- 본 IR 의 위험도 분류상 D-leaning E (위험은 E 이지만 dead 라 D 와 양가적)

#### 권장 조치

별도 dead-code audit 의 일부로 처리. 본 audit 의 즉시 후속 대상 아님.

---

## 7. Recommended Follow-up WOs

### 7.1 즉시 (High Priority)

| WO | 범위 | 비용 |
|---|---|:-:|
| **`WO-O4O-GLYCOPHARM-USE-STORE-HUB-AUTHCLIENT-FIX-V1`** | useStoreHub.ts 의 import 1 줄 + `const api = authClient.api;` 삭제. KPA /store/my-products fix 와 같은 종류의 결함, 단 서비스 내부 파일이므로 주입 구조 없이 import 교체로 해결. | XS (10 분) |

### 7.2 후순위 (Cleanup)

| WO/IR | 범위 | 비용 |
|---|---|:-:|
| `IR-O4O-FORUM-YAKSA-ADMIN-UI-DEAD-CODE-V1` | forum-yaksa admin-ui 3 페이지의 dead 여부 확정 후 제거. 사업 의도 (yaksa community admin UX 가 미래 mount 예정인지) 확인 필요. | S |
| `IR-O4O-AUTH-CONTEXT-PROVIDER-DEAD-CODE-V1` | CookieAuthProvider / SSOAuthProvider 의 unused 확정 후 정리. AuthProvider 통합 가능성 검토. | S |

### 7.3 진행 안 함 (Safe)

- 7 건 (admin-dashboard 가 import 하는 utils hooks 3 + forum-core admin-ui 4) — **현재 동작 정합**. admin-dashboard 가 cookie strategy 이고 singleton 도 cookie default 라 일치. 미래에 admin-dashboard 가 localStorage 로 전환되거나 다른 localStorage 서비스가 이들을 import 하기 시작하면 그때 정리.

---

## 8. Current Structure vs O4O Philosophy Conflict Check

> 본 IR 은 공통 인증 구조와 서비스 경계에 영향을 주므로 마지막에 포함.

### 8.1 평가 기준 (사용자 지정)

| # | 기준 | 평가 |
|---|---|:-:|
| 1 | 공통 패키지가 서비스별 인증 전략을 강제로 결정하고 있지 않은가? | **부분 위반** |
| 2 | 서비스 앱이 자기 인증 전략을 명시적으로 주입할 수 있는 구조인가? | **부분만 충족** |
| 3 | 공통 패키지가 특정 도메인/cookie 정책에 종속되어 있지 않은가? | **부분 종속** |
| 4 | 1 인 개발 운영 속도를 해치지 않으면서 인증 경계가 명확한가? | 현재는 명확하지 않음, 단 정정 비용 낮음 |

### 8.2 부분 위반의 정확한 범위

**위반 항목**: store-products-ui 사건의 같은 패턴이 7 개 admin-dashboard-only 공통 패키지에 남아 있음 (utils hooks 3 + forum-core admin-ui 4).

**현재 동작 정합 이유**: 우연. admin-dashboard 와 singleton 이 둘 다 cookie strategy 라서 결과적으로 정상 동작. **구조적으로는 공통 패키지가 strategy 를 결정하고 있는 위반 상태**.

**O4O 다중 서비스 구조의 의도**: KPA / Neture / GlycoPharm / K-Cosmetics 가 각자 자기 도메인의 localStorage 토큰을 쓰고, admin-dashboard 는 `.neture.co.kr` 서브도메인이라 cookie 를 씀. 공통 패키지는 어느 쪽이든 받을 수 있어야 함 — store-products-ui 가 인 commit `66aa8e2c6` 에서 회복한 이 원칙이 다른 패키지에는 적용 안 됨.

### 8.3 1 인 개발 관점의 trade-off

- 본 audit 의 7 개 "Safe (E)" 항목을 즉시 store-products-ui 같은 주입 구조로 전환할 수도 있음
- 그러나 **현재 admin-dashboard 한 곳에서만 import 하고 작동 중** — 회귀 위험 vs 개선 가치 trade-off 가 좋지 않음
- 권고: 다른 localStorage 서비스가 이들을 import 하기 시작할 때 (예: admin 기능을 KPA 운영자가 직접 쓰는 시나리오), 그 WO 와 함께 주입 구조 전환

**즉, 본 IR 은 "전부 수정하자" 가 아니라 "실행 경로가 있는 1 건만 즉시 fix, 나머지는 우연한 정합이 깨지는 시점에 fix"** 로 권고한다.

### 8.4 Philosophy 정합 매트릭스

| 차원 | F11 (User/Operator Freeze) | F6 (Boundary Policy) | BUSINESS-PHILOSOPHY-V1 | 본 IR 영향 |
|---|:-:|:-:|:-:|:-:|
| 인증 분리 (cookie vs localStorage) | N/A (RBAC SSOT 한 층 위) | N/A (도메인 boundary, 인증 strategy 와 다른 축) | N/A (3 자 흐름과 무관) | A-1 fix 는 도메인 boundary 보강 |
| 공통 패키지의 도메인 중립성 | N/A | 간접 (공통 패키지가 특정 svc 도메인에 묶이면 boundary 모호화) | N/A | A-1 fix 가 boundary 명확화 |
| 운영 속도 (1 인 개발) | N/A | N/A | N/A | 본 IR 의 권고는 over-engineering 회피 — fix 는 1 건, 7 건은 보류 |

---

## 9. 본 IR 이 결정하지 않는 것

- 실제 코드 수정 (모두 read-only)
- A-1 의 fix 시점 / 우선순위 — 사용자 결정 대상
- forum-yaksa admin-ui 의 dead 여부 최종 확정 (사업 의도 확인 필요)
- auth-context Provider 통합/삭제 정책
- admin-dashboard 외 다른 cookie-strategy app 의 잠재 등장 시나리오

---

## 10. 부록 — 사용 검증 절차

### 10.1 핵심 grep

```bash
# 1. singleton import 위치
grep -rn "from '@o4o/auth-client'" packages/ services/ --include="*.ts" --include="*.tsx"

# 2. authClient.api 호출 위치
grep -rn "authClient\.api" packages/ services/ --include="*.ts" --include="*.tsx"

# 3. admin-dashboard strategy 확인
grep -n "new AuthClient" apps/admin-dashboard/src/App.tsx
# → L77: new AuthClient(getAuthApiUrl(), { strategy: 'cookie' })

# 4. forum-yaksa package name vs admin-dashboard import
cat packages/forum-yaksa/package.json | grep name
# → "name": "@o4o-apps/forum-yaksa"
grep -n "forum-core-yaksa" apps/admin-dashboard/src/routes/apps.routes.tsx
# → wrong name in lazy import
```

### 10.2 Cloud Run 로그 (A-1 검증)

```bash
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND httpRequest.requestUrl=~"glycopharm/pharmacy/cockpit"' \
  --limit=10 --freshness=24h --project=netureyoutube
```

→ 24h 트래픽 0 건. 잠재 결함, 실제 운영 사용자 노출 미확인.

---

*Version: V1 (2026-05-24)*
*Status: Audit Complete — 1 High Risk (즉시 WO 권고), 3 Dead Code (별도 cleanup), 10 Safe (현 구조 유지)*
*Next: 사용자 결정 → `WO-O4O-GLYCOPHARM-USE-STORE-HUB-AUTHCLIENT-FIX-V1` 착수 여부*
