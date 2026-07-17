# CHECK-O4O-OTC-HERBAL-EN-TRANSLATION-PERSIST-299-V1 — 은행엽·포도엽 영문 전개 저장

WO: `WO-O4O-OTC-HERBAL-EN-TRANSLATION-PERSIST-299-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [HERBAL-CANONICAL-PROMOTION](./CHECK-O4O-OTC-HERBAL-CANONICAL-PROMOTION-299-V1.md) · [TRANSLATION-DRAFTS P6/P7](../guides/products/drug/pilot-en-design/TRANSLATION-DRAFTS-V1.md)

> **INSERT only 299 (en needs_review).** UPDATE/DELETE **0** · ko canonical 변경 **0** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **은행엽·포도엽 영문 번역(그룹당 1건)을 ko canonical 이 있는 299 master 에 en `needs_review` 로 전개. INSERT 299(은행엽 203 + 포도엽 96). 한글·`<table>`·주석 0, sd-warn 299/299, ko↔en(master_id·source_ref_id) 일치 299, 재실행 no-op. 검수 후 canonical 전환 예정.**

---

## 1. 번역 (그룹당 1건 · GUIDE/GLOSSARY)

- 번역 소스: `otc-en-translations-herbal-v1.json`(2건, 공유 파일 미수정 — clobber 방지).
- 필드: title·usageLabel·efficacy·usage·caution·summaryTable(영문 키). **GMP 푸터는 빌더 상수** 자동(ingredientSelection 번역 불필요). **bodyMarkdown·translatorNote 본문 미삽입.**
- TEST-LOG 2건: [TRANSLATION-DRAFTS P6(은행엽)/P7(포도엽)](../guides/products/drug/pilot-en-design/TRANSLATION-DRAFTS-V1.md) — 수치·용량·기간·금기 전건 대조 ✅.

| 그룹 | title | 핵심 수치 대조 |
|---|---|---|
| 은행엽 80mg 정 | Ginkgo Leaf Dry Extract 80 mg Tablet | 40/80/120 mg · 40–80 mg · three times/twice a day · 12 or under ✅ |
| 포도엽 180mg 캡슐 | Grape Leaf Dry Extract 180 mg Capsule | two capsules (360 mg) · once a day · six weeks ✅ |

> **강도 유지**: 금기(Do not take this if…) / 상담(Talk to a pharmacist / seek advice) 구분 보존.

---

## 2. 전개 저장

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-herbal-en-persist.ts`](../../apps/api-server/src/scripts/drug-otc-herbal-en-persist.ts) |
| 게이트 | `--apply` + `DRUG_OTC_HERBAL_EN_CONFIRM=YES` |
| master 집합 | 각 그룹 **ko canonical**(source_type=mfds_drug_otc, ko, source_ref_id=candidate) → ko↔en 정합 |
| content | `buildDrugOtcEnConsumerHtml`(구조화 필드만) |
| 저장 | `description_type=STORE · language=en · status=needs_review · source_type=mfds_drug_otc · source_ref_id=candidate` |
| 멱등/충돌 | `INSERT … WHERE NOT EXISTS(en STORE needs_review/canonical)` |

**실행 전 게이트**(전건 통과): 그룹당 번역 1건 · ko canonical 203/96 존재 · master 교집합 0 · 필수필드 누락 0 · 한글 0 · `<table>` 0 · 주석 0 · sd-warn 존재.

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| INSERT | **299** (은행엽 203 + 포도엽 96) | ✅ |
| en needs_review | 은행엽 **203/203** · 포도엽 **96/96** | ✅ |
| sd-warn | 299/299 | ✅ |
| 한글 포함 | **0** | ✅ |
| `<table>` / 주석 | 0 / 0 | ✅ |
| **ko↔en (master_id·source_ref_id 일치)** | **299/299** | ✅ |
| **ko canonical 불변** | **299/299** | ✅ |
| UPDATE/DELETE | 0 | ✅ |
| 재실행 멱등 | newInsert **0** · INSERT **0** | ✅ |

> **렌더**: 실제 빌더(`buildDrugOtcEnConsumerHtml`) 출력이라 sd-* 반응형 구조·이스케이프 정상(구성상 보장).

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 영문 번역 2건 검수 | ✅ TEST-LOG P6/P7 |
| 영어 needs_review 299건 저장 | ✅ INSERT 299 |
| 한국어 canonical 변경 0 | ✅ 299 불변 |
| 사후검증 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 5. 산출물 / 다음

- `otc-en-translations-herbal-v1.json` — 은행엽·포도엽 en 번역 2건
- `drug-otc-herbal-en-persist.ts` — 전개 스크립트
- TRANSLATION-DRAFTS-V1.md P6/P7 — TEST-LOG

> **다음**: en needs_review 299 검수 후 **canonical 전환**(별도 WO). 원문없음 115 별도 보류 유지.
