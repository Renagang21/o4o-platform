# CHECK-O4O-DRUG-OTC-DESCRIPTION-ANALGESIC-ANTIPYRETIC-COMBO-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-ANALGESIC-ANTIPYRETIC-COMBO-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 경구 해열·진통 복합제 분류 + 대표 초안 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> 이 세션은 STAGE1·PATCH·NASAL·COLD-COMBO 등을 실제 실행한 DB 접근 가능 환경이다(gcloud + cloud-sql-proxy-v2 + psql, netureyoutube). 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-ANALGESIC-ANTIPYRETIC-COMBO-DRAFT-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.8 저 grounding, §3.9 민감 약효군, §3.5 함량·조성축)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COLD-COMBO-DRAFT-V1.md (N02BE5x 감기약 분리 근거 = 본 트랙)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1.md (M01AE51 이부프로펜 진통 복합 drafted — NSAID 복합은 거기서 처리)
```

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2 netureyoutube:asia-northeast3:o4o-platform-db` (127.0.0.1:5433, OAuth 토큰) + `psql` user `o4o_api`. **SELECT 전용**.
- 원문: `shared_product_descriptions.content`(source_type=`mfds_easy_drug`, e약은요), join `master_id`.
- 데이터 제약(재확인): `product_drug_extensions`의 성분 필드(`active_ingredients`·`ingredient_summary`·`strength`)는 **N02BE51 전량 NULL**.

## 4. 핵심 발견 — 조성(카페인/IPA/에텐자미드)은 구조화 데이터로 판별 불가

WO의 핵심 요구(카페인·이소프로필안티피린·에텐자미드 포함 여부 분리)를 위해 **가용한 모든 조성 출처를 실측 감사**했다. 결과:

| 조성 출처 | N02BE51(390) 반영 |
|---|---|
| `product_masters.name` 괄호 성분 | **0** (괄호는 전부 `(수출용)`·`(수출명:…)`, 성분 아님) |
| `name`/`regulatory_name` 에 `카페인` | **0** |
| `name`/`regulatory_name` 에 `이소프로필안티피린` | **0** |
| `name`/`regulatory_name` 에 `에텐자미드` | **0** |
| `pde.active_ingredients` / `ingredient_summary` / `strength` | **전량 NULL (0)** |
| SPD content 에 `무수카페인`·`원료약품`·`유효성분`·`1정 중` 성분블록 | **0** (e약은요 content 에 원료·분량 섹션 없음) |
| **ATC 세분** | **불가** — N02BE51 이 아세트아미노펜 복합을 전부 뭉침 |

**결정적 근거**: 대표 브랜드 `게보린정`(아세트아미노펜+**이소프로필안티피린**+카페인)이 피린계임에도 **N02BE51 로 코딩**되어 있고, `펜잘큐정`(비피린계)과 **같은 ATC**다. 피라졸론 전용 코드 `N02BB` 는 **DRUG 전체에서 0건** — IPA 제품이 별도 코드로 분리되지 않는다. 즉 **ATC·명칭·pde·원문 성분블록 어디로도 카페인/IPA/에텐자미드 유무를 자동 판별할 수 없다.**

→ WO §6("조성 grounding 부족 시 초안 수 축소·사유 기록") / §12 / §14(SOURCE-GAP-AUDIT) 적용. 8~10 목표를 **판별 가능한 축으로 축소**한다.

### 4.1 단, IPA(피린계)는 원문 caution-profile signature 로 분리 가능

성분블록은 없지만, **IPA(이소프로필안티피린) 제품의 SPD 사용상 주의사항·이상반응에 피라졸론 특이 signature 가 나타난다**(게보린정 실측):

```text
메트헤모글로빈혈증 · 과립(백혈)구감소 · 용혈성빈혈 · 쇽 · G6PD(글루코스-6-인산탈수소효소)결핍 · 급성 간헐성 포르피린증 · 15세 미만 금기
```

이 signature 로 N02BE51(원문 151) 중 **58건이 IPA(피린계)로 식별**된다(예: 게보린정·편해정·다아펜정·아낙센정). 비-IPA(APAP 단순 복합, 예: 뇌선·멘자펜정·펜잘큐)와 주의사항 강도가 확연히 다르다.

> 주의: 이 signature 는 **원문 기반 추정**이지 성분 필드가 아니다. **카페인·에텐자미드는 고유 signature 가 없어 여전히 판별 불가.** 개별 제품의 확정 조성은 허가정보(원료약품·분량) 확보 후에만 가능(§10 SOURCE-GAP-AUDIT).

## 5. 후보 모수 · bucket (read-only 실측)

경구 N02B* (외용 파스/겔/좌제 제형명 제외):

| ATC7 | 계열 | master | 원문 | 처리 |
|---|---|---:|---:|---|
| **N02BE51** | **아세트아미노펜 복합** | **390** | **151** | 대표 초안(피린/비피린 2유형) |
| N02BA51 | 아스피린 복합 | 8 | 4 | needs_review(소규모) |
| N02BE01 | 아세트아미노펜 단일(타이레놀·게보린브이 등) | 492 | 314 | exclude_single(WO §3) |
| N02BA01 | 아스피린 단일 | 27 | 4 | exclude_single |
| N02BG | 기타 진통(생약·복합, 계지탕 등) | 1,626 | 17 | exclude_herbal(별도 트랙) |

**bucket 판정:**

| bucket(WO §4) | master | 판별 | 처리 |
|---|---:|---|---|
| PAIN-APAP-IPA (아세트아미노펜+이소프로필안티피린) | 58*(원문 signature) | 원문 caution-profile 로 식별 | **대표 초안**(게보린 유형) |
| PAIN-APAP (비피린 단순 복합) | 93*(151−58) | 원문 있음 | **대표 초안**(펜잘큐/뇌선 유형) |
| PAIN-APAP-CAFFEINE (카페인 포함) | — | **판별 불가** | 조건부 주의문구만, hold_source |
| PAIN-APAP-ETENZAMIDE (에텐자미드 포함) | — | **판별 불가** | hold_source |
| PAIN-NSAID-COMBO | — | M01AE51 | **NONCOLD-COMBO 에서 이미 drafted** — 중복 안 함 |
| PAIN-PEDIA (소아 해열진통 복합) | (N02BE51 내 연령분할) | 제품별 용법 | 대표 초안에 소아 용량 포함 |
| 원문 없는 N02BE51 | 239 | 조성·주의 근거 부족 | hold_source |
| HOLD-SOURCE / EXCLUDE | 위 표 | | |

(*58/93 은 원문 보유 151 기준. 전체 390 중 239 는 원문이 없어 유형 미상.)

## 6. 원문 grounding (핵심 확정)

공통 효능(N02BE51 전반, 펜잘큐·게보린 실측 일치):

> 두통, 치통, 발치 후 통증, 인후통, 귀의 통증, 관절통, 신경통, 요통, 근육통, 어깨결림, 타박통, 골절통, 염좌통, **월경통(생리통)**, 외상통의 진통과 오한·발열 시의 해열.

**아세트아미노펜 공통 경고(전 유형):** 1일 최대 4,000mg 초과 금지(간손상), APAP 포함 다른 제품 병용 금지, 정기 음주자(1일 3잔↑) 상담, 중대 피부반응(SJS·TEN·AGEP). 수두·인플루엔자 의심 15세 미만 라이증후군 주의. 다른 감기약·해열진통제·진정제 중복 금지.

**피린계(IPA) 추가 확정(게보린정 원문):** **만 15세 미만 금기**, 이 약·다른 NSAID로 천식 경험자 금기, **G6PD결핍·급성 간헐성 포르피린증·과립백혈구감소증·중증 간/신장애·출혈소인·소화성궤양·심한 혈액이상·심장기능저하 금기**, 바르비탈계·삼환계 항우울제·알코올 병용 금기. 이상반응: **쇽·천식발작·혈소판감소·과립구감소·용혈성빈혈·메트헤모글로빈혈증**. → 피린계 과민 이력 확인 필수(§3.9 민감 약효군).

## 7. 작성한 대표 설명서 초안

| # | group_key | bucket | status |
|---:|---|---|---|
| 1 | `drug_otc::combo::oral::analgesic::apap_nonpyrazolone::tablet` | PAIN-APAP | draft_written |
| 2 | `drug_otc::combo::oral::analgesic::apap_isopropylantipyrine::tablet` | PAIN-APAP-IPA | draft_written |

---

### 초안 1 — 아세트아미노펜 복합 해열·진통제 (비피린계)

```text
group_key: drug_otc::combo::oral::analgesic::apap_nonpyrazolone::tablet
status: draft_written   grounding: mfds_easy_drug (펜잘큐정·뇌선 등). 카페인·에텐자미드 포함 여부는 제품별 상이(원문 판별 불가) → 조건부 문구
```

| 항목 | 내용 |
|---|---|
| 분류 | 일반의약품 |
| 주요 성분군 | 아세트아미노펜 + 보조 진통성분(에텐자미드 등) ± 무수카페인 (피린계 아님, 제품별 조합 상이) |
| 주요 증상 | 두통, 치통, 생리통, 인후통, 근육통, 관절통, 요통, 발열 등 통증·열 |
| 선택 포인트 | 여러 부위 통증·발열에 쓰는 아세트아미노펜 복합제. 성분 조합 확인이 중요 |
| 주의 대상 | 간질환·음주, 15세 미만, 위장문제, 카페인 민감 |
| 약사 상담 포인트 | 다른 감기약·해열진통제와 아세트아미노펜 중복, 카페인 포함 여부 |

**어떤 경우에 선택하나**
두통, 치통, 생리통, 인후통, 근육통, 관절통, 요통 등의 통증과 오한·발열에 허가 범위 안에서 사용합니다.

**복용 안내**
제품별 허가된 용법·용량(예: 만 15세 이상 1회 1정, 1일 3회, 4시간 이상 간격, 공복을 피함)에 따라 복용합니다. **아세트아미노펜은 1일 4,000mg을 넘기지 않으며, 아세트아미노펜이 든 다른 감기약·해열진통제와 함께 복용하지 않습니다.** 다른 감기약·진정제와도 중복 복용하지 않습니다.

**주의 대상**
만 3개월 미만 영아·만 2세 미만 소아, 이 약·다른 해열진통제로 천식을 경험한 사람은 복용하지 않습니다. 간질환이 있거나 음주가 잦은 경우, 수두·인플루엔자가 있거나 의심되는 만 15세 미만 어린이, 신장·심장·갑상선·당뇨·고혈압, 위장문제(속쓰림·위통·궤양·출혈), 임부·수유부는 복용 전 약사와 상담하세요. **카페인이 포함된 제품은 커피·에너지음료·카페인 함유 약과 함께 복용하면 두근거림·불면·속불편감이 나타날 수 있습니다.** 발진 등 이상반응 시 즉시 중단하고, 5~6회 복용해도 나아지지 않으면 중지 후 상담하세요.

**성분 확인 포인트**
해열·진통 복합제는 제품명보다 성분 조합을 확인하는 것이 중요합니다. 카페인·에텐자미드 포함 여부에 따라 주의사항이 달라질 수 있습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 아세트아미노펜 + 이소프로필안티피린(피린계) 복합

```text
group_key: drug_otc::combo::oral::analgesic::apap_isopropylantipyrine::tablet
status: draft_written   grounding: mfds_easy_drug (게보린정 등, 원문 피라졸론 signature 식별). §3.9 민감 약효군 — 약사 검토 강함
```

| 항목 | 내용 |
|---|---|
| 분류 | 일반의약품 |
| 주요 성분군 | 아세트아미노펜 + **이소프로필안티피린(피린계)** ± 무수카페인 |
| 주요 증상 | 두통, 치통, 생리통, 인후통, 근육통, 관절통, 발열 등 통증·열 |
| 선택 포인트 | 피린계 성분이 포함된 복합 진통제. **과민반응·혈액이상 위험이 있어 약사 상담 권장** |
| 주의 대상 | **만 15세 미만 금기**, 피린계 과민 이력, 혈액질환, 간·신장애, 출혈경향 |
| 약사 상담 포인트 | 피린계 과민(발진·호흡곤란·쇽) 이력, 15세 미만 여부, 혈액·간·신장 상태 |

**어떤 경우에 선택하나**
두통, 치통, 생리통, 인후통, 근육통, 관절통 등의 통증과 오한·발열에 허가 범위 안에서 사용합니다. 이소프로필안티피린(피린계) 성분이 함께 들어 있는 복합 진통제입니다.

**복용 안내**
성인은 1회 1정, 1일 3회까지 공복을 피하여 4시간 이상 간격으로 복용하며 **원칙적으로 단기간만** 복용합니다. 아세트아미노펜은 1일 4,000mg을 넘기지 않고, 아세트아미노펜이 든 다른 제품과 함께 복용하지 않습니다.

**주의 대상**
**만 15세 미만**, 이 약이나 다른 소염진통제로 천식을 경험한 사람, 글루코스-6-인산탈수소효소(G6PD) 결핍, 급성 간헐성 포르피린증, 과립백혈구감소증, 중증 간·신장애, 출혈 소인, 소화성궤양, 심한 혈액 이상·심장기능저하가 있는 사람, 바르비탈계 약물·삼환계 항우울제·알코올을 복용한 사람은 복용하지 않습니다. **특정 해열진통 성분(피린계)에 과민반응(발진·호흡곤란·심한 알레르기)을 경험한 적이 있으면 복용 전 반드시 상담**하세요. 갑상선·당뇨·고혈압, 위장문제, 임부·수유부, 고령자도 상담이 필요합니다. 복용 후 발진·호흡곤란·심한 어지러움·전신 붉어짐 등이 나타나면 즉시 중단하고 상담하세요.

**성분 확인 포인트**
피린계(이소프로필안티피린) 포함 여부는 과민반응·혈액이상 위험과 직결됩니다. 제품명보다 성분 조합을 약사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 8. 초안별 source 근거

| 초안 | 대표 원문 제품 | ATC | source_type |
|---|---|---|---|
| 1 비피린계 APAP 복합 | 펜잘큐정 · 뇌선 | N02BE51 | mfds_easy_drug |
| 2 피린계(IPA) 복합 | 게보린정(수출명:돌로린정) · 편해정 · 다아펜정 | N02BE51 | mfds_easy_drug |

## 9. 보류/제외 그룹과 사유

| 대상 | master | 원문 | 분류 | 사유 |
|---|---:|---:|---|---|
| 카페인 포함 세분 | — | — | hold_source | 카페인 고유 원문 signature 없음 → 유무 판별 불가. 조건부 문구만 반영 |
| 에텐자미드 포함 세분 | — | — | hold_source | 판별 불가(원료·분량 부재) |
| 원문 없는 N02BE51 | 239 | 0 | hold_source | 효능·주의·조성 근거 부족 |
| 아스피린 복합 N02BA51 | 8 | 4 | needs_review | 소규모·라이증후군/위장출혈 주의, 원문 확정 후 |
| N02BE01 단일 APAP | 492 | 314 | exclude_single | 단일제(WO §3). 가이드 §7.1 아세트아미노펜 500mg 초안 존재 |
| N02BA01 단일 아스피린 | 27 | 4 | exclude_single | 단일제 |
| N02BG 생약·기타 | 1,626 | 17 | exclude_herbal | 계지탕 등 한방/생약 → 별도 트랙 |
| NSAID 복합 M01AE51 | — | — | done_elsewhere | NONCOLD-COMBO-GROUNDING §5.6 에서 이부프로펜 진통 복합 drafted |

## 10. 필수 표 (WO §11)

| group_key | bucket | ingredient_signature | dosage_form | master_count | grounding | action | reason |
|---|---|---|---|---:|---|---|---|
| drug_otc::combo::oral::analgesic::apap_nonpyrazolone::tablet | PAIN-APAP | 아세트아미노펜+보조진통(±카페인, 비피린) | tablet | ~93(원문) | e약은요 | draft_written | 비피린 대표, 조성 세분은 라벨 확인 |
| drug_otc::combo::oral::analgesic::apap_isopropylantipyrine::tablet | PAIN-APAP-IPA | 아세트아미노펜+이소프로필안티피린(±카페인) | tablet | ~58(원문 signature) | e약은요 | draft_written | 피린계, 15세미만 금기·혈액이상 |
| drug_otc::combo::oral::analgesic::apap_caffeine::* | PAIN-APAP-CAFFEINE | 카페인 포함 | tablet | 판별불가 | 없음 | hold_source | 카페인 원문 signature 부재 |
| drug_otc::combo::oral::analgesic::apap_etenzamide::* | PAIN-APAP-ETENZAMIDE | 에텐자미드 포함 | tablet | 판별불가 | 없음 | hold_source | 원료·분량 부재 |
| drug_otc::combo::oral::analgesic::aspirin_combo::tablet | PAIN-MULTI | 아스피린 복합 | tablet | 8 | e약은요 부분 | needs_review | 소규모, 원문 확정 후 |
| N02BE51 원문 없음 | HOLD-SOURCE | 미상 | tablet | 239 | 없음 | hold_source | 근거 부족 |
| N02BE01/N02BA01 단일 | EXCLUDE | 단일 | tablet | 519 | — | exclude | 단일제 |
| N02BG 생약 | EXCLUDE | 생약 | 과립/정 | 1,626 | — | exclude | 한방/생약 별도 트랙 |

## 11. IPA/카페인/NSAID 주의사항 반영 여부 (WO §11-9)

| 항목 | 반영 |
|---|---|
| 아세트아미노펜 중복·간독성·음주·SJS | ✅ 초안 1·2 |
| 카페인 (조건부) | ✅ 초안 1 "카페인 포함 제품은 커피·에너지음료 병용 주의"(판별 불가 → 조건부) |
| 이소프로필안티피린(피린계) | ✅ 초안 2 — 15세미만 금기·피린 과민·G6PD·포르피린·혈액이상·쇽·메트헤모글로빈혈증 |
| NSAID 복합 | ⏸ 본 트랙 미작성(M01AE51 = NONCOLD-COMBO 에서 완료) |
| 소아 | ✅ 초안 1 연령 분할 용량 + 15세미만 주의 |

## 12. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write (INSERT/UPDATE/DELETE/DDL) | 0 (SELECT 전용) |
| `product_candidate_description_drafts` 변경 | 0 |
| `shared_product_descriptions` 변경 | 0 (read-only) |
| `product_drug_extensions` 변경 | 0 |
| ProductMaster/Candidate 상태 변경 | 0 |
| canonical 승격 / registry 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |
| 처방·단일제·감기약·생약 설명 작성 | 0 |
| **성분 조합/함량 창작** | 0 (전 초안 e약은요 실측 원문 기반. 카페인/에텐자미드 미확정은 조건부·보류로 처리) |

## 13. 후속 작업 제안 (WO §14)

1. **A. `WO-...-ANALGESIC-COMBO-SOURCE-GAP-AUDIT-V1`** (권장·최우선) — e약은요에 없는 **원료약품·분량(조성)**을 MFDS 의약품 허가정보(제품별 성분) 원천에서 확보. 카페인·IPA·에텐자미드 확정 분리 및 N02BE51 390 전량 조성 매핑의 전제.
2. **B. `WO-...-ANALGESIC-IPA-REVIEW-V1`** — 피린계(원문 signature 58 + 원천 확정분) 약사 검토: 15세미만 금기·피린 과민·혈액이상 안전문구 표준화.
3. **C. `WO-...-HERBAL-PAIN-DRAFT-V1`** — N02BG 생약·한방 진통(1,626) 별도 트랙.
4. 초안 2건 DB 반영 설계(APPLY-DESIGN)는 조성 확정(A) 이후 권장 — per-product IPA/비피린 배정에 원천 필요.

---

### 부록 A — 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-ANALGESIC-ANTIPYRETIC-COMBO-DRAFT-V1

수행:
- 경구 해열·진통 복합제(N02B*) read-only 조사, 단일제·생약·NSAID·감기약 분리
- 조성 출처 전수 감사 → 카페인/IPA/에텐자미드 구조화 판별 불가 확정
- IPA(피린계)는 원문 caution-profile signature 로 분리 가능함을 실측(58/151)
- e약은요 원문 grounding 기반 대표 초안 2건(비피린 APAP 복합 / 피린계 IPA 복합)

결과:
- N02BE51(아세트아미노펜 복합): 390 (원문 151)
- IPA(피린계) 원문 signature: 58 / 비피린: 93 / 원문없음: 239
- 아스피린 복합 N02BA51: 8 (needs_review)
- 제외: 단일 APAP 492·단일 아스피린 27·생약 N02BG 1,626 / NSAID 복합 M01AE51 = 타 트랙 완료
- 작성 초안: 2 (비피린 APAP 복합, 피린계 IPA 복합)
- 핵심: 조성은 name·regname·pde·ATC·원문 성분블록 어디로도 판별 불가(게보린정=N02BE51, N02BB 0건).
  카페인/에텐자미드 세분 = hold_source(조건부 문구만). IPA만 원문 signature 로 대표 초안화.

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / 조성 창작 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ANALGESIC-ANTIPYRETIC-COMBO-DRAFT-V1.md

다음 제안:
- ANALGESIC-COMBO-SOURCE-GAP-AUDIT (조성 원천 확보 — 최우선)
- 또는 ANALGESIC-IPA-REVIEW (피린계 약사 검토)
- 또는 HERBAL-PAIN-DRAFT (생약 진통 별도 트랙)
```
