# 공급자 업무 흐름 회귀 검증 결과

> **상태**: COMPLETED
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **실행 WO**: [공급자 업무 흐름 회귀 검증](../work-orders/WO-O4O-SUPPLIER-FLOW-REGRESSION-V1.md)
> **기준 main**: `334094e7c`

## 결함 재현과 검증

- 수정 전 `SupplierQueryOrdering.behavior.test.tsx` 9건 모두 실제 assertion 실패: 최신 total 7/8 대신 이전 99 표시, 이전 실패가 최신 성공을 오류로 변경, 이전 응답이 최신 로딩/선택을 종료·초기화.
- 별도 이벤트 retry 재현: active 3페이지 성공 → ended 1페이지 실패 뒤 page가 3으로 남음. 수정 후 요청한 1페이지를 유지한다.
- 대시보드 지표의 늦은 성공/실패 2건도 추가 재현 뒤 수정: 새로고침의 최신 지표/오류를 덮어쓰지 않는다.
- 신규 12건 동작 테스트는 지연 성공/실패, 최신 요청 실패, 로딩·선택 보존, rows/counts 독립 조회, 상태/페이지 및 API 요청 인자를 확인한다.
- `pnpm exec vitest run --config services/web-neture/vitest.config.mjs`: 96 files / 861 tests PASS(대시보드 추가 수정 후 전체 재검증). fixture rows ID assertion 추가 뒤 조회 순서 10건 재검증도 PASS.
- `pnpm --filter @o4o/web-neture build`: tsc 및 Vite production build PASS. 기존 Browserslist/chunk-size 안내는 남아 있다.
- 변경 source 4개 + 테스트 2개 ESLint PASS, `git diff --check` PASS.
- API Jest 7 suites / 166 tests PASS: Supplier Boundary/Workspace, B2B canonical, supplier HTTP 처리, identity resolver, unified orders, Candidate 등록 cutover. 실제 서버/운영 DB 호출이 아닌 source 및 I/O fixture 검증이다.

- 추가 API write/fulfillment guards 5 suites / 155 tests PASS: 저장 충돌, 정산 처리, offer whitelist, 결제→fulfillment bridge, 서비스 범위. API 집중 검증은 합계 12 suites / 321 tests PASS.

## 격리 브라우저

Chromium에서 1440px·390px 각각 orders/event/products/dashboard 조회를 확인했다(8개 조합). 주문·이벤트·대시보드는 실제 page, 상품은 실제 조회 hook을 표시하는 별도 fixture다. 실제 frontend API 변환 함수를 쓰고 transport만 loopback fixture로 대체했다. 이전 요청을 보류하고 최신 요청이 완료된 뒤 이전 응답을 풀어 최신 total 7/8 및 상품 rows/counts 7 및 최신 대시보드 지표 유지, 정확한 source/status/keyword 요청, 실행 오류 0·가로 넘침 0을 확인했다. 로그인·권한 guard는 fixture로 대체되므로 실계정 인가나 전체 상품 화면 브라우저 검증을 주장하지 않는다.

fixture/report는 worktree `.tmp/supplier-flow` 및 `/workspace/artifacts/supplier-flow`에 보존하며 공개 소스에 포함하지 않는다.

## 미확인과 후속 조건

- `docs/local/TEST-ACCOUNT.txt`가 현재·기준 checkout 모두 없다. 실계정 상품 등록·주문 처리·이벤트 제안·배송·정산 round-trip은 미실행이다.
- 격리 PostgreSQL 서버가 없어 실제 DB rollback/race integration suites는 미실행이다. 이번 API fixture 통과와 구분한다.
- 운영 DB write/DDL·유료 AI 호출·새 migration은 실행하지 않았다.
- 아래 main/배포 절의 버전까지 완료를 확인했다. 실계정 업무 round-trip과 실제 DB 통합은 위 제한대로 미실행이다.

문서 정합: 현행 정본 정책 변경 없이 독립 WO/CHECK에 실행 결과와 제한을 기록한다.


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
