# PH purge 참조 검사 — UUID 기본키 구간 검사와 대상 집합 재사용

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-16 (V6)
> **근거 WO/IR**: [PH 퇴역 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md), [V3 검증](CHECK-O4O-PHARMACYHUB-PURGE-UUID-REFERENCE-SCAN-V3.md)

## V3 운영 plan 결과

#627은 main b2b9eaf99에 병합했고 해당 CI38728890271은 통과했다. 이후 문서 PR #630이 병합된 최신 main e6202355a의 CI38729762439도 통과했고 Delivery는 NO_DEPLOY였다. 실제 데이터·WIF는 변경하지 않았다.

- 개발 plan38730535162: PostgreSQL57014, 해시258048132b0bc3743a034c7b84ab89af832f622f8ff6b760d952eb09dee49bff. SQL 재구성·SHA256 대조로 public.product_landings.metadata의 기존 JSON 검사와 일치.
- 미디어 plan38730893771: PostgreSQL57014, 해시d69849326571a56da9279a0532339eadb52e5c8323abb7b5277dcda920f91ca4. public.product_identifiers.source_label의 기존 문자열 검사와 일치.
- 사용자 제공 Cloud Run 로그로 확인했다. Actions의 PH_JOB_COMMAND_UNCONFIRMED permissions=run.jobs.execute만으로 IAM 실패를 판정하지 않았다. 성공 census는 아직 없다.

UUID 열 변경만으로 전체 참조 검사를 끝내지 못했다. V3의 UUID 동등 검사와 부분 인덱스 대응은 유지하고, 대량 문자열·JSON의 한 쿼리 전체 검사를 추가로 개선한다.

## 변경과 검사 범위

catalog에서 유효한 단일 UUID 기본키를 확인하고, 자손 relation이 없는 테이블만 기본키 순서로 최대1024행씩 검사한다. NULL cursor는 첫 행부터 시작하고, 이후에는 직전 구간의 마지막 UUID보다 큰 행을 검사한다. 구간 행 수·참조 수·마지막 UUID와 엄격한 전진을 확인하며, 모든 구간을 확인한 뒤에만 참조0을 반환한다. 중간 DB 오류·불완전 응답·정지 cursor는 즉시 실패한다. 참조가 있으면 기존처럼 삭제 전에 거절한다.

- 행 데이터는 PostgreSQL 안에서 원래 ::text COLLATE C와 동일 literal 정규식으로 검사한다. job 내부에는 구간 수량·다음 cursor만 반환하고 payload나 UUID를 로그에 출력하지 않는다.
- 소유권 판정은 원래 행 alias에서 계산하고 동일한 NOT COALESCE 조건을 유지한다. 대상 ID·URL·객체 경로 집합도 동일하다.
- 상속·partition 부모는 자손 전체를 포함하는 기존 검사를 유지한다. 자손의 키는 부모 PK로 유일성이 보장되지 않고 foreign descendant는 개별 relation 목록에서 빠질 수 있으므로 부모를 ONLY/keyset으로 대체하지 않는다.
- UUID 열은 V3 동등 검사 그대로다. 확인된 UUID PK가 없는 테이블도 기존 전체 검사를 유지하며 timeout은 실패로 처리한다. 어떤 테이블·열도 검사에서 제외하지 않는다.
- statement_timeout15초·lock_timeout5초·job timeout600초·트랜잭션·고정 census·FK·공유 데이터·Core fence·GCS generation 보호는 변경하지 않는다. 새 dependency·migration·운영 인덱스 생성은 없다.

## 검증

- focused Node49 PASS: 구간 경계, 마지막 구간의 참조, cursor 정지/비정상 응답, 중간 오류, 기존 UUID/비키 테이블 경로 포함.
- 실제 PostgreSQL 기존 전체 fixture PASS: plan/apply·공유 보존·Core fence·FK·rollback, 상속 자손 참조 거절, 각5000행×128KiB JSON 대용량 검사. 기존 fixture의 실행 계획 수는 한 번의 전체 검사에서 여러 구간으로 바뀐 것에 맞춰 갱신했다.
- 진단 실험: 격리200만 행에서 기존 cross join 정규식은 문자열·JSON 모두15초 timeout. scalar subquery 변경은 문자열8924ms였으나 JSON은 여전히15초 timeout이어서 해결책으로 채택하지 않았다.
- 실제 분할 검사200만 행 fixture PASS(총196.2초): 개발40428ms/미디어21711ms, 각각1954개 구간에서 scanned합계200만 행과 PK 범위 인덱스를 확인했다. 마지막 최대 UUID의 참조·NULL·literal 메타문자·배열 참조를 검증했다. 이후 작은 fixture에서 이름이 id가 아닌 UUID 기본키와 all-zero UUID 첫 행도 검증했다. 운영 속도 보장·운영 plan 성공을 주장하지 않는다.
- 초기 head1080da47b의 CI Gate는 통과했으나 SonarCloud는 새 코드 중복11.8%로 실패했다. 구간 SQL·진행 검증을 공통 pure 모듈로 추출했다. job loader는 이 모듈을 data URL로 포함해 serving image의 저장소 파일에 의존하지 않는다. 생성된 실제 worker 모듈로 전체 PostgreSQL fixture와200만 행 검사를 다시 실행해 통과했다.
- 새 Node 회귀를 기존 CI quality job에 blocking 단계로 연결했다. PostgreSQL fixture는 격리 DB opt-in이며 실제로 실행해 검증했다.

## 다음 단계

CI·Codex 리뷰를 통과한 뒤 main에 통합하고 정확한 최신 main에서 두 plan을 다시 실행한다. 성공 census 확인 전 WIF 제한·apply를 시작하지 않는다. main이 움직이면 기존 SHA의 WIF 조건을 재사용하지 않는다. #610·#615 통합은 PH 운영 창 뒤로 유지한다.

문서 정합: V3 실패·V4 후속을 구분하고 과거 성공으로 덮어쓰지 않았다.


## 2026-10-16 후속 — 전체 작업 제한과 테이블별 그룹 검사

> **기준**: main `20a04ee2a3337687eae86c4029b01d83b2479a1a`에서 구현, 문서 변경 main `c8c0eead3d508de6f2ad994ee8240771bd5db1f5` 동기화.
> **진행 상태**: PR #635 구현·격리 검증 완료. CI·리뷰는 각 head에서 확인하며 운영 plan·실제 삭제 완료와 구분한다. 트랙은 계속 ACTIVE다.

### 실패 근거

V4 개발 plan run38738916090 / job `ph-dev-38738916090-1`은 Cloud Logging에서 13:10:47Z에 전체 작업600초 제한 종료가 확인됐다. 개별 query57014나 IAM 실패로 판정하지 않는다. 성공 census는 없다. 미디어 plan run38740677821 / job `ph-media-38740677821-1`도 Cloud Logging에서 13:23:33Z 전체600초 종료를 확인했다. 두 plan 모두 전체 작업 제한은 확인됐지만 종료 당시 실행 중이던 쿼리는 로그로 특정할 수 없다. 이 수정 전 DB·GCS write, WIF 변경, apply는 실행하지 않았다.

### 수정

V4는 문자열·JSON·배열의 열마다 같은 테이블을 UUID 기본키로 순회하고, 각 구간에서 PH 대상 집합을 다시 찾았다. V5는 catalog로 확인된 leaf UUID PK 테이블의 비UUID 열을 묶어 한 번 순회한다. 같은 트랜잭션 snapshot에서 대상 ID·URL·객체 경로를 한 번 읽고 bind parameter로 재사용한다. 이 값은 job 내부 메모리에만 두고 SQL 문자열·로그에 삽입하지 않는다.

각 열의 원래 PostgreSQL `::text COLLATE C` 값을 독립적으로 검사한다. 열을 이어 붙이지 않으므로 서로 다른 열에 나뉜 문자열이 참조로 오인되지 않는다. 가장 짧은 대상의 byte 수보다 작은 값은 literal 부분문자열을 포함할 수 없으므로 CASE로 정규식 실행을 피한다. NULL·빈 대상·Unicode·메타문자·배열 의미를 유지한다. 참조 발견 시 원래 열 이름을 식별하고 삭제 전에 실패한다.

UUID 열의 동등 검사와 legacy fallback, 상속/partition 부모 및 비키 테이블의 전체 검사, 모든 원래 테이블·열의 검사 범위를 유지한다. timeout15초/600초, 고정 census, ownership, FK, Core fence, GCS generation, 트랜잭션·rollback은 변경하지 않는다. 새 dependency·migration·운영 인덱스는 없다. 기존 standalone worker의 공통 모듈 data URL bundling을 그대로 사용한다.

SIGTERM 수신 시 현재 단계·query SHA256만 기록하고 즉시 실패 종료하는 worker 진단을 추가했다. SQL 원문·parameter·행 데이터는 출력하지 않으며 제한 시간을 늘리거나 종료를 지연시키지 않는다.

### 검증

- focused Node53 PASS: 기존49건과 SIGTERM 해시 진단·그룹 구성·대상1회 읽기·cached bind·발견 열·잘못된 응답 회귀.
- 실제 생성 worker의 전체 격리 PostgreSQL fixture PASS(26.4초): plan/apply·공유 보존·FK·Core fence·rollback·상속 자손·각5000행×128KiB JSON 포함.
- 생성 worker의200만 행·세 열 그룹 fixture PASS(총281.8초): 개발43169ms/미디어48968ms, 각각1954개 구간·scanned합계200만 행. 동일 테이블 세 열을 한 번 순회하고 PK 범위 인덱스, 마지막 최대 UUID 참조, NULL, 원래 literal/배열 의미를 확인했다.
- 추가100,000행 비PH 대상 원본 +3200행 source fixture PASS(1.1초): 대상 집합1회 조회, 열 사이에 나뉜 token의 오탐 없음, 뒤쪽 열·배열 참조 발견, Unicode·빈 token·NULL 의미. 공통 identifier quoting 추출 후 생성 worker로 재검증했다.
- 변경 파일 ESLint PASS.
- 운영 plan 재검증 전이다. 로컬 속도를 운영 완료 시간으로 보장하지 않는다.

### 후속

PR CI·Sonar·Codex 리뷰와 최신 main CI/Delivery를 확인하고, main 및 운영 작업이 겹치지 않는 상태에서 개발·미디어 plan을 다시 실행한다. 두 성공 census를 확인하기 전에는 WIF 제한·apply를 시작하지 않는다. #610·#615 통합은 PH 운영 작업 뒤에 진행한다.

문서 정합: V4의 로컬 성공과 운영600초 실패를 구분해 후속으로 기록했다. 기존 기록의 성공 여부를 소급 변경하지 않는다.

## 2026-10-16 V6 — job runner 단계 진단·GitHub 재시도·참조 검사 병목

### 진단 (수정 전 상태)

- 개발 plan run38767007199, job ph-dev-38767007199-1, SHA df5f28a93. Worker는 16:13:38Z에 시작해 16:23:44Z에 census를 출력하고 exit(0)으로 끝났다(약597초). census는 삭제 대상41행·공급 제안19행 보존·미디어/GCS 보존이었다. worker stage·code·query_sha256 오류는 없었다.
- Actions 결과는 PH_JOB_NOT_CONFIRMED였다. 원인은 wrapper 필터 `/^PH_JOB_[A-Z_]+…$/`로, 운영 쓰기 gate 차단(`Production write gate blocked…`), inventory 불일치, GitHub 조회 실패, 예상하지 못한 예외를 모두 같은 문구로 바꿨다. execute 이후 실패도 worker 실패와 구분되지 않았다. 이 run의 실제 실패 단계는 남은 출력이 없어 확정하지 못했다.
- 운영 catalog를 read-only로 조사했다(행·값 미조회). 테이블309개 가운데, 구간 순회 대상 비UUID 열은1641개(272테이블), 비키 테이블 열은81개(19테이블), UUID 열은896개(299테이블)다. UUID 열 가운데 282개는 해당 열로 시작하는 full index가 없다. V5에서는 이 열마다 테이블 전체를 따로 순회했으며, 합계 약396만 행이다. 큰 테이블(product_candidates 약40만 행·938MB, shared_product_descriptions 약31만 행·587MB 등)의 감사·출처 UUID 열이 이에 해당한다. 이것을 600초 근접의 주요 병목 후보로 판단했다.

### 수정

- 단계 진단: runner를 preflight_gate, prepare, pre_create_gate, create, pre_execute_gate, execute, post_execute_gate, cleanup 단계로 나눴다. 실패하면 `PH_JOB_STAGE_FAILED stage=<단계> cause=<원인> [고정 필드] [job=…] [execution=succeeded] elapsed_ms=N` 한 줄을 남긴다. 원인 값은 PH_JOB 코드, `PRODUCTION_BUSY workflow=<파일> run=<번호>`, `PRODUCTION_INVENTORY`, `UNEXPECTED error=<오류 클래스>` 중 하나다. 실행 후 gate·정리 단계에서 실패하면 `execution=succeeded`를 붙여 worker 성공과 구분한다. gcloud 실패는 `reason=timeout|spawn|denied|exit`와 종료 번호만 남긴다. stderr·오류 원문·SQL·비밀값은 출력하지 않는다. 개발·미디어 wrapper도 같은 필터를 쓴다. 미디어의 GCS rollback 불가 안내는 유지했다.
- GitHub 재시도: 네트워크 예외와 HTTP 429/500/502/503/504에만 최대 3회(1초·2초 대기) 재시도한다. 모두 실패하면 PH_JOB_GITHUB_UNAVAILABLE이다. 다른 HTTP 오류(PH_JOB_GITHUB_GATE)와 JSON 오류는 재시도하지 않는다. main 변경(PH_JOB_MAIN_MOVED), CI 실패(PH_JOB_CI_REQUIRED), 운영 작업 중 판정은 정상 응답 한 번으로 즉시 차단한다. 기존 inventory 수량 불일치 재시도(InventoryCountError)는 그대로 둔다.
- 소요 시간: runner는 단계마다 `PH_JOB_TIMING stage=… elapsed_ms=N`을 기록한다. worker는 성공·실패·SIGTERM 시 `PH_PURGE_TIMING {total_ms,queries,current,by_kind,slowest(상위20)}`을 출력한다. phase label은 고정 이름과 catalog 식별자(schema.table.column)만 허용하고, 그 밖의 값은 `unlabeled`로 바꾼다. SIGTERM 시에는 기존 INTERRUPTED 한 줄을 먼저 쓴다.
- 병목 축소: catalog 조회에 `indexed`(해당 열이 첫 key인 유효 full index 존재 여부)를 추가했다. leaf UUID PK 테이블에서 `indexed=false`로 확인된 UUID 열만 그 테이블의 단일 구간 순회에 합쳤다. index가 있거나 확인되지 않은 UUID 열은 기존 index 경로를 유지한다. 판정 결과는 같다. UUID 텍스트는 `[0-9a-f-]`뿐이라 정규식 일치는 기존의 정확 일치와 짧은 legacy token fallback의 합과 같고, 다른 문자를 가진 token은 어느 경로에서도 일치하지 않는다. product_landings.product_master_id처럼 partial index만 있는 열은 구간 순회로 deleted 여부와 관계없이 모든 행을 검사한다. timeout(15초/600초)·검사 대상 테이블·열·FK·ownership·Core fence·고정 census·GCS 조건은 바꾸지 않았다. dependency·migration·운영 index 추가도 없다.

### 검증

- deployment focused 4파일(Node test): 58 PASS / 0 FAIL / 0 SKIP. 새 테스트는 GitHub 일시 오류 재시도와 상한, 4xx·응답 오류 즉시 실패, gate 결정 무재시도(main 이동·CI·운영 작업 중), 모든 gate 단계와 execute timeout·cleanup 거부 시 stage·cause·execution 표기, 미지 예외 원문 미노출, worker phase 집계와 label 정제·SQL/parameter 미출력, UUID 열 합류가 `indexed=false`일 때만 일어나는지를 확인한다.
- scripts/deployment 전체 Node test: 223건 중 216 PASS / 1 FAIL / 6 SKIP. FAIL은 Windows 경로(`C:\C:`)로 인한 기존 pharmacy-hub-resource-retirement 테스트이며 이번 변경과 무관하다(파일 미변경). SKIP 6건은 fixture URL이 필요한 PostgreSQL 테스트다.
- 변경 파일 ESLint PASS.
- 미실행: 격리 PostgreSQL fixture(PH_DEV_FIXTURE_URL·PH_PURGE_STRESS_FIXTURE=1)와 전후 소요 시간 비교. 이 PC에 loopback fixture DB 접속 정보가 없어 실행하지 못했다. 따라서 병목 축소 효과는 아직 측정하지 않았다. 운영 DB에서는 재현하지 않았다.

### 후속

- 통합 담당: PR CI·리뷰를 거쳐 main에 통합한다. 이후 fixture 측정이 가능한 환경에서 전후 PH_PURGE_TIMING을 비교한다. 그 다음 운영 작업이 겹치지 않을 때 최신 main에서 개발·미디어 plan을 다시 실행한다. 실패하면 stage·cause로 원인을 확정한다. 성공하면 PH_PURGE_TIMING으로 남은 병목을 확인한다. 두 성공 census를 확인하기 전에는 WIF 제한·apply를 하지 않는다.
- 남은 Cloud Run job 13개(ph-dev 38381041967·38469425232·38496164336·38500564796·38673377851·38700687056·38730535162·38738916090·38767007199, ph-media 38500950060·38700997020·38730893771·38740677821)는 통합 담당의 정리 단계에서 처리한다. 이번 작업에서는 실행·삭제하지 않았다.

문서 정합: V5 운영 결과(worker 성공·runner 실패)의 진단과 V6 수정을 구분해 기록했다. 기존 기록의 판정은 바꾸지 않았다.

## 2026-10-16 V6 통합 검증 — 병합 보류

통합 담당이 main `daad0563c` 기준 결합본에서 검증했다. 인계 source는 `c753b19157`, 검토 PR은 #650(Draft)이다.

- 실 PostgreSQL development fixture에서 UUID 열이 group의 첫 열이면 `bind message supplies 1 parameters, but prepared statement requires 3`(08P01)가 재현됐다. group descriptor가 첫 UUID 열의 type을 유지해 scalar count 경로로 들어간 것이 원인이다. development/media 모두 group을 우선하여 batch 경로를 사용하도록 보완했고 UUID 선두 묶음·마지막 page 탐지 회귀 2건을 추가했다.
- 보완 후 focused 60 PASS/0 FAIL/0 SKIP. Linux deployment 전체 225건: 219 PASS/0 FAIL/6 SKIP(일반 실행에서 opt-in PostgreSQL fixture 미지정). 변경 script ESLint PASS.
- 별도 loopback PostgreSQL에서 development plan/apply·공유 보존·cross-schema FK·JSON 참조·그룹 결제·rollback fixture PASS. batch 전체 범위·NULL·array·literal fixture PASS(3,200행). UUID query/planner fixture PASS(100만행). GCS는 합성 storage adapter만 사용했으며 실제 운영 API/DB/GCS 접속은 없다.
- 최초 development fixture 이름 오지정은 설정을 고쳐 재실행했다. 200만행 batch stress는 development 첫 전체 순회 79,660ms/1,954 query를 관측했으나 전체 시험이 300초 test timeout에 도달하여 중단했다. 이 stress 전체를 PASS로 보고하지 않으며 production timeout이나 테스트 제한은 상향하지 않았다.
- 별도 합성 비교: UUID PK + 비색인 UUID 8열 + 약1KB JSON, 10만행, 삭제 root token 41개, 동일 DB에서 V5/V6 연속 실행. V5는 9묶음·107 query·2,370ms, V6는 1묶음·99 query·21,422ms였다. 두 경로 모두 참조 0건을 반환했다. query 수 감소가 속도 개선으로 이어지지 않았으며 이 workload에서는 약9배 느렸다. 실 운영 데이터의 소요 시간을 의미하지 않는다.

**판정: #650 Draft 유지.** UUID 묶음 최적화는 효과가 검증되지 않아 병합·운영 plan 재실행·apply를 보류한다. 단계 진단 수정과 성능 변경을 분리하거나, native UUID 판정을 보존하는 개선안을 별도 비교 검증한 뒤 같은 branch에 추가 push한다. 운영 WIF·IAM·DB·GCS 및 기존 Cloud Run job은 변경하지 않았다.

## 2026-10-16 V6 후속 (V7) — UUID 묶음 퇴행 원인과 수정

위 V6 통합 검증의 판정(병합 보류)과 200만행 stress 미완료·V6 퇴행 기록은 그대로 둔다. 이 절은 같은 branch에 추가한 수정과 그 검증만 다룬다.

### 원인

- 같은 형태의 합성 workload를 loopback PostgreSQL 16.15에서 재현했다. 구성: UUID PK, 비색인 UUID 8열, 약1KB JSON metadata(평균995바이트), 10만행(134MB), 삭제 root token 41개. 참조는 0건이다. V5 9묶음·107 query 약2.8초, V6 1묶음·99 query 약15초로 같은 방향의 퇴행이 나타났다(통합 측정 2,370ms/21,422ms와 장비가 달라 절대값은 다르다).
- 성분별로 측정했다. V6 형태에서 metadata 한 열만 묶은 group도 같은 열의 V5 group보다 느렸다(4.5초 대 2.6초). 원인은 두 가지였다.
  1. V6는 UUID 열을 `::text`로 바꾼 뒤 41개 token 정규식 전체를 매 행 적용했다. V5의 UUID 경로는 native `= ANY(uuid[])` 일치와 짧은 legacy token 정규식만 쓴다.
  2. 새 query의 `found` CTE가 inline되어, `count(found.ordinal)`과 `min(found.ordinal)`에 같은 판정식이 각각 들어갔다. 따라서 모든 정규식이 행마다 두 번 평가됐다. V5 group은 LATERAL 부질의라 해당하지 않았다.

### 수정

- `groupedReferenceQuery`가 group의 열별 type(`types`)을 받는다. UUID 열은 text로 바꾸지 않고 `source.vN = ANY(targets.uuids) OR (targets.legacy_pattern IS NOT NULL AND (source.vN::text COLLATE "C") ~ targets.legacy_pattern)`로 판정한다. 기존 단일 UUID 경로와 같은 의미다. 정규형 UUID token은 정확 일치만 쓴다. `^[0-9a-f-]{1,36}$`인 비정규 token은 legacy 부분 일치로 검사한다. 그 밖의 문자를 가진 token은 UUID 열에서 일치하지 않는다. text·JSON·array 열은 기존 정규식 판정을 그대로 쓴다.
- `found`를 `MATERIALIZED`로 고정해 판정식을 행마다 한 번만 평가한다.
- 통합 보완 9cc454f8c5(group 우선 batch 경로)는 유지했다. timeout·검사 테이블/열·Core fence·FK·ownership·census·GCS 조건은 바꾸지 않았다. 단계 진단·GitHub 재시도 코드는 바꾸지 않았다.

### 성능 비교 (합성, 운영 시간 아님)

동일 DB에서 fixture 생성(약3.4초)을 끝낸 뒤 측정했다. 측정 시간에는 대상 token 1회 조회와 모든 group 검사만 들어간다. 실행 순서는 V5→V6→V7→V7→V6→V5다. V5는 ef2a9164e8, V6는 697b5fa28, V7은 이번 수정본의 prepare·count 함수를 썼다.

| 행 수 | 버전 | 묶음 | query | wall time |
| --- | --- | --- | --- | --- |
| 10만 | V5 | 9 | 107 | 2,762 / 2,781ms |
| 10만 | V6 | 1 | 99 | 14,914 / 15,118ms |
| 10만 | V7 | 1 | 99 | 2,804 / 2,764ms |
| 50만(670MB) | V5 | 9 | 498 | 15,532 / 15,008ms |
| 50만 | V7 | 1 | 490 | 14,751 / 14,649ms |
| 50만 | V6 | 1 | 490 | 75,329ms(양성 대조 1회) |

50만행의 실행 순서는 V5→V7→V7→V5다. 이어서 마지막 page의 UUID 열에 참조 1건을 넣은 양성 대조를 V5·V6·V7 순서로 실행했고, 세 버전 모두 1건을 찾았다. 비교 결과 V7은 V6 퇴행을 해소했다. V5 대비 개선은 확인되지 않았고 동등 수준이다(10만행 ±1%, 50만행 약4% 빠름, 반복 편차 범위). query 수 감소를 속도 개선 근거로 쓰지 않는다. 이 측정은 운영 apply의 600초 여유를 입증하지 않는다.

### 검증

- focused 4파일(Node test): 60 PASS / 0 FAIL / 0 SKIP. group UUID 열의 native 일치, `::text` 미변환, legacy fallback, `types` 불일치 시 PH_PURGE_REFERENCE_GROUP, `found AS MATERIALIZED`를 단위 시험으로 확인한다.
- scripts/deployment 전체(Windows): 225건 중 218 PASS / 1 FAIL / 6 SKIP. FAIL은 기존 `C:\C:` 경로 문제가 있는 pharmacy-hub-resource-retirement 테스트이며 이번 변경과 무관하다(파일 미변경). SKIP 6건은 opt-in PostgreSQL fixture다.
- loopback PostgreSQL 16.15 fixture(127.0.0.1 전용 컨테이너, 검증 후 제거)에서 다음이 PASS다. development plan/apply·공유 보존·cross-schema FK·JSON 참조·그룹 결제·rollback. batch 전체 범위·NULL·array·literal(3,200행). UUID query/planner(5,000행). 새로 추가한 UUID 선두 group fixture(2,101행)도 PASS다. development·media 각각 canonical UUID 일치, JSON 중첩, NULL을 포함한 array, text 열을 마지막 page에서 탐지한다. UUID 한 글자가 다른 값은 일치하지 않는다. 짧은 legacy token은 UUID 열에서 탐지하고, 비hex token은 탐지하지 않는다.
- 200만행 batch stress: development 첫 전체 순회 52,283ms/1,954 query, media 첫 전체 순회 51,172ms/1,954 query를 마쳤다. 이후 EXPLAIN ANALYZE와 마지막 page 재검사 단계에서 300초 test timeout에 도달했다. **전체 PASS가 아니다.** 통합 측정(79,660ms)과 장비가 달라 직접 비교하지 않는다. timeout은 올리지 않았다.
- 변경 파일 ESLint PASS. 운영 DB·GCS·Cloud Run 접속, plan 재실행, apply, WIF 변경은 없다.

### 남은 위험

- 실제 운영 테이블 분포에서의 소요 시간은 측정하지 않았다. 운영 plan 재실행 결과(PH_PURGE_TIMING)로 판단해야 한다.
- 200만행 stress 시험은 여전히 300초 안에 끝나지 않는다.
- 단계 진단·GitHub 재시도만 먼저 통합하려면 `prepareReferenceGroups`의 UUID 합류 조건(`c.type==='uuid'&&c.indexed!==false`)을 V5의 `c.type==='uuid'`로 되돌리면 된다. 이 경우 group에는 UUID 열이 들어가지 않는다.
