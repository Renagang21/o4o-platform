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
- [ ] 운영 지정 원장에서 대상 계정의 서비스별 admin/operator 및 가입 상태를 읽기 전용으로 확인.
- [ ] 실제 Google 연결·사용자 ID와 지정 계정이 일치하는지 확인(실제 OAuth는 사용자 담당).
- [x] 확인된 UI 오류를 합성 계정으로 재현하고 수정 범위를 보완.
- [x] 첫 UI 수정의 지정 역할·미지정·타 서비스·회수·가입 상태·전체 관리자 경계 회귀.
- [x] 첫 UI 수정의 PC·모바일 메뉴와 기존 직접 URL guard 판정 일치 검증.
- [ ] TODO 보완·검증 기록·이번 경로만 commit/push·PR gate 확인.

## 조사 후 보완

| 단계 | 확인한 근거 | 작업/판정 |
|---|---|---|
| 지정 | `OperatorAssignmentService.assign`은 선택한 userId의 Google 연결을 확인하고 transaction에서 role_assignments와 membership 존재를 처리 | 계정 이메일을 로그인 시 덮어쓰지 않는다. 기존 membership 정지/대기 상태는 보존된다 |
| 로그인 | Google sub → linked_accounts.userId → users.id; freshenUserContext가 같은 ID의 현재 역할·가입 상태를 읽음 | 과거 연결 기록만으로 현재 지정 계정의 적합성을 확정할 수 없음 |
| 원장 | 서비스 운영자 지정 catalog는 neture/kpa-society/lecture/kpa-branch/community/supplier/funding. store·약국 협력사업은 기존 계약/운영 화면을 별도로 추적 | 같은 운영 화면을 공유한다는 이유로 다른 서비스 역할을 인정하지 않음 |
| API·라우트 | supplier/funding/community의 보호 경로는 서비스 역할과 해당 membership을 검사 | 전체 관리자 bypass 등 기존 기술 계약은 이번 UI 수정으로 변경하지 않음 |
| UI 결함 | NetureUserMenuItems는 모든 host에서 neture:admin/operator 기준과 /admin, /operator를 사용 | supplier/funding/community의 지정 역할을 누락하고 타 서비스 메뉴를 보여줄 수 있음. PC·모바일 공통 소비처 모두 대상 |
| 현재 운영 계정 | 직접 DB/GCP identity·전체 관리자 브라우저 session이 현재 cloud에 없음 | 확인 안 된 상태를 PASS로 쓰지 않음. 기존 운영 WIF 조사 경로를 재사용할 수 있는 구체적 옵션을 아래에 준비 |
| 목록 유효기간 결함 | AdminUserController.getUsers의 역할 필터와 역할 batch는 is_active만 검사. RoleAssignment.isValidNow는 시작·종료 시각도 검사 | 격리 PostgreSQL에서 만료·미시작 역할이 목록과 검색에 포함되는 오류 재현. Core 파일의 두 조회 조건 최소 정합 수정은 별도 범위 확인 대기 |

## 서비스별 추적표 — 현재 운영 데이터 결과는 미확인

| 지정 역할 prefix | 실제 서비스 key | 조사한 업무 진입 | 대상 운영자 원장 확인 |
|---|---|---|---|
| neture | neture | 대표 /admin, /operator; store의 약국 가입 심사도 기존 Neture 운영 역할 경계 | 미확인 |
| kpa | kpa-society | 약국 협력사업 운영 화면. membership/조직별 역할을 서비스 운영자 역할과 구분 | 미확인 |
| lecture | lecture | study 호스트 /operator; lecture 역할과 active membership | 미확인 |
| kpa-branch | kpa-branch | 분회 서비스 /service-admin; 개별 분회 운영자는 별도 개체 지정 | 미확인 |
| supplier | supplier | /admin/supplier-governance, /operator/suppliers | 미확인 |
| funding | funding | /operator/market-trial | 미확인 |
| community | community | /admin/communities, /operator/communities; 개별 커뮤니티 운영자와 구분 | 미확인 |

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

## 후속 실행 TODO

- [ ] 기존 WIF read-only census 옵션 추가·실행 범위 확인.
- [ ] 운영 원장의 대상 계정별 서비스 지정·유효기간·가입 상태 확인.
- [ ] 확인한 원장의 userId와 실제 로그인·Google 연결 결과 비교.
- [ ] Core 목록 유효기간 조건 두 곳의 최소 수정 범위 확인·회귀·push.
- [ ] 운영 데이터 불일치가 확인되면 before/after 계획을 별도로 검토하고 전체 관리자 지정 경로로 수정.
- [ ] 필요한 main 통합·배포 후 실제 운영 화면 검증. 현재 첫 UI 수정은 로컬 검증이며 배포 완료가 아니다.

## 운영 조회 경로 제안 — 실행 승인 대기

기존 `.github/workflows/pharmacyhub-qr-cutover.yml`의 WIF·Cloud SQL proxy·DB secret 연결을
재사용하는 **standalone 운영자 read-only census 옵션**을 추가한다.
새 WIF/IAM/secret 값이나 운영 HTTP debug endpoint는 만들지 않는다.

- owner actor + main ref를 요구하고 다른 작업 입력과 혼합 실행을 거절한다.
- 대상 이메일 대신 검증된 SHA256 fingerprint를 입력으로 받는다. 원문·사용자 ID·Google sub를 출력하지 않는다.
- `BEGIN READ ONLY` / read-only 연결 / timeout / 반드시 ROLLBACK으로 서비스별 역할과 대상 계정
  일치 여부·유효 기간·가입 상태·Google 연결 존재를 요약한다. 다른 운영자의 개인정보는 출력하지 않는다.
- 계정·권한·연결·DB/schema·배포·revision·IAM 변경을 수행하지 않는다.
- workflow 변경은 AGENTS.md §5의 CI infrastructure 경계 때문에 범위를 확인한 뒤 적용한다.

문서 정합: 과거 운영자 연결 기록은 당시 기록으로 유지한다. 현재 지정 결과는 새 실제 조회 근거로 판정한다.
