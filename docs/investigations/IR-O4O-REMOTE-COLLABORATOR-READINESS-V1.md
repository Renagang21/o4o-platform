# IR-O4O-REMOTE-COLLABORATOR-READINESS-V1 — 원격 공동개발자(Businnect) 합류 준비도

> **상태**: DRAFT (조사 · 문서 보완. 저장소 설정 · 권한 · CI · Runner · secret · 배포 변경 없음)
> **작성일**: 2026-11-11
> **기준 코드**: `origin/main` `c5da5631` + 작업 branch `claude/clever-bohr-g532hw`(Core registry 미병합분 포함)
> **실행 위치**: CLOUD
> - GitHub 설정은 저장소 범위 API 로 읽기만 했다(일부 경로는 이 세션 proxy 가 막아 미확인으로 표시).
> - 로컬 개발환경은 이 클라우드 컨테이너(새 clone 과 같은 상태)에서 직접 실행해 확인했다.
> - 신규 개발자 PC 에서는 실행하지 않았다.
> **근거 WO**: WO-O4O-REMOTE-COLLABORATOR-ONBOARDING-V1
> **결정 반영**: 2026-11-11 사용자가 결과를 수용하고 §6-2 ①(초기 자체 실행기 미사용) · §7-2 후보 1(첫 과제) · §5-3(별도 WO) · §1-1 classify(별도 CI 보완)를 확정했다. Private 전환 · 실행기 활성화 · 권한 변경 · 배포는 별도 지시 전까지 실행하지 않는다.
> **산출물**: 이 보고서, [`COLLABORATOR-ONBOARDING-CHECKLIST.md`](../development/COLLABORATOR-ONBOARDING-CHECKLIST.md)(시작 체크리스트), `SETUP.md` §3-1 · §4 migration 명령 정정

판정 어휘: **READY**(지금 사용 가능) · **NEEDS_PREPARATION**(합류 전 보완 필요) · **VERIFY_WITH_BUSINNECT**(신규 개발자 PC · 계정에서 직접 확인)

---

## 0. 요약

1. **코드 개발 자체는 지금 운영 정보 없이 가능하다.** 이 세션에서 새 clone 상태로 직접 실행해 확인했다.
   - `pnpm install --frozen-lockfile` · `build:packages`(약 1분) → 통과
   - 빈 로컬 PostgreSQL 에 스키마 bootstrap(baseline + incremental 60개 · fingerprint PASS) → 통과
   - 로컬 API 기동 · `/health` 200 → 통과
   - 운영 secret · GCP · 운영 DB 는 하나도 쓰지 않았다.
2. **로컬에서 로그인한 화면을 볼 방법이 없다** — 가장 큰 준비 공백이다.
   - Demo 「테스트 로그인」 계정은 운영 DB 에만 있다.
   - 로컬 이메일 가입은 계정 센터 출처 제한(`SIGNUP_ORIGIN_NOT_ALLOWED`)과 메일 인증에 막힌다.
   - 저장소에는 합성 계정 1개(매장 경영자)를 만드는 격리 심사 환경만 있다.
   - 첫 과제는 로그인 없이 검증할 수 있는 것으로 고르고, 합성 로컬 계정 fixture 를 별도 WO 로 제안한다(§5-3).
3. **GitHub 경계는 대체로 준비돼 있다.**
   - `main` 은 PR + `CI Gate` 필수이고, 우회 허용 목록이 비어 있다.
   - `deploy/*` 태그는 소유자만 만든다.
   - 배포 job 은 `triggering_actor == repository_owner` 일 때만 열린다.
   - production secret 은 `production` Environment 에만 있다.
   - 따라서 Write 권한의 공동개발자가 배포 · secret 에 닿는 경로는 코드상 막혀 있다.
4. **Private 전환 + 자체 실행기(집 PC)를 켜는 순간 새 위험이 생긴다 — 사용자 결정이 필요하다.**
   - 자체 실행기 선택식은 「private 이고 fork 가 아니면」 집 PC 로 보낸다.
   - Write 협업자의 같은 저장소 branch 와 PR 은 fork 가 아니다.
   - Write 권한이면 자기 branch 에 workflow 파일을 넣어 push 만으로도 집 PC 에서 코드를 실행할 수 있다.
   - 기존 실행기 문서(`O4O-SELF-HOSTED-CI-RUNNER-V1`)는 fork PR 만 다루고 이 경우를 다루지 않는다(§6).
5. **CI 는 branch push 로는 돌지 않는다.** CI 는 PR(통합 세션이 생성) · `main` push 때 돈다. 그래서 개발자는 push 전에 로컬 검증을 직접 한다(체크리스트 §7).
6. 첫 시험 과제는 §7 에 후보와 추천을 둔다.

---

## 1. GitHub 접근 (2026-11-11 read-only 조회)

| 항목 | 확인 결과 | 판정 |
|---|---|---|
| 저장소 공개 상태 | `public` · forks 0 · wiki 켜짐 · Pages 없음 | 사실 확인 |
| 협업자 | `Renagang21`(admin) · `Businnect`(**write**) | READY |
| `main` ruleset `main-collaborator-pr-required` | active · `~DEFAULT_BRANCH` · 삭제 · non-fast-forward 금지 · PR 필수(필수 승인 0 · `require_code_owner_review=false` · `dismiss_stale_reviews_on_push=true` · `require_extra_approval_for_unattributed_changes=true`) · required check `CI Gate` · **bypass_actors 없음** | READY. 아래 주 참고 |
| 배포 태그 ruleset `deploy-tags-owner-only` | active · `refs/tags/deploy/*` 생성 · 수정 · 삭제 금지, 우회는 저장소 admin 역할만 | READY |
| CODEOWNERS | main: 존재하지 않는 조직 팀 15건(`Unknown owner`). 작업 branch: 0건(`@Renagang21` 만 · Core 경로 · workflows). **미병합** | NEEDS_PREPARATION — 이 branch 병합 |
| `core-change` 라벨 | 작업 branch 에 구현(`pr-overlap` 자동화). **미병합**, 라벨 미생성 | NEEDS_PREPARATION — 병합 후 첫 Core PR 에서 확인 |
| 병합 방식 | merge · squash · rebase 모두 허용 · 병합 후 head branch 자동 삭제 | READY |
| 보안 기능 | secret scanning · push protection **켜짐**, Dependabot security updates 꺼짐 | Private 전환 시 영향(§2) |
| `production` Environment 의 배포 ref 제한 · reviewer | 이 세션 proxy 가 Environments API 를 막아 **미확인**. 문서 기록: `main` · `deploy/*` 만 · reviewer 없음(`.github/workflows/README.md`) | VERIFY(통합 담당 · 설정 화면) |
| Actions `GITHUB_TOKEN` 기본 권한 | 이 세션 proxy 가 막아 **미확인** | VERIFY(통합 담당) |

- `AGENTS.md` §4-1(e) 의 「2026-10-04 확인값: … admin bypass 가능」과 현재 값(bypass_actors 없음)이 다르다. 현재 쪽이 더 엄격하다. 기준 문서는 고치지 않았다(문서 정합 보고).
- `require_extra_approval_for_unattributed_changes=true` 의 정확한 동작은 GitHub 문서로 확인하지 못했다. 필수 승인 수가 0 이므로 지금 병합 흐름에 영향이 있었는지는 통합 담당 경험으로 확인한다.

### 1-1. Write 협업자가 할 수 있는 것 · 막힌 것 (코드 근거)

| 행동 | 결과 | 근거 |
|---|---|---|
| 새 branch push | 가능. CI 는 돌지 않는다 | `ci-pipeline.yml` `on.push.branches: [main, develop]` · `pull_request: [main]` |
| `main` 직접 push · 삭제 · force push | 막힘 | `main` ruleset |
| `deploy/*` 태그 생성 | 막힘 | 태그 ruleset |
| 배포 workflow 수동 실행(`deploy-*` · `promote` · `delivery`) | 실행은 시작되지만 배포 job 은 열리지 않는다 | `deploy-api.yml:204` · `deploy-web-services.yml:219,955` · `deploy-admin.yml:135` · `deploy-cooperative.yml:38` · `account-erasure-activation.yml:22` 의 `triggering_actor == repository_owner` 조건 |
| `promote`/`delivery` 의 `classify` job | 소유자 조건 없이 `environment: production` 과 GCP WIF 인증 단계까지 실행된다. 실행 코드는 `main` 의 것이고(Environment ref 제한), 배포는 하지 않는다 | `delivery.yml` classify(`google-github-actions/auth`) |
| production secret 읽기 | 일반 CI job 은 `GITHUB_TOKEN` 외 secret 을 쓰지 않는다. production secret 은 `environment: production` job 에만 있다 | workflow 전수(아래) |
| 자기 branch 에 새 workflow 를 넣어 push | **실행된다**(push 이벤트는 그 커밋의 workflow 파일을 쓴다). 지금은 GitHub 호스팅에서만 돈다 | GitHub Actions 동작. §6 위험의 출발점 |

`secrets.*` 를 쓰는 job 은 모두 `environment: production` 이다. 예외 하나는 `production-secret-resolution-check.yml` 의 `repository-scope` job 인데, 저장소 범위에 사본이 **없음**을 확인하는 소유자 전용 job 이다.

**후속 검토 항목(이번에 변경하지 않음):** `delivery.yml` `classify` 에도 `triggering_actor == repository_owner` 조건을 둘지 정한다. 위험은 낮지만(main 코드 · 읽기 · 배포 없음), 비소유자 수동 실행이 GCP 인증까지 가는 것을 없앨 수 있다. CI · workflow 변경이므로 기존 CI 정비 트랙에서 결정한다.

## 2. Private 전환 전후 확인 사항

전환 실행은 소유자 결정이다. 이번 작업에서는 바꾸지 않았다.

| 항목 | 예상 영향 | 확인 방법 · 판정 |
|---|---|---|
| 기존 협업자 접근 | 협업자 권한은 유지되는 것이 GitHub 동작이다. Businnect 는 계속 write 이고, clone · push 에 인증이 필요해진다 | 전환 직후 Businnect 가 `git fetch` · branch push 로 확인 — VERIFY_WITH_BUSINNECT |
| ruleset · Environment 보호 | 개인 계정 Free 플랜의 private 저장소에서는 ruleset · branch protection · Environment 배포 ref 제한이 적용되지 않을 수 있다. 기존 문서는 GitHub Pro 필요로 기록했다(`O4O-SELF-HOSTED-CI-RUNNER-V1` §6). **Write 협업자가 있는 상태에서 이 보호가 꺼지면 `main` 직접 push 가 가능해진다** | 전환 전에 플랜 확인 → 전환 직후 ruleset · Environment 를 read-only 재조회 — NEEDS_PREPARATION(소유자) |
| secret scanning · push protection | public 에서는 무료로 켜져 있다. 개인 private 저장소에서는 유료(GitHub Secret Protection) 조건이 붙는다 → 꺼질 수 있다. 협업자 합류와 맞물려 커밋된 비밀값을 막는 장치가 사라질 수 있다 | 전환 후 설정 화면 확인. 꺼지면 보완책(로컬 pre-commit 검사 등)을 별도 결정 — NEEDS_PREPARATION |
| CodeQL · Sonar | private 에서 자동 생략 · skip 하는 코드가 이미 있다 | READY(기존 IR) |
| Actions 사용량 | private 은 호스팅 실행 분이 과금 · 포함량 대상이다. 협업자 합류로 PR 수가 늘면 비례해 증가한다 | `IR-O4O-PRIVATE-CI-BUDGET-V1` 예산 · 차단 결정과 함께 본다 |
| forks | 현재 0 | 영향 없음 |
| 기존 PR | 열린 PR 은 그대로 유지된다 | 영향 없음 |
| 공개 문서 · 링크 | 외부에서 저장소 링크를 열 수 없게 된다(공개 데모 · 심사 문서가 저장소 링크를 쓰는지 확인 필요) | 미확인 |

## 3. 신규 개발자에게 줄 권한 · 주지 않는 것

| 준다 | 주지 않는다 |
|---|---|
| GitHub write(현재 그대로) · 저장소 전체 읽기 | 운영 DB 접속(`o4o_readonly` 포함) · Cloud SQL Proxy |
| 자기 PC 로컬 DB · 로컬 `.env`(자기 난수 secret) | 운영 secret · GCP 계정 · IAM · WIF |
| branch push · 인계 기록 작성 | PR 생성 · merge · 배포 dispatch(규칙상) · `deploy/*` 태그(ruleset) |
| 개발용 OAuth Client ID · AI key — 실제 로그인 · AI 호출 smoke 가 필요해질 때 통합 담당이 별도로 판단(SETUP §3-1) | 운영 OAuth Client · 운영 AI key |
| — | CODEOWNERS 소유자 지정 · Core 필수 리뷰 강제(이번 결정: 하지 않음) |

## 4. 개발환경 준비 상태 (이 세션 실측)

| 확인 항목 | 결과 | 판정 |
|---|---|---|
| 새 clone 에서 `pnpm install --frozen-lockfile` | 통과(클라우드 세션 시작 훅, lockfile 변경 없음) | READY |
| `pnpm run build:packages` | 통과 · 1분 1초 · 운영 secret 0 | READY |
| 빈 로컬 PostgreSQL bootstrap | `npx tsx --env-file=.env src/migrate.ts` → baseline + incremental 60개 · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · `Migration Job - SUCCESS` | READY(명령 정정 후) |
| SETUP 의 기존 안내 `pnpm --filter @o4o/api-server migration:run` | **실패** — `DB_HOST: MISSING`. `migrate.ts` 가 `.env` 를 읽지 않는다 | **이번에 SETUP §3-1 · §4 명령 정정** |
| API 빌드 · 기동 | `pnpm run build`(tsc) 29초 → `node dist/main.js` → `GET /health` 200 `{"status":"alive","environment":"development"}` | READY |
| 운영 GCP · 운영 DB 없이 개발 | 위 전 과정에서 사용 0 | READY |
| PostgreSQL 버전 | 이 세션은 16.15 로 실행했다. 기준은 15 이고 운영과 같은 major 다 | VERIFY_WITH_BUSINNECT(15 로 재현) |
| web-neture 등 서비스 dev server | 이 세션에서는 기동하지 않았다 | VERIFY_WITH_BUSINNECT(체크리스트 §5) |
| Windows PC | 표준 명령은 bash 불필요(SETUP §1 「Windows 기준」) · 이 세션은 Linux | VERIFY_WITH_BUSINNECT |
| 신규 PC clone · 인증 | — | VERIFY_WITH_BUSINNECT(체크리스트 §1) |

검증 뒤 정리:
- 로컬 API 프로세스는 종료했다.
- 임시 DB 는 중지했다.
- `apps/api-server/.env`(git 이 무시하는 파일)는 삭제했다.
- 임시 DB 데이터 폴더(저장소 밖)는 이 세션 권한으로 재귀 삭제가 막혀 남아 있다. 컨테이너가 회수될 때 함께 사라진다.

## 5. 테스트 데이터 · 계정

### 5-1. 현재 있는 것

| 수단 | 어디서 | 로컬에서 |
|---|---|---|
| Demo 「테스트 로그인」 3계정(매장 경영자 · 공급자 · 매장 직원) | 운영 DB(`demo-account-provision.ts` 는 운영 식별자를 단언하는 운영용 CLI) | **안 됨** — 빈 로컬 DB 에 계정이 없다 |
| 이메일 가입 | `/api/v1/auth/email/signup` | **안 됨** — `GET /signup/terms` 가 `SIGNUP_ORIGIN_NOT_ALLOWED`(계정 센터 출처). 가입 뒤에도 메일 인증 토큰이 필요한데 로컬은 메일 발송이 꺼져 있다 |
| Google · 카카오 | 개발용 OAuth Client 가 있어야 하고, 외부 계정 로그인은 사람이 직접 한다 | 개발용 Client ID 를 받으면 가능 |
| 격리 심사 환경 `deploy/chatgpt-review-demo/` | 전용 DB + 합성 계정 1개(Neture 매장 경영자 · 합성 약국) · Compose 또는 로컬 프로세스 | **가능**. 단 Docker 와 전용 env 생성이 필요하고, 매장 경영자 1역할만 있다 |
| 통합 테스트 fixture `scripts/dev/disposable-postgres-fixture.ts` 등 | 테스트용 일회성 DB(공급자 → 매장 · 개선 포럼 · 메인 자동화) | 테스트 실행용. 화면 로그인용이 아니다 |

### 5-2. 판정

| 상황 | 판정 |
|---|---|
| 로그인 없는 화면 · 공개 페이지 · API 단위 테스트 · 컴포넌트 테스트 | READY |
| 매장 경영자로 로그인한 화면(Neture) | READY(격리 심사 환경으로). 단 설정 부담이 있다 |
| 공급자 · 매장 직원 · 다른 서비스 역할로 로그인한 화면 | **NEEDS_PREPARATION** |
| 운영자 · 관리자 화면 | NEEDS_PREPARATION. Demo 에도 없다(정본상 권한 없음) |
| 배포 후 운영 화면 확인 | 통합 담당 몫(배포 후 Demo 버튼 · AGENTS.md §6). 개발자 PC 에서 하지 않는다 |
| 여러 개발자의 동시 테스트 | 로컬 DB 는 각자 PC 라 충돌이 없다. 운영 Demo 계정은 여러 세션이 함께 쓰므로 값을 바꾸는 동작은 지시가 있을 때만 하고 되돌린다(TEST-ACCOUNTS 사용 규칙) |

### 5-3. 보완안 (구현하지 않음 · 별도 WO 제안)

**로컬 개발용 합성 계정 provision CLI.**
- 형식: 기존 격리 심사 provision 과 같은 형태다.
  - 표식이 있는 로컬 DB 에서만 동작한다.
  - 기본 dry-run 이고 `--apply` 에서만 쓴다.
  - 비밀번호는 실행 시 환경변수로 받는다.
- 만드는 데이터: 매장 경영자 · 공급자 · 매장 직원 3역할과 합성 약국 · 합성 공급자 1개씩.
- 거부 조건: 운영 DB 와 원격 host 는 거부한다(`ALLOW_REMOTE_DB` 와 별개로 loopback 만 허용).
- 정리: reset 도 로컬 표식 DB 에서만 한다.
- 작업 범위:
  - CLI 위치는 `apps/api-server/src/scripts/` 다. Core 경로가 아니지만 `users` · `role_assignments` 를 **로컬에만** 쓴다.
  - 정본 [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md) §15(개발 데이터 생성 원칙)와 맞추는 결정이 필요하다.
- 이 CLI 가 생기면 로그인 화면 과제를 첫 과제 다음 순서로 넘길 수 있다.

## 6. CI · 자체 실행기 경계

### 6-1. 현재(public · 호스팅)

- 개발자 branch push → CI 없음. 통합 세션이 PR 을 만들면 `ci-pipeline` 등이 GitHub 호스팅에서 돈다.
- 일반 CI job 은 production secret 이 없다. 배포 job 은 소유자 조건과 Environment 로 분리돼 있다(§1-1). → READY.
- 협업자가 늘면 PR 수만큼 호스팅 실행이 늘어난다. 지금은 public 이라 무료다.

### 6-2. Private 전환 + `CI_RUNNER_LINUX=self-hosted` 이후 (**사용자 결정 필요**)

- 선택식은 `vars.CI_RUNNER_LINUX == 'self-hosted' && 저장소 private && head.repo.fork != true` 다(`O4O-SELF-HOSTED-CI-RUNNER-V1` §2-2).
- Businnect 의 branch 로 만든 PR 은 fork 가 아니다. 따라서 **PR CI 가 집 PC 실행기에서 돈다.**
- 추가로 write 권한이면 자기 branch 에 `runs-on: [self-hosted, ...]` workflow 를 넣고 push 만 해도 집 PC 에서 실행된다. PR · 통합 세션의 검토를 거치지 않는다.
- 실행기가 닿을 수 있는 것(문서 §7 기준):
  - WSL2 Ubuntu 전용 계정 `o4oci` 가 Docker 를 쓴다. Docker 그룹은 그 WSL 안에서 사실상 root 권한이다.
  - WSL 기본 설정은 Windows 드라이브(`/mnt/c`)를 자동으로 붙이고 Windows 프로그램 실행(interop)을 허용한다. 이를 끄는 설정은 문서에 없다(미확인).
  - 같은 PC 에 있는 개발용 자격증명(gcloud ADC · GitHub 로그인 · 로컬 `.env`)과 실제 Local Agent 에 닿을 수 있다.
- 실행기는 job 사이에 작업 폴더 · 캐시가 남는 비-ephemeral 방식이다.

**선택지(이번에 실행하지 않음):**

| 안 | 내용 | 부담 |
|---|---|---|
| ① 협업자가 있는 동안 자체 실행기를 켜지 않는다 | `CI_RUNNER_LINUX` 미설정. 호스팅 비용은 예산 · 실행량 감축으로 관리 | 가장 단순. 비용이 증가한다 |
| ② 실행기 격리 강화 후 켠다 | WSL `automount` · `interop` 끄기, 실행기 계정의 Docker 권한 재검토, 그 PC 에 개인 자격증명을 두지 않기, 가능하면 ephemeral 실행기 | 집 PC 설정 변경 · 검증이 필요하다. 개인 계정 저장소는 runner group 제한(조직 기능)을 쓸 수 없다 |
| ③ 선택식에 「작성자 = 소유자」 조건 추가 | PR 은 막을 수 있다. 그러나 협업자가 자기 branch 에 새로 넣은 workflow 는 막지 못한다 | 부분 대책이라 ①·② 와 함께 써야 한다 |

이 항목은 기존 Private · CI 비용 · 자체 실행기 트랙(`IR-O4O-PRIVATE-CI-BUDGET-V1` · `O4O-SELF-HOSTED-CI-RUNNER-V1`)에 **추가 결정 항목**으로 넘긴다. 이 IR 은 workflow 를 바꾸지 않는다.

## 7. 첫 시험 과제

### 7-0. 고른 방법

조건은 다음 다섯 가지다.
- 현행 서비스의 실제 결함
- 작다
- Core 경로(`scripts/ci/core-paths.mjs`) · DB · 운영 secret 이 필요 없다
- 로컬에서 검증할 수 있다
- 다른 진행 중 작업과 겹치지 않는다

열린 지시서 10개(ACTIVE · DRAFT · TODO)의 미완 항목은 대부분 이 조건을 만족하지 못했다. 병합 · 배포 · 실계정 확인 같은 운영 단계이거나, 큰 설계 작업이거나, 다른 세션이 진행 중이었다. 그래서 범위를 넓혀 최신 코드에서 결함을 직접 확인했다. 근거 줄 번호는 `origin/main` `c5da5631` 기준이다.

### 7-1. 후보

| | 후보 1 — Neture 「카탈로그 일괄등록」 화면의 카드 2개가 404 | 후보 2 — Neture `/workspace/hub` 관리 카드의 끊긴 · 엉뚱한 링크 | 후보 3 — Neture AI 관리 「Context Asset」 화면의 가짜 데이터 · 가짜 저장 |
|---|---|---|---|
| 결함 근거 | `services/web-neture/src/pages/admin/catalog-import/CatalogImportDashboardPage.tsx:16,22` 가 `/operator/catalog-import/csv` · `/history` 로 이동한다. 선언된 route 는 `App.tsx:1120-1122` 의 `/admin/catalog-import*` 뿐이라 `App.tsx:1340` NotFound 로 간다. 메뉴에 노출된 화면이다(`config/operatorMenuGroups.ts:70,171`) | `pages/hub/HubPage.tsx:105` 「서비스 설정」 → `/operator/settings`(route 없음 · 있는 것은 `/operator/settings/notifications`). `:98` · `:112` · `:120` 은 화면 대신 `/admin` 으로 간다(카탈로그 일괄등록은 `/admin/catalog-import` 가 있다. 감사 로그 화면은 없다) | `pages/admin/ai/ContextAssetListPage.tsx:43,313` 하드코딩 `mockContextAssets` 를 실제 목록처럼 보여 준다. `ContextAssetFormPage.tsx:179` 저장이 `console.log` 뒤 성공처럼 없는 `/operator/...` 로 이동한다. 백엔드 API 는 없다 |
| 바꿀 파일 | `CatalogImportDashboardPage.tsx`(경로 2줄) + 테스트 1개 | `HubPage.tsx` + 테스트 1개 | `ContextAssetListPage.tsx` · `ContextAssetFormPage.tsx` + 테스트 1개 |
| Core 경로 | 해당 없음 | 해당 없음(`@o4o/hub-core` import 는 있지만 바꾸지 않는다 · Core 목록 밖) | 해당 없음. API · 테이블 신설 금지 범위라 「저장소 미연결」 정직 표시까지만 한다 |
| 판단 필요 | 없음(정답 하나) | 있음 — 감사 로그 · 수수료 정책 카드의 목적지(없으면 카드 제거?) | 있음 — 준비 중 표시 vs 메뉴 숨김 |
| 로컬 검증 | vitest 컴포넌트 테스트(이동 경로 고정) · web-neture build | 같음 | vitest(가짜 행 · 가짜 성공 0) · build |
| 로그인 화면 확인 | 관리자 전용이라 로컬 계정이 없다(§5) → 테스트로 대신하고, 배포 후 통합 담당이 운영 관리자 계정으로 클릭 확인 | 같음 | 같음 |

### 7-2. 추천 — 후보 1 (2026-11-11 첫 과제로 확정)

- 메뉴에 보이는 관리자 화면의 실제 404 결함이고, 근거가 코드 두 줄과 route 선언으로 바로 증명된다.
- 판단할 거리가 없어 저장소 절차 자체를 시험하기에 맞다. 절차: branch → 수정 · 테스트 → 로컬 검증 → push → HANDOFF → 통합 세션 PR → CI.
- Core · DB · API · secret 이 필요 없다. 변경 파일 1개와 테스트 1개다.
- 같은 결함 종류인 후보 2 「서비스 설정」 링크 한 줄은 원하면 함께 묶어도 된다(목적지 `/operator/settings/notifications` 가 명확하다). 후보 2의 나머지와 후보 3은 판단이 들어가므로 두 번째 과제로 둔다.

### 7-3. 첫 과제 성공 기준

| 단계 | 기준 | 확인자 |
|---|---|---|
| 개발 | 두 카드가 `/admin/catalog-import/csv` · `/admin/catalog-import/history` 로 이동한다. 새 vitest 가 이동 경로를 고정한다(수정 전 코드에서 실패 · 수정 후 통과) | Businnect |
| 로컬 검증 | 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs <테스트>` 통과, web-neture `build` 통과. 실행한 명령과 결과를 HANDOFF 에 적는다 | Businnect |
| 절차 | 전용 branch · path-specific commit · push · HANDOFF(묶음 단위 · 결정 사항 · 검증 · 확인하지 못한 것: 「배포 후 관리자 화면 클릭 확인」) · PR 생성 · merge · 배포 dispatch 0 | Businnect · 통합 세션 |
| 통합 | 통합 세션이 PR 을 만들고 `CI Gate` 통과 · 병합 | 통합 세션 |
| 배포 후 | 운영 관리자 계정으로 두 카드 클릭 → 각 화면이 열린다 | 통합 담당 |
| 회고 | 체크리스트 · SETUP 에서 막힌 곳을 HANDOFF 에 적고, 다음 문서 보완에 반영한다 | Businnect → 통합 담당 |

## 8. 준비 항목 총괄

| # | 항목 | 판정 | 해결 방법 · 담당 |
|---|---|---|---|
| 1 | Write 권한 · 저장소 전체 읽기 | READY | — |
| 2 | `main` · `deploy/*` · 배포 job · production secret 경계 | READY | — |
| 3 | CODEOWNERS 정비 · `core-change` 라벨 | NEEDS_PREPARATION | 이 branch(Core registry · 라벨) 병합 — 통합 담당 |
| 4 | Core registry · 공동개발 안내의 main 반영 | NEEDS_PREPARATION | 위와 같은 묶음 병합 |
| 5 | SETUP migration 명령 오류 | **이번에 정정** | 병합 |
| 6 | 로컬 로그인 계정(공급자 · 직원 · 다른 서비스) | NEEDS_PREPARATION | §5-3 로컬 합성 계정 CLI — 별도 WO |
| 7 | Private 전환 시 ruleset · Environment 유지(플랜) | NEEDS_PREPARATION | 소유자: 전환 전 플랜 확인 · 전환 직후 재조회 |
| 8 | Private 전환 시 secret scanning · push protection | NEEDS_PREPARATION | 소유자: 전환 후 상태 확인 · 보완책 결정 |
| 9 | 자체 실행기 × Write 협업자 | NEEDS_PREPARATION(결정) | §6-2 ①~③ 중 결정 — 자체 실행기 트랙 |
| 10 | `delivery` classify 의 비소유자 실행 | 후속 검토 | CI 정비 트랙 |
| 11 | `production` Environment 설정 · `GITHUB_TOKEN` 기본 권한 실값 | VERIFY(통합 담당) | 설정 화면 read-only 확인 |
| 12 | 신규 PC clone · 도구 · 설치 · 빌드 · 로컬 API · 서비스 화면 · PostgreSQL 15 · Windows | VERIFY_WITH_BUSINNECT | 체크리스트 §1~§5 결과를 HANDOFF 로 보고 |
| 13 | 첫 시험 과제 | 준비됨(§7) | 통합 담당이 지정 → Businnect 실행 |

## 9. 담당별 수행 순서

1. **통합 담당**
   - 이 branch 의 묶음 PR 을 병합한다(문서 → CI · 설정 순서는 HANDOFF 참고).
   - §8 의 #7 · #8 · #9 를 결정하고 #11 을 확인한다.
   - 첫 과제를 지정한다.
2. **Businnect**
   - [체크리스트](../development/COLLABORATOR-ONBOARDING-CHECKLIST.md) §0 ~ §5 를 실행한다.
   - 결과(통과 · 실패 · 걸린 시간 · OS)를 첫 branch 의 HANDOFF 에 적어 push 한다.
   - 그다음 첫 과제를 §6 ~ §8 대로 진행한다.
3. **통합 세션**
   - Businnect branch 를 조회해 PR 을 만들고 CI · 리뷰 · 병합을 진행한다.
   - 시험 과제 성공 기준(§7)을 확인한다.

## 문서 정합

`발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건`

- **발견 1:** `AGENTS.md` §4-1(e) 의 ruleset 기록값 「admin bypass 가능」(2026-10-04)이 현재(bypass_actors 없음)와 다르다. 보고만 한다.
- **발견 2:** `SETUP.md` §3-1 5단계 · §4 의 `migration:run` 명령은 실제로 실패한다. 온보딩 문서 보완 범위라 이번에 명령을 정정했다(동작 · 판정 변경 아님).
- **별도 WO 제안:** ① 로컬 합성 계정 CLI(§5-3) ② 자체 실행기 × Write 협업자 결정(§6-2).
