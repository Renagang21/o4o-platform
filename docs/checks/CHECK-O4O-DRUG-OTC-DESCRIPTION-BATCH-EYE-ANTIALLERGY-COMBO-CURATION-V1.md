# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ANTIALLERGY-COMBO-CURATION-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ANTIALLERGY-COMBO-CURATION-V1`

이번 CHECK는 **운영 DB read-only 원문 기반 점안 항알레르기·충혈제거·복합 눈피로 성분군 큐레이션 dry-run** 결과다. 설명서 본문 대량 작성·DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> DB 도구가 없던 다른 실행 환경의 preflight("gcloud/proxy/psql 없음")는 이 방과 무관하다. 이 세션은 STAGE1·STAGE2·STAGE2b·Additional-Demulcent·PATCH·NASAL을 실제 실행하고 커밋한 DB 접근 가능 환경이다. 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ADDITIONAL-DEMULCENT-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.9 민감 약효군 프레이밍, §3.10 점안 route)
```

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2` (netureyoutube:asia-northeast3:o4o-platform-db, 127.0.0.1, OAuth 액세스 토큰) + `psql` user `o4o_api`.
- 실행: **SELECT 전용**. 한글 정규식 UTF-8 `.sql` + `psql -f`. HTML 태그·`&nbsp;` 제거 후 파싱.
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'`, join `master_id`.
- **핵심 제약 재확인**: OTC 점안 `product_drug_extensions.active_ingredients`·`ingredient_summary` = **0 non-null**(전량 NULL). 조성은 ext 필드에 없음 → 성분은 **제품명 + content**로만 파생.

## 4. 대상 재확인 — 점안 약사 검토/미해결 잔여 (전체 landscape)

WO §3 target(STAGE2b `hold_for_pharmacist` 283)을 재확인하고, 큐레이션 완결성을 위해 **STAGE2에서 name으로 식별된 항알레르기 134·충혈제거 9까지 포함한 점안 잔여 전체 427**를 함께 정리한다(STAGE2b route 잔여량 §10: hold_for_pharmacist 426 + unclear 1).

| 구성 | masters | 원문(SPD) | 출처 |
|---|---:|---:|---|
| 항알레르기(name 식별) | 134 | 84 | STAGE2 anti_allergy |
| 충혈제거(name 식별) | 9 | 0 | STAGE2 decongestant |
| 복합 눈피로(브랜드-only, other 파생) | 219 | 219 | STAGE2b |
| 충혈/복합(브랜드-only) | 40 | 40 | STAGE2b |
| 항알레르기(브랜드-only, 성분 name 없음) | 21 | 21 | STAGE2b |
| NAAGA | 3 | 3 | STAGE2b |
| 성분 미상 인공눈물 | 1 | 1 | STAGE2b(unclear) |
| **합계** | **427** | **368** | |

> WO §3의 283 = 복합 219 + 충혈 40 + 항알레르기-브랜드 21 + NAAGA 3. 본 CHECK는 이 283에 name-식별 항알레르기 134·충혈 9를 더해 점안 항알레르기/충혈/복합 전체를 종결 큐레이션한다.

## 5. 성분군 분류 (원문 grounding)

### 5.1 항알레르기 — 성분 name 확정(단일성분)

| 성분군 | masters | SPD | 단일/복합 | 원문 핵심 |
|---|---:|---:|---|---|
| 케토티펜푸마르산염 (ketotifen) | 114 | 73 | 단일 | 알러지성 결막염. 성인 1회 1적 1일 2~4회, 유·소아 의사처방, **1세 미만 금기**, 졸음·시야흐림 운전주의, **소프트렌즈 착용 중 금지·15분 후 착용**, 다른 점안제 5분 간격, 개봉 후 4주, 1주 미개선 시 중지 |
| 크로모글리크산나트륨 (cromoglicate) | 20 | 11 | 단일 | 봄철 각막염·결막염, 알레르기성 결막염. 1회 1~2방울 1일 4회, 벤잘코늄 과민 금기, 임부 상담, **소프트렌즈 착용 회피**, 개봉 후 1개월 |

> `올로파타딘·레보카바스틴·아젤라스틴·에피나스틴` OTC 점안 = **0건**(전량 전문의약품). OTC 항알레르기 단일성분 점안은 **케토티펜·크로모글리크산 2군뿐**.

### 5.2 충혈제거 — 성분 name 확정

| 성분군 | masters | SPD | 원문 |
|---|---:|---:|---|
| 테트라히드로졸린 (tetrahydrozoline) | 9 | **0** | 원문 없음 |

> `나파졸린` 단일 OTC 점안 = 0(복합제로만 존재). 충혈제거 단일 = 테트라히드로졸린 9뿐이며 **원문 0**.

### 5.3 복합·브랜드-only (성분 조성 원문 미기재)

STAGE2b 확정대로 e약은요 `content`에는 조성(성분) 섹션이 없어 브랜드-only 점안의 조성 추출 불가. 효능 signature로만 기능군 분류:

| 기능군 | masters | 대표 효능 signature | 조성 |
|---|---:|---|---|
| 복합 눈피로 | 219 | 눈의 피로·결막충혈·자외선 염증·눈꺼풀 짓무름·하드렌즈 불쾌감·가려움·침침함 | 혈관수축제+항히스타민+비타민+아미노산 등 다성분(추정, content 미기재) |
| 충혈/복합 | 40 | 충혈 중심 | 혈관수축제 함유(추정) |
| 항알레르기-브랜드 | 21 | 알레르기·가려움 | 항히스타민 계열(추정, 성분 name 없음) |
| NAAGA | 3 | 나박점안액(엔-아세틸아스파틸글루타민산나트륨) | 명칭 성분 확정 |

## 6. 큐레이션 결과 (작업상 분류)

| 작업상 분류 | masters | 세부 | 근거 |
|---|---:|---|---|
| **curation_ready** | **134** | 케토티펜 114 + 크로모글리크산 20 | 단일성분·성분 확정·원문 보유. 자동 초안 가능(단 §3.9 민감약효군 → 약사 상담 프레이밍 필수) |
| **new_group_candidate** | **3** | NAAGA | 명칭 성분 확정, 항알레르기, 소량 → 후속 draft 후보 |
| **needs_pharmacist_review** | **280** | 복합 눈피로 219 + 충혈/복합 40 + 항알레르기-브랜드 21 | **조성이 원문에 없어 자동 작성 불가**. 다성분·혈관수축제·연령·렌즈·병용·반동성 주의 → 약사 검토 유지 |
| **hold_for_source** | **10** | 테트라히드로졸린 9(원문 0) + 성분 미상 인공눈물 1 | 원문 없음 → 성분·용법 근거 부족 |
| **exclude** | **0** | — | 세안액은 이전 단계 제외 |
| **합계** | **427** | | |

## 7. 자동 작성 가능 그룹 (curation_ready)

| group_key | masters | SPD | 상태 |
|---|---:|---:|---|
| `drug_otc::single::ophthalmic::ketotifen_fumarate::unspecified::eye_drop` | 114 | 73 | curation_ready — 후속 draft batch 대상 |
| `drug_otc::single::ophthalmic::sodium_cromoglicate::unspecified::eye_drop` | 20 | 11 | curation_ready — 후속 draft batch 대상 |

작성 시 필수 프레이밍(가이드 §3.9·§3.10 점안):

- 질환명(알레르기성 결막염·봄철 각결막염) 회피하지 않음, 대신 **약사 상담 필요 대상 명시**.
- **소프트콘택트렌즈 착용 중 금지·재착용 간격**(케토티펜 15분), 개봉 후 사용기간(케토티펜 4주/크로모글리크산 1개월), 졸음·시야흐림 운전주의(케토티펜), 다른 점안제 간격.
- 1세 미만 금기(케토티펜), 임부 상담. 1주 미개선 시 중지.
- 농도는 원문·명칭 값만, 없으면 `unspecified`(창작 금지).

> 본 batch는 큐레이션 단계이므로 **본문 초안은 작성하지 않는다**(WO §5). 후속 `BATCH-EYE-ANTIALLERGY-DRAFT`에서 위 2군 draft.

## 8. 약사 검토 유지 그룹 (needs_pharmacist_review) — 280

- **복합 눈피로 219 / 충혈-복합 40 / 항알레르기-브랜드 21**: 브랜드명만 있고 조성이 `content`에 없어 성분·함량 확정 불가. 혈관수축제(장기사용·반동성 결막충혈·녹내장·심혈관)·항히스타민(졸음·연령)·비타민·아미노산 조합이 흔해 자동 초안 금지(가이드 §3.9). **약사 검토 유지**.
- 해소 경로는 설명서 작성이 아니라 **조성 원천 확보**(허가 상세·품목기준코드 주성분). 원천 확보 시 성분군 재분류 후 curation 승격 가능.

## 9. 새 group 후보 (new_group_candidate)

| group_key | masters | 비고 |
|---|---:|---|
| `drug_otc::single::ophthalmic::naaga_sodium::unspecified::eye_drop` | 3 | 엔-아세틸아스파틸글루타민산나트륨(항알레르기), 명칭 성분 확정. 원문 grounding 후 소규모 draft 가능 |

## 10. 분리 기준 (요약)

- 성분이 다르면 분리(케토티펜 ≠ 크로모글리크산 ≠ NAAGA).
- 단일성분(성분 확정) vs 복합(조성 불명)은 처리 경로가 다름 → curation_ready vs needs_pharmacist_review.
- 충혈제거 단일(테트라히드로졸린)은 원문 없음 → hold_for_source.
- S01(안과) ATC 동일해도 성분군 다르면 병합 금지(과병합 방지, 가이드 §3.10).

## 11. registry 반영 제안 (직접 변경 아님)

| group_key | batch | status |
|---|---|---|
| `...ketotifen_fumarate::unspecified::eye_drop` | EYE-ANTIALLERGY-COMBO | curation_ready |
| `...sodium_cromoglicate::unspecified::eye_drop` | EYE-ANTIALLERGY-COMBO | curation_ready |
| `...naaga_sodium::unspecified::eye_drop` | EYE-ANTIALLERGY-COMBO | new_group_candidate |
| `...tetrahydrozoline::unspecified::eye_drop` | EYE-ANTIALLERGY-COMBO | hold_for_source |
| 복합 눈피로/충혈/항알레르기-브랜드 280 | EYE-ANTIALLERGY-COMBO | needs_pharmacist_review |

## 12. 점안(ophthalmic) 트랙 종결 상태

| 구분 | group/건수 | 상태 |
|---|---|---|
| grounded 초안 (STAGE2 6 + Additional 3) | 9그룹 | drafted |
| curation_ready (본 batch) | 케토티펜·크로모글리크산 2그룹(134) | 후속 draft |
| new_group_candidate | NAAGA(3) | 후속 draft |
| needs_pharmacist_review | 복합/충혈/항알레르기-브랜드 280 | 약사 검토(조성 원천 필요) |
| hold_for_source | 테트라히드로졸린 9 + unclear 1 + 원문없음 291 = **301** | **원천 자료 확보 문제**(설명서 문제 아님) → 별도 Source Audit 트랙 |

> **점안 트랙 사실상 종결**. 남은 것은 (a) 약사 검토 유지 280(조성 원천), (b) 원문 없음 301 — 둘 다 **원천 자료 확보 문제**이며 설명서 작성으로 해결되지 않으므로 `BATCH-EYE-SOURCE-GAP-AUDIT` 등 별도 트랙 권장.

## 13. 금지사항 준수 확인

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
| 설명서 본문 작성 | 0 (큐레이션만) |
| 농도 창작 | 0 |

## 14. 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ANTIALLERGY-COMBO-CURATION-V1

수행:
- hold_for_pharmacist 283 재확인 + 점안 잔여 전체 427 종결 큐레이션
- SPD 원문 grounding (케토티펜·크로모글리크산 단일성분 확정)
- 성분군 재분류
- 자동 작성 가능(curation_ready) / 약사 검토 유지(needs_pharmacist_review) 식별

결과:
- 대상: 427 (WO target 283 포함)
- 항알레르기: 케토티펜 114 + 크로모글리크산 20 + 브랜드-only 21 + NAAGA 3
- 충혈제거: 테트라히드로졸린 9(원문0) + 브랜드 충혈/복합 40
- 복합 눈피로: 219
- NAAGA: 3
- curation_ready: 134 (케토티펜 114 + 크로모글리크산 20)
- needs_pharmacist_review: 280 (복합219 + 충혈40 + 항알레르기-브랜드21)
- new_group_candidate: 3 (NAAGA)
- hold_for_source: 10 (테트라히드로졸린 9 + unclear 1)
- exclude: 0
- 핵심: OTC 점안 항알레르기 단일=케토티펜·크로모글리크산 2군뿐(올로파타딘 등 전량 RX). 조성이 content에 없어 브랜드-only 복합280은 자동작성 불가→약사검토 유지. 점안 트랙 종결, 잔여는 원천확보 문제

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / 본문 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-ANTIALLERGY-COMBO-CURATION-V1.md

다음 제안:
- BATCH-EYE-ANTIALLERGY-DRAFT (케토티펜·크로모글리크산 2군 초안, 약사 프레이밍)
- BATCH-ORAL-LOCAL-DRAFT (트로키·가글 219)
- BATCH-RECTAL-VAGINAL-MANUAL-DRAFT
- BATCH-SMOKING-NICOTINE-PATCH
- EYE-SOURCE-GAP-AUDIT (needs_review 280 조성 원천 + 원문없음 301)
```
