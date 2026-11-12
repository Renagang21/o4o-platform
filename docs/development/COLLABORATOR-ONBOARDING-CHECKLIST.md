# 공동개발자 시작 체크리스트

> **상태**: ACTIVE · **작성일**: 2026-11-11
> **대상**: 새로 합류하는 원격 공동개발자(자기 PC · 자기 도구). 첫 적용 대상은 GitHub `Businnect` 계정이다.
> **근거**: WO-O4O-REMOTE-COLLABORATOR-ONBOARDING-V1 · [`IR-O4O-REMOTE-COLLABORATOR-READINESS-V1`](../investigations/IR-O4O-REMOTE-COLLABORATOR-READINESS-V1.md)
> 이 문서는 **순서와 확인 기준만** 둔다. 규칙 원문은 링크한 정본에 있다. 정본과 다르면 정본이 맞다.

각 단계의 「확인」을 통과하면 다음 단계로 간다. 막히면 그 단계 번호와 출력 마지막 몇 줄을 통합 담당에게 보낸다. 비밀번호 · 토큰은 보내지 않는다.

---

## 0. 먼저 읽기 (30분)

1. [`COLLABORATOR-START-HERE.md`](COLLABORATOR-START-HERE.md) — O4O 를 보는 관점, 저장소 읽는 법, 일반 개발과 Core 계약 변경의 구분(§5-1), Production 경계(§6)
2. [`AGENTS.md`](../../AGENTS.md) §4 「역할」 · §4-1(e) 「작업 세션」 — 개발자는 **commit · push · 인계 기록까지** 한다. PR 생성 · 병합 · 배포는 통합 담당이 한다
3. [`O4O-CORE-REGISTRY-V1`](../baseline/O4O-CORE-REGISTRY-V1.md) — 어느 경로가 Core(B 등급)인지

**확인:** 「내가 하지 않는 것」을 말할 수 있다. PR 생성 · merge · 배포 · 운영 DB 접속 · secret 요청 · `main` 직접 push 는 하지 않는다.

## 1. GitHub · Clone

```bash
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform
git config user.name "<GitHub 사용자 이름>"
git config user.email "<GitHub noreply 주소>"
```

- 저장소가 Private 으로 바뀐 뒤에는 본인 GitHub 계정으로 인증해야 clone · push 할 수 있다(HTTPS 는 GitHub CLI `gh auth login` 또는 Git Credential Manager).
- Public 저장소라 커밋에 남는 이메일은 noreply 주소를 쓴다.

**확인:** `git status` → `On branch main`, `git log -1` 이 보인다.

## 2. 개발 도구

| 도구 | 버전 | 확인 명령 |
|---|---|---|
| Node.js | 22.23.4 | `node --version` |
| pnpm | 10.25.0 | `pnpm --version` |
| Git | 최신 | `git --version` |
| PostgreSQL | 15 (로컬 API 를 띄울 때만) | `psql --version` |

- 기준값은 루트 `package.json` 의 `volta` 다. 상세는 [`SETUP.md` §1](../../SETUP.md#1-필수-도구)(Windows 기준 포함)을 본다.
- gcloud · Cloud SQL Proxy · 운영 계정은 **필요 없다**(운영자 전용).

## 3. 설치 · 공통 빌드

```bash
pnpm install --frozen-lockfile
pnpm run check:runtime
pnpm run build:packages
```

**확인:**
- 세 명령 모두 exit 0 이다.
- `git status --short` 에 `pnpm-lock.yaml` 변경이 없다. 변경이 있으면 커밋하지 말고 Node · pnpm 버전부터 확인한다.
- 참고 시간: `build:packages` 는 2026-11-11 클라우드 컨테이너에서 약 1분이 걸렸다.

## 4. 로컬 API (필요한 사람만)

[`SETUP.md` §3-1](../../SETUP.md#3-1-공동개발-로컬환경--로컬-api--web-neture) 순서를 따른다. 요약은 다음과 같다.

1. 로컬 PostgreSQL 에 빈 DB 와 owner 사용자를 만든다.
2. `apps/api-server/.env.example` 을 `.env` 로 복사한다. 그다음 DB 값과 임의 난수 `JWT_SECRET` · `JWT_REFRESH_SECRET` · `SESSION_SECRET` 을 채운다.
3. `cd apps/api-server` → `npx tsx --env-file=.env src/migrate.ts`
4. `pnpm run dev:api` → `curl http://localhost:3002/health`

**확인:**
- migration 출력 끝에 `POST_MIGRATION_SCHEMA_ASSERTION = PASS` 와 `Migration Job - SUCCESS` 가 나온다.
- `/health` 가 HTTP 200 과 `"status":"alive"` 를 돌려준다.
- `.env` 는 git 이 무시한다. `git check-ignore -v apps/api-server/.env` 로 확인한다.

**알아 둘 것:**
- 빈 로컬 DB 에는 계정이 없다. 로그인 화면의 「테스트 로그인」 Demo 버튼은 **운영 Demo 계정**이라 로컬에서는 동작하지 않는다. 로컬 이메일 가입도 막혀 있다(계정 센터 출처 제한 · 메일 인증).
- 그래서 지금 로컬에서 로그인이 필요한 화면은 [IR §5](../investigations/IR-O4O-REMOTE-COLLABORATOR-READINESS-V1.md#5-테스트-데이터--계정) 의 방법을 쓴다. 로그인 없이 검증할 수 있는 과제부터 시작한다.

## 5. 서비스 화면 (담당 서비스)

```bash
pnpm --filter @o4o/web-neture dev
```

- web-neture 는 `http://localhost:3000` 에서 열린다. 다른 서비스는 `pnpm --filter <패키지 이름> dev` 로 띄운다.
- 개발 서버는 `VITE_API_BASE_URL` 이 없어도 `http://localhost:3002` 를 쓴다. 운영 API 로 fallback 하지 않는다.

**확인:**
- 브라우저 개발자도구 Network 탭에서 API 요청이 `localhost:3002` 로 간다.
- 운영 주소(`*.neture.co.kr`)로 가는 API 요청이 없다.

## 6. 작업 branch

```bash
git fetch origin
git switch -c wo/<짧은-주제> origin/main
```

- 한 작업 = 한 branch 다. 여러 작업을 한 branch 에 섞지 않는다.
- 여러 작업을 동시에 하면 worktree 를 쓴다([`AGENTS.md` §4-1(a)](../../AGENTS.md#4-1-parallel-session--worktree-policy)).
- `main` 에는 push 할 수 없다(ruleset).

## 7. 개발 · 로컬 검증

바꾼 경로에 맞는 검사를 직접 실행한다. **branch 에 push 해도 CI 는 돌지 않는다.** CI 는 통합 담당이 PR 을 만들 때 돈다.

| 바꾼 곳 | 실행 |
|---|---|
| `services/web-*` | 해당 서비스 `type-check` · `build`. 테스트는 루트에서 `npx vitest run --config services/<서비스>/vitest.config.mjs` |
| `packages/*` | `pnpm --filter <패키지> run type-check` · `test` · `build` |
| `apps/api-server` | `pnpm --filter @o4o/api-server run type-check` · 관련 spec `cd apps/api-server && npx jest <경로>` |
| 문서 | `node scripts/check-doc-sensitive.mjs` |

- 명령 정본은 [`SETUP.md` §5](../../SETUP.md#5-검증-명령) 다. Claude Code 를 쓰면 `/verify` 가 같은 일을 한다.
- 화면 변경은 빌드 성공만으로 끝내지 않는다. PC · 모바일 폭에서 직접 확인한다([`AGENTS.md` §6](../../AGENTS.md#6-검증--완료-보고)).

## 8. commit · push · 인계 기록

```bash
git add -- <바꾼 파일...>
git commit -m "<무엇을 왜>" -- <바꾼 파일...>
git push -u origin wo/<짧은-주제>
```

- `git add .` · `git add -A` 는 쓰지 않는다. force push 는 하지 않는다([`AGENTS.md` §4-2](../../AGENTS.md#4-2-stage--commit--push)).
- push 할 때 그 branch 의 `HANDOFF.md` 에 다음을 적는다. 통합 담당이 이 기록으로 PR 을 만든다.
  - branch 이름
  - 한 일
  - PR 로 묶을 단위
  - 결정 사항
  - 검증 결과(실행한 명령과 결과)
  - 확인하지 못한 것
  - 겹칠 수 있는 열린 PR
- `HANDOFF.md` 는 branch 마다 따로 쓴다. 다른 사람의 기록을 지우지 않고, 이전 기록은 「이전 인계 전문: `git show <SHA>:HANDOFF.md`」 한 줄로 남긴다.
- **Core 경로(B)를 바꿨으면** 결정 사항에 「Core 계약 변경 — 영역 · 영향 서비스」를 적는다. 계약이 그대로인 수정이면 「Core 경로 수정 · 계약 변경 없음」이라고 적는다.
- 리뷰 · 통합 담당의 수정 요청은 **같은 branch** 에 commit · push 한다. PR 이 이미 병합 · 닫혔으면 최신 `origin/main` 에서 새 branch 를 만든다.

## 9. 하지 않는 것 (요약)

- PR 생성 · merge · 배포 workflow 실행
  - 배포 workflow 는 소유자만 열리도록 막혀 있다. 그래도 실행 버튼을 누르지 않는다.
- 운영 DB 접속 · 운영 secret · GCP 권한 요청
  - 필요해 보이면 통합 담당에게 이유를 적어 요청한다.
- `.github/workflows/` · 자체 실행기 · ruleset 변경
- 실제 이용자 정보 · 운영 데이터를 로컬이나 외부 도구로 복사하는 것
- 저장소에 비밀번호 · 토큰 · 실명 · 실제 이메일을 쓰는 것
  - 저장소는 Public 이고, Private 이 된 뒤에도 같은 규칙을 지킨다.

## 10. 첫 과제

Businnect 의 첫 과제는 **Neture 「카탈로그 일괄등록」 화면의 카드 2개 404 수정**으로 확정됐다(2026-11-11). 근거 · 바꿀 파일 · 성공 기준은 [IR §7](../investigations/IR-O4O-REMOTE-COLLABORATOR-READINESS-V1.md#7-첫-시험-과제) 에 있다. 이후 과제는 통합 담당이 지정한다.
