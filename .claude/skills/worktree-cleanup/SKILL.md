---
name: worktree-cleanup
description: 작업공간 정리 - PR merge 후 자기 세션이 만든 worktree · branch 를 AGENTS.md §4-1(i) 절차(main 포함 · clean · 남은 일 없음 · Windows junction 해제)로 판정하고 정리한다.
---
merge 가 끝난 **자기 세션의** worktree 만 정리한다. 절차 원문은 `AGENTS.md` §4-1(i) 이며 순서를 건너뛰지 않는다. 다른 세션 · 다른 PC 의 worktree 는 판정만 보고한다.

1. `git fetch origin --prune` → PR 상태(merged) 확인 → 작업 commit 의 main 포함 확인.
   - `git log origin/main..<branch>` 가 비어 있어야 한다. squash merge 면 `git diff origin/main <branch> -- <내 작업 경로>` 가 0 이어야 한다.
2. worktree clean: 미커밋 0 · 미추적 0 · `MERGE_HEAD` / rebase 등 진행 중 operation 없음.
3. 남은 일 없음: 배포 · smoke · closure · 보존할 CHECK/log 없음 · 다른 세션 사용 없음 · 후속 작업이 그 branch 를 쓰지 않음.
4. **Windows 데스크톱이면 필수**: worktree 아래 모든 깊이의 junction / symlink(특히 `node_modules`)를 나열하고 PowerShell `[System.IO.Directory]::Delete(<path>)` 로 하나씩 해제한 뒤 재스캔 0 을 확인한다. 하나라도 남으면 삭제하지 않는다(2026-09-12 `packages/` 소스 삭제 사고). 클라우드 세션(Linux)은 이 단계를 건너뛰고 그 사실을 보고에 적는다.
5. 판정: `SAFE_TO_REMOVE` / `KEEP` / `UNCERTAIN`. 1~4 를 모두 통과한 경우만 아래를 진행한다.
6. `git worktree remove <path>` → `git worktree prune` → 기준 checkout 에서 `git status --short` 에 삭제(` D`) 항목이 없는지 확인.
7. branch 정리: main 에 포함된 로컬 branch 는 `git branch -d`. squash merge 로 `-d` 가 거절되면, 1번의 경로 diff 0 과 PR merged 를 확인했을 때만 `-D` 를 쓴다(`.claude/settings.json` 은 `-D` 를 막으므로 사용자에게 실행을 요청한다). 원격 branch 는 지우지 않는다 — 병합된 PR 의 head branch 는 저장소 설정이 자동 삭제하고, 나머지는 통합 담당이 정리한다(`AGENTS.md` §4-1(i) 7).
8. 보고: `AGENTS.md` §4-1(j) 의 `WORKTREE_DISPOSITION` 블록.
