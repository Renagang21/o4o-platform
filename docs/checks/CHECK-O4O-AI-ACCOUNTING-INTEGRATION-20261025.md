# AI 공통 회계 후속 통합·배포 점검

> **상태**: COMPLETED
> **결과**: PR #811 main 통합·API verified 배포·배포 전후 HTTP 점검 완료. 전문 가격 준비·실사용 활성화는 별도
> **작성·갱신**: 2026-10-25 (Asia/Seoul)
> **지시**: push된 AI 작업을 main으로 병합하고 배포
> **공간**: `wo/ai-accounting-main-integration-20261025` (통합 담당)
> **시작 main**: `23717b6dc048e68932458ba9e7118f645259cc0b`

## 1. 통합 대상과 권한

선행 텍스트 회계 `d11cb4afa19b258409408a5822e342361594ca77`과 이를 포함하는 전문 호출 회계 `2d91d80128f6160811501a3e1fa90a32523cd39d`을 한 PR로 통합한다. 원격 두 branch의 SHA를 확인했고 기존 동일 AI PR은 없었다. 별도 서비스의 PR은 이 AI 통합에 섞지 않는다.

사용자의 이번 지시는 이 공간에서 PR 생성·CI/리뷰·병합·정상 배포를 진행할 권한이다. 기존 main checkout의 `work` branch/`1b158cf4c1`은 보존하고 새 main 기반 전용 worktree에서 원본 개발 branch를 정상 merge했다. 최초 통합 후 `apps`·`packages`·`scripts`·`.github` 소스는 `2d91d80128`과 차이 0이었으며 이후 §5의 실제 PostgreSQL 리뷰 보완을 추가했다. 신규 운영 migration·DB DDL·결제 계약·credential·배포 workflow 변경은 없다.

## 2. 기술 검증 근거

- [전문 호출 CHECK](CHECK-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md): 전체 API 583 suite/9,384 tests PASS·802 tests skipped, 최종 보완 후 별도 8 suite/147 tests PASS, 웹 소비 30 tests·admin/Neture/병원약국 타입 검사 PASS.
- 같은 source의 package/API 타입·tsc→database backup→tsup→restore 검증 PASS, database 산출물 2,400개 hash·bundle source map 일치 확인. 이 기록은 통합 PR의 원격 CI를 대신하지 않는다.
- 실제 main ruleset: PR 필요·`CI Gate` 필수·human approval 0·강제 갱신 금지. 우회하지 않는다.
- 원격 PR CI·리뷰 thread·main 최신 여부를 통합 직전 확인했다. 위 선행 개발 검증을 운영 증거로 대신하지 않으며 실제 결과는 §4를 따른다.

## 3. 배포 준비 조건

전문 경로는 기존 가격 catalog의 명시 모델/native profile 없이는 provider 이전에 거부한다. 이는 테스트 실패나 무료 사용이 아니라 의도한 비용 보호다. [전문 TODO §4](../work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md#4-구현-계약과-운영-준비-항목)는 가격 준비 없이 통합/배포 가능으로 판단하지 않도록 명시한다.

현재 `deploy-api.yml`의 Cloud Run 환경 전달에는 `AI_PRICING_CATALOG`가 없다. 기존 text wildcard 추정 catalog에는 native profile도 없다. 따라서 현 배포 정의만으로 이미지/PDF·화면 분석·검색·OCR·TTS·Qwen 가격 준비를 확인할 수 없다. GitHub repository/environment variable metadata API는 현재 integration token에 HTTP 403이며, GCP outbound identity는 연결되어 있지 않다. 값·secret을 읽거나 인증 경계를 우회하지 않았다.

사용자는 직전 개발 완료 보고의 가격 미설정 시 503·main 미반영 설명 이후 push된 변경을 main에 병합·배포하도록 지시했다. 이번 지시는 현재 코드의 비용 보호 규칙을 포함한 코드 배포로 적용하며 이전 TODO의 일반적인 준비 순서보다 현재 사용자 지시를 우선한다. 따라서 CI/리뷰/정상 Delivery gate를 통과하면 배포하되 **가격 미설정 전문 기능의 실제 사용 활성화까지 완료했다고 주장하지 않는다.** 이 가용성 제한은 진행 보고와 최종 결과에도 명시한다. 임의의 요율·synthetic 테스트 가격·새 과금 계약·workflow 변경으로 비용 보호를 우회하지 않는다.

## 4. 실행 기록

정상 Delivery 정책은 main CI 후 LEVEL_2 자동 verified 배포, LEVEL_3는 정확한 main SHA의 Promote다. 새 migration source delta는 없으며 기존 비용/quota migration의 과거 적용 증거를 이번 실행으로 다시 주장하지 않는다. read-only Promote dry-run은 현재 main의 serving/risk 판정 확인용이며 실제 배포가 아니다.

통합 PR은 [#811](https://github.com/Renagang21/o4o-platform/pull/811)이다. PR·CI·review·merge·배포 결과는 확인한 사실만 기록한다. 실제 유료 AI 호출·운영 DB 직접 접속/수동 SQL·새 가격/한도 저장은 실행하지 않았다. 표준 배포의 migration Job 실행 결과는 아래에 별도로 기록한다.

- PR HEAD `ed4b4438ee`: [CI 40172657919](https://github.com/Renagang21/o4o-platform/actions/runs/40172657919) SUCCESS·3 API shards·품질·admin build·CI Gate PASS, [CodeQL 40172657903](https://github.com/Renagang21/o4o-platform/actions/runs/40172657903) SUCCESS. P1 수정 후 미해결 review thread 0.
- Sonar의 추가 check는 신규 코드 중복률 **4.5% > 3%**로 FAILURE였다. 실제 main ruleset의 필수 check는 CI Gate이며 Sonar는 비필수다. 중복 정비는 후속 항목으로 보고했고 admin 우회 없이 정상 PR merge했다. 모든 외부 check가 PASS였다고 기록하지 않는다.
- PR #811은 main `67654de1fec1df5e50646d10155ead035e19c701`에 정상 merge됐다. source HEAD와 main의 전체 tree 차이 0. main [CI 40173600749](https://github.com/Renagang21/o4o-platform/actions/runs/40173600749)·[CodeQL 40173600770](https://github.com/Renagang21/o4o-platform/actions/runs/40173600770)는 SUCCESS다. 자동 [Delivery 40174309271](https://github.com/Renagang21/o4o-platform/actions/runs/40174309271)의 API·Report가 SUCCESS이며 target의 `production`은 **success / DEPLOYED · deploy: api**다.
- 실제 API job의 bundled build·image push·**Run database migrations**·Cloud Run deploy·새 revision readiness·traffic switch·전환 후 검증은 SUCCESS다. 이번 source에 새 migration은 없다. migration 실행 건수·실측 DB fingerprint·운영 SQL 결과는 직접 확보하지 않았으며 Job 성공과 구분한다. rollback-on-failure 검증이 통과한 정상 verified 경로이고 수동 우회·재배포 dispatch는 없다.
- 리뷰 보완 후 로컬 package/API 타입·tsc→database backup→tsup→restore PASS. 2,400개 database 산출물 hash·main/migrate 구문·수정된 SQL source map 일치, 변경 lint PASS. 관련 API **9 suite/162 tests PASS**와 실제 PG 28건은 서로 다른 검사다.
- 배포 전과 배포 후 같은 공개 HTTP·JS·API 건강·미인증 관리 경계 검사는 각각 **16/16 PASS**다. API `/health`·`/health/ready` 200, 관리 usage·quota/status 미인증 401, admin/Neture/KPA/lecture/store/community HTML·같은 host JS 12개가 200이다. frontend에는 runtime 변경이 없어 이번 Delivery에서 재배포하지 않았다. 현재 및 기준 checkout 모두 테스트 계정 SSOT 파일이 없어 실계정 사용량/한도·유료 AI smoke를 대신 실행하지 않았다.

read-only 사전 Promote `40172042333`은 classify SUCCESS·mutation jobs SKIPPED이며 실제 배포 증거가 아니다. 그 artifact는 외부 다운로드 host HTTP 403으로 열지 못했다. 최종 배포 판정은 위 정상 Delivery의 job/step 결과·Report·commit status와 별도 HTTP 점검에 근거한다.

이 결과 기록과 안내 문서 갱신은 Markdown만 수정한다. `DEPLOYMENT = NOT_APPLICABLE`이며 문서 main HEAD와 API serving SHA가 달라도 runtime 차이가 없으면 재배포하지 않는다. 코드/설정·원장·migration을 추가로 변경하지 않는다.

문서 정합: 이번 문서는 선행 개발 CHECK의 push 인계와 후속 main/배포 상태를 구분한다. 원래 개발 검증 기록을 배포 완료로 바꾸지 않는다.

## 5. PR 리뷰 보완 — UUID 비교

Codex의 P1은 관리 집계의 `provider_request_id = requestId::text` 비교였다. 두 실제 컬럼은 모두 UUID이며 한쪽만 text로 변환하면 PostgreSQL이 쿼리를 거부한다. UUID끼리 비교하도록 불필요한 cast 1개를 제거했다. schema/API/권한 변경은 없다.

기존 SQLite 검증은 PG cast를 제거해 이 문제를 숨겼다. 기존 격리 quota fixture 계약과 같은 loopback `55447`·전용 사용자·임시 DB만 사용하는 PostgreSQL 회귀 4건을 추가했다. 실제 PostgreSQL 16의 UUID·enum·JSONB 컬럼과 수정하지 않은 production query로 빈 원장·성공/실패 중복·OCR/Qwen 미확정을 확인한다. 수정 전 4건 실패로 재현했고 수정 후 신규 집계·기존 quota schema/예약/모델 제어 **4 suite/28 tests PASS**다. 운영 DB 설정은 소비하지 않았으며 Docker tmpfs에 생성한 fixture만 사용했다. 마지막 테스트 후 전용 DB 잔존 0과 전용 컨테이너 제거를 확인했다.

WORKTREE_DISPOSITION: 통합 `wo/ai-accounting-main-integration-20261025`(base `23717b6dc0`)와 문서 기록 `wo/ai-accounting-deployment-record-20261025`(base `67654de1fe`)는 각각 main 포함·CI·clean·남은 작업 없음 확인 후 표준 정리 대상이다. 원래 개발 branch/worktree와 기준 checkout의 `work` branch는 이 정리에서 변경하지 않는다.
