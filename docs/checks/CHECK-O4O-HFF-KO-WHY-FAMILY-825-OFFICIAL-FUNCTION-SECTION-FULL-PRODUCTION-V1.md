# CHECK-O4O-HFF-KO-WHY-FAMILY-825-OFFICIAL-FUNCTION-SECTION-FULL-PRODUCTION-V1

왜-family 공식 기능성 섹션 부재 **825건 전수 분류 + 안전 대상 300건 backfill**

- 근거 WO: `WO-O4O-HFF-KO-WHY-FAMILY-825-OFFICIAL-FUNCTION-SECTION-FULL-PRODUCTION-V1`
- 기준 커밋: `45794fa8b` (HEAD 조상 확인)
- 착수 HEAD: `e01f69130` (= `origin/main`)
- 판정: **PASS** — 300건 적용 · 공식 기능성 451절 복원 · 525건 사람 검토 분리

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | 타 세션 WIP(`otc-v4-carryover72-*`, `MM pnpm-lock.yaml`) — **일절 미접촉** |
| DB read-only | 분류·dry-run·독립검증 전 세션 `SET default_transaction_read_only = on` |
| 공용 driver·parser·renderer·CSS | **미수정** (데이터 산출물 + HFF 전용 script 만) |
| 원본 사람 검토 큐 | **미수정** (delta 만 생성) |

## 2. 모집단

| 항목 | 값 |
|---|---|
| 기능성 섹션 부재 모집단 | **825** — 기대치 정확 일치 |
| 판정축 | `content ~ '<h2>[^<]*기능성[^<]*</h2>'` (family 어휘 무관) |
| HFF STORE/ko canonical | 40,913 |
| Agent 9 HOLD | 348 |

## 3. 전수 분류 결과

| 상태 | 건수 |
|---|---|
| **SAFE_APPLY** | **300** |
| **HUMAN_REVIEW** | **525** |
| NO_CHANGE | 0 |
| BLOCKED_SOURCE | 0 |
| BLOCKED_STRUCTURE | 0 |
| FAILED_SYSTEM | **0** |
| 합계 | **825** ✅ |

HUMAN_REVIEW 사유:

| 사유 | 건수 |
|---|---|
| `BOUNDARY_UNRESOLVED_NO_MARKER` (열거 마커 없어 절 경계 확정 불가) | **457** |
| `PARTIAL_BOUNDARY_UNRESOLVED` (일부 라인만 경계 확정) | **65** |
| `MULTI_INGREDIENT_NEEDS_원료별_IDIOM_DECISION` | **2** |
| `CLAUSE_TRAILING_DELIMITER_ARTIFACT` | **1** |

> 표본 400건 외삽치(안전 약 450 / 불확정 약 376)는 참고값이었고 **실측은 300 / 525** 였다. 외삽치를 Apply 목표로 쓰지 않았다.

## 4. 적용 계약 — family idiom 실측으로 확정

작업 중 **family 의 실제 마크업 idiom 을 DB 에서 실측**하여 계약을 확정했다. 이 실측 없이는 신규 패턴을 발명하게 된다.

| 헤딩 | 실제 마크업 | family 내 건수 |
|---|---|---|
| `공식 인정 기능성` | `<ul class="sd-why"><li>절</li></ul>` — **라벨 없는 평문** | 5,702 |
| `원료별 공식 인정 기능성` | `<ul class="sd-func"><li><b>원료</b><ul class="sd-why">…` | 8,277 |

**`<li><b>라벨</b> 절</li>` 형태는 family 내 0건** 이다.

### 4-1. 초기 패치 설계 오류 2건 (교정 기록)

| 오류 | 내용 | 교정 |
|---|---|---|
| **신규 패턴 발명** | 라벨을 `<li><b>라벨</b> 절</li>` 로 렌더 → family 선례 **0건**. WO 의 "새 UI 패턴 금지" 위반 | 단일 원료군은 family 선례대로 **라벨 없는 평문 `sd-why`** 로 변경 |
| **연속 라인 오귀속** | `[원료①절` 다음 줄 `②절` 을 **별도 라벨 없는 그룹**으로 처리 → 다원료 제품에서 원료 귀속 소실 | 라벨 없는 연속 라인을 **직전 원료 그룹의 계속**으로 병합 |

### 4-2. 다원료 2건을 자동 적용하지 않은 이유

family 의 다원료 idiom 은 `<ul class="sd-func">` 를 쓰는데, **`sd-func` 는 renderer 정의 집합에 없는 무스타일 클래스**다(기존 8,277건 공통 결함, driver 주석에도 기록됨). 이를 새로 도입하면 무스타일 마크업을 늘리는 것이고, 라벨을 li 에 붙이는 대안은 선례 0건이다. → **idiom 결정을 사람에게 이관**했다.

## 5. 적용 계약 (최종)

```
위치   : 왜 이 제품인가 → [공식 인정 기능성] → 섭취방법 → 표시 기준 → 이런 분께
헤딩   : 공식 인정 기능성
구조   : <ul class="sd-why"><li>MAIN_FNCTN 공식 절</li>…</ul>  (라벨 없음)
anchor : <h2>섭취방법 (유일성 검증)
```

SAFE 300건 형태 분포: **라벨 삽입 0 / 평문 300** · 절 수 분포 `1절 197 · 2절 55 · 3절 48` · 헤딩 시그니처 4종(`표시 기준`/`표시 기준 (액상)`/`이런 분께`/`보호자 안내` 조합) 모두 정상 처리.

## 6. 수동 검토

SAFE 300건 중 **60건 균등 간격 수동 검토**(WO 요구 최소 60 충족) + 경계 사례 개별 확인(최다 절·최장 블록·액상·보호자 시그니처).

경계 사례에서 결함 1건을 발견하여 자동 적용에서 제외했다.

| 제품 | 문제 | 조치 |
|---|---|---|
| 포거트(Fourgurt) | 절 중복 + **끝에 쉼표 잔존**(`장건강에 도움을 줄 수 있음,`) — 분리자 정리 누락 | 가드 추가 → `HUMAN_REVIEW` |

추가 가드 2종을 규칙에 상설화했다: 절 끝 분리자(`, ; · ･ ․ 、 •`) 잔존 · 그룹 내 절 중복. 원문 반복은 정책상 실패가 아니지만(dedupe 금지) **자동 적용 대상으로도 올리지 않는다.**

## 7. 렌더 검증 (SAFE 전량)

**래퍼 computed-style 증명:**

| 속성 | 래퍼 없이 | 래퍼 적용 |
|---|---|---|
| `.sd-card` max-width | `none` | **`860px`** |
| `.sd-card` border-radius | `0px` | **`20px`** |
| `.sd-hero` padding | `0px` | **`40px 34px 32px`** |

`cssActuallyApplied: true`.

| 검사 (300건 × 430/820/1280 = **900 렌더**) | 결과 |
|---|---|
| 페이지 가로 overflow / 요소 overflow / 클리핑 | **0 / 0 / 0** |
| 빈 `h2`·`ul`·`li` | **0** |
| 기능성 절 누락 | **0** |
| footer 누락 | **0** |
| 미정의 class | **0** |
| 헤딩 순서 오류 | **0** |
| 섹션 누락 | **0** |
| **패치가 새로 들여온 raw bracket** | **0** |
| 판정 | **PASS** |

> 검증기 교정 1건: `rawBracket` 을 절대 검사로 두면 왜-family `표시 기준` 의 **공식 표기**(`표시량[100,000,000(1억) CFU / 2 g] 이상`)를 결함으로 오판한다(36/900 오탐). 삽입 블록 기인 여부로 **회귀 검사**로 전환했고, 실측 결과 삽입 기인 **0** · 기존 표기 36 이었다.

## 8. Apply (LIVE)

이중 게이트(`--apply` + `HFF_WF825_APPLY_CONFIRM=YES`) · **단일 트랜잭션 300건**.

UPDATE WHERE: `id` · `master_id` · `STORE` · `canonical` · `ko` · `deleted_at IS NULL` · **`content = oldContent`**(낙관적 잠금).

| 항목 | 값 |
|---|---|
| expected / actual UPDATE | **300 / 300** |
| rollback | 없음 |
| INSERT / DELETE | 0 / 0 |
| SPD 총수 BEFORE/AFTER | 120,058 → **120,058** (불변) |
| STORE/ko canonical | 63,321 → **63,321** (불변) |
| **기능성 섹션 부재** | **825 → 525** (−300) |
| HFF canonical | 40,913 → **40,913** (불변) |
| 복원 절 수 | **451** |

트랜잭션 내 사후검증: **전량 hash 대조**(표본 아님) · canonicalDup 0 · 총행수 불변 · `without_fn` 델타 정확 −300 → COMMIT.

## 9. 독립검증 (별도 read-only 세션)

| 검사 | 결과 |
|---|---|
| 대상 new hash 일치 | **300 / 300** |
| old hash 잔존 | **0** |
| SPD 속성 drift | **0** |
| candidate·ProductMaster drift | **0** |
| 삽입 블록 외 byte drift | **0** |
| 공식 절 노출 / 기대 | **451 / 451** |
| 절 원문 verbatim 위반 | **0** |
| 기능성 섹션 중복 삽입 | **0** |
| `sd-intro` drift | **0** |
| footer drift | **0** |
| renderer family drift (`왜 이 제품인가` 유지·`주요 기능성` 미도입) | **0** |
| **대상 밖 525건 drift** | **0** |
| 판정 | **PASS** |

## 10. 전체 corpus 감사

| 항목 | 값 |
|---|---|
| SPD 총수 | 120,058 (불변) |
| STORE/ko canonical | 63,321 (불변) |
| **기능성 섹션 부재** | **525** (825 − 300) |
| HFF canonical | **40,913 불변** |
| **Agent 9 HOLD 348** | **348 전부 canonical 미보유 유지 — 불변** |
| canonicalDup | 0 |
| manifest 밖 write | 0 |
| 판정 | **PASS** |

## 11. 사람 검토 큐

```
apps/api-server/src/scripts/data/hff-ko-why-family-825-human-review-v1.jsonl   (525행)
apps/api-server/src/scripts/data/hff-ko-why-family-825-review-queue-delta-v1.jsonl (825행)
```

원본 큐는 수정하지 않았다. delta 상태 분포: `RESOLVED_UPDATED` 300 · `PENDING` 525.

주요 사유는 **열거 마커 부재(457)** 로, 원문이 `[원료 절…` 형태이거나 마커 없이 서술되어 절 경계를 기계적으로 확정할 수 없다. 사람이 경계만 확정하면 본 WO 와 동일 계약으로 복구 가능하다.

## 12. 산출물

```
hff-ko-why-family-825-classification-v1.json
hff-ko-why-family-825-safe-targets-v1.json
hff-ko-why-family-825-human-review-v1.jsonl
hff-ko-why-family-825-rollback-manifest-v1.json
hff-ko-why-family-825-render-audit-v1.json
hff-ko-why-family-825-apply-results-v1.json
hff-ko-why-family-825-independent-verification-v1.json
hff-ko-why-family-825-post-corpus-audit-v1.json
hff-ko-why-family-825-review-queue-delta-v1.jsonl
```

+ HFF 전용 script 4개(classify / render / apply / verify) · 본 CHECK. 임시 script 는 종료 전 삭제했다.

rollback 은 manifest 의 `oldContent` / `oldContentHash` 로 300건 전량 복원 가능하다.

## 13. 잔여 작업 (묶어서 처리 권장)

| 항목 | 규모 | 성격 |
|---|---|---|
| 기능성 섹션 부재 사람 검토 | **525** | 절 경계 확정(457=마커 부재) |
| `sd-func` 무스타일 클래스 | **8,277** | renderer 정의 집합 밖 — 다원료 기능성 섹션이 무스타일로 렌더 |
| `이런 분께` 섹션 | 15,435 | 정책(구매지원 내러티브 축) |
| 전문가 문의 footer 부재 | 13,955 | CLAUDE.md 콘텐츠 원칙 |

`sd-func` 문제는 본 작업 중 발견한 **신규 항목**이다. 다원료 2건을 자동 적용하지 못한 직접 원인이며, 525건 사람 검토 중 다원료 건에도 동일하게 걸린다. **525건 검토 착수 전에 `sd-func` 정비 방향을 먼저 정하는 것이 효율적이다.**

## 14. 함정 기록

1. **family idiom 을 실측 없이 설계하지 말 것** — `공식 인정 기능성`=평문 `sd-why`(5,702), `원료별 공식 인정 기능성`=`sd-func` 중첩(8,277). `<li><b>라벨</b> 절</li>` 은 선례 0건이다.
2. **`sd-func` 는 무스타일** — renderer 정의 집합에 없다. 새로 도입 금지.
3. **라벨 없는 연속 라인은 직전 그룹의 계속** — 별도 그룹으로 만들면 원료 귀속이 사라진다.
4. **`rawBracket` 은 회귀 검사로** — `표시 기준` 의 `표시량[…]` 은 공식 표기다. 절대 검사는 36/900 오탐.
5. **절 끝 분리자 잔존 가드 필요** — 분할기가 `,`·`·` 를 남기면 렌더에 그대로 노출된다.
6. anchor(`<h2>섭취방법`) 유일성을 반드시 검증할 것 — 복수면 삽입 위치가 모호해진다.

---

*작성: 2026-07-30*
