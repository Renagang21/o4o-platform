# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-SPLIT-DRAFT-REVISION-V1

- WO: `WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-SPLIT-DRAFT-REVISION-V1`
- 선행: `CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-PILOT-DRAFT-V1`, `CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-STRENGTH-SPLIT-V1`
- 작성일: 2026-07-07
- 작업 유형: **운영 DB read-only grounding 보강 + split 초안 확정** (DB 저장 아님)
- DB write: **0** (SELECT + 세션 로컬 TEMP TABLE만)
- 결론: 35개 split_group_key 확정 — **ready_for_apply 25 · needs_pharmacist_review 10 · defer 0 · exclude 0**. revise_draft 11건 baseline/변형 초안 보정 완료, manual_review 5건 판단 완료.

---

## 1. 개요

`STRENGTH-SPLIT` 결과 35개 split_group_key에 대해 실제 적용 가능한 초안 세트를 확정한다.

- `revise_draft 11` → 각 split의 **실제 다수군(baseline) 또는 해당 조합에 맞게 e약은요 원문 기준으로 초안 보정**.
- `manual_review 5` → 원문 개별 확인 후 판단.
- `use_existing_draft 19` → 공통 안전문구(GMP·성분기준 선택) 포함 확인, 철분/엽산 등 민감 약효군은 `needs_pharmacist_review` 유지.

grounding 정본: `shared_product_descriptions.source_type='mfds_easy_drug'`. 각 하위군은 해당 조합(A±/Fe±) 조건을 만족하는 대표 ProductMaster 원문으로 근거를 재확인했다(§부록).

---

## 2. revise_draft 보정 초안 (11건)

> 복합제 baseline(비타민A·철 없음)은 pilot 초안에서 **비타민A 5,000IU 임신경고와 철분 경고를 제거**하고, 실제 다수군 대표 원문으로 효능·성분을 맞췄다.

### R1. A11JC/tab · `noA-noFe` (baseline, 407마스터/57사) — 근거: 메가벤포큐정

| 항목 | 내용 |
|---|---|
| 분류 | 일반의약품 |
| 그룹 | NUT-MULTI / a11jc-tablet-noA-noFe |
| 주요 성분군 | 비타민 B1·B2·B6·C·D·E + 아연 (비타민A·철 없음) |
| 사용 목적 | 육체피로·체력저하 시 비타민 보급, 신경통·근육통·구내염 완화 |
| 주의 대상 | 고칼슘혈증·신장질환·신장결석, 대두 과민 |
| 근거 상태 | strong |

**어떤 경우에 선택하나** — 육체피로·임신수유·병중병후 체력저하·발육기·노년기에 비타민 B군·C·D·E와 아연을 보급하고, 신경통·근육통·관절통, 구각염·구내염, 각기·눈의 피로 완화가 필요한 경우.
**복용 안내** — 만 8세 이상 및 성인 1일 1회 1정.
**주의 대상** — 과민증, 고칼슘혈증, 신장질환·신장결석, 대두유·콩·땅콩 과민, 만 12개월 미만 영아는 복용하지 않습니다. 통풍·혈전 소인·폴산 부족이면 상담합니다. (※ 이 조합에는 비타민A·철이 없어 임신 5,000IU·철분 중독 경고는 해당하지 않습니다.)
**성분 확인 포인트** — 비타민 B군 중심 + C·D·E·아연. 테트라사이클린계·제산제·레보도파와 함께 복용하지 않습니다.
**약사 상담 포인트** — 임신·수유, 신장질환, 통풍이면 상담합니다.
**성분 기준 선택** — 의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다. 같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다. 제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

### R2. A11JC/tab · `A-noFe` (비타민A 포함, 철 없음, 20/7) — 근거: 키즈부스터비타츄어블정

- R1과 동일 골격 + **비타민 A 포함**. **경고 추가**: "비타민 A를 1일 5,000 IU 이상 복용 시 선천성 기형 — 임신 3개월 이내·임신 가능성 여성 복용 금지." 소아 츄어블/아스파탐 함유 제품은 **페닐케톤뇨증 복용 금지** 문구 포함. 철분 경고는 제외.
- 사용 목적에 **눈의 건조감·야맹증 완화** 추가(비타민A). 용법은 제품별 상이(소아 포함) → 함량 확인.

### R3. A11JC/tab · `noA-Fe` (철 포함, 비타민A 없음, 10/2) — 근거: 액티나민플러스정 · **needs_pharmacist_review**

- R1 골격 + **철분 포함**. **경고 추가**: "만 6세 이하 어린이 과량 복용 시 철분 중독성 사망 — 손 닿지 않게 보관." **금기 추가**: 혈색소증·헤모시데린침착증·비철결핍성 빈혈. 탄닌(녹차·홍차)·우유는 철분 흡수 방해로 복용 전후 회피. 비타민A 경고는 제외.
- 철분 함유 → 민감 약효군, 약사 검토 강화.

### R4. A11JC/sc · `A-noFe` (비타민A 포함, 118/26) — 근거: 경남그린웰연질캡슐

- [2] baseline(마그랑비, A-/Fe-, use_existing)와 동일 골격 + **비타민 A 포함** → **비타민A 5,000IU 임신경고 추가**. 사용 목적에 눈 건조감·야맹증 완화 추가. 철 경고 없음.

### R5. A11EX/tab · `noA-noFe` (baseline, 188/31) — 근거: 비타콤보정

- 성분·주의는 **R1과 동일**(비타민 B1·B2·B6·C·D·E + 아연, 비타민A·철 없음). 기존 pilot 초안 [4](대표 모아헬드원정=A+/Fe+, 2건)를 이 baseline으로 **대체**. 용법: 만 12세 이상 1회 1~2정 1일 1회.

### R6. A11JB/tab · `noA-noFe` (baseline, 117/24) — 근거: 마이비젯정

- 비타민 D·E·B1·B2·B6·C + 아연 (비타민A·철 없음), 신경통·구내염·구루병 예방. 기존 pilot 초안 [5](엠디멀티비타=A-/Fe+)에서 **철분 문구 제거**해 baseline화. 용법: 만 12세 이상 1일 1회 1정.

### R7. A11JB/sc · `noA-noFe` (baseline, 76/18) — 근거: 미투-에스연질캡슐

- 비타민 E·B1·B2·B6 + **마그네슘 결핍 근육경련** + 말초혈행·수족냉증(비타민A·철 없음). 기존 pilot 초안 [8](쎌업=A+/Fe-)에서 **비타민A 경고 제거**해 baseline화. 용법: 만 12세 이상 1회 1캡슐 1일 2회.

### R8. A11GA01 VitC · `500mg` (6/2) — 근거: 기존 [16] 유한비타민씨정 draft delta

- 효능·주의 동일(괴혈병 예방·치료, 비타민C 보급, 모세관출혈·색소침착). **용법만 조정**: 1회 500mg 1일 1회 또는 분할. 고함량(1000mg급) 대비 신장결석·수산결석 장기복용 주의 강도 완화.

### R9. A11GA01 VitC · `~100mg` (6/2) — draft delta

- 동일 효능. 저함량 보급 용법(1일 100~수백mg). 고함량 장기 주의 문구 최소화. 나머지 금기(수산결석·통풍·G6PD)는 유지.

### R10. A12CC Mg · `940mg` (4/1) — 근거: 기존 [15] 마그네스정 draft delta

- 효능·주의 동일(마그네슘 결핍 근육경련, 비타민B6 보급). 염 중량 차이로 **용법 함량만 조정**(고함량 1정 기준). 신부전·순환기/신장 주의 유지.

### R11. A12CC Mg · `290mg` (3/1) — draft delta

- 동일 효능. 저함량 용법 조정. 주의 동일.

---

## 3. manual_review 판단 (5건)

| # | split_group_key | 원문 확인 | 판단(final_action) | 사유 |
|--:|---|---|---|---|
| MR1 | `a11ga01::200-300mg::tablet` (206mg, 1/1) | **e약은요 없음** | needs_pharmacist_review | grounding 부재 → AI 보강 금지(가이드 §3.8), 원문 확보 후 작성 |
| MR2 | `a12cc::5mg::tablet` (마이렉스정, 4/2) | Mg 결핍 근육경련(원문 확인) | **ready_for_apply** | 규격 첫토큰(5mg)은 파싱 이상이나 효능 명확(Mg 근육경련). Mg-단독 효능 초안 적용, B6 보급 문구는 제외 |
| MR3 | `a11ex::A-noFe::tablet` (임팩타민파워에이플러스, 4/1) | 비타민 A·D·B1·B2·B6+아연, A경고 有 | **ready_for_apply** | R5 baseline + 비타민A 5,000IU 임신경고 추가로 작성 가능 |
| MR4 | `a11ex::noA-Fe::tablet` (레모나씨플러스, 6/1) | 비타민 B1·B2·B6·C·E+철+아연, 철 경고 有 | needs_pharmacist_review | 철분 포함(민감 약효군) → 철분 중독 경고·혈색소증 금기 반영, 약사 검토 |
| MR5 | `a11jb::A-noFe::tablet` (오큐바이트프리저비전, 2/1) | 비타민 A·C·E+아연, **눈 건조/야맹증 중심(아이케어)** | needs_pharmacist_review | NUT-EYE 성격(눈영양) → 루테인 건기식 혼동 방지 필요, 별도 EYE 축에서 검토(선행 CLASSIFICATION의 NUT-EYE defer와 연결) |

---

## 4. use_existing_draft 안전문구 확인 (19건)

- 19건 전부 pilot 초안(PILOT-DRAFT §4) 작성 시 **GMP 하단 공통 문구 + `성분 기준 선택`** 포함 확인.
- 이 중 **철분·엽산 함유 6건은 `needs_pharmacist_review` 유지**(가이드 §3.9 민감 약효군):
  - `b03ae01::feFolVit::capsule`(철분+엽산), `b03bb01::1mg`, `b03bb01::0.4mg`(엽산), `a11jc::A-Fe::tablet`(비타민A+철), `a11jb::noA-Fe::tablet`(철), `a11ex::A-Fe::tablet`(비타민A+철).
- 나머지 13건은 `ready_for_apply`.

---

## 5. 산출물 — 최종 확정표 (WO 필수 표, 35행)

`final_action`: `ready_for_apply` / `needs_pharmacist_review` / `defer` / `exclude`
`draft_status`: `confirmed_existing`(기존 유지) / `written_revised`(보정 작성) / `pending_source`(원문 부재)

| split_group_key | previous_action | final_action | draft_status | reason |
|---|---|---|---|---|
| `drug_otc::single::oral::a11ha05::5mg::tablet` | use_existing | ready_for_apply | confirmed_existing | 비오틴 5mg 단일 |
| `drug_otc::single::oral::a11ga01::1000mg::tablet` | use_existing | ready_for_apply | confirmed_existing | 비타민C 1000mg급 |
| `drug_otc::single::oral::a11ga01::500mg::tablet` | revise_draft | ready_for_apply | written_revised | R8 용법 조정 |
| `drug_otc::single::oral::a11ga01::100mg::tablet` | revise_draft | ready_for_apply | written_revised | R9 저함량 |
| `drug_otc::single::oral::a11ga01::200-300mg::tablet` | manual_review | needs_pharmacist_review | pending_source | MR1 e약은요 없음 |
| `drug_otc::single::oral::a11ha03::100iu::soft_capsule` | use_existing | ready_for_apply | confirmed_existing | 비타민E 공유초안 |
| `drug_otc::single::oral::a11ha03::400iu::soft_capsule` | use_existing | ready_for_apply | confirmed_existing | 비타민E 공유초안 |
| `drug_otc::single::oral::a11ha03::1000iu::soft_capsule` | use_existing | ready_for_apply | confirmed_existing | 고용량 주의 포함 |
| `drug_otc::single::oral::a12cc::470mg::tablet` | use_existing | ready_for_apply | confirmed_existing | 마그네슘 다수 |
| `drug_otc::single::oral::a12cc::940mg::tablet` | revise_draft | ready_for_apply | written_revised | R10 용법 조정 |
| `drug_otc::single::oral::a12cc::290mg::tablet` | revise_draft | ready_for_apply | written_revised | R11 용법 조정 |
| `drug_otc::single::oral::a12cc::5mg::tablet` | manual_review | ready_for_apply | written_revised | MR2 Mg 근육경련 명확 |
| `drug_otc::single::oral::b03bb01::1mg::tablet` | use_existing | needs_pharmacist_review | confirmed_existing | 엽산·임신/빈혈 |
| `drug_otc::single::oral::b03bb01::0.4mg::tablet` | use_existing | needs_pharmacist_review | confirmed_existing | 엽산 예방용량 |
| `drug_otc::combo::oral::a12ax::caD::tablet` | use_existing | ready_for_apply | confirmed_existing | 칼슘+D 동질 |
| `drug_otc::combo::oral::a11ja::DEC::tablet` | use_existing | ready_for_apply | confirmed_existing | D·E·C 동질 |
| `drug_otc::combo::oral::b03ae01::feFolVit::capsule` | use_existing | needs_pharmacist_review | confirmed_existing | 철분+엽산 |
| `drug_otc::combo::oral::a11db::Bcomplex::tablet` | use_existing | ready_for_apply | confirmed_existing | B군 동질 |
| `drug_otc::combo::oral::a11eb::B1B2B6C::tablet` | use_existing | ready_for_apply | confirmed_existing | B1B2B6C 동질 |
| `drug_otc::combo::oral::a11jb::mgB::liquid` | use_existing | ready_for_apply | confirmed_existing | 마그네슘 액 동질 |
| `drug_otc::combo::oral::a11jc::noA-noFe::tablet` | revise_draft | ready_for_apply | written_revised | R1 baseline |
| `drug_otc::combo::oral::a11jc::A-noFe::tablet` | revise_draft | ready_for_apply | written_revised | R2 비타민A 경고 |
| `drug_otc::combo::oral::a11jc::A-Fe::tablet` | use_existing | needs_pharmacist_review | confirmed_existing | 비타민A+철 |
| `drug_otc::combo::oral::a11jc::noA-Fe::tablet` | revise_draft | needs_pharmacist_review | written_revised | R3 철분 포함 |
| `drug_otc::combo::oral::a11jc::noA-noFe::soft_capsule` | use_existing | ready_for_apply | confirmed_existing | baseline=대표 |
| `drug_otc::combo::oral::a11jc::A-noFe::soft_capsule` | revise_draft | ready_for_apply | written_revised | R4 비타민A 경고 |
| `drug_otc::combo::oral::a11ex::noA-noFe::tablet` | revise_draft | ready_for_apply | written_revised | R5 baseline |
| `drug_otc::combo::oral::a11ex::A-Fe::tablet` | use_existing | needs_pharmacist_review | confirmed_existing | 비타민A+철 |
| `drug_otc::combo::oral::a11ex::A-noFe::tablet` | manual_review | ready_for_apply | written_revised | MR3 A경고 추가 |
| `drug_otc::combo::oral::a11ex::noA-Fe::tablet` | manual_review | needs_pharmacist_review | written_revised | MR4 철분 |
| `drug_otc::combo::oral::a11jb::noA-noFe::tablet` | revise_draft | ready_for_apply | written_revised | R6 baseline |
| `drug_otc::combo::oral::a11jb::noA-Fe::tablet` | use_existing | needs_pharmacist_review | confirmed_existing | 철분 |
| `drug_otc::combo::oral::a11jb::A-noFe::tablet` | manual_review | needs_pharmacist_review | written_revised | MR5 눈영양(건기식 혼동) |
| `drug_otc::combo::oral::a11jb::noA-noFe::soft_capsule` | revise_draft | ready_for_apply | written_revised | R7 baseline |
| `drug_otc::combo::oral::a11jb::A-noFe::soft_capsule` | use_existing | ready_for_apply | confirmed_existing | 비타민A 경고 포함 대표 |

---

## 6. 집계

| final_action | 수 | 비고 |
|---|--:|---|
| `ready_for_apply` | 25 | 즉시 적용 후보(초안 확정) |
| `needs_pharmacist_review` | 10 | 철분·엽산·비타민A+철·눈영양·원문부재 |
| `defer` | 0 | — |
| `exclude` | 0 | — |
| **합계** | **35** | |

| draft_status | 수 |
|---|--:|
| `confirmed_existing` | 19 |
| `written_revised` | 15 |
| `pending_source` | 1 |

> `written_revised 15` = revise_draft 11 + manual_review 중 초안 작성 4(MR2·MR3·MR4·MR5). MR1은 `pending_source`.

---

## 7. 금지사항 준수 확인

| 항목 | 상태 |
|---|---|
| DB write | ✅ 0 (SELECT + 세션 TEMP만) |
| product_candidate_description_drafts insert/update | ✅ 없음 |
| shared_product_descriptions 변경 | ✅ 없음 |
| canonical 승격 | ✅ 없음 |
| registry 직접 수정 | ✅ 없음 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 없음 |

---

## 8. 다음 단계 제안

1. **ready_for_apply 25건**: 승인 시 `product_candidate_description_drafts` 경유 draft 반영(별도 WO·승인 필요).
2. **needs_pharmacist_review 10건**: 철분/엽산/비타민A+철 경고문 약사 검수, MR1(206mg) 원문 확보, MR5(눈영양) NUT-EYE 축 이관.
3. **성분 세트 정밀 파싱**: A/Fe 축 하위에서 정확한 비타민 세트(주성분코드) 확정.
4. **registry 반영 제안**: 35 split_group_key + final_action 을 `BATCH-ORAL-NUTRITION` 하위로 등재(직접 수정은 별도 승인).

---

## 부록. grounding 재확인 대표 (조합별)

| 하위군 | 대표 ProductMaster | 조합 확인 |
|---|---|---|
| A11JC/tab noA-noFe | 메가벤포큐정 | B1·B2·B6·C·D·E+아연, A·철 없음 |
| A11JC/tab A-noFe | 키즈부스터비타츄어블정 | 비타민A 有, 아스파탐 |
| A11JC/tab noA-Fe | 액티나민플러스정 | 철 有(철분 중독 경고) |
| A11JC/sc A-noFe | 경남그린웰연질캡슐 | 비타민A 有 |
| A11EX/tab noA-noFe | 비타콤보정 | B군·C·D·E+아연 |
| A11JB/tab noA-noFe | 마이비젯정 | D·E·B군·C+아연 |
| A11JB/sc noA-noFe | 미투-에스연질캡슐 | E·B군+마그네슘 근육경련 |
| A11EX/tab A-noFe (MR3) | 임팩타민파워에이플러스정 | 비타민A 有 |
| A11EX/tab noA-Fe (MR4) | 레모나씨플러스정 | 철 有 |
| A11JB/tab A-noFe (MR5) | 오큐바이트프리저비전정 | 비타민A+눈영양 |
| A12CC 5mg (MR2) | 마이렉스정 | Mg 근육경련(B6 없음) |

*세션 스크래치패드 `r1_ground.sql` 실행. 영속 테이블 무변경(DB write 0).*
