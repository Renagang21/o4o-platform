# AI 운영 가격 관측·전달과 검증 준비

> **상태**: COMPLETED · **작성일**: 2026-10-25
> **개발 범위**: main 통합 전 코드·로컬 검증·push 인계. 운영 적용/실사용 완료 아님
> **작업**: [TODO](../work-orders/TODO-O4O-AI-RUNTIME-OPERATIONS-READINESS-V1.md) · [운영 검증 인계](../guides/O4O-AI-RUNTIME-OPERATIONS-VERIFICATION-V1.md)
> **기준 main**: `7a75dcf6664b6b538846b117fbf355676d1a0f3a` · **branch**: `wo/ai-runtime-operations-readiness`

## 1. 변경·확인 결과

기존 parser/가격 catalog·모델 제어·quota/원장·optional env를 재사용했다. workflow에서 operator 제공/현재 catalog를 검증해 전달하는 source 연결, 기존 관리자 GET의 비밀 없는 process 가격 관측, 기존 CLI의 runtime snapshot 비교를 한 묶음으로 구현했다. native 명시 가격이 없는 기존 선차단과 실제 업무 권한·도메인 저장/확인은 유지한다.

통합 DB 검증에서 증거 정산 후 비용이 확정돼도 관리 집계가 미산정으로 세는 오류를 재현했다(7건 중 6 PASS/1 FAIL). 기존 host 정산 상태/evidence가 있는 native 비용은 미산정에서 제외하고, 여전히 알 수 없는 input/output token 상세의 미계측 표시는 유지하도록 읽기 집계를 수정했다. 실제 비용 합계·예약/정산·권한·사용량 API 필드는 바꾸지 않았다. 수정 후 실제 PG 5 suites/37 tests PASS와 fixture 정리를 확인했다.

새 Core/Extension·모델 registry·원장·route·role·schema/migration·dependency·유료 서비스 계약은 추가하지 않았다. workflow 수정은 제안 source이며 이번에 dispatch/운영 variable·credential·DB 변경을 하지 않았다. 기존 freeze/CI/WIF·migrate-only·verified rollout 경계를 우회하지 않는다.

## Shared Module Change Verification

### Changed shared module

- Module: `ai-pricing-observation`의 sanitized version/fingerprint/count, 기존 가격 CLI의 runtime snapshot 비교와 bounded file utility. 관리 snapshot/usage 및 기존 optional env helper·API deploy 배선.
- Package: API 내부 모듈·기존 admin API adapter. `@o4o/ai-core`·Frozen 공통 계약 변경 없음.
- Direct consumers: `AiManagementService.snapshot/usage`, 기존 관리자 management/usage GET·admin adapter, 기존 사전 점검 CLI·새 환경 flag validator, `deploy-api.yml`의 모든 optional env 소비처.
- Indirect consumers: 기존 모델/가격·회계 host가 생성한 모든 서비스의 관리 집계. 실제 실행 모델·provider·보류/원장·업무 저장/승인을 재구현하지 않는다.
- Census: import/symbol·관리 endpoint·source path·raw-source workflow/SQL assertions를 대조했다. helper는 가격/기본 provider·선택 결제 env/외부 AI 연결/상담 정리의 배선을 함께 검증한다. 상품 정정/갱신·협력 모임의 다른 담당 구현은 보존했다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|
| 서버 가격 metadata | 직접 | 파싱 상태·version/hash/count만. credentials/rates 원문·실행 성공을 노출하지 않음 | metadata/관리 snapshot·기존 HTTP 권한 회귀 | PASS |
| 운영 가격 CLI | 직접 | 기존 입력 호환, runtime 관측 mismatch/unavailable 차단, 관련 없는 응답 필드 비복사 | 실제 Node entry·입출력/exit·기존 20 suites 포함 회귀 | PASS |
| admin API adapter/화면 소비 | 직접 | pricing 필드 optional. 이전 서버 응답 호환·입력 검증 | 타입·기존 화면 24 tests·production build | PASS, 실제 browser/login 미실행 |
| native/legacy 관리 집계 | 직접 | 증거 정산 비용과 미계측을 분리, legacy unknown은 보수적으로 유지 | 실제 PG 모델→회계→집계 및 SQLite SQL·기존 enum/UUID/JSONB 검증 | PASS |
| Core/업무 host·권한 | 간접 | dispatch/저장/role 변경 없음. 관리 관측이 권한/예약을 대신하지 않음 | 관련 API 373 tests·실제 PG host callback/모델 전환/사용자 한도 | PASS (fixtures) |
| optional env·API 배포 배선 | 직접 | set/carry/omit 유지, 충돌 없는 delimiter·NUL 거부·mask escape. 현재 unknown/secret reference 거부 | 194 CI helper/배선/위험 판정 회귀·YAML parse·actual source CLI | PASS (local), GCP 적용 미실행 |

### Route / role / capability check

- Route existence: 새 route/menu 없음. 기존 `/api/ai/admin/management`만 additive pricing metadata 제공.
- Role guard: 기존 authenticate+requireAdmin/no-store 유지. 일반 사용자/소비자에게 운영 설정을 열지 않는다.
- Capability map: 업무 도구·모델 지원·read/draft·자료 공개·저장/게시/주문/삭제·확인 변경 없음.
- Visibility/filter·empty group/block removal: 화면/메뉴 변경 없음, 해당 없음. admin adapter의 optional 필드만 보완.
- quota/settlement: 기존 actor/service/scope·원자 lock·UTC 기간·보류·멱등 evidence와 원장/합계 유지. 미산정 집계의 의미만 보완.

### Smoke result

실제 Node source entry로 set/carry/omit 후보 3종·원본/기존 결과 보존·runtime metadata 일치 exit 0/불일치 exit 1/잘못된 관측 exit 2/잘못된 env exit 2를 실행했다. 후보는 synthetic이며 DB/provider 호출 0이다. 실제 GCP와 snapshot을 받아 검증한 기록이 아니다.

실제 PostgreSQL에서는 유료 transport를 대체하고 기존 ModelControl/Policy/AccountedExecution/TypeORM·관리 SQL을 연결했다. 정책 cache 뒤 모델 지정 변경의 다음 호출 반영, native enum 로그 중복 제거, global/user 한도, 미연결/가격/중지 거부, receipt 실패 rollback의 보류 유지와 재호출 금지, evidence 정산 멱등성, 권한 회수 뒤 출력 차단을 확인했다. 로그인/실제 조직 권한·provider 인증·품질은 미검증이다.

## 2. 검증 기록

| 검사 | 실제 결과 |
|---|---|
| 환경·설치 | Node 22.18.0/pnpm 10.25.0, frozen/ignore-scripts 설치·공통 package build PASS. lockfile/dependency 변경 없음 |
| 실제 PostgreSQL | 새 운영 통합 7건 포함 **5 suites / 37 tests PASS**. 추가 DB 전/후 0, 자신이 만든 tmpfs 컨테이너 제거 |
| 관련 API 회귀 | **23 suites / 373 tests PASS**. 초기 4 suites/85 tests는 중복 합산하지 않음 |
| 관리자 | API adapter/목록·모델 제어·기존 readiness **3 files / 24 tests PASS**, type-check·production build PASS |
| 배포 도구 | optional env·배선·위험 판정/orchestrator **194 tests PASS**. 실제 YAML parse로 가격 검증이 migration 전에 있는 것 확인 |
| 실제 CLI | set/carry/omit·runtime 일치/불일치/invalid·덮어쓰기 거부 PASS. 운영 설정 적용/유료 호출 없음 |
| API 타입/빌드 | type-check·tsc→database backup→tsup→restore·main/migrate syntax PASS. database **2,408개 파일 hash 일치**, 변경 runtime 2개 source map 일치 |
| lint | 변경 TypeScript 13개 오류/경고 0 |
| 문서·스코프 | 문서 6개 민감정보 패턴 0·상대 링크/절 109개 존재·공백 검사 PASS. 허용 경로 23개 |

초기 `--ignore-scripts` 설치 뒤 SQLite native binding이 없었다. 기존 선언된 better-sqlite3의 install로 로컬 binding을 준비하고 SQLite SQL을 포함한 최종 373건을 통과했다. dependency/lockfile은 수정하지 않았다. PG 최초 실패는 위 비용 표시 오류이며, source 수정 후 37건 통과로 확인했다. 실패·skip을 PASS로 합산하지 않는다.

## 3. 운영 미확인과 다음 통합 인계

현재 클라우드 관측은 current지만 identity/secret 연결이 없고 테스트 계정 변수 readiness는 unknown이다. 자기/기준 checkout 모두 현행 로컬 계정 SSOT가 없다. 실제 계정·운영 모델/가격/한도·provider·배포·유료 요청을 검증하지 않았다. API key/계정을 추측하거나 기존 Demo 계정으로 대체하지 않았다.

실제 선택 모델·공식 요율/입출력/단위 상한·현재 quota·허용 계정/예산·업무 fixture 정리 계획을 확정하고 [운영 검증 인계](../guides/O4O-AI-RUNTIME-OPERATIONS-VERIFICATION-V1.md)를 따른다. 기존 조건부 PG 테스트는 이번 명시 fixture로 실행했지만 전체 repository/Windows/desktop/mobile·실계정 UI 테스트는 이번 검증이 아니다.

이번 종료는 개발 branch push다. PR 생성/원격 CI·main 통합·배포는 실행하지 않는다. workflow source 변경은 통합 담당의 검토·현재 위험 판정/통제 배포 대상이며, 로컬 배선 검증이 실제 Cloud Run 적용을 뜻하지 않는다. 가격 native 준비·quota·credential의 관측과 외부 과금/매장·사용자 청구 구현을 구분한다.

문서 정합: 구조·전체 TODO·기존 가격 guide에 이번 branch와 새 운영 검증 인계를 연결했다. 기존 COMPLETED 기록·canonical index는 수정하지 않았다. 운영 적용/실사용 미검증 때문에 전체 TODO의 S2-2/S4-4 완료 표시는 유지하지 않는다.

검증 후 fetch에서 main은 `1fb15e4bd7`로 이동했으며 기준 이후 변경 2개 경로와 자기 작업 경로의 중복은 0이었다. 자동 merge/rebase 없이 시작한 base를 유지하고 push 인계한다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/ai-runtime-operations-readiness` · `wo/ai-runtime-operations-readiness` · base `7a75dcf666` · main/deployment 미실행 · 로컬 검증 PASS · 미병합 후속 수정용 KEEP. 기준 checkout과 다른 worktree는 보존한다.
