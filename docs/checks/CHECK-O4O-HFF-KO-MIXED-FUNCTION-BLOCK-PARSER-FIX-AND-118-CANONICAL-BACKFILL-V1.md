# CHECK — WO-O4O-HFF-KO-MIXED-FUNCTION-BLOCK-PARSER-FIX-AND-118-CANONICAL-BACKFILL-V1

> **판정: STOP — Apply 게이트 실패. DB write 0 · canonical 변경 0 · parser 변경 미반영(baseline 복원).**
>
> 기준 커밋: `8e154e3f3` · 실행일: 2026-07-30 · 대상 SSOT: `omissionProducts` 118

---

## 1. 결론 요약

| 구분 | 결과 |
|------|------|
| 결함 실재 | **YES** — 혼합형 `MAIN_FNCTN` 의 무라벨 선행 블록이 라벨 블록 존재 시 전량 폐기됨 |
| 최소 수정 유효성 | **YES(기계적)** — 98/118 복원, 원문 절 삭제 0 · 렌더 실패 0 · 순서 위반 0 · 기능성 절 외 구조 변경 0 |
| Apply 가능 여부 | **NO** — §11 `UNEXPECTED_CHANGED = 129 ≠ 0`, §12 `NEEDS_HUMAN_REVIEW = 124 ≠ 0` |
| DB write | **0** (검증 전 구간 `SET default_transaction_read_only = on`) |
| 코드 반영 | **없음** — 수정본은 patch 산출물로만 보존, 생산 러너는 `8e154e3f3` 상태로 복원 |

정지 근거는 §22 정지 조건 2건에 정확히 해당한다.

1. `parser 수정으로 118건 밖 byte 변경 발생` → CREATED 129건 + SKIPPED_EXISTING 54건
2. `NEEDS_HUMAN_REVIEW ≠ 0` → 124건(대상 내 48 / 대상 외 76)

---

## 2. 결함 위치와 기전 (재현 완료)

`apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs` `extractFunctions()`

```js
const segs = text.split(/(?=\[[^\]]{1,40}\])/);
for (const seg of segs) {
  const m = seg.match(/^\[([^\]]{1,40})\]/);
  if (!m) continue;               // ← 무라벨 선행 세그먼트가 여기서 폐기된다
  …
}
```

그리고 `composeKo()`

```js
let allFns = groups.length ? groups.flatMap((g) => g.items) : flatFns;   // ← 라벨 구간만 채택
```

`[원료]` 라벨이 **하나라도** 있으면 `groups` 가 비지 않으므로 무라벨 구간의 공식 기능성(아연 면역·세포분열, 구리 철의 운반 등)이 렌더에서 완전히 탈락한다. 평면 fallback(`flatFns`)은 `groups.length` 조건에 걸려 도달하지 못한다.

### 2-1. 재현 결과 (Phase A, READ-ONLY)

| 게이트 | 값 |
|--------|-----|
| 대상 수 | 118 (candidateId/canonicalId/statementNo 중복 각 0) |
| candidate / master / canonical 존재 | 118 / 118 / 118 |
| 감사 집합 동일성 | `auditSetIdentical: true` |
| 패턴 분포 | MIXED 98 · LABELED_ONLY 2 · UNLABELED_ONLY 18 (§3 baseline 일치) |
| **byte parity (현행 러너 출력 == 저장 canonical)** | **118 / 118 · drift 0** |
| 결함 재현 | 112 / 118 |
| 미재현 | 6 |

**byte parity 118/118** 은 이 러너가 저장된 canonical 의 실제 생산자임을 증명한다 — BEFORE/AFTER 비교가 DB 실체와 등가라는 근거.

### 2-2. 미재현 6건 = 감사 절 분절기 인공물 (개별 확인)

| index | 감사 기록 누락 절 | 실제 렌더 | 원인 |
|---|---|---|---|
| 19 | `]체지방감소에도움을줄수있음` | "체지방 감소에 도움을 줄 수 있음" 존재 | 절 키에 선행 `]` 잔존 |
| 49 | `B.breveIDCC4401열처리배양건조물` | "breve IDCC 4401 열처리배양건조물(BBR®)" 존재 | 균종명 `B.` 마침표 오분절 — 기능성 절이 아니라 원료명 조각 |
| 52 | `]알콜성손상으로부터간을보호하는데도움을줄수있음` | verbatim 존재 | 절 키에 선행 `]` 잔존 |
| 53 | 동상 | 존재 | 동상 |
| 102 | `.정상적인면역기능과세포분열에필요` / `.혈중콜레스테롤개선` | 양쪽 존재 | 절 키에 선행 `.` 잔존 |
| 103 | 동상 | 존재 | 동상 |

선행 감사가 255를 **상한**으로 명시한 것과 일치한다. 대상 목록은 임의로 축소하지 않고 118 그대로 유지했다.

---

## 3. 최소 수정안 (patch 산출물로만 보존)

산출물: `apps/api-server/src/scripts/data/hff-ko-mixed-parser-fix-proposed-patch-v1.diff`

- 무라벨 세그먼트를 `{ header: null, items }` 그룹으로 **원문 순서대로** 보존 (`continue` 제거)
- `header: null` → 원료명 날조 0. `blocksToCards` 는 null 헤더에 `sd-tag` 를 붙이지 않으므로 마크업 계약 불변
- 라벨 그룹이 0개면 기존 평면 `sd-why` 경로를 그대로 유지 → 정상 구조 회귀 0
- 의미 기반 병합·dedupe·원료 경계 추정·문구 재작성 **없음**

### 3-1. Fixture 검증 (§10) — 8 / 8 PASS

산출물: `hff-ko-mixed-parser-fix-fixture-verification-v1.json`

| fixture | 결과 | 비고 |
|---|---|---|
| FX-1 혼합형 | PASS | 무라벨 2절 + 라벨 2절 = 4절, null 헤더 그룹 1 |
| FX-2 라벨형만 | PASS | BEFORE 와 byte 동일 |
| FX-3 무라벨형만 | PASS | BEFORE 와 byte 동일 |
| FX-4 다중 원료 라벨형 | PASS | BEFORE 와 byte 동일 |
| FX-5 동일 공식 기능성 반복 | PASS | "정상적인 면역기능에 필요" **2회 유지**(반복 삭제 0) |
| FX-6 sd-why 평면형 | PASS | `sd-why` 유지, byte 동일 |
| FX-7 빈 MAIN_FNCTN | PASS | `HOLD / NO_FUNCTIONAL_DATA` 유지 |
| FX-8 짧은 단일 문장 | PASS | byte 동일 |

집계: 원문 절 누락 0 · 임의 절 추가 0 · 빈 항목 0 · 순서 보존 전건 · 공식 반복 유지 전건 · 구조 회귀 0 · 헤더 날조 0.

---

## 4. 전체 corpus 회귀 (§11) — **게이트 실패**

산출물: `hff-ko-mixed-parser-fix-full-regression-v1.json` · `hff-ko-mixed-parser-fix-changed-products-v1.jsonl`

| 버킷 | 총계 | 결과 |
|------|-----:|------|
| CREATED | 25,074 | EXPECTED_CHANGED **98** / UNCHANGED 24,847 / **UNEXPECTED_CHANGED 129** / RENDER_FAILURE 0 |
| SKIPPED_EXISTING | 15,839 | UNCHANGED 15,785 / **WOULD_CHANGE 54** / RENDER_FAILURE 0 / canonical 존재 15,839 (read-only md5 비교만, 재생산·덮어쓰기 0) |
| HOLD_FOR_AGENT_9 | 348 | 전건 HOLD 유지 (승격 0 · 처리 0) |

baseline 일치: `CREATED 25,074 / SKIPPED_EXISTING 15,839 / HOLD 348` 정확히 일치.

### 4-1. 대상 118 내부 분해

| 패턴 | 수 | 수정 후 |
|---|---:|---|
| MIXED_LABELED_AND_UNLABELED | 98 | **전건 변경(복원)** |
| LABELED_ONLY | 2 | 변경 없음 |
| UNLABELED_ONLY | 18 | 변경 없음 |

즉 이 parser 수정이 다루는 결함은 **MIXED 98건 전용**이다. 나머지 20건은 근본 원인이 다르다 — `(1)` 형 마커가 `splitItems` 마커 집합에 없고, `·` 복합 절 구분자와 균종명 마침표(`L. curvatus`)가 분절을 왜곡한다. 이 WO 범위에서 임의로 손대지 않았다.

### 4-2. 절 비교 (§12)

산출물: `hff-ko-mixed-parser-fix-clause-comparison-v1.json`

| 지표 | 값 | 판정 |
|---|---:|---|
| SOURCE_CLAUSE_MISSING (원문 절 삭제) | 0 | PASS |
| RENDERED_EXTRA_CLAUSE (원문 밖 절) | 0 | PASS |
| REMOVED_CLAUSE_TOTAL | 0 | PASS |
| ADDED_CLAUSE_TOTAL | 681 | — |
| 기능성 절 외 구조 변경 | 0 | PASS |
| 순서 위반(재판정) | 0 | PASS |
| **NEEDS_HUMAN_REVIEW** | **124** | **FAIL** |

§12 는 `NEEDS_HUMAN_REVIEW = 0` 을 apply 전제로 요구한다. 미달이므로 자동 PASS 하지 않았다.

---

## 5. 정지 사유의 실체 — 복원이 드러낸 선행 분절 결함 4종

산출물: `hff-ko-mixed-parser-fix-blast-radius-classification-v1.json`

무라벨 블록을 원문 그대로 복원하면, 그 블록에는 **기능성 절이 아닌 텍스트**가 함께 들어 있는 제품이 124건 있다(대상 내 48 / 대상 외 76). 원인은 이번 결함이 아니라 기존 분절기 한계이며, 그동안 무라벨 블록이 폐기되어 **가려져 있었다.**

| # | 결함 | 실측 예 | 성격 |
|---|------|---------|------|
| E1 | 라벨 길이 상한 `{1,40}` 초과 → 라벨로 인식되지 않고 기능성 절로 렌더 | `[Bacillus coagulans SNZ 1969 프로바이오틱스(제2023-34호)]` · `[CaHMB(Calcium β-Hydroxy-β-methylbutyrate)(제2023-26호)]` | 원료명이 기능성 문장 위치에 노출 |
| E2 | 공식 영문 병기가 ko 설명서 기능성 절로 렌더 | `(영문) May help to reduce body fat` · `May help to improve bowel movements` | §2 "영문 설명서 생성 금지" 와 충돌 소지 · 개별 판단 필요 |
| E3 | 균종 약어 마침표에서 문장 분절 | `curvatus HY7601와 L.` / `plantarum KY1032의 프로바이오틱스 복합물(제2019-4호)]` | 절 파편화 |
| E4 | 제품 형태·성분 표기가 절로 렌더 | `*밀크씨슬 정제` · `[나이아신` | 기능성 아님 |

E1~E4 는 **원문 절을 지우지 않고서는** 자동으로 회피할 수 없다. §5 는 `원료 경계 추정 / 문장 의미 기반 자동 병합 / 동일 문장 자동 dedupe` 를 금지하고 §12 는 `원문 절 누락 0` 을 요구하므로, **이 WO 범위 안에는 안전한 자동 해법이 존재하지 않는다.** 개별 판단이 필요한 제품이므로 임의 수정하지 않고 정지했다.

### 5-1. 대상 외 129건의 성격

- D3 신규 공식 기능성 복원 64건 → 감사 검출기가 놓친 **진성 누락**. 실제 결함 모집단은 118 이 아니라 최소 227(+ SKIPPED_EXISTING 54)이다.
- D2 비기능성 라인 포함 76건 → 개별 판단 필요
- D1 공식 중복 요약만 복원 2건 → 정보 증가 없음

§3 지시("재분석 결과가 다르면 임의로 대상 목록을 바꾸지 말고 차이를 보고한다")에 따라 **대상 목록은 118 그대로 유지**하고 차이만 보고한다.

---

## 6. 수행하지 않은 단계와 사유

| 단계 | 상태 | 사유 |
|---|---|---|
| §13 30건 수동 대조 (MIXED 20 / LABELED 5 / UNLABELED 5) | 미수행 | §11·§12 게이트가 이미 실패하여 Apply 경로가 차단됨. 대신 변경 227건 **전건**에 절 단위 비교를 적용하고 E1~E4 표본을 개별 확인함 |
| §14 20건 × 3폭 렌더 검증 | 미수행 | 동상. 렌더는 E1~E4 노출을 재확인할 뿐 판정을 바꾸지 않음 |
| §15~§18 Apply / rollback | 미수행 | Apply 금지 상태. rollback manifest 는 write 가 없어 불필요 |
| §19~§20 독립검증 / 사후 감사 | 미수행 | 변경 대상 없음 |

---

## 7. 산출물

| 파일 | 내용 |
|------|------|
| `data/hff-ko-mixed-function-omission-118-manifest-v1.json` | 대상 118 고정 manifest (§6 전 필드) |
| `data/hff-ko-mixed-function-omission-118-reproduction-v1.json` | 재현 결과 + byte parity + 미재현 6건 |
| `data/hff-ko-mixed-parser-fix-fixture-verification-v1.json` | 8 fixture 8/8 PASS |
| `data/hff-ko-mixed-parser-fix-full-regression-v1.json` | 41,261 BEFORE/AFTER 분류 |
| `data/hff-ko-mixed-parser-fix-clause-comparison-v1.json` | 변경 227건 절 단위 비교 |
| `data/hff-ko-mixed-parser-fix-changed-products-v1.jsonl` | 변경 제품 목록(버킷별) |
| `data/hff-ko-mixed-parser-fix-blast-radius-classification-v1.json` | 원인 분류 D1/D2/D3 + E1~E4 |
| `data/hff-ko-mixed-parser-fix-proposed-patch-v1.diff` | 최소 수정 patch (미반영) |

경로 접두: `apps/api-server/src/scripts/`

---

## 8. 후속 제안 (V2 WO 필요 — 본 WO 범위 외)

1. **P0** 라벨 인식 상한 `{1,40}` → 공식 라벨 실측 최대 길이까지 확장(E1). 이것만으로 124건 중 상당수가 해소되는지 재측정.
2. **P0** 공식 영문 병기 `(영문) …` 분리 정책 확정(E2) — ko 설명서에서 제외할지, 별도 절로 유지할지는 정책 판단 사항.
3. **P1** 균종 약어(`L.` `B.` `S.`) 마침표 분절 보호(E3) + `(1)` `·` 마커 확장(LABELED_ONLY 2 · UNLABELED_ONLY 18 해소).
4. **P1** 대상 목록 재확정: CREATED 227 + SKIPPED_EXISTING 54. 현행 118 은 과소 집계.
5. **P2** 감사 절 분절기의 `]` `.` 선행 잔존 문자 정리 — 상한 255 를 실측치로 좁힘.

1~3 이 반영된 뒤에야 무라벨 블록 복원을 안전하게 적용할 수 있다.

---

*Base commit: `8e154e3f3` · DB write: 0 · canonical 변경: 0 · 생산 러너: baseline 복원 상태*
