# IR-O4O-MARKET-TRIAL-NETURE-ONLY-BOUNDARY-CORRECTION-V1

> **유형**: Investigation (read-only) — 유통참여형 펀딩(Market Trial)의 서비스 경계 정정.
> **성격**: 코드/DB/migration/UI **무변경**. 조사 문서만.
> **정책 정정**: 유통참여형 펀딩은 **Neture 전용**(Neture 공급자가 Neture 안에서 진행). KPA/GlycoPharm/K-Cosmetics 의
> 운영자·매장 허브·내 매장·주문 가능 상품·참여 이력과 **연결하지 않는다.** 과거 Store 연결 흔적은 제거 대상.
> **선행(supersede 대상)**: `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1` 의 "Store 리다이렉트 유지" 기준 폐기.
> **작성일**: 2026-06-11

---

## 1. 목적
유통참여형 펀딩(=Market Trial)을 **Neture-only** 기능으로 확정하고, KPA/GP/KCos Store 측에 남은 연결 흔적(route/카드/배너/메뉴/리다이렉트/backend tie)을 전수 조사해 cleanup WO 후보로 분리한다.

## 2. 정책 정정 기준 (확정)
```
소속      : Neture (Neture 공급자가 Neture 내부에서 진행)
비연결 대상 : KPA/GP/KCos 의 운영자 · 매장 허브 · 내 매장 · O4O 주문 가능 상품 · 이벤트 오퍼 ·
            매장 취급 상품 · 신청/승인 현황 · 주문 내역
원칙      : Store 서비스에 유통참여형 펀딩 연결(카드/메뉴/버튼/리다이렉트/route)을 두지 않는다.
            "없다"고 설명할 필요는 없다 — 연결 자체가 없으면 된다.
```

## 3. 선행 IR 정정 포인트
선행 `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1` 의 다음 문장은 **폐기**한다:
- "Store 서비스(KPA/GP/KCos)는 Neture 리다이렉트 유지"
- "매장 허브 카드는 Neture 운영 안내·링크로"
- "내 매장에는 참여 이력/펀딩 상태로 표시"
- "전환 후 OPL = O4O 주문 가능 상품 합류"(Store 측 합류로 읽히는 부분)

**새 기준**: 위는 Neture 내부에서만 성립. Store 측 노출·전환 연결은 두지 않는다. (단 §5/§6 의 **참여=사전 모집 / 결제=오프라인 ledger / 전환=SPO→OPL(운영자)** 의 *기능 정의 자체*는 유효 — 그 정의가 **Neture 안에서만** 적용된다는 경계만 정정.) → 선행 IR 에 supersede note 추가 권장(§8 후속).

---

## 4. 조사 범위
frontend: services/web-{kpa-society,glycopharm,k-cosmetics}, web-neture; packages/{store-ui-core,store-products-ui,shared-space-ui}. backend: apps/api-server/src/{controllers/market-trial,routes/market-trial*,database/migrations}. (read-only, file:line 근거.)

---

## 5. Phase 1 — Store 서비스 연결 흔적

| 서비스 | 파일:line | 흔적 | 현재 동작 | 제거 |
|--------|-----------|------|-----------|:---:|
| **KPA** | `App.tsx:598-600` | `/market-trial`,`/market-trial/my`,`/market-trial/:id` → `MarketTrialNetureRedirect` | **활성 redirect** → Neture | ✅ |
| KPA | `components/MarketTrialNetureRedirect.tsx` | redirect 컴포넌트 | KPA에서 사용 중 | ✅ |
| KPA | `components/home/MarketTrialSection.tsx:50` | 홈 카드 "유통참여형 펀딩 참여" | CommunityHomePage 노출 | ✅ |
| KPA | `pages/CommunityHomePage.tsx` | MarketTrialSection 사용 | 홈 노출 | ✅(섹션 제거) |
| KPA | `components/ServiceBanner.tsx:140-142` | 배너 "유통참여형 펀딩 참여" → `https://neture.co.kr/market-trial` | 외부 배너 | ✅ |
| **GP** | `components/common/MarketTrialNetureRedirect.tsx` | redirect 컴포넌트 | **고아**(import/route 0건) | ✅(데드코드) |
| GP | `pages/store-management/StoreMainPage.tsx:57` | 매장 메뉴 "유통참여형 펀딩" → `/store/market-trial` | **데드링크**(GP App.tsx 에 `/store/market-trial` 라우트 없음 — storeMenuConfig 도 "미마운트 제거" 명시) | ✅ |
| GP | `api/public.ts:79,87,108` | `/store/market-trial` 링크 ×2 + "[안내] 유통참여형 펀딩 참여 가이드" | 데이터/안내 | ✅ |
| GP | `pages/business/{BusinessHubPage,BusinessForumPage,BusinessPreparationPage,BusinessProductsPage,BloodCareBusinessStatusPage}` | "유통참여형 펀딩 기반 제품 개발" 텍스트(사업 아이디어, "실행은 Neture" 주기) | 텍스트 언급(링크 아님) | △(저위험, Neture 귀속 명시됨 — 표현 정리 선택) |
| **KCos** | `components/common/MarketTrialNetureRedirect.tsx` | redirect 컴포넌트 | **고아**(미사용) | ✅(데드코드) |
| KCos | `config/homeStaticData.ts:34-37,97-101` | 홈 카드 2개 "유통참여형 펀딩" → `https://neture.co.kr/market-trial` | 홈 노출 | ✅ |
| **store-ui-core** | `components/StoreSidebar.tsx:93` | `'market-trial': Tag` 아이콘 매핑 | leftover(메뉴 key 미사용) | △(소규모 정리) |
| store-ui-core | `config/storeMenuConfig.ts:33,161` | "GP /market-trial 미마운트 제거" 주석 | 이미 메뉴 제거됨 | ▢(이미 정리) |

> store guide copy(`kpa.ts`/`glycopharm.ts`/`k-cosmetics.ts`)에는 유통참여형/펀딩/market-trial **언급 없음**(grep 0건) — Store 가이드 측은 깨끗.

---

## 6. Phase 2 — backend 연결 흔적

| 파일/기능 | 연결 대상 | Neture-only 가능 | Store 연결 위험 | 후속 |
|-----------|-----------|:---:|:---:|------|
| `migrations/20260419400000-ResetMarketTrialDataAndRemoveServiceKeys.ts` | `market_trials.visibleServiceKeys` **컬럼 DROP** | ✅ | 낮음 | 이미 Neture-내부화 방향(서비스 가시성 제거됨) |
| `controllers/market-trial/marketTrialController.ts:91-93` | **KPA membership 체크**(`service_key IN ('kpa','kpa-society')`) | ⚠ | **있음** | KPA 멤버십을 참여 게이트로 쓰는 잔재 — Neture 경계로 재검토(별도 IR) |
| `marketTrialOperatorController.ts:1094-1212` | 전환 `convertedProductId(SPO)→OrganizationProductListing` | ✅ | 낮음 | **Neture 운영자 스코프**(operator route). OPL 생성은 organizationId 인자 — Store 서비스 흐름 아님. 단 "전환된 OPL 이 어느 서비스 매장에 노출되는가" 경계는 후속 IR |
| `routes/market-trial.routes.ts`, `market-trial-operator.routes.ts` | 공개/운영자 라우트 | ✅ | 낮음 | Neture 내부 유지 |
| `jobs/market-trial-lifecycle.job.ts`, `extensions/trial-*` | lifecycle/fulfillment/shipping | ✅ | 낮음 | Neture 내부 유지 |

> 핵심: backend 는 `visibleServiceKeys` 제거로 **이미 Neture-내부화에 가깝다.** 잔여 위험은 ① **controller 의 KPA membership 게이트** ② **전환 OPL 의 매장 노출 경계**(어느 organization/서비스로 가는가) 2건.

---

## 7. Phase 3 — 문서/가이드 정정 필요성

| 문서/파일 | 문제 문구 | 정정 방향 |
|-----------|-----------|-----------|
| `docs/investigations/IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1.md` §9·§12·§13 | "Store 리다이렉트 유지 / 매장 허브 카드 / 내 매장 참여 이력 / OPL 합류" | **supersede note 추가** — Neture-only 경계로 정정(본 IR 참조). 기능 정의(참여/결제/전환)는 유효, *적용 범위만* Neture 한정 |
| Neture guide copy `neture.ts` | "유통참여형 펀딩 …"(공급자/운영자 안내) | **유지 가능** — Neture 안내로 적절 |
| KPA/GP/KCos service/store guide | (유통참여형 언급 없음) | 정정 불필요 |

---

## 8. Phase 4 — cleanup WO 후보

**소형 cleanup (frontend, 우선)**
- `WO-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1` — KPA `/market-trial` 라우트 3개 + MarketTrialSection 홈 카드 + ServiceBanner 배너 제거; GP StoreMainPage 메뉴(데드링크)·public.ts 링크 제거; KCos homeStaticData 카드 2개 제거; GP/KCos 고아 `MarketTrialNetureRedirect.tsx` 삭제. (서비스별 path-specific)
- `WO-O4O-STORE-UI-CORE-MARKET-TRIAL-ICON-LEFTOVER-CLEANUP-V1` — StoreSidebar `'market-trial': Tag` 잔재 정리(선택).
- GP business 페이지 "유통참여형 펀딩 기반 제품 개발" 텍스트 표현 정리(선택, 저위험 — 이미 "실행은 Neture" 귀속).

**backend (IR 동반 필요)**
- `IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1` — ① controller KPA membership 게이트(:91-93) 의 의도/제거 가능성 ② 전환 OPL 의 매장 노출 경계(organizationId 가 어느 서비스로?) 조사 후 `WO` 분리.

**문서**
- `WO-O4O-MARKET-TRIAL-SUPERSEDE-IR-NOTE-V1` — 선행 IR 에 Neture-only supersede note 추가(copy-only).

**Neture-only 유지 (Store 제거 후)**
- `WO-O4O-MARKET-TRIAL-NETURE-EXTERNAL-NAME-ALIGNMENT-V1` — Neture 내부 사용자-facing "마켓 트라이얼/Market Trial" → "유통참여형 펀딩" 정렬. **Store 연결 제거 완료 후 진행.**

---

## 9. Neture-only canonical 기준
```
유통참여형 펀딩 = Neture 공급자가 Neture 안에서 진행하는 Neture 전용 사전 모집(=Market Trial 내부명).
- Store 서비스(KPA/GP/KCos)에 route/카드/배너/메뉴/리다이렉트/참여이력/주문전환 연결 없음.
- backend: market_trials 는 visibleServiceKeys 없음(Neture 내부). KPA membership 게이트·전환 OPL 노출 경계는 후속 정리.
- 매장 허브/내 매장 공통화에 유통참여형 펀딩을 끼워넣지 않는다.
```

## 10. 결론
- **정책 확정**: 유통참여형 펀딩 = **Neture-only**. 선행 IR 의 "Store 리다이렉트/노출 유지" 폐기.
- **Store 흔적 인벤토리**: KPA(활성 — 라우트 3 + 홈 카드 + 배너 + backend membership) > GP(데드링크 메뉴 + 고아 redirect + public.ts) > KCos(홈 카드 2 + 고아 redirect). store guide copy 는 깨끗.
- **backend**: `visibleServiceKeys` 제거로 이미 Neture-내부화 방향. 잔여 = controller KPA membership 게이트 + 전환 OPL 노출 경계(후속 IR).
- **순서**: ① 본 IR(경계 확정) → ② Store frontend cleanup WO → ③ backend boundary IR/WO → ④ 선행 IR supersede note → ⑤ (그 후) Neture 내부 외부명 정렬. **외부명 정렬보다 경계 정정·흔적 제거가 먼저.**

---

*Date: 2026-06-11 · read-only IR · 코드 무변경 · 정책: 유통참여형 펀딩 Neture-only, Store 연결 흔적 제거 후보 분리(KPA 활성/GP·KCos 잔재). 선행 IR supersede.*
