# O4O Platform — 로컬 실행환경 정본

> 이 문서는 **로컬 개발 실행환경의 단일 기준(SSOT)** 입니다.
> 개발 규칙·아키텍처 경계·운영 정책은 [CLAUDE.md](CLAUDE.md)를 따릅니다.

---

## 테스트 계정 찾기 — 브라우저·운영 검증 전

실제 테스트 계정의 기준 문서는 **`docs/local/TEST-ACCOUNTS.local.md`** 입니다
(문서 제목: `O4O Platform — 테스트 계정 (Identity V2 구조)`). 운영자·관리자·회원 로그인 검증 전에 이 파일을 먼저 확인합니다.
서비스에서 같은 운영자 아이디를 사용하더라도 현재 서비스 역할·가입 상태는 로그인 후 별도로 확인합니다.

이 파일은 `.gitignore`의 `docs/local/*.local.md` 규칙으로 제외되므로 **새 clone·worktree·Codex Cloud에 자동으로 들어오지 않습니다.**
현재 checkout에 없으면 같은 작업환경의 기준 checkout에 있는 동일 경로를 확인합니다. 거기에도 없으면 파일이 없다는 사실과
필요한 경로를 알리고, 사용자의 로컬 원본을 승인된 비공개 파일 전달 또는 환경 Secret 연결로 제공받습니다.
스크린샷에 경로가 보이는 것만으로 클라우드에서 파일 내용을 읽을 수 있는 것은 아닙니다.

계정·비밀번호를 공개 문서·커밋·로그에 복사하지 않습니다. 예전 seed 계정이나 공개 Demo 계정으로 임의 대체하거나
비밀번호를 추측하지 않습니다. 상태 변경 검증은 테스트 대상과 원상 복구 방법을 확인한 뒤 수행합니다.

### 원본 PC의 위치 단서와 클라우드 확인 결과 (2026-10-11)

문서 조사에서 확인한 상대 경로는 `docs/local/TEST-ACCOUNTS.local.md`다. 아래 두 위치는 과거 문서의
Windows 저장소 루트에 이 상대 경로를 결합한 **확인 후보**이며, 원본 PC의 현재 파일 존재를 확인한 결과는 아니다.
공개 문서에는 개인 Windows 사용자 이름 대신 `%USERPROFILE%`을 사용한다.

| 원본 PC에서 확인할 후보 | 위치 근거 |
|---|---|
| `%USERPROFILE%\coding\o4o-platform\docs\local\TEST-ACCOUNTS.local.md` | [Codex 환경 조사](docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md) §1의 저장소 루트, §2의 계정 문서 경로 |
| `%USERPROFILE%\o4o-platform\docs\local\TEST-ACCOUNTS.local.md` | [운영 DB 잔여 조사](docs/checks/WO-O4O-FINAL-PRODUCTION-DB-RESIDUE-CLOSURE-V1-CHECK.md)의 당시 작업 경로 |

[계정 문서 정비 기록](docs/checks/CHECK-O4O-TEST-ACCOUNTS-IDENTITY-V2-SERVICE-CREDENTIAL-DOCUMENTATION-V1.md)과
[브라우저 검증 조사](docs/investigations/IR-O4O-PLAYWRIGHT-MCP-AND-TEST-ACCOUNT-SMOKE-BLOCKER-AUDIT-V1.md)는
이 로컬 전용 문서를 실제로 갱신한 이력을 남긴다. 과거 사용 이력이 현재 로그인 가능 여부를 보장하지는 않는다.

이번 클라우드의 작업·기준 checkout 및 접근 가능한 `/workspace`, `/tmp`, `/mnt`, `/media`, `/home`에서
해당 파일과 이름이 유사한 사본을 찾지 못했다. 접근 제한 디렉터리와 연결되지 않은 원본 PC는 확인 범위에 포함되지 않는다.
현재 Git refs의 추적 파일·경로 이력에도 원본이 없으므로 `git pull`로 가져올 수 없다.

원본 PC에서 위 후보의 파일을 확인한 뒤 승인된 비공개 전달 또는 환경 Secret 연결로 제공한다.
클라우드에 파일로 연결하는 경우 작업 checkout의 `docs/local/TEST-ACCOUNTS.local.md`를 사용하고,
파일 존재와 `git check-ignore -v docs/local/TEST-ACCOUNTS.local.md`를 확인한다. 값은 문서·로그·커밋에 복사하지 않는다.
조사 범위와 남은 검증은 [My Home CHECK](docs/checks/CHECK-O4O-MY-HOME-IMPLEMENTATION-V1.md#테스트-계정-원본-위치-조사-2026-10-11)에 기록한다.

## 1. 필수 도구

| 도구 | 버전 | 확인 | 필요한 사람 |
|---|---|---|---|
| Node.js | 22.18.0 | `node --version` | 전원 |
| pnpm | 10.25.0 | `pnpm --version` | 전원 |
| PostgreSQL (로컬 개발 DB) | 15 | `psql --version` | 로컬 API 를 띄우는 개발자 (운영 DB 와 같은 major) |
| gcloud CLI | 최신 | `gcloud --version` | **운영자 전용** — 공동개발 로컬환경에는 필요 없음 |
| Cloud SQL Auth Proxy | v2 (v2.14.3 기준) | `bin/cloud-sql-proxy-v2.exe --version` | **운영자 전용** — 공동개발 로컬환경에는 필요 없음 |

> **공동개발 로컬환경은 운영 credential 없이 구성합니다.** 운영 DB · Secret Manager · GCP 자격증명 · 운영 OAuth /
> AI key 는 필요 조건이 아니며 제공하지 않습니다. 이 문서의 프록시 · `gcloud` · 운영 DB identity 절(§2-2 · §2-3 ·
> §3 터미널 1 · §4 운영 DB 열 · §7)은 운영자용입니다. 공동개발자는 [§3-1](#3-1-공동개발-로컬환경--로컬-api--web-neture) 부터 보면 됩니다.

TypeScript · Vite 는 workspace 별로 여러 버전이 공존합니다(예: web-neture 는 TS 5.9 · Vite 5, 일부 서비스는 Vite 7).
**직접 맞추지 않습니다** — `pnpm-lock.yaml` 이 패키지별로 해결합니다.

**기준값은 루트 `package.json`의 `volta` 필드입니다** (`node 22.18.0` · `pnpm 10.25.0`).
CI(`.github/actions/setup-build-env`)도 동일 버전을 사용하므로, 로컬을 이 값에 맞추면
"로컬은 되는데 CI 는 실패" 를 줄일 수 있습니다. Volta 사용 시 저장소 디렉터리에서 자동 적용됩니다.

> `package.json`의 `engines.pnpm` 은 아직 `>=9.0.0` 으로 남아 있으나, 실제 기준은 위
> `volta.pnpm` (10.25.0) 입니다. pnpm 9 로는 lockfile 형식이 어긋날 수 있습니다.

### Windows 기준

이 저장소의 **표준 검증 명령은 bash 를 요구하지 않습니다.** `type-check` · `lint` · `test` ·
`clean` 은 모두 `node scripts/dev.mjs` 기반이라 PowerShell / cmd 에서 그대로 동작합니다.

- `.husky/pre-commit` 은 `#!/bin/sh` 이지만 Git for Windows 에 포함된 sh 로 실행되므로 **WSL 불필요**.
- `scripts/*.sh` 는 **Linux 전용 레거시**이며 Windows 로컬 개발에 필요하지 않습니다
  ([scripts/README.md](scripts/README.md) 참조).
- 루트 `package.json`의 `*:sh` 계열 스크립트(`type-check:sh` 등)는 WSL 경유 대체 경로이며 표준이 아닙니다.

Docker Desktop은 컨테이너 빌드를 로컬에서 재현할 때만 필요합니다(선택).

---

## 2. 최초 1회 설정

### 2-1. 의존성 설치

```bash
pnpm install --frozen-lockfile
```

**`--frozen-lockfile` 이 기본입니다.** `pnpm-lock.yaml` 을 그대로 재현하므로 CI 와 같은 의존성 트리를 얻습니다.
CI(`ci-pipeline.yml`)도 동일하게 설치하며 lockfile 이 어긋나면 **실패합니다**.

설치 후 `pnpm-lock.yaml` 이 의도하지 않게 바뀌었다면 **커밋하지 말고** Node · pnpm 버전(§1)부터 확인합니다.

의존성을 **의도적으로 추가·변경할 때만** 잠금 없이 설치합니다.

```bash
pnpm install                 # lockfile 갱신
git add pnpm-lock.yaml       # package.json 과 함께 stage (pre-commit 이 검증)
```

### 2-2. Cloud SQL Proxy 설치

> 운영자 전용. 공동개발 로컬환경에는 필요 없습니다(§2-3 도 같음).

```cmd
.\setup-cloud-sql-proxy.cmd
```

Cloud SQL Auth Proxy **v2** 바이너리를 `bin/cloud-sql-proxy-v2.exe`로 내려받습니다.
이미 존재하면 건너뜁니다. 바이너리는 Git에 커밋하지 않습니다(`bin/`은 `.gitignore` 대상).

### 2-3. GCP 인증 (Application Default Credentials)

```cmd
gcloud auth application-default login
```

브라우저에서 GCP 프로젝트 접근 권한이 있는 계정으로 로그인합니다.
Cloud SQL Proxy가 이 자격증명을 사용하므로, 계정에 **Cloud SQL Client** IAM 역할이 필요합니다.

프로젝트가 `netureyoutube`인지 확인:

```cmd
gcloud config get-value project
```

### 2-4. 환경변수 파일 생성

API 서버가 **실제로 읽는 환경파일은 `apps/api-server/.env` 하나**입니다
([apps/api-server/src/env-loader.ts](apps/api-server/src/env-loader.ts) 기준).

```bash
cp apps/api-server/.env.example apps/api-server/.env
```

로컬 개발 DB(기본값) 또는 프록시 경유 운영 DB 중 하나를 선택해 값을 채웁니다.
두 경로의 예제는 `.env.example`의 (A)/(B) 블록에 분리되어 있습니다. 공동개발자는 **(A) 로컬 DB 만** 씁니다.

로컬에서 채울 값은 모두 **본인 로컬 전용 값**입니다.

| 변수 | 값 |
|---|---|
| `PORT` | `3002` (로컬 API 기준 포트 — 예제 기본값 그대로) |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | 본인 로컬 PostgreSQL 15 값 |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` / `SESSION_SECRET` | 임의 난수 문자열 (로컬 전용, 공유 금지) |
| `GOOGLE_*` · AI key · 결제 · 소셜 · 이메일 | UI 기동에는 불필요 — [§3-1](#3-1-공동개발-로컬환경--로컬-api--web-neture) 의 로그인 · AI 항목 참고 |

**`.env`는 절대 커밋하지 않습니다** (`.gitignore` 처리됨).
비밀번호를 PC 간에 복사하지 말고 각 PC에서 개별 설정합니다.

---

## 3. 개발 시작 (매일)

로컬 개발 DB와 운영 DB는 **포트로 분리**합니다.

| 대상 | 주소 | 용도 |
|---|---|---|
| 로컬 PostgreSQL | `127.0.0.1:5432` | 개발 기본값 |
| Cloud SQL Auth Proxy | `127.0.0.1:5442` | 운영 DB 접근 전용 |

로컬 DB만 쓴다면 프록시는 띄우지 않아도 됩니다.

### 터미널 1 — Cloud SQL Auth Proxy (운영 DB 접근 시에만)

```cmd
.\start-cloud-sql-proxy.cmd
```

```
Instance   : netureyoutube:asia-northeast3:o4o-platform-db
Local Port : 5442
Listening on 127.0.0.1:5442
```

이 창은 사용 중 닫지 않습니다. 종료는 `Ctrl+C`.

포트 점유 확인: `netstat -ano | findstr :5442`

> 개발 모드(`NODE_ENV != production`)에서 운영 DB host로 **직접 TCP 연결하면 API 서버가 기동을 거부**합니다.
> 운영 DB는 반드시 이 프록시를 경유하십시오. 예외가 필요하면 `ALLOW_REMOTE_DB=true`로 명시 opt-in 합니다.

### 터미널 2 — 개발 서버

```bash
pnpm run build:packages                # 최초 1회 또는 packages/ 수정 시
pnpm run dev:admin                     # Admin Dashboard  → http://localhost:5173
pnpm run dev:api                       # API 서버         → http://localhost:3002 (.env PORT)
pnpm --filter @o4o/web-neture dev      # web-neture       → http://localhost:3000
pnpm run dev                           # Admin Dashboard (= dev:admin)
```

API 상태 확인: `curl http://localhost:3002/health`

로컬 API 포트 **3002** 가 기준입니다(`apps/api-server/.env.example` `PORT` · web-neture dev 기본값 · `@o4o/auth-client` localhost 기본값).
소스의 `PORT || 8080` 은 Cloud Run runtime 기본값이며 로컬 기준이 아닙니다.

### 3-1. 공동개발 로컬환경 — 로컬 API + web-neture

첫 공동개발 대상(neture.co.kr Main · O4O Agent) 기준 절차입니다. **운영 credential 은 필요 없습니다.**

1. **설치** — §1 도구(Node 22.18.0 · pnpm 10.25.0 · PostgreSQL 15) 준비 후 `pnpm install --frozen-lockfile` (§2-1).
2. **공통 패키지 빌드** — `pnpm run build:packages`.
   web-neture 가 쓰는 `@o4o/*` 일부(types · auth-client · ui · content-editor · forum-core 등)는 소스가 아니라 `dist` 를 import 하므로, 이 빌드 없이는 dev server 가 뜨지 않습니다.
3. **로컬 DB** — PostgreSQL 15 에 빈 DB(예: `o4o_platform`)와 그 DB 의 owner 사용자를 만듭니다.
   필요한 extension(`uuid-ossp`)은 아래 bootstrap 이 생성합니다.
4. **API env** — §2-4 대로 `apps/api-server/.env` 작성 (`PORT=3002`, 로컬 DB 값, 임의 JWT/SESSION secret).
5. **스키마 bootstrap** — `pnpm --filter @o4o/api-server migration:run`.
   빈 DB 면 canonical schema baseline 을 적용한 뒤 incremental migration 을 적용합니다(`apps/api-server/src/migrate.ts`).
   반드시 **로컬 DB** 를 가리키는 `.env` 로 실행합니다. seed · 테스트 계정은 없습니다.
6. **API 기동** — `pnpm run dev:api` → `curl http://localhost:3002/health`.
7. **web-neture 기동** — `pnpm --filter @o4o/web-neture dev` → http://localhost:3000 . `/` 에 `O4OHomePage`(메인 화면)가 보이면 정상입니다.
   - API 대상은 `VITE_API_BASE_URL` 입니다. 다른 로컬 주소를 쓰려면 `services/web-neture/.env.example` 을 `.env.local` 로 복사해 수정합니다.
   - **dev server 는 이 값이 없어도 `http://localhost:3002` 를 씁니다. 운영 API 로 fallback 하지 않습니다**
     (`vite.config.ts` · `src/lib/apiBaseUrl.ts`). 운영 API 주소를 직접 적어 넣지 않습니다.
   - 브라우저 개발자도구 Network 탭에서 요청이 `localhost:3002` 로 가는지 한 번 확인합니다.

**로그인 · AI 호출 (실제 기능 smoke 에만 필요)**

- 화면 기동 자체에는 Google OAuth 도 AI key 도 필요 없습니다.
- 로그인은 Google 로그인뿐입니다(GIS popup → ID token → API 가 `aud` 검증). 로컬 로그인 smoke 에는
  Authorized JavaScript origin 에 `http://localhost:3000` 이 등록된 **개발용 OAuth Client ID** 하나가 필요합니다.
  `apps/api-server/.env` 에 아래 한 줄만 넣습니다. web-neture 에는 Google 설정이 없습니다(Client ID 는 API 의 `/auth/google/config` 가 내려줍니다).

  ```bash
  GOOGLE_ALLOWED_CLIENT_IDS=<개발용 OAuth Client ID>
  ```

  - popup 방식이라 **redirect URI 는 필요 없고, Client Secret 도 쓰지 않습니다.**
  - `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` 은 은퇴한 passport 설정이라 넣어도 효과가 없습니다.
  - `GOOGLE_WEB_CLIENT_ID` 는 선택입니다. 비우면 `GOOGLE_ALLOWED_CLIENT_IDS` 의 첫 항목을 씁니다.
  - 운영 OAuth Client 는 제공하지 않으며, 개발용 Client ID 제공 방식은 별도로 안내합니다.
- O4O Agent 의 실제 AI 요청(`/api/ai/*`)은 로그인이 필요하고, **개발용 Gemini 또는 OpenAI key**(`GEMINI_API_KEY` / `OPENAI_API_KEY`)가
  있어야 합니다. key 가 없으면 `AI_NOT_CONFIGURED` 로 실패합니다. 운영 AI key 는 제공하지 않습니다.

---

## 4. 데이터베이스

| 항목 | 로컬 개발 DB | 운영 DB (프록시 경유) |
|---|---|---|
| 연결 방식 | 로컬 PostgreSQL 직접 | Cloud SQL Auth Proxy |
| `DB_HOST` | `127.0.0.1` | `127.0.0.1` |
| `DB_PORT` | `5432` | `5442` |
| Instance | — | `netureyoutube:asia-northeast3:o4o-platform-db` |
| Database | `o4o_platform` | `o4o_platform` |

환경변수 키는 `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` 이며,
API 서버는 **`apps/api-server/.env`** 만 읽습니다 (루트 `.env` 아님).

운영 DB에 대한 write는 CLAUDE.md §0의 승인 규칙을 그대로 따릅니다 (read-only 검증만 자유).

**운영 DB identity** (2026-09-30 기준):

| role | 성격 | 사용처 |
|---|---|---|
| `o4o_api_v2` | **login / runtime identity** (비밀번호 = Secret Manager `o4o-db-password`) | `o4o-core-api` · migration Job `o4o-api-migrations` · 운영 DB read-only 조회 |
| `o4o_api` | **NOLOGIN owner role** — 운영 스키마 객체(테이블 · 시퀀스 · enum · 함수 등)의 소유자 | 직접 접속하지 않는다. `o4o_api_v2` 가 member 이며 role 설정(`SET role=o4o_api`)으로 세션이 이 role 권한으로 동작한다 |

`o4o_api` 로 직접 로그인하는 현행 스크립트 · Job 은 없다. 운영 스크립트는 로그인 identity 기본값을 두지 않고
`DB_USERNAME` 이 없으면 즉시 실패한다(`apps/api-server/src/scripts/require-db-username.mjs`). 운영 접속 시 `DB_USERNAME` 을 명시한다.
어떤 스크립트가 현행(ACTIVE · PAUSED)이고 어떤 것이 실행 금지 legacy 인지는
[O4O-API-SERVER-SCRIPTS-INVENTORY-V1](docs/baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md) 이 정본이다.

다른 인스턴스에 연결하려면 `start-cloud-sql-proxy.cmd`의
`INSTANCE_CONNECTION_NAME`을 수정합니다. 현재 이 프로젝트의 Cloud SQL 인스턴스는
`o4o-platform-db` 하나뿐입니다 (`neture-db` 는 2026-08-18 영구 삭제).

**운영 DB 마이그레이션은 `main` 배포 시 CI/CD에서 자동 실행**됩니다 (CLAUDE.md §0).
운영 DB 대상 수동 실행은 예외 상황에 한정합니다. 로컬 DB bootstrap 은 [§3-1](#3-1-공동개발-로컬환경--로컬-api--web-neture) 의 같은 명령으로 합니다.

```bash
pnpm --filter @o4o/api-server migration:run
```

프로덕션 DB에 대한 접근 정책·검증 채널은 [CLAUDE.md](CLAUDE.md) §0을 따릅니다.

---

## 5. 검증 명령

```bash
pnpm run type-check           # 전체 (api-server 포함)
pnpm run type-check:frontend  # api-server 제외
pnpm run lint
pnpm run lint:fix
pnpm test
pnpm run build
pnpm run verify               # 레지스트리 검증 (block / CPT)
```

커밋 전 최소 `type-check` + `lint`를 실행합니다.

### CI 게이트 현재 상태

`ci-pipeline.yml` 은 `main` push · PR 에서 실행되며, 아래는 **실패 시 CI 를 차단**합니다.
변경 범위에 따라 문서 전용 변경은 `docs-fast`, admin 전용 변경은 `admin-fast` 잡으로 대체됩니다(`scripts/ci/detect-affected.mjs`).

| 검사 | 비고 |
|---|---|
| `pnpm install --frozen-lockfile` + `build:packages` | lockfile drift = 실패 |
| `type-check:frontend` · `typecheck:app-store-packages` · api-server `type-check` | api-server 는 사전 빌드 후 실행 (아래 주의) |
| ESLint ratchet · 정적 guard | unsafe route · TypeORM entity registry · bootstrap/migration 계약 · `console.log`(`apps/**`) |
| Vitest | admin-dashboard · 공통 packages · 서비스별(web-neture · web-kpa-society · web-kpa-branch 등) — 각 `vitest.config.mjs` 를 루트에서 실행 |
| Jest | 일부 packages · api-server (3 shard, `@o4o/api-server^...` 사전 빌드) |
| 앱 빌드 | `admin-dashboard` 만. 서비스 web 앱(web-neture 등)의 빌드는 CI 가 아니라 배포 Docker 빌드에서 수행 |

web-neture 테스트를 로컬에서 돌리려면 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs` 를 실행합니다
(web-neture `package.json` 에는 test script 가 없습니다).

> **api-server type-check 주의.** api-server 는 `@o4o/security-core` 등 11개 패키지 타입을
> `dist/*.d.ts` 로 해석하는데, 이 패키지들은 `build:packages` 체인에 **없습니다**.
> CI 는 `pnpm --filter '@o4o/api-server^...' run build` 로 먼저 빌드합니다.
> 로컬은 이전 빌드의 `dist` 가 남아 있어 이 문제가 재현되지 않습니다 —
> **로컬 green ≠ CI green** 인 대표 사례이므로, clean 체크아웃에서 검증할 때는 위 사전 빌드를 먼저 실행하세요.

**lint 는 완전 blocking 이 아니라 회귀 차단(ratchet) 입니다.**
기존 오류 **46건**(warning 1,005건)이 baseline 으로 남아 있고,
`scripts/lint-ratchet.mjs` 가 `pnpm run lint` 와 동일한 설정·범위로 검사해
**오류 수가 46을 넘으면 실패**합니다. 즉 신규 lint 오류는 CI 를 막습니다.
숫자의 정본은 `scripts/lint-ratchet.mjs` 의 `ERROR_BASELINE` 이며, 이 문서는 그것을 인용합니다.

- baseline 은 **내리는 방향으로만** 갱신합니다(오류를 실제로 고친 뒤 숫자를 낮춤).
- 순증 차단이지 1:1 동일성 판정이 아닙니다(1건 고치고 1건 추가하면 통과).
- baseline 이 0 이 되면 스크립트를 제거하고 `pnpm run lint` 단독 실행으로 되돌립니다.

### Git 절차

**worktree · branch · main 통합 · 종료 정리는 [AGENTS.md §4-1](AGENTS.md#4-1-parallel-session--worktree-policy) 이 정본입니다** —
독립 작업은 전용 worktree + branch 에서 하고, `main` 반영은 PR merge 로만(기술 gate 충족 후 별도 승인 없이) 합니다. `main` 직접 작업 · direct push 는 쓰지 않습니다.
**stage · 커밋 · PC 이동 절차는
[docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) 가 정본입니다**(그 문서의 `main` 직접 작업 전제와 다르면 §4-1 우선) —
path-specific stage, 다른 세션 미커밋 변경 불가침,
PC 이동 체크리스트, `.husky/pre-commit` 의 lockfile 검증 계약이 모두 그 문서에 있습니다.

---

## 6. 문제 해결

### DB 연결 실패
1. `apps/api-server/.env`의 `DB_HOST` / `DB_PORT`가 의도한 대상인지 확인
   (로컬 `5432` / 프록시 `5442`)
2. 운영 DB를 쓴다면 Cloud SQL Auth Proxy가 실행 중인지 확인 (터미널 1)
3. `apps/api-server/.env`의 `DB_PASSWORD` 확인
4. `gcloud auth application-default login` 재실행 (프록시는 ADC 사용)
5. `gcloud sql instances describe o4o-platform-db`로 인스턴스 상태 확인
6. `gcloud services enable sqladmin.googleapis.com` (API 미활성 시)

### `NODE_ENV=... 에서 원격 DB host 로 직접 연결할 수 없습니다`

로컬/운영 분리 가드가 막은 것입니다. `DB_HOST`를 `127.0.0.1`로 바꾸고
운영 DB는 프록시(`5442`)를 경유하십시오. 의도적 예외는 `ALLOW_REMOTE_DB=true`.

### `Module not found` 빌드 에러
```bash
pnpm run build:packages
```

### 포트 충돌
```cmd
netstat -ano | findstr :5432    :: 로컬 PostgreSQL
netstat -ano | findstr :5442    :: Cloud SQL Auth Proxy
netstat -ano | findstr :5173
netstat -ano | findstr :3002    :: 로컬 API
netstat -ano | findstr :3000    :: web-neture (web-kpa-society 도 3000 — 동시에 하나만)
taskkill /PID <PID> /F
```
로컬 PostgreSQL이 `5432`를 점유하므로 프록시는 `5442`를 사용합니다.
프록시 포트를 바꾸려면 `start-cloud-sql-proxy.cmd`의 `LOCAL_PORT`와
`apps/api-server/.env`의 `DB_PORT`를 함께 변경합니다.

### 빌드 캐시 문제
```bash
pnpm run clean
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm run build:packages
```

### web-neture 설정 변경이 반영되지 않음
`services/web-*/vite.config.js` · `vite.config.d.ts` 가 로컬에 생겨 있으면(과거 `tsc` 산출물, git 미추적) Vite 가
`vite.config.ts` 대신 그 파일을 읽습니다. 두 파일을 지우면 정본인 `vite.config.ts` 가 적용됩니다.

### 메모리 부족
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Cloud SQL Auth Proxy 다운로드 실패
https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases 에서 **v2** Windows x64 바이너리를
직접 받아 `bin/cloud-sql-proxy-v2.exe`로 저장합니다. v1 바이너리는 실행 문법이 달라 사용하지 않습니다.

---

## 7. 프로덕션 참조 (읽기 전용)

| 서비스 | Cloud Run |
|---|---|
| API Server | `o4o-core-api` |
| Admin Dashboard | `o4o-admin-dashboard` |
| Neture / K-Cosmetics / KPA-Society | `*-web` |

- Cloud Run: https://console.cloud.google.com/run?project=netureyoutube
- Cloud SQL: https://console.cloud.google.com/sql?project=netureyoutube
- 프로덕션 환경변수는 GitHub Secrets에서 관리합니다.

---

## 8. 관련 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 개발 규칙 · 아키텍처 경계 · 운영 정책 (최상위) |
| [README.md](README.md) | 저장소 개요 |
| [docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) | **Git 병렬 작업·PC 이동 정본** (stage · pre-commit · 완료 조건) |
| [scripts/README.md](scripts/README.md) | 배포 인프라 · 스크립트 목록 |
| [docs/README.md](docs/README.md) | 문서 폴더 구조 |

---

*로컬 실행환경 단일 기준 문서. 실행환경 관련 안내는 이 문서에만 유지합니다.*
