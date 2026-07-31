# CHECK-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1

영어 매장용 설명서 Batch 01 — 모집단 5,000 고정 · **791건 생산 · 4,209건 HOLD**

- 근거 WO: `WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1`
- 기준 커밋: `8894c64c3` (조상 확인)
- 착수 HEAD: `305c829f6` (= `origin/main`, ahead 0)
- 판정: **부분 완료** — Track A 791/824 복구, **Track B 0/4,176** (번역 근거 미확보로 HOLD)

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | `pnpm-lock.yaml`(타 세션) 외 clean — **미접촉** |
| DB read-only | 조사·자산추출·분류·검증 전 세션 `SET default_transaction_read_only = on` |
| **KO canonical** | **write 0** (번역 기준본으로 읽기만) |
| ProductMaster / candidate | **0 / 0** |
| 공용 renderer·CSS | **미수정** |

---

## 2. Batch 01 모집단 고정 — 정확 재현

| 검사 | 결과 |
|---|---|
| **총계** | **5,000** ✅ |
| Track A (기존 EN 기능성 HOLD) | **824** |
| Track B (EN 미보유 KO) | **4,176** |
| master / KO / EN 중복 | **0 / 0 / 0** |
| Track A ∩ Track B | **0** |
| 한국어 영구 HOLD 345 혼입 | **0** |
| Track B 후보 풀 (실측) | 25,420 |

**Track A 824 확정 근거**: 기존 인벤토리 826건 중 현재도 기능성 섹션이 없는 건이 정확히 **824**건이었다(2건은 그 사이 갖춰짐). WO 가 제시한 824와 실측이 일치한다.

**Track B 고정 정렬**: `master_id ASC, ko_canonical_id ASC` — 재실행해도 동일 4,176건이 선택된다.

---

## 3. 번역 근거 — 승인 자산 역산

임의 번역을 만들지 않기 위해, **이미 운영 중인 승인 EN canonical 15,498건**에서 KO↔EN 대응을 역산했다.

| 항목 | 값 |
|---|---|
| ko/en 쌍 | 15,498 |
| **구조 정렬 성공** | **14,356** |
| 구조 불일치로 제외 | 1,142 |
| 절(clause) 사전 | **18,693** |
| label / heading / foot / badge / intro / meta | 1,938 / 44 / 182 / 3,403 / 8,947 / 2,475 |
| 다수결 충돌로 제외 | clause 188 · label 21 · badge 28 |

여기에 이번 batch 에서 확정한 **고정 용어집**(heading 7 · foot 1 · intro 1 · meta 3 · label 80+ · clause 60+ · 명사구 100+)과 **수치 템플릿 5종**을 더했다.

### 번역 방식

KO canonical HTML 을 **템플릿으로 삼아 텍스트 슬롯만 치환**한다. 구조(태그·class·순서)를 그대로 두므로 renderer family 가 자동 계승되고, 새 heading 체계를 만들지 않는다. 근거 없는 슬롯이 **하나라도** 있으면 그 문서는 생성하지 않는다.

---

## 4. 최종 상태 (합계 5,000 ✅)

| 상태 | Track A | Track B | 계 |
|---|---:|---:|---:|
| **UPDATED_EXISTING_EN** | **791** | — | **791** |
| CREATED_NEW_EN | — | **0** | 0 |
| RESOLVED_NO_CHANGE | 0 | — | 0 |
| HOLD_TRANSLATION | 33 | 4,176 | **4,209** |
| FAILED_SYSTEM | 0 | 0 | **0** |

**번역한 기능성 절: 1,056**

---

## 5. Track A — 791/824 복구

기존 EN 문서에 **기능성 섹션만 최소 삽입**했다(다른 섹션 미변경, 문서 재생성 없음). 삽입 지점은 두 번째 `<h2>` 앞이다.

과거 `NO_OFFICIAL_EN_GROUNDING`(영문 공식 원문 부재)을 이유로 다시 HOLD 하지 않았다. WO §10 에 따라 최신 KO canonical 과 승인 번역 계약을 근거로 번역했다.

DB 실측으로 **기능성 섹션 없는 EN 이 824 → 33** 으로 줄었다.

잔여 33건은 프로바이오틱스 개별인정 원료명 등 용어집 미확정 문구가 남은 건이다.

---

## 6. Track B — 0/4,176 (HOLD)

Track B 는 문서 전체 번역이 필요하다. 정형 슬롯은 대부분 해결했으나 **문서마다 미커버 문구가 최소 1개씩 남아** 한 건도 생성하지 못했다.

### 개선 경과 (미커버 문서 수 기준)

| 조치 | badge | label | meta | clause |
|---|---:|---:|---:|---:|
| 초기 | 3,774 | 3,811 | 4,056 | 3,707 |
| 수치검사 교정 후 | **3** | 615 | 2,569 | 3,664 |
| 용어집 2차 확장 후 | 0 | **401** | **1,971** | **3,228** |

### 남은 미커버 (고유 문구)

| 종류 | 고유 수 | 성격 |
|---|---:|---|
| clause | ~1,991 | 제품별 주의사항 · 복합 기능성 절 |
| meta | ~1,766 | 제품별 섭취방법 문장 |
| label | ~307 | 개별인정 원료명 |

> 이 문구들을 근거 없이 자동 생성하면 WO §8 이 금지한 임의 번역이 된다. **고정 용어집에 확정 추가한 뒤 동일 파이프라인으로 재생산**하는 것이 정상 경로이며, 그 작업은 Batch 02 로 넘긴다.

---

## 7. 적용 전 결함 교정 3건

| 결함 | 증상 | 교정 |
|---|---|---|
| **수치 드리프트 오판** | `1일 1회` → `Once a day` 처럼 **숫자가 영어 수사로 바뀌는 정상 번역**을 드리프트로 차단 → badge 3,774건 허위 실패 | 수치 검증을 **단위가 붙은 값**(mg·g·IU·CFU·%)으로 한정 |
| 단일 명사구 미조합 | `면역력 증진에 도움을 줄 수 있음` 같은 단일 기능 절이 조합 대상에서 제외 | 조각 1개도 조합 허용 |
| **렌더 한글 오탐** | 기존 EN 문서의 **한국어 제품명**을 이번 작업 결함으로 오판 → 2,358건 허위 FAIL | 한글 검사를 **이번에 삽입한 기능성 섹션**으로 한정 |

---

## 8. 렌더 검증 — **PASS**

래퍼 증명: `.sd-card` max-width — 래퍼 없음 `""` → 적용 **`860px`** (`cssActuallyApplied: true`), radius `20px`, hero padding `28px 22px 24px`, badge `14px`.

791문서 × 430/820/1280 = **2,373 렌더**.

| 검사 | 결과 |
|---|---|
| overflow · clipping | **0 / 0** |
| 빈 h2·ul·li·section | **0** |
| 미정의 class · raw HTML | **0 / 0** |
| **기능성 섹션 내 한국어** | **0** |
| 열거 마커 노출 | **0** |
| 원료 라벨 한글 잔존 · 개별인정번호 손실 | **0 / 0** |
| 전문가 안내 누락 · 기능성 섹션 누락 | **0 / 0** |

---

## 9. Apply (LIVE)

이중 게이트(`--apply` + `HFF_EN_B01_APPLY_CONFIRM=YES`) · 내부 shard 200건 × 4.

UPDATE 가드: `id` · `master_id` · `STORE` · `canonical` · `en` · `source_type` · `deleted_at IS NULL` · **DB 측 content hash = rollback old hash**.

| 항목 | 값 |
|---|---|
| expected / actual UPDATE | **791 / 791** |
| expected / actual INSERT | **0 / 0** |
| hash drift 로 건너뛴 행 | **0** |
| shard rollback | **0** |
| **KO canonical** | 40,918 → **40,918** (불변) |
| EN canonical | 15,498 → **15,498** (신규 생성 없음) |
| SPD 총수 · ProductMaster | 120,123 / 40,948 — **불변** |

---

## 10. 독립검증 (별도 read-only 세션) — **PASS**

| 검사 | 결과 |
|---|---|
| new hash 일치 | **791 / 791** |
| old hash 잔존 | **0** |
| 기능성 섹션 존재 | **791 / 791** |
| **기능성 섹션 내 한국어** | **0** |
| 대상 행 필드 drift | **0** |
| **KO canonical drift (5,000건 전수)** | **0** |
| EN canonicalDup | **0** |
| 전역 카운트 4종 | **불변** |
| Batch 상태 합계 | **5,000** ✅ |
| HOLD 큐 중복 | **0** |

DB 실측: **기능성 섹션 없는 EN 824 → 33**.

---

## 11. 최종 HOLD 큐 — 4,209건

```
hff-en-batch-01-final-hold-v1.jsonl
hff-en-batch-01-final-hold-summary-v1.json
```

| track | 건수 | 사유 |
|---|---:|---|
| `EXISTING_EN_HOLD` | 33 | `TRANSLATION_AMBIGUOUS` |
| `NEW_EN` | 4,176 | `TRANSLATION_AMBIGUOUS` |

각 행에 `sourceEvidence` · `translationIssue`(미커버 문구) · `requiredNextAction` · `retryCondition` 을 기록했다. 삭제·terminal 처리가 아니다.

---

## 12. Batch 연속성

```
hff-en-bulk-production-completed-through-batch-01-v1.json
hff-en-bulk-production-remaining-after-batch-01-v1.json
```

완료 manifest 에 `completedKoCanonicalIds`(791) 와 `heldKoCanonicalIds`(4,209) 를 분리 기록했다. Batch 02 는 두 목록을 모두 제외하고 대상을 선택한다.

**잔여 모집단은 단순 차감이 아니라 현재 DB 실측값이다.**

| 항목 | 실측 |
|---|---:|
| EN 미보유 KO | **25,420** |
| 기능성 섹션 없는 EN | **33** |
| 번역 잔여 합계 | **25,453** |

---

## 13. 산출물

```
hff-en-batch-01-population-v1.json
hff-en-batch-01-translation-assets-v1.json
hff-en-batch-01-glossary-v1.json
hff-en-batch-01-manual-glossary-v1.json
hff-en-batch-01-manual-glossary-2-v1.json
hff-en-batch-01-classification-v1.json
hff-en-batch-01-safe-targets-v1.json
hff-en-batch-01-rollback-v1.json
hff-en-batch-01-render-audit-v1.json
hff-en-batch-01-apply-results-v1.json
hff-en-batch-01-independent-verification-v1.json
hff-en-batch-01-final-hold-v1.jsonl
hff-en-batch-01-final-hold-summary-v1.json
hff-en-bulk-production-completed-through-batch-01-v1.json
hff-en-bulk-production-remaining-after-batch-01-v1.json
```

+ script 7개 · 본 CHECK. 임시 조사 파일 전량 삭제.

**rollback**: Apply 전에 manifest 저장(op · enCanonicalId · koCanonicalId · master · old/new hash). UPDATE 791건은 old hash 로 역복원 가능하다.

---

## 14. 목표 대비 결과

WO 는 5,000건 생산을 지시했고, 실제 생산은 **791건**이다. 미달분 4,209건은 실패가 아니라 **번역 근거 미확보**다.

핵심 원인: 기존 승인 EN 자산 15,498건은 **WAE lane("Why this product") 한 갈래**에서만 생산되었고, Track B 4,176건은 **DRIVER lane("주요 기능성")** 이다. 두 lane 은 heading·foot·intro·meta 문구 체계가 다르고, 제품별 섭취방법·주의사항 문장이 그대로 남아 있다.

정형 문구(heading·foot·badge)는 이번에 확정해 해결했고, 남은 것은 **제품별 문장 약 4,000종**이다. 이는 용어집 확정 작업이며 다음 Batch 의 본 작업이다.

---

## 15. Batch 02 시작 가능 여부

**가능하다.** 다만 대상 선택보다 **용어집 확정이 선행**되어야 한다.

권장 순서

1. `hff-en-batch-01-final-hold-v1.jsonl` 의 `translationIssue` 를 문구 단위로 집계
2. 빈도 상위 clause / meta / label 을 고정 용어집에 확정
3. 동일 파이프라인 재실행 — 파이프라인·게이트·검증은 이미 검증되어 재사용 가능

Batch 01 이 남긴 자산: 승인 사전 18,693 + 고정 용어집 + 검증된 생산 파이프라인.

---

## 16. 함정 기록

1. **수치 검증은 단위 있는 값만.** `1일 1회` → `Once a day` 는 정상 번역이다. 모든 숫자를 비교하면 정상 번역이 대량 차단된다.
2. **한글 검사 범위는 이번에 바꾼 영역으로 한정.** 기존 EN 문서에 한국어 제품명이 남아 있어 문서 전체 검사는 허위 FAIL 을 만든다.
3. **EN 자산은 한 lane 에서만 나왔다.** ko/en 쌍 15,498건은 전부 core/fn family 이고 DRIVER lane 문구는 사전에 없다. 사전 크기만 보고 커버리지를 낙관하면 안 된다.
4. **문서 단위 커버리지는 슬롯 커버리지와 다르다.** 슬롯 99% 를 커버해도 문서마다 1개씩 남으면 생산 가능 문서는 0 이다.
5. `product_candidates` 에 `source_kind` 컬럼은 없다(`raw_payload->>'sourceKind'`).

---

*작성: 2026-07-31*
