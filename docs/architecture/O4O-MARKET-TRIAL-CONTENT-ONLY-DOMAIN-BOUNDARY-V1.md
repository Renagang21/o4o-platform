# O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1

> **유형**: Architecture / Domain Boundary (canonical 기준 문서) — 유통참여형 펀딩(내부 코드명 Market Trial)의 도메인 경계 확정.
> **성격**: 본 WO 는 **문서 저장 전용**이다. 코드/DB/migration/API/UI **무변경**.
> **WO**: `WO-O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1`
> **작성일**: 2026-06-19
> **상태**: Active — 향후 유통참여형 펀딩 관련 모든 구현·정정의 기준 문서.

---

## 0. 한 문장 정의 (최종 고정)

```
유통참여형 펀딩은 기존 제품을 불러오는 기능이 아니며,
O4O 주문·결제·정산·발송으로 이어지는 커머스 기능도 아니다.

유통참여형 펀딩은 공급자가 신규 제품 또는 신규 유통안을 콘텐츠로 소개하고
참여 의향을 확인하는 Neture 전용 콘텐츠형 모집 기능이다.

O4O는 콘텐츠 편집기, 게시 관리, 참여 신청, 참여 현황 확인까지만 제공한다.
펀딩 이후의 실제 거래, 가격 협의, 발송, 정산은 공급자가 O4O 외부에서 처리할 수 있다.
```

---

## 1. 목적

본 문서는 유통참여형 펀딩(Market Trial)의 **도메인 경계를 content-only 로 확정**하고, 향후 개발 기준을 고정한다.

기존 개발 방향은 "기존 제품을 불러와 펀딩을 생성하고, 펀딩 성공 후 O4O 주문 가능 상품으로 전환한다"는 **제품 기반·커머스 연동 모델**로 잡혀 있었다. 본 문서는 이 전제를 **폐기**하고, 유통참여형 펀딩을 **신규 제품·신규 유통안을 콘텐츠로 소개하고 참여 의향을 확인하는 콘텐츠형 모집**으로 재정의한다.

> **이 문서는 단순 조사 결과가 아니라, 이미 코드에 배선된 "제품 전환 퍼널" 모델을 폐기하고 content-only 로 방향을 확정하는 상위 제품 결정이다.** (아래 §3, §12 참조)

---

## 2. 핵심 결론

유통참여형 펀딩은 **O4O 상품 판매 기능이 아니다.** 다음 성격의 기능이다.

```
신규 제품 또는 신규 유통안을 콘텐츠로 소개
참여 의향 또는 참여 수량 확인
공급자가 시장 반응을 확인
Neture 내부에서만 운영
O4O 주문·결제·정산·발송과 분리
```

O4O 는 유통참여형 펀딩에 대해 **편집기와 참여 관리 기능만** 제공한다.

---

## 3. 이 결정이 답하는 상위 미결정 (Context)

선행 IR `IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1` (2026-06-12) 는 다음을 **제품 오너 결정 대기**로 남겼다(§8·§9·§10):

> "유통참여형 펀딩 = Neture 전용"이 **참여 매장 도입 / 첫 주문 추적까지 배제**하는지 제품 차원 확정이 선행되어야 한다. 배제가 맞으면 A(전환 중단), 포함이면 정책 자체를 정정.

**본 문서가 그 답이다: 배제(content-only) 로 확정한다.**

따라서 현재 코드에 활성 배선된 다음 흐름은 **유통참여형 펀딩 V1 범위에서 제외**되며, 후속 구현 WO 에서 비활성/제거 대상이다(본 WO 에서는 코드 변경 없음 — §16~§17).

```
convertedProductId(=SupplierProductOffer.id) → createListingFromParticipant → OrganizationProductListing(source_type='market_trial')
checkout.service.ts tryConnectOrderToTrial (참여 매장 주문 → first_order 자동 승격)
오프라인 정산 ledger (choice_completed → offline_review → offline_settled)
trial-fulfillment / trial-shipping (보상·샘플 배송, 배송지)
operator/supplier 대시보드 "매장 진열(storeListings)" KPI
```

---

## 4. 반드시 제거해야 할 잘못된 전제

다음 전제는 폐기한다.

```
기존 제품을 선택해서 펀딩을 생성한다.
ProductMaster를 불러와 펀딩을 만든다.
SupplierProductOffer를 기반으로 펀딩을 만든다.
상품 상세 drawer에서 유통참여형 펀딩을 시작한다.
펀딩 성공 후 O4O 상품으로 자동 전환한다.
펀딩 성공 후 O4O 주문/결제/정산/발송으로 연결한다.
```

이 설계는 유통참여형 펀딩의 실제 운영 목적과 맞지 않는다.

---

## 5. 올바른 정의

```
유통참여형 펀딩은 공급자가 신규 제품 또는 신규 유통안을 콘텐츠로 소개하고,
참여 의향을 확인하기 위한 Neture 전용 콘텐츠형 모집 기능이다.
O4O는 상품화, 주문, 결제, 정산, 발송을 담당하지 않는다.
```

---

## 6. 제품 DB와의 관계 (비의존 원칙)

유통참여형 펀딩은 제품 DB 와 **직접 연결하지 않는다.** 다음 엔티티와 기본적으로 무관해야 한다.

```
ProductMaster
SupplierProductOffer
ProductApproval
OrganizationProductListing
StoreProductProfile
StoreLocalProduct
Order (checkout_orders)
Payment (o4o_payments)
Settlement
Shipment
```

펀딩 생성 시점에는 정식 제품 정보가 없을 수 있다. 따라서 **ProductMaster ID 또는 SupplierProductOffer ID 를 필수로 요구하면 안 된다.**

---

## 7. O4O가 제공할 범위

O4O 는 다음 범위까지만 제공한다.

```
펀딩 콘텐츠 작성 편집기
제목/요약/본문 입력
대표 이미지 등록 · 상세 이미지 등록 · 첨부파일 등록
임시저장 · 미리보기 · 게시 요청
운영자 검수 · 게시 승인/반려 · 비공개 처리
참여 신청 · 참여 수량 또는 참여 조건 입력
참여자 목록 확인
공급자용 참여 현황 확인 · 운영자용 참여 현황 확인
마감 상태 관리
```

O4O 의 역할은 **콘텐츠 제작 대행이 아니라, 콘텐츠를 등록하고 참여를 관리할 수 있는 운영 환경 제공**이다.

---

## 8. O4O가 제공하지 않을 범위

```
AI 자동 콘텐츠 작성 · 마케팅 문구 자동 생성 · 제품 상세 자동 생성 · 전문 콘텐츠 제작 지원
ProductMaster 자동 생성 · SupplierProductOffer 자동 생성
상품 승인 흐름 자동 연결 · O4O 주문 가능 상품 자동 등록
장바구니 연결 · 결제 연결 · 정산 연결 · 배송/발송 관리 연결
펀딩 가격을 상품 가격 이력으로 저장
펀딩 결과를 정식 상품 판매 데이터로 전환
```

---

## 9. 콘텐츠 제작에 대한 기준

유통참여형 펀딩 콘텐츠는 O4O 가 대신 만들어 주지 않는다. 이유:

```
펀딩 콘텐츠는 참여 성과에 직접 영향을 준다.
콘텐츠 품질은 공급자 또는 전문 제작자의 책임 영역이다.
제품 설명, 이미지, 가격 조건, 참여 조건은 공급자가 직접 조율해야 한다.
전문업체나 담당자가 직접 작성하는 경우가 많다.
O4O가 자동 생성한 콘텐츠로 품질 책임을 지는 구조는 적절하지 않다.
```

따라서 O4O 는 **편집기만** 제공한다.

---

## 10. 펀딩 성공 후 처리 기준

펀딩 성공 후에도 **O4O 내부 상품화 전환을 기본 흐름으로 만들지 않는다.** 다음 흐름은 만들지 않는다.

```
펀딩 성공
→ ProductMaster 생성 → SupplierProductOffer 생성 → 상품 승인
→ 주문 가능 상품 등록 → O4O 주문 → O4O 결제 → O4O 정산 → O4O 발송 관리
```

이 흐름은 유통참여형 펀딩 V1 범위에서 **제외**한다.

---

## 11. 펀딩 이후 실제 운영 방식

펀딩 종료 후 실제 거래·가격 협의·발송·정산은 **공급자가 O4O 외부에서 처리**할 수 있다.

```
참여자 목록 확인 · 참여 수량 확인 · 참여 조건 확인
개별 안내 · 외부 주문 접수 · 외부 입금 또는 별도 정산 · 공급자 직접 발송
```

O4O 는 이 과정에 주문·결제·정산·배송 데이터로 **개입하지 않는다.**

---

## 12. 가격 흔적을 남기지 않는 설계

유통참여형 펀딩에서는 가격 정보가 민감할 수 있다. 공급자는 다음 이유로 O4O 내부에 가격 흔적을 남기고 싶어 하지 않을 수 있다.

```
테스트 가격이 정식 공급가처럼 남는 부담
초기 특가 조건이 향후 거래에 영향을 줄 가능성
거래처별 협상 가격이 노출될 우려
O4O 정산 데이터로 가격 이력이 남는 부담
향후 공식 유통가와 다른 기록이 남는 문제
```

따라서 유통참여형 펀딩은 **가격을 정식 상품 가격 이력으로 저장하지 않는다.** 필요한 경우 콘텐츠 안에 "예상 조건", "참여 조건", "별도 안내" 수준으로 표현할 수는 있으나, 이를 O4O **상품 가격 / 주문 가격 / 정산 가격으로 연결하지 않는다.**

---

## 13. 권장 데이터 모델 방향

유통참여형 펀딩은 제품 데이터가 아니라 **콘텐츠/참여 데이터**로 관리한다.

> ⚠️ **기존 테이블과의 관계 (중요)**: 현재 코드에는 이미 `market_trials` / `market_trial_participants` (+ `market_trial_forums`, `market_trial_decisions`, `market_trial_shipping_addresses`, `market_trial_fulfillments`) 가 존재한다. 아래 필드는 **개념적 목표 모델(illustrative)**이며, 후속 구현 WO 는 **새 병렬 테이블을 신설하지 않고 기존 `market_trials`/`market_trial_participants` 를 content-only 축으로 축소·정정**한다. (독립 테이블 신설은 플랫폼 원칙상 금지 — 기존 도메인 재정의로 처리.) `*_shipping_addresses` / `*_fulfillments` 등 커머스·실물 흐름 테이블은 제거/비활성 후보(§17, 후속 WO).

### market_trial_projects (개념 — 기존 `market_trials` 정정 대상)

```
id
supplierId
title
summary
contentBody
coverImageUrl
attachments
status
reviewStatus
publishedAt
recruitmentStartAt
recruitmentEndAt
targetQuantity
expectedConditionText
noticeText
createdBy
createdAt
updatedAt
```

### market_trial_participations (개념 — 기존 `market_trial_participants` 정정 대상)

```
id
marketTrialProjectId
participantUserId
participantOrganizationId
requestedQuantity
memo
status
createdAt
updatedAt
```

**비의존 기준:**

```
productId는 필수 필드가 아니다.
offerId는 필수 필드가 아니다.
orderId는 생성하지 않는다.
paymentId는 생성하지 않는다.
settlementId는 생성하지 않는다.
shipmentId는 생성하지 않는다.
```

---

## 14. 화면 기준

### 공급자 화면

```
유통참여형 펀딩 목록 · 신규 펀딩 콘텐츠 작성 · 임시저장 · 게시 요청
상세 보기 · 수정 · 참여 현황 확인 · 참여자 목록 확인 · 마감 처리
```

예상 경로:

```
/supplier/market-trials
/supplier/market-trials/new
/supplier/market-trials/:id
/supplier/market-trials/:id/edit
```

### Neture 운영자 화면

```
펀딩 콘텐츠 목록 확인 · 상세 검수 · 게시 승인 · 반려 · 비공개 처리
참여 현황 확인 · 마감 상태 확인
```

예상 경로:

```
/operator/market-trials
/operator/market-trials/:id
```

### 참여자 화면

```
펀딩 콘텐츠 확인 · 참여 신청 · 참여 수량 입력 · 참여 메모 입력 · 참여 신청 상태 확인
```

참여자 화면에서 **주문·결제·배송으로 연결하지 않는다.**

---

## 15. Neture-only 경계

유통참여형 펀딩은 **Neture 전용** 기능이다. 다음 서비스의 상품 리스트·주문 가능 상품·내 매장 상품 흐름과 연결하지 않는다.

```
KPA · GlycoPharm · K-Cosmetics
```

특히 다음 위치에 노출하지 않는다.

```
내 매장 상품 리스트 · O4O 주문 가능 상품 리스트
서비스별 상품 상세 drawer · 서비스별 장바구니 · 서비스별 주문 화면 · 서비스별 결제 화면
```

> 본 경계는 선행 `IR-O4O-MARKET-TRIAL-NETURE-ONLY-BOUNDARY-CORRECTION-V1` 의 Neture-only 정책을 **유지·강화**한다. 차이: 선행 IR 은 "참여=사전 모집 / 결제=오프라인 ledger / 전환=SPO→OPL" 기능 정의를 *Neture 안에서는* 유효로 두었으나, **본 문서는 전환·정산·실물 흐름 자체를 V1 범위에서 배제**한다.

---

## 16. 이번 작업(본 WO)에서 한 것

본 WO 는 **문서화와 설계 기준 고정**만 수행한다.

```
유통참여형 펀딩 도메인 경계 문서 작성
기존 제품 기반 설계가 잘못되었음을 명시
ProductMaster/SupplierProductOffer 비의존 원칙 명시
주문/결제/정산/배송 비연결 원칙 명시
O4O 제공 범위를 편집기와 참여 관리로 제한
펀딩 성공 후 제품화 전환 흐름 제외
가격 흔적을 남기지 않는 설계 원칙 명시
Neture-only 경계 명시
```

---

## 17. 이번 작업에서 하지 않은 것 (후속 구현 WO 분리)

```
DB 마이그레이션 · API 구현 · 프론트 구현
상품 전환 기능 제거 · 주문/결제/정산/배송 연동 제거
AI 콘텐츠 생성 기능 구현 · KPA/GP/KCos 화면 연결 제거
```

본 WO 는 **구현 WO 가 아니라 도메인 경계 확정 문서화 WO** 이다. 후속 구현은 별도 WO 로 분리하며, 안전한 순서는:

```
① 본 문서(경계 확정)
② IR — 현재 코드에 남아 있는 "제품 선택 / 제품 기반 펀딩 생성 / 전환 퍼널 / 정산 / 풀필먼트" 흔적 전수 조사
③ WO — content-only 외 흐름(전환·checkout 역연결·정산 ledger·shipping/fulfillment) 비활성/제거
④ WO — 편집기·참여 관리 중심으로 화면·엔티티 정정
```

---

## 18. 검증 기준 (본 문서 확인 항목)

```
유통참여형 펀딩은 기존 제품 기반 기능이 아니라고 명시되어 있다.       → §0, §4, §5
ProductMaster 의존 금지가 명시되어 있다.                            → §6, §13
SupplierProductOffer 의존 금지가 명시되어 있다.                     → §6, §13
O4O 주문/결제/정산/배송 연결 금지가 명시되어 있다.                    → §6, §8, §10
펀딩 성공 후 제품화 전환을 만들지 않는다고 명시되어 있다.             → §3, §10
공급자가 외부에서 실제 거래와 발송을 처리할 수 있다고 명시되어 있다.   → §11
가격 흔적을 남기지 않는 설계 이유가 명시되어 있다.                    → §12
O4O 제공 범위가 편집기와 참여 관리로 제한되어 있다.                   → §7, §8
Neture-only 경계가 명시되어 있다.                                   → §15
```

---

## 19. Supersede / 정합성 노트

본 문서는 다음 선행 문서와의 관계를 명확히 한다.

| 선행 문서 | 본 문서와의 관계 |
|-----------|------------------|
| `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1` | "유통참여형 펀딩 = Market Trial 외부명"은 **유지**. 단 "참여→SPO→OPL 전환 / 오프라인 정산 ledger"는 본 문서가 **V1 범위에서 배제**(supersede). |
| `IR-O4O-MARKET-TRIAL-NETURE-ONLY-BOUNDARY-CORRECTION-V1` | Neture-only 경계 **유지·강화**. |
| `IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1` | backend Neture 경계 조사 결과 **유지**. 전환 OPL·gateway 잔재는 본 문서 기준 **제거 방향**. |
| `IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1` | §8 의 미결정("배제 vs 포함")에 대해 본 문서가 **"배제(content-only)"로 답**. 권고안 **A(전환 중단)** 채택의 정책 근거. |

---

## 20. 최종 고정 문장

향후 유통참여형 펀딩 관련 구현에서 다음 문장을 기준으로 삼는다.

```
유통참여형 펀딩은 기존 제품을 불러오는 기능이 아니며,
O4O 주문·결제·정산·발송으로 이어지는 커머스 기능도 아니다.

유통참여형 펀딩은 공급자가 신규 제품 또는 신규 유통안을 콘텐츠로 소개하고
참여 의향을 확인하는 Neture 전용 콘텐츠형 모집 기능이다.

O4O는 콘텐츠 편집기, 게시 관리, 참여 신청, 참여 현황 확인까지만 제공한다.
펀딩 이후의 실제 거래, 가격 협의, 발송, 정산은 공급자가 O4O 외부에서 처리할 수 있다.
```

---

*Date: 2026-06-19 · 문서 저장 전용 WO · 코드/DB/API/UI 무변경 · 결론: 유통참여형 펀딩 = content-only(편집기+참여 관리), 제품 DB·커머스 비연결, Neture-only. 선행 SPO-OPL 전환 미결정에 "배제(A)"로 답.*
