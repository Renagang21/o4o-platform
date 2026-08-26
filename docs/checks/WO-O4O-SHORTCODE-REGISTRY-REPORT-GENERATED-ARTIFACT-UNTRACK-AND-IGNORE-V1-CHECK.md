# WO-O4O-SHORTCODE-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1 — CHECK

- **일자**: 2026-08-26
- **대상**: `scripts/audit/shortcode-registry-report.json`
- **최종 판정**: **`GENERATED_ARTIFACT_UNTRACK`**
- **기준선**: `HEAD == origin/main == 2184053ba` · 시작 시 worktree clean

---

## 1. 최종 판정

```text
GENERATED_ARTIFACT_UNTRACK      ← 채택
KEEP_TRACKED_CANONICAL_OUTPUT   ← 기각 (snapshot/fixture 계약 없음)
MOVE_TO_FIXTURE                 ← 기각 (fixture 소비자 0)
UNKNOWN                         ← 0
```

이번 WO 는 **검증 도구를 없애지 않는다.** `check-shortcode-registry.ts` 와
`verify:shortcodes` 는 그대로 살아 있고, 환경마다 달라지는 **생성 결과만** Git 추적에서 뺐다.

---

## 2. Report 생성 경로 (§4)

| 항목 | 값 |
|---|---|
| 생성 주체 | `scripts/audit/check-shortcode-registry.ts:316` |
| 출력 경로 | `path.join(__dirname, 'shortcode-registry-report.json')` |
| 쓰기 방식 | `fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))` — 실행할 때마다 **무조건 overwrite** |
| 입력 source | `apps/admin-dashboard/src/components/shortcodes` · `packages/shortcodes/src` 파일시스템 스캔 |
| 절대경로 원인 | `findFilesRecursive()` 가 `path.join(projectRoot, ...)` 결과를 `filePath` 에 **relative 변환 없이** 저장 |
| 환경 의존 필드 | `timestamp` (`new Date().toISOString()`) · `foundComponents[].filePath` |

**판정: `ENVIRONMENT_DEPENDENT_ARTIFACT`**

---

## 3. Tracked 상태 역사 (§5)

```text
d0d8fc6dd  feat(audit): Add Block & Shortcode Registry integrity audit tools (R-1-3)
           → 도구(.ts) + 산출물(.json) 이 한 커밋에 같이 들어옴 (643 줄)
c2287c7e4  chore(main-site): 잔여 orphan dependency 정리 및 은퇴 shortcode 경로 참조 제거
           → 재생성 결과가 그대로 커밋됨 (+195 / -474)
```

리뷰용 snapshot 이라는 명시적 의도나 CI artifact 계약은 어디에도 없다. 도구를 커밋할 때
실행 결과가 딸려 들어온 형태다.

**판정: `ACCIDENTALLY_TRACKED`**

선행 WO 가 이미 후속을 제안해 두었다 —
`docs/checks/WO-O4O-MAIN-SITE-RESIDUAL-DEPENDENCY-AND-DEAD-SCRIPT-CLEANUP-V1-CHECK.md:409`
*(별도 WO 제안 = `scripts/audit/shortcode-registry-report.json` 의 tracked 해제)*.
본 WO 가 그 후속이다.

---

## 4. Consumer Census (§6)

`git grep` 전수 (worktree clean → 미추적 소비자 0, tracked census 로 전수 성립).

| # | 위치 | 판정 |
|---|---|---|
| 1 | `scripts/audit/check-shortcode-registry.ts:316` | `GENERATOR_SELF_REFERENCE` |
| 2 | `apps/api-server/src/__tests__/main-site-residual-dependency-cleanup.spec.ts:187` | **조건부 기회적 검사** — 아래 4-1 |
| 3 | `scripts/audit/README.md:25,38` | `DOC_ONLY` (생성 산출물로 설명) |
| 4 | `scripts/audit/REGISTRY_AUDIT_REPORT.md:46` | `DOC_ONLY` — "Generated Reports" 항목 |
| 5 | `docs/checks/…MAIN-SITE-RESIDUAL-DEPENDENCY…-CHECK.md:219,387,409` | `HISTORICAL` (기록물 · CLAUDE.md §16-1 대상 아님) |
| 6 | `docs/checks/…MAIN-SITE-RESIDUAL-ORPHAN-AXIS-CENSUS…-CHECK.md:343` | `HISTORICAL` |

```text
ACTIVE_RUNTIME_CONSUMER  0
ACTIVE_TEST_FIXTURE      0
CI_CONSUMER              0
UNKNOWN                  0
```

### 4-1. test 참조가 fixture 가 아닌 근거

```ts
it('감사 산출물에도 은퇴 경로가 남아 있지 않다', () => {
  const report = path.join(REPO_ROOT, 'scripts', 'audit', 'shortcode-registry-report.json');
  if (!fs.existsSync(report)) return;      // ← 부재를 명시적으로 허용
  expect(fs.readFileSync(report, 'utf-8')).not.toContain('main-site');
});
```

파일이 없으면 early return 한다. **fixture 계약이 아니라 있으면 덤으로 보는 검사**이므로
§21 의 "test fixture consumer 발견" 중지 조건에 해당하지 않는다.

또한 이 검사의 실질적 방어는 바로 앞 두 테스트(**source** 스크립트에 은퇴 경로가 없음)가
이미 담당한다. report 는 그 source 에서 파생될 뿐이므로 커버리지 손실이 없다.
→ 실측: 해당 spec **30/30 PASS** (파일 부재 상태에서).

---

## 5. 절대경로 · 환경 종속성 실측 (§8)

| 항목 | 값 |
|---|---|
| 절대경로 필드 수 | **65** (`foundComponents[].filePath`) |
| unique root | **1** |
| tracked 사본의 root | `C:\Users\home\coding\o4o-platform\...` (**다른 머신**) |
| 본 검증 머신 root | `C:\Users\sohae\o4o-platform\...` |
| POSIX 절대경로(`/home`, `/Users`) | 0 |
| 민감정보 | 없음 (경로 외 사용자 데이터·자격정보 0) |

**교차 환경 실측** — 코드 변경 0 상태에서 스크립트만 재실행:

```text
scripts/audit/shortcode-registry-report.json | 132 +++++-----
1 file changed, 66 insertions(+), 66 deletions(-)     ← 65 filePath + 1 timestamp
```

**동일 환경 2회 실행 비교 (§12):**

```text
run1 vs run2                   → timestamp 1 줄만 상이
run1 vs run2 (timestamp 제외)  → identical
```

**판정: `ENVIRONMENT_LEAK` + `NONDETERMINISTIC`(timestamp)**
정렬·순서 불안정성은 없다. generator canonicalization 은 이번 WO 범위 밖(§12) — 후속 후보.

---

## 6. `.gitignore` 계약 (§9)

- 변경 전 `git check-ignore -v` → **rc=1** (기존 규칙 매칭 0)
- 기존 generated-output 선례 재사용: `# Verification script outputs (… reproducible by re-running the script)` / `scripts/verify/output/`

추가 규칙 (root `.gitignore`, +6 줄 · 순수 additive):

```gitignore
# Shortcode registry audit output (WO-…-UNTRACK-AND-IGNORE-V1)
#   check-shortcode-registry.ts 가 실행 머신의 절대경로(filePath)와 timestamp 를
#   그대로 기록하는 생성 산출물이라 환경마다 diff 가 난다. 감사 도구 자체는 유지하고
#   결과 파일만 추적에서 뺀다 — 필요하면 스크립트를 다시 실행해 로컬에서 재생성한다.
/scripts/audit/shortcode-registry-report.json
```

**과매칭 없음 (§21 검증):**

```text
tracked 파일 중 새 규칙에 걸리는 것         0 건
sibling block-registry-report.json 매칭    없음 (범위 밖 · 그대로 tracked 유지)
광범위 *.json ignore                       사용 안 함
```

---

## 7. 조치 (§11)

```text
git rm scripts/audit/shortcode-registry-report.json   ← index + worktree 제거
.gitignore 규칙 추가                                   ← 정확한 anchored 경로
generator 유지                                         ← 기능 제거 아님
```

repo 에 생성 결과를 보존하지 않는다. 필요하면 스크립트가 로컬에서 다시 만든다.

---

## 8. 검증 결과

### 8-1. Git tracked 여부 (§15)

```bash
$ git ls-files scripts/audit/shortcode-registry-report.json
(출력 없음)                                    ← PASS

$ git check-ignore -v scripts/audit/shortcode-registry-report.json
.gitignore:151:/scripts/audit/shortcode-registry-report.json	scripts/audit/shortcode-registry-report.json
                                               ← 기대 규칙 정확 매칭 PASS
```

### 8-2. Script 실행 (§16)

| 명령 | 결과 |
|---|---|
| `npx tsx scripts/verify-shortcodes.ts` (= `verify:shortcodes`) | **exit 0 · VERIFICATION PASSED** |
| `npx tsx scripts/audit/check-shortcode-registry.ts` | exit 1 · report 정상 재생성 (12,983 B) |

> audit exit 1 은 **선행 상태**다 — `totalMissing 32` / `totalDangling 2`.
> 본 WO 이전에도 동일했고 어떤 CI gate 에도 연결돼 있지 않다. 이번 변경과 무관.

### 8-3. Repository Cleanliness (§17)

스크립트 실행 **전/후** `git status --short` 완전 동일:

```text
 M .gitignore
 M scripts/audit/README.md
D  scripts/audit/shortcode-registry-report.json      ← 본 WO 의 staged 삭제
?? apps/api-server/src/__tests__/shortcode-registry-report-untrack.spec.ts
```

재생성된 report 는 `--untracked-files=all` 에서도 나타나지 않는다.
**generated report 때문에 dirty worktree 가 되지 않음 — PASS**

### 8-4. 테스트 (§14)

신규 계약 테스트: `apps/api-server/src/__tests__/shortcode-registry-report-untrack.spec.ts`

```text
생성 산출물 report 는 Git 에 추적하지 않는다
  √ .gitignore 가 정확한 경로 규칙을 갖는다
  √ ignore 규칙이 광범위한 *.json 패턴이 아니다
  √ sibling block-registry-report.json 까지 함께 무시하지 않는다
  git tracking 상태
    √ report 가 tracked 목록에 없다
    √ report 경로가 .gitignore 의 해당 규칙에 걸린다
감사 도구와 verify 체인은 그대로 유지한다
  √ check-shortcode-registry.ts 가 존재한다
  √ 감사 스크립트가 report 를 계속 생성한다 (기능 제거가 아니라 추적 해제다)
  √ 감사 스크립트가 살아 있는 shortcode 도메인을 계속 검사한다
  √ verify:shortcodes · verify:registry 가 살아 있다
  √ packages/shortcodes active contract 가 유지된다

Tests: 10 passed, 10 total
```

기존 spec 회귀: `main-site-residual-dependency-cleanup.spec.ts` → **30 passed, 30 total**

> git 계약 검사는 `git rev-parse --is-inside-work-tree` 로 실제 checkout 을 확인한 뒤에만
> 실행한다(`describe.skip` fallback). git 이 없는 환경에서는 `.gitignore` · generator
> 계약 테스트가 대신 고정한다. 저장소 내 test 에서 git 을 호출하는 첫 사례라 방어적으로 작성했다.

---

## 9. CI 영향 (§18)

```text
CI consumer                        0   (.github/** 에 scripts/audit · verify:registry 참조 0)
tracked report 를 읽는 CI          0
report 를 upload-artifact 하는 CI  0   (3개 upload 스텝 모두 scripts/audit 무관)
required check 영향                0
verify:shortcodes 체인             유지 (verify:registry → verify:shortcodes 그대로)
```

`scripts/audit/README.md` 의 `registry-check.yml` YAML 은 **문서 예시**이며 실제 워크플로
파일은 존재하지 않는다. 예시조차 스크립트를 실행할 뿐 report 를 읽지 않는다.

---

## 10. Production 영향 (§19)

```text
production runtime impact  0
DB change                  0
migration                  0
production write           0
```

runtime code · DB 변경이 아니므로 production smoke 불필요.

---

## 11. DEAD_REFERENCE · UNKNOWN

```text
DEAD_REFERENCE  0
UNKNOWN         0
```

남은 참조는 전부 유효하다 — generator self-reference(파일을 만드는 주체),
DOC_ONLY(생성 산출물로 서술 · 여전히 사실), 조건부 test(부재 허용),
HISTORICAL 기록물(과거 시점 사실).

---

## 12. 문서 변경 (§13)

| 문서 | 조치 |
|---|---|
| `scripts/audit/README.md` | "generated locally and git-ignored / re-run to recreate" 3 줄 추가 (최소 수정) |
| `scripts/audit/REGISTRY_AUDIT_REPORT.md` | **미변경** — R-1-3 시점 감사 findings 기록물 |
| `docs/checks/**` | **미변경** — 기록물 (CLAUDE.md §16-1) |

현재형 문서 중 report 를 **열거하거나 commit 하라고 지시하는** 곳은 없었다.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건**
(별도 WO 제안 = 아래 후속 후보 1번)

---

## 13. 후속 후보

1. **`scripts/audit/block-registry-report.json`** — 동일한 generated-artifact 문제로 보이나
   본 WO 범위(§1) 밖이라 **손대지 않았다**. `check-block-registry.ts:275` 가 같은 방식으로
   생성한다. 동일 판정 절차를 별도 WO 로 적용할 후보.
2. **generator canonicalization** — `filePath` 를 `path.relative(projectRoot, …)` 로 저장하고
   `timestamp` 를 옵션화하면 산출물이 결정적이 된다. §12 가 이번 범위에서 제외했다.
3. `scripts/audit/README.md` · `REGISTRY_AUDIT_REPORT.md` 의 커버리지 수치(61/16 등)가
   현재 실측(33/3)과 다르다. 기록 성격 판단이 필요해 이번에 건드리지 않았다.

---

## 14. Safe Commit (§20)

```text
autostash                          0
pull / rebase                      0 (HEAD == origin/main, 분기 없음 → 임시 worktree 불필요)
foreign staged/unstaged 상태 변경  0
git add .                          미사용 (4 개 경로 명시 stage)
staged scope guard                 범위 밖 1건 검출 → pathspec 커밋으로 회피
path-specific commit               적용
commit 자체 delta 검증              PASS
```

### 14-1. 작업 중 병렬 세션 진입 (실측 기록)

시작 시점 worktree 는 clean 이었으나, **작업 도중** 다른 세션의 변경이 나타났다.

```text
A  docs/checks/CHECK-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1.md
   → foreign STAGED (그 세션이 직접 index 에 올림)
 M apps/api-server/src/bootstrap/register-routes.ts
   → foreign UNSTAGED
```

`node scripts/git/check-staged-scope.mjs` 가 범위 밖 staged 1건을 정확히 검출했다.

조치 — 둘 다 **손대지 않았다**:

```text
stash / reset / restore / unstage    0 회
pathspec 없는 git commit             실행 안 함
git commit -m "..." -- <내 파일 5>   ← 이 형태로만 커밋
```

foreign staged 파일을 index 에 **그대로 둔 채** pathspec 커밋했으므로,
커밋 후 `git show --name-status` 로 그 파일이 내 커밋에 섞이지 않았음을 실증했다.

### 14-2. 실행 중 발견한 함정 — `git rm` 후 재생성 + pathspec 커밋 = 재추적

1 차 커밋(`0b65190ce`)은 목표를 달성하지 못했다. 원인은 순서다.

```text
git rm <report>                 → index: D, worktree: 삭제
npx tsx check-shortcode-registry.ts   → §16 검증 위해 재실행 = worktree 에 파일 부활
git commit -- <report>          → pathspec 커밋은 **worktree 상태**를 취한다
                                  → 삭제가 아니라 M(수정)으로 다시 추적됨
```

`git commit -- <pathspec>` 은 staged 상태가 아니라 **해당 경로의 worktree 상태**를
커밋한다. `git rm` 으로 스테이징한 삭제가 그 사이의 재생성으로 덮인 것이다.
그리고 **이미 tracked 인 파일에는 `.gitignore` 가 적용되지 않으므로**
`git check-ignore` 도 rc=1 로 되돌아갔다.

교정 — 로컬 산출물은 보존하면서 index 에서만 확실히 제거:

```text
report 를 scratchpad 로 이동 (worktree 에서 부재 상태 확보)
git commit --amend --only -- <내 파일 5>   ← foreign staged 파일 보호
report 를 원위치로 복원                     ← 이제 ignored 라 git 에 보이지 않음
```

`--amend --only -- <paths>` 를 쓴 이유는 병렬 세션의 staged 파일이 index 에 있는
상태에서 pathspec 없는 amend 가 그것들을 함께 삼키기 때문이다.

### 14-3. 2 차 사고 — 병렬 세션 커밋을 amend 로 덮음 (복구 완료)

CHECK 문서의 줄번호 오기(`.gitignore:150` → `151`) 하나를 접으려고 `--amend` 를
한 번 더 썼는데, **그 사이 병렬 세션이 main 에 커밋을 올려 HEAD 가 바뀌어 있었다.**

```text
518252cc2  내 커밋
6dc4d15f7  ← 병렬 세션 커밋 (docs(check): signage Channel 스택 감축 …)  ★ 새 HEAD
git commit --amend …   → 내 커밋이 아니라 **저쪽 커밋**을 덮어씀
```

결과: 저쪽 커밋의 메시지가 내 메시지로 바뀌고 내 CHECK 수정이 그 안에 섞였다.
`--only` 는 HEAD~ 트리 기준으로 재구성하므로 겉보기엔 내 변경이 사라진 것처럼 보였으나,
`518252cc2` 는 부모로 **온전히 살아 있었다**.

복구 (reflog 기준, 저쪽 worktree/staged 파일은 미접촉):

```text
git reset --soft 518252cc2                     ← 내 커밋으로 HEAD 복귀
git commit -C 6dc4d15f7 -- <저쪽 CHECK 파일>    ← 메시지·author 그대로 재생성
   → tree 해시 6dc4d15f7 와 **완전 동일** 확인
   → author Renagang21 <…> 동일 확인
git commit -m … -- <내 CHECK 파일>              ← 내 수정은 별도 커밋으로 분리
```

**교훈: 공유 main 에서 `--amend` 는 금지에 가깝다.** `git add .` 를 피하고 pathspec 을
지켜도, amend 는 "그 사이 남이 올린 커밋"을 대상으로 삼을 수 있다. 되돌릴 변경은
amend 가 아니라 **새 커밋**으로 얹는다.
