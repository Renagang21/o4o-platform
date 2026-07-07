# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-LOCAL-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-LOCAL-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 구강국소(트로키·가글·인후 스프레이) 대표 초안 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> DB 도구가 없던 다른 실행 환경의 preflight("gcloud/proxy/psql 없음")는 이 방과 무관하다. 이 세션은 STAGE1·STAGE2·STAGE2b·EYE·PATCH·NASAL을 실제 실행하고 커밋한 DB 접근 가능 환경이다. 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-NASAL-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ANTIALLERGY-COMBO-CURATION-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.9 민감약효군, §3.10 트로키/가글 필수문구)
```

`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 존재하나 본 단계 상태 변경 없음(반영 제안만 §8).

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2` (netureyoutube:asia-northeast3:o4o-platform-db, 127.0.0.1, OAuth 토큰) + `psql` user `o4o_api`.
- 실행: **SELECT 전용**. 한글 정규식 UTF-8 `.sql` + `psql -f`. HTML·`&nbsp;` 제거 후 파싱.
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'`, join `master_id`.
- 제약: OTC 확장 임상필드(ingredient/dosage/efficacy) NULL → 성분·route는 name + content 파생.

## 4. oral_local 후보 재확인

name-route(`트로키|트로우치|트로치|가글|가그린|함수|구내|구강|인후|설하|로젠지`)로 재조회:

| 구분 | 수 |
|---|---:|
| name-route total (본 넷) | 266 |
| 원문(SPD content) 보유 | 138 (52%) |
| **ODF 구강용해/붕해필름(경구 전신, oral_local 아님) 제외** | **−52** |
| **실 oral_local ≈** | **214** (STAGE1 canonical 219와 근접) |

### 4.1 STAGE1 219와의 정합

STAGE1 route-priority CASE의 oral_local=219. 본 넷 266이 큰 이유는 **구강용해/붕해필름(ODF) 52건**을 포함했기 때문. 266−52 = 214로 STAGE1 219에 근접(잔차는 인후 스프레이/기타 키워드 차이). ODF는 §5.4에서 exclude.

### 4.2 제형 분포 (name 기준)

| 제형 | masters | SPD |
|---|---:|---:|
| 트로키(troche) | 107 | 49 |
| 가글(gargle/함수) | 57 | 36 |
| 인후 스프레이(oral_spray) | 35 | 26 |
| 구강필름 등(oral_topical 키워드) → 대부분 ODF 전신 | 52 | 24 |
| 기타 | 15 | 3 |

## 5. 성분군 분류

### 5.1 가글 (57)

| 성분 | masters | SPD | 처리 |
|---|---:|---:|---|
| 클로르헥시딘글루콘산염 | 24 | 21 | **drafted** |
| 벤제토늄염화물 | 9 | 9 | **drafted** |
| 벤지다민 | 12 | 6 | draft_ready (NSAID성 구강소염) |
| 포비돈요오드 | 9 | 0 | hold_for_source (원문 0) |
| other | 3 | 0 | hold_for_source |

### 5.2 인후 스프레이 (35)

| 성분 | masters | SPD | 처리 |
|---|---:|---:|---|
| 포비돈요오드 | 22 | 20 | **drafted** (구강 살균·인두염) |
| 벤지다민 | 6 | 2 | draft_ready |
| other | 6 | 4 | hold_for_source |
| 아즐렌 | 1 | 0 | hold_for_source |

### 5.3 트로키 (107)

| 성분 | masters | SPD | 처리 |
|---|---:|---:|---|
| 플루르비프로펜 | 27 | 21 | **drafted** (인후염 NSAID, §3.9 약사 프레이밍) |
| 세틸피리디늄염화물 | 8 | 6 | **drafted** (인두염·편도염·구내염 살균) |
| other(브랜드명, 성분 name 없음) | 72 | ~22 | hold_for_source (다수 세틸피리디늄·티로트리신·비타민 추정, 품목별 content 확인 필요) |

### 5.4 구강도포 / 구내염 (제형별 route 주의)

- **구강용해/붕해필름(ODF) 52건 = exclude**: `content`·명칭 확인 결과 시메티콘(가스)·메클리진(멀미)·로라타딘(알레르기)·멜라토닌·셀레늄·**니코틴** 등 **경구 전신 제제를 필름 제형으로 전달**하는 것이라 구강*국소*가 아님. 니코틴 필름은 금연 트랙(`BATCH-SMOKING-NICOTINE`)으로 분리.
- **정통 구내염 도포제(트리암시놀론 오라메디·폴리크레줄렌 알보칠 등)**: 명칭에 `트로키/가글/구강/구내` 키워드가 없어 본 route 넷에서 **부분 누락**. 별도 확인 필요(hold, §9). 트리암시놀론은 스테로이드라 수동 큐레이션(가이드 §3.10).

## 6. 작성한 대표 설명서 초안 목록

| # | group_key | status | grounding |
|---:|---|---|---|
| 1 | `drug_otc::single::oral_local::chlorhexidine_gluconate::unspecified::gargle` | drafted | 그린헥시딘가글액0.12% |
| 2 | `drug_otc::single::oral_local::povidone_iodine::unspecified::oral_spray` | drafted | 이누쿨인후스프레이액 |
| 3 | `drug_otc::single::oral_local::cetylpyridinium_chloride::1.5mg::troche` | drafted | 쿨스탁필름형트로키 |
| 4 | `drug_otc::single::oral_local::flurbiprofen::8.75mg::troche` | drafted | 모가프텐트로키 (NSAID·약사 프레이밍) |
| 5 | `drug_otc::single::oral_local::benzethonium_chloride::unspecified::gargle` | drafted | 케어가글액 |

공통 route 문구(가이드 §3.10): 트로키=씹거나 삼키지 말고 천천히 녹여 사용 / 가글·스프레이=삼키지 않고 사용 후 뱉음(구강 세척용 내복 금지) / 사용 후 음식·음료 간격 / 소아 연령 확인.

---

### 초안 1 — 클로르헥시딘글루콘산염 가글액

```text
group_key: drug_otc::single::oral_local::chlorhexidine_gluconate::unspecified::gargle
status: drafted   grounding: mfds_easy_drug (그린헥시딘가글액0.12% 등). 농도 제품별(0.1~0.12%) 상이 → 성분군 레벨
```

| 항목 | 내용 |
|---|---|
| 성분 | 클로르헥시딘글루콘산염 |
| 분류 | 일반의약품 |
| route | 구강국소(함수/가글) |
| 작용 | 구강 내 세균·진균을 줄이는 살균·소독 성분 |
| 주요 증상 | 치은염, 인두염, 아프타성 구내염, 구강 칸디다감염, 발치·치근막 수술 후 소독 |
| 선택 포인트 | 구강 살균·소독용 함수제. **장기 사용·착색 주의** |
| 주의 대상 | 18세 미만, 임부·수유부, 이 약 과민, 알레르기 질환력 |

**효능·효과**
보철(의치)에 의한 염증, 아구창 등 구강 내 칸디다감염, 치은염, 인두염, 아프타성 구내염에 의한 염증 완화와 치근막 수술 후 살균·소독에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 1회 약 15mL씩 1일 2회 약 1분간 입안을 양치(함수)한 뒤 뱉습니다. **함수용으로만 사용하고 삼키지 않습니다.** 치료는 보통 10일을 넘기지 않으며, 구강 내 정상 세균총 불균형을 유발할 수 있어 장기간 사용하지 않습니다. 치아·보철물·혀에 착색이 생길 수 있습니다.

**주의 대상**
이 약 과민증이 있으면 사용하지 않습니다. 천식 등 알레르기 질환·병력·가족력, 임부·수유부, 18세 미만은 사용 전 약사 또는 의사와 상의하세요. 일반 세균감염에는 항생제 치료가 필요하며, 발진·두드러기·호흡곤란 등 과민증상이 나타나면 즉시 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 포비돈요오드 인후 스프레이

```text
group_key: drug_otc::single::oral_local::povidone_iodine::unspecified::oral_spray
status: drafted   grounding: mfds_easy_drug (이누쿨인후스프레이액(포비돈요오드) 등)
```

| 항목 | 내용 |
|---|---|
| 성분 | 포비돈요오드 |
| 분류 | 일반의약품 |
| route | 구강국소(인후 분무) |
| 작용 | 입안·목의 세균 등을 줄이는 살균·소독 성분 |
| 주요 증상 | 구강 내 살균소독, 인두염, 후두염, 구내염, 발치·구강수술 후 소독, 구취 |
| 선택 포인트 | 입안·목 부위 살균소독 분무제 |
| 주의 대상 | 갑상선기능 이상, 6세 미만, 방사성요오드 치료 전후, 임부·수유부 |

**효능·효과**
구강 내(입안) 살균소독, 인두염, 후두염, 구내염, 발치 후 및 구강수술 후 살균소독, 구취증에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 1일 수회 적당량을 환부에 분사·도포합니다. 구강용으로만 사용하고, 발치 등 구강 상처는 출혈이 멎기 전 격렬한 양치를 피합니다. 요오드 성분이므로 과량 사용하지 않습니다.

**주의 대상**
이 약 과민증, 갑상선기능 이상, 6세 미만 소아, 방사성요오드 치료 중이거나 치료 전후에는 사용하지 않습니다. 입안이 심하게 헐었거나 임부·임신 가능성이 있는 여성·수유부, 프로필렌글리콜 과민 경험자는 사용 전 상의하세요. 갑상선 진단검사에 영향을 줄 수 있어 검사와 4주 이상 간격을 둡니다. 자극감·짓무름·과민증상이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 3 — 세틸피리디늄염화물 트로키

```text
group_key: drug_otc::single::oral_local::cetylpyridinium_chloride::1.5mg::troche
status: drafted   grounding: mfds_easy_drug (쿨스탁필름형트로키(세틸피리디늄염화물) 등). 함량 1.5mg(원문)
```

| 항목 | 내용 |
|---|---|
| 성분 | 세틸피리디늄염화물(대개 1.5mg) |
| 분류 | 일반의약품 |
| route | 구강국소(트로키, 입안 용해) |
| 작용 | 입안·목의 세균을 줄이는 살균 성분 |
| 주요 증상 | 인두염, 편도염, 구내염에 의한 염증 완화 |
| 선택 포인트 | 씹지 않고 천천히 녹이는 살균 트로키 |
| 주의 대상 | 3세 이하 영·유아, 황색4호 과민, 접촉성 습진 |

**효능·효과**
인두염, 편도염, 구내염에 의한 염증 완화에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 성인은 1회 1정(대개 1.5mg)씩 1일 4~5회 **씹거나 삼키지 말고 입안에서 천천히 녹여** 사용합니다. 약이 오래 입안에 머물도록 가능한 한 오래 물고 있습니다. 연령·증상에 따라 조절합니다.

**주의 대상**
3세 이하 영·유아는 사용하지 않습니다. 알레르기성 접촉성 습진, 황색4호 과민 경험자는 사용 전 약사 또는 의사와 상의하세요. 발진·구강점막 과민반응(두드러기·짓무름·작열감)이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 4 — 플루르비프로펜 트로키(인후염)

```text
group_key: drug_otc::single::oral_local::flurbiprofen::8.75mg::troche
status: drafted   grounding: mfds_easy_drug (모가프텐트로키(플루르비프로펜) 등). NSAID → §3.9 민감약효군 약사 프레이밍
```

| 항목 | 내용 |
|---|---|
| 성분 | 플루르비프로펜(대개 8.75mg) |
| 분류 | 일반의약품 |
| route | 구강국소(트로키, 입안 용해) |
| 작용 | 목의 통증·염증을 줄이는 비스테로이드성 소염진통(NSAID) 성분 |
| 주요 증상 | 인후염(목 아픔)의 단기 증상 완화 |
| 선택 포인트 | 목 통증을 국소적으로 완화하는 NSAID 트로키. **최대 3일 단기** |
| 주의 대상 | 아스피린·NSAID 과민·천식, 소화성궤양, 중증 심·간·신질환, 임신 후기, 12세 미만 |

**효능·효과**
인후염의 단기 증상 완화에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 성인 및 12세 이상은 1개를 **씹지 말고 입안에서 서서히 녹여** 복용하며, 국소 자극을 피하기 위해 입안에서 굴리면서 복용합니다. 필요 시 3~6시간 간격으로 **1일 최대 5개, 최대 3일간** 사용합니다. 다른 소염진통제(먹는·바르는)와 중복되지 않도록 확인합니다.

**주의 대상**
아스피린·다른 NSAID 과민, 이로 인한 천식·두드러기·기관지경련 경험자, 소화성궤양·출혈, 중증 심·간·신장애, 임신 후기 3개월 임부는 사용하지 않습니다. 12세 미만, 기관지천식·고혈압·혈액이상·출혈경향·고령자, 임신 초·중기, 항응고제(와파린)·메토트렉세이트 등 복용자는 사용 전 약사 또는 의사와 상의하세요. 어지러움·시각장애가 나타날 수 있어 운전·기계조작에 주의하고, 소화기 통증·흑색변·발진·호흡곤란이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 5 — 벤제토늄염화물 가글액

```text
group_key: drug_otc::single::oral_local::benzethonium_chloride::unspecified::gargle
status: drafted   grounding: mfds_easy_drug (케어가글액(벤제토늄염화물) 등)
```

| 항목 | 내용 |
|---|---|
| 성분 | 벤제토늄염화물 |
| 분류 | 일반의약품 |
| route | 구강국소(함수/가글) |
| 작용 | 입안 세균을 줄이는 살균·소독 성분 |
| 주요 증상 | 구강 내 소독, 발치·구강수술 후 소독·살균 |
| 선택 포인트 | 입안 소독용 함수제 |
| 주의 대상 | 30개월 이하 유아, 입안 짓무름이 심한 사람 |

**효능·효과**
구강 내 소독, 발치수술 또는 구강수술 후의 소독 및 살균에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 1회 적당량을 1일 2~3회 입안을 헹군 뒤 뱉습니다. 구강 내 소독 시에는 제품 안내대로 희석(예: 2.5배)합니다. **구강 세척용으로만 사용하고 삼키지 않습니다.** 발치 등 구강 상처는 혈병 형성이 저해될 수 있어 격렬한 세척을 피합니다.

**주의 대상**
30개월 이하 유아는 사용하지 않습니다. 소아, 입안이 심하게 헐은 사람은 사용 전 약사 또는 의사와 상의하고, 어린이는 보호자 지도 하에 사용합니다. 수일간 사용해도 개선이 없거나 자극감이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 7. 보류/제외 그룹과 사유

| 대상 | masters | 원문 | 작업상 분류 | 사유 |
|---|---:|---:|---|---|
| 벤지다민 가글/스프레이 | 18 | 8 | draft_ready | NSAID성 구강소염, 대표 살균 초안이 route 문구 커버, 성분별 초안 후속 |
| 포비돈요오드 가글 | 9 | 0 | hold_for_source | 원문 0(인후 스프레이 포비돈은 원문 보유·drafted) |
| 트로키 other(성분 name 없음) | 72 | ~22 | hold_for_source | 브랜드명만, content 개별 확인 필요(세틸피리디늄·티로트리신·비타민 추정) |
| 정통 구내염 도포제(트리암시놀론/폴리크레줄렌) | 미포착 | — | hold_for_pharmacist | name에 route 키워드 없어 넷에서 누락. 트리암시놀론=스테로이드 수동 큐레이션 |
| **구강용해/붕해필름(ODF 전신)** | **52** | 24 | **exclude** | 시메티콘·메클리진·로라타딘·멜라토닌·셀레늄·니코틴 = 경구 전신, oral_local 아님. 니코틴은 금연 트랙 |

## 8. registry 반영 제안 (직접 변경 아님)

| group_key | batch | status |
|---|---|---|
| `...chlorhexidine_gluconate::unspecified::gargle` | ORAL-LOCAL | drafted |
| `...povidone_iodine::unspecified::oral_spray` | ORAL-LOCAL | drafted |
| `...cetylpyridinium_chloride::1.5mg::troche` | ORAL-LOCAL | drafted |
| `...flurbiprofen::8.75mg::troche` | ORAL-LOCAL | drafted |
| `...benzethonium_chloride::unspecified::gargle` | ORAL-LOCAL | drafted |
| 벤지다민 가글/스프레이 | ORAL-LOCAL | draft_ready |
| 트로키 other 72 / 포비돈 가글 9 | ORAL-LOCAL | hold_for_source |
| 구강 ODF 전신 52 | — | exclude(oral systemic), 니코틴→SMOKING |

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
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-LOCAL-DRAFT-V1

수행:
- oral_local 후보 read-only 재확인
- SPD 원문 grounding
- 성분·제형 기준 group 후보 분리
- 대표 설명서 초안 5건 작성
- ODF 전신 제제 exclude 식별
- CHECK 작성

결과:
- oral_local 후보: 266 (원문 138) / ODF 전신 52 제외 → 실 oral_local ≈ 214 (STAGE1 219 근접)
- 작성 그룹: 5 (클로르헥시딘 가글·포비돈요오드 인후스프레이·세틸피리디늄 트로키·플루르비프로펜 트로키·벤제토늄 가글)
- 작성 초안 수: 5 (drafted)
- draft_ready: 벤지다민 가글/스프레이 18
- hold_for_source: 트로키 other 72 + 포비돈 가글 9 + 기타 = ~91
- hold_for_pharmacist: 정통 구내염 도포(트리암시놀론 등, 넷 누락)
- exclude: 구강 ODF 전신 52 (니코틴 필름 → 금연 트랙)
- 핵심: 트로키 다수가 플루르비프로펜(NSAID 인후통, 27)·세틸피리디늄. 구강용해/붕해필름은 oral_local 아님(전신). 클로르헥시딘 10일 이내·착색, 포비돈 갑상선·6세미만 주의 원문반영

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / 농도 창작 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-LOCAL-DRAFT-V1.md

다음 제안:
- BATCH-SMOKING-NICOTINE-PATCH (니코틴 패치 90 + 니코틴 ODF 필름 + 껌)
- BATCH-RECTAL-VAGINAL-MANUAL-DRAFT (좌제 46 + 질정 125)
- ORAL-LOCAL 후속(트로키 other 72 성분추출 / 구내염 도포제 route 재포착)
```
