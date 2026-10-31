# 관리자 서비스 상태·권한 화면 정비 검증

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **상태**: COMPLETED
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21 (Asia/Seoul)
> **근거 WO/IR**: [정비 TODO](../work-orders/TODO-O4O-ADMIN-HEALTH-AUTHORITY-CONSOLIDATION-V1.md)
> **관련 정본**: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · [전체 관리자 상태 규칙](../platform/hub/HUB-UX-GUIDELINES-V1.md#10-전체-관리자-서비스-상태-화면)

## 조사와 정비 판정

기준은 `origin/main=ac38af8df1941e349924efb00eebb1b5a868f3c8`의 새 전용 worktree다. 과거 조사표를 그대로 수정 대상으로 재사용하지 않고 route·메뉴·API·역할 투영·상태 원장·실제 소비처를 다시 확인했다.

| 대상 | 확인한 문제 | 구현 |
|---|---|---|
| `/admin/platform/hub` | 고정 KPA/Neture 업무 통계 두 항목. 가입 대기·승인율로 정상 판정, 빈 작업 목록이면 수집 실패에도 전체 정상 표시, 콘텐츠는 실제 집계 없이 0/0 표시 | 서비스 상태로 명칭/목적 정비, 현행 12개 공식 주소의 기본 HTTPS·HTML·동일 origin 앱 JS 응답 및 공통 API 시작 READY·DB SELECT 1 확인 |
| 글로벌 trigger | 전체 관리자 화면에서 서비스별 검토·승인·갱신 실행을 프록시. 화면 외 소비처 없음 | UI 및 `/api/v1/platform/hub/trigger` 제거. 각 서비스 자체 업무 API·원장은 유지 |
| `/users` 권한 할당 | 서비스 운영자와 같은 사용자/역할을 중복 조회, 신규/편집이 실제 역할 편집을 제공하지 않는 계정 폼으로 이동 | 독립 메뉴 제거. 기존 목록·추가·상세·편집 URL은 기존 전체 관리자 guard 아래 `/operators`로 이동 |
| `/operators` | 전체 관리자 역할까지 운영 역할로 표시 | 서비스 관리자·운영자로 통합. 플랫폼 역할·무접두 플랫폼 운영 역할은 주 목록에서 제외. 기존 지정·서비스 역할 해제 유지 |
| 기타 기존 권한 | 메뉴만 제거하면 기존 역할 회수 동선이 없어짐. 마지막 역할 해제 뒤 empty roles를 기본 user로 재투영하는 문제가 browser에서 확인됨 | 접힌 보조 영역에서 실제 기존 기타 역할 조회·개별/일괄 회수. 새 역할 부여·계정 편집 링크 제거. roles가 빈 계정에 가짜 권한 행을 만들지 않음 |
| `/settings/admin-accounts` | 전체 관리자 전용 안내와 달리 neture:admin/operator도 포함, 사용자 모든 역할 노출 | 서버 목록 대상을 platform:super_admin으로 제한하고 표시 역할도 하나만 반환. UI도 혼합 응답을 방어적으로 제외 |
| 관리자 추가 지정 | 목록만 좁히면 기존 서비스 계정 행에서 전체 관리자 권한을 부여하던 동선이 사라짐 | 기존 Google 사용자 후보 검색 → 사용자 명시 선택 → 확인 → 기존 공식 `POST /admin/platform-accounts/:id/super-admin`. 신규 계정/비밀번호 생성 없음 |
| 계정 활성 변경 | 관리자 계정 상태 endpoint가 서비스 전용 사용자도 변경할 수 있음 | 대상이 전체 관리자 역할을 보유하는지 서버에서 검증. 공통 계정 활성 변경과 서비스 역할 회수의 차이를 UI/확인에 표시 |
| 계정 관리 중복 진입 | `/admin/platform/accounts`와 설정 탭이 같은 계정 목록/상태를 따로 구현 | 단일 `/settings/admin-accounts`로 통합, 옛 북마크는 redirect, 메뉴/홈 카드 연결 갱신 |

`platform:super_admin` 권한 회수 API는 기존 계약상 없으며 새로 만들지 않았다. 공통 계정 상태 관리의 본인·마지막 활성 전체 관리자 보호와 권한 부여의 Google 연결·활성·Demo 보호·멱등 처리·정식 role writer를 유지한다. 실제 역할/계정/사업/가입 데이터를 자동 정리하지 않았다. 서비스 Admin의 자기 서비스 Operator 지정 책임은 기존 정책 그대로다.

## 상태 점검의 실제 범위

| 종류 | 대상/의미 |
|---|---|
| 약국 협력사업·연합회 | pharmacy, carepharm, drugstore, pharmcoop. 주소는 기존 `PHARMACY_COLLABORATORS` 사용 |
| 독립 서비스 | supplier, community, kpa.neture.co.kr(분회), study, funding. 주소는 기존 service catalog 사용 |
| 공통 공간 | neture 대표 홈, store 내 매장, admin 전체 관리자 |
| 외부 요청 | 서버 소유 고정 HTTPS 주소와 그 HTML의 동일 origin `/assets/` JS만 GET. cookie/Authorization 전달 없음. redirect를 따라가지 않음 |
| 제한 | HTML 512KiB, 대상별 약 4초, 최대 동시 6곳, DB 확인 2.5초, 동일 작업 동시 요청 합류 및 최근 결과 60초 재사용 |
| 상태 | 개별 확인/실패/확인 불가와 실제 점검 시각. 실패·빈 작업·0건·오래된 결과로 전체 정상 판정하지 않음 |
| 하지 않는 검사 | 실제 JS 실행·서비스 identity 일치·Google 로그인·역할/가입·신청/승인·결제·AI·모든 API/업무 원장 일치. UI에 명시 |

같은 앱을 공유하는 서브도메인도 각각 HTTPS/HTML/JS 응답을 확인하지만 그 사업이 활성이라는 판정은 하지 않는다. 공통 기반은 현재 API 프로세스의 시작 상태와 DB 읽기 응답이며 DNS/LB·모든 서비스 API·schema 정합성 보장이 아니다. 네트워크/TLS/DNS/시간 제한은 확인 불가로 표시하며 서버 오류 원문은 반환하지 않는다. 오래된 상태와 재조회 실패에는 이전 결과임을 표시한다. 이 작업은 예전 sites 기반 monitor를 복구하지 않는다.

## 검증 환경·실행 결과

격리 cloud worktree, Node 22.18.0/pnpm 10.25.0, 합성 사용자·역할·Google 상태와 합성 HTTP 응답을 사용했다. 앱의 실제 route·API client·표·권한 gate를 통해 검증하고 공급자·운영 DB·공유 browser profile은 사용하지 않았다. 실제 계정 기준 파일은 현재 worktree와 기준 checkout 모두 없어서 운영 Google 로그인·실제 계정 권한 변경을 실행하지 않았다.

| 검증 | 결과 |
|---|---|
| API 상태·HTTP 가드·전체 관리자 목록/상태 범위·정식 부여 보호·후보 검색·퇴역 모니터/도구 재등장 방지 | Jest 7 suites / 47 PASS |
| 관리자 전체 | Vitest 29 files / 435 PASS. 상태 실패·미확인·오래된/불량 응답·재시도, 관리자 혼합 응답 제외·후보 지정·실패 유지·실패 조회 시 쓰기 차단·가짜 user 역할 재등장 방지 포함 |
| Chromium | PC 1280×800/mobile 390×844의 신규 상태·오류/재시도·권한 회수·관리자 지정/실패/재조회·옛 URL 통합 및 기존 플랫폼 메뉴 회귀 10 PASS. 캡처 시각적 검토·page error·페이지 가로 넘침 확인 |
| API/관리자 타입·운영 빌드 | API tsc --noEmit 및 정식 build, 관리자 type-check 및 Vite 운영 build 모두 exit 0 |
| 변경 TS/TSX lint | 31개 파일 error 0. 기존 OperatorsPage effect의 fetchUsers 의존성 경고 1건 유지 |
| 문서 | 신규/갱신 4개 문서의 상대 링크·민감정보·diff whitespace 검사 |

주요 명령은 `pnpm --filter @o4o/api-server exec jest --runInBand <대상 spec>`, `pnpm --filter @o4o/admin-dashboard exec vitest run`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm --filter @o4o/admin-dashboard exec playwright test src/test/e2e/admin-health-authority.spec.ts src/test/e2e/platform-menu-cleanup.spec.ts --project chromium --workers 1`이다. 필터 의존 패키지를 frozen/offline 설치·빌드한 뒤 타입/앱 빌드를 실행했다. 최초 타입 검사 중 의존 패키지 빌드가 끝나기 전 missing module은 준비 완료 뒤 재실행으로 해소했다.

### 실제 운영 검증과의 구분

운영 배포·운영 endpoint의 새 기능·실제 Google 계정·실제 role writer의 운영 DB 변경·실제 12개 host 점검 결과는 미검증이다. 상태 조회의 공급자 응답은 테스트에서 합성했으며 이 결과를 운영 서비스 정상 증거로 보고하지 않는다. 권한 변경은 모두 메모리 fixture에서만 수행하여 운영 데이터 생성/변경/정리 대상은 없다.

## 문서·Git 인계

- 역할별 업무공간 §0에 관리자/서비스 관리 책임과 화면 통합을 반영하고, 과거 Operator 추가 오프라인 요청 설명을 2026-10-20 기존 결정에 맞췄다. HUB UX §10의 전역 업무 trigger/3섹션 의무를 이번 사용자 승인에 따라 기본 기술 상태 점검으로 정비했다. 다른 서비스 Hub의 업무 동작이나 공용 Core/Frozen 계약은 바꾸지 않았다.
- 과거 CHECK의 플랫폼 HUB `NO_API` 판정 등은 당시 기록이므로 다시 쓰지 않았다. 현행 소비처·범위는 이번 코드·정본/TODO/CHECK를 따른다.
- 새 schema/migration·seed·dependency/lockfile·CI/인프라 변경 없음. 기존 계정·역할·가입 데이터 삭제/자동 회수 없음.
- repo `Renagang21/o4o-platform`, branch `wo/admin-health-authority-consolidation`, base `ac38af8df1941e349924efb00eebb1b5a868f3c8`.
- 개발 종료는 commit/push 및 원격 SHA/clean 확인. PR·CI·main 통합·운영 배포 미실행. `DEPLOYMENT=REQUIRED`: API·관리자 변경의 별도 통합/배포가 필요하다.
- `WORKTREE_DISPOSITION`: 작업 branch와 전용 worktree는 통합 전 보존(`KEEP`). 최종 commit·원격 SHA 일치·clean은 최종 보고/Git에서 확인한다. 기준 checkout과 이전 AI 개발 branch는 수정하지 않았다.

## 후속 통합 진행 · 2026-10-21

이전 절은 개발·push 종료 시점 기록이다. 이후 사용자의 병합·배포 지시 및 재개에 따라 이 공간이 통합 담당으로 PR [#752](https://github.com/Renagang21/o4o-platform/pull/752)를 생성했다. 다른 공간의 배포가 완료됐음을 확인했으며 main `3c66a4191594697d3cb42eaa5b4e4db4513d664f`를 merge했다. 이전 운영 serving SHA는 `249f0657319a8d45d237641b66503c8b44b95788`, 그 뒤 문서-only Delivery는 `NO_DEPLOY`였다.

통합 후 API 핵심 HTTP·상태 28건, 관리자 435건, PC/mobile Chromium 10건이 통과했다. Codex의 분회 asset prefix 지적은 `vite.config.ts`의 `/kpa/` base와 Dockerfile의 `/kpa/assets/` 서빙을 대조해 수용했다. 분회에 한해 해당 경로를 지원하며 동일 origin·인증 미전달·redirect 금지 조건을 유지한다. 분회 정상·타 서비스 경로 거부·외부 origin 거부 회귀 3건을 추가했다. main 병합·운영 배포 결과는 완료 후 이 절 아래에 기록한다.

추가 SonarCloud PR 분석은 필수 CI Gate와 별개로 신뢰성 C를 보고했다. 이번 범위의 버튼 submit type·라벨/상태 접근성·목록 안정 key·오류 Error 객체·명시적 테스트 assertion을 보완하고, HTTP 상태/앱 파일 검사를 나누어 인지 복잡도를 줄였다. 불필요한 async map을 제거하고 서비스 의존 필드를 readonly로 고정했다. 6개 worker 내부의 순차 await는 동시 요청 상한을 지키기 위한 의도된 구조로 유지했다. 기준 main의 기존 Sonar 실패를 이번 PR의 성공으로 간주하지 않는다. 분회 경로 보완 뒤 API 핵심 회귀는 31 PASS다.

Codex 후속 검토의 관리자 상태 변경 거부 시 목록 소실도 수용했다. 전체 관리자 목록은 조회 실패(`readFailed`)일 때만 감추고, 본인/마지막 관리자 보호 같은 정상적인 쓰기 거부는 오류와 기존 목록·다른 계정 동작을 함께 유지한다. 해당 두 거부 응답의 회귀를 추가하고 기존 관리자 지정 거부 테스트에도 목록 유지 검증을 보완했다.

## 최종 통합·운영 배포 결과 · 2026-10-21

아래가 후속 통합 지시의 최종 결과다. 위의 개발 종료·운영 미검증 기록은 당시 단계의 이력으로 보존한다.

| 항목 | 실제 결과·근거 |
|---|---|
| PR 통합 | [#752](https://github.com/Renagang21/o4o-platform/pull/752), 09:29 UTC 병합, merge SHA `0d88c75696dffbd67cfb65819c32ea4b21702e12` |
| 최종 개발 검증 | API 핵심 HTTP/상태 31 PASS, 관리자 29 files/437 PASS, PC/mobile Chromium 10 PASS, 변경 경로 lint/타입 검사 통과. 추가 테스트는 본인/마지막 관리자 보호 거부 뒤 목록 유지까지 확인 |
| PR 기술 gate | [CI](https://github.com/Renagang21/o4o-platform/actions/runs/39575512573)·CodeQL·SonarCloud 통과. 최종 개발 HEAD `4e4dde7a819ce951016ed1906c4c065426eb0186` Codex 완료·추가 지적 0·미해결 스레드 0. 구버전 CI는 이번 공간의 수정 전 run만 취소했고 최종 HEAD CI는 성공 |
| post-merge | [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/39577313611)·CodeQL 성공 |
| API | [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/39578732622) LEVEL_2 자동 배포 성공. `o4o-core-api-04125-xod`, 위 main SHA, 단일 revision 100% serving |
| 관리자 | [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/39579810306) 1회. RBAC LEVEL_3 보류를 같은 main SHA로 통제 배포. `o4o-admin-dashboard-01547-xox`, 단일 revision 100% serving. production status DEPLOYED |
| 다른 서비스 | neture/kpa-society/lecture/store/kpa-branch/hospital-pharmacy는 serving→target runtime 차이 없음, NO_DEPLOY. 추가 재배포 없음 |
| 전환 검증 | API 새 revision 0%에서 Ready=True 후 100% 전환, 전환 후 `/health/ready` HTTP 200. 관리자 새 revision 0% 직접 URL smoke 뒤 100% 전환. 최종 보고는 실제 revision label과 SHA를 다시 조회 |
| 운영 공개 HTTP | `/health`, `/health/ready` 200. 관리자 root·`/admin/platform/hub`·`/operators`·`/settings/admin-accounts`·옛 `/users` HTML 200. 앱 JS 200이며 root asset이 배포 전 `index-BHHm7hej.js`에서 `index-DkFYsd8P.js`로 변경 |
| 운영 미로그인 Chromium | PC 1280×800/mobile 390×844 각각 위 네 보호 경로에서 `/login`의 관리자 로그인 h1 확인, 로그인 경계 8건 PASS, page error 0. 최종 PC/mobile 캡처 시각 검토 |
| 미인증 API | `/api/v1/platform/hub/summary`, `/api/v1/admin/platform-accounts` 모두 401. 인증 없는 상태 조회/계정 목록 접근 허용 없음 |

브라우저 검증 스크립트의 패키지 설치 경로·옛 로그인 문구 선택자는 현재 설치/실제 h1에 맞춰 바로잡고 재실행했다. 이 수정은 검증 도구에만 적용했고 운영 코드를 바꾸지 않았다.

운영 `/users`의 HTTP 200은 SPA 진입 응답을 뜻한다. 로그인 후 redirect·화면 권한·계정 변경 등은 격리 fixture 브라우저 검증과 구분한다. 운영 캡처의 Google SDK 로딩 오류는 이 클라우드 Chromium의 `accounts.google.com/gsi/client` 요청이 `net::ERR_TUNNEL_CONNECTION_FAILED`로 실패한 것으로 확인했다. 로그인 화면 진입/가드 확인을 Google SDK 버튼 실행 성공으로 보고하지 않는다. 실제 Google 계정으로 로그인하거나 실제 계정/역할을 변경하지 않았다. 운영 인증 후 12개 대상의 상태 snapshot 수집은 미확인이다. 이 작업에 새 schema/migration·seed는 없으며, 표준 API 배포의 기존 migration Job 실행은 성공했다. 직접 운영 DB write·IAM·동결 변수 변경은 하지 않았다.

### 문서 정합·종료 정리

HUB 정본의 동일 origin 앱 파일 규칙에 실제 분회 base `/kpa/assets/`를 보완하고 TODO·역할별 업무공간·HUB 정본의 개발 전/통합 전 표현을 현재 배포 결과와 연결했다. 과거 기록은 본문을 다시 쓰지 않고 후속 결과를 덧붙였다. 이 후속 변경은 문서-only이며 별도 PR·CI·main 반영 뒤 Delivery의 NO_DEPLOY를 확인하고 이번 작업 공간만 표준 절차로 정리한다. 다른 작업 공간과 이전 AI branch는 대상이 아니다. 종료 정리 실행 결과는 해당 후속 PR/최종 보고에서 확인한다.

문서 PR 검토에서 T12의 실제 정리 전 완료 표시를 지적해 수용했다. TODO의 후속 상태를 ACTIVE·T12 미완료로 유지하고, [현재 종료 정리 실행 기록](https://github.com/Renagang21/o4o-platform/pull/753#issuecomment-6313349336)을 별도 활성 추적으로 연결했다. 이 CHECK의 COMPLETED는 검증/배포 결과의 기록 상태이며 작업 공간이 이미 삭제됐다는 뜻이 아니다. 실제 정리 후 실행 기록을 갱신한다.
