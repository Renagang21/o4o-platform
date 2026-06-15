# IR-O4O-OPERATOR-DASHBOARD-AUX-SECTION-COMMONIZATION-AUDIT-V1

> **Type:** IR (read-only 조사)
> **Date:** 2026-06-11
> **Scope:** 4개 서비스 운영자 대시보드 부가 섹션 편차 조사 및 공통 슬롯화 분류
> **수정 파일:** 없음 (read-only)

---

## 1. 조사 개요

운영자 UI-UX 공통화는 OperatorAreaShell·DomainIASidebar·OperatorDashboardLayout(5-block)·회원/Admin/Forum·주문 view-only loop·Bulk P1 까지 완료되었다.
그럼에도 4개 서비스 운영자 대시보드의 **체감 차이**가 남아 있다.

본 IR 은 공통 `OperatorDashboardLayout` 위/아래에서 각 서비스가 **추가로 렌더링하는 부가 섹션**을 전수 식별하여,
(a) 차이의 원인이 layout 인지 부가 섹션인지 규명하고 (b) 공통 슬롯화/서비스 고유 유지 항목을 분류한다.
**read-only** — 코드/UI/API/DB/route/menu 무수정.

**핵심 결론(요약):** 4개 서비스는 **동일한 5-block layout** 을 쓴다. 차이는 전적으로 **5-block "위" 영역(header·guide·axis·alert·notice)** 의 서비스별 인라인 조합에서 발생한다. `OperatorDashboardConfig` 에 부가 섹션 slot 이 없어 이 영역이 표준화되지 않았다.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|-----|
| branch | `main` |
| HEAD (조사 기준 commit) | `6a4884d9cde5ea5f73e540a6bcc84cadd0e4ae0a` |
| origin/main ahead/behind | `0 / 0` |

**working tree (다른 세션 WIP — 본 IR 미접촉):**
- `M docs/investigations/CHECK-O4O-OPERATOR-ORDER-VIEW-LOOP-COMPLETION-V1.md`
- `M packages/shared-space-ui/src/guide/*` (GuideFeaturesPage / copy/neture / index / types)
- `M services/web-neture/src/App.tsx`, `src/pages/guide/*`
- `?? services/web-neture/src/pages/guide/GuideService{GlycoPharm,KCosmetics,KpaSociety}Page.tsx`
- `?? *.png` (스크린샷)

> 본 IR 은 신규 문서 1개만 생성하며 위 WIP 를 일절 건드리지 않는다. (git add/commit/push 는 본 IR 범위 외)

---

## 3. 조사 대상 파일

| 영역 | 파일 |
|------|------|
| 공통 layout | `packages/operator-ux-core/src/OperatorDashboardLayout.tsx` |
| 공통 config 타입 | `packages/operator-ux-core/src/types.ts` |
| 공통 axis 컴포넌트 | `packages/operator-core-ui/src/dashboard/AxisNavigationSection.tsx` |
| KPA 대시보드 | `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` (229 L) |
| GP 대시보드 | `services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx` (149 L) |
| GP alert 컴포넌트 | `services/web-glycopharm/src/components/OperatorAlerts.tsx` |
| K-Cos 대시보드 | `services/web-k-cosmetics/src/pages/operator/KCosmeticsOperatorDashboard.tsx` (123 L) |
| Neture 대시보드 | `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx` (72 L) |

> 각 서비스 `operatorConfig.ts`(KPI/quickAction builder)는 backend 응답 → config 매핑으로, 본 IR 의 부가 섹션 범위 밖(데이터 밀도는 §9 에서 다룸).

---

## 4. 공통 OperatorDashboardLayout 사용 현황

`OperatorDashboardLayout` 은 **5-block 고정 순서**만 렌더한다:

```
KpiGrid → AiSummaryBlock → ActionQueueBlock → ActivityLogBlock → QuickActionBlock
```

`OperatorDashboardConfig` (types.ts):

```ts
interface OperatorDashboardConfig {
  kpis: KpiItem[];
  aiSummary?: AiSummaryItem[];
  actionQueue: ActionItem[];
  activityLog: ActivityItem[];
  quickActions: QuickActionItem[];
}
```

| 확인 항목 | 결과 |
|-----------|------|
| 4서비스 모두 `OperatorDashboardLayout` 사용 | ✅ (KPA/GP/KCos/Neture 전부) |
| 5-block 구조 유지 | ✅ |
| block 순서 동일 | ✅ (layout 고정, 서비스 분기 불가) |
| block 이름/역할 동일 | ✅ |
| dashboard config 사용 | ✅ 4서비스 모두 backend → config |
| **config 에 부가 섹션 slot** | ❌ **없음** — 5 data block 만 정의 |

→ **5-block 본체는 완전 공통**. 모든 부가 섹션은 config/layout 밖에서 **서비스 페이지가 직접 JSX 로 조립**한다. 이것이 본 IR 의 핵심 관찰점이다.

---

## 5. KPA-Society 대시보드 부가 섹션

페이지 구조 (`KpaOperatorDashboard.tsx`):
```
<div space-y-6>
  <OperatorRoleGuideCard/>           ← (1)
  {axes.length>0 && <AxisNavigationSection axes={axes}/>}  ← (2)
  <OperatorDashboardLayout config/>  ← 5-block
</div>
```

| # | 섹션 | 위치 | 렌더링 | 공통 컴포넌트 | 데이터 의존 | API | link/route | 필요성 | 타서비스 적용 |
|---|------|------|--------|:---:|:---:|:---:|------|:---:|:---:|
| 1 | **OperatorRoleGuideCard** (운영 철학 "운영자는 관리자가 아닙니다") | 최상단 | **인라인 static** (파일 내 로컬 함수) | ❌ KPA only | static copy | ❌ | `/guide/for/operator` (**live**, App.tsx:624) | 중(온보딩) | 가능(공통화 시) |
| 2 | **AxisNavigationSection** (2축: 커뮤니티 운영 / 매장 HUB 운영) | guide 아래 | 공통 컴포넌트 호출 | ✅ `@o4o/operator-core-ui` | backend kpis 파생 metrics + storeStats 1 보조 fetch | ✅ (kpis + /operator/stores) | 축별 metric/link href | 높음 | 부분(content 도메인 차) |

특이점:
- KPA AxisNavigation 은 **metrics + warn 배지**(승인 대기 등 실시간 수치)를 가진 유일한 서비스 → 시각적으로 가장 풍부.
- GuideCard 가 **최상단**에 위치 → KPA 대시보드가 "설명이 많다"는 체감의 주원인.
- header(h1/새로고침) **없음**.

---

## 6. GlycoPharm 대시보드 부가 섹션

```
<div space-y-6>
  <OperatorAlerts alerts={alerts}/>  ← (1) data-driven
  <header h1 + 새로고침>             ← (2)
  <AxisNavigationSection axes={GP_AXES}/>  ← (3) links-only
  <OperatorDashboardLayout config/>  ← 5-block
</div>
```

| # | 섹션 | 위치 | 렌더링 | 공통 컴포넌트 | 데이터 의존 | API | link/route | 필요성 | 타서비스 적용 |
|---|------|------|--------|:---:|:---:|:---:|------|:---:|:---:|
| 1 | **OperatorAlerts** (network/commerce/system, info/warning/critical) | 최상단 | GP 로컬 컴포넌트 | ❌ GP only (`components/OperatorAlerts.tsx`) | `data.operatorAlerts` | ✅ backend rule-based | 없음(텍스트) | 높음(실알림) | 가능(공통 alert slot) |
| 2 | **Page header** (h1 "운영 대시보드" + 설명 + 새로고침) | alert 아래 | 인라인 | ❌ GP only | ❌ | ❌ | 새로고침=refetch | 중 | 가능(공통 header) |
| 3 | **AxisNavigationSection** (2축: 커뮤니티 / 약국 HUB) | header 아래 | 공통 컴포넌트 | ✅ | links-only (metrics 없음) | ❌ | 축별 link | 높음 | ✅ |

특이점:
- **유일하게 page header(h1+새로고침)** 보유 → "앱 헤더가 있는" 체감.
- alert 가 **data-driven**(backend operatorAlerts) — 4서비스 중 가장 정식 알림 체계.
- AxisNavigation 은 links-only(metrics 미사용).

---

## 7. K-Cosmetics 대시보드 부가 섹션

```
<div space-y-6>
  <AxisNavigationSection axes={KCOS_AXES}/>  ← (1) links-only
  {!orderMetricsReady && <amber notice>}     ← (2) conditional inline
  <OperatorDashboardLayout config/>          ← 5-block
</div>
```

| # | 섹션 | 위치 | 렌더링 | 공통 컴포넌트 | 데이터 의존 | API | link/route | 필요성 | 타서비스 적용 |
|---|------|------|--------|:---:|:---:|:---:|------|:---:|:---:|
| 1 | **AxisNavigationSection** (2축: 매장 HUB / 콘텐츠) | 최상단 | 공통 컴포넌트 | ✅ | links-only | ❌ | 축별 link | 높음 | ✅ |
| 2 | **orderMetricsReady notice** (amber ⚠ "주문/매출 지표 준비 중") | axis 아래 | **인라인 conditional** | ❌ KCos only | `result.orderMetricsReady`(backend meta) | ✅ (meta.featureStatus) | 없음 | 중(거짓 0 신호 방지) | 패턴 가능 |

특이점:
- header **없음**.
- notice 가 **인라인 하드코딩 conditional**(GP 의 OperatorAlerts 와 다른 구현) → 알림/안내 처리가 GP 와 **이중 패턴**.
- AxisNavigation links-only.

---

## 8. Neture 대시보드 부가 섹션

```
return <OperatorDashboardLayout config/>;   // 부가 섹션 0
```

| 확인 | 결과 |
|------|------|
| GuideCard | ❌ |
| AxisNavigationSection | ❌ **없음** (4서비스 중 유일) |
| Alert/Notice | ❌ |
| Page header | ❌ |
| 5-block layout | ✅ (단독) |

특이점:
- **부가 섹션 전무** → 4서비스 중 가장 "빈약한" 체감.
- Neture 는 supplier/partner workspace 가 **별도 영역**으로 존재(operator dashboard 와 분리). 운영자 대시보드에는 axis 진입 안내가 없어, store 중심 3서비스와 시각적 격차가 큼.

---

## 9. 서비스별 시각적·정보 밀도 비교

| 요소 | KPA | GP | KCos | Neture |
|------|:---:|:---:|:---:|:---:|
| Page header (h1+새로고침) | ❌ | ✅ | ❌ | ❌ |
| Guide/철학 카드 | ✅ (최상단, 큰 카드) | ❌ | ❌ | ❌ |
| AxisNavigation | ✅ **metrics+warn** | ✅ links | ✅ links | ❌ |
| Alert (data) | ❌ | ✅ OperatorAlerts | ❌ | ❌ |
| Notice (conditional) | ❌ | ❌ | ✅ amber inline | ❌ |
| 5-block | ✅ | ✅ | ✅ | ✅ |
| 첫 화면 밀도(체감) | **최고** | 중 | 중 | **최저** |

밀도 차이의 구조적 원인:
1. **KPA 만** 철학 GuideCard(최상단 대형) + axis metrics → 가장 많아 보임.
2. **Neture 만** 부가 섹션 0 → 가장 적어 보임.
3. **GP 만** page header 보유 → 헤더 유무 불일치.
4. **알림/안내가 3가지 패턴**: GP(data component) / KCos(inline conditional) / KPA·Neture(없음).
5. KPI·quickAction **개수**는 각 서비스 `operatorConfig.ts` builder + backend 응답에 따라 다름(= 도메인 데이터 차이, layout 차이 아님).

→ **"대시보드가 다르다"의 원인은 layout 이 아니라 5-block 위 부가 섹션의 비표준 조합.**

---

## 10. Action Queue / AI Summary / Alert 정책 비교

| 항목 | KPA | GP | KCos | Neture |
|------|:---:|:---:|:---:|:---:|
| Action Queue | ✅ (config.actionQueue) | ✅ | ✅ | ✅ |
| pending 기준 | backend 산출 | backend | backend | backend |
| AI Summary | ✅ rule-based(backend) | ✅ CopilotEngine | ✅ backend | ✅ 상태기반 |
| AI Summary 실데이터 여부 | 실데이터(rule-based, LLM 미호출) | 실데이터 | 실데이터 | 실데이터 |
| Alert/Warning | ❌ | ✅ data-driven 공식 | ⚠ inline conditional | ❌ |
| empty state | layout block 공통 | 공통 | 공통 | 공통 |

관찰:
- **Action Queue·AI Summary·Activity·empty state 는 layout block 공통** → 정책 일치. (CLAUDE.md §11.3: AI Summary backend 생성 원칙 준수, frontend client-side 생성 없음 — 확인됨)
- **Alert 만 비표준**: GP 는 `OperatorAlerts`(공식 rule-based), KCos 는 단일 하드코딩 banner, KPA·Neture 는 없음. → alert 가 표준 5-block 밖 + 서비스별 임의 구현.

---

## 11. Guide / Help / Manual 링크 정책

| 확인 | 결과 |
|------|------|
| 대시보드 → Guide 링크 | KPA 만 보유(`OperatorRoleGuideCard → /guide/for/operator`) |
| 서비스별 guide link 위치 | KPA 최상단 카드 / 나머지 없음 |
| 운영자 guide vs business/public guide 혼입 | KPA 링크는 **운영자 전용 가이드**(`/guide/for/operator`)로 적절 분리 |
| dead route 여부 | ❌ 없음 — `/guide/for/operator` 는 KPA App.tsx:624 에 **live** route |
| guide card 공통 slot 필요성 | 검토 대상(§12 C) — KPA 패턴을 옵션 slot 으로 공통화 가능 |
| 도움말 배치 | 현재 대시보드 인라인(KPA). sidebar/footer 분리 여부는 정책 결정 필요 |

→ **dead route / guide 혼입 위험은 없음.** guide 는 KPA 만 노출하며 운영자 전용으로 올바르게 분리됨. 공통화는 "필요시 옵션" 수준.

---

## 12. 공통 슬롯화 가능성 분류

| 부가 섹션 | 분류 | 근거 |
|-----------|:---:|------|
| 5-block layout | **A** | 이미 `OperatorDashboardLayout` 공통 |
| AxisNavigationSection (컴포넌트) | **A** | 이미 `@o4o/operator-core-ui` 공통. 단 **호출은 서비스별**(layout slot 아님) |
| Axis metrics vs links-only | **C** | 공통 컴포넌트가 `metrics?` optional 지원. GP/KCos metrics 확장은 컴포넌트 주석에 "향후 WO" 명시 |
| Page header (h1+새로고침) | **B** | GP 만 인라인. 4서비스 정책 통일(전부/전무/공통 header 컴포넌트) — 즉시 가능 |
| Alert (GP OperatorAlerts) | **C+F** | 표시 컴포넌트는 공통 slot 화 가능(C). 단 데이터(`operatorAlerts`)는 GP backend 만 반환 → 타서비스 확산은 backend contract 필요(F) |
| Notice (KCos orderMetricsReady) | **B** | frontend meta(`orderMetricsReady`) 기반 inline. 공통 alert/notice slot 으로 흡수 가능(데이터는 이미 frontend) |
| GuideCard (KPA 철학) | **C/D** | 옵션 `guideSlot` 공통화 가능(C). copy 는 서비스별 고유(D) |
| Neture axis 부재 | **B** | axis 컴포넌트는 공통 — Neture 에 axes 배열만 정의하면 됨(frontend, 저위험) |
| KPI/quickAction 밀도 | **D** | backend config builder 기반 도메인 데이터 차이 |
| Neture supplier/partner workspace 진입 | **G** | operator dashboard 밖 별도 영역 — 본 축에서 제외 |
| dead route / guide 혼입 | **E 해당 없음** | 위험 0 (KPA guide live) |

**핵심 구조 제안(C):** `OperatorDashboardLayout`/`OperatorDashboardConfig` 에 **5-block "위" 영역을 위한 표준 slot** 을 도입.
후보 이름(기존 관례 정렬):
- `aboveBlocks` / `dashboardAuxSections` (header·guide·axis·alert 를 일관 위치로)
- 또는 세분: `headerSlot` · `guideSlot` · `alertSlot`(alert+notice 통합) · `axisSlot`

현재 layout 은 above-block 영역 자체가 없어, slot 도입이 표준화의 단일 지렛대.

---

## 13. 서비스 고유로 유지할 항목

| 항목 | 유지 이유 |
|------|-----------|
| Axis **콘텐츠**(축 제목/링크/아이콘) | 도메인별 운영 흐름 차이 (커뮤니티/약국 HUB/매장 HUB/콘텐츠) |
| GuideCard **copy** | 서비스별 철학/온보딩 문구 |
| KPI/quickAction **항목·수치** | backend 도메인 데이터 |
| KPA axis **metrics** | KPA 운영 흐름 특성(실시간 대기 수치) — 단 형태는 공통 |
| Neture supplier/partner workspace | 별도 영역 (operator dashboard 와 분리 유지) |

→ "**위치·형태는 통일, 콘텐츠는 서비스 고유**" 원칙.

---

## 14. 즉시 WO 가능한 후보 (frontend-only, 저위험)

1. **Header 정책 통일** — 4서비스 header 유무 일치(권장: 공통 `OperatorDashboardHeader` 또는 전부 제거). GP 단독 header 편차 해소.
2. **Neture AxisNavigation 추가** — 공통 컴포넌트에 Neture axes 배열만 정의(예: 공급 운영 / 매장·콘텐츠). store 중심 3서비스와 시각 격차 해소. frontend, route 무변경.
3. **KCos notice → 공통 alert/notice slot 위치 정렬** — inline amber 를 표준 위치/스타일로(데이터 이미 frontend).

> 1~3 은 backend/API/DB/route/menu 무변경. 부가 섹션 **위치·형태 통일** 범위.

---

## 15. 공통 layout 옵션 확장 필요 후보 (C)

- `OperatorDashboardLayout` 에 above-block slot 도입(`aboveBlocks`/`headerSlot`/`guideSlot`/`alertSlot`/`axisSlot`).
- `OperatorAlerts`(GP)를 공통 컴포넌트로 승격 → KCos notice 도 동일 컴포넌트로 표현.
- AxisNavigation metrics 확장(GP/KCos links-only → optional metrics).
- **주의:** layout 은 F1(Operator OS) Freeze 대상. slot 추가는 **additive(하위호환)** 라도 **명시적 WO 필요**(CLAUDE.md §14 "구조 변경은 명시적 WO").

---

## 16. 추가 IR 필요 후보 (F)

- **Backend dashboard 응답 contract 정렬** — `operatorAlerts`/`notice` 를 4서비스 dashboard endpoint 공통 필드로 표준화할지. 현재 GP 만 `data.operatorAlerts` 반환. 공통 alert slot 을 data-driven 으로 채우려면 backend IR 필요.
  - 후보: `IR-O4O-OPERATOR-DASHBOARD-ALERT-CONTRACT-UNIFICATION-V1`

---

## 17. 우선순위 제안

| 순위 | 작업 | 분류 | 위험 | 비고 |
|:---:|------|:---:|:---:|------|
| **P1** | Header 정책 통일 + Neture axis 추가 + KCos notice 위치 정렬 | B | 낮음 | frontend-only, backend 무변경 |
| **P2** | `OperatorDashboardLayout` above-block slot 도입(WO) + GuideCard/Alert 공통 slot 화 | C | 중 | F1 Freeze → 명시적 WO, additive |
| **P3** | Alert/notice backend contract 정렬 | F | 중 | 별도 backend IR 선행 |
| 제외 | Neture supplier workspace 를 operator dashboard 에 편입 | G | — | 영역 분리 유지 |

권장 첫 WO: **P1 (Header 통일 + Neture axis + KCos notice 정렬)** — 가장 안전하고 체감 차이를 즉시 줄임. 이후 P2 에서 slot 구조로 항구화.

---

## 18. Current Structure vs O4O Philosophy Conflict Check

| 확인 | 결과 |
|------|------|
| 대시보드가 "현재 상태 + 다음 작업" 중심인가 | ⚠ 부분 — 5-block(KPI/Action/AI)은 상태·작업 중심. 단 **KPA 는 철학 GuideCard 가 최상단**이라 "다음 작업"보다 설명이 먼저 노출(드리프트 소지) |
| 설명/가이드/철학 카드가 운영 판단을 방해하는가 | ⚠ KPA GuideCard 가 최상단 대형 → axis/action 보다 위. 위치 재고 여지 |
| 서비스 차이가 도메인 차이인가 구현 편차인가 | **구현 편차 우세** — layout·5-block 동일, 차이는 부가 섹션 비표준 조합(header/alert/axis 유무) |
| 공통화가 1인 개발 유지보수성을 높이는가 | ✅ alert 2중 패턴(GP component vs KCos inline) 통합 + above-block slot 표준화로 유지보수성 향상 |
| operator/admin/supplier/store hub/my store 혼입 | ✅ 본 조사 범위는 operator dashboard 한정. Neture supplier workspace 는 별도 영역으로 분리 유지(혼입 없음) |
| guide/business/public guide 가 operator dashboard 에 과도 혼입 | ✅ KPA guide link 는 `/guide/for/operator`(운영자 전용, live)로 적절 분리. business/public guide 혼입 없음 |

**철학 정합 판정:** 구조적 충돌 없음. 단 **KPA GuideCard 의 최상단 배치**는 §11 "철학/설명을 과도하게 전면 노출하지 않는다" 원칙과 약한 긴장 — P1/P2 에서 위치(예: axis/action 아래) 재배치 권고. 나머지는 도메인 차이로 정당.

---

## 부록: 부가 섹션 인벤토리 매트릭스

| 섹션 | KPA | GP | KCos | Neture | 공통 컴포넌트 | 분류 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Page header (h1+refresh) | — | ✅ inline | — | — | 없음 | B |
| Guide/철학 카드 | ✅ inline static | — | — | — | 없음(KPA local) | C/D |
| AxisNavigation | ✅ +metrics | ✅ links | ✅ links | — | ✅ operator-core-ui | A(호출)/C(metrics) |
| Alert (data) | — | ✅ OperatorAlerts | — | — | GP local | C+F |
| Notice (conditional) | — | — | ✅ inline amber | — | 없음 | B |
| 5-block layout | ✅ | ✅ | ✅ | ✅ | ✅ operator-ux-core | A |

---

*Generated: 2026-06-11 · read-only IR · 코드 무변경 · 조사 기준 commit `6a4884d9c`*
