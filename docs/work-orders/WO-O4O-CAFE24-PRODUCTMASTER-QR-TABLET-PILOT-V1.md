# WO-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1

> **상태**: 핸드오프 (미실행) · **작성일**: 2026-08-18
> 이 WO 는 다른 작업방/작업자에게 넘기기 위한 요청서다. 상단에 즉시 실행 지시가 없으면 착수하지 않는다.

## 목적

Cafe24 쇼핑몰 사업자가 기존 상품·회원·주문·결제·배송 구조를 그대로 유지하면서,
O4O ProductMaster와 상품을 연결하고 O4O의 QR·Tablet 기능을 이용할 수 있는
최소 실사용 Pilot을 구현한다.

이번 Pilot의 사업 범위는 다음뿐이다.

Cafe24 상품
→ O4O ProductMaster 연결
→ O4O 제품정보/설명서
→ QR
→ Tablet

주문·결제·배송·회원·재고·이벤트·유통참여형 펀딩은 범위 밖이다.

---

## 1. 작업 시작

현재 main 최신 상태를 기준으로 한다.

- git status
- branch
- HEAD/origin-main 확인
- 다른 세션 WIP 미접촉

현재 코드를 먼저 재확인하고 실제 구조가 아래 전제와 다르면
추측 구현하지 말고 차이와 최소 수정안을 보고한다.

---

## 2. 확정 원칙

### Cafe24가 소유

- 쇼핑몰 회원
- 상품등록
- 상품 판매정보
- 가격
- 재고
- 주문
- 결제
- 배송
- 자체 콘텐츠
- 상품 상세 페이지
- 이후 구매/업무 흐름

### O4O가 소유

- ProductMaster
- ProductIdentifier
- O4O 표준 제품 설명서/콘텐츠
- QR 기능
- Tablet 기능
- QR/Tablet 사용기록

### 절대 하지 않을 것

Cafe24 사업자를 기존 O4O supplier 유통 흐름에 넣지 않는다.

다음 생성 금지:

- SupplierProductOffer
- ProductApproval
- OrganizationProductListing
- StoreLocalProduct
- 주문
- 장바구니
- 결제
- 배송
- 재고 동기화

Cafe24 상품 원장을 O4O에 복제하지 않는다.

---

## 3. Phase A — 현재 O4O 재사용 경계 확인

구현 전에 다음을 실제 코드로 확인한다.

### ProductMaster

- ProductMaster 검색 가능 경로
- barcode / ProductIdentifier 검색 가능 경로
- 상품명·제조사 검색 가능 여부
- canonical 제품 설명서 조회 경로

기존 Supplier 등록 흐름의
`resolveOrCreateMaster`, Offer 생성 등은 Cafe24 Pilot에서 재사용하지 않는다.

Cafe24에서 필요한 것은 기존 Master의 lookup뿐이다.

### QR

현재 상품 설명서 QR 흐름을 확인한다.

- QR이 가리키는 canonical 대상
- 로그인 필요 여부
- public/token 접근 여부
- ProductMaster 기준 고정 URL 여부
- scan/view event 존재 여부

현재 QR 계약이 외부 Cafe24 이용자에게 맞지 않으면
기존 계약을 억지로 변경하지 말고 별도 adapter 필요성을 보고한다.

### Tablet

다음 기존 패키지를 확인한다.

- @o4o/screen-content-core
- @o4o/tablet-screen-set-editor
- @o4o/tablet-kiosk-core

특히 API 주입 방식과 O4O 내부 store/user/serviceKey 의존성을 확인한다.

---

## 4. Phase B — Cafe24 OAuth Connector

Cafe24 일반 앱 연동을 만든다.

필요 범위:

- Cafe24 mall_id
- OAuth authorization code
- access token
- refresh token
- token expiry
- install/uninstall 상태

초기 scope는 상품 조회에 필요한 최소 권한만 사용한다.

주문/회원/결제 scope 요청 금지.

secret/token은 평문 로그에 출력하지 않는다.

Cafe24 인증과 O4O 기존 사용자 로그인은 별개다.

Cafe24 쇼핑몰 관리자가 앱을 설치·승인하면
해당 mall_id가 하나의 external commerce account가 된다.

---

## 5. Phase C — Cafe24 상품 조회

Cafe24 Admin API에서 쇼핑몰 상품을 조회한다.

Pilot 화면:

Cafe24 상품
- product_no
- 상품명
- 상품코드
- 자체상품코드
- 필요한 최소 식별정보

O4O에는 원본 상품을 복제 저장하지 않는다.

API 호출 시 조회하고,
필요한 연결키만 보존한다.

---

## 6. Phase D — ProductMaster 매칭

Cafe24 상품 하나를 선택하면 O4O ProductMaster 후보를 검색한다.

우선순위는 실제 가용 데이터를 확인하여 사용:

1. barcode/GTIN — Cafe24 실제 필드 가용 시
2. product/custom product code와 기존 ProductIdentifier 일치
3. 상품명 + 제조사 등 보조 검색

자동 후보가 있어도 최종 연결은 사업자가 확정한다.

화면 예:

Cafe24 상품 A
→ O4O 후보 1~N
→ 사용자가 확인
→ [연결]

최소 연결 데이터:

- cafe24MallId
- cafe24ProductNo
- productMasterId
- confirmedAt

가격·재고·상품 설명·주문정보 저장 금지.

연결 해제/재연결 가능하게 한다.

---

## 7. Phase E — 연결 후 O4O 기능

연결된 상품에는 다음 액션만 제공한다.

- O4O 제품 설명서 확인
- QR 사용
- Tablet에 추가

예:

상품 A
O4O 연결: PM-xxxxx

[제품 설명서]
[QR]
[Tablet에 추가]

---

## 8. QR Pilot

기존 O4O QR 구조를 최대한 재사용한다.

목표:

Cafe24 상품
→ ProductMaster
→ O4O 설명서/제품정보 QR

단, QR 소비자 접근 계약이 현재 O4O 로그인 정책과 충돌하는 경우
임의로 public 공개하지 않는다.

그 경우:

- 현재 계약
- 충돌 이유
- 외부 Cafe24용으로 필요한 최소 접근모델

을 CHECK에 기록하고 해당 부분만 후속 WO로 분리한다.

주문/구매 버튼 구현 금지.

후속 행동이 필요할 경우 Cafe24 상품 URL 등 외부 action 계약만 검토하고
거래 로직은 O4O에 넣지 않는다.

---

## 9. Tablet Pilot

기존 공용 Screen Set 구조를 재사용한다.

Cafe24 상품 선택
→ 연결된 ProductMaster 사용
→ Tablet Screen Set 추가
→ 코너 설명 + 제품 설명서 표시

O4O Tablet의 범위:

- 코너 설명
- 제품 목록
- O4O 제품 설명서
- 이미지/영상
- QR
- 외부 action

O4O Tablet 범위 밖:

- 장바구니
- 주문
- 로그인
- 결제
- 배송
- 상담접수 원장
- 관심상품 원장

이후 행동은 Cafe24/사업자 서비스가 담당한다.

---

## 10. 화면 목표

Pilot에서는 Cafe24 앱 안에서 다음 한 화면이면 충분하다.

### O4O 매장 판매지원

상단:
- 연결된 Cafe24 mall
- 상품 총수
- O4O 연결수
- 미연결수

상품 목록:

상품명 | Cafe24 ID | O4O 연결 | 액션

상품 A | 101 | PM-001 | 설명서 / QR / Tablet
상품 B | 102 | 미연결 | O4O 상품 찾기

복잡한 Dashboard 만들지 않는다.

---

## 11. Naver / Coupang 범위

이번 코드 작업에서 다음은 구현 금지.

- Naver Commerce API
- Coupang API
- 주문 수집
- 마켓 상품 동기화
- 배송 동기화

Cafe24 Market Plus를 해당 역할의 기준으로 본다.

Pilot 완료 후 별도 실사용 검증에서:

Cafe24 상품
→ Market Plus
→ SmartStore
→ Coupang

흐름만 실제 계정으로 확인한다.

O4O ProductMaster 데이터가 Market Plus 상품 등록에
어느 정도 도움이 되는지 조사한다.

---

## 12. 검증

최소 실제 흐름을 통과시킨다.

1. Cafe24 개발용 쇼핑몰
2. O4O 앱 OAuth 승인
3. Cafe24 상품 조회
4. 상품 1개 이상 ProductMaster 연결
5. 설명서 확인
6. QR 생성/접근
7. Tablet Screen Set에 추가
8. 기존 O4O 서비스 회귀 없음

가능하면 여러 상품으로 매칭 결과도 기록한다.

---

## 13. CHECK

작성:

docs/investigations/CHECK-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1.md

반드시 포함:

- 구현 구조
- Cafe24 OAuth scope
- Cafe24에서 실제 확보 가능한 상품 필드
- ProductMaster 매칭 방식
- mapping 저장 위치
- 기존 O4O 코드 재사용 부분
- 신규 코드
- QR 계약 결과
- Tablet 계약 결과
- Supplier/Offer/Listing 생성 0 확인
- 주문/회원/결제 API 사용 0 확인
- browser smoke
- 실제 제품 매칭 표본 결과
- 다음 보완 필요사항

---

## 14. 중지 조건

다음은 억지로 구현하지 않는다.

- Cafe24 상품 식별정보가 ProductMaster 매칭에 현저히 부족
- QR 접근정책을 바꿔야만 Pilot 가능
- Tablet 사용에 기존 O4O membership/store 생성이 필수
- Cafe24 앱을 기존 supplier/serviceKey로 넣어야만 동작
- 기존 ProductMaster를 수정해야만 매핑 가능
- 주문/회원 권한을 받아야만 기본 Pilot 가능

발견 시 해당 사실을 CHECK로 보고하고 최소 후속 구조를 제안한다.

---

## 15. 완료

코드/DB 변경이 필요한 경우 최소 범위로 구현하고:

- typecheck
- 관련 test
- browser smoke
- CHECK
- commit
- push

까지 한 번에 완료한다.

중간 승인 요청하지 않는다.

---

## 부록 — 참고 근거 (조사 시점 2026-08-18)

- Cafe24 개발자 등록 시 테스트 쇼핑몰 자동 생성, 일반 앱은 OAuth 2.0 승인 후 Admin API 호출: https://developers.cafe24.com/docs-new/en/docs/guide/intro
- 상품 단건 조회는 `READ_PRODUCT` scope 로 가능 (주문·회원 권한 불필요): https://developers.cafe24.com/docs-new/docs/admin/get-products-by-product-no
- Market Plus 는 쇼핑몰 상품을 기초상품으로 사용해 외부 마켓 전송: https://support.cafe24.com/hc/ko/articles/37265335475609
- 스마트스토어 API 대행사로 Cafe24 지정 절차: https://support.cafe24.com/hc/ko/articles/47828128644633
- 외부 마켓 상품 가져오기: https://support.cafe24.com/hc/ko/articles/30072660137753
