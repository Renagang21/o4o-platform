# CHECK — 프로바이오틱스 고형 pure-single stmt-shard 2 완결 생산 (Agent C) V1

- 성격: **완결형 생산 (자동 apply · 사전승인 반복 생산)** — 선정 → 결정적 grounded compose → Guard → dry-run → apply → 독립검증.
- 종료 `2026-07-22 20:57 +0900` · 단일 세션.
- 샤딩: **stmt-축 FNV-1a · shard-count 3 · Agent C = shard 2**.
- 기준선: 복합형 LIVE 3,845(tag-agnostic) 불변(본 배치 = 단일 기능성, 카드<2).
- **공용 계약 재사용**: Agent B commit `6fb1218cc`(origin/main 동기 확인)의 프로바이오틱스 공용 selector·composer·generate·verify 만 사용. **신규/WIP composer 미사용**(작성 중이던 자체 복원 composer는 폐기).

## 0. 결론

> **41건 프로바이오틱스 고형 STORE canonical LIVE 반영 완료 (자동 apply · 독립검증 PASS).**
> DB write **164** (master 41 + candidate 41 + SPD ko 41·en 41) · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0.
> shard 2 대상 123(=미승격·not-taken) → grounding-READY 59 → **compose+Guard PASS 41** · REVIEW_LATER 82.
> 프로바이오틱스(장건강) LIVE 총계 **726** (Agent B shard1 685 → +41).

## 1. stmt-shard 계약 (전체 중지 게이트 — 통과)

- FNV-1a(normStmt) % 3 == 2. Agent B §1 과 동일 byte-identical 구현(`hff-combo-select`·`hff-probiotics-shard-select` 공용).
- shardHistogram 0:196 / 1:227 / **2:208** (Agent B 실측과 일치, 상호배타·겹침 0). emptyStmt 0.
- 축 구분: 단일기능성=stmt-축(combo=signature-축과 의도적 분리). 시스템급 불일치 없음.

## 2. 선정 퍼널 (read-only, `hff-probiotics-shard-select --shard 2`)

| 단계 | 수량 |
|---|---:|
| HFF 후보 스캔 | 41,261 |
| pure-single 프로바이오틱스([원료] 브래킷 1종 & PROB) | 643 |
| 고형(액상 제외) | 631 |
| **stmt-shard 2** | **208** |
| 미승격(matched NULL) | 123 |
| exclude-taken(permit canonical STORE SPD 부재) | **123** |
| grounding-READY(CFU·기준량·섭취 PARSED) | 59 |
| **compose+Guard PASS** | **41** |

- REVIEW_LATER 82 = select 64(CFU_ABSENT/CFU_ABNORMAL/CFU_PARSE_FAILED · SERVING_PARSE_FAILED · BULK 혼합유산균 분말) + generate 18(composeErr/FN_NONSTANDARD 15 · REVIEW 2 B-SPEC-MINMAX-003 · BLOCKED 1).
- 대상 123 = 태스크 예상치와 일치. READY 41 + REVIEW_LATER 82 = 123.

## 3. 결정적 grounded composer (Agent B 공용 `hff-probiotics-compose.ts`)

- 값 전부 원문 grounding: CFU=`parseCfu` · 기준량=`parseBasis` · 섭취=`parseServing` · 성상/대장균군=BASE_STANDARD · 유통/보관/주의=source. 수치 불변(fabrication 0).
- 기능성 문구 = 프로바이오틱스 공식 인정 기능성(표준). MAIN_FNCTN 표준 밖 → FN_NONSTANDARD → REVIEW.
- EN = 조합 composer 표준과 동일 **한글 제품/제조사명 보존**(임의 음역 0, LLM 미개입). 예: EN h1 = "뉴메이트 프로바이오 유산균19".
- G-WATER-UNGROUNDED-003(물 chip 무근거 금지) 준수 — 독립검증 contentWaterUngrounded 0.

## 4. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candMatch 41(missing/ambiguous 0) · masterDup 0 · BLOCKED 0 · draft/grounding 결손 0 · sanitize 비파괴(ko/en byte 동일) → 롤백(write 0) |
| 예상=실측 write | 164 = 41×4 ✓ |
| apply (이중게이트 CONFIRM=YES) | **COMMIT** · in-tx postVerify masters/spdKo/spdEn/candidatesLinked 41 · canonicalDup 0 |
| **독립검증(새 연결)** | masters 41 · spdKo 41 · spdEn 41 · **canonicalDup 0** · candidatesLinked 41 · spdRefLinked 82 · **stmtDupMasters 0** · contentWaterUngrounded 0 · **INDEPENDENT_PASS** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · tag `batch:probiotics-solid-shard2-c1`.
- 기존 LIVE drift 0(신규 master INSERT + 대상 candidate 41 UPDATE 만). 롤백 매니페스트 `hff-probiotics-shard2-c1-rollback-manifest.json`(master 41·spd 82).
- 인프라: 공용 proxy(5433) 백엔드 토큰 만료로 heavy-scan ECONNRESET → 자체 proxy(5434, fresh `gcloud` 토큰) 기동 후 진행(공용 proxy 무간섭).

## 5. 보고 요약

```text
종료 2026-07-22 20:57 +0900 · 단일 세션
공용 계약: Agent B 6fb1218cc selector/composer/generate/verify 재사용 · 자체 composer 폐기
stmt-shard 계약: FNV-1a byte-identical · count3 · 0/1/2 배타(196/227/208)
조사 후보: shard2 대상 123(미승격·not-taken) → grounding-READY 59 → PASS 41
READY 41 / REVIEW_LATER 82(select 64 + generate 18) / HOLD(BLOCKED) 1 / skip(taken·promoted) 85(208−123)
DB write 164 · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0
프로바이오틱스(장건강) LIVE 총계 726
독립검증 PASS
shard 2 잔여 후보 82(REVIEW_LATER: 혼합유산균 BULK/serving·CFU 비정형 64 · FN_NONSTANDARD/compose 15 · REVIEW 2 · truncated 1)
중지 사유: 없음
```

## 6. 산출물

- target: `docs/checks/data/product-description-guard/hff-probiotics-shard2-c1.json` (41)
- 롤백 매니페스트: `...hff-probiotics-shard2-c1-rollback-manifest.json`
- REVIEW_LATER(select): `...hff-probiotics-shard2-c1-review-later.json`
- 도구: 전부 Agent B 커밋 재사용(신규 파일 0). 독립검증 `hff-probiotics-shard1-verify.ts --tag ... --expect 41`.

## 7. 후속 (권고 · 미실행)

- shard 2 잔여 82: 혼합유산균 분말 serving/BULK 파서 하드닝 + CFU 비정형(ABNORMAL/ABSENT) 확보 후 재검토. FN_NONSTANDARD 는 복합 기능성 → combo 라인.
- shard 0 는 타 세션(A) 담당 — 동일 stmt-shard 계약으로 분리 생산.

---

*완결형 자동 생산 · 사전승인. DB write 164 · 독립검증 PASS · registry 수정 0 · 신규 composer 0(공용 계약 재사용).*
