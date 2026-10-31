# O4O 공통 탐색·Hero UI 검증

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **상태**: ACTIVE
> **작성일**: 2026-10-29
> **작업**: [UI·UX 정비 TODO](../work-orders/WO-O4O-CROSS-SERVICE-UI-UX-STANDARDIZATION-V1.md)
> **최초 검증 main**: `75f798ef24a66545b233c63d26ba9fdbb89cc499`
> **최종 정렬 main**: `f2e8b678a8e95c9c7f344b6f01f32ede73c0a8b1`
> **branch**: `wo/cross-service-ui-ux-standardization`

## 1. 결과와 경계

합의한 1~3단계의 공통 기반과 대표 서비스 적용을 로컬에서 구현·검증했다. 서비스·공간 패널, 기존 서버 판정에 따른 내 매장/공급자 업무 및 서비스 이동, 공개 디렉터리 공유, header/footer 정렬, 운영자가 채택하는 자동 슬라이드 Hero를 제공한다.

main 병합·auto-merge·배포·운영 DB/설정 변경은 수행하지 않았다. 원격 PR·CI·Codex 리뷰는 아래 접근 문제로 확인하지 못했으므로 **main 병합 준비 완료로 판정하지 않는다**. Partner/독립 협업체 shell 전체 이관과 신규 서비스 출시, 별도 소재 제출 큐·광고 측정은 WO의 후속 범위다.

## 2. Shared Module Change Verification

- 변경 모듈: `auth-react` presentation/공개 디렉터리, `ui/GlobalHeader`, `shared-space-ui/home-presentation`, `types/home-presentation`, `store-ui-core` drawer offset.
- 전체 소비처 영향 표와 직접/간접 범위: [WO §7](../work-orders/WO-O4O-CROSS-SERVICE-UI-UX-STANDARDIZATION-V1.md#7-consumer-impact-matrix).
- 직접 UI 연결: Neture 대표/공개 shell·다중 호스트·My Home, 강의, 내 매장, 약국 협력사업, 분회 두 shell.
- 공통 Hero/편집기 간접 소비: 위 서비스 및 협동조합, 중앙 `CentralSharedWork`.
- 자체 shell을 유지하는 Partner·병원 도구는 typecheck로 barrel 호환을 확인했다. 퇴역 서비스는 재도입하지 않았다.

### Route / role / capability

- 기존 API `/auth/services`, `/neture/home/entry`, `/work-scope/accessible-stores`, `/auth/handoff` 사용. 새 권한 원장·역할 파싱·자동 가입·조직 자동 선택 없음.
- 공급자 업무 자격은 generic membership 대신 공급자 상태 원장을 사용한다. 매장 1개는 `/store`, 여러 개는 `/select-store`로 기존 Workspace에 전달한다. 공급자 업무는 `/supplier/dashboard`로 전달한다.
- 이동 응답은 HTTPS·예상 origin·`/handoff`·예상 `returnTo`를 확인한다. 조회 실패는 미가입이 아니며 재시도한다. 계정 변경/경로 변경 후 늦은 응답은 이동하지 못한다.
- 개인 즐겨찾기는 브라우저 계정별 ID만 저장한다. 기존 My Home 세부 업무 즐겨찾기는 덮어쓰지 않는다.
- 광고주 필수·URL/기간 검증 및 운영자 게시 scope·동시 수정 보호 유지. 운영 편집 미리보기는 자동 넘김 없이 검토한다.
- 실제 헤더 높이를 `--o4o-global-header-height`로 전달해 공급자/매장 drawer의 고정 64px 가정을 보완했다. 기존 자체 topbar는 종전 fallback을 유지한다.

## 3. 자동 테스트

각 Vitest 명령은 저장소 루트에서 `pnpm exec vitest run --config <경로>`로 실행했다.

| config / runner | 통과 | 결과 |
|---|---:|---|
| `packages/auth-react/vitest.config.mjs` | 245 | PASS; 최종 경로/헤더 보완 후 새 전환기 12개 집중 재실행 PASS |
| `packages/shared-space-ui/vitest.config.mjs` | 213 | PASS |
| `packages/ui/vitest.config.mjs` | 40 | PASS; 실제 헤더 높이 갱신/이전 값 복원 포함 |
| `packages/store-ui-core/vitest.config.mjs` | 156 | PASS |
| `services/web-neture/vitest.config.mjs` | 1467 | PASS |
| `services/web-lecture/vitest.config.mjs` | 83 | PASS |
| `services/web-store/vitest.config.mjs` | 873 | PASS |
| `services/web-pharmacy-business/vitest.config.mjs` | 169 | PASS |
| `services/web-kpa-branch/vitest.config.mjs` | 25 | PASS |
| `services/web-pharmacy-coop/vitest.config.mjs` | 85 | PASS |
| API Jest `src/routes/home-presentation/__tests__/home-presentation.routes.spec.ts` | 24 | PASS; 기존 서비스별 게시·권한 계약 |

중복 집중 재실행을 제외한 위 실행은 총 3,380개 통과다. 예약 표시 테스트는 새 자동 넘김 계약에 맞춰 정지 후 갱신을 검증하도록 보완했고, 헤더 단위 테스트의 새 자식 목과 공개 URL 표기를 수정한 뒤 재검증했다. 실패를 무시하거나 assertion을 제거하지 않았다.

## 4. 빌드·정적 검사

- Node 22.18.0 / pnpm 10.25.0, frozen-lockfile 설치. manifests/lockfile 변경 없음.
- `pnpm run build:packages` PASS. GlobalHeader는 dist 소비이므로 최종 코드 변경 후 `pnpm --filter @o4o/ui build`를 재실행했다.
- 최종 UI dist를 사용한 여섯 앱 build: `@o4o/web-neture`, `lecture-web`, `store-web`, `@o4o/web-pharmacy-business`, `kpa-branch-web`, `@o4o/web-pharmacy-coop` PASS.
- 중앙 Admin·API·Partner·병원 도구 typecheck PASS. 기존 번들 크기·Browserslist 경고는 남아 있으며 이번 작업의 실패는 아니다.
- 변경 공통 UI와 smoke script ESLint PASS. `git diff --check` 및 변경 문서 민감정보 검사 PASS.

## 5. 브라우저 smoke

명령: `node scripts/quality/ui-shell-smoke.mjs`. 세 dev 서버의 시작 포트/실행 방식은 스크립트에 명시된 4300(Neture), 4301(강의), 4302(매장)이다. 각 서버는 `VITE_API_BASE_URL`을 로컬 합성 API 주소로 지정한다.

- Chromium 1280px / 390px, `/`(대표 홈), `/contact`(Neture 공통 공개 shell), `/courses`(강의), `/`(매장): 8개 조합 PASS.
- 검색, 매장/공급자 동시 이용 표시, 복수 매장 선택 안내, 신청 중 표시, Escape 포커스 복귀, 패널/페이지 가로 넘침 없음, 공통 footer, 실제 헤더 높이 변수 및 세션 전달 목적지 확인.
- 대표 홈 PC에서는 실제 자동 넘김 후 정지를 클릭하고 다음 주기에도 내용이 유지되는지 확인. 감소 모션·수동 조작·예약·편집 미리보기는 단위 테스트와 함께 검증.
- 스크린샷에서 발견한 모바일 강의 브랜드의 세로 줄바꿈과 Hero count/조작부 배치를 수정하고 재검증했다.
- API와 외부 요청을 모두 합성 응답으로 처리하거나 차단했다. 실제 계정·사업 데이터·외부 AI를 사용하지 않았다. 스크린샷과 결과는 `/tmp/o4o-ui-shell-smoke/`에 생성된다.
- 현재 checkout과 기준 checkout 모두 테스트 계정 기준 파일이 없어 실계정 로그인·실제 서비스 간 token 교환은 미검증이다. 합성 이동 검증을 실계정 검증으로 보고하지 않는다.

## 6. 원격 인계 차단

Git HTTPS 조회는 성공했다. 그러나 `gh pr list`·ruleset 조회는 Forbidden이며 `https://api.github.com`은 제공된 프록시의 CONNECT 단계에서 403으로 차단된다. raw token 유무로 인증 부족을 추정하거나 proxy를 우회하지 않았다.

필요한 외부 조치: 환경의 HTTPS 네트워크에서 `api.github.com` 허용. 이후 같은 branch의 PR 유무 확인/생성, 실제 ruleset·필수 CI·리뷰 확인과 보완을 이어간다. 새 PR 중복 생성·main push·auto-merge·배포는 하지 않는다.

## 7. 문서 정합

헤더 표준의 과거 완료 범위를 현행 전체 적용으로 오인하지 않도록 보완했고, 공개 탐색 정본에 사용자 승인 Hero 홍보·광고주·자동 넘김·운영 책임을 반영했다. 과거 CHECK/WO를 다시 쓰거나 Partner의 운영 상태를 추측해 활성화하지 않았다.


## 8. 최신 main 정렬·원격 보존

- push 전 최신 main의 상담 복구 PR #885를 확인했다. 변경 대상이 겹치지 않아 아직 push하지 않은 자기 branch를 `f2e8b678a8` 위로 rebase했다. main 자체를 변경하지 않았다.
- 정렬 후 `CustomerConsultationPage.test.tsx` 16개 PASS와 `store-web build` PASS를 추가 확인했다. 위 3,380개에 중복 합산하지 않는다.
- 구현 commit `20cf1c327819c1735b40293fafb538558aa8e043`의 전용 branch push가 성공했다. GitHub가 반환한 PR 생성 경로는 `https://github.com/Renagang21/o4o-platform/pull/new/wo/cross-service-ui-ux-standardization`이며 실제 PR 번호/생성 증거가 아니다.
- PR 본문 초안은 로컬 `/tmp/o4o-ui-pr.md`에 준비했다. API 목적지 차단 때문에 PR 생성·실제 ruleset·필수 CI·Codex 리뷰는 미확인이다. access token을 새로 요구하거나 main 보호를 우회하지 않는다.
- WORKTREE_DISPOSITION: 이번 작업 worktree와 branch는 후속 PR/CI 보완에 필요하므로 KEEP. 작업용 worktree와 기준 checkout의 추적 파일은 clean을 확인하며 다른 세션의 자원은 정리하지 않는다.


## 9. 2026-10-31 최신 main 통합 후속 검증

이 절은 앞선 10월 29일 로컬 결과와 원격 차단 기록을 보존한 후속 확인이다. 환경 재연결 후 GitHub API·실제 ruleset·owner CLI 접근이 정상임을 확인했다. 전체 미반영 조사에 따라 [통합 WO](../work-orders/WO-O4O-PENDING-WORK-INTEGRATION-20261031.md)의 전용 branch `wo/pending-work-integration-20261031`에서 최신 main `0ab734a68c`에 원래 UI 이력을 normal merge했다. 기존 UI 전용 branch에는 열린 PR이 없었다.

### Consumer Impact Matrix — 통합본 재실행

| 소비처 | 변경 영향 | route/role/capability 확인 | 실제 검증 | 결과 |
|---|---|---|---|---|
| Neture 대표 홈·커뮤니티·My Home·공급자 등 공통 shell | 직접: 전환기·디렉터리·헤더/푸터 | 기존 서버 원장·handoff 사용, 최신 Main 일상 업무와 자료 authority 유지 | Vitest 1,493·typecheck·build·PC/모바일 shell/Main smoke | PASS |
| 강의 | 직접: 전환기·헤더/푸터·Hero | 기존 서비스 가입과 handoff 판정 유지 | Vitest 83·typecheck·build·PC/모바일 smoke | PASS |
| 내 매장 | 직접: 전환기·헤더/푸터 | 기존 매장 접근, 복수 매장 선택·상담 복구 유지 | Vitest 896·typecheck·build·PC/모바일 smoke | PASS |
| 약국 협력사업·분회·협동조합 | 전환기/공통 Hero·CSS 직접·간접 | 자체 가입·업무 route·게시 scope 유지 | Vitest 169/25/85·각 typecheck/build | PASS |
| Admin·Operator·API | Hero 편집기와 type parser | 광고주·URL·게시 범위·동시 수정 검증 유지 | frontend/API typecheck·API Jest 24 | PASS |
| Partner·병원 도구·계정 앱 | 공통 barrel/CSS 간접, 자체 shell 미교체 | 기존 route 유지 | 전체 frontend typecheck | PASS; 자체 shell 전체 이관은 원래 후속 범위 |
| 퇴역 K-Cosmetics·PharmacyHub | 재도입 없음 | 서비스 디렉터리에 복원하지 않음 | diff·공개 디렉터리 검토 | PASS |

- 공통 Vitest: auth-react 245, shared-space-ui 222, ui 40, store-ui-core 156 PASS. 위 소비처 테스트와 API 24건을 합쳐 3,438건 PASS이며 이전 실행과 중복 합산하지 않는다.
- frozen install·전체 package build·위 웹앱 6개 build PASS. 전체 frontend typecheck와 API typecheck PASS.
- 공통 shell 실제 Chromium 8개 조합 PASS, desktop/mobile 스크린샷으로 header·줄바꿈·footer 배치를 확인했다. API·외부 요청은 합성 응답/차단이며 실계정 세션 교환은 미검증이다.
- 기존 Main browser 스크립트는 제거된 체크박스를 찾고 있었다. 현행 PC→서버 전환 상태와 버튼으로 보완하고 PC·모바일 2개 시나리오를 통과했다. 동의 시 원본 PC 식별과 이후 server authority·자동 저장·수량/품절 이력·내보내기를 확인했다.
- 변경 파일 ESLint 오류 0; 기존 공급자 레이아웃 hook dependency 경고 1개는 변경 전부터 존재하며 이번에는 drawer offset만 바꿨다. `--max-warnings 0`의 초기 경고 실패를 숨기지 않는다. 민감정보·JSON·diff 검사 PASS.
- 계정/원문 대화/업무 자료를 영구 학습 이력으로 추가하지 않았고 외부 ChatGPT 제출·운영 계정 변경·실제 PC/주문·유료 AI를 실행하지 않았다.
- 최종 원격 CI·리뷰·병합·배포 결과는 위 통합 WO의 PR에서 동일 HEAD/SHA로 후속 기록한다.


### PR #900 사업 참여 상태 리뷰 보완

공통 전환기도 대표 홈과 같이 일반 서비스 가입과 독립 사업 참여를 구별한다. 이미 조회한 사업 원장의 참여·신청 상태를 우선 반영하고 `pharmacy`를 `kpa-society`로 대응했다. 참여하지 못하는 active 원장은 ‘이용 자격 확인 필요’이며 실제 이용·handoff 자격으로 승격하지 않는다. 기존 개인 약국 회원과 드럭스토어형 약국 공개 진입은 유지한다.

추가 회귀 9건을 포함한 auth-react 254건 PASS, 사업 원장만 가진 약국/CarePharm의 참여 표시·모바일 약국 handoff를 포함해 PC/모바일 8개 브라우저 조합 재실행 PASS. 기존 3,438건에 이전 auth-react 245건을 다시 더하지 않고 신규 9건만 더하면 3,447건이다. 보완 후 frontend typecheck·웹앱 6개 build 재실행 PASS. 최종 원격 HEAD의 CI·리뷰 결과는 같은 통합 PR에 기록한다.


### PR #900 운영자 sidebar 보완

| 소비처 | 변경·호환 경계 | 통합 후 검증 |
|---|---|---|
| Neture operator/admin·서브도메인·CarePharm | 공통 OperatorAreaShell 기본 offset을 실제 헤더 높이 + 16px로 조정, 명시 override 유지 | 관련 wrapper 35건·Neture build PASS |
| 기존 공급자 운영 `/workspace` shell | 같은 GlobalHeader를 쓰는 sidebar의 80px 가정 제거 | 타입/build·기존 route/role 확인 |
| 중앙 Admin의 직접 DomainIASidebar | 기존 24px 기본값과 메뉴 계약 유지 | 기존 메뉴 회귀 3건 PASS |
| 내 매장·강의의 relative header / AGAppLayout 자체 header | 다른 고정 높이 계약, 이번 가림 문제 없음 | sticky offset·실제 소비처 검색; 불필요한 변경 없음 |

실제 Chromium 1280/390px 검사를 운영자 화면까지 확장해 10개 조합 PASS. 운영자 데스크톱 본문을 600px 스크롤한 뒤 sidebar 상단이 헤더 bottom보다 16px 아래인지 측정했고, 모바일 첫 메뉴도 drawer에서 접근 가능함을 확인했다. 최초 중앙 Admin 집중 실행은 저장소 루트에서 앱 전용 config를 사용해 setup 경로를 찾지 못했으며, 올바른 앱 작업 디렉터리에서 3개가 실제 실행·통과했다. 원래 테스트 실패를 통과로 세지 않는다.


### SonarCloud 후속 보완

필수 CI가 성공한 `e1920f046a`에서도 별도 SonarCloud 새 코드 보안 등급은 D였다. GitHub 분석 주석에서 임시 경로 보안과 두 함수의 복잡도 지적을 확인해 결과 디렉터리를 고유 `mkdtemp`·0700으로 보호하고 사업 상태·합성 API helper를 분리했다. `O4O_UI_SMOKE_OUTPUT`은 prefix이며 실제 결과 경로는 로그를 따른다. 기존 버전의 고정 경로 기록을 이번 실행 경로로 오인하지 않는다. 중복 import도 정리했고 경고·품질 기준을 낮추지 않았다. 최종 HEAD의 CI·Codex·Sonar 및 배포 증거는 같은 통합 PR에서 확인한다.
