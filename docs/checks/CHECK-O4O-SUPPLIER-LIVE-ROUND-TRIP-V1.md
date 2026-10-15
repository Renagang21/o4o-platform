# 공급자→매장 실계정 업무 흐름 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **작업 근거**: 사용자 지시 — 공급자 실제 상품 등록·수정·승인·매장 주문·배송·재고·정산 확인
> **기준 main**: `09e08d97d` · branch: `wo/supplier-live-round-trip`

## 현재 판정

실계정 상품 등록·수정·원복·조회와 미승인 상품의 매장 미노출까지 확인했다.
전체 거래 검증은 **미완료**다. 사용자가 담당하는 운영자 제품 등록 승인과,
결제 이후 테스트 주문·배송 기록 보존 조건의 답변을 기다린다.
상품·주문·권한·DB·정산의 운영 코드는 수정하지 않았다.

## 기준과 검증 경계

- [B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)
- [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
- [매장 접근·회원 관계](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md)
- [약국 매장 설계 §8](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)
- [운영 데이터 변경 경계](../../AGENTS.md#5-위험-변경--사용자-확인)

`neture-pharmacy` 테스트 주문은 실제 PG를 호출하지 않으며 주문에 `testPayment=true`를 남긴다.
이 주문은 현행 Neture 정산의 `neture` service 필터에 포함되지 않는다.
따라서 이 흐름의 정산 성공 기준은 **테스트 주문을 정산·실제 지급 근거로 사용하지 않는 것**이다.
정산 계산·승인·지급을 억지로 연결하거나 기간 단위 일괄 정산을 실행하지 않는다.
기존 격리 DB 검증(PR #584)은 별도 결과이며 실계정 승인·배송 검증으로 합산하지 않는다.

## 실행한 실제 계정 검증

계정 원본은 로컬 전용 `docs/local/TEST-ACCOUNT.txt`이며 Git ignore를 확인했다.
환경 프록시·CA를 유지하고 HTTPS 인증서 검증을 해제하지 않았다.
자격정보·실제 사용자/사업자 식별정보·운영 응답 원문은 공개 기록에 포함하지 않는다.

| 확인 | 결과 |
|---|---|
| 경영자 약국 membership/context | HTTP 200, active, paymentMode `test` |
| 직원 약국 context | HTTP 200, paymentMode `test`. 개인 약국 membership 없는 상태와 매장 연결 접근을 구분 |
| 공급자 onboarding | HTTP 200 |
| 시작 데이터 | 기존 공급 상품 5개 모두 PENDING·비활성·PRIVATE. 매장 공급 옵션·장바구니·주문, 공급자 주문·정산 0건 |
| 검증용 상품 등록 | 라이브러리의 기존 ACTIVE/COSMETIC Master로 `POST /neture/supplier/products/from-master`, HTTP 201. 새 Offer 1개, PENDING·비활성·비공개·공급처 미지정 |
| 수정·원복 | 새 Offer의 공급가 100 → 101 → 100. PATCH 각각 HTTP 200/success, 매번 GET 결과 일치 |
| Master 보존 | 등록·수정 전후 동일 Master 단건 조회 결과 동일. 가짜 barcode나 새 Master 생성 없음 |
| 서비스 승인 요청 | HTTP 200, submitted 0, skipped `NO_ELIGIBLE_SERVICE_KEYS`, errors 0. 공급처 미지정 상품의 제품 등록 승인과 서비스 승인을 구분 |
| 재고 | 새 Offer 재고 2, 예약 0. 비활성·PENDING 상태를 재확인한 뒤 inventory_version을 보내 재고 추적만 활성화. PATCH HTTP 200, GET 재고 2·추적 true 확인 |
| 승인 전 매장 노출 | 공급자 목록·재고 목록에 새 상품 존재, 매장 공급 옵션에는 없음. 기존 5개 공급 상품은 변경하지 않음 |
| Chromium 상품 목록 | 운영 HTTPS 응답으로 새 상품 표시 확인. 390px·1440px, page error·API 오류·문서 전체 가로 넘침 0 |

재고 준비 스크립트의 최초 실행은 inventory 식별자 필드를 `id`로 읽어 PATCH 전에 종료했다.
실제 계약인 `offer_id`로 고쳐 재실행했다. 실패 실행은 성공으로 세지 않는다.

## 후속 실행 순서 — 아직 미실행

1. **사용자**: 운영자 제품 승인 화면의 이번 새 Offer만 승인한다.
   공급처 미지정 제품 등록 승인은 is_active=true로 바뀌어 약국 기본 공급 목록에 노출된다.
   PRIVATE 표기를 특정 약국에만 보이는 접근 제어라고 오인하지 않는다(약국 공급은 설계 §4의 별도 판정).
2. **기록 보존 조건 확인**: 수량 1, 상품가 100과 서버 산정 배송비, 테스트 결제만 사용한다.
   실제 택배를 발송하지 않는다. 주문·결제·배송 기록은 종료 후 삭제하지 않고 보존하며 상품은 비활성화한다.
3. **실행 전 재판정**: 같은 구매 매장 context·active membership·paymentMode test, 새 Offer APPROVED/active,
   공급가 100·재고 2·예약 0·추적 true, 기존 장바구니 비어 있음을 다시 확인한다. 다르면 중단한다.
4. 새 상품만 수량 1로 담고, 생성한 cart item ID만 checkout에 전달한다.
   서버가 계산한 상품·배송비 합계와 새 주문/결제 묶음 ID를 확인한다. 다른 장바구니나 주문을 처리하지 않는다.
5. prepare/confirm 응답의 testPayment와 buyer/paymentGroup/금액을 확인한다.
   결제 전 실패는 새 장바구니 제거 또는 새 미결제 주문의 공식 취소 API로 정리한다.
   **결제 후에는 해당 취소 API가 ALREADY_PAID로 거절하므로 삭제·원복을 주장하지 않는다.**
6. 매장 주문과 공급자 fulfillment를 checkout ID로 연결해 확인한다. 준비 → 검증용 송장 → 배송 완료를 확인한다.
   실제 운송사 API나 택배 발송을 사용하지 않는다. 재고 2 → 1, 반복 배송 처리의 이중 차감 방지를 확인한다.
7. 약국 주문의 Neture 정산 제외를 확인하고 새 상품을 비활성화한다.
   기존 상품·재고·타인 주문·기간 일괄 정산은 수정하지 않는다.

재시도는 로컬 비공개 실행 journal의 생성 Offer·cart item·checkout·fulfillment ID를 기준으로 한다.
타임아웃만으로 생성·결제·배송 mutation을 반복하지 않고, 먼저 해당 ID의 현재 상태를 재조회한다.

## 현재 보존 자원·인계

- 새 검증용 Offer 1개는 **승인 대기·비활성**으로 유지한다. 공급가 100, 재고 2, 재고 추적 true.
- 생성 Offer ID와 Master ID·복구 정보는 로컬 비공개 journal에 보관하고 사용자에게 직접 전달했다.
  계정값·상품 원문을 커밋하지 않는다.
- 운영자 승인은 사용자가 담당한다. 권한 승격·계정 생성·승인 우회는 하지 않았다.
- 실결제·주문 생성·배송 상태 변경·정산 계산/승인/지급·운영 배포는 아직 실행하지 않았다.
- source 변경이 없는 운영 검증 기록이다. frozen install·application build·기존 대규모 테스트 재실행은 필요하지 않아 수행하지 않았다.
- worktree는 승인 이후 같은 흐름을 이어가기 위해 `KEEP`. 작업 전체 완료·integration-ready로 보고하지 않는다.

문서 정합: 새로운 정책 변경 없음. 앞선 “약국 주문을 정산까지 한 흐름으로 검증” 안내를 현행 설계의 정산 제외 기준으로 바로잡았다.
