# 공급자 업무 흐름 회귀 검증 결과

> **상태**: ACTIVE
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
- PR/main/배포 결과는 후속 확인한다. 현재 기록은 로컬 구현·검증 증거다.

문서 정합: 현행 정본 정책 변경 없이 독립 WO/CHECK에 실행 결과와 제한을 기록한다.
