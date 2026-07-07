# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 점안 신규 3그룹 대표 설명서 초안 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> DB 도구가 없던 다른 실행 환경의 preflight("gcloud/proxy/psql 없음")는 이 방과 무관하다. 이 세션은 STAGE1·STAGE2·STAGE2b·PATCH·NASAL을 실제 실행하고 커밋한 DB 접근 가능 환경이다(gcloud + cloud-sql-proxy-v2 + psql). 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.2 포장 vs 농도, §3.10 비경구 route 점안)
```

`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 존재하나 본 단계에서 상태 변경하지 않음(반영 제안만 §9).

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2` (netureyoutube:asia-northeast3:o4o-platform-db, 127.0.0.1:16546, OAuth 액세스 토큰) + `psql` user `o4o_api`, db `o4o_platform`.
- 인증: `gcloud auth print-access-token`. DB 비밀번호는 Cloud Run `o4o-core-api` env(`DB_PASSWORD`)에서 세션 환경변수로만 사용(디스크 미저장).
- 실행: **SELECT 전용**. 한글 정규식 UTF-8 `.sql` + `psql -f`. HTML 태그·`&nbsp;` 제거 후 파싱.
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'`, join `master_id`.

## 4. 신규 3그룹 후보 재확인 (STAGE2b 근거)

| # | group_key | masters | 원문 대표 제품 | 농도 grounding |
|---:|---|---:|---|---|
| 1 | `drug_otc::single::ophthalmic::polysorbate_80::unspecified::eye_drop` | 13 | 레비타·건아이·베타케어에이플러스점안액(폴리소르베이트80)(1회용) | 미표기 → unspecified |
| 2 | `drug_otc::single::ophthalmic::carbomer::unspecified::eye_gel` | 8 | 리포직·리포직이디오·시카플루이드점안겔(카보머) | 미표기 → unspecified |
| 3 | `drug_otc::single::ophthalmic::sodium_chloride::5pct::eye_drop` | 2 | 뮤로128점안액5%(염화나트륨) | 명칭 명시 **5%** |

## 5. 원문 grounding 방식 (핵심 확정)

각 대표 제품 `content`의 효능·효과 / 용법·용량 / 사용상 주의사항 / 이상반응 / 저장방법을 직접 조회. 원문에 없는 농도·기간은 창작하지 않음.

- **폴리소르베이트80**(레비타점안액 1회용): 효능=눈의 건조증상 완화·자극의 일시적 경감. 용법=필요 시 1~2방울, **점안 후 남은 액·용기 바로 폐기(1회용 무보존제)**. 통증·시야변화·지속 충혈·자극감 또는 72시간 이상 지속 시 중지. 개봉 후 1회만 즉시 사용.
- **카보머 점안겔**(리포직점안겔): 효능=눈의 건조증상 완화. 용법=1회 1방울 1일 2~5회 결막낭, **취침 약 30분 전** 점안, 건조성 각결막염은 장기·지속 치료라 안과 상담. **콘택트렌즈 제거 후 사용, 30분 후 재착용**, 다른 점안제와 15분 간격·**이 약을 가장 나중에**, 시야흐림→운전 주의, 작은 방울(눈꺼풀 점착 방지). **개봉 후 28일 폐기.** 이상반응=자극감·충혈·거대유두결막염·각막반점 등.
- **고장성 5% 염화나트륨**(뮤로128점안액5%): 효능=**각막부종의 일시적 완화**(등장성 세척·보습 식염과 효능 축 상이 — 병합 금지). 용법=매 3~4시간 1~2방울. **일시적 화끈거림·자극감**(고장성 특성). 프로필렌글리콜 과민 상담, 통증·시력변화·지속 충혈 시 중지.

## 6. 작성한 대표 설명서 초안 목록

| # | group_key | status | 농도 grounding |
|---:|---|---|---|
| 1 | `drug_otc::single::ophthalmic::polysorbate_80::unspecified::eye_drop` | drafted | 미표기(성분군 레벨) |
| 2 | `drug_otc::single::ophthalmic::carbomer::unspecified::eye_gel` | drafted | 미표기(성분군 레벨), 제형=겔 |
| 3 | `drug_otc::single::ophthalmic::sodium_chloride::5pct::eye_drop` | drafted | 명칭 명시 5% |

---

### 초안 1 — 폴리소르베이트80 점안제(인공눈물)

```text
group_key: drug_otc::single::ophthalmic::polysorbate_80::unspecified::eye_drop
status: drafted   grounding: mfds_easy_drug (레비타점안액(폴리소르베이트80)(1회용) 등). 농도 미표기 → unspecified
```

| 항목 | 내용 |
|---|---|
| 성분 | 폴리소르베이트80 |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면을 적셔 건조감과 자극을 완화하는 인공눈물 성분 |
| 주요 증상 | 눈 건조감, 일시적 자극감 |
| 선택 포인트 | 1회용 무보존제 제품이 많아 보존제에 민감한 눈에 성분 기준으로 확인 |
| 주의 대상 | 눈 통증이 심한 사람, 안약 알레르기 경험자 |

**효능·효과**
눈의 건조증상 완화와 자극의 일시적 경감에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 필요 시 증상이 있는 눈에 1~2방울 점안하고, 증상에 따라 적절히 증감합니다. 점안용으로만 사용하고 용기 입구가 눈에 직접 닿지 않게 합니다. 1회용 무보존제 제품은 개봉 후 1회만 즉시 사용하고 남은 액과 용기는 바로 버립니다. 오염 방지를 위해 여러 사람이 함께 쓰지 않고, 색이 변했거나 혼탁한 약, 안전포장이 파손된 약은 사용하지 않습니다.

**주의 대상**
눈에 통증·시야 변화, 지속적 충혈·자극감이 있거나 증상이 72시간 이상 지속되면 사용을 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 카보머 점안겔

```text
group_key: drug_otc::single::ophthalmic::carbomer::unspecified::eye_gel
status: drafted   grounding: mfds_easy_drug (리포직점안겔(카보머) 등). 제형=겔(eye_gel), 농도 미표기 → unspecified
```

| 항목 | 내용 |
|---|---|
| 성분 | 카보머 |
| 분류 | 일반의약품 |
| route | 점안(겔) |
| 작용 | 눈 표면에 오래 머무르며 수분을 유지하는 고점도 보습 겔 |
| 주요 증상 | 눈 건조감, 건조성 각결막염에 의한 지속적 건조 |
| 선택 포인트 | 점안액보다 오래 머무는 겔 제형. 취침 전 야간 보습에 적합 |
| 주의 대상 | 카보머 과민증, 눈 통증이 심한 사람, 임부·수유부·소아 |

**효능·효과**
눈의 건조증상 완화에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 성인은 증상 정도에 따라 1회 1방울씩 1일 2~5회 결막낭 내에 점안하고, 취침 시에는 약 30분 전에 점안합니다. 건조성 각결막염은 장기간·지속 치료가 필요할 수 있어 안과 의사와 상담하세요. 콘택트렌즈는 사용 전에 제거하고 30분 후에 다시 착용합니다. 다른 점안제와 함께 쓰는 경우 15분 이상 간격을 두고 이 약을 가장 나중에 사용합니다. 겔 제형이라 점안 후 일시적으로 시야가 흐릴 수 있으므로 운전·기계 조작 시 주의하고, 눈꺼풀이 붙지 않도록 작은 방울로 점안합니다. 용기 끝이 눈·눈꺼풀·속눈썹에 닿지 않게 합니다.

**주의 대상**
카보머 과민증이 있으면 사용하지 않습니다. 눈 통증이 심한 사람, 안약 알레르기 경험자, 임부·임신 가능성이 있는 여성·수유부·소아는 사용 전 약사 또는 의사와 상의하세요. 자극감·충혈·가려움·눈곱, 각막반점, 지속적 시야흐림이 나타나면 사용을 중단하고 확인하세요. 개봉 후 28일이 지난 약은 사용하지 않습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 3 — 고장성 5% 염화나트륨 점안제

```text
group_key: drug_otc::single::ophthalmic::sodium_chloride::5pct::eye_drop
status: drafted   grounding: mfds_easy_drug (뮤로128점안액5%(염화나트륨)). 효능 축=각막부종(인공눈물과 별개), 명칭 명시 5%
```

| 항목 | 내용 |
|---|---|
| 성분 | 염화나트륨 5%(고장성) |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 각막의 과다한 수분을 끌어내 각막부종을 일시적으로 완화하는 고장성 점안제 |
| 주요 증상 | 각막부종에 의한 흐림·불편감 |
| 선택 포인트 | 단순 보습(인공눈물)이 아니라 **각막부종 완화** 목적일 때. 세척·건조용 식염과 다름 |
| 주의 대상 | 프로필렌글리콜 과민 경험자 |

**효능·효과**
각막부종의 일시적 완화에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 증상이 있는 눈에 매 3~4시간마다 1~2방울씩 점안합니다. 점안 시 고장성 성분으로 인해 일시적인 화끈거림과 자극감이 나타날 수 있습니다. 용기 팁이 눈·외부에 닿지 않게 하고, 색이 변했거나 혼탁한 약은 사용하지 않습니다. 이 약은 눈 건조·세척용 인공눈물과 목적이 다르므로 각막부종 외의 단순 건조에는 적합하지 않으며, 사용 목적을 약사에게 확인하세요.

**주의 대상**
프로필렌글리콜 과민증이 있거나 경험한 사람은 사용 전 약사 또는 의사와 상의하세요. 눈 통증, 시력 변화, 지속적 충혈·자극감이 나타나면 사용을 즉각 중단하고 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 7. 초안별 source 근거

| 초안 | 대표 원문 제품 | source_type | 핵심 grounding |
|---|---|---|---|
| 폴리소르베이트80 | 레비타점안액(폴리소르베이트80)(1회용) | mfds_easy_drug | 건조·자극 완화, 1회용 폐기, 72시간 |
| 카보머 겔 | 리포직점안겔(카보머) | mfds_easy_drug | 취침 30분 전, 렌즈 30분·15분 간격, 개봉 후 28일 |
| 고장성 5% 식염 | 뮤로128점안액5%(염화나트륨) | mfds_easy_drug | 각막부종, 3~4시간, 화끈거림 |

## 8. STAGE2 6건 중복 없음 / 제외 유지 확인

- 본 3그룹은 STAGE2 6그룹(CMC 0.5%/1%, 트레할로스, 포비돈 2%, 히알루론산, PDRN)과 **성분·제형이 모두 다름** → 중복 0.
- 카보머는 **제형이 겔(eye_gel)**이라 점안액 그룹과 group_key 분리. 고장성 5% 식염은 **효능 축(각막부종)**이 등장성 인공눈물과 달라 병합 금지(가이드 §3.10).
- reassigned_to_existing(CMC/PDRN 철자변형 5건)은 STAGE2 초안 재사용 대상 — 본 batch 신규 본문 작성 안 함.
- **복합 눈피로·충혈·항알레르기 283건(STAGE2b hold_for_pharmacist)은 본 batch 미작성, 별도 큐레이션으로 유지.**

## 9. registry 반영 제안 (직접 변경 아님)

| group_key | batch | status |
|---|---|---|
| `...polysorbate_80::unspecified::eye_drop` | BATCH-EYE-ADDITIONAL-DEMULCENT | drafted |
| `...carbomer::unspecified::eye_gel` | BATCH-EYE-ADDITIONAL-DEMULCENT | drafted |
| `...sodium_chloride::5pct::eye_drop` | BATCH-EYE-ADDITIONAL-DEMULCENT | drafted |
| 복합/충혈/항알레르기 283 | BATCH-EYE-ANTIALLERGY-COMBO | hold_for_pharmacist |

## 10. 금지사항 준수 확인

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
| STAGE2 6건 중복 작성 | 0 |
| 복합/충혈/항알레르기 283 작성 | 0 (제외 유지) |
| 농도 창작 | 0 (5%는 명칭, 나머지 unspecified) |

## 11. 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1

수행:
- 신규 3그룹 read-only 원문 grounding 재확인
- 대표 설명서 초안 3건 작성 (폴리소르베이트80 / 카보머 겔 / 고장성 5% 식염)
- STAGE2 6건 중복 없음 확인
- 복합/충혈/항알레르기 283 제외 유지

결과:
- 작성 그룹: 3
- 작성 초안 수: 3 (drafted)
- 농도 grounding: 5% NaCl(명칭) / 폴리소르베이트80·카보머 unspecified
- 제외 유지(hold_for_pharmacist): 283
- 핵심: 카보머=겔 제형 분리, 고장성5%식염=각막부종(인공눈물과 효능 축 상이) 병합금지, 1회용 폐기·개봉후 28일 원문 반영

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / STAGE2 중복 0 / 농도 창작 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1.md

다음 제안:
- BATCH-EYE-ANTIALLERGY-COMBO-CURATION (복합 눈피로·충혈·항알레르기 283 약사 검토)
- 또는 BATCH-ORAL-LOCAL-DRAFT (트로키·가글 219)
- 또는 BATCH-RECTAL-VAGINAL-MANUAL-DRAFT
```
