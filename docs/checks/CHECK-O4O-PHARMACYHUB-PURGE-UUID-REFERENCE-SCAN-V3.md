# PH purge UUID 참조 검사 V3

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: [PH 퇴역 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md), [V2 검증](CHECK-O4O-PHARMACYHUB-PURGE-REFERENCE-SCAN-V2.md)

## 확인한 실패와 원인

개발 plan38700687056과 미디어 plan38700997020의 사용자 제공 Cloud Run 로그는 모두 stage=purge, PostgreSQL57014다. 성공 census는 출력되지 않았다. wrapper의 `PH_JOB_COMMAND_UNCONFIRMED permissions=run.jobs.execute`를 실제 IAM 거절로 해석하지 않는다. 두 실행은 읽기 전용이며 apply·WIF 변경을 실행하지 않았다.

main352df65dd의 SQL 재구성·SHA256 대조로 개발 `public.product_landings.product_master_id`(ebe51eccc65c1f19d906cfedbacc199b9408b784f8274cb7c9b1ce59b64e1fa0), 미디어 `public.product_identifiers.product_master_id`(d16a1d52d2e1e16a6118e0dbaa95720722dbe6986b04e0563e0c11f307c86cbc)를 각각 정확히 식별했다. 기존 V2는 대상 집합은 한 번만 만들지만 UUID 열 전체를 text로 변환해 정규식으로 검사했다. 두 열은 저장소 schema에서 UUID이고 기존 인덱스가 정의돼 있다.

## 변경과 유지하는 보호

catalog에서 실제 열 타입을 읽고 UUID 열만 native UUID `= ANY(ARRAY(...))`로 검사한다. 인덱스 열 자체를 text로 cast하지 않는다. 대상의 정규 소문자 UUID 문자열만 UUID로 변환한다. UUID 문자열 안에 나타날 수 있는 비정규·짧은 소문자 hex/hyphen 토큰은 별도의 materialized 부분 일치 검사로 보존한다. 정상 UUID 대상만 있으면 그 전수 검사 분기는 실행되지 않는다. media도 ID·URL·객체 경로 토큰을 모두 유지하며 UUID 문자열에 들어갈 수 없는 문자는 해당 타입 경로에서만 제외한다.

text·JSON·array는 기존 literal 정규식 검사를 그대로 사용한다. 전체 검사 테이블·열, timeout15초/lock5초, census·FK·소유권·Core fence·삭제 수량·GCS generation·롤백 경계는 유지한다. worker 소스는 여전히 standalone이며 새 dependency·migration·운영 인덱스 생성은 없다.

## 실행 검증

- Node focused36 PASS. 기존 두 실패 SQL의 SHA256을 고정한 회귀와 새 UUID 경로 검사를 포함한다.
- 실제 PostgreSQL15 기존 plan/apply·shared ownership·cross-schema FK·문자열/JSON 참조·Core fence·rollback fixture PASS. JSON 대용량 조건은 두 테이블 각각5000행×128KiB이며 동일15초 제한에서 통과했다.
- 별도 실제 PostgreSQL UUID query fixture PASS: 테이블별100만 행+NULL, 두 경로 모두 Bitmap Heap/Index Scan 실행, fallback Seq Scan Actual Loops0, target_values 생산1회. 실제 exact UUID 및35자 레거시 부분 문자열 탐지 결과가 기존 정규식 검사와 일치했다.
- 해당100만 행의 축약 대상 query fixture에서 개발 구식2825ms/수정2.1ms, 미디어 구식2196ms/수정1.2ms. 구식도 이 로컬 fixture에서는15초 안에 끝났다. 운영 timeout 재현·운영 속도 보장을 주장하지 않는다. 전체 삭제 검증의 고정 census는 별도 기존 fixture가 검증한다.
- 초기 planner 검사는 Index Scan만 허용해 실제 Bitmap Heap/Index Scan을 실패로 오인했다. 자식 Bitmap Index Scan 실행까지 확인하도록 검사를 수정했고 실제 전수 검사 미실행 조건은 유지했다.
- source/tests ESLint 오류0·문서 민감정보0·diff 검사 PASS. CI·Codex·main 반영·운영 plan 재실행은 아직 미완료다.

## 다음 실행

최신 main의 CI·배포 idle을 확인하고 이 수정 PR을 통합한 뒤, 정확한 최신 main SHA에서 개발·미디어 plan을 각각 실행한다. 두 plan의 성공·실제 census 확인 전 WIF 제한과 apply는 시작하지 않는다. PowerShell 작업은 사용자 요청대로 준비를 마친 뒤 필요할 때 진행한다. 삭제 후 고정 census plan이 자동0을 반환한다고 가정하지 않고 별도 읽기 전용 inventory로 잔여0·공유 보존을 확인한다. PH 운영 창이 끝나기 전 #610·#615 main 병합을 진행하지 않는다.

문서 정합: V2 실행 기록은 보존하고 이번 UUID 후속 단계와 실제 삭제 미실행을 구분한다.
