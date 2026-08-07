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
- `CLAUDE.md` · `AGENTS.md`
- 기존 stash 6건
