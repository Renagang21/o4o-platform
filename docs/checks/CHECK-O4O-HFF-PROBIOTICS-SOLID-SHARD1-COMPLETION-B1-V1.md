# CHECK — 프로바이오틱스 고형 pure-single stmt-shard 1 완결 생산 (Agent B) V1

- 성격: **완결형 생산 (자동 apply · 사전승인 반복 생산)** — 선정 → 결정적 grounded compose → Guard → dry-run → apply → 독립검증.
- 시작 `2026-07-22 19:59 +0900` · 종료(apply~독립검증) 단일 세션.
- 샤딩: **stmt-축 FNV-1a · shard-count 3 · Agent B = shard 1**.
- 기준선: 복합형 LIVE 3,845(tag-agnostic) 불변(본 배치는 단일 기능성 = 카드<2).

## 0. 결론

> **52건 프로바이오틱스 고형 STORE canonical LIVE 반영 완료 (자동 apply · 독립검증 PASS).**
> DB write **208** (master 52 + candidate 52 + SPD ko 52·en 52) · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0.
> shard 1 대상 149 → grounding-READY 77 → **compose+Guard PASS 52** · REVIEW_LATER 97.

## 1. stmt-shard 계약 검증 (전체 중지 게이트 — 통과)

3 에이전트 공용 FNV-1a 구현 코드 대조:

| 항목 | 결과 |
|---|---|
| FNV-1a 구현 | `h=2166136261; h^=charCodeAt; h=Math.imul(h,16777619)>>>0` — `hff-combo-select`·`hff-combo-shard-plan`·`hff-single-functional-producible`·본 배치 **byte-identical** |
| statementNo 정규화 | `String(STTEMNT_NO).trim()`, 빈 stmt 제외(실측 emptyStmt 0) |
| shard-count | 3 |
| shard 0/1/2 상호배타 | 히스토그램 0:196 / 1:227 / 2:208 (합 631, 겹침 0) |
| 축 구분 | combo=**signature-축**(sig `+` join), 단일기능성=**stmt-축** — 목적상 의도적 분리(원료-축은 프로바이오틱스 독점 skew). 시스템급 불일치 **없음** |

→ 공용 계약 문제 없음. 수정 없이 생산 계속.

## 2. 선정 퍼널 (read-only)

| 단계 | 수량 |
|---|---:|
| HFF 후보 스캔 | 41,261 |
| pure-single 프로바이오틱스([원료] 브래킷 1종 & PROB) | 643 |
| 고형(액상 제외) | 631 |
| **stmt-shard 1** | **227** |
| 미승격(matched NULL) | 149 |
| exclude-taken(permit canonical STORE SPD 부재) | **149** |
| grounding-READY(CFU·기준량·섭취 PARSED) | 77 |
| **compose+Guard PASS** | **52** |

- REVIEW_LATER 97 = select 72(SERVING_PARSE_FAILED·BULK 혼합유산균 분말 / CFU_ABSENT) + generate 25(FN_NONSTANDARD 20·REVIEW 3·BLOCKED 2 Q-TRUNCATED).
- **FN_NONSTANDARD 20** = 프로바이오틱스 외 추가 기능성(면역·체지방 등) 포함 → pure-single 아님, 자동 제외.

## 3. 결정적 grounded composer (신규)

`hff-probiotics-compose.ts` — 기존 hand-authored LIVE 드래프트와 동형 sd-card 를 **결정적**으로 생성(fabrication 0):
- 값 전부 원문 grounding: CFU=`parseCfu` · 기준량=`parseBasis` · 섭취=`parseServing` · 성상/대장균군=BASE_STANDARD · 유통/보관/주의=source. **수치 불변**.
- 기능성 문구 = 프로바이오틱스 공식 인정 기능성(표준). MAIN_FNCTN 이 표준 밖이면 `FN_NONSTANDARD` → REVIEW.
- EN = 조합 composer 표준과 동일 **한글 제품/제조사명 보존**(임의 음역 없음).
- ⚠️ 회귀 교정 2건: ① **물 chip 무근거 금지**(`G-WATER-UNGROUNDED-003`) — 원문 섭취에 물 근거 있을 때만 → BLOCKED 15→3. ② **성상 dangling 괄호** 스트립 → 0.

## 4. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candMatch 52(missing/ambiguous 0) · masterDup 0 · blocked 0 · sanitize 비파괴 → 트랜잭션 롤백(write 0) |
| 예상=실측 write | 208 = 52×4 ✓ |
| apply (이중게이트 CONFIRM=YES) | **COMMIT** · in-tx postVerify masters/spdKo/spdEn/candidatesLinked 52 · canonicalDup 0 |
| **독립검증(새 연결)** | masters 52 · spdKo 52 · spdEn 52 · **canonicalDup 0** · candidatesLinked 52 · spdRefLinked 104 · **stmtDupMasters 0** · **INDEPENDENT_PASS** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · tag `batch:probiotics-solid-shard1-b1`.
- 기존 LIVE drift 0(신규 master INSERT + 대상 candidate 52 UPDATE 만). 롤백 매니페스트 `hff-probiotics-shard1-b1-rollback-manifest.json`(master 52·spd 104).

## 5. 보고 요약

```text
시작 2026-07-22 19:59 +0900 · 종료 단일 세션
stmt-shard 계약: FNV-1a byte-identical · trim+빈stmt제외 · count3 · 0/1/2 배타(196/227/208) · 시스템 불일치 없음
조사 후보: shard1 149(미승격·not-taken) → grounding-READY 77 → PASS 52
READY 52 / REVIEW_LATER 97 / HOLD(BLOCKED) 2(Q-TRUNCATED) / skip(taken·promoted) 78(227-149)
DB write 208 · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0
프로바이오틱스(장건강) LIVE 총계 685
독립검증 PASS
shard 1 잔여 후보 97(REVIEW_LATER: 혼합유산균 BULK/serving 72 · FN_NONSTANDARD 20 · truncated 2 · 기타 3)
중지 사유: 없음
```

## 6. 산출물

- target: `docs/checks/data/product-description-guard/hff-probiotics-shard1-b1.json` (52)
- 롤백 매니페스트: `...hff-probiotics-shard1-b1-rollback-manifest.json`
- REVIEW_LATER: `...hff-probiotics-shard1-b1-review-later.json` (97)
- 신규 도구: `hff-probiotics-shard-select.ts` · `hff-probiotics-compose.ts` · `hff-probiotics-generate.ts` · `hff-probiotics-shard1-verify.ts`

## 7. 후속 (권고 · 미실행)

- shard 1 잔여 97: 혼합유산균 분말 serving/BULK 파서 하드닝 + CFU 표기 비정형(SOURCE_ABNORMAL) 확보 후 재검토. FN_NONSTANDARD 20 은 복합 기능성 → combo 라인 대상.
- shard 0 / shard 2 는 타 세션(A/C) 담당 — 동일 stmt-shard 계약(본 §1)으로 분리 생산 가능.

---

*완결형 자동 생산 · 사전승인. DB write 208 · 독립검증 PASS · registry 수정 0.*
