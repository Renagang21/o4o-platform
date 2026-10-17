# 펀딩 오프라인 운영 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-17 · **최종 갱신**: 2026-10-17
> **범위**: 개발 검증·push 인계. PR·병합·배포·운영 DB 적용은 미실행.

## 정책과 구현

사용자 확정 [오프라인 운영 정책](../architecture/O4O-FUNDING-OFFLINE-OPERATION-POLICY-V1.md)과 [TODO](../work-orders/WO-FUNDING-OFFLINE-OPERATIONS-TODO-V1.md)를 기준으로 구현했다.

- 모집 기한/정원은 신규 참여 제한에만 사용한다. public GET의 상태 변경과 API 시작 시 자동 결과 worker 실행을 제거했다. 모집 결과는 funding 운영자가 기록하며 개설자·기존 일반 단계 변경 API는 모집→준비 전환을 대신하지 않는다.
- 기존 입금 원장과 약정 참여금을 구분한다. 공개 목록/상세는 실제 입금에서 기록된 환급을 뺀 금액을 read-only 집계한다. 입금·환급 변경 시 같은 transaction에서 currentAmount도 갱신한다. 기존 전체/개별 KPI도 수동 성공·미달 판정과 원장 순모금을 반영한다. 조회 시 소급 backfill은 없다.
- 모금 결과·중지·약정 정정·철회·누적 환급 정정은 이유와 최신 version을 요구한다. trial→participant 순서의 잠금과 감사 저장을 같은 transaction에서 처리한다. 중지/철회 자체로 입금·실제 환급·포럼 회원 원장을 변경하지 않는다.
- 환급액은 입금액을 넘을 수 없다. 전액 환급 후 감액 정정은 남은 입금 상태를 복구한다. 환급 기록이 있는 입금을 미입금/취소로 바꾸어 잔액을 숨길 수 없다. 입금액 정정은 환급액보다 작을 수 없으며 잔액에 맞는 상태를 기록한다.
- 환급 확인 대기·약정 미등록을 기존 예외 목록에 연결한다. 철회/중지된 대상을 입금 독촉·신규 이행 대기 대상으로 잘못 안내하지 않는다.
- 공급자 상태 관리·승인 상세에 진행 펀딩 조회와 funding 운영자 링크를 추가했다. 역사적 supplierAccountId가 있으면 legacy 사용자 연결보다 우선한다. 공급자 비활성화·펀딩 중지·권한 부여는 자동 실행하지 않는다.
- 참여자는 자기 철회·환급 기록만 조회한다. 운영자 사유/감사 metadata는 공개 DTO에 포함하지 않는다. 참여 상세의 계정/대상 변경과 늦은 응답, 조회 실패 재시도도 보완했다.
- 모집 일시는 한국 시간으로 편집한다. 무관한 수정은 원래 ISO 시각/밀리초를 보존한다. 실제 환급일 입력은 브라우저 현지 시각을 ISO로 전송한다.

## 실행 검증

Node 22.18.0 / pnpm 10.25.0, frozen install 및 공유 패키지 build 후 검증했다. 환경 재생성 후 같은 기준 main `a554025725`에서 작업을 복원했다. setup skill의 clean cloud checkout 재사용 지침에 따라 전용 branch를 사용했다.

| 검증 | 결과/방법 |
|---|---|
| 웹 전체 회귀 | root `pnpm exec vitest run --config services/web-neture/vitest.config.mjs` — 120 files / 1,130 tests PASS |
| 기존 API 집중 회귀 | payment-record, workspace, operator-exceptions, participation, operator-records, public-and-creator — 6 suites / 81 tests PASS |
| 새 SQL 통합 | 12 tests PASS — 아래 격리 PostgreSQL 검증 참조 |
| API·웹 빌드 | `pnpm --filter @o4o/api-server run build`, `pnpm --dir services/web-neture build` PASS (TypeScript 포함) |
| Migration 계약 | `node scripts/db/check-migration-contract.mjs` — 21 PASS / 0 FAIL |
| 배포 위험 분류 회귀 | `node --test scripts/ci/__tests__/deploy-risk.test.mjs` — 36 PASS |
| Lint | 변경 runtime 경로 오류 0. 기존 controller의 미사용 import/disable 경고 2건은 범위 밖으로 보존 |
| 문서 민감정보·diff | `node scripts/check-doc-sensitive.mjs`, `git diff --check` |

### 격리 SQL

운영 연결 설정을 사용하지 않았다. loopback 전용 PostgreSQL 15 / 전용 포트 55451 / synthetic 사용자·사업 데이터만 사용했다. 고정 opt-in `O4O_FUNDING_OFFLINE_PORT=55451` 없이는 이 통합 테스트가 skip된다. canonical bootstrap과 ordered incrementals 전체를 적용한 일회성 DB를 테스트 종료 시 DROP하고 pg_database 잔존 0을 확인한다. 운영 DB write·DDL·계정 생성은 없다.

`funding-offline-operations.integration.spec.ts`에서 migration 재실행/최종 fingerprint, 신규 migration down/up 시 이전·최종 schema 복원, 기한 경과 시 read-only 모집 유지, 약정과 입금 분리, 명시적 성공/미달 판정, 중지·철회 후 입금 보존, 부분/전액 환급·정정, 감사 실패 원복, 범위/금액/달력 날짜 검증, 공급자 연결 경계, 환급 후 입금 정정, 같은 version 동시 요청의 1건 커밋과 기존 KPI의 수동 결과/순모금 반영을 검증한다.

최종 schema fingerprint: `76c1307f0ee0a073e7ce53f9ae00e58c8695b6084842d42f6475bac35df58c04` / 6,698 lines. 기존 baseline/과거 migration/기존 expected state는 변경하지 않았다.

### PC·모바일 브라우저

실제 web-neture production bundle을 localhost preview에서 제공하고 `funding.neture.co.kr` / `supplier.neture.co.kr` host 분기를 재현했다. Playwright + Chromium, 1440×1000·390×1000에서 모든 API/외부 요청을 synthetic fixture로 차단·대체했다. 실제 계정 로그인이나 운영 API 작업의 검증 결과로 보지 않는다.

- 펀딩: 모금 결과 저장 실패→사유 보존→재시도 성공→조회만 실패→읽기 재시도(추가 write 0)→중지→철회→부분 환급. 크기별 fixture POST 5회(의도한 실패 1회 포함), 수평 넘침 0·pageerror 0.
- 공급자: 상태 변경 대화상자의 진행 펀딩 조회 실패→재시도→funding 운영자 링크 확인. 크기별 write 0·수평 넘침 0·pageerror 0. 비활성화나 펀딩 중지를 실행하지 않았다.
- 로컬 산출물은 `.onboarding`에만 보관한다. synthetic 브라우저 상태는 context 종료 시 폐기한다.

## 통합 인계와 남은 범위

- 개발 branch: `wo/funding-offline-operations`. main/배포 완료로 보고하지 않는다. PR 생성부터는 지정된 통합 담당이 맡는다.
- migration `AddFundingOfflineState1792212000000`을 운영 적용한 뒤 API/웹을 제공해야 한다. 이번에는 격리 DB에만 적용했다. 운영 적용 승인은 별도이며 down은 보관 중인 새 업무 기록을 잃으므로 운영 rollback 수단으로 실행하지 않는다.
- 기존 `refunded` 행에 환급액/처리일이 없으면 임의로 금액을 채우지 않고 기존 완료 상태·금액 미등록으로 안내한다. 운영자의 확인/정정이 필요하다. 미기록 입금은 확인 입금으로 추정하지 않는다.
- 실제 계정/실제 배포본 업무 검증은 미실행이다. 은행 조회·PG·실제 송금·실제 환급·통합 운영 대시보드·개설자 승계·철회 후 재가입 정책은 이번 구현에 포함하지 않는다.
- 모집 결과 알림은 commit 이후 기존 best-effort 알림을 호출한다. 알림 전송 보장/재시도 queue는 새로 만들지 않았다.
- 기존 자동화 관련 완료 WO/CHECK는 당시 기록으로 보존한다. 현행 정책은 위 새 정책 문서이며 canonical index 등재는 별도 문서 작업으로 남긴다.

문서 정합: 사용자 확정 정책·TODO·이 CHECK·ACTIVE 운영자 roadmap의 인계를 연결했다. 과거 기록과 canonical index는 재작성하지 않았다.

## 통합 착수 — 2026-10-17

앞선 개발 인계 후 사용자가 이 공간에서 PR·병합·운영 migration 적용·배포를 명시적으로 지시했다. 이 절부터 통합 담당으로 진행하며 앞선 개발 종료 시점의 미실행 기록은 보존한다.
최신 main `900f8043af`의 무관한 약국 로그인 문구 변경을 같은 작업 branch에 merge하고 PR #674를 생성했다. 필수 CI Gate와 Codex 리뷰 확인 후 병합하며, 운영 적용은 main의 CI 성공 SHA에 대해 기존 LEVEL 3 promote → migration Job → API → 웹 절차를 사용한다.

통합 점검 중 과거 입금액만 남은 미입금/취소 행에 양수 환급을 등록하면 순모금과 환급 상태가 모순될 수 있어, 실제 입금 확인·정정을 먼저 요구하도록 보완했다. 격리 SQL 기존 12건에 해당 회귀 검증을 추가해 PASS했다. 이 변경은 실제 송금/환급을 실행하지 않는다. 병합·운영 적용·배포의 실행 결과는 PR #674에 기록한다.

Codex 리뷰 P1(기존 입금 API의 `refunded` 요청이 환급 상세 없이 순모금을 제외할 수 있음)을 반영했다. 누적 환급 기록이 없는 행의 직접 `refunded` 변경은 409 `OFFLINE_REFUND_RECORD_REQUIRED`로 차단한다. 오프라인 환급 이력이 있는 금액 정정은 잔액에 맞는 상태를 유지한다. 기존 API 호출의 거절/transaction rollback/순모금 보존을 검증했으며 관련 API·격리 SQL 3 suites / 52 tests PASS, TypeScript PASS다.

Codex 리뷰 P2(기존 펀딩의 공급자 목록·상세가 이전 약정 합계 캐시를 표시할 수 있음)를 반영했다. 공급자 목록·결과 상세와 참여 상세도 공개 목록/상세와 동일한 read-only 원장 집계를 사용한다. API 응답의 실제 입금·환급 반영과 과거 캐시 불변을 검증했다. 관련 controller·격리 SQL 2 suites / 25 tests PASS, TypeScript PASS다.

Codex 리뷰 P2(철회·중지 대상을 약정금 미등록 목록에도 안내할 수 있음)를 반영했다. `pledge_missing`에도 기존 collection 제외 조건을 적용했다. 진행 중/철회/운영자 중지/목표 미달 종료를 격리 SQL에서 비교해 약정 안내와 환급 확인 대상이 겹치지 않는 것을 확인했다. 조회 시 UUID 대소문자가 달라도 DB의 canonical ID를 기준으로 원장 금액을 찾도록 보완했다. controller·예외·격리 SQL 3 suites / 35 tests PASS(격리 SQL은 현재 13건), TypeScript PASS다.

Codex 리뷰 P2(기존 작업 저장 후 현황 조회 실패 시 오프라인 입력만 재활성화될 수 있음)를 반영했다. 오프라인 form도 `actionLoading`(저장·조회·복구 필요)을 공유한다. 조회 복구 전 잠금/읽기 재시도 후 해제를 기존 workspace 회귀에 추가해 UI 17 tests·TypeScript·production build PASS했다. PC 1440px·모바일 390px 실제 bundle의 fixture browser에서도 사유 입력 disabled, 읽기만 재시도 후 해제, 추가 write 0·수평 넘침 0·pageerror 0을 확인했다.

Codex 리뷰 P2(운영자 결과 확인 전 모집 기한이 지나도 공개 상세에 참여창이 남을 수 있음)를 반영했다. 시작 전/마감 후에는 접수창을 노출하지 않고, 열린 화면도 서버와 같은 `[시작, 종료)` 경계에서 접수를 닫는다. 클릭 시에도 기간·정원을 재확인하며 clock timer는 refetch나 결과/단계 변경을 하지 않는다. 기간 경계 UI 4 tests, 최신 웹 전체 121 files / 1,134 tests, TypeScript·production build PASS다. PC·모바일에서 시작 전/마감 후/열린 화면의 기한 경과 6개 fixture를 확인했으며 각 상세 GET 1회·write 0·수평 넘침 0·pageerror 0이다.

Codex 리뷰 P2 2건(철회·대체 참여 후 활성 인원 집계 불일치, 이행 완료 후 중지의 부적절한 환급 확인 대상 생성)을 반영했다. 공급자·운영자 참여/이행 요약과 모집률·funnel은 현재 참여만 집계하고 `recordCount`/`withdrawnCount`로 보존 이력을 구분한다. 명단·공급자 현황·CSV에 철회를 표시하며 입금 원장/금융 KPI는 이력을 포함하는 기록 집계임을 명시한다. 이행 완료는 기존 정상 종료를 사용하고 whole-trial stop은 모집/준비/결과 확인 단계로 제한한다. 완료 후 참여자 금액 정정은 유지한다.

API 집중 회귀·격리 SQL 7 suites / 99 tests PASS(일반 API 84 + SQL 15), UI 집중 38 tests·API/웹 TypeScript·production build PASS다. 실제 bundle의 PC·모바일 모금→중지→철회→부분 환급/조회 복구, 공급자 조회 재시도도 회귀 PASS했다. 최신 main #672의 커뮤니티 독립 서비스 변경을 충돌 없이 반영했으며 migration manifest/expected schema는 동일하다. 이 기준 main의 웹 전체 1,058 tests와 타입·빌드·브라우저를 먼저 확인했고 이번 활성 인원/종료 보완의 최종 전체 회귀는 PR #674에서 추적한다.

Codex 리뷰 P1/P2(과거 `auto_target_missed`의 미환급 입금 누락, 철회자의 진행 알림 수신)를 반영했다. 과거 모집 실패 건은 환급 확인 대상에만 포함하고 입금 독촉·약정·이행 예외에서는 계속 제외한다. 상세의 환급 확인 금액도 같은 기준을 사용한다. 모집 결과·단계 알림은 현재 참여자만 수신하며 공급자 본인 알림과 보존 원장은 유지한다.

최신 API/격리 SQL 8 suites / 110 tests PASS(일반 API 84, 펀딩 SQL 17, 기존 공급자·펀딩 SQL 9), TypeScript·변경 API lint PASS다. 기존 SQL harness도 현재 마지막 migration을 대상으로 up/down하도록 정합하고 baseline~31개 incremental의 모든 prefix fingerprint를 재검증했다. 실제 SQL로 수신자를 조회한 뒤 notification 저장 호출만 spy로 대체해 철회 이력은 참여자 알림 대상에 포함되지 않는 것을 확인했다. 운영 알림/업무 데이터 write는 없으며 두 격리 DB의 잔존 0을 확인하고 전용 PostgreSQL 프로세스를 종료했다.

Codex 리뷰 P2(공급자 진행 펀딩 조회 실패/대기 중 비활성화 허용)를 반영했다. 조회 상태를 상태 변경 dialog에 전달하고 현재 대상의 조회가 성공해야 비활성화 버튼과 실행 handler를 모두 허용한다. 재활성화는 기존 정책을 유지한다. 실패→읽기 재시도 중 사유 보존·write 0·성공 후 해제의 회귀를 추가했다. 관련 UI 5 tests, 웹 전체 116 files / 1,061 tests, TypeScript·production build PASS다. PC·모바일 fixture browser에서도 조회 실패 시 차단과 재조회 성공 시 해제를 확인했다.
