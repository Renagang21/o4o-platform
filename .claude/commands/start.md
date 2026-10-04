---
description: 작업 시작 - 동기화, 인수인계 확인, 정비 후 작업 재개
---
작업 시작 전 동기화와 정비를 순서대로 진행해줘. 각 단계에서 문제가 생기면 다음 단계로 넘어가지 말고 멈춘 뒤 나에게 보고해.

[1단계: 동기화]
1. git status --short
   - 미커밋 변경이 있으면 멈추고 목록을 보여줘. (커밋/stash/폐기 여부는 내가 결정)
2. git branch --show-current
   - main이 아니면 현재 브랜치 이름을 알려주고, 그 브랜치에 push 안 된 커밋이 있는지 확인해서 보고한 뒤 진행해.
3. git checkout main
4. git pull --ff-only origin main
   - fast-forward가 안 되면 멈추고 원인을 보고해. 임의로 merge나 rebase 하지 마.
5. pnpm install --frozen-lockfile
   - lockfile 불일치로 실패하면 멈추고 보고해. lockfile을 임의로 수정하지 마.
6. 이번 pull로 들어온 커밋 목록(git log --oneline)을 간단히 요약해줘.

[2단계: 인수인계 확인과 정비]
7. HANDOFF.md를 읽어. 인수인계는 아직 merge 되지 않은 PR 에만 있을 수 있으므로 두 곳을 본다:
   - 로컬(main) 의 HANDOFF.md
   - HANDOFF.md 를 포함한 열린 PR: `gh pr list --state open --json number,headRefName,updatedAt,files --jq '.[]|select(any(.files[]; .path=="HANDOFF.md"))|"\(.number) \(.headRefName) \(.updatedAt)"'`
     → 가장 최근 것을 checkout 하지 말고 `git fetch origin <headRefName>` → `git show origin/<headRefName>:HANDOFF.md` 로 읽는다.
   둘 다 있으면 더 최근 것을 기준으로 하고 어느 쪽을 읽었는지 알려줘. 둘 다 없으면 없다고 알려주고 8~9번은 건너뛰어.
8. HANDOFF.md 항목 중 이미 완료됐거나 현재 코드와 맞지 않는 것을 git log와 실제 파일로 확인해서 정리해.
9. 앞으로도 계속 유효한 규칙이나 결정(아키텍처, 코딩 규칙 등)이 있으면 CLAUDE.md로 옮길지 나에게 먼저 물어봐. 일회성 진행 상황은 CLAUDE.md에 넣지 마.
10. CLAUDE.md에 중복되거나 오래된 내용, 진행 상황 같은 일시적인 내용이 섞여 있으면 목록으로 보여주고 정리할지 물어봐.

[3단계: 작업 재개]
11. 이어서 할 일 목록을 우선순위대로 보여줘. 내가 확인하면 1번부터 진행해.
