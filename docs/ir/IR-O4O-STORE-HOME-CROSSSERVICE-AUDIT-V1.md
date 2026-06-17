# IR-O4O-STORE-HOME-CROSSSERVICE-AUDIT-V1

> **유형:** read-only 교차 서비스 조사 (코드 무수정)
> **목적:** KPA-Society / GlycoPharm / K-Cosmetics 3서비스의 "내 약국·내 매장 홈"(`/store` 진입 대시보드)을 전수 조사하여, GlycoPharm 홈을 canonical 후보로 삼을 수 있는지 검토하고 공통 홈 정비·공통화 방향과 후속 WO 범위를 확정한다.
> **판정: PASS** — 3서비스 `/store` 홈의 route/component/layout/API/블록 구성과 데이터 의존성을 실제 코드 근거로 정리. 핵심 발견: **공통 셸(`StoreDashboardLayout`)은 이미 3서비스 공유**, 차이는 **홈 본문 구성 + API 네임스페이스**뿐. canonical 후보·후속 WO 범위 도출.
> 선행 합의: GlycoPharm 홈 = 운영 상태판 지향. 단 즉시 copy/paste 금지, 조사 후 canonical 확정.
>
> *Date: 2026-06-17*

---

## 0. 요약 (먼저 읽기)

1. **3서비스 모두 이미 `StoreDashboardLayout`(@o4o/store-ui-core) + `StoreSidebar` + `resolveStoreMenu` 공통 셸을 공유**한다. "내 약국/매장 홈"의 헤더·사이드바·푸터·메뉴 골격은 **이미 공통화 완료** 상태다.
2. **공통화가 남은 부분은 홈 "본문"(대시보드 카드/지표/인사이트 영역) 하나뿐**이다. 여기서만 3서비스가 서로 다른 bespoke 구성을 갖는다.
3. 사용자 초기 가설 중 일부 정정:
   - GlycoPharm = 운영 상태판 ✅ (가설 일치) — **plus, 3서비스 중 유일하게 공통 `hub-core` HubLayout + `store-ui-core` 인사이트 엔진을 사용**.
   - KPA = "실행 흐름/온보딩" 성격 ✅ (대체로 일치) — 단 KPI·Live Signals·최근활동도 실제 API로 보유. 순수 온보딩 화면은 아님.
   - K-Cosmetics = "미완성" ❌ (가설과 다름) — **이미 90%+ 완성된 5-block 운영 대시보드**(주문/매출/상품/사이니지/AI 인사이트 + 다중 매장 선택). 미완성이 아니라 **bespoke 구성**이 문제.
4. **API 네임스페이스가 3서비스 모두 다르다** (cockpit / pharmacy-analytics / cosmetics-stores). → 공통화는 **service별 signal adapter** 로 frontend-only 수렴 가능. **backend 변경 없이 V1 가능**.
5. **회귀 위험 주의:** `store-ui-core` 는 **F3 Store Layer Freeze** 대상. 새 공통 홈 셸 컴포넌트를 store-ui-core 에 추가하는 것은 **구조 변경 → 명시적 WO 필수**.

---

## 1. 3서비스 현재 구조 요약

| 서비스 | 홈 Route | 홈 Component | Layout 셸 | 본문 렌더 방식 |
|------|---------|-------------|----------|--------------|
| **KPA-Society** | `/store` (index) | `pages/pharmacy/StoreHomePage.tsx` | `StoreDashboardLayout` + `KpaStoreLayoutWrapper` | **bespoke 카드** (직접 JSX) |
| **GlycoPharm** | `/store` (index) | `pages/store/StoreOverviewPage.tsx` | `StoreDashboardLayout` + `StoreLayoutWrapper` + `GlycoGlobalHeader` | **hub-core `HubLayout`** + signal 어댑터 + `computeStoreInsights` |
| **K-Cosmetics** | `/store` (index) | `pages/operator/StoreCockpitPage.tsx` | `StoreDashboardLayout` + `StoreLayoutWrapper` + `KCosGlobalHeader` | **bespoke 5-block** (직접 JSX) |

**근거 인용:**
- KPA route: [App.tsx:919-921](services/web-kpa-society/src/App.tsx#L919) · component: [StoreHomePage.tsx:51](services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx#L51)
- GlycoPharm route: [App.tsx:977-978](services/web-glycopharm/src/App.tsx#L977) · component: [StoreOverviewPage.tsx](services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx) · hook: [useStoreHub.ts:189-232](services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts#L189)
- K-Cosmetics route: [App.tsx:769-776](services/web-k-cosmetics/src/App.tsx#L769) · component: [StoreCockpitPage.tsx](services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx)

**공통 셸 (3서비스 동일):** `StoreDashboardLayout` — [packages/store-ui-core/src/layout/StoreDashboardLayout.tsx](packages/store-ui-core/src/layout/StoreDashboardLayout.tsx) · `StoreSidebar` · `resolveStoreMenu` · `StoreFacingFooter`(@o4o/shared-space-ui).

---

## 2. 화면 구성 비교표

| 블록 | KPA `StoreHomePage` | GlycoPharm `StoreOverviewPage` | K-Cosmetics `StoreCockpitPage` |
|------|--------------------|------------------------------|-------------------------------|
| **헤더/상태** | 제목+새로고침 | 새로고침 + 주문데이터 준비 배너 | 매장명·상태배지·역할·멤버수 + 다중매장 선택 |
| **경고/Live Signal** | Live Signals 배너(신규주문/상담/판매요청) | (signal 카드에 통합) | (없음) |
| **KPI 카드** | 4칸: 자료실 파일 / 활성 QR / 진열 상품 / 주간 스캔 | signal 카드: 매출 / 미처리요청 / 상품 / 사이니지 | 4칸: 오늘 주문 / 이번달 매출 / 채널비율 / 등록 상품 |
| **AI/인사이트** | (없음) | AI 운영 요약 카드 + 경영 인사이트(rule engine, 최대 3) | AI 인사이트 블록(level별) |
| **빠른 이동/실행** | **실행 흐름 3단계**(상품선택→자료제작→매장적용) | HubLayout 섹션 카드(매출/상품/사이니지 + 관리자전용) | (KPI/상품 카드 내 링크) |
| **상품 현황** | 진열 상품 카운트(KPI) | 상품 관리 카드 | 인기/최근 등록 상품 리스트(최대 5) |
| **사이니지/콘텐츠** | (실행흐름 step3 링크) | 사이니지 signal 카드 | 플레이리스트 목록 + 자동편성 CTA |
| **최근 활동** | 최근 QR 스캔 6건 + 홍보 성과 TOP3 | (insight/signal 로 대체) | 최근 주문 테이블(조건부) |

**관찰:**
- **공통 골격은 사실상 동일**: 상태헤더 → KPI → 인사이트 → 빠른이동/현황 → 최근활동. 세 화면 모두 이 5영역 중 일부를 갖는다.
- **GlycoPharm**만 "인사이트(AI + rule engine)"와 "signal 기반 카드"를 둘 다 갖춘 **가장 완전한 운영 상태판**.
- **KPA**의 "실행 흐름 3단계"는 다른 두 서비스에 없는 고유 요소 → **온보딩/안내 성격**. 운영 상태판에는 약함.
- **K-Cosmetics**는 "다중 매장 선택"이 고유 → 매장 owner가 여러 매장을 운영하는 도메인 특성. canonical 셸이 흡수해야 할 요건.

---

## 3. API / Data Dependency 비교표

| 영역 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|------------|-------------|
| **네임스페이스** | `/pharmacy/*`, `/store/*`, `/store-hub/*` | `/glycopharm/pharmacy/cockpit/*` | `/cosmetics/stores/*` |
| **매장 식별** | `GET /pharmacy/info` (slug) | (가드/회원에서) | `GET /cosmetics/stores/me` (다중) |
| **KPI/요약** | `GET /pharmacy/analytics/marketing` | `GET .../cockpit/today-actions` (orderMetricsReady) | `GET /cosmetics/stores/{id}/summary` |
| **상품** | `GET /pharmacy/products/listings` | `GET /glycopharm/pharmacy/products?pageSize=1` | `GET /cosmetics/stores/{id}/listings?limit=5` |
| **미처리/Live** | `GET /store-hub/live-signals` | `GET .../cockpit/today-actions` | (summary.recentOrders) |
| **사이니지** | (자료실 카운트로 간접) | `GET .../cockpit/franchise-services` | `GET /cosmetics/stores/{id}/playlists` |
| **AI/인사이트** | (없음) | `GET .../cockpit/ai-summary` + local `computeStoreInsights` | `GET /cosmetics/stores/{id}/insights` |
| **최근 활동** | `GET /pharmacy/analytics/recent-scans` | (insight 대체) | (summary.recentOrders) |
| **Mock 사용** | 0 (catch→null fallback) | 0 (Promise.allSettled 부분허용) | 0 (실패→empty state) |

**근거:** KPA [storeAnalytics.ts:27-46](services/web-kpa-society/src/api/storeAnalytics.ts#L27), [storeHub.ts:142-147](services/web-kpa-society/src/api/storeHub.ts#L142) · GlycoPharm [useStoreHub.ts:189-232](services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts#L189) · K-Cosmetics [storeApi.ts:113-234](services/web-k-cosmetics/src/services/storeApi.ts#L113).

**핵심:** 3서비스 모두 **실제 API**(mock 0). 그러나 **endpoint 네임스페이스·응답 shape가 전부 다르다**. → 공통 본문 컴포넌트는 **서비스별 adapter** 가 자기 API 응답을 **공통 signal/KPI shape** 로 변환해 주입하는 방식이라야 한다. GlycoPharm이 이미 `buildGlycoSignals`(useStoreHub.ts:69-153)로 이 패턴을 구현 중 — **공통화의 reference 패턴**.

---

## 4. 공통화 가능 영역

| 영역 | 현황 | 공통화 판단 |
|------|------|------------|
| Layout 셸(header/sidebar/footer/menu) | **이미 공통** (`StoreDashboardLayout`) | ✅ 추가작업 불필요 |
| 인사이트 rule engine | `store-ui-core` `computeStoreInsights` 존재, **Glyco만 사용** | ✅ KPA/KCos 도 채택 가능 (이미 패키지에 있음) |
| signal/HubLayout 카드 | `hub-core` `HubLayout`+`createSignal`, **Glyco만 사용** | ✅ 공통 본문 셸의 기반 후보 |
| KPI 카드 그리드 | 3서비스 각자 bespoke | ✅ 공통 `SummaryMetricCards` 추출 가능 |
| 최근 활동 패널 | KPA(스캔)/KCos(주문) bespoke | ✅ 공통 `RecentActivityPanel`(항목 어댑터) |
| AI 요약 카드 | Glyco/KCos 보유, KPA 없음 | △ 공통 슬롯 + 서비스 옵션 |
| 데이터 fetch | 서비스별 API 상이 | ❌ 공통화 불가 — **adapter 로 분리 유지** |

**공통화 가능한 본문 컴포넌트(후보):**
```
shared StoreHomeShell (본문)
  ├─ SummaryMetricCards     (signal/KPI shape 주입)
  ├─ OperationInsightPanel  (computeStoreInsights 재사용 + AI 요약 슬롯)
  ├─ QuickActionCards       (메뉴/링크 주입)
  ├─ RecentActivityPanel    (활동 항목 어댑터)
  └─ OptionalOnboardingFlow (KPA 실행흐름 → 빈 상태/온보딩으로 강등)
```

---

## 5. 서비스별로 남겨야 할 영역 (공통화 X)

| 서비스 | 유지 항목 | 이유 |
|------|---------|------|
| 공통 | 데이터 fetch hook (`useStoreHub` 류) | API 네임스페이스·응답 shape 상이 |
| KPA | `/pharmacy/analytics/*` 어댑터, 용어(약국/약국 자료) | 도메인 API·용어 |
| KPA | 실행 흐름 3단계 콘텐츠 | onboarding 슬롯으로 강등하되 콘텐츠는 KPA 고유 |
| GlycoPharm | `cockpit/*` 어댑터, orderMetricsReady 배너 | 주문 feature gate 도메인 로직 |
| K-Cosmetics | **다중 매장 선택 UI/state**, `cosmetics/stores/*` 어댑터 | 다중 매장 owner 도메인 특성 — 공통 셸이 슬롯으로 흡수 필요 |
| K-Cosmetics | 매장 신청 empty state | 도메인 가입 흐름 |

---

## 6. Canonical 후보 평가: GlycoPharm 기준 채택 가능 여부

| 기준 | 평가 |
|------|------|
| 공통 패키지 정합성 | **최상** — 3서비스 중 유일하게 `hub-core HubLayout` + `store-ui-core computeStoreInsights` 공통 자산 사용. 공통화 시 신규 추출 최소. |
| 운영 상태판 완성도 | **높음** — 매출/주문/미처리/사이니지/상품 + AI 요약 + rule 인사이트 모두 보유. |
| signal adapter 패턴 | **이미 구현** (`buildGlycoSignals`) — 서비스별 API→공통 shape 변환 모델의 reference. |
| 다중 매장 지원 | **미보유** — K-Cosmetics 요건. canonical 셸 설계 시 **다중 매장 선택 슬롯을 추가 흡수**해야 함(Glyco 그대로는 부족). |
| 실행흐름/온보딩 | 미보유 — KPA 고유 요소를 **옵션 슬롯**으로 수용 필요. |

**결론:** **GlycoPharm의 "signal 기반 HubLayout + computeStoreInsights" 구조를 canonical 패턴으로 채택 가능.** 단 그대로 복사가 아니라, **(a) K-Cosmetics 다중 매장 선택, (b) KPA 온보딩 슬롯** 두 요건을 흡수한 **공통 셸**로 일반화해야 한다. 즉 canonical = "GlycoPharm 패턴 + 2개 슬롯 확장".

---

## 7. 추천 IA/UI 구조

```
[StoreDashboardLayout]  ← 이미 공통 (변경 없음)
  └─ StoreHomeShell (신규 공통 본문)
       ├─ StoreSelectorSlot      ← K-Cosmetics 다중매장 (단일매장은 비표시)
       ├─ SummaryMetricCards     ← service signal adapter 주입
       ├─ OperationInsightPanel  ← computeStoreInsights + AI 요약 슬롯
       ├─ QuickActionCards       ← service 메뉴 주입
       ├─ RecentActivityPanel    ← service 활동 어댑터 주입
       └─ OnboardingSlot         ← KPA 실행흐름(빈 상태/초기 사용자 한정)

서비스별 페이지 (얇게 유지):
  KPA  StoreHomePage  → useKpaStoreHome() 어댑터 + <StoreHomeShell .../>
  Glyco StoreOverviewPage → useStoreHub() + <StoreHomeShell .../>
  KCos StoreCockpitPage → useCosmeticsStore() + <StoreHomeShell .../>
```

**홈 = 운영 상태판 + 빠른 조치 + 최근 활동**, **기능 사용 방법 안내 = 온보딩/빈 상태 슬롯**으로 분리(사용자 합의 방향과 일치).

---

## 8. 후속 WO 제안

1. **`WO-O4O-STORE-HOME-CANONICAL-SHELL-V1`** (선결 / store-ui-core 구조 변경)
   - `store-ui-core` 에 `StoreHomeShell` + 하위 슬롯 컴포넌트 추출.
   - **F3 Store Layer Freeze 대상 → 명시적 WO 승인 필수** (§9 참조).
   - 공통 signal/KPI/activity shape(인터페이스) 정의. `computeStoreInsights` 재사용.
2. **`WO-O4O-STORE-HOME-GLYCOPHARM-ADOPT-V1`** — GlycoPharm을 신규 셸로 이행(reference, 회귀 위험 최소). canonical 검증.
3. **`WO-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1`** — 다중 매장 슬롯 포함 이행.
4. **`WO-O4O-STORE-HOME-KPA-ADOPT-V1`** — KPA 이행 + 실행흐름을 온보딩 슬롯으로 강등.
5. (조건부) **`IR-O4O-STORE-HOME-API-CONVERGENCE-V1`** — 3서비스 cockpit/analytics/summary API 응답 shape 의 backend 수렴 여부 검토(V1은 frontend adapter로 충분, backend 수렴은 별도 판단).

> 순서 원칙(메모리 `feedback_store_exec_service_neutral_design` 와 정합): **KPA 또는 GlycoPharm 1서비스 선안정화 → service-neutral 셸 확정 → 나머지 확장**. GlycoPharm이 공통 패키지 정합성이 가장 높아 reference 1순위.

---

## 9. 회귀 위험 및 검증 포인트

| 위험 | 내용 | 대응 |
|------|------|------|
| **F3 Freeze 위반** | `store-ui-core` 에 신규 셸 추가 = 구조 변경 | **명시적 WO 필수**. 버그수정·문서·테스트만으로 처리 금지. |
| Shared Module 다중 소비처 | `StoreDashboardLayout`/`store-ui-core` 는 KPA/Glyco/KCos 동시 소비 | CLAUDE.md §Shared Module Rule — 4서비스 영향 동시 검증. 단일 서비스 완료 판단 금지. |
| API shape 차이 흡수 실패 | adapter 누락 시 빈 카드/런타임 에러 | service별 adapter 단위 typecheck + 빈 상태 fallback 유지(현 3서비스 모두 mock 0, catch→null 유지). |
| 다중 매장 회귀 | K-Cosmetics 매장 선택 state 누락 시 단일 매장만 표시 | 셸이 selector 슬롯 + storeId 콜백 흡수 검증. |
| KPA 실행흐름 소실 | 온보딩 강등 시 초기 사용자 안내 누락 | 빈 상태/초기 사용자 조건에서 노출 보장. |
| 용어 회귀 | 약국↔매장 라벨 혼선 | service adapter 의 도메인 라벨(약국/매장, 약국 자료/매장 자료) 주입 검증. |

**검증 포인트(후속 WO 시):** 3서비스 typecheck 0 · 각 홈 browser smoke(KPI/인사이트/최근활동 렌더 + 빈 상태) · 사이드바/메뉴 무회귀 · 다중매장 전환 · PII/권한 무회귀.

---

## 10. 완료 판정

**PASS.** 3서비스 `/store` 홈의 route·component·layout·API·블록 구성·데이터 의존성을 실제 코드 근거(파일:라인)로 정리. 핵심 발견(공통 셸 이미 공유 / 본문만 분기 / API 네임스페이스 상이 / KCos 는 미완성 아님 / store-ui-core F3 freeze)을 확정하고, **canonical = GlycoPharm 패턴 + 다중매장·온보딩 슬롯 확장** 방향과 후속 WO 5건을 도출.

본 IR 범위 내 **코드/route/API/DB/package 변경 0** (read-only 준수).

---

*Date: 2026-06-17 · cross-service store home audit · PASS · 공통 셸(StoreDashboardLayout) 이미 공유, 차이는 본문 구성+API 네임스페이스 · canonical 후보=GlycoPharm(signal HubLayout + computeStoreInsights) + 다중매장/온보딩 슬롯 확장 · 후속: WO-STORE-HOME-CANONICAL-SHELL-V1(F3 freeze→WO 필수) → Glyco/KCos/KPA adopt · read-only, 코드 변경 0.*
