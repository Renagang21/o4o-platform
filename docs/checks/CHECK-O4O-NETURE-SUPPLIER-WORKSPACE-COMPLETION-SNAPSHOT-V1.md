# CHECK-O4O-NETURE-SUPPLIER-WORKSPACE-COMPLETION-SNAPSHOT-V1

> **유형**: 완료 상태 스냅샷 (문서 전용 — 코드/DB/API/UI/route 변경 없음)
> **일자**: 2026-06-08
> **목적**: Neture 공급자 workspace 정비 누적 작업의 현재 완료 상태를 공식 기준으로 고정하고, 남은 GAP/RISK 와 후속 우선순위를 정리한다.
> **성격**: 추가 구현 아님. 발견된 문제는 수정하지 않고 GAP/RISK/NEXT 로 기록.

---

## 1. 요약 판정

**Neture 공급자 workspace 의 핵심 라인(제품 등록 → 유형/규제 정책 → 대량 등록 → 후보 검토 → 이벤트오퍼 → 펀딩 → 배송 정책 → 배송비 계산 → 주문 통합 보기 → fulfillment 정상화)은 V1 범위에서 PASS 로 닫혔다.** 남은 것은 "누락"이 아니라 ① 무료배송 UI 의 타 서비스 확장 ② 이벤트오퍼 주문의 fulfillment/정산 통합 ③ 배송정책 미설정 운영 주의 ④ OTC store-type guard 의 구조 부재 — 4개의 후속 영역이다.

| 영역 | 판정 |
|------|:----:|
| 제품 등록 IA | 🟢 PASS |
| 제품 유형/의약품 정책 | 🟢 PASS (OTC store-type guard 만 DEFER) |
| 등록 도우미 정비 | 🟢 PASS |
| 대량 등록 | 🟢 PASS |
| 운영자 후보 검토 | 🟢 PASS |
| 이벤트 오퍼 연결 | 🟢 PASS |
| 유통참여형 펀딩 연결 | 🟢 PASS |
| 배송 정책 저장 | 🟢 PASS |
| 배송비 계산 V2 | 🟡 CONDITIONAL PASS (fallback 0원 운영 주의) |
| 주문·배송 workspace | 🟢 PASS (legacy 500 수정 완료) |
| 주문 원장 경계 | 🟢 PASS(near-term) / ◻ DEFER(long-term convergence) |
| 통합 주문 보기 | 🟡 CONDITIONAL PASS (실데이터 0건, fulfillment 통합 미포함) |
| 무료배송 progress UI | 🟡 CONDITIONAL PASS (KPA 단독, 실데이터 미확인) |

---

## 기준 커밋 (repository log 실측, 2026-06-08)

| 작업 | 커밋 | 비고 |
|------|------|------|
| REGISTRATION-IA-V1 | `6b51ac092` | 제품 등록 IA 1차(유형-우선+메뉴 재구성) |
| WIZARD-V2 | `603000452` | 등록 wizard 유형별 UX 분기 |
| OFFER-MODE-SELECTION-V1 | `add76ebba` | 제품 목록 후속 활용 액션 분기 |
| WORKSPACE-PREFILL-V1 | `d2d3cf179` | 제품→이벤트/펀딩 진입 prefill |
| DRUGCATEGORY-EXPOSURE-V1 | `541625d90` | 제품 목록 drugCategory 노출 |
| EVENT-BINDING-V2 | `de1efaae8` | 이벤트오퍼 선택 상품 바인딩(펀딩 IR 분리) |
| MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1 | `20a2c2f53` | 펀딩 ProductMaster 참조 저장 |
| MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2 | `4c28b64c7` | 펀딩 연결 제품 표시 |
| BULK-UPLOAD-TEMPLATE-V1 | `deaf3c7f5` | 유형별 CSV 템플릿 |
| SUPPLIER-WORKSPACE-FULL-AUDIT-V1 | `98f8d3685` | 전면 감사 IR |
| MENU/ASSISTANT IA CLEANUP | `2c1f90863` | 메뉴/등록 도우미 IA 정비 |
| BULK-UPLOAD-PARSE-V2 | `2c6271467` | CSV 저장 전 검증·미리보기 |
| BULK-UPLOAD-SAVE-V3 | `21336b062` | 검증 row → ProductCandidate 저장 |
| BULK-OPERATOR-REVIEW-V4 | `3cea63bae` | 후보 검토 표시 정렬 |
| OTC-PHARMACY-SUPPLY-GATE-V1 | `1179fc611` | OTC 약국 공급 gate + Rx 차단 |
| SHIPPING-SETTING-FOUNDATION-V1 | `f8066c4f0` | 배송 정책 저장(design IR `7d693b850`) |
| ORDER-FULFILLMENT-WORKSPACE-DESIGN-V1 | `f2c54a503` | 주문·배송 workspace 설계 IR |
| ORDER-WORKSPACE-IA-LINK-V1 | `e2679a620` | workspace 진입 IA 연결 |
| ORDER-TABLE-BOUNDARY-DESIGN-V1 | `7eebbbbde` | 주문 원장 경계 IR |
| SHIPPING-CALCULATION-V2 | `ebb4454e0` | 배송비 계산(CHECK `dff5f5955`) |
| ORDER-UNIFIED-VIEW-V1 | `293a63399` | 통합 주문 보기(fix `1529b4b7a`, CHECK `98d7e70cb`) |
| FULFILLMENT-LEGACY-SCHEMA-FIX-V1 | `0840d20ca` | fulfillment 500 수정(CHECK `58795aab3`) |
| FREE-SHIPPING-PROGRESS-UI-V1 | `810fab2cf` | KPA 무료배송 안내(CHECK `106356007`) |

> sync: `origin/main` 과 동기화 상태(ahead 0 / behind 0, 본 CHECK 작성 시점).

---

## 2. 제품 등록 IA 완료 상태 — 🟢 PASS
유형-우선 진입 + 단일/대량 분기 + 유형별 Wizard 안내 + 완료 후 후속 활용 액션이 공급자 관점에서 사용 가능. (`6b51ac092`, `603000452`, `add76ebba`)
- **NEXT**: 기존 일부 route/helper 가 유형-우선 IA 를 우회하는지 추적 점검(경미).

## 3. 제품 유형/의약품 정책 — 🟢 PASS (OTC guard 만 DEFER)
비의약품/의약외품/비처방(OTC)/처방(Rx)/미분류 5분류. OTC=약국 공급 후보 안내, Rx=검토 전용·공급 차단, drug_unspecified=분류 필요, DRUG 계열 이벤트/펀딩 자동 연결 차단, Rx lot/expiry/serial 미수집. (`1179fc611`, `541625d90`, `b6f043878`)
- **DEFER**: OTC **비약국** listing 차단은 pharmacy/store-type 모델 부재로 V2 보류(아래 §14-5).

## 4. 등록 도우미 정비 상태 — 🟢 PASS
도우미가 자동 등록이 아닌 **초안 생성 보조**로 안내, 유형 선택 후 분석 정렬, 결과가 정식 Wizard 로 인계, Rx/OTC 경고 표시. (`2c1f90863`)

## 5. 대량 등록 완료 상태 — 🟢 PASS
유형별 템플릿 → CSV 검증·미리보기 → 서버 저장 전 재검증 → **ProductCandidate 후보 저장**. ProductMaster/SupplierOffer 직접 생성·기존 applyBatch 미사용. (`deaf3c7f5`, `2c6271467`, `21336b062`)

## 6. 운영자 후보 검토 상태 — 🟢 PASS
bulk 출처/CSV row/productType·regulatoryType·drugCategory/rawPayload 요약 표시, 기존 manual match/reject/archive/link/refine 액션 유지, ProductMaster 자동 생성 없음. (`3cea63bae`, `dbb624184`)

## 7. 이벤트 오퍼 연결 상태 — 🟢 PASS
제품 목록 → 이벤트 오퍼 생성 진입(prefill context), SPO 자동 선택, 원본 상품 가격/정보 미변경, 이벤트 가격은 이벤트 조건으로만 저장, Neture 자체는 이벤트오퍼 serviceKey 아님. (`d2d3cf179`, `de1efaae8`)

## 8. 유통참여형 펀딩 연결 상태 — 🟢 PASS
제품 목록 → 펀딩 생성 진입, `MarketTrial.productId` 에 ProductMaster **soft 참조**, 공급자/운영자 화면에 연결 제품 표시, 원본 가격/정보 미복제, trialUnitPrice/targetAmount 는 펀딩 자체 조건, **펀딩은 주문/배송 대상에서 구조적 제외**. (`20a2c2f53`, `4c28b64c7`)

## 9. 배송 정책 저장 상태 — 🟢 PASS
`NetureSupplier` 에 baseShippingFee / freeShippingThreshold / averageDispatchDays / returnExchangeNotice + shippingStandard/island/mountain read/write, SupplierProfilePage 배송 정책 섹션. 모든 필드 nullable·backfill 없음. (`f8066c4f0`)

## 10. 배송비 계산 상태 — 🟡 CONDITIONAL PASS
공통 helper `calculateSupplierShippingFee`, checkout.service `shippingFee=0` 제거, event-offer.service shippingPolicy 주입, neture.service 고정식(>=5만/3000) 제거, **fallback=정책 없으면 0원**. (`ebb4454e0`, CHECK `dff5f5955`)
- **RISK(운영 주의)**: 공급자 배송정책 **미설정 시 배송비 0원** → 정책 입력 유도 필요(§14-4, 후속 3순위).

## 11. 주문·배송 workspace 상태 — 🟢 PASS
`/supplier/orders` 집계 허브 + `/account/supplier/orders` fulfillment workspace CTA, 기존 상태변경/송장/배송완료 유지. **legacy schema 500 수정 완료** — `GET /supplier/orders`·`/kpi` 정상(smoke PASS). (`e2679a620`, `f2c54a503`, `0840d20ca`, CHECK `58795aab3`)

## 12. 주문 원장 경계 상태 — 🟢 PASS(near-term) / ◻ DEFER(long-term)
`neture_orders`=공급자 fulfillment 원장, `checkout_orders`=결제·서비스·이벤트오퍼 주문 원장. near-term **역할 분리 유지** 확정. long-term checkout_orders canonical convergence 는 **거버넌스 결정(DEFER)**. (`7eebbbbde`)

## 13. 통합 주문 보기 / KPA 무료배송 progress UI 상태
### 13-1. 통합 주문 보기 — 🟡 CONDITIONAL PASS
`/supplier/orders` 통합 섹션, neture_orders+checkout_orders supplierId 기준 **read-only aggregation**, source badge, checkout 읽기전용, neture fulfillment link, schema/migration 없음. (`293a63399`, fix `1529b4b7a`, CHECK `98d7e70cb`)
- **한계**: 프로덕션 주문 0건이라 행 렌더 실데이터 미확인. fulfillment 통합은 미포함(설계상 후속).

### 13-2. 무료배송 progress UI — 🟡 CONDITIONAL PASS
**KPA 이벤트오퍼 detail 화면에만 V1 적용**. `getGroupbuyDetail` shippingPolicy additive, 무료배송 기준/현재 주문금액/남은 금액/충족·미설정 메시지, "이벤트오퍼 상품도 같은 공급자 주문금액 포함" 안내. Glyco/KCos/web-neture cart 제외(공통화 세션 후 후속). (`810fab2cf`, CHECK `106356007`)
- **한계**: production active KPA event offer 0건 → 실데이터 렌더 시각 smoke 미완(SQL 실행·타입·배포는 검증).

---

## 14. 남은 GAP/RISK

| # | 항목 | 분류 |
|---|------|:----:|
| 1 | Glyco/KCos/web-neture cart 무료배송 progress UI 미적용 | GAP(의도적 범위 외) |
| 2 | 이벤트오퍼 checkout_orders 의 fulfillment/송장/정산 미통합 | GAP(설계상 후속) |
| 3 | checkout_orders 이벤트오퍼 **정산 공백** (neture_settlement 는 neture_orders delivered 기준) | RISK |
| 4 | 공급자 배송정책 미설정 시 배송비 **0원 fallback** | RISK(운영 주의) |
| 5 | OTC **비약국** listing guard — store-type 모델 부재로 V2 defer | DEFER |
| 6 | long-term checkout_orders canonical convergence 미결정 | DEFER(거버넌스) |
| 7 | production active KPA event offer 부재 → 무료배송 안내 실데이터 시각 smoke 미완 | RISK(검증 한계) |

---

## 15. 다음 후속 작업 우선순위

1. **WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-CROSSSERVICE-V2** — Glyco/KCos 공통화 세션 정리 후, web-neture cart 포함 여부 별도 판단, 가능하면 `@o4o/ui` 공통 helper/component 화.
2. **IR/WO-O4O-NETURE-EVENT-OFFER-SUPPLIER-FULFILLMENT-INTEGRATION-V1** — checkout_orders 이벤트오퍼 주문을 실제 배송/송장/정산으로 편입 필요가 명확해질 때. 상태/정산 경계 재확인 선행.
3. **WO-O4O-NETURE-SUPPLIER-SHIPPING-POLICY-ONBOARDING-NOTICE-V1** — 배송정책 미설정 0원 fallback 에 대한 공급자/운영자 입력 유도 안내.
4. **IR-O4O-STORE-TYPE-MODEL-FOR-OTC-LISTING-GUARD-V1** — OTC 비약국 listing 차단을 위한 pharmacy/store type 모델 설계.

---

## 16. 이번 CHECK에서 수정하지 않은 것
코드/API/UI/route/DB migration **무변경**. 배송 계산·주문 통합·이벤트오퍼 fulfillment·무료배송 UI 확장 **없음**. 다른 세션 WIP(guide/commonization 등) **무접촉**. 문서만 작성.

---

*Neture 공급자 workspace 누적 완료 상태 스냅샷. 구현 추가 아님 — 기준점 고정용.*
