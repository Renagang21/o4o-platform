# CHECK-O4O-STORE-HOME-GLYCOPHARM-REFERENCE-STABILIZATION-V1

> **작업명:** WO-O4O-STORE-HOME-GLYCOPHARM-REFERENCE-STABILIZATION-V1
> **유형:** GlycoPharm `/store` 홈을 3서비스 canonical reference 후보로 선안정화. **공통 셸 생성 아님** — 현재 구조를 정리·검증·문서화하여 후속 `StoreHomeShell` 추출의 기준점을 고정.
> **결과: PASS — GlycoPharm 홈 구조·데이터 흐름을 reference 관점에서 정리. store-ui-core/hub-core/backend/API/DB/package/route 변경 0, GlycoPharm 코드 변경 0 (현 구조가 이미 reference로 적합). web-glycopharm typecheck PASS. 후속 StoreHomeShell props/slot 후보 문서화.**
> 선행: IR-O4O-STORE-HOME-CROSSSERVICE-AUDIT-V1 (canonical 후보=GlycoPharm)
>
> *Date: 2026-06-17*

---

## 0. 요약

- GlycoPharm `/store` 홈은 이미 **HubLayout(@o4o/hub-core) + signal 어댑터(buildGlycoSignals) + computeStoreInsights(@o4o/store-ui-core)** 의 깔끔한 분리 구조를 갖춰, **코드 변경 없이 그대로 canonical reference 로 사용 가능**하다.
- 본 WO는 **GlycoPharm 코드 0 변경**으로 진행했다. (불필요한 중복/데드 import/naming 혼선 부재 — 정리할 service-local 대상이 없었음. 발견된 잠재 불일치 1건은 §7-B 에 문서화하고 의도적으로 미변경.)
- 후속 `StoreHomeShell` 추출에 필요한 **props/slot 후보**와 **K-Cosmetics 다중매장 / KPA 온보딩 확장점**을 도출했다.

---

## 1. 현재 GlycoPharm 홈 구조 요약

**Route → Component:** `/store` (index) → `StoreOverviewPage` ([App.tsx:977-978](services/web-glycopharm/src/App.tsx#L977))
**파일:** [StoreOverviewPage.tsx](services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx) · [hooks/useStoreHub.ts](services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts)

```
StoreDashboardLayout (Outlet, @o4o/store-ui-core)   ← 3서비스 공통 셸 (변경 대상 아님)
 └─ StoreOverviewPage
      ├─ useStoreHub()                                ← 데이터/signal/role/action 훅
      └─ <HubLayout> (@o4o/hub-core)                  ← 본문 렌더
           ├─ beforeSections:
           │    ├─ 새로고침 버튼
           │    ├─ 주문/매출 준비중 배너 (!orderMetricsReady)
           │    ├─ AI 운영 요약 (AiSummaryCard / loading / error / empty)
           │    └─ 경영 인사이트 (InsightBlock ← computeStoreInsights)
           ├─ sections: HUB_SECTIONS (매출/매장 4카드 + 관리자전용 2카드)
           └─ footerNote
```

**역할 분리(reference 의 핵심 가치):**
| 책임 | 위치 | 비고 |
|------|------|------|
| 데이터 fetch (서비스 고유 API) | `useStoreHub.fetchData` | `/glycopharm/pharmacy/cockpit/*` + products |
| 서비스 API → 공통 signal 변환 | `buildGlycoSignals` | **adapter 경계** |
| rule 인사이트 | `computeStoreInsights` (공통 패키지) | 입력만 서비스가 구성 |
| 본문 렌더 | `HubLayout` (공통 패키지) | sections + signals + slots |
| 서비스 고유 UI(배너/AI카드) | `beforeSections` slot | 페이지 로컬 |

→ **fetch·adapter 는 서비스 로컬, 렌더·엔진은 공통 패키지.** 이미 후속 셸 추출에 이상적인 경계 구조다.

---

## 2. HubLayout 사용 방식

`HubLayoutProps` ([packages/hub-core/src/components/HubLayout.tsx:39-49](packages/hub-core/src/components/HubLayout.tsx#L39)) 주입 현황:

| prop | GlycoPharm 주입값 | 출처 |
|------|------------------|------|
| `title` | `glycopharmConfig.uiText.storeHomeTitle` | operator-ux-core SSOT |
| `subtitle` | `glycopharmConfig.uiText.storeHomeSubtitle` | operator-ux-core SSOT |
| `sections` | `HUB_SECTIONS` (정적 정의) | 페이지 로컬 |
| `userRoles` | `useStoreHub().userRoles` (`user.roles`) | AuthContext |
| `signals` | `useStoreHub().signals` (= buildGlycoSignals) | adapter |
| `onCardClick` | `navigate(href)` | react-router |
| `onActionTrigger` | `handleActionTrigger` | 훅 |
| `beforeSections` | 새로고침/배너/AI요약/인사이트 JSX | 페이지 로컬 slot |
| `afterSections` | (미사용) | — |
| `footerNote` | 안내 문구 | 페이지 로컬 |

- `sections` 의 카드는 `signalKey` 로 signals 와 연결(예: `glycopharm.revenue`). 카드+signal 분리가 adapter 경계를 깔끔히 유지.
- 역할 필터: `HubLayout` 내부 `filterSectionsByRole(sections, userRoles)` — 관리자전용 섹션은 `roles: ['glycopharm:operator','glycopharm:admin']`.

---

## 3. buildGlycoSignals 입력/출력 shape

**입력:** `CockpitData` ([useStoreHub.ts:41-65](services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts#L41))
```ts
CockpitData = {
  aiSummary: AiSummaryData | null;
  todayActions: { todayOrders; pendingOrders; pendingReceiveOrders;
                  pendingRequests; operatorNotices; applicationAlerts } | null;
  signageStats: { enabled: boolean; activeContents: number } | null;
  productStats: { total: number } | null;
  orderMetricsReady: boolean;   // meta.featureStatus !== 'not_ready'
}
```
**출력:** `Record<string, HubSignal>` — 키 = 카드 `signalKey`:
| signalKey | 의미 | level 규칙 |
|-----------|------|-----------|
| `glycopharm.revenue` | 매출/오늘 주문 | not_ready→info '준비 중' / 주문>0→info count |
| `glycopharm.pending_requests` | 미처리 요청 | not_ready→info '준비 중' / >10→warning, 그외 info + action '처리하기' |
| `glycopharm.pharmacy_approval` | 약국 심사 | alerts>0→warning count / 그외 info '정상' |
| `glycopharm.signage` | 사이니지 | 미사용→info / 편성0→warning / 운영중→info count |
| `glycopharm.products` | 상품 | 0→warning '미등록' / 그외 info count |
| `glycopharm.ai_summary` | AI 위험도 | createActionSignal — **단, 소비 카드 없음 (§7-B)** |

**핵심 패턴:** `createSignal(level, {label,count})` / `createActionSignal(level, {label,count,action,pulse})` (hub-core). `orderMetricsReady=false` 시 **거짓 0 대신 '준비 중'** 명시 — fallback 안정성의 reference 패턴.

---

## 4. computeStoreInsights 사용 방식

**시그니처:** `computeStoreInsights(input: StoreInsightInput): StoreInsight[]` ([storeInsightEngine.ts:25-37](packages/store-ui-core/src/engine/storeInsightEngine.ts#L25)) — 최대 3개, critical>warning>info.

**입력 매핑** ([StoreOverviewPage.tsx:211-225](services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx#L211)):
```ts
computeStoreInsights({
  monthlyRevenue: 0,                                   // API 미연결 — Phase 2+
  totalOrders: cockpitData.todayActions?.todayOrders ?? 0,
  inProgressOrders: pendingOrders + pendingReceiveOrders,
  activeChannels: signageStats?.enabled ? 1 : 0,
  totalChannels: signageStats ? 1 : 0,
  visibleProducts: productStats?.total ?? 0,
})
```
- 엔진은 **공통 패키지**, 입력 구성만 서비스 로컬. `StoreInsight` 는 `{level, code, message, recommendation?, action?{label,target}}`.
- `InsightBlock` (페이지 로컬)이 렌더 + `action.target` 으로 navigate.
- **주의:** `monthlyRevenue:0` 하드코딩 → 엔진의 매출 rule(`monthlyRevenue===0`)이 항상 발동. 의도된 Phase 2+ 미연결 상태(코드 주석 명시). 셸 추출 시 입력 매핑은 서비스 adapter 책임으로 유지.

---

## 5. 향후 StoreHomeShell props 후보

후속 `WO-O4O-STORE-HOME-CANONICAL-SHELL-V1` (store-ui-core, **F3 freeze→WO 승인 필수**) 에서 추출할 셸의 인터페이스 후보. GlycoPharm 현 구조를 일반화:

```ts
interface StoreHomeShellProps {
  // 헤더 (서비스 SSOT 문구 주입)
  title: string;
  subtitle?: string;

  // 본문 (공통 HubLayout 위임 — 이미 존재)
  sections: HubSectionDefinition[];
  signals: Record<string, HubSignal>;     // ← 서비스 adapter 산출 (buildXxxSignals)
  userRoles: string[];
  onCardClick: (href: string) => void;
  onActionTrigger?: (key, payload) => Promise<HubActionResult>;

  // 공통 인사이트 (엔진은 공통, 입력은 서비스)
  insights?: StoreInsight[];              // = computeStoreInsights(serviceInput)
  aiSummary?: AiSummaryRenderData | null; // AI 요약 슬롯 (서비스 옵션)

  // 상태
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;

  // 확장 슬롯 (§6, §7)
  storeSelector?: React.ReactNode;        // K-Cosmetics 다중 매장
  banner?: React.ReactNode;               // GlycoPharm 주문 준비중 등 서비스 배너
  onboarding?: React.ReactNode;           // KPA 실행흐름(빈 상태/초기 사용자)
  footerNote?: string;
}
```

**서비스별 페이지(얇게 유지):** `useXxxStoreHome()` 어댑터(fetch + buildSignals + insight input) → `<StoreHomeShell {...} />`.

**경계 원칙(IR 정합):** fetch·signal/insight 입력 매핑 = 서비스 로컬(adapter). 셸·HubLayout·insight 엔진 = 공통 패키지.

---

## 6. K-Cosmetics 다중 매장 슬롯 반영 시 필요한 확장점

K-Cosmetics 홈(`StoreCockpitPage`)은 GlycoPharm 에 없는 **다중 매장 선택**을 보유 (`getMyStores()` → select → storeId 별 재조회).

| 확장점 | 내용 |
|--------|------|
| `storeSelector` 슬롯 | 매장 select UI 주입 위치 (단일 매장이면 비표시) |
| `activeStoreId` + `onStoreChange` | 셸이 storeId 변경 콜백을 어댑터로 전달 → adapter 가 storeId 별 재fetch |
| empty state | "등록된 매장이 없습니다 / 매장 신청하기" 도 슬롯(또는 onboarding) 으로 흡수 |
| 매장 메타 헤더 | 매장명/상태배지/역할/멤버수 — title 영역 확장 또는 별도 `storeHeader` 슬롯 |

→ GlycoPharm 단일매장 가정만으로는 부족. 셸 설계 시 **storeId 스코프를 adapter 입력으로 일반화** 필요.

## 7. KPA 온보딩 슬롯 반영 시 필요한 확장점

### 7-A. KPA 실행흐름 → onboarding 슬롯
KPA 홈(`StoreHomePage`)의 고유 요소 "실행 흐름 3단계"(상품선택→자료제작→매장적용)는 운영 상태판 본문이 아니라 **초기 사용자 안내**.

| 확장점 | 내용 |
|--------|------|
| `onboarding` 슬롯 | 실행흐름 카드 주입 위치 |
| 노출 조건 | 빈 상태(자료 0/진열 0/주문 0) 또는 초기 사용자 한정 — 운영 데이터 충분 시 숨김 |
| 콘텐츠 소유 | 카드 콘텐츠는 KPA 로컬(약국 용어), 슬롯만 공통 |

### 7-B. 발견된 잠재 불일치 (본 WO 미변경 — 문서화)
`buildGlycoSignals` 는 `glycopharm.ai_summary` signal 에 action(`glycopharm.trigger.refresh_ai`, '재분석')을 부착하지만:
1. `HUB_SECTIONS` 에 `signalKey: 'glycopharm.ai_summary'` 카드가 **없음** → 이 signal/action 은 **렌더되지 않음(dead)**.
2. `executeAction` 도 `glycopharm.trigger.refresh_ai` 를 미처리 → 호출 시 `{success:false}`.

→ 현재 **사용자 영향 없음**(렌더 경로 부재). 단 셸 추출 시 **action 레지스트리·signal-card 연결의 완결성**을 위해 정리 대상. 본 WO 는 reference 고정 범위이므로 **behavior 변경 없이 문서화만** (검증 불가한 변경 회피). 후속 adopt WO 에서 (a) 카드 추가 또는 (b) dead signal/action 제거 중 택1.

---

## 8. 이번 WO에서 변경하지 않은 것

- ✅ `store-ui-core` 변경 0 (F3 freeze 준수 — 신규 공통 셸 미추가)
- ✅ `hub-core` 변경 0
- ✅ KPA / K-Cosmetics 변경 0
- ✅ backend / API / DB / migration 변경 0
- ✅ package.json / lock 변경 0
- ✅ route 변경 0
- ✅ **GlycoPharm service-local 코드 변경 0** — 현 구조가 이미 reference 적합, 정리할 중복/데드 import/naming 혼선 부재. §7-B 잠재 불일치도 의도적 미변경.
- ✅ 화면 copy/paste 0

---

## 9. 검증 결과

| 항목 | 결과 |
|------|------|
| web-glycopharm typecheck (`tsc -b --noEmit`) | **PASS (exit 0)** |
| 코드 변경 | 0 — 렌더/데이터 흐름 baseline 동일 (회귀 없음) |
| 정적 분석 | HubLayout props/signal/insight 경계 정합 확인, 데드 import 0 |
| browser smoke | 미수행 — 코드 변경 0 이므로 기존 동작과 동일(별도 배포 불요). 후속 adopt WO 에서 셸 적용 시 smoke 권장 |
| F3 freeze 준수 | store-ui-core 무변경 확인 |

---

## 10. 완료 판정

**PASS.** GlycoPharm `/store` 홈의 구조·데이터 흐름(HubLayout 위임 / buildGlycoSignals adapter / computeStoreInsights 엔진)을 canonical reference 관점에서 정리하고, 후속 `StoreHomeShell` props/slot 후보(§5)와 K-Cosmetics 다중매장(§6)·KPA 온보딩(§7) 확장점을 도출. store-ui-core/hub-core/backend/API/DB/package/route 및 GlycoPharm 코드 변경 0, web-glycopharm typecheck PASS.

## 11. 후속

1. **`WO-O4O-STORE-HOME-CANONICAL-SHELL-V1`** — store-ui-core 에 `StoreHomeShell` 추출 (**F3 freeze → 명시적 WO 승인 필수**). §5 props + §6/§7 슬롯 반영.
2. **`WO-O4O-STORE-HOME-GLYCOPHARM-ADOPT-V1`** — GlycoPharm 을 셸로 이행(reference 검증). §7-B dead signal/action 정리 동반.
3. **`WO-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1`** — 다중매장 슬롯 포함.
4. **`WO-O4O-STORE-HOME-KPA-ADOPT-V1`** — 실행흐름 → onboarding 슬롯 강등.

---

*Date: 2026-06-17 · GlycoPharm store home reference 선안정화 · PASS · HubLayout+buildGlycoSignals+computeStoreInsights 경계 정리 · StoreHomeShell props/slot 후보 도출(다중매장·온보딩 확장점 포함) · store-ui-core/hub-core/backend/GlycoPharm 코드 변경 0 · web-glycopharm typecheck PASS · §7-B dead ai_summary signal/action 문서화(미변경) · 후속 CANONICAL-SHELL → 3서비스 adopt.*
