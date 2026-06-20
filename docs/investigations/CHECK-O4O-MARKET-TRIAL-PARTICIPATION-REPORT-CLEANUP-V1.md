# CHECK — 유통참여형 펀딩 참여 리포트 정리 V1

> WO: `WO-O4O-MARKET-TRIAL-PARTICIPATION-REPORT-CLEANUP-V1`
> 유형: 운영 개선 (참여 리포트 content-only 정리) — 프론트 표시 전용, 백엔드/DB 무변경.
> 선행: [`CHECK-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-REACTIVATION-V1`](CHECK-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-REACTIVATION-V1.md) (오프라인 입금 확인 재활성화) 이후.

---

## 1. 조사 / 문제 확정

operator 유통참여형 펀딩 상세의 기존 요약 표면:

| 표면 | 데이터 출처 | 내용 |
|------|------|------|
| `SummaryMetrics` | trial + `listParticipants.summary` | 참여자 / 정원 / 모집률 / 제품 보상 / 현금 보상 |
| `TrialKpiBar` | `/:id/kpi` (`computeTrialKpi`) | 목표 달성률 / 참여율 / 입금 확인 완료율(완료·환불) / 모집 잔여 |
| `FulfillmentSummary` | `listParticipants.summary` | 이행률 / 이행 완료 / 대기 중 |
| 오프라인 입금 관리 섹션 | `listParticipants.participants` | 참여자별 입금 상태·금액·확인 + 인라인 폼 |

**핵심 발견:**
- `computeTrialKpi` (`/:id/kpi`) 는 **payment 집계를 이미 전부 계산**한다 — `paidParticipantCount` / `unpaidParticipantCount` / `failedPaymentCount` / `refundCount` / `paymentCompletionRate` / **`totalPaidAmount`** / `participantCount`.
- 그러나 화면에는 **입금 확인 완료율 + 완료/환불 수**만 노출되고, **입금 확인 금액 합계(`totalPaidAmount`)와 입금 미확인 수(`unpaidParticipantCount`)는 표시되지 않았다.** → 운영자가 "총 얼마가 입금 확인됐는지"를 한눈에 못 봄.
- 금지 지표(전환율 / 상품 전환 / `convertedProduct*` / 매장 진열 / `listingId` / OPL / 매장 랜딩 / `customerConversion*` / 첫 주문 / 주문 전환율 / 배송·발송 / 상품 정산 금액 / O4O 결제 금액)는 **응답(`listParticipants.summary`, `computeTrialKpi`)·카드·operator 리스트 KPI 어디에도 없음** (content-only 이미 정합).
- "총 참여 수량" 은 `market_trial_participants` 에 **저장된 수량 필드가 없음** → migration 금지 원칙상 신설하지 않고 리포트에서 제외.

> 결론: 백엔드/DB 변경 불필요. **프론트에서 이미 계산된 content-only payment 집계를 명확히 표시**하는 것이 정비의 핵심.

---

## 2. 최소 수정 (1 file, frontend only)

`services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx`

- content-only **`ParticipationReport`** 카드 신규 추가 (`SummaryMetrics` 와 `TrialKpiBar` 사이에 렌더). `trialKpi` + `listParticipants.summary` 만 사용 (신규 endpoint·필드 없음).
- 카드 구성 (5 cell): **총 참여자** / **입금 확인** / **입금 미확인** / **입금 확인 금액 합계** / **펀딩 처리 대기**. + 환불 처리 N명(있을 때 보조 표기).
  - `입금 확인 금액 합계` = `kpi.totalPaidAmount` (기존 미표시 → 신규 노출).
  - `입금 미확인` = `kpi.unpaidParticipantCount` (기존 미표시 → 신규 노출).
  - `펀딩 처리 대기` = `summary.totalCount − summary.offlineSettledCount`. settlementStatus 기반이나 사용자-facing 표기는 **"펀딩 처리"** (= "정산" 미표기, WO §5.3 준수).
- 헤더에 "오프라인 입금 확인 기준 · 온라인 결제 아님" 명시.
- 기존 `MetricCell` 컴포넌트 재사용. 백엔드/api/DB/CSV 무변경.

---

## 3. 검증

| 항목 | 결과 |
|------|------|
| `@o4o/web-neture` `tsc --noEmit` | **PASS** (exit 0) |
| 백엔드/DB/migration | **무변경** (필요 수치는 기존 `trialKpi`·`summary` 에서 계산) |
| `productId` / settlement·payment 컬럼 | **무변경** |
| 금지 지표 (전환/매장진열/주문/배송/상품정산) | 응답·카드 **부재** (재확인) |
| CSV (`exportParticipantsCSV`) | **무변경**. 헤더 14컬럼은 직전 WO 에서 content-only 확정 — 금지 컬럼(`listingId`/`customerConversion*`/`convertedProduct*`/매장랜딩/활용상품연결/첫주문/배송/발송/상품정산) **부재** |
| 변경 범위 | 1 file (operator 상세). 다른 세션 untracked migration `20261118000000-CleanupNetureTestSuppliers.ts` **미접촉** |
| 라이브 브라우저 스모크 | **PASS** (2026-06-20, §3-A) — 카드 렌더·수치·console·network 정상. 동적 write 검증(입금 상태 변경 반영)은 보류(§3-A) |

> PII / `paymentReference` 원문은 본 문서·로그에 기재하지 않음.

### 3-A. 라이브 브라우저 스모크 결과 (2026-06-20)

- **배포:** Deploy Web Services (commit `8544f8494`) **success**. web-neture 배포 반영.
- **방식:** Playwright(headless) — operator(sohae2100) 토큰 주입 후 `/operator/market-trial/cf6cdc98-…`([SMOKE] 유통참여형 펀딩 운영 루프 테스트) 직접 진입. read-only(운영 데이터 변경 없음).
- **read-only API 정합 선확인:** `/:id/kpi` → participantCount 1 / paidParticipantCount 1 / unpaidParticipantCount 0 / **totalPaidAmount 5000** / refundCount 0. KPI 키에 금지/정산성 지표 부재. participants.summary.offlineSettledCount 0 → 펀딩 처리 대기 = 1.

| 확인 항목 | 결과 |
|------|:----:|
| ParticipationReport 카드 실제 노출 | ✅ |
| 총 참여자 1 / 입금 확인 1 / 입금 미확인 0 | ✅ |
| **입금 확인 금액 합계 5,000원** | ✅ |
| 펀딩 처리 대기 1 | ✅ |
| 금지지표(전환/매장진열/배송/상품정산) 카드 내 부재 | ✅ |
| console error | **0** |
| pageerror | **0** |
| network ≥400 | **0** |

- **보류(이번 WO 미수행):** "입금 상태 변경 시 카드 수치 반영" 동적 검증은 참여자 `paymentStatus` **운영 write** 가 필요. 본 카드는 백엔드 `trialKpi`·`summary` 의 기존 값만 표시(자체 캐시 없음)하므로 데이터 정합은 read-only API 로 이미 확인됨. 다른 세션의 SMOKE trial 데이터에 운영 write 를 가하는 것은 과한 검증으로 판단 → **보류**. 추후 실제 입금 상태 변경 운영 시 자연 검증.

---

## 4. content-only / 보존 정합

- 본 변경은 **이미 보존된 payment 집계의 표시**일 뿐, 새 지표·새 상태값·새 연결을 만들지 않는다.
- settlement mutation 재활성화 없음(계속 409). 상품 전환/매장 진열/주문/배송 복원 없음.
- `productId` optional legacy 정책 불변.

---

## 5. 남은 후속 과제 (§14)

- **펀딩 처리 상태 용어 정리** — CSV 헤더 "정산선택/정산상태" 및 라벨값 "정산 완료" 등 `정산 → 펀딩 처리` 전면 sweep (본 WO 범위 외, 별도 진행).
- 운영자 메모·감사 로그 정책.
- `paidAt` 최초 확인일 보존 여부 검토.
- 공급자 안내 문구 정리.

---

*Date: 2026-06-20 · content-only 참여 리포트 카드(입금 확인 금액 합계·입금 미확인·펀딩 처리 대기) 추가 · 백엔드/DB/CSV 무변경 · tsc PASS · 다른 세션 WIP 미접촉.*
