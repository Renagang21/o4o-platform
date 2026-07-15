# CHECK — `H-GUARANTEE-SPEC-006` (guarantees 7건) 표본검수

- **지시**: "일괄 정책으로 완화하지 말고, 실제 문맥을 표본 검수해 원인을 나눌 것"
- **일자**: 2026-07-16
- **판정**: **신규 실패 유형 발견 → 규칙 보강 + 초안 정정 완료**
- **DB write**: 0 · **migration**: 0

---

## 1. 결론 (먼저)

7건은 지시하신 3개 버킷 중 **어디에도 정확히 들어가지 않았다.** 넷째 원인이었다.

> 원문은 `표시량(N CFU/기준량) **이상**` 이라는 **규격**만 진술한다.
> 초안은 여기에 **보장 주체**("이 제품은 … 보장합니다")와 **시간 범위**("유통기한까지")를 덧붙였다.
> **둘 다 공식 원문에 없다.**

`표시량은 유통기한까지 유지되어야 한다` 는 규제 일반지식이다. **규제상 참이지만** 이 제품의
공식 원문이 진술하지 않았다 → 실패유형 **② 외부 지식 유입** + **⑤ 추론 확장** 의 복합.

이 유형이 위험한 이유는 **틀린 말이 아니라서 통과한다**는 점이다. 사람 검수자도 "맞는 말"이라
넘긴다. 판정 기준은 "참인가"가 아니라 **"이 제품 원문에 있는가"** 이다.

## 2. 지시하신 3버킷 대조

| 버킷 | 해당 | 근거 |
|---|:---:|---|
| 공식 규격의 보장 수치 의미 → 중립 표현 교체 | **부분** | **수치·기준량은 근거 있음** → 보존. 그러나 문제는 수치가 아니라 **덧붙은 보장·시간 범위** |
| 제품 효과를 보장하는 표현 → BLOCKED/수정 | **아니오** | 효과(기능성) 보장이 아니라 **함량** 보장. 기능성 문구는 `may help …` 로 정상 |
| 단순 번역 선택 문제 → 영어 템플릿 보완 | **아니오** | **ko 도 동일하게 "유통기한까지 보장"** 이다. 번역이 아니라 **원문 이해 단계**의 문제 |

→ 영어 템플릿만 손봤다면 ko 위반 8건이 그대로 남았다.

## 3. 표본검수가 놓친 1건 — 실제 미탐

`guarantees` 로 찾은 것은 7건이지만, **실제 대상은 8건**이었다.

| 제품 | ko | en |
|---|---|---|
| `a3-paraotics` | ✗ "700mg당 100억 CFU 이상을 **유통기한까지 보장**합니다" | ○ "This product's **labelled basis is** …" (중립) |

en 이 이미 중립 표현이라 `guarantees` 스캔에 걸리지 않았다. **ko 만 위반**인 비대칭 사례다.
en 단서로만 표본을 잡으면 놓친다 → 신규 규칙은 **ko·en 양쪽**을 검사한다.

역설적으로 `a3` 의 en 이 쓰던 `labelled basis` 가 정답 문형의 단서였다.

## 4. 내 튜닝 버그 (V1.1 에서 유입)

```ts
- const GUARANTEE_SPEC_CTX = /at least|CFU|shelf life|per (capsule|stick|tablet)/i;
+ const GUARANTEE_SPEC_CTX = /at least|CFU|per (capsule|stick|tablet)/i;
```

V1.1 은 `shelf life` 를 **"규격 문맥이니 정당하다"는 근거로** 사용했다. 정반대다 —
`shelf life` 야말로 **위반 요소 그 자체**다. 위반의 증거를 무해함의 증거로 오인했다.

## 5. 조치

### 5-1. 규칙 보강 (재발 방지)

| ruleId | status | 조건 |
|---|---|---|
| `D-SHELFLIFE-GUARANTEE-007` | **BLOCKED** | ko/en 에 유통기한 보장 주장 + **원문에 근거 없음** |
| `D-SHELFLIFE-GUARANTEE-GROUNDED-008` | REVIEW_REQUIRED | 원문이 실제로 유통기한·보장을 진술 → 사람 확인 |

### 5-2. 초안 정정 (8제품 / 16파일)

**수치·기준량은 손대지 않았다.** 보장 주체·시간 범위만 제거.

```text
✗ 이 제품은 캡슐 1개(350mg)당 10억 CFU 이상을 유통기한까지 보장합니다.
✓ 이 제품의 표시 기준은 캡슐 1개(350mg)당 10억 CFU 이상입니다.

✗ This product guarantees at least 1 billion CFU per capsule (350mg) through its shelf life.
✓ The labelled standard for this product is at least 1 billion CFU per capsule (350mg).
```

정정 스크립트는 **파일당 정확히 1회 치환**을 강제하고, 하나라도 어긋나면 **아무 파일도 쓰지 않는다**.
16/16 통과.

대상: `duolac-biofarm` `neurolabs-denmark` `a2-lactophil-entero` `a3-paraotics`
`b3-w-innerbalance` `b4-drtrue-family` `c5-sleemoon-kids` `d5-viva-bifido`

### 5-3. 문서 반영

| 문서 | 추가 |
|---|---|
| `CONTENT-AUTHORING-PRINCIPLES.md` §4-1 | 실패유형 **⑥ 규격 → 약속 전환** |
| `GROUNDING-GUARD-CHECKLIST.md` §D-2 | "규격을 약속으로 바꾸지 않기" + ko/en 정답 문형 |

## 6. 검증

| 기준 | 결과 |
|---|:---:|
| 신규 규칙이 정정 **전** 8건을 검출 | ✅ BLOCKED 8제품 / findings 15 |
| 정정 **후** BLOCKED | ✅ **0** |
| 잔존 위반 문자열(`유통기한까지 보장` / `through its shelf life`) | ✅ **0** |
| ko/en 수치 대조(`H-COUNT-MISMATCH`) | ✅ 0 (수치 무손상) |
| 과거 오류 회귀 | ✅ **10/10 BLOCKED 유지** |
| 테스트 | ✅ **43/43** (39 → 43, D-SHELFLIFE 4건 추가) |

25건 최종: `PASS 17 · REVIEW 8 · BLOCKED 0` (V1.1 직후 REVIEW 15 → **8**)

REVIEW 8 잔여: `B-SUPERLATIVE-CONTEXT-002` 2 · `C-ABSENCE-NUMERIC-003` 2 ·
`C-ABSENCE-CONTRAST-005` 2 · `C-ABSENCE-SOFT-004` 1 · `B-SPEC-MINMAX-003` 1(보관 문맥 오탐, 의도적 유지)

## 7. 다음 배치(30건)로 넘기는 것

- 신규 규칙 2개가 **작성 전부터 전수 적용**된다 → 이 유형은 30건에서 재발 시 즉시 BLOCKED
- 영어 템플릿 표준 문형: `The labelled standard for this product is at least N CFU per <기준량>.`
- 한국어 표준 문형: `이 제품의 표시 기준은 <기준량>당 N CFU 이상입니다.`
- **교훈**: "규제상 참" 은 grounding 근거가 아니다. 30건 검수 시 `참인가`가 아니라 `원문에 있는가`로 판정한다.
