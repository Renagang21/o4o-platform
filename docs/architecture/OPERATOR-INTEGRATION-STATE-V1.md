# O4O Operator Integration State V1

> **상위 문서**: `CLAUDE.md` · `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`
> **선행 IR**: IR-O4O-OPERATOR-INTEGRATION-STATE-V1
> **버전**: V1
> **작성일**: 2026-05-03
> **상태**: Active — Operator 공통화 설계 기준 문서
> **WO**: WO-O4O-OPERATOR-INTEGRATION-DOC-V1
>
> 본 문서는 KPA-Society / GlycoPharm / K-Cosmetics 3 서비스의 Operator 영역 현재 상태를 **분류·정책·우선순위로 고정**한다. 이후 모든 Operator 공통화 작업(`@o4o/operator-core-ui` 패키지 설계, 모듈별 추출 WO, DataTable 통합 등)의 판정 기준이다.

---

## 1. 개요 — Operator 는 Capability 집합이다

### 1.1 핵심 선언

> **Operator 는 "메뉴 모음"이 아니라 "Capability 집합"이다.**

- 기존 인식: 서비스마다 사이드바에 메뉴를 나열하면 끝.
- 본 문서가 채택하는 인식: 각 메뉴 항목 뒤에는 **재사용 가능한 Capability**(Members, Stores, Forum, Signage, Approvals 등)가 있고, 서비스는 이 Capability 들을 **조합·확장**한 결과물이다.
- 따라서 Operator 공통화 = 메뉴 통일이 아니라 **Capability 추출 + 서비스별 확장 슬롯 정의**.

### 1.2 3-카테고리 분류 정책

모든 Operator 기능은 다음 3 카테고리 중 하나로 분류한다:

| 카테고리 | 정의 | 처리 |
|---|---|---|
| 🟢 **Core** | UI 구조 + 도메인 의미 모두 동일. 서비스 구분 무관 | 단일 컴포넌트로 추출 (예: `@o4o/operator-core-ui/forum-delete-requests`) |
| 🟡 **Core UI + Service Logic** | UI 패턴은 같으나 데이터 모델/도메인 의미가 서비스별로 다름 | UI Template + 서비스 주입형 service logic. **공통화의 핵심 영역** |
| 🔴 **Extension** | 한 서비스 전용 또는 도메인 의존성이 강해 다른 서비스에 의미 없음 | 서비스 자체 구현 유지. Core 에 강제 흡수 금지 |

### 1.3 Core Layer 구조 (목표 형태)

```
@o4o/operator-core-ui              ← 본 문서가 정의 시작점
  ├── Templates / Layouts          (5-Block Dashboard 외 추가 후보)
  ├── Modules
  │    ├── stores/                 (Stores Management — 1순위)
  │    ├── users/                  (EditUserModal 외)
  │    └── forum/                  (Analytics 등)
  └── Composables
       (action policy, batch, filter, …)

@o4o/operator-ux-core              ← 기존, 유지/확장
  ├── OperatorDashboardLayout      ✅ 이미 공통
  ├── DataTable (KPA 중심)         ⚠ 이원화 문제 — §4 참조
  └── service config

서비스 레벨                         ← Extension만 잔존
  └── pages/operator/<service-only feature>
```

---

## 2. 현재 상태 요약

### 2.1 서비스별 Operator 라우트

| 서비스 | 라우트 수 | 라우팅 구조 | 레이아웃 |
|---|---|---|---|
| **KPA-Society** | 30 | `OperatorRoutes.tsx` 별도 파일 (lazy) | `KpaOperatorLayoutWrapper` |
| **GlycoPharm** | 29 | `App.tsx` 인라인 | `OperatorAreaLayout` / `OperatorLayoutWrapper` |
| **K-Cosmetics** | 20 | `App.tsx` 인라인 | `OperatorLayoutWrapper` |

### 2.2 공통화 수준 요약

| 영역 | 상태 |
|---|---|
| **Operator Dashboard 5-Block 표준** | ✅ 3 서비스 공통 — `@o4o/operator-ux-core/OperatorDashboardLayout` |
| **Service config (kpaConfig 등)** | ✅ 3 서비스 공통 — `@o4o/operator-ux-core/config/services/*` |
| **Forum Delete Requests / Analytics / Community** | ✅ 파일명·구조 거의 동일 |
| **Signage HQ Console (Media/Playlists/Templates/Forced)** | ✅ 3 서비스 공통 |
| **DataTable** | ⚠ **이원화** — 두 패키지 병렬 (§4) |
| **Stores 관리** | ⚠ 95% 동일하나 별도 구현 — 추출 후보 1순위 |
| **EditUserModal** | ⚠ 같은 파일명 3 서비스 복사 — 추출 후보 2순위 |
| **라우팅 구조** | ⚠ KPA 만 별도 파일 — 통일 후보 |

---

## 3. 기능 매트릭스 (분류 포함)

### 3.1 🟢 Core (이미 공통화 완료)

| 기능 | KPA | Glyco | K-Cos | 상태 |
|---|---|---|---|---|
| Dashboard 5-Block | ✅ KpaOperatorDashboard | ✅ GlycoPharmOperatorDashboard | ✅ KCosmeticsOperatorDashboard | `OperatorDashboardLayout` 사용 |
| Forum Delete Requests | ✅ | ✅ | ✅ | 동일 파일명 |
| Forum Analytics | ✅ ForumAnalyticsDashboard | ✅ ForumAnalyticsPage | ✅ ForumAnalyticsPage | 이름만 다름, API 동일 |
| Community Management | ✅ | ✅ | ✅ | 동일 파일명 |
| Signage HQ Console | ✅ | ✅ | ✅ | Media/Playlists/Templates/Forced 4 페이지 동일 |

→ 추가 작업 불필요. 단, `ForumAnalytics` 는 KPA 명칭(`Dashboard`)을 통일할 가치 있음 (선택).

### 3.2 🟡 Core UI + Service Logic (추출 핵심 영역)

| 기능 | KPA | Glyco | K-Cos | 분기점 |
|---|---|---|---|---|
| **Stores 관리** ⭐ | OperatorStoresPage + Detail + Channels | StoresPage + Detail | StoresPage + Detail | 3 서비스 95% 동일, 차이는 K-Cos `StoreChannelsPage` |
| **Users / Members** | MemberManagementPage (Member 도메인) | UsersPage + Pharmacies (User+Pharmacist) | OperatorUsersPage (User) | UI 동일, 데이터 모델 다름 |
| Products | — | ProductsPage | OperatorProductsPage | 2 서비스만 (KPA 미해당) |
| Orders | — | OrdersPage | OperatorOrdersPage | 2 서비스만 |
| AI Report | OperatorAiReportPage | AiReportPage + AiUsage + AiBilling | OperatorAiReportPage | Glyco 가 가장 분화 (3 페이지) |
| Forum Management (전체) | ForumManagementPage | OperatorForumManagementPage | — | 2 서비스만 |
| LMS Operator | OperatorLmsCoursesPage | LmsCoursesPage | — | 2 서비스만 |
| Applications (가입/승인) | Product/Qualification 별개 | Pharmacy/Store 별개 | Partner Single | 도메인 의미 모두 다름 |
| Roles | RoleManagementPage | (admin 영역으로 이동) | — | 정책 분기 |

### 3.3 🔴 Service Extension (서비스 전용)

| 기능 | 서비스 | 사유 |
|---|---|---|
| Legal / Audit Log | KPA | KPA 거버넌스 전용 |
| Content / Resources / Working Content | KPA | KPA CMS 전용 |
| Pharmacy Requests / Qualification Requests | KPA | KPA 약사회 도메인 |
| Guidelines | Glyco | 약학 지침 CMS |
| Settings | Glyco | Operator 자체 설정 |
| Event Offers Approvals | K-Cos | 이벤트 오퍼 승인 워크플로우 |
| Store Cockpit | K-Cos | 매장 종합 대시보드 |

→ Core 에 강제 흡수 금지. 서비스 자체 구현 유지.

---

## 4. 공통 컴포넌트 구조 (현재 + 문제점)

### 4.1 사용 매트릭스

| 컴포넌트 / 패키지 | KPA | Glyco | K-Cos | 출처 |
|---|---|---|---|---|
| `OperatorDashboardLayout` (5-Block) | ✅ | ✅ | ✅ | `@o4o/operator-ux-core` |
| `DataTable` from `@o4o/operator-ux-core` | **18 페이지** | 1 | 1 | KPA 중심 |
| `DataTable` from `@o4o/ui` | 소수 | **10+** | **6+** | Glyco/K-Cos 중심 |
| `useBatchAction`, `defineActionPolicy` | **6 페이지** | 0 | 0 | KPA 전용 사용 |
| `Pagination` (operator-ux-core) | ✅ | 0 | 0 | KPA 전용 사용 |
| `RoleGuard` / `OperatorRoute` | ✅ | ✅ | ✅ | 서비스 자체 구현 |

### 4.2 문제점 #1 — **DataTable 계층 분리 + 정책 확정 필요** (해소됨 — `OPERATOR-DATATABLE-POLICY-V1` 으로 정책 확정)

| 항목 | `@o4o/operator-ux-core` `DataTable` | `@o4o/ui` `DataTable` |
|---|---|---|
| 컬럼 타입 | `ListColumnDef<T>` / `O4OColumn<T>` | `Column<T>` |
| `system` / `onCellClick` 속성 | ✅ 있음 | ❌ 없음 |
| `useBatchAction` 연동 | ✅ | ❌ |
| 사용 서비스 | KPA 중심 | Glyco / K-Cos 중심 |
| 패키지 관계 | **`@o4o/ui` BaseTable 을 wrap 한 상위 레이어** | 범용 UI 컴포넌트 (전 플랫폼) |

→ 두 DataTable 은 **경쟁 관계가 아니라 의도된 계층 분리**임이 IR-V1 에서 확정됨. operator-ux-core 가 ui 의 BaseTable 을 wrap 하여 Operator 도메인 전용 기능(batch action / action policy / system 컬럼)을 더한 상위 레이어.

**정책 (확정)**: Operator 페이지 표준 = `@o4o/operator-ux-core` `DataTable`. 비-Operator 페이지 = `@o4o/ui` `DataTable` 또는 `BaseTable`. 한 페이지에 두 DataTable 동시 import 금지. 상세는 [`OPERATOR-DATATABLE-POLICY-V1.md`](OPERATOR-DATATABLE-POLICY-V1.md) 참조.

### 4.3 문제점 #2 — **라우팅 구조 불일치**

- KPA: `services/web-kpa-society/src/OperatorRoutes.tsx` 별도 파일 (lazy 로딩 + 가독성)
- Glyco / K-Cos: `App.tsx` 인라인 (라우트 정의가 메인 App 코드와 섞임)

**정책**: 신규 라우트 추가 시 KPA 패턴(별도 `OperatorRoutes.tsx`) 권장. Glyco/K-Cos 의 분리는 별도 정리 WO.

---

## 5. API 구조

| Prefix | 사용 빈도 | 설명 |
|---|---|---|
| `/api/v1/operator/*` | 3 서비스 공통 (다수) | 표준 — Members/Stores/Products/Orders/Signage HQ 등 |
| `/api/v1/{service}/operator/*` | 거의 KPA 만 | KPA 전용 — `/api/v1/kpa/operator/audit-logs`, `/legal/*` |
| `/api/v1/forum/operator/*` | 3 서비스 공통 | Forum 도메인 공통 (delete-requests, analytics) |

→ 백엔드는 **이미 상당 부분이 `/api/v1/operator/*`로 공통화**됨. 프론트만 같은 API를 서비스마다 따로 호출하는 중복 상태.

→ Operator Core 패키지가 service-neutral 하게 호출 가능 (factory 인젝션 패턴 — LMS V2 와 동일 구조).

---

## 6. 핵심 발견 (5)

### 6.1 이미 공통화된 영역
`OperatorDashboardLayout` 5-Block, Forum Delete Requests / Analytics / Community Management, Signage HQ Console — 추가 작업 불필요. 신규 서비스 도입 시 그대로 사용.

### 6.2 DataTable 계층 분리 — 정책 확정 (P0 해소)
`@o4o/operator-ux-core` 가 `@o4o/ui` BaseTable 을 wrap 한 의도된 계층 분리임이 `IR-O4O-OPERATOR-DATATABLE-UNIFICATION-V1` 에서 확정됨. 정책은 `OPERATOR-DATATABLE-POLICY-V1` 로 정전. Operator 페이지는 `@o4o/operator-ux-core` `DataTable` 표준, 그 외는 `@o4o/ui`.

### 6.3 라우팅 구조 불일치 (P1 문제)
KPA만 `OperatorRoutes.tsx` 별도. Glyco/K-Cos는 App.tsx 인라인. 정리 가능하나 우선순위 낮음.

### 6.4 Stores 관리 — 가장 큰 공통화 기회
3 서비스 모두 `OperatorStoresPage` + `OperatorStoreDetailPage` 거의 동일. API `/api/v1/operator/stores/*` 공통. **본 문서 §7 의 1순위 후보**. 예상 LOC 절약 800-1000.

### 6.5 사용자 관리 — 데이터 모델 분기
- KPA: `Member` 도메인
- Glyco: `User` + `Pharmacist`
- K-Cos: `User`

→ 100% Core로 흡수 불가. **Core UI + 서비스 주입 service logic** 패턴 적용 필요. `EditUserModal`은 100% 동일하므로 분리 추출 가능.

---

## 7. Core Candidate (우선순위 — 확정)

| 우선순위 | 모듈 | 공통화 가능도 | 영향 | 추출 사유 |
|---|---|---|---|---|
| **1순위** | **Stores Management** | 95% | HIGH | 3 서비스 동일 패턴 + API 공통 + 가장 큰 LOC 절약 |
| **2순위** | **EditUserModal** | 100% | MEDIUM | 3 서비스에 같은 파일명 — 빠른 win |
| **3순위** | **Forum Analytics** | 90% | MEDIUM | 차트·KPI 통일 + API 이미 공통 |

본 3개는 "후보"가 아닌 **확정된 우선 대상**이다. 다른 모듈(예: AI Report 통합) 추출이 먼저 필요한 이유가 발견되지 않는 한 위 순서대로 진행.

### 7.1 Stores Management (1순위) — 모듈 outline
- 컴포넌트: `OperatorStoresPage`, `OperatorStoreDetailPage`
- 공통 DataTable 정의 (columns, row actions)
- 공통 API client (`/api/v1/operator/stores/*` factory injection)
- 서비스별 Extension Slot: K-Cos 의 `StoreChannelsPage`
- 패키지 위치(예정): `@o4o/operator-core-ui/modules/stores`

### 7.2 EditUserModal (2순위) — 모듈 outline
- 100% 동일 파일명 (3 서비스 모두 `EditUserModal.tsx`)
- API: `/api/v1/operator/members/:userId` 또는 동급 endpoint
- Role 관리 로직: 공통 vs 서비스 특화 분리 (Core UI + Service Logic 패턴)

### 7.3 Forum Analytics (3순위) — 모듈 outline
- 이미 API 공통 (`/api/v1/forum/operator/analytics/*`)
- 차트 라이브러리 통일 가능
- KPA 명칭(`Dashboard`) 통일 검토

---

## 8. 다음 단계

본 문서는 분석을 종료한 상태이다. 후속은 두 가닥으로 진행:

### 8.1 즉시 — Operator Core 설계 IR
**`IR-O4O-OPERATOR-CORE-DESIGN-V1`** 발행 권장.

조사 항목:
- `@o4o/operator-core-ui` 패키지 범위 정의 (Templates / Modules / Composables)
- 인터페이스 설계 (factory injection, service config, extension slot)
- 마이그레이션 전략 (1순위 Stores 우선)
- Service Logic 주입 패턴 (Core UI + Service Logic 카테고리 처리법)
- 패키지 의존도 / Dockerfile 영향 분석 (LMS V2 IMPACT 분석과 동일 깊이)

### 8.2 ✅ 완료 — DataTable 정책 확정
`IR-O4O-OPERATOR-DATATABLE-UNIFICATION-V1` → `WO-O4O-OPERATOR-DATATABLE-POLICY-DOC-V1` 진행. 결과: `OPERATOR-DATATABLE-POLICY-V1` 정책 문서로 확정. 두 DataTable 은 통합 대상이 아닌 의도된 계층 분리 — Operator 페이지는 `@o4o/operator-ux-core` 표준, 비-Operator 는 `@o4o/ui` 표준.

→ DataTable 표준이 결정되었으므로 §8.1 의 `IR-O4O-OPERATOR-CORE-DESIGN-V1` 진입 가능.

---

## 9. 금지 사항

본 문서 발행 이후 다음은 명시적 IR/WO 없이 금지:

- ❌ 신규 페이지 추가 시 한쪽 DataTable만 사용하기로 즉흥 결정 (§4.2 정책 무시)
- ❌ Core Candidate 외 다른 모듈 우선 추출
- ❌ Service Extension 영역을 Core 로 강제 흡수
- ❌ Glyco/K-Cos 의 `App.tsx` 인라인 라우트를 즉흥적으로 분리 파일 변경 (별도 라우팅 정리 WO 필요)

---

## 10. 결론

> **Operator 영역은 이미 5-Block + Signage + Forum 공통화로 시작점이 있다.**
> **다음 단계는 Stores / EditUserModal / Forum Analytics 3 모듈을 `@o4o/operator-core-ui` 로 추출하는 것이고, 그 전에 DataTable 이원화 + Capability 기반 패키지 설계를 IR 로 정리해야 한다.**

본 문서는 Operator 공통화의 **시작 기준점**이다. 이후 모든 Operator 관련 IR/WO 는 본 문서의 분류·우선순위·금지 사항을 기준으로 검토한다.

---

## 11. 참고 자료

- IR: IR-O4O-OPERATOR-INTEGRATION-STATE-V1 (이번 conversation)
- 5-Block 표준: [docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md)
- LMS 공통화 선행 사례: [LMS-CLIENT-EXTRACTION-V2-COMPLETE.md](LMS-CLIENT-EXTRACTION-V2-COMPLETE.md)
- 공통화 정의 표준: [O4O-COMMONIZATION-STANDARD.md](O4O-COMMONIZATION-STANDARD.md)
- 기존 패키지: [packages/operator-ux-core/](../../packages/operator-ux-core/), [packages/admin-ux-core/](../../packages/admin-ux-core/)
- 서비스별 operator 페이지:
  - [services/web-kpa-society/src/pages/operator/](../../services/web-kpa-society/src/pages/operator/)
  - [services/web-glycopharm/src/pages/operator/](../../services/web-glycopharm/src/pages/operator/)
  - [services/web-k-cosmetics/src/pages/operator/](../../services/web-k-cosmetics/src/pages/operator/)
