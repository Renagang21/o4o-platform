# My Home 구현 검증

> **상태**: ACTIVE
> **검증일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **WO**: [WO-O4O-MY-HOME-IMPLEMENTATION-V1](../work-orders/WO-O4O-MY-HOME-IMPLEMENTATION-V1.md)
> **검증 환경**: 전용 Linux worktree, Node 22.18.0, pnpm 10.25.0, Chromium. 기존 frozen lockfile·공유 패키지 빌드 사용. 운영 DB 직접 접속·실제 계정 로그인 없음. 운영 공개 HTTP·브라우저 검증과 정상 배포 workflow 수행.

## 공유 소비처 매트릭스

| 공통 변경 | 소비처 | 실제 변경·검증 |
|---|---|---|
| `@o4o/auth-react` MyHomeButton / useMyHomeReturn | Neture 및 Supplier·Funding·Community 호스트 | 공통 헤더·모바일 하단·서비스 호스트 호환 경로. Neture 타입 포함 빌드·전체 테스트·브라우저 |
| 같은 모듈 | Store / Study / 분회 | 각 헤더 직접 진입. 각 타입 포함 빌드·각 전체 테스트. 기존 공개 진입·업무 메뉴 유지 |
| 같은 모듈 | Pharmacy/KPA | 공통 헤더·공통 404 복귀 안내·모바일 하단. 타입 포함 빌드·전체 테스트 |
| 같은 모듈 | Admin | 헤더 직접 진입. production bundle·전체 타입 검사 |
| `@o4o/ui` GlobalHeader | Neture·KPA의 사용자/운영자/관리자/Supplier 레이아웃 | 두 행 모바일 진입을 담도록 고정 높이 대신 최소 높이 사용. 두 앱 빌드·테스트·Neture 320/375px 실제 브라우저 |
| handoff controller | 모든 서비스의 인증 이동·대표 진입·Store workspace | 기존 교환·세션 폐기·회원 자격·소유권 회귀 + My Home 목적지 허용/거부 테스트 |
| Neture home-entry hook | 대표 메인·My Home·기존 서비스 진입 소비 코드 | 선택적 accountId 인자 추가(기존 호출 호환). 계정 변경 시 stale 데이터·실패 후 영구 로딩 방지 테스트 |

폐기한 PharmacyHub/K-Cosmetics 및 legacy web-account에 새 업무나 개인 통합 공간을 복구하지 않았다. Hospital Pharmacy는 무로그인 파일 업무 앱으로 개인 인증 헤더의 적용 대상이 아니며 해당 모델을 유지했다. raw-source 소비 테스트를 파일명·라우트·심볼로 검색했으며 기존 public brand, forum owner, identity display, store owner, community navigation 검사도 실행했다.

## 결과

- 공유 패키지 빌드, Neture·Pharmacy/KPA·Store·Study·분회 production build(타입 검사 포함), Admin bundle 및 별도 전체 타입 검사: PASS. CI의 fresh 공통 선언 타입 검사에서 Admin ID의 string/number 호환성을 확인하여 진입 맥락 ID를 문자열로 정규화했다.
- API `tsconfig.build.json` 전체 타입 검사: PASS.
- auth-react 전체 196개, Neture 전체 492개: PASS.
- Pharmacy/KPA 131개, Store 40개, Study 4개, 분회 35개, UI 19개, shared-space community navigation 19개: PASS.
- 대표 진입 handoff 45개 + 서비스 logout·Store handoff·약국 사업 자격·forum owner·identity display·store owner 135개: PASS.
- 새 데이터 화면 테스트: 다른 계정 알림 즉시 제거, 선택 매장 header 전송, 늦은 응답 무시, 실패와 0 구분·재시도, 접근 가능한 커뮤니티의 `author=me` 조회·원본 글 링크를 확인.
- My Home 이동 테스트: 인증 초기화, 올바른 목적지, 임의 origin/경로 거부, 재시도, logout·계정 변경 이후 늦은 응답 무시, bfcache 복구, 헤더·모바일 중복 클릭 발급 1회 확인.
- 실제 Chromium fixture smoke: 1440/375/320px × 5개 화면의 직접 진입·본문·가로 넘침 0, 모바일 고정 항목, 대표 메인 요약→My Home, 선택 매장 통계 및 503 후 재시도 PASS. 오류 없는 fixture 응답으로 기존 계정 설정도 확인. 운영 API는 모두 가로채며 외부 접근은 차단했다.

재실행 가능한 브라우저 검증은 `e2e/my-home`에 있다. 먼저 Neture build 후 `pnpm exec playwright test --config e2e/my-home/playwright.config.ts`를 실행한다. 이 클라우드에서는 설치된 Chromium을 사용하도록 `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`을 지정했다. 결과·스크린샷은 무시되는 `test-results/my-home` 아래에 생성된다. 실제 인증 handoff와 운영 데이터 검증을 대체하지 않는다.

## main 통합 · 운영 배포

| 근거 | 결과 |
|---|---|
| [구현 PR #449](https://github.com/Renagang21/o4o-platform/pull/449) | 2026-10-11 main 병합. 구현 serving target `bd5c28d83366f0ba84cddc35d616dd2fb9edc653` |
| [PR CI](https://github.com/Renagang21/o4o-platform/actions/runs/38105116594) | PASS · required CI Gate · 보안 분석 · 공유 소비처 빌드/회귀. main ruleset 확인, review blocker·미해결 스레드 없음 |
| [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38105675451) | attempt 2 PASS. attempt 1의 API 세 묶음·빌드는 모두 PASS. 기존 CommunityServiceAdminPage 테스트의 후보 선택 대기에서 1회 실패했으며 해당 화면·테스트는 이번 변경에서 수정하지 않았다. 로컬 Neture 492개 재통과 후 실패 작업을 1회 재실행해 PASS. 검사 기준·범위·workflow 변경 없음 |
| [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38106608248) | HELD_LEVEL_3 · 인증 handoff / auth-react 변경. 실제 CI·freeze·serving→target gate 확인 |
| [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38106697047) | 소유자 계정·정확한 main SHA로 실행. API 선행 성공 → 프런트·Admin 전환 성공 → 최종 Report PASS. production commit status `DEPLOYED` |
| 서빙 대상 | api, admin, neture, kpa-society, lecture, store, kpa-branch 모두 위 SHA로 최종 확인 |

직전 API 성공 배포 `3b776054931debb43934402ea67a4b04fda3b83b`부터 target까지 `apps/api-server/src/database` 전체(bootstrap·incremental manifest 포함)와 `src/migrate.ts`의 변경은 0이다. 새 migration·수동 DB write/DDL을 추가하거나 실행하지 않았다. 기존 배포 workflow의 migration 소유 Job과 API revision 검증은 정상 완료됐다. 직접 DB 접속·pending 수 원문 조회는 수행하지 않았다.

초기 GitHub·운영 호스트 네트워크 차단은 재시도에서 해소됐다. Actions variable 직접 조회는 integration 403이므로 freeze를 임의 변경하지 않고 실제 workflow gate를 따랐다. main 직접 push·CI/freeze 우회 없음.

## 운영 공개 검증 · 남은 범위

- 대표 메인, Store, Study, Community, Funding, Supplier, Pharmacy, 분회, Admin 9개 공개 도메인: 배포 전·후 HTTP 200.
- Neture 실제 운영 번들에서 대표 메인과 My Home 5개 경로를 1440/375/320px로 직접 열었다(18회). HTTP 200·pageerror 0·문서 가로 넘침 0. My Home 표기와 비로그인 안내 확인. 로컬 fixture 검증과 달리 실제 공개 서버를 사용했다.
- API `/health/ready`: 200. 비로그인 handoff·알림·QR 경영 통계: 각각 401. 운영 데이터나 토큰을 기록하지 않았다.
- `docs/local/TEST-ACCOUNTS.local.md`가 작업·기준 checkout 모두에 없어 로그인 후 공통 헤더/모바일 진입, 실제 handoff, 본인 서비스·작성 글·선택 매장 데이터의 운영 검증은 **미실행**이다. 공개 Demo·예전 seed·실제 운영 사용자 계정으로 대체하지 않았다.
- 정책·화면·배포의 문서 정합은 동일 WO의 연속 배포 후 문서 Phase로 반영한다. 문서만 변경하므로 후속 문서 PR의 `DEPLOYMENT = NOT_APPLICABLE`; 위 런타임 SHA와 문서 정합 이후 main HEAD를 혼동하지 않는다.

## 테스트 계정 원본 위치 조사 (2026-10-11)

사용자가 계정 문서가 있다고 알려 주고 문서·docs에서 위치를 찾아 기록하도록 지시했다.
기존 My Home WO의 미완료 인증 검증을 위한 연속 Phase로 같은 worktree·branch를 유지한다.
이번 조사 기준 main은 `4f75e2563af5b105edabef430d835098f63a100c`다. 코드·계정·DB·배포 변경은 없다.

### 문서에서 확인한 근거

- [SETUP](../../SETUP.md#테스트-계정-찾기--브라우저운영-검증-전)과 `AGENTS.md` §6은 계정 문서를 `docs/local/TEST-ACCOUNTS.local.md`로 지정한다.
- [Codex 환경 조사](../investigations/CHECK-CODEX-ENV-SETUP-V1.md) §1은 원본 Windows 저장소 루트를 기록하고 테스트 계정 문서의 상대 경로도 명시한다. 이를 결합한 우선 확인 후보는 `%USERPROFILE%\coding\o4o-platform\docs\local\TEST-ACCOUNTS.local.md`다.
- [운영 DB 잔여 조사](WO-O4O-FINAL-PRODUCTION-DB-RESIDUE-CLOSURE-V1-CHECK.md)의 이전 저장소 루트를 기준으로 `%USERPROFILE%\o4o-platform\docs\local\TEST-ACCOUNTS.local.md`도 확인 후보에 포함한다.
- [계정 문서 정비 기록](CHECK-O4O-TEST-ACCOUNTS-IDENTITY-V2-SERVICE-CREDENTIAL-DOCUMENTATION-V1.md)은 2026-08-09 로컬 파일 갱신과 Git 추적 제외를 기록한다. [브라우저 검증 조사](../investigations/IR-O4O-PLAYWRIGHT-MCP-AND-TEST-ACCOUNT-SMOKE-BLOCKER-AUDIT-V1.md)도 같은 로컬 문서의 수정 이력을 남긴다.

위 경로는 문서 근거가 있는 **원본 PC 확인 후보**다. 연결되지 않은 PC의 현재 파일 존재·내용·로그인 가능 여부를 확인한 것은 아니다.
개인 사용자 이름과 자격증명은 복사하지 않고 공개 기록에는 `%USERPROFILE%`만 사용했다.

### 클라우드 검색 결과와 남은 일

- `docs`·문서형 설정의 경로 참조를 조사했다. 문서에 있는 Git 제외 파일의 과거 사용 기록과 현재 클라우드의 실파일 존재를 구분했다.
- 작업·기준 checkout 모두 `docs/local/TEST-ACCOUNTS.local.md` 없음. 접근 가능한 `/workspace`, `/tmp`, `/mnt`, `/media`, `/home`에서도 해당 이름이나 유사한 계정 문서 사본을 찾지 못했다. dependency·Git 내부·credential 디렉터리는 제외하고 파일 이름·경로 중심으로 조사했다. 접근 제한 디렉터리와 원본 PC는 미확인이다.
- `git check-ignore -v`에서 `.gitignore`의 `docs/local/*.local.md` 규칙을 확인했다. 현재 Git refs의 `git ls-files`와 해당 경로의 `git log --all`에는 원본 파일이 없다. Git으로 자동 확보할 수 없다.
- [SETUP의 위치 안내](../../SETUP.md#원본-pc의-위치-단서와-클라우드-확인-결과-2026-10-11)에 확인 후보·근거·비공개 재확보 절차를 추가했다.
- 실제 원본을 비공개로 연결한 뒤 일반 회원·매장 경영자의 handoff·개인 데이터·매장 권한을 검증해야 한다. 이번 조사에서는 로그인·비밀번호 추측·Demo/seed 대체·계정 변경을 하지 않았다.
- 이번 변경은 문서-only이며 `DEPLOYMENT = NOT_APPLICABLE`이다. My Home의 운영 배포 및 `AUTHENTICATED PENDING` 판정은 유지한다.

## 연속 Phase: 서비스 참여·활동 통합 (2026-10-11)

같은 미완료 구현 WO의 전용 branch를 유지한다. 사용자 지시에 따라 최근 참여·활동 요약, 전체 이력의 페이지 조회, 원본 업무 연결, PC·모바일 검증과 배포를 함께 진행한다. API·권한·공유 패키지·dependency·schema·CI 설정을 변경하지 않는다. 아래 근거는 이전 구현 PR #449와 구분한다.

| 소비 데이터 | 실제 서버 경계 · 표시 |
|---|---|
| Study `/lms/enrollments/me` | `requireLectureLearner` 활성 membership·현재 사용자·lecture 고정 scope. 수강 상태·제공된 진도, 서버 pagination. 사용자 식별·serviceKey query 미전송 |
| Funding `/api/market-trial/my-participations` | `authenticate` + `participantId = req.user.id`. 전체 본인 목록을 받아 표시 필드만 보관·클라이언트 pagination. membership 우회나 자격 생성 없음 |
| 커뮤니티 · 매장 | 기존 참여 판정·`author=me`·선택 organizationId 유지. 모아보기 글 요약은 최대 3개 커뮤니티 × 2건. QR 요약은 한 승인 매장 기준이며 매출 아님 |
| 원본 업무 이동 | Study 고정 origin handoff의 요청 returnTo 확인. Funding 실제 독립 호스트 링크이며 해당 호스트 로그인 확인이 필요할 수 있음 |

최신 main의 Funding 개설·포럼 변경을 조사해 본인 참여 API·상세/참여 목록 주소가 유효함을 확인하고 `b565fb00965aa12c84df4f31ed3bff9395fac73e`를 반영했다. 운영 migration·계정 변경·실제 개인정보 조회는 수행하지 않는다.

로컬 검증:

- 최신 main 반영 및 마지막 소스 수정 뒤 Neture 전체 Vitest: **61파일 · 517개 PASS**. 첫 전체 실행은 516개 통과·기존 CommunityServiceAdminPage의 후보 목록 대기 1개 실패였으며, 해당 9개 집중 재실행과 마지막 전체 실행에서 통과했다. 기존 화면·테스트·타임아웃을 수정하지 않았다.
- 변경 파일 ESLint: **오류 0 · 경고 0**. docs 민감정보 검사와 `git diff --check` 통과.
- 집중 회귀에는 기존 본인 조회만 사용, 비활성 Study 미조회·서버 403·재시도, 진도 미제공/실제 0, Funding malformed/실패와 빈 목록 구분, 서버/클라이언트 페이지, 계정 변경·늦은 응답·중복 이동·임의 origin 거부·bfcache 무효화가 포함된다.
- 마지막 소스 수정 뒤 Neture production build(타입 검사 포함): **PASS**. 기존 Browserslist 데이터·큰 bundle 경고는 남아 있으며 dependency·빌드 설정을 변경하지 않았다.
- 실제 Chromium fixture smoke **18개 PASS**(1440/375/320px 각 6개). 5개 개인 화면 직접 진입·메인 요약 진입·모바일 공통 메뉴·가로 넘침 0·JS 오류 0, 최근 이력 제한·전체 이력 페이지·Study 원본 강의 목적지·Funding 고정 호스트 주소·Study 403·Funding 503·재시도·선택 매장 scope를 확인했다. 운영 API를 가로채고 가상의 Study handoff만 응답해 실제 계정·DB를 사용하지 않았다.

### 통합 · 배포 결과

| 근거 | 실제 결과 |
|---|---|
| [PR #461](https://github.com/Renagang21/o4o-platform/pull/461) | main 병합 완료. 구현 merge SHA `43fbe5bf7d2ad66b817317de2d3c90585694bfe5` |
| [최종 PR CI](https://github.com/Renagang21/o4o-platform/actions/runs/38121863651) | HEAD `c9ae8e4959ebc739439ca0a415840dee6d54b08d`의 CI Gate·API 3개 묶음·품질·웹/Admin build PASS. CodeQL·SonarCloud PASS. 자동 Codex 리뷰 지적·미해결 스레드 0 |
| [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38122416669) | 구현 merge SHA의 전체 CI PASS. 선행 main CI가 끝난 뒤 순차 실행 |
| [구현 SHA Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38123217177) | `SUPERSEDED`. 실행 중 main에 Funding 배포 기록 문서 PR #462가 병합됨. 배포 job은 실행하지 않음 |
| [배포 target CI](https://github.com/Renagang21/o4o-platform/actions/runs/38122683757) | 문서 변경만 있는 최신 main `65d55ca7ba12672f6f4e3e1f47e965a848c607c9`의 CI PASS. 구현 SHA와 `apps`·`packages`·`services`·`scripts`·`.github` 차이 0 확인 |
| [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38123572960) | 정확한 target·소유자 계정·CI/freeze/서빙 범위 gate 확인 후 실행. API 선행 성공 → 관련 웹/Admin 성공 → 최종 서빙 SHA Report PASS. production commit status `DEPLOYED` |
| 최종 서빙 확인 | api, admin, neture, kpa-society, lecture, store 6개가 위 target으로 완료. kpa-branch는 이번 배포 대상 아님 |

최초 PR HEAD의 CI는 최신 main 반영으로 대체됐으며, 갱신 HEAD의 최종 CI를 근거로 병합했다. 최신 main 반영 때 Neture 전체 517개를 다시 실행해 통과했고, frontend·패키지 빌드 입력이 동일함을 확인했다. 직전 API 배포 `b565fb00965aa12c84df4f31ed3bff9395fac73e`부터 target까지 `apps/api-server/src/database` 전체와 `src/migrate.ts` 변경 0이다. 새 migration·수동 DB write/DDL을 실행하지 않았다. 기존 정상 API 배포 workflow의 Job·revision 검증을 따른다.

Actions artifact와 job log 다운로드는 클라우드 목적지 제한으로 실패했다. 해당 파일을 직접 읽었다고 보고하지 않는다. GitHub job 결과·최종 Report·production commit status와 아래 운영 HTTPS·번들 검증을 근거로 사용한다. 정책·CI·freeze·TLS 검증을 우회하지 않았다.

### 배포 후 검증 · 남은 범위

- 실제 운영 `/mypage` HTML과 연결된 JS를 HTTPS로 받아 Study/Funding 제목과 본인 조회 endpoint 4개 표식이 존재함을 확인했다. `/`, `/mypage`, `/mypage/services`, `/mypage/activity`, `/mypage/management`, `/mypage/settings` 6개 모두 HTTP 200, API `/health/ready` 200.
- 비로그인 Study 수강·Funding 참여·KPA 매장 통계 API는 모두 **401**이었다. 이는 인증 보호 확인이며 실제 계정의 소유권·활성 membership·개인 응답 검증을 대신하지 않는다.
- **운영 번들 Chromium fixture 18개 PASS**: 1440/375/320px 각각 기존 6개 시나리오를 실행했다. HTTPS curl로 받은 실제 운영 HTML·JS·정적 자원을 브라우저에 응답하고, 모든 API 데이터·쓰기·Study 이동은 fixture로 가로챘다. 실제 계정·업무 데이터·DB를 사용하지 않았다. 로컬 origin에서 렌더링한 운영 코드의 본문·반응형·페이지·이동 계약·재시도 검증이며 실사용 인증 결과와 구분한다.
- Chromium의 직접 운영 HTTPS 접속은 `ERR_CERT_AUTHORITY_INVALID`로 완료하지 못했다. `/tmp`에 기존 환경 CA를 가져온 별도 신뢰 저장소를 준비했지만 직접 접속 오류가 유지되어 해당 시도는 중단했다. 인증서 검증을 유지한 curl로 자원을 받아 위 브라우저 검증을 완료했으며 `ignoreHTTPSErrors`나 인증서 오류 무시 플래그를 사용하지 않았다. 로컬 빌드 fixture 18개와 운영 번들 fixture 18개는 별도 실행 결과다.
- 운영 번들 검증 스크립트·스크린샷은 `/tmp/my-home-participation-deployed-fixture`, HTTP 결과는 `/tmp/my-home-participation-production-http.log`에 보관한다. 공개 문서에는 실제 사용자·사업자 정보·인증 값을 기록하지 않았다.
- **AUTHENTICATED PENDING**: 지정된 로컬 계정 문서가 없어 실제 로그인·서비스 간 세션 전달·개인 데이터·매장 권한 smoke는 미실행이다. 파일 위치 조사·원본 PC 확인 후보는 위 계정 원본 위치 절과 SETUP에 유지한다. Demo/seed·운영 계정으로 대체하지 않는다.

이번 배포 결과를 확정하는 후속 문서 PR은 같은 미완료 WO의 연속 Phase다. 문서만 변경하므로 `DEPLOYMENT = NOT_APPLICABLE`이며 새 문서 commit과 위 runtime target을 구분한다.

## 연속 Phase: 기록 조회·경영 추이 (2026-10-11)

- 최신 main `c4db284f2d05d9591e0079d88885e517e222cb19`를 확인해 같은 미완료 WO branch에 반영했다. 다른 세션 checkout은 변경하지 않는다.
- 알림 서버 page/limit/isRead 조회와 내 글 `author=me` 페이지, QR 반환 날짜만 사용하는 그래프, 계정별 선택 매장 보조 정보를 개선한다. 새로운 API·권한·DB·공유 패키지·dependency·CI 변경은 없다.
- 집중 테스트 13개 PASS: 기존 본인/매장 scope·오류 재시도·계정 변경·알림 페이지/필터 및 늦은 응답·실패 envelope·내 글 임시 저장/빈 후속 페이지·그래프 날짜 정렬/0·잘못된 날짜/음수 거부·동일 계정 선택 유지/타 계정 및 제거된 매장 무효화.
- 초기 집중 실행은 강화한 envelope 검증과 예전 fixture 불일치로 4개 실패했다. 성공 플래그·알림 pagination을 실제 서버 계약에 맞춰 fixture에 추가한 뒤 전체 집중 테스트가 통과했다. 검증 기준을 낮추지 않았다.
- 최신 main `b19dc0a3d`의 공통 헤더와 커뮤니티 변경을 조사했다. 본인 글 `author=me`·인증·scope 계약과 기존 API 응답 구조 유지, migration·dependency 변경 0을 확인한 뒤 자기 branch에 병합했다. 바뀐 UI 패키지를 빌드하고 Neture 타입 포함 production build와 변경 파일 ESLint가 통과했다.
- Chromium fixture **27개 PASS**(1440/375/320px 각 9개). 직접 화면 진입·모바일 메뉴·Study/Funding 기존 회귀 외에 알림 최근/전체/페이지/읽지 않음 필터, 본인 글 2페이지 임시 저장과 원본 이동, 선택 매장 화면 이동/새로고침 유지, 실제 0·누락 날짜 미생성·가로 넘침 0을 확인했다. 매장 화면 모바일 스크린샷도 확인했다. 데이터·handoff는 fixture이며 운영 계정·DB를 사용하지 않는다.
- 첫 브라우저 실행은 설치된 Chromium의 경로 미지정으로 launch 실패했다. 경로를 지정한 첫 화면 실행은 23개 통과·알림의 읽지 않음 표시를 제목과 함께 찾는 locator 3개 실패·동시 빌드/테스트 중 조회 대기 1개 실패였다. 제목 locator를 수정하고 빌드 후 단독 실행해 27개 모두 통과했다. timeout·검증 조건·실제 동작을 완화하지 않았다.
- 최초 전체 524개는 통과했다. 최신 main 반영 후 첫 전체 실행은 532개 통과·기존 CommunityServiceAdminPage 후보 목록 대기 1개 실패였다. 범위 밖 화면·테스트는 수정하지 않고 최종 단독 전체 재실행에서 **63파일·533개 PASS**를 확인했다. PR·main·운영 배포는 실제 실행 결과로 확정한다. 실제 계정 문서는 작업·기준 checkout에 없으며 AUTHENTICATED PENDING을 유지한다.
- PR #469 자동 리뷰에서 ACTIVE 정본 본문을 구현 Phase에 함께 변경한 점을 지적했다. 구현 PR에서 이번 정본 추가 문단을 제외하고 배포 결과 확정 문서 Phase로 옮긴다. 기존 사용자 관련 문서 수정·My Home 진행·배포 지시 범위의 구현 상태 정합이며 새로운 사업 정책·권한 변경은 아니다. WO/CHECK 실행 기록은 구현 PR에 유지한다.

## WORKTREE_DISPOSITION

- worktree: `/workspace/o4o-wt/my-home-document-alignment`
- branch: `wo/my-home-document-alignment` · 초기 구현 기준 main: `c9ba0ea2251866b4f1482dced9ee4f0434fe27a3` · 이번 Phase 시작 main: `b565fb00965aa12c84df4f31ed3bff9395fac73e`
- main integration: #449 · 이번 Phase #461 · CI: PR/main/배포 target PASS · deployment: `65d55ca7ba12672f6f4e3e1f47e965a848c607c9` DEPLOYED · smoke: LOCAL/DEPLOYED-BUNDLE/HTTP PASS, DIRECT-BROWSER CERT BLOCKED, AUTHENTICATED PENDING
- 다른 세션의 기준 checkout은 변경하지 않았다. 문서 정합 통합 후 작업 범위 미커밋·untracked·branch-only commit 상태를 다시 확인한다.
- verdict: **KEEP** — 테스트 계정 문서 확보 후 실제 로그인 운영 검증이 남아 있다. 로컬 브라우저 증거는 작업 폴더 밖에도 보관했다.
