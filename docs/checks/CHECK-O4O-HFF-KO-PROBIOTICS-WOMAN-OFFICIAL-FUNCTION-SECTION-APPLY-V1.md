# CHECK-O4O-HFF-KO-PROBIOTICS-WOMAN-OFFICIAL-FUNCTION-SECTION-APPLY-V1

`프로바이오틱스우먼` 공식 인정 기능성 섹션 복원 — **단건 APPLY**

- 근거 WO: `WO-O4O-HFF-KO-PROBIOTICS-WOMAN-OFFICIAL-FUNCTION-SECTION-APPLY-V1`
- 선행 조사: `CHECK-O4O-HFF-KO-MISSING-FUNCTION-CONTAINER-AND-PROBIOTICS-WOMAN-RECOVERY-V1`
- 착수 HEAD: `4b4277eeb`
- 판정: **PASS** — 1건 적용 · 공식 기능성 3절 절 단위 복원

---

## 1. 작업 목적 (정정된 문제 정의)

**누락 콘텐츠 생성이 아니라, 공식 기능성 3절을 별도 구조로 명확히 복원**하는 작업이다.

| 적용 전 상태 | |
|---|---|
| 기능성 의미 | `sd-intro` 산문에 **일부 노출** |
| 전용 기능성 섹션 | **없음** |
| 공식 3절 | 쉼표로 병합 |
| 공식 문구 변형 | `장건강` → `장 건강` |
| 목록 항목으로 식별 가능한 공식 절 | **0 / 3** |

## 2. 결정 사항 (사용자 확정)

| 항목 | 결정 |
|---|---|
| 헤딩 | **`공식 인정 기능성`** (안 A) |
| 선택 근거 | 왜-family 선례 2,226건 · 신규 UI 어휘 없음 · 원료명 미포함으로 복합 제품 재사용 가능 · driver `주요 기능성` 변환 없이 renderer family 보존 |
| 본문 위치 | `왜 이 제품인가` → **`공식 인정 기능성`** → `섭취방법` → `표시 기준` → `이런 분께` |
| 구조 | 문서 내 기존 `<ul class="sd-why">` 재사용 |
| 범위 | **`#35` 단건** (761 시그니처·826 전량 자동 Apply 금지) |
| `sd-intro` | **삭제·수정하지 않음** (역할이 다르며 공식 반복은 실패 조건 아님) |
| DB write | canonical `content` + `updated_at` **1행** |

## 3. 대상

| 항목 | 값 |
|---|---|
| 제품명 | 프로바이오틱스우먼 |
| statementNo | `20040015070125` |
| candidateId | `4b5975c9-0c61-4b06-9acd-aa2ed4081281` |
| canonicalId | `f47c0032-72ad-46a7-8d4b-d1cd9c5e3806` |
| productMasterId | `e870ead8-b553-4e14-ac4d-b467ba4fff47` |
| authoring family | WAE_I_JEPUM (왜-family) |

공식 원문:

```
[프로바이오틱스 제품①유산균 증식 및 유해균 억제에 도움을 줄 수 있음 ②배변활동 원활에 도움을 줄 수 있음 ③장건강에 도움을 줄 수 있음
```

## 4. 삽입 블록

```html
<h2>공식 인정 기능성</h2><ul class="sd-why"><li>유산균 증식 및 유해균 억제에 도움을 줄 수 있음</li><li>배변활동 원활에 도움을 줄 수 있음</li><li>장건강에 도움을 줄 수 있음</li></ul>
```

공식 `장건강` 을 **원문 그대로** 유지했다(산문의 `장 건강` 으로 정규화하지 않음).

## 5. Drift 확인 (Apply 전)

| 검사 | 결과 |
|---|---|
| canonical 존재 | true |
| 제안 기준 hash 일치 | **true** (조사 시점 이후 변경 없음) |
| master 일치 · 속성 유효 | true / true |
| candidate 링크 유효 | true |
| 공식 원문 불변 | true |

제안본은 파일에 저장된 content 를 그대로 신뢰하지 않고 **현재 content 로부터 재생성**했으며, 재생성 결과가 검토본과 byte 일치(`rebuiltMatchesProposal: true`)함을 확인했다.

## 6. 사후 안전 검증 (Apply 전 게이트)

| 검사 | 결과 |
|---|---|
| 삽입 지점 확정 | true |
| 재생성본 = 검토본 | **true** |
| `sd-intro` 무변경 | **true** |
| `sd-foot` 무변경 | true |
| 기존 헤딩 전량 보존 | true |
| 삽입 블록 외 byte 동일 | **true** |
| 절 전량 원문 verbatim | true |
| 절 반영 수 | **3 / 3** |
| 미정의 class | 0 |
| 태그 균형 | true |
| 빈 항목 | 0 |
| family 보존 (`왜 이 제품인가` 유지 · `주요 기능성` 미도입) | **true** |
| 기능성 섹션 단일성 | true |
| 길이 증가 | +133 |

## 7. Apply (LIVE)

이중 게이트(`--apply` + `HFF_PW_APPLY_CONFIRM=YES`) · 단일 트랜잭션.

UPDATE WHERE 에 `id` · `master_id` · `description_type='STORE'` · `status='canonical'` · `language='ko'` · `deleted_at IS NULL` · **`content = oldContent`**(낙관적 잠금) 포함.

| 항목 | 값 |
|---|---|
| expected UPDATE | **1** |
| actual UPDATE | **1** |
| rollback | 없음 |
| INSERT / DELETE | 0 / 0 |
| SPD 총수 BEFORE/AFTER | 119,974 → **119,974** (불변) |
| STORE/ko canonical BEFORE/AFTER | 63,321 → **63,321** (불변) |
| 기능성 섹션 보유 | 40,087 → **40,088** (+1) |
| **기능성 섹션 부재** | 826 → **825** (−1) |

트랜잭션 내 사후검사(새 hash 일치 · canonical 유일성 · 총행수 불변) 통과 후 COMMIT.

## 8. 독립검증 (별도 read-only 세션)

### 8-1. 저장 정합

| 검사 | 결과 |
|---|---|
| 새 hash 일치 | **true** |
| 구 hash 잔존 | **false** |
| SPD 속성 유효 | true |
| candidate 링크 유효 | true |
| 공식 원문 불변 | true |

### 8-2. 내용

| 검사 | 결과 |
|---|---|
| 기능성 섹션 존재 | **true** |
| 헤딩이 family 어휘(`공식 인정 기능성`) | **true** |
| driver 어휘(`주요 기능성`) 미도입 | **true** |
| 절 수 | **3 / 3** |
| 절 전량 원문 verbatim | **true** |
| `sd-intro` 무변경 | **true** |
| `sd-foot` 무변경 | true |
| 기존 헤딩 전량 보존 | true |
| 삽입 블록 외 byte 동일 | **true** |

최종 헤딩 순서 — 결정된 배치와 정확히 일치:

```
왜 이 제품인가 → 공식 인정 기능성 → 섭취방법 (공식 표기 그대로) → 표시 기준 → 이런 분께
```

### 8-3. 렌더 (430 / 820 / 1280)

전 폭에서 페이지 가로 overflow **0** · 요소 overflow **0** · 클리핑 **0** · 빈 항목 **0** · raw bracket 노출 **0** · 공식 절이 목록 항목으로 **3/3** 표시 · 헤딩 5개 정상.

적용 전 baseline 은 목록 항목으로 식별되는 공식 절이 **0/3** 이었다 → **0/3 → 3/3**.

### 8-4. Corpus 보호

| 검사 | 결과 |
|---|---|
| SPD 총수 | 119,974 (불변) |
| STORE/ko canonical | 63,321 (불변) |
| HFF 후보 canonical 보유 | **40,913** (불변) |
| 기능성 섹션 부재 | **825** (기대치 일치) |
| manifest 시점 이후 **다른 행** 갱신 | **0** |
| 판정 | **PASS** |

## 9. 범위 유지 확인

| 항목 | 결과 |
|---|---|
| `#35` 외 canonical 변경 | **0** |
| 761 시그니처 / 826 전량 자동 Apply | **미수행** |
| `sd-intro` 재작성 | **미수행** |
| 공용 driver·parser·renderer·CSS | **미수정** |
| `이런 분께` / 전문가 footer 정책 | **미접촉** (별도 감사 대상) |

## 10. 산출물

```
apps/api-server/src/scripts/data/hff-ko-probiotics-woman-function-section-rollback-manifest-v1.json
apps/api-server/src/scripts/data/hff-ko-probiotics-woman-function-section-apply-results-v1.json
apps/api-server/src/scripts/data/hff-ko-probiotics-woman-function-section-independent-verification-v1.json
apps/api-server/src/scripts/hff-ko-probiotics-woman-function-section-apply.mjs
apps/api-server/src/scripts/hff-ko-probiotics-woman-function-section-verify.mjs
docs/checks/CHECK-O4O-HFF-KO-PROBIOTICS-WOMAN-OFFICIAL-FUNCTION-SECTION-APPLY-V1.md
```

rollback 은 manifest 의 `oldContent` / `oldContentHash` 로 즉시 복원 가능하다.

## 11. 다음 단계 (확정 순서)

1. ~~프로바이오틱스우먼 1건 — 공식 인정 기능성 섹션 적용~~ ✅ **본 CHECK 로 완료**
2. **`WO-O4O-HFF-KO-WHY-FAMILY-MISSING-OFFICIAL-FUNCTION-SECTION-826-CLASSIFICATION-V1`** — 잔여 **825건** 전수 분류
   분류축: `SAFE_EXACT_BOUNDARY` / `ALREADY_PRESENT_IN_ALTERNATE_STRUCTURE` / `AMBIGUOUS_NO_MARKER` / `SOURCE_REVIEW_REQUIRED` / `NO_OFFICIAL_SOURCE`
   > 표본 400건 외삽(안전 약 450 / 불확정 약 376)은 **참고값이며 Apply 수로 사용 금지**. 전수 분석 필요.
3. 안전 대상만 별도 backfill
4. `이런 분께`(15,435) · 전문가 footer 부재(13,955) 정책 감사 — 왜-family 전체 저작 계약 문제

## 12. 인계 메모

1. 본 건으로 잔여 모집단은 **826 → 825**. 후속 분류 WO 의 기준 수치를 825 로 사용할 것.
2. 복구 어휘는 문서가 속한 family 의 자체 헤딩을 따른다. 왜-family 단일 원료 = `공식 인정 기능성`, 다원료 = `원료별 공식 인정 기능성`(선례 8,277).
3. 공식 문구는 산문 표기로 정규화하지 않는다(`장건강` 유지). 산문과의 표기 차이는 결함이 아니다.
4. 기능성 섹션 존재 판정은 헤딩 정규식 `<h2>[^<]*기능성[^<]*</h2>` 으로 한다. 단일 family 어휘 `LIKE` 는 오판한다.
5. 왜-family 검증 시 `is-solid` 클래스를 DEFINED 집합에 포함하고, 태그 균형 검사에 `b`·`small` 을 포함할 것.

---

*작성: 2026-07-30*
