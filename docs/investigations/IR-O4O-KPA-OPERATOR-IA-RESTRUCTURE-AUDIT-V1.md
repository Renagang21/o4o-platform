# IR-O4O-KPA-OPERATOR-IA-RESTRUCTURE-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드 수정 / 라우트 변경 / rename 없음)
**대상**:
- KPA-Society operator 영역의 IA (정보 구조)
- 좌측 sidebar 메뉴 그룹화 vs operator dashboard 2축 구조의 불일치
- domain-centric 전환 가능성 평가

**판단 기준**:
> operator는 기능(feature)이 아니라 운영 영역(domain) 기준으로 탐색되어야 한다

---

## 0. 결론 요약

1. **불일치 사실 확정**: KPA dashboard 는 이미 **2-domain 축** (`커뮤니티 운영` + `매장 HUB 운영`) 으로 구성되어 있으나, 좌측 sidebar 는 **11-feature 그룹** (`dashboard / users / approvals / stores / content / resources / lms / signage / forum / analytics / system`) 으로 분기되어 IA drift 가 존재함.

2. **핵심 제약 (Critical)**: `STANDARD_GROUPS` 가 `packages/ui/src/operator-shell/constants.ts` 에 정의되어 **4개 서비스 (KPA / Neture / GlycoPharm / K-Cosmetics) 가 공유**. 그룹 순서·라벨·아이콘이 모두 packages/ui 에 hardcoded — KPA-only 변경 불가능하거나 packages/ui 변경이 cross-service 영향을 줌. 또한 `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` 가 "11-그룹 순서 고정 / feature-centric grouping" 을 표준으로 명시.

3. **권장 방향**: cross-service 표준을 깨는 STANDARD_GROUPS 자체 변경(옵션 C)은 비용·리스크 가장 큼. KPA-only 로 **service-local domain 헤더 + 기존 STANDARD_GROUPS 보존** 하는 옵션 A 또는 B 가 1차 정비 안전 경로. 단순 menu rename 수준이 아니라 **OperatorShell 컨벤션 협상이 필요한 IA 작업**.

4. **dead/legacy menu 없음**: UNIFIED_MENU 의 16개 메뉴 항목 모두 등록 라우트 존재. hidden route 2건 (`/operator/working-content`, `/operator/users/:id`) 은 의도적 미노출.

---

## 1. 현재 IA 구조도

### 1.1 좌측 sidebar (feature-centric, 11 그룹)

> 정의: `services/web-kpa-society/src/config/operatorMenuGroups.ts` (UNIFIED_MENU)
> 렌더: `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` → `@o4o/ui` `OperatorShell`

| # | 그룹 (`OperatorGroupKey`) | 라벨 | 메뉴 항목 | route 매핑 |
|---|---|---|---|---|
| 1 | `dashboard` | Dashboard | 대시보드 | `/operator` |
| 2 | `users` | Users | 회원 관리 | `/operator/members` |
| 3 | `approvals` | Approvals | 상품 신청 관리 / 이벤트 오퍼 승인 / 협업 문의 | `/operator/product-applications` / `/operator/event-offers` / `/operator/collaboration-requests` |
| 4 | `stores` | Stores | 매장 관리 / 채널 관리 | `/operator/stores` / `/operator/store-channels` |
| 5 | `content` | Content | 공지사항/뉴스 / Home 편집 / 콘텐츠 허브 | `/operator/content` / `/operator/community` / `/operator/docs` |
| 6 | `resources` | Resources | 자료실 관리 | `/operator/resources` |
| 7 | `lms` | LMS | 강의 관리 / 강사 승인 / 안내 문구 관리 | `/operator/lms` / `/operator/qualification-requests` / `/operator/guide-contents` |
| 8 | `signage` | Signage | HQ 미디어 / HQ 플레이리스트 / 템플릿 / 강제 콘텐츠 | `/operator/signage/*` (4개) |
| 9 | `forum` | Forum | 포럼 운영 / 포럼 관리 / 삭제 요청 / 포럼 분석 | `/operator/forum*` (4개) |
| 10 | `analytics` | Analytics | AI 리포트 / 운영 분석 | `/operator/ai-report` / `/operator/analytics` |
| 11 | `system` | System | 법률 관리 / 감사 로그 / 역할 관리 | `/operator/legal` / `/operator/audit-logs` / `/operator/roles` (모두 adminOnly) |

합계: **11 그룹 / 27 메뉴 항목 / 27 route**

### 1.2 Dashboard 메인 (domain-centric, 2축)

> 정의: `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` 내 `AxisNavigationSection`
> WO 식별: `WO-O4O-OPERATOR-DASHBOARD-COMMUNITY-STORE-HUB-SPLIT-V1`

```
[커뮤니티 운영]                          [매장 HUB 운영]
  소개: "포럼 · 회원 · 콘텐츠 · LMS · 자료실"   소개: "매장 · 이벤트 오퍼 · 사이니지 · 상품 신청"
  metrics: 회원 승인 / 포럼 요청 / 콘텐츠 대기  metrics: 상품 신청 / 약국 서비스 / 등록 매장
  quick: 포럼 운영 / 회원 관리 / 강의 관리       quick: 매장 관리 / 이벤트 오퍼 / 사이니지
```

→ dashboard 는 사용자에게 **"운영 영역 2가지" 멘탈모델** 을 노출하고, sidebar 는 **"기능 11가지" 멘탈모델** 을 노출. **두 멘탈모델이 같은 화면 안에 공존** = 사용자 context switching 비용.

---

## 2. 현재 메뉴 → domain 분류표

WO 의 후보 구조를 기준으로 11 그룹을 분류.

| 현재 그룹 | 메뉴 항목 (요약) | 후보 도메인 | 비고 |
|---|---|---|---|
| `dashboard` | 대시보드 | **공통** | dashboard 자체는 axis 진입점이므로 도메인 외부 |
| `users` | 회원 관리 | **커뮤니티 운영** | dashboard 의 communityMetrics 도 동일 |
| `forum` | 포럼 운영 / 관리 / 삭제 요청 / 분석 | **커뮤니티 운영** | "포럼 · 회원 · 콘텐츠 · LMS · 자료실" 소개와 일치 |
| `content` | 공지사항/뉴스 / Home 편집 / 콘텐츠 허브 | **커뮤니티 운영** | |
| `lms` | 강의 관리 / 강사 승인 / 안내 문구 관리 | **커뮤니티 운영** | |
| `resources` | 자료실 관리 | **커뮤니티 운영** | |
| `stores` | 매장 관리 / 채널 관리 | **매장 HUB 운영** | dashboard 의 storeMetrics 도 동일 |
| `signage` | HQ 미디어 / 플레이리스트 / 템플릿 / 강제 콘텐츠 | **매장 HUB 운영** | "매장 · 이벤트 오퍼 · 사이니지" 소개와 일치 |
| `approvals` | 상품 신청 / 이벤트 오퍼 / 협업 문의 | **매장 HUB 운영** (대부분) | 협업 문의는 모호 — 공통/외부 분류 가능 |
| `analytics` | AI 리포트 / 운영 분석 | **공통** | 양 도메인 통합 분석 |
| `system` | 법률 / 감사 로그 / 역할 (adminOnly) | **공통** | admin 영역 |

특수 항목:
- **약국 서비스 신청** (`/operator/pharmacy-requests`): 라우트 존재 + dashboard quick action 에 노출됨. 그러나 UNIFIED_MENU 에는 **명시적으로 숨김** (주석: "WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1: 메뉴 제거"). 매장 HUB 도메인이나 메뉴 IA 결정 필요.
- **협업 문의** (`/operator/collaboration-requests`): 현재 approvals 그룹에 있으나 매장/커뮤니티 양쪽 모두 가능. 도메인 분류 시 정책 결정 필요.

---

## 3. dead / legacy menu 후보

cross-service 조사 결과 **dead menu 없음**. UNIFIED_MENU 의 모든 항목이 라우트 존재.

| 분류 | 라우트 | 메뉴 노출 | 비고 |
|---|---|---|---|
| Hidden route (의도적) | `/operator/working-content` | 없음 | 도메인 내부용 |
| Hidden route (의도적) | `/operator/users/:id` | 없음 | UserDetailPage, 회원 관리 클릭 시 도달 |
| Hidden route (정책) | `/operator/pharmacy-requests` | 없음 | 메뉴 제거 (WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1), dashboard quick 에서만 접근 |

deprecated 코드:
- `operatorMenuGroups.ts:109-156` 의 `OPERATOR_MENU_ITEMS` (`@deprecated`) — 하위호환 목적. 별도 정리 WO 후보이나 본 IR 범위 외.

---

## 4. canonical 사례 — cross-service 확인

### 4.1 STANDARD_GROUPS (`packages/ui/src/operator-shell/constants.ts`)

```ts
// 14 그룹 (KPA 사용은 11)
[dashboard, users, approvals, products, stores, orders,
 content, resources, lms, signage, forum, analytics, care, system]
```

코멘트 인용:
> 11-Capability Group 표준 정의. 순서, 라벨, 아이콘, Capability 매핑 — 모두 고정.
> 서비스는 이 구조를 변경할 수 없고, 항목(items)만 제공.

### 4.2 서비스별 사용

| 서비스 | 사용 그룹 수 | 노출 그룹 |
|---|---:|---|
| KPA-Society | 11 | dashboard, users, approvals, stores, content, resources, lms, signage, forum, analytics, system |
| Neture | 11 | dashboard, users, approvals, products, stores, orders, content, signage, forum, analytics, system |
| GlycoPharm | 9 | (resources/lms/care 미포함) |
| K-Cosmetics | 9 | (resources/lms/care/orders 미포함) |

→ **4개 서비스 모두 feature-centric STANDARD_GROUPS 를 그대로 사용**. domain-centric 그루핑 사례 0건.

### 4.3 OPERATOR-DASHBOARD-STANDARD-V1 (CLAUDE.md §11 참조)

- 11-그룹 순서 고정
- "서비스별 추가 그룹은 10-11 사이에 삽입" 규정 (KPA `resources` / `lms` 가 이 규정 준수)
- Capability 기반 필터링 (표준)
- **grouping 방식: feature-centric (도메인별 아님)**

### 4.4 결론

현재 cross-service 표준이 **feature-centric** 으로 명문화 + hardcoded 되어 있음. KPA dashboard 의 2축 (domain-centric) 은 **dashboard 페이지 내부에서만** 구현된 service-local 패턴이며, sidebar 표준과 정합 안 함.

---

## 5. 재구성 후보안 (3안)

### 옵션 A — **Service-local domain heading** (최소 침습) ⭐ 권장

KPA-only sidebar 에서 STANDARD_GROUPS 를 **2 도메인 헤딩 + 그룹 묶음** 으로 렌더. STANDARD_GROUPS 자체는 무수정.

```
[💬 커뮤니티 운영]
  ├── Dashboard      (dashboard)
  ├── Users          (회원 관리)
  ├── Forum          (포럼 4개)
  ├── Content        (공지/Home/허브)
  ├── LMS            (강의/강사/안내)
  └── Resources      (자료실)

[🏪 매장 HUB 운영]
  ├── Stores         (매장/채널)
  ├── Signage        (HQ 4개)
  └── Approvals      (상품/이벤트/협업)

[⚙️ 운영 공통]
  ├── Analytics      (AI/분석)
  └── System         (법률/감사/역할, adminOnly)
```

**변경 범위**:
- `services/web-kpa-society/src/config/operatorMenuGroups.ts` 에 도메인 매핑 메타데이터 추가 (예: `OperatorGroupKey → 'community' | 'store_hub' | 'common'`)
- `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` 에 도메인 헤딩 wrapping 로직 추가
- `packages/ui` 무수정 (KPA service 만 적용)

**장점**:
- packages/ui STANDARD_GROUPS 보존 → cross-service 무영향
- URL / route / Capability / RBAC guard 무변경
- 점진 도입 가능 (다른 서비스 영향 0)

**단점**:
- `OperatorShell` 의 menuItems prop 이 grouped flat structure 라 wrapper 측에서 추가 grouping layer 필요 — 컴포넌트 invariant 검토 필요
- domain 헤딩이 mobile 탭에는 적용 어려움 (그룹 순서만 유지)

**리스크**: 낮음 — KPA-only

### 옵션 B — **OperatorShell 에 domain grouping 옵션 추가** (cross-service 합의 필요)

`packages/ui` `OperatorShell` 에 optional `domains?: Record<OperatorGroupKey, string>` prop 도입. 전달 시 도메인 헤딩 렌더, 없으면 기존 단일 리스트 렌더.

**변경 범위**:
- `packages/ui/src/operator-shell/OperatorShell.tsx` (prop + 렌더 분기 추가)
- `packages/ui/src/operator-shell/types.ts` (타입 추가)
- KPA wrapper 에서 domain 매핑 전달
- 다른 서비스는 prop 미전달 → 기존 동작 유지

**장점**:
- 공통 패키지에 정식 컨벤션 도입 — neture / glycopharm / k-cosmetics 도 추후 적용 가능
- mobile 탭에도 domain 표시 가능 (구현 협상)

**단점**:
- packages/ui 변경 = cross-service 영향 검토 필요
- OPERATOR-DASHBOARD-STANDARD-V1 표준 개정 필요
- F1 (Operator OS) Frozen Baseline 에 포함된 가능성 — Core 변경 절차 필요

**리스크**: 중간 — packages/ui 변경 + 표준 문서 개정

### 옵션 C — **STANDARD_GROUPS 자체 재정의** (cross-service 강제 변경)

STANDARD_GROUPS 의 14 그룹을 도메인 축 기반으로 재정의. 모든 서비스가 동일 도메인 구조 적용.

**변경 범위**:
- `packages/ui/src/operator-shell/constants.ts` (14 그룹 → N 도메인 + 하위 키)
- `@o4o/types` `OperatorCapability` 와의 매핑 재정렬
- 4개 서비스의 operatorMenuGroups 전수 재작성
- OPERATOR-DASHBOARD-STANDARD-V1 전면 개정
- CLAUDE.md §11 개정

**장점**:
- 가장 깔끔한 단일 진리 (cross-service 일관)

**단점 / 리스크**: **매우 큼**
- F1 Frozen Baseline 위반 가능성
- 4개 서비스 동시 정비 — 회귀 위험 ↑
- 다른 서비스 운영자에게 도메인 추상화가 부적합할 수 있음 (예: GlycoPharm 의 운영 도메인은 다를 수 있음)

**리스크**: 높음

---

## 6. 권장 canonical IA

**Phase 1**: 옵션 A (KPA service-local domain heading) — 최소 침습으로 dashboard ↔ sidebar IA drift 해소.
**Phase 2** (별도 평가): 옵션 A 가 성공하면 옵션 B 로 승격하여 packages/ui 정식 컨벤션화 후, 다른 서비스 점진 도입.
**옵션 C 는 비추천** — cross-service 통일 비용 대비 효익 불명확.

---

## 7. 영향 범위 분석 (옵션 A 기준)

| 항목 | 영향 여부 | 비고 |
|---|---|---|
| route 변경 | ❌ 없음 | URL 무변경 — bookmark / deep link 안전 |
| URL 유지 | ✅ | 모든 메뉴 항목 path 그대로 |
| menu config 변경 범위 | ✅ | KPA 1 파일 + wrapper 1 파일 |
| breadcrumb | ⚠️ 미정의 | KPA 페이지들은 PageHeader 일부만 사용 — 본 IR 범위 외 별도 표준 필요 |
| title 흐름 | ❌ 없음 | 각 페이지가 자체 title 관리 |
| 권한 guard | ❌ 없음 | OperatorRoute / requireScope 무변경. adminOnly 필터 그대로 |
| mobile navigation | ⚠️ 부분 | 수평 탭 순서는 영향. 도메인 헤더 표시 어려움 — 그룹 순서로만 도메인 클러스터링 |
| deep link / bookmark | ❌ 없음 | URL 유지 |
| cross-service 영향 | ❌ 없음 | packages/ui 무수정 |

---

## 8. Low-Risk Migration 전략 (옵션 A)

### Step 1 — domain 매핑 메타데이터 추가 (배포 영향 0)
- `operatorMenuGroups.ts` 에 `GROUP_TO_DOMAIN: Record<OperatorGroupKey, 'community' | 'store_hub' | 'common'>` 정의
- 기존 UNIFIED_MENU 무변경 — 메타데이터만 추가

### Step 2 — wrapper 레이어에서 sidebar 도메인 그루핑 렌더
- `KpaOperatorLayoutWrapper.tsx` 에서 menuItems 를 도메인 키로 분류
- `OperatorShell` 의 `renderHeader` 또는 자체 sidebar 변경 가능성 검토 (component invariant)
- 만약 OperatorShell 이 grouped-only 라 인입 prop 변경이 어려우면, wrapper 가 OperatorShell 을 감싸지 않고 자체 sidebar 컴포넌트 사용 검토 (옵션 B 로 자연 승격)

### Step 3 — mobile 탭 순서만 도메인 클러스터링 적용
- 도메인 헤딩 자체는 mobile 에서 생략하되, 그룹 순서를 `community → store_hub → common` 으로 정렬

### Step 4 — dashboard ↔ sidebar 라벨 일관성
- dashboard 의 "💬 커뮤니티 운영" / "🏪 매장 HUB 운영" 라벨을 sidebar 도메인 헤딩에 그대로 재사용

### Verification 체크리스트
- 모든 메뉴 URL 무변경 확인
- adminOnly 필터 정상 동작
- mobile / desktop 양쪽 sidebar 렌더 정상
- breadcrumb 영향 없음 확인
- dashboard 진입점 quick links 정상

---

## 9. 후속 WO 초안

### WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-HEADING-V1 (Phase 1)

```text
WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-HEADING-V1

목적:
KPA operator dashboard 의 2축 도메인 (커뮤니티 운영 + 매장 HUB 운영) 과
sidebar IA 의 정합성 회복. service-local domain heading 도입.

근거: docs/investigations/IR-O4O-KPA-OPERATOR-IA-RESTRUCTURE-AUDIT-V1.md (옵션 A)

작업 범위:
- services/web-kpa-society/src/config/operatorMenuGroups.ts
  · GROUP_TO_DOMAIN 매핑 추가 (community / store_hub / common)
- services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx
  · sidebar 도메인 헤딩 렌더 로직 추가
  · OperatorShell prop 호환 검토 — 불가 시 옵션 B 로 승격하여 packages/ui 변경 필요성 별도 보고

도메인 매핑:
- 커뮤니티 운영: users, forum, content, lms, resources
- 매장 HUB 운영: stores, signage, approvals
- 공통: dashboard, analytics, system
- 협업 문의 (approvals 내) 도메인 결정 별도 (운영자 의견 청취 권장)

URL / route / RBAC / Capability: 무변경
packages/ui STANDARD_GROUPS: 무수정
cross-service 영향: 없음

검증:
- 모든 메뉴 URL 그대로 동작
- adminOnly 필터 (system 그룹) 정상
- mobile / desktop sidebar 렌더 정상
- dashboard quick links 정상
- breadcrumb 영향 없음
- 다른 서비스 (neture/glycopharm/k-cosmetics) 영향 0
```

### WO-O4O-OPERATOR-SHELL-DOMAIN-GROUPING-CONVENTION-V1 (Phase 2, 조건부)

옵션 A 완료 후 cross-service 합의가 이루어진 경우만 진행:
- `packages/ui/src/operator-shell/OperatorShell.tsx` 에 domain grouping prop 추가
- OPERATOR-DASHBOARD-STANDARD-V1 개정 (도메인 grouping optional convention 추가)
- F1 Frozen Baseline 영향 검토 필요

### (참조) 별도 WO 후보 — 본 IR 범위 외

- `WO-O4O-KPA-OPERATOR-PHARMACY-REQUESTS-MENU-DECISION-V1`: `/operator/pharmacy-requests` 가 메뉴 숨김인데 dashboard quick 에 노출됨 — 정책 결정 필요
- `WO-O4O-KPA-OPERATOR-DEPRECATED-MENU-CLEANUP-V1`: `OPERATOR_MENU_ITEMS` `@deprecated` 정리
- `WO-O4O-OPERATOR-BREADCRUMB-STANDARD-V1`: 페이지별 breadcrumb 표준 부재 — KPA PageHeader 만 부분 구현

---

## 10. 중점 판단 답변

| 사용자 판단 항목 | 답변 |
|---|---|
| 단순 menu rename 수준인가? | ❌ 아님 — rename 만으로는 grouping 변경 불가. wrapper / config / 잠재적으로 packages/ui 변경 필요 |
| operator IA 전체 재구성 수준인가? | ⚠️ 부분 — KPA-only 라면 옵션 A 로 service-local 정비 가능. cross-service 통일은 옵션 C 수준이라 권장 안 함 |
| feature-centric → domain-centric 전환 가능 여부 | ✅ KPA 단위로 가능 (옵션 A). cross-service 전환은 별도 합의 필요 (옵션 B 또는 C) |
| 단계적 migration 가능한가? | ✅ Phase 1 (KPA-only) → Phase 2 (옵션 B 승격, 조건부) → Phase 3 (서비스 점진 도입) — 안전 경로 존재 |

---

## 11. 본 IR 범위 외 (후속 확인)

- `OperatorShell` 의 menuItems prop 시그니처가 grouped-flat 인지, 도메인 wrapper 를 받을 수 있는지 정확한 invariant 확인 — 옵션 A 실제 진입 시 검토
- breadcrumb 표준 부재 — 별도 IR 또는 WO 분리
- F1 Frozen Baseline 의 Operator OS 변경 절차 — 옵션 B / C 진입 시 필수
- 다른 서비스 운영자의 도메인 추상화 적합성 — 옵션 C 진입 시 사용자 청취

---

## 12. 참조

- `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` (현 표준)
- `docs/baseline/BASELINE-OPERATOR-OS-V1.md` (F1 Frozen)
- `CLAUDE.md §11` (Operator Dashboard 표준)
- `packages/ui/src/operator-shell/constants.ts` (STANDARD_GROUPS)
- `services/web-kpa-society/src/config/operatorMenuGroups.ts` (KPA UNIFIED_MENU)
- `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` (dashboard 2축)
- `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` (wrapper)
- WO 식별:
  - `WO-O4O-OPERATOR-DASHBOARD-COMMUNITY-STORE-HUB-SPLIT-V1` (dashboard 2축 도입)
  - `WO-O4O-OPERATOR-UI-STANDARDIZATION-V1` (STANDARD_GROUPS 표준)
  - `WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1` (adminOnly 플래그)
  - `WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1` (pharmacy-requests 숨김)
  - `WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1` (lms/resources 분리)

---

*조사 전용 — 코드/route/rename 수정 없음. 코드 변경은 후속 WO 로 분리 진행.*
