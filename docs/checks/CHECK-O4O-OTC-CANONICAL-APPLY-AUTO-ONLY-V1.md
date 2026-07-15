# CHECK-O4O-OTC-CANONICAL-APPLY-AUTO-ONLY-V1 — A군 686건 canonical 승격 (APPLY 완료)

WO: `WO-O4O-OTC-CANONICAL-APPLY-AUTO-ONLY-V1` · 일자: 2026-07-16 · 상태: **완료 (DB 적용됨)**
선행: [TARGET-SPLIT](CHECK-O4O-OTC-CANONICAL-APPLY-TARGET-SPLIT-V1.md) (A/B 분리) · [EXPANSION-APPLY-PATH](CHECK-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1.md) (경로)

> ⚠️ **본 CHECK 는 실제 프로덕션 DB write 를 포함한다.** 사용자 승인 WO 에 따라 **686 rows INSERT** 수행.
> UPDATE **0** · DELETE **0** · migration **0** · draft 상태 변경 **0** · B군 승격 **0**.

---

## 1. 결론

> **A군 37그룹 · 686 master 승격 완료.** `dbWrite = 686` — 승인 수량과 정확히 일치.
> 사후검증 **7항목 전건 통과**: UPDATE 0 · B군 608 미승격 · 기존 canonical 변경 0 · 주석 노출 0 · route 오류 0 · canonical 중복 0 · 재실행 안전(잔여 대상 0).

---

## 2. 적용 범위 (승인대로)

| 항목 | 승인 | 실제 |
|---|---:|---:|
| `verdict` | `INSERT_auto` | ✅ `INSERT_auto` 만 |
| 그룹 | 37 | **37** |
| INSERT | 686 | **686** |
| status | `canonical` | **`canonical`** |
| 제외 | review · low_ground · **rx_minor** · manual | ✅ **B군 23그룹 608 master 제외** |

`rx_minor_flag` 38건(파모티딘 24 · 펙소페나딘60 14)은 **B군 유지** — 사용자 확정대로 자동 승격 대상에서 제외했다.

---

## 3. 코드 변경

`scripts/drug-otc-single-canonical-promotion.ts`

| 추가 | 내용 |
|---|---|
| **A군 필터** | `ELIGIBLE_VERDICTS = ['INSERT_auto']` → `targets` 를 verdict 로 필터. B군은 `excludedB` 로 분리 계측 |
| **승인 수량 가드** | apply 직전 `writable.length !== 37` → 중단 · `expectedInsert !== 686` → 중단 |
| **A군 순도 가드** | write 대상에 `INSERT_auto` 아닌 그룹이 있으면 중단 |
| 리포트 | A군/B군 분리 출력 + `excludedBGroups` JSON |

### 3-1. ⚠️ 사후검증 가드의 결함을 apply 전에 발견·수정

apply 전 baseline 스냅샷에서 **기존 canonical 중복 44건**이 잡혔다. 추적 결과 **위반이 아니었다**:

```text
master 069f70af… : STORE ko + STORE zh
master 0e33ec09… : B2B en + B2B ko + STORE en + STORE ko
```

**canonical 유일성 계약은 master 단독이 아니라 `(master_id, description_type, COALESCE(language,'ko'))` 당 1개**다(entity 주석·실측 일치). 계약 기준 중복 = **0**.

→ 내 post-count 가드가 **master 단독**으로 검사하고 있어 **apply 가 무조건 롤백될 상태**였다. **올바른 불변식으로 수정 후 apply**했다. baseline 스냅샷이 아니었으면 놓쳤을 결함이다.

---

## 4. APPLY 결과

```text
OTC single 초안 → canonical 승격 (APPLY)
targetMasters(전개)  : 4303 (distinct 4303)
설명 전무(정책 A 대상): 1294
A군(INSERT_auto)     : 37그룹 / 예상 686 master
B군 제외(약사 검토)  : 23그룹 / 608 master
예상 INSERT rows     : 686
예상 UPDATE rows     : 0 (UPDATE 경로 없음)
그룹 간 master 중복  : 0
dbWrite              : 686
```

---

## 5. 사후검증 — **전건 통과**

| # | 항목 | 기대 | 실측 | 결과 |
|---|---|---|---|:---:|
| ① | **신규 canonical** | 686 | **686** (`mfds_drug_otc` · `canonical` · `ko` · `STORE`) | ✅ |
| ② | **UPDATE 0** | 0 | **0** — 스크립트에 UPDATE 문 **0개**(grep 확인) | ✅ |
| ③ | **B군 608건 미승격** | 0 | **0** — B verdict 그룹 유래 SPD **0건** | ✅ |
| ④ | **기존 canonical 변경 0** | 불변 | e약은요 **19,177** · nutrition_combo **1,915** · manual 144/32 · supplier 10 — **baseline 과 동일** | ✅ |
| ⑤ | **주석 노출 0** | 0 | `&gt;` **0** · 주석 문구(별개 그룹/전문의약품이다/큐레이션/약사 검토 강화) **0** | ✅ |
| ⑥ | **route 오류 0** | 0 | **686/686** 이 `<h2>복용 안내</h2>`(oral) — A군은 전부 oral, 비경구 혼입 0 | ✅ |
| ⑦ | **canonical 중복 0** | 0 | 계약 기준 `(master,type,language)` 중복 **0** | ✅ |

### 5-1. 추가 검증

| 항목 | 결과 |
|---|---|
| **재실행 안전(idempotency)** | 남은 A군 대상 **0** → 재실행 시 no-op | 
| **비-OTC 혼입** | **0** (686 전부 `drug_category='otc'`) |
| 승격 그룹 수 | `source_ref_id` distinct **37** |
| **`<table>` 사용** | **0** (`summaryTable` → `sd-core` 매핑) |
| **sd-* 계약** | **686/686** `sd-card` 보유 |
| draft 상태 | **95건 전부 `needs_review` 유지** (변경 0) |

콘텐츠 샘플:
```html
<div class="sd-card">
  <div class="sd-hero">
    <div class="sd-badges"><span class="sd-badge is-solid">일반의약품</span><span class="sd-badge">폴산(엽산) 보급…
```

---

## 6. 안전 조건 대조

| 조건 | 결과 |
|---|---|
| 기존 설명이 있는 master 제외 | ✅ `NOT EXISTS(SPD)` — 정책 A |
| master 중복 발견 시 중단 | ✅ 그룹 간 중복 0, 가드 동작 |
| `buildDrugOtcConsumerHtml` 만 사용 | ✅ |
| `bodyMarkdown` 사용 금지 | ✅ 로드조차 안 함 |
| 예상 INSERT ≠ 686 시 중단 | ✅ 가드 추가 |
| apply 후 canonical 중복 시 rollback | ✅ (올바른 불변식으로 수정, §3-1) |

---

## 7. 현재 상태

| source_type | status | rows |
|---|---|---:|
| `mfds_easy_drug` | canonical | 19,177 |
| `mfds_drug_otc_nutrition_combo` | canonical | 1,915 |
| **`mfds_drug_otc`** | **canonical** | **686** ← 신규 |
| `manual` | canonical | 144 |

**OTC 설명서 커버리지**: canonical 보유 OTC master 21,046 → **21,732**.

**rollback 경로**: `source_type='mfds_drug_otc'` 로 식별 가능(686 rows, source_ref_id = draft candidate_id).

---

## 8. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| dry-run 수량 일치 후 apply | ✅ 37/686 일치 확인 → apply |
| DB 적용 결과와 사후검증 기록 | ✅ §4 · §5 |
| 코드·문서 commit·push | ✅ |

---

## 9. 남은 것

| 항목 | 내용 |
|---|---|
| **B군 608 약사 검토** | 23그룹. **생약 2그룹(은행엽 203·포도엽 96 = 299, B군의 49%) 우선** — 사유 동일(grounding 얇음) |
| **영문 번역 저장** | **686건 기준으로 시작 가능** — 한국어 canonical 이 확정됐으므로 PILOT-VALIDATION §5-G 선결 ① 해소 |
| 전개 불가 10건 | ATC 형식 groupKey — 별도 설계 |
| build 선행 결함 | 타 세션 `e41c78157`(content-guard) — 본 WO 와 무관, 미해소 |
