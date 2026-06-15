# IR-O4O-B2B-REGISTRATION-MODEL-DECISION-V1

> **유형**: Policy IR (read-only) — "B2B 등록"의 모델 결정. 코드/DB/route/UI **무변경**.
> **결정 질문**: B2B 를 **(1) 기본 공급 오퍼의 사업자용 콘텐츠 측면(현행)** 으로 유지할지, **(2) 독립 B2B 채널/listing/구매자 목록**을 신설할지.
> **권고: (1) 유지 — O4O 는 본질적으로 B2B(서비스 매장이 구매자). "B2B 등록" = 기본 오퍼에 사업자용 설명 보완. 독립 채널은 가격 차등 요구가 확정되기 전까지 보류.**
> **선행**: `IR-O4O-SUPPLIER-PRODUCT-SERVICE-REGISTRATION-TYPE-AUDIT-V1`(cab35f345) · 2026-06-15

---

## 1. 결정이 필요한 이유

제품 목록에 "B2B 등록" action 을 붙이기 전, B2B 가 **독립 등록 유형**인지 **기본 오퍼의 한 측면**인지 정해야 한다. 잘못 잡으면 가격/주문/listing 구조와 충돌한다.

## 2. 현재 상태 (감사 IR 근거)

- B2B = `SupplierProductOffer.businessShort/DetailDescription` **콘텐츠 편집 전용**(`SupplierB2BContentPage` + `B2BContentDrawer`, `PATCH /supplier/products/:id/business-content`).
- **채널/서비스/store 연결 없음 · OPL 생성 없음 · 구매자(약국/매장) B2B 전용 목록 UI 없음.**
- 실질 "B2B 공급가" = `offer.priceGeneral`(기본 공급가, 주문 적용). 즉 **B2B 는 이미 기본 오퍼 그 자체** + 사업자용 설명.
- 구매자 흐름: 서비스 매장은 **SERVICE distribution + OPL** 로 제품을 받아 주문(= 이미 B2B 거래). 별도 B2B 채널 없이도 사업자 간 거래가 성립.

## 3. 옵션

### 옵션 1 — B2B = 기본 오퍼의 사업자용 측면 (권장)
- "B2B 등록" = 기본 공급 오퍼에 `businessShort/DetailDescription` + (가격 IR 결정 시) B2B 가격을 채우는 것. 신규 테이블/채널 없음.
- 구매자: 기존 SERVICE→OPL 경로로 매장이 주문(B2B 본질).
- 장점: 구조 추가 0, freeze 정합, 현행 자산 재사용. 단점: "B2B 전용 카탈로그" 같은 독립 노출은 없음(필요성 미확정).

### 옵션 2 — 독립 B2B 채널/listing 신설
- B2B 전용 listing + 가격 + 구매자 브라우즈 UI 신설.
- 장점: B2C/B2B 명확 분리, B2B 전용 가격/노출. 단점: OPL/distributionType/가격 freeze 와 중복·충돌 위험, 대규모 신규. **가격 차등 요구(가격 IR)가 확정돼야 의미.**

## 4. 권고

**옵션 1.** 근거: ① O4O 는 공급자→서비스 매장의 **B2B 플랫폼**이고, SERVICE distribution+OPL 이 이미 사업자 간 유통을 수행. ② B2B 를 독립 채널로 분리하는 실익은 **B2B 전용 가격/노출이 필요할 때** 생기는데, 그 결정은 **가격 IR**(IR-O4O-CHANNEL-PRICING-POLICY-REVISIT-V1)에 종속. ③ 따라서 지금은 "B2B 등록 = 기본 오퍼의 사업자 설명 보완(+추후 B2B 가격)"으로 두고, 독립 채널은 **가격 정책 확정 후 재판단**.

## 5. 결정 후 영향 (구현 WO 예고)
- 옵션 1 채택 시: 제품목록 "B2B 등록" action 은 `SupplierB2BContentPage`(기존)로 연결 — 신규 거의 없음. 가격 차등은 가격 IR 결과 반영.
- 옵션 2 채택 시: 별도 대형 WO(B2B listing/price/browse) — 가격 IR 선행 필수.

## 6. 비목표 / 제약
- 코드/DB 무변경. businessShort/DetailDescription 구조·`/business-content` API 변경 금지. 구매자 주문 경로(OPL/checkout) 변경 금지.

## 7. 결정 필요
> **B2B 를 (1) 기본 오퍼 측면 유지 / (2) 독립 채널 신설 중 무엇으로 할지.** (권고: 1, 가격 IR 결과에 따라 재검토)

---

*Date: 2026-06-15 · Policy IR · B2B = 현행 콘텐츠 전용. O4O 는 본질 B2B(SERVICE+OPL 이 사업자 유통 수행) → (1) 기본 오퍼 측면 유지 권고, 독립 채널은 가격 IR 후 재판단. 코드 무변경.*
