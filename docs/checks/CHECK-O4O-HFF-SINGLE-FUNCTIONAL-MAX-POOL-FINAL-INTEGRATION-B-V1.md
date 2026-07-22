# CHECK — HFF 단일 기능성 최대 풀 최종 통합·dedup·배정표 확정 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-SINGLE-FUNCTIONAL-MAX-POOL-FINAL-INTEGRATION-B-V1`. 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md).
- 기준 커밋: A 조사 `62575fe80` · B 1차 `1f89782b5` · C 조사 `409733b6d`.
- 성격: **read-only 통합·확정 · DB write 0 · generate/apply 0 · 코드 무변경(이번 세션) · 임의 EN 생성 0.**
- 시작 `2026-07-22 22:31 +0900` · 종료 단일 세션. 공용 코드 단독 소유자 = Agent B.

## 0. 결론

> **A/B/C 조사를 statementNo 기준 통합·dedup → 최종 clean 단일 기능성 READY = 134** (shard A43/B47/C44).
> **READY 총량(134) == shard 합(43+47+44=134) ✓ · sf 내부 COORD_OVERLAP 0** (pure-single 1원료 귀속 = 자동 dedup).
> A 211·C 481 의 대다수는 **기존 등재 원료(nutrient/combo track)·프로바이오틱스·홍삼 own-track** 으로, 신규 sf 아님(§3-4 분해). 기존 79/4,526 LIVE 무변경. **DB write 0.**

## 1. 기준선 (새 연결)

| 지표 | 값 |
|---|---|
| 단일 기능성 LIVE(tag `batch:single-functional-%`) | **79** (A26·B30·C23) |
| 복합형 LIVE (tag-agnostic 카드≥2) | 4,526 |
| canonicalDup / statementNo 중복 master | **0 / 0** |

## 2. 통합 방식 — 정본 sf 파이프라인이 단일 진실

- A/B/C manifest 는 서로 다른 파서·기준으로 산출돼 수량이 엇갈린다. **정본 = 내 `hff-sf-select`**(pure-single·고형·미승격·not-taken·EN `resolveFunctions` 검증). 각 제품은 브래킷 1원료라 **statementNo 자동 dedup**.
- 정본 SF_INGREDIENTS 12원료(원본 5 + maxpool 7) 전량 재선정 → **fresh READY 134** = 원본5 잔여 10(바나바5·히알루론산2·헤마토3) + maxpool7 124(뮤코다당54·인삼28·키토산12·알로에전잎10·홍국9·로즈힙8·키토올리고당3).
- 원본 5 의 79 는 이미 LIVE(taken) → sf-select 자동 제외, 잔여 fresh 만 10.

## 3. A/B/C 원본 후보 수 + 분해

| 소스 | raw READY/producible | 신규 sf(내 134 포함) | REGISTERED(nutrient/combo track) | 홍삼 own | PROB | CANDIDATE_NEW(pending) |
|---|---:|---:|---:|---:|---:|---:|
| **A** | 211 | 82(뮤코다당54·인삼28) | **111**(밀크씨슬37·은행잎33·MSM21·coq10 13·옥타코사놀4·글루코사민3) | 1 | 0 | 17(알로에겔10·표고3·스피루리나2·클로렐라2) |
| **B(내)** | 134 | 134 | 0 | 0 | 0 | 0 |
| **C** | 481 | 12(키토산 overlap) | **363**(차전자피식이섬유137·루테인 등) | 70 | 10 | 26 |

- **A 211 = 82 + 111 + 17 + 1 ✓** · **C 481 = 12 + 363 + 70 + 10 + 26 ✓** (분해 합 일치).
- REGISTERED(A 111 + C 363 = 474)는 **기존 nutrient/combo 파이프라인 대상**(FUNCTIONAL_META/NUTRIENT_META 등재, 일부 이미 LIVE). 신규 sf 아님 → sf 최종 풀 제외.

## 4. 수량 불일치 해소

### 4-1. C 397(readyClean) vs 495(shardSplit) — 해소
- C 의 `shardSplit_readyClean` 165/167/163=**495** 는 **raw producible(481) + 라벨변이 중복 계산** 기준이고, `readyClean_producible` 397 은 C 자체 dedup 후이나 **여전히 등재원료(식이섬유137·루테인 등) 포함**. 둘 다 신규 sf 척도가 아니다.
- 정본 재계산: C 481 중 신규 sf 후보 = CANDIDATE_NEW **26** (그 중 내 키토산과 **COORD_OVERLAP 11**). 나머지 455(REGISTERED 363·홍삼 70·PROB 10·SF overlap 12)는 별도 트랙. → **495/397 은 등재·prob·홍삼 혼입에 기인**, 신규 sf 아님으로 해소.

### 4-2. A 211 vs B 124 — 해소
- 차 87 = REGISTERED 111 − (B가 이미 포함한 겹침) ... 실분해: A 신규 sf(82)는 B 124 에 포함. A 추가분 = REGISTERED 111 + CANDIDATE_NEW 17 + 홍삼 1 = 129. 그 중 **REGISTERED 111 = nutrient track**(sf 아님), **CANDIDATE_NEW 17 = EN 미확정/부분**(pending), **홍삼 1 = own-track**. → B 124 가 신규 sf 로 정확, A 211 초과분은 전부 타 트랙/pending.
- 정본 최종 sf(134)는 B 124(maxpool) + 원본5 잔여 10. A 82 ⊂ B 124.

## 5. 최종 최대 풀 (정본 sf)

| 원료 | READY | shard 0/1/2 | 원료 | READY | shard 0/1/2 |
|---|---:|---|---|---:|---|
| 뮤코다당·단백 | 54 | 24/19/11 | 홍국 | 9 | 2/4/3 |
| 인삼 | 28 | 7/8/13 | 로즈힙 | 8 | 2/3/3 |
| 키토산 | 12 | 2/5/5 | 바나바잎추출물 | 5 | 1/3/1 |
| 알로에 전잎 | 10 | 3/2/5 | 헤마토코쿠스추출물 | 3 | 1/1/1 |
| 홍국/로즈힙/키토올리고당 3 | 3 | 0/1/2 | 히알루론산 | 2 | 1/1/0 |
| **최종 READY** | **134** | **shard 43 / 47 / 44** | 예상 DB write | **536** | =134×4 |

- shard: **0(A) 43 · 1(B) 47 · 2(C) 44** · READY==shard합 ✓ · COORD_OVERLAP(sf 내부) 0.
- REVIEW_LATER/HOLD/GROUNDING_PENDING/SPECIAL_TRACK: 원본5 대량은 이미 LIVE(79). CANDIDATE_NEW(A 17·C 26 비겹침)·REGISTERED(nutrient track)·홍삼(own)·PROB 은 sf 외.

## 6. 직접주입 파일 + 라운드 계획

`docs/checks/data/product-description-guard/hff-sf-final/`:
- `_final-integration-manifest.json`(분해·shard·예상write) · `final-shard-0|1|2.json`(stmt 직접주입) · `final-shard-0|1|2-detail.json`(stmt+ingredient+slug, `hff-sf-generate --ingredient` 용).
- 라운드: 134 는 **단일 라운드 수용**(권장 상한 300~800 내). A/B/C 각 shard detail 파일 → `hff-sf-generate --ingredient <원료> --shard N` → `hff-sf-apply`.

## 7. 회귀검증

| 항목 | 결과 |
|---|---|
| 코드 변경(이번 세션) | **0**(read-only 통합. registry 12원료는 1f89782b5 기반) |
| 기존 sf 79 / 복합형 4,526 LIVE | 무변경 |
| canonicalDup / stmtDup master | 0 / 0 |
| 원료 교차 귀속 | 0 (pure-single 브래킷 1 + labelRe 유일식별) |
| **READY 총량 == shard 0+1+2** | **134 == 134 ✓** |
| shard 0/1/2 교집합 | **0** |
| deterministic rerun | 파서·hash 결정적 |
| DB write | **0** |

## 8. 보고 요약

```text
시작 2026-07-22 22:31 +0900 · 종료 단일 세션
LIVE 기준선: sf 79 · combo 4,526 · canonicalDup 0 · stmtDup 0
통합 원료: 정본 sf 12(원본5+maxpool7) · A 19종/C 45종 조사 통합
A 211 = SF 82 + REGISTERED 111 + CANDIDATE 17 + 홍삼 1
C 481 = REGISTERED 363 + 홍삼 70 + CANDIDATE 26 + SF overlap 12 + PROB 10 (COORD_OVERLAP C∩B 11)
397 vs 495 해소: 둘 다 등재원료(식이섬유137·루테인 등)·prob·홍삼 혼입 → 신규 sf 아님
211 vs 124 해소: A 초과분 129 = REGISTERED 111(nutrient track) + CANDIDATE 17(pending) + 홍삼 1
최종 clean sf READY = 134 (shard A43/B47/C44, READY==shard합, 교집합 0)
예상 DB write = 536 · REGISTERED→nutrient track(별도) · CANDIDATE/PROB/홍삼→별도트랙
배정표 hff-sf-final/ · DB write 0 · 코드 무변경
```

## 9. 후속

- 즉시 생산: 134 를 A/B/C 각 shard detail 파일로 `hff-sf-generate → hff-sf-apply`(자동승인 계약, 단일 라운드).
- 별도 트랙: REGISTERED(밀크씨슬·은행잎·MSM·coq10·식이섬유·루테인 등) = **기존 nutrient/combo 라인**(일부 LIVE, 잔여는 해당 WO). 홍삼 = own-track. PROB = 프로바이오틱스 라인.
- CANDIDATE_NEW(알로에겔·표고·difructose 등): 공식 영문명/기능성 EN 확정 후 registry 편입 WO(사람검수). 임의생성 금지.

---

*read-only 통합·확정 · DB write 0 · generate/apply 0 · 코드 무변경 · 임의 EN 생성 0.*
