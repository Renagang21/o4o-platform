# IR — 문서 archive 후보 산출 방법 V1

> **WO-O4O-DOCUMENTATION-INDEX-AND-LIFECYCLE-BASELINE-V1**
> **작성일**: 2026-08-06 · **기준 커밋**: `062e48e5e`
> **성격**: **방법 정의 전용 IR**. 이 문서 작성 과정에서 **실제 문서 이동은 0건**이다.
> **판정 기준**: [`../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)

---

## 1. 목적과 비목적

**목적**: 2,952개 추적 문서 중 archive 후보를 **재현 가능하게** 산출하는 절차를 정한다.

**비목적**:
- 실제 이동 (본 IR 범위 밖 — 후속 작업에서 트랙 1개로 시험)
- 후보 목록 확정 (아래 절차의 산출물이지 본 문서의 내용이 아님)
- 자동 이동 스크립트 작성 (규칙 §5-6 금지)

---

## 2. 산출 단위: 트랙

**개별 문서가 아니라 트랙 단위로 후보를 만든다.**

트랙 = 하나의 작업 목표를 공유하는 문서 묶음. 실무상 **파일명 공통 어간**으로 식별된다.
예: `CHECK-O4O-HFF-ZH-*` 7개 = HFF 중국어 생산 트랙 1개.

개별 문서 단위 판정은 다음 이유로 쓰지 않는다:
- 같은 트랙 안에서도 문서마다 참조 상태가 달라 **트랙이 쪼개진다**
- 남은 문서가 옮겨진 문서를 참조하면 **깨진 링크**가 생긴다

---

## 3. 산출 절차 (4단계)

### 3-1. 트랙 후보 나열

```bash
git ls-files 'docs/**/*.md' | grep -i '<트랙 어간>'
```

`docs/` 전체를 대상으로 한다. **특정 폴더로 한정하지 않는다** (§5-1 함정).

### 3-2. 종료 확인

```bash
git log -1 --format='%h %ad %s' --date=short -- <파일경로>
```

- 마지막 커밋이 종료·완결을 기술하는지 확인한다.
- 날짜만으로는 판정하지 않는다 (규칙 §5-2).

### 3-3. 외부 참조 검사 (핵심)

트랙의 **각 파일**에 대해:

```bash
base=$(basename <파일경로> .md)
git grep -l -- "$base" | grep -v '^docs/.*'"$base"
```

- 자기 자신을 제외한 참조가 **0건**이어야 후보가 된다.
- 확장자 없는 basename 으로 검색한다 (문서 링크는 `.md` 유무가 섞여 있다).

### 3-4. `CLAUDE.md` 링크 검사

```bash
git grep -n -- "<basename>" CLAUDE.md AGENTS.md
```

한 건이라도 걸리면 **후보에서 제외한다** (규칙 §5-3).

---

## 4. 실측 검증 — HFF-ZH 트랙

방법이 실제로 동작하는지 **종료가 확인된 트랙 1개**로 확인했다. (이동은 하지 않음)

### 대상 (7개, 조사 시점 위치 = `docs/work-orders/`)

> **이동 완료 (2026-08-06, `WO-O4O-HFF-ZH-CHECK-DOCUMENTS-ARCHIVE-PILOT-V1`)**
> 아래 7건은 첫 시험 적용으로 **`docs/archive/checks/` 로 이동**되었다. 현재 경로를 함께 표기한다.

```
docs/archive/checks/CHECK-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1.md
docs/archive/checks/CHECK-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1.md
docs/archive/checks/CHECK-O4O-HFF-ZH-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1.md
docs/archive/checks/CHECK-O4O-HFF-ZH-BATCH-03-10000-DIRECT-BULK-PRODUCTION-V1.md
docs/archive/checks/CHECK-O4O-HFF-ZH-BATCH-04-10000-DIRECT-BULK-PRODUCTION-V1.md
docs/archive/checks/CHECK-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1.md
docs/archive/checks/CHECK-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1.md
```

### 결과

| 단계 | 결과 |
|------|------|
| 3-1 트랙 나열 | 7건. **`CHECK-` prefix 인데 `docs/checks/` 가 아니라 `docs/work-orders/` 에 있다** |
| 3-2 종료 확인 | 마지막 커밋 `b27fecbd2` (2026-08-03). 트랙 종료 문서 존재 |
| 3-3 외부 참조 | 표본 문서에서 자기 자신 외 참조 **0건** |
| 3-4 `CLAUDE.md` | 미링크 |

**판정**: 4개 조건 충족 → archive 후보 성립. 대상 폴더는 `docs/archive/checks/`.
**단, 본 IR 에서는 이동하지 않는다.**

### 이 검증이 확인해 준 것

- 절차가 실제 트랙에 대해 재현 가능하다.
- **prefix 기반 선별이 왜 틀리는지**가 실측으로 드러났다. `CHECK-` 7건이 `docs/work-orders/` 에 있으므로, `docs/checks/**` 만 훑는 방식은 이 트랙을 **통째로 놓친다**.

---

## 5. 함정 (실측으로 확인)

### 5-1. 빈 변수 `git grep` — 전 저장소 오탐 ⚠️ 최우선

```bash
# 위험
f=$(git ls-files 'docs/checks/**' | grep -i 'hff.*zh' | head -1)   # → 빈 문자열
base=$(basename "$f" .md)                                          # → 빈 문자열
git grep -l -- "$base"                                             # → 저장소 전체 파일 매치
```

파일이 다른 폴더에 있어 `f` 가 비면 `git grep -l -- ""` 가 **모든 파일에 매치**한다.
결과는 "이 문서는 도처에서 참조됨" 이라는 **거짓 신호**이고, 이는 후보를 **부당하게 탈락**시킨다.

**대응**: basename 이 비었으면 즉시 중단한다.

```bash
[ -n "$base" ] || { echo "SKIP: empty basename"; exit 1; }
```

### 5-2. prefix ≠ 폴더

실측(2026-08-06):

| 폴더 | 실제 prefix 분포 |
|------|------------------|
| `docs/checks/` (1,232) | `CHECK-` 1,173 · **`WO-` 52** · `HFF-` 4 · `VERIFY-`/`SMOKE-`/`IR-` 각 1 |
| `docs/investigations/` (714) | **`CHECK-` 352** · `IR-` 346 · `SMOKE-` 9 · 기타 각 1 |

prefix 로 폴더를 추론하거나, 폴더로 문서 성격을 추론하지 않는다.

### 5-3. 요약본 신뢰 금지

압축된 대화 요약이나 이전 IR 의 "완료" 기재가 현재 저장소 상태와 어긋날 수 있다.
**판정 직전에 `git ls-files` / `git log` / `git grep` 로 현재 상태를 직접 확인한다.**

### 5-4. 두 IR 폴더

`docs/ir/` (23) 와 `docs/investigations/` (714) 가 **둘 다 활성**이다.
IR 트랙을 훑을 때 한쪽만 보면 누락된다. **항상 `docs/**` 전체를 대상으로 한다.**

---

## 6. 후보에서 제외되는 것 (사전 배제 목록)

| 대상 | 사유 |
|------|------|
| `baseline/` · `architecture/` · `rbac/` · `rules/` · `services/` · `platform/` · `guides/` | 현재 기준 문서 |
| `adr/` | 결정 이력은 제자리 보존 (규칙 §3-6) |
| `work-orders/README.md` 의 "유지 대상" (`PLAN-ROLE-*`, `WO-CHANNEL-*`) | 반복 참조·`CLAUDE.md` 링크 |
| `local/` | 로컬 전용 (`*.local.md` 는 미추적) |
| `manual/` | 빈 골격 — 이동할 내용 없음 |
| `templates/` | 재사용 자산 |
| `archive/**` | 이미 archive |

---

## 7. 후속 작업 (본 IR 이후)

1. **종료된 트랙 1개**를 골라 §3 절차를 끝까지 적용하고 `git mv` 로 이동한다.
2. 이동 후 `git grep` 으로 **깨진 링크 0건**을 확인한다.
3. 시험 결과를 근거로 [`../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) 를 보정한다.
4. 보정 후에야 다음 트랙으로 넘어간다.

**여러 트랙 동시 이동, 자동 스크립트 일괄 이동은 하지 않는다.**

---

## 8. 검증 (본 IR 자체)

| 항목 | 결과 |
|------|------|
| 실제 문서 이동 | **0건** |
| 실제 문서 삭제 | **0건** |
| 기존 문서 내용 수정 | 없음 (신규 파일) |
| 민감정보(자격증명·토큰·비밀번호) 기재 | 없음 |
| 추정과 확인 사실 구분 | §4 는 실측, §7 은 계획으로 명시 |
