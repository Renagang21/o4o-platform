# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-RECTAL-VAGINAL-MANUAL-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-RECTAL-VAGINAL-MANUAL-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 좌제(rectal)·질정(vaginal) 대표 초안 dry-run** 결과이며, **비경구 OTC 설명서 트랙의 마지막 batch**다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> DB 도구가 없던 다른 실행 환경의 preflight는 이 방과 무관하다. 이 세션은 STAGE1·STAGE2·STAGE2b·EYE·PATCH·NASAL·ORAL-LOCAL을 실제 실행하고 커밋한 DB 접근 가능 환경이다. 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-LOCAL-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-NASAL-DRAFT-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.6 클로트리마졸 질정 선례, §3.9 민감약효군, §3.10 좌제/질정 필수문구)
```

`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 존재하나 본 단계 상태 변경 없음(반영 제안만 §8).

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2` (127.0.0.1, OAuth 토큰) + `psql` user `o4o_api`. **SELECT 전용**. 한글 정규식 UTF-8 `.sql` + `psql -f`.
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'`, join `master_id`.

## 4. 대상 재확인

| route | STAGE1 | 본 batch 실측 | 원문(SPD) | route 신호 |
|---|---:|---:|---:|---|
| rectal (좌제/좌약, 질 제외) | 46 | **46** | 28 | name-route (`좌제\|좌약`) |
| vaginal (질정·질좌제) | 125 | **127** | 59 | **ATC `G01%`**(부인과 항감염) |

### 4.1 vaginal route 신호 = ATC G01 (name 넷 실패)

`질정/질좌제`를 name 정규식으로 잡으면 **`연질캡슐`(경구 연질캡슐)의 `질캡슐` 부분일치**로 4,900+ 오탐이 발생한다. 따라서 vaginal은 **ATC `G01%`(부인과 항감염제, 대부분 질좌제/질정)** 로 확정 → **127건(SPD 59)**, STAGE1의 125(SPD 65)와 정합.

### 4.2 G02CX 222 = 경구 한방 부인과제 → exclude

`G02CX`(SPD 0) 222건은 표본 확인 결과 **온경탕·온청음 엑스과립 등 경구 한방 부인과제(월경 관련)** 로 vaginal route가 아니다 → 제외(경구·한방, 별도 트랙 아님).

## 5. 성분군 분류

### 5.1 질정/질좌제 (G01, 127)

| 성분 | masters | SPD | 처리 |
|---|---:|---:|---|
| 클로트리마졸 (항진균, G01AF02) | 67 | 29 | **drafted** |
| 포비돈요오드 (소독, G01AX11 등) | 16 | 10 | draft_ready |
| 락트산/젖산 (질 산도, G01AD03) | 13 | 0 | hold_for_source (원문 0) |
| 니스타틴 등/other | ~31 | ~20 | hold_for_source/pharmacist |

### 5.2 좌제 (rectal, 46)

| 성분/적응 | masters | SPD | 처리 |
|---|---:|---:|---|
| 비사코딜 (변비 완하) | 11 | 11 | **drafted** |
| 치질(치열·치핵) 좌제 | 10 | 5 | **drafted** |
| 해열·소염 좌제(아세트아미노펜 등) | 3 | 0 | hold_for_source (원문 0, 소아 해열좌제) |
| other(성분 name 없음) | 22 | 12 | hold_for_source |

## 6. 작성한 대표 설명서 초안 목록

| # | group_key | route | status | grounding |
|---:|---|---|---|---|
| 1 | `drug_otc::single::vaginal::clotrimazole::unspecified::vaginal_tablet` | 질 | drafted | 데일리질정(클로트리마졸) |
| 2 | `drug_otc::single::rectal::bisacodyl::10mg::suppository` | 직장 | drafted | 둘코락스좌약(비사코딜) |
| 3 | `drug_otc::combo::rectal::hemorrhoid::unspecified::suppository` | 직장 | drafted | 푸레파인마일드좌제(치질) |

공통 route 문구(가이드 §3.10): **경구 복용하지 않음** · 삽입 전 손 씻기 · 삽입 방법·시기(취침 전 등) · 무르면 냉각 후 사용 · 민감부위·임부·수유부·연령 확인.

---

### 초안 1 — 클로트리마졸 질정(칸디다성 질염)

```text
group_key: drug_otc::single::vaginal::clotrimazole::unspecified::vaginal_tablet
status: drafted   grounding: mfds_easy_drug (데일리질정 등). 함량 100/200/500mg별 용법 상이 → 성분군 레벨, 함량은 제품 확인
```

| 항목 | 내용 |
|---|---|
| 성분 | 클로트리마졸(100·200·500mg 제품별) |
| 분류 | 일반의약품 |
| route | 질(질 내 삽입) |
| 작용 | 곰팡이(칸디다)를 억제하는 항진균 성분 |
| 주요 증상 | 칸디다성 질염(외음부 가려움·분비물) |
| 선택 포인트 | 함량에 따라 사용 일수가 다름(100mg 6일 / 200mg 3일 / 500mg 1일). **질에만 사용** |
| 주의 대상 | 만 12세 미만, 임부·수유부, 생리 중, 첫 발생·재발성 |

**효능·효과**
칸디다성 질염에 사용합니다.

**사용 안내**
제품의 허가된 함량·용법에 따라 취침 시 질 내 깊숙이 삽입합니다(100mg은 1일 1정 6일, 200mg은 1일 2정 3일, 500mg은 1일 5정 1일 등 제품별 확인). **이 약은 질에만 사용하고 삼키지 않습니다(경구 복용 금지).** 삽입 전 손을 씻고, 생리기간 중에는 사용하지 않습니다. 사용 중에는 탐폰·질세척·기타 질 삽입제품을 쓰지 않고, 질내 성교를 피합니다. 이 약은 콘돔·페서리(고무·라텍스)를 약화시킬 수 있습니다. 만 12세 이상만 사용합니다.

**주의 대상**
이 약 과민증, 갈락토오스 불내성 등 유전적 문제가 있으면 사용하지 않습니다. 임부·임신 가능성이 있는 여성·수유부는 사용 전 약사 또는 의사와 상의하세요. 처음 증상이 생겼거나 자주 재발하는 경우, 38℃ 이상 고열·하복부 통증·악취 나는 분비물·질 출혈이 있으면 사용을 중단하고 진료받으세요. 경구용 타크로리무스와 함께 사용하지 않습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 비사코딜 좌약(변비)

```text
group_key: drug_otc::single::rectal::bisacodyl::10mg::suppository
status: drafted   grounding: mfds_easy_drug (둘코락스좌약(비사코딜) 등). 함량 10mg(원문)
```

| 항목 | 내용 |
|---|---|
| 성분 | 비사코딜(대개 10mg) |
| 분류 | 일반의약품 |
| route | 직장(항문 삽입) |
| 작용 | 대장을 자극해 배변을 돕는 완하(변비약) 성분 |
| 주요 증상 | 급·만성 변비, 수술·분만 전후·검사 시 장내 분변 제거 |
| 선택 포인트 | 빠른 배변이 필요할 때 쓰는 좌약. **장기 사용하지 않음** |
| 주의 대상 | 급성 복부질환·장폐색, 임부·수유부, 소아·고령자 |

**효능·효과**
급·만성 변비, 수술·분만 전후 및 X-선 촬영 시 장내 분변 제거에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 성인은 1회 1개(10mg), 만 6~12세 소아는 1회 ½개(5mg)씩 1일 1회 필요 시 항문에 삽입합니다. **경구로 복용하지 않습니다.** 삽입 전 손을 씻고, 장기간 계속 사용하지 않습니다.

**주의 대상**
이 약 과민증, 충수염·장출혈·궤양성 결장염 등 급성 복부질환, 장마비·창자막힘, 구역·구토를 동반한 중증 복통, 항문 열창, 급성 장염, 심한 탈수 상태에는 사용하지 않습니다. 임부·수유부, 소아, 고령자는 사용 전 약사 또는 의사와 상의하고, 다른 완하제와 함께 쓸 때도 상의하세요. 직장출혈·혈변·심한 복통이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 3 — 치질 좌제(치열·치핵)

```text
group_key: drug_otc::combo::rectal::hemorrhoid::unspecified::suppository
status: drafted   grounding: mfds_easy_drug (푸레파인마일드좌제 등). 성분은 제품별 조합(국소마취·혈관수축·항염) → combo 성분군 레벨
```

| 항목 | 내용 |
|---|---|
| 성분 | 치질용 복합 성분(제품별: 국소마취·혈관수축·소염 등) |
| 분류 | 일반의약품 |
| route | 직장(직장 내 삽입) |
| 작용 | 항문·직장의 통증·가려움·부종·출혈을 완화 |
| 주요 증상 | 치열, 치핵(치질)의 아픔·가려움·부종·출혈의 일시적 완화 |
| 선택 포인트 | 항문 부위 증상 완화 좌제. **7일 사용 후에도 개선 없으면 중단** |
| 주의 대상 | 심장질환·고혈압·갑상선질환·당뇨·전립선비대(배뇨곤란), 임부, 소아 |

**효능·효과**
치열, 치핵의 아픔, 가려움, 부종(부기), 출혈의 일시적 완화에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 만 15세 이상 및 성인은 1회 1개를 1일 3회 범위 내에서 직장 내에 삽입합니다. **직장에만 사용하고 경구로 복용하지 않습니다.** 좌제가 무르게 된 경우 잠시 냉각한 뒤, 지나치게 단단하면 살짝 무르게 하여 사용합니다. 7일 정도 사용해도 증상이 개선되지 않으면 사용을 중단하고 상담하세요.

**주의 대상**
혈관수축 성분이 포함될 수 있어 심장질환, 고혈압, 갑상선질환, 당뇨병, 전립선비대로 인한 배뇨곤란이 있으면 사용하지 않습니다. 임부·임신 가능성이 있는 여성은 사용 전 상의하고, 어린이에게는 사용하지 않습니다. 혈압강하제·항우울제 등과 함께 사용하지 않으며, 부종·자극감·발진·출혈이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 7. 보류/제외 그룹과 사유

| 대상 | masters | 원문 | 작업상 분류 | 사유 |
|---|---:|---:|---|---|
| 포비돈요오드 질좌제 | 16 | 10 | draft_ready | 원문 보유, 소독 질정. 대표 초안(클로트리마졸)이 route 문구 커버, 성분별 초안 후속 |
| 락트산/젖산 질정 | 13 | 0 | hold_for_source | 원문 없음(질 산도 회복) |
| 질정 other/니스타틴 | ~31 | ~20 | hold_for_pharmacist | 민감부위·재발·성분 확인, 약사 검토 |
| 해열·소염 좌제(소아 아세트아미노펜 등) | 3 | 0 | hold_for_source | 원문 없음, 소아 용량 확인 필요 |
| 좌제 other(성분 name 없음) | 22 | 12 | hold_for_source | 브랜드명만, content 개별 확인 필요 |
| **G02CX 경구 한방 부인과(온경탕 등)** | **222** | 0 | **exclude** | 경구·한방, vaginal route 아님 |

> 모든 좌제·질정은 삽입·민감부위·경구금지라 가이드 §3.10상 **수동 큐레이션** route다. 원문 충분 그룹(클로트리마졸·비사코딜·치질)만 초안 작성하고, 나머지는 약사 검토·원천 확보로 남긴다.

## 8. registry 반영 제안 (직접 변경 아님)

| group_key | batch | status |
|---|---|---|
| `...vaginal::clotrimazole::unspecified::vaginal_tablet` | RECTAL-VAGINAL | drafted |
| `...rectal::bisacodyl::10mg::suppository` | RECTAL-VAGINAL | drafted |
| `...rectal::hemorrhoid::unspecified::suppository` | RECTAL-VAGINAL | drafted |
| 포비돈요오드 질좌제 16 | RECTAL-VAGINAL | draft_ready |
| 락트산 13 / 해열좌제 3 / 좌제 other 22 | RECTAL-VAGINAL | hold_for_source |
| G02CX 경구 한방 222 | — | exclude(경구) |

## 9. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write (INSERT/UPDATE/DELETE/DDL) | 0 (SELECT 전용) |
| `product_candidate_description_drafts` 변경 | 0 |
| `shared_product_descriptions` 변경 | 0 (read-only) |
| `ProductDrugExtension` 변경 | 0 |
| `ProductMaster`/`ProductCandidate` 상태 변경 | 0 |
| canonical 승격 | 0 |
| registry 상태 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |
| 처방의약품 설명 작성 | 0 |
| 농도/함량 창작 | 0 (원문·명칭 값만, 없으면 unspecified) |

## 10. 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-RECTAL-VAGINAL-MANUAL-DRAFT-V1

수행:
- rectal/vaginal 후보 read-only 재확인
- SPD 원문 grounding
- 성분군 분류
- 대표 설명서 초안 3건 작성 (클로트리마졸 질정 / 비사코딜 좌약 / 치질 좌제)
- CHECK 작성

결과:
- rectal: 46 (원문 28) — 비사코딜11·치질10·해열3·other22
- vaginal: 127 (ATC G01, 원문 59) — 클로트리마졸67·포비돈16·락트산13
- 작성 그룹: 3 (질 1 + 직장 2)
- 작성 초안 수: 3 (drafted)
- draft_ready: 포비돈요오드 질좌제 16
- hold_for_source: 락트산13 + 해열좌제3 + 좌제other22 + 질정other
- hold_for_pharmacist: 질정 민감부위 그룹
- exclude: G02CX 경구 한방 부인과 222 (vaginal 아님)
- 핵심: vaginal은 name '질캡슐'이 연질캡슐 오탐→ATC G01로 확정(127≈STAGE1 125). 클로트리마졸 함량별 용법·질전용·생리중금지, 비사코딜 장기금지, 치질좌제 혈관수축 기저질환 금기 원문반영

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / 농도 창작 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-RECTAL-VAGINAL-MANUAL-DRAFT-V1.md

최종 결과:
비경구 OTC 설명서 트랙 종료 (EYE·TOPICAL·PATCH·NASAL·ORAL_LOCAL·RECTAL·VAGINAL 완료 / 금연 니코틴은 별도 콘텐츠 트랙으로 제외)
```

## 11. 비경구 OTC 트랙 종결 요약

| Route | 상태 | 대표 초안 |
|---|---|---|
| 점안(EYE) | ✅ 완료 | STAGE2 6 + Additional 3 + curation(케토티펜·크로모글리크산) |
| 외용(TOPICAL) | ✅ 완료 | 저위험 7 |
| 파스(PATCH) | ✅ 완료 | 4 |
| 점비(NASAL) | ✅ 완료 | 5 |
| 구강국소(ORAL_LOCAL) | ✅ 완료 | 5 |
| 좌제(RECTAL) | ✅ 완료 | 2 (비사코딜·치질) |
| 질정(VAGINAL) | ✅ 완료 | 1 (클로트리마졸) |
| 금연 니코틴 | ⛔ 제외 | 사용자 결정 — 향후 '금연 프로그램/상담 콘텐츠' 별도 트랙 |

> **비경구 OTC 설명서 트랙 종료.** 잔여는 각 route의 hold_for_source(원문 없음)·hold_for_pharmacist(민감·복합)로, 설명서 작성이 아니라 **원천 자료 확보 / 약사 검토** 과제이며 별도 트랙(Source Gap Audit / 약사 큐레이션)으로 관리한다.
