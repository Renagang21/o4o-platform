# O4O Platform — 로컬 실행환경 정본

> 이 문서는 **로컬 개발 실행환경의 단일 기준(SSOT)** 입니다.
> **최종 갱신**: 2026-10-14 — AI 공통 기반·운영 적용, API 의존성 빌드와 신규 개발자 착수 안내 정합
> 개발 규칙·아키텍처 경계·운영 정책은 사용하는 에이전트의 진입점([AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md))과 해당 정본을 따릅니다.

## 현재 AI 기반과 개발 착수 — 2026-10-14

기존 AI Core/업무 Extension·가격/quota·Work Agent·콘텐츠 편집기 정비는 main에 반영됐습니다.
승인된 `CreateAiUsageReservations1791870434349` 정상 up과 API·frontend 6개 verified 배포가 성공했으며 배포 후 읽기 전용 HTTP 16/16이 통과했습니다.
[신규 개발자 안내](docs/development/COLLABORATOR-START-HERE.md), [AI 구조의 현재 범위](docs/architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md),
[최종 통합·배포 CHECK](docs/checks/CHECK-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)를 함께 읽습니다.

새 clone/PC에서도 아래 설치→패키지 빌드→로컬 DB bootstrap→API/web 실행을 검증합니다.
앞 운영 성공은 새 PC 설치·로그인·실계정 AI 비용/한도 검증을 대신하지 않습니다. 화면/단위 테스트는 운영 key 없이 시작할 수 있으며 실제 외부 AI 호출에는 개발용 계정·key가 필요합니다.
기존 Core·정산·Task·저장 기반을 재사용하고 운영 DB나 운영 credential로 로컬 준비를 대신하지 않습니다.

---

## 테스트 계정 찾기 — 브라우저·운영 검증 전

실제 테스트 계정의 기준 파일은 **`docs/local/TEST-ACCOUNTS.local.md`** 하나입니다 (사용자 결정 2026-10-16).
리팩터링 이전 테스트 계정은 모두 폐기됐습니다. 운영자·관리자·회원 로그인 검증 전에 이 파일을 먼저 확인합니다.
서비스에서 같은 운영자 아이디를 사용하더라도 현재 서비스 역할·가입 상태는 로그인 후 별도로 확인합니다.
로그인·역할 확인 결과는 그 파일의 확인 상태·확인 기록 표에만 남깁니다.

이 파일은 `.gitignore`의 `docs/local/*.local.md` 규칙으로 제외되므로 **새 clone·worktree·Codex Cloud에 자동으로 들어오지 않습니다.**
현재 checkout에 없으면 같은 작업환경의 기준 checkout에 있는 동일 경로를 확인합니다. 거기에도 없으면 파일이 없다는 사실과
필요한 경로를 알리고, 사용자의 로컬 원본을 승인된 비공개 파일 전달 또는 환경 Secret 연결로 제공받습니다.
스크린샷에 경로가 보이는 것만으로 클라우드에서 파일 내용을 읽을 수 있는 것은 아닙니다.
파일로 연결한 경우 파일 존재와 `git check-ignore -v docs/local/TEST-ACCOUNTS.local.md`를 확인합니다.

계정·비밀번호를 공개 문서·커밋·로그에 복사하지 않습니다. 예전 seed 계정, 이전 계정 파일의 사본, 공개 Demo 계정으로 임의 대체하거나
비밀번호를 추측하지 않습니다. 상태 변경 검증은 테스트 대상과 원상 복구 방법을 확인한 뒤 수행합니다.

### 기준 파일 변경 (2026-10-16)

2026-10-11에 정한 `docs/local/TEST-ACCOUNT.txt`는 더 이상 기준 파일이 아니다. 사용자 지시로 기준을
`docs/local/TEST-ACCOUNTS.local.md`로 바꿨다. `TEST-ACCOUNT.txt`가 남아 있는 checkout에서는 그 파일을 계정 출처로 쓰지 않는다.
`.gitignore`의 `docs/local/TEST-ACCOUNT.txt` 행은 다른 PC에 남은 사본이 실수로 추적되지 않도록 유지한다.
CHECK·WO·IR·archive 등 과거 기록에 남은 `TEST-ACCOUNT.txt` 표기는 당시 기록이며 현재 기준을 뜻하지 않는다.

환경에 계정 변수/Secret 연결이 등록되거나 이름이 주입돼 있어도 실제 로그인·역할 검증 완료로 간주하지 않습니다.
파일/연결의 출처와 사용 가능 상태를 확인하고 값 출력 없이 검증합니다. 현재 checkout의 계정 누락을 과거 파일 제공 이력으로 해소했다고 보고하지 않습니다.

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
pnpm run dev:admin                     # Admin Dashboard  → http://localhost:3001
pnpm run dev:api                       # API 서버         → http://localhost:3002 (.env PORT)
pnpm --filter @o4o/web-neture dev      # web-neture       → http://localhost:3000
pnpm run dev                           # Admin Dashboard (= dev:admin)
```

API 상태 확인: `curl http://localhost:3002/health`

Admin 개발 서버의 기준 포트는 **3001**입니다. `apps/admin-dashboard/package.json`의 `dev` 명령이 `vite --port 3001`을 실행하므로 `vite.config.ts`의 기본 포트(5173)보다 우선합니다.

로컬 API 포트 **3002** 가 기준입니다(`apps/api-server/.env.example` `PORT` · web-neture dev 기본값 · `@o4o/auth-client` localhost 기본값).
소스의 `PORT || 8080` 은 Cloud Run runtime 기본값이며 로컬 기준이 아닙니다.

### 3-1. 공동개발 로컬환경 — 로컬 API + web-neture

첫 공동개발 대상(neture.co.kr Main · O4O Agent) 기준 절차입니다. **운영 credential 은 필요 없습니다.**

1. **설치** — §1 도구(Node 22.18.0 · pnpm 10.25.0 · PostgreSQL 15) 준비 후 `pnpm install --frozen-lockfile` (§2-1).
2. **공통 패키지 빌드** — `pnpm run build:packages`.
   web-neture 가 쓰는 `@o4o/*` 일부(types · auth-client · ui · content-editor · forum-core 등)는 소스가 아니라 `dist` 를 import 하므로, 이 빌드 없이는 dev server 가 뜨지 않습니다.
   현재 이 명령에는 `build:api-deps`도 포함됩니다. API workspace 의존성을 pnpm의 의존 순서로 빌드하므로 이전 checkout의 `dist`에 의존하지 않습니다. API 의존성만 변경했으면 `pnpm run build:api-deps`로 다시 빌드합니다.
3. **로컬 DB** — PostgreSQL 15 에 빈 DB(예: `o4o_platform`)와 그 DB 의 owner 사용자를 만듭니다.
   필요한 extension(`uuid-ossp`)은 아래 bootstrap 이 생성합니다.
4. **API env** — §2-4 대로 `apps/api-server/.env` 작성 (`PORT=3002`, 로컬 DB 값, 임의 JWT/SESSION secret).
5. **스키마 bootstrap** — `pnpm --filter @o4o/api-server migration:run`.
   빈 DB 면 canonical schema baseline 을 적용한 뒤 incremental migration 을 적용합니다(`apps/api-server/src/migrate.ts`).
   반드시 **로컬 DB** 를 가리키는 `.env` 로 실행합니다. seed · 테스트 계정은 없습니다.
   현재 등록 manifest에는 AI quota 예약/정산 테이블과 비용 정밀도 migration도 포함됩니다. 운영에는 적용된 변경이지만 새 로컬 DB에는 정상 bootstrap/incremental 절차가 필요합니다. 운영 DB에서 같은 작업을 임의 재실행하지 않습니다.
6. **API 기동** — `pnpm run dev:api` → `curl http://localhost:3002/health`.
7. **web-neture 기동** — `pnpm --filter @o4o/web-neture dev` → http://localhost:3000 . `/` 에 `O4OHomePage`(메인 화면)가 보이면 정상입니다.
   - API 대상은 `VITE_API_BASE_URL` 입니다. 다른 로컬 주소를 쓰려면 `services/web-neture/.env.example` 을 `.env.local` 로 복사해 수정합니다.
   - **dev server 는 이 값이 없어도 `http://localhost:3002` 를 씁니다. 운영 API 로 fallback 하지 않습니다**
     (`vite.config.ts` · `src/lib/apiBaseUrl.ts`). 운영 API 주소를 직접 적어 넣지 않습니다.
   - 브라우저 개발자도구 Network 탭에서 요청이 `localhost:3002` 로 가는지 한 번 확인합니다.

**로그인 · AI 호출 (실제 기능 smoke 에만 필요)**

- 화면 기동 자체에는 Google OAuth 도 AI key 도 필요 없습니다.
- 현행 로그인은 이메일·비밀번호, Google, 카카오를 지원합니다. 일반 계정 검증에는 위의 로컬 전용 `TEST-ACCOUNTS.local.md`를 사용하며, 아래는 Google 개발용 설정 예시입니다.
- Google 로그인 smoke는 GIS popup → ID token → API의 `aud` 검증 흐름을 확인합니다. 로컬 Google 로그인 smoke에는
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

### 3-2. AI 개발의 준비 완료 확인

- `pnpm run build:packages` 후 로컬 API `/health`와 web-neture 메인 화면을 확인합니다. 브라우저 요청이 로컬 API로 향하는지도 확인합니다.
- 실제 로그인은 승인된 개발용 계정으로 별도 확인합니다. 빈 DB bootstrap은 계정/업무 데이터 seed를 만들지 않으며 공개 Demo·과거 seed를 임의 대체하지 않습니다.
- 업무 Extension/Core/가격·quota 테스트는 기존 mock·격리 fixture를 사용합니다. 실계정/유료 호출 smoke는 계정·개발용 key·허용 업무 범위를 준비한 뒤 수행하며 로컬 정적 검사와 구분합니다.
- 호출 전 예약/admission에서 quota 원장 미준비·DB 장애가 발생하면 `AI_QUOTA_UNAVAILABLE`로 provider 호출을 거부합니다. 공통 질의의 한도 초과 429·이 단계의 DB 장애 503을 검사에서 우회하지 않습니다.
- provider 호출 성공 후 정산/receipt 저장이 실패하면 생성 결과를 반환하고 reconciliation 경고와 미해결 예약을 남깁니다. 이를 호출 전 거부와 같은 503으로 기대하거나 성공한 유료 호출을 자동 재전송하지 않습니다. 남은 사용량은 확인된 증거로 정산하며 TTL만으로 해제하지 않습니다.
- 비용은 가격 version/model에 따른 추정치입니다. 기존 Gemini/OpenAI/Claude 텍스트는 `AI_PRICING_CATALOG` 미설정 시 종전 provider 추정 단가를 사용하며 실제 invoice나 사용자 청구 금액이 아닙니다. 새 모델별 요금 설정·운영 billing 정책 변경은 별도 작업입니다.
- **전문 AI 개발 branch(2026-10-25):** `wo/ai-specialized-runtime-accounting`의 이미지/PDF·화면·검색·OCR·음성에는 기존 가격 catalog의 명시 모델별 native profile/예산이 필요합니다. Qwen 텍스트도 명시 모델 token 요율이 필요합니다. 미준비 시 `AI_PRICING_NOT_CONFIGURED` → 503으로 provider 이전에 차단합니다. 입력/출력/검색·이미지/문자 단위·사용량 보류 규칙은 [전문 실행 TODO §4](docs/work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md#4-구현-계약과-운영-준비-항목)를 따릅니다. 테스트 synthetic 요율을 운영에 복사하거나 quota 검사를 우회하지 않습니다. 이 branch의 local 검증/push와 main·운영 적용을 구분합니다.
- **가격/예산 점검 후속 개발:** `wo/ai-pricing-readiness`에서는 `node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --help`로 파일 기반 사전 점검을 실행할 수 있습니다. [운영 준비 guide](docs/guides/O4O-AI-PRICING-READINESS-RUNBOOK-V1.md)의 null 예제는 실제 선택 모델/bytes를 채우기 전에는 거부합니다. CLI는 DB/provider·credential·배포에 연결하지 않으며 운영 단가/설정 활성화를 대신하지 않습니다. 직접 Node entry의 종료 코드 0/1/2를 사용하고 pnpm filter exec의 래퍼 종료 코드와 혼동하지 않습니다.

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

**운영 DB migration은 승인된 표준 API 배포의 migration job이 실행합니다.** migration 포함 변경은 LEVEL 3으로 자동 rollout되지 않으며,
현재 CI/freeze/ref/계정 gate와 명시적인 운영 DB 실행 승인 범위를 확인한 뒤 정상 Promote를 사용합니다([README — 배포](README.md#배포), [운영 migration 정본](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)).
2026-10-14의 AI quota 정상 up은 실행 완료됐고 rollback/archive repair는 실행하지 않았습니다. 이 승인을 신규 migration·DB write로 확대하지 않습니다.
로컬 DB bootstrap은 [§3-1](#3-1-공동개발-로컬환경--로컬-api--web-neture)의 같은 명령으로 합니다.

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
| Vitest | admin-dashboard · 공통 packages · 서비스별(web-neture · web-pharmacy-business · web-kpa-branch 등) — 각 `vitest.config.mjs` 를 루트에서 실행 |
| Jest | 일부 packages · api-server (3 shard, `@o4o/api-server^...` 사전 빌드) |
| 앱 빌드 | 변경 범위에 따른 admin/영향 있는 web production build. 실제 실행·생략 범위는 CI affected 판정에 따르며 배포 Docker 빌드는 별도 |

web-neture 테스트를 로컬에서 돌리려면 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs` 를 실행합니다
(web-neture `package.json` 에는 test script 가 없습니다).

> **api-server type-check 사전 빌드.** API는 workspace package의 `dist/*.d.ts`를 읽습니다.
> 현재 `build:packages`는 `build:api-deps`를 포함하며, 같은 의존 순서의 명령은 `pnpm --fail-if-no-match --filter '@o4o/api-server^...' run build`입니다.
> 공통 패키지를 빌드한 뒤 `pnpm --filter @o4o/api-server run type-check`로 API 타입을 검사합니다. API 의존성만 갱신할 때는 `pnpm run build:api-deps`를 사용할 수 있으며, 전체 패키지 빌드 뒤 같은 의존성을 중복 빌드할 필요는 없습니다.
> clean checkout에서 검증하기 전 이 사전 빌드를 실행합니다. 명령·목록의 기준은 현재 root package scripts/CI이며 고정 패키지 개수로 관리하지 않습니다.

### API bundle·AI 회귀 검증

`pnpm --filter @o4o/api-server run type-check`와 `run build`는 TypeScript 검증/컴파일입니다.
API의 `build:api`는 tsup bundle 명령이며 root의 같은 이름은 TypeScript build를 호출하므로 실행 위치를 구분합니다.
AI runtime/type export를 변경하면 TypeScript 검사뿐 아니라 [deploy-api의 실제 빌드 순서](.github/workflows/deploy-api.yml)(tsc→database backup→tsup main/migrate→database restore)를 검증합니다.
tsup만 실행하면 compiled migration 산출물이 제거될 수 있으므로 이를 배포 산출물로 사용하지 않습니다. PR #557에서 type reexport의 실제 bundle 오류를 수정했습니다.

대표 회귀는 `apps/api-server/src/__tests__/`의 업무 Extension·URL 수집·Work runtime·quota spec과 공통 콘텐츠 편집기 테스트입니다.
실제 경로는 현재 소스/테스트 설정에서 선택하고, 변경 소비처에 맞게 실행합니다. quota DB 테스트는 세션 전용 PostgreSQL fixture만 사용합니다.
전체 테스트를 중복 합산하거나 실행하지 않은 실계정/Windows/유료 호출을 PASS로 보고하지 않습니다.

### 매장 주문·배송 조회 PostgreSQL 검증

`pharmacy-order-read.integration.spec.ts`는 실제 SQL로 구매자·선택 매장·서비스·공급자 격리와
배송·송장 연결, 주문 중복 방지, 최근 200건 제한을 확인합니다.
별도 로컬 PostgreSQL에 빈 전용 DB `o4o_store_order_read_fixture`를 준비하고,
그 포트를 `O4O_STORE_ORDER_READ_TEST_PORT`로 설정합니다(1024 초과, 5432·5442 제외).
host는 loopback으로 고정되며 비밀번호는 로컬 비공개 `PGPASSWORD` 설정을 사용합니다.

```text
pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/modules/neture-pharmacy/__tests__/pharmacy-order-read.integration.spec.ts
```

운영 또는 기존 개발 DB를 fixture로 사용하지 않습니다. 이 검증은 connection-local TEMP 테이블을
만들고 종료 시 rollback하므로 baseline migration이 필요하지 않습니다. 포트 변수가 없으면 7건은 skip입니다.
검증 종료 후 자신이 준비한 전용 DB를 정리하며 다른 DB나 컨테이너를 삭제하지 않습니다.

### 공급자→매장 PostgreSQL 통합 검증

`supplier-store-round-trip.integration.spec.ts`는 실제 repository·transaction과 상품 연결·수정·승인,
매장 장바구니·checkout·테스트 결제·fulfillment bridge·배송·재고·정산 서비스를 함께 실행합니다.
외부 알림 전달은 대체하며 실제 PG 결제나 운영 계정의 HTTP round-trip을 실행하지 않습니다.

- PostgreSQL 15 서버만 `127.0.0.1:55432`에 준비하고 `o4o_supplier_store_integration` DB는 **없는 상태**로 둡니다.
  wrapper가 DB를 생성·삭제하므로 로컬 전용 role에 `CREATEDB`와 관리 DB `postgres` 접속 권한이 필요합니다.
- 그 DB의 로컬 전용 접속값으로 `NETURE_SUPPLIER_STORE_IT_DATABASE_URL`을 설정합니다.
  프로토콜은 `postgresql:`이며, query/hash 없이 위 host·port·DB명과 정확히 일치해야 합니다.
  접속값은 로컬 비공개 환경에만 보관하고 로그·문서·Git에 기록하지 않습니다.
- `NETURE_SUPPLIER_STORE_IT_DATABASE_URL`만 설정해도 `migration:run`의 대상은 바뀌지 않습니다.
  migration runner는 `DB_*`를 읽으므로, 저장소 루트에서 아래 대상 검증·명시적 환경 전달로만
  전용 fixture의 baseline과 incremental schema를 적용합니다. 기존 개발·운영 DB를 사용하지 않습니다.

공통 패키지를 먼저 빌드한 뒤, **DB 생성·bootstrap·테스트·정리를 하나의 프로세스**로 실행합니다.
같은 이름의 DB가 이미 있으면 재사용·삭제하지 않고 거절합니다. wrapper가 생성한 DB에만
무작위 소유권 marker를 남기고, 성공·실패 모두 `finally`에서 marker 확인 후 제거합니다.

```bash
pnpm run build:packages
pnpm exec tsx scripts/dev/run-supplier-store-fixture.ts
```

wrapper는 canonical baseline과 전체 incremental manifest의 매 prefix fingerprint를 확인합니다.
전용 URL 변수가 없으면 wrapper는 실패하며, Jest를 직접 실행해 skip된 결과는 통합 PASS가 아닙니다.
`Fixture tests PASS`와 `Fixture cleanup PASS: database count 0`을 각각 확인합니다.
소유권이 바뀌었거나 다른 연결 때문에 DROP이 실패하면 미정리 상태로 보고합니다. 다른 세션의
연결을 강제로 끊거나 다른 DB·컨테이너·운영 기록을 지우지 않습니다. SIGKILL·호스트 종료는
finally 실행을 보장할 수 없으므로 중단 시 소유권과 잔여 DB를 별도로 확인합니다.

약국 매장(`neture-pharmacy`) 주문의 Neture 정산 제외 정책은 유지합니다. 약국 구매·배송과
기존 Neture 정산 대상 주문의 계산·승인·지급을 구분해 검증하며, 정산 범위를 임의 확대하지 않습니다.

**lint 는 완전 blocking 이 아니라 회귀 차단(ratchet) 입니다.**
기존 오류 **46건**(warning 1,005건)이 baseline 으로 남아 있고,
`scripts/lint-ratchet.mjs` 가 `pnpm run lint` 와 동일한 설정·범위로 검사해
**오류 수가 46을 넘으면 실패**합니다. 즉 신규 lint 오류는 CI 를 막습니다.
숫자의 정본은 `scripts/lint-ratchet.mjs` 의 `ERROR_BASELINE` 이며, 이 문서는 그것을 인용합니다.

- baseline 은 **내리는 방향으로만** 갱신합니다(오류를 실제로 고친 뒤 숫자를 낮춤).
- 순증 차단이지 1:1 동일성 판정이 아닙니다(1건 고치고 1건 추가하면 통과).
- baseline 이 0 이 되면 스크립트를 제거하고 `pnpm run lint` 단독 실행으로 되돌립니다.

### Main 자동화의 격리 검증

`MAIN_AUTOMATION_IT_DATABASE_URL`은 `127.0.0.1:55439/o4o_main_automation_integration` 전용 PostgreSQL 15 URL로 비공개 환경에서만 설정합니다. 해당 DB는 없는 상태여야 하며 로컬 전용 role에 생성/삭제 권한이 필요합니다. 기존 개발·운영 DB URL을 사용하지 않습니다. 값은 문서·로그에 출력하지 않습니다.

```bash
pnpm run build:api-deps
pnpm exec tsx scripts/dev/run-main-automation-fixture.ts
node --test tools/o4o-local-agent/test/*.test.mjs
pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/components/home/__tests__/PharmacyOrderPanel.test.tsx
node scripts/checks/main-automation.browser.mjs
```

fixture는 자체 생성 DB의 소유권 marker를 확인하고 baseline·전체 incremental prefix·새 migration의 empty down/up·업무 자료/허가/기기 재개 HTTP 계약을 검증한 뒤 DB를 삭제합니다. `Fixture tests PASS`와 `Fixture cleanup PASS: database count 0`을 모두 확인합니다. browser script는 실제 Chromium(기본 `/usr/bin/chromium`, 다른 경로는 `O4O_BROWSER_EXECUTABLE`)에서 Main의 PC·모바일 화면을 합성 API로 검증하며 외부 계정·주문 사이트·실제 PC를 사용하지 않습니다. 이 결과는 실계정·실제 모델/Windows 사용자 PC 검증을 대체하지 않습니다.

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
netstat -ano | findstr :3000    :: web-neture (web-pharmacy-business 도 3000 — 동시에 하나만)
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


### 서비스 문의·운영 업무함 PostgreSQL 검증

문의 범위·역할·동시 수정·알림 실패·업무 SQL 검증은 기존 개발 DB와 분리한다.
PostgreSQL 15를 loopback `127.0.0.1:55439`에 준비하고 로컬 전용 role `operator_inbox_fixture`에
`CREATEDB` 및 관리 DB `postgres` 접속 권한을 부여한다. 같은 이름의 운영 계정이나 운영 접속값을 사용하지 않는다.
전용 DB `o4o_operator_inbox_fixture`는 **없는 상태**여야 하며 wrapper가 생성·삭제한다.
런타임 `DB_*` 설정은 사용하지 않는다. 인증은 준비한 전용 로컬 서버 설정을 따른다.

```text
pnpm run build:packages
pnpm exec tsx scripts/dev/run-operator-inbox-fixture.ts
```

wrapper는 baseline·모든 incremental fingerprint, 신규 migration empty down/up을 검사하고 실제 HTTP/권한 테스트를 실행한다.
기존 DB면 재사용/삭제를 거부하고 생성한 DB의 무작위 소유권 marker가 일치할 때만 제거한다.
`Fixture cleanup PASS: database count 0`까지 확인한다. 직접 Jest를 실행해 PG 테스트가 skip된 결과는 통합 PASS가 아니다.
테스트용 서버는 실행 담당이 종료하며 다른 DB·세션의 서버나 연결을 강제로 정리하지 않는다.
