# CHECK-O4O-HFF-EN-BATCH-01-CLOSURE-AND-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1

Batch 01 공식 마감 + Batch 02 신규 5,000건 직접 대량 생산 (1차 구간)

- 착수 HEAD / 기준 commit `d4f407f04` · 판정: **PASS** (독립검증 criticalIssues 0)
- EN canonical 19,572 → **23,544** (+3,972)
- 누적 완료 **8,870 / 10,000**

---

## 1. Batch 01 closure

| 항목 | 값 |
|---|---:|
| 전체 | 5,000 |
| 완료 | **4,899** |
| 최종 HOLD | **101** |
| FAILED_SYSTEM | **0** |
| 상태 합계 | **5,000** ✅ |
| 완료율 | **97.98%** |

최종 HOLD 사유 (WO §6 고정):

| 사유 | 건수 |
|---|---:|
| HOLD_LOW_EFFICIENCY_UNIQUE_PHRASES | 72 |
| HOLD_KO_SOURCE_DAMAGED | 20 |
| HOLD_NUMBER_STRUCTURE_AMBIGUOUS | 8 |
| HOLD_TRANSLATION_AMBIGUOUS | 1 |

KO canonical 4,209건 전량 재대조: **missing 0 · drift 0 · 상태이탈 0**.

산출물: `hff-en-batch01-closure-v1.json` · `hff-en-batch01-final-hold-102-v1.jsonl` · `...-summary-v1.json`

---

## 2. stale verifier 처리 (WO §7)

`hff-en-last519-verify.mjs` 를 **DEPRECATED 로 표시하고 실행 경로에서 제거**했다.
파일 진입 시 즉시 throw 하며, 왜 stale 인지(519 라운드 고정 상수 · 라운드별 사전 성장으로 인한 hash 불일치)를 헤더에 남겼다.

대체 검증기:

```
Batch 01 마감 : hff-en-batch01-closure.mjs      (현재 DB 스냅샷 기준)
Batch 02      : hff-en-batch02-verify.mjs       (매니페스트 + 현재 DB 스냅샷 기준)
```

새 검증기는 기대값을 **전부 현재 매니페스트에서 읽는다.** 코드에 라운드 상수를 내장하지 않는다.

---

## 3. Batch 02 모집단 5,000 (WO §8)

| 게이트 | 값 |
|---|---:|
| 대상 총수 | **5,000** ✅ |
| productMasterId 중복 | 0 |
| koCanonicalId 중복 | 0 |
| Batch 01과 중복 | 0 |
| EN canonical 기존 존재 | 0 (SQL `NOT EXISTS` 로 배제) |
| DB 미존재 | 0 |
| 구조화 필드 4종 완비 | **5,000 / 5,000** |
| renderer family | DRIVER 4,999 · WAE 1 |

후보 풀 21,244건에서 우선순위(구조화 필드 완전도 → KO 정보량 → id 안정 정렬)로 상위 5,000을 고정했다.
Batch 01 대상과 겹친 102건은 선정 단계에서 제외됐다.

산출물: `hff-en-batch02-population-5000-v1.json`

---

## 4. 생산 방식

KO canonical HTML 을 **템플릿으로 삼아 번역 슬롯만 치환**했다.
renderer family · 기능성 절 수 · 원료 귀속 · 개별인정번호 · 구조가 자동 계승되므로 §13–§16 계약이 구조적으로 보장된다.

라운드 구성:

| 라운드 | 성격 | 생산 |
|---|---|---:|
| R1 | 기존 승인 자산 재사용 | **2,935** |
| b1 | 직접 번역 (상위 빈발 문구 150종) | 365 |
| b2 | 직접 번역 (라벨·복합 포장 150종) | 160 |
| b3 | 직접 번역 (잔여 120종) | 115 |
| b4 | 직접 번역 (복합 포장 섭취방법 219종) | **168** |
| b5 | 직접 번역 (잔여 120종) | 120 |
| b6 | 직접 번역 (잔여 110종) | 109 |
| **합계** | | **3,972** |

문구 재사용/신규 비율 (마지막 분류 기준):

```
기존 승인 자산으로 해석된 슬롯   103,257  (초회 분류)
신규 전문 번역이 필요한 슬롯       8,902  (초회 분류)
직접 번역한 문구 (b1~b6)            869종
```

**미등록 문구를 이유로 HOLD 한 건은 없다.** `TRANSLATION_ASSET_MISSING` / `NO_ENTRY` / `TEMPLATE_UNSUPPORTED` 는 사용하지 않았다.

---

## 5. 상태 분류 (합계 5,000 ✅)

| 상태 | 건수 |
|---|---:|
| CREATED_NEW_EN + RESOLVED_NO_CHANGE (누적 생산) | **3,959** |
| UPDATED_EXISTING_EN | **12** |
| **완료 합계** | **3,971** |
| HOLD_PENDING_DIRECT_TRANSLATION | 915 |
| HOLD_KO_SOURCE_DAMAGED | 110 |
| HOLD_NUMBER_STRUCTURE_AMBIGUOUS | 4 |
| **HOLD 합계** | **1,029** |
| FAILED_SYSTEM | **0** |

> `HOLD_PENDING_DIRECT_TRANSLATION` 915건은 **자산 부족이 아니라 아직 직접 번역이 도달하지 않은 잔여분**이다.
> 남은 블로커 문구는 2,223종이며 그중 638종이 "문서 1건만 막는" 고유 문구다(문구당 해소 효율 ≈ 1.0).
> 이번 구간의 실측 처리량은 라운드당 109~168건이었다.

---

## 6. 게이트 결함 수정 (번역이 아닌 원인)

`HOLD_NUMBER_STRUCTURE_AMBIGUOUS` 는 **168 → 4** 로 줄었다.
Batch 01 에서 확립한 단위 접기(`㎎→mg` · `㎍/μg/mcg→ug` · `㎖→ml` · 대소문자)를 Batch 02 분류기에 그대로 적용하고,
복합 포장 섭취방법 219종을 명시 지정해 템플릿 산출물의 수치 누락을 제거했다.

---

## 7. Batch 01 HOLD 73 sweep (WO §9)

Batch 02 직접 번역으로 확보된 문구가 Batch 01 저효율 HOLD 에도 안전하게 적용되는지 확인해 **1건**을 재생산했다.

```
sweep 대상        73 → 72
Batch 01 완료   4,898 → 4,899
Batch 01 HOLD     102 → 101
```

Batch 01 만을 위한 별도 저효율 번역 연구는 수행하지 않았고, Batch 02 본 생산을 지연시키지 않았다.

산출물: `hff-en-batch01-hold73-sweep-results-v1.json`

---

## 8. 렌더 검증 (WO §21)

전 라운드 `.store-desc-content` 래퍼 + 430 / 820 / 1280px + computed style 증명.

| 검사 | 결과 |
|---|---|
| pageOverflow · elementOverflow · clipped | **0** |
| 빈 h2 · ul · li · section | **0** |
| 정의되지 않은 sd-* 클래스 | **0** |
| raw HTML · 마커 노출 | **0** |
| 번역 슬롯 한국어 · 라벨 손실 | **0** |
| 개별인정번호 손실 · 절 손실 | **0** |
| 전문가 안내 누락 · 기능성 섹션 누락 | **0** |

computed style: `.sd-card max-width "" → 860px`, `border-radius 20px`, `.sd-hero padding 28px 22px 24px`, `.sd-badge border-radius 14px` — `cssActuallyApplied: true`.

---

## 9. Apply (WO §22)

500건 shard, 이중 게이트(`--apply` + `HFF_EN_B02_APPLY_CONFIRM=YES`), 렌더 PASS 선행 조건.

전 라운드에서:

```
expected UPDATE = actual UPDATE
expected INSERT = actual INSERT
skipped         = 0
shard rollback  = 0
koUnchanged     = true
pmUnchanged     = true
```

UPDATE 는 hash guard(`encode(sha256(convert_to(content,'UTF8')),'hex') = oldHash`) 하에서만 수행했다.

---

## 10. 독립검증 (read-only, WO §24)

| 검사 | 결과 |
|---|---|
| Batch 01 상태 합계 | **5,000** ✅ |
| Batch 01 KO hash drift / missing | **0 / 0** |
| Batch 02 모집단 | **5,000** ✅ |
| Batch 02 KO hash drift / missing / 상태이탈 | **0 / 0 / 0** |
| Batch 02 상태 합계 | **5,000** ✅ |
| expected / actual UPDATE · INSERT | **일치** |
| **완료 전건(3,971) 재조회** | missing 0 · 필드 drift 0 · 빈 content 0 · 기능성 섹션 누락 0 · 번역 슬롯 한국어 **0** |
| EN canonical 중복 | **0** |
| ProductMaster 변경 | **0** (`pm_hff` 40,948 불변) |
| KO canonical 변경 | **0** (`ko_canon` 40,918 불변) |
| rollback manifest | Apply 전 저장 완료 |
| **criticalIssues** | **0 → PASS** |

산출물: `hff-en-batch02-independent-verification-v1.json`

---

## 11. 누적 현황

| 항목 | 값 |
|---|---:|
| Batch 01 완료 | 4,899 / 5,000 (97.98%) |
| Batch 02 완료 | **3,971 / 5,000 (79.42%)** |
| **누적 완료** | **8,870 / 10,000** |
| EN canonical | **23,544** |
| KO canonical | 40,918 (불변) |
| EN 미보유 KO | 17,374 |

---

## 12. 다음 Batch 시작 가능 여부

**가능하다.** 다만 순서는 다음이 효율적이다.

1. Batch 02 잔여 `HOLD_PENDING_DIRECT_TRANSLATION` **915건** 직접 번역 계속
   — 블로커 2,223종 중 638종이 1문서 전용 고유 문구이므로 라운드당 100~170건 해소가 계속된다.
2. `HOLD_KO_SOURCE_DAMAGED` 110건은 KO 교정 트랙 대상(번역 대상 아님).
3. 그 다음 Batch 03 신규 5,000 선정 — 후보 풀은 아직 **17,374건** 남아 있다.

---

## 13. 함정 기록

1. **product_masters 에 `product_name` / `raw_payload` 컬럼은 없다.** 제품명은 `name`(또는 `regulatory_name`), MFDS 원문 4종(`MAIN_FNCTN` / `SRV_USE` / `INTAKE_HINT1` / `BASE_STANDARD`)은 `product_candidates.raw_payload.source.*` 에 있다. 후보 조인 키는 `matched_product_master_id` 다.
2. **stale 검증기를 그대로 두면 정상 상태가 FAIL 로 보인다.** 라운드 상수를 코드에 내장하지 말고 매니페스트에서 읽어야 한다.
3. **단위 표기 접기는 Batch 마다 다시 필요하다.** 새 분류기를 만들 때 `㎎/㎍/㎖`·대소문자 정규화를 빠뜨리면 정상 번역이 NUMBER_DRIFT 로 대량 차단된다(이번에도 168건).
4. **동시 세션이 같은 테이블에 쓴다.** 전역 카운트 불변식으로 검증하지 말고 **대상 집합 기준**으로만 검증한다.
5. **Cloud SQL Auth Proxy 토큰은 약 1시간에 만료된다.** 만료 시 리스닝은 유지된 채 `ECONNREFUSED`/`ECONNRESET` 이 난다. 같은 포트를 재사용하려면 이전 프로세스를 먼저 종료한다.

---

*작성: 2026-08-01*
