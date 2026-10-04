---
description: 작업 시작 - 동기화, 인수인계 확인, 정비 후 작업 재개
---
작업 시작 전 동기화와 정비를 순서대로 진행해줘. 각 단계에서 문제가 생기면 다음 단계로 넘어가지 말고 멈춘 뒤 나에게 보고해.

[1단계: 동기화]
1. git status --short
   - 미커밋 변경이 있으면 멈추고 목록을 보여줘. (커밋/stash/폐기 여부는 내가 결정)
2. git branch --show-current — branch 를 전환(`git checkout` / `git switch`)하지 않는다(AGENTS.md §4-1(b)(c)).
3. 동기화 — 먼저 `git rev-parse origin/main` 으로 현재 값을 기록해 둔다(5번 요약의 시작점).
   - main(기준 checkout)이면: `git pull --ff-only origin main`. fast-forward가 안 되면 멈추고 원인을 보고해. 임의로 merge나 rebase 하지 마.
   - 작업 branch 의 전용 worktree 면: `git fetch origin` 만 한다. 그 branch 의 push 안 된 커밋 · `origin/main` 대비 ahead/behind 를 보고하고, 자동으로 merge/rebase 하지 않는다.
4. pnpm install --frozen-lockfile
   - lockfile 불일치로 실패하면 멈추고 보고해. lockfile을 임의로 수정하지 마.
5. 이번에 들어온 `origin/main` 커밋 목록을 `git log --oneline <3번에서 기록한 SHA>..origin/main` 으로 뽑아 간단히 요약해줘(범위 없는 `git log` 는 현재 HEAD 이력이라 쓰지 않는다).
6. 새 작업은 기준 checkout 에서 하지 않는다 — 3단계에서 작업을 시작할 때 최신 `origin/main` 으로 전용 worktree + branch 를 만든다(AGENTS.md §4-1(a)). 이어서 하는 작업이 기존 branch · PR 이면 그 worktree 에서 한다. 새로 만든 worktree 에는 `node_modules` 가 없으므로 그 worktree 안에서 4번 설치(필요하면 `pnpm run build:packages`)를 다시 한다 — 절차는 SETUP.md.

[2단계: 인수인계 확인과 정비]
7. HANDOFF.md를 읽어. 인수인계는 아직 merge 되지 않은 PR 에만 있을 수 있으므로 두 곳을 본다:
   - 로컬(main) 의 HANDOFF.md
   - HANDOFF.md 를 포함한 열린 PR: `gh pr list --state open --json number,headRefName,updatedAt,files --jq '.[]|select(any(.files[]; .path=="HANDOFF.md"))|"\(.number) \(.headRefName) \(.updatedAt)"'`
     → 가장 최근 것을 checkout 하지 말고 `git fetch origin <headRefName>` → `git show origin/<headRefName>:HANDOFF.md` 로 읽는다.
   둘 다 있으면 더 최근 것을 기준으로 하고 어느 쪽을 읽었는지 알려줘. 둘 다 없으면 없다고 알려주고 8~9번은 건너뛰어.
8. HANDOFF.md 항목 중 이미 완료됐거나 현재 코드와 맞지 않는 것을 git log와 실제 파일로 확인해서 정리해.
   HANDOFF · 이전 보고에 나온 PR · branch 상태는 기록 시점 값이다 — 그대로 믿지 말고 **GitHub 현재 상태를 먼저 조회**한다
   (`gh pr view <번호> --json state,mergeCommit` · `git ls-remote --heads origin <branch>`). 이미 MERGED 인 PR 을 대기 · 통합 대상으로 다시 보고하거나 merge 하려 하지 않는다.
9. 앞으로도 계속 유효한 규칙이나 결정(아키텍처, 코딩 규칙 등)이 있으면 CLAUDE.md로 옮길지 나에게 먼저 물어봐. 일회성 진행 상황은 CLAUDE.md에 넣지 마.
10. CLAUDE.md에 중복되거나 오래된 내용, 진행 상황 같은 일시적인 내용이 섞여 있으면 목록으로 보여주고 정리할지 물어봐.

[3단계: 작업 재개]
11. 이어서 할 일 목록을 우선순위대로 보여줘. 내가 확인하면 1번부터 진행해.
