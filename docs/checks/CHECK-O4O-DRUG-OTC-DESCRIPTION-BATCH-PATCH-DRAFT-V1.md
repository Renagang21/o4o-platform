# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 파스/첩부제 분류 + 대표 초안 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> DB 도구가 없던 다른 실행 환경의 preflight("도구 없음")는 이 방과 무관하다. 이 세션은 STAGE1·STAGE2·TOPICAL·본 batch를 실제 실행한 DB 접근 가능 환경이다(gcloud + cloud-sql-proxy + psql). 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1.md
```

누락(중단 사유 아님): `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`, `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`.

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db` (127.0.0.1:16533) + `psql` user `o4o_api`.
- 실행: **SELECT 전용**. 한글 정규식 UTF-8 `.sql` + `psql -f`.
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'`.

## 4. 파스/첩부제 후보 재확인

| 구분 | 수 |
|---|---:|
| 파스/첩부 patch 후보(name-route) | 2,283 |
| 원문(SPD content) 보유 | 1,497 (66%) |

### 4.1 제형 분포

| 제형 | 수 |
|---|---:|
| 카타플라스마(cataplasma) | 888 |
| 플라스타(plaster) | 842 |
| other | 225 |
| 파스(pas) | 189 |
| 패취/패치(patch) | 139 |

## 5. 성분·제형별 group 후보

| 성분군 | 총 | 원문 보유 | 성격 | 처리 |
|---|---:|---:|---|---|
| 냉·온감(살리실산메틸·멘톨·캡사이신 등, M02AC/AX) | 824 | 476 | 비단일 NSAID, 경증 진통·가려움 | 대표 초안 |
| 케토프로펜 | 333 | 293 | NSAID, **광과민 강함** | 대표 초안 |
| 플루르비프로펜 | 289 | 185 | NSAID | 대표 초안 |
| 디클로페낙 | 245 | 161 | NSAID, 16세미만 금지 | 대표 초안 |
| 펠비낙 | 104 | 75 | NSAID | draft_ready |
| 록소프로펜 | 95 | 75 | NSAID | draft_ready |
| 피록시캄 | 31 | 20 | NSAID | draft_ready |
| 인도메타신 | 30 | 17 | NSAID | draft_ready |
| 기타 NSAID(M02AA) | 55 | 44 | NSAID | draft_ready |
| **금연 니코틴 패치(N07BA01)** | 90 | 78 | 경피 흡수·금연 | **separate_track** |
| other(성분 미확정) | 187 | 73 | 브랜드명만 | hold_for_source |

### 5.1 함량은 명칭에만 부분 존재 (spec=매수)

- 케토프로펜 30mg(명칭 20건), 플루르비프로펜 40mg(명칭 3건), 나머지 대부분 명칭 미표기.
- **spec 첫 토큰은 파스 매수/용량이지 성분 함량이 아님**(STAGE1/STAGE2 확정 재확인) → 함량은 명칭·원문 값만, 없으면 `unspecified`, 창작 금지.
- 냉·온감은 성분이 제품명에 없고 브랜드명(파스류) → ATC(M02AC)로만 식별(점안 other와 동형). 개별 성분 조합은 원문·품목별 확인 필요.

## 6. 원문 grounding 방식

각 성분군 대표 제품의 `content`(효능·효과 / 용법·용량 / 사용상 주의사항 / 이상반응)를 직접 조회. 원문에 없는 함량·부착 시간·주의는 창작하지 않음.

핵심 확정(원문 근거):

- **케토프로펜 = 광과민 최강**: 사용 중 ~ 사용 후 **2주**까지 날씨와 무관하게 옥외활동을 피하고 부착부위를 옷·자외선차단제 등으로 가려 자외선 차단. 15세 미만·임신 6개월 이상 금지. 옥시벤존 교차과민.
- **디클로페낙**: 외상성 염증(테니스엘보우·타박·염좌), **최대 14일/3일 단기**, 16세 미만·소화궤양·관상동맥우회술 금지, 다른 NSAID(먹는·바르는) 병용 금지.
- **플루르비프로펜**: 퇴행성관절염·근육통, 1일 2회, 아스피린천식·임신 후기 금지.
- 공통: 상처·점막·눈 주위·습진 금지, 밀봉붕대법 금지, 아스피린 천식·임부 주의.

## 7. 작성한 대표 설명서 초안 목록

| # | group_key | status |
|---:|---|---|
| 1 | `drug_otc::single::patch::ketoprofen::30mg::plaster` | drafted |
| 2 | `drug_otc::single::patch::diclofenac::unspecified::cataplasma` | drafted |
| 3 | `drug_otc::single::patch::flurbiprofen::40mg::plaster` | drafted |
| 4 | `drug_otc::combo::patch::counterirritant_hotcold::unspecified::plaster` | drafted |

---

### 초안 1 — 케토프로펜 첩부(파스)

```text
group_key: drug_otc::single::patch::ketoprofen::30mg::plaster
status: drafted   grounding: mfds_easy_drug (트라스트 등). 함량 30mg(명칭)
```

| 항목 | 내용 |
|---|---|
| 성분 | 케토프로펜(대개 30mg/매) |
| 분류 | 일반의약품 |
| route | 첩부(피부) |
| 작용 | 통증과 염증을 줄이는 비스테로이드성 소염진통(NSAID) 성분 |
| 주요 증상 | 퇴행성관절염, 어깨관절주위염, 건염·건초염, 테니스엘보우, 근육통, 외상 후 붓기·통증 |
| 선택 포인트 | 관절·근육 통증에. **광과민이 강해 자외선 차단이 특히 중요** |
| 주의 대상 | 아스피린 천식, 15세 미만, 임신 6개월 이상, 옥시벤존 과민 |

**효능·효과**
퇴행성관절염, 어깨관절주위염, 건염·건초염, 건주위염, 상완골상과염(테니스엘보우 등), 근육통, 외상 후 종창·동통의 진통·소염에 사용합니다.

**사용 안내**
박리지를 떼어낸 뒤 제품의 허가된 용법에 따라 1일 2회 환부에 부착합니다. 상처·점막·눈 주위·무좀·백선 부위에는 붙이지 않고, 밀봉붕대법을 쓰지 않습니다. **이 약 사용 중과 사용 후 2주까지는 날씨와 관계없이 옥외활동을 피하고, 외출 시 부착부위를 옷·모자·선글라스·자외선차단제로 가려 자외선에 노출되지 않도록 합니다.**

**주의 대상**
아스피린 천식(NSAID로 인한 천식발작) 경험자, 15세 미만 소아, 임신 6개월 이상 임부, 옥시벤존·티아프로펜산·페노피브레이트 등 교차과민 경험자는 사용하지 않습니다. 1주일 사용해도 개선이 없거나 발적·발진·물집·광과민 증상이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 디클로페낙 첩부(카타플라스마)

```text
group_key: drug_otc::single::patch::diclofenac::unspecified::cataplasma
status: drafted   grounding: mfds_easy_drug (에폴민카타플라스마 등)
```

| 항목 | 내용 |
|---|---|
| 성분 | 디클로페낙(에폴아민 등) |
| 분류 | 일반의약품 |
| route | 첩부(피부) |
| 작용 | 통증과 염증을 줄이는 NSAID 성분 |
| 주요 증상 | 테니스엘보우, 타박상, 삠(염좌) 등 외상성 염증 |
| 선택 포인트 | 외상성 국소 통증·염증에. 단기 사용 |
| 주의 대상 | 16세 미만, 아스피린 천식, 소화궤양, 관상동맥우회술 환자 |

**효능·효과**
상완골상과염(테니스엘보우 등), 타박상 및 삠(염좌)과 같은 외상성 염증의 진통·소염에 사용합니다.

**사용 안내**
제품의 허가된 용법에 따라 부착합니다(상완골상과염 1일 2회 최대 14일, 타박·염좌 1일 1회 최대 3일 등 제품별 기간 준수, 가능한 단기간). 상처·점막·눈 주위·습진·화상 부위에는 붙이지 않고, 밀봉붕대법을 쓰지 않습니다. 이 약 사용 중에는 다른 디클로페낙·NSAID를 바르거나 복용하지 않습니다.

**주의 대상**
만 16세 미만, 아스피린·기타 NSAID 과민, 천식, 소화궤양, 관상동맥우회술 환자, 임신 1·2기 및 임신 5개월 경과 임부·수유부는 사용하지 않습니다. 권장기간 후에도 개선이 없으면 사용을 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 3 — 플루르비프로펜 첩부(플라스타)

```text
group_key: drug_otc::single::patch::flurbiprofen::40mg::plaster
status: drafted   grounding: mfds_easy_drug (안티푸라민40플라스타 등)
```

| 항목 | 내용 |
|---|---|
| 성분 | 플루르비프로펜(대개 40mg/매) |
| 분류 | 일반의약품 |
| route | 첩부(피부) |
| 작용 | 통증과 염증을 줄이는 NSAID 성분 |
| 주요 증상 | 퇴행성관절염, 어깨관절주위염, 건·건초염, 테니스엘보우, 근육통, 외상 후 붓기·통증 |
| 선택 포인트 | 관절·근육 통증에 성분·함량 기준으로 선택 |
| 주의 대상 | 아스피린 천식, 임신 후기, 기관지 천식·고령자 |

**효능·효과**
퇴행성관절염, 어깨관절주위염, 건·건초염, 상완골상과염(테니스엘보우 등), 근육통, 외상 후 종창·동통의 진통·소염에 사용합니다.

**사용 안내**
박리지를 떼어낸 뒤 제품의 허가된 용법에 따라 1일 2회 환부에 부착합니다. 적용 부위의 땀을 닦은 뒤 사용하고, 손상된 피부·점막·습진·발진 부위에는 붙이지 않습니다.

**주의 대상**
이 약 과민증, 아스피린 천식 경험자, 임신 후기는 사용하지 않습니다. 기관지 천식·임부·소아·고령자는 사용 전 상의하세요. 발적·발진·가려움·작열감·접촉피부염이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 4 — 냉·온감 첩부(살리실산메틸·멘톨 등)

```text
group_key: drug_otc::combo::patch::counterirritant_hotcold::unspecified::plaster
status: drafted   grounding: mfds_easy_drug (안티푸라민코인알파 등 M02AC). 성분은 품목별 조합 → combo, 성분군 레벨
```

| 항목 | 내용 |
|---|---|
| 성분 | 살리실산메틸·멘톨·캄파 등(제품별 조합) |
| 분류 | 일반의약품 |
| route | 첩부(피부) |
| 작용 | 피부를 시원하거나 따뜻하게 자극해 통증을 완화하는 진통·소염 첩부 |
| 주요 증상 | 삠·타박, 근육통·관절통·요통·어깨결림, 신경통, 가벼운 가려움·벌레물린 데 |
| 선택 포인트 | 가벼운 근육·관절 통증에. 성분 조합과 냉/온감은 제품별 확인 |
| 주의 대상 | 민감성 피부, 순환기 장애·당뇨, 12세 이하 소아, 임부·수유부 |

**효능·효과**
삠, 타박상, 근육통, 관절통, 골절통, 요통, 어깨결림, 신경통, 류마티스 통증의 진통·소염과 피부 가려움, 벌레물린 데, 동창에 사용합니다.

**사용 안내**
제품의 허가된 용법에 따라 1일 1~수 매를 질환 부위에 붙입니다. 상처·점막·눈 주위·습진·짓무른 부위·민감한 피부에는 사용하지 않습니다. 부착 부위를 싸매거나 외부 열·뜨거운 물에 노출하지 않으며, 물이 닿으면 강한 자극이 있을 수 있습니다. 같은 부위에 연속 사용을 피합니다.

**주의 대상**
이 약 과민증·알레르기 체질, 순환기 장애·당뇨병, 12세 이하 소아, 임부·수유부는 사용 전 상의하세요. 5~6일 사용해도 개선이 없거나 발진·가려움·자극이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요. 외용으로만 사용하고 삼키지 않습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 8. 금연 니코틴 패치 분리 결과

- `nicotine_smoking` (N07BA01) **90건(원문 78)**을 별도 트랙으로 분리. 이번 batch 본문 미작성.
- 사유: 경피 흡수·금연 보조라 진통소염 파스와 성격·주의(니코틴 의존·심혈관·금연 프로그램)가 완전히 다름 → `BATCH-SMOKING-NICOTINE-PATCH` 등 별도 큐레이션 권장.

## 9. 보류한 그룹과 사유

| 대상 | 총 | 원문 | 작업상 분류 | 사유 |
|---|---:|---:|---|---|
| 펠비낙/록소프로펜/피록시캄/인도메타신/기타 NSAID | 315 | 231 | draft_ready | 대표 NSAID 초안(케토프로펜·디클로페낙·플루르비프로펜)이 공통 주의 커버, 성분별 초안은 후속 |
| 금연 니코틴 패치 | 90 | 78 | separate_track | 별도 트랙 |
| other(성분 미확정 브랜드명) | 187 | 73 | hold_for_source | 원문에서 성분 확정 후 편입 |

공통 확정 기준(모든 NSAID 첩부):

- 광과민(특히 케토프로펜) — 사용 중~후 자외선 차단
- NSAID 중복 금지(먹는·바르는 소염진통제 병용 주의)
- 부착 시간·교체 간격·최대 사용기간 제품별 준수
- 상처·점막·눈 주위·습진 부위 금지, 밀봉붕대법 금지
- 아스피린 천식·임부(후기)·소아 연령 제한

## 10. registry 반영 제안

| group_key | batch | status |
|---|---|---|
| `...ketoprofen::30mg::plaster` | BATCH-PATCH | drafted |
| `...diclofenac::unspecified::cataplasma` | BATCH-PATCH | drafted |
| `...flurbiprofen::40mg::plaster` | BATCH-PATCH | drafted |
| `...counterirritant_hotcold::unspecified::plaster` | BATCH-PATCH | drafted |
| 펠비낙/록소프로펜/피록시캄/인도메타신 | BATCH-PATCH | draft_ready |
| 니코틴 패치 | BATCH-SMOKING-NICOTINE-PATCH | separate_track |

## 11. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write | 0 (SELECT 전용) |
| `product_candidate_description_drafts` 변경 | 0 |
| `shared_product_descriptions` 변경 | 0 (read-only) |
| `ProductDrugExtension` 변경 | 0 |
| `ProductMaster`/`ProductCandidate` 상태 변경 | 0 |
| canonical 승격 | 0 |
| registry 상태 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |

## 12. 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1

수행:
- 파스/첩부제 후보 read-only 재확인
- 성분·제형 기준 group 후보 분리
- 금연 니코틴 패치 분리
- e약은요/SPD 원문 grounding
- 대표 설명서 초안 4건 작성
- 보류 그룹 사유 기록

결과:
- 파스/첩부 후보: 2,283 (원문 1,497)
- group 후보(성분군): 냉온감824 / 케토프로펜333 / 플루르비프로펜289 / 디클로페낙245 / 펠비낙104 / 록소프로펜95 / 피록시캄31 / 인도메타신30 / 니코틴90
- 작성 그룹: 4 (케토프로펜·디클로페낙·플루르비프로펜·냉온감)
- separate_track(니코틴): 90
- draft_ready(기타 NSAID): 315
- hold_for_source: 187
- 핵심: spec=파스 매수(함량 아님), 케토프로펜 광과민 2주 차단, 디클로페낙 16세미만 금지·단기

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1.md

다음 제안:
- STAGE2b(점안 other 603 성분 추출)
- 또는 BATCH-EYE-ANTIALLERGY-CURATION
- 또는 BATCH-NASAL-DRAFT
```
