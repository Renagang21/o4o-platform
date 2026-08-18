# WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1

> **상태**: 실행 중 (Phase B 구현 완료 · Phase C~8 실행 대기) · **작성일**: 2026-08-18
> **선행**: [CHECK-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1](../investigations/CHECK-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1.md) (Phase A · STOP_AT_PHASE_A)
> **결과**: [CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1](../investigations/CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1.md)

## 0. 실행 지시

즉시 실행한다.

중간 승인 없이
조사 → 최소 구현 → 실제 Cafe24 연결 → 상품 census →
ProductMaster 매칭 실측 → CHECK → commit → push
까지 진행한다.

단, 아래 중지조건 발생 시 추측 구현하지 않는다.

---

## 1. 목표

Phase A에서 확인된 구조적 중지사항 중
Cafe24 실상품 데이터를 확보하기 위해 필요한 부분만 해결한다.

이번 작업 범위:

Cafe24 OAuth
→ mall 연결
→ 실제 상품 조회
→ 상품 식별정보 census
→ O4O ProductMaster 매칭률 실측

QR / Tablet / Digital Signage는 구현하지 않는다.

이번 결과로 다음 단계의
외부 account/store ownership 및 QR 접근계약을 결정한다.

---

## 2. 확정 사항

기존 O4O supplier/serviceKey 구조에 Cafe24를 편입하지 않는다.

다음 생성 금지:

- SupplierProductOffer
- ProductApproval
- OrganizationProductListing
- StoreLocalProduct
- O4O organization 강제 생성

주문/회원/결제/배송 API 사용 금지.

Cafe24 상품 원장 복제 금지.

---

## 3. Cafe24 자격정보

Cafe24 Developer 앱의:

- client_id
- client_secret
- redirect_uri
- 개발/테스트 mall_id

를 사용한다.

OAuth scope는 상품 조회에 필요한 최소 scope만 사용한다.

client_secret은 DB에 저장하지 않고 환경 secret으로 관리한다.

로그/문서/CHECK에 실제 secret/token 값을 기록하지 않는다.

---

## 4. OAuth 저장 구조

Phase A에서 persistent token 저장소가 없음을 확인했으므로
Cafe24 연결정보용 최소 schema 추가를 허용한다.

거대한 External Provider/Commerce Account 모델을 만들지 않는다.

예상 최소 개념:

cafe24_connections

- id
- mall_id
- shop_no
- access_token (암호화/보호 저장)
- refresh_token (암호화/보호 저장)
- access_token_expires_at
- refresh_token_expires_at
- scopes
- status
- created_at
- updated_at

실제 repo의 encryption/secret 저장 선례를 먼저 조사하고
그 패턴이 있으면 반드시 재사용한다.

평문 token 저장 금지.

Cafe24 OAuth refresh 시 새 refresh token으로
원자적으로 교체한다.

---

## 5. Phase B — OAuth

구현:

1. Cafe24 authorization 진입
2. state 검증
3. callback
4. authorization code → token 교환
5. mall_id 확인
6. connection 저장
7. token refresh
8. disconnect/revoke에 필요한 최소 상태 처리

OAuth와 O4O Identity V2를 억지로 합치지 않는다.

이번 단계에서는
"이 mall을 어떤 O4O organization이 소유하는가"를 결정하지 않는다.

Cafe24 connection 자체만 만든다.

---

## 6. Phase C — 상품조회

실제 Cafe24 테스트몰의 상품을 Admin API로 조회한다.

가능한 실제 필드를 전수 기록한다.

특히:

- product_no
- product_code
- custom_product_code
- product_name
- manufacturer 관련 필드
- brand 관련 필드
- barcode / GTIN 존재 여부
- variant/item code
- 기타 ProductMaster 매칭에 사용 가능한 식별정보

API 문서상 가능 여부가 아니라
실제 응답을 기준으로 판정한다.

가격·재고·상품설명 등은 매칭 분석에 필요하지 않으면 저장하지 않는다.

---

## 7. 상품 식별정보 Census

실상품 전체 또는 테스트몰 전체를 대상으로 다음을 산출한다.

TOTAL_PRODUCTS

각 식별자별:

- 존재 건수
- null/blank
- unique
- duplicate
- usable rate

예:

barcode
product_code
custom_product_code
manufacturer
brand
product_name

상품명 normalization 결과도 조사한다.

---

## 8. ProductMaster 매칭 실측

기존:

GET /api/v1/neture/products/library/search

및 기존 ProductMaster/ProductIdentifier/BulkMatch 로직을 우선 재사용한다.

ProductMaster 수정 금지.

실상품을 다음 상태로 판정한다.

EXACT
SIMILAR
NOT_FOUND
AMBIGUOUS

매칭 방식별 성공률을 별도로 기록한다.

예:

barcode exact
identifier exact
상품명 + 제조사 exact
상품명 similar
unmatched

자동 후보가 있다고 DB mapping을 생성하지 않는다.

이번 작업은 매칭 가능성 실측까지다.

---

## 9. 반드시 답할 질문

CHECK에서 다음을 숫자로 답한다.

1. Cafe24 상품의 ProductMaster 자동매칭이 현실적인가?
2. 가장 강한 식별자는 무엇인가?
3. barcode/GTIN을 실제로 사용할 수 있는가?
4. 상품명+제조사만으로 어느 정도까지 가능한가?
5. 사람이 확인해야 하는 비율은 얼마인가?
6. O4O 미등록 상품 비율은 얼마인가?
7. ProductMaster schema 변경이 필요한가?
8. Cafe24 상품 원본을 O4O에 저장할 필요가 있는가?

---

## 10. 이번 작업에서 하지 않을 것

- QR 계약 변경
- QR public 개방
- Tablet ownership 변경
- Screen Set schema 변경
- Digital Signage ownership 변경
- serviceKey 추가
- organization 생성
- external commerce 공통 framework
- Naver/Coupang API
- 주문/회원/결제
- ProductMaster 자동 생성
- Cafe24 상품 → ProductMaster 자동 확정

---

## 11. 중지 조건

다음이면 해당 지점에서 중지한다.

- Cafe24 credential/test mall 확보 불가
- 상품조회에 주문/회원 scope까지 요구됨
- OAuth를 위해 기존 O4O supplier/service membership이 필요함
- token 보호 저장 선례가 없고 안전한 저장방식을 정할 수 없음
- ProductMaster 조회가 실제 실상품 매칭에 사용 불가능

---

## 12. 완료 판정

성공:

Cafe24 OAuth
→ 실제 mall 연결
→ 실제 상품 조회
→ 식별정보 census
→ ProductMaster 매칭률 숫자 산출

까지 실증.

typecheck/test/browser smoke 수행.

CHECK:
docs/investigations/CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1.md

commit + push까지 완료한다.
