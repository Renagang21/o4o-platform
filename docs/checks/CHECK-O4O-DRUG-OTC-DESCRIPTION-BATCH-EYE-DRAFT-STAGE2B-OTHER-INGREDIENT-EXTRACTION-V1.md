# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1`

이번 CHECK는 **운영 DB read-only 원문 기반 점안제 `other`(브랜드명만) 성분 추출·재분류 dry-run** 결과다. DB write·설명서 본문 대량 작성·canonical 승격·registry 상태 변경은 하지 않았다.

> DB 도구가 없던 다른 실행 환경의 preflight("gcloud/proxy/psql 없음")는 이 방과 무관하다. 이 세션은 STAGE1·STAGE2·PATCH·NASAL을 실제 실행한 DB 접근 가능 환경이다(gcloud + cloud-sql-proxy-v2 + psql). 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.7 성분 표기변형 정규화 / §3.10 비경구 route)
```

`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 존재하나 본 단계에서 상태 변경하지 않음(반영 제안만 §11).

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2` (netureyoutube:asia-northeast3:o4o-platform-db, 127.0.0.1:16545, OAuth 액세스 토큰) + `psql` user `o4o_api`, db `o4o_platform`.
- 인증: `gcloud auth print-access-token`. DB 비밀번호는 Cloud Run `o4o-core-api` env(`DB_PASSWORD`)에서 세션 환경변수로만 사용(디스크 미저장).
- 실행: **SELECT 전용**. 한글 정규식은 UTF-8 `.sql` + `psql -f`(인라인 `-c` 한글은 CP949로 깨짐 — 재확인).
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'`, join key `master_id`. HTML 태그·`&nbsp;`는 `regexp_replace`로 제거 후 파싱.

## 4. other 603 / 원문 보유 312 재확인

STAGE2 정의(§5)로 재조회 — 실측 정확 일치:

| 구분 | 수 |
|---|---:|
| 점안 name-route total | 1,392 |
| 점안 원문(SPD) 보유 | 913 |
| `other`(브랜드명만, 성분 name 미표기) total | **603** |
| `other` 원문(SPD content) 보유 | **312** |

`other` 정의: `name ~ '(점안|안약|인공눈물)'` AND NOT(히알루론/카르복시메틸셀룰로·카복시메틸/트레할로/포비돈/PDRN/항알레르기/충혈제거 keyword) AND NOT(세안).

## 5. 성분 추출 방식 및 핵심 관측

WO §6 우선순위(① content 성분/효능 문구 ② 제품명 괄호 성분 ③ atc 보조)로 추출. **실측 결과 핵심 2가지:**

1. **e약은요 `content`에는 조성(성분) 섹션이 없다.** 본문은 효능·효과 / 용법·용량 / 사용상 주의사항 / 이상반응 / 저장방법 구조이며, 성분명이 본문에 명시되는 경우는 드물다(312 중 조성 성분 signal은 극소수, glycerin/PEG 계열 언급 23건 수준). → **content 본문만으로 성분 확정은 대부분 불가**.
2. **성분 확정의 실질 근거는 제품명 괄호**다. 그러나 `other`는 정의상 브랜드명 위주라 괄호 성분이 있는 것이 소수이고, `(순)/(쿨)/(쿨하이)/(라이트)`는 냉감(청량감) 변형일 뿐 성분이 아니다.

→ 따라서 재분류는 (a) **제품명 괄호 성분**(철자변형 포함) 확정분과 (b) **효능·효과 signature 기반 기능군 분류**(복합 눈피로 / 충혈제거 / 항알레르기 / 인공눈물)를 병행했다. 성분이 확정되지 않는 복합제는 성분군 승격 대신 **약사 검토 트랙**으로 분리한다.

### 5.1 효능·효과 signature 실측 (312)

| 기능군 signature | masters |
|---|---:|
| 복합 눈피로(눈의 피로·결막충혈·자외선 염증·눈꺼풀 짓무름·하드렌즈 불쾌감·가려움·침침함) | 219 |
| 충혈 중심(충혈제거/복합) | 40 |
| 항알레르기(알레르기·가려움) | 21 + NAAGA 3 |
| 순수 인공눈물(성분 미상) | 1 |

> 대표 원문 예(`청나점안액`): "효능·효과 — 눈의 피로, 결막충혈, 수영 후 눈의 불쾌감, 자외선 및 기타광선에 의한 눈의 염증, 눈꺼풀의 짓무름, 하드콘택트렌즈 착용 시 불쾌감, 눈의 가려움, 눈의 침침함". → 성분 미기재이나 효능 signature상 **복합 눈피로 점안(다성분: 혈관수축제+항히스타민+비타민+아미노산 계열)**. 소프트렌즈 착용 중 금지.

## 6. 재분류 결과 집계 (WO §7 작업상 분류)

| 작업상 분류 | masters | 세부(원문 근거) |
|---|---:|---|
| **reassigned_to_existing** | **5** | CMC 2 + PDRN 3 (STAGE2 keyword가 놓친 **철자변형**) |
| **new_group_candidate** | **23** | 폴리소르베이트80 13 + 카보머 점안겔 8 + 고장성(5%) 염화나트륨 2 |
| **hold_for_pharmacist** | **283** | 복합 눈피로 219 + 충혈/복합 40 + 항알레르기 21 + NAAGA 3 |
| **hold_for_source** | **1** | 성분 미상 인공눈물 1 (효능만 인공눈물, 성분 확정 불가) |
| **exclude** | **0** | 세안액은 name 단계에서 이미 제외 |
| 합계(원문 보유 312) | **312** | ✓ |
| (원문 없음, 재분류 밖) | 291 | `other` 603 − 312, hold_for_source 유지 |

**결론: STAGE2 가설(other 원문에서 성분 추출 시 CMC/히알루론산/PDRN/demulcent로 상당수 재흡수) 은 실측에서 기각.** 원문 보유 312 중 **91%(283)가 복합 눈피로·충혈제거·항알레르기 점안**으로, 성분이 content에 없어 성분군 승격 불가하며 약사 검토 트랙 대상이다. 순수 단일성분 demulcent 편입은 **9%(28건: reassign 5 + new_group 23)**에 그쳤다.

## 7. 기존 성분군 흡수 건수 (reassigned_to_existing)

| 기존 group | 흡수 masters | 대표 제품 | 흡수 사유 |
|---|---:|---|---|
| `...carboxymethylcellulose_sodium` | 2 | 원타임프레쉬점안액(카르복시메칠셀룰로오스나트륨) | **철자변형** 카르복시메**칠**(STAGE2는 메**틸**만 매칭) |
| `...polydeoxyribonucleotide_sodium` | 3 | 아이오쿨리뉴피디알엔점안액(폴리데옥시리뉴클레오티드나트륨) | **철자변형** 폴리데옥시리**뉴**클레오티드 / "피디알엔"(STAGE2는 디옥시리**보**만 매칭) |

> STAGE2 초안(CMC·PDRN)을 **그대로 재사용 대상**으로 표시만 한다(본문 신규 작성 아님, WO §9). 가이드 §3.7 정규화 사전에 `메칠↔메틸`, `리뉴클레오티드↔리보뉴클레오티드`, `피디알엔↔PDRN` 표기변형을 추가 제안(§11).

## 8. 신규 성분군 group 후보 (new_group_candidate)

| group_key(후보) | masters | 대표 제품 | 성격 |
|---|---:|---|---|
| `drug_otc::single::ophthalmic::polysorbate_80::unspecified::eye_drop` | 13 | 건아이·레비타·베타케어에이플러스점안액(폴리소르베이트80)(1회용) | 폴리소르베이트80 인공눈물(demulcent), 1회용 무보존제 다수 |
| `drug_otc::single::ophthalmic::carbomer::unspecified::eye_gel` | 8 | 리포직·리포직이디오·시카플루이드점안겔(카보머) | 카보머 점안**겔**(고점도 야간 보습, 제형=gel → eye_drop과 분리) |
| `drug_otc::single::ophthalmic::sodium_chloride::5pct::eye_drop` | 2 | 뮤로128점안액5%(염화나트륨) | **고장성** 5% 식염(각막부종 제거) — 인공눈물(등장성 세척)과 효능 축 상이, 별도 그룹 |

- 3종 모두 원문·명칭에서 성분 확정. 농도는 명칭 명시분만 사용(5% NaCl), 나머지 `unspecified`(창작 금지, 가이드 §3.8).
- 카보머는 제형이 **점안겔(eye_gel)**이라 dosage_form 축이 점안액과 다름 → group_key 제형 분리.
- 고장성 5% NaCl은 등장성 세척·보습 식염과 **효능이 다름(각막부종 vs 세척)** → S01XA20/식염이라도 병합 금지(가이드 §3.10 과병합 금지).
- 본 batch에서 **본문 초안은 작성하지 않는다**(WO 범위=재분류). 후속 draft batch 대상.

## 9. 분리 트랙(hold_for_pharmacist) 건수

| 분리 트랙 | masters | 근거 | 후속 |
|---|---:|---|---|
| 복합 눈피로 점안(다성분) | 219 | 효능 signature 복합(피로·충혈·염증·짓무름·가려움), 성분 content 미기재 | BATCH-EYE-COMBO-FATIGUE-CURATION(약사 검토) |
| 충혈제거/복합 | 40 | 효능 충혈 중심, 혈관수축제 함유 추정 | BATCH-EYE-ANTIALLERGY-CURATION 또는 충혈 별도 |
| 항알레르기 | 21 | 효능 알레르기·가려움 | BATCH-EYE-ANTIALLERGY-CURATION |
| 항알레르기 NAAGA | 3 | 나박점안액(엔-아세틸아스파틸글루타민산나트륨) — 명칭 성분 확정 | BATCH-EYE-ANTIALLERGY-CURATION |
| 소계 | **283** | | |

> 복합 눈피로·충혈 점안은 혈관수축제(테트라히드로졸린 등)+항히스타민+비타민+아미노산 조합이 흔해 연령·장기사용·녹내장·렌즈·병용 주의가 필요하고, 성분 조합이 content에 없어 자동 초안 불가(가이드 §3.9·§3.10). 전량 약사 검토 트랙.

## 10. 점안제 route 잔여량 재계산

| 구분 | masters | 비고 |
|---|---:|---|
| 점안 전체 | 1,392 | STAGE1/STAGE2 확정 |
| ① grounded 성분군(STAGE2 6그룹 대상) | ~646 | CMC 441 / 트레할로스 122 / 포비돈 25 / 히알루론산 6(name) / PDRN 52 |
| ② STAGE2b 신규 grounded 편입 | **28** | reassign 5 + new_group_candidate 23 |
| ③ hold_for_pharmacist(약사 검토 트랙) | **426** | STAGE2 anti_allergy 134 + decongestant 9 + STAGE2b 283 |
| ④ hold_for_source(원문 없음/성분 불명) | **292** | other no-SPD 291 + unclear 1 |
| 합(①+②+③+④) | 1,392 | ✓ 정합 |

- **STAGE2b 효과**: `hold_for_source`였던 other 603 중 **312를 재분류** → grounded +28, 약사 검토 트랙 +283, 원문없음 잔류 291(+1). 순수 미분류 잔여(hold_for_source)는 603 → **292**로 축소.
- 향후 draftable 신규 그룹: 폴리소르베이트80 / 카보머겔 / 고장성식염 3종(28 masters).

## 11. registry 반영 제안 (직접 변경 아님)

| group_key | batch | status | 비고 |
|---|---|---|---|
| `...carboxymethylcellulose_sodium::*::eye_drop` | STAGE2b | reassigned | STAGE2 초안 재사용(+2), 철자변형 흡수 |
| `...polydeoxyribonucleotide_sodium::unspecified::eye_drop` | STAGE2b | reassigned | STAGE2 초안 재사용(+3) |
| `...polysorbate_80::unspecified::eye_drop` | STAGE2b | new_group_candidate | 후속 draft |
| `...carbomer::unspecified::eye_gel` | STAGE2b | new_group_candidate | 제형=gel |
| `...sodium_chloride::5pct::eye_drop` | STAGE2b | new_group_candidate | 고장성, 각막부종 |
| 복합 눈피로/충혈/항알레르기(NAAGA 포함) | BATCH-EYE-ANTIALLERGY/COMBO | hold_for_pharmacist | 283, 약사 검토 |
| 성분 표기변형 사전 | 가이드 §3.7 | 제안 | 메칠↔메틸 / 리뉴클레오티드↔리보뉴클레오티드 / 피디알엔↔PDRN |

## 12. 금지사항 준수 확인

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
| 설명서 본문 신규 작성 | 0 (재분류만; reassign은 STAGE2 초안 재사용 표시) |
| 농도 창작 | 0 (명칭·원문 값만, 없으면 unspecified) |

## 13. 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1

수행:
- other 603 read-only 재확인 (원문 보유 312)
- SPD content 원문 + 제품명 괄호에서 성분 추출
- 성분군별 재분류 (reassign / new_group / hold_pharmacist / hold_source / exclude)
- 기존 성분군 흡수 / 신규 group 후보 도출
- 분리 트랙(복합 눈피로/충혈/항알레르기) 식별
- 점안 route 잔여량 재계산

결과:
- other 총 / 원문 보유: 603 / 312
- reassigned_to_existing: 5 (CMC 2 + PDRN 3, 철자변형 누락분)
- new_group_candidate: 23 (폴리소르베이트80 13 + 카보머겔 8 + 고장성5%식염 2)
- hold_for_pharmacist: 283 (복합눈피로 219 + 충혈/복합 40 + 항알레르기 21 + NAAGA 3)
- hold_for_source: 1 (312 내) + 291 (원문없음) = 292
- exclude: 0
- 점안 route 잔여량(갱신): grounded ~646 + STAGE2b 28 / hold_pharmacist 426 / hold_source 292 = 1,392
- 핵심: content에 조성 섹션 없음→성분추출은 명칭 괄호 의존, other 91%가 복합/충혈/항알레르기(약사검토), demulcent 재흡수 9%뿐. STAGE2 대량흡수 가설 기각. 철자변형(메칠/리뉴클레오티드/피디알엔) 누락 확인→정규화 사전 보강 제안

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / 본문 0 / 농도창작 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md

다음 제안:
- 신규 3그룹(폴리소르베이트80/카보머겔/고장성식염) draft batch
- 또는 BATCH-EYE-ANTIALLERGY-CURATION (복합 눈피로·충혈·항알레르기 283 약사 검토)
- 또는 BATCH-TOPICAL-LOW-RISK-DRAFT
```
