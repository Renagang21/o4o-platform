# 매장 경영자·직원 상품 도입·주문 흐름 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **작업 근거**: 사용자 지시 — 상품 탐색·도입·진열·장바구니·주문·배송 조회를 조사하고 push·PR까지
> **기준 main**: `d9dce2e5a`

## 조사와 변경

현재 내 매장 업무는 `store.neture.co.kr`의 `services/web-store`가 담당한다.
Neture의 과거 Store 페이지를 기준으로 전체 업무 완료를 판단하지 않았다.
[Store 접근 정본](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md),
[역할별 공간 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[약국 매장 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)과
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)를 먼저 대조했다.

상품·공급 조건·도입 진입과 경영자·직원 접근은 기존 계약을 유지했다. 수정한 결함은 다음과 같다.

- 주문 목록 새로고침 실패 시 기존 행·미결제 그룹이 남아 예전 결제 버튼을 사용할 수 있었다.
  기존 `useLatestList`로 새 조회 시 목록을 비우고 오래된 성공·실패를 배제했다. 조회 실패를 빈 주문 내역으로 표시하지 않는다.
- 장바구니 수량 변경 중 주문 확정, 다른 행 변경·삭제가 가능했고 확정 중에도 수량·삭제를 실행할 수 있었다.
  같은 화면의 쓰기를 단일 ref와 UI 상태로 직렬화하고 reload까지 잠금을 유지한다.
  미적용 수량은 적용 후 확정하도록 안내하며, 조회 실패 시 기존 카트로 확정할 수 없고 새로고침으로 재시도한다.
- 주문 목록에는 checkout의 결제 상태만 있어 공급자의 준비·출고·배송 완료·송장을 볼 수 없었다.
  기존 `GET /api/v1/neture/pharmacy/orders`에 nullable `fulfillmentStatus`와 `shipment`를 추가했다.
  화면에서는 결제 상태와 배송 상태·운송사·송장을 별도로 표시한다. 송장 행보다 fulfillment 상태를 우선한다.
  좁은 화면의 표에는 최소 폭을 두고 표 안에서 가로 스크롤해 상태·송장 글자가 한 글자씩 꺾이지 않게 했다.

## 배송 조회의 격리

`listPharmacyOrders`는 기존 buyerId·선택 organizationId·neture-pharmacy 조건과 최근 200건 제한을 유지한다.
그 주문만 대상으로 checkoutOrderId·공급자·서비스가 일치하는 fulfillment를 연결하고 같은 공급자의 최신 송장만 반환한다.
기존 중복 projection이 있더라도 주문 행을 늘리지 않는다. 수취인·연락처·배송지 등 추가 개인정보는 반환하지 않는다.

기존 경영자·승인 직원 게이트와 개인 Neture 가입 조건을 변경하지 않았다. 장바구니와 주문의
기존 구매자별·선택 매장별 격리를 유지하며 다른 사용자의 주문 열람 권한을 추가하지 않는다.
새 DB 컬럼·migration·role·route는 없다. 약국 주문 정산 범위와 운영자 승인·지급 정책도 변경하지 않았다.

## 검증

- 수정 전 소스로 같은 화면 동작 테스트를 실행해 **7건 실패**를 재현했다.
  수정 후 직접 배송 완료와 송장 상태가 다른 경우의 표시 회귀까지 포함한 새 8건 PASS.
- `store-web test`: **18 files / 165 tests PASS**. 기존 상품 도입·사업 조건·매장 관리 회귀 포함.
- 기존 매장 접근·직원·경영자 membership·약국 게이트: **5 suites / 48 tests PASS**.
- 배송 조회 실제 PostgreSQL fixture: **1 suite / 7 tests PASS**.
  결제·금액 보존, 미bridge 주문, 타 구매자·매장·서비스 제외, 타 공급자 projection·송장 제외,
  중복 주문 방지·최신 송장·200건 제한을 실제 SQL로 검증했다.
- 실제 로컬 canonical 스키마에서 신규 조회 SQL 실행 PASS(존재하지 않는 합성 actor 기준 0행).
- `build:packages`, API `type-check`·`build`, `store-web build` PASS.
- 변경 파일 ESLint 오류 0. 기존 route의 `_next` unused 경고 1건은 원본에도 있으며 범위 밖으로 유지했다.
- PostgreSQL fixture는 전용 loopback DB만 사용하고 connection-local TEMP 테이블·데이터를 rollback했다.
  포트 환경변수가 없으면 새 integration 7건은 skip이므로 CI의 실제 DB 실행을 주장하지 않는다.
- 최종 검증 후 이번 작업이 만든 빈 fixture DB를 제거했다. 기존 개발 DB와 컨테이너는 유지했다.
  재실행 조건은 [SETUP.md](../../SETUP.md)에 기록했다.

## 브라우저

수정된 실제 페이지를 별도 Chromium에서 1440px·390px로 실행했다. API transport만 loopback fixture로 대체하고
배송·송장 표시, 조회 실패 후 기존 결제 버튼 제거, 수량 변경 중 다른 쓰기 차단, 주문 확정 중 수량·삭제 차단을 확인했다.
실행 오류·페이지 가로 넘침은 0건이다. 표 내부 가로 스크롤은 모바일의 의도된 동작이다.
산출물은 로컬 `/workspace/artifacts/store-flow`에 두며 계정값을 포함하지 않는다.

제공된 경영자·직원 테스트 계정으로 운영 로그인과 내 매장 제품·공급 상품·장바구니·주문 화면 접근도 확인했다.
모바일에서 두 계정의 네 화면 모두 실제 제목·본문 렌더링 및 실행·관찰 API 오류 0건을 확인했다.
이는 운영의 기존 배포 상태 접근 검증이며 이번 미배포 코드의 배송 개선 검증과 구분한다.
브라우저 HTTPS는 환경 CA로 검증하는 임시 요청 transport를 사용했다. 영구 인증서 변경이나 TLS 검증 해제는 없었다.

운영 상품·진열·주문·결제 데이터 변경은 수행하지 않았다. 새 실제 거래 생성과 운영자 승인·지급 테스트는
사용자가 맡은 범위이며 이번 테스트 결과로 완료했다고 주장하지 않는다. merge·배포는 통합 담당에게 인계한다.

문서 정합: 현행 Store 접근·B2B 경계를 유지하고 이번 동작 변경과 검증의 범위를 기록했다.
