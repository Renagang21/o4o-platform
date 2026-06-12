# CHECK-O4O-MARKET-TRIAL-NETURE-EXTERNAL-NAME-ALIGNMENT-V1

> **WO**: WO-O4O-MARKET-TRIAL-NETURE-EXTERNAL-NAME-ALIGNMENT-V1
> **선행**: `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1`(+supersede note) 등 Market Trial Neture-only 라인.
> **성격**: Neture 내부 **사용자-facing 외부명 정렬**(유통참여형 펀딩). 내부 코드명/route/entity/table/API **무변경**. Store 서비스 **무변경**.
> **결과: PASS — 잔여 사용자-facing "Trial" 표기 4건 정렬. 외부명 정렬은 사실상 이미 완료 상태였음.**
> **작성일**: 2026-06-12

---

## 1. 목적
Neture 사용자-facing 화면/가이드에서 "Market Trial / 마켓 트라이얼 / Trial" 잔여 표기를 외부명 **"유통참여형 펀딩"** 으로 정렬한다. 내부 코드명(`market_trial`, `/market-trial`, `MarketTrial*`)은 유지.

## 2. 선행 기준
유통참여형 펀딩 = Neture 전용. Store 연결 제거·신규 전환 비활성화·OPL 0건 실측 완료. 본 WO 는 그 마지막 단계인 **표기 정렬**.

## 3. 외부명/내부명 기준
- 외부명(사용자) = **유통참여형 펀딩**.
- 내부명(유지) = `market_trial` / `/market-trial` / `MarketTrialController` / `MarketTrial` entity / `market_trials` table / `trial`·`Trial` 식별자·함수·타입.

## 4. Phase 1 — 사용자-facing 표기 조사

| 분류 | 결과 |
|------|------|
| 한글 "마켓 트라이얼" | **0건** (Neture·shared-space-ui) |
| 영문 "Market Trial" 사용자-facing | **0건** (전부 주석/식별자) |
| "시범사업 / 시장 테스트" | **0건** |
| guide copy(`neture.ts`/guide pages) Store 연결 위험 문구("매장 허브에서 참여 / 내 매장 반영 / O4O 주문 가능 상품으로 전환 / 리다이렉트") | **0건** |
| 페이지 제목·메뉴·SEO | 이미 "유통참여형 펀딩" 사용 (`MarketTrialHubPage` h1, `SupplierTrialListPage` h1 "내 유통참여형 펀딩", `operatorMenuGroups`, `seoRegistry`, `navigation`) ✅ |
| **잔여 사용자-facing "Trial" display** | **4건** (operator 2 파일) → §5 정렬 |

> 결론: guide copy·페이지·메뉴는 **이미 외부명 정렬 완료** 상태. 잔여는 operator 페이지의 error/transition 문구 4건뿐.

## 5. Phase 2 — Neture 화면 문구 정렬 (변경 4건)

| 파일:line | before | after |
|-----------|--------|-------|
| `operator/MarketTrialApprovalsPage.tsx:129` | `'Trial 목록을 불러오는데 실패했습니다.'` | `'유통참여형 펀딩 목록을 불러오는데 실패했습니다.'` |
| `operator/MarketTrialApprovalDetailPage.tsx:134` | `'Trial을 불러오는데 실패했습니다.'` | `'유통참여형 펀딩을 불러오는데 실패했습니다.'` |
| `operator/MarketTrialApprovalDetailPage.tsx:351` | `'Trial을 찾을 수 없습니다.'` | `'유통참여형 펀딩을 찾을 수 없습니다.'` |
| `operator/MarketTrialApprovalDetailPage.tsx:676` | `Trial 상태를 <strong>…</strong>에서` | `유통참여형 펀딩 상태를 <strong>…</strong>에서` |

## 6. Phase 3 — 참여≠주문 문구 확인
- market-trial 페이지는 이미 "참여 신청 / 오프라인 정산 / 금융투자 상품 아님" 문구 보유(`MarketTrialDetailPage:364,367`). 참여 버튼이 "주문하기"로 노출되지 않음 — 무변경.
- 비활성화된 전환 surface(supplier "활용 상품 연결 현황 / 매장 랜딩 현황 / 상품 전환 상태")는 데이터 조건부(listingCount>0 등) 노출이고 production 데이터 0건이라 사용자에게 보이지 않음 — `WO-...-CONVERSION-DISABLE-V1` 의 historical 보존 판정 유지(무변경).

## 7. Phase 4 — guide copy 정렬
- `neture.ts` 및 guide pages(`GuideBusinessMarketTrialPage`/`GuideFeatureMarketTrialPage`)는 이미 "유통참여형 펀딩" 외부명 사용. Store 연결 위험 문구 **0건** → 무변경.

## 8. Phase 5 — 내부명 유지 검증
- `/market-trial` route · `MarketTrial*` class/page · `MarketTrial` entity · `market_trials` table · `trial`/`Trial`/`TrialStatus`/`joinTrial`/`getTrial` 식별자·함수·타입 — **전부 무변경**.
- 변경은 사용자-facing 한글 문구 4건뿐(코드 식별자·route·API 미변경).

## 9. 변경 내용
operator 2개 파일, 사용자-facing 문구 4건만 "Trial" → "유통참여형 펀딩" 정렬. 그 외 무변경.

## 10. 제외/무변경 항목
- Store 서비스(KPA/GP/KCos) — 무변경.
- api-server route/API/entity/table/class/function — 무변경.
- DB/migration — 없음.
- 내부 코드명/주석의 "Market Trial / Trial" — 유지(내부명).
- 비활성화된 전환 surface — 무변경(historical, 데이터 0건이라 미노출).

## 11. 검증 결과
- **정적/grep**: 사용자-facing "Trial 한글문장" 잔재 0건(정렬 후). 페이지·메뉴·SEO·guide 모두 외부명. 내부명 유지 확인.
- **TypeScript**: `services/web-neture` `tsc --noEmit` → PASS.
- **무변경**: Store 서비스·backend·DB·route·entity — 확인.

## 12. 완료 판정
**PASS** — Neture 사용자-facing 외부명이 "유통참여형 펀딩"으로 정렬됨(잔여 4건 수정, 나머지는 기수행). 내부명 `market_trial`/route/entity/table 유지. Store 서비스·backend·DB 무변경. typecheck 통과.

---

*Date: 2026-06-12 · WO-O4O-MARKET-TRIAL-NETURE-EXTERNAL-NAME-ALIGNMENT-V1 · 사용자-facing 외부명 정렬 PASS(operator 문구 4건). 내부명 유지. 유통참여형 펀딩 Neture-only 라인 종결.*
