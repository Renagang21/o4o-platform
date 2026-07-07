# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-REVIEW-CANONICAL-PREP-V1

- WO: WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-REVIEW-CANONICAL-PREP-V1
- 일자: 2026-07-07
- 대상 테이블: `product_candidate_description_drafts`
- 필터: `seed_json->>'applyRunId' = 'otc-nutrition-combo-draft-v1'` AND `review_status = 'needs_review'`
- 총 건수: **23**
- DB write: **0** (read-only SELECT만 수행. content_json / review_status / seed_json / shared_product_descriptions / ProductMaster / ProductIdentifier 무변경. canonical 승격·매장 연결 없음)

> 본 문서는 **검수 결과 기록**이며, canonical 승격은 별도 WO로만 진행한다. 아래 어떤 판정도 DB 상태를 변경하지 않았다.

---

## 1. 판정 요약

| 판정 | 수량 | 의미 |
|------|:---:|------|
| `pass` | **20** | 원문 근거·문체 기준 모두 적합 → canonical 승격 후보 |
| `revise_required` | **2** | 문구/그룹 메타 수정 후 재검수 필요 |
| `hold` | **1** | 그룹 범위 불명확 → 약사 판단·서브그룹 확정 필요 |
| 합계 | 23 | |

**교차 점검 결과**
- **광고성·보장성 표현: 0건.** 전 23건이 MFDS 「효능·효과」 문체("…에 사용합니다", "…예방에 사용합니다", "…보급")만 사용. "최고/가장 효과적/보장/빠른 효과" 등 과장 표현 없음.
- **GMP/성분·함량 안내 문구:** 23건 전부 동일 boilerplate("의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다 … 제품명보다 성분·함량을 기준으로 약사에게 확인하세요.") 사용. 중립·적합.
- **grounding source:** 23건 전부 `mfds_easy_drug` (e약은요). 성분군별 표준 효능·주의 문구와 대체로 정합.
- **함량축/투여경로축 분리:** A12CC 마그네슘·B6(290/470/940mg급), A11HA03 비타민 E(100/400/1000 IU) 강도 밴드 분리 정상 적용. 가이드 §3.5 함량축 기준 부합.

---

## 2. 전수 검수 결과 (23건)

| # | title | atc7 | 제형 | spd/otc | flags | 판정 | 핵심 사유 |
|:-:|-------|------|------|:-------:|-------|:----:|-----------|
| 1 | 마그네슘 정제 — 근육경련 | A12CC | tablet | 3/4 | `mg_only` `spec_anomaly` | **revise_required** | strengthToken `5mg` 이상치(마그네슘 단일정 함량으로 비현실적, spec=매수 아티팩트 소지). 본문엔 미노출이나 그룹키 강도밴드 오정합 위험 → 강도토큰 확인 후 승격 |
| 2 | 비오틴 5mg 정제 — 손발톱·모발 | A11HA05 | tablet | 28/30 | `spd_grounded` | **pass** | 용법·금기(날계란 avidin, 항경련제) 적합, 함량 실재 |
| 3 | 종합비타민 정제 — A·B군·C·D·E (철없음) | A11JC | tablet | 20/20 | `vitaminA_warning` | **pass** | 비타민A 임신 5,000IU 금기·아스파탐 PKU 경고 포함, 근거 정합 |
| 4 | 종합비타민 연질캡슐 — A·B군·C·E (철없음) | A11JC | soft_capsule | 118/118 | `vitaminA_warning` | **pass** | 대두 과민·비타민A 경고 적합 |
| 5 | 종합비타민 정제 — A·D·B군 (철없음) | A11EX | tablet | 4/4 | `vitaminA_warning` | **pass** | 비타민A·D 관련 금기 정합 |
| 6 | 종합비타민 연질캡슐 — A·E·B군·C (철없음) | A11JB | soft_capsule | 29/29 | `vitaminA_warning` | **pass** | 대두 과민·비타민A 경고 적합 |
| 7 | 비타민 B1·B2·B6·C 복합 정제 | A11EB | tablet | 49/95 | `mouth_related` | **pass** | 레보도파-B6 상호작용·황색5호 주의 정합 |
| 8 | 마그네슘·비타민 B2·B6 액제 | A11JB | liquid | 77/101 | `spd_grounded` | **pass** | 액제 용법(20mL) 명시, 병용금기 정합 |
| 9 | 마그네슘·비타민 B6 정제 290mg급 | A12CC | tablet | 3/3 | `spd_grounded` | **pass** | 용법 일반문("허가된 용법·용량") 다소 포괄적이나 근거 적합 |
| 10 | 마그네슘·비타민 B6 정제 470mg급 | A12CC | tablet | 5/21 | `spd_grounded` | **pass** | 용법 구체·근거 정합 |
| 11 | 마그네슘·비타민 B6 정제 940mg급 | A12CC | tablet | 4/4 | `spd_grounded` | **pass** | 고함량 확인 안내 포함, 적합 |
| 12 | 비타민 B군 복합 정제 (B1·B2·B6 중심) | A11DB | tablet | 58/102 | `subgroup_pending` | **hold** | 서브그룹 미확정 + 효능문에 D(구루병 예방)·아연 등 B-복합 범위 초과 서술 혼재. B12/활성형(벤포티아민·메코발라민) 포함 여부 본문서 "제품 확인" 유보 → 그룹 범위 확정 후 재작성 필요 |
| 13 | 종합비타민 정제 — B군·C·D·E + 아연 (A·철 없음) | A11JC | tablet | 407/709 | `baseline_noA_noFe` | **pass** | noA-noFe 경고 배제 명시, 대표 baseline. **단 #14와 제목 완전 동일(§3 참조)** |
| 14 | 종합비타민 정제 — B군·C·D·E + 아연 (A·철 없음) | A11EX | tablet | 188/353 | `baseline_noA_noFe` | **revise_required** | 제목·성분군·제형이 #13과 완전 동일(atc7만 A11EX vs A11JC 상이) → 목록 식별 불가. 제목 구분 문구 추가 또는 #13과 병합 판단 필요 |
| 15 | 비타민 C 1000mg 정제 | A11GA01 | tablet | 11/31 | `high_dose` | **pass** | G6PD·수산결석·통풍 금기, 복용 후 자세 안내 적합 |
| 16 | 칼슘·비타민 D 정제 | A12AX | tablet | 302/598 | `spd_grounded` | **pass** | 강심배당체-칼슘 상호작용·고칼슘혈증 금기 정합 |
| 17 | 종합비타민·미네랄 정제 — D·E·B군·C + 아연 (A·철 없음) | A11JB | tablet | 117/320 | `baseline_noA_noFe` | **pass** | noA-noFe 명시, 근거 정합 |
| 18 | 비타민 D·E·C 복합 정제 | A11JA | tablet | 160/259 | `spd_grounded` | **pass** | 대두 과민·에스트로겐(E-혈전) 주의 정합 |
| 19 | 비타민 E 1000 IU 연질캡슐 | A11HA03 | soft_capsule | 14/20 | `high_dose` | **pass** | 수유부 금기·항응고제 상담·고용량 안내 적합 |
| 20 | 비타민 E 100 IU 연질캡슐 | A11HA03 | soft_capsule | 5/8 | `spd_grounded` | **pass** | 강도밴드 분리 정상, 근거 정합 |
| 21 | 비타민 E 400 IU 연질캡슐 | A11HA03 | soft_capsule | 2/9 | `spd_grounded` | **pass** | grounding 표본 얇음(spd 2)이나 형제 밴드(19/20)와 문구 동형·class 표준. 승격 후 노출 우선순위 낮게 권고 |
| 22 | 종합비타민 연질캡슐 — E·B군 + 마그네슘 (A·철 없음) | A11JB | soft_capsule | 76/240 | `baseline_noA_noFe` | **pass** | Mg 근육경련 + E/B 근거 정합 |
| 23 | 종합비타민·미네랄 연질캡슐 — E·B군 + 마그네슘·아연 (A·철 없음) | A11JC | soft_capsule | 277/769 | `baseline_noA_noFe` | **pass** | E-피임약(혈전) 주의 명시, 근거 정합 |

---

## 3. `revise_required` / `hold` 상세

### #1 마그네슘 정제 — 근육경련 · `revise_required`
- **문제:** `groupKey = drug_otc::single::oral::a12cc::5mg::tablet`, `strengthToken = "5mg"`. 마그네슘 단일정의 함량으로 5mg은 비현실적이며 `spec_anomaly` 플래그와 일치. 프로젝트 기준상 spec 필드는 함량이 아니라 매수(pack count)일 수 있어 강도토큰이 아티팩트일 가능성.
- **영향 범위:** 5mg은 본문(효능/용법/주의/summary)에 **노출되지 않음** → 매장 표시 문구 자체는 무해. 다만 강도밴드 그룹키가 부정확하면 후속 canonical 병합 시 무관 제품이 섞일 위험.
- **필요 조치:** 강도토큰 재확인/보정 후 승격. content_json 본문은 수정 불필요.
- **금지 준수:** 본 WO에서 수정 미수행(DB write 0).

### #14 종합비타민 정제 — B군·C·D·E + 아연 (A·철 없음) · `revise_required`
- **문제:** `title` / `ingredient`("비타민 B군·C·D·E + 아연") / `doseForm`(tablet) / `summary` 가 **#13과 완전 동일**. 유일 차이는 `atc7`(A11EX vs A11JC)로, 소비자·매장 관점에서 식별 불가능한 축.
- **영향 범위:** admin 목록에서 동일 제목 2행 → 큐레이션 혼선. canonical 승격 시 중복 대표문서 위험.
- **필요 조치(택1):** (a) 제목에 식별 접미 추가(예: 조성 범위·대표품목 근거 명시), 또는 (b) #13과 병합 여부를 그룹 정의 기준으로 판단. #13(spd 407)이 대표성 우위이므로 병합 시 #13 존치 권고.
- **참고:** #13은 pass로 두되, 승격 실행 WO에서 #14 처리(구분 or 병합)가 확정될 때까지 **쌍(pair)으로 함께 검토**할 것.

### #12 비타민 B군 복합 정제 (B1·B2·B6 중심) · `hold`
- **문제 1 (그룹 범위 불명확):** `subgroup_pending` 플래그. 본문이 "B12·활성형(벤포티아민·메코발라민) 포함 여부는 제품 성분을 확인하세요"로 그룹 내 이질성을 유보. 단일 대표문서로 확정하기엔 서브그룹(활성형 vs 일반형) 미분리.
- **문제 2 (효능 범위 초과 서술):** 제목은 "B1·B2·B6 중심"이나 efficacy는 "비타민 D·E·B1·B2·C 보급, **구루병 예방**(비타민 D), 아연 보급"까지 포함 → A11DB(B-복합) 프레임과 서술 범위가 어긋남. grounding 정합성 재검토 필요.
- **필요 조치:** 서브그룹(활성형/일반형) 확정 및 효능문을 실제 그룹 조성에 맞게 축소·재작성한 뒤 재검수. 현 상태로 canonical 승격 부적합.

---

## 4. 관찰 사항 (비차단 — 판정 미영향)

- **제목의 아연 생략(‑cosmetic):** #3·#4 등 일부 종합비타민 draft는 title에 "아연" 미표기이나 ingredient/efficacy엔 "+아연"·"아연 보급" 존재. 오인 소지는 낮아 pass 유지하되, 승격 시 title 표기 일관화(아연 포함 여부 노출) 검토 권고.
- **용법 포괄문:** #9·#11 등 강도밴드가 좁은 소그룹은 "허가된 용법·용량에 따라 복용합니다" 일반문 사용. 오류는 아니나 대표품목 기준 구체 용법으로 상향하면 매장 활용도 개선.
- **얇은 grounding:** #21(spd 2)은 표본이 얇음. class 표준 문구와 동형이라 pass하되, 노출 우선순위·대표성은 형제 밴드(#19·#20) 하위로.

---

## 5. canonical 승격 후보 목록 (`pass` 20건)

> 아래는 **후보 목록**이며 승격은 별도 WO로만 진행한다. (candidate_id 기준)

| # | title | candidate_id |
|:-:|-------|--------------|
| 2 | 비오틴 5mg 정제 — 손발톱·모발 | `79a515f0-fb13-4b58-a01b-3f1b524c29f0` |
| 3 | 종합비타민 정제 — A·B군·C·D·E (철없음) | `fcf616ee-339e-489f-9672-a431489fb1ac` |
| 4 | 종합비타민 연질캡슐 — A·B군·C·E (철없음) | `270a10a2-70a3-4a04-a370-9b5316c4a0b4` |
| 5 | 종합비타민 정제 — A·D·B군 (철없음) | `1121423d-e606-4671-ac08-c4baf7464439` |
| 6 | 종합비타민 연질캡슐 — A·E·B군·C (철없음) | `5a342fe9-1cdf-49c1-863d-84654d433720` |
| 7 | 비타민 B1·B2·B6·C 복합 정제 | `db7c085e-d233-499c-bb99-56f2e9efcd58` |
| 8 | 마그네슘·비타민 B2·B6 액제 | `41fc4904-171e-43c2-b923-1a120c1c12de` |
| 9 | 마그네슘·비타민 B6 정제 290mg급 | `738fce8e-2eeb-4a9c-901f-88e0b783209d` |
| 10 | 마그네슘·비타민 B6 정제 470mg급 | `91d2a67d-669c-418d-840a-e065e311acc1` |
| 11 | 마그네슘·비타민 B6 정제 940mg급 | `8b8ad3b4-eb43-4d52-b284-eac2a7de194e` |
| 13 | 종합비타민 정제 — B군·C·D·E + 아연 (A·철 없음) | `26c2af33-f6ba-4a09-a686-da8c98137aff` |
| 15 | 비타민 C 1000mg 정제 | `6f143bbc-ff49-4ffc-9271-42e50cf2e84d` |
| 16 | 칼슘·비타민 D 정제 | `2bb82579-3b25-402f-81b8-1a6c6280bc2c` |
| 17 | 종합비타민·미네랄 정제 — D·E·B군·C + 아연 (A·철 없음) | `b21c54a6-e248-477f-bc23-f5f1a6701587` |
| 18 | 비타민 D·E·C 복합 정제 | `b96f3977-94ff-4deb-bc0a-10f2945cc92c` |
| 19 | 비타민 E 1000 IU 연질캡슐 | `6343c0f5-cfe9-434b-925a-d42ae1cc86d8` |
| 20 | 비타민 E 100 IU 연질캡슐 | `cda011db-9d62-4b58-aa56-d5a03bcafa83` |
| 21 | 비타민 E 400 IU 연질캡슐 | `03751234-7793-4635-8043-26257b32a3fd` |
| 22 | 종합비타민 연질캡슐 — E·B군 + 마그네슘 (A·철 없음) | `029b8650-257b-47bb-ae3e-a42444c39d93` |
| 23 | 종합비타민·미네랄 연질캡슐 — E·B군 + 마그네슘·아연 (A·철 없음) | `d29b1340-498e-4128-b6e1-b667e0135035` |

> 주의: #13은 pass이나 #14(revise_required)와 제목 충돌 쌍이다. 승격 실행 WO에서 #14 처리 확정 전까지 #13 단독 승격 시 중복 표시 리스크를 고려할 것.

---

## 6. 완료 기준 확인

- [x] 23건 전수 검수 결과 문서화
- [x] pass/revise_required/hold 수량 산출 (20 / 2 / 1)
- [x] canonical 승격 후보 목록 작성 (20건, candidate_id 포함)
- [x] 수정 필요 문구와 사유 정리 (#1 강도토큰, #14 제목충돌, #12 그룹범위)
- [x] DB write 0 확인 (read-only SELECT만)

## 7. 다음 단계

1. `pass` 20건 → 별도 WO로 canonical 승격. (#13은 #14 처리 확정과 연동)
2. `revise_required` 2건(#1, #14) → 강도토큰 보정 / 제목 구분·병합 판단 후 재검수.
3. `hold` 1건(#12) → 서브그룹(활성형/일반형) 확정 + 효능문 범위 재작성 후 재검수.
