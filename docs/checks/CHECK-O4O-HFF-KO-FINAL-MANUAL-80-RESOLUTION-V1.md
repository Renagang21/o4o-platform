# CHECK-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1

최종 수동 판정 대상 80건 전수 처리 · 74건 해결 (**92.5%**)

- 근거 WO: `WO-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1`
- 기준 커밋: `e2940fb65` (HEAD 조상 확인)
- 착수 HEAD: `275905888` (= `origin/main`, ahead 0)
- 판정: **PASS** — 50건 수정 · 24건 무변경 확정 · **239절 복원** · 6건 근거 있는 HOLD

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | 타 세션 WIP(cosmetics-partner 13파일 삭제 · `appsCatalog.ts` · `pnpm-lock.yaml` 등) — **경로 미중첩 · 미접촉** |
| DB read-only | 조사·판정·스캔·독립검증 전 세션 `SET default_transaction_read_only = on` |
| 공용 renderer·CSS | **미수정** |
| ProductMaster / candidate / 신규 canonical | **0 / 0 / 0** |
| EN 대상 write | **0** |

작업트리가 clean 이 아니어서 WO §3 에 따라 `git checkout` · `pull` · `pnpm install` 은 수행하지 않았다. HEAD 는 이미 `origin/main` 과 동일했다.

---

## 2. 모집단 재현 — 정확 재현

| 검사 | 결과 |
|---|---|
| 총계 | **80** ✅ |
| `OFFICIAL_SOURCE_CONFLICT` (Track A) | 58 |
| `CANONICAL_STRUCTURE_REQUIRES_REDESIGN` (B) | 11 |
| `INGREDIENT_OWNERSHIP_REQUIRES_HUMAN_APPROVAL` (C) | 10 |
| `BOUNDARY_REQUIRES_HUMAN_APPROVAL` (D) | 1 |
| candidateId / canonicalId 중복 | **0 / 0** |
| DB 미존재 | **0** |
| 전건 ko · STORE · canonical · `o4o_hff_generated` | **true** |
| **공식 원천 부재 343 혼입** | **0** |
| EN 대상 혼입 | **0** |

---

## 3. 핵심 발견 — 과거 HOLD 사유는 데이터 문제가 아니었다

80건을 원문과 1건씩 대조한 결과, **`OFFICIAL_SOURCE_CONFLICT` 로 분류된 58건의 대부분은 원문 손상이 아니었다.**

공식 `MAIN_FNCTN` 의 원료 라벨 형식이 대괄호만이 아니라는 것이 실제 원인이다.

```
[비타민C] 결합조직 형성과 …          ← 기존 파서가 아는 유일한 형식
비타민C : (1) 결합조직 형성과 …       ← 콜론
1) 로즈마리추출물등복합물 : …          ← 번호 + 콜론
- 히알루론산 : 피부보습에 …            ← 하이픈
엠에스엠 - ① 관절 및 연골건강에 …      ← 라벨 - 절
(홍삼) ①면역력 증진·피로개선 …        ← 소괄호
비타민D                              ← 라벨 단독 줄
1. 칼슘과 인이 흡수되고 …
정제1 : [밀크씨슬추출물] ① 간 건강에 … ← 제형 접두 + 대괄호
```

라벨을 읽지 못하니 절이 통째로 버려졌고, 그 결과가 "원문 충돌"로 기록되어 있었다. **올인원 헬스팩은 공식 21그룹 40절 중 1그룹 1절만 렌더되고 있었다.**

---

## 4. 확정한 판정 규칙 7개

| # | 규칙 |
|---|---|
| R1 | 라벨 형식 7종을 모두 공식 라벨로 인정한다 (위 목록) |
| R2 | 원문이 `[무라벨 요약] + [라벨별 절]` 로 이어붙은 경우 **라벨부가 정본**이다 |
| R3 | 원문 라벨이 0개인데 현재 canonical 에 라벨이 있으면 **귀속 근거가 원문에 없다 → 손대지 않는다** |
| R4 | 그룹 **간** 동일 문구는 정상이다. 중복 제거는 **그룹 내부에만** 적용한다 |
| R5 | `(영문)` 절은 KO 에서 제외한다. 단 **원료명 라벨의 영문은 공식 원료명이므로 보존** |
| R6 | `(2) 일일섭취량` 이하는 섭취량 정보이지 기능성 절이 아니다 |
| R7 | 기존 절은 삭제하지 않는다. 사라지는 절은 **손상**이거나 **표기 정정**임을 증명해야 한다 |

R7 의 두 예외는 기계적으로 판정했다.
- **손상**: `EPA 및 DHA 함유유지 : (` · `… : 난소화성말토덱스트린 식이섬유로서` · `기능성 내용 :` 접두 · 대괄호/영문 잔존
- **표기 정정**: 앞뒤가 함께 일치하는 동일 기능 (`…피부손상으로부터 피부건강을 유지하는데 도움을` ↔ `…피부손상으로부터 피부 건강 유지에 도움을`) — 접두+접미 일치율 ≥ 0.6

---

## 5. 최종 판정 (합계 80 ✅)

| 상태 | 건수 |
|---|---|
| **RESOLVED_UPDATED** | **50** |
| **RESOLVED_NO_CHANGE** | **24** |
| `FINAL_HOLD_INGREDIENT_OWNERSHIP_UNRESOLVED` | **5** |
| `FINAL_HOLD_CANONICAL_REDESIGN_REQUIRED` | **1** |
| `FINAL_HOLD_OFFICIAL_TEXT_CONFLICT` | **0** |
| `FINAL_HOLD_SOURCE_REPAIR_NOT_DETERMINISTIC` | **0** |
| `FINAL_HOLD_BOUNDARY_UNRESOLVED` | **0** |
| `FAILED_SYSTEM` | **0** |

> **원문 손상으로 최종 확정된 건은 0건이다.** 58건 전량이 파싱 문제였고, 원문 정본은 온전했다.

**RESOLVED_NO_CHANGE 24건**은 현재 canonical 이 이미 정확한 경우다. 과거 `CLAUSE_OVERLAP` / `DUPLICATE_CLAUSE` 사유는 셀렌과 비타민E가 각각 공식 보유한 유사 문구를 중복으로 오판한 것이었다(R4).

---

## 6. 복구 실적 — 기능성 **239절**

| 제품 | 복구 |
|---|---|
| 올인원 헬스팩 | 1그룹 → **21그룹 40절** (정제1~4 전 원료) |
| 위클리 스킨핏 | 1그룹 → **24그룹 43절** |
| 이알하나 ERr731 | 1그룹 → **13그룹 19절** |
| 센트룸 원데이팩 우먼 2030 | 1그룹 → **24그룹** |
| 건기남의 올레유러핀 | 바나바잎만 → **올리브잎주정추출물(제2014-9호) 혈압 조절 복원** |
| 차전자피 카테킨 다이어트 | 녹차만 → **차전자피식이섬유 2절 복원** |
| 유렉스 프로바이오틱스 · 쾌변엔 천둥이 | **기능성 섹션 자체 신설** |

개별인정번호(`제2014-9호`, `제2023-10호` 등)는 라벨에 보존했고, 렌더 검증에서 누락 0을 확인했다.

---

## 7. renderer family — 3종 공존 발견

작업 중 이 코퍼스에 **3개의 renderer family** 가 공존함을 확인했다.

| family | 마크업 | 라벨 지원 |
|---|---|---|
| WAE | `<ul class="sd-func"><li><b>라벨</b><ul class="sd-why">` | O |
| DRIVER | `<div class="sd-core"><div class="sd-item"><span class="sd-tag">라벨</span>` | O (래퍼 없는 변형도 존재) |
| FN | `<ul class="sd-fn"><li>절` | **X (평면 전용)** |

초기 구현은 전부 `sd-func` 로 렌더해 **family 를 바꾸고 있었다**(WO §7 금지). family-aware 로 교정했고, `sd-fn` 문서 중 라벨 구조가 필요한 1건은 전환하지 않고 **HOLD** 로 남겼다.

---

## 8. 적용 전 결함 교정 8건

| # | 결함 | 증상 | 교정 |
|---|---|---|---|
| 1 | **검증기 중첩 `<li>` (이 세션 5회차 재발)** | `sd-func` 그룹의 **마지막 절**을 매번 누락(11그룹 17절 → 6절) → 대량 허위 HOLD | 그룹 경계 split + 최말단 li |
| 2 | 라벨 형식 미인식 | 콜론·번호·하이픈·소괄호·단독 줄 라벨 전부 유실 | 라벨 패턴 7종 |
| 3 | `(영문)` 인라인 | `… 있음 (영문) May help …` 이 한 절로 | 영문 이후 절단 |
| 4 | 라벨 목록의 쉼표 오인 | `[나이아신, 비타민B6, 비타민B1]` → 라벨이 `비타민B1` 로 잘림 | 대괄호 균형 검사 |
| 5 | 제형 접두 | `정제1 :` 이 라벨로 채택 | 제형 토큰 배제 |
| 6 | 일일섭취량 줄의 라벨부 | 스킵된 줄 끝의 `,[난소화성말토덱스트린] …` 유실 | 라벨부만 분리 |
| 7 | **renderer family 전환** | DRIVER/FN 문서를 WAE 로 변환 | family 보존 |
| 8 | 이미 펼쳐진 절의 축약 | 홍삼 5절 → 통합 1절로 **후퇴** | 이미 동등하면 무변경 |

1·7·8 은 스캔·렌더 게이트가 잡아낸 것으로, 게이트가 없었다면 그대로 적용됐을 결함이다.

---

## 9. 정밀 스캔 (SAFE 50 전량)

| 검사 | 결과 |
|---|---|
| 절 verbatim 위반 | **0** |
| 대괄호·마커·영문·분리자·짧은 절·머리말 | **0** |
| 라벨 verbatim 위반 | **0** |
| 그룹 내 중복 | **0** |
| **기능성 영역 밖 1글자 drift** | **0** |
| renderer family 변경 | **0** |
| 공식 절 소실 | **0** |
| 전문가 안내·h2 소실 | **0 / 0** |
| 판정 | **clean: true** |

---

## 10. 렌더 검증

래퍼 증명: `.sd-card` max-width — 래퍼 없음 `""` → 적용 **`860px`** (`cssActuallyApplied: true`), border-radius `20px`, hero padding `28px 22px 24px`, badge radius `14px`.

| 검사 (50문서 × 430/820/1280 = **150 렌더**) | 결과 |
|---|---|
| page/element overflow · clipping | **0 / 0 / 0** |
| 빈 h2·ul·li·section | **0** |
| 미정의 class · raw HTML | **0 / 0** |
| 열거 마커 · 영문 노출 | **0 / 0** |
| **라벨 소실 · 개별인정번호 소실** | **0 / 0** |
| 원료 간 혼입 · 그룹 내 중복 | **0 / 0** |
| 전문가 안내 · 기능성 섹션 누락 | **0 / 0** |
| 판정 | **PASS** |

---

## 11. Apply (LIVE)

이중 게이트(`--apply` + `HFF_MANUAL80_APPLY_CONFIRM=YES`) · 단일 트랜잭션.

UPDATE 가드: `id` · `master_id` · `STORE` · `canonical` · `ko` · `source_type` · `deleted_at IS NULL` · **DB 측 `sha256(convert_to(content,'UTF8'))` = oldContentHash**.

| 항목 | 값 |
|---|---|
| expected / actual UPDATE | **50 / 50** |
| hash drift 로 건너뛴 행 | **0** |
| rollback | 없음 |
| SPD 총수 | 120,123 → **120,123** |
| KO canonical | 40,918 → **40,918** |
| **EN canonical** | 15,498 → **15,498** |
| HFF ProductMaster | 40,948 → **40,948** |

허용 write 는 `content` + `updated_at` 뿐이며 INSERT/DELETE/status/language/master_id 변경은 없다.

---

## 12. 독립검증 (별도 read-only 세션) — **PASS**

| 검사 | 결과 |
|---|---|
| new hash 일치 | **50 / 50** |
| old hash 잔존 | **0** |
| **rollback 역연산 복원** | **50 / 50** |
| 절 verbatim 위반 | **0** |
| 대상 행 필드 drift | **0** |
| **대상 밖 30건 drift** | **0** |
| canonicalDup | **0** |
| 전역 카운트 4종 | **전부 불변** |
| 상태 합계 | **80** ✅ |

---

## 13. 최종 수동 미결 큐 — 6건

```
hff-ko-final-manual-unresolved-v1.jsonl        (6행)
hff-ko-final-manual-unresolved-summary-v1.json
```

| 사유 | 건수 | 내용 |
|---|---|---|
| `INGREDIENT_OWNERSHIP_UNRESOLVED` | **5** | 공식 원문에 원료 라벨이 없는데 canonical 에는 라벨이 있다. 절-원료 귀속을 원문으로 확정할 수 없다 (콘드로이친 3형제 · 대관절 만보 천보 · 로젠빈 우먼밸런스) |
| `CANONICAL_REDESIGN_REQUIRED` | **1** | `sd-fn` 평면 family 에 라벨 구조가 필요하다 (장인정신 홍삼젤리 — 나이아신 그룹) |

각 행에 `officialEvidenceChecked` · `confirmedFacts` · `conflictingFacts` · `requiredHumanAuthority` · `requiredNextAction` · `retryCondition` 을 기록했다. 중복 0.

---

## 14. 공식 원천 부재 343건 — 동결 확인

| 항목 | 상태 |
|---|---|
| 재조사·재분류 | **미수행** |
| 삭제·archive | **없음** |
| 큐 혼입 | **0** |
| 상태 | `FINAL_HOLD_OFFICIAL_SOURCE_MISSING` 유지 |

## 15. 번역 대상 불변

EN canonical 15,498 **변경 0** · EN 기능성 HOLD 824 미접촉 · EN 짝 없는 KO 25,415 미접촉 · KO→EN 번역 미수행.

---

## 16. 산출물

```
hff-ko-final-manual-80-population-v1.json
hff-ko-final-manual-80-decisions-v1.json
hff-ko-final-manual-80-safe-targets-v1.json
hff-ko-final-manual-80-rollback-v1.json
hff-ko-final-manual-80-scan-v1.json
hff-ko-final-manual-80-render-audit-v1.json
hff-ko-final-manual-80-apply-results-v1.json
hff-ko-final-manual-80-independent-verification-v1.json
hff-ko-final-manual-unresolved-v1.jsonl
hff-ko-final-manual-unresolved-summary-v1.json
```

+ script 6개 · 본 CHECK. 임시 조사 파일 전량 삭제.

**rollback**: `newBlock → oldBlock` 치환(섹션 신설 건은 삽입분 제거) 후 `oldContentHash` 대조 — 50/50 검증 완료.

---

## 17. 잔여 전체 그림

| 집합 | 이전 | 현재 |
|---|---:|---:|
| 공식 원천 부재 (동결) | 343 | **343** |
| 원문 손상 | 58 | **0** |
| 구조 재설계 | 11 | **1** |
| 원료 귀속 | 10 | **5** |
| 절 경계 | 1 | **0** |
| **미결 합계** | 423 | **349** |

HFF KO 41,261건 중 실질 미결은 **349건(0.85%)** 이며, 그중 **343건은 식약처 공식 원천 자체에 기능성·섭취방법이 없는 건**이다. 플랫폼 측에서 더 진행할 수 있는 대상은 **6건**뿐이고, 그 6건 모두 사람의 권한 판단(원료 귀속 확정 / renderer family 전환 승인)을 필요로 한다.

---

## 18. 함정 기록

1. **중첩 `<li>` — 이 세션 5회째 재발.** 이번엔 정규식 non-greedy 가 그룹의 **마지막 절**을 매번 삼켰다(11그룹이면 정확히 11절 손실). `sd-func` 구조를 다루는 코드는 **그룹 경계 split + 최말단 li** 를 기본값으로 할 것. 이 결함은 "데이터가 손상됐다"는 잘못된 결론을 만든다.
2. **renderer family 는 3종이다.** `sd-func`/`sd-why` 만 가정하면 DRIVER(`sd-core`/`sd-item`/`sd-tag`)와 FN(`sd-fn`) 문서를 조용히 변환한다. 수정 전 반드시 family 를 먼저 판별할 것.
3. **`sd-fn` 은 라벨을 표현할 수 없다.** 평면 목록에 원료별 기능성을 넣으면 "이 홍삼의 공식 기능성" 같은 헤딩과 내용이 어긋난다.
4. **공식 라벨 형식은 대괄호만이 아니다.** 콜론·번호·하이픈·소괄호·단독 줄 모두 라벨이다. 이걸 모르면 정상 데이터가 "원문 충돌"로 기록된다.
5. **이미 개별 절로 펼쳐진 문서를 통합 절로 되돌리지 말 것.** 원문 verbatim 이 항상 더 나은 표현은 아니다.
6. `product_masters` 에는 `deleted_at` · `category` 컬럼이 없다. HFF 카운트는 `regulatory_type='건강기능식품'`.

---

*작성: 2026-07-31*
