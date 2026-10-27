# GitHub App 토큰 발급 도구

> **상태**: ACTIVE · **작성일**: 2026-10-27
> **근거 WO**: [GITHUB-APP-TOKEN-ISSUER-V1](../work-orders/WO-O4O-GITHUB-APP-TOKEN-ISSUER-V1.md)

## 동작

`scripts/ops/github-app-token.mjs`는 등록된 GitHub App의 비밀키로 JWT를 서명하고,
설치 토큰을 GitHub 공식 API에서 발급받는다. 실행마다 새 토큰을 받아 만료된 토큰 재사용을 피한다.
발급 권한의 근거인 App 설치·비밀키가 먼저 필요하다. Codex 플랫폼 자체의 `GH_TOKEN`을
재발급하는 API나 사용자 OAuth 재인증 기능은 아니다.

대상은 `Renagang21/o4o-platform` 하나다. 발급 후 실제 접근 가능한 저장소·권한·유효기간을
재확인하며 범위가 다르면 토큰을 폐기한다. 토큰/JWT는 메모리와 curl stdin에서만 처리하고,
명령 인자·출력·파일에 기록하지 않는다. 기존 proxy·CA·TLS 검증을 유지하며 redirect는 따르지 않는다.

`exec --use-app-identity`는 명시적으로 선택한 `gh api` 또는 `git fetch/push/ls-remote` 자식 프로세스에만 App 토큰을
전달한다. 기존 shell의 `GH_TOKEN`, Git credential 저장소 및 Codex 연결은 변경하지 않는다.
신뢰하는 명령에만 사용한다. 자식 명령은 인증 환경을 전달받으므로 자체 로그/후크의 비밀정보
취급도 확인한다. 도구는 `gh auth token`·임의 shell 실행을 허용하지 않는다.

정상 종료와 명령 실패 시 토큰 폐기를 시도한다. 프로세스 강제 종료·네트워크 단절로 폐기하지
못하면 GitHub의 약 1시간 만료가 적용된다. 장시간 실행 중 토큰 교체나 쓰기 요청의 자동 재시도는
하지 않는다. 다음 명령에서 새 토큰을 받는다.

## 최초 설정

이미 App이 있으면 식별자와 비밀키 파일 연결을 재사용한다. 새 App의 경우 저장소 소유자가
GitHub **Settings → Developer settings → GitHub Apps → New GitHub App**에서 등록한다.

1. Homepage URL은 저장소 주소로 지정하고 webhook의 **Active**를 해제한다. 별도 서버는 필요 없다.
2. Repository permissions는 아래 사용 목적에 필요한 항목만 허용한다. 계정·조직 관리 권한은 필요 없다.
3. App을 **Only select repositories → o4o-platform**에 설치한다.
4. App ID와 설치 화면 URL의 Installation ID를 확인한다.
5. **Generate a private key**로 받은 PEM을 모든 Git 작업 디렉터리 밖의 비밀 파일 저장소에 둔다.
   POSIX는 owner-only `0600`, Windows는 파일 ACL에서 실행 사용자만 읽을 수 있게 설정한다.
   키 내용은 채팅·저장소·WO·명령 인자에 붙여 넣지 않는다.

| profile | 요청하는 repository permissions | 목적 |
|---|---|---|
| `read` (기본) | Contents·Pull requests·Actions·Checks·Commit statuses: Read | fetch, 조회, CI 상태 확인 |
| `author` | Contents·Pull requests: Read and write, 나머지 위 항목: Read | 작업 branch push, PR 작성 |

Metadata Read는 GitHub가 암묵적으로 제공한다. App이 허용한 권한보다 높은 profile은 발급되지 않는다.
이 도구는 Workflow 파일 쓰기·Actions 쓰기·Administration 권한을 요청하지 않는다.

Codex 환경에는 다음 이름으로 변수를 연결한다. PEM은 Secret **파일**로 연결하고 경로만 변수에 둔다.

| 이름 | 종류 |
|---|---|
| `O4O_GITHUB_APP_ID` | App ID, 일반 변수 |
| `O4O_GITHUB_APP_INSTALLATION_ID` | Installation ID, 일반 변수 |
| `O4O_GITHUB_APP_PRIVATE_KEY_FILE` | 절대 비밀 파일 경로, 일반 변수 |

기존 `GH_TOKEN`을 삭제하거나 덮어쓰지 않는다. 환경 변경을 게시한 뒤 실제 `check`가 성공해야
발급 연결 완료로 판정한다. 필요한 실행 도구는 Node.js와 curl, 사용할 명령에 따라 gh/git이다.
새 npm 의존성은 없다.

## 실행

아래 명령은 Bash·PowerShell에서 모두 한 줄로 실행한다.

```text
node scripts/ops/github-app-token.mjs check
node scripts/ops/github-app-token.mjs exec --use-app-identity -- gh api repos/Renagang21/o4o-platform --jq .full_name
node scripts/ops/github-app-token.mjs exec --use-app-identity -- git fetch origin main
node scripts/ops/github-app-token.mjs exec --use-app-identity --profile author -- git push origin wo/<작업-branch>
```

`check`는 토큰을 발급·검증·폐기하고 저장소·profile·만료 시각·폐기 여부만 출력한다.
App 설정 미완료나 GitHub API 오류는 비밀값·응답 원문 없이 실패한다.

Git 명령은 HTTPS remote만 지원한다. `git@github.com:...` 및 `ssh://...` remote는
HTTPS credential helper를 사용하지 않으므로 SSH 접속 전에 차단한다. 필요한 경우 사용자가
해당 작업공간의 remote를 HTTPS로 설정한 뒤 실행한다. 기존 SSH 키로 자동 전환하지 않는다.
부모 환경의 Git transport 제한이 HTTPS를 허용하지 않으면 그 제한도 유지하며 실패한다.
기존 Git `http.extraHeader` 및 URL별 extraHeader 설정이 있으면 발급 전에 실행을 거부한다.
기존 인증 헤더를 지우거나 덮어쓰지 않으며 설정 이름의 존재만 확인한다. 빈 값이나 인증 외의
추가 헤더도 보수적으로 충돌로 취급하므로, 그런 설정이 있는 환경은 먼저 관리자가 별도로 정리해야 한다.

Git 명령은 `git push origin ...`처럼 동작 바로 다음에 remote 이름을 지정한다.
`insteadOf`/`pushInsteadOf`까지 해석한 remote URL이 대상 저장소의 HTTPS이고
userinfo·query·fragment가 없는지 발급 전에 확인한다. URL에 저장된 다른 credential은 사용하지 않는다.

상속된 `GIT_CONFIG_PARAMETERS`·`GIT_CONFIG` 설정은 검사 대상/우선순위를 바꿀 수 있어 실행 전에
거부한다. Git HTTP가 별도 신원을 선택할 수 있는 netrc 설정도 파일 내용은 읽지 않고 존재만 검사해
거부한다. 도구가 사용자·플랫폼 credential 파일이나 정책 변수를 해제하지 않는다.

Git을 간접 실행하는 `gh repo clone`·`gh pr create/checkout/merge` 등은 지원하지 않는다.
GitHub 작업은 Git 동작이 없는 `gh api`로 실행한다. author profile의 PR 작성도 REST API 요청으로
수행할 수 있다. 직접 Git 명령만 위 인증·remote 검사 후 허용한다.

## 운영 배포와의 경계

App installation token의 실행 주체는 **App bot**이다. 저장소 소유자 사용자와 동일하지 않다.
기존 workflow의 owner-only·CI·freeze·environment gate를 유지한다. App 설치만으로 소유자 전용
배포·migration·IAM 작업이 허용되지 않으며 이 도구도 해당 gate를 수정하지 않는다.
현재 약국 리소스 정리의 소유자 인증 문제까지 해결됐다고 판정하지 않는다.

## 검증

```text
node --test scripts/ops/github-app-token.test.mjs
```

격리된 테스트 키·가짜 API 응답으로 RS256 서명, 단일 저장소/권한/만료 검증, 폐기, 비밀값 출력 방지와
실제 Git credential protocol을 검사한다. 실제 발급·push는 App 설치와 비밀키 연결 후 별도 확인해야 한다.
