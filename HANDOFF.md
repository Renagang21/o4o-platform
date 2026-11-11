# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/clever-bohr-g532hw` · 코드 기준: `main` `c5da5631`(merge 반영) · 작성: 2026-11-11 (클라우드 작업 세션)
> 다음 실행자: **통합 세션(PR 생성 · 병합) → 통합 담당(아래 「결정 필요」)**
> 이전 인계 전문: `git show 0c812623:HANDOFF.md`

## 한 일 2 — WO-O4O-CORE-OWNERSHIP-AND-CHANGE-BOUNDARY-V1 (2026-11-11 사용자 지시)

IR(아래 「한 일 1」)을 바탕으로 Core 소유권 · 변경 경계를 정비했다. 실행 코드 · DB · 배포 · ruleset 변경은 없다.

1. `7c55c4ff` docs(core) — 문서
   - 새 정본 [`docs/baseline/O4O-CORE-REGISTRY-V1.md`](docs/baseline/O4O-CORE-REGISTRY-V1.md):
     - Core 의 현행 정의 · 실제 위치
     - A/B/C 등급(파일 · 모듈 단위)
     - `core-change` 라벨 · CODEOWNERS 표시 방법
     - 과거 Freeze 결정은 보존
   - 상충 정비:
     - `CLAUDE.md` §3 · `docs/baseline/core-boundary.md` 의 패키지 4개 「동결 Core」 목록을 registry 로 대체했다. `auth-core` 는 소비처 0 이다. 네 패키지는 B 등급이고 WO 규칙도 유지한다.
     - `O4O-CORE-FREEZE-V1` 상단에 현행 위치 안내 한 줄을 넣었다(본문 보존).
     - `CANONICAL-INDEX` §2 에 행을 추가했다.
     - `AGENTS.md` §5 · §7 에 registry 링크를 넣었다.
   - `docs/development/COLLABORATOR-START-HERE.md`:
     - §5-1 「일반 개발과 Core 계약 변경」을 추가했다.
     - 작업 흐름을 AGENTS.md §4-1(e)(push · 인계까지, PR 은 통합 세션)에 맞췄다.
2. `cd6aebf1` ci(core) — 자동화 · CODEOWNERS
   - `scripts/ci/core-paths.mjs`: B 경로 단일 목록(64개, 모두 실제 존재) + 판정 함수.
   - 기존 `automation-pr-overlap.yml` · `scripts/ci/pr-overlap.mjs` 를 재사용했다.
     - Ready PR 의 파일을 B 목록과 대조해 `core-change` 라벨을 달고 뗀다.
     - 표시만 하고 `CI Gate` needs 에 없다. 라벨 API 실패는 로그만 남긴다.
     - workflow 변경은 sparse-checkout 1줄 · 주석뿐이고 권한은 그대로다.
   - `.github/CODEOWNERS`:
     - 존재하지 않는 조직 팀(`@o4o-platform/*-team`)을 지정하던 내용을 걷어 냈다(GitHub 판정 Unknown owner 15건).
     - 확인된 계정(통합 담당 `@Renagang21`)만 B 경로 · `/.github/workflows/` · CODEOWNERS 자체에 지정했다.
     - 전체(`*`) 기본 소유자는 두지 않는다.
   - 회귀 테스트:
     - `scripts/ci/__tests__/core-paths.test.mjs`(신규): 형식 · 경로 존재 · CODEOWNERS 일치 · 판정.
     - `pr-overlap.test.mjs`: 라벨 추가 · 유지 · 제거 · API 실패 시 계속.
     - CI node:test 목록에 추가했다(`ci-pipeline.yml` 1줄).
   - `automation-repo-setup.yml` 라벨 목록에 `core-change` 를 추가했다(색 · 설명. 수동 실행용).

## PR 로 묶을 단위

AGENTS.md §4-1(e) 「묶음 단위」는 CI · workflow 변경을 별도 PR 로 분리한다. 이 branch 하나에 두 묶음이 있으므로, 통합 세션이 분리 여부를 정한다. 별도 branch 를 만들지 않은 이유: 세션 지정 branch 외 push 금지.

- **묶음 ① 문서**
  - `d388157e`(IR) + `7c55c4ff`(registry · 문서 정합) + 이 HANDOFF.md
- **묶음 ② CI · 설정** — §5 위험 변경 · `.github/` 라 병합은 통합 담당이 판단
  - `cd6aebf1`(core-paths · pr-overlap 라벨 · CODEOWNERS · workflow 3개)
  - ②의 테스트(`core-paths.test.mjs`)는 ①의 registry 문서 존재를 확인한다. 따라서 ①을 먼저 병합하거나 둘을 한 PR 로 낸다.

## 결정 사항 (§9)

- **CODEOWNERS 소유자:** GitHub 협업자는 `Renagang21`(admin) · `Businnect`(write) 두 계정이다. 역할 정의가 확인된 계정은 통합 담당뿐이라 `@Renagang21` 만 지정했다. `Businnect` 는 지정하지 않았다(WO: 확인되지 않은 계정 임의 등록 금지 — 소유 범위는 사용자 결정).
- **라벨 위치:** 새 workflow 를 만들지 않고 기존 PR 겹침 자동화에 붙였다.
  - 그 자동화가 이미 PR 파일 목록 · `issues: write` 권한을 가지고 있다.
  - 실행 정책(Ready 만 · fork 제외 · gate 아님)도 같다.
  - `.github/labeler.yml` 은 이를 읽는 workflow 가 없는 죽은 설정이라 쓰지 않았다(정리는 범위 밖).
- **목록 일치 강제:** `core-paths.mjs` · CODEOWNERS · registry 표가 어긋나지 않도록 테스트가 경로 존재와 CODEOWNERS 일치를 확인한다. 파일을 옮기면 테스트가 실패해 목록 갱신을 강제한다.
- **C 등급:** 분리하지 않고 B 로 관리한다(registry §3-4).

## 검증 결과

- CI 와 같은 node:test 목록 25개 파일 — 492 pass / 0 fail(신규 `core-paths.test.mjs` 5 · `pr-overlap.test.mjs` 10 포함).
- `node scripts/check-doc-sensitive.mjs` — 0건.
- `node scripts/ci/check-agent-config.mjs` — PASS.
- 바꾼 workflow 3개 YAML 파싱 — 통과.
- **GitHub CODEOWNERS 판정**(`repos/Renagang21/o4o-platform/codeowners/errors`, read-only): main **15건** → 이 branch **0건**.

## 확인하지 못한 것

- **실제 PR 에서 `core-change` 라벨이 붙는지(라이브):** 작업 세션은 PR 을 만들지 않아 확인하지 못했다.
  - 이 묶음의 PR 이 Ready 가 되면 그 PR 의 `PR Overlap Notice` 로그에 `core-change: absent` 가 나와야 한다. 이 PR 은 B 경로를 바꾸지 않는다.
  - 이후 B 경로를 바꾸는 첫 PR 에서 라벨이 붙는지 통합 세션이 확인한다.
- **라벨 자동 생성:** 저장소에 `core-change` 라벨이 아직 없다(조회 확인). 첫 부착 때 GitHub 가 만든다는 동작에 기대고 있다. 실패하면 로그에 `core-change: error` 가 남고 겹침 알림은 계속된다. 그때는 `automation-repo-setup.yml` 을 수동 실행해 라벨을 먼저 만든다(라벨 생성은 GitHub 설정 변경이라 실행하지 않았다).
- **CODEOWNERS 리뷰 요청:** PR 작성자 본인에게는 요청이 가지 않는다. 통합 세션이 통합 담당 계정으로 PR 을 만들면 리뷰 요청은 사실상 생기지 않고 라벨이 주 표시가 된다.
- **ruleset code owner review 필수화:** 변경하지 않았다(WO 제외 범위). 개인 소유 Private 저장소에서의 플랜 조건도 미확인이다.

## 결정 필요 (통합 담당 · 사용자)

1. `Businnect` 계정을 CODEOWNERS 의 어느 경로 소유자로 둘지(현재 미지정)
2. B 변경에 ruleset code owner review 를 필수로 켤지
3. IR §11 의 나머지 항목: 공동개발자 전체 읽기 허용 · `organizations` 이중 매핑 · 원장 정리 · Skill 설계 위치

## 겹칠 수 있는 열린 PR

- 조회 시점에 확인한 결과 겹치는 PR 은 없다. 통합 세션이 PR 을 만들 때 다시 확인한다.
- `scripts/ci/pr-overlap.mjs` 와 `ci-pipeline.yml` 은 CI 작업이 자주 바꾸는 파일이다.

## 문서 정합

`발견 12건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`
- 발견은 IR §5 와 같다.
- 이번 WO 에서 그중 「동결 Core」 정의 상충(CLAUDE.md §3 · core-boundary ↔ CORE-FREEZE)을 정비했다. 대체가 아니라 현행 안내를 추가했으므로 SUPERSEDED 표기는 하지 않았다.
- 나머지 11건(RBAC-FREEZE · USER-OPERATOR · NETURE-DISTRIBUTION · CHECKOUT-V2 · STORE-LAYER · APP-LMS · CONTENT-STABLE 등 경로 · 서술 drift, `.github/labeler.yml` 죽은 설정 포함)은 범위 밖이라 보고만 한다. 별도 문서 정합 WO 를 제안한다.

---

## 한 일 1 — O4O Core 중앙화 · 원격 공동개발 접근 경계 조사 (2026-11-11 사용자 지시)

이 branch 의 이전 PR Renagang21/o4o-platform#1002(배포 차단 훅 로컬 ask)는 병합됐다. 그래서 같은 branch 이름을 최신 `origin/main` 에서 다시 시작했다. 이 branch 의 PR 은 **미생성**이다(PR 은 통합 세션이 만든다 — AGENTS.md §4-1(e)).

- 새 문서 [`docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md`](docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md) 하나를 추가했다.
- 조사 전용이다. 코드 · DB · CI · 배포 · GitHub 설정과 기준 문서는 바꾸지 않았다.
- 핵심 결론:
  - 실제 Core 는 api-server 안에 있다. `packages/*-core` 는 이름과 실제가 다르고, 소비처 0 패키지가 9개다.
  - 최상위 `core/` 이동은 비권장이다.
  - Core registry 문서 + CODEOWNERS · `core-change` 라벨로 경계를 표시하는 것을 권한다. 그다음 잔재 제거와 중복 일원화를 하고, api-server `src/core/` 이동은 선택으로 둔다.
  - C(소스 분리)는 지금 하지 않고, 필요하면 프롬프트 · 정책 값의 외부화를 먼저 검토한다.

