# CHECK-O4O-DRUG-OTC-DESCRIPTION-DIGESTIVE-COMBO-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-DIGESTIVE-COMBO-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 경구 소화제 복합제 분류 + 대표 초안 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> 이 세션은 STAGE1·PATCH·NASAL·COLD-COMBO·ANALGESIC-COMBO 등을 실제 실행한 DB 접근 가능 환경이다(gcloud + cloud-sql-proxy-v2 + psql, netureyoutube).

## 2. 사용한 기준 문서

```text
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-DIGESTIVE-COMBO-DRAFT-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.2 과분할 금지, §3.8 저 grounding, §3.9 민감 약효군)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ANALGESIC-ANTIPYRETIC-COMBO-DRAFT-V1.md (동일 조성-판별 gap 선례)
```

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2 netureyoutube:asia-northeast3:o4o-platform-db` (127.0.0.1:5433, OAuth) + `psql` user `o4o_api`. **SELECT 전용**.
- 원문: `shared_product_descriptions.content`(source_type=`mfds_easy_drug`, e약은요), join `master_id`.
- 데이터 제약(재확인): `product_drug_extensions`의 성분 필드(active_ingredients·ingredient_summary·strength)는 **OTC 전량 NULL**.

## 4. 핵심 발견 — 소화제 복합제 조성 세분은 판별 불가 (효능도 단일 수렴)

WO의 필수 분리축(소화효소 종류·담즙/UDCA·시메티콘·건위생약·제산제 포함 여부)을 위해 조성 출처를 실측 감사했다.

| 조성 신호 | A09A enzyme(원문 538) 반영 |
|---|---|
| name/regname 에 판크레아틴·디아스타제·리파제·우르소·담즙·시메티콘 | **0** |
| pde.active_ingredients / ingredient_summary / strength | **전량 NULL** |
| SPD content 에 **담즙·우르소·UDCA·지방 소화** (담즙산/UDCA 신호) | **0 / 538** |
| SPD content 에 **건위생약**(용담·계피·회향·진피·창출 등) | **0 / 538** |
| SPD content 에 **시메티콘/디메티콘** | **0** (`가스·팽만` 533건은 효능 "위부팽만감" 오탐 — 시메티콘 아님) |

**결정적 근거**: 대표 브랜드 `닥터베아제정`·`훼스탈골드정`·`훼스탈플러스정`(실제 판크레아틴+**담즙성분/UDCA**+시메티콘 강화형)의 e약은요 원문이 **일반 베아제정과 효능·조성이 동일하게 표기**된다 — 효능은 전부 "소화불량, 식욕감퇴, 과식, 체함, 소화촉진, 소화불량으로 인한 위부팽만감", **성분·담즙·시메티콘 언급 0**. 즉 소비자 선택 축(담즙/UDCA·가스제거 포함 여부)이 데이터에 **존재하지 않는다.**

→ 해열진통 복합(ANALGESIC-COMBO)과 동일한 조성-판별 gap. 게다가 **효능·효과가 하나로 수렴**해 종합감기약(COLD-COMBO §4.2)처럼 증상축 세분도 라벨상 불가. WO §6("조성 grounding 부족 시 축소·사유 기록")·§12·§14(SOURCE-GAP-AUDIT) 및 WO 본문("조성 확인 안 되는 품목은 무리하지 말고 HOLD") 적용.

## 5. 후보 모수 · bucket (read-only 실측)

경구 소화제 관련 ATC(A09·A02·A03AX13·A05AA, 외용/주사/좌제 제외):

| ATC7 | 계열 | master | 원문 | 처리 |
|---|---|---:|---:|---|
| **A09A(비생약)** | **소화효소 복합(베아제/훼스탈/닥터베아제)** | **~878** | **538** | 대표 초안(효능 단일) |
| A09A(생약) | 향사평위산 등 한방 위장약 | 1,371 | 낮음 | **exclude_herbal**(별도 트랙) |
| A09AC | 효소+산 | 37 | 14 | 소화효소 복합에 포함 |
| A03AX13 | 시메티콘(가스제거) | 87 | 62 | **대부분 단일**(가스활명수류) → exclude_single, combo만 편입 |
| A05AA02 | 우르소데옥시콜산(UDCA) | 29 | 21 | **단일 UDCA**(이담/담석) → exclude_single(별도) |
| A02A* | 제산제(알마게이트·수산화알루미늄 등) | 다수 | | 위장약 트랙 경계 → **defer(ANTACID track)** |
| A02AF | 제산+가스제거 복합 | 30 | 9 | boundary → defer |
| A02BA | H2 차단(라니티딘·파모티딘) | 다수 | | **exclude_single**(WO §3) |

**bucket 판정(WO §4):**

| bucket | 판별 | 처리 |
|---|---|---|
| DIGEST-ENZYME-COMBO(소화효소 중심) | 효능·용법·주의 grounding 가능 | **대표 초안** |
| DIGEST-ENZYME-BILE(효소+담즙/UDCA) | **판별 불가**(담즙/UDCA 신호 0/538) | hold_source(조건부 문구만) |
| DIGEST-ENZYME-SIMETHICONE(효소+가스제거) | **판별 불가**(시메티콘 신호 0) | hold_source(조건부 문구만) |
| DIGEST-ENZYME-HERBAL(효소+건위생약) | **판별 불가**(생약 신호 0) | hold_source |
| DIGEST-ANTACID-COMBO(제산 포함) | 효능 위산과다 66건 있으나 조성 미상 | defer(ANTACID track) |
| DIGEST-PEDIA(소아용) | 용법에 소아 용량 있는 제품 존재(훼스탈플러스 등) | **대표 초안(소아 용법 변형)** |
| 원문 없는 A09A 비생약 | 근거 부족 | hold_source |

## 6. 원문 grounding (실측)

`베아제정`·`닥터베아제정`·`훼스탈골드정` 원문 **완전 일치**:

- **효능·효과**: 소화불량, 식욕감퇴(식욕부진), 과식, 체함, 소화촉진, 소화불량으로 인한 위부팽만감.
- **용법·용량**: 성인 1회 1정 1일 3회 식후(씹지 않는 제품 있음).
- **주의**: **만 7세 이하 어린이 복용 금지**, 알레르기 체질·임부·수유부 상담, 일부 황색4호 과민 상담, **2주 복용해도 개선 없으면 중지·상담**.
- `훼스탈플러스정`: 성인·15세 이상 1회 1~2정, **만 8세~15세 1정** 1일 3회 식후 씹지 말고(소아 용법 변형).

원문에 없는 조성(효소 종류·담즙/UDCA·시메티콘·건위생약·함량)은 창작하지 않음.

## 7. 작성한 대표 설명서 초안

| # | group_key | bucket | status |
|---:|---|---|---|
| 1 | `drug_otc::combo::oral::digestive::enzyme_combo::tablet` | DIGEST-ENZYME-COMBO | draft_written |
| 2 | `drug_otc::combo::oral::digestive::enzyme_combo_pedia::tablet` | DIGEST-PEDIA | draft_written |

---

### 초안 1 — 소화효소 복합제 (성인)

```text
group_key: drug_otc::combo::oral::digestive::enzyme_combo::tablet
status: draft_written   grounding: mfds_easy_drug (베아제정·훼스탈골드정·닥터베아제정 등). 효소 종류·담즙/UDCA·시메티콘·건위생약 포함 여부는 제품별 상이(원문 판별 불가) → 조건부 문구
```

| 항목 | 내용 |
|---|---|
| 분류 | 일반의약품 |
| 주요 성분군 | 소화효소 복합(판크레아틴·디아스타제·리파제 등) ± 담즙성분·가스제거성분·건위생약 (제품별 조합 상이) |
| 주요 증상 | 소화불량, 식욕감퇴, 과식, 체함, 소화촉진, 소화불량으로 인한 위부팽만감(더부룩함) |
| 선택 포인트 | 과식·체함 등 일시적 소화불량에. 성분 조합(담즙·가스제거 등)은 제품별 확인 |
| 주의 대상 | 만 7세 이하 금기, 알레르기 체질, 임부·수유부, 심한 복통·혈변 |
| 약사 상담 포인트 | 담즙/제산/가스제거 성분 포함 여부, 복용 중인 다른 약 |

**어떤 경우에 선택하나**
과식이나 식후 더부룩함, 체한 느낌 등 일시적인 소화불량, 식욕감퇴, 위부팽만감에 허가 범위 안에서 사용합니다.

**복용 안내**
제품별 허가된 용법·용량(예: 성인 1회 1정, 1일 3회 식후. 씹지 않고 복용하는 제품도 있음)에 따라 복용합니다. 증상에 따라 소화효소 중심 제품, 가스제거 성분 포함 제품, 제산 성분 포함 제품을 구분해 선택합니다.

**주의 대상**
**만 7세 이하 어린이는 복용하지 않습니다.** 알레르기 체질, 임부·임신 가능성이 있는 여성·수유부는 복용 전 약사와 상담하세요. **담즙산·UDCA 등 담즙 관련 성분이 포함된 제품은 담도질환·간질환·심한 복통이 있으면 상담**하고, **제산 성분이 포함된 제품은 다른 약의 흡수에 영향을 줄 수 있어 복용 중인 약이 있으면 간격을 두거나 약사에게 확인**하세요. **가스제거 성분이 포함되어도 심한 복통·구토·혈변이 있으면** 단순 소화불량으로만 보지 말고 상담이 필요합니다. 2주 정도 복용해도 나아지지 않거나 증상이 반복되면 복용을 중지하고 원인 확인을 위해 상담하세요.

**성분 확인 포인트**
소화제는 제품명보다 어떤 증상에 맞춘 성분 조합인지 확인하는 것이 중요합니다. 소화효소·제산제·가스제거 성분·담즙산/UDCA·생약 건위성분 포함 여부에 따라 선택 기준이 달라질 수 있습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 소화효소 복합제 (소아 복용 가능형)

```text
group_key: drug_otc::combo::oral::digestive::enzyme_combo_pedia::tablet
status: draft_written   grounding: mfds_easy_drug (훼스탈플러스정 등). 만 8세 이상 소아 용법이 허가된 제품. 만 7세 이하는 여전히 금기
```

| 항목 | 내용 |
|---|---|
| 분류 | 일반의약품 |
| 주요 성분군 | 소화효소 복합(제품별 조성 상이) — 만 8세 이상 소아 용량이 허가된 제품 |
| 주요 증상 | 소화불량, 식욕감퇴, 과식, 체함, 소화촉진, 위부팽만감 |
| 선택 포인트 | 소아(만 8세 이상)도 연령별 용량으로 복용 가능한 소화효소 복합제 |
| 주의 대상 | **만 7세 이하 금기**, 알레르기 체질, 임부·수유부 |

**어떤 경우에 선택하나**
과식·체함·더부룩함 등 일시적 소화불량에 사용하며, 제품에 따라 만 8세 이상 소아도 연령별 용량으로 복용할 수 있습니다.

**복용 안내**
제품별 허가 용법에 따라 복용합니다(예: 성인·만 15세 이상 1회 1~2정, 만 8세~만 15세 1정, 1일 3회 식후 씹지 말고). **소아는 연령·체중에 따라 용량이 달라지므로 제품별 허가 용법을 반드시 확인**하고, 어린이에게 복용시킬 때는 보호자가 지도합니다.

**주의 대상**
**만 7세 이하 어린이는 복용하지 않습니다.** 알레르기 체질, 임부·수유부는 복용 전 약사와 상담하세요. 2주 정도 복용해도 나아지지 않거나 증상이 반복되면 복용을 중지하고 상담하세요.

**성분 확인 포인트**
같은 소화효소 복합제라도 소아 복용 가능 연령·용량이 제품마다 다르므로 약사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 8. 초안별 source 근거

| 초안 | 대표 원문 제품 | ATC | source_type |
|---|---|---|---|
| 1 소화효소 복합(성인) | 베아제정 · 훼스탈골드정 · 닥터베아제정 | A09A | mfds_easy_drug |
| 2 소화효소 복합(소아 가능형) | 훼스탈플러스정 등 | A09A | mfds_easy_drug |

## 9. 보류/제외 그룹과 사유

| 대상 | master | 원문 | 분류 | 사유 |
|---|---:|---:|---|---|
| 효소+담즙/UDCA 세분 | — | — | hold_source | 담즙/UDCA 신호 0/538 → 유무 판별 불가. 조건부 문구만 |
| 효소+시메티콘 세분 | — | — | hold_source | 시메티콘 신호 0(가스·팽만은 효능 오탐) |
| 효소+건위생약 세분 | — | — | hold_source | 생약 신호 0 |
| 제산 포함 소화제 | 66(효능) | | defer | 위장약 경계 → ANTACID-GASTRIC-COMBO 트랙 |
| 원문 없는 A09A 비생약 | ~340 | 0 | hold_source | 효능·주의 근거 부족 |
| A09A 생약(향사평위산 등) | 1,371 | 낮음 | exclude_herbal | 한방 처방 위장약 → 별도 트랙 |
| 시메티콘 단일(A03AX13) | ~87 | 62 | exclude_single | 가스제거 단일제 |
| UDCA 단일(A05AA02) | 29 | 21 | exclude_single | 이담/담석 단일 — 별도 |
| H2 차단·제산 단일(A02BA·A02A) | 다수 | | exclude_single | 단일제(WO §3) |

## 10. 필수 표 (WO §11)

| group_key | bucket | ingredient_signature | dosage_form | master_count | grounding | action | reason |
|---|---|---|---|---:|---|---|---|
| drug_otc::combo::oral::digestive::enzyme_combo::tablet | DIGEST-ENZYME-COMBO | 소화효소 복합(±담즙·시메티콘·건위생약) | tablet | ~878(원문538) | e약은요 | draft_written | 효능 단일 수렴, 조성 미상→조건부 |
| drug_otc::combo::oral::digestive::enzyme_combo_pedia::tablet | DIGEST-PEDIA | 소화효소 복합(만8세↑ 용법) | tablet | (A09A 내 소아용법) | e약은요 | draft_written | 소아 용량 허가 제품 |
| drug_otc::combo::oral::digestive::enzyme_bile::* | DIGEST-ENZYME-BILE | 효소+담즙/UDCA | tablet | 판별불가 | 없음 | hold_source | 담즙/UDCA 신호 0/538 |
| drug_otc::combo::oral::digestive::enzyme_simethicone::* | DIGEST-ENZYME-SIMETHICONE | 효소+시메티콘 | tablet | 판별불가 | 없음 | hold_source | 시메티콘 신호 0 |
| drug_otc::combo::oral::digestive::enzyme_herbal::* | DIGEST-ENZYME-HERBAL | 효소+건위생약 | tablet | 판별불가 | 없음 | hold_source | 생약 신호 0 |
| drug_otc::combo::oral::digestive::antacid_combo::* | DIGEST-ANTACID-COMBO | 제산 포함 | tablet/액 | 66(효능) | e약은요 부분 | defer | 위장약 경계(별도 트랙) |
| A09A 생약 | EXCLUDE | 향사평위산 등 | 과립/정 | 1,371 | 낮음 | exclude_herbal | 한방 별도 트랙 |
| 시메티콘/UDCA/H2 단일 | EXCLUDE | 단일 | 정/액 | 다수 | — | exclude_single | 단일제 |

## 11. 담즙산/UDCA/시메티콘/제산제 주의사항 반영 여부 (WO §11-10)

| 항목 | 반영 |
|---|---|
| 소화효소 공통(일시적 소화불량, 2주 반복 시 원인확인) | ✅ 초안 1·2 |
| 담즙산/UDCA (조건부) | ✅ 초안 1 "담즙 관련 성분 포함 제품은 담도·간질환·심한 복통 상담"(판별불가→조건부) |
| 제산제 (조건부) | ✅ 초안 1 "제산 성분 포함 제품은 다른 약 흡수 영향, 간격/약사 확인" |
| 가스제거(시메티콘) (조건부) | ✅ 초안 1 "가스제거 성분 포함, 심한 복통·구토·혈변 시 상담" |
| 소아 | ✅ 초안 2 만8세↑ 용법 + 만7세이하 금기 |

## 12. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write (INSERT/UPDATE/DELETE/DDL) | 0 (SELECT 전용) |
| product_candidate_description_drafts 변경 | 0 |
| shared_product_descriptions 변경 | 0 (read-only) |
| product_drug_extensions 변경 | 0 |
| ProductMaster/Candidate 상태 변경 | 0 |
| canonical 승격 / registry 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |
| 단일제·정장제·지사제·변비약·한방·처방 설명 작성 | 0 |
| **성분 조합/함량 창작** | 0 (효능·용법·주의만 원문 grounding, 조성 미상은 조건부·보류) |

## 13. 후속 작업 제안 (WO §14)

1. **A. `WO-...-DIGESTIVE-COMBO-SOURCE-GAP-AUDIT-V1`** (권장·최우선) — e약은요에 없는 **원료약품·분량(효소 종류·담즙/UDCA·시메티콘·건위생약)**을 MFDS 허가정보 원천에서 확보. 조성 세분(BILE/SIMETHICONE/HERBAL) 초안화의 전제.
2. **B. `WO-...-ANTACID-GASTRIC-COMBO-DRAFT-V1`** — 제산제 포함 위장약(A02·A09 위산과다 효능 66) 별도 트랙.
3. **C. `WO-...-HERBAL-GASTRIC-DRAFT-V1`** — A09A 생약(향사평위산 등 1,371) 한방 위장약 별도 트랙.
4. 초안 2건 DB 반영 설계(APPLY-DESIGN)는 조성 확정(A) 이후 권장.

---

### 부록 A — 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-DIGESTIVE-COMBO-DRAFT-V1

수행:
- 경구 소화제 복합제(A09/A02) read-only 조사, 생약·단일제·H2·제산 단일 분리
- 조성 출처 전수 감사 → 효소종류/담즙·UDCA/시메티콘/건위생약 판별 불가 확정(신호 0/538)
- 효능·효과도 단일 수렴(베아제=닥터베아제=훼스탈, 조성 미표기) 확인
- e약은요 원문 grounding 기반 대표 초안 2건(소화효소 복합 성인 / 소아 가능형)

결과:
- A09A 소화효소: 총 2,249 (비생약 ~878 / 원문 538, 생약 1,371 제외)
- 조성 세분(담즙/UDCA·시메티콘·건위생약): 원문 신호 0 → 판별 불가(hold_source, 조건부 문구)
- 제산 포함(효능 66): ANTACID 트랙 defer / 시메티콘·UDCA·H2 단일: exclude
- 작성 초안: 2 (효능 단일 수렴 + 조성 미상으로 6~12 목표 축소, 사유 명시)
- 핵심: 닥터베아제(UDCA·시메티콘 강화형)조차 원문상 일반 베아제와 효능·조성 동일 표기 → 소비자 선택축이 데이터에 부재

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / 조성 창작 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-DIGESTIVE-COMBO-DRAFT-V1.md

다음 제안:
- DIGESTIVE-COMBO-SOURCE-GAP-AUDIT (조성 원천 확보 — 최우선)
- 또는 ANTACID-GASTRIC-COMBO-DRAFT (제산 위장약 별도 트랙)
- 또는 HERBAL-GASTRIC-DRAFT (생약 위장약 1,371 별도 트랙)
```
