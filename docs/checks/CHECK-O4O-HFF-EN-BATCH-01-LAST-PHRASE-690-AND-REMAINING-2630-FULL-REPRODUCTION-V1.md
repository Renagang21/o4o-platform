# CHECK-O4O-HFF-EN-BATCH-01-LAST-PHRASE-690-AND-REMAINING-2630-FULL-REPRODUCTION-V1

잔여 2,630 재현 · blocker 재분해 · 마지막 문구 690종 확정 — **번역 미완, 생산 0건**

- 기준 커밋 `be5c6cfd8` · 착수 HEAD `9a2796894` (= `origin/main`)
- 판정: **미달** — 완료 조건(690종 전량 판정)을 채우지 못했다. DB write 0.

---

## 1. 모집단 재현 — 정확 재현

| 검사 | 결과 |
|---|---|
| 총수 | **2,630** ✅ |
| productMasterId / koCanonicalId 중복 | **0 / 0** |
| KO 존재·master 일치 | 전건 |
| 영구 HOLD 345 혼입 · Batch 01 밖 혼입 | **0 / 0** |
| **KO canonical drift (전수)** | **0** |

---

## 2. blocker 재분해 — 게이트 결함 소진 확인

| blocker | 문서 수 |
|---|---:|
| `NO_ENTRY` (번역 자산 부족) | **2,614** |
| `NUMBER_ONLY` (정당한 차단) | **16** |
| **`FALSE_GATE`** | **0** ✅ |
| **CLEAN 차단** | **0** ✅ |
| `STRUCTURE` | **0** ✅ |

직전 라운드에서 고정한 공통 계약이 유효함이 확인됐다. **남은 2,630건은 전부 실제 번역 자산 부족**이며, 게이트 수정으로 얻을 수 있는 해소는 더 없다.

---

## 3. 마지막 문구 집합 — 690종 (재산출)

직전 보고 수치를 그대로 믿지 않고 현재 자산·현재 2,630건 기준으로 재산출했다. 결과는 **690종으로 동일**했다.

| 미커버 문구 수 | 문서 수 |
|---|---:|
| 1개 | **853** |
| 2개 | 609 |
| 3개 | 425 |
| 4개 이상 | 727 |

전량 확정 시 **853건 즉시 해소** 기대. 남은 고유 문구 전체는 **3,884종**.

### 690종 category 분포

| category | 수 |
|---|---:|
| USAGE | **364** |
| CAUTION | 148 |
| CLAUSE | 119 |
| LABEL | 41 |
| META | 15 |
| STANDARD | 3 |

---

## 4. 번역 결과 — **0종 (완료 조건 미달)**

| 항목 | 값 |
|---|---:|
| 확정 목표 | 690 |
| **APPROVED_FIXED / TEMPLATE / CONTEXTUAL** | **0 / 0 / 0** |
| 정당한 문구 HOLD | 0 |
| **미판정** | **690** |

USAGE 364종에 대해 섭취방법 파서의 **대안 병기 분리**(`1일 1회 2정 … 1일 2회 1정 …`)를 시도했으나 커버가 늘지 않았고, 원인 규명 전에 세션 한계에 도달했다.

기존 승인 자산으로 자동 해결된 문구도 0종이다.

> WO §2 의 완료 조건은 "690종 전량 판정"이었다. **이 조건을 충족하지 못했다.**

---

## 5. 재생산 · Apply

coverage 100% 문서가 없어 생산 대상이 0이다.

| 항목 | 값 |
|---|---:|
| expected / actual UPDATE | **0 / 0** |
| expected / actual INSERT | **0 / 0** |
| KO canonical | 40,918 (불변) |
| EN canonical | **17,066** (불변) |
| SPD · ProductMaster | 121,691 / 40,948 (불변) |

렌더 검증은 대상 부재로 수행하지 않았다(스킵이 아니라 대상 0).

---

## 6. 독립검증 (별도 read-only 세션) — **PASS**

모집단 2,630 ✅ · **KO drift 0** · 전역 카운트 불변 · EN canonicalDup 0 · **FALSE_GATE 0** · HOLD 큐 중복 0 · DB write 0.

DB 실측: EN 미보유 KO **23,852** · 기능성 없는 EN **22**.

---

## 7. 산출물

```
hff-en-lp690-audit-v1.json                                    ← blocker 재분해
hff-en-lp690-docs-v1.json
hff-en-batch01-lastphrase690-selection-v1.json                ← 690종 확정 목록
hff-en-batch01-lastphrase690-apply-results-v1.json            (NO_APPLY)
hff-en-batch01-lastphrase690-rollback-v1.json                 (0건)
hff-en-batch01-lastphrase690-independent-verification-v1.json
hff-en-batch01-lastphrase690-final-hold-v1.jsonl              (2,630)
hff-en-batch01-lastphrase690-final-hold-summary-v1.json
hff-en-translation-assets-remaining-after-lastphrase690-v1.json
hff-en-bulk-production-completed-through-batch01-lastphrase690-v1.json
hff-en-bulk-production-remaining-after-batch01-lastphrase690-v1.json
```

최종 HOLD 각 행에 `blocker` · `remainingMissingCount` · 재시도 조건을 기록했다.

---

## 8. 누적 현황 (변화 없음)

| 항목 | 값 |
|---|---:|
| Batch 01 누적 완료 | **2,370** |
| 잔여 HOLD | **2,630** |
| EN canonical | **17,066** |
| EN 미보유 KO | **23,852** |
| 남은 고유 문구 | **3,884** (마지막 문구 690 포함) |

---

## 9. 다음 라운드에 필요한 것

이번 라운드가 실패한 원인은 명확하다. **690종 번역은 한 세션에서 소화하기에 큰 작업량**이며, 조사·분해·검증 절차와 함께 수행하면 번역에 도달하기 전에 예산이 소진된다.

권장

1. **조사와 번역을 분리한다.** 모집단·blocker·문구 집합은 이미 확정돼 있으므로(`hff-en-batch01-lastphrase690-selection-v1.json`) 다음 라운드는 **번역만** 수행한다.
2. **category 단위로 쪼갠다.** 예: CAUTION 148 + CLAUSE 119 + LABEL 41 + META 15 + STANDARD 3 = **326종**을 한 라운드, USAGE 364종을 다음 라운드.
3. USAGE 364종은 **파서 확장이 아니라 직접 번역**이 확실하다. 대안 병기·분무·희석·복합 구성 등 자유형이 심해 파서 커버가 늘지 않는다.

326종 확정만으로도 해당 문서들이 즉시 해소된다.

---

## 10. 함정 기록

1. **완료 조건이 큰 번역 물량일 때는 조사 단계를 다시 돌리지 말 것.** 이번엔 모집단·blocker·문구 집합 재산출에 예산을 쓰고 번역에 도달하지 못했다. 확정된 selection 파일이 있으면 그것부터 소비하라.
2. **USAGE 자유형은 파서로 수렴하지 않는다.** 대안 병기·분무·희석·복합 구성은 문장마다 구조가 달라 토큰 조합으로 커버되지 않는다.
3. blocker 재분해는 저비용이고 가치가 크다 — 이번에도 `FALSE_GATE 0` 을 확인해 게이트 작업이 끝났음을 확정했다.

---

*작성: 2026-07-31*
