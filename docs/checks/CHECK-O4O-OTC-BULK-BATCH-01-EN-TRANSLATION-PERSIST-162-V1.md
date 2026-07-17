# CHECK-O4O-OTC-BULK-BATCH-01-EN-TRANSLATION-PERSIST-162-V1 — Batch 01 영문 전개

WO: `WO-O4O-OTC-BULK-BATCH-01-EN-TRANSLATION-PERSIST-162-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [BATCH-01 KO 승격](./CHECK-O4O-OTC-BULK-BATCH-01-KO-CANONICAL-PROMOTION-162-V1.md) · [실행 지침서 §3–4](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)

> **INSERT only 162 (en needs_review).** UPDATE/DELETE **0** · ko canonical 변경 **0** · draft 변경 **0** · Batch 02 **무관** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **Batch 01 8그룹 en 번역(그룹당 1건)을 ko canonical 162 master 에 en `needs_review` 전개. INSERT 162 / ko↔en(master_id·source_ref_id) 162 일치 / 한글·`<table>`·주석·이중 escape 0 / sd-warn 162 / ko canonical 불변 / Batch 02 교집합 0 / 재실행 no-op. 검수 후 canonical 전환 예정.**

---

## 1. 번역·전개

| 항목 | 값 |
|---|---|
| 번역 파일(배치 전용) | `apps/api-server/src/scripts/data/otc-en-translations-batch-01-v1.json` (8건) |
| GUIDE / GLOSSARY | `OTC-EN-TRANSLATION-GUIDE V0.5` / `OTC-KO-EN-GLOSSARY V0.2` |
| 스크립트 | [`drug-otc-bulk-batch-01-en-persist.ts`](../../apps/api-server/src/scripts/drug-otc-bulk-batch-01-en-persist.ts) |
| 게이트 | `--apply` + `DRUG_OTC_BATCH01_EN_CONFIRM=YES` |
| master 집합 | 각 그룹 **ko canonical**(source_ref_id=candidate) → ko↔en 정합 |
| content | `buildDrugOtcEnConsumerHtml`(구조화 필드만 · GMP 빌더상수 · bodyMarkdown/translatorNote 미삽입) |
| 저장 | `STORE · en · needs_review · mfds_drug_otc` · `INSERT WHERE NOT EXISTS(en STORE)` |

**실행 전 게이트(전건 통과)**: 번역 8·groupKey 중복 0 · ko canonical **162** · 기존 en STORE **0** · 예상 INSERT **162** · **Batch 02 교집합 0** · 필수필드 누락 0 · 한글 0 · 빌드 빈값 0.

---

## 2. TEST-LOG (8그룹 수치·연령·기간·금기 대조)

> 자동 번역만으로 완료 처리하지 않음 — 그룹별 정보축 대조 후 확정. 원문에 없는 효능·마케팅 표현 추가 0.

| 그룹 | 1회/1일/간격/최대 | 연령·기간 | 금기·특수 경고 |
|---|---|---|---|
| 나프록센275정 | 550 mg→275 mg / 6–8 h / 1,350 mg | under 2 | CABG·임부수유부 금기 / NSAID 심혈관(heart attack, stroke)·위장 bleeding / 음주 pharmacist |
| 클로닉신125정 | 125–250 mg / 3×/day | — | CABG·임부·IBD 금기 / 아스피린·NSAID 과민 / 고혈압·천식 상담 |
| 이부프로펜200정 | 200–400 mg / 3–4×/day | last 3 months of pregnancy | CABG 금기 / NSAID 심혈관·위장 경고 |
| 아스피린100정 | 1 tablet / 1×/day | third trimester | 살리실산 과민·아스피린천식·혈우병 금기 / 장용정 swallow whole / 수술 전 고지·항응고제 상담 |
| 디펜히드라민50연질 | 1 cap→25 mg / 1×/day | under 15 / 2–3 doses | 녹내장·전립선비대·호흡곤란·수유부 금기 / 운전·기계 경고 |
| 독시라민25정 | 25 mg / 1×/day / 30 min | aged 15 or under / 2 weeks | 녹내장·전립선비대·호흡장애·수유부 금기 / 임부 상담 / 운전 경고 |
| 메코발라민500캡슐 | 1,500 ㎍ / 3 doses | one month | 과민·유당 대사 유전질환 금기(원문 수준 유지) / 임부수유부 상담 |
| 이부프로펜200연질 | 200–400 mg / 3–4×/day · 편두통 2 caps/24 h · 고용량 2,400 mg 회피 | last 3 months of pregnancy | CABG 금기 / NSAID 심혈관·위장 경고 |

> **강도 보존**: 금기(`Do not take this if …`) / 상담(`Talk to a pharmacist … / seek advice`) / 운전(`do not drive or operate machinery`) / NSAID 심혈관·위장 경고 모두 원문 강도 유지. 약화·과장 0. 수정 이력: 없음(초안 = 확정).

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| INSERT / en needs_review | **162 / 162** | ✅ |
| 그룹별 ko = en 수량 | 8/8 일치 | ✅ |
| **ko↔en master_id·source_ref_id 일치** | **162 / 162** | ✅ |
| 한글 포함 | **0** | ✅ |
| `<table>` / 주석 / 이중 escape | 0 / 0 / 0 | ✅ |
| sd-warn | **162 / 162** | ✅ |
| ko canonical 불변 | **162** | ✅ |
| en STORE 중복 | **0** | ✅ |
| Batch 02 교집합 / Batch 02 성분 en | **0 / 0** | ✅ |
| 재실행 멱등 | newInsert **0** / INSERT **0** | ✅ |

---

## 4. 병렬 작업 준수

- Batch 02 draft·번역 JSON·CHECK·스크립트 **미수정**(groupKey 상수는 읽기전용 교차확인용).
- 알파칼시돌0.5·글루코사민250 **미작업**.
- 공통 GUIDE·GLOSSARY·Registry·공용 번역 JSON **미수정**(배치 전용 파일만 생성).
- `git add .` 미사용 — pathspec stage.

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 8그룹 영문 번역 작성·검수 | ✅ §2 TEST-LOG |
| en needs_review INSERT 162 | ✅ |
| ko canonical 변경 0 | ✅ |
| UPDATE·DELETE 0 | ✅ |
| Batch 02와 충돌 0 | ✅ |
| 사후검증 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 6. 다음

- **검수 후 en canonical 전환**(별도 WO): 162 상태만 `needs_review → canonical`, content 불변(지문 증명).
- 제외 2그룹(알파칼시돌0.5·글루코사민250) 원문 누락 보완 후 편입.
