# 공급자 잔여 보완 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거 WO**: [WO-O4O-SUPPLIER-REMAINING-BATCH-V1](../work-orders/WO-O4O-SUPPLIER-REMAINING-BATCH-V1.md)

## 검증 범위

새 main `d42b94053` + 이전 안정화 `04966c122` 기반의 독립 branch에서 수행했다.
PostgreSQL 15 task 전용 container·loopback 비운영 포트·고정 이름의 폐기 가능한 fixture DB만 사용했다.
fixture는 실제 SQL/TypeORM을 검증하며 애플리케이션 env·운영 DB 자격정보를 사용하지 않는다.
HTTP tests의 auth/identity는 stub이다. browser는 실제 재고 컴포넌트+모의 API만 사용하며 모든 외부 요청을 차단했다.
실계정/Google 로그인·운영 DB·알림 전달·실제 결제/송금 결과로 확대하지 않는다.

## 실제 결과

| 검사 | 결과 |
|---|---|
| frozen install, API/web 의존 패키지 사전 빌드 | PASS |
| API 관련 회귀 | 12 suites / 292 tests PASS, SKIPPED 0 |
| 독립 PostgreSQL | 위 회귀에 포함: 쓰기 20개+통합 읽기 14개 PASS |
| HTTP 충돌/인가 등록 계약 | 위 회귀에 포함: 13개 PASS (인가 자체 구현은 stub) |
| 전체 web-neture 회귀 | 74 files / 632 tests PASS |
| 신규 웹 전송·화면 검사 | 위 웹 회귀에 포함: 10개 PASS |
| API tsc/build, web-neture tsc+Vite build | PASS |
| 변경 파일 ESLint | 오류/코드 경고 0. 기존 ESLintIgnoreWarning 도구 경고 별도 |
| PC 1280px/mobile 375px fixture browser | 저장→충돌→최신값 재검토→토글 PASS, JS page error 0·가로 넘침 0 |
| main merge·배포·실계정·운영 부하 | NOT_RUN — 사용자 범위 밖/유예 |

Vite build의 기존 큰 chunk 안내는 남아 있다. unrelated 분할 변경은 하지 않았다.
소스 변경 검사는 초기 lint 경로 오타 수정 후 정상 실행했다. 토글의 접근성 이름 부재를 화면 검사에서 보완한 후 관련 테스트를 통과했다.

## 중요한 검증 사례

- 목록/상세/수정 응답의 version 일치, 변경 후 version 갱신
- 같은 version의 동시 PATCH는 하나만 성공하고 나머지는 409 대상
- 배송 완료로 재고가 줄어든 뒤 열린 편집기의 PATCH는 실제 재고를 덮어쓰지 않음
- stale tracking·foreign supplier·versionless 호환·잘못된 version 검증
- 사용자 편집 시작 version 전송, 성공 응답 version 반영, 충돌 자동 재시도 없음
- 충돌 뒤 조회 실패를 정상 0건으로 숨기지 않고 명시적 재조회 허용
- 정산의 cross-supplier order 중복을 금액/연결 INSERT 전에 거절. 정상 수수료·전이·기존 DB 중복 처리 보존
- 다른 supplier/서비스/연결 없음 bridge 포인터에는 paid checkout 읽기를 유지하고 임의 fulfillment를 허용하지 않음
- 기존 atomic rollback·배송 경쟁·재고 1회 효과·취소/재계산·결제/service scope·전체 pagination guard 회귀

## 재현·인계

SETUP.md의 pinned toolchain/frozen install/사전 빌드를 사용한다.
폐기 가능한 전용 PostgreSQL에 고정 fixture DB `o4o_supplier_write_fixture`, `o4o_supplier_order_fixture`를 준비하고
각각 `O4O_SUPPLIER_WRITE_TEST_PORT`, `O4O_SUPPLIER_ORDER_TEST_PORT`로 비운영 loopback 포트를 명시한다.
두 integration suite는 DB 변수가 없으면 SKIPPED이므로 그 결과만으로 DB PASS를 주장하지 않는다.
fixture DB는 초기화/rollback되며 운영이나 공유 개발 DB를 연결하지 않는다.
웹 검사는 루트에서 `pnpm exec vitest run --config services/web-neture/vitest.config.mjs --maxWorkers=2`를 사용했다.

개발 종료점은 작업 branch push다. source/원격 SHA는 WO와 최종 보고에서 확인한다.
호환 조회 제거, 운영 부하, 금융 분배/schema 판단 및 실계정 후속은 이번 검증으로 완료한 것이 아니다.
