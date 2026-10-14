# 공급자 업무 흐름 회귀 검증

> **상태**: COMPLETED
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
2. 대시보드의 fire-and-forget 지표 요청도 새로고침 후 늦게 완료되면 최신 지표/오류를 덮어썼다. 새 primary 조회 시작 시 이전 지표 요청을 무효화하고 최신 지표 결과만 반영한다. primary 실패 시 secondary 미호출 계약은 유지한다.
3. 이벤트 목록에서 이전 탭의 3페이지를 본 뒤 다른 탭의 1페이지 조회가 실패하면 재시도가 3페이지를 요청했다. 요청 시작 시 페이지를 기록해 실패 후에도 같은 요청을 재시도한다.

API 계약·권한·route·DB·금융·dependency·공유 패키지는 변경하지 않는다. 요청을 취소하는 대신 오래된 응답의 화면 반영을 차단한다. 상품 rows/counts와 주문 summary/unified의 독립 실패·재시도는 유지한다.

## TODO

- [x] 현재 코드/테스트/정본의 흐름별 모집단 조사
- [x] 지연 응답 결함 9건·대시보드 지표 2건 및 이벤트 retry 페이지 결함 1건 수정 전 재현
- [x] 공급자 조회 훅 4곳 최소 수정 및 동작 회귀 테스트
- [x] Neture 전체 회귀·타입/빌드·scoped lint·API 권한/소유권 회귀·격리 브라우저 검증
- [x] PR 기술 gate·review·main 통합
- [x] 현재 Delivery 정책에 따른 Neture 배포·운영 read-only 확인

결과 및 한계: [CHECK](../checks/CHECK-O4O-SUPPLIER-FLOW-REGRESSION-V1.md).
문서 정합: 현행 정본 정책 변경 없음.


## main 통합·배포 완료

[PR #568](https://github.com/Renagang21/o4o-platform/pull/568)이 main `aa66d196925d93dba16e748fd5cf721bbc81dbdc`에 정상 병합됐다.
최종 PR HEAD `aaa62084274516feb626b6f053115af361990714`의 [CI 38506874227](https://github.com/Renagang21/o4o-platform/actions/runs/38506874227)은 SUCCESS이며 CI Gate·API Jest 3 shards·전체 품질·Admin/Neture build·CodeQL·SonarCloud가 통과했다. 초기 source HEAD `f3b49f549`의 자동 Codex review는 COMPLETED·findings 0·미해결 thread 0이다. 추가 대시보드 delta는 수정 전 2건 재현과 전체 회귀·빌드·scoped lint·브라우저로 검증했고, 최종 PR의 미해결 thread도 0이다.

- 다른 세션의 AI 안내 문서와 운영자 승인 화면 main 변경을 정상 통합했다. Supplier source 차이 0을 확인했다. 운영자 화면까지 포함한 최종 로컬 Neture 재검증은 97 files / 874 tests 및 production build PASS다(앞 861건에 중복 합산하지 않는다).
- source [main CI 38507848804](https://github.com/Renagang21/o4o-platform/actions/runs/38507848804) SUCCESS. 이후 문서만 추가된 `18d9de1a6`의 [main CI 38508381908](https://github.com/Renagang21/o4o-platform/actions/runs/38508381908)도 SUCCESS다.
- source target `aa66d1969`의 production status는 SUPERSEDED다. 이는 배포 실패가 아니라 최신 main의 누적 변경 cycle로 넘어간 판정이며, 실제 배포 target은 `18d9de1a6c81e1cf273ac538727410fa7b8eba48`이다. 이 target에 source merge가 조상으로 포함됨을 확인했다.
- [자동 Delivery 38508839980](https://github.com/Renagang21/o4o-platform/actions/runs/38508839980) SUCCESS. 실제 `Web (neture) / deploy-neture` job `115672937585`의 새 revision smoke·traffic 전환·deployment 검증과 최종 serving Report `115673543886`이 SUCCESS다. production status는 `DEPLOYED · deploy: neture` / success다.
- 이번 cycle의 API job은 SKIPPED이며 API/quota migration을 다시 실행하지 않았다.
- 운영 Neture HTML 200, module `/assets/index-C1JW7I93.js` 200 / application/javascript, API `/health/ready` 200/status ready를 확인했다. 이전 module `/assets/index-CTtnYbvK.js`에서 자산 변경도 확인했다. 이는 native serving SHA 증거와 함께 사용하며 실계정 업무 동작 PASS로 표현하지 않는다.

현재 WO의 조사·결함 수정·fixture/경계 회귀·main 통합·해당 source Neture 운영 배포 범위는 완료다. 실계정·실DB 미확인 조건은 유지한다.
이번 완료 문서는 같은 WO의 결과 기록 단계이며 runtime 변경/추가 배포 대상이 아니다. 재현 harness와 artifact를 위해 이 세션 worktree는 KEEP한다. 기존 원본 checkout과 다른 세션 자원은 보존한다.
문서 정합: 현행 정본 정책을 변경하지 않고 이 WO/CHECK의 완료 결과와 한계를 갱신했다.
