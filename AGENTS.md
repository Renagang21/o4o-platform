# AGENTS.md — Codex / Agent 진입점

## 1. Repository / 역할

O4O Platform repository의 Codex 및 일반 coding agent를 위한 독립 진입점이다.

- `CLAUDE.md`는 Claude Code의 **동급 진입점**이다. 다른 AI용 지침을 import하거나 상속하지 않는다.
- 이 문서만으로 작업을 시작할 수 있어야 하며, 다른 AI용 지침을 선행 조건으로 요구하지 않는다.
- 공통 사업·architecture 지식은 [정본 지도](docs/CANONICAL-INDEX.md)와 각 canonical 문서에 둔다.
- 본문에는 저장소 특유의 안전 경계와 실행 규칙만 직접 유지한다.

## 2. Source of Truth

작업 시작 시 [docs/CANONICAL-INDEX.md](docs/CANONICAL-INDEX.md)에서 관련 문서의 상태를 확인하고,
현재 작업 영역의 canonical 문서를 먼저 읽는다. 색인 등재만으로 모든 내용이 현행 규칙이 되지는 않는다.

충돌 시 우선순위:

1. 현재 사용자의 명시적 작업 지시
2. 사업·정책 canonical docs — 역할별 업무공간 Architecture([O4O-ROLE-WORKSPACE-ARCHITECTURE-V1](docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)), 사업 철학, commerce 경계, B2B 계약 (3자 흐름 문서의 충돌 절은 2026-09-16 판정 확정으로 SUPERSEDED — Architecture 가 대체)
3. 구조 계약 — Frozen / Boundary / Core / Shared Module Protocol
4. 도메인·서비스 canonical docs
5. 과거 WO / CHECK / IR / archive — 당시 실행 기록이며 현재 정책을 이기지 않는다

현재 사용자가 지정한 WO는 작업 범위를 정한다. 과거 기록을 현행 정책으로 승격하지 않는다.
아래 Git·DB·검증 등 실행 안전 경계는 문서 우선순위를 이유로 생략하지 않는다.

- **역추론 금지:** 코드가 존재한다는 사실은 그 기능이 현행 사업 기능이라는 근거가 아니다.
- **현재 정책 ≠ 영구 계약:** 현재 하지 않는다는 정책을 앞으로도 절대 하지 않는다는 뜻으로 읽지 않는다.
  정책 변경은 해당 canonical 문서의 변경·승인 절차를 따른다.
- commerce 작업(cart / checkout / orders / payments / refund / PG / POS / tablet / QR / 외부 판매채널)은
  **소비자 commerce 경계와 공급자→매장 B2B 계약을 코드보다 먼저 함께 확인**한다(§7).
- `판정 대기` 또는 `UNKNOWN`인 기능은 근거 확인과 별도 판정 전에 복구·확장하지 않는다.

## 3. 기본 작업 절차

```text
조사 → 문제 확정 → 최소 수정 → 검증 → 보고
```

- **조사 전용 작업은 파일을 수정하지 않고 보고로 종료한다.**
- 구현 요청이면 승인된 안전 범위 안에서 불필요한 중간 승인 없이 완료까지 진행한다.
- 이미 명시적으로 승인된 변경 범위를 같은 이유로 기계적으로 다시 승인받지 않는다.
  승인된 범위 안의 조사 · 수정 · 검증 · review finding 처리 · 스레드 정리 · 상태 조회는 스스로 판단해 진행한다.
  사용자에게 올리는 것은 새 정책 · 위험 범위 판단과 main 통합 승인뿐이다(§4-1(e) · §5).
- 새롭게 발견된 범위 확대나 미승인 위험 변경은 해당 변경 전에 중지하고 보고한다.
- 범위 밖 문제는 임의 수정하지 않고 보고한다. 무관한 build/test 실패도 임의로 고치지 않는다.
- 기존 코드 패턴을 우선하고 과도한 추상화·리팩터링을 피한다. 코딩 컨벤션은 [README.md](README.md)를 따른다.
- 공통 sidebar / menu / layout / config / capability 변경 전 **모든 소비처 영향도를 확인**한다.
  단일 서비스 기준으로 완료 판단하지 않는다. 상세 절차는 §7의 shared module 정본을 따른다.
- route 없는 메뉴를 노출하거나 실기능이 있는 메뉴를 은폐하지 않는다.
- UI 정책 문제를 DB backfill·migration으로 우회하지 않는다.

## 4. Git / 병렬 작업 안전

- **세션 격리 · worktree · branch · main 통합 · 공유 runtime 직렬화**는 아래 §4-1 이 저장소 공통 정본이다
  (사람 · Claude Code · Codex · 그 밖의 coding agent 전원 적용).
- **stage · commit · push 안전**은 §4-2 와 [O4O-GIT-PARALLEL-WORK-SAFETY-V1](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md).
  그 문서의 "공유 `main` 직접 작업" 전제와 §4-1 이 다르면 §4-1 이 우선한다.

### 4-1. Parallel Session / Worktree Policy

> 도입: WO-O4O-PARALLEL-SESSION-WORKTREE-POLICY-V1 (2026-10-03).
> 배경: 여러 세션이 한 `main` checkout · index · branch 를 공유하다 branch 전환 · `CHERRY_PICK_HEAD` 잔류 ·
> staging 혼입으로 다른 세션의 commit/push 가 중단된 사고.

```text
1 독립 작업 = 1 세션 + 1 전용 worktree + 1 전용 branch
개발은 병렬(Parallel Development) → main 통합 · 공유 runtime 변경은 순차(Sequential Integration)
```

**(a) 시작**

- 먼저 확인: repository · `git worktree list` · 현재 branch · HEAD · `origin/main` · working tree ·
  진행 중 operation(`CHERRY_PICK_HEAD` · `MERGE_HEAD` · rebase 상태).
- **새 독립 WO / 개발 작업은 최신 `origin/main` 에서 전용 worktree + 전용 branch 로 시작한다.**

  ```bash
  git fetch origin
  WT_ROOT="$(dirname "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")")/o4o-wt"
  git worktree add -b wo/<slug> "$WT_ROOT/<slug>" origin/main
  ```

  ```powershell
  # PowerShell
  $wtRoot = Join-Path (Split-Path (Split-Path (git rev-parse --path-format=absolute --git-common-dir))) 'o4o-wt'
  git worktree add -b wo/<slug> "$wtRoot/<slug>" origin/main
  ```

  - branch 는 `wo/<slug>`(기존 관례). worktree 는 기준 main checkout 의 **밖** 형제 디렉터리 `o4o-wt/<slug>` —
    저장소 안(`.claude/worktrees/` 등)에 두면 lint · glob 이 사본까지 읽는다.
  - 경로는 공통 `.git`(`--git-common-dir`) 기준으로 잡는다. 상대 경로 `../o4o-wt` 나 `--show-toplevel` 은
    실행 위치(하위 폴더 · `C:\tmp\...` · 다른 worktree 안)에 따라 다른 곳에 만들어지므로 쓰지 않는다.
  - 새 worktree 에는 `node_modules` · 빌드 산출물이 없다. 검증 전 [SETUP.md](SETUP.md) 설치 절차를 따른다.
  - branch push 는 이름을 명시한다(`git push -u origin wo/<slug>`).
- 해당 작업용 worktree 가 이미 명시적으로 준비돼 있으면 중복 생성하지 않는다.
- 완료된 worktree / branch 를 새 독립 작업의 작업공간으로 재사용하지 않는다(이전 작업의 stale base · history 차단).
  동일 WO 의 연속 Phase 처럼 같은 branch 유지를 명시한 경우만 예외이며, 예외는 보고 · 커밋 메시지에 기록한다.
- 자기 worktree 에 예상치 않은 `CHERRY_PICK_HEAD` / `MERGE_HEAD` / rebase 상태가 있으면 새 작업을 시작하지 않는다.
  자기 세션이 시작한 operation 이 아니면 continue / abort 하지 않고 소유권 · 목적을 확인하거나 보고한다.

**(b) 세션 격리**

- 각 세션은 **자기 worktree 안에서만** 파일을 수정 · stage · commit 한다.
- 금지: 다른 worktree 파일 수정 · 기준 main checkout 에서 개발 · 공유 checkout 의 branch 전환(`git switch` / `checkout`) ·
  다른 세션 branch 의 checkout / reset / rebase / cherry-pick · 다른 세션의 staging · stash 변경 / 삭제.
- 범위 밖 변경(foreign dirty · untracked · staged · 낯선 commit)을 발견하면 소유권을 추측하지 않고
  **수정 · 삭제 · 원복 · stage/unstage · stash · commit 하지 않는다.** 다른 세션 작업일 가능성을 우선한다.
  그 때문에 자기 작업을 안전하게 할 수 없으면 STOP 하고 보고한다.

**(c) 기준 main checkout = Integration / Reference Workspace**

- 기대 상태: `branch = main` · `HEAD == origin/main` · working tree clean. 독립 개발 작업장으로 쓰지 않는다.
- 작업 지시가 main checkout 에서의 maintenance / integration 을 명시한 경우만 예외이며, 그 범위를 명시한다.
- 기준 checkout 이 기대 상태가 아니면(로컬 전용 commit · dirty) 다른 세션 소유로 보고 정리하지 않고 보고한다.

**(d) `origin/main` 이동**

- 자기 worktree 에서 `git fetch origin` 으로 차이를 보는 것은 자유다.
- 앞서갔다고 **자동으로 merge · rebase · reset · cherry-pick 하지 않는다.** 충돌 여부 · 통합 필요성 · 현재 통합 정책을
  먼저 확인한다. 통합 시점(e)에 자기 branch 를 최신 `origin/main` 위로 올리는 것은 자기 branch 에 한해 허용된다.

**(e) main 통합 — PR merge · 사용자 승인 후**

```text
작업 → 검증 → PR → required CI PASS → Codex blocker 없음   = integration-ready
→ 결과 보고 · STOP → 사용자 "main 통합 진행" → PR merge → post-merge 확인
```

- **기술 gate 는 실제 `main` ruleset 이다.** 설정값은 이 문서에 고정하지 않고 통합 직전 read-only 로 확인한다
  (`gh api repos/Renagang21/o4o-platform/rulesets`). 2026-10-04 확인값: PR 필수 · required check `CI Gate` ·
  삭제 · non-fast-forward 금지 · **필수 human approval 0** · admin bypass 가능. 합의 규칙: [README — 기여](README.md#기여).
- **모든 주체(사람 · Claude Code · Codex · 그 밖의 agent)의 main 반영 경로는 PR merge 하나다.**
  owner direct push · fast-forward push(`git push origin <branch>:main`) 로 PR 을 우회하지 않는다.
- **integration-ready 여도 자동으로 merge 하지 않는다.** 상태(HEAD · CI · Codex · 미해결 스레드 · main 대비 위치 · blocker)를
  보고하고 STOP 한다. 작업을 지시한 사용자가 명시적으로 "main 통합 진행" 을 승인한 뒤에만 merge 한다.
- **필수 human approval 은 기본 merge gate 가 아니다.** 다른 개발자 review 는 선택적으로 쓴다 — 고위험 구조 변경 ·
  보안 · 권한 · DB · 공통 Core 변경, 또는 사용자가 요구할 때. 개발자들은 각자 작업공간에서 독립적으로 일하며
  서로의 상시 승인자가 되지 않는다.
- **admin bypass 는 정상 경로가 아니다.** ruleset 을 우회할 수 있다는 사실을 merge 허가로 해석하지 않는다.
  장애 복구 같은 예외도 사용자 사전 확인 후에만 쓴다.
- 자기 branch 의 자기 변경만 commit / push 한다. stage · commit 규칙은 §4-2 그대로다.
- **통합은 한 번에 하나씩:** merge 직전 `git fetch origin` → `origin/main` 이 움직였으면 자기 branch 를 정리
  (아직 push 하지 않은 branch 는 rebase, 이미 push 한 branch 는 `git merge origin/main` — 원격 branch 이력 재작성 금지)
  → 필요한 재검증 → PR merge. 다른 세션이 통합하는 동안에도 각 세션은 자기 worktree 에서 개발을 계속할 수 있다.
- 통합에 기준 main checkout 을 쓰지 않는다.

**(f) 배포**

- main 반영 ≠ production 배포. 작업별로 현재 Delivery 정책([README — 배포](README.md#배포))에 따라
  `DEPLOYMENT = REQUIRED | AUTOMATIC | MANUAL/GATED | NOT_APPLICABLE` 을 판정한다.
- 문서-only 처럼 Delivery 가 배포를 skip 하는 작업은 `NOT_APPLICABLE` 로 기록하고 배포 완료를 기다리지 않는다.
  배포가 필요한 작업의 closure 는 해당 WO 의 현재 배포 · 검증 정책을 따른다.
- 과거 운영 방식 · 플래그(`DEPLOY_FREEZE` · `DEPLOY_ENABLED` 등)를 현재 사실 확인 없이 재사용하지 않는다.

**(g) 공유 Mutable Resource — serialized**

> **Code development may be parallel; shared runtime mutation is serialized.**

worktree 를 분리해도 격리되지 않는 자원(최소): Production DB · 공유 staging DB · production 배포 ·
GitHub ruleset / settings / secret · 실제 Local Agent 와 `local.db` · Local Agent credential / pairing ·
Chrome native host · Chrome Extension · 실제 browser session(Playwright 프로필 포함) · 실 PC smoke 환경 · 공유 OAuth / Cloud 설정.

- 이 자원을 **변경**하는 작업은 동시에 한 세션만 수행한다. 시작 전 다른 세션의 사용 여부를 확인하고, 불명이면 사용자에게 묻는다.
- read-only 조회는 각 자원의 기존 경계(§5 DB · 보안 경계 등) 안에서 병렬로 해도 된다.

**(h) Local Agent**

- Local Agent 코드 개발도 예외 없이 전용 worktree / branch 를 쓴다.
- 실 PC 의 `%LOCALAPPDATA%\o4o-local-agent\` · `local.db` · credential · pairing · Chrome native host · Chrome Extension 은
  **worktree 별로 분리되지 않는다**고 가정한다.
- Agent start / restart · `local.db` migration · credential / pairing 변경 · Extension reload · 실 PC smoke 는
  동시에 한 세션만 수행한다. 실 PC 검증 전 다른 세션의 사용 여부를 확인한다.

**(i) 생명주기 · 종료 정리**

```text
최신 origin/main → 전용 worktree + branch → 작업 → 검증 → commit / push → PR → CI · Codex
→ 보고 · STOP → 사용자 승인 → main 통합(PR merge) → post-merge CI
→ (필요 시) deploy / smoke → 종료 정리(아래) → 트랙 종료
```

**PR merge 후 자기 세션이 만든 worktree 의 정리는 표준 종료 절차다.** 즉시 삭제하지 않고 아래 순서로 점검한 뒤 삭제한다.

1. **main 반영 확인** — 먼저 `git fetch origin --prune`(GitHub 에서 merge 한 직후 로컬 `origin/main` 은 자동 갱신되지 않는다) →
   post-merge CI 확인 · 작업 commit 이 모두 main 에 포함(`git log origin/main..wo/<slug>` 비어 있음.
   squash merge 라 비어 있지 않으면 `git diff origin/main wo/<slug> -- <내 작업 경로>` 차이 0 으로 확인).
2. **worktree clean** — uncommitted 0 · untracked 0 · 진행 중 operation(`MERGE_HEAD` · rebase 등) 없음.
3. **남은 일 없음** — deploy / smoke / closure 없음 · 보존할 CHECK / log / artifact 없음 · 다른 세션 사용 없음 ·
   후속 작업이 그 branch 를 필요로 하지 않음.
4. **reparse point 안전 점검 (Windows · 필수)** — worktree 아래 **모든 깊이**의 junction / symlink(특히 `node_modules`)를 나열하고,
   각 링크를 비재귀로 해제(PowerShell `[System.IO.Directory]::Delete(<path>)`)한 뒤 **재스캔 0** 을 확인한다.
   Git Bash 의 `cmd rmdir` 은 경로 인용 오류로 조용히 실패한다. 하나라도 해제되지 않으면 삭제하지 않는다.
   근거: Windows git 은 junction 을 따라 재귀 삭제한다 — 2026-09-12 `node_modules` junction 을 남긴 채
   `git worktree remove` 를 실행해 기준 저장소의 `packages/` 소스가 삭제된 사고.
5. **삭제** — `git worktree remove <path>` → `git worktree prune`.
6. **손상 검증** — 기준 main checkout 에서 `git status --short` 에 삭제(` D`) 항목이 없는지 확인한다(`node_modules` 개수가 아니라).
7. **branch 정리** — main 에 포함된 로컬 `wo/<slug>` 는 `git branch -d`. 원격 branch 는 PR merge 시
   `--delete-branch` 또는 merge 후 삭제한다. squash merge 는 branch tip 이 main 의 조상이 아니어서 `-d` 가 거절된다 —
   그 경우에 한해, 1 단계의 경로 diff 0 을 확인했고 PR 이 merged 상태일 때만 `git branch -D wo/<slug>` 를 쓴다.
   그 밖의 상황에서 강제 삭제(`-D`)는 하지 않는다.

- 판정은 `SAFE_TO_REMOVE` / `KEEP` / `UNCERTAIN` 이다. 1~4 를 모두 통과한 `SAFE_TO_REMOVE` 는 별도 승인 없이 5~7 까지 진행한다
  (main 통합 승인이 트랙 종료를 포함한다). `KEEP` / `UNCERTAIN` 이면 삭제하지 않고 이유를 보고한다.
- **다른 세션 · 다른 PC 가 만든 worktree / branch 는 정리 대상이 아니다** — 판정만 보고한다.

**(j) 완료 보고**

WO 완료 보고에 가능하면 아래 블록을 붙인다 — 후속 housekeeping 이 처음부터 추적하지 않게 하기 위함이다.

```text
WORKTREE_DISPOSITION
worktree: / branch: / base: / main integration: / CI: / deployment: / smoke:
uncommitted: / untracked: / other session usage: / branch-only commits:
verdict: SAFE_TO_REMOVE | KEEP | UNCERTAIN
```

### 4-2. Stage · Commit · Push

- 작업 전 `git status --short` · `git branch --show-current` · `git rev-parse HEAD`로 기준선을 확인한다.
  `git fetch origin` 후 `git status -sb`로 원격과 비교하며, 작업 후에도 상태를 확인한다.
- **foreign dirty / untracked / staged changes는 불가침**이다. 기존 변경을 내 것으로 간주하지 않는다.
  다른 세션의 변경을 판단·커밋·정리하거나 `restore` / `reset` / `stash`하지 않는다.
- 다른 세션의 dirty 파일이 존재한다는 사실만으로 작업 전체를 중지하지 않는다.
  **경로 충돌 / 소유권 불명 / 동일 파일 변경 혼재 시 중지하고 보고**한다.
- **dirty 상태에서 pull(merge/rebase) 금지.** 필요한 sync는 작업트리가 clean할 때만 수행한다.
- **path-specific stage:** `git add -- <내 파일...>`만 사용한다.
  **`git add .` · `git add -A` · `git commit -am` 금지.**
- 커밋 직전 `git diff --cached --name-only`와
  `node scripts/git/check-staged-scope.mjs <내 작업 경로...>`로 staged 범위를 확인한다.
- **path-specific commit:** `git commit -m "..." -- <내 파일...>`처럼 커밋에도 pathspec을 붙인다.
  foreign staged 파일이 있으면 pathspec 없는 커밋은 금지한다.
- 커밋 후 `git show --stat --oneline HEAD`로 실제 포함 경로를 확인한다.
- push 전 다시 fetch하여 `origin/main` 이동을 확인한다. **force push(`--force`) 금지.**
  공유 `main` 이력을 재작성하지 않는다(`amend` 포함). 정정은 후속 커밋으로 한다.
- commit/push를 수행하는 작업의 완료 조건은 **이번 작업 범위 미커밋 변경 0건 + 내 커밋이 작업 branch 에 push 되고 PR 이 integration-ready**(§4-1(e))이다.
  **작업 완료와 main 통합은 별개다** — 완료 조건을 채우려고 main 에 먼저 merge 하지 않는다. 사용자가 통합을 승인해 merge 한 경우에만
  `git merge-base --is-ancestor HEAD origin/main` 으로 포함을 확인한다. 다른 세션의 변경까지 정리하여 저장소 전체를 clean하게 만들지 않는다.

## 5. 위험 변경 / 사용자 확인

사용자 확인 대상은 **이번 작업에서 아직 승인되지 않은 새로운 위험 변경**이다.
현재 지시에 명시적으로 승인된 범위는 동일 이유로 반복 확인하지 않는다.

- DB schema / migration / 데이터 삭제 / 대량 update / seed 변경
- `package.json` / dependency / lockfile 변경
- Docker / CI / build·deployment infrastructure 변경
- Core / Frozen / shared contract 변경
- 권한 / role / route / API contract의 변경 또는 범위 확대
- 결제 / 정산 / 법률 / 규제 판단
- 실제 계정 / 자격정보 / 외부 서비스 승인

**DB·보안 경계:**

- **기본 환경은 프로덕션이다.** 대상 환경을 확인하고, read-only 검증은 허용된 범위에서 수행한다.
- **DB write(INSERT / UPDATE / DELETE 등), DDL(DROP / ALTER 등), migration 적용은 사용자 명시 승인이 필요하다.**
  코드 수정 승인만으로 운영 DB write까지 승인되었다고 간주하지 않는다.
- 실제 DB host / password / 계정값을 문서·로그·커밋·스크린샷에 기록하지 않는다.
  운영 데이터 보고는 요약·마스킹한다. 접속·migration 절차는 §7의 정본을 따른다.
- **이 저장소는 Public이다.** CHECK·WO·IR·주석에 비밀번호(과거·테스트 값 포함)·실제 사용자 이메일·실명·전화번호·실제 약국/사업자명·production 응답 원문을 쓰지 않는다.
  credential은 secret 이름만, 사람은 `[사용자 A]`·`[REDACTED_EMAIL]` 같은 placeholder로 적는다.
  예외는 정본이 의도적으로 공개한 Demo credential 하나뿐이다 — 조건은 [`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1` §10-4](docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)가 정본.

**진단·debug 안전 경계:**

- 진단 / seed / repair / backfill은 **CLI 우선**이다.
- HTTP route가 불가피하면 **`requireAuth` + role guard 필수**다.
- debug/test route는 **프로덕션에 등록하지 않는다**(`NODE_ENV !== 'production'` 게이트).
- **GET으로 상태 변경 금지.** 권한 하드코딩(`isPlatformAdmin: true` 등) 금지.
- 외부 가이드의 예제를 근거로 이 안전 경계를 완화하지 않는다.

## 6. 검증 / 완료 보고

- **실제 검증 없이 PASS 보고 금지.** 실행하지 않은 test / lint / build / smoke를 실행한 것처럼 보고하지 않는다.
- 변경 범위에 맞는 focused validation을 우선한다. 명령·사전 빌드 절차는 [SETUP.md](SETUP.md)를 따른다.
- 실패하거나 생략한 검증을 숨기지 않고, 실행 불가 이유와 미확인 범위를 구체적으로 기록한다.
- UI 변경은 빌드 성공만으로 종결하지 않는다. 실행 환경과 테스트 계정이 있으면 필요한 browser smoke를 수행한다.
  콘솔 오류뿐 아니라 **toast·API 응답과 실제 동작**을 확인한다.
- route / menu / layout 변경은 desktop·mobile을 각각 확인한다.
  신규 route는 메뉴 진입·직접 URL과 기존 route 회귀를 확인한다.
- 테스트 계정 SSOT는 `docs/local/TEST-ACCOUNTS.local.md`다(로컬 전용).
  운영 계정 사용과 자격증명의 코드·문서·커밋 복사를 금지한다.
- 중간·완료 보고는 **한국어**로 작성하고 파일명·route·API·command·commit SHA 등 기술 식별자는 원문 유지한다.
- 긴 diff 대신 변경 / 검증 / 미해결 / Git 상태 중심으로 보고한다.
- **조사 전용·무수정 요청은 CHECK/IR 생성이나 commit/push를 완료 조건으로 요구하지 않는다.**
  문서 기록 생성·갱신은 현재 작업 지시에 필요한 경우에만 수행한다.
- 새 문서의 위치·헤더·CHECK 작성 기준·민감정보 규칙은 [DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1 §10](docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)을 따른다.
  docs의 개인 메일·전화번호·공인 IP는 CI가 막는다(`node scripts/check-doc-sensitive.mjs`).
- 완료 보고에 **`문서 정합`** 한 줄을 포함한다. 발견이 없으면 `해당 없음`이라고 쓴다.

## 7. 작업별 canonical 진입점

상세 목록과 상태는 [docs/CANONICAL-INDEX.md](docs/CANONICAL-INDEX.md)에서 찾는다.
아래에는 작업별 조건부 진입점만 둔다.

| 작업 | 먼저 확인할 정본 |
|---|---|
| 환경 / 설치 / 검증 명령 | [SETUP.md](SETUP.md) — 설치는 `pnpm install --frozen-lockfile`. 버전·CI 수치는 복제하지 않고 현재 설정·스크립트를 확인 |
| 역할 경계 · 업무공간 · 콘텐츠 유입 경로 · Legacy Partner · 리팩터링 단계 WO | [O4O-ROLE-WORKSPACE-ARCHITECTURE-V1](docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) — §9 실행 규칙(매 단계 최신 `origin/main` 에서 모집단 재산출) 적용 |
| commerce | [STORE-COMMERCE-BOUNDARY](docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) + [B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT](docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) |
| Core / Frozen / Boundary / 도메인 | [CANONICAL-INDEX](docs/CANONICAL-INDEX.md)의 해당 정본 |
| shared module | [O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1](docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) |
| AI 자동화 (Local Agent · Browser · Computer Use · Adapter · Workflow) | [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](docs/baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — §25 의 현행 정렬 상태를 먼저 확인 → 구조·개발 순서는 [O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2](docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §18 (ARCHITECTURE-V1 SUPERSEDED) |
| TypeORM / ESM | [ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01](docs/reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md) — Entity 관계는 type-only import + 문자열 참조 |
| production migration | [PRODUCTION-MIGRATION-STANDARD](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) — §5의 승인·보안 경계 적용 |
| 문서 lifecycle | [DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1](docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) — §8의 실행 경계 적용 |

## 8. 문서 Drift

- **기본 동작은 보고**다. 작업 범위 밖 canonical 내용·판정을 임의 수정하지 않는다.
- 인라인 허용은 ① 대체 문서가 확정된 경우 아래 SUPERSEDED 한 줄 추가(본문 불변)
  ② 깨진 링크·이동 경로의 의미 변경 없는 기계적 수정뿐이다. 명시적 파일 수정 금지 지시가 있으면 수행하지 않는다.
  `> **상태**: SUPERSEDED · **대체 문서**: <경로> · **표기일**: YYYY-MM-DD`
- 삭제 / 통합 / 분할 / archive 이동 / Frozen 본문 수정 / 기준 문서의 내용·판정 변경은 인라인으로 하지 않는다.
- **canonical index의 행 추가 / 삭제 / 상태 변경은 별도 문서 작업**으로 취급한다.
- 기록물(WO / CHECK / IR / archive)을 현재 정책에 맞게 다시 쓰지 않는다.
- 대체 문서를 특정할 수 없거나 판단이 애매하면 상태를 임의 변경하지 않고 보고만 한다.
- 발견 사항·인라인 조치·후속 문서 작업을 `문서 정합` 항목에 보고한다.
