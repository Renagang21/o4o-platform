# 공급자 업무 흐름 회귀 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거**: 사용자 공급자 상품·주문·이벤트·대시보드 연결/권한/실패 처리 조사 및 결함 수정 지시
> **기준 main**: `334094e7c` · 작업 branch: `wo/supplier-flow-regression`

## 조사와 범위

[역할별 업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[Neture Freeze](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md),
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)를 확인하고 현재 코드에서 모집단을 다시 조사했다.
이전 접근성·책임 분리 WO는 완료 이력이며 이번 작업은 독립 worktree에서 시작한다.

| 흐름 | 현재 연결 및 검증 경계 |
|---|---|
| 상품 등록·수정 | 신규 Candidate/기존 Master 연결 경로, 저장 필드 whitelist, 중복·실패 응답과 B2B 부분 저장 안내를 기존 동작 테스트로 검증 |
| 상품 목록·승인 | `getProductsPaginated`와 `getApprovalCounts` 독립 조회, linked 조회/active write gate, 저장된 공급 정책 기반 승인 요청을 기존 HTTP/화면 테스트로 검증 |
| 주문 조회·처리 | summary/unified 독립 조회와 source 필터, 공급자 소유권·payment-first·fulfillment 범위를 기존 API 테스트로 검증 |
| 이벤트 오퍼 | enriched 목록의 `data`/`pagination`, 상태·페이지 요청, 제안 입력 검증·대상별 부분 성공·독립 retry를 기존 화면 테스트로 검증 |
| 대시보드 | primary 권한 실패 시 secondary 미호출, 실패/정상 0건 구분, 독립 retry·SQL 지표를 기존 화면 테스트로 검증 |

실계정 end-to-end 주문·배송·정산 처리와 운영 DB write는 실행하지 않는다. 현재·기준 checkout에 `docs/local/TEST-ACCOUNT.txt`가 없으며, 격리 PostgreSQL 통합 테스트용 서버도 이 환경에 없다. 통과한 fixture/API 테스트를 운영 실거래 검증으로 표현하지 않는다.

## 확인된 결함과 수정

1. 상품 검색/필터 변경, 통합 주문 출처 변경, 이벤트 상태/페이지 변경 중 이전 요청이 늦게 완료되면 최신 목록·카운트·오류·로딩 상태를 덮어썼다. 최신 요청만 상태에 반영하도록 각 조회 영역에 독립 요청 번호를 두고 unmount 때 무효화한다.
2. 이벤트 목록에서 이전 탭의 3페이지를 본 뒤 다른 탭의 1페이지 조회가 실패하면 재시도가 3페이지를 요청했다. 요청 시작 시 페이지를 기록해 실패 후에도 같은 요청을 재시도한다.

API 계약·권한·route·DB·금융·dependency·공유 패키지는 변경하지 않는다. 요청을 취소하는 대신 오래된 응답의 화면 반영을 차단한다. 상품 rows/counts와 주문 summary/unified의 독립 실패·재시도는 유지한다.

## TODO

- [x] 현재 코드/테스트/정본의 흐름별 모집단 조사
- [x] 지연 응답 결함 9건 및 이벤트 retry 페이지 결함 1건 수정 전 재현
- [x] 공급자 조회 훅 3곳 최소 수정 및 동작 회귀 테스트
- [x] Neture 전체 회귀·타입/빌드·scoped lint·API 권한/소유권 회귀·격리 브라우저 검증
- [ ] PR 기술 gate·review·main 통합
- [ ] 현재 Delivery 정책에 따른 Neture 배포·운영 read-only 확인

결과 및 한계: [CHECK](../checks/CHECK-O4O-SUPPLIER-FLOW-REGRESSION-V1.md).
문서 정합: 현행 정본 정책 변경 없음.
