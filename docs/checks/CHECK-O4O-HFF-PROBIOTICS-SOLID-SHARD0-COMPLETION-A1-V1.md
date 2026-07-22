# CHECK — 프로바이오틱스 고형 pure-single stmt-shard 0 완결 생산 (Agent A) V1

- 성격: **완결형 생산 (자동 apply · 사전승인 반복 생산)** — 공용 정본 파이프라인(Agent B `6fb1218cc`) 재사용: select → 결정적 grounded compose → Guard → dry-run → apply → 독립검증.
- 종료 `2026-07-22 20:58 +0900` (단일 세션).
- 샤딩: **stmt-축 FNV-1a · shard-count 3 · Agent A = shard 0**.
- 기준선: 프로바이오틱스 pure-single(장건강) LIVE **286** (234 + Agent B shard1 52). canonicalDup 0 · statementNo 중복 master 0.

## 0. 결론

> **41건 프로바이오틱스 고형 STORE canonical LIVE 반영 완료 (자동 apply · 독립검증 PASS).**
> DB write **164** (master 41 + candidate 41 + SPD ko 41·en 41) · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0.
> shard 0 대상 131 → grounding-READY 59 → **compose+Guard PASS 41** · REVIEW_LATER 90.

## 1. 정본 파이프라인 재사용 (별도 composer 미사용)

- 조율 결과 Agent B가 `6fb1218cc`로 커밋한 **3에이전트 공용 결정적 파이프라인**만 사용:
  `hff-probiotics-shard-select.ts` · `hff-probiotics-compose.ts` · `hff-probiotics-generate.ts` · `hff-probiotics-shard1-verify.ts` · apply=`hff-probiotics-solid-store-canonical-apply.ts`.
- Agent A가 이전에 검증한 별도 재구성 composer(95% byte-exact)는 **폐기 — 프로덕션 미사용·미커밋**(기록만).
- **byte-parity(기존 234) 게이트 아님.** 정본의 **구조적·의미적·안전성 parity** 적용(compose+Guard 동일 계약).
- FNV-1a stmt-shard 계약 검증: histogram **0:196 / 1:227 / 2:208** — Agent B(§1)와 동일, 상호배타(겹침 0). 축 = stmt `String(STTEMNT_NO).trim()`.

## 2. 선정·생성 퍼널

| 단계 | 수량 |
|---|---:|
| HFF 후보 스캔 | 41,261 |
| pure-single 프로바이오틱스([원료] 브래킷 1종 & PROB) | 643 |
| 고형(액상 제외) | 631 |
| **stmt-shard 0** | **196** |
| 미승격(matched NULL) | 131 |
| exclude-taken(permit canonical STORE SPD 부재) | **131** |
| grounding-READY(CFU·기준량·섭취 PARSED) | **59** |
| compose 성공 | 45 (composeErr 14 = FN_NONSTANDARD 등) |
| Guard PASS | **41** (BLOCKED 2 · REVIEW 2) |

- **REVIEW_LATER 90** = select 72(CFU/SERVING/BASIS parse 실패·BULK 혼합유산균 분말) + generate 18(composeErr 14 · BLOCKED 2 · REVIEW 2).
- generate REVIEW rule: `B-SPEC-MINMAX-003`(4) · `E-NAME-CLAIM-OUTOFSCOPE-003`(1). FN_NONSTANDARD(프로바이오틱스 외 추가 기능성) → pure-single 아님, 자동 제외.
- 이미 병렬 생산분(Agent B/타 세션) = exclude-taken(permit canonical SPD)로 사전 제외됨(notTaken 131 = 순수 미생산).

## 3. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candMatch 41(missing/ambiguous 0) · masterDup 0 · blocked 0 · missDraft/ground 0 · sanitize 비파괴(ko/en byte 동일) → 롤백(write 0) |
| 예상=실측 write | 164 = 41×4 ✓ |
| apply (이중게이트 `HFF_SOLID_CANONICAL_APPLY_CONFIRM=YES`) | **COMMIT** · in-tx postVerify masters/spdKo/spdEn/candidatesLinked 41 · canonicalDup 0 |
| **독립검증(새 연결, `--tag ... --expect 41`)** | masters 41 · spdKo 41 · spdEn 41 · **canonicalDup 0** · candidatesLinked 41 · spdRefLinked 82 · **stmtDupMasters 0** · contentWaterUngrounded 0 · **independentVerifyPass true** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · tag `batch:probiotics-solid-shard0-a1`.
- 기존 LIVE drift 0 (신규 master INSERT + 대상 candidate 41 UPDATE 만, masterDup 0). 롤백 매니페스트 `hff-probiotics-shard0-a1-rollback-manifest.json`(master 41 · spd 82).

## 4. 보고 요약

```text
시작 세션 baseline(프로바이오틱스 pure-single LIVE 286) · 종료 2026-07-22 20:58 +0900
정본: Agent B 6fb1218cc 공용 selector/composer/generate/verify/apply (별도 composer 미사용·미커밋)
stmt-shard 계약: FNV-1a byte-identical · trim · count3 · 0/1/2 배타(196/227/208)
조사 후보: shard0 미승격·not-taken 131 → grounding-READY 59 → PASS 41
READY 41 / REVIEW_LATER 90 / HOLD(BLOCKED) 2 / skip(taken·promoted) 65(196-131)
KO 41 · EN 41 · DB write 164 · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0
프로바이오틱스(장건강) LIVE 총계 767(독립검증 실측, 병렬 세션 동시분 포함)
독립검증 PASS
shard 0 잔여 후보 90(REVIEW_LATER) — clean 자동적용 풀 소진
중지 사유: 없음 (shard 교집합 0 · master 오연결 0 · dup 0 · 예상=실측)
```

## 5. 산출물

- target: `docs/checks/data/product-description-guard/hff-probiotics-shard0-a1.json` (41)
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-probiotics-shard0-a1-rollback-manifest.json` (master 41·spd 82)
- REVIEW_LATER: `docs/checks/data/product-description-guard/hff-probiotics-shard0-a1.review-later.json` (90)
- 본 문서

## 6. 후속 (권고 · 미실행)

- shard 0 잔여 90: 혼합유산균 분말 serving/BULK 파서 하드닝 + CFU 비정형(SOURCE_ABNORMAL) 확보 후 재검토. FN_NONSTANDARD 는 복합 기능성 → combo 라인 대상.
- shard 1(Agent B 완료 52)·shard 2(타 세션) 는 동일 stmt-shard 계약으로 분리 생산.

---

*완결형 자동 생산 · 사전승인. 공용 정본(6fb1218cc) 재사용 · registry/composer 수정 0 · DB write 164 · 독립검증 PASS.*
