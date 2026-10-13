# 공급자 주문·배송·재고·정산 쓰기 안정화

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거**: 사용자 승인 — 관련 쓰기를 한 묶음으로 보완하고 commit → push까지만 진행

## 승인 범위와 최초 TODO

작업 시작 전 `/workspace/artifacts/supplier-write-stability-todo.md`에 최초 TODO를 작성했다.
조사 → TODO 수정 → 구현 → 검증 → 작업 branch 인계 순서다. main PR·merge·배포 및 운영 DB 쓰기는 제외한다.
실계정·실데이터 검증은 사용자가 나중에 수행한다. 통합 주문 호환 조회는 유지한다.

- [x] 최초 TODO 작성
- [x] 최신 main·정본·호출부·스키마·기존 검사 모집단 확인
- [x] 점검 결과로 TODO 수정
- [x] 원자성·동시성·재시도 보완
- [x] 로컬 PostgreSQL·회귀·타입·빌드·lint 검사 종료
- [x] 명시적 파일 commit·작업 branch push 및 원격 일치 확인

## Fresh census와 수정한 범위

기준 main은 `e4c48811b6b414aa8939d639373d9331d2c4c470`이다.
업무공간 [§9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공급자 경계](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md), [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)를 적용했다.
과거 조사에 있던 bridge 부재를 현행 사실로 사용하지 않았다. `CheckoutFulfillmentBridgeService`와 복구·service-scope 소비처는 유지한다.

| 모집단 | 확인한 위험 | 보완 |
|---|---|---|
| SupplierOrderController → SupplierOrderService → legacy NetureService | 송장 INSERT와 shipped가 분리됨. 직접 상태 변경의 사전 검사와 쓰기 사이 경쟁 | 주문 행 잠금 후 소유·상태·checkout readiness 재검사. 송장+주문 단일 트랜잭션 |
| ShipmentController → ShipmentService → legacy NetureService | 배송 완료·주문 delivered·재고 효과가 분리됨. 이전 배송 상태로 경쟁 요청 검증 | 주문→배송 순서 잠금. 배송·주문·재고를 같은 manager로 처리 |
| NetureService → NetureRepository | 취소/배송 재시도 시 재고 효과 반복, 중간 실패 시 부분 변경 | transaction manager 기반 repository 사용. 같은 상태 재적용은 효과를 반복하지 않음. 비활성 manager 거절 |
| InventoryController → InventoryService | 재고 PATCH 후 별도 응답 SELECT 실패 또는 다른 쓰기가 섞임 | 소유 행 잠금→수정→응답 읽기 단일 트랜잭션 |
| SettlementCommandService | 정산 INSERT·주문 연결, 취소 UPDATE·연결 DELETE가 분리됨. 겹치는 기간 동시 계산 | 계산 전체/취소 각각 원자 처리. 공통 advisory transaction lock으로 계산·취소 직렬화. 대상 주문 잠금 후 조건 재평가 |
| UPDATE RETURNING 결과 소비 | 실제 PostgreSQL/TypeORM은 raw UPDATE에서 `[rows, affected]`를 반환함 | 배송·정산 상태 UPDATE를 CTE SELECT로 감싸 행 목록을 수신. 변경 없음은 기존 null/실패 계약대로 처리 |

재고 절대값 PATCH, 예약량 하한, 수수료·반올림, 결제/정산 eligibility, supplier 권한, route는 기존 정책을 유지한다.
기존 supplier offer 재고 차감·legacy stock 복원 SQL을 보존한다. 결제 저장소의 재고와 이 저장소를 혼동하여 차감 시점을 옮기지 않는다.
동일 배송/직접 주문 상태 요청의 기존 거절 응답은 유지하며 성공 응답 재사용 API를 신설하지 않는다.
지급 알림은 실제 변경된 paid 행에만 기존 경로로 전송하며 실패를 지급 실패로 바꾸지 않는다.
새 상태 머신·스키마·migration·원장·은행/택배 연동·idempotency key API는 추가하지 않는다.

## 검증·인계

검증 상세와 한계는 [CHECK](../checks/CHECK-O4O-SUPPLIER-WRITE-STABILITY-V1.md)를 따른다.
브랜치: `wo/supplier-write-stability`. 구현 commit `7a4a363fde284d6016c9e0d1d57e22430c1be78a`를 push했고 `ls-remote`로 원격 일치를 확인했다.
승인된 개발·검증·commit/push 인계 범위가 완료됐다. 종료 기록 commit의 최종 원격 SHA는 최종 보고에서 확인한다.
main 통합·배포는 이번 승인 범위에 포함되지 않는다.

## 남은 조건과 문서 정합

정산 junction의 기존 전역 `order_id` UNIQUE를 유지한다. 혼합 공급자 주문이 들어와 이 제약에 충돌하면 계산 전체를 되돌린다.
실제 데이터에서 해당 상황의 존재 여부와 공급자별 분배 계약은 이 작업에서 확인/변경하지 않았다.
정산 계산·취소는 직렬 실행되므로 대량 기간의 처리량은 실데이터 검증 시 확인한다.
재고 PATCH는 절대값 쓰기의 기존 순차 적용 계약이며 오래된 UI 값까지 탐지하는 버전 API를 추가하지 않았다.
실계정 검증 및 통합 주문 호환 조회의 운영 근거 확보는 별도 후속 조건으로 남긴다.

정본의 정책·판정 및 과거 WO/CHECK는 변경하지 않았다. 이번 구현 기록만 추가한다.
