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
| UI Vitest | 3 files·22 tests PASS — PersonalMailPage, ExternalAiMailConsent, 기존 MyPageHub |
| Neture production build | PASS — `pnpm --filter @o4o/web-neture build` |
| Migration contract | 21 PASS·0 FAIL — `node scripts/db/check-migration-contract.mjs` |
| PG·공식 MCP SDK 통합 | 기존 콘텐츠 69개 + 메일 32개 = 101 PASS — `node scripts/dev/run-external-ai-fixture.mjs` |
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
- 최초 원격 CI는 신규 worker entry의 console.log 금지 검사에서 실패했다. 기존 worker와 같은 `process.stdout.write`로 정해진 CLI 도움말·집계만 출력하도록 수정했으며 해당 guard를 로컬 통과했다. 최종 원격 결과는 PR의 최신 SHA를 따른다.
- 첫 browser 실행의 Vite CJS 로딩 오류, fixture cwd 때문에 누락된 Tailwind 스타일, ‘완료 0’을 완료로 오인하던 assertion을 수정했다. 실제 앱의 스타일과 loopback API를 사용해 승인 응답·완료/건너뜀 건수·대기 0까지 재확인했다. 기존 CDN font stylesheet만 로컬 빈 CSS로 대체하고 외부 요청은 차단했다. 실제 계정 인증 시험은 아니다.
- Neture의 기존 `tsc -b` node project 설정 오류는 범위 밖이다. 정식 `build`의 `tsc && vite build`를 통과했으며 잘못된 진단 명령이 생성한 자기 임시 산출물은 제거했다. 기존 Browserslist 갱신 안내·bundle 크기 경고를 신규 오류로 숨기거나 무관하게 수정하지 않았다.

## 3. 스키마와 남은 운영 검토

canonical bootstrap + 기존 43개 incremental의 마지막 fingerprint `4accc1af6999af30ee278a666edeafb6d978b2846ef9876fd2b43e58cc4144a3` 일치 후 신규 `CreatePersonalMail1792998000000`을 적용했다. 새 fingerprint는 `0aa797b735eb640d1d35d1066eae9205e0116f869dd1f6d604819c4224cb0759`, 7,224줄·44개 incremental이다. 빈 신규 schema down/up도 통과했다. 운영 DB에는 적용하지 않았다.

Gmail 공개 OAuth 검증·제한 scope 보안 평가와 네이버 상업용 다중 사용자 서비스 이용 조건은 UNKNOWN이다. 실제 제공자 동의·연결/해제, 개인정보 고지, canonical 키·전용 Google 설정, 운영 migration, 요청 외 시간에도 동작할 worker 스케줄은 통합·운영 전에 별도 확인한다. 외부 호출과 DB 사이 exactly-once 한계는 설계 §2를 따른다.

기존 ChatGPT 공개 제출 문서는 여전히 준비 DRAFT다. 이번에는 현행 도구 수와 메일 기본 OFF만 주석으로 정합했으며 실제 제출·공개 승인을 주장하지 않는다. 카카오·SIWC·공개 앱 심사·결제·운영 설정 변경은 수행하지 않았다.

원격 CI·리뷰의 최종 source SHA와 결과는 해당 PR 및 완료 보고로 인계한다. main 병합·auto-merge·배포는 하지 않고 branch/worktree를 KEEP한다.
