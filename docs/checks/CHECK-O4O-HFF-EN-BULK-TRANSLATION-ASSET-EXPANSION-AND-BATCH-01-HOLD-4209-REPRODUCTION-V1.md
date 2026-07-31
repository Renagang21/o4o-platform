# CHECK-O4O-HFF-EN-BULK-TRANSLATION-ASSET-EXPANSION-AND-BATCH-01-HOLD-4209-REPRODUCTION-V1

Batch 01 HOLD 4,209건 재생산 — **번역 자산 확장 완료 · 생산 0건**

- 근거 WO: `WO-O4O-HFF-EN-BULK-TRANSLATION-ASSET-EXPANSION-AND-BATCH-01-HOLD-4209-REPRODUCTION-V1`
- 기준 커밋: `0fe288188` (조상 확인)
- 착수 HEAD: `767a5c4af` (= `origin/main`, ahead 0)
- 판정: **미달** — 모집단·집계·자산 확장은 완료, **canonical 생산 0건** (DB write 없음)

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | `pnpm-lock.yaml` · 타 세션 CHECK 문서 — **미접촉** |
| DB | 전 세션 `SET default_transaction_read_only = on` · **write 0** |
| KO canonical | **읽기만** (drift 0 검증) |
| ProductMaster / candidate / 공용 renderer | **0 / 0 / 미수정** |

---

## 2. 모집단 재현 — 정확 재현

| 검사 | 결과 |
|---|---|
| **총계** | **4,209** ✅ |
| Track A (기존 EN HOLD) | **33** |
| Track B (신규 EN 미생성) | **4,176** |
| productMasterId / koCanonicalId 중복 | **0 / 0** |
| KO canonical 존재 · master 일치 | **전건 true** |
| Track A EN 존재 / Track B EN 부재 | **전건 true / 전건 true** |
| KO 영구 HOLD 345 혼입 | **0** |
| Batch 01 외 대상 혼입 | **0** |
| DB 미존재 | **0** |

---

## 3. translationIssue 전수 집계

Batch 01 은 `why` 를 문서당 상위 3개만 저장했으므로, KO canonical 을 다시 읽어 **모든** 미커버 문구를 셌다.

### 확장 전

| category | 고유 문구 | 문서 수 | 발생 수 |
|---|---:|---:|---:|
| CLAUSE | 1,628 | 5,896 | 6,019 |
| CAUTION | 1,380 | 7,160 | 7,182 |
| USAGE | 1,273 | 1,950 | 1,950 |
| LABEL | 273 | 453 | 590 |
| STANDARD | 79 | 325 | 325 |
| META | 63 | 110 | 110 |
| **합계** | **4,696** | — | — |

### 확장 후

| category | 고유 문구 |
|---|---:|
| CLAUSE | 1,560 |
| CAUTION | **1,157** |
| USAGE | ~1,270 |
| 기타 | ~375 |
| **합계** | **4,362** |

---

## 4. 확정한 번역 자산

| 자산 | 내용 |
|---|---|
| **어미 정규화** | `할 것` / `하십시오` / `하시기 바랍니다` / `한다` → 하나의 키로 통합. `~할 수 있음`(가능성)과 `~할 것`(지시)은 **분리 유지** |
| **프레임 (APPROVED_TEMPLATE)** | **약 50종** — `{질환}이 있는 경우 섭취 전 전문가와 상담`, `{증상} 등의 이상사례 발생 시 섭취 중단`, `{대상}는 섭취에 주의`, `의약품({약물}) 복용 시 상담`, `{원료}에 알레르기를 나타내는 사람은 주의`, 소비기한·포장재·과량 섭취 등 |
| **슬롯 사전 (TERM)** | **약 90종** — 질환명(당뇨병·신장질환·고칼슘혈증·출혈성 질환 등) · 증상명(따끔거림/작열감/저림, 위장관계 장애 등) · 대상 · 약물 · 알레르기 원료 |
| **명사구 (PHRASE)** | 고시 영양성분 기능성 약 100종 (`단백질 및 아미노산 이용`, `혈액의 호모시스테인 수준을 정상으로 유지` 등) |
| **직접 사전 (APPROVED_FIXED)** | clause · label · heading · foot · meta · badge 약 250종 |
| **수치 템플릿** | 섭취방법 · CFU · 성분량 · 횟수 (5종, 확장) |
| `labelClause` 프레임 | `비타민B1: 탄수화물과 에너지 대사에 필요` 형태 분해 |

질환명·증상명은 영어에서도 그대로 옮겼고(`diabetes`, `kidney disease`, `tingling, burning or numbness`), 조건·부정·금기의 강도를 약화하지 않았다.

---

## 5. 재생산 결과 (합계 4,209 ✅)

| 상태 | Track A | Track B | 계 |
|---|---:|---:|---:|
| UPDATED_EXISTING_EN | 0 | — | **0** |
| CREATED_NEW_EN | — | 0 | **0** |
| RESOLVED_NO_CHANGE | 0 | — | 0 |
| HOLD_TRANSLATION | 33 | 4,176 | **4,209** |
| FAILED_SYSTEM | 0 | 0 | **0** |

| HOLD 사유 | 건수 |
|---|---:|
| `TRANSLATION_ASSET_MISSING` | 3,117 |
| `TRANSLATION_AMBIGUOUS` | 1,092 |

**DB write 0 · expected = actual = 0 (UPDATE / INSERT)**

---

## 6. 생산이 0건인 이유

문서 하나를 생성하려면 그 문서의 **모든 슬롯**이 번역 근거를 가져야 한다(coverage 100%). 자산을 크게 늘려 고유 문구를 4,696 → 4,362 로 줄였지만, **문서마다 미커버 문구가 최소 1개씩 남아** 100% 기준을 통과한 문서가 없다.

남은 4,362종의 성격

- **CLAUSE 1,560** — 제품별 기능성 절, 그리고 KO canonical 자체가 손상된 조각(`아연 : (`, `* 프로바이오틱스` 등)
- **CAUTION 1,157** — 프레임에 없는 개별 주의사항 문장
- **USAGE ~1,270** — 제품별 섭취방법 문장(복합 지시 포함)

프레임 50종 + 슬롯 90종으로 CAUTION 은 223종을 흡수했으나, 나머지는 문장 구조가 제각각이라 **문장 단위 확정**이 필요하다. 근거 없이 자동 생성하면 WO §2 가 금지한 비검증 기계 번역이 된다.

---

## 7. 독립검증 (별도 read-only 세션) — **PASS**

| 검사 | 결과 |
|---|---|
| **KO canonical hash drift (4,209건 전수)** | **0** |
| KO / EN / SPD / ProductMaster 카운트 | **전부 불변** |
| EN canonicalDup | **0** |
| Batch 밖 write | **0** |
| 상태 합계 | **4,209** ✅ |
| HOLD 큐 중복 | **0** |
| expected / actual UPDATE · INSERT | **0 / 0 · 0 / 0** |

DB 실측: KO 40,918 · EN 15,498 · EN 미보유 KO **25,420** · 기능성 섹션 없는 EN **33**.

---

## 8. 산출물

```
hff-en-batch-01-hold-4209-population-v1.json
hff-en-batch-01-hold-4209-issue-frequency-v1.json      ← 4,362종 빈도표 (핵심 자산)
hff-en-batch-01-hold-4209-classification-v1.json
hff-en-batch-01-hold-4209-safe-targets-v1.json          (0건)
hff-en-batch-01-hold-4209-rollback-v1.json              (0건)
hff-en-batch-01-hold-4209-apply-results-v1.json         (NO_APPLY)
hff-en-batch-01-hold-4209-independent-verification-v1.json
hff-en-batch-01-hold-4209-reproduction-final-hold-v1.jsonl
hff-en-batch-01-hold-4209-reproduction-final-hold-summary-v1.json
hff-en-bulk-production-completed-through-batch-01-v2.json
hff-en-bulk-production-remaining-after-batch-01-v2.json
```

+ script 4개(`frequency` · `frames` · `classify` · `finalize`) · 본 CHECK.

최종 HOLD 각 행에 **미해결 문구를 문구 단위로 기록**했다(`unresolvedPhrases`, 최대 12개 + 총 개수).

렌더 검증·Apply·rollback 은 대상이 0건이라 수행 대상이 없다(스킵이 아니라 대상 부재).

---

## 9. 잔여 모집단

| 항목 | 실측 |
|---|---:|
| EN 미보유 KO | **25,420** |
| 기능성 섹션 없는 EN | **33** |
| 번역 잔여 합계 | **25,453** |
| Batch 01 최종 완료 | **791** |
| **남은 고유 문구** | **4,362** |

> 잔여의 병목은 **대상 선택이 아니라 번역 자산**이다.

---

## 10. Batch 02 시작 가능 여부

**대상 선택은 가능하지만, 지금 시작하면 같은 결과가 반복된다.**

이번 WO 로 확인된 사실: 파이프라인·게이트·검증은 정상 작동하며, 유일한 병목은 **문장 단위 번역 확정**이다. 자산을 늘린 만큼 정확히 그만큼만 커버가 늘어난다.

권장 순서

1. `hff-en-batch-01-hold-4209-issue-frequency-v1.json` 의 **문서 수 상위 문구부터** 확정
2. 확정 → 재실행 → 커버율 측정을 **반복**한다. 한 라운드에 수백 종씩 확정하는 것이 현실적이다
3. 커버율이 임계에 오르면 4,209건이 한 번에 대량 생산된다

문서 수 기준 상위 300종만 확정해도 상당수 문서가 100% 에 도달할 가능성이 높다(문서당 미커버가 1~3개인 건이 다수).

---

## 11. 함정 기록

1. **문서 단위 커버리지 ≠ 슬롯 단위 커버리지.** 슬롯 대부분을 커버해도 문서마다 1개씩 남으면 생산 가능 문서는 0 이다. 진척은 반드시 **완전 커버 문서 수**로 측정할 것.
2. **어미 정규화는 의미 단위로.** `~할 것`(지시)과 `~할 수 있음`(가능성)을 같은 키로 모으면 주의사항의 강도가 바뀐다.
3. **프레임의 슬롯은 사전에 있을 때만 채운다.** 슬롯 값을 추정해 채우면 질환명·약물명이 잘못 들어간다.
4. KO canonical 자체가 손상된 조각(`아연 : (`)은 번역 대상이 아니라 KO 측 수정 대상이다.

---

*작성: 2026-07-31*
