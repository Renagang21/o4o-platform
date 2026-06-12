# CHECK-O4O-MARKET-TRIAL-CONVERSION-DISABLE-V1

> **WO**: WO-O4O-MARKET-TRIAL-CONVERSION-DISABLE-V1
> **선행 IR**: `IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1`
> **성격**: Market Trial 의 SPO→OPL 전환 퍼널(매장 진열) **신규 실행 비활성화**. 기존 DB 데이터 무변경.
> **정책**: 유통참여형 펀딩 = Neture 전용. 참여 약국 매장 org 으로의 OPL 전환·주문 역연결은 Store 통합 퍼널 → 중단.
> **작성일**: 2026-06-12

---

## 1. 목적
참여자(약국) 매장 org 에 `source_type='market_trial'` OPL 이 **새로 생성**되지 않게 하고, Store 주문을 trial 로 역연결해 `first_order` 로 승격하는 흐름을 중단한다. Neture 내부 참여/정산 기능은 유지. 기존 데이터는 건드리지 않는다(실측 후 별도 WO).

## 2. 선행 IR 기준
전환은 죽은 코드가 아니라 operator/supplier UI + checkout hook 까지 배선된 활성 Store 통합 퍼널. Neture-only 정책과 기능 방향성 충돌 → A안(전환 중단) 채택.

## 3. 정책 결정 — Neture-only / A안
신규 전환 실행 경로(backend 전환 endpoint · checkout 역연결 hook · operator 실행 액션)를 비활성화. 기존 OPL/participant/first_order 데이터는 보존(§8). 기존 데이터 정리는 DB 실측 후 `WO-...-CONVERTED-LISTING-DATA-CLEANUP-V1`.

## 4. Phase 1 — 전환 endpoint 비활성화
`controllers/market-trial/marketTrialOperatorController.ts` `createListingFromParticipant`:
- 함수 진입 직후 **409 + `code: 'MARKET_TRIAL_CONVERSION_DISABLED'`** 반환(방식 A — route 유지, disabled 응답).
- route(`POST /:id/participants/:pid/listing`)는 유지(404 회귀 방지, 추적 용이).
- 기존 OPL 생성 로직은 early-return 아래 보존(정의 재확인 시 참조, `eslint-disable no-unreachable`).
- **다른 org 우회/Neture org 생성 없음** — 단순 차단.

## 5. Phase 2 — checkout hook 비활성화
`services/checkout.service.ts` `tryConnectOrderToTrial`:
- 함수 최상단 **즉시 `return`**(no-op). market_trial OPL 매칭·`adopted→first_order` 승격·공급자 알림 미실행.
- 호출부(`:192` fire-and-forget)는 유지하되 hook 자체가 no-op → **일반 checkout 주문 처리 무영향**.
- 기존 역연결 로직 보존(early-return 아래).

## 6. Phase 3 — operator UI 전환 액션 비활성화
`pages/operator/MarketTrialApprovalDetailPage.tsx`:
- 참여자 행의 "활용 상품 연결"(매장 진열) **실행 버튼 → disabled** + tooltip("유통참여형 펀딩은 Neture 전용 — 매장 상품 전환(매장 진열)은 중단되었습니다.") + 라벨 "전환 중단".
- `onCreateListing`/`isCreatingListing` 참조 유지(미사용 오류 회피). 기존 `listingId` 있는 행은 "활용 상품 연결됨" 표시 유지(historical).
- 검토/참여자/전환상태(select)/정산 기능 무변경.

## 7. Phase 4 — supplier UI 처리 (스코프 정정)
- `pages/supplier/SupplierDashboardPage.tsx:145` "매장 진열"(`storeListings`) — **무변경**. 검증 결과 이 KPI 는 market_trial 전용이 아니라 **일반 공급자 지표**(`supplier-copilot.service.ts:62`: `COUNT opl WHERE spo.supplier_id=$1 AND opl.is_active` — 정상 SPO→ProductApproval→OPL 포함 전체 진열). market_trial 과 무관하므로 제거하면 정상 지표 손실 → 건드리지 않음. (선행 IR 의 supplier KPI 플래그는 과대 — 본 CHECK 에서 정정.)
- `pages/supplier/SupplierTrialDetailPage.tsx:409~` "활용 상품 연결 현황"(trial `listingCount`) — **무변경**. `(summary.listingCount ?? 0) > 0` 조건부 노출 = **기존 데이터에만 표시**되는 historical read-only. 전환 신규 생성 중단으로 자연 동결(증가 없음). 삭제 시 기존 인사이트 손실 → 보존(WO Phase 4 "기존 데이터 참고용" 부합).

## 8. 기존 데이터 무변경 확인
- `source_type='market_trial'` OPL: **삭제/수정 없음**.
- participant `listingId` / `customerConversionStatus`(first_order 포함): **무변경**.
- trial `convertedProductId`: **무변경**.
- DB / migration: **없음**.

## 9. 제외/무변경 항목
- Market Trial 생성/조회/참여(join)/정산(settlement)/배송(fulfillment) — 무변경.
- operator 검토(approve/reject)/상태전환/KPI 집계(listingCount/first_order read) — 무변경(read-only, historical).
- 일반 checkout 주문/결제 로직 — 무변경(hook 만 no-op).
- response shape — 무변경(전환 endpoint 는 409 + 신규 `code` 필드만 추가).

## 10. 검증 결과
- **정적/grep**: 신규 OPL 생성 경로(`createListingFromParticipant` INSERT) 도달 불가(409 early-return), checkout hook no-op, operator 실행 버튼 disabled. `source_type='market_trial'` writer 신규 실행 0.
- **TypeScript**: `apps/api-server` `tsc --noEmit` → PASS · `services/web-neture` `tsc --noEmit` → PASS.
- **무변경**: 기존 데이터·DB·migration·일반 checkout·Neture 내부 참여/정산 — 확인.
- **API smoke**: write 경로(전환 POST)라 production write 회피. 정적+typecheck 로 대체. (배포 후 전환 POST → 409 기대.)

## 11. 후속 데이터 실측/정리
1. **DB 실측** — `IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1 §7` SQL 을 Cloud SQL Console 에서 실행.
2. 데이터 존재 시 → `WO-O4O-MARKET-TRIAL-CONVERTED-LISTING-DATA-CLEANUP-V1`(기존 OPL 비활성/보존/이관/삭제 정책 — **승인 필요**).
3. `WO-O4O-MARKET-TRIAL-SUPERSEDE-IR-NOTE-V1` → `WO-O4O-MARKET-TRIAL-NETURE-EXTERNAL-NAME-ALIGNMENT-V1`.

## 12. 완료 판정
**PASS** — Market Trial → OPL 신규 전환 비활성(409), checkout 역연결 hook no-op, operator 실행 버튼 disabled. 일반 공급자 KPI·일반 checkout·Neture 내부 참여/정산·기존 데이터 무변경. typecheck(api-server+web-neture) 통과.

---

*Date: 2026-06-12 · WO-O4O-MARKET-TRIAL-CONVERSION-DISABLE-V1 · 신규 SPO→OPL 전환 퍼널 비활성화 PASS. 기존 데이터 무변경(실측 후 별도 cleanup WO). supplier 일반 KPI 는 스코프 정정으로 무변경.*
