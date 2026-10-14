# 공급자→매장 전체 업무 흐름 통합 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **작업 근거**: 사용자 지시 — 전체 흐름 검증 후 push·PR까지
> **기준 main**: `0b3a63756`

## 판정과 경계

격리 PostgreSQL의 실제 서비스 연결 검증과 관련 회귀는 통과했다. 이번 검증에서 추가 제품 결함은 발견되지 않았고,
상품·주문·배송·정산의 운영 코드는 변경하지 않았다. 실제 계정의 운영 환경 승인·지급 round-trip은 미완료다.

- [공급자→매장 B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)과
  [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)를 선행 확인했다.
- [약국 매장 설계 §8](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)은
  `neture-pharmacy` 주문을 공급자 배송에는 연결하되 Neture 정산의 `neture` 필터를 변경하지 않는다.
  테스트 결제를 실제 공급자 지급 근거로 사용하지 않는다. 이 정책 차이는 제품 결함으로 처리하지 않았다.
- 사용자 승인 범위는 검증용 데이터 생성·상태 변경·종료 후 정리다. 운영자 테스트 계정이 제공되지 않아
  운영의 상품 승인·정산 지급을 수행하지 않았다. 임의 권한 승격·계정 생성·실제 결제도 수행하지 않았다.

## 추가한 통합 검증

`apps/api-server/src/modules/neture-pharmacy/__tests__/supplier-store-round-trip.integration.spec.ts`:

1. 합성 Supplier·Master·사용자·운영자 role을 전용 fixture DB에 생성한다.
2. 실제 기존 Master 연결로 Offer 생성 → 중복 등록 거절 → 가격 수정 → 다른 공급자 수정 거절 → Master 기준정보 보존을 검증한다.
3. 공급처 미지정 상품의 기존 승인 요청 결과(submitted 0)와 운영자 제품 등록 승인을 검증한다.
4. 실제 매장 신청·승인과 약국 협력사업 가입·승인을 거쳐 장바구니에 담고 실제 `checkoutService.createOrder`로 주문을 생성한다.
5. 결제 전 bridge 차단 → 서버 금액·배송비 확정 → 테스트 결제 준비 재사용 → 다른 구매자의 결제 거절 → 결제 확인 재시도를 검증한다.
6. 실제 bridge로 fulfillment 주문이 한 번만 생성되고 구매 매장·테스트 결제 식별값이 보존되는지 확인한다.
7. 매장 주문 조회·공급자 목록·다른 공급자의 소유권 거절 → 준비·송장·배송 완료 → 재고 차감·중복 배송의 이중 차감 차단을 검증한다.
8. 약국 주문의 Neture 정산 제외와, 별도로 생성한 기존 Neture 대상 주문의 결제·배송 완료 후 정산 계산·승인·지급·중복 지급 차단을 검증한다.

전용 loopback host·port·DB명만 허용하고 synchronize는 사용하지 않는다. AppDataSource singleton은
전용 DataSource로 연결하며 실제 repository·query·transaction을 사용한다. 외부 알림 전달만 대체한다.
실제 PG callback·HTTP 인증 route·브라우저 전체 거래 검증을 이 테스트의 통과 범위로 주장하지 않는다.

## 실행 결과

- PostgreSQL 15의 신규 전용 DB에 표준 bootstrap/incremental 및 schema fingerprint assertion PASS.
- 새 통합 2건 + 기존 약국 commerce 통합 26건: **2 suites / 28 tests PASS**.
- 공급자 DB write 안정성·기존 Master 연결·공급처 미지정 승인·결제 bridge·정산·B2B cart 회귀:
  **6 suites / 173 tests PASS**. 이 중 write stability 20건은 실제 별도 PostgreSQL fixture를 사용했다.
- `build:packages`, API `type-check`와 `build`, 추가 spec ESLint PASS.
- 새 integration 변수 미설정 시 skip이므로 CI에서 실제 DB 실행이 있었다고 주장하지 않는다.
- 최종 검증 후 이번 작업이 생성한 전용 integration DB를 제거해 합성 데이터를 정리했다. 다른 DB와 컨테이너는 보존했다.
- 실행 방법과 데이터 정리 조건은 [SETUP.md](../../SETUP.md)의 공급자→매장 PostgreSQL 통합 검증 절에 추가했다.

## 실제 계정 사전조건

사용자가 제공한 매장 경영자·공급자·직원 계정으로 운영 API 사전조건을 조회했다.
계정값·토큰·개별 매장 및 상품 데이터는 기록하지 않는다.

- 매장 경영자의 약국 membership은 active이며 store context 조회 200 / paymentMode test다.
- 직원은 개인 약국 membership이 없으나 store context 조회 200 / paymentMode test다.
  직원의 매장 연결 접근과 개인 소유자 membership을 구분한다.
- 공급자 onboarding 조회 200이다.
- 실제 운영자 승인 계정은 추가로 요청했으나 현재 확보되지 않았다. 앞선 로그인·화면 검증은
  [기존 공급자 CHECK](CHECK-O4O-SUPPLIER-FLOW-REGRESSION-V1.md)의 계정 후속 검증 절을 참고한다.

## 인계

push·PR 생성까지의 개발 범위를 완료하고 통합 담당에게 인계한다. merge·배포는 수행하지 않는다.
운영자 계정 확보 후 실계정 상품 승인과 안전한 대상·정리 조건을 확인해 운영 round-trip을 별도로 마무리해야 한다.
약국 주문의 정산 대상 확대를 원하면 현행 설계의 정책 판정이 먼저 필요하며 이번 PR에서 변경하지 않았다.

문서 정합: 현행 사업 경계를 유지하고 SETUP의 검증 명령·전용 DB 조건과 이 CHECK의 실행 범위를 기록했다.
