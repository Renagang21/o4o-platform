# CHECK-O4O-CLAUDE-PERMISSIONS-LAPTOP-BASELINE-ALIGNMENT-V1

> **WO**: WO-O4O-CLAUDE-PERMISSIONS-LAPTOP-BASELINE-ALIGNMENT-V1
> **일자**: 2026-10-03
> **기기**: LAPTOP (저장소 `C:\Users\sohae\coding\o4o-platform`)
> **대상**: user `~/.claude/settings.json` · project `.claude/settings.json` · project-local `.claude/settings.local.json` (project 두 파일은 `.gitignore` 대상 로컬 전용)
> **기준**: 집 PC 정리 [`CHECK-O4O-CLAUDE-PERMISSIONS-CENSUS-DEDUP-AND-LEAST-PRIVILEGE-CLEANUP-V1`](CHECK-O4O-CLAUDE-PERMISSIONS-CENSUS-DEDUP-AND-LEAST-PRIVILEGE-CLEANUP-V1.md) 와 같은 AUTO / ASK / DENY 경계
> **값 기록 0** — credential · 계정 · DB endpoint literal 은 종류 · 개수만 적는다.

---

## 0. 최종 판정

```text
PERMISSION_CENSUS                = PASS
RULE_COUNT_BEFORE                = allow 764 (user 498 · project 259 · local 7) · ask 0 · deny 0
RULE_COUNT_AFTER                 = allow 288 (user 169 · project 119 · local 0) · ask 114 · deny 104 (§6 bare 패치 적용 후 최종)
  (1차 적용본                    = allow 254 (user 169 · project 85 · local 0) · ask 104 · deny 90)

SENSITIVE_LITERAL_BEFORE         = 30 규칙 (password 11 · DB endpoint 11 · 계정 email 15 — 한 규칙이 여러 종류 포함)
SENSITIVE_LITERAL_AFTER          = 0
  PASSWORD_LITERAL_RULES         = 11 → 0
  TOKEN_LITERAL_RULES            = 0
  JWT_LITERAL_RULES              = 0

BROAD_MUTATION_ALLOW_AFTER       = 0

MISMATCH                         = 0 (시뮬레이션 89건 + bare 회귀 10건 · 적용된 실제 파일 기준)
BARE_GIT_C_DENY                  = PASS (§6-2 실측)

AUTO_SMOKE                       = PASS
ASK_STATIC_MATCH                 = PASS
ASK_UI_SMOKE                     = PASS (`git push origin main` 승인 창 — 사용자 직접 승인 확인)
DENY_SMOKE                       = PASS (1차 8건 + bare 회귀 3건 실측 · 1차 GAP 1건은 §6 패치로 해소)

GIT_PUSH_POLICY                  = ASK
COLON_REFSPEC_DELETE             = ASK / ACCEPTED_MATCHER_LIMITATION
PRODUCTION_MUTATION_POLICY       = ASK
DB_POLICY                        = ASK
SECRET_MUTATION_POLICY           = ASK

BARE_FORM_PATCH                  = APPLIED (사용자 직접) / VERIFIED

ROTATION_REVIEW_REQUIRED         = YES

O4O_CLAUDE_PERMISSION_BASELINE   = CLEAN / LEAST_PRIVILEGE
DEVICE                           = LAPTOP
```

---

## 1. Census (before)

| 파일 | allow | ask | deny | 성격 |
|---|---|---|---|---|
| user | 498 | 0 | 0 | 민감 literal 대부분이 여기(집 PC 는 local). `git -C …` 92 · `node -e` 35 · `gcloud sql` 12 · DB 접속 · E2E 계정 환경변수 명령 · 일회성 echo/tee/temp 경로 다수 |
| project | 259 | 0 | 0 | 넓은 규칙 `git push *` · `gh api *` · `gh workflow *` · `gh repo *` · `git config *` · `cat > *` · DB 접속(endpoint 포함) · 일회성 tsc/tee/commit message 다수 |
| local | 7 | 0 | 0 | `gcloud secrets versions access` · `gh secret set` · `gcloud sql connect` · `gcloud run services describe` 등 |

민감 literal 분류(규칙 수): password 할당 11 · DB endpoint(IP · `host=` · instance 연결 문자열) 11 · 계정 email 15 · token / JWT 0.
그 밖 비-permission 설정: user 의 알림 키 2개 · user/project 의 `additionalDirectories` — **변경 없음 · 보존 확인**.

## 2. 재구성

기존 규칙을 걸러내지 않고 **깨끗한 템플릿에서 새로 생성** — 과거 규칙 원문 · 값 조각이 새 파일에 남을 경로를 구조적으로 없앴다(검증: 과거 민감 규칙 동일 문자열 0 · 값 조각 포함 0).

```text
user     범용 — git 조회 · add · commit · pull --ff-only · pnpm/npm/npx build·typecheck·test·lint · 조회 유틸(rg grep find cat head tail …) ·
         gh 조회 + pr create · WebSearch · playwright MCP(run_code_unsafe 제외)
project  O4O 전용 — `git -C */o4o-platform <조회·add·commit·pull --ff-only>` · scripts/git · scripts/quality · forbidden-tables 검사 ·
         gcloud 조회(run services/revisions/jobs describe·list · logging read · builds list/describe/log · config list) · 저장소/메모리 Read · O4O 도메인 WebFetch
local    allow / ask / deny 전부 0
ask      git push 전부(-C 형 포함) · git tag · rebase · worktree remove · stash drop/clear ·
         gh api · gh workflow run/enable/disable · gh variable set/delete · gh secret · gh pr merge · gh release create/delete · gh repo edit/delete/create ·
         gcloud run deploy · services update / update-traffic / delete · jobs execute/update/deploy/create/delete · gcloud sql · gcloud secrets · gcloud iam ·
         gcloud auth login/activate/application-default/revoke · gcloud config set · builds submit · storage rm/cp · psql · pg_dump · cloud-sql-proxy · cat > / cat >>
deny     push: --force(-with-lease 포함) · -f · +refspec · --delete · -d · --mirror · --tags · refs/tags/ · deploy/ · --prune (-C 형 포함) ·
         git branch -D · reset --hard · clean -f · checkout -- . · restore . · update-ref -d · rm -rf/-fr · find -delete · find -exec(dir) rm · npm/pnpm publish
```

- 위 ask/deny 의 git · gh · gcloud · psql 규칙은 `Bash(...)` 와 `PowerShell(...)` 양쪽에 둔다(노트북 기본 셸이 PowerShell). 집 PC 대비 규칙 수가 많은 이유.
- DEPLOY_FREEZE · `promote.yml` 별도 allow 없음 — `gh variable set *` · `gh workflow run *` ASK 가 정본.
- 규칙에 걸리지 않는 명령(`node -e` · `git pull origin main` 등)은 자동 허용되지 않고 auto mode 분류기 / 승인으로 간다.

## 3. Dry-run 검증 (적용 전 · proposed 3파일)

| 항목 | 결과 |
|---|---|
| JSON 문법 3파일 | PASS |
| 민감 literal 규칙 | 0 |
| 과거 민감 규칙 / 값 조각 잔존 | 0 / 0 |
| 넓은 mutation allow | 0 |
| 비-permission 설정 · additionalDirectories 보존 | PASS |
| 중복 규칙 | 0 |
| matcher 시뮬레이션 | 80건 MISMATCH 0 (단 §6 의 맨 명령 의미 차이는 이후 실측에서 발견) |

도중 발견 1건: `Bash(git push * :*)` 는 끝이 `:*` 라 legacy prefix 문법으로 해석돼 **모든 push 를 DENY** 로 만든다 → 제외. 따라서 `git push origin :x`(콜론 refspec 삭제)는 `git push *` 에 걸려 **ASK** — glob 만으로 표현 불가한 matcher 한계로 수용 (`COLON_REFSPEC_DELETE = ASK / ACCEPTED_MATCHER_LIMITATION`). `--delete` · `-d` 삭제는 DENY.

## 4. 적용

- 사용자 직접 실행(`apply.mjs --apply`) — Claude 의 자기 권한 파일 변경은 하지 않았다.
- 백업 `~/.claude/permission-backups/2026-10-03-laptop/` 3개 — **과거 literal 포함: 로컬 전용 · git / OneDrive · Drive 동기화 / 공유 금지 · 회전 검토 뒤 삭제**.
- 적용본 allow/ask/deny 가 proposed 와 **바이트 단위 동일** 확인 · 다른 설정 키 보존 확인.

## 5. Smoke (적용 후 · 재시작된 세션)

### 5-1. AUTO — 실제 실행, 승인 요청 없이 완료

`git status -sb` · `git log --oneline -3` · `git diff --stat` · `git fetch origin` · `gh run list --limit 3` · `gcloud run services describe o4o-core-api --format=value(status.url)` · `pnpm --filter @o4o/types exec tsc --noEmit`(exit 0) · PowerShell `git status -sb` → **PASS**.
`git add` · `git commit` 은 이 CHECK 커밋에서 실행(§5-3).

### 5-2. DENY — 영향 0 명령(존재하지 않는 branch · ref · 디렉터리)으로만 실측

| 명령 | 결과 |
|---|---|
| `git branch -D wo/<없는 branch>` | 실행 전 거부 |
| `git branch -D` (맨 명령) | 실행 전 거부 |
| `git push origin deploy/<없는 ref>` | 실행 전 거부 |
| `git push --force origin <없는 ref>` | 실행 전 거부 |
| PowerShell `git push --force origin <없는 ref>` | 실행 전 거부 |
| `git -C <없는 dir> reset --hard HEAD` | 실행 전 거부 |
| `git -C <없는 dir> branch -D x` | 실행 전 거부 |
| `git -C <없는 dir> push --force origin x` | 실행 전 거부 |
| **`git -C <없는 dir> reset --hard`** (맨 명령) | **거부되지 않음 — 실행됨**(디렉터리 부재로 git 이 exit 128, 영향 0) → §6 |

### 5-3. ASK

- **정적 판정** (적용 파일 · deny > ask > allow): `git push origin main|feature/x|HEAD:main` · `gh variable set DEPLOY_FREEZE --body false|true` · `gh workflow run promote.yml` · `gh api …` · `gh secret set|list` · `gcloud run deploy` · `services update(-traffic)` · `jobs execute` · `gcloud sql connect|instances list` · `psql` · `gcloud secrets versions access|add` · `gcloud auth login` · `git tag` · `git rebase` · `cloud-sql-proxy` → 전부 ASK. production · DB · secret 명령은 **실행하지 않음**.
- **UI 실측**: 이 CHECK 1차 커밋(`30e6149e0`)의 `git push origin main` 에서 승인 요청 창 표시 → 사용자 직접 승인 (**ASK_UI_SMOKE = PASS**).

## 6. 발견 — 맨 명령(bare) 매칭 GAP 과 패치

실측 결론: **끝의 ` *` 는 패턴에 다른 `*` 가 없을 때만 맨 명령까지 매칭**한다.

- `Bash(git branch -D *)` → `git branch -D` 도 매칭(거부 확인).
- `Bash(git -C * reset --hard *)` → `git -C <dir> reset --hard` **미매칭**(위 5-2). 같은 이유로 `git -C <dir> push` · `tag` · `rebase` 맨 명령은 ASK 가 아니라 분류기로 간다(시뮬레이션 재현).

조치(가산만 · 제거 0): 중간 `*` + 끝 ` *` 형태 규칙 옆에 맨 명령 변형을 추가 — ask +10 · deny +14 (user) · `git -C */o4o-platform <조회>` allow +34 (project). 그 밖 중간 `*` allow(`pnpm --filter * build *` 등)는 맨 형태를 넣지 않는다(최소 권한).
시뮬레이션 89건: 1차 적용본 MISMATCH 5 → **패치본 MISMATCH 0**. 패치 스크립트(`patch-bare.mjs`, dry-run 기본 · `--apply` 시 백업 후 기록).

### 6-1. 패치 적용

사용자 직접 적용 — 결과 user allow 169 / ask 114 / deny 104 · project allow 119 · local 0 · JSON 정상. 적용 파일 = 패치본과 동일 확인.
적용 직전 백업 `*-settings.before-bare-patch.json` 2개 추가(같은 백업 디렉터리 · 같은 취급 규칙).

### 6-2. bare 회귀 재검증 (영향 0 대상만)

| 명령 | 기대 | 실측 | 정적 판정 |
|---|---|---|---|
| `git -C <없는 dir> reset --hard` | DENY | 실행 전 거부 | DENY |
| `git -C <없는 dir> branch -D` | DENY | 실행 전 거부 | DENY |
| `git -C <없는 dir> push --force` | DENY | 실행 전 거부 | DENY |
| `git -C <없는 dir> push` (Bash · PowerShell) | ASK | — (정적만) | ASK |
| `git -C <없는 dir> tag` | ASK | — (정적만) | ASK |
| `git -C <없는 dir> rebase` | ASK | — (정적만) | ASK |
| `git -C <repo> status -sb` · `log --oneline -2` · `diff`(맨 명령) | AUTO | 승인 요청 없이 실행 | ALLOW |

회귀 10건 MISMATCH 0 · 전체 89건 MISMATCH 0.

참고: 집 PC 설정에 `git -C * push *` 류 중간 `*` 규칙이 있다면 같은 GAP 이 있을 수 있다 — 집 PC 측 확인 필요(별도).

## 7. 앞으로의 원칙 (집 PC 와 동일)

```text
일회성 명령을 "Always allow" 하지 않는다
production · DB · secret 명령은 Always allow 금지 (ask 유지)
credential · token · password · DB endpoint 가 들어간 명령을 permission 규칙으로 저장하지 않는다
넓은 mutation CLI 패턴(gh api * · gcloud run * · psql * · timeout * · node -e)을 allow 하지 않는다
중간 * 를 가진 ask/deny 규칙은 맨 명령 변형을 함께 둔다
O4O 전용 규칙은 project 에, 범용 도구는 user 에, local 은 비운다
```

## 8. 남은 것

노트북 permission 정비는 **CLOSED**. 이후 별도 작업:

1. **집 PC bare-command matcher 회귀 감사** — 집 PC 설정의 중간 `*` + 끝 ` *` ask/deny 규칙에 §6 GAP 이 있는지.
2. **credential 회전 검토 + 민감 백업 삭제 (별도 WO)** — password literal 11 규칙의 값(운영 DB · E2E 계정)이 permission 파일에 저장돼 있었고, 정리 과정의 채팅 · 세션 출력에도 노출됨. 현재 유효성 확인 후 회전, 회전 뒤 `permission-backups/2026-10-03-laptop/` 삭제.

`문서 정합: 해당 없음`
