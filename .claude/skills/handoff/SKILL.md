---
name: handoff
description: 작업 종료 - 인계 기록(HANDOFF.md) 작성 후 작업 branch 커밋·push. PR 은 만들지 않는다(통합 세션 몫)
---
작업공간을 옮기기 전에 인수인계 메모를 남겨줘. 문제가 생기면 멈추고 보고해.
작업 세션의 종료점은 로컬 검증·commit·push·인계 기록이다. PR 생성·병합·배포는 통합 세션·통합 담당만 한다(AGENTS.md §4 역할 · §4-1(e)). main 에 직접 push 하지 마.
기준 main checkout 의 branch 는 바꾸지 않는다(AGENTS.md §4-1(b)(c)).

1. 커밋할 작업공간을 정해. `git branch --show-current` 로 확인한다.
   - 작업 branch(`wo/<slug>` 등)의 전용 worktree 면 그곳에서 진행한다.
   - main(기준 checkout)이면 branch 를 전환하지 말고 전용 worktree 를 새로 만든다:
     `git fetch origin` → `WT_ROOT="$(dirname "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")")/o4o-wt"`
     → `git worktree add "$WT_ROOT/handoff-<ID>" -b wo/handoff-<ID> origin/main`
     (경로 기준 · PowerShell 형태는 AGENTS.md §4-1(a). 상대 경로 `../o4o-wt` 는 실행 위치에 따라 달라지므로 쓰지 않는다)
     (`<ID>` = `<YYYYMMDD-HHMMSS>-<PC slug>` — 같은 날 여러 세션 · PC 가 실행해도 겹치지 않게.
     PC slug = hostname 을 소문자로 바꾸고 영문 · 숫자 · `-` 외 문자는 `-` 로 바꾼 값.
     만든 이름은 `git check-ref-format --branch wo/handoff-<ID>` 로 검증하고, 실패하거나 이미 있으면 멈추고 보고해)
     이후 단계는 모두 그 worktree 에서 한다.
2. 그 작업공간 루트의 HANDOFF.md를 새로 작성해. 기존 내용은 누적하지 말고 덮어써.
   아래 항목을 간결하게 정리해:
   - 저장소 · 작업 branch · 코드 기준 commit SHA(메모 커밋 전) · 마지막 작업 일시와 작업 내용 요약
   - 완료된 것
   - 진행 중이던 것 (어느 worktree · branch · PR, 어느 파일, 어느 단계까지 했는지)
     PR이 없으면 미생성으로 명시한다(정상 — PR 은 통합 세션이 만든다). 플랫폼이 자동으로 만든 드래프트 PR 이 있으면 번호를 적는다. 기존 PR · branch 상태는 쓰기 직전에 GitHub 에서 다시 조회한 값으로 적고 조회 시각을 함께 적는다 —
     PR 은 `gh pr view <번호> --json state`, 원격 branch 존재는 `git ls-remote --heads --exit-code origin <branch>`
     (merge 후 정리로 삭제됐을 수 있다).
   - 다음에 바로 이어서 할 일 (우선순위 순서로)
   - 다음 실행자: CLOUD(클라우드 세션 · 코드) / LOCAL(데스크톱 로컬 · 운영 DB) — 운영 DB 확인이 필요한 일은 LOCAL 로 넘기고, 실행할 read-only SQL · 판정 기준이 담긴 지시서 경로를 적는다(DOCUMENT-LIFECYCLE §10-6).
   - **PR 로 묶을 단위**: 같은 주제로 한 PR 에 묶을 branch · commit 범위. CI · 배포 workflow · DB migration · 인증 · 권한 변경은 별도 묶음(AGENTS.md §4-1(e) 「묶음 단위」)
   - 통합 세션이 PR 설명으로 옮길 항목: 결정 사항(§9) · 검증 결과 · 확인하지 못한 것(배포 후 확인 항목 포함) · 겹칠 수 있는 열린 PR
   - 주의할 점, 미해결 문제, 내린 결정과 그 이유
3. CLAUDE.md에는 진행 상황을 쓰지 마. "세션 시작 시 HANDOFF.md를 먼저 읽을 것" 안내가 있는지만 확인하고, 없으면 추가해.
4. git status 로 변경 사항을 보여줘. 그 다음
   - HANDOFF.md와 이 세션에서 내가 요청해 수정한 파일만 경로를 지정해서 stage 해. git add . 이나 git add -A 는 쓰지 마.
   - 이 세션에서 수정하지 않은 변경 파일이 보이면 커밋하지 말고 목록으로 보고해.
   - 커밋 메시지는 작업 내용에 맞게 작성해.
5. git push -u origin <현재 branch>
   - 거부되면 멈추고 보고해. 임의로 force push 하지 마.
   - (다음 작업공간의 `/start` 는 PR이 없는 원격 branch의 HANDOFF.md도 읽는다.)
   - 2번에서 기록한 상태 중 이번 push로 원격 branch 존재 여부가 바뀌었다면,
     다시 조회해 HANDOFF.md 를 갱신하고 같은 branch 에 한 번 더 커밋 · push 한다.
6. PR 은 만들지 않는다(AGENTS.md §4-1(e)). `gh pr create` · `gh pr ready` · merge · auto-merge 설정을 하지 않는다.
   - 플랫폼이 push 때 드래프트 PR 을 자동으로 만들었으면 드래프트 그대로 두고, 번호를 HANDOFF.md 에 적었는지 확인한다.
   - 이 branch 의 PR 이 이미 MERGED · CLOSED 면 이 branch 에 쌓지 말고 멈춰서 보고한다(최신 origin/main 에서 새 branch — AGENTS.md §4-1(e)).
7. 저장소 · branch · 최종 push HEAD · PR 로 묶을 단위 · (있으면) 자동 생성된 드래프트 PR 번호 · 검증 결과 · 미해결 사항 · HANDOFF.md 요약을 보고해.
