# CHECK-O4O-HFF-EN-LAST-PHRASE-NONUSAGE-326-DIRECT-TRANSLATION-AND-REPRODUCTION-V1

비-USAGE 326종 직접 번역 — **393건 추가 생산**, 누적 Batch 01 완료 **2,763**

- 기준 커밋 `8d72ed740` · 착수 HEAD `8d72ed740` (= `origin/main`)
- 판정: **성공** — INSERT 392 · UPDATE 1 · EN canonical 17,066 → **17,458** · KO 불변

---

## 1. 입력 재현

| 검사 | 결과 |
|---|---|
| 총 종수 | **326** ✅ |
| CAUTION / CLAUSE / LABEL / META / STANDARD | 148 / 119 / 41 / 15 / 3 |
| phraseId 중복 · USAGE 혼입 | **0 / 0** |
| normalizedKoText 누락 | **0** |

조사·blocker 재분해·문구 재선정은 수행하지 않았다(WO §3). 확정 입력 `hff-en-batch01-lastphrase690-selection-v1.json` 에서 category 필터만 적용했다.

---

## 2. 번역 결과

| 항목 | 수 |
|---|---:|
| **APPROVED_FIXED** | **222** |
| APPROVED_TEMPLATE | 0 |
| APPROVED_CONTEXTUAL | 0 |
| **정당한 문구 HOLD** | **104** |
| 기존 자산 재사용 | 0 |
| **신규 전문 번역** | **222** |

이번 범위는 자유형 문장이 중심이라 TEMPLATE 비중을 억지로 높이지 않았다(WO §8).

### 정당한 HOLD 104종의 근거

원문 자체가 손상되었거나 잘려 단일 번역이 불가능한 것들이다.

| 유형 | 예 |
|---|---|
| 오탈자로 의미 확정 불가 | `개앤에 따라`, `알레르기 체칠`, `섭쉬 전`, `체내 에너지 성성에`, `상피세표의`, `정상적이 면역기능` |
| 문장이 잘림 | `아연 : (가)`, `비타민A -`, `[EPA 및 DHA 함유 유지`, `차전자피식이섬유]`, `의약품(당뇨치료제, 혈액항응고제) 복용 시 섭취에` |
| 라벨 조각·번호만 남음 | `제2009-40호`, `(시행일 2026.01.01)`, `* 칼륨`, `* 은행잎 추출물` |
| 동일 문구 중복 연결 | `유익한 유산균의 증식… 유익한 유산균의 증식…` (3회 반복) |
| 영문·국문 혼재 | `May help to reduce body fat, 유산균 증식 및…` |

이들은 **KO canonical 측 수정 대상**이지 번역 대상이 아니다.

### 번역 원칙 준수

```
간 ･ 신장 ･ 심장질환 알레르기 및 천식이 있거나 의약품 복용 시, 전문가와 상담
→ If you have liver, kidney or heart disease, allergies or asthma,
  or are taking medication, consult a professional

당뇨병의 치료 및 예방에 사용될 수 없으므로 당뇨병 치료가 필요한 경우에는 의사와 상담 하에 사용
→ This product cannot be used to treat or prevent diabetes; if you need treatment
  for diabetes, use it only under the guidance of a doctor

요로에 유해균 흡착 억제로 요로건강에 도움을 줄 수 있음
→ May help with urinary tract health by inhibiting the adhesion of harmful bacteria
  in the urinary tract
```

질환명·증상명·약물명을 그대로 보존했고, `Do not` / `Consult` / `Stop` / `Take care` 의 강도를 원문에 맞춰 구분했다.

---

## 3. 재생산 (합계 4,209 ✅ / 잔여 2,630 기준)

| 상태 | 값 |
|---|---:|
| **CREATED_NEW_EN** | **1,960** (누적) |
| **UPDATED_EXISTING_EN** | **1** |
| RESOLVED_NO_CHANGE | 11 |
| HOLD_TRANSLATION | **2,237** |
| FAILED_SYSTEM | **0** |

직전 라운드 대비 **CREATED 1,568 → 1,960 (+392)**, HOLD **2,630 → 2,237 (−393)**.

---

## 4. 렌더 · Apply

**렌더 PASS** — 시그니처 전수 커버 + 고위험 전량, 387문서 × 3폭 = **1,161 렌더**. 번역 슬롯 내 한국어 · 라벨 손실 · 개별인정번호 손실 · overflow 등 **전 항목 0**.

| Apply | 값 |
|---|---:|
| expected / actual UPDATE | **1 / 1** |
| expected / actual INSERT | 1,960 / **392** |
| SKIPPED_ALREADY_EXISTS | **1,568** (직전 라운드 생성분 — 예상과 일치) |
| shard rollback | **0** |
| **KO canonical** | 40,918 (불변) |
| **EN canonical** | 17,066 → **17,458** |
| ProductMaster | 40,948 (불변) |

---

## 5. 독립검증

| 검사 | 결과 |
|---|---|
| **KO canonical drift (전수)** | **0** |
| 번역 슬롯 내 한국어 | **0** |
| 대상 행 필드 drift | **0** |
| EN canonicalDup | **0** |
| EN 증가량 | 예상 392 = 실제 **392** |
| 상태 합계 | **4,209** ✅ |
| HOLD 큐 중복 | **0** |
| new hash 일치 | **1,951 / 1,961** |

### hash 불일치 10건 — 데이터 오류가 아니다

이전 라운드에서 이미 생성된 EN 10건이, **자산이 늘어난 지금 기준으로 재번역하면 내용이 달라진다**. INSERT 는 중복 가드로 skip 되고 구버전이 남아 있다.

즉 이 10건은 "더 나은 번역이 가능해졌지만 아직 반영되지 않은" 상태다. 손실이나 오염이 아니며, KO drift 0 · 한국어 0 · canonicalDup 0 은 모두 정상이다.

> **다음 라운드 처리 방침**: 기존 EN 이 최신 자산 기준 재번역과 다르면 INSERT skip 이 아니라 **UPDATE 대상으로 전환**해야 한다. 현재 파이프라인은 Track B 를 INSERT 전용으로 다루므로 이 경로가 없다.

---

## 6. NUMBER_ONLY 16건

USAGE 파서를 건드리지 않았고(WO §11), 비-USAGE 자산만으로는 해결되지 않아 `HOLD_NUMBER_STRUCTURE` 를 유지했다. 숫자·용량 손실을 감수한 게이트 완화는 하지 않았다.

---

## 7. 누적 현황

| 항목 | 값 |
|---|---:|
| **Batch 01 누적 완료** | **2,370 + 393 = 2,763** |
| 잔여 HOLD | **2,237** |
| EN canonical | **17,458** |
| EN 미보유 KO | 23,852 → **23,460** |
| 기능성 없는 기존 EN | 22 → **21** |

---

## 8. 산출물

```
hff-en-lastphrase-nonusage326-population-v1.json
hff-en-nonusage326-translations-v1.json           ← 확정 번역 222종
hff-en-batch01-nonusage326-final-hold-v1.jsonl
hff-en-batch01-nonusage326-final-hold-summary-v1.json
hff-en-batch01-nonusage326-independent-verification-v1.json
hff-en-bulk-production-completed-through-nonusage326-v1.json
hff-en-batch01-remaining-after-nonusage326-v1.json
```

렌더·apply·rollback 산출물은 공용 파이프라인 파일(`hff-en-last519-*`)에 갱신 저장했다.

---

## 9. USAGE 364 라운드 시작 가능 여부

**가능하다.** 다음 라운드는 USAGE 364종 직접 번역이며, 이번과 동일하게 **조사 없이 번역만** 수행하면 된다.

다만 USAGE 는 이번 비-USAGE 보다 문장이 길고 수치가 많아 검증 부담이 크다. **category 를 다시 쪼개** 150종씩 두 라운드로 나누는 편이 안전하다.

함께 처리할 것: 위 hash 불일치 10건의 **UPDATE 경로 추가**.

---

## 10. 함정 기록

1. **원문 손상 문구는 번역 대상이 아니다.** 오탈자·잘림·중복 연결은 KO canonical 수정 대상이며, 추정 번역하면 공식 문구가 왜곡된다. 이번 104종이 그 경우다.
2. **자산이 늘면 기존 생성분이 낡는다.** INSERT skip 은 안전하지만 개선된 번역이 반영되지 않는다. 재번역 결과가 다르면 UPDATE 로 전환하는 경로가 필요하다.
3. **조사를 생략하니 번역에 도달했다.** 직전 라운드는 모집단·blocker 재산출에 예산을 써 번역 0종이었다. 확정 입력이 있으면 그것만 소비하라.

---

*작성: 2026-07-31*
