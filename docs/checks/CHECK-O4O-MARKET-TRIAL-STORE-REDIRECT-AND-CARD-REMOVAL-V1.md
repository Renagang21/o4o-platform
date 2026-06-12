# CHECK-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1

> **WO**: WO-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1
> **선행 IR**: `IR-O4O-MARKET-TRIAL-NETURE-ONLY-BOUNDARY-CORRECTION-V1`
> **성격**: 유통참여형 펀딩(Market Trial)의 Store 서비스 연결 흔적 제거 (frontend).
> **무변경**: api-server Market Trial backend / DB / migration / Neture 내부 Market Trial 기능.
> **작성일**: 2026-06-11

---

## 1. 목적
유통참여형 펀딩 = **Neture 전용** 정책에 따라 KPA/GP/KCos Store 측에 남은 route·redirect·card·banner·dead link·orphan component 를 제거한다.

## 2. 선행 IR 기준
```
유통참여형 펀딩은 Neture 전용. KPA/GP/KCos 운영자·매장 허브·내 매장·주문 가능 상품·참여 이력과 연결하지 않는다.
Store 서비스에 route/카드/배너/메뉴/리다이렉트 연결을 두지 않는다. "없다"고 설명하지 않는다 — 연결 자체가 없으면 된다.
```

## 3. 제거 대상 인벤토리 (선행 IR Phase 1 기준)
KPA(활성) · GP(데드링크/고아) · KCos(홈 카드/고아) · store-ui-core(아이콘 잔재) · shared-space-ui(cross-service 카탈로그 카드).

---

## 4. KPA 제거 결과

| 파일 | 조치 |
|------|------|
| `App.tsx` | `/market-trial`,`/market-trial/my`,`/market-trial/:id` 라우트 3개 + `MarketTrialNetureRedirect` import 제거 |
| `components/MarketTrialNetureRedirect.tsx` | 파일 삭제(라우트 제거로 미사용) |
| `components/home/MarketTrialSection.tsx` | 파일 삭제(애초에 import 0건 — 고아) |
| `components/ServiceBanner.tsx` | `ExternalServiceSection` 의 "유통참여형 펀딩 참여" 배너(→ `neture.co.kr/market-trial`) + 미사용 `FlaskConical` import 제거 |
| `pages/CommunityHomePage.tsx` | 하단 `cta` "유통참여형 펀딩"(→ neture.co.kr) → "KPA-Society 활용이 처음이신가요?"(→ `/guide/usage`) 내부 CTA 로 교체. `FlaskConical`→`BookOpen` |

> `StandardHomeTemplate.cta` 는 **필수 prop** 이라 제거 불가 → GP 가 이미 쓰는 *내부 기능 CTA* 패턴과 동일하게 비-펀딩 내부 가이드 CTA 로 교체(연결 흔적 제거 + 빈 화면 방지).

## 5. GlycoPharm 제거 결과

| 파일 | 조치 |
|------|------|
| `components/common/MarketTrialNetureRedirect.tsx` | 파일 삭제(고아 — import/route 0건) |
| `pages/store-management/StoreMainPage.tsx` | `QUICK_ACTIONS` 의 "유통참여형 펀딩"(→ `/store/market-trial` **데드링크**) 항목 + 미사용 `Tag` import 제거 |
| `api/public.ts` | `fallbackNowRunning` 의 trial 항목(`/store/market-trial`) 삭제 · event 항목 데드링크 `/store/market-trial`→`/forum` · `fallbackNotices` "유통참여형 펀딩 참여 가이드"→"GlycoPharm 매장 운영 가이드" |

## 6. K-Cosmetics 제거 결과

| 파일 | 조치 |
|------|------|
| `components/common/MarketTrialNetureRedirect.tsx` | 파일 삭제(고아) |
| `config/homeStaticData.ts` | `heroSlides` 의 'trial' 슬라이드(→ neture.co.kr/market-trial) + `quickActionCards` 의 'trial' 카드(→ neture.co.kr/market-trial) 제거 |
| `pages/HomePage.tsx` | 하단 `cta` "유통참여형 펀딩"(→ neture.co.kr) → "K-Cosmetics 활용이 처음이신가요?"(→ `/guide/usage`) 내부 CTA 로 교체. `FlaskConical`→`BookOpen` |

## 7. store-ui-core 잔재 처리

| 파일 | 조치 |
|------|------|
| `components/StoreSidebar.tsx` | `'market-trial': Tag` 아이콘 매핑 제거. (`'market-trial'` menu key 는 어느 store 메뉴에도 미사용 — storeMenuConfig 이미 데드링크 정리됨. `Tag` 는 `b2c` 에서 계속 사용 → import 유지) |

## 8. shared-space-ui 처리 (Shared Module — 전 소비처 확인)

| 파일 | 조치 |
|------|------|
| `O4OHelpSection.tsx` | `ALL_SERVICE_ITEMS` 의 `serviceKey: 'market-trial'`("유통참여형 펀딩" → neture.co.kr/market-trial, "다른 서비스 보기" 카드) 제거 |

**Shared Module Change Protocol 적용** — `O4OHelpSection` 소비처 전수:
- `services/web-kpa-society/.../CommunityHomePage.tsx` — "다른 서비스 소개" 에서 펀딩 카드 사라짐 ✅(정책 충족)
- `services/web-glycopharm/.../community/CommunityMainPage.tsx` — 동일 ✅
- `services/web-k-cosmetics/.../HomePage.tsx` 계열 — 동일 ✅
- `services/web-neture/.../CommunityPage.tsx` — 펀딩 카드 사라짐. **Neture 영향 판단**: 유통참여형 펀딩은 Neture **내부 기능**으로 `/market-trial` 자체 라우트·허브에서 노출되므로, cross-service 외부 카탈로그 카드(중복·외부 URL)는 불필요. 회귀 아님 ✅

> 근거: 유통참여형 펀딩은 독립 "서비스"가 아니라 **Neture 내부 기능**이므로 cross-service 카탈로그에서 빼는 것이 4개 소비처 모두에 일관된 정책 정합 조치다(단일 서비스 임시 예외 아님).

---

## 9. 잔여(저위험·미제거) 항목 — 후속 후보

| 위치 | 내용 | 판단 |
|------|------|------|
| GP `pages/business/{BusinessHubPage,BusinessForumPage,BusinessPreparationPage,BusinessProductsPage,BloodCareBusinessStatusPage}` | "유통참여형 펀딩 기반 제품 개발" 등 **사업 아이디어 텍스트** | **유지** — 링크/카드/버튼 아님. `BusinessForumPage` 는 "실제 유통참여형 펀딩 실행은 Neture가 담당" 명시. Store 연결 아님(사업 추진 설명 문맥). WO 지침대로 무리한 제거 보류, 후속 표현 정렬 후보로만 기록 |
| backend `marketTrialController.ts:91-93` | KPA membership 게이트 | 본 WO 범위 외(backend). `IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1` 에서 처리 |
| backend 전환 `convertedProductId→OPL` 노출 경계 | 동상 | 동상(backend IR) |

---

## 10. 검증 결과

### 정적 검증 (grep)
Store 3사(`web-kpa-society`/`web-glycopharm`/`web-k-cosmetics`) 대상 잔여 연결 스캔:
```
neture.co.kr/market-trial   → 0건
/store/market-trial         → 0건
MarketTrialNetureRedirect   → 0건
MarketTrialSection          → 0건
```
→ Store 측 유통참여형 펀딩 route/redirect/card/menu 연결 **0건**.

### TypeScript 검증
- `services/web-kpa-society` `tsc --noEmit` → PASS
- `services/web-glycopharm` `tsc --noEmit` → PASS
- `services/web-k-cosmetics` `tsc --noEmit` → PASS
  (store-ui-core / shared-space-ui 변경은 데이터·아이콘 매핑 제거로 타입 영향 없음 — 소비 서비스 typecheck 로 간접 검증)

### 무변경 확인
- Neture 내부 Market Trial 화면/라우트(`/market-trial*`) 무변경.
- api-server Market Trial backend(controller/service/routes/job/extension) 무변경.
- DB / migration / entity / table 무변경.
- 다른 세션 WIP 미혼입(path-specific staging).

---

## 11. 완료 판정
**PASS** — Store 서비스(KPA/GP/KCos)에서 유통참여형 펀딩 연결(route/redirect/card/banner/menu/cross-service 카드)이 사용자에게 노출되지 않는다. Neture 내부 기능·backend·DB 무변경. typecheck 통과.

## 12. 후속 작업
1. `IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1` — controller KPA membership 게이트 + 전환 OPL 노출 경계.
2. 선행 IR(`IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1`) supersede note 추가.
3. GP business 페이지 "유통참여형 펀딩" 텍스트 표현 정렬(저위험).
4. (그 후) Neture 내부 외부명 정렬.

---

*Date: 2026-06-11 · WO-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1 · Store 측 유통참여형 펀딩 연결 흔적 제거 PASS. Neture 내부·backend·DB 무변경.*
