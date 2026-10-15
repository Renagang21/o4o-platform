# TODO-O4O-SERVICE-OPERATOR-ASSIGNMENT-AUDIT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-15 (KST)
> **근거**: 전체 관리자가 지정한 서비스 운영자와 각 서비스 로그인·운영 화면의 일치 여부 조사 및 단계적 오류 해소 요청

## 기준과 범위

전체 관리자(`admin.neture.co.kr`)와 서비스 운영자를 구분한다. 대상자는 사용자가 지정한
운영자 계정이며 공개 문서에는 실제 이메일·이름·사용자 ID·Google ID를 기록하지 않는다.
이메일을 권한 판정에 하드코딩하거나 Google 연결을 자동 병합하지 않는다.

관련 정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[계정·서비스 가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md).

기준 main `09e08d97df`의 별도 cloud checkout과 `wo/service-operator-assignment-audit`를 사용한다.
이전 인증 PR #554는 main에 통합됐으며 이번 단계와 배포 상태를 혼동하지 않는다.
운영 DB 변경·계정 연결/해제·권한 부여/회수·Core RBAC 계약 변경은 먼저 실제 원장과
변경 계획을 확인한다. 조사 결과 없이 사용자의 계정을 모든 서비스 운영자로 지정하지 않는다.

## 초기 TODO

- [x] 현재 정본·main·작업공간·전체 관리자 지정 API 확인.
- [x] 지정 원장 → 로그인 세션 → 서비스 API/라우트 → 프로필 메뉴의 경로 조사.
- [x] 운영 지정 원장에서 대상 계정의 서비스별 admin/operator 및 가입 상태를 읽기 전용으로 확인(아래 실제 조회 결과).
- [ ] 실제 Google 연결·사용자 ID와 지정 계정이 일치하는지 확인(실제 OAuth는 사용자 담당).
- [x] 확인된 UI 오류를 합성 계정으로 재현하고 수정 범위를 보완.
- [x] 첫 UI 수정의 지정 역할·미지정·타 서비스·회수·가입 상태·전체 관리자 경계 회귀.
- [x] 첫 UI 수정의 PC·모바일 메뉴와 기존 직접 URL guard 판정 일치 검증.
- [x] TODO 보완·검증 기록·이번 경로만 commit/push. [첫 UI 수정 PR #600](https://github.com/Renagang21/o4o-platform/pull/600).
- [x] PR #600 최신 HEAD `5fca45f8a9`의 CI/review gate 확인, main `d83b291cd6` 통합.

## 조사 후 보완

| 단계 | 확인한 근거 | 작업/판정 |
|---|---|---|
| 지정 | `OperatorAssignmentService.assign`은 선택한 userId의 Google 연결을 확인하고 transaction에서 role_assignments와 membership 존재를 처리 | 계정 이메일을 로그인 시 덮어쓰지 않는다. 기존 membership 정지/대기 상태는 보존된다 |
| 로그인 | Google sub → linked_accounts.userId → users.id; freshenUserContext가 같은 ID의 현재 역할·가입 상태를 읽음 | 과거 연결 기록만으로 현재 지정 계정의 적합성을 확정할 수 없음 |
| 원장 | 서비스 운영자 지정 catalog는 neture/kpa-society/lecture/kpa-branch/community/supplier/funding. store·약국 협력사업은 기존 계약/운영 화면을 별도로 추적 | 같은 운영 화면을 공유한다는 이유로 다른 서비스 역할을 인정하지 않음 |
| API·라우트 | supplier/funding/community의 보호 경로는 서비스 역할과 해당 membership을 검사 | 전체 관리자 bypass 등 기존 기술 계약은 이번 UI 수정으로 변경하지 않음 |
| UI 결함 | NetureUserMenuItems는 모든 host에서 neture:admin/operator 기준과 /admin, /operator를 사용 | supplier/funding/community의 지정 역할을 누락하고 타 서비스 메뉴를 보여줄 수 있음. PC·모바일 공통 소비처 모두 대상 |
| 현재 운영 계정 | 직접 DB/GCP identity·전체 관리자 브라우저 session 없이 기존 WIF read-only census 실행 | 대상 계정의 실제 집계를 확보했다. 실제 OAuth와 표시 계정 비교는 별도 확인 |
| 목록 유효기간 결함 | AdminUserController.getUsers의 역할 필터와 역할 batch는 is_active만 검사. RoleAssignment.isValidNow는 시작·종료 시각도 검사 | 격리 PostgreSQL에서 만료·미시작 역할이 목록과 검색에 포함되는 오류 재현. 사용자가 Core 파일의 두 조회 조건 최소 정합 수정을 승인했고 실제 PostgreSQL 회귀 후 main 반영 |

## 서비스별 추적표 — 2026-10-15 운영 read-only census 결과

| 지정 역할 prefix | 실제 서비스 key | 조사한 업무 진입 | 대상 운영자 원장 확인 |
|---|---|---|---|
| neture | neture | 대표 /admin, /operator; store의 약국 가입 심사도 기존 Neture 운영 역할 경계 | admin/operator 현재 · 가입 active |
| kpa | kpa-society | 약국 협력사업 운영 화면. membership/조직별 역할을 서비스 운영자 역할과 구분 | admin/operator 현재 · 가입 active |
| lecture | lecture | study 호스트 /operator; lecture 역할과 active membership | admin/operator 현재 · 가입 active |
| kpa-branch | kpa-branch | 분회 서비스 /service-admin; 개별 분회 운영자는 별도 개체 지정 | 현재 지정 역할 없음 · 가입 active |
| supplier | supplier | /admin/supplier-governance, /operator/suppliers | admin 현재 · 가입 active |
| funding | funding | /operator/market-trial | admin 현재 · 가입 active |
| community | community | /admin/communities, /operator/communities; 개별 커뮤니티 운영자와 구분 | admin/operator 현재 · 가입 active |

CarePharm은 현재 main의 커뮤니티 진입 host이며 별도 서비스 운영자 지정 role가 catalog에 없다.
이번 최소 수정은 기존 대표 업무 진입을 유지한다. 도메인을 독립 지정 서비스로 확정하거나
  `carepharm:operator`를 새로 부여하지 않는다. store도 이 조사에서 새 operator role를 만들지 않는다.

## 첫 수정과 실제 검증 — 2026-10-15 KST

- 기존 메뉴 코드에서 20조건 중 13 FAIL / 7 PASS로 지정 서비스 누락·타 서비스 노출을 재현했다.
- supplier/funding/community는 기존 `canSeeSubdomainOperatorPath`를 사용해 역할과 가입 상태를
  확인하며 해당 서비스가 이미 소유한 운영 경로로 연결한다. funding에 존재하지 않는 admin 경로를 만들지 않는다.
- PC 헤더·모바일 프로필이 함께 사용하는 NetureUserMenuItems만 수정했다. Neture/CarePharm의
  기존 대표 경계, 전체 관리자 route bypass, 공급자 사업자 본인 역할, 사용자 ID·표시 이메일을 변경하지 않았다.
- 신규 메뉴 22조건 + 기존 직접 URL guard 28조건 + 운영 링크 25조건 = 75/75 PASS.
  Neture 전체 101 suites 934조건도 PASS(마지막 CarePharm 2조건 보완 전). 그 보완 이후 집중 75조건과 웹 tsc/Vite production build를 확인했다.
- 전체 관리자 지정·Google 로그인·서비스 API scope·분회 지정 catalog의 기존 서버 4 suites 82/82 PASS.
- 빌드된 Neture bundle에서 공급자/펀딩/커뮤니티 × PC(1440×900)/모바일 viewport(390×844) ×
  operator/admin/타 서비스/pending/회수/전체 관리자 36/36 PASS. 합성 API·합성 session fixture이며 실제 OAuth·운영 계정 검증을 대신하지 않는다.
- 변경 파일 ESLint 오류/경고 0, diff check PASS.
- 격리 PostgreSQL에서 **기존 Controller SQL**로 현재 권한 3개가 아니라 5개가 반환되고,
  만료 역할 검색과 미시작 역할 검색도 각각 1행이 잘못 반환됨을 확인했다. 운영 DB 조회/수정은 실행하지 않았다.
- 최초 새 작업공간에서 의존성 준비 전 Vitest 실행은 runner 미설치로 미실행이었다. 의존성을 준비한 뒤
  실제 13개 실패를 재현했다. 최초 타입/빌드는 새 CarePharm HostProfile 누락을 잡았고 보완 후 통과했다.
- push 준비 시 main `761fb49e3e`의 펀딩 운영 화면 변경을 확인해 아직 push하지 않은 자기 branch만
  rebase했다. 현재 메뉴/역할/host 정본의 main 추가 변경은 없었다. 변경된 소비처 때문에 Neture 전체
  검증을 다시 실행했으며 최종 102 suites 946/946 PASS, tsc 포함 production build PASS다.
  최종 bundle에서도 PC·모바일 36/36을 다시 확인했다. 계정 원문과 권한을 변경한 smoke가 아니다.

첫 수정 3경로만 `wo/service-operator-assignment-audit`에 push하고 PR #600을 생성했다.
이 단계의 main 통합·운영 배포는 실행하지 않았다. 다음 실제 원장/Google 연결 확인과 Core 최소 수정은
아래 범위 확인에 이어 진행한다. WORKTREE_DISPOSITION: KEEP — 이번 조사·후속 수정이 미완료이며
기존 인증 checkout/다른 세션 작업공간은 변경하지 않았다. 자기 격리 PostgreSQL process는 검증 후 종료했다.

## Core 조회 최소 수정 — 2026-10-15 사용자 승인·구현

`AdminUserController.getUsers`에서 이미 쓰는 두 조회의 `is_active=true` 조건 다음에
`(valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)`와 `(valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)`를
추가해 현재 RoleAssignment의 유효기간 계약과 맞춘다. role 부여/회수/쓰기·반환 필드·권한 계층을 바꾸지 않는다.
두 조회의 최소 정합 수정을 사용자가 승인해 적용했다. 진단에 쓴 PostgreSQL은 자기 세션의
Unix socket 전용 격리 fixture이며 users/role_assignments는 합성 임시 테이블, 조회 이후 ROLLBACK이다.
기존 SQL의 실패와 수정 후 실제 SQL의 통과를 구분했다. 실제 PostgreSQL 회귀 2건은 대상/타 계정,
현재/만료/미시작/회수 역할·가입 상태·Google 연결 존재·변경 없는 재조회와 시간 경계 포함을 확인한다.

## 후속 실행 TODO

- [x] 기존 WIF read-only census 옵션 추가·실행 범위 확인(2026-10-15 사용자 승인).
- [x] 기존 WIF 경로의 standalone read-only 옵션과 masked census 구현.
- [x] 운영 원장의 대상 계정별 서비스 지정·유효기간·가입 상태 확인(조회 run #38665214095).
- [ ] 확인한 원장의 userId와 실제 로그인·Google 연결 결과 비교.
- [x] Core 목록 유효기간 조건 두 곳의 최소 수정 범위 확인·실제 PostgreSQL 회귀.
- [x] 후속 변경의 API/안전 회귀·CI/review·push·main 통합(PR #600).
- [ ] 운영 데이터 불일치가 확인되면 before/after 계획을 별도로 검토하고 전체 관리자 지정 경로로 수정.
- [x] main 통합·자동 API verified rollout과 4개 웹 origin의 수정 메뉴 map 제공 확인.
- [ ] 본인 운영자 Google 로그인 후 실제 운영 메뉴/업무 접근 확인(사용자 담당).

## 운영 조회 경로 — 2026-10-15 사용자 승인·구현

기존 `.github/workflows/pharmacyhub-qr-cutover.yml`의 WIF·Cloud SQL proxy·DB secret 연결을
재사용하는 **standalone 운영자 read-only census 옵션**을 추가했다. 워크플로의 기존 입력은 25개로
한도에 도달했으므로 입력을 삭제/추가하지 않고 기존 mode에 `operator-census`를 더했다.
해당 모드에서만 `probe_paths`는 대상 이메일 SHA256로 해석되며 기존 plan/apply의 경로 의미는 유지한다.
새 WIF/IAM/secret 값이나 운영 HTTP debug endpoint는 만들지 않는다.

- owner actor + main ref를 요구하고 다른 작업 입력과 혼합 실행을 거절한다.
- 대상 이메일 대신 검증된 SHA256 fingerprint를 입력으로 받는다. 원문·사용자 ID·Google sub를 출력하지 않는다.
- `BEGIN READ ONLY` / read-only 연결 / timeout / 반드시 ROLLBACK으로 서비스별 역할과 대상 계정
  일치 여부·유효 기간·가입 상태·Google 연결 존재를 요약한다. 다른 운영자의 개인정보는 출력하지 않는다.
- 계정·권한·연결·DB/schema·배포·revision·IAM 변경을 수행하지 않는다.
- workflow 변경과 조회 실행은 AGENTS.md §5의 CI infrastructure 경계에 따라 사용자가 승인했다.
- CLI는 기존 서버 운영자 catalog·canonical service key mapper를 그대로 읽는다. DB identity helper를
  사용하고 공백 DB_NAME·잘못된 fingerprint에서 secret/접속 전에 실패한다. 운영 후보 inventory에
  read-only 경로만 ACTIVE로 등록했다. 숫자·공개 role/service key·열거된 상태만 출력하며 추가 개인정보
  컬럼이 반환돼도 버린다. target 미존재·중복은 다른 계정을 고르지 않고 별도 결과로 보고한다.
- 전체 관리자의 target 권한 유무도 집계로 구분한다. Google 연결 존재는 실제 OAuth 소유 확인을 뜻하지 않는다.
- collector/실제 workflow gate/기존 Demo gate 10/10 PASS, 실제 격리 PostgreSQL 2/2 PASS,
  CLI 미연결 config 거절을 실제 runner로 확인했다. 운영 조회는 아직 실행하지 않았다.
- 기존 workflow 전체 안전 회귀는 193 PASS / 1 SKIP(기존 PostgreSQL cleanup integration)다.
  이번 census와 Controller SQL의 실제 PostgreSQL 2건은 별도 fixture에서 실제 실행해 PASS다.
  기존 Controller/DB identity 회귀 5 suites 70/70 PASS, API tsc·main/migrate ESM 빌드와 두 bundle syntax PASS.
  compiled database 코드 2352파일은 bundling 전후 보존했다(운영 DB backup/migration이 아님).
  새 CLI·collector·테스트 lint 오류/경고 0이며 Controller는 기존 UserStatus 미사용 warning 1개를
  그대로 유지한다. 승인된 두 조회 범위를 넓혀 import를 정리하지 않았다.
- 최신 리뷰 P2의 NULL 시작 시각 경계를 수용했다. `isValidNow()`가 nullable 시작을 현재 권한으로
  인정하므로 두 Controller 조회와 census의 현재 역할/전체 관리자 집계도 NULL을 허용하도록 맞췄다.
  실제 PostgreSQL fixture에 NULL 시작 서비스 운영자·전체 관리자와 필터/목록 비교를 추가해 2/2 PASS,
  collector/gate 포함 11/11 PASS다. NOT NULL migration이나 기존 역할 데이터 변경은 수행하지 않는다.

문서 정합: 과거 운영자 연결 기록은 당시 기록으로 유지한다. 현재 지정 결과는 새 실제 조회 근거로 판정한다.

## main 통합·실제 운영 원장 결과 — 2026-10-15

- [PR #600](https://github.com/Renagang21/o4o-platform/pull/600)의 최종 HEAD `5fca45f8a928247c9153c1cc939ef477a505ce91`에서
  required CI Gate·API Jest·Code Quality·Sonar·CodeQL과 최신 Codex review 완료, 미해결 스레드 0을 확인했다.
  실제 main ruleset의 PR/CI 경계를 준수해 `d83b291cd61f479d36b68b36e8b4ad3daab80540`에 통합했다.
  첫 UI 수정은 앞선 PR #601을 통해 main에 포함됐고 #600이 승인된 Core/read-only 후속을 통합했다.
- [대상 계정 census #38665214095](https://github.com/Renagang21/o4o-platform/actions/runs/38665214095)는
  exact main SHA `d83b291cd6`에서 실제 operator-census step SUCCESS다. 전체 로그 ZIP의 redirect가
  네트워크에서 거절돼 공식 개별 job logs API로 집계 JSON을 확보했다. 프록시/TLS 검증은 유지했다.
- 대상 계정은 유일한 활성 계정 1개, Google 연결 1개, 현재 `platform:super_admin` 지정 0개다.
  위 추적표의 6서비스에 현재 관리 역할이 있고 분회는 active 가입만 있다. 각 조회된 역할의
  미시작/만료/비활성 지정은 0개이고, 다른 계정의 현재 동일 역할 지정도 각 역할에서 0개다.
  supplier/funding은 admin이 지정돼 있으며 operator는 없다. 기존 서비스 guard가 admin도 인정하므로
  중복 operator 역할을 추가할 필요는 없다. catalog의 `kpa-branch:admin`은 조회 역할 행 자체가 없다.
  서비스별 admin/operator 행을 더해 서로 다른 사람 수로 해석하지 않는다.
- Google 연결 존재와 역할은 같은 target userId로 JOIN한 집계다. 실제 Google 계정의 이메일/sub는
  수집하지 않았으므로 사용자의 실제 OAuth 소유 검증을 완료했다고 주장하지 않는다.
  프로필은 O4O 기본 이메일을 표시하며 Google 계정 이메일과 다를 수 있다는 기존 명시 연결 계약은 유지한다.
- [화면 표시 계정 census #38665862802](https://github.com/Renagang21/o4o-platform/actions/runs/38665862802)도
  같은 main SHA에서 SUCCESS지만 개별 job 결과 다운로드가 proxy 403으로 거절돼 집계는 미확인이다.
  성공 exit code를 해당 계정의 지정 결과나 실제 OAuth 연결 일치로 해석하지 않는다.
- 필요한 GitHub 로그 목적지 `productionresultssa6.blob.core.windows.net`과
  `results-receiver.actions.githubusercontent.com`을 환경 설정 초안에 추가 저장했다. 기존 도메인·preset·
  script·credential 바인딩은 유지했다. 초안 저장은 게시/현재 runtime 적용이 아니며 게시 후 해당 기존
  job의 결과를 읽는다. 로그를 얻기 위해 같은 조회를 반복 dispatch하거나 네트워크 제한을 우회하지 않는다.
- 이번 census의 운영 role/계정/Google 연결/DB/schema/IAM/배포 변경은 0이다. 수동 배포 dispatch는
  실행하지 않았다. post-merge CI Gate·API Jest 3 shard·Code Quality·CodeQL은 SUCCESS다.
  기존 workflow_run 자동 [Delivery #38666079640](https://github.com/Renagang21/o4o-platform/actions/runs/38666079640)가
  API 배포를 진행 중이며 웹 job은 SKIP이다. 완료 전 운영 반영을 주장하지 않는다.

### 다음 단계와 구체적인 변경 판단

1. 허용 도메인 반영 후 화면 표시 계정의 기존 job 결과를 확보해 전체 관리자와 서비스 운영자를 대조한다.
   과거 문서의 계정 명칭을 현재 운영자 지정 사실로 사용하지 않는다.
2. 분회도 동일 대상 계정이 담당해야 한다면 **전체 관리자 직접 지정 경로**에서 그 계정의 userId를
   선택하고 `serviceKey=kpa-branch`, `role=kpa-branch:admin`만 지정하는 계획이다.
   before: 현재 역할 없음 / active 가입, after: 현재 역할 1개 / 기존 active 가입 보존.
   기존 `OperatorAssignmentService.assign` transaction을 쓰며 다른 role·계정 이메일·Google 연결·
   전체 관리자 권한은 변경하지 않는다. `kpa-branch:operator`나 플랫폼 권한을 새로 부여하지 않는다.
   현재 승인은 조회와 Core 두 조회 조건 수정이므로 이 실제 권한 부여는 AGENTS.md §5 확인 전 실행하지 않는다.
   전체 관리자 인증이 필요한 운영 변경이며 계정/권한 수정용 새 우회 경로를 만들지 않는다.
3. API·웹 배포 단계에서는 현재 Delivery/Promote gate와 migration 포함 여부를 확인하고 승인된 범위로
   진행한다. 실제 운영자 Google 로그인은 사용자 담당이며 본 단계의 합성 PC/모바일 회귀를 실제 OAuth
   PASS로 바꾸지 않는다.

WORKTREE_DISPOSITION: KEEP — 같은 미완료 WO의 실제 결과 기록을 이어 진행한다. 원래 checkout의
shared object 참조와 후속 원장 비교·배포 검증이 남아 있어 삭제하지 않는다. 새 독립 작업으로 재사용하지 않는다.
DEPLOYMENT: AUTOMATIC — 기존 Delivery의 API verified rollout SUCCESS. 웹 수정 map 제공 확인,
실제 운영자 OAuth/업무 접근은 사용자 확인 대기. 이 결과 기록만의 배포는 NOT_APPLICABLE.
문서 정합: 현재 원장 결과와 과거 명시 연결 기록을 구분하고 서비스 추적표·후속 TODO를 실제 결과로 갱신했다.

### 실제 웹 제공 코드 확인 — 2026-10-15

공식 대표·supplier·community·funding 4 origin의 HTML과 각 HTML이 참조하는 JS를
기존 프록시·검증된 TLS로 직접 GET했다. 모두 HTML/JS HTTP 200이며 공통 entry
`/assets/index-YTr_TncS.js`(SHA256 `f0d1afb6ecc92fbbbd3fcb123a0138c134eac4e6b4c7bc13479e7a6f2dc7eaaa`)에
이번 main/supplier/funding/community/carepharm별 운영 메뉴 경로 map이 포함돼 있다.
따라서 수정 map의 실제 웹 제공은 확인됐다. 문구/링크 존재만의 OAuth 회귀나 사용자의
기존 브라우저 cache 갱신 완료를 뜻하지 않는다. 본인 운영자 로그인·최종 메뉴 접근은 별도 확인한다.
API `/health/ready`도 HTTP 200 / ready다. 조회 시 자동 Delivery는 migration step SUCCESS,
verified traffic switch 단계 진행 중이었다. standalone census는 쓰기 0이며 자동 배포 workflow의
migration 실행과 분리해 기록한다.

### 자동 API 배포 검증

기존 [Delivery #38666079640](https://github.com/Renagang21/o4o-platform/actions/runs/38666079640)의
`API / build-and-deploy` job SUCCESS를 확인했다. 대상은 main `d83b291cd6`이며 신규 revision
readiness smoke·verified traffic switch·전환 후 readiness 검증 모두 SUCCESS다. 이것은 기존
workflow_run 배포의 결과 확인이며 새 promote/deploy dispatch나 IAM/권한/Google 연결 수정이 아니다.
현재 목록의 유효기간 조건은 해당 배포 소스에 포함된다. 인증이 필요한 전체 관리자 목록과 실제
운영자 OAuth를 직접 검증했다고 주장하지 않는다.
