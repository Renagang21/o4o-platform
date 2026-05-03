# Operator DataTable Policy V1

> **상위 문서**: `CLAUDE.md` · `docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md`
> **선행 IR**: IR-O4O-OPERATOR-DATATABLE-UNIFICATION-V1
> **버전**: V1
> **작성일**: 2026-05-03
> **상태**: Active Standard
> **WO**: WO-O4O-OPERATOR-DATATABLE-POLICY-DOC-V1
>
> 본 문서는 O4O 플랫폼의 두 DataTable(`@o4o/ui` 와 `@o4o/operator-ux-core`)이 **경쟁 관계가 아니라 계층 관계**임을 확정하고, 어느 페이지에서 어느 쪽을 사용할지의 정책을 고정한다. 이후 Operator Core 추출 작업(`@o4o/operator-core-ui`) 의 모든 PR 은 본 문서를 기준으로 검토한다.

---

## 1. 핵심 선언

### 1.1 두 DataTable 은 계층 관계이다

```
┌──────────────────────────────────────────────────┐
│  @o4o/operator-ux-core  (Operator 도메인 전용)   │
│    DataTable                                     │
│    + useBatchAction                              │
│    + defineActionPolicy / buildRowActions        │
│    + system 컬럼                                 │
│    + ListColumnDef<T>                            │
│    │  (wrap)                                    │
│    ▼                                             │
├──────────────────────────────────────────────────┤
│  @o4o/ui  (범용 UI 라이브러리, 전 플랫폼)        │
│    BaseTable / DataTable                         │
│    + Column<T>                                   │
│    + 내장 pagination, expandable, renderAfterRow │
└──────────────────────────────────────────────────┘
```

`@o4o/operator-ux-core` 의 DataTable 은 `@o4o/ui` 의 BaseTable 을 **wrap** 하여 Operator 도메인 전용 기능(batch action / action policy / system 컬럼)을 더한 상위 레이어이다. 두 패키지는 의도적으로 분리된 역할을 가진다.

### 1.2 역할 정의

| 패키지 | 역할 | 대상 페이지 |
|---|---|---|
| **`@o4o/ui` `DataTable` / `BaseTable`** | **범용 UI 컴포넌트** | 일반 / 학습자 / 홈 / 허브 / Admin 등 모든 비-Operator 페이지 |
| **`@o4o/operator-ux-core` `DataTable`** | **Operator 도메인 전용 wrapper** | `/operator/*` 라우트의 모든 페이지 |

→ 두 DataTable 은 **서로 다른 추상 레벨**의 도구이며, 통합/병합 대상이 아니다.

---

## 2. 정책 (Operator Core 추출 작업 기준)

### 2.1 페이지 단위 표준

| 페이지 종류 | 사용 표준 |
|---|---|
| `/operator/*` Operator 페이지 | **`@o4o/operator-ux-core` `DataTable`** (확정 표준) |
| `/admin/*` Admin 페이지 | `@o4o/ui` `DataTable` 또는 `BaseTable` |
| `/lms/*`, `/forum/*`, `/instructor/*` 등 사용자 측 | `@o4o/ui` `DataTable` 또는 `BaseTable` |
| Public / Hub / Home 페이지 | `@o4o/ui` `DataTable` 또는 `BaseTable` |

### 2.2 Operator 페이지에서 `@o4o/ui DataTable` 직접 사용 금지

- Operator 페이지(`pages/operator/`)에서 `@o4o/ui` `DataTable` 을 직접 import 하지 않는다.
- Operator 도메인 기능(batch action, action policy 등)을 활용하지 않더라도 `@o4o/operator-ux-core` `DataTable` 사용을 표준으로 한다 — 일관성·향후 확장 가능성 우선.
- 예외: 본 문서가 명시적으로 허용한 경우에만 가능. 현재 명시 예외 0건.

### 2.3 한 페이지에 두 DataTable 동시 import 금지

- 같은 파일에서 두 패키지의 DataTable 을 모두 import 하는 것은 금지.
- 만약 페이지에 operator 표준 + 비-operator 콘텐츠가 섞이면, 페이지를 분리하거나 비-operator 콘텐츠를 별도 컴포넌트로 분리.

### 2.4 신규 Operator 페이지 작성 시 default 선택

- 기본 채택: `@o4o/operator-ux-core` `DataTable`.
- pagination 이 필요하면 `@o4o/operator-ux-core` 의 `Pagination` 컴포넌트 외부 결합 (KPA 패턴).
- expandable / 행 확장이 필수적이면 `@o4o/ui` 의 기능을 `@o4o/operator-ux-core` wrapper 에 추가 요청 (별도 WO).

---

## 3. Stores Management 추출 시 표준

`@o4o/operator-core-ui` 의 첫 추출 모듈인 **Stores Management** 는 본 정책의 첫 적용 사례이다.

### 3.1 추출 시 표준
- **공통 Stores 컴포넌트는 `@o4o/operator-ux-core` `DataTable` 기반**으로 작성.
- 컬럼 정의: `ListColumnDef<Store>` 사용.
- Pagination: `@o4o/operator-ux-core` `Pagination` 외부 결합 (KPA 기존 패턴 차용).
- Row actions: `defineActionPolicy` + `buildRowActions` 활용 가능 (KPA 기존 패턴).

### 3.2 서비스별 마이그레이션 영향

| 서비스 | 현재 상태 | Stores 추출 시 작업 |
|---|---|---|
| **KPA** `OperatorStoresPage` | 이미 `@o4o/operator-ux-core` `DataTable` 사용 | thin migration — 페이지를 Core 컴포넌트 호출로 교체 |
| **GlycoPharm** `StoresPage` | `@o4o/ui` `DataTable` + 내장 pagination 사용 | `@o4o/ui` Column<T> → ListColumnDef<T> 변환, 외부 Pagination 결합 (15-20 라인 수정) |
| **K-Cosmetics** `StoresPage` | **수동 HTML 테이블** (DataTable 미사용) | DataTable 컴포넌트화 (30-40 라인) — Stores 추출 WO 의 가장 큰 작업 |

→ K-Cos `StoresPage` 의 수동 HTML 마이그레이션은 **Stores 추출 WO 에 포함될 부수 작업**으로 기록한다.

### 3.3 추출 후 형태 (예상)

```ts
// @o4o/operator-core-ui/modules/stores
export function OperatorStoresList(props: {
  // service-injected query / mutation
  storesApi: StoresApi;
  // service-specific extension slot (예: K-Cos StoreChannelsPage 진입)
  extras?: React.ReactNode;
}) {
  // operator-ux-core DataTable 기반 표준 구현
}
```

각 서비스의 `OperatorStoresPage` 는 위 모듈을 호출하는 thin wrapper 로 축소.

---

## 4. OPERATOR-INTEGRATION-STATE-V1 정정

`docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md` §4.2 의 표현 정정:

| 위치 | 기존 표현 | 정정 |
|---|---|---|
| §6.2 핵심 발견 | "**DataTable 이원화 (P0 문제)**" | "**DataTable 계층 분리 + 정책 확정 필요**" — 본 문서 발행으로 정책 확정됨, P0 해소 |
| §4.2 문제점 #1 | "별도 IR(`IR-O4O-OPERATOR-DATATABLE-UNIFICATION-V1`) 진행" | IR 완료 → 본 문서로 정책 확정됨. 통합/마이그레이션 대신 **역할 분리 명문화** |
| §8 다음 단계 | "DataTable 통합 IR 필요성" | DataTable 정책 doc 완료. 다음은 `IR-O4O-OPERATOR-CORE-DESIGN-V1` |

---

## 5. 금지 사항

본 문서 발행 이후 명시적 IR/WO 없이 다음 금지:

- ❌ Operator 페이지에서 `@o4o/ui` `DataTable` 직접 import (§2.2)
- ❌ 한 파일에 `@o4o/ui` 와 `@o4o/operator-ux-core` 의 DataTable 동시 import (§2.3)
- ❌ `@o4o/operator-ux-core` `DataTable` 을 비-Operator 페이지(예: 학습자 측)에서 사용 — 도메인 분리 위반
- ❌ 두 DataTable 을 한쪽으로 통합/병합 시도 (옵션 A/B) — 별도 IR 없이는 의도된 계층 분리를 깨는 작업
- ❌ Stores 추출 WO 에서 `@o4o/ui` `DataTable` 을 표준으로 변경

---

## 6. 결론

> **`@o4o/ui` 와 `@o4o/operator-ux-core` 의 두 DataTable 은 통합 대상이 아니라 의도된 계층 분리이다. Operator 페이지의 표준은 `@o4o/operator-ux-core` `DataTable` 이다.**

본 정책으로 다음이 가능해진다:
- `@o4o/operator-core-ui` 패키지 설계가 단일 DataTable 표준 위에서 진행 가능 (`IR-O4O-OPERATOR-CORE-DESIGN-V1` 진입 가능)
- Stores 추출 WO 에서 표준 결정 논쟁 없이 즉시 작업 시작
- 신규 Operator 페이지 작성자는 본 문서를 보고 즉시 표준 결정 가능

---

## 7. 참고 자료

- 선행 IR: IR-O4O-OPERATOR-DATATABLE-UNIFICATION-V1 (이번 conversation)
- 상위 통합 문서: [OPERATOR-INTEGRATION-STATE-V1.md](OPERATOR-INTEGRATION-STATE-V1.md)
- Operator 5-Block 표준: [docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md)
- 패키지 본체:
  - [`packages/operator-ux-core/src/list/DataTable.tsx`](../../packages/operator-ux-core/src/list/DataTable.tsx)
  - [`packages/operator-ux-core/src/list/types.ts`](../../packages/operator-ux-core/src/list/types.ts) (`ListColumnDef`)
  - [`packages/ui/src/ag-components/DataTable.tsx`](../../packages/ui/src/ag-components/DataTable.tsx)
  - [`packages/ui/src/components/table/types.ts`](../../packages/ui/src/components/table/types.ts) (`Column`, `O4OColumn`)
- 다음 단계: `IR-O4O-OPERATOR-CORE-DESIGN-V1`
