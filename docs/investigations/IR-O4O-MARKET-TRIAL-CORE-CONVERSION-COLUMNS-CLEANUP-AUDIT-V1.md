# IR-O4O-MARKET-TRIAL-CORE-CONVERSION-COLUMNS-CLEANUP-AUDIT-V1

> **유형**: Investigation (read-only) — 유통참여형 펀딩(Market Trial) **core 전환 컬럼 8개 제거 가능성** 조사.
> **성격**: 코드/DB/migration/API/UI **무변경**. 라이브 실측(SELECT) + 정적 사용처 분석.
> **선행**: 경계 V1 · P0(WIRING-DISABLE) · P1(UI-LABEL) · P2(CONTRACT-CLEANUP) · P3-1(PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP).
> **목적**: `DROP COLUMN` WO(P3-2) 전, 8개 컬럼의 실제 사용처·cascade·제거 가능성 확정.
> **작성일**: 2026-06-19

---

## 0. 핵심 결론 (요약)

1. **데이터**: 8개 컬럼 전부 **0건 / null / none-only**, OPL `source_type='market_trial'` **0건**. → 데이터 손실 위험 없음.
2. **Frontend**: 8개 필드의 모든 렌더는 `SHOW_MARKET_TRIAL_COMMERCE_UI = false`로 **게이트(비노출)** 거나 **타입 전용**. → 사용자 영향 0. 단 타입은 백엔드 정리와 **동기 제거** 필요(아니면 compile 에러).
3. **Backend = 진짜 cascade 블로커**: **8개 컬럼 모두 ACTIVE READ가 남아 있음**(409 차단된 것은 WRITE뿐). 활성 read 지점:
   - `getFunnel` — `customerConversionStatus` 분포 집계(conversionDistribution) + `convertedProductId/Name` 반환
   - `listParticipants` — `listingId`/`customerConversionStatus`/`customerConversionAt`/`customerConversionNote` SELECT·응답
   - `exportParticipantsCSV` — `listingId`("활용상품연결")·`customerConversionStatus`("매장랜딩단계") CSV 컬럼
   - operator `toOperatorTrialDTO` / supplier `toSupplierTrialDTO` — `convertedProductId/Name`·`conversionNote` 반환
   - `productId` — 생성(`createTrial`) + 상세 DTO + **제품 참조 display join**(buildOperatorProductRefMap)
4. **판정**: **순수 migration(DROP COLUMN)만으로 즉시 제거 가능한 컬럼은 없다.** 모든 컬럼은 **활성 backend read를 먼저 제거**(쿼리 + 응답 필드 + DTO/type + entity field)해야 drop 안전. → **2단계 분리**(read-wiring 정리 → column drop) 권장.
5. **`productId` 예외**: 전환(conversion) 컬럼이 아니라 **"펀딩이 어떤 등록 제품(ProductMaster)을 소재로 하는지" 표시용 참조**. 생성/상세/표시에 활성 사용 → content-only와 충돌하지 않음. **drop 비권장 → B(legacy nullable 유지 + 신규 사용 정책만 정리)**.

---

## 1. 라이브 실측 (read-only, 2026-06-19)

| 항목 | 값 |
|------|---:|
| market_trials total | 1 |
| productId not null | **0** |
| convertedProductId not null | **0** |
| convertedProductName 비어있지 않음 | **0** |
| conversionNote 비어있지 않음 | **0** |
| market_trial_participants total | 1 |
| listingId not null | **0** |
| customerConversionAt not null | **0** |
| customerConversionNote 비어있지 않음 | **0** |
| customerConversionStatus 분포 | **none=1** |
| OPL source_type='market_trial' | **0** |

→ 모든 대상 컬럼 데이터 없음. (settlement/payment 1건은 본 조사 대상 아님 — 보존.)

---

## 2. 컬럼별 사용처 (backend active read + frontend gated)

> 표기: **AR**=Active Read(차단 안 됨), **W-disabled**=WRITE는 409 차단(unreachable), **FE-gated**=프론트 렌더는 `SHOW_MARKET_TRIAL_COMMERCE_UI=false` 뒤(숨김), **type-only**=타입 정의만.

### market_trials

| 컬럼 | entity | Backend 활성 read | WRITE | Frontend | 데이터 |
|------|--------|------|------|------|---:|
| `productId` | MarketTrial.entity:58 | **AR**: 생성 `MarketTrialService.createTrial`(write), 상세 DTO `marketTrialController.ts:788`(supplier) / `marketTrialOperatorController.ts:252` getDetail + 제품참조 join, dto/index:14·37 | 생성 시 set(active) | 생성폼/상세 표시(전환 아님) | 0 |
| `convertedProductId` | :197 | **AR**: `getFunnel`(:494), `toOperatorTrialDTO`(:1840), supplier DTO(`marketTrialController.ts:791`) | convertToProduct **W-disabled** | trialConverted boolean, FE-gated | 0 |
| `convertedProductName` | :204 | **AR**: `getFunnel`(:496), `toOperatorTrialDTO`(:1841), supplier DTO(:792) | W-disabled | FE-gated(supplier 상세 505-532) | 0 |
| `conversionNote` | :211 | **AR**: `toOperatorTrialDTO`(:1842), supplier DTO(:793) | W-disabled | FE-gated | 0 |

### market_trial_participants

| 컬럼 | entity | Backend 활성 read | WRITE | Frontend | 데이터 |
|------|--------|------|------|------|---:|
| `listingId` | Participant.entity:82 | **AR**: `listParticipants`(:607,:697), `exportParticipantsCSV`(:1382,:1454 "활용상품연결") | createListingFromParticipant **W-disabled** | FE-gated(operator 821/917) | 0 |
| `customerConversionStatus` | :90 | **AR(CRITICAL)**: `getFunnel` 분포 집계(:471-503), `listParticipants`(:604,:694, 필터 :548), `exportParticipantsCSV`(:1381 "매장랜딩단계"), supplier funnel(`marketTrialController.ts:436,450-454`) | updateParticipantConversionStatus **W-disabled** | FE-gated(operator dropdown 900-915) + 필터옵션 type-only | none=1 |
| `customerConversionAt` | :97 | **AR**: `listParticipants`(:605,:695) | W-disabled | type-only | 0 |
| `customerConversionNote` | :104 | **AR**: `listParticipants`(:606,:696) | W-disabled | type-only | 0 |

> file:line 은 조사 시점(HEAD `7141c038b`) 기준 근사. 구현 WO 착수 시 재확인 필요.

---

## 3. 핵심 질문 답변 (WO §7)

| # | 질문 | 답 |
|---|------|----|
| 1 | productId 실사용? | **예** — 생성 시 set + supplier/operator 상세 DTO 반환 + 제품 참조 display. 전환 아님(소재 표시). |
| 2 | productId 없어도 흐름 유지? | 부분적. 생성/조회 자체는 가능하나 "연결 제품 표시" 기능이 사라짐 → 제거보다 유지가 자연스러움. |
| 3 | convertedProduct* 전환 전용? | **예**(전환 결과). 단 `getFunnel`·상세 DTO에서 **활성 read**됨. |
| 4 | listingId 다른 의미? | 없음 — OPL 매장 진열 연결 전용. 단 `listParticipants`·CSV에서 **활성 read**. |
| 5 | customerConversionStatus 재해석? | content-only엔 불필요(매장 도입/첫 주문 퍼널). 단 `getFunnel`·`listParticipants`·CSV·supplier funnel **활성 read** → 제거 시 cascade 큼. |
| 6 | conversionAt/Note 운영메모 재사용가치? | 낮음(전환 단계 부속). 운영 메모가 필요하면 별도 필드가 깔끔. |
| 7 | getFunnel/KPI에서 제거 시 응답 변화? | `getFunnel`의 `conversionDistribution`(none/interested/considering/adopted/first_order)·`convertedProduct*` 필드가 사라짐 → 응답 shape 변경. supplier funnel도 동일. |
| 8 | frontend 렌더/필터 사용? | 렌더는 전부 **게이트(숨김)**. 필터옵션 conv_*는 P1에서 제거됨(type-only 잔존). |
| 9 | DTO/type 제거 cascade? | trial.ts 타입(Trial/OperatorTrial/TrialParticipant/TrialFunnel)에 필드 존재 → 제거 시 page import 타입 에러. 백엔드 DTO 응답 필드도 동반 제거 필요. |
| 10 | drop 가능 vs legacy 유지? | **즉시 drop 가능 컬럼 없음**(전부 활성 read). read 정리 후 drop. `productId`는 legacy 유지 권장. |

---

## 4. 분류 (A/B/C/D)

> 데이터는 전부 비어 있고 프론트는 게이트됐지만, **backend 활성 read 때문에 현재 어느 컬럼도 "코드 변경 없이 즉시 drop"이 불가**하다. 아래 분류는 **활성 read 정리(선행 단계)를 전제로 한 최종 처리 방향**이다.

| 컬럼 | 현재 데이터 | 활성 read 블로커 | 분류 | 권장 조치 |
|------|---:|------|:--:|------|
| `convertedProductId` | 0 | getFunnel, 상세 DTO | **A**(read 정리 후 drop) | read 제거 → drop |
| `convertedProductName` | 0 | getFunnel, 상세 DTO | **A** | read 제거 → drop |
| `conversionNote` | 0 | 상세 DTO | **A** | read 제거 → drop (운영 메모 필요시 별도 필드) |
| `listingId` | 0 | listParticipants, CSV | **A** | read/CSV컬럼 제거 → drop |
| `customerConversionStatus` | none=1 | getFunnel, listParticipants, CSV, supplier funnel | **A**(또는 C 검토) | 퍼널 집계/필터/CSV 제거 → drop. (운영 상태 필요시 `participantProcessingStatus` 재정의=C, 그러나 content-only엔 불필요) |
| `customerConversionAt` | 0 | listParticipants | **A** | read 제거 → drop |
| `customerConversionNote` | 0 | listParticipants | **A** | read 제거 → drop |
| `productId` | 0 | 생성·상세·제품참조 display | **B** | **legacy nullable 유지** — content 소재 표시 참조, 전환 아님. 신규 사용 정책만 문서화. drop 비권장 |

> **D(유지 불가/명확 충돌)** = 매장 도입/첫 주문/상품 전환/OPL 진열 등 **의미·기능** — 이미 P0/P1에서 차단·비노출. 본 IR은 그 잔존 **컬럼**의 처리이며, 컬럼 자체는 위 A/B로 수렴.

---

## 5. 권장 후속 WO (순서)

순수 `DROP COLUMN` 한 방이 아니라, **활성 read 정리 → 컬럼 drop** 2단계로 분리해야 안전하다.

```
P3-2a) WO-O4O-MARKET-TRIAL-CONVERSION-READ-WIRING-CLEANUP-V1  (코드, migration 없음)
  - backend: getFunnel 의 conversionDistribution/convertedProduct* 반환 제거,
             listParticipants/exportParticipantsCSV 의 listingId/customerConversion* SELECT·컬럼 제거,
             toOperatorTrialDTO/toSupplierTrialDTO 의 convertedProduct*/conversionNote 반환 제거,
             supplier funnel(customerConversionStatus 집계) 제거
  - frontend: trial.ts 타입(Trial/OperatorTrial/TrialParticipant/TrialFunnel)에서 해당 필드 제거
             + 게이트된 잔존 UI(conversion 컬럼/필터 type/매장진열 KPI) 물리 제거 + SHOW 플래그 정리
  - entity: 아직 컬럼 유지(다음 단계에서 drop) — 또는 read 제거와 동시에 entity field 제거+migration까지 묶을지 결정
  - typecheck PASS 필수

P3-2b) WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1  (migration)
  - entity field 제거 + DROP COLUMN: convertedProductId, convertedProductName, conversionNote,
                                      listingId, customerConversionStatus, customerConversionAt, customerConversionNote
  - 사전 실측 재확인(전부 0/null/none) + settlement/payment 미변경
  - productId 는 제외(B)

P3-2c) WO-O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1  (문서/경량)
  - productId = content 소재 참조로 유지. 신규 펀딩 생성 시 사용 정책(선택 입력/표시 한정) 명문화. drop 안 함.

(별도) WO-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1
  - settlement/payment 는 삭제 대상 아님 — 오프라인 입금·펀딩 정산 운영 기록으로 유지·정책 문서화.
```

> **주의**: P3-2a/b를 한 WO로 묶어도 되나(read 제거 + entity 제거 + drop을 한 커밋에 정합되게), 그 경우 getFunnel/KPI 응답 shape 변경 + 게이트 UI 물리 제거가 동반되어 범위가 큼. 안전하게 2단계 분리 권장.

---

## 6. 검증 기준 (WO §13 충족)
```
productId 사용처 조사 — ✅ (§2: 생성/상세/제품참조 display, 전환 아님)
convertedProduct* 사용처 — ✅ (getFunnel/상세 DTO 활성 read)
listingId 사용처 — ✅ (listParticipants/CSV 활성 read)
customerConversion* 사용처 — ✅ (getFunnel/listParticipants/CSV/supplier funnel)
getFunnel/getTrialKpi 영향 — ✅ (§3 Q7: conversionDistribution/convertedProduct* 응답 변경)
frontend 렌더/필터/타입 영향 — ✅ (전부 게이트/타입전용, trial.ts 타입 cascade)
실측 SQL 결과 포함 — ✅ (§1)
컬럼별 A/B/C/D 분류 — ✅ (§4)
settlement/payment 비대상 명시 — ✅ (보존, 별도 정책 WO)
후속 WO 분기 제안 — ✅ (§5)
코드/DB/API/UI 무변경, 문서만 — ✅
```

---

## 7. 최종 판단

```
유통참여형 펀딩 core 전환 컬럼 8개는 데이터가 전부 비어 있고(0/null/none) 프론트는 게이트되어 있으나,
backend 활성 read(getFunnel·listParticipants·exportParticipantsCSV·상세 DTO·supplier funnel) 때문에
"코드 변경 없는 즉시 DROP COLUMN"이 가능한 컬럼은 없다.

즉시 drop 가능 항목: 없음 (전부 활성 read 선정리 필요).
read-wiring 정리 후 drop 권장: convertedProductId/Name, conversionNote, listingId,
                              customerConversionStatus/At/Note (7개).
legacy nullable 유지: productId (content 소재 참조 — 전환 아님, drop 비권장).
content-only 운영 상태 재정의(선택): customerConversionStatus → participantProcessingStatus (불필요 시 제거).
settlement/payment 컬럼: 펀딩 운영 기록으로 보존 — 이번 cleanup 대상 아님.

→ 안전 순서: P3-2a(활성 read/타입/게이트 UI 정리) → P3-2b(7컬럼 DROP) → P3-2c(productId 정책).
```

---

*Date: 2026-06-19 · read-only IR · 코드/DB/API/UI 무변경 · 결론: 즉시 drop 가능 컬럼 0(전부 backend 활성 read), read 정리 후 7컬럼 drop / productId 유지(B) / settlement·payment 보존. 후속 P3-2a→2b→2c 분리.*
