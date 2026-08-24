# WO-O4O-CROSSSESSION-SAFE-COMMIT-AND-LITERAL-CONSUMER-GUARD-V1 — CHECK

> 작성일: 2026-08-24 · 기준선 HEAD: `2101d6652` · 브랜치: `main`
> 성격: 기능 개발이 아니라 **공유 main 작업 안전 절차 + 소비처 조사 규칙의 계약화**

---

## 0. 결론 요약

| 축 | 결과 |
|----|------|
| A. foreign staged WIP 오커밋 | 커밋 **전** 차단 가드 신설 (`scripts/git/check-staged-scope.mjs`) |
| B. 리터럴 소비처 누락 | 경로 기반 raw-source 탐지 가드 신설 (`scripts/quality/check-literal-consumers.mjs`) |
| 계약 테스트 | 12/12 PASS (`cross-session-safe-commit-guard.spec.ts`, 약 20s) |
| 기능 코드 수정 | **0건** (§21 준수) |
| 다른 세션 WIP | 수정·삭제·stash·restore **0건** |
| 신규 문서 | **0건** — 기존 canonical 문서 2곳에 섹션 추가 |

---

## 1. §3 사고 인구조사

| # | 사고 | 커밋 | 분류 | 실제 원인 |
|---|------|------|------|-----------|
| 1 | PharmacyHub navigation CHECK 커밋에 KPA staged 삭제 5건 혼입 | `431526533` → 정정 `edd85e248` | `STAGED_FOREIGN_WIP` + `UNSCOPED_COMMIT` | `git add <내 파일>` 은 지켰으나 **`git commit` 에 pathspec 이 없어** index 전체(다른 세션의 삭제 5건 포함)가 커밋됨 |
| 2 | AppStore 작업 중 PharmacyHub staged 삭제 혼입 | (선행 세션) | `STAGED_FOREIGN_WIP` + `UNSCOPED_COMMIT` | 동일 패턴 |
| 3 | GlobalHeader `children` 계약 제거 시 navigation.ts 소비 spec 누락 | `a0f8cc48c` | `LITERAL_CONSUMER_MISS` + `RAW_SOURCE_ASSERTION_MISS` | 소비처를 **식별자 import** 로만 조사. spec 은 `readFileSync(navigation.ts)` 로 소비하므로 import graph 에 없음 |
| 4 | 실패를 `d9ecc678a` 에 귀속 | — | `CI_ATTRIBUTION_MISS` | concurrency 로 `a0f8cc48c` 의 run 이 `cancelled` → 3커밋 뒤에 최초 관측 |

**공통 실패 패턴 2개** (blame 아님):

1. **"내가 고른 것" 과 "git 이 커밋하는 것" 의 불일치** — 규칙이 stage 단계만 좁히고 commit 단계를 비워 뒀다.
2. **"참조" 를 import 로만 정의** — 문자열로 소비하는 계약(raw-source spec)은 조사 대상 밖이었다.

---

## 2. §4 기존 규칙 감사

| 규칙 | 위치 | 판정 |
|------|------|------|
| `git add .` / `-A` / `commit -am` 금지 | git 정본 §3-4, AGENTS.md §3 | `PRESENT_DOCUMENTED_ONLY` |
| path-specific **stage** | git 정본 §3-4, CLAUDE.md §1, AGENTS.md §3 | `PRESENT_DOCUMENTED_ONLY` |
| path-specific **commit (pathspec)** | — | **`MISSING`** ← 사고 1·2 의 직접 원인 |
| 커밋 전 `git diff --cached` 확인 | — | **`MISSING`** |
| staged 파일 **소유권** 확인 | — | **`MISSING`** |
| dirty worktree 판단 기준 | git 정본 §3 | `PRESENT_DOCUMENTED_ONLY` |
| 다른 세션 WIP 불가침 | git 정본 §3-1·§3-3, AGENTS.md §3 | `PRESENT_DOCUMENTED_ONLY` |
| amend / force-push 금지 | git 정본 §3-6 | `PRESENT_DOCUMENTED_ONLY` |
| pre-commit 이 index 를 건드리지 않음 | `.husky/pre-commit` | **`PRESENT_ENFORCED`** |
| 소비처 전수 검색 | 공통모듈 프로토콜 §3 | `PRESENT_DOCUMENTED_ONLY` (import 축만) |
| raw-source assertion 소비처 | — | **`MISSING`** ← 사고 3 의 직접 원인 |
| CI 실패 귀속 규칙 | — | **`MISSING`** ← 사고 4 |

`CONTRADICTORY` 판정 0건. 중복 문서를 만들지 않고 **기존 canonical 2곳**에만 섹션을 추가했다.

---

## 3. 확정한 계약

### 3-1. Safe Commit — `docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md` §6

> foreign staged 파일이 존재하는 상태에서 **pathspec 없는 `git commit` 실행 금지.**

- §6-1 시작 기준선(`git status --short` · `branch` · `rev-parse HEAD`) — 기존 변경을 내 것으로 간주하지 않는다
- §6-2 커밋 직전 `git diff --cached --name-only` + 가드
- §6-3 표준형 `git add -- <files>` → `git commit -m "..." -- <files>`
- §6-4 커밋 직후 `git show --stat` + 기준선 delta (병렬 커밋 유입 시 tree delta 별도 확인)
- §6-5 사고 시 forward-only 복구 (금지: dirty pull/rebase · `reset --hard` · 남의 WIP stash · force push · amend)
- §6-6 push 거절 시 우선순위 1~5

### 3-2. CI 실패 귀속 — 같은 문서 §7

`CURRENT_COMMIT_CAUSED` / `EARLIER_COMMIT_SURFACED_LATE` / `PREEXISTING` / `UNRELATED_PARALLEL_CHANGE` / `UNKNOWN`
+ 추정 금지, 3가지 증명 방법 중 하나 필수.

### 3-3. 리터럴 소비처 인구조사 — `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md` §3-A

4축(symbol / endpoint / href·route / raw-source), raw-source 표지 목록, 최소 검색 집합 8항목, 분류 8종.
**`ACTIVE_TEST_CONTRACT` · `RAW_SOURCE_CONTRACT` 는 실제 소비처로 센다.**

**결정적 규칙**: raw-source spec 은 단언 값을 template literal 로 조립하므로 값 리터럴 검색으로는 안 걸린다.
→ **수정 대상 파일의 경로 문자열**을 반드시 함께 검색한다.

---

## 4. §16 가드 구현 (읽기 전용)

| 스크립트 | 하는 일 | 안전성 |
|----------|---------|--------|
| `scripts/git/check-staged-scope.mjs <허용경로...>` | staged `name-status` 와 허용경로의 차집합이 0 이 아니면 exit 1, 삭제는 별도 경고 | index·worktree·stash **미변경**. 테스트는 `O4O_STAGED_NAME_STATUS` 주입 |
| `scripts/quality/check-literal-consumers.mjs "<리터럴>" [--source <경로>]` | `git grep -F` 전수 → 8종 분류. `--source` 는 경로 조각(2~4 segment) 자동 생성 | 읽기 전용. 기본 exit 0(인구조사), `--fail-on-consumers` 로 게이트 가능 |

package.json: `check:staged-scope` · `check:literal-consumers` 추가 (의존성 변경 0).

**의도적으로 하지 않은 것**: git wrapper · 커밋 대체 프레임워크 · daemon · 신규 CI job.
CI 시간 증가는 계약 테스트 1개(약 20s)뿐이다.

---

## 5. §18 계약 테스트 — 12/12 PASS

`apps/api-server/src/__tests__/cross-session-safe-commit-guard.spec.ts`

| # | 케이스 | 기대 | 결과 |
|---|--------|------|------|
| 1 | 내 파일만 staged | PASS | PASS |
| 2 | 허용 경로 다중(디렉터리 prefix + 파일 정확일치) | PASS | PASS |
| 3 | 범위 밖 staged 수정 | exit 1 | PASS |
| 4 | 범위 밖 staged 삭제 | exit 1 + 삭제 경고 | PASS |
| 5 | `431526533` 재현(내 문서 1 + KPA 삭제 5) | exit 1, 5건 전부 지목 | PASS |
| 6 | 허용 경로 미지정 | exit 2 | PASS |
| 7 | staged 없음 | exit 0 | PASS |
| 8 | 가드 실행 전후 index 동일 | 동일 | PASS |
| 9 | `--source navigation.ts` → raw-source spec 검출 | `RAW_SOURCE_CONTRACT` | PASS |
| 10 | href 리터럴 → 진입 UI 분류 | `ACTIVE_UI` | PASS |
| 11 | 없는 리터럴 | `DEAD_REFERENCE` | PASS |
| 12 | 인자 없음 | exit 2 | PASS |

**실제 main index 는 테스트 과정에서 변경되지 않는다** — staged 목록을 환경변수로 주입한다.

---

## 6. §19 실제 worktree dry-run (파괴적 동작 0)

시작 시점 worktree 에 다른 세션 WIP 다수(`services/web-neture/src/pages/admin/ai/**`,
`packages/operator-core-ui/src/modules/resources/**`, `services/web-pharmacy-hub/**` 등,
미추적 파일 4건, 미스테이지 삭제 1건) 존재.

```text
git add -- <내 파일 8건>
node scripts/git/check-staged-scope.mjs <내 경로들>
→ staged 8건이 모두 이번 작업 범위 안입니다. (exit 0)
```

다른 세션 파일에 대한 stage·수정·삭제·stash·restore **0건**. 저장소 상태 변화 = 내 파일 stage 뿐.

---

## 7. §20 과거 사고 역검증

### 7-1. `431526533` (staged 삭제 5건 혼입)

계약 테스트 #5 가 그 index 상태를 그대로 재현한다. 가드는 **커밋 전에** exit 1 로 차단하며
`services/web-kpa-society/src/` 의 `components/ServiceBanner.tsx` ·
`components/platform/PlatformFooter.tsx` · `components/platform/PlatformHeader.tsx` ·
`components/platform/ServiceCard.tsx` · `pages/mypage/AnnualReportFormPage.tsx` 5건을 모두 지목한다.

### 7-2. `a0f8cc48c` (navigation.ts 소비 spec 누락)

`a0f8cc48c^` 시점 실측:

- 값 리터럴 `href: '/forum/request'` 검색 → **spec 이 나오지 않는다** (spec 은 template literal 로 조립)
- 경로 리터럴 `config/navigation.ts` 검색 → **raw-source spec 4건 검출**
  - `apps/api-server/src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts:24`
  - `apps/api-server/src/__tests__/pharmacy-hub-content-resource-adoption.spec.ts:24`
  - `apps/api-server/src/__tests__/pharmacy-hub-lms-learner-adoption.spec.ts:31`
  - `packages/shared-space-ui/src/guide/__tests__/guideServiceIntro.test.tsx:218`

즉 `--source` 축이 있었다면 사고 3 은 발생하지 않았다. 이 실측이 §3-A-2 "결정적 규칙" 의 근거다.

---

## 8. §14 CI 귀속 재판정 (사고 4)

| 항목 | 값 |
|------|-----|
| 도입 커밋 | `a0f8cc48c` (자체 run `cancelled`) |
| 최초 관측 커밋 | `d9ecc678a` (run `32488018335`) |
| 판정 | `EARLIER_COMMIT_SURFACED_LATE` |
| 해소 | `26d0d2ed8` |

---

## 9. 변경 파일

| 파일 | 성격 |
|------|------|
| `scripts/git/check-staged-scope.mjs` | 신규 (읽기 전용 가드) |
| `scripts/quality/check-literal-consumers.mjs` | 신규 (읽기 전용 인구조사) |
| `apps/api-server/src/__tests__/cross-session-safe-commit-guard.spec.ts` | 신규 (절차 계약 테스트) |
| `docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md` | §6·§7 추가 |
| `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md` | §3-A 추가 |
| `CLAUDE.md` | §1 Safe Commit 4줄 + 공통모듈 리터럴 조사 3줄 |
| `AGENTS.md` | §3 pathspec 커밋 2줄 |
| `package.json` | scripts 2개 (의존성 무변경) |

**기능 코드 · route · API · DB 변경 0건.**

---

## 10. §22 중지 조건 점검

| 조건 | 상태 |
|------|------|
| 기존 hook 과 충돌 | 없음 — pre-commit 미수정, 가드는 hook 이 아니라 명시 실행 |
| Windows/WSL/Linux 호환 | node 내장 API + `execFile('git')` 만 사용. 역슬래시 리터럴을 소스에 두지 않음 |
| 가드가 남의 index 를 바꿈 | 없음 — 계약 테스트 #8 로 고정 |
| pathspec 커밋 동작 이상 | 없음 |
| CI 시간 증가 | 계약 테스트 1개 약 20s |
| false positive 과다 | 가드는 허용 경로를 명시 입력받으므로 구조적으로 발생하지 않음 |

중지 사유 없음 → 축소 없이 완전 이행.

---

## 11. 남은 한계 (정직 기록)

1. `check-literal-consumers` 의 분류는 **경로·표지 기반 휴리스틱**이다. 판정 근거이지 판정 자체가 아니다.
2. `--source` 는 경로를 2~4 segment 조각으로 검색한다. spec 이 경로를 더 잘게 쪼개 조립하면 놓칠 수 있다.
3. 가드는 **명시 실행**이다. hook 강제는 pre-commit 의 "index 불가침" FROZEN 계약과 충돌 위험이 있어 채택하지 않았다.
4. `git grep` 은 추적 파일만 본다. 미추적 신규 소비처는 잡히지 않는다.

---

## 12. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
