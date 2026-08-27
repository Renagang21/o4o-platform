# WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1 — CHECK

- **작업일**: 2026-08-27
- **기준 commit**: `85315075b` (local main) / `origin/main = 449568b0c` / merge-base `a116907c6`
- **선행 WO**:
  [SHORTCODE report untrack](WO-O4O-SHORTCODE-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1-CHECK.md) ·
  [BLOCK report untrack](WO-O4O-BLOCK-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1-CHECK.md)
- **결론**: 두 generator 출력 **`ENVIRONMENT_INDEPENDENT` 달성**
- **기능 코드 변경 0 · DB schema change 0 / migration 0 / production write 0**

---

## 1. 목표

선행 WO 두 건은 report 를 Git 추적에서 뺐다(증상 차단). 이번 WO 는 그 **원인**을
없앤다 — generator 출력이 실행 머신에 따라 달라지는 문제.

| 축 | 이전 | 이후 |
|---|---|---|
| `filePath` | 실행 머신의 **절대경로** | repo root 기준 **POSIX 상대경로** |
| 경로 구분자 | 플랫폼 의존 (`\` / `/`) | 항상 `/` |
| `timestamp` | 매 실행마다 기록 | 기본 출력에서 제외 · `--timestamp` 로만 |
| 디렉터리 순회 | `readdirSync` 원순서 (FS 의존) | `.sort()` 로 고정 |

---

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `scripts/audit/check-block-registry.ts` | canonicalization 5곳 |
| `scripts/audit/check-shortcode-registry.ts` | 같은 5곳 + `source` 필드 1곳 |
| `apps/api-server/src/__tests__/registry-audit-generator-canonicalization.spec.ts` | **신규** 계약 테스트 |
| `scripts/audit/README.md` | block/shortcode 항목 설명 비대칭 정합 |
| `docs/checks/...-V1-CHECK.md` | 본 문서 |

---

## 3. 구현 — 두 파일에 **동일한 작은 함수**

```ts
/** repository root — 이 스크립트는 `scripts/audit/` 에 있다. */
const PROJECT_ROOT = path.join(__dirname, '../..');

function toRepoPath(absPath: string): string {
  return path.relative(PROJECT_ROOT, absPath).split(path.sep).join('/');
}

const INCLUDE_TIMESTAMP = process.argv.includes('--timestamp');
```

공용 helper 모듈로 **추출하지 않았다.** `scripts/` 는 현재 독립 실행 스크립트
모음이고, 공유 모듈을 새로 만들면 두 파일이 아니라 모듈 경계 문제가 된다.
이번 목표는 구조 개선이 아니라 출력 안정성이므로 **같은 함수를 각 파일에 둔다**
(중복 6줄). 각 함수의 doc 주석이 서로를 sibling 으로 지목해 drift 를 표시한다.

`timestamp` 는 **조건부 spread** 로 넣는다 — 키 순서를 흔들지 않고, 옵션 없으면
키 자체가 사라진다.

```ts
const report: AuditReport = {
  ...(INCLUDE_TIMESTAMP ? { timestamp: new Date().toISOString() } : {}),
  foundBlocks: files,
  ...
};
```

`interface AuditReport` 의 `timestamp` 는 `timestamp?: string` 으로 완화했다.

---

## 4. WO 확인 요청 5항목

| 항목 | 결과 |
|---|---|
| Windows/Linux 구분자 `/` canonicalize | ✅ `split(path.sep).join('/')` — §5 fixture 로 고정 |
| 결과 정렬이 deterministic 한가 | ⚠️ **아니었다** → `fs.readdirSync(dir).sort()` 로 고정. 그 위 `searchDirs` 는 소스에 하드코딩된 고정 배열이라 이미 결정적 |
| object/array 순서가 실행마다 바뀌는가 | ✅ 안 바뀐다. report 는 객체 리터럴이라 키 순서 고정, 배열은 §위 순회 순서에 종속 → 정렬 후 결정적 |
| `summary` 가 source 상태만으로 결정되는가 | ✅ `analyzeRegistry(files, registered)` 의 길이 집계뿐 — 시각·환경 입력 0 |
| 공통 helper 추출 가치 | ❌ 이번엔 하지 않는다 (§3 근거) |

---

## 5. 검증

### 5-1. byte-identical 재실행 (WO 핵심 기준)

같은 commit 에서 각 generator 2회 실행 후 바이트 비교.

| generator | 1차 exit | 2차 exit | 비교 |
|---|---|---|---|
| `check-block-registry.ts` | 1 | 1 | **byte-identical** ✅ (sha256 `4a2047b5fba8f68d…` 동일) |
| `check-shortcode-registry.ts` | 1 | 1 | **byte-identical** ✅ |

### 5-2. exit semantics · 판정 불변

원본 스크립트(`HEAD` 사본)를 그대로 실행해 대조했다.

| | ORIG | NEW |
|---|---|---|
| block exit | 1 | **1** |
| block summary | `files 33 / registered 32 / missing 2 / dangling 1` | **동일** |
| shortcode exit | 1 | **1** |
| shortcode summary | `files 33 / registered 3 / missing 32 / dangling 2 / mismatches 0` | **동일** |

exit 1 은 **살아 있는 도메인의 선행 상태**다(선행 CHECK §7). 이번 WO 가 만든 것이
아니고, 두 스크립트는 CI 게이트가 아니므로 파이프라인 영향 0.

### 5-3. `--timestamp` opt-in

| 실행 | `timestamp` 키 | 키 순서 |
|---|---|---|
| 무옵션 | **없음** | `foundBlocks · registeredBlocks · missingInRegistry · danglingRegistryEntries · summary` |
| `--timestamp` | `2026-08-27T03:58:56.526Z` | 위 순서 **맨 앞에만** 추가 |

### 5-4. 경로 fixture (Windows ↔ Linux)

`registry-audit-generator-canonicalization.spec.ts` 가 두 플랫폼 `path` 구현으로
동일 식을 재현해 고정한다.

```text
C:\Users\home\coding\o4o-platform\packages\x.ts   (path.win32)
/home/dev/o4o-platform/packages/x.ts              (path.posix)
  → 둘 다 packages/x.ts
```

생성된 report 가 디스크에 있으면 실제 파일도 검사한다 — 절대경로 0 · backslash 0 ·
드라이브 문자 0 · 기본 `timestamp` 부재. report 는 git-ignored 라 clean checkout
에서는 없을 수 있으므로 **부재는 실패로 보지 않는다**.

### 5-5. 계약 테스트 · 스위트

| # | 항목 | 결과 |
|---|---|---|
| 1 | 신규 canonicalization spec | **15 tests PASS** ✅ |
| 2 | 기존 `shortcode-registry-report-untrack.spec.ts` | **15 tests PASS** ✅ (회귀 0) |
| 3 | api-server 전량 | **213 suites / 3576 tests PASS** ✅ |
| 4 | `tsc --noEmit` (두 스크립트) | exit 0 ✅ |
| 5 | `tsc --noEmit` (api-server) | exit 0 ✅ |
| 6 | `eslint` (변경 3파일) | exit 0 ✅ |
| 7 | 재생성 전후 `git status --porcelain` | **변화 0** ✅ |

§7 이 선행 WO 의 ignore 계약이 그대로 살아 있음을 확인한다 — 두 report 는 여전히
각자의 anchored 규칙으로 ignored 이고, 재생성해도 Git 이 아무것도 보지 않는다.

---

## 6. 유지한 계약 (변경 0)

| 계약 | 상태 |
|---|---|
| `shortcode-registry-report.json` ignored | 유지 (`.gitignore:151`) |
| `block-registry-report.json` ignored | 유지 (`.gitignore:157`) |
| checker exit semantics | 변경 0 (§5-2) |
| missing / dangling 판정 로직 | 변경 0 — `analyzeRegistry` 미수정 |
| CI gate 연결 | **새로 만들지 않았다** |

---

## 7. README 정합 (WO 승인 범위)

`scripts/audit/README.md` 의 shortcode 항목에만 "generated + git-ignored" 설명이
있고 block 항목에는 없던 비대칭을 맞췄다. 동시에 그 설명의 근거였던
"records absolute paths of the machine it ran on" 문장은 **이번 변경으로 사실이
아니게 되어** canonicalization 설명으로 교체했다.

> 관찰(수정 안 함): 같은 README 의 `## Current Status` 수치(blocks 32/33 missing 1,
> shortcodes 16/61)는 실측(§5-2)과 다르다. 이 WO 는 출력 안정성 범위이고 수치 갱신은
> 등록 누락 해소 WO 와 함께 다루는 편이 맞아 손대지 않았다. `REGISTRY_AUDIT_REPORT.md`
> 도 같은 이유로 미수정(DOC_ONLY).

---

## 8. Git 안전 보고

작업 시작 시점에 local main 과 `origin/main` 이 **이미 분기**해 있었다
(각 쪽에 같은 메시지의 서로 다른 commit — 다른 세션 산출물).

| 항목 | 결과 |
|---|---|
| autostash | **0** — pull / rebase 미수행 |
| 분기 처리 | rebase · `pull --autostash` · `--amend` **미사용**. 최신 `origin/main` 기준 **임시 worktree cherry-pick** 경로 사용 |
| 다른 세션 commit 접촉 | **0** — `85315075b` 를 수정하지 않았다 |
| foreign staged/unstaged 상태 변경 | **0** |
| staged scope guard | PASS (`scripts/git/check-staged-scope.mjs`) |
| commit 방식 | path-specific (`git commit -F - -- <경로>`) |
| commit 자체 delta 검증 | PASS |
| `git add .` | 미사용 |

---

## 9. 후속 (이번 범위 밖)

1. **block registry 미등록 2 · dangling 1 해소** — `buttons.tsx` → `o4o/buttons`,
   `SlideBlock.tsx` → `o4o/slide-block`, dangling `o4o/slide`.
2. **shortcode registry 미등록 32 · dangling 2 해소.**
3. **README `## Current Status` · `REGISTRY_AUDIT_REPORT.md` 수치 갱신** — 위 1·2 와 함께.
