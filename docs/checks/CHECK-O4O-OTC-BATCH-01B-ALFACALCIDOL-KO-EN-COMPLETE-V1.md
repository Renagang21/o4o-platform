# CHECK-O4O-OTC-BATCH-01B-ALFACALCIDOL-KO-EN-COMPLETE-V1 — 알파칼시돌 0.5㎍ ko·en canonical 완결 (에이전트 가)

WO: `WO-O4O-OTC-BATCH-01B-ALFACALCIDOL-KO-EN-COMPLETE-V1` · 일자: 2026-07-18 · 상태: **완료 (ko·en canonical 승격)**
계승: [BATCH-01B KO DRAFT CORRECTION §1](./CHECK-O4O-OTC-BULK-BATCH-01B-KO-DRAFT-CORRECTION-AGENT-GA-V1.md) — 보완된 알파칼시돌 draft(candidate 0436f0d8)
채널: **Cloud SQL Auth Proxy(:5442) → production `o4o_platform`** (사용자 인가). 단계별 단일 TX · 이중 게이트 · 사후검증 rollback.

---

## 0. 결론

> **알파칼시돌 0.5㎍ 연질캡슐 그룹 promotable 21 master 를 ko STORE canonical 로 승격하고, en 번역 1건을 동일 21 master 에 needs_review 전개 후 canonical 로 전환했다. ko 21 / en 21 완비, ko↔en 정합 21/21, 지문 21/21 불변. 수치·금기 대조 PASS. 결정글루코사민 8 · shard·통합 파일 변경 0. 재실행 no-op.**

---

## 1. 대상 재열거 (apply 직전)

| 항목 | 값 |
|---|---|
| 그룹 | `알파칼시돌\|0.5마이크로그램\|연질캡슐` |
| 그룹 master | **50** (e약은요 grounded 29 = `mfds_easy_drug` canonical + promotable 21) |
| rx 혼입 | **0** |
| promotable(재열거) | **21** = EXPECTED → 일치(불일치 시 ABORT 설계) |
| candidate | `0436f0d8-3dbe-4939-b511-de3bcd69593c` (보완 draft) |

- promotable = 그룹 내 canonical STORE 미보유 + rx 아님. grounded 29 는 이미 e약은요 canonical 보유 → 대상 제외(불변).

---

## 2. 실행 3단계 (각 단일 TX · 이중 게이트)

| STEP | 스크립트 | 동작 | 결과 |
|---|---|---|---|
| 1 | `...-ko-canonical-promotion.ts` | ko STORE canonical INSERT (source_type=mfds_drug_otc, source_ref=candidate) | **INSERT 21** · koCanonicalAfter 21 |
| 2 | `...-en-persist.ts` | en STORE needs_review INSERT (동일 21 master, summary NULL) | **INSERT 21** · ko↔en 21 |
| 3 | `...-en-canonical-promotion.ts` | en needs_review → canonical 상태 전환(내용 불변) | **flip 21** · 지문 21/21 · post(can 21/nr 0/dup 0) |

- 게이트: `--apply` + 각 `DRUG_OTC_BATCH01B_ALFA_{KO,EN,EN_PROMOTE}_CONFIRM=YES`.
- 빌더: ko=`buildDrugOtcConsumerHtml`(구조화 필드, bodyMarkdown 미사용) · en=`buildDrugOtcEnConsumerHtml`(구조화 번역). `<table>`·주석·이중 escape 0 · `sd-warn` 유지 · en 한글 0.

---

## 3. 고정 내용 대조 (수치·금기 PASS)

| 항목 | ko canonical | en canonical |
|---|:---:|:---:|
| 골다공증 0.5–1㎍ (1~2캡슐) | ✅ `1~2캡슐(0.5~1㎍)` | ✅ `one to two capsules (0.5–1 ㎍)` |
| 부갑상선기능저하증 등 1–4㎍ (2~8캡슐) | ✅ `2~8캡슐(1~4㎍)` | ✅ `two to eight capsules (1–4 ㎍)` |
| 혈청 칼슘에 따라 용량 조절 | ✅ `혈청 칼슘 수치에 따라` | ✅ `adjusted according to blood calcium levels` |
| 유육종증 환자 상담 | ✅ `유육종증 환자` | ✅ `sarcoidosis` |
| 칼슘·비타민D·마그네슘 병용 금지 | ✅ | ✅ |
| 캡슐 수 대응 정확 | ✅ | ✅ |

- 번역 근거 파일: `apps/api-server/src/scripts/data/otc-en-translations-batch-01b-alfacalcidol-v1.json` (그룹당 1건, checkNote 포함).

---

## 4. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| candidate SPD | ko canonical **21** · en canonical **21** | ✅ |
| needs_review 잔여 | **0** | ✅ |
| en canonical 중복 | **0** | ✅ |
| ko↔en 정합(master·source_ref) | **21/21** | ✅ |
| en flip 지문(길이+md5) 불변 | **21/21** | ✅ |
| ko 위생 (`sd-warn`/`<table>`/주석) | 유지 / 0 / 0 | ✅ |
| en 위생 (한글/`<table>`/이중escape) | 0 / 0 / 0 | ✅ |
| 재실행 멱등 (ko newInsert / en newInsert / en toFlip) | **0 / 0 / 0** (no-op) | ✅ |
| **결정글루코사민 8 master SPD** | **0 (불변)** | ✅ |

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 대상 전건 ko·en canonical 완비 | ✅ 21 / 21 |
| 수치·금기 대조 PASS | ✅ (§3) |
| 글루코사민 변경 0 | ✅ (SPD 0 유지) |
| shard·통합 파일 변경 0 | ✅ |
| ko↔en `master_id`·`source_ref_id` 일치 | ✅ 21/21 |
| `bodyMarkdown` 미사용 · 기존 설명서 content UPDATE 0 | ✅ (INSERT + status flip만) |
| 단계별 단일 TX · 이중 게이트 · 재실행 no-op | ✅ |
| commit·push | ✅ |

---

## 6. 산출물

- `apps/api-server/src/scripts/drug-otc-batch-01b-alfacalcidol-ko-canonical-promotion.ts`
- `apps/api-server/src/scripts/drug-otc-batch-01b-alfacalcidol-en-persist.ts`
- `apps/api-server/src/scripts/drug-otc-batch-01b-alfacalcidol-en-canonical-promotion.ts`
- `apps/api-server/src/scripts/data/otc-en-translations-batch-01b-alfacalcidol-v1.json`
- 본 CHECK 문서

> **제외 유지**: `결정글루코사민황산염|250밀리그램|캡슐` 8 master 는 식약처 품목허가 첨가제 원문 확보 시까지 변경 없음. 검증 도구(`drug-otc-batch-01b-gluco-additive-source-verify.ts`)는 두 itemSeq(200000936·200003542) 원문 인입 시 재실행 보류 도구로 유지.
