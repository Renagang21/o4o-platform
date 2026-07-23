# CHECK — 식이섬유 원료 식별 생산 완결 (B-05~B-10) (Agent B) V1

- 상위 WO: `WO-O4O-HFF-DIETARY-FIBER-COMBO-PRODUCTION-B-V1` (준비=`CHECK-...-PREP-B-V1`, `ad17227b0`).
- C parser: `74c9e8f2d`(additive `parseFiberSources`) — **공용 parser 추가 수정 0**(고정 기준).
- 자동승인 계약 적용 · 시작 `2026-07-23 21:21 +0900` · 종료 단일 세션 · 채널 Proxy 5436.

## 0. 결론

> **49건 식이섬유(원료 식별) STORE canonical LIVE (자동 apply · 독립검증 PASS).**
> 차전자피 34 · 난소화성말토덱스트린 10 · 귀리 4 · **이눌린+치커리 2원료 combo 1**. DB write **196**(49×4).
> fixture 회귀 **10/10 PASS** + C selftest **130 PASS**. generic 642 비추정 유지 · 동반원료 1,131 은 combo 라인 분리(HOLD).
> canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0.

## 1. B-05 parser 확인

- `74c9e8f2d` origin 포함 ✓ (additive: `FIBER_SUB`·`classifyFiberSource`·`parseFiberSources`; 기존 `parseSpecs/classify/CLS/SPEC_RE` 무변경).
- 최신 main ff 동기화. 공용 parser/registry 수정 0.

## 2. B-06 fixture 회귀 (전통과)

| 검증 | 결과 |
|---|---|
| C selftest | **130 PASS / 0 FAIL** (REG parseSpecs 불변·FIB 보존/추정0/교차0/aggregate 분리·DET) |
| B fixture 10종 | **10/10 PASS** — 원료별 표시량 보존 · 다원료 비붕괴(난소화성+프락토 분리 유지) · generic 비추정 · X%이상 파싱 · aggregate(총식이섬유) 분리 · deterministic rerun |
| fn-신호 경로 | BASE generic 라벨 + MAIN_FNCTN 원료 식별(차전자단독/난소화성단독) 정상 |

## 3. B-07/08 생산 퍼널

| 단계 | 수 |
|---|---:|
| 스캔 | 41,261 |
| 식이섬유 기능성 | 10,231 |
| **원료 식별(generic-only 제외)** | 1,613 |
| pure-fiber(동반원료 없음) | 482 |
| 고형·미승격·not-taken | 151 |
| grounding READY | 55 |
| **compose+Guard PASS = LIVE** | **49** |

- 조합별: **1원료 48**(차전자피 34·난소화성 10·귀리 4) · **2원료 1**(이눌린+치커리). 3~6원료 pure-fiber 는 fresh 풀에 무존재.
- HOLD 분해(1,320): **PARTNER_COMBO_ROUTE 1,131**(아연·가르시니아·프로바이오틱스 등 동반 → 기능성 누락 방지 위해 combo 라인 대상) · LIQUID 87 · FN_EN_PENDING 90 · SERVING 6 · REVIEW 5 · BLOCKED 1.
- 표현 원칙 준수: 원료별 표시량/generic/총식이섬유 **분리 표기**(혼동 0) · 기능성 KO=MAIN_FNCTN verbatim(축약·순화 0) · EN=mapFunctionEn(임의생성 0) · 물 안내는 원문 근거 시만 · 전문가 footer 유지.

## 4. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candMatch 49(missing/ambiguous 0) · masterDup 0 · 196=49×4 → ROLLBACK(write 0) |
| apply(이중게이트) | **COMMIT** · in-tx postVerify 49/49/49 · canonicalDup 0 |
| 독립검증(새 연결, tag `batch:fiber-sourced-b1`) | masters 49 · spdKo/En 49 · **canonicalDup 0** · candidatesLinked 49 · spdRefLinked 98 · **stmtDupMasters 0** · **PASS** |

- 롤백 매니페스트 `hff-fiber-sourced-b1-rollback-manifest.json`. A/C 교집합 0(순수 fiber 후보는 B 소유 경로, stmt 유일 확인).

## 5. 잔여

- PARTNER 1,131: 식이섬유+타원료 combo — 별도 combo 라인 WO(식이섬유 source 상세는 `parseFiberSources` 재사용 가능).
- FN_EN_PENDING 90: 유익균 증식 등 일부 문구 EN 미매핑 — registry 확장(사람검수) 후 재수확.
- LIQUID 87(음료형) · generic 642(비추정 원칙 유지).

## 6. 산출물

- target/holds/manifest: `docs/checks/data/product-description-guard/hff-fiber-prep/fiber-sourced-b1-*.json`
- 도구(B 전용): `hff-fiber-fixture-regression.ts` · `hff-fiber-produce.ts`

---

*완결형 자동 생산 · DB write 196 · 공용 parser 추가 수정 0 · generic 비추정 · 독립검증 PASS.*
