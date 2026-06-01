# IR-O4O-CROSSSERVICE-OPERATOR-AXIS-NAVIGATION-CONVERGENCE-V1

**작성 일자**: 2026-05-31
**작업 성격**: 정책 결정 IR (Policy Decision Investigation) — 코드 / DB / migration / route / API / frontend / menu / dashboard / component 수정 일절 없음
**상위 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md) §12 I3
**선행 종결**:
- [IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1](IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1.md) (I1 — Option B 권장)
- [CHECK-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-SMOKE-V1](CHECK-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-SMOKE-V1.md) (I2 + G2 + G1 PASS)
- [IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1](IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1.md) (Neture 4-domain 확정)
- [IR-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-AUDIT-V1](IR-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-AUDIT-V1.md) (sidebar 이행 audit)

**조사 도구**: 5개 병렬 Explore agent — KPA / GlycoPharm / K-Cosmetics axis 구조 + Neture 미사용 분석 + 공통 패키지 / type 분석

---

## 0. 핵심 결론 (TL;DR)

> ✅ **권장: Option B — AxisNavigation 은 optional block 으로 유지. KPA / GlycoPharm / K-Cosmetics 사용 유지, Neture 미사용 유지 (별도 DomainIA sidebar 트랙으로 진행 중)**
>
> 1. **AxisNavigation 은 이미 공통화 완료** — `packages/operator-core-ui/src/dashboard/AxisNavigationSection.tsx` (commit `23304abfa`, WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1). 공통 type `OperatorAxisGroup` + 5 tone (blue/emerald/purple/amber/slate) + metrics 확장 지원.
> 2. **OperatorDashboardConfig type 에 axes 필드 없음** — axes 는 frontend 에서 `<AxisNavigationSection axes={...} />` 로 별도 렌더. **이미 design 상 optional**.
> 3. **Neture 의도적 미사용 + 별도 트랙 진행 중** — Neture 는 `DomainIASidebar` 의 4-domain IA (공급·유통 / 커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통) 로 축 안내 역할 수행 예정. AxisNavigation 강제 도입 시 sidebar IA 와 중복 + Neture 4-domain 의미 왜곡.
> 4. **K-Cos 만 라벨 divergence 잔존** — KPA / GlycoPharm 은 (community / hub) 2축, K-Cos 는 (store-hub / content) 2축. K-Cos 에 "커뮤니티 운영" 축 없고 "콘텐츠 운영" 별도 축. 비판단 사항 — K-Cos 사업 성격 (curation 중심) 상 자연스러울 수 있음. 별도 소규모 cosmetics axis 정합 IR 또는 small WO 후보.
> 5. **3 서비스 의 axis 데이터 source 차이** — KPA dynamic (buildKpaAxes — extData metrics), GlycoPharm/K-Cos static. KPA 패턴이 정보량 더 높으나 backend dependency 가 큼.
> 6. **현 시점 즉시 진행 필요 없음** — AxisNavigation 자체는 공통화 완료, Neture 4-domain 은 sidebar 트랙으로 진행 중. 본 IR 의 역할은 정책 confirm.

권고 단계: ① 본 IR 로 Option B 정책 확정 → ② Neture sidebar 이행 트랙 (외부 세션 진행 중) 별도 진행 → ③ (선택) K-Cos axis 라벨 정합 IR / small WO → ④ (선택) GlycoPharm / K-Cos axis metrics 도입 (KPA 패턴 따라가기) — 우선순위 낮음

---

## 1. Executive Summary

| 측면 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|:---:|:----------:|:-----------:|:------:|
| AxisNavigationSection 사용 | ✅ | ✅ | ✅ | ❌ (의도적) |
| 축 개수 | 2 | 2 | 2 | (4-domain via sidebar) |
| 데이터 source | dynamic (buildKpaAxes) | static (GP_AXES) | static (KCOS_AXES) | — |
| axis 라벨 1 | 커뮤니티 운영 | 커뮤니티 운영 | **매장 HUB 운영** ⚠️ | (공급·유통 운영 — sidebar) |
| axis 라벨 2 | 매장 HUB 운영 | 약국 HUB 운영 | **콘텐츠 운영** ⚠️ | (커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통 — sidebar) |
| 5-Block layout 사용 | ✅ (OperatorDashboardLayout) | ✅ | ✅ | ✅ |
| 5-Block 과 axis 위치 | 상단 별도 section (조건부) | 상단 별도 section (무조건) | 상단 별도 section (무조건) | 미해당 |
| OperatorDashboardConfig.axes 필드 | ❌ (없음) | ❌ | ❌ | ❌ |
| Backend dashboard 응답에 axes 포함 | ❌ (KPA summary 미통합) | ❌ | ❌ | ❌ |
| 대체 축 안내 컴포넌트 | OperatorRoleGuideCard (KPA 만) | — | — | DomainIASidebar (4-domain, 진행 중) |
| 사업 성격 | 커뮤니티 (약사회) + 매장 HUB | 커뮤니티 (당뇨) + 약국 HUB | 매장 HUB + 콘텐츠 (curation) | 공급자 + 파트너 + B2B + Market Trial |

### 권장: ✅ **Option B — Optional block 유지 + 서비스별 정체성 보존**

---

## 2. 현재 서비스별 AxisNavigation 사용 현황

### 2.1 매트릭스

§1 의 표 그대로. 핵심:

- **3 서비스 동일 컴포넌트 + 동일 grid layout** — 1축 1col, 2축 이상 md:2col, tone 색상 매핑 동일
- **Neture 의도적 미사용** — sidebar IA 와 4-domain dashboard 안내 역할 분리 설계
- **K-Cos 라벨 divergence** — KPA "community" axis 미사용, "content" axis 별도 존재. WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1 에서 menu 정합은 진행되었으나 axis 라벨은 K-Cos 사업 성격 (curation 중심) 반영하여 그대로 유지

### 2.2 도입 commit 이력

| Commit | WO | 변경 |
|--------|----|------|
| `23304abfa` (2026-05-28) | WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1 | AxisNavigationSection 공통화 (KPA inline → packages/operator-core-ui), 3 서비스 일괄 정합 |
| `048233539` (가장 최근) | WO-O4O-OPERATOR-UX-CORE-DOMAINIASIDEBAR-IA-CONFIG-PARAM-V1 | DomainIASidebar IA config 파라미터화 (Neture 4-domain 이행 준비) |
| `ed21c96af` | IR-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-AUDIT-V1 | Neture sidebar 이행 audit (DomainIASidebar + OperatorAreaShell) |
| `befc65f6c` | IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1 | Neture 4-domain 확정 |

---

## 3. 공통 package / OperatorDashboardLayout 분석

### 3.1 AxisNavigationSection 정의

**위치**: [`packages/operator-core-ui/src/dashboard/AxisNavigationSection.tsx`](../../packages/operator-core-ui/src/dashboard/AxisNavigationSection.tsx)

**export**:
- `AxisNavigationSection` (component, named export)
- `AxisMetric` / `AxisLink` / `OperatorAxisGroup` / `AxisNavigationSectionProps` (types)

**props**: `AxisNavigationSectionProps { axes: OperatorAxisGroup[] }`

### 3.2 OperatorAxisGroup type

```typescript
interface OperatorAxisGroup {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  tone?: 'blue' | 'emerald' | 'purple' | 'amber' | 'slate';
  metrics?: AxisMetric[];       // KPA 만 사용 (extData 기반 실시간 수치)
  links: AxisLink[];            // required
}

interface AxisLink { key: string; label: string; href: string; }

interface AxisMetric { label: string; value: number; href: string; warn?: boolean; }
```

### 3.3 OperatorDashboardConfig type — axes 필드 없음

**Frontend** ([`packages/operator-ux-core/src/types.ts`](../../packages/operator-ux-core/src/types.ts)):
- 5-Block 만: `kpis` / `aiSummary?` / `actionQueue` / `activityLog` / `quickActions`
- **axes 필드 없음**

**Backend** ([`apps/api-server/src/types/operator-dashboard.types.ts`](../../apps/api-server/src/types/operator-dashboard.types.ts)):
- 동일 5-Block + `operatorAlerts?` (GlycoPharm 만 사용)
- **axes 필드 없음**

→ **AxisNavigation 은 이미 design 상 optional**. 공통 type 에 포함되지 않고, frontend 서비스 컴포넌트에서 별도 렌더.

### 3.4 OperatorDashboardLayout 렌더 동작

[`packages/operator-ux-core/src/OperatorDashboardLayout.tsx`](../../packages/operator-ux-core/src/OperatorDashboardLayout.tsx):
- 5-Block 만 렌더 — axes 미관여
- 서비스 컴포넌트가 `<AxisNavigationSection axes={...} /><OperatorDashboardLayout config={...} />` 순서로 별도 렌더

### 3.5 공통화 경계

| Package | 역할 |
|---------|------|
| `@o4o/operator-core-ui` | AxisNavigationSection + DomainIASidebar + OperatorAreaShell + 페이지 모듈 |
| `@o4o/operator-ux-core` | 5-Block 골격 (OperatorDashboardLayout) + config type |

→ **AxisNavigation 은 core-ui 영역, 5-Block 은 ux-core 영역**. 분리 명확.

---

## 4. KPA AxisNavigation 구조

### 4.1 사용 위치

[`services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx`](../../services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx)

- Import: `import { AxisNavigationSection, type OperatorAxisGroup } from '@o4o/operator-core-ui';` (line 32)
- 렌더: `{axes.length > 0 && <AxisNavigationSection axes={axes} />}` (line 149) — **조건부**
- 위치: `<OperatorRoleGuideCard />` 아래, `<OperatorDashboardLayout />` 위
- Builder: `function buildKpaAxes(extData: KpaExtendedData): OperatorAxisGroup[]` (line 157+)

### 4.2 Axis 구성 (실제 값)

| key | title | description | icon | tone | metrics | links |
|-----|-------|-------------|------|------|---------|-------|
| `community` | 커뮤니티 운영 | 포럼 · 회원 · 콘텐츠 · LMS · 자료실 | 💬 | blue | 회원 승인 / 포럼 요청 / 콘텐츠 대기 (extData 동적) | 포럼 운영 / 회원 관리 / 강의 관리 |
| `store-hub` | 매장 HUB 운영 | 매장 · 이벤트 오퍼 · 사이니지 · 상품 신청 | 🏪 | emerald | 상품 신청 / 약국 서비스 / 등록 매장 | 매장 관리 / 이벤트 오퍼 / 사이니지 |

### 4.3 데이터 source

- **Dynamic** — extData 의 summary / pendingMembers / pharmacyRequestCount / productApplicationPendingCount / storeStats 사용
- links 는 hardcoded — href 고정

### 4.4 KPA 특수 요소

- `OperatorRoleGuideCard` (operator 철학 안내) — AxisNavigation 위
- `buildKpaAxes` (dynamic) — extData 기반 metrics 바인딩
- 7 fetch (Operator 5 + Admin 2) — IR I1 §2.1 참조
- `axes.length > 0` 조건부 (방어적 — KPA only)

---

## 5. GlycoPharm AxisNavigation 구조

### 5.1 사용 위치

[`services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx`](../../services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx)

- Import: `import { AxisNavigationSection, type OperatorAxisGroup } from '@o4o/operator-core-ui';` (line 22)
- 렌더: `<AxisNavigationSection axes={GP_AXES} />` (line 143) — **무조건**
- 위치: header 아래, `<OperatorDashboardLayout />` 위
- Definition: `const GP_AXES: OperatorAxisGroup[]` (line 40-65, **static**)

### 5.2 Axis 구성

| key | title | description | icon | tone | metrics | links (3개) |
|-----|-------|-------------|------|------|:-------:|-------------|
| `community` | 커뮤니티 운영 | 포럼 · 회원 · 콘텐츠 · LMS | 💬 | blue | ❌ | forum / members / lms |
| `pharmacy-hub` | 약국 HUB 운영 | 매장 · 채널 · 설문 | 🏥 | emerald | ❌ | stores / channels / surveys |

### 5.3 KPA 와의 정합성

- **축 개수**: 동일 (2축)
- **community 라벨**: 동일 (`커뮤니티 운영`)
- **HUB 라벨**: GlycoPharm "약국 HUB 운영" vs KPA "매장 HUB 운영" — 서비스 특화 표현 (약사 vs 약국 경영자 도메인 정합)
- **데이터 source**: GlycoPharm static (metrics 미사용) vs KPA dynamic (metrics 사용)
- **icon**: 🏥 (병원/약국) vs 🏪 (가게)
- **tone**: blue / emerald 동일
- **links 차이**: GlycoPharm 은 stores/channels/surveys, KPA 는 stores/event-offers/signage (서비스 기능 차이 반영)

---

## 6. K-Cosmetics AxisNavigation 구조

### 6.1 사용 위치

[`services/web-k-cosmetics/src/pages/operator/KCosmeticsOperatorDashboard.tsx`](../../services/web-k-cosmetics/src/pages/operator/KCosmeticsOperatorDashboard.tsx)

- Import: 동일 패턴
- 렌더: `<AxisNavigationSection axes={KCOS_AXES} />` (line 99) — **무조건**
- 위치: 최상단 (OrderMetricsReady alert 보다 먼저)
- Definition: `const KCOS_AXES: OperatorAxisGroup[]` (line 16-43, **static**)

### 6.2 Axis 구성 — KPA / GlycoPharm 와 다른 패턴

| key | title | description | icon | tone | links (4개) |
|-----|-------|-------------|------|------|-------------|
| `store-hub` | 매장 HUB 운영 | 매장 · 상품 · 주문 · 이벤트 | 🏪 | emerald | 매장 관리 / 상품 관리 / 주문 관리 / 이벤트 오퍼 |
| `content` | 콘텐츠 운영 | 콘텐츠 · LMS · 자료실 · 사이니지 | 📋 | blue | 콘텐츠 관리 / 강의 관리 / 자료실 / 사이니지 |

### 6.3 KPA 와의 라벨 divergence

| 항목 | KPA | K-Cosmetics | 정합? |
|------|-----|-------------|:----:|
| 축 1 | community (커뮤니티 운영) | store-hub (매장 HUB 운영) | ⚠️ |
| 축 2 | store-hub (매장 HUB 운영) | content (콘텐츠 운영) | ⚠️ |
| 데이터 source | dynamic | static | △ |
| description 단어 | "포럼·회원·콘텐츠·LMS" / "매장·이벤트·사이니지·상품" | "매장·상품·주문·이벤트" / "콘텐츠·LMS·자료실·사이니지" | 분류 다름 |

### 6.4 K-Cos 분석

- **"커뮤니티" 축 부재** — K-Cos 가 forum/community 운영 약함 (회원 관리만 존재). LMS/자료실/사이니지/콘텐츠 를 별도 "콘텐츠 운영" 축으로 분리
- **사업 성격**: K-Cos 는 매장 + 상품 + curation (콘텐츠) 가 핵심 — 커뮤니티 보다 콘텐츠 큐레이션이 중심
- → **K-Cos 의 (store-hub / content) 2축은 KPA 와 라벨 정합 아니나, K-Cos 사업 정체성에 더 맞음**
- 별도 IR / 소규모 WO 후보: "K-Cos axis 를 KPA 정합으로 변경할지" (Option A vs Option B 의 trade-off)

---

## 7. Neture 미사용 구조 분석

### 7.1 미사용 확정

[`services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx`](../../services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx)

- `AxisNavigationSection` import 없음
- 5-Block 만 사용 (`<OperatorDashboardLayout config={...} />`)
- 상단 별도 navigation block 없음

### 7.2 대체 구조 — DomainIASidebar (4-domain, 진행 중)

`IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1` 에서 확정된 Neture 4-domain:

| Domain | 그룹 | 주요 entry | 항목 수 |
|--------|------|-----------|:------:|
| 공급·유통 운영 📦 | approvals + products | 가입 승인 / 유통펀딩 (Market Trial) / 공급자 활성화 / 상품 관리 | 4 |
| 커머스·정산 운영 💳 | orders + stores | 주문 관리 / 매장 관리 (+ 파트너 + 정산) | 2+ |
| 커뮤니티·콘텐츠 운영 💬 | users + forum + content + signage | 회원 관리 / 포럼 / 문의 메시지 / CMS / 사이니지 | 9 |
| 운영 공통 ⚙️ | analytics + system + dashboard | AI 리포트 × 9 / 알림 설정 / 대시보드 | 12 |

→ Neture 의 4-domain 은 KPA 2축 보다 도메인이 많고 복잡. **sidebar 의 4-domain grouping** 으로 안내. dashboard 단에는 5-Block 만 표시.

### 7.3 KPA 식 강제 도입 시 부적합

| KPA axis | Neture 적용 시 | 부적합 사유 |
|----------|---------------|------------|
| 커뮤니티 운영 | users + forum + content + signage | ⚠️ 부분 적합. Neture forum/users 존재하나 B2B 성격 약함 |
| 매장 HUB 운영 | approvals + products + orders + stores | ❌ 부적합. Neture 의 approvals/products 는 "공급·유통 운영", orders/stores 는 "B2B 커머스·정산" — KPA "매장 HUB" 의미 왜곡 |

→ **KPA 2축 강제 시 Neture 의 공급자 / 파트너 / 정산 / Market Trial 영역이 표현되지 않음**. Neture B2B 정체성 훼손.

### 7.4 Neture 의 axis 안내 책임 — sidebar 단에 위임

- **AxisNavigationSection (dashboard 상단)** 은 운영 영역 안내 컴포넌트
- **DomainIASidebar (sidebar 항상 표시)** 도 운영 영역 안내 컴포넌트
- Neture 는 **sidebar 의 4-domain grouping** 으로 안내 책임 수행 (진행 중 마이그레이션)
- KPA 식 axis 와 sidebar IA 가 중복되지 않음 — Neture 는 정보 밀도 측면에서 sidebar 가 더 적합 (11 group + 4 domain)

---

## 8. 5-Block dashboard 와 AxisNavigation 관계

### 8.1 현재 구현

| 항목 | 현재 구현 | 공통화 가능성 | 권장 |
|------|----------|--------------|------|
| AxisNavigation = OperatorDashboardConfig 의 일부? | ❌ 아님 (별도 컴포넌트) | △ 가능하나 design 분리가 더 깔끔 | **별도 유지** |
| OperatorDashboardLayout 이 axes 렌더? | ❌ 아님 (외부 렌더) | △ 가능하나 강제 도입 시 Neture / 비-axis 서비스 강제 | **외부 렌더 유지** |
| Backend response 에 axes 포함? | ❌ (3 서비스 모두 frontend 정의) | △ 가능 — KPA buildKpaAxes 패턴이 backend 화 가능. 단 KPA 5-Block backend 도입 (I1 Option B) 후 검토 가능 | **현재 frontend, I1 진행 후 검토** |
| frontend builder 에서 조립? | ✅ (KPA buildKpaAxes dynamic / GP+K-Cos static) | — | **유지** |

### 8.2 I1 (KPA 5-Block backend endpoint 도입) 과의 관계

[IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1](IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1.md) Option B 권장 — backend `/operator/dashboard` 신규 endpoint 도입.

본 IR 관점에서 I1 과의 정합:
- **AxisNavigation 데이터 source** 는 KPA 5-Block backend 와 별개 영역
- KPA 5-Block backend response 에 axes 추가 도입은 **선택 사항** (I1 Adapter WO 에서 결정 가능)
- I1 Option B 권고 그대로 — frontend buildKpaAxes 유지 (extData 기반 dynamic) 가 더 안전. backend 화는 후순위 검토.

### 8.3 정합 권고

- **Frontend 정의 유지** — buildKpaAxes (dynamic) + GP_AXES (static) + KCOS_AXES (static)
- **Backend 응답에는 axes 포함 안 함** — 현재 design 유지
- **OperatorDashboardConfig type 에 axes 추가 안 함** — 별도 컴포넌트 design 유지
- **OperatorDashboardLayout 에 axes 렌더 통합 안 함** — 외부 렌더 패턴 유지

---

## 9. 공통화 옵션 A/B/C/D 비교

### Option A — AxisNavigation 을 4 서비스 공통 필수 block 으로 통일

| 측면 | 평가 |
|------|------|
| 장점 | 4 서비스 시각 일관성 극대화. operator dashboard 의 운영 영역 안내가 dashboard 상단 통일된 위치에 표시. cross-service learnability 증가. |
| 단점 | (1) Neture B2B 정체성 훼손 — KPA 2축 또는 Neture 4-domain 강제 시 다른 서비스 도메인 왜곡. (2) Neture 의 sidebar DomainIA 트랙과 중복 (이미 진행 중). (3) 모든 서비스 axes 가 4 가지 표준 (공급·유통 / 커머스 / 커뮤니티 / 운영 공통) 따라가야 함 — KPA / GP / K-Cos 의 기존 2축 구조 재설계 필요. (4) operator-ux-core / operator-core-ui type 통합 + dashboard / sidebar 이중화 정리 필요. |
| 리스크 | 매우 높음 |
| 권장 | ❌ |

### Option B — AxisNavigation 은 optional block 유지, 서비스별 선택 사용 ✅

| 측면 | 평가 |
|------|------|
| 장점 | (1) 이미 design 정합 — `OperatorDashboardConfig.axes` 필드 없음, 별도 컴포넌트. 변경 0. (2) KPA / GP / K-Cos 3 서비스의 기존 axis 보존 — 운영자 체감 영향 0. (3) Neture 사업 정체성 보존 — sidebar DomainIA 트랙으로 자연스럽게 진행. (4) 1인 개발 부담 0 — 본 IR 의 정책 confirm 만으로 종결. (5) cross-service 정합은 5-Block + Layout 컴포넌트 + sidebar IA + tone 색상 매핑 등 다른 layer 에서 이미 확보. |
| 단점 | K-Cos 라벨 divergence (community 축 부재) 잔존 — 별도 소규모 IR / WO 로 검토 가능. |
| 리스크 | 매우 낮음 |
| 권장 | ✅ **권장** |

### Option C — Neture 에만 별도 DomainNavigation 또는 DomainOverview block 도입

| 측면 | 평가 |
|------|------|
| 장점 | Neture 4-domain 을 dashboard 상단에 명시. KPA / GP / K-Cos 와 위치 정합. |
| 단점 | (1) 이미 Neture 에 sidebar DomainIA 트랙 진행 중 — dashboard 상단 추가 시 sidebar 와 중복. (2) AxisNavigationSection vs DomainNavigationSection 별도 컴포넌트 유지 부담. (3) Neture 4-domain 의 sidebar 안내가 이미 충분 — dashboard 추가 정보 노출 의미 약함. (4) "공급자·정산·B2B 강조" 가 dashboard KPI 8개 + Action Queue 4개 + Quick Actions 7개 로도 이미 표현됨. |
| 리스크 | 중간 (중복 정보) |
| 권장 | △ — Neture sidebar 이행 완료 후 사용자 피드백 보고 결정. 현 시점 도입 권장 안 함. |

### Option D — AxisNavigation 제거 또는 축소

| 측면 | 평가 |
|------|------|
| 장점 | dashboard 단순화. 정보 밀도 감소. |
| 단점 | (1) KPA / GP / K-Cos 의 운영 영역 안내 사라짐 — 운영자 cognitive load 증가. (2) KPA `buildKpaAxes` 의 dynamic metrics (회원 승인 / 상품 신청 / 포럼 요청 등) 의 시각화 손실. (3) operator-core-ui 의 공통 컴포넌트 폐기 비용. (4) KPA / GP / K-Cos 운영자 워크플로 회귀. |
| 리스크 | 높음 |
| 권장 | ❌ |

---

## 10. 권장안

### 최종 권장: ✅ **Option B**

**근거**:

1. **이미 design 정합** — AxisNavigation 이 design 상 optional. `OperatorDashboardConfig` type 에 axes 필드 없음, OperatorDashboardLayout 외부 렌더. **본 IR 의 역할은 정책 confirm 만**.
2. **3 서비스 (KPA/GP/K-Cos) 기존 axis 보존** — 사용자 체감 영향 0. 운영자 워크플로 회귀 없음.
3. **Neture 4-domain 트랙 분리** — sidebar `DomainIASidebar` 이행으로 Neture 의 축 안내 책임 sidebar 에 위임. dashboard 단에 AxisNavigation 강제 도입 시 sidebar 와 중복 + Neture B2B 정체성 훼손.
4. **OperatorDashboardStandard 정합** — 본 IR 의 권고는 `OPERATOR-DASHBOARD-STANDARD-V1` 의 "5-Block 필수 + Operator Alerts optional" 구조에 `AxisNavigation optional` 추가 가능. 단 standard 문서 update 자체는 별도 작업 (본 IR 권고 사항).
5. **1인 개발 속도** — 즉시 코드 작업 0. 정책 결정만으로 종결.

### 단, 추가 사항 (선택)

- **K-Cos 라벨 divergence**: KPA / GP 는 "커뮤니티 운영" 축 있고 K-Cos 는 "콘텐츠 운영" 축. K-Cos 사업 정체성 (curation 중심) 상 자연스러우나, KPA canonical 정합 관점에서 별도 소규모 IR / WO 후보. 본 IR scope 외, 우선순위 낮음.
- **GlycoPharm / K-Cos axis metrics 도입 검토**: KPA `buildKpaAxes` 패턴 (dynamic metrics) 을 GP / K-Cos 에도 도입하면 정보 밀도 동등화. 단 backend dependency 필요. 우선순위 낮음.
- **Neture sidebar 이행 완료 후 dashboard 단 4-domain 안내 도입 검토**: Option C 의 변형. Neture sidebar 이행 완료 후 사용자 피드백 본 뒤 결정. 우선순위 낮음.

### 즉시 진행 권장 없음

- AxisNavigation 자체는 공통화 완료 (commit `23304abfa`).
- Neture 4-domain 은 sidebar 트랙으로 진행 중 (외부 세션, commit `048233539`).
- 본 IR 은 정책 confirm — 즉시 코드 작업 없음.

---

## 11. 예상 후속 WO

본 IR 종결 후 즉시 진행 필요 없음. 다음은 선택적 후속 WO 후보 (우선순위 모두 낮음):

| ID (가칭) | 범위 | 우선 |
|-----------|------|:----:|
| WO-O4O-GLYCOPHARM-OPERATOR-AXIS-METRICS-ALIGN-WITH-KPA-V1 | GlycoPharm GP_AXES 에 KPA 패턴 metrics 도입 (extData 기반 dynamic). 사용자 정보 밀도 향상. backend 변경 필요 시 별도 IR 선행. | 낮음 |
| WO-O4O-KCOSMETICS-OPERATOR-AXIS-METRICS-ALIGN-WITH-KPA-V1 | K-Cos KCOS_AXES 에 동일 metrics 도입 | 낮음 |
| IR-O4O-KCOSMETICS-OPERATOR-AXIS-LABEL-CONVERGENCE-V1 (선택) | K-Cos 의 (store-hub / content) 2축을 KPA 정합 (community / store-hub) 으로 변경할지 정책 결정 | 낮음 |
| IR-O4O-OPERATOR-DASHBOARD-OPTIONAL-BLOCK-STANDARD-V1 (선택) | OPERATOR-DASHBOARD-STANDARD-V1 에 AxisNavigation / OperatorAlerts / OperatorRoleGuideCard 의 optional block 표준 명시 | 중간 |
| WO-O4O-NETURE-OPERATOR-SIDEBAR-DOMAIN-IA-MIGRATION-V1 (외부 세션 진행 중) | Neture sidebar 4-domain 이행 — 본 IR 외부 트랙 | (외부 진행 중) |
| CHECK-O4O-CROSSSERVICE-OPERATOR-AXIS-NAVIGATION-SMOKE-V1 (선택) | 브라우저 smoke — 3 서비스 axis 렌더 + tone 색상 + links 정합 + Neture 미사용 시각 확인 | 낮음 |

---

## 12. 리스크와 회귀 가능성

### 12.1 본 IR 자체의 리스크

| 항목 | 리스크 |
|------|:------:|
| 정책 결정 (Option B 확정) 자체 | **매우 낮음** — 이미 design 정합 상태 confirm |
| 다른 세션 WIP (Neture sidebar 이행 트랙) 와 충돌 | 매우 낮음 — 본 IR 은 정책 확정, sidebar 트랙은 별도 영역 |

### 12.2 후속 WO 진행 시 리스크 (선택)

| WO | 리스크 |
|----|:------:|
| GlycoPharm/K-Cos axis metrics 도입 | 중간 — backend dependency / extData shape 변경 필요 |
| K-Cos axis 라벨 정합 | 중간 — 사용자 시각 변화 / 사업 정체성 재정렬 |
| Operator dashboard optional block standard 문서화 | 낮음 — 문서만 |
| Neture sidebar 이행 (외부 트랙) | 별도 영역 |

### 12.3 회귀 가능성

본 IR 진행으로 인한 회귀 없음 (코드 변경 0).

---

## 13. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) + [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) 정합 점검.

| 원칙 | Option A (필수 통일) | **Option B (optional, 권장)** | Option C (Neture 별도) | Option D (제거) |
|------|:--------------:|:--------------:|:--------------:|:--------------:|
| §3 참여 주체 (Operator) | ✅ | ✅ | ✅ | △ |
| §3.2 operator 정의 (운영 영역 안내 + 매장 실행 자산 제작) | ⚠️ Neture B2B 영역 왜곡 가능 | ✅ 서비스별 정체성 보존 | ✅ | ❌ axis 제거 시 운영 영역 안내 손실 |
| §5 HUB 철학 (매장 HUB) | △ Neture B2B 와 충돌 | ✅ KPA/GP/K-Cos 의 매장 HUB 축 보존 + Neture sidebar 4-domain | ✅ | △ |
| §7 Drift 방지 (도메인 어휘 격리) | ❌ KPA 식 라벨 강제 시 도메인 어휘 왜곡 | ✅ 서비스별 도메인 어휘 보존 | ✅ | ✅ |
| 3-Role Flow §2 책임 매트릭스 | △ | ✅ | ✅ | △ |
| 공통화 + 운영 흐름 정합 §2 | △ 강제 시 over-fitting | ✅ "공통 컴포넌트 + 서비스별 선택" 패턴 | △ Neture 별도 컴포넌트 부담 | △ |
| OPERATOR-DASHBOARD-STANDARD 5-Block | ✅ 동일 | ✅ "5-Block 필수 + AxisNav optional" 명시 가능 | △ | △ |
| KPA canonical reference (§13 O4O 공통 구조 원칙) | △ KPA 패턴 강제 가능 | ✅ KPA reference + 서비스별 자연스러운 차이 인정 | △ | ❌ |
| 1인 개발 속도 | ❌ 4 서비스 전면 재설계 | ✅ 변경 0 | △ Neture 별도 작업 | △ axis 폐기 비용 |
| 다른 세션 WIP (Neture sidebar 이행) 와의 충돌 | ❌ 충돌 가능 | ✅ 영역 분리 | ⚠️ 일부 중복 | ✅ |

> **종합**: **Option B** 가 모든 원칙과 정합. 특히 §3.2 / §7 / 공통화 §2 / KPA canonical §13 의 균형이 최선. Option A 는 §7 Drift 위반 + §3.2 Neture 정체성 훼손. Option C 는 sidebar 이행 트랙과 중복. Option D 는 §3.2 운영 영역 안내 손실.

### 13.1 핵심 통찰

> **공통화는 "같은 화면을 강제" 가 아니라 "같은 책임 구조를 같은 방식으로 설명"**

- AxisNavigation 의 책임: **dashboard 상단에서 운영 영역 안내 (where can I do what)**
- 같은 책임 을 같은 방식 (5 tone / OperatorAxisGroup type / TONE_MAP / grid layout) 으로 표현하되, 서비스별 axis 자체는 사업 도메인에 맞게 자연스러운 차이 유지
- Neture 는 동일 책임 (운영 영역 안내) 을 sidebar (DomainIA) 로 위치 이동 — **공통 책임 + 적절한 위치 자유도**

### 13.2 1인 개발 속도

- 본 IR 자체로 정책 결정 ✅ (즉시 코드 작업 없음)
- 후속 WO 들은 모두 우선순위 낮음 — Tier 4 사이클 + Neture sidebar 이행 + KPA 5-Block (I1) 완료 후 별도 trigger 시
- 외부 세션 (Neture sidebar 이행) 과 영역 충돌 0

---

## 14. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 작성 문서 | `docs/investigations/IR-O4O-CROSSSERVICE-OPERATOR-AXIS-NAVIGATION-CONVERGENCE-V1.md` |
| 서비스별 AxisNavigation 현황 요약 | KPA 사용 (dynamic, 2축 community/store-hub) / GlycoPharm 사용 (static, 2축 community/pharmacy-hub) / K-Cosmetics 사용 (static, 2축 store-hub/content — KPA 라벨 divergence) / Neture **미사용** (의도적, sidebar DomainIA 트랙으로 4-domain 안내) |
| Neture 미사용 판정 | ✅ 의도적 미사용 — sidebar 의 4-domain (공급·유통 / 커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통) 으로 안내 책임 위임. KPA 식 2축 강제 도입 시 B2B / supplier / partner / Market Trial / 정산 영역 왜곡 |
| 권장 옵션 | **Option B** — AxisNavigation 은 optional block 유지. KPA / GP / K-Cos 사용 유지, Neture 미사용 유지 (sidebar 트랙으로 별도 진행) |
| 즉시 WO 필요 여부 | ❌ 즉시 진행 필요 없음. 본 IR 은 정책 confirm. 후속 WO 후보 모두 우선순위 낮음 |
| 보류 항목 | (1) K-Cos axis 라벨 정합 검토 (별도 IR), (2) GlycoPharm / K-Cos axis metrics 도입 (별도 WO), (3) Operator dashboard optional block standard 문서화 (별도 WO), (4) Neture sidebar 이행 완료 후 dashboard 단 4-domain 도입 검토 (Option C 변형, 별도 IR) |
| 코드 / DB / migration / route / API / frontend / menu / dashboard / component 수정 | **없음** ✅ |
| 다른 세션 WIP 미포함 | ✅ 본 IR 진행 시점 working tree clean. Neture sidebar 이행 외부 세션 트랙은 별도 영역 |
| Commit 여부 | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 정책 결정 IR 완료. 권장 옵션 B (AxisNavigation optional block 유지, 4 서비스 자연스러운 차이 인정). 즉시 코드 작업 없음. Neture sidebar 이행 외부 세션 트랙과 영역 충돌 0. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
