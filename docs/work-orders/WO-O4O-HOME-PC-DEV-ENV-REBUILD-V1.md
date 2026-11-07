# 포맷한 집 PC 개발환경 잔여 정비

> **상태**: COMPLETED (TEST-ACCOUNTS 파일 배치 · 플러그인 안내 확인만 사용자 몫으로 남음 — 5-6)
> **작성일**: 2026-11-07 · **최종 갱신**: 2026-11-07
> **실행 위치**: LOCAL
> **인계**: 클라우드 세션이 `claude/nice-planck-0y61y0` 에서 작성 → 집 PC 데스크톱 세션이 실행하고 `wo/home-pc-setup-handoff` 에서 결과 기록
> **근거**: 사용자 지시 2026-11-07 (Windows 재설치 PC 정비) · `HANDOFF.md` 「이 PC 의 미해결 환경」 · `SETUP.md` §1 · §2-4 · §4

## 1. 배경

- HANDOFF(2026-11-07) 기준 완료: 기준 checkout · `pnpm install --frozen-lockfile` · `pnpm run check:runtime` PASS · gcloud 설치·로그인 · Cloud SQL Proxy.
- 남은 것: `psql`(PostgreSQL 15) · Docker 판단 · `apps/api-server/.env` · `docs/local/TEST-ACCOUNTS.local.md` · Claude 앱 worktree 위치 확인.
- 이 지시서는 **클라우드 세션**이 작성했다. 클라우드 세션은 집 PC 에 접근할 수 없어(Remote Control 폴더 0건) 아래 명령은 실행하지 않았다. 점검 결과는 모두 미확인이다.

## 2. 사용자 확정

- psql 은 운영 DB 를 `o4o_readonly` 로 조회하는 용도. 가능하면 클라이언트만 설치하고 DB 서버 서비스가 자동 실행되지 않게 한다.
- 설치는 winget 으로 하나씩, 브라우저 로그인은 명령만 안내한다.
- `.env` 에 운영 비밀값을 넣지 않는다. `TEST-ACCOUNTS.local.md` 는 사용자가 직접 가져다 둔다.

## 3. 설계 판단

| 항목 | 결정 | 근거 |
|---|---|---|
| PostgreSQL 15 | EDB 설치기를 `--disable-components server,pgAdmin,stackbuilder` 로 실행 → **클라이언트(commandlinetools)만** 설치. 서버 서비스가 생기지 않는다 | 사용자 요구. 운영 조회는 프록시 `127.0.0.1:5442` 로 충분(SETUP §3 · §4) |
| 로컬 API 개발용 PG 서버 | 지금은 설치하지 않는다. 나중에 로컬 API(§3-1)를 띄울 때 서버를 추가하고 서비스 시작 유형을 **수동**으로 둔다 | SETUP §1 은 「로컬 API 를 띄우는 개발자」에게만 서버를 요구 |
| Docker | **지금 설치하지 않는다** | SETUP §1 「Windows 기준」: Docker Desktop 은 컨테이너 빌드 재현 때만 필요(선택). 표준 검증 명령은 bash · WSL · Docker 불필요. PostgreSQL fixture 검증도 로컬 PG 15 서버 기준 |
| WSL2 self-hosted runner 계획 | 별도 WO 로 분리. 착수 시 `wsl --install` 은 **재부팅 필요**. runner 안에서는 Docker Desktop 대신 WSL 내부 Docker Engine 을 검토 | ① 저장소가 **Public** 이라 self-hosted runner 는 fork PR 코드가 이 PC 에서 실행될 위험이 있다(GitHub 공식 경고) ② CI · 배포 인프라 변경은 AGENTS.md §5 사용자 확인 대상 |
| `.env` 비밀값 | JWT · SESSION · ENCRYPTION 키는 PC 에서 난수로 생성(로컬 전용). `o4o_readonly` 비밀번호는 `.env` 에 넣지 않고 조회 시점에 Secret Manager 에서 받아 현재 셸 변수로만 쓴다 | SETUP §2-4 「비밀번호를 PC 간에 복사하지 않는다」 · AGENTS §5 |

## 4. 범위 밖

- 운영 DB write · DDL · migration · IAM 변경.
- self-hosted runner 등록 · workflow 변경(별도 WO, 사용자 확인 필요).
- PR #339 작업공간 정리(HANDOFF 별도 항목).

## 5. TODO (모두 LOCAL · PowerShell · 저장소 루트에서)

### 5-1. 현재 상태 점검

```powershell
git --version; git status -sb; git worktree list
gh auth status
git config --global user.name; git config --global user.email
node --version          # 기대: v22.23.4
pnpm --version          # 기대: 10.25.0
gcloud config get-value account; gcloud config get-value project   # 기대 프로젝트: netureyoutube
Test-Path bin\cloud-sql-proxy-v2.exe; if (Test-Path bin\cloud-sql-proxy-v2.exe) { bin\cloud-sql-proxy-v2.exe --version }
Get-Command psql -ErrorAction SilentlyContinue; Get-Service postgresql* -ErrorAction SilentlyContinue
Get-Command docker -ErrorAction SilentlyContinue; wsl --status
Test-Path apps\api-server\.env; Test-Path docs\local\TEST-ACCOUNTS.local.md
```

- [ ] 결과를 5-6 표의 「정비 전」 열에 적는다.
- `gh` 미설치면 `winget install -e --id GitHub.cli` 후 `gh auth login`(브라우저).
- user.name · email 미설정이면 `git config --global user.name "<GitHub 사용자명>"` · `git config --global user.email "<GitHub noreply 주소>"`(Public 저장소라 noreply 권장).
- worktree 위치: `git worktree list` 에 저장소 안 경로(`.claude\worktrees\...`)가 있으면 Claude 앱 Settings 의 worktree 위치가 아직 바뀌지 않은 것이다. 기대 위치는 기준 checkout 의 형제 `o4o-wt\`(AGENTS.md §4-1(a)).

### 5-2. PostgreSQL 15 클라이언트만 설치

```powershell
winget install -e --id PostgreSQL.PostgreSQL.15 --override "--mode unattended --unattendedmodeui none --disable-components server,pgAdmin,stackbuilder"
```

EDB 설치기는 PATH 를 추가하지 않는다. 사용자 PATH 에 추가하고 새 터미널을 연다.

```powershell
[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ';C:\Program Files\PostgreSQL\15\bin', 'User')
```

- [ ] 새 터미널에서 `psql --version` → `psql (PostgreSQL) 15.x`.
- [ ] `Get-Service postgresql*` → 결과 없음(서버 서비스 없음).
- 서비스가 생겼다면(override 가 무시된 경우) 자동 실행만 끈다: `Stop-Service postgresql-x64-15` → `Set-Service postgresql-x64-15 -StartupType Manual`. 서버 제거는 하지 않는다(나중 로컬 API 용으로 재사용 가능).

### 5-3. 운영 DB read-only 접속 확인 (`o4o_readonly`)

터미널 1: `.\start-cloud-sql-proxy.cmd` (127.0.0.1:5442). 터미널 2 — 각 줄을 따로 실행한다(ask 명령을 묶지 않는다):

```powershell
$env:PGPASSWORD = gcloud secrets versions access latest --secret=o4o-db-readonly-password
psql "host=127.0.0.1 port=5442 dbname=o4o_platform user=o4o_readonly sslmode=disable" -c "SET default_transaction_read_only = on; SELECT current_user, current_setting('transaction_read_only') AS ro, version();"
Remove-Item Env:PGPASSWORD
```

판정:

- `current_user = o4o_readonly` · `ro = on` → 접속 · read-only 확인 완료.
- 인증 실패 → secret 값 · 계정 상태 문제. **`o4o_api_v2` 로 우회하지 않고** 사용자에게 보고.
- 연결 거부 → 프록시 미기동 또는 ADC 만료(`gcloud auth application-default login`, 브라우저).

### 5-4. `apps/api-server/.env` 생성 (로컬 개발용)

```powershell
Copy-Item apps\api-server\.env.example apps\api-server\.env
function New-Hex([int]$n) { -join ((1..$n) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }) }
$f = 'apps\api-server\.env'
(Get-Content $f) `
  -replace '^JWT_SECRET=.*', "JWT_SECRET=$(New-Hex 48)" `
  -replace '^JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$(New-Hex 48)" `
  -replace '^SESSION_SECRET=.*', "SESSION_SECRET=$(New-Hex 48)" `
  -replace '^ENCRYPTION_KEY=.*', "ENCRYPTION_KEY=$(New-Hex 32)" | Set-Content $f -Encoding utf8
git check-ignore -v apps\api-server\.env
```

- `Get-Random` 은 로컬 개발용 난수로 충분하다. 운영 값과 같게 맞추지 않는다.
- 블록 (A) 로컬 DB 값은 예제 그대로 둔다. 로컬 PG 서버가 없으므로 API 는 아직 기동하지 않는다.
- [ ] `git check-ignore` 가 `.gitignore` 규칙을 출력하고 `git status --short` 에 `.env` 가 없다.

사용자가 채울 값(필요할 때만):

| 변수 | 언제 | 값 출처 |
|---|---|---|
| `DB_USERNAME` · `DB_PASSWORD` (블록 A) | 로컬 PG 서버 설치 후 로컬 API 기동 시 | 본인이 만든 로컬 DB owner |
| `GOOGLE_ALLOWED_CLIENT_IDS` | 로컬 Google 로그인 smoke | **개발용** OAuth Client ID (origin `http://localhost:3000`) |
| `GEMINI_API_KEY` 또는 `OPENAI_API_KEY` | 로컬 AI 호출 smoke | 개발용 key (예제에 줄이 없으니 추가) |
| `KAKAO_*` · `CAFE24_*` · `SMTP_*` · `EXTERNAL_AI_*` | 해당 기능 smoke 시만 | 개발용 값. 비워 두면 기능이 꺼진다 |

운영 DB 를 API 로 붙이는 블록 (B)는 쓰지 않는다(운영 조회는 5-3 의 psql 로 한다).

### 5-5. `docs/local/TEST-ACCOUNTS.local.md`

- 위치: 기준 checkout 의 `docs\local\TEST-ACCOUNTS.local.md` (git 미추적 · `.gitignore` 의 `docs/local/*.local.md`). worktree 마다 자동 복사되지 않는다.
- 형식: 정해진 저장소 템플릿은 없다. SETUP 「테스트 계정 찾기」가 요구하는 것은 계정 정보와 **확인 상태 · 확인 기록 표**다. 권장 골격:

  ```markdown
  # TEST ACCOUNTS (local only — 커밋 금지)

  | 구분 | 서비스 | 아이디 | 비밀번호 | 기대 역할 | 비고 |
  |---|---|---|---|---|---|

  ## 확인 상태
  | 계정 구분 | 서비스 | 로그인 | 역할 확인 | 확인일 | 확인자 |
  |---|---|---|---|---|---|

  ## 확인 기록
  - YYYY-MM-DD · <무엇을 확인했는지 · 결과>
  ```

- [ ] 사용자가 파일을 둔 뒤 `git check-ignore -v docs\local\TEST-ACCOUNTS.local.md` 로 무시 규칙 적용을 확인한다.

### 5-6. 최종 점검표

5-1 명령을 다시 실행해 채운다.

| 항목 | 기대 | 정비 전 | 정비 후 |
|---|---|---|---|
| git · 기준 checkout clean | `main` · HEAD == origin/main | clean · behind 3 | clean · `19a8e69af9` == origin/main (ff-only) |
| gh 로그인 | logged in | 로그인됨 | 로그인됨 |
| git user.name · email | 설정됨 | 설정됨 | 설정됨 |
| Node | v22.23.4 | v22.23.4 | v22.23.4 |
| pnpm | 10.25.0 | 10.25.0 | 10.25.0 |
| gcloud 계정 · 프로젝트 | netureyoutube | netureyoutube · ADC 있음 | 같음 |
| cloud-sql-proxy | v2.x | v2.14.3 | v2.14.3 |
| psql | 15.x · 서버 서비스 없음 | 15.19 설치돼 있으나 PATH 없음 · 서버 서비스 **자동 · 실행 중**(0.0.0.0:5432) | 15.19 · 사용자 PATH 추가 · 서비스 **수동 · 중지** (5-2 의 대안 경로) |
| `o4o_readonly` 접속 | ro = on | 미확인 | `current_user = o4o_readonly` · `default_transaction_read_only = on` (사용자 실행) |
| Docker | 미설치(의도) | Windows Docker 없음 · WSL Ubuntu 안 Docker Engine 29.9.3 active | 변경 없음. Docker Desktop 미설치. runner 용 Engine 은 [`O4O-SELF-HOSTED-CI-RUNNER-V1`](../baseline/operations/O4O-SELF-HOSTED-CI-RUNNER-V1.md) 기준으로 이미 준비됨 · 실행기 미등록 |
| `apps/api-server/.env` | 존재 · ignored | 없음 | 존재 · ignored · 로컬 난수 secret · `DB_PASSWORD` placeholder |
| `TEST-ACCOUNTS.local.md` | 존재 · ignored | 없음 | **없음 — 사용자 배치 대기** |
| worktree 위치 | `o4o-wt\` | `o4o-wt\` (앱 설정 확인) | 같음 |

#966 이후 로컬 확인(사용자 요청 2026-11-07):

| 항목 | 결과 |
|---|---|
| 저장소 선언 플러그인 설치 안내 | **미확인** — 확인한 세션이 #966 반영 전 checkout 에서 시작해 판정 불가. 이 PC 에 marketplace · 설치 기록 없음. #966 이후 main 에서 새 로컬 세션을 시작해 확인 |
| `gcloud run deploy --help` | **통과** — 차단되지 않고 승인 창이 떴다(사용자가 의도적으로 거부) |
| 배포 차단 훅(로컬 Windows) | **통과** — `block-cloud-deploy.mjs` · `guard-git-push.mjs` 에 PreToolUse 입력을 직접 넣어 실행: 배포 · 일반 명령 모두 출력 없음 · exit 0. 대조로 `CLAUDE_CODE_REMOTE=true` 에서만 deny |

- [x] 결과를 이 절에 기록 → `HANDOFF.md` 「이 PC 의 미해결 환경」 갱신 → 상태 `COMPLETED`.

## 6. 검증 계획

- 각 항목은 5-6 표의 실제 명령 출력으로만 판정한다. 실행하지 않은 항목은 「미확인」으로 남긴다.

## 문서 정합

해당 없음.
