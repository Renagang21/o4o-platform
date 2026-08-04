# WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1 — CHECK

선행 감사: `WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-AUDIT-V1` (commit `2deeb8e73`)
대상: 1차 — `KO_WRONG_ATTRIBUTION` · `KO_CONTRADICTED`
상태: **LIVE 반영 완료 · 독립검증 PASS**

---

## 1. 무엇을 했나

잘못된 기존 KO STORE canonical 을 부분 수정해 유지하지 않고, **제품별 식약처 e약은요 공식
원문만을 기준으로 KO 설명서를 다시 조립**해 교체했다. 원문 직접 귀속이 불가능한 제품은
재조립하지 않고 HOLD(비노출) 로 내렸다.

| 단계 | 산출물 |
|---|---|
| 1. 계획 (READ-ONLY) | `plan-corrections.ts` → `results/correction-plan.json`, `results/plan-summary.json` |
| 2. 적용 | `apply-corrections.ts` → `results/apply-*.json` |
| 3. 수리 | `repair-oral-prohibition-sentences.ts` → `results/repair-*.json` |
| 4. 독립검증 | `verify-correction-independently.mjs` → `results/independent-verification.json` |
| 5. 잔존 재감사 | 감사 엔진 재실행 → `results/post-correction-live-audit-summary.json` |
| 게이트 입력 생성 | `rebuild-pairs-with-corrections.mjs` (감사 엔진을 **수정 없이** 재사용하기 위한 입력 치환) |
| 공용 계약 | `correction-contract.ts` |

---

## 2. 모집단과 결과

### 2-1. 시작 모집단 (LIVE 재확인)

| 항목 | 값 |
|---|---|
| 대조단위 | **192** (`KO_WRONG_ATTRIBUTION` 32 + `KO_CONTRADICTED` 160) |
| ProductMaster | **808** |
| 감사 시점 md5 가 지금도 canonical | 192 / 192 (**stale 0**) |

### 2-2. 처리 결과

| 구분 | master | 비고 |
|---|---:|---|
| KO 재조립 성공 (REPLACE) | **765** | `KO_CONTRADICTED` 562 + `KO_WRONG_ATTRIBUTION` 203 |
| HOLD (비노출) | **43** | 전부 `KO_CONTRADICTED` |
| 실패 | **0** | |

HOLD 사유: `ROUTE_CONFLICT` 24 · `PROFESSIONAL_USE` 14 · `ROUTE_UNRESOLVED` 5.
재조립 경로 분포: oral 541 / topical 224. 서로 다른 신규 본문 **197종**.

### 2-3. 오귀속 해소의 정량 근거

| 지표 | 기존 오류본 | 신규본 |
|---|---:|---:|
| 2개 이상 허가품목이 공유하는 본문 | 21종 (최대 **15개 품목**이 한 본문 공유) | **0** |
| `<h1>` 제품명 == 자기 제품명 | — | 765 / 765 |
| 타 제품 허가코드 혼입 | — | **0** |

---

## 3. 시정본 자체 결함 1건 — 발견과 수리

독립검증 C6(원문 문장 리터럴 대조)에서 **시정본 쪽 결함**이 나왔다. 러너가 보고한 성공 수를
믿지 않고 LIVE 본문을 원문과 직접 대조했기 때문에 잡혔다.

**원인** — 비경구 route 프로파일의 `NONORAL_REWRITE` 마지막 규칙 `[/내복/g, '사용']`:

```
원문   이 약은 외용으로만 사용하고 내복하지 마십시오.
시정본 이 약은 외용으로만 사용하고 사용하지 마십시오.   ← 자기모순, 경구 금지 정보 소실
```

`국소적으로 적용하거나 복용하지 마십시오` → `…적용하거나 사용하지 마십시오` 도 같은 원리로 파손됐다.
둘 다 **외용/국소와 내복/복용을 대조하는 안전 문장**이라 경로 동사 재표현 대상이 아니다.

**수정 위치 (저작기 근본 수정)**

- `../otc-v2-store-leaflet-runner.shared.ts` — `isOralProhibitionSentence` / `rewriteKoByRoute` /
  `stripOralProhibitionSentences` 추가. 경구 금지 문장은 재표현·금칙(`koForbidden`) 검사 모두에서 제외.
- `../otc-v3-content-leaflet-composer.na.ts` — 위 함수 사용.

문장 분할은 `(?<=[.!?])` 폭 0 분할이다. 처음에는 `(?<=[.!?])(?=\s|$)` 를 썼는데, e약은요 원문은
`…상의하십시오.때때로 …` 처럼 마침표 뒤 공백이 없어 거의 분할되지 않았고, 문장 하나가 걸리면
절 전체가 보존돼 **정당한 재표현까지 되돌아갔다**(수리 대상이 26건으로 과다 집계). 분할을 고친 뒤
수리 대상은 **23건**, 변경 패턴은 위 2종뿐임을 LIVE 본문과 1:1 대조로 확인했다.

**수리 결과** — REPAIRED 23 / 실패 0. 재실행 시 needRepair 0 (멱등).

---

## 4. 실행 이력

| 단계 | 결과 |
|---|---|
| dry-run ×2 | REPLACED 765 / HELD 43 / FAILED 0 — LIVE 무변경 확인 |
| rollback-test | 동일. 트랜잭션 밖 재확인에서 기존 canonical 808 유지, 신규본 LIVE 잔존 0 |
| **LIVE apply** | REPLACED 765 / HELD 43 / FAILED 0 |
| 멱등 재실행 | 808건 전부 `SKIP_ALREADY_APPLIED`, write 0 |
| 수리 dry-run → apply | 23 REPAIRED / 실패 0 |
| 수리 멱등 재실행 | needRepair 0 |

제품 1건 = 독립 트랜잭션 + SAVEPOINT. 대상 행은 `(id, status='canonical', md5(content)=oldMd5)`
3중 일치 시에만 수정한다 — 다른 세션의 변경을 덮어쓰지 않는다.

---

## 5. 독립검증 (`results/independent-verification.json` — **PASS**)

검증기는 `apply-corrections.ts` 를 import 하지 않는다. 러너의 outcome 집계를 신뢰하지 않고
LIVE 를 자체 SQL 로 다시 읽으며, grounding 재검도 러너와 다른 방법(어절 커버리지가 아니라
**문장 리터럴 포함**)을 쓴다. 기대 md5 도 러너 메모리가 아니라 **감사 로그에 기록된 값**에서 읽는다.

| 검사 | 결과 |
|---|---|
| C1 오류본 808건 전부 `deprecated` 보존 | PASS (물리·soft 삭제 0) |
| C2 REPLACE 765 — ko canonical 정확히 1건 · 기대 md5 일치 · `source_type='mfds_drug_otc'` | 765 / 765 |
| C3 HOLD 43 — ko STORE canonical 0건 | 43 / 43 |
| C4 EN·zh·ja write 0 | en 750건 변경 0 / zh 56건 변경 0 |
| C5 대상 밖 update 0 · INSERT 788 · 감사 로그 831 (replaced 788 / withdrawn 43) | PASS |
| C6 원문 문장 전량 반영 & 원문 밖 문장 0 | 765 / 765 (16건은 경로 동사 재표현만 차이) |
| C7 신규본이 2개 이상 허가품목에 공유됨 | **0** |
| C8 수리로 대체된 1차 시정본 23건 보존 | 전부 `deprecated` |

---

## 6. 잔존 WRONG_ATTRIBUTION · CONTRADICTED 재감사 (LIVE 전수)

시정 후 LIVE 에서 대조 집합을 다시 뽑아 감사 엔진을 재실행했다.

```
KO_WRONG_ATTRIBUTION  0
KO_CONTRADICTED       0
```

| 판정 | 대조단위 | ProductMaster |
|---|---:|---:|
| KO_DISPLAY_ONLY_DIFFERENCE | 2,040 | 7,846 |
| KO_MISSING_CONTENT | 2,630 | 9,760 |
| KO_STRUCTURE_REMAINING | 278 | 909 |
| KO_EXTRA_CONTENT | 245 | 841 |
| KO_SOURCE_UNRESOLVED | 10 | 32 |

**확정 번역 모집단: 대조단위 2,040 / 허가품목 1,648 / ProductMaster 7,846**
(감사 시점 7,085 → 엔진 오탐 수정 7,088 → 이번 시정 반영 7,846)

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| KO_WRONG_ATTRIBUTION 활성 canonical 0 | ✅ |
| KO_CONTRADICTED 활성 canonical 0 | ✅ |
| 정상 e약은요 기반 KO canonical 만 노출 | ✅ (765 재조립본) |
| 원문 미확정 제품 HOLD·비노출 | ✅ 43건 |
| 잘못된 KO 를 출처로 하는 번역 대상 0 | ✅ (모집단 재산출) |
| EN·zh·ja 변경 0 | ✅ |
| 대상 밖 update 0 | ✅ |
| 독립검증 PASS | ✅ |

---

## 8. 잔존 위험 (이 WO 범위 밖 — 후속 필요)

1. **기존 코퍼스 224건에 동일한 `내복→사용` 파손 문장이 남아 있다.** 이 WO 의 대상(808)이 아니라
   손대지 않았다. 저작기는 이미 고쳤으므로, 해당 본문들은 재조립 트랙에서 재렌더하면 해소된다.
   실측 쿼리:
   ```sql
   SELECT count(*) FROM shared_product_descriptions
    WHERE deleted_at IS NULL AND status='canonical' AND description_type='STORE'
      AND COALESCE(language,'ko')='ko' AND content LIKE '%외용으로만 사용하고 사용하지%';
   ```
2. **대상 master 에 남아 있는 en 750 / zh 56 canonical 은 잘못된 KO 에서 파생된 것이다.**
   WO 의 "EN·zh·ja write 0" 에 따라 무접촉으로 두었다. 재번역 전까지 **노출 위험이 살아 있다.**
3. HOLD 43건은 KO 설명서가 없는 상태다(비노출). 원문 route 확정 또는 전문의약품 정책 결정 후 별도 처리.

---

## 9. 정정 기록 (이력 재작성 없이 여기에 남긴다)

1. **선행 감사 엔진 오탐 1종 수정** — `../easy-drug-ko-source-consistency-audit/audit-ko-source-consistency.mjs`
   의 경로 축 용법 창(window) 종료 토큰에 `경고|이상반응|상호작용` 이 빠져 있었다. `사용상 주의사항`
   절이 없는 제품에서 창이 닫히지 않아 이상반응 문장(`…항문주위 통증`)이 경로 판정에 섞여
   `KO_CONTRADICTED` 오탐이 났다(itemSeq `202501826` 로 실측).
   수정 후 감사 기준선 변동: CONTRADICTED 161→160 단위 / 608→605 master,
   DISPLAY_ONLY 1,844→1,845 단위 / **7,085→7,088 master**, 허가품목 1,478→1,479.
   → 감사 산출물(`results/audit-summary.json`, `verdict-index.jsonl`, `independent-verification.json`)
   을 고친 엔진으로 재생성했고, 감사 독립검증도 재실행해 **PASS** 를 재확인했다.
   이 수정으로 해당 단위가 대상에서 빠져 1차 대상이 193단위/811master → **192단위/808master** 가 됐다.
2. `2deeb8e73` 커밋 메시지의 모집단 수치(7,085)는 위 오탐 수정 전 값이다. 이력은 재작성하지 않고
   여기에 정정 기록만 남긴다. 현재 유효값은 §6 의 **7,846** 이다.
3. 신규본 `source_type` 은 기존 오류본의 값(특히 `nutrition_combo`)을 승계하지 않고 실제 저작기인
   `mfds_drug_otc` 로 기록한다. 오귀속의 원인이 `nutrition_combo` 확대 적용이었으므로 승계는 부적절하다.
   `source_ref_id` 는 은퇴 행에서 그대로 승계한다("sourceRef 변경 0").

---

## 10. 다음 순서

`KO_MISSING_CONTENT` → `KO_EXTRA_CONTENT` → `KO_STRUCTURE_REMAINING` → 전체 감사 재실행 → 번역 승인 모집단 재잠금
