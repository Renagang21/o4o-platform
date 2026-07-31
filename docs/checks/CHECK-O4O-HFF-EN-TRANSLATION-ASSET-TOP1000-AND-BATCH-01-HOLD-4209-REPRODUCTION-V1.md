# CHECK-O4O-HFF-EN-TRANSLATION-ASSET-TOP1000-AND-BATCH-01-HOLD-4209-REPRODUCTION-V1

상위 1,000문구 선정 · **번역 자산 250종 확정** · 4,209건 재생산 **0건**

- 근거 WO: `WO-O4O-HFF-EN-TRANSLATION-ASSET-TOP1000-AND-BATCH-01-HOLD-4209-REPRODUCTION-V1`
- 기준 커밋: `c3b5c72c6` (조상 확인)
- 착수 HEAD: `6ca8f5073` (= `origin/main`, ahead 0)
- 판정: **미달** — 선정·번역 자산은 확정, **canonical 생산 0건** (DB write 없음)

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | `pnpm-lock.yaml` · 타 세션 CHECK — **미접촉** |
| DB | 전 세션 read-only · **write 0** |
| KO canonical / ProductMaster / candidate | **미수정** (KO hash drift 0 검증) |
| 공용 renderer·CSS | **미수정** |

---

## 2. 모집단 재현 — 정확 재현

| 검사 | 결과 |
|---|---|
| **총계** | **4,209** ✅ |
| Track A (기존 EN HOLD) | **33** |
| Track B (신규 EN 미생성) | **4,176** |
| master / KO 중복 | **0 / 0** |
| Track A EN 존재 · Track B EN 부재 | **전건 true** |
| KO 존재·master 일치 | **전건 true** |
| 영구 HOLD 345 혼입 · Batch 01 외 혼입 | **0 / 0** |
| 잔여 고유 문구 재현 | **4,362** ✅ |

---

## 3. 상위 1,000 선정 — 결정적

발생 횟수가 아니라 **문서 해소 효과**로 선정했다. 문서 하나를 만들려면 모든 슬롯이 커버되어야 하므로, "미커버가 적게 남은 문서"에 등장하는 문구가 실제로 문서를 푼다.

각 문구에 계산한 값: `documentCount` · `occurrenceCount` · `documentsWithOneMissingPhrase` · `documentsWithTwoMissingPhrases` · `documentsWithThreeOrFewerMissingPhrases` · `estimatedDocumentsUnlocked`(미커버 n개 문서에서 1/n 배분) · `translationComplexity` · `riskLevel`.

정렬: 해소기대값 → 1개남은문서 → 2개남은문서 → 문서수 → phraseId. **재실행해도 동일하다.**

### 문서별 미커버 분포 — 이번 작업의 핵심 지표

| 미커버 문구 수 | 문서 수 |
|---|---:|
| **1개** | **1,769** |
| 2개 | 715 |
| 3개 | 545 |
| 4–5개 | 637 |
| 6–10개 | 439 |
| 11개+ | 104 |

선정 1,000종 전량이 승인되면 **2,539 문서**가 완전 해소된다(상한 추정).

### category별 선정 (층화 쿼터 적용)

| category | 선정 |
|---|---:|
| USAGE | 398 |
| CAUTION | 267 |
| CLAUSE | 215 |
| LABEL | 60 |
| STANDARD | 30 |
| META | 30 |

---

## 4. 확정한 번역 자산 — 250종

```
hff-en-top1000-approved-assets-v1.json
hff-en-top1000-translations-v1.json
hff-en-top1000-verification-v1.json
```

| assetType | 수 | 내용 |
|---|---:|---|
| **APPROVED_FIXED** | **182** | 문장 전체 고정 번역 |
| **APPROVED_TEMPLATE** | **68** | 섭취방법 조합 파서로 확정 |
| APPROVED_CONTEXTUAL | 0 | 이번 라운드 해당 없음 |

| category | 수 |
|---|---:|
| USAGE | 119 |
| CLAUSE | 96 |
| LABEL | 24 |
| META | 11 |

`sourceType`: `NEW_PROFESSIONAL_TRANSLATION` 182 · `APPROVED_GLOSSARY`(파서) 68. 번역 검증 실패 0.

### 섭취방법 조합 파서

섭취방법 문장은 자유형이지만 구성요소는 유한하다 — 빈도 / 1회량 / 단위 / 괄호 용량 / 방법(물·씹기·용해·직접) / 시점(식전·식후·공복) / 대상.

토큰을 **모두** 인식했을 때만 조립하고, 하나라도 모르면 번역하지 않는다. 잔여 한국어가 남으면 폐기한다.

```
1일 1회, 1회 1포씩(10 g)섭취하시기 바랍니다.
  → Take 1 stick pack (10g) once a day.
1일3회, 1회 2정씩 씹거나 녹여서 섭취한다.
  → Take 2 tablets 3 times a day by chewing or letting it dissolve.
```

작업 중 **1회 섭취량이 확정되지 않으면 번역하지 않도록** 파서를 강화했다(`1회에 1포` 미인식으로 수량이 누락되는 사례를 발견). 커버는 80 → 73 으로 줄었지만 용량 정보 손실 위험을 제거했다.

### 번역 원칙 준수

질환명·증상명·약물명을 그대로 옮겼고 조건·금기의 강도를 약화하지 않았다.

```
손발 따끔거림, 작열감 또는 저림 등의 이상사례 발생 시 섭취를 중단하고 전문가와 상담
  → If adverse reactions such as tingling, a burning sensation or numbness in the hands
    and feet occur, stop taking the product and consult a professional

위 점막 내 헬리코박터균(Helicobacter pylori) 증식을 억제하고 위 점막을 보호하여 위 건강에 도움
  → May help with stomach health by inhibiting the growth of Helicobacter pylori
    in the gastric mucosa and protecting the gastric mucosa
```

---

## 5. 재생산 결과 (합계 4,209 ✅)

| 상태 | Track A | Track B | 계 |
|---|---:|---:|---:|
| UPDATED_EXISTING_EN | 0 | — | **0** |
| CREATED_NEW_EN | — | 0 | **0** |
| HOLD_TRANSLATION | 33 | 4,176 | **4,209** |
| FAILED_SYSTEM | 0 | 0 | **0** |

| HOLD 사유 | 이전 | 현재 |
|---|---:|---:|
| `TRANSLATION_ASSET_MISSING` | 3,117 | **2,338** |
| `TRANSLATION_AMBIGUOUS` | 1,092 | 1,871 |

**expected = actual = 0 (UPDATE / INSERT), DB write 0.**

---

## 6. 왜 250종으로는 부족한가

자산 250종은 `ASSET_MISSING` 을 3,117 → 2,338 로 **779건 줄였다.** 그러나 문서 생성에는 **모든 슬롯 100% 커버**가 필요하다.

- 선정 1,000종 중 이번에 확정한 것은 **250종(25%)** 이다
- `estimatedDocumentsUnlocked` 상위 문구를 우선 번역했으나, 미커버 1개 문서 1,769건을 풀려면 그 문구 집합만 **519종**이다
- 남은 문구가 문서마다 최소 1개씩 걸려 통과 문서가 0 이다

`TRANSLATION_AMBIGUOUS` 가 늘어난 것은 대상이 `ASSET_MISSING` 에서 이동했기 때문이다(문구가 번역되면서 다음 게이트인 수치 검증까지 도달). 수치 검증은 작업 중 **"KO 단위 수치가 EN 에 모두 존재"** 방식으로 완화했으나, 남은 건은 다른 슬롯의 미커버가 함께 걸려 있다.

---

## 7. 독립검증 (별도 read-only 세션) — **PASS**

| 검사 | 결과 |
|---|---|
| **KO canonical hash drift (4,209 전수)** | **0** |
| KO / EN / SPD / ProductMaster | **전부 불변** |
| EN canonicalDup | **0** |
| Batch 밖 write · manifest 밖 write | **0 / 0** |
| 상태 합계 | **4,209** ✅ |
| HOLD 큐 중복 | **0** |
| expected / actual UPDATE · INSERT | **0 / 0 · 0 / 0** |

DB 실측: KO 40,918 · EN 15,498 · EN 미보유 KO **25,420** · 기능성 없는 EN **33**.

---

## 8. 산출물

```
hff-en-top1000-phrase-selection-v1.json          ← 상위 1,000 선정 (결정적)
hff-en-top1000-translations-v1.json              ← 확정 번역 원본
hff-en-top1000-approved-assets-v1.json           ← 승인 자산 250종
hff-en-top1000-translation-drafts-v1.json
hff-en-top1000-verification-v1.json
hff-en-top1000-batch01-hold4209-classification-v1.json
hff-en-top1000-batch01-hold4209-safe-targets-v1.json   (0건)
hff-en-top1000-batch01-hold4209-rollback-v1.json       (0건)
hff-en-top1000-batch01-hold4209-apply-results-v1.json  (NO_APPLY)
hff-en-top1000-batch01-hold4209-independent-verification-v1.json
hff-en-top1000-batch01-hold4209-final-hold-v1.jsonl
hff-en-top1000-batch01-hold4209-final-hold-summary-v1.json
hff-en-translation-assets-remaining-after-top1000-v1.json
hff-en-bulk-production-completed-through-top1000-round1-v1.json
hff-en-bulk-production-remaining-after-top1000-round1-v1.json
```

+ script 3개(`top1000-select` · `usage-parser` · `top1000-finalize`) · 본 CHECK.

렌더 검증·Apply·rollback 은 대상 0건이라 수행 대상이 없다.

---

## 9. 잔여

| 항목 | 값 |
|---|---:|
| Batch 01 누적 완료 | **791** |
| EN 미보유 KO | **25,420** |
| 기능성 없는 EN | **33** |
| 남은 고유 문구 | **4,362** (자산 250종 반영 전 기준) |
| 미커버 1개 문서 | **1,769** |

---

## 10. 다음 라운드 필요 여부 — **필요하다**

이번 라운드로 확인된 사실

1. **선정 방법은 유효하다.** 미커버 1개 문서가 1,769건이고, 상위 1,000 확정 시 2,539 문서가 풀린다는 계산이 나왔다.
2. **병목은 번역 확정 물량**이다. 250종으로는 부족하고, 최소 **519종**(미커버 1개 문서를 푸는 문구 전량)을 확정해야 첫 문서가 나온다.
3. 파이프라인·게이트·검증은 정상 작동하며 재사용 가능하다.

권장: 다음 라운드는 **`documentsWithOneMissingPhrase > 0` 인 519종을 목표로 고정**한다. 이 집합을 전부 확정하면 최소 938 문서(해당 문서들의 d1 합계)가 즉시 생성 기준을 통과한다. 문구 수가 아니라 **이 519종 완주**를 완료 조건으로 삼는 것이 확실하다.

---

## 11. 함정 기록

1. **자산을 늘려도 문서 생산은 계단식이다.** 문서가 요구하는 마지막 문구가 확정될 때 비로소 생성된다. 진척은 슬롯 커버가 아니라 **완전 커버 문서 수**로 측정할 것.
2. **섭취방법 파서는 수량 누락에 주의.** `1회에 1포` 같은 조사 변형을 놓치면 빈도만 번역되어 **용량이 사라진다.** 수량 미확정이면 번역하지 않는 것이 옳다.
3. **수치 검증은 포함 관계로.** 완전 일치를 요구하면 `1일 1회 → Once a day` 같은 정상 번역이 차단된다. 단, 누락은 반드시 차단해야 한다.
4. **HOLD 사유 이동을 퇴보로 읽지 말 것.** `ASSET_MISSING → AMBIGUOUS` 는 문구가 번역되어 다음 게이트까지 도달했다는 뜻이다.

---

*작성: 2026-07-31*
