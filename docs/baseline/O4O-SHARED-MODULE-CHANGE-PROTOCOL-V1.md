# O4O Shared Module Change Protocol V1

> **공통 모듈을 수정할 때 단일 서비스 화면만 보고 완료 판단하지 않는다.**
>
> 공통 config / sidebar·menu / layout / dashboard block / capability·permission map /
> route resolver / guard / API client / core+extension contract / shared UI 의 수정은
> **모든 소비처에 동시에 영향을 미친다.** 한 서비스에서 먼저 드러난 문제라도 공통 정책
> 문제인지 먼저 판단한다.

- **작성일:** 2026-06-05
- **분류:** Baseline (Standard) — 개발 운영 기준
- **버전:** V1
- **상태:** Active
- **상위 규칙:** [`CLAUDE.md`](../../CLAUDE.md) §Shared Module / Core+Extension Change Rule
- **선행 사례:** `WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2` 배포 후 smoke 실패 (본 문서 §8)

---

## 1. 목적

공통 모듈 수정 시 단일 서비스 화면만 보고 완료 판단하지 않도록 한다.

공통 모듈의 수정은 다음 범위를 **모두** 고려해야 한다.

- KPA-Society
- GlycoPharm
- K-Cosmetics
- Neture
- admin
- operator
- store / pharmacy store
- forum
- store-hub
- mypage
- shared UI packages
- core packages
- extension packages

최근 `storeMenuConfig / StoreSidebar / menuCapabilityMap` 수정 과정에서 KPA 화면에서만
먼저 문제가 드러났지만, 실제 원인은 KPA 개별 문제가 아니라 **3개 서비스 공통 capability
filtering 정책 문제**였다 (§8 Case Study). 같은 클래스의 문제는 `/store`, `/forum`,
`/store-hub`, `/operator`, `/admin`, `/mypage`, `core+extension` 구조에서도 반복될 수 있다.

본 문서는 그 반복을 막기 위한 **절차 기준**이다. 코드 기능 수정 기준이 아니라 개발 운영 기준이다.

---

## 2. 적용 대상

다음 유형의 파일 또는 모듈을 수정할 때 본 프로토콜을 적용한다.

- 공통 sidebar/menu config
- 공통 layout
- 공통 dashboard block
- 공통 table/list/action component
- 공통 role/permission/capability map
- 공통 route resolver
- 공통 guard
- 공통 API client
- 공통 content manager
- 공통 forum component
- 공통 store-hub component
- 공통 signage component
- core package
- extension contract
- shared UI package
- service wrapper 가 얇게 감싸는 공통 component

**예시:**

- `packages/store-ui-core/src/config/storeMenuConfig.ts`
- `packages/store-ui-core/src/components/StoreSidebar.tsx`
- `packages/store-ui-core/src/config/menuCapabilityMap.ts`
- `DomainIASidebar.tsx`
- `OperatorAreaShell`
- `AdminDashboardLayout`
- `OperatorDashboardLayout`
- forum console common component
- store-hub template
- content manager (`CmsContentManager` / `assetCopy`)
- signage contract
- member management console
- LMS course/lesson core
- QR/POP/library shared flows

---

## 3. 수정 전 필수 확인

공통 모듈 수정 전 다음을 확인한다.

```text
1. 이 파일이 어느 서비스에서 import 되는가?
2. KPA / GlycoPharm / K-Cosmetics / Neture 중 어디가 소비하는가?
3. admin / operator / store / forum / store-hub / mypage 중 어디에 영향이 있는가?
4. core package인지 extension package인지 확인했는가?
5. 서비스별 wrapper가 별도로 있는가?
6. 서비스별 route 차이가 있는가?
7. 서비스별 role/capability 차이가 있는가?
8. feature flag 또는 visibility 조건이 있는가?
9. 빈 그룹 제거, 빈 block 제거, 권한 필터 등으로 화면에서 사라질 가능성이 있는가?
```

> 확인 방법: 소비처는 grep/Glob 으로 import 경로를 전수 검색한다. "수정한 파일"이 아니라
> "그 파일을 쓰는 화면"을 기준으로 영향 범위를 잡는다.

---

## 4. 수정 중 원칙

```text
1. 단일 서비스에서 보인 문제라도 공통 정책 문제인지 먼저 판단한다.
2. 특정 서비스에만 임시 예외를 넣지 않는다.
3. DB backfill, migration, capability 주입으로 UI 정책 문제를 임시 해결하지 않는다.
4. route가 없는 메뉴는 노출하지 않는다.
5. route가 있는 실기능 메뉴는 숨기지 않는다.
6. capability/permission map 변경은 모든 소비처에 미치는 영향을 확인한다.
7. core contract 변경은 extension 소비처 전체를 확인한다.
8. 기존 실기능을 숨기는 경우 반드시 별도 판단과 사용자 승인을 받는다.
9. 데드링크 0 / 기능 은폐 0 원칙을 우선한다.
10. 서비스별 실제 라우트 차이는 보존한다.
```

---

## 5. 수정 후 검증

```text
1. 관련 공통 패키지 typecheck
2. 해당 공통 모듈을 소비하는 서비스 typecheck
3. 최소 2개 이상 소비처 smoke
4. 3서비스 공통 정책이면 KPA / GlycoPharm / K-Cosmetics 모두 smoke
5. Neture가 소비하는 공통 모듈이면 Neture도 smoke
6. route 존재 여부 확인
7. role/capability/visibility 필터 후 실제 표시 결과 확인
8. 모바일/데스크톱 중 영향이 있는 layout은 양쪽 확인
9. CHECK 문서에 소비처 영향 매트릭스 기록
```

---

## 6. core + extension 특별 기준

core+extension 구조는 별도 기준을 둔다 (CLAUDE.md §App 계층 `Core → Extension → Feature → Service`).

```text
1. core contract를 바꾸면 모든 extension 소비처를 검색한다.
2. extension이 기대하는 field, enum, route, capability, event, action을 확인한다.
3. core 변경이 extension에 breaking change인지 판단한다.
4. breaking 가능성이 있으면 compatibility layer 또는 migration 계획을 둔다.
5. core만 typecheck하지 말고 extension 소비 앱도 typecheck한다.
6. core 변경 후 최소 하나 이상의 실제 extension 화면 smoke를 수행한다.
7. extension이 thin wrapper 구조라면 wrapper별 props 차이를 확인한다.
8. service_key, organization_id, role, capability, route boundary를 함께 확인한다.
```

---

## 7. 소비처 영향 매트릭스 (CHECK 문서 필수)

공통 모듈 작업 CHECK 문서에는 아래 형식의 표를 포함한다.

```md
## Consumer Impact Matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---:|---|---|---|---|
| KPA-Society | 사용 | 있음 | capability filter 영향 | typecheck + browser smoke | PASS |
| GlycoPharm | 사용 | 있음 | route 차이 있음 | typecheck + browser smoke | PASS |
| K-Cosmetics | 사용 | 있음 | 일부 메뉴 없음 | typecheck + browser smoke | PASS |
| Neture | 미사용/사용 | 없음/있음 | 해당 없음 | 검색 결과 | PASS |
| admin | 사용 여부 확인 | 있음/없음 | role guard 확인 | typecheck/smoke | PASS |
| operator | 사용 여부 확인 | 있음/없음 | role guard 확인 | typecheck/smoke | PASS |
```

---

## 8. Case Study: Store Menu Capability Filter

`storeMenuConfig / StoreSidebar / menuCapabilityMap` 수정 후 KPA `/store` 에서
`약국 상품·거래` 그룹이 표시되지 않았다.

원인은 배포나 브라우저 캐시가 아니라, `products / orders` 가 `B2C_COMMERCE` capability 에
매핑되어 있어 매장 capability row 가 없을 때 두 item 이 모두 제거되고, 빈 그룹 제거
로직(`resolveStoreMenu`)에 의해 상위 그룹 전체가 사라지는 구조였다.

해결은 KPA DB backfill 이 아니라 **공통 map 에서 `products / orders` 를 de-map** 하는
방식으로 처리했다. 이는 `qr / pop / library` 가 이미 같은 이유로 de-map 되어 있던 선례와
같은 클래스의 문제다.

**판정:**

- KPA-only 예외 금지
- DB backfill / migration 금지
- 최상단 그룹 특수 예외 로직 금지
- 공통 정책 수정으로 처리
- KPA / GlycoPharm / K-Cosmetics smoke 필요

> 관련 WO/CHECK: `WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2`,
> [`CHECK-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2`](../investigations/CHECK-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2.md) §5.3

---

## 9. 향후 반복 가능성이 높은 영역

다음 영역은 공통 모듈 수정 시 반드시 소비처 전체를 확인한다.

```text
1. /store
   - storeMenuConfig
   - StoreSidebar
   - menuCapabilityMap
   - store dashboard
   - product / product-description / POP / QR / blog / signage / library

2. /store-hub
   - StoreHubTemplate
   - hub cards
   - resource cards
   - service-specific labels
   - KPA/GlycoPharm/K-Cosmetics 차이

3. /forum
   - forum operator console
   - forum request/delete/analytics
   - forum list/detail/write
   - KPA/GlycoPharm/K-Cosmetics/Neture forum 차이

4. /operator
   - OperatorAreaShell
   - DomainIASidebar
   - operator menu groups
   - dashboard blocks
   - quick actions
   - role/capability guards

5. /admin
   - AdminDashboardLayout
   - admin quick actions
   - service admin wrappers
   - platform admin vs service admin 차이

6. /mypage
   - MyPageLayout
   - account-ui
   - profile/status/role display
   - service membership boundary

7. content manager
   - CmsContentManager
   - assetCopy
   - service-specific config

8. signage
   - signage contract
   - playlist/video/broadcast
   - product relation 금지 원칙

9. LMS
   - course/lesson core
   - certificate
   - service_key boundary
   - extension UI

10. member management
   - OperatorMembersConsolePage
   - delete flow
   - role/status tabs
   - service-specific membership tables
```

---

## 10. CHECK 문서 필수 섹션 (템플릿)

별도 템플릿 파일을 만들지 않더라도, 공통 모듈 작업 CHECK 문서는 아래 섹션을 포함한다.

```md
## Shared Module Change Verification

### Changed shared module

- Module:
- Package:
- Direct consumers:
- Indirect consumers:

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---:|---|---|---|

### Route / role / capability check

- Route existence:
- Role guard:
- Capability map:
- Visibility/filter:
- Empty group/block removal:

### Smoke result

- KPA:
- GlycoPharm:
- K-Cosmetics:
- Neture:
```

---

## 11. 범위 및 후속

본 문서는 **절차 기준**이다. 다음은 본 문서 범위 밖이며 후속 WO 로 분리한다.

```text
WO-O4O-SHARED-MODULE-CONSUMER-SMOKE-AUTOMATION-V1
WO-O4O-STORE-MENU-RESOLVE-SNAPSHOT-TEST-V1
WO-O4O-CORE-EXTENSION-CONTRACT-CHECK-V1
```

본 문서는 사례가 추가될 때마다 §8 Case Study 와 §9 영역 목록을 갱신한다.

---

**작성:** O4O Platform Team · 2026-06-05
**상태:** Active — 공통 모듈 수정 절차 기준 (CLAUDE.md 등록)
