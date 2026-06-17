# CHECK-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1

> **작업명:** WO-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1
> **유형:** K-Cosmetics `/store` 홈을 canonical `StoreHomeShell` 2번째 소비처로 adopt. 다중 매장 selector → `storeSelectorSlot` 수렴. 기존 5-block 운영 대시보드 의미·순서 유지.
> **결과: PARTIAL — 코드 adopt + typecheck PASS. 다중 매장 selector 를 `storeSelectorSlot` 으로 이동, 5-block 의미·순서 보존, service-local fetch/storeId 스코프 유지. store-ui-core/hub-core/backend/API/DB/package/route·GlycoPharm·KPA 변경 0. web-k-cosmetics `tsc -b` exit 0. browser: `/store` 접근·레이아웃·빈 상태 무회귀 확인. 단 storeSelectorSlot 다중매장 런타임 동작은 사용 가능한 KCos 계정에 매장 0개라 미검증(계정 제약).**
> 선행: WO-O4O-STORE-HOME-CANONICAL-SHELL-V1 · SMOKE-...-GLYCOPHARM-...(PASS)
>
> *Date: 2026-06-17*

---

## 1. 변경 전 K-Cosmetics 홈 구조 요약

`/store` → `StoreCockpitPage` (`pages/operator/StoreCockpitPage.tsx`), bespoke 5-block(HubLayout 미사용):
1. **Block 1 Store Status Header** — 매장명/상태배지/코드/멤버/역할 + **다중 매장 `<select>`** + quick action(상품 관리/주문 관리)
2. **Block 2 KPI** — 오늘 주문 / 이번달 매출 / 채널 비율 / 등록 상품
3. **Block 3 상품 운영 현황** — 인기/최근 등록 상품
4. **Block 4 콘텐츠/사이니지** + **Block 5 AI 인사이트** (2-col grid)
5. **최근 주문** 테이블(조건부)

전(前): 다중 매장 selector 는 Block 1 우측에 quick action 과 함께 위치. 데이터 로드: `loadStores`(첫 매장 auto-select) + `handleStoreChange(storeId)`(매장별 재조회).

## 2. 변경 후 StoreHomeShell 적용 구조

```
<div className="space-y-6">
  <StoreHomeShell storeSelectorSlot={stores.length>1 ? <select/> : null} />   ← 신규(canonical 최상단)
  Block 1 Store Status Header (selector 제거, 매장 메타 + quick action 유지)
  Block 2 KPI
  Block 3 상품 운영 현황
  Block 4 콘텐츠/사이니지 + Block 5 AI 인사이트 (2-col, 제자리)
  최근 주문
</div>
```

- `StoreHomeShell` 은 canonical 최상단 영역만 담당. KCos 운영 블록(KPI/상품/사이니지/AI/최근주문)은 **그대로 sibling 으로 유지** → 의미·순서 보존.

## 3. storeSelectorSlot 적용 방식

- Block 1 의 `<select>`(다중 매장) 를 그대로 `StoreHomeShell.storeSelectorSlot` 으로 이동. `value=selectedStore.id`, `onChange=handleStoreChange`, 옵션=`stores`. `aria-label="매장 선택"` 추가.
- `stores.length > 1` 일 때만 slot 주입(단일 매장이면 `null` → 미표시, 기존 조건 동일).
- slot 콘텐츠를 `<div className="flex justify-end">` 로 감싸 기존 우측 정렬 유지.
- **셸은 select 를 "배치"만** 하고, 매장 식별/변경 로직(`handleStoreChange`)·API 는 service-local 유지 → 설계 원칙(셸이 API 미인지) 충족.

## 4. 다중 매장 전환 데이터 흐름 (정적)

- `handleStoreChange(storeId)`: `stores`에서 매장 찾음 → `setSelectedStore` → `Promise.all([getStoreSummary, getStoreListings, getStorePlaylists, getStoreInsights])` (선택 매장 id 기준) → summary/listings/playlists/insights 갱신.
- **storeId 스코프 = service-local 그대로 유지.** selector 위치만 셸 슬롯으로 이동, 콜백/스코프 로직 무변경 → 선택 매장 기준 데이터 갱신 동일.
- `loadStores`(초기/재시도, 첫 매장 auto-select)·`generateDefaultPlaylist` 무변경.

## 5. AI / 인사이트 / 배너 / 최근 활동 처리

| 영역 | 처리 | 사유 |
|------|------|------|
| AI 인사이트(Block 5) | **제자리 유지**(셸 미수렴) | Block 4 와 2-col grid 결합 + KCos API shape(`StoreInsightsResult{level, insights[]{level,message}}`)가 셸 `insights: StoreInsight[]`(rule-engine `{level,code,message,recommendation,action}`)와 상이 → 이동 시 레이아웃·순서 깨짐. "최대한 유지" 원칙 우선. |
| 배너 | 미사용 | KCos 는 error/empty 를 early-return 으로 처리(별도 배너 영역 없음). |
| 최근 활동(최근 주문) | 제자리 유지 | 5-block 순서 보존. |
| 새로고침 | 미주입 | 셸 refresh row 는 `-mt-4`(HubLayout title 하단 가정) 내장 — KCos 상단 타이틀 부재로 omit(시각 오프셋 회피). |

→ 이번 adopt 는 **storeSelectorSlot(KCos 고유 요건) 수렴**에 집중. AI/인사이트의 셸 수렴은 shape 정합·레이아웃 변경 필요 → 별도 후속(범위 외).

## 6. 기존 화면 대비 유지된 것

- 5-block 전부(KPI/상품/사이니지/AI인사이트/최근주문) 의미·순서·마크업 유지.
- Block 1 매장 메타(이름/상태/코드/멤버/역할) + quick action(상품 관리/주문 관리) 유지.
- empty/error/loading early-return 무변경. 용어(매장/매장 상품) 유지.
- 다중 매장 전환 동작(handleStoreChange) 무변경.

## 7. 이번 WO에서 변경하지 않은 것

- ✅ `StoreHomeShell` / `store-ui-core` **무변경**(additive props 불필요 — storeSelectorSlot 기존 prop 사용) → **GlycoPharm 무영향 보장**.
- ✅ `StoreDashboardLayout`/`StoreSidebar`/`resolveStoreMenu`·hub-core 무변경.
- ✅ backend/API/DB/migration/package/lock/route 변경 0.
- ✅ K-Cosmetics API fetch/adapter(storeApi) **무변경** — 셸이 직접 호출 안 함.
- ✅ GlycoPharm / KPA 코드 변경 0.

## 8. GlycoPharm 무회귀 확인

- 본 WO diff = `services/web-k-cosmetics/.../StoreCockpitPage.tsx` **1파일뿐**. `StoreHomeShell`/store-ui-core 미변경 → GlycoPharm 소비처 영향 0.
- GlycoPharm `/store` 는 선행 SMOKE(`b47e1dfe9`)에서 운영 PASS. 본 WO 가 공통 셸을 건드리지 않았으므로 회귀 불가.

## 9. KPA 미변경 확인

- KPA 코드 미접촉(diff에 web-kpa-society 없음). KPA `/store` 홈(`StoreHomePage`) adopt 는 후속 WO.

## 10. 검증 결과

| 항목 | 결과 |
|------|------|
| web-k-cosmetics typecheck (`tsc -b`) | **PASS (exit 0)** |
| store-ui-core (참조 프로젝트) | PASS(동일 빌드) · 본 WO 무변경 |
| 배포 | main `57d8af5dd` push → `Deploy Web Services` k-cosmetics **success**. 라이브 이미지 sha=`57d8af5dd`(= 본 커밋) 확인 |
| browser: `/store` 접근 | ✅ 로그인(cosmetics:admin) → `/store` 진입, 레이아웃/사이드바(매장 용어: 매장 상품·거래/내 자료함 등) 정상 |
| browser: 빈 상태 | ✅ "등록된 매장이 없습니다"+"매장 신청하기"(early-return, 무변경) 정상 — **회귀 없음** |
| browser: console | 401 auth/me·refresh(로그인 前 흐름) + 403 store-hub/capabilities(레이아웃 호출, 무매장 계정 baseline) — **본 변경(main cockpit 경로) 무관** |
| **browser: storeSelectorSlot 다중매장** | ⚠️ **미검증** — 사용 가능한 KCos 계정(sohae2100, cosmetics:admin)에 매장 0개 → main cockpit 미도달, 다중매장(≥2) 부재. **정적+typecheck 로 대체 검증** |
| GlycoPharm 무회귀 | ✅ 공통 셸 무변경 → 영향 0(선행 smoke PASS) |
| KPA 무변경 | ✅ 코드 미접촉 |

**계정 제약 상세:** TEST-ACCOUNTS 의 KCos 계정은 admin/operator(sohae2100)뿐이며 store_owner+매장 보유 계정 부재. `/store` cockpit 은 매장 ≥1 필요, storeSelectorSlot 은 ≥2 필요 → 런타임 다중매장 검증 불가. 매장 데이터 생성은 backend 변경(범위 외)이라 미수행.

## 11. 완료 판정

**PARTIAL.** StoreHomeShell adopt(다중 매장 selector → storeSelectorSlot) 코드 완료 + web-k-cosmetics typecheck PASS + 배포 success. 5-block 의미·순서 보존, service-local 스코프 유지, 공통 셸·backend·GlycoPharm·KPA 무변경. browser 로 `/store` 접근·레이아웃·빈 상태 무회귀 확인. **단 storeSelectorSlot 다중매장 런타임 동작은 계정 제약(무매장)으로 미검증** → WO PARTIAL 정의("계정 제약으로 일부 제한") 부합.

## 12. 후속 KPA adopt 시 참고

1. **KPA 실행 흐름 3단계 → `onboardingSlot`** 강등이 핵심(삭제 아님). 빈 상태/초기 사용자 조건 노출.
2. KPA 홈(`StoreHomePage`)은 GlycoPharm 처럼 HubLayout 미사용(bespoke 카드) — KCos 와 유사하게 셸을 상단 영역에 적용하고 기존 블록(KPI/실행흐름/최근활동) 순서 유지.
3. 본 KCos adopt 처럼 **공통 셸 무변경**(additive prop 불필요)으로 가능하면 GlycoPharm/KCos 무회귀 보장.
4. **다중매장/무매장 계정 제약 동일** 가능성 — KPA 약국 계정(renagang21)으로 런타임 확인 권장.

## 13. 후속 WO

1. **`SMOKE-O4O-STORE-HOME-KCOSMETICS-MULTISTORE-V1`** — 매장 ≥2 보유 KCos 계정 확보 시 storeSelectorSlot 전환·스코프 갱신 런타임 검증.
2. **`WO-O4O-STORE-HOME-KPA-ADOPT-V1`** — KPA adopt, 실행흐름 → onboardingSlot.

---

*Date: 2026-06-17 · K-Cosmetics store home StoreHomeShell adopt · PARTIAL · 다중매장 selector → storeSelectorSlot, 5-block 의미·순서 보존, service-local fetch/scope 유지 · 공통 셸/backend/GlycoPharm/KPA 무변경 · web-k-cosmetics tsc -b 0 · 배포 success(57d8af5dd) · browser /store 접근·빈 상태 무회귀 · storeSelectorSlot 다중매장 런타임은 무매장 계정 제약으로 미검증(정적+typecheck 대체) · 후속 multistore smoke + KPA adopt.*
