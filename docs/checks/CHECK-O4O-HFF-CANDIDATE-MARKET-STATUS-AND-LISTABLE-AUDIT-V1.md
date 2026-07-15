# CHECK-O4O-HFF-CANDIDATE-MARKET-STATUS-AND-LISTABLE-AUDIT-V1

> **작업명:** 건강기능식품 후보 41,261건 시판·유효 품목 감사 (그룹화 선행 모수 축소)
> **유형:** read-only DB 감사 — **코드 0 · DB write 0 · migration 0**
> **결과: DB 내부 축소 부분 완료 / 시판·단종은 DB 판정 불가(데이터셋 필드 부재) — 웹·보조 데이터셋 필요**
> **근거 WO:** WO-O4O-HFF-CANDIDATE-MARKET-STATUS-AND-LISTABLE-AUDIT-V1 (사용자 지시, 2026-07-15)
> **선행:** [`CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1`](CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1.md)(41,261 실측)
> **실측일:** 2026-07-15 (프로덕션 read-only, Cloud SQL Auth Proxy)

---

## 0. 요약

41,261 HFF 후보를 **DB 내부 공식 필드만으로 대량 축소**할 수 있는 부분을 집계했다. 결과: **중복 0·품목 식별정보 결손 ≈0**이라 DB 내부 결정적 제외는 **원료 등록(NON_SKU) ≈1,088건 + 제품명 중복 consolidation ≈4,065건**에 그친다. **결정적 한계:** MFDS 품목제조신고 데이터셋 `raw_payload.source` 에는 **취소·폐업·시판·유효 필드가 없다**(키 11개뿐). 따라서 `LISTABLE_CONFIRMED` / `DISCONTINUED_OR_CANCELED` 는 **DB 단독 판정 불가**하며, `ENTRPS` 는 **제조원(수탁 OEM)** 이라 소비자 브랜드/판매원이 아니다 → 시판 확인은 별도 웹·보조 데이터셋이 필요하다. DB write 0.

---

## 1. DB 내부 감사 실측 (41,261 live)

| 축 | 실측 | 해석 |
|---|---:|---|
| 전체 후보 (live) | **41,261** | source_label=MFDS_HEALTH_FUNCTIONAL_FOOD |
| distinct 품목보고번호(STTEMNT_NO) | **41,261** | **중복 0** (1:1) |
| 제품명(PRDUCT) 결손 | **0** | 식별정보 완비 |
| 제조사(ENTRPS) 결손 | **0** | 식별정보 완비 |
| 인정 기능성(MAIN_FNCTN) 결손 | **8** | 미미 |
| SRV_USE = "원료로 사용" 계열 | **1,088** | 원료 등록(완제품 아님) |
| SRV_USE 결손 | **314** | 재검토 대상 |
| distinct 제품명(PRDUCT) | **37,196** | → 이름 중복 ≈**4,065**(동일 제품명 다수 품목보고) |
| distinct 제조사(ENTRPS) | **496** | 상위 15개가 전부 수탁제조원 |
| candidate_status / match_status | **전량 pending / unmatched** | 기존 ProductMaster 연결 0 |

**등록연도(REGIST_DT) 분포:** 2015=4,890 / 2016=998 / 2017=1,318 / 2018=1,540 / 2019=2,214 / 2020=3,145 / 2021=4,105 / 2022=4,073 / 2023=4,999 / 2024=5,250 / 2025=5,510 / 2026=3,219 (합계 41,261, 결손 0). 최근(2023~2026) ≈**18,978**.

**상위 제조원(ENTRPS, 수탁 OEM):** 코스맥스바이오 1,705 · 한미양행 1,597 · 코스맥스엔비티 1,536 · 서흥 1,460 · 알피바이오 1,375 · 한국씨엔에스팜 1,366 · 비오팜 1,341 · 엠에스바이오텍 1,330 · 한풍네이처팜 1,108 · 노바렉스 1,030 · 콜마비앤에이치 1,027 …

---

## 2. 판정 체계 대입 (DB 단계)

| 판정 | DB 실측 | 비고 |
|---|---:|---|
| `DUPLICATE_SOURCE` (품목보고번호 중복) | **0** | distinct = total |
| `INSUFFICIENT_IDENTITY` (제품명/제조사 결손) | **0** (품목 수준) | MAIN_FNCTN 결손 8은 별도 |
| `NON_SKU_SOURCE` (원료 등록) | **≈1,088** (+314 재검토) | SRV_USE "원료로 사용" → 완제품 아님 → 제외 |
| 제품명 중복(consolidation) | **≈4,065** | 동일 제품명 다수 품목보고 → 대표 후보만 유지 |
| `DISCONTINUED_OR_CANCELED` | **DB 판정 불가** | 데이터셋에 취소/폐업 필드 없음 |
| `VALID_NOT_MARKET_CONFIRMED` | (사실상 대다수) | 품목 유효하나 시판 미확인 |
| `LISTABLE_CONFIRMED` / `LISTABLE_PROBABLE` | **DB 판정 불가** | 시판 필드 없음 → 웹 필요 |

**DB 내부 순 완제품 후보(원료 제외):** 41,261 − 1,088 ≈ **40,173**. 제품명 기준 대략 **36,100 distinct**(원료 dedup 후 근사).

---

## 3. 결정적 한계 — 시판/단종은 DB에 없다 (정직 보고)

- `raw_payload.source` 키 = `STTEMNT_NO, PRDUCT, ENTRPS, MAIN_FNCTN, SRV_USE, INTAKE_HINT1, PRSRV_PD, SUNGSANG, BASE_STANDARD, DISTB_PD, REGIST_DT` — **취소·행정처분·폐업·유통(시판) 상태 필드 없음.** `reviewFlags`도 `["SKU_IDENTIFIER_MISSING"]` 뿐(전건).
- `DISTB_PD` = 유통기한(제조일 기준 shelf life)이지 품목 유효기간 아님. `REGIST_DT` = 신고일 — 건강기능식품 품목제조신고는 만료 개념이 약해 **오래된 등록이 곧 단종을 뜻하지 않음**(약한 proxy).
- `ENTRPS` = **제조원(수탁 OEM)** — 상위 15개가 전부 코스맥스·서흥·알피바이오 등 OEM. **소비자 판매 브랜드/판매원이 아님** → 시판 확인의 매칭 축으로 부적합.
- 결론: **DB 단독으로는 `LISTABLE_CONFIRMED`·`DISCONTINUED_OR_CANCELED` 산출 불가.** 원료 제외·이름 consolidation 외의 모수 축소는 외부 신호가 필요.

---

## 4. 필수 수치 (WO 산출물 요구)

```text
전체 후보                       41,261
공식 상태상 유효(품목 식별 완비)   41,261 (제품명/제조사 결손 0)
취소·종료·삭제 후보              DB 판정 불가 (데이터셋 필드 부재)
중복 후보(품목보고번호)           0
비SKU(원료) 후보                ≈1,088 (+314 SRV 결손 재검토)
식별정보 부족 후보               0 (품목 수준) / MAIN_FNCTN 결손 8
시판 확인 제품 수                0 (DB로 확인 불가)
시판 가능성 높은 제품 수          DB 미산출 (웹 필요)
시판 미확인 제품 수              사실상 전량 (VALID_NOT_MARKET_CONFIRMED)
최종 그룹화 대상 수              DB 확정 불가 → 아래 §5 전략 필요
제품명 distinct                 37,196 (이름 중복 ≈4,065)
제조원(ENTRPS) distinct         496
```

---

## 5. 권장 모수 축소 전략 (DB 이후)

DB 내부로는 시판을 못 거르므로, 다음 순서로 **웹 조사량을 최소화**한다:

1. **DB 결정 제외**: 원료 등록 ≈1,088 제외 → ≈40,173 완제품 품목.
2. **제품명 consolidation**: distinct 제품명 37,196 기준 대표 후보 1건으로 접어 조사 단위 축소(중복 판매원/재신고 병합).
3. **우선순위 부여**: 최근 신고(2023~2026 ≈18,978) + 상위 제조원(코스맥스·서흥 등, 시판 완제품 다수)부터 시판 확인 — 오래된(2015~2018 ≈8,746)은 후순위/단종 가능성.
4. **시판 확인(웹)**: 대표 후보 단위로 브랜드/판매원 검색 → 현재 판매 페이지 존재 시 `LISTABLE_CONFIRMED`, 흔적만 있으면 `LISTABLE_PROBABLE`, 전무하면 `VALID_NOT_MARKET_CONFIRMED`. **41,261 전건 개별 웹 검색 금지**(대표·우선순위 표본부터).
5. **(권장) 보조 데이터셋 ETL**: MFDS **품목취소/행정처분/영업자 폐업** 공개 데이터로 `DISCONTINUED_OR_CANCELED` 를 DB 단계에서 거를 수 있음 — 현 데이터셋엔 없으므로 별도 수집 시 웹 조사량이 크게 준다.

---

## 6. 기존 그룹화 WO 선행조건 변경 (폐기 아님)

- `WO-O4O-HFF-CANDIDATE-INGREDIENT-COMPOSITION-GROUPING-AUDIT-V1` 은 **폐기하지 않고 선행조건만 변경**:
  - 기존: 41,261 전체 그룹화 → **수정: 시판 감사 통과(LISTABLE_CONFIRMED + 일부 LISTABLE_PROBABLE) 후보만 그룹화.**
- 확정 순서:
  ```text
  WO-O4O-HFF-CANDIDATE-MARKET-STATUS-AND-LISTABLE-AUDIT-V1  (본 감사 + §5 시판 확인)
   → WO-O4O-HFF-CANDIDATE-INGREDIENT-COMPOSITION-GROUPING-AUDIT-V1  (LISTABLE만)
   → 소규모 설명서 제작 파일럿
  ```

---

## 7. 무변경 확인

```text
코드 변경   0
DB write    0
migration   0
deploy      0
DB 접근     read-only only (SELECT 집계)
```

---

## 8. 완료 판정

- **DB 내부 감사 = 완료** — 결정적 제외는 원료 ≈1,088 + 이름 중복 ≈4,065에 한정(중복·식별결손 ≈0).
- **시판/단종 = DB 판정 불가**(데이터셋 필드 부재, ENTRPS=제조원) — §5 전략(원료 제외 → 이름 consolidation → 최근·대형제조원 우선 → 대표 표본 웹 시판 확인, 또는 취소/행정처분 데이터셋 ETL)로 진행해야 실제 모수가 축소된다.
- 그룹화 WO 선행조건을 "LISTABLE 후보만"으로 변경. 41,261 전량 웹 검색·전량 그룹화 금지.

## 9. 커밋

- commit: 본 CHECK 문서 1개(docs 전용, path-scoped). 무관 dirty/lockfile 미포함.
- 배포: 없음(문서 전용).
