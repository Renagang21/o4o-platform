# TODO-O4O-AUTH-CODE-MAINTENANCE-V1

> **상태**: COMPLETED (승인된 구현·검증·branch push 범위)
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거 WO/IR**: [인증 리팩터링 WO](WO-O4O-AUTH-REFACTOR-V1.md), 사용자 코드 복잡성 조사 후 정비 지시
> **종료 범위**: TODO 작성 → 코드/문서로 보완 → 구현·검증·branch push. main 통합·배포 없음.

## 범위와 불변식

같은 미완료 인증 WO의 연속 Phase로 준비된 격리 checkout/`wo/auth-kakao-explicit-link`를 유지한다.
조사 후 main의 타 트랙 변경과 충돌 여부를 확인해 반영했다. PR #531의 기록-only 범위를 이번 구현으로 갱신했다.
현행 [인증·가입 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)과 shared module의 전 소비처 검증을 따른다.
전체관리자 Google/cookie, 사용자 이메일·Google·카카오/localStorage, 계정/서비스 가입/역할/약관 분리,
provider ID 식별·자동 이메일 병합 금지, 브라우저 logout·비밀번호 보안 세대·일회용 handoff 경계를 유지한다.
이번 승인 범위는 조사한 인증 UI·공통 모듈·서버 내부 구조와 기존 수동 E2E 정비다.
새 DB schema/migration/운영 write, OAuth 설정·권한 확대·정책 게시·의존성/lockfile 변경은 포함하지 않는다.

## 초기 TODO → 코드 확인 후 실행 항목

| ID | 초기 항목 | 보완 근거와 최종 실행 기준 |
|---|---|---|
| M01 | 인증 E2E 현행화 | 사용자8 origin과 전체관리자의 로그인 수단을 구분. `/auth/login` 등 은퇴 경로404와 현행 `/auth/email/login`을 혼동하지 않음. 수동 실행·관리자 credential 소비0 유지, frozen 설치·shell quote 정정 |
| M02 | 세션 표시 정비 | cookie expiry는 브라우저에 공개되지 않음. 임의 현재+1시간·고정8시간 표시와 미구현 타이머를 제거하고 서버 확인된 로그인 상태를 표시. 기존 compatibility API는 만료를 알 수 없으면 null |
| M03 | 토큰 저장소 통일 | auth-context의 실제 소비는 setter/clear뿐. auth-client 정본으로 위임하고 미사용 legacy 자동이관 구현 제거. cookie/localStorage 전략 및 사용자 교체 방어 유지 |
| M04 | 로그인 이동 소유 정리 | Neture 모달·전역 redirect의 같은 sessionStorage 표식을 한 helper로 소유. 일반 복귀/역할 기본 목적지/Demo Store handoff를 구분하고 순서·실패 정리 회귀를 확인 |
| M05 | Handoff 수신 정렬 | Neture/KPA2는 공통 수신, Store/강의는 별도 UI. 공통 교환 훅으로 토큰 선제 제거·일회 실행·저장·안전 복귀를 통일하며 각 서비스 안내/레이아웃 유지 |
| M06 | 세션 응답 중복 제거 | 이메일의 별도 응답 조립과 Kakao→Google controller 의존을 provider-neutral helper로 분리. cookie/body token·policy pending·Demo 메타데이터·기존 응답 코드를 보존 |
| M07 | 대형 서버 책임 분리 | EmailAuth의 복구/비밀번호/아이디 찾기를 내부 모듈로 분리. Handoff 발급/교환/가입·catalog 책임을 나누며 기존 controller/service 진입점 유지. transaction·보안 검사 순서 보존 |
| M08 | 호환/주석 정합 | 현재 활성 처리와 과거 도입 이력 구분. 소비처 없는 코드만 정리하고 JWT/DB compatibility claim·과거 migration은 임의 제거하지 않음 |

## 실행 TODO

- [x] 조사 결과로 초기 TODO 작성하고 현행 정책·실제 소비처·종료 범위로 보완.
- [x] M01 수동 E2E의 현행 surface·서버 계약·실행 구문 정렬.
- [x] M02 전체관리자 세션 표시·타이머 정비.
- [x] M03 실제 저장소 소비 경로 통일.
- [x] M04 Neture 로그인 이동 helper와 회귀.
- [x] M05 공통 Handoff 교환 훅·전 수신 소비처 회귀.
- [x] M06 provider-neutral 세션 응답과 기존 응답 계약 회귀.
- [x] M07 이메일 복구와 Handoff 서버 내부 책임 분리·보안 회귀.
- [x] M08 현행 주석/기록 정합·호환 코드 판정.
- [x] API·공통 packages·사용자5웹 app·전체관리자 영향 검증, PC/mobile 합성 browser smoke.
- [x] 최신 diff·민감정보·stage 범위·CI/review 확인, 이번 변경 commit·push.

## 검증 및 완료 판정

로컬 단위/통합·브라우저 fixture·운영을 구분한다. 이번 새 코드의 실제 운영 검증은 배포 이후 단계다.
일반 계정 상태 운영 모집단, 사용자 담당 실제 OAuth, 2026-11-13 이후 정책 게시, 전수 데이터 정리는
[잔여 계획](../checks/CHECK-O4O-AUTH-REMAINING-PLAN-V1.md)의 별도 TODO이며 구조 정비 성공으로 완료 처리하지 않는다.
실행 결과·최초 실패·review 수정은 아래에 추가하고 검증한 항목만 체크한다.

## 구현·검증 결과 — 2026-10-13

- 전체관리자 헤더는 확인된 로그인/복구/사용자 교체 상태를 표시한다. 임의1시간·고정8시간 만료 문구와 미구현 타이머를 제거했다. `getSessionStatus`는 만료를 추측하지 않고 null, SessionManager는 timer 없는 deprecated compatibility wrapper다.
- auth-context 저장 유틸은 auth-client 정본으로 위임한다. Neture의 명시 이동 표식은 `lib/loginNavigation`이 소유한다. 기존 역할 기본 목적지·원래 경로·Demo 업무공간 선택을 유지했다.
- `useHandoffExchange`가 사용자5웹 app의 수신을 처리한다. 토큰 선제 제거, StrictMode/재렌더의 일회 교환, unmount 후 세션 저장 차단, 안전한 목적지 계산·cookie 없는 transport를 검증했다. 서비스별 안내와 레이아웃은 유지했다.
- `SessionResponse`가 이메일·Google·카카오의 cookie/body envelope·약관 pending·표시명 조립을 소유한다. 이메일 registry 메타데이터와 provider 오류/응답 status를 보존했다. 이메일 응답 빌더의 비동기 실패도 기존 controller 오류 처리로 전달한다.
- EmailAuthService는 기존 public facade를 유지하며 복구/비밀번호/아이디 찾기를 EmailAuthRecovery, 공통 타입/오류·token 상수를 별도 모듈로 분리했다. 의존성의 lazy DB 접근과 비밀번호 write/보안 세대 회전의 동일 transaction을 유지한다.
- HandoffController는 기존 route facade를 유지하며 발급·교환·서비스 가입/catalog·서명된 출발 검증을 분리했다. SQL·일회 사용·origin·Google 전체관리자·브라우저/family 검증을 바꾸지 않았다.
- 수동 E2E의 사용자8 origin·전체관리자·PC/mobile 검사64개를 등록했다. helper의 미사용 로그인/로그아웃 함수와 과거 도메인, Google-only 사용자 화면 판정을 정리했다. 기존 은퇴 endpoint404 검증을 유지했고 교대 URL redirect loop도 검사한다. workflow의 frozen 설치·shell quote를 정정했으며 수동 실행·관리자 password credential 소비0을 유지했다.
- service session epoch claim/원장과 과거 migration은 compatibility 범위로 보존했다. 새 정책·DB schema·role/membership·실제 OAuth 설정 변경은 없다.

검증 근거:

| 범위 | 결과 |
|---|---|
| API 단위·HTTP·provider·Demo·약관/기존 보안 회귀 | 대상 suites PASS. 회차별 기존 API427건 중 정적 소비처1건의 이동 보완, 약관119건, provider/response/Demo49건, 추가 정적 guards197건(초기 whitelist1건 실패 후 관련17건 재확인)을 구분. 중복 실행을 합산하지 않음 |
| 격리 PostgreSQL15 | browser/password/session method/social linking/signup4 suites73/73 PASS. loopback55444의 전용 fixture만 사용 |
| auth-react / auth-client / auth-context | 각각214 / 40 / 17 PASS |
| Neture / 약국 협력사업 / 분회 / Store / 강의 / 전체관리자 | 각각624 / 132 / 39 / 50 / 14 / 385 PASS |
| 타입·빌드 | API typecheck/ESM bundle, auth-client/auth-context build, 사용자5웹 app 및 전체관리자 type/build PASS |
| 빌드 산출물 브라우저 | PC1440×900/mobile390×844의8 사용자 origin+전체관리자 로그인 화면, 수신5곳 성공/거절, 전체관리자 세션 표시40/40 PASS. API는 합성 fixture이며 운영 인증 성공 증거가 아님 |
| 수동 E2E 실행 준비 |64개 수집, workflow4 run 블록 bash syntax 및 dispatch-only 확인. 이번 branch 코드의 운영 E2E 실행은 배포 이후 대상 |

변경 경로 ESLint 오류0, 문서 민감정보 패턴0·상대 링크 누락0·diff check PASS다. 기존 KPA Context의 `setUser` dependency 경고1건은 이번 주석 정비와 무관한 기존 경고이며 규칙/기준을 완화하지 않았다.

초기 실패와 수정:

- 추출 중 중복 import/미사용 type 및 lazy getter의 lint 오류를 정정했다.
- 기존 정적 검사가 facade 내부 문자열만 검사해 실패한 경우 실제 분리 모듈과 위임 연결을 함께 검사하도록 갱신했다. 쿠키·Demo·약관·은퇴 경로의 거절 assertion은 유지했다.
- 관리자 Vitest를 repository root에서 실행한 첫 시도는 setup 경로 오류로 테스트0이었다. 앱 작업 디렉터리에서 재실행해385건을 확인했다.
- PG 초기 기동의 socket/role 전제와 최소 fixture의 schema 누락을 진단했다. 이번 검증용 새 cluster·계정/원장을 만들고 관련 실제 migration9개 및 필요한 fixture metadata를 준비해73건을 실행했다. 기존 데이터 cluster는 변경하지 않았으며 이번에 시작한 process는 종료했다.
- 브라우저 첫 fixture에서 community 응답 배열과 분회 Docker의 `/kpa/` asset alias가 누락됐다. fixture를 실제 소비 형식에 맞춰 보완하고40조건을 재실행했다. 제품의 해당 기능을 임의 변경하지 않았다.

구현 commit `8b34a58717`을 `wo/auth-kakao-explicit-link`에 push했다. 해당 HEAD의 `CI Gate`, API Jest3 shards, 웹·전체관리자 build, Code Quality, SonarCloud와 보안 정적 검사가 PASS이며 Codex 자동 리뷰가 완료됐고 미해결 thread는0이다. [PR #531](https://github.com/Renagang21/o4o-platform/pull/531)은 open이며 auto-merge를 사용하지 않는다. 이 완료 기록의 후속 문서 commit도 같은 branch로 push하며 최종 HEAD의 CI/review 상태는 PR에서 확인한다.

WORKTREE_DISPOSITION: `/workspace/o4o-platform` · `wo/auth-kakao-explicit-link`는 KEEP이다. 승인 범위가 push까지이므로 main 통합·배포 전 branch와 검증 기록을 보존한다. 이 TODO의 완료는 인증 전체 잔여 운영 작업이나 향후 배포의 완료를 뜻하지 않는다.
DEPLOYMENT=REQUIRED_AFTER_MERGE이며 이번 실행은 push-only다. 실제 운영 반영·OAuth·일반 상태 계정·시행일 정책 적용을 완료로 표시하지 않는다.

## main 통합·운영 배포 후속 — 2026-10-13 (KST)

위 push-only 기록은 당시 종료 범위다. 이후 사용자가 PR #531 main 통합·배포를 승인했다.
같은 미완료 인증 WO의 운영 검증 Phase로 기존 격리 checkout/branch를 유지했고,
clean 상태·auth 경로 충돌 없음·branch-only commit0을 확인한 뒤 최신 main으로 fast-forward했다.
2차 복잡성 정비 구현이나 타 트랙 변경은 이번 수정에 포함하지 않는다.

- [x] PR #531 merge `aa59a0962f`와 배포 대상 `3809c42db3`의 포함 관계 확인.
- [x] 대상 main의 CI Gate PASS 및 API·웹7개의 실제 배포/serving revision 확인.
- [x] 사용자8 origin × PC/mobile × 공개 Demo3의 실제 로그인·접근·로그아웃48/48 PASS.
- [x] Neture `/`의 로그인 모달에서 Demo3 × PC/mobile6/6 PASS.
- [x] 공개 E2E 최초 실패를 코드·HTTP·전체64조건으로 재현해 test contract를 정정.
- [x] 수정한 은퇴/거절 E2E26/26 및 정적 은퇴/Google DTO2 suites58/58 PASS.
- [x] 보완 commit `fae89f0752`의 GitHub 공개 E2E 실행·CI Gate·Codex review PASS, 미해결 thread0 확인.
- 최신 main 동기화 이후 HEAD의 통합 게이트·merge 결과는 [검증 보완 PR #546](https://github.com/Renagang21/o4o-platform/pull/546)에서 확인한다.

[Promote run 38403004672](https://github.com/Renagang21/o4o-platform/actions/runs/38403004672)의
API·전체관리자·Neture·약국 협력사업·강의·Store·분회 실제 배포 job과 최종 serving Report가 PASS다.
최종 Report는7개 모두 target `3809c42db3`의 revision-label을 확인했고 API ready는200이다.
이 실행의 source에 인증 정비가 포함된다. 이번 세션의 선행 Store/분회 전용 실행은
API dependency gate에 보류되어 실제 배포0이었다. 보류 실행의 workflow success를 배포 성공으로 세지 않는다.

운영 Demo 검증은 canonical 공개 버튼을 직접 클릭했고 mock 인증 응답을 사용하지 않았다.
상속 proxy와 검증된 TLS의 실제 upstream 응답을 전달했다. 사용자8 origin은 Neture·공급자·커뮤니티·
펀딩·약국 협력사업·Store·강의·분회다. 매장 경영자/직원 Store context200, 공급자 products200,
다른 역할의 해당 API403을 확인했다. 로그아웃200 뒤 기존 access/refresh401,
Neture에서 Store로 이동한 별도 세션이 원래 origin 로그아웃 후 유지되는 것도 확인했다.
검증이 만든 세션만 종료했고 실제 Google/카카오·전체관리자 인증은 사용자 담당 범위다.

[최초 GitHub 공개 E2E](https://github.com/Renagang21/o4o-platform/actions/runs/38404670005)는 실패했다.
이 클라우드의 해당 로그 저장소 접근은 제한되어 있었으므로 로그를 읽었다고 보고하지 않는다.
동일64개 assertion을 실제 운영에 실행한 로컬 재현은60 PASS·4 FAIL·skip0이다.
관리자 password 경로404 기대와 Google signup의 필수 policy reference 누락이 각각 PC/mobile에서 실패했다.
관리자 router는 `authenticate`가 선행되어 존재하지 않는 동일 router 경로도401이다.
수정은 양쪽401/`AUTH_REQUIRED`·password 힌트 부재를 함께 확인하고 route 부재는 기존 정적 P2로 검증한다.
Google signup은 DTO 형식의 합성 termsPolicy와 허용 계정 센터 Origin을 제공해
실제 invalid ID token401/`GOOGLE_ID_TOKEN_INVALID` assertion을 유지했다. 토큰 검증 전에 origin을 검사하고,
토큰 거절 뒤 계정 transaction·동의 기록에 도달하지 않는다. 최초 보완에서 Origin을 빠뜨려403이 난 것도
기록하며, 두 필수 조건을 보완한 재실행26/26 PASS와 구분한다. 운영 인증·권한·DB·CI 설정을 바꾸지 않았다.

문서 정합: 과거 push-only 기록은 보존하고 이후 통합·운영 검증 결과를 이 절에 추가했다.
공개 E2E의 인증 선행 router 주석을 정정했으며 일반 상태 계정·사용자 OAuth·시행일 정책 적용 등
[잔여 계획](../checks/CHECK-O4O-AUTH-REMAINING-PLAN-V1.md)의 별도 모집단을 완료로 확대하지 않는다.
WORKTREE_DISPOSITION: KEEP — 같은 미완료 WO의 후속 검증·2차 조사에 사용하는 cloud checkout이며 제거하지 않는다.
후속 변경은 E2E·검증 기록뿐으로 DEPLOYMENT=NOT_APPLICABLE이다. 런타임 배포는 위 target에 대한 증거로 판정한다.

GitHub [재실행38407087021](https://github.com/Renagang21/o4o-platform/actions/runs/38407087021)의
공개 E2E job은 success다. 해당 job 로그 다운로드도 환경의 다른 저장소 제한으로 중단되어
원문을 읽었다고 주장하지 않는다. 실행 step의 PASS와64조건의 로컬 수집/재현은 구분한다.
통합 대기 중 main이 이동하여 자기 branch에 충돌 없이 반영했다. 이 동기화와 기록 갱신 이후의
최종 HEAD는 위 PR의 새 CI/review 기술 게이트를 다시 충족해야 한다.

### 운영 검증 review 보완 — 2026-10-14 (KST)

최종 동기화 HEAD `e753210e9f`의 GitHub 공개 E2E job은
[38470995960](https://github.com/Renagang21/o4o-platform/actions/runs/38470995960)에서 success다.
TLS를 검증한 운영 upstream으로 동일 assertion을 실행한 전체 로컬 재검증은64/64 PASS·skip0·retry0이다.
자동 리뷰는 익명401와 checkout 정적 P2만으로 **배포된** 관리자 route 부재를 구분할 수 없음을 지적했다.
이 한계를 인정하고 테스트를 보강했다. 공개 Demo 공급자의 canonical credential로 새 일반 세션을 만든 뒤
본인 me200·살아 있는 관리자 조회403/`ROLE_REQUIRED`·은퇴 password 경로와 동일 router의 없는 경로404를
함께 확인한다. 이전 route가 다시 등록되면403 또는 입력 오류가 발생하여404 assertion이 실패한다.
존재하지 않는 합성 대상 UUID와 빈 body를 사용하므로 이전 handler도 password write에 도달하지 않는다.
검증이 만든 세션만 finally에서 logout200으로 종료한다. 실제 사용자/운영자 자격정보·위조 토큰은 사용하지 않는다.
이 보완 후 대상26조건은 PC/mobile에서26/26 PASS다. 기존64/64 결과와 재실행26개를 합산하지 않는다.
현재 수동 workflow의 credential-free 명칭과 달리 이 한 조건은 **의도적으로 공개된 Demo 세션**을 사용하며,
민감한 계정 fixture나 관리자 credential을 소비하지 않는다. 새 인프라/권한 정책은 추가하지 않는다.
후속 HEAD의 CI/review·E2E·main 통합 결과는 PR #546의 실제 check와 merge 상태로 확인한다.
