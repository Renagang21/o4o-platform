# CHECK — UNKNOWN_SPEC 잔여 shard1 census · 안전 생산 없음 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-UNKNOWN-SPEC-REMAINDER-BULK-B-V1` (shard = `stableHash(statementNo) % 3 = 1`).
- 성격: **read-only census · DB write 0 · 공용 parser/registry 무수정.**
- 시작 `2026-07-25 07:18 +0900` · 종료 단일 세션. 채널 Proxy 5438.

## 0. 결론

> **shard1 UNKNOWN_SPEC 잔여를 전수 census한 결과, WO 조건(「명백한 동의표현만 additive」+「다수 회수 반복 패턴」+「공용 parser/registry 무수정」)을 만족하는 안전 생산 후보 = 0.**
> 미해석 라벨의 대부분은 (a) 등록원료의 SPEC **포맷 갭**(→ 공용 parser 영역, C 담당) 또는 (b) parser 아티팩트/지표성분으로, B 전용 동의어 overlay 로 회수 불가. **생산 0 · DB write 0.**

## 1. census (read-only)

- produced/promoted 제외 = **15,002**. shard1 미생산 = **8,509** 중 `parseSpecs.unknownLabels` 존재 = **4,111** · distinct 라벨 **980**.

## 2. 미해석 라벨 분류 (빈도합)

| 범주 | distinct | 빈도합 | 처리 |
|---|--:|--:|---|
| **classify-HIT (등록원료 SPEC 포맷 갭)** | 381 | **3,966** | 라벨은 classify 되나 SPEC_RE 가 값 캡처 실패(형식 변이) → **공용 parser 영역(C 담당)**. B overlay 로 값 복구 불가 |
| **parser artifact** (`(표시량`·`g)`·`…의합`·`최종제품`·`총다당체`) | 207 | 2,969 | 정규식 노이즈 — 실 원료 아님 |
| **기타 미등록 라벨** | 358 | 1,438 | 조단백질(EN pending)·히알루론산/포스파티딜세린/키토산/포스콜린(이미 sf registry)·엘라그산/총폴리페놀/안토시아노사이드(**지표·식물화학 성분, 원료 아님**)·크레아틴(EN pending) |
| **registered/sf 지표성분** (코로솔산=바나바·모나콜린K=홍국·아스타잔틴=헤마토) | 17 | 379 | 이미 sf 파이프라인이 소유(라벨=지표성분). 별도 회수 불요 |
| **own-track 홍삼** (Rg3의합·Rb1의합=진세노사이드) | 17 | 36 | 홍삼 별도 파이프라인 |

## 3. 안전 생산 불가 판정 (WO 가드 준수)

- **classify-HIT 포맷 갭(3,966)**: 라벨은 이미 분류되나 값/단위/기준량을 SPEC_RE 가 **형식 변이로 놓침**. 복구 = SPEC_RE 확장 = **공용 parser 수정(WO 금지, C 소유)**. B 동의어 overlay 는 값 파싱 갭을 못 고친다.
- **artifact(2,969)**: 실 원료 아님 — 회수 대상 없음.
- **기타 미등록(1,438)**: 대부분 지표·식물화학 성분(엘라그산·총폴리페놀·안토시아노사이드 등)으로 **원료명 추정 필요** → WO 「추정 필요 제품 HOLD」·「총량을 원료량으로 사용 금지」에 저촉. 명확 원료(대두이소플라본·크레아틴 등)는 **registry+EN 신설 필요**(WO 「registry 수정 금지」).
- **동의표현(synonym) 회수**: `classify`(공용) 가 이미 광범위(셀렌=셀레늄 등 포함)해, B overlay 로 다수 회수할 **미등록 동의어 반복 패턴 부재**.

→ 「값·단위·기준량이 원문에 명확 + 공용 무수정 + 다수 회수」를 동시 만족하는 패턴 **0**. **생산하지 않음**(개별 추정·희귀 라벨 수리 금지 원칙 준수).

## 4. 보고

```text
처리 후보: shard1 미생산 8,509 · unknownLabel 보유 4,111 · distinct 980
추가한 라벨 패턴: 0 (안전 동의표현 부재)
신규 LIVE: 0 · DB write: 0
PASS/HOLD: 생산 0 / 전량 census-분류(회수 불가)
HOLD 상위 원인: 등록원료 SPEC 포맷 갭 3,966(parser 영역) · artifact 2,969 · 지표/식물화학·미등록 1,438
canonicalDup·statementNo 중복: 해당 없음(write 0)
기존 LIVE drift: 0 · 독립검증: N/A(write 0)
남은 후보: 회수는 (1) 공용 SPEC_RE 포맷 확장(C) (2) registry+EN 신설(사람검수) 선행 필요
```

## 5. 핸드오프 (권고)

- **최대 회수 레버 = classify-HIT SPEC 포맷 갭 3,966**(등록원료인데 값 미캡처). 이는 **Agent C 공용 parser(SPEC_RE 형식 변이)** 확장 대상 — B 금지. C 확장 후 재-census 시 대량 회수 가능.
- 미등록 명확 원료(대두이소플라본·크레아틴 등)는 registry+EN 정본(사람검수) WO.

## 6. 산출물

- census: `docs/checks/data/product-description-guard/hff-unknown-spec-shard1-census.json` (980 라벨 빈도)
- 도구: `hff-unknown-spec-census.ts` (read-only)

---

*read-only census · DB write 0 · 공용 parser/registry 무수정 · 추정 생산 0(가드 준수).*
