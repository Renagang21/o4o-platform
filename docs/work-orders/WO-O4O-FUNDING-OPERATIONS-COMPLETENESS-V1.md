# 유통참여형 펀딩 운영 흐름 보완

> **상태**: COMPLETED (개발·로컬 검증, main 병합 전 인계) · **작성일**: 2026-10-27 (Asia/Seoul)
> **사용자 지시**: 운영 흐름 전체를 하나의 작업으로 보완하고 main 병합 전까지 진행한다.
> **기준**: `e96c4a7934` · branch `wo/funding-operations-completeness`

## 범위와 경계

[content-only 경계](../architecture/O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1.md), [오프라인 기록 정책](../architecture/O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1.md), [초기 운영 모델](../baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md)을 유지한다. 실제 송금·환불, PG, 주문·배송 연결, 포럼 자동 가입은 추가하지 않는다. 운영 DB 접근·변경·migration·배포·main 병합은 수행하지 않는다.

## TODO

- [x] 기존 입금 수정의 오래된 화면 덮어쓰기 재현 및 버전 충돌 차단
- [x] 입금·이행·환급·철회 처리 이력 통합 조회 및 두 이력 화면의 페이지 탐색
- [x] 참여자 본인의 입금 상태·확인 금액·확인일·환급 표시와 비공개 필드 경계 검증
- [x] 펀딩 화면의 남은 체험단 표현 정리 및 운영 안내 작성
- [x] 역할·소유권·동시 수정·실패/재시도·전체 흐름 회귀와 desktop/mobile 화면 확인
- [x] type/build·lint·문서 민감정보·Git 검증 후 commit/push 및 병합 전 인계

## 구현 계약

입금 수정은 기존 참여자 `offlineState.version`을 기대 버전으로 요구하고 같은 transaction에서 비교·증가한다. 환급·철회·약정도 같은 원장을 사용하므로 서로 오래된 값을 덮어쓸 수 없다. 버전 없는 구 클라이언트는 400, 오래된 버전은 409로 재조회 안내한다. schema 변경 없이 기존 JSONB를 재사용한다.

기존 history 경로와 `data` 배열 형태를 유지하고 page/hasMore를 추가한다. 운영자만 보는 환급·철회 이력을 명시적으로 투영해 기존 입금·이행 기록과 함께 보여 준다. 참여자 DTO는 본인 확인 결과만 제공하고 송금 참조·운영자 메모·처리자/사유는 추가하지 않는다.

## 검증 및 인계

실행 결과와 남은 한계를 완료 시 기록한다. 실제 계정/운영 데이터로 쓰기 검증하지 않으며 격리·합성 결과를 실계정 검증으로 보고하지 않는다. main 병합 전 worktree는 후속 수정용으로 KEEP한다.


## 구현 결과

- 참여자 목록에 paymentVersion을 제공하고 입금 수정에 version을 요구한다. trial→participant 잠금 안에서 버전을 비교하고 같은 JSONB 원장의 version만 증가시킨다. 환급·철회·약정과 교차 충돌도 거절한다. JSONB의 나머지 상태와 최초 입금 확인일·금액 보존 규칙을 유지한다.
- 운영자 폼은 열 때의 버전을 유지한다. 충돌 후 조회 복구 전에는 추가 쓰기를 막으며, 갱신된 현황에 옛 입력을 새 버전으로 자동 재전송하지 않는다. 실패한 저장을 성공으로 표시하지 않는다.
- 참여자 이력은 기존 경로·data 배열을 유지하고 page/hasMore를 추가한다. 입금/이행과 기존 funding.offline_operation을 함께 투영한다. 전체 사후 이력은 historyPage/historyHasMore로 별도 탐색한다. 이전 이력을 읽을 때 편집 중인 현황/버전은 교체하지 않는다.
- 본인 DTO와 목록은 확인 입금 금액·상태·일자 및 기존 철회/누적 환급 요약을 제공한다. 본인 ID로 조회하고 사후 요약은 1회 batch 조회한다. 송금 참조·입금 메모·처리자는 신규 공개하지 않는다.
- FundingListPage의 체험단 문구를 정리하고 [운영 안내](../guides/FUNDING-OPERATIONS-V1.md)를 추가했다.

## 실행한 검증

- Node 22.18.0·pnpm 10.25.0 frozen install 및 공통 packages build PASS. manifest·lockfile·schema·migration 변경 없음.
- API·web-neture type-check, Neture production build PASS. 기존 Browserslist·큰 bundle 경고는 유지한다.
- 펀딩 API focused: 11 suites / 185 PASS (별도 공급자 통합 suite는 이 회차에서 skip). 그 뒤 본인 목록 DTO 검증 1건을 추가해 해당 controller suite 16/16 PASS. 중복 실행을 합산하지 않는다.
- 공급자/펀딩 별도 PostgreSQL 15.15 통합 9/9 PASS. 전체 migration prefix fingerprint·최종 down/up 복원·공급자 보완/심사·기존 이행 이력 소비처도 확인했다.
- 위 focused 검증에 실제 PostgreSQL 15.15 disposable DB의 19/19가 포함된다. 동시 입금 수정 1회 반영·오래된 버전/버전 없는 요청·입금과 환급/철회 교차 충돌·감사 insert 실패 시 금액/버전 rollback·기존 limit 초과 이력·metadata 비노출을 검증했다.
- 운영자/펀딩 프런트 회귀 32 files / 230 PASS. 390px·1440px Chromium: 오래된 폼 차단·최신 폼 재열기/version 전달·이력 503/재시도·이력 페이지·참여자 입금 상세·가로 overflow 없음 PASS. 인증·guide·API 응답은 합성 adapter이고 실제 UI/client/브라우저를 사용했다. 외부 요청 0, 예상한 503 이외의 콘솔 오류 및 page error 0. 재현 명령: `O4O_BROWSER_EXECUTABLE=<Chromium 경로> node scripts/checks/funding-operations.browser.mjs`.
- 변경 파일 ESLint 오류 0, 기존 warning 4개. 문서 민감정보 검사 0건 및 diff check PASS.

초기 검증의 필수 fixture 필드 누락과 실행 디렉터리 오류는 수정 후 재실행했다. 테스트 선택 정규식이 worktree 이름의 funding까지 매치한 광범위 실행은 focused 결과와 구분한다. 최종 범위는 명시적 test path로 고정했다.

기존 검증 fixture 2곳도 현행 main에 맞춰 정정했다. offline-state down은 더 이상 마지막 migration의 이전 상태가 아니므로 현재 fingerprint·해당 두 column 제거·up 복원을 검증한다. 공급자 통합 fixture는 fingerprint가 바꾼 transaction-local search_path를 DEFAULT로 복원한 뒤 up하고 try/finally로 rollback/release한다. 제품 migration·expected fingerprint는 변경하지 않았다.

## 남은 경계

실계정 파일은 자기 worktree와 기준 checkout 모두 없었다. 운영 로그인/송금/환급·운영 DB 쓰기·배포는 수행하지 않았다. 브라우저 결과를 실제 인증/운영 데이터의 전체 E2E로 보고하지 않는다. API 먼저·프런트 나중의 배포 순서를 유지해야 하며 버전 없는 옛 화면은 새로고침이 필요하다.

WORKTREE_DISPOSITION: worktree `/workspace/o4o-wt/funding-operations-completeness` / branch `wo/funding-operations-completeness` / base `e96c4a7934` / main integration 없음 / deployment 없음 / verdict KEEP (사용자 지정 종료점 main 병합 전, 후속 리뷰 수정용).
