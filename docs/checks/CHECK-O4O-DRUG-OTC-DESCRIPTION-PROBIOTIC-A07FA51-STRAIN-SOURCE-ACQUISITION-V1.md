# CHECK-O4O-DRUG-OTC-DESCRIPTION-PROBIOTIC-A07FA51-STRAIN-SOURCE-ACQUISITION-V1

> **WO:** WO-O4O-DRUG-OTC-DESCRIPTION-PROBIOTIC-A07FA51-STRAIN-SOURCE-ACQUISITION-V1
> **성격:** A07FA51 다균복합 정장제 **균주 조성 원천 확보 가능성 판정(read-only)**. 설명서 작성 0 · DB write 0 · canonical 승격 0.
> **핵심 결론:** A07FA51 균주 조성은 **O4O DB에 전무**(name/regulatory_name/ext 필드 전량 0). 그러나 **MFDS_CODE(품목기준코드)·KOREA_DRUG_CODE가 164건 전량 존재** → 대상은 **46개 허가품목**(포장변형 제외)이며 **MFDS 의약품 제품허가정보(주성분)로 취득 가능(feasibility HIGH)**. 단 실제 취득은 **외부 ETL 단계**(MFDS API/의약품안전나라)로 본 read-only WO 범위 밖 → **별도 취득 WO 필요**. 현 DB 기준 group_key 생성 가능 품목 = **0**.

---

## 1. 작업 일시 / 채널

| 항목 | 값 |
|---|---|
| 작업 일시 | 2026-07-07 |
| DB 접속 | Cloud SQL Auth Proxy(127.0.0.1:15511) → psql SELECT (read-only) |
| 외부 확인 | WebSearch/WebFetch(MFDS 정장제 기준·drug 정보 사이트) |
| write | **0** |

## 2. 선행/스키마 근거

- 직전 `CHECK-...-PROBIOTIC-STRAIN-GROUPING-AND-DRAFT-STANDARD-V1`: A07FA51 164, 균주조성 DB부재로 defer.
- **스키마 사실 재확인:** `product_drug_extensions`의 OTC 임상/성분 필드(active_ingredients·ingredient_summary·strength·efficacy_text 등)는 A07FA51 전량 **NULL**(보수 mirror). WO §7 SQL이 이 필드에 의존하므로, 실제 조사는 name/regulatory_name/identifier/e약은요 원문으로 대체.

## 3. A07FA51 대상 재확인 (실측)

| 항목 | 값 |
|---|--:|
| A07FA51 masters(전체) | 164 |
| A07FA51 masters(노이즈 제외) | 161 |
| 제조사 수 | 22 |
| **distinct MFDS_CODE(품목기준코드) = 허가품목 수** | **46** |
| grounded(e약은요 보유) masters | 103 |

> 164 masters는 46개 허가품목의 **포장단위 변형**(정/캡슐/산 × 병/PTP × 수량)이다. 조성 취득 단위는 **46 품목기준코드**.

## 4. 균주 조성 신호 — **O4O DB 전무 (정의적)**

| 신호 | A07FA51 보유 수 |
|---|--:|
| name 괄호에 균주(`(…균…)`) | **0** |
| regulatory_name에 '균' | **0** |
| ext `active_ingredients` NOT NULL | **0** |
| ext `ingredient_summary` NOT NULL | **0** |
| e약은요 원문에 조성 기재(직전 실측: 락토프린·바이오탑디포르테) | **없음**(효능·용법·주의만) |

- name = regulatory_name = **브랜드명**(락토넥스유캡슐·비스칸티정·바실론캡슐 등). 균주·균수·조합 정보 없음.
- **결론: 현 O4O DB로는 A07FA51 균주 조성을 어떤 필드로도 복원 불가.**

## 5. 식별자 커버리지 — **MFDS 매칭 경로 존재**

| identifier_type | masters | sample |
|---|--:|---|
| ATC_CODE | 164 | A07FA51 |
| **KOREA_DRUG_CODE**(표준코드/바코드) | 164 | 8806556053529 |
| **MFDS_CODE**(품목기준코드) | 164 | 202502036 (형식 YYYYNNNNN=2025+02036) |
| KOREA_INSURANCE_CODE | 2 | — |

- `product_masters.mfds_product_id` = `HIRA:DRUG_MASTER:8806431039303` → 실제로 **HIRA 약가마스터 출처**(barcode 임베드), MFDS 품목번호 아님. 조성 없음.
- **핵심:** `MFDS_CODE`(품목기준코드)가 **164건 전량** 존재 → 46개 허가품목을 **MFDS 의약품 제품허가정보에 매칭 가능**.

## 6. 원천 접근성 판정 (WebSearch/WebFetch)

- **MFDS 의약품 제품허가정보(주성분/성분정보)** 가 권위 원천. WebSearch로 **MFDS "정장제 유효성분 기준" 신설·유산균제제 규격 가이드라인** 존재 확인(정장생균제=균주 성분 규정). 즉 **균주 조성은 MFDS 허가정보에 공개된 표준 데이터**.
- 특정 품목의 조성 텍스트는 **품목기준코드/itemSeq 단위 상세 조회**가 필요(의약품안전나라 상세 또는 공공데이터 API). 임의 drug 정보 사이트 URL 1건 fetch로는 미노출 → **정확 매칭은 품목기준코드 기반 상세 조회 필수**.
- **판정:** 원천은 **공개·존재·매칭 가능(feasibility HIGH)**. 단 취득은 **외부 조회/ETL**(MFDS 공공데이터 API 서비스키 또는 의약품안전나라 품목상세)로 수행해야 하며, **본 read-only WO에서는 실행하지 않음**.

## 7. source 분류 (WO §8)

현 시점(외부 취득 전) 기준:

| source_status | 대상 | 비율 |
|---|---|--:|
| **source_missing (in DB) / acquirable (via MFDS)** | A07FA51 전체 46품목/164 masters | 100% |
| source_strong (DB만으로) | 0 | 0% |
| source_partial / weak / conflict | 0 (DB에 조성 자체가 없어 판정 불가) | — |

> 즉 "약함/충돌"이 아니라 **DB에 조성 축이 아예 없음** → 전량 외부 취득 대상. 취득 후에야 strong/partial 재분류 가능.

## 8. group_key 생성 가능 여부 (WO §9)

- 필수 축(normalized_strain_combination_signature, viable_count/potency, non_strain_ingredient, dosage_form, route, efficacy/dosage) 중 **균주조합·균수/역가·비균주성분이 DB에 전무**.
- **현 DB 기준 group_key 생성 가능 품목 = 0.**
- **취득 후 예상:** 46 품목의 주성분(균주조합)+e약은요(효능/용법, grounded 103) 결합 시 group_key 생성 가능. 효능·용법 축은 이미 확보(e약은요), **부족한 것은 균주조합·균수뿐**.

## 9. 취득 대상 worklist (46 품목기준코드) — 상위 15 (grounded 순)

| brand(approx) | masters | 제조사 | grounded | MFDS_CODE(품목기준코드) |
|---|--:|--:|--:|---|
| 락토폴플러스 | 8 | 1 | 8 | 202201988 |
| 듀오레 | 8 | 1 | 8 | 202200589 |
| 락토스탑 | 8 | 1 | 8 | 202203884 |
| 듀오레플러스 | 8 | 1 | 8 | 202200648 |
| 락토폴 | 8 | 1 | 8 | 202202031 |
| 메디락-베베 | 7 | 1 | 7 | 199202075 |
| 비스칸비 | 8 | 1 | 4 | 202302766 |
| 바이오탑디포르테세립 | 4 | 1 | 4 | 202107978 |
| 바실루비 | 5 | 1 | 3 | 202501965 |
| 장이더락 | 5 | 1 | 3 | 202400655 |
| 더블락 | 3 | 1 | 3 | 201109596 |
| 락토프린 | 3 | 1 | 3 | 202200149 |
| 비오딘비 | 3 | 1 | 3 | 202401810 |
| 바이오탑디듀얼 | 3 | 1 | 3 | 202106349 |
| 듀오베린 | 3 | 1 | 3 | 202107890 |

> 전체 46 품목기준코드의 완전 열거는 취득 WO 1단계(SELECT DISTINCT MFDS_CODE)로 확정. 각 품목 제조사=1(브랜드 전용) 구조.

## 10. 후속 판정 (WO §12)

1. **공식 원천으로 균주 조성 확보 가능 비율:** 식별자(품목기준코드) 기준 **100%(46/46 매칭 가능)**. 단 실제 텍스트 취득은 외부 조회 필요.
2. **현 DB group_key 생성 가능 품목:** **0**.
3. **취득 후 group_key 생성 가능(예상) 그룹:** 균주조합×제형×효능 기준 ≈ 46 품목 → 조합 중복 병합 시 그보다 적음(취득 후 확정).
4. **바로 pilot_draft 가능 그룹:** **0**(균주 조성 취득 전).
5. **manual_review:** 취득 후 균수/역가·소아용량 축에서 발생 예상.
6. **defer:** A07FA51 전량 defer 유지(취득 전).
7. **추가 수집 방식:** MFDS **의약품 제품허가정보 API(공공데이터포털, 서비스키 필요)** by 품목기준코드 → MAIN_INGR/주성분(균주조합·균수) 파싱, 또는 의약품안전나라 품목상세.
8. **PROBIOTIC-PILOT-DRAFT 즉시 진행 여부:** **A07FA51은 불가(취득 선행)**. 단일균 pilot(락토람노수스 2~3)은 **병행 가능**.

## 11. 결론 · 다음 WO (WO §17)

- **원천 확보 = 부분(경로 확정, 실취득 미수행)** → WO §17의 **B/C 혼합**:
  1. **(신규) WO-...-PROBIOTIC-A07FA51-STRAIN-SOURCE-ETL-V1** — 46 품목기준코드 → MFDS 제품허가정보 주성분(균주조합·균수) 취득·정규화. (외부 API/서비스키 또는 의약품안전나라, DB write 없이 CHECK/시드 산출)
  2. 취득 성공 시 → **WO-...-PROBIOTIC-A07FA51-GROUPING-AND-PILOT-DRAFT-V1**(source_strong 그룹 초안).
  3. **병행:** **WO-...-PROBIOTIC-PILOT-DRAFT-SINGLE-ONLY-V1**(A07FA51 defer 유지, 단일균 락토람노수스 등 2~3 초안).

## 12. 금지사항 준수 확인

| 항목 | 준수 |
|---|:-:|
| DB write | ✅ 0 (SELECT만) |
| draft insert / SPD·ext update | ✅ 0 |
| ProductMaster/Candidate 상태 변경 | ✅ 0 |
| canonical 승격 | ✅ 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 0 |
| 건기식 혼입 | ✅ 0 (OTC A07FA51 한정) |
| 제품명 기반 임의 group_key | ✅ 0 (생성 0) |
| 균주 조성 추정 | ✅ 0 (DB부재 명시, 취득 전 작성 없음) |
| "다균복합 정장제" 단일 통합 | ✅ 0 |

---

*V1 · 2026-07-07 · A07FA51 164/46품목 · 조성 DB전무·MFDS 품목기준코드 100%보유→취득 feasibility HIGH · 현 DB group_key 0 · 취득 ETL WO 필요 · DB write 0*
