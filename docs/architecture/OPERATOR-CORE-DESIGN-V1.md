# O4O Operator Core Design V1

> **상위 문서**: `CLAUDE.md` · `docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md` · `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`
> **선행 IR**: IR-O4O-OPERATOR-CORE-DESIGN-V1
> **버전**: V1
> **작성일**: 2026-05-03
> **상태**: Active — `@o4o/operator-core-ui` 설계 기준 문서
> **WO**: WO-O4O-OPERATOR-CORE-DESIGN-DOC-V1
>
> 본 문서는 신규 패키지 `@o4o/operator-core-ui` 의 구조·설계 원칙·인터페이스·마이그레이션 전략을 고정한다. 이후 모든 Operator 공통화 작업(Stores 모듈 추출, Users 모듈, Forum Analytics 모듈)은 본 문서를 기준으로 검토한다. 본 문서는 IR-O4O-OPERATOR-CORE-DESIGN-V1 의 결과를 **그대로** 문서화한 것이며, 설계 변경 없이 정전(stationary)되어 있다.

---

## 1. 개요

### 1.1 도입 배경

`OPERATOR-INTEGRATION-STATE-V1` 가 결론지은 분류:
- 🟢 **Core (이미 공통)**: 5-Block Dashboard, Forum Delete Requests / Analytics / Community Management, Signage HQ Console
- 🟡 **Core UI + Service Logic (실제 추출 핵심)**: Stores, Users, Products, Orders, AI Report, Applications 등
- 🔴 **Extension (서비스 전용)**: KPA Legal/Audit/Content, Glyco Guidelines, K-Cos Event Offers/StoreCockpit 등

🟡 카테고리는 UI 패턴은 같지만 도메인 로직이 서비스별로 다르다. 이를 처리하기 위해 신규 페이지 수준 모듈 컬렉션이 필요하다.

### 1.2 `@o4o/operator-ux-core` 와의 역할 분리

| 패키지 | 역할 | 의존 |
|---|---|---|
| **`@o4o/operator-ux-core`** (기존) | 공유 UI 원시 — `OperatorDashboardLayout` (5-Block), `DataTable`, `Pagination`, `SearchBar`, `Form` 컴포넌트, `defineActionPolicy`, `useBatchAction`, ServiceConfig 등 | `@o4o/ui` BaseTable wrap |
| **`@o4o/operator-core-ui`** (신규) | **페이지 수준 모듈** — Stores, Users, Forum Analytics 등 모듈 단위 | `@o4o/operator-ux-core` + `@o4o/ui` |

→ `ux-core` 는 모든 서비스가 의존하는 공통 원시. `core-ui` 는 서비스별 도입 시점을 선택할 수 있는 모듈 컬렉션.

### 1.3 패키지 분리 근거

- **점진적 마이그레이션**: 한 서비스씩 채택 가능 (KPA → Glyco → K-Cos)
- **책임 분리**: 원시(ux-core) ↔ 모듈(core-ui) 명확 구분
- **Extension 보호**: 서비스 전용 영역(StoreCockpitPage 등) 이 Core 에 흡수되지 않음

---

## 2. 패키지 구조

### 2.1 디렉토리 트리

```
packages/operator-core-ui/                    ← 신규
├── src/
│   ├── modules/
│   │   ├── stores/                          ← 1차 추출 대상
│   │   │   ├── types.ts                     (StoresApi, OperatorStoreBase, StoresConfig, StoresListProps)
│   │   │   ├── OperatorStoresList.tsx       (메인 컴포넌트)
│   │   │   ├── useStoresQuery.ts            (data fetching hook)
│   │   │   └── index.ts
│   │   ├── users/                           (Phase 2 — EditUserModal 외)
│   │   │   ├── ...
│   │   └── forum-analytics/                 (Phase 3)
│   │       └── ...
│   ├── composables/
│   │   ├── useRowActions.ts                 (action policy + batch 통합 hook)
│   │   └── index.ts
│   ├── types.ts                             (모듈 전반 공통 타입)
│   └── index.ts                             (top-level export)
├── package.json
├── tsconfig.json
└── README.md
```

### 2.2 디렉토리 책임

| 디렉토리 | 책임 |
|---|---|
| `src/modules/{name}/` | **페이지 수준 모듈**. 각 폴더는 자체 완결 — `types.ts` (인터페이스), 메인 컴포넌트, 보조 hook, `index.ts` (re-export) |
| `src/composables/` | **여러 모듈에서 공유하는 hook**. ux-core 의 `defineActionPolicy` / `useBatchAction` 위에 도메인 로직 결합 |
| `src/types.ts` | 모듈 간 공유 타입 (`OperatorBaseProps` 등) |
| `src/index.ts` | top-level barrel export — 각 모듈을 한 곳에서 import 가능하게 |

### 2.3 의존성 (`package.json`)

```json
{
  "name": "@o4o/operator-core-ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "npx tsc --build",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "@o4o/operator-ux-core": "workspace:*",
    "@o4o/ui": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.0.0 || ^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "typescript": "5.4.5"
  }
}
```

빌드 패턴은 `@o4o/account-ui` / `@o4o/lms-client` 와 동일 (`tsc --build`).

---

## 3. 설계 원칙

### 3.1 Core vs Extension 경계

| 카테고리 | 처리 |
|---|---|
| 🟢 **Core (이미 공통)** | `core-ui` 에 추출 — Stores 모듈처럼 |
| 🟡 **Core UI + Service Logic** | `core-ui` 모듈 + 서비스 주입 패턴 (§3.3) |
| 🔴 **Extension (서비스 전용)** | **Core 에 강제 흡수 금지**. 서비스 자체 구현 유지. core-ui 모듈에서 `headerExtras` / `rowActionsExtra` slot 으로 진입점만 노출 |

→ Core 가 Extension 영역을 흡수하면 다른 서비스에 dead code 가 되므로 명시적으로 금지.

### 3.2 단일 DataTable 표준

`OPERATOR-DATATABLE-POLICY-V1` 정책에 따라 core-ui 의 모든 페이지 모듈은 **`@o4o/operator-ux-core` `DataTable` 사용** (Operator 표준).

비-Operator 영역에서 core-ui 모듈을 사용하면 안 됨 (도메인 분리).

### 3.3 Service Logic 주입 패턴 — 혼합

| 영역 | 주입 패턴 | 사례 |
|---|---|---|
| **API 호출** | **Adapter** (`StoresApi` interface) | LMS V2 의 `LmsHttpClient` 와 동일 |
| **컬럼 정의** | Config + override callback | 기본 컬럼 제공, props 로 추가/변경 가능 |
| **UI 표현** (텍스트/색상) | **Config 객체** (`StoresConfig`) | 기존 `kpaConfig` 패턴 확장 |
| **Row Actions** | Config rules + 확장 hook | KPA `defineActionPolicy` 활용 |
| **확장점** (Extension 진입) | **Slot props** (`headerExtras`, `rowActionsExtra`) | K-Cos `StoreChannelsPage` / `StoreCockpitPage` 진입 |

→ 한 가지 패턴으로 모든 차이를 흡수하지 않는다. 영역별 적합한 패턴을 혼합 사용.

---

## 4. Stores 모듈 설계 (1차 대상)

### 4.1 모듈 구성

```
modules/stores/
├── types.ts                  (인터페이스 + 타입 정의)
├── OperatorStoresList.tsx    (메인 — 매장 목록)
├── useStoresQuery.ts         (data fetching hook)
└── index.ts
```

### 4.2 핵심 인터페이스

```ts
// modules/stores/types.ts

/** 공통 store 기본 필드 (3 서비스 공통) */
export interface OperatorStoreBase {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  businessNumber: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  slug: string | null;
  channelCount: number;
  productCount: number;
  createdAt: string;
}

/** API adapter — 서비스가 자체 http 클라이언트를 어댑터로 주입 */
export interface StoresApi<T extends OperatorStoreBase = OperatorStoreBase> {
  listStores(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{
    success: boolean;
    stores: T[];
    stats: {
      totalStores: number;
      activeStores: number;
      withChannel: number;
      withProducts: number;
    };
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>;

  getStore(id: string): Promise<T>;

  // 선택적 — 서비스가 구현 여부 결정
  approveStore?(id: string, reason?: string): Promise<void>;
  rejectStore?(id: string, reason: string): Promise<void>;
  suspendStore?(id: string, reason?: string): Promise<void>;
}

/** 표현 제어 — 서비스별 terminology + 색상 */
export interface StoresConfig {
  serviceKey: 'kpa-society' | 'glycopharm' | 'k-cosmetics';
  terminology: {
    storeLabel: string;        // "약국" / "매장"
    storeHubLabel: string;     // "약국 운영 허브" / "매장 운영 허브"
  };
  actionPolicies?: Record<string, any>;
  colorScheme?: 'slate' | 'primary' | 'pink';
}

/** OperatorStoresList Props */
export interface OperatorStoresListProps<T extends OperatorStoreBase = OperatorStoreBase> {
  api: StoresApi<T>;                                 // 필수
  config: StoresConfig;                              // 필수
  columns?: ListColumnDef<T>[];                      // override 가능 (default 제공)
  pageSize?: number;                                 // default 20
  defaultSort?: { field: string; order: 'ASC' | 'DESC' };
  rowActionsExtra?: (store: T) => Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'warning' | 'danger';
  }>;
  headerExtras?: React.ReactNode;
  onRowClick?: (store: T) => void;
  loading?: boolean;
}
```

### 4.3 OperatorStoresList 책임

- ux-core `DataTable` + `Pagination` 외부 결합 (KPA 패턴)
- 기본 컬럼 set 제공 (이름, 코드, 활성, 채널 수, 상품 수, 생성일 등)
- search / pagination / row click 핸들링 내장
- `rowActionsExtra` / `headerExtras` 로 서비스별 확장점 노출
- `loading` / empty / error state 처리

### 4.4 DataTable 정책 연동

`OPERATOR-DATATABLE-POLICY-V1` §2.1 표준에 따라:
- `@o4o/operator-ux-core` `DataTable` 사용
- `ListColumnDef<T>` 사용 (Column<T> 직접 사용 금지)
- pagination 외부 결합 (operator-ux-core `Pagination`)
- `system` 컬럼 / `useBatchAction` 활용 가능 (필요 시)

---

## 5. Service Logic 주입 패턴 (정리)

### 5.1 Adapter 패턴 — API 호출

3 서비스 모두 `/api/v1/operator/stores` 공통 endpoint 사용. 차이는 baseURL prefix 와 auth 처리 방식:
- KPA: `apiClient` (baseURL `/api/v1/kpa`, fetch wrapper)
- Glyco / K-Cos: `api` (baseURL `/api/v1`, axios)

→ 각 서비스가 `StoresApi` 인터페이스를 구현한 어댑터 생성:

```ts
// services/web-kpa-society/src/api/stores-adapter.ts (예시)
import { apiClient } from './client';
import type { StoresApi } from '@o4o/operator-core-ui/modules/stores';

export const kpaStoresApi: StoresApi<KpaStore> = {
  listStores: (params) => apiClient.get('/operator/stores', params),
  getStore: (id) => apiClient.get(`/operator/stores/${id}`),
  approveStore: (id, reason) => apiClient.post(`/operator/stores/${id}/approve`, { reason }),
  // ...
};
```

LMS V2 의 `createLmsLearnerClient(http)` 와 동일 패턴.

### 5.2 Config 패턴 — UI 표현

서비스 별 terminology / color scheme:

```ts
// services/web-kpa-society/src/config/stores.ts (예시)
export const kpaStoresConfig: StoresConfig = {
  serviceKey: 'kpa-society',
  terminology: { storeLabel: '약국', storeHubLabel: '약국 운영 허브' },
  colorScheme: 'slate',
};
```

기존 `@o4o/operator-ux-core/config/services` 의 `kpaConfig` / `glycopharmConfig` / `kcosmeticsConfig` 와 동일 컨셉.

### 5.3 Slot 패턴 — Extension 진입점

K-Cos 의 `StoreCockpitPage` 진입 같은 서비스 전용 UI 는 slot props 로:

```tsx
// services/web-k-cosmetics/src/pages/operator/StoresPage.tsx (예시)
<OperatorStoresList
  api={kcosStoresApi}
  config={kcosStoresConfig}
  rowActionsExtra={(store) => [
    { label: '코크핏 보기', onClick: () => navigate(`/operator/store-cockpit/${store.id}`) },
  ]}
  headerExtras={<KCosCockpitButton />}
/>
```

→ Core 가 Extension 영역을 직접 다루지 않고, slot 으로 호출만 노출.

### 5.4 Action Policy 연결

KPA 의 기존 `defineActionPolicy` / `buildRowActions` 패턴 (`@o4o/operator-ux-core`) 을 `actionPolicies` config 로 주입:

```ts
const kpaStoresConfig: StoresConfig = {
  // ...
  actionPolicies: {
    suspend: defineActionPolicy({ requireRoles: ['kpa:admin'], confirmRequired: true }),
    delete: defineActionPolicy({ requireRoles: ['kpa:admin'], confirmRequired: true }),
  },
};
```

`useRowActions` (composables) 가 이 policy 를 받아 row 별 action 가시성 결정.

---

## 6. 마이그레이션 전략

### 6.1 단계 (3 step + 2 soak)

| Step | 대상 | 작업 규모 | 회귀 위험 | 예상 변경 라인 |
|---|---|---|---|---|
| **Step 0** | 패키지 신설 | `packages/operator-core-ui/` 생성, modules/stores/ 작성 | 0 (신규) | +500 |
| **Step 1** | KPA `OperatorStoresPage` | StoresApi adapter 작성 + thin wrapper 변환 | 낮음 (이미 ux-core DataTable 사용) | -120 / +30 |
| **(soak 1주)** | KPA 안정성 검증 | smoke + log + 사용자 사용 흔적 | — | — |
| **Step 2** | Glyco `StoresPage` | `@o4o/ui` Column → ListColumnDef 변환 + adapter + thin wrapper. PageHeader/StatusBadge 는 `headerExtras` slot 으로 보존 | 낮음 | -150 / +40 |
| **(soak 1주)** | Glyco 안정성 검증 | smoke + log | — | — |
| **Step 3** | K-Cos `StoresPage` | **수동 HTML → DataTable 컴포넌트화** (가장 큼). `colorScheme: 'pink'` prop 으로 K-Cos 색상 보존 | 중간 (시각적 미세 차이 가능) | -200 / +50 |

### 6.2 마이그레이션 순서 근거 (KPA → Glyco → K-Cos)

- KPA: 이미 `@o4o/operator-ux-core` `DataTable` + `useBatchAction` + `defineActionPolicy` 사용 — 가장 가까운 형태. **adapter + config 만 작성하면 thin wrapper 변환 가능.**
- Glyco: `@o4o/ui` `DataTable` 사용 — column 타입 변환 + pagination 외부 결합 필요. 중간 작업량.
- K-Cos: 수동 HTML 테이블 — DataTable 컴포넌트화 자체가 큰 작업. 가장 마지막 + soak 충분히.

### 6.3 Soak 전략

각 Step 사이 1주 안정성 검증:
- Cloud Run 로그 ERROR 0
- 페이지 진입 / 검색 / 페이지네이션 / 행 클릭 정상
- 회귀 흔적 없음

LMS V2 Step 1 → Step 2 의 1주 soak 패턴과 동일.

---

## 7. 의존성 및 영향

### 7.1 `package.json` 변경

3 서비스 모두 dependency 추가:
```json
"@o4o/operator-core-ui": "workspace:*"
```

### 7.2 Dockerfile 변경 (file-by-file COPY 패턴)

3 서비스 Dockerfile 에 다음 라인 추가:

```dockerfile
# package.json copy block (early)
COPY packages/operator-core-ui/package.json ./packages/operator-core-ui/

# 풀 source copy block
COPY packages/operator-core-ui/ ./packages/operator-core-ui/

# Build dependency
RUN pnpm --filter @o4o/operator-core-ui build
```

CLAUDE.md 메모리 노트(file-by-file COPY 패턴 — 4 서비스 중 KPA/Glyco/K-Cos 해당) 준수.

### 7.3 `pnpm-lock.yaml`

새 패키지 추가 시 자동 갱신 필요 (`pnpm install --no-frozen-lockfile`).

### 7.4 Lazy Loading

각 서비스의 `OperatorRoutes.tsx` (또는 `App.tsx` 인라인 라우트) 에서 lazy import 유지:

```ts
const OperatorStoresPage = lazy(() => import('./pages/operator/OperatorStoresPage'));
```

페이지 자체는 thin wrapper 가 되므로 lazy import 패턴 변경 없음.

### 7.5 점진적 마이그레이션

- 한 서비스씩 적용 가능
- 마이그레이션되지 않은 서비스도 영향 없음 (core-ui 사용 안 함 = 변경 안 됨)
- Step 1 KPA 만 적용된 상태에서도 Glyco/K-Cos 정상 동작

---

## 8. 리스크 및 제약

| 리스크 | 심각도 | 완화 |
|---|---|---|
| **Glyco DataTable 변환 시 일관성 문제** | 중 | Step 2 진행 전 Glyco StoresPage 의 컬럼 정의 정렬 (Column → ListColumnDef 사전 매핑 검증) |
| **K-Cos 시각적 회귀** (색상 / 레이아웃 미세 차이) | 중 | `colorScheme: 'pink'` prop + Step 3 전 시각 회귀 테스트 |
| **OperatorStoreChannelsPage / StoreCockpitPage 가 Core 범위 침범** | 낮음 | 명시적 분리: 본 문서 §3.1 "Core 가 Extension 영역 흡수 금지" 정책. slot 으로만 진입 |
| **기존 페이지 회귀** | 중 | 각 Step 후 e2e smoke (행 클릭, 검색, 페이지네이션, 선택) |
| **DataTable 정책 위반** (Operator 페이지에서 @o4o/ui 직접 사용) | 낮음 | core-ui 가 ux-core DataTable 사용으로 강제 — 페이지는 core-ui 만 import |
| **다른 모듈(Users, Forum Analytics) 추출 시 Stores 패턴 부적합** | 중 | Stores 를 reference 로 두고 Phase 2/3 시 패턴 검증. 부적합 시 별도 IR |
| **`StoresApi` 인터페이스가 실제 backend 응답과 미세 불일치** | 낮음 | Step 1 진입 전 `/api/v1/operator/stores` 응답 spot check 필요 |

---

## 9. 다음 단계

본 문서 발행 직후 진입 가능한 WO:

### `WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1`

```text
목표:
@o4o/operator-core-ui 패키지 신설 + Stores 모듈 추출 + 3 서비스 마이그레이션.

범위:
1. packages/operator-core-ui/ 신규 생성 (modules/stores/ + types + composables)
2. 3 서비스 package.json + Dockerfile 업데이트
3. KPA OperatorStoresPage thin wrapper 변환 (Step 1)
4. (1주 soak)
5. Glyco StoresPage thin wrapper 변환 (Step 2)
6. (1주 soak)
7. K-Cos StoresPage thin wrapper 변환 (Step 3)
8. pnpm-lock.yaml 재생성

제외:
- OperatorStoreChannelsPage (KPA + K-Cos — Extension)
- StoreCockpitPage (K-Cos — Extension)
- 다른 Operator 모듈 (Users / Forum Analytics — Phase 2/3)
- 라우팅 구조 통일 (KPA OperatorRoutes 패턴 강제 X)

검증:
- @o4o/operator-core-ui 빌드
- 3 서비스 typecheck
- 3 서비스 컬럼 렌더링 / 페이지네이션 / 검색 / 행 클릭 / 선택 동일성
- Cloud Run 로그 ERROR 0
- 각 Step 후 1주 soak smoke

완료 기준:
- 3 서비스 모두 core-ui 모듈 사용
- 페이지 레벨 코드 ~80% 감소
- 회귀 0
- 본 문서 §6.1 의 단계별 라인 추정 ±20% 이내
```

---

## 10. 금지 사항

본 문서 발행 이후 명시적 IR/WO 없이 다음 금지:

- ❌ 본 문서의 인터페이스 (StoresApi, StoresConfig, OperatorStoresListProps 등) 즉흥 변경
- ❌ Step 순서 변경 (KPA → Glyco → K-Cos 외 다른 순서)
- ❌ Step 사이 soak 생략
- ❌ Extension 영역(`OperatorStoreChannelsPage`, `StoreCockpitPage`) 을 core-ui 모듈로 흡수 시도
- ❌ Operator 페이지에서 `@o4o/ui` `DataTable` 직접 사용 (`OPERATOR-DATATABLE-POLICY-V1` 위반)
- ❌ 다른 패턴 (Users, Forum Analytics) 을 Stores 와 동시 추출 시도

---

## 11. 결론

> **`@o4o/operator-core-ui` 는 Operator 영역의 페이지 수준 모듈을 모은 신규 패키지이며, `@o4o/operator-ux-core` (공유 UI 원시) 위에 구축된다. 첫 추출 모듈은 Stores Management 이고, KPA → Glyco → K-Cos 순으로 점진적 마이그레이션한다.**

본 문서가 Operator Core 공통화의 **시작 기준점**이다. 이후 모든 Operator Core 관련 WO 는 본 문서의 인터페이스·단계·금지 사항을 기준으로 검토한다.

---

## 12. 참고 자료

- 선행 IR: IR-O4O-OPERATOR-CORE-DESIGN-V1 (이번 conversation)
- 상위 통합 문서: [OPERATOR-INTEGRATION-STATE-V1.md](OPERATOR-INTEGRATION-STATE-V1.md)
- DataTable 정책: [OPERATOR-DATATABLE-POLICY-V1.md](OPERATOR-DATATABLE-POLICY-V1.md)
- 5-Block 표준: [docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md)
- 선례 (factory injection 패턴): [LMS-CLIENT-EXTRACTION-V2-COMPLETE.md](LMS-CLIENT-EXTRACTION-V2-COMPLETE.md)
- 패키지 본체:
  - 신설 예정: `packages/operator-core-ui/`
  - 기반: [`packages/operator-ux-core/`](../../packages/operator-ux-core/)
- 서비스별 Stores 페이지 (마이그레이션 대상):
  - [services/web-kpa-society/src/pages/operator/OperatorStoresPage.tsx](../../services/web-kpa-society/src/pages/operator/OperatorStoresPage.tsx)
  - [services/web-glycopharm/src/pages/operator/StoresPage.tsx](../../services/web-glycopharm/src/pages/operator/StoresPage.tsx)
  - [services/web-k-cosmetics/src/pages/operator/StoresPage.tsx](../../services/web-k-cosmetics/src/pages/operator/StoresPage.tsx)
- 다음 단계: `WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1`
