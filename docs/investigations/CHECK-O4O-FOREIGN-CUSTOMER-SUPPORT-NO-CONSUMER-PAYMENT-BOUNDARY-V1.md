# CHECK-O4O-FOREIGN-CUSTOMER-SUPPORT-NO-CONSUMER-PAYMENT-BOUNDARY-V1

> **외국인 고객 응대 기능의 경계를 고정한다.**
> 이 문서는 정체성·경계를 고정(freeze-intent)하는 CHECK 이며, 코드/API/DB/UI/schema/migration 변경은 포함하지 않는다.

상태: **CLOSED / PASS**
일자: 2026-06-23

---

## 0. 기준 (전제)

```
현재 O4O 에는 소비자 결제가 없다.
외국인 고객 응대 기능은 매장에서 외국인 고객에게 상품 정보를 보여주는 콘텐츠 응대 기능이다.
관광객 모바일 앱 · 직접 주문 · 소비자 결제 · 숙소 배송 결제는 후속 별도 축이다.
```

본 CHECK 는 이 전제가 흐트러지지 않도록(=결제/관광객 앱/자동 주문으로 번지지 않도록) 경계를 명문화한다.

---

## 1. 현재 기능의 정체성 (FROZEN)

```
외국인 고객 응대 기능
= 다국어 상품 안내 콘텐츠를 QR / URL / 태블릿으로 "보여주는" 기능
```

**포함 범위:**

| 항목 | 설명 |
|------|------|
| 다국어 상품 안내 콘텐츠 | 운영자 작성 → Store Hub 게시 자료 |
| Store Hub 가져오기 | 매장 전용 사본 생성(가져오기=복사) |
| 매장 취급 상품 연결 | targetKind=local |
| O4O 주문 가능 상품 연결 | targetKind=listing |
| 고객용 URL | public landing 링크 |
| QR 보기 | landing URL 의 QR(backend SVG) |
| 태블릿 보기 | `?mode=tablet` 매장 응대 화면 |
| public landing | 무인증 고객 열람(published page, locale fallback) |

이 기능의 동사는 **"보여준다(display)"** 이며, "판매한다/결제한다/주문받는다" 가 아니다.

---

## 2. 결제와의 분리 (FROZEN)

**명확히 제외(현재 미제공):**

```
소비자 결제 없음
관광객 앱 결제 없음
자동 주문 없음
배송비 결제 없음
Toss 소비자 결제 없음
```

**혼동 금지 — 두 결제는 다른 축이다:**

| 축 | 대상 | 성격 | 외국인 응대와의 관계 |
|----|------|------|----------------------|
| store-owner 구독/서비스 이용료 결제 | 매장 경영자(B2B) | 매장이 서비스를 쓰기 위한 이용료 | **별개** — 외국인 고객 응대 기능과 무관 |
| 외국인 고객 소비자 결제 | 최종 고객(B2C) | 고객이 상품값을 지불 | **현재 없음** — 후속 별도 축 |

> 즉, 플랫폼에 결제(예: store-owner 구독)가 존재하더라도, 그것은 **외국인 고객 소비자 결제가 아니다.**
> 외국인 고객 응대 기능은 어떤 결제 흐름과도 연결되어 있지 않다.

---

## 3. 매장 운영 흐름 (FROZEN)

```
외국인 고객은 QR 또는 태블릿으로 상품 정보를 확인한다.
구매 의사가 있으면 매장 직원이 기존 매장 판매 / 상담 / 주문 방식으로 처리한다.
O4O 는 현재 고객에게 직접 결제를 받지 않는다.
```

- 콘텐츠 기능은 **고객 이해를 돕는 응대 보조**에서 끝난다.
- 그 다음(구매·결제·정산)은 **매장의 기존 오프라인 방식**으로 처리하며 O4O 의 외국인 응대 기능 범위 밖이다.

---

## 4. 후속 확장 후보 (별도 축으로 보류)

아래는 본 기능의 자연스러운 확장이지만, **현재 기능에 포함되지 않으며 별도 축/별도 WO·IR 로만 검토**한다.

```
관광객 모바일 앱
외국인 고객 직접 주문
소비자 결제
숙소 배송 요청
다국어 주문 / 상담 흐름
외부몰 주문 대응
```

이들 중 어떤 것도 "외국인 고객 응대 = 콘텐츠 표시" 정체성을 변경하지 않는다. 도입 시 새로운 축으로 선언한다.

---

## 5. 완료된 관련 산출물 (참조)

| 산출물 | 문서/WO |
|--------|---------|
| KPA 다국어 상품 콘텐츠 파일럿 | HUB-FLOW / BADGES / QR-LANDING / LISTING-QR / TABLET-CONTENT WO 일습 |
| KPA 파일럿 closure | [[CHECK-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-PILOT-CLOSURE-V1]] |
| QR / public landing | WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1 |
| 태블릿 보기 | WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1 |
| 상품 연결 배지 | WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1 |
| Neture 외국인 고객 응대 가이드 | [[CHECK-O4O-NETURE-GUIDE-FOREIGN-CUSTOMER-SUPPORT-V1]] (`/guide/foreign-customer-support`) |

---

## 6. 성공 기준 대비

| 기준 | 충족 |
|------|------|
| 외국인 고객 응대 기능이 "콘텐츠 표시/매장 응대 기능"으로 고정됨 | ✅ §1 |
| 소비자 결제/관광객 앱/자동 주문과 분리됨 | ✅ §2·§3·§4 |
| store-owner 구독 결제와 소비자 결제가 혼동되지 않음 | ✅ §2 표 |
| 향후 모바일 앱 결제는 별도 축으로 남음 | ✅ §4 |

---

## 7. 판정

외국인 고객 응대 기능은 **콘텐츠 표시/매장 응대 기능**으로 경계가 고정되었다.
소비자 결제·관광객 앱·자동 주문과 분리되며, 향후 확장은 별도 축으로만 도입한다.

본 CHECK 가 닫힌 뒤에야 GP/KCos 공통화 IR(`IR-O4O-MULTILINGUAL-PRODUCT-CONTENT-CROSS-SERVICE-ADOPTION-V1`)로 진행한다.

**CHECK-O4O-FOREIGN-CUSTOMER-SUPPORT-NO-CONSUMER-PAYMENT-BOUNDARY-V1 → CLOSED / PASS**
