# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-DRAFT-DB-APPLY-V1

- WO: `WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-DRAFT-DB-APPLY-V1`
- 선행: `...STRENGTH-SPLIT-V1`, `...SPLIT-DRAFT-REVISION-V1`, `O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`
- 작성일: 2026-07-07
- 작업 유형: **DB apply DRY-RUN → 사용자 승인 → 실제 apply 실행**
- 현재 상태: **✅ APPLIED (2026-07-07) · 23건 insert 완료 · post-verify 통과**
- 결론: ready_for_apply 25건 중 grounding 확인된 **23건을 `product_candidate_description_drafts`에 단일 트랜잭션으로 insert 완료**. 비타민C 500mg·100mg 2건은 grounding 0으로 보류. 제외 대상 불변 확인. DB write 범위는 draft insert로만 한정.

---

## 0. 실행 결과 (POST-APPLY)

> **DRY-RUN(§1~§7) 후 사용자 승인**(2026-07-07, `--apply` + `DRUG_OTC_NUTRITION_COMBO_DRAFT_APPLY_CONFIRM=YES` + 비타민C 500/100mg 보류 + nutritionExcluded=false 정책 전환 승인)**을 받아 실제 apply를 실행했다.**

```
applyRunId : otc-nutrition-combo-draft-v1
대상       : ready_for_apply 25 − 보류 2(비타민C 500·100mg) = 23
insert     : 23  (단일 트랜잭션, product_candidate_description_drafts only)
방식       : BEGIN → 사전조건 재확인(DO) → 23 INSERT → post-count → COMMIT
```

### 0.1 post-apply 검증 결과

| 검증 | 목표 | 결과 |
|---|---|---|
| insert 행수 | 23 | ✅ `inserted_this_run=23` |
| distinct candidate_id | 23 | ✅ 23 (중복 0) |
| distinct source_identifier_value | 23 | ✅ 23 |
| 전체 live draft (72 → +23) | 95 | ✅ 95 |
| 신규 draft `nutritionExcluded=false` | 23 | ✅ 23 |
| 신규 draft `review_status` | needs_review | ✅ 23/23 |
| 신규 draft grounding spdMasters | 전부 >0 | ✅ min=2, zero=0 |
| **보류 비타민C 500·100mg 적재** | 0 | ✅ 0 |
| **철분/엽산(b03) 적재** | 0 | ✅ 0 |
| **Fe 포함 변형(A-Fe/noA-Fe) 적재** | 0 | ✅ 0 |
| `shared_product_descriptions`(easy_drug) | 19,431 불변 | ✅ 19,431 |
| ProductMaster/Identifier/canonical/매장 | 무변경 | ✅ 미접촉 |

→ **DB write 범위 = `product_candidate_description_drafts` 23행 insert only.** 다른 테이블·canonical·매장 자산 변경 0.

아래 §1~§7은 실행 근거가 된 dry-run 기록이다(원형 보존).

---

## 1. 파이프라인 정합성 (기존 구조 확인)

`product_candidate_description_drafts` 실사(72행)로 기존 적재 규약을 확인했다. 신규 영양제 draft는 이 규약을 그대로 따른다.

| 필드 | 고정값/규약 |
|---|---|
| `draft_type` | `store_description` |
| `source_label` | `MFDS_DRUG_OTC` |
| `language` | `ko` |
| `review_status` | `needs_review` |
| `candidate_id` | anchor master에 매칭된 **표준코드 candidate**(`mfds-drug-master-standard-code_2025-10-31`) |
| `source_identifier_value` | family key (예: `drug_otc::combo::oral::A11JC`) |
| `seed_json` | atc7·comboCode·familyKey·grounding{source,spdMasters,spdSampleIds}·groupScope{otc,masterTotal,anchorMaster,manufacturers,anchorCandidate}·registryGroupKeys[]·applyRunId·klass·doseForm |
| `content_json` | summaryTable·bodyMarkdown·efficacy·usage·caution·usageLabel·ingredient·groupKey·contentSource |
| `guard_result` | verdict·rxCount·rxPurity·comboClass·spdOverlap·groundingEasyDrug·nutritionExcluded·doseRouteManual |

> **선례 발견:** 기존 72개 draft는 전부 `guard_result.nutritionExcluded=true` — 즉 **기존 OTC combo draft 파이프라인은 영양제를 명시적으로 제외**해 왔다. 본 WO는 **영양제류 최초 적재**이며, 신규 draft는 `nutritionExcluded=false`(영양제 대상임)로 기록한다. 이 정책 전환은 사용자 승인 대상이다(§7).

---

## 2. DRY-RUN 해결표 (25 split key → anchor · candidate · scope)

read-only 해결 결과. `cand`=anchor 표준코드 candidate_id, `masters`=그룹 내 OTC master 수, `spd`=e약은요 보유 수.

| split_key | anchor master | candidate_id | masters | mfr | spd | grounding |
|---|---|---|--:|--:|--:|:--:|
| a11ha05::5mg::tablet | 이든비오틴정5밀리그램 | 79a515f0… | 30 | 10 | 28 | strong |
| a11ga01::1000mg::tablet | 유한비타민씨정1000mg | 6f143bbc… | 31 | 13 | 11 | partial |
| **a11ga01::500mg::tablet** | 아스코정500밀리그램 | 03db739a… | 6 | 2 | **0** | **none ⚠** |
| **a11ga01::100mg::tablet** | 부광아스코르브산정50밀리그램 | ad4e141a… | 6 | 2 | **0** | **none ⚠** |
| a11ha03::100iu::soft_capsule | 오로페롤연질캡슐100밀리그램 | cda011db… | 8 | 3 | 5 | strong |
| a11ha03::400iu::soft_capsule | 그랑페롤연질캡슐400아이유 | 03751234… | 9 | 6 | 2 | partial |
| a11ha03::1000iu::soft_capsule | 하노백연질캡슐1000아이유 | 6343c0f5… | 20 | 7 | 14 | strong |
| a12cc::470mg::tablet | 마그네스정 | 91d2a67d… | 21 | 8 | 5 | partial |
| a12cc::940mg::tablet | 마그네스디정 | 8b8ad3b4… | 4 | 1 | 4 | strong |
| a12cc::290mg::tablet | 판토마그정 | 738fce8e… | 3 | 1 | 3 | strong |
| a12cc::5mg::tablet | 마이렉스정 | a3c46e34… | 4 | 2 | 3 | strong |
| a12ax::caD::tablet | 디카본300정 | 2bb82579… | 598 | 96 | 302 | strong |
| a11ja::DEC::tablet | 케이페롤정 | b96f3977… | 259 | 54 | 160 | strong |
| a11db::Bcomplex::tablet | 더블액티브정 | 1eb608e0… | 102 | 24 | 58 | strong |
| a11eb::B1B2B6C::tablet | 비올씨정 | db7c085e… | 95 | 31 | 49 | strong |
| a11jb::mgB::liquid | 마그포스스피드액 | 41fc4904… | 101 | 20 | 77 | strong |
| a11jc::noA-noFe::tablet | 메가벤포큐정 | 26c2af33… | 709 | 73 | 407 | strong |
| a11jc::A-noFe::tablet | 키즈부스터비타츄어블정 | fcf616ee… | 20 | 7 | 20 | strong |
| a11jc::noA-noFe::soft_capsule | 마그랑비연질캡슐 | d29b1340… | 769 | 93 | 277 | strong |
| a11jc::A-noFe::soft_capsule | 경남그린웰연질캡슐 | 270a10a2… | 118 | 26 | 118 | strong |
| a11ex::noA-noFe::tablet | 비타콤보정 | d5265213… | 353 | 48 | 188 | strong |
| a11ex::A-noFe::tablet | 임팩타민파워에이플러스정 | 1121423d… | 4 | 1 | 4 | strong |
| a11jb::noA-noFe::tablet | 마이비젯정 | b21c54a6… | 320 | 61 | 117 | strong |
| a11jb::noA-noFe::soft_capsule | 미투-에스연질캡슐 | 029b8650… | 240 | 43 | 76 | strong |
| a11jb::A-noFe::soft_capsule | 쎌업연질캡슐 | 5a342fe9… | 29 | 8 | 29 | strong |

> master_total은 그룹 전체(비-SPD 마스터는 A-/Fe- baseline으로 기본 배정) 기준이라 SPD 수보다 크다. seed_json.groupScope.masterTotal에 그대로 기록.

---

## 3. 사전조건 검증 결과 (WO 체크리스트)

| 사전조건 | 목표 | 결과 |
|---|---|---|
| 대상 수 | 25 | ✅ 25 해결 |
| ready_for_apply 외 대상 | 0 | ✅ 0 (needs_pharmacist_review/pending 미포함) |
| anchor master 존재 | 25 | ✅ 25 |
| anchor candidate 존재 | 25 | ✅ 25 (`missing_cand=0`, `anchor_candidates_null=0`) |
| 기존 active draft 충돌(anchor candidate) | 0 | ✅ 0 |
| 기존 영양 family draft 충돌 | 0 | ✅ 0 (nutrition 최초 적재) |
| canonical 중복 충돌 | 0 | ✅ 0 (SPD easy_drug는 grounding, canonical store desc 부재) |
| run_id 중복 | 0 | ✅ `applyRunId='otc-nutrition-combo-draft-v1'` 신규 |
| **content grounding 성공** | 25 | ⚠ **23** — 비타민C 500mg·100mg 2건 e약은요 0 |

### 3.1 발견 — 비타민C 500mg·100mg grounding gap (조치 필요)

- `a11ga01::500mg`, `a11ga01::100mg` 두 버킷은 소속 마스터에 **e약은요 원문이 하나도 없다**(spd=0). 선행 REVISION에서 1000mg 초안 공유(R8·R9)로 ready 처리했으나, **해당 함량대 자체의 직접 grounding이 없다.**
- 가이드 §3.8·WO §11(AI 일반지식 효능 보강 금지)에 따라, 직접 근거 없는 그룹은 자동 적재하지 않는다.
- **권고: 이 2건을 이번 apply에서 보류(needs_pharmacist_review로 재분류)하고, 실제 insert 대상을 23건으로 한다.** (비타민C 효능은 아스코르빈산 성분 공통이나, 적재 모델의 `grounding.spdMasters=0`은 red flag이므로 성분단위 grounding 인정 여부를 사용자가 판단.)
- 대안(사용자 선택): 1000mg 그룹의 e약은요를 **성분(아스코르빈산) 공통 grounding**으로 명시 인용하여 25건 유지. → 승인 시 지정.

---

## 4. INSERT ROW 정의 (preview)

25(권고 23)행 각각 1 row. 스칼라 필드 매핑:

```text
id                      = gen_random_uuid()
candidate_id            = §2 해결표의 candidate_id
source_label            = 'MFDS_DRUG_OTC'
source_identifier_value = family key (예: 'drug_otc::combo::oral::A11JC')
draft_type              = 'store_description'
language                = 'ko'
title                   = 성분·목적 중심 제목 (예: '종합비타민 정제 — 비타민 B군·C·D·E + 아연(비타민A·철 없음)')
summary                 = 1~2문장 요약
content_json            = { summaryTable, bodyMarkdown, efficacy, usage, caution,
                            usageLabel:'복용 안내', ingredient, groupKey,
                            contentSource:'mfds_easy_drug', atc7, doseForm, strengthToken }
seed_json               = { atc7, comboCode, familyKey, groupKey,
                            grounding:{source:'mfds_easy_drug', spdMasters:<spd>, spdSampleIds:[...]},
                            groupScope:{otc:<masters>, masterTotal:<masters>, manufacturers:<mfr>,
                                        anchorMaster:<name>, anchorCandidate:<cand>},
                            registryGroupKeys:['<split_key>'], registryGroupCount:1,
                            klass:'nutrition', doseForm:<form>, strengthToken:<token>,
                            applyRunId:'otc-nutrition-combo-draft-v1' }
guard_result            = { verdict:'INSERT_nutrition_review', rxCount:0, rxPurity:1,
                            comboClass:<'ATC_combination'|'single'>, spdOverlap:true,
                            groundingEasyDrug:<spd>, nutritionExcluded:false,
                            doseRouteManual:false }
review_status           = 'needs_review'
review_flags            = ['nutrition', <label>, 'spd_grounded', (철분/엽산 시)'pharmacist_review']
generated_at            = now()
```

**content 출처(재사용):** 각 split_key의 본문(summaryTable/efficacy/usage/caution)은 이미 작성된
`...PILOT-DRAFT-V1`(원 16그룹)과 `...SPLIT-DRAFT-REVISION-V1`(R1~R11·MR2~MR3 baseline/변형)에 존재한다. apply 스크립트는 이 authored 초안을 content_json으로 조립한다.

### 4.1 예시 row A — `a11jc::noA-noFe::tablet` (baseline, 최다 규모)

```json
{
  "candidate_id": "26c2af33-f6ba-4a09-a686-da8c98137aff",
  "source_label": "MFDS_DRUG_OTC",
  "source_identifier_value": "drug_otc::combo::oral::A11JC",
  "draft_type": "store_description", "language": "ko",
  "title": "종합비타민 정제 — 비타민 B군·C·D·E + 아연 (비타민A·철 없음)",
  "summary": "육체피로·체력저하 시 비타민 B군·C·D·E와 아연 보급, 신경통·근육통·구내염 완화. 비타민A·철이 없어 임신 5,000IU·철분 경고는 해당 없음.",
  "content_json": {"efficacy":"육체피로·임신수유·병중병후 체력저하·발육기·노년기의 비타민 B1·B2·B6·C·D·E 보급과 구루병 예방, 신경통·근육통·관절통, 구각염·구내염, 각기·눈의 피로 완화, 아연 보급.","usage":"만 8세 이상 및 성인 1일 1회 1정.","caution":"과민증·고칼슘혈증·신장질환·신장결석·대두 과민·만 12개월 미만 영아는 복용하지 않습니다. 통풍·혈전 소인·폴산 부족이면 상담. (비타민A·철 없음 → 임신 5,000IU·철분 경고 해당 없음)","usageLabel":"복용 안내","groupKey":"drug_otc::combo::oral::a11jc::noA-noFe::tablet","atc7":"A11JC","doseForm":"tablet","contentSource":"mfds_easy_drug","ingredient":"비타민 B군·C·D·E + 아연"},
  "seed_json": {"atc7":"A11JC","comboCode":"a11jc_combo","familyKey":"drug_otc::combo::oral::A11JC","grounding":{"source":"mfds_easy_drug","spdMasters":407},"groupScope":{"otc":709,"masterTotal":709,"manufacturers":73,"anchorMaster":"메가벤포큐정","anchorCandidate":"26c2af33-f6ba-4a09-a686-da8c98137aff"},"registryGroupKeys":["drug_otc::combo::oral::a11jc::noA-noFe::tablet"],"registryGroupCount":1,"klass":"nutrition","doseForm":"tablet","applyRunId":"otc-nutrition-combo-draft-v1"},
  "guard_result": {"verdict":"INSERT_nutrition_review","rxCount":0,"rxPurity":1,"comboClass":"ATC_combination","spdOverlap":true,"groundingEasyDrug":407,"nutritionExcluded":false},
  "review_status": "needs_review",
  "review_flags": ["nutrition","NUT-MULTI","spd_grounded","baseline_noA_noFe"]
}
```

### 4.2 예시 row B — `a11jc::A-noFe::tablet` (비타민A 포함, 철 없음)

- row A와 동일 골격 + `review_flags`에 `vitaminA_warning` 추가, `content_json.caution`에 **"비타민 A 1일 5,000 IU 이상 시 선천성 기형 — 임신 3개월 이내·임신 가능성 여성 복용 금지, (아스파탐 함유 시) 페닐케톤뇨증 복용 금지"**, `efficacy`에 눈 건조감·야맹증 완화 포함. anchor=키즈부스터비타츄어블정(cand fcf616ee…), spdMasters=20.

---

## 5. APPLY 스크립트 (승인 시 실행 · 미실행)

- 형식: 단일 트랜잭션, 23(또는 25)개 `INSERT ... VALUES`. `INSERT ... SELECT` 아님(행별 content 상이).
- 삽입 전후 가드:
  ```sql
  BEGIN;
  -- pre: 대상 candidate에 active draft 0 재확인
  -- 23 rows INSERT (each with resolved candidate_id + authored content_json)
  -- post: SELECT count(*) FROM product_candidate_description_drafts
  --        WHERE seed_json->>'applyRunId'='otc-nutrition-combo-draft-v1' AND deleted_at IS NULL;  -- expect 23
  COMMIT;
  ```
- 스크립트 파일은 승인 후 생성하여 `--apply` + `DRUG_OTC_NUTRITION_COMBO_DRAFT_APPLY_CONFIRM=YES` 환경에서만 실행.
- 롤백 기준: post count ≠ 대상 수 → `ROLLBACK`.

---

## 6. 제외/보류 대상 불변 확인

| 구분 | 수 | 처리 |
|---|--:|---|
| needs_pharmacist_review (선행) | 10 | apply 제외(불변) |
| pending_source (VitC 206mg) | 1 | apply 제외 |
| **grounding gap (VitC 500·100mg)** | 2 | **이번 apply 보류 권고 → needs_pharmacist_review 재분류** |
| NUT-EYE 이관(오큐바이트) | (10에 포함) | apply 제외 |
| 건기식/한약/비경구/단일 감기약 | — | 애초 대상 아님 |

→ **권고 실제 insert 대상 = 25 − 2 = 23.**

---

## 7. 승인 요청 (BLOCKING)

실제 DB insert 전 아래를 사용자에게 확인한다.

1. **apply 실행 승인** + 토큰: `--apply`, `DRUG_OTC_NUTRITION_COMBO_DRAFT_APPLY_CONFIRM=YES`.
2. **영양제 최초 적재 정책 전환 승인**: 신규 draft `nutritionExcluded=false` (기존 파이프라인은 nutrition 제외였음).
3. **비타민C 500mg·100mg 처리 결정**: (A) 보류 → 23건 insert / (B) 성분단위 grounding 인정 → 25건 insert.

승인 전에는 어떤 write도 하지 않는다.

---

## 8. 금지사항 준수 확인

| 항목 | 상태 |
|---|---|
| 승인 전 DB write | ✅ 미실행 (dry-run only) |
| shared_product_descriptions 변경 | ✅ 없음 |
| canonical 승격 | ✅ 없음 |
| ProductMaster/ProductIdentifier 변경 | ✅ 없음 |
| needs_pharmacist_review 적재 | ✅ 제외 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 없음 |

---

## 9. 완료 보고 (APPLIED)

```
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-DRAFT-DB-APPLY-V1

결과:
- target(ready_for_apply): 25
- resolved(anchor+candidate): 25 (missing 0, 충돌 0)
- inserted: 23  (product_candidate_description_drafts, 단일 트랜잭션)
- skipped(보류): 2 (비타민C 500mg·100mg — grounding 0)
- excluded: needs_pharmacist_review 10 + pending 1
- DB write: 23 draft insert only (다른 테이블/canonical/매장 무변경)
- run_id: otc-nutrition-combo-draft-v1
- post-verify: 23/23, distinct cand 23, held/excluded 적재 0, easy_drug SPD 19,431 불변

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-DRAFT-DB-APPLY-V1.md
```

---

## 부록. 재현 쿼리

- anchor/candidate/scope 해결: `product_masters(otc)` ⨝ `product_identifiers(ATC)` ⨝ `shared_product_descriptions(mfds_easy_drug)` ⨝ `product_candidates(matched_product_master_id, standard-code)`; split_key CASE 배정 후 그룹별 최장 SPD anchor 선택.
- 충돌 검사: 기존 `product_candidate_description_drafts`의 candidate_id/`source_identifier_value` 대조.
- 세션 스크래치패드 `d2_resolve.sql`. 영속 테이블 무변경(DB write 0).
