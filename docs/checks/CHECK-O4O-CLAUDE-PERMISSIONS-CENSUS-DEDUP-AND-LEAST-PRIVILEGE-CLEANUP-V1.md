# CHECK-O4O-CLAUDE-PERMISSIONS-CENSUS-DEDUP-AND-LEAST-PRIVILEGE-CLEANUP-V1

> **WO**: WO-O4O-CLAUDE-PERMISSIONS-CENSUS-DEDUP-AND-LEAST-PRIVILEGE-CLEANUP-V1
> **일자**: 2026-10-03
> **대상**: Claude Code permission 설정 (user `~/.claude/settings.json` · project `.claude/settings.json` · project-local `.claude/settings.local.json` — 두 project 파일은 `.gitignore` 대상 로컬 전용)
> **값 기록 0** — 규칙 원문 중 credential literal 은 이 문서 · 터미널 어디에도 옮기지 않았다(종류 · 개수만).

---

## 0. 최종 판정

```text
PERMISSION_CENSUS                    = PASS
RULE_COUNT_BEFORE                    = 857 allow (user 46 · project 86 · local 725) · deny 7 · ask 0
RULE_COUNT_AFTER                     = 139 allow (user 96 · project 43 · local 0) · ask 25 · deny 24

DUPLICATE_RULES_REMOVED              = 10 (파일 간 완전 중복) + `git -C <경로>` 변형 약 230 (baseline 패턴으로 대체)
ONE_OFF_RULES_REMOVED                = 약 86 (temp 경로 · 특정 파일 · 특정 출력) + shell 조각 70 + PowerShell 일회성 약 110
SENSITIVE_LITERAL_RULES_REMOVED      = 31 (local 에만 존재)
BROAD_MUTATION_RULES_REMOVED         = 13 (아래 §3)

USER_SETTINGS_GENERIC_ONLY           = PASS
PROJECT_LOCAL_O4O_SCOPED             = PASS (project = O4O 경로 · 조회용 gcloud · 데이터 도메인 / local = 0)

DB_WRITE_AUTO_ALLOW                  = 0
SECRET_MUTATION_AUTO_ALLOW           = 0
PRODUCTION_DEPLOY_BROAD_ALLOW        = 0
DESTRUCTIVE_GIT_BROAD_ALLOW          = 0
MAIN_DIRECT_PUSH_AUTO_ALLOW          = 0 (git push 전부 ASK)

READ_ONLY_DEV_FLOW                   = PASS
BUILD_TYPECHECK_FLOW                 = PASS
GH_READ_FLOW                         = PASS
GCLOUD_READ_FLOW                     = PASS

PRODUCTION_ACTION_REQUIRES_APPROVAL  = YES
DB_WRITE_REQUIRES_APPROVAL           = YES
SECRET_MUTATION_REQUIRES_APPROVAL    = YES

ROTATION_REVIEW_REQUIRED             = YES  (password literal 26 — 현재 유효성 미확인 · 회전은 별도 보안 작업)

O4O_CLAUDE_PERMISSION_BASELINE       = CLEAN / LEAST_PRIVILEGE
```

---

## 1. Census (before)

| 파일 | allow | 성격 |
|---|---|---|
| user | 46 (+deny 7) | 범용 git · pnpm/npm/npx/node · 조회 도구 + 넓은 쓰기(`git tag *` · `git push origin *` · `gh api *` · `gh pr *` · `timeout *` · `git branch *`) |
| project | 86 | O4O 경로 Read · WebFetch 도메인 · 특정 typecheck + 넓은 `gcloud run *` · `gcloud storage *` · `gcloud auth *` · `pip install *` · `cat > *` + 일회성 |
| project-local | 725 | 일회성 누적: `git -C <경로> …` 약 230 · PowerShell 일회성 약 110 · shell 조각(do/then/fi · `VAR=…`) 70 · temp 경로 · 특정 파일 77 · DB 조회 명령 28 · `gh workflow *` 등 |

민감 literal (local 에만 · 규칙 31개): JWT 3(**모두 만료** — 회전 불필요) · token 할당 3 · password 할당 26 · DB write SQL 1 · `gcloud sql users set-password` 1 (중복 포함 집계).

## 2. 재구성 원칙

```text
user     범용 개발 도구만 — git 조회 · add · commit · pull --ff-only · pnpm/npm/npx/node · 조회 유틸 · gh 조회 · gh pr create · MCP 브라우저
project  O4O 전용 — 저장소 · 자료 경로 Read · 데이터 도메인 WebFetch · gcloud 조회(describe/list/logs) · scripts/ci · check-staged-scope
local    0 — 배포용 좁은 규칙(DEPLOY_FREEZE · promote)은 별도 판정 뒤에만
ask      항상 승인 (allow 보다 우선): git push 전부 · git tag · worktree remove · stash drop/clear · rebase ·
         gh api · gh workflow run · gh variable set/delete · gh secret set/delete · gh pr merge · gh release · gh repo edit ·
         gcloud run deploy · services update · jobs execute/update · gcloud sql · secrets create/versions add · gcloud iam · psql
deny     차단: force push(--force · -f · +refspec) · delete push(--delete · -d · :ref) · --mirror · tag push(--tags · refs/tags/ · deploy/*) ·
         git branch -D · npm/pnpm publish · find -delete · find -exec rm + 기존 7(reset --hard · clean -f · checkout -- . · restore . · rm -rf …)
```

`git push origin main` 은 allow 하지 않는다 — branch prefix allow 도 refspec(`wo/x:main` · `HEAD:main`)으로 main 에 닿을 수 있어 "main 외 branch" 를 안전하게 표현할 수 없다(사용자 결정 2026-10-03).
ask 에 allow 와 겹치는 넓은 패턴을 두지 않는다(우선순위 deny > ask > allow — 겹치면 일상 명령까지 매번 승인).

## 3. 제거한 넓은 mutation 규칙

`git tag *` · `git push origin *` · `git branch *`(→ 조회형만) · `gh api *` · `gh pr *`(→ 조회 + create) · `gh workflow *` · `timeout *`(임의 명령 감싸기 우회) ·
`gcloud run *` · `gcloud storage *` · `gcloud auth *` · `pip install *` · `cat > *` · DB 조회 명령 일체(`psql` → ask).

## 4. 적용

- 적용 스크립트: dry-run → 사용자 검토 → **사용자가 직접 `--apply` 실행**(Claude 의 자기 권한 설정 변경은 auto mode 분류기가 차단 — 우회하지 않음).
- 백업: `~/.claude/permission-backups/2026-10-03/` (3개 · **과거 literal 포함 → 로컬 전용 · git/클라우드 동기화/공유 금지 · 회전 검토 뒤 삭제**).
- 다른 설정 키(additionalDirectories · 알림 설정 등) 보존 · 새 파일 3개 JSON 문법 PASS · 민감 literal 규칙 0.

## 5. Smoke

**판정 시뮬레이션** (적용된 실제 파일 · deny > ask > allow): **40/40 일치**.

**실제 실행**

| 기대 | 명령 | 결과 |
|---|---|---|
| AUTO | `git -C … status` · `git log` · `git show` · `git diff` · `git fetch` · `git pull --ff-only` | 승인 요청 없이 실행 |
| AUTO | `pnpm --filter @o4o/types exec tsc --noEmit` | 승인 요청 없이 실행 |
| AUTO | `gh run list` · `gcloud run services describe` | 승인 요청 없이 실행 |
| DENY | `git branch -D <없는 branch>` · `git push origin deploy/<없는 ref>` · `git push --force origin <없는 ref>` | **실행 전 거부** (Permission denied) — 영향 0 명령으로만 시험 |
| ASK | `git push` · DEPLOY_FREEZE · promote · deploy · DB write · secret | 적용 파일 판정 = ASK. production 명령은 실행하지 않음(이 CHECK 의 commit push 가 실제 ASK 경로) |

## 6. 앞으로의 원칙

```text
일회성 명령을 "Always allow" 하지 않는다
production · DB write · secret mutation 명령은 Always allow 금지 (ask 유지)
credential · token · password 가 들어간 명령을 permission 규칙으로 저장하지 않는다
넓은 mutation CLI 패턴(gh api * · gcloud run * · psql * · timeout *)을 allow 하지 않는다
O4O 전용 규칙은 project 에, 범용 도구는 user 에
```

## 7. 남은 것

1. **회전 검토** — password literal 26 규칙의 값이 현재 유효한지(운영 DB · 관리자 계정) 판단 → 필요 시 별도 보안 WO.
2. 배포 WO 재개 시 필요하면 project-local 에 좁은 규칙 3개만(`gh variable set DEPLOY_FREEZE --body false|true` · `gh workflow run promote.yml:*`) — 사용자 판정 뒤. 단 ask 의 `gh variable set *` · `gh workflow run *` 가 우선하므로 이 두 명령은 allow 를 넣어도 승인 요청이 뜬다(의도된 동작).

`문서 정합: 해당 없음`
