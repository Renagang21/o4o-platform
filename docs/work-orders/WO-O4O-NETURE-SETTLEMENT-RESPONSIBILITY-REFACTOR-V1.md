# WO-O4O-NETURE-SETTLEMENT-RESPONSIBILITY-REFACTOR-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-12
> **최종 갱신**: 2026-10-12
> **유형**: 기존 정산 서비스 책임 리팩터링
> **범위**: 공급자 조회 · 관리자 조회 · 정산 계산/취소/승인/지급 및 기존 알림
> **상위 정본**: [Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) · [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md#9-리팩터링-실행-규칙-모든-단계-공통) · [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) · [Commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)

## 목표와 최신 모집단

TODO 초안 → 최신 코드/정본/소비처 조사 → TODO 보정 후 실행한다.
기준 main은 `614248fda7aa932b07fe17a9e2dac16da7835fe4`다. 과거 IR의 미완성/계약 판정을 현재 정책으로 승격하지 않는다.

`NetureSettlementService` 487행에 공개10개와 private 알림1개가 함께 있다. 직접 runtime 소비자는
supplier-settlement.controller와 admin-settlement.controller다. 기존 façade/constructor/public signature를 유지한다.

| 분리 담당 | 기존 메서드 |
|---|---|
| SupplierSettlementReadService | getSupplierSettlements, getSupplierKpi, getSupplierSettlementDetail |
| AdminSettlementReadService | getAdminSettlements, getAdminKpi, getAdminSettlementDetail |
| SettlementCommandService | calculateSettlements, cancelSettlement, approveSettlement, paySettlement, notifySupplierSettlementPaid(private) |

상태 목록/필터 타입만 작은 공유 파일로 이동한다. 기존 고정 수수료와 순수 helper3개는 command 담당에 유지한다.
새 engine/repository/framework/알림 transport를 만들지 않는다.

## 보존 계약

- 공급자 supplierId SQL 격리, 관리자 auth/role, controller 검증/오류, route·API·UI.
- delivered + payment-ready + neture service scope + 미정산 주문, 기간의 inclusive end-date 및 양수 매출 조건.
- 주문 라인 snapshot 기반 합계, 기존10%/Math.round/지급액 차액·그룹별 순차 생성·주문별 연결.
- calculated→approved→paid, calculated/approved→cancelled 조건부 UPDATE 및 취소 후 연결 행 해제.
- 미존재/잘못된 상태의 null, DB 예외 전파와 동적 SQL의 notes bind marker/파라미터 순서.
- 지급 변경 성공 뒤 canonical owner resolver·settlement.paid·기존 URL/metadata/수신자 순차 처리.
- 현재 구현은 DataSource.query 순차 작업이며 별도 transaction/queryRunner가 없다. 새 트랜잭션을 도입해
  기존 부분 쓰기/실패 동작을 바꾸지 않는다. 이 관찰은 기존 코드의 원자성을 보장한다는 뜻이 아니다.
- 알림 주석은 fire-and-forget이지만 구현은 실패를 내부에서 처리하는 helper를 await한다. 완료 시점과 실패 처리도 보존한다.

금액·수수료·권한·정산 대상·상태·정책·schema/migration·의존성·CI/배포 인프라 변경은 범위 밖이다.
다른 트랙의 account-erasure DDL이나 운영 DB write/실제 지급을 이 작업 승인으로 실행하지 않는다.

## 검증과 전달

1. 원본 façade를 통해 새 행동 계약을 실행한 뒤 같은 검증으로 분리본을 확인한다.
2. 소스 경로를 검사하는 기존 계약3개를 분리 경로로 정합화하며 핵심 assertion을 유지한다.
3. 이동11메서드의 본문/SQL 생성 및 binding, 금액 helper·상수, 공개10 signature/constructor를 비교한다.
4. 관련 회귀·typecheck·scoped lint·API dependency/build/실제 compiled ESM import·문서/범위 검사를 수행한다.
5. 최신 CI/CodeQL/Sonar/Codex finding 처리 후 normal PR/main 통합 및 실제 native 배포/serving을 확인한다.
6. 사용자에게 이미 허용된 공개 공급자 Demo의 정산 읽기 및 기존 화면을 PC/mobile에서 확인한다.
   실계정 검증 유예는 유지하며 운영 정산 계산·승인·지급·취소나 직접 DB 쓰기를 하지 않는다.

로컬 dependency fake와 실제 DB/운영 검증의 한계를 구분하고 결과를 기록한다. 완료 상태는 실제 전달 증거를 확인한 후 기록한다.

## 초기 구현 검증

원본에서 행동69건을 통과시킨 뒤 분리본의 같은69건, façade21건 및 기존 보호를 포함한
7 suites / 246 tests가 통과했다. 이동11메서드 본문과18개 query/바인딩이 순서까지 동일하며
공개10 signature/constructor, 필터 구조, 수수료 helper3개/고정 상수와 상태 목록도 동일하다.

API dependency/build·typecheck·scoped lint(오류/경고0), 실제 compiled ESM import/lazy constructor가
통과했다. 실제 AppDataSource는 초기화되지 않았으며 import 시 시작된 기존 로컬 notification
heartbeat만 검증 종료 시 중지했다. 문서 민감정보 검사와 diff 검사도 통과했다.
실제 PostgreSQL 트랜잭션 fixture·운영 정산 쓰기·실제 지급은 실행하지 않았다.
