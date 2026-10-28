# O4O ChatGPT 도메인 소유 확인 준비

> **상태**: ACTIVE · **작성일**: 2026-10-28 · **최종 갱신**: 2026-10-28 (Asia/Seoul)
> **범위**: 사용자 제공 포털 토큰에 대한 최소 공개 응답과 로컬 검증. 운영 배포·도메인 인증 완료 기록이 아니다.

## 변경과 근거

등록 포털의 MCP 주소는 `https://api.neture.co.kr/api/external-ai/mcp`이고 소유 확인 주소는 `https://api.neture.co.kr/.well-known/openai-apps-challenge`다. 변경 전 공개 GET은 404였다. 기존 challenge를 읽거나 덮어쓰지 않았다. 사용자가 복사한 정확한 토큰을 제공한 뒤 구현했으며 이미지에서 값을 추정하지 않았다.

공식 제출 안내의 plain-text 단일 토큰 계약에 맞춰 기존 external-ai root router에 해당 GET 경로만 추가한다. 현재 설정된 canonical issuer hostname에서만 제공하며 issuer가 없으면 경로를 활성화하지 않는다. OAuth·브라우저 로그인·DB 조회를 요구하지 않고 `text/plain`·`Cache-Control: no-store`로 정확한 문자열을 반환한다. 이 토큰은 소유 확인 URL에 공개하는 값이며 OAuth 토큰·credential이 아니다. 별도 환경 변수·Secret·DB·권한·MCP 도구 변경은 없다.

## 검증

- Jest focused HTTP: `domain-verification.spec.ts`, 1 suite / 5 tests PASS. 정확한 본문·개행 없음·Content-Type·캐시 정책, 다른 호스트 차단, issuer 미설정 차단, 쓰기 미등록, 무관한 경로 유지를 확인했다.
- 신규 모듈·테스트의 NodeNext focused TypeScript 검사 PASS.
- 변경 소스 3개의 ESLint PASS. `git diff --check` PASS.
- 이 worktree에서 전체 API build·타입 검사는 미실행이다. 현 로컬 설치에는 최신 main의 imapflow·mailparser가 없어 과거 설치를 전체 최신 환경 검증으로 주장하지 않는다. PR CI가 고정 lockfile 설치와 전체 검증을 수행해야 한다.
- 로컬 도구 접근용 node_modules symlink는 이 작업이 만든 것만 검사 후 해제한다. 타 checkout의 소스·의존성·기존 변경은 수정하지 않는다.

## 운영 적용과 인계

API 코드 변경이므로 CI·리뷰 결과를 확인한 뒤 통합 담당의 승인된 기존 배포 절차가 필요하다. 이 작업에서 main 병합·auto-merge·운영 배포·DB 변경은 실행하지 않는다. 코드가 merge됐다는 사실도 실제 배포 증거가 아니다.

배포 직전 같은 URL을 읽어 다른 앱의 challenge가 새로 생겼는지 다시 확인한다. 값이 있으면 덮어쓰지 말고 포털이 허용하는 부모 HTTPS origin 또는 별도 호스트를 검토한다. 배포 후 공개 GET 200, `text/plain`, 본문이 사용자 제공 값과 byte 단위로 일치하고 JSON·HTML·추가 개행이 없는지 검증한다. 그 후 사용자가 Verify Domain을 누르고 포털의 성공 상태를 확인한다. OAuth 연결·도구 scan·심사 제출·공개는 별도 단계다.

DEPLOYMENT = REQUIRED (아직 미실행). 문서 정합: 도메인 확인 경로는 확정된 포털 계약이며 기존 OAuth discovery·MCP·동의 경계는 유지한다.
