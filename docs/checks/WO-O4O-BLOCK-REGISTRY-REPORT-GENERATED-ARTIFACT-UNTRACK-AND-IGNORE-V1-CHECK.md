# WO-O4O-BLOCK-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1 — CHECK

- **작업일**: 2026-08-27
- **기준 commit**: `a193ba4df` (`HEAD == origin/main`, 시작 시 working tree clean)
- **선행 WO**: [WO-O4O-SHORTCODE-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1-CHECK](WO-O4O-SHORTCODE-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1-CHECK.md)
- **결론**: `scripts/audit/block-registry-report.json` → **`GENERATED_ARTIFACT_UNTRACK`**
- **기능 코드 변경 0 · DB schema change 0 / migration 0 / production write 0**

---

## 1. 범위

선행 WO 에서 sibling 인 shortcode report 만 닫았고, block report 는 **범위 밖**이라
tracked 상태로 남아 있었다. 이번 WO 는 그 잔여 반쪽을 같은 판정으로 닫는다.

| 파일 | 처리 |
|---|---|
| `scripts/audit/block-registry-report.json` | `git rm --cached` (디스크 보존) |
| `.gitignore` | anchored 규칙 1줄 + 근거 주석 추가 |
| `apps/api-server/src/__tests__/shortcode-registry-report-untrack.spec.ts` | sibling assertion **교체** |
| `docs/checks/...-V1-CHECK.md` | 본 문서 |

범위 밖: generator canonicalization(절대경로 → repo-relative), `check-block-registry.ts`
자체의 미등록/dangling 해소.

---

## 2. 판정 근거 — `ENVIRONMENT_DEPENDENT_ARTIFACT`

`scripts/audit/check-block-registry.ts:275-276` 이 실행 결과를 그대로 직렬화한다.

```ts
const reportPath = path.join(__dirname, 'block-registry-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
```

`filePath` 필드에 **실행 머신의 절대경로**가 들어가고 `timestamp` 가 함께 기록된다.

| | tracked 사본 (`a193ba4df`) | 이 머신 재실행 사본 |
|---|---|---|
| `filePath` 필드 수 | 34 | 35 |
| unique root | `/home/dev/o4o-platform` | `C:\Users\home\coding\o4o-platform` |
| `timestamp` | `2025-11-21T04:44:43.193Z` | 재실행 시각 |
| summary | `totalRegistered 33 / missing 1 / dangling 1` | `totalRegistered 32 / missing 2 / dangling 1` |

즉 tracked 사본은 **다른 머신에서 생성됐고, 현재 소스 기준으로도 이미 stale** 했다.
재실행만으로 전 파일 규모 diff 가 발생하므로 소스관리 대상이 아니다.

---

## 3. consumer census

| 축 | 결과 |
|---|---|
| `ACTIVE_RUNTIME_CONSUMER` | **0** — 어떤 런타임 코드도 이 JSON 을 읽지 않는다 |
| `CI_CONSUMER` | **0** — workflow · root script 에서 참조 0 |
| `ACTIVE_TEST_FIXTURE` | **0** |
| test 참조 | 1건 — 선행 WO 의 sibling 보호 assertion (이번에 교체) |
| `DOC_ONLY` | 2건 — `scripts/audit/README.md:30,44` · `scripts/audit/REGISTRY_AUDIT_REPORT.md:52` |

DOC_ONLY 2건은 "Machine-readable block audit data" / "Complete list of 33 block
definition files" 같은 **설명문**이며 "이 JSON 을 repo 에서 확인하라"는 현재형 지시가
아니다. 따라서 이번 범위에서 수정하지 않는다.

> 관찰(수정 안 함): `scripts/audit/README.md` 의 shortcode 항목에는 선행 WO 에서
> git-ignored 라는 설명이 붙었는데 block 항목에는 없어 **두 줄이 비대칭**으로 남는다.
> README 는 이번 WO 의 명시 범위 밖이라 손대지 않았다. 별도 WO 로 정합 제안.

---

## 4. `.gitignore` — anchored 규칙

`.gitignore:153-157` 에 추가했다.

```gitignore
# Block registry audit output (WO-O4O-BLOCK-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1)
#   check-block-registry.ts 도 같은 형태의 생성 산출물이다(filePath 34 필드 + timestamp).
#   sibling 인 shortcode report 와 **각각 독립된 anchored 규칙**으로 적는다 —
#   `scripts/audit/*.json` 같은 광범위 패턴은 쓰지 않는다.
/scripts/audit/block-registry-report.json
```

**선두 `/` 로 루트 고정**해 파일 하나만 지목한다. `scripts/audit/` 를 통째로 무시하면
같은 디렉터리의 감사 도구(`.ts`)와 문서(`.md`)까지 추적에서 빠지므로 금지한다.

---

## 5. 계약 테스트 — 삭제가 아니라 교체

선행 WO 의 assertion 은 "block report 를 함께 무시하지 않는다"였다. 이번 판정으로
그 전제가 바뀌었으므로 **단순 삭제하지 않고** 더 강한 계약으로 바꿨다.

제거된 assertion:

```ts
it('sibling block-registry-report.json 까지 함께 무시하지 않는다', () => {
  expect(readRoot('.gitignore')).not.toContain('block-registry-report.json');
});
```

대체 계약 (`apps/api-server/src/__tests__/shortcode-registry-report-untrack.spec.ts`):

| 계약 | 내용 |
|---|---|
| 두 anchored 규칙 존재 | `/scripts/audit/shortcode-registry-report.json` **와** `/scripts/audit/block-registry-report.json` 이 모두 실효 규칙 목록에 있다 |
| broad `*.json` 금지 | `*.json` · `**/*.json` 등재 불가 |
| 디렉터리 단위 broad 금지 | `scripts/audit/*.json` · `/scripts/audit/*.json` · `**/scripts/audit/*.json` · `scripts/audit/` · `/scripts/audit/` · `scripts/audit` 6종 등재 불가 |
| block tracked 0 | `git ls-files -- scripts/audit/block-registry-report.json` 이 빈 문자열 |
| 규칙 정확 매칭 | `git check-ignore -v` 결과가 **block 자기 규칙**을 지목한다 (shortcode 규칙이 아니다) |
| block checker KEEP_ACTIVE | `check-block-registry.ts` 존재 + `writeFileSync` 로 report 생성 유지 |

git 계약 검사는 기존과 동일하게 `hasGit` probe 뒤 `describe.skip` 으로 우회한다
(tarball/export 환경 대응).

---

## 6. 검증 결과

| # | 항목 | 결과 |
|---|---|---|
| 1 | 기준점 `HEAD == origin/main == a193ba4df` | ✅ |
| 2 | `git rm --cached` → `rm 'scripts/audit/block-registry-report.json'` | ✅ |
| 3 | anchored ignore 추가 (`.gitignore:157`) | ✅ |
| 4 | sibling assertion 교체 | ✅ |
| 5 | `npx tsx scripts/audit/check-block-registry.ts` 실행 | exit 1 (아래 §7) |
| 6 | `git ls-files -- scripts/audit/block-registry-report.json` | **빈 출력** ✅ |
| 7 | `git check-ignore -v` | `.gitignore:157:/scripts/audit/block-registry-report.json	scripts/audit/block-registry-report.json` ✅ |
| 8 | 실행 전후 `git status --porcelain` 비교 | **변화 0** ✅ |
| 9 | 관련 spec 전량 | 42 suites / **813 tests PASS** ✅ |
| 10 | 파일 디스크 보존 | 재생성 후에도 존재 ✅ |
| 11 | eslint (수정 spec) | exit 0 ✅ |

§8 이 이번 WO 의 핵심 증명이다 — 감사 스크립트를 다시 돌려도 Git 이 아무것도 보지
않으므로 "재생성 후 tracked 로 되살아나는" 함정이 닫혔다.

---

## 7. 스크립트 exit 1 은 회귀가 아니다

`check-block-registry.ts` 는 미등록/dangling 을 찾으면 exit 1 을 낸다. 현재 결과:

- 정의 파일 33 · 등록 32
- 미등록 2 : `buttons.tsx` → `o4o/buttons`, `SlideBlock.tsx` → `o4o/slide-block`
- dangling 1 : `o4o/slide` (`apps/admin-dashboard/src/blocks/index.ts`)

이는 **살아 있는 block 도메인의 선행 상태**이며 이번 WO 가 만든 것이 아니다.
tracked 사본(2025-11-21) 의 summary 와 비교하면 그 사이 소스가 움직인 결과다.
이 스크립트는 CI 게이트가 아니므로 파이프라인 영향 0. 해소는 별도 WO 대상.

---

## 8. Git 안전 보고

| 항목 | 결과 |
|---|---|
| autostash | **0** — pull/rebase 미수행 |
| foreign staged/unstaged 상태 변경 | **0** |
| staged scope guard | PASS (`scripts/git/check-staged-scope.mjs`) |
| commit 방식 | path-specific (`git commit -F - -- <경로>`) |
| commit 자체 delta 검증 | PASS |
| `git add .` | 미사용 |
| shared main `--amend` | 미수행 |

---

## 9. 후속 제안 (이번 범위 밖)

1. **generator canonicalization** — `filePath` 를 repo-relative 로 바꾸면 report 가
   환경 독립이 된다. 두 checker(`check-block-registry.ts`, `check-shortcode-registry.ts`)
   공통 과제.
2. **`scripts/audit/README.md` 정합** — §3 의 비대칭 관찰.
3. **block registry 미등록 2 · dangling 1 해소** — §7.
