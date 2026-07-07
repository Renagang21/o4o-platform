# WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1

작성일: 2026-07-07
작업 성격: read-only grounding + 점안 신규 3그룹 대표 설명서 초안 작성
대상: STAGE2b에서 `new_group_candidate`로 도출된 점안 신규 3그룹
금지: DB write, draft insert, shared_product_descriptions 변경, ProductDrugExtension 변경, canonical 승격, registry 상태 변경, 매장 콘텐츠/QR/POP/태블릿 연결

## 0. 중요 지시

이번 요청은 **작업 요청서 실행**이다.

이번 단계의 범위는 STAGE2b에서 성분군이 확정된 점안 **신규 3그룹**(폴리소르베이트80 인공눈물 / 카보머 점안겔 / 고장성 5% 염화나트륨)을 대상으로 운영 DB read-only 원문 grounding 후 대표 설명서 초안을 작성하고 CHECK 문서를 작성하는 것까지다.

운영 DB에는 **SELECT만** 허용한다.

금지:

- DB write 금지
- `product_candidate_description_drafts` insert/update/upsert 금지
- `shared_product_descriptions` insert/update 금지
- `ProductDrugExtension` 변경 금지
- `ProductMaster` / `ProductCandidate` 상태 변경 금지
- canonical 승격 금지
- registry 상태 직접 변경 금지
- 매장 콘텐츠, QR, POP, 태블릿 연결 금지
- 처방의약품 설명 작성 금지

## 1. 작업 목적

STAGE2b(`CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1`)에서 점안 `other` 603 재분류 결과, 성분군이 원문·명칭으로 확정된 **신규 3그룹**이 도출되었다. 이 3그룹은 단일 성분 demulcent 계열로 성격이 명확하여 안전하게 초안 작성이 가능하다.

목표:

- STAGE2b `new_group_candidate` 3그룹을 SPD 원문 grounding으로 재확인한다.
- 각 그룹 대표 제품의 `content`(효능·효과 / 용법·용량 / 사용상 주의사항 / 이상반응 / 저장방법)를 근거로 대표 설명서 초안을 작성한다.
- 점안 route grounded 커버리지를 안전하게 확장한다.

핵심: 성분·효능이 명확한 단일 demulcent 3그룹만 작성하고, 복합·충혈·항알레르기 점안(STAGE2b hold_for_pharmacist 283)은 이번 범위에서 제외한다.

## 2. 배경 — STAGE2b 결과 (실측)

```text
점안 other: 603 (원문 보유 312)
재분류: reassigned_to_existing 5 / new_group_candidate 23 / hold_for_pharmacist 283 / hold_for_source 1 (+ 원문없음 291)
```

`new_group_candidate` 23건 세부:

| group_key(후보) | masters | 대표 제품 | 성격 |
|---|---:|---|---|
| `drug_otc::single::ophthalmic::polysorbate_80::unspecified::eye_drop` | 13 | 건아이·레비타·베타케어에이플러스점안액(폴리소르베이트80)(1회용) | 폴리소르베이트80 인공눈물(demulcent), 1회용 무보존제 다수 |
| `drug_otc::single::ophthalmic::carbomer::unspecified::eye_gel` | 8 | 리포직·리포직이디오·시카플루이드점안겔(카보머) | 카보머 점안**겔**(고점도 야간 보습), 제형=gel |
| `drug_otc::single::ophthalmic::sodium_chloride::5pct::eye_drop` | 2 | 뮤로128점안액5%(염화나트륨) | **고장성** 5% 식염(각막부종 제거) |

## 3. 기준 문서

먼저 확인한다.

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.10 비경구 route 점안 필수문구, §3.2 포장 vs 농도)
```

있으면 추가 확인한다.

```text
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
```

누락 문서는 CHECK에 기록하되 작업을 중단하지 않는다.

## 4. DB 접속 (STAGE1/STAGE2/STAGE2b 검증된 경로)

```text
cloud-sql-proxy-v2 netureyoutube:asia-northeast3:o4o-platform-db --port <free-port>
  (--token "$(gcloud auth print-access-token)")
psql host=127.0.0.1 user=o4o_api dbname=o4o_platform sslmode=disable  (SELECT 전용)
비밀번호: Cloud Run o4o-core-api env DB_PASSWORD (세션 환경변수로만, 파일 미저장)
한글 정규식: UTF-8 .sql + psql -f  (인라인 -c 한글은 CP949로 깨짐)
원문: shared_product_descriptions.content, source_type='mfds_easy_drug', join master_id
```

## 5. 작업 범위

### 이번 단계에서 한다

1. 신규 3그룹 대표 제품의 SPD `content`를 read-only로 조회한다.
2. 각 그룹 효능·효과 / 용법·용량 / 렌즈 정책 / 주의사항 / 이상반응을 원문에서 확정한다.
3. 성분·효능이 명확한 3그룹만 대표 설명서 초안을 작성한다.
4. CHECK 문서를 작성한다.

### 이번 단계에서 하지 않는다

- 기존 STAGE2 점안 6건(CMC 0.5%/1%, 트레할로스, 포비돈 2%, 히알루론산, PDRN)과 **중복 작성 금지**
- 복합 눈피로·충혈제거·항알레르기 점안제(STAGE2b hold_for_pharmacist 283) 본문 작성 금지 → 별도 큐레이션으로 유지
- reassigned_to_existing(CMC/PDRN 철자변형 5건) 신규 본문 작성 금지 → STAGE2 초안 재사용 표시만
- 농도·용법·연령 창작 금지
- DB 반영 금지

## 6. 작성 대상 3그룹 / 처리

| # | group_key | 성분 | 제형 | 농도 grounding | 처리 |
|---:|---|---|---|---|---|
| 1 | `drug_otc::single::ophthalmic::polysorbate_80::unspecified::eye_drop` | 폴리소르베이트80 | 점안액(다수 1회용) | 원문·명칭 미표기 → unspecified | 대표 초안 |
| 2 | `drug_otc::single::ophthalmic::carbomer::unspecified::eye_gel` | 카보머 | 점안**겔** | 미표기 → unspecified | 대표 초안 |
| 3 | `drug_otc::single::ophthalmic::sodium_chloride::5pct::eye_drop` | 염화나트륨(고장성) | 점안액 | 명칭 명시 **5%** | 대표 초안 |

주의:

- **농도 vs 병 용량 분리**: 점안 `specification` 첫 토큰은 병/용기 용량(mL)이지 농도가 아니다(STAGE2 확정). 농도는 명칭 명시분(5% NaCl)만 사용, 나머지 `unspecified`. **창작 금지**(가이드 §3.8).
- **카보머는 제형이 겔(eye_gel)** → group_key 제형 축이 점안액과 다름. 요약표 route 항목에 겔 제형·야간 보습 특성 반영.
- **고장성 5% 식염은 각막부종 제거 목적** → 등장성 세척·보습 식염(STAGE2 인공눈물류)과 효능 축이 다르므로 병합 금지(가이드 §3.10 과병합 금지). 효능/주의를 원문대로 기술.
- **1회용 무보존제** 제품이 다수(폴리소르베이트80) → 1회 사용·개봉 후 폐기 문구 원문 확인.

## 7. 원문 grounding 기준

설명서 초안은 반드시 대표 제품의 `shared_product_descriptions.content` 원문을 근거로 작성한다. 확인 항목:

```text
효능·효과
성분(명칭 괄호)
용법·용량 (방울·횟수는 제품별 상이 → "제품의 허가된 용법·용량을 따르세요" + 원문 근거)
콘택트렌즈 정책 (착용 중 사용 가부, 재착용 간격)
1회용/다회용 구분, 개봉 후 사용기간
사용 연령
금기·주의 대상
이상반응
```

원문에 없는 농도·사용기간·연령은 창작하지 않는다. 불명확하면 `unspecified` 또는 `hold_for_source`.

## 8. 설명서 작성 형식 (가이드 §3.10 비경구 route)

경구 §5 대비 변경점: 요약표에 **route(점안)** 항목, "복용 안내" → **"사용 안내"**, 하단 GMP "성분 기준 선택" 문구 유지.

```md
## [성분명] [농도(있으면)] [점안제/점안겔]

| 항목 | 내용 |
|---|---|
| 성분 |  |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 |  |
| 주요 증상 |  |
| 선택 포인트 |  |
| 주의 대상 |  |

**효능·효과**
...

**사용 안내**
제품의 허가된 용법·용량에 따라 점안합니다. (렌즈 정책·1회용/개봉 후 기간·다른 점안제 간격 원문 반영)

**주의 대상**
...

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.
```

point별 필수 문구(가이드 §3.10 점안): 렌즈 착용 시 주의 · 개봉 후 사용기간 · 다른 점안제와 간격 · 용기 끝 오염 방지. 고장성 5% 식염은 **자극감·각막부종 목적**과 과다사용 주의를 명시.

## 9. 작업상 분류 기준 (CHECK 전용, DB 상태값 아님)

| 작업상 분류 | 의미 |
|---|---|
| drafted | 원문 근거 충분 → 초안 작성 |
| draft_ready | 성분군 명확하나 이번 batch 미작성 |
| hold_for_source | 원문 없음·불명확 |
| reused_from_stage2 | 기존 STAGE2 초안 재사용(CMC/PDRN 철자변형) |

## 10. CHECK 문서

작성 파일:

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1.md
```

포함 항목:

1. 작업 일시
2. 사용한 기준 문서
3. DB read-only 확인
4. 신규 3그룹 후보 재확인 (masters·원문·대표 제품)
5. 원문 grounding 방식
6. 작성한 대표 설명서 초안 (3건)
7. 초안별 source 근거
8. STAGE2 6건과 중복 없음 확인
9. 제외 유지(복합/충혈/항알레르기 283) 확인
10. registry 반영 제안
11. 금지사항 준수 확인

## 11. 성공 기준

- 신규 3그룹(폴리소르베이트80 / 카보머 겔 / 고장성 5% 식염) 원문 grounding 재확인
- 3그룹 대표 설명서 초안 작성 (원문 부족 시 축소 사유 기록)
- 병 용량과 실제 농도 구분(5% 명칭만 사용)
- 카보머 제형(겔)·고장성 식염 효능 축 분리 반영
- 복합/충혈/항알레르기 283 미작성(별도 큐레이션 유지)
- STAGE2 6건과 중복 0
- 농도 창작 0
- DB write 0
- canonical 승격 0

## 12. 완료 보고 형식

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1

수행:
- 신규 3그룹 read-only 원문 grounding 재확인
- 대표 설명서 초안 작성 (폴리소르베이트80 / 카보머 겔 / 고장성 5% 식염)
- STAGE2 6건 중복 없음 확인
- 복합/충혈/항알레르기 283 제외 유지

결과:
- 작성 그룹: 3
- 작성 초안 수:
- 농도 grounding: 5% NaCl(명칭) / 폴리소르베이트80·카보머 unspecified
- 제외 유지(hold_for_pharmacist): 283

금지사항:
- DB write 0
- product_candidate_description_drafts 변경 0
- shared_product_descriptions 변경 0
- ProductDrugExtension 변경 0
- canonical 승격 0
- registry 상태 변경 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1.md

다음 제안:
- BATCH-EYE-ANTIALLERGY/COMBO-CURATION (복합 눈피로·충혈·항알레르기 283 약사 검토)
- 또는 BATCH-ORAL-LOCAL-DRAFT (트로키·가글 219)
- 또는 BATCH-RECTAL-VAGINAL-MANUAL-DRAFT
```

## 13. 후속 WO 후보

```text
WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ANTIALLERGY-COMBO-CURATION-V1
  — STAGE2b hold_for_pharmacist 283(복합 눈피로/충혈/항알레르기) 약사 검토성 큐레이션

WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-DB-APPLY-DESIGN-V1
  — 본 3그룹 + STAGE2 6그룹 초안의 product_candidate_description_drafts 적재 설계(실 write 별도)
```
