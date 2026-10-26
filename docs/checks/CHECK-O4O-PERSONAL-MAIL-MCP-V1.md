# 개인 메일 서비스·기존 MCP 확장 검증

> **상태**: COMPLETED · **작성일**: 2026-10-26 · **최종 갱신**: 2026-10-26
> **범위**: [WO](../work-orders/WO-O4O-PERSONAL-MAIL-MCP-V1.md)의 개발·격리 로컬 검증. main 병합·배포·공개 운영 완료 기록이 아니다.
> **계약**: [설계·재사용 및 운영 경계](../design/DESIGN-O4O-PERSONAL-MAIL-MCP-V1.md)

## 1. 환경과 결과

Node 22.18.0·pnpm 10.25.0, 전용 `wo/personal-mail-mcp` worktree, loopback PostgreSQL 15·HTTP·TLS-IMAP·Chromium만 사용했다. 실제 사용자·메일·제공자·ChatGPT 세션에 연결하지 않았다. fixture는 임의 생성 credential과 전용 DB marker로 소유권을 확인하고 생성 DB를 파기해 잔존 0을 확인한다.

| 검증 | 결과·근거 |
|---|---|
| Frozen install·API dependency closure | PASS — `pnpm install --frozen-lockfile`, API 의존 workspace 빌드 |
| API 컴파일 | PASS — `pnpm --filter @o4o/api-server build` |
| 배포용 API bundle | PASS — `tsup --config tsup.config.ts`, main/migrate/product-correction-worker/personal-mail-worker entry syntax·신규 CLI `--help`. compile 산출물의 database 2,420개 해시 일치 복원 확인 |
| API focused Jest | 6 suites·53 tests PASS — personal-mail contracts, external-ai 기존 단위 시험, opaque-field middleware |
| UI Vitest | 3 files·26 tests PASS — PersonalMailPage, ExternalAiMailConsent, 기존 MyPageHub |
| Neture production build | PASS — `pnpm --filter @o4o/web-neture build` |
| Migration contract | 21 PASS·0 FAIL — `node scripts/db/check-migration-contract.mjs` |
| PG·공식 MCP SDK 통합 | 기존 콘텐츠 69개 + 메일 33개 = 102 PASS — `node scripts/dev/run-external-ai-fixture.mjs` |
| 실제 Chromium desktop/mobile | 2 PASS — 같은 script의 `--personal-mail-only --browser`; 화면 진입·메뉴·건수 확인·승인 전 비활성·실행 완료·가로 넘침·pageerror 확인 |
| 변경 업무 source ESLint | 오류·경고 0. 저장소의 기존 ESLint ignore deprecation 안내는 별도 |
| 의존성 advisory | `pnpm audit --prod`에서 신규 imapflow/mailparser 경로 advisory 0. 저장소 전체의 기존 low 32/moderate 169/high 141/critical 4는 이 작업에서 해결하지 않음 |

UI 시험 명령은 저장소 루트에서 `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/pages/mail/PersonalMailPage.test.tsx services/web-neture/src/pages/mail/ExternalAiMailConsent.test.tsx services/web-neture/src/pages/mypage/MyPageHub.test.tsx`이다. package 디렉터리에서 상대 경로만 전달하면 이 저장소의 test include와 맞지 않아 시험을 찾지 못하므로 루트/config를 명시한다.

## 2. 핵심 검증과 수정

- 기존 콘텐츠 11개 도구를 보존하고 메일 OFF/ON에 따른 도구·scope 광고를 검증했다. ON에서는 메일 10개 도구를 같은 MCP에 추가한다. 콘텐츠 target이 모두 꺼져도 별도 메일 계정 동의는 가능하며, read/manage/body는 각각 검사한다.
- 타인 계정, 동의하지 않은 계정·본문·실행, 요청 의미 변경, 유효기간 경과, 계정 재연결, 사용자 차단을 거부한다. MCP가 preview를 만들더라도 브라우저 확인 토큰이나 승인 API 도구를 주지 않는다.
- 불변 대상·건수, 중요한 메일 기본 보호, 미래 메일만의 규칙, keep, 위임 철회 중단·본인 명시 재개, 동시 worker·부분 실패·backoff·lease 재획득을 확인했다. 감사 저장 실패로 로컬 완료가 rollback된 뒤에도 제공자 상태 재검사로 같은 원격 이동을 반복하지 않았다.
- OAuth flow의 `DELETE RETURNING` 원시 결과 형식에 의존하던 문제를 발견해 현재 사용자에 묶인 `SELECT FOR UPDATE` 후 소비하도록 수정했다. 잘못된 사용자·PKCE·일회 사용을 외부 호출 없이 검증했다.
- Gmail HTTP fixture는 metadata/body·갱신·상태 재확인·429/오류를, TLS-IMAP fixture는 인증·SPECIAL-USE/MOVE·UIDVALIDITY·bounded MIME·기능 미지원 거부를 검증한다. 인증서 검증을 끄지 않았으며 COPY/DELETE/EXPUNGE 대체 실행은 없다.
- 연결 해제는 credential·metadata·규칙·작업·대상을 cascade 파기한다. 기존 최소 감사 기록은 보존 정책을 따른다. 기능 OFF·키 누락에서도 본인만 해제할 수 있다.
- PR #837의 P1/P2 리뷰를 반영했다. 자동 작업 실행 직전 규칙 ID·revision·action을 대조해 keep/동일 action의 revision 변경 후 옛 대기 작업을 취소하고, 별도 승인 cleanup은 실행되는 PG 시험을 추가했다. 수신함 발신처가 0개여도 기존 규칙에서 선택·keep 전환·재승인을 할 수 있는 UI 시험도 추가했다.
- 재리뷰의 backlog·pool 지적도 반영했다. 자동 작업 50개가 있어도 새 규칙·cleanup preview가 가능하고, 사용자 제안 49개에서 복수 계정 동시 제안 시 하나만 50번째로 허용되는 PG 시험을 추가했다. pool 최대 연결 1개에서 동시 MCP 업무 조회·쓰기·본문 읽기가 정상 완료되는 별도 DataSource 시험도 통과했다. 실제 MCP endpoint·scope 검증은 기존 통합 시험을 함께 유지한다.
- 이력 접근 지적도 반영했다. 자동 작업 121건이 더 최신이어도 오래된 미완료 사용자 작업이 첫 페이지에 남고, 나머지 이력이 API·공식 MCP SDK의 page로 모두 조회되는 PG 시험을 추가했다. 화면의 이력 페이지 변경 후에도 선택한 작업을 재개하는 UI 시험과 desktop/mobile Chromium도 다시 통과했다.
- 최초 원격 CI는 신규 worker entry의 console.log 금지 검사에서 실패했다. 기존 worker와 같은 `process.stdout.write`로 정해진 CLI 도움말·집계만 출력하도록 수정했으며 해당 guard를 로컬 통과했다. 최종 원격 결과는 PR의 최신 SHA를 따른다.
- 이후 API shard 1의 상세 로그 다운로드가 클라우드에서 차단돼 동일 묶음을 로컬 재현했다. `legacy-password-auth-retirement.spec.ts`가 네이버 앱 비밀번호 입력을 로그인 password로 분류하는 실패를 확인했다. 기존 SMTP 외부 credential과 같은 목적으로 `MailAccountConnections.tsx` 한 경로만 allowlist에 추가했다. O4O 로그인 경로·해시 저장·공통 PasswordInput 정책은 변경하지 않는다. 수정 후 해당 정적 계약과 기존 메일 UI의 비밀값 파기 시험을 확인한다.
- 로컬 재현 묶음은 194 suites·3,407 tests PASS, 해당 guard 1 case만 실패, 26 suites·349 tests skip이었다. 수정 후 guard 48 tests PASS와 메일 화면 7 tests PASS를 별도 실행했다. 원격 실패 묶음을 한 번 재실행했지만 원인을 확인한 뒤 코드로 수정했으며, 최종 source의 CI 결과로 판정한다.
- 첫 browser 실행의 Vite CJS 로딩 오류, fixture cwd 때문에 누락된 Tailwind 스타일, ‘완료 0’을 완료로 오인하던 assertion을 수정했다. 실제 앱의 스타일과 loopback API를 사용해 승인 응답·완료/건너뜀 건수·대기 0까지 재확인했다. 기존 CDN font stylesheet만 로컬 빈 CSS로 대체하고 외부 요청은 차단했다. 실제 계정 인증 시험은 아니다.
- Neture의 기존 `tsc -b` node project 설정 오류는 범위 밖이다. 정식 `build`의 `tsc && vite build`를 통과했으며 잘못된 진단 명령이 생성한 자기 임시 산출물은 제거했다. 기존 Browserslist 갱신 안내·bundle 크기 경고를 신규 오류로 숨기거나 무관하게 수정하지 않았다.

## 3. 스키마와 남은 운영 검토

canonical bootstrap + 기존 43개 incremental의 마지막 fingerprint `4accc1af6999af30ee278a666edeafb6d978b2846ef9876fd2b43e58cc4144a3` 일치 후 신규 `CreatePersonalMail1792998000000`을 적용했다. 새 fingerprint는 `0aa797b735eb640d1d35d1066eae9205e0116f869dd1f6d604819c4224cb0759`, 7,224줄·44개 incremental이다. 빈 신규 schema down/up도 통과했다. 운영 DB에는 적용하지 않았다.

Gmail 공개 OAuth 검증·제한 scope 보안 평가와 네이버 상업용 다중 사용자 서비스 이용 조건은 UNKNOWN이다. 실제 제공자 동의·연결/해제, 개인정보 고지, canonical 키·전용 Google 설정, 운영 migration, 요청 외 시간에도 동작할 worker 스케줄은 통합·운영 전에 별도 확인한다. 외부 호출과 DB 사이 exactly-once 한계는 설계 §2를 따른다.

기존 ChatGPT 공개 제출 문서는 여전히 준비 DRAFT다. 이번에는 현행 도구 수와 메일 기본 OFF만 주석으로 정합했으며 실제 제출·공개 승인을 주장하지 않는다. 카카오·SIWC·공개 앱 심사·결제·운영 설정 변경은 수행하지 않았다.

원격 CI·리뷰의 최종 source SHA와 결과는 해당 PR 및 완료 보고로 인계한다. 개발 단계 종료 시 main 병합·auto-merge·배포는 미실행했으며, 2026-10-26 후속 사용자 지시의 통합·배포 준비는 아래 §4와 WO §5를 따른다.


## 4. 통합 준비 재검증

같은 account ID로 네이버 연결이 복구돼도 실패한 capability와 이전 메타가 남는 재리뷰 지적을 수정했다. 연결 완료는 계정 문맥 세대를 바꿔 capability·자료·이력을 다시 읽으며 기존 선택·본문·확인 문맥을 비운다. 단순 현황 새로고침은 선택을 유지하며 capability를 재조회한다. 재연결 시 이전 requestId도 폐기하는 흐름을 함께 검증해 UI 26개 PASS·Neture production build·ESLint를 확인했다. backend source는 동일하며 제공자 실계정 연결은 수행하지 않았다.

배포 전 공개 읽기 전용 baseline은 API live/ready·Neture 홈 HTTP 200, OAuth metadata의 기존 read/draft 두 scope다. 이는 현재 서빙 계약의 baseline이며 신규 메일 환경 변수의 실제 값이나 실계정 검증 증거는 아니다. 배포 후에도 기본 OFF와 기존 계약 보존을 다시 확인한다.


## 5. 운영 이미지 검증

운영 manifest에 메일 runtime dependency 2개가 없고 personal-mail-worker가 Docker COPY·ignore allowlist에 빠진 누락을 배포 전 확인했다. `package.production.json`의 imapflow 2.9.1·mailparser 3.12.4는 API manifest와 동일하다. Dockerfile에 worker 복사·syntax·두 module export 검증을 추가하고 `.dockerignore`는 해당 entry만 추가 허용했다.

실제 이미지 빌드 PASS: `sha256:9c598590cb5756f727a892f7a85853ea6c3e53ccffc6c824a81eb9644e5e64a3`. 비루트 UID 1001에서 네트워크를 끈 채 `node dist/personal-mail-worker.js --help` PASS, worker 파일 존재·임시 CA 파일 미포함 PASS다. DB나 제공자에 연결하지 않았으며 이미지를 외부 registry에 push하지 않았다.

관리형 클라우드 시험의 Dockerfile 사본은 npm 설치 단계에만 기존 CA를 BuildKit secret으로 공급했다. runtime 지시문·TLS 검증은 그대로이며 CA를 이미지에 복사하지 않았다. 읽기 전용 기본 buildx 경로는 작업 전용 `BUILDX_CONFIG`로 해결했고 기존 Docker 인증·프록시를 유지했다. 테스트가 만든 mail template 사본은 원본 hash와 파일 목록이 일치함을 확인한 후 제거했다. 이 기록은 배포 전 이미지 검증이며 실제 운영 migration·serving SHA 증거는 최종 PR 결과를 따른다.
