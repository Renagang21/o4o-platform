# 서비스 operator의 일상 회원관리 권한 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-12
> **근거 WO/IR**: [서비스별 운영자 로드맵](WO-O4O-SERVICE-SPECIFIC-OPERATOR-ROADMAP-V1.md) · 사용자 공통 회원관리 권한 정비 지시
> **기준**: main `c9b630feb` · **작업 branch**: `wo/operator-member-daily-authority`

공통 회원관리 일상 권한 정비·main 통합·운영 배포를 완료했다.

## 확정 범위

전체 관리자(admin.neture.co.kr)는 서비스 admin/operator를 지정·회수한다. 서비스에서 operator 추가가 필요하면 오프라인으로 요청한다. 서비스 operator는 담당 서비스의 조회·승인·반려·사용중지·복구·일반 회원 역할 변경을 담당한다. 전체 계정 완전 제거와 민감한 삭제는 admin 업무이며 이번에 operator에게 열지 않는다. 운영자 지정 전후 가입 방식은 후속 조사 대상이고 자동 가입을 금지하거나 별도 가입을 강제하지 않는다.

## 조사 및 보완 TODO

- [x] 최신 main·회원관리 API·공유 화면·서비스 wrapper·권한 테스트 대조.
- [x] 최신 #505 계정 제거 작업 확인: Core 구현은 기본 비활성이고 이 작업에서 재구현/활성화하지 않음.
- [x] API 일상 업무와 삭제 권한 분리. 실제 활성 operator service scope만 사용.
- [x] 일반 역할 변경은 카탈로그의 서비스와 선택 서비스·대상 가입을 대조. 서비스 admin/operator 부여·회수는 전체 관리자 전용 유지.
- [x] Neture/KPA 목록·일괄 처리·편집·상세 및 Lecture/Community/Supplier/Funding 공통 wrapper 정비.
- [x] 삭제 슬롯·일괄 탈퇴와 일상 사용중지·복구 분리. 미변경 소비처는 기존 동작 유지.
- [x] API/공유 UI/웹 회귀·타입/빌드·PC/모바일 fixture 검증.
- [x] PR·필수 CI·리뷰·main 통합·필요한 배포 검증. 운영 DB write·실제 계정 삭제 테스트 없음.

## Shared Module Change Verification

| 소비처 | 영향 및 경계 | 검증 |
|---|---|---|
| Neture | 회원 목록·일괄 사용중지/복구·일반 역할·상세. 삭제는 admin | 웹 회귀·빌드 |
| KPA-Society | 회원 목록·일괄 처리·회원 유형 편집·상세. kpa prefix 유지 | 웹 회귀·빌드 |
| Lecture/Community/Supplier/Funding | ServiceMembersWorkspace 목록·상세 재사용 | 공유 fixture·서비스 빌드 |
| 전체 관리자 | 공통 UserDetailPage 신규 일상권한 prop은 기본 isAdmin; 지정/회수 API는 불변 | 공통 UI·중앙 역할 회귀 |
| 분회/개별 커뮤니티/사업 담당 | 별도 원장·guard는 이번 범위 밖. 서비스 membership 권한과 혼합하지 않음 | 소비처 조사 |
| PH/KCos | 퇴역 기능 복구/신규 역할 부여 없음. 기존 공통 prop 기본값 유지 | source census |
| Store/My Home/Forum | 직접 회원관리 컴포넌트 변경 없음. 계정/사업/개체 원장 불변 | source census |

## 구현 전 확인한 차이

memberManagementPolicy는 정지·복구·membershipRole·역할 부여를 서비스 admin으로 제한했다. shared console의 canManageLifecycle은 삭제 노출까지 결합했고 상세 화면 isAdmin도 일상 작업과 삭제를 같이 제어했다. API의 일반 역할 변경은 선택 서비스뿐 아니라 해석된 카탈로그 서비스 및 해당 대상 가입을 확인해야 한다. 기존 서비스 admin/operator tier 제한·자기 역할 회수 보호·Demo 보호는 유지한다.

## 문서 정합

기존 상위 roadmap의 admin 전용 정지/복구 설명은 이번 사용자 정정과 다르다. 과거 실행 기록을 소급 변경하지 않고 본 WO와 현행 회원관리 표준에서 일상 업무 분담을 설명한다. 앞선 용어 문서 정비는 별도 `wo/admin-terminology`에 보존돼 있으며 이 작업으로 그 변경을 덮어쓰지 않는다.


## 로컬 검증 및 외부 제약

- 공유 operator-core-ui: 6 files / 50 tests PASS. 일반 operator의 승인·사용중지와 삭제 미노출, 관련 공유 소비처 회귀.
- 공유 ui: 2 files / 21 tests PASS. 신규 canManageMembers로 상세 일상 업무를 열고 삭제를 분리; 서비스별 역할 목록·operator 역할 옵션 제외 검증.
- Neture: 71 files / 605 tests PASS. KPA-Society: 16 files / 132 tests PASS.
- API 권한/서비스 경계/운영 역할 회수 집중 회귀: 3 suites / 93 tests PASS.
- 공통 패키지·API TypeScript·Neture/KPA/Lecture의 타입 포함 production build PASS. lockfile/dependency/schema/migration 변경 없음.
- Chromium 공유 회원관리 fixture: 1440/390px에서 lecture operator + 타 서비스 admin으로 사용중지/복구 요청 및 serviceKey 유지 PASS; pageerror 0. 실제 서비스 앱 로그인·운영 데이터 검증을 대신하지 않는다.
- 변경 파일 ESLint, docs 민감정보 검사, git diff --check PASS.
- GitHub HTTPS Git fetch는 정상. GitHub API rulesets 요청은 현재 proxy에서 Forbidden이므로 PR 생성·원격 필수 CI/review·main 통합·배포 상태 확인은 차단. API 접근 실패를 Git 읽기/쓰기 인증 실패로 간주하지 않는다. 필요한 연결이 확보되면 PR gate부터 이어간다.
- 새 완전 제거 Core 기능의 운영 활성화와 실제 계정/파일 삭제는 이 작업 범위 밖이다.

### PR #508 CI 후속 수정

GitHub API 접근이 복구되어 PR #508 및 CI 38220836388 결과를 조회했다. API Jest 3개 shard와 영향 웹/Admin production build는 PASS, Code Quality Check의 frontend type-check에서 Admin이 공유 ui 테스트 소스까지 검사하며 새 fixture의 필수 labels 누락(TS2741)을 발견했다. 테스트 실행 및 패키지 build만으로 이 검사 범위를 검증하지 못했다. fixture에 labels를 명시해 수정하고 공유 ui 21개 테스트와 Admin type-check를 다시 실행한다. workflow/권한 정책은 변경하지 않는다. 새 HEAD의 원격 CI 결과는 따로 확인한다.

PR #508의 P1 추가 처리: 사용중지 복구와 탈퇴 복구를 구분했다. 회원관리의 단건 status·일괄 status·reactivate 요청 모두 실제 서비스 admin 목록을 복구 서비스에 전달하고, transaction의 잠긴 가입 상태가 withdrawn이면 해당 서비스 admin 권한 없이는 write 전에 거절한다. 타 서비스 admin도 우회할 수 없다. Neture 일괄 복구 후보도 operator에게 suspended만 제공한다. Core 복구 경로의 기존 외부 호출 계약은 선택적 파라미터로 유지하며 새로운 계정 제거 기능을 활성화하지 않는다. 격리 API 회귀 77개 PASS.

### 최신 main 통합 — 2026-10-12

main `c1bab86c0`의 PH/KCos 퇴역 역할 차단·계정 제거 후속 및 인증 안내 변경을 정상 merge로 반영했다. 회원/역할 컨트롤러와 복구 서비스의 충돌은 퇴역 대상 필터와 탈퇴 복구 admin 제한을 함께 유지해 해결했다. 퇴역 대상의 기존 차단 테스트를 유지하며 이 작업의 탈퇴 복구 fixture는 현행 lecture 서비스로 옮겼다. API 집중 회귀 4 suites / 112 tests와 API TypeScript build PASS. 충돌 해결 후 새 HEAD의 CI와 main 병합·서빙 결과를 따로 확인한다.


## 최종 통합·운영 배포 증거

- [PR #508](https://github.com/Renagang21/o4o-platform/pull/508)의 동기화 HEAD `f2cb7e3b5`는 [CI 38247930445](https://github.com/Renagang21/o4o-platform/actions/runs/38247930445)의 필수 CI Gate·품질·API 3개 shard·영향 빌드를 통과했다. 기존 Codex P1 탈퇴 복구 권한을 수정하고 스레드 해결을 확인했다. 우회/force push 없이 정상 merge했다.
- main 병합 commit: `614248fda7aa932b07fe17a9e2dac16da7835fe4`. [main CI 38249070875](https://github.com/Renagang21/o4o-platform/actions/runs/38249070875)와 CodeQL 38249070879 SUCCESS.
- [Delivery 38250084644](https://github.com/Renagang21/o4o-platform/actions/runs/38250084644)는 LEVEL_3 승인 배포로 보류했다. 사용자 main 병합·배포 지시에 따라 [Promote dry-run 38250419559](https://github.com/Renagang21/o4o-platform/actions/runs/38250419559) SUCCESS 후 동일 SHA의 [실제 Promote 38250715342](https://github.com/Renagang21/o4o-platform/actions/runs/38250715342)를 실행했다.
- 실제 Promote의 API·Admin·Neture·KPA-Society·Lecture·Store·KPA-Branch 배포와 최종 serving SHA Report 모두 SUCCESS. 해당 runtime SHA의 production status는 `DEPLOYED · deploy: api,admin,neture,kpa-society,lecture,store,kpa-branch`다. freeze/CI/현재 main SHA/serving 검증 경계를 우회하지 않았다.
- TLS 검증을 유지한 공개 화면 9개·API health 1개 HTTP 200, 6개 서비스 회원관리 API 비로그인 401: 총16개 PASS. 실제 계정 로그인·운영 회원 상태 변경·계정/파일 삭제 테스트는 수행하지 않았다.
- 이 완료는 첫 작업 묶음인 공통 회원관리 일상 권한 정비의 결과다. 전체 관리자의 지정 전후 가입 과정 보완·서비스별 업무 동선·My Home 통합 실계정 검증은 별도 후속이다. 계정 제거 Core 활성화·퇴역 서비스 복구를 포함하지 않는다.
- 본 결과 기록은 문서-only이며 DEPLOYMENT=NOT_APPLICABLE. 문서 commit과 실제 runtime SHA를 구분한다.
