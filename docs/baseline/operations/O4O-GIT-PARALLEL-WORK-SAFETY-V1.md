# O4O Git 병렬 작업 안전 기준 V1

> WO-O4O-GIT-PARALLEL-WORK-SAFETY-CLEANUP-V1 (2026-08-07)
>
> 대상: 다중 PC · 다중 세션(사람 + AI)이 **같은 `main` 브랜치에 직접 커밋**하는 현재 운영 방식.
> 브랜치 전략 · PR 의무화 · worktree 도입은 이 문서의 범위가 아니다(CLAUDE.md §1 유지).

---

## 1. 문제

`main` 직접 작업 자체는 유지한다. 실제로 사고가 나는 지점은 브랜치 전략이 아니라
**"내가 고르지 않은 변경이 내 커밋에 섞이는 것"** 이다. 발생 경로는 두 가지다.

| 경로 | 내용 |
|------|------|
| 자동화가 stage 를 건드림 | hook 이 `git add` 를 수행 → 다른 세션의 변경이 함께 커밋 |
| 광범위 stage | `git add .` / `git add -A` / `git commit -am` → 작업트리 전체가 커밋 |

---

## 2. pre-commit 계약 (FROZEN)

> **pre-commit 은 사용자가 stage 하지 않은 파일을 수정하거나 자동 stage 하지 않는다.**

`.husky/pre-commit` 은 **검증만** 한다.

- `package.json` 의 **의존성 필드**(`dependencies` · `devDependencies` · `optionalDependencies` ·
  `peerDependencies` · `resolutions` · `pnpm.overrides`)가 바뀌었는데 `pnpm-lock.yaml` 이
  함께 stage 되지 않으면 **커밋을 중지**하고 수동 절차를 안내한다.
- `scripts` · `version` 등 의존성과 무관한 변경은 통과시킨다.
- `pnpm install` 을 실행하지 않고, `git add` 도 하지 않는다. 워킹트리와 index 를 건드리지 않는다.

근거: CI `ci-appstore-guard` 는 `pnpm install --frozen-lockfile` 로 설치하므로
lockfile 이 어긋난 채 push 되면 실패한다. 즉 lockfile 동기화 요구 자체는 실재하는 계약이고,
바꾼 것은 **"자동 동기화" → "검증 + 수동 절차"** 뿐이다.

의존성과 무관하다고 확신하면 `--no-verify` 로 우회할 수 있다.

---

## 3. 병렬 세션 안전장치

| # | 규칙 | 이유 |
|---|------|------|
| 1 | **다른 세션의 수정·미추적 파일 불가침** | 소유자가 아닌 변경을 판단·커밋하지 않는다 |
| 2 | **dirty 상태에서 pull 금지** | rebase/merge 가 남의 변경을 끌어들이거나 충돌로 훼손한다 |
| 3 | **임의 `stash` / `reset` / `restore` 금지** | 다른 세션의 진행 중 작업을 되돌린다 |
| 4 | **path-specific stage** | `git add <경로>` 만 사용. `git add .` · `git add -A` · `git commit -am` 금지 |
| 5 | **push 전 `origin/main` 이동 확인** | `git fetch origin` → `git status -sb` 로 divergence 확인 후 push |
| 6 | **`--force` push 금지** | 공유 `main` 의 이력은 재작성하지 않는다(오타 정정도 후속 커밋으로) |

**작업트리가 dirty 하다는 사실만으로는 중지 사유가 아니다.**
중지 사유는 다음 셋뿐이다.

- 내 작업 경로와 다른 세션의 변경 경로가 **충돌**
- 변경의 **소유자가 불명**
- 개별 stage 가 **불가능**한 형태(같은 파일에 두 작업이 섞임)

**완료 조건**은 저장소 전체 clean 이 아니라
`이번 WO 범위의 미커밋 변경 0건` + `HEAD == origin/main` 이다.

---

## 4. PC 이동 기준

다른 PC 로 옮기기 전 아래 5개를 모두 만족해야 한다.

```text
[ ] 현재 브랜치가 main
[ ] HEAD == origin/main            (git fetch origin && git status -sb)
[ ] 추적 파일 clean                (git status --short 에 M/D/R 없음)
[ ] 로컬 전용 commit 없음          (git log origin/main..HEAD 가 비어 있음)
[ ] 현재 작업에 필요한 미추적 파일 없음
```

마지막 항목이 핵심이다. 미추적 파일은 push 되지 않으므로,
다음 PC 에서 이어서 쓸 파일이 남아 있으면 **먼저 커밋하거나 명시적으로 포기**해야 한다.

### stash

기존 stash 는 **자동으로 삭제하지 않는다.** 현재 6건이 남아 있으며 대부분
이미 병합된 feature 브랜치 시절의 WIP 다. 소유·내용 확인 후 개별 판단이 필요하므로
별도 작업으로 다룬다(본 WO 제외 범위).

---

## 5. 이 문서가 바꾸지 않은 것

- 브랜치 전략(`main` 직접 작업 유지) · PR 의무화 · worktree
- CI 워크플로 · dependency · lockfile
- `CLAUDE.md` · `AGENTS.md` (§6·§7 은 이후 WO-O4O-CROSSSESSION-SAFE-COMMIT-AND-LITERAL-CONSUMER-GUARD-V1 에서 한 줄씩 참조만 추가했다)
- 기존 stash 6건

---

## 6. Safe Commit 계약 (WO-O4O-CROSSSESSION-SAFE-COMMIT-AND-LITERAL-CONSUMER-GUARD-V1)

§3 규칙 4 는 **stage** 만 좁혔다. 실제 사고(`431526533`)는 stage 가 아니라 **commit** 에서 났다.
`git add <내 파일>` 을 지켰어도, index 에 다른 세션이 올려둔 삭제 5건이 남아 있는 상태에서
pathspec 없는 `git commit` 을 실행하면 **index 전체가 커밋된다.**

> **핵심 계약: foreign staged 파일이 존재하는 상태에서 pathspec 없는 `git commit` 실행 금지.**
> `git add .` 만 금지하는 것으로는 이 사고를 막지 못한다.

### 6-1. 작업 시작 시 (소유권 기준선)

```bash
git status --short          # 이미 있는 변경 = 내 것이 아니다
git branch --show-current
git rev-parse HEAD          # 완료 후 delta 비교의 기준선
```

기존 변경을 **내 변경으로 간주하지 않는다.** 시작 시점의 목록이 소유권 판정 기준이다.

### 6-2. 커밋 직전 (필수)

```bash
git diff --cached --name-only
node scripts/git/check-staged-scope.mjs <내 작업 경로...>
```

가드는 **읽기 전용**이다. index · worktree · stash 를 건드리지 않는다.
차집합이 0 이 아니면 exit 1 이며, 그 상태에서 일반 커밋은 금지다.

### 6-3. 커밋 표준형

```bash
git add -- <내 파일...>
git commit -m "..." -- <내 파일...>     # pathspec 을 반드시 붙인다
```

pathspec 을 붙인 커밋은 index 상태와 무관하게 지정한 경로만 커밋한다.

### 6-4. 커밋 직후 범위 검증

```bash
git show --stat --oneline HEAD
git diff --name-status <6-1 의 기준 HEAD>..HEAD
```

확인 항목: 내 작업 외 파일 0 / foreign deletion 0 / 예상 밖 수정 0.
병렬 세션의 커밋이 그 사이에 들어왔다면 기준선 delta 에는 남의 커밋도 섞이므로,
**해당 커밋 자체의 tree delta(`git show --stat`)** 를 함께 본다.

### 6-5. 사고 발생 시 (forward-only)

이미 잘못 커밋·push 했다면 **되돌리는 방향이 아니라 앞으로 고친다.**

1. `git checkout <직전 정상 SHA> -- <잘못 삭제/변경된 경로...>`
2. `git commit -m "revert(...): ..." -- <그 경로...>`
3. push

금지: dirty 공유 worktree 에서 무작정 `pull`/`rebase` · foreign staged WIP 가 있는 상태의
`reset --hard` · 남의 WIP 를 `stash` 로 옮기기 · `--force` push · 공유 main 에서 `amend`.
`commit-tree` 같은 plumbing 을 썼다면 보고에 명시한다(일반 기본 절차로 만들지 않는다).

### 6-6. push 거절 시 우선순위

```text
1) git fetch origin  → 무엇이 들어왔는지 확인 (log/diff)
2) 내 커밋이 이미 ancestor 인지 확인 (git merge-base --is-ancestor)
3) 작업트리가 clean 이면 pull --ff-only 또는 rebase
4) dirty 면 pull 하지 않고, 내 커밋만 pathspec 으로 재정리
5) 그래도 막히면 중지하고 보고 — force push 는 선택지가 아니다
```

---

## 7. CI 실패 귀속 (concurrency)

GitHub Actions concurrency 는 앞선 커밋의 run 을 취소한다. 따라서
**실패를 처음 "관측한" SHA 와 실패를 "도입한" SHA 는 다를 수 있다.**

판정 라벨: `CURRENT_COMMIT_CAUSED` / `EARLIER_COMMIT_SURFACED_LATE` / `PREEXISTING` /
`UNRELATED_PARALLEL_CHANGE` / `UNKNOWN`.

> "다른 세션 문제 같다" 는 추정은 허용하지 않는다. 다음 중 하나로 증명한다.
> - 해당 커밋 이전 SHA 에서 같은 테스트를 실행해 결과 비교
> - 취소된(cancelled) run 목록을 확인해 최초 도입 지점을 특정
> - 실패 파일이 내 변경 경로와 무관함을 diff 로 제시
