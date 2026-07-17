# CHECK-O4O-OTC-HERBAL-CANONICAL-PROMOTION-299-V1 — 은행엽·포도엽 ko canonical 승격

WO: `WO-O4O-OTC-HERBAL-CANONICAL-PROMOTION-299-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [HERBAL-REVIEW](./CHECK-O4O-OTC-HERBAL-REVIEW-GINKGO-GRAPELEAF-V1.md) · [HERBAL-COMMON-OMISSION-FIX](./CHECK-O4O-OTC-HERBAL-COMMON-OMISSION-FIX-V1.md)

> **INSERT only 299.** UPDATE/DELETE **0** · draft 미변경 · 단일 TX · 이중 게이트.

---

## 0. 결론

> **수정 완료된 은행엽·포도엽 draft 를 ko STORE canonical 로 승격. INSERT 299(은행엽 203 + 포도엽 96). 그룹 총계·promotable 게이트 정확 일치, sd-warn 적용, `<table>`·주석 0, (master,language) 중복 0, 재실행 no-op.**

---

## 1. 대상 열거 (masterIds 미저장 → 재열거)

draft seed_json 에 masterIds 부재(masterTotal 만: 213/103). `A_no_spd_only` 정책으로 재열거:

| 그룹 | 열거 조건 | 그룹 총계 | STORE canonical(제외) | **승격** |
|---|---|---:|---:|---:|
| 은행엽건조엑스 80mg 정 | `name LIKE '%(은행엽건조엑스)'` + `spec 첫토큰='80밀리그램'` + `name LIKE '%정%'` | **213** | 10 | **203** |
| 포도엽건조엑스 180mg 캡슐 | `name LIKE '%(포도엽건조엑스)'` + `spec 첫토큰='180밀리그램'` + `name LIKE '%캡슐%'` | **103** | 7 | **96** |

> **열거 gotcha**: 제형 검출은 `split_part(spec,' / ',3)` 불가 — 54개 master 는 spec 이 `80밀리그램 / 0`(2토큰)이라 제형 필드가 비어있다(예: 진코넥정80밀리그램). **name 키워드(`정`/`캡슐`)로 제형 판정**해야 213/103 정확 재현. 이 방식이 seed-time masterTotal 과 일치.
> **promotableTarget(stable 203/96)** = 그룹 − (이 승격 외 STORE canonical 보유 master). 이 승격 자신의 canonical 은 제외하지 않아 재실행에도 203/96 유지.

---

## 2. 승격 (INSERT only · builder)

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-herbal-canonical-promotion.ts`](../../apps/api-server/src/scripts/drug-otc-herbal-canonical-promotion.ts) |
| 게이트 | `--apply` + `DRUG_OTC_HERBAL_PROMOTION_CONFIRM=YES` |
| content | `buildDrugOtcConsumerHtml`(구조화 필드만 — **bodyMarkdown 미사용**) |
| INSERT | `description_type=STORE · language=ko · status=canonical · source_type=mfds_drug_otc · source_ref_id=candidate_id` |
| 멱등/A_no_spd_only | `INSERT … WHERE NOT EXISTS(canonical)` → 이미 canonical 있는 master 건너뜀 |

**실행 전 게이트**(전건 통과): 그룹 총계 213/103 · promotable 203/96 · 두 그룹 master 교집합 **0** · 필수필드 누락 0 · 빈 html 0 · `<table>` 0 · 주석(`<!--`) 0 · sd-warn 존재.

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| INSERT | **299** (은행엽 203 + 포도엽 96) | ✅ |
| ko canonical 생성 | 은행엽 **203/203** · 포도엽 **96/96** | ✅ |
| UPDATE/DELETE | 0 | ✅ |
| sd-warn 적용 | 299/299 | ✅ |
| `<table>` | 0 | ✅ |
| 주석 노출 | 0 | ✅ |
| **(master,language) canonical 중복** | **0** | ✅ |
| 은행엽/포도엽 canonical | ko **299** / en 0 | ✅ |
| 재실행 멱등 | promotable 299(stable) · newInsert **0** · INSERT **0** | ✅ |

> **중복 참고**: `(master) 중복 686` 은 첨가제군 master 가 ko+en 둘 다 보유한 정상 케이스(language 미구분 집계 아티팩트). **`(master,language)` 기준 실 중복 = 0**.

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 한국어 canonical 299건 승격 | ✅ INSERT 299 |
| 사후검증 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 5. 다음

- **다음**: 두 그룹 영문 번역 **그룹당 1회 생성 → 299 master 전개**(en canonical). 원문없음 115 별도 보류 유지.
