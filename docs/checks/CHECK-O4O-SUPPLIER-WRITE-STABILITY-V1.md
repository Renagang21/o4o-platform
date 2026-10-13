# 공급자 업무 쓰기 안정화 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거 WO**: [WO-O4O-SUPPLIER-WRITE-STABILITY-V1](../work-orders/WO-O4O-SUPPLIER-WRITE-STABILITY-V1.md)

## 대상과 실행 경계

최신 main `e4c48811b6b414aa8939d639373d9331d2c4c470`에서 독립 checkout/branch를 만들었다.
기존 작업 폴더의 branch·HEAD·소스를 보존했다. setup은 pinned Node 22.18.0/pnpm 10.25.0와 frozen install을 사용한다.
PostgreSQL 15 fixture는 task 전용 container, loopback의 비운영 포트와 고정 fixture DB만 사용한다.
운영 DB·실계정·외부 메시지·실제 결제/송금은 사용하지 않았다. 알림 transport는 mock이다.
타입/빌드와 아래 검사는 실제 실행 결과를 기록한다. 이 CHECK의 완료 범위는 구현·로컬 검증이며 Git 인계는 WO와 최종 보고를 따른다.

## 검증 모집단

신규 `supplier-write-stability.integration.test.ts`는 실제 TypeORM repository·transaction·PostgreSQL SQL로 검증한다.
DB 환경변수 미설정 시 fixture suite는 SKIPPED이며 그 결과만으로 PASS를 주장하지 않는다.

- 송장 INSERT 뒤 주문 UPDATE 실패 → 송장 롤백 → 재시도 1개 생성
- 동시 송장 생성 → 1개만 생성
- 배송 완료 뒤 주문 갱신 실패 → 배송 상태·배송 시각·재고·주문 롤백
- 직접 주문 완료와 배송 완료 동시 실행 → 재고 1회 차감
- 배송 완료와 in_transit 경쟁 → delivered가 역행하지 않음
- 타 공급자/미결제 checkout → 기존 거절, 쓰기 없음
- 취소 중간 실패·동시 취소 → 예약량과 legacy stock 복원 각각 1회
- 비활성 EntityManager → 쓰기 거절
- 재고 응답 SELECT 실패 → PATCH 롤백, 소유·NO_UPDATES·응답 필드 보존
- 정산 연결 INSERT 실패 → 생성 정산 롤백 → 재시도 및 다음 반복 계산 안전
- 겹치는 기간 동시 계산 → 정산과 연결 중복 없음
- 연결 DELETE 실패 → 취소 상태·notes·연결 롤백 → 정상 취소 후 재계산 가능
- 정산 payment/service eligibility와 10% 반올림 보존
- 실제 UPDATE 반환 shape·승인/지급 상태 및 동시 지급 → 지급 알림 1회, paid 취소 거절
- 혼합 공급자 주문의 기존 UNIQUE 충돌 → 전체 batch 롤백
- 대상 주문 잠금 대기 중 상태 변경 → 잠금 획득 후 eligibility 재평가

기존 settlement behavior의 금액·notes bind·소유·조회·전이·알림 assertion은 유지한다.
의도적으로 바뀐 비트랜잭션 assertion만 transaction/lock assertion으로 정정했다.
추가로 settlement facade, supplier boundary, payment-first, notification catalog, bridge/recovery,
fulfillment service scope 및 통합 주문 조회를 함께 검증한다.

## 결과

| 검사 | 실제 결과 |
|---|---|
| frozen install·API 의존 패키지 사전 빌드 | PASS |
| PostgreSQL 15 fixture | 17개 PASS, SKIPPED 0 |
| fixture 포함 focused 회귀 | 10 suites / 261 tests PASS, SKIPPED 0 |
| API `tsc --noEmit`·production build | PASS |
| 변경 파일 ESLint | 오류 0, 기존 legacy NetureService의 unused logger 경고 1 |
| docs 민감정보·`git diff --check` | PASS |
| 실계정·운영 DB 쓰기·main PR/merge·배포 | NOT_RUN — 사용자 범위 밖 |

초기 fixture에서 취소 재시도의 실제 TypeORM 결과 shape 오류를 재현했고, CTE SELECT 처리 후 지급/취소/배송 반환 계약과 rollback 검사를 통과했다.
최종 코드 점검에서는 트랜잭션 외부의 후속 주문 UPDATE가 controller에서 제거됐고 기존 금융·결제·권한 guard assertion이 유지됨을 확인했다.
설치 도중 시작한 사전 빌드는 tsc 설치 완료 전에 실패했으나 frozen install 종료 후 사전 빌드와 API 검사를 정상 완료했다.

## 재현과 한계

`O4O_SUPPLIER_WRITE_TEST_PORT=<task 전용 PostgreSQL 포트>`를 지정하고 API workspace에서
`pnpm exec jest --runInBand --runTestsByPath src/modules/neture/services/__tests__/supplier-write-stability.integration.test.ts`를 실행한다.
고정 이름의 fixture DB는 매 실행 초기화되므로 반드시 폐기 가능한 로컬 DB만 제공한다.
일반 회귀 검사는 DB 변수 없이 실행 가능하다. API 의존 패키지는 SETUP.md의 사전 빌드가 필요하다.

실운영 부하·실계정 검증, stale UI 재고 overwrite 탐지 및 혼합 공급자 주문 정산 정책/스키마 변경은 검증/변경 범위 밖이다.
기존 order_id UNIQUE와 기술적 직렬화는 유지하며 새로운 financial policy를 정하지 않았다.
알림 전달의 외부 장애 재시도나 은행 송금 성공을 보장하는 검사가 아니다.
