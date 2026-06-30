# CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1

> 심평원 약가마스터 의약품표준코드(data.go.kr 15067462) CSV 샘플을 O4O 표준상품(대표상품 + 포장단위) 구조에 매핑 가능한지 검증하는 **read-only CHECK**.
> 작성일: 2026-06-30 · 성격: read-only 데이터 검증 (코드/DB/API/UI/migration/import 변경 없음 · 산출물 = 본 문서 1개)
> 선행: `IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1`, `IR-O4O-PUBLIC-DISTRIBUTION-PRODUCT-DATA-SOURCE-AUDIT-V1`

---

> **[갱신 2026-06-30 — 본문 1회 실확보·실측 완료]**
> 선행 CHECK에서 차단됐던 bulk CSV 본문을 **Playwright 브라우저 자동화(usage-flow 구동)로 1회 실확보**하여 §4·§5·§10~§13·§17~§19를 등급 E → 실측으로 갱신함.
> - **확보 방법**: `fileData.do` 페이지에서 `fileDetailObj.fn_fileDataDown(...)` 의 AJAX 체인(`/tcs/dss/selectFileDataDownload.do` → `atchFileId` 수신 → `/cmm/cmm/fileDownload.do`)을 브라우저 세션에서 구동, 동일 세션 쿠키(JSESSIONID)로 curl 수신. **로그인/캡차 불필요**(명시대로 usage-flow 게이트만 통과).
> - **파일명**: `건강보험심사평가원_약가마스터_의약품표준코드_20251031.csv`
> - **기준일**: 데이터 기준 **2025-10-31** (파일명 suffix `_20251031`)
> - **인코딩**: **EUC-KR/CP949** (strict EUC-KR 변환 시 CP949 전용문자 1건에서 실패 → CP949로 무손실 변환 성공). UTF-8 아님.
> - **파일 크기**: 54,880,067 bytes (≈52.3 MB)
> - **데이터 행수(CSV 파싱 기준)**: **305,522 행** (헤더 제외). 포털 메타 표기 298,183 과 차이는 인용/집계 시점 차이.
> - 분석은 스크래치에서 수행, 본 repo에는 300행 샘플만 `docs/checks/artifacts/DRUG-STANDARD-CODE-CSV-SAMPLE-300.csv` (커밋 제외).

---

## 1. 목적

선행 IR이 확정한 표준상품 구조 — **포장단위 = 기존 `ProductMaster`, 대표상품 = 신규 `representative_products`(미구현)** — 가 공공데이터(의약품)로 실제 시드 가능한지를 약가마스터 CSV의 실 헤더·인코딩·행수·필드와 **실제 엔티티 컬럼/enum/제약**을 교차 확인하여 검증한다. 구현은 후속 WO로 위임하고, 본 문서는 매핑 가능성·위험·진행 가부만 판단한다.

## 2. 검증 범위

- 약가마스터(15067462) CSV 실 헤더/인코딩/행수/라이선스 확인 (data.go.kr fileData 페이지 + curl 실측)
- 22개 컬럼이 IR이 예상한 필드(표준코드/품목기준코드/상품명/업체명/포장형태/제품총수량 등)와 일치하는지
- 약가마스터 1행 ↔ `ProductMaster` 매핑 가능성 (실 엔티티 컬럼 대조)
- 품목기준코드/묶음의약품 대표코드 ↔ `representative_products` 그룹핑 키 가능성
- 표준코드 ↔ `ProductMaster.barcode` 직접저장 vs `ProductIdentifier` 부착 안전성
- candidate/draft 계층 선경유 필요성 (이미 구현된 `ProductCandidate` 큐 대조)

**제외**: DUR/복약/상담/효능·용법, 의약품 외 상품군, OpenAPI 대량 호출, import 스크립트 작성.

## 3. 사용 데이터소스

| 소스 | data.go.kr | 본 CHECK에서 확인한 것 |
|---|---|---|
| 심평원 약가마스터 의약품표준코드 | 15067462 | fileData 페이지 메타 + 실 헤더(22컬럼) + 다운로드 게이트 실측 |
| 식약처 묶음의약품정보서비스 | 15063908 | 명세 수준(대표 품목기준코드 구조) — IR 인용, 대량호출 X |
| 식약처 의약품 제품 허가정보 | 15095677 | 명세 수준(품목기준코드/포장단위/전문일반/허가상태) — IR 인용 |

## 4. 약가마스터 CSV 확보 결과

**결론(갱신): 본문 1회 실확보 성공(등급 B → A). Playwright 브라우저 자동화로 usage-flow를 구동해 실제 CSV 54.88MB·305,522행을 수령했고, 인코딩(EUC-KR/CP949)·행수·헤더 22컬럼을 실측 확정했다.**

### 4.1 확보 경로 (실증)
- `https://www.data.go.kr/data/15067462/fileData.do` 의 다운로드 트리거는 `fileDetailObj.fn_fileDataDown('15067462', 'uddi:456729a5-28ed-494d-b5a8-ba5000eb6bab', '','1','2')` 이다.
- 이 함수는 다음 3단 체인:
  1. `POST /tcs/dss/selectFileDataDownload.do` (body: `publicDataPk=15067462&publicDataDetailPk=uddi:456729a5-...`) → JSON `{ status:true, atchFileId:"FILE_000000003550228", fileDetailSn:"1", dataNm:"...20251031" }` 수신.
  2. `fn_fileDataDownload(atchFileId, fileDetailSn, dataNm)` 가 URL 조립: `/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003550228&fileDetailSn=1&dataNm=<encoded>`.
  3. 해당 URL이 실제 CSV 바이트(`content-type: application/octet-stream`, `content-length: 54880067`) 반환.
- **선행 CHECK가 실패한 이유 규명**: 정적 HTML의 `atchFileId`(이전 `FILE_000000003663682`)는 **stale/미리보기(JPEG)** 였다. 실제 atchFileId(`FILE_000000003550228`)는 **위 1단계 AJAX를 실행해야만** 얻어진다. 즉 게이트는 인증/로그인이 아니라 **포털 JS usage-flow를 1회 구동해 fresh atchFileId를 받는 단계**였다(명시대로 로그인 불필요).
- **실확보 방법**: Playwright MCP 브라우저로 페이지 로드 → in-browser `fetch`로 1단계 AJAX 실행해 atchFileId 획득 → 동일 세션 쿠키(JSESSIONID)를 curl에 전달해 54.88MB 본문 수신(byte 일치 확인). 캡차·로그인·회원가입 벽 없음.

### 4.2 실측 메타
| 항목 | 실측값 |
|---|---|
| 파일명 | `건강보험심사평가원_약가마스터_의약품표준코드_20251031.csv` |
| 기준일 | **2025-10-31** (파일명 suffix) |
| 크기 | 54,880,067 bytes |
| 인코딩 | **EUC-KR / CP949** (UTF-8 아님; 첫 바이트 `c7 d1`="한". CP949 전용문자 1건 존재→`iconv -f cp949`로 무손실 변환) |
| 데이터 행수 | **305,522** (헤더 제외, CSV 파싱 기준) |
| 헤더 컬럼 수 | 22 (§5와 정확히 일치) |
| 인용 방식 | 콤마 포함 필드는 `"..."` 따옴표 처리(예: 비고 `"한약재, 갈근"`) → 단순 split 금지, CSV 파서 필수 |
| 라이선스 | 공공저작물 제1유형(출처표시) |

## 5. 실제 헤더 / 인코딩 / 행수

**헤더 (22컬럼, 공식 페이지 확인):**
```
한글상품명, 업체명, 약품규격, 제품총수량, 제형구분, 포장형태,
품목기준코드, 품목허가일자, 전문일반구분, 대표코드, 표준코드,
제품코드(개정후), 일반명코드(성분명코드), 비고, 취소일자,
양도양수적용(공고)일자, 양도양수종료일자, 일련번호생략여부, 일련번호생략사유,
국제표준코드(ATC코드), 특수관리약품구분, 의약품판독장비구분
```
- IR 예상 핵심 필드(표준코드/품목기준코드/한글상품명/업체명/포장형태/제품총수량/제형구분/대표코드/ATC) **전부 실존 — 헤더 일치 확인(실 파일 헤더와 1:1 일치).**
- **행수(실측)**: **305,522 데이터 행**(헤더 제외). 포털 메타 표기 298,183 과 차이 존재(집계/스냅샷 시점 차이 추정).
- **갱신**: 연 1회 (차기 2026-11-30).
- **라이선스**: 공공저작물 제1유형(출처표시). → import 시 출처표시 의무.
- **인코딩(실측 확정)**: **EUC-KR / CP949** (등급 E → A). `file` = `ISO-8859 text`, 첫 바이트 `c7 d1`(EUC-KR "한"), strict EUC-KR 변환은 CP949 전용문자 1건에서 실패하므로 **`iconv -f cp949 -t utf-8` 로 변환해야 무손실**. UTF-8 아님.

## 6. 주요 컬럼 설명 (매핑 관점)

| 컬럼 | 의미 | O4O 매핑 관점 |
|---|---|---|
| 한글상품명 | 제품 상품명 | ProductMaster.name + representative_products.display_name 후보 |
| 업체명 | 제조/공급 업체 | manufacturer_name 후보 |
| 약품규격 | 함량·규격(예 500mg) | specification 일부 |
| 제품총수량 | 포장당 총 수량 | (대표상품) display 보조 / package_quantity 후보(ProductMaster엔 전용 컬럼 없음 → DrugExtension.packageQuantity) |
| 제형구분 | 정/캡슐/시럽 등 | DrugExtension.dosageForm 또는 tags |
| 포장형태 | 병/PTP/박스 등 | DrugExtension.packageUnit 후보 / specification 보조 |
| 품목기준코드 | 허가 품목 단위 코드 | **대표상품 그룹핑 키 후보** + ProductIdentifier(MFDS) / DrugExtension.mfdsCode |
| 표준코드 | 13자리 KD코드(보험청구 단위) | **포장단위 식별 — ProductIdentifier(KOREA_DRUG_CODE)** / barcode 후보(보류) |
| 전문일반구분 | 전문/일반 | drug_category(otc/rx) 분류 입력 |
| 대표코드 | 약가마스터 자체 대표코드 | 대표상품 그룹핑 보조 키 |
| 일반명코드 | 성분명 코드 | 성분 그룹핑(주의: 성분=대표상품 아님) |
| ATC코드 | 국제 분류 | ProductIdentifier(ATC_CODE) / DrugExtension.atcCode |
| 취소일자 | 허가취소 | 상태 필터(import 시 active 판정) |

## 7. ProductMaster 매핑 후보 (실 엔티티 대조)

실 엔티티 `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` 기준:

| 약가마스터 컬럼 | ProductMaster 컬럼 | 적합도 | 비고 |
|---|---|---|---|
| 표준코드(13자리) | `barcode` varchar(14) **UNIQUE** | △ | barcode는 GTIN 슬롯 — 표준코드 직접투입은 §14 위험. 권장=ProductIdentifier |
| 한글상품명 | `name` varchar(255) / `regulatoryName` | ✅ | name=canonical, regulatoryName=식약처공식(immutable) |
| 업체명 | `manufacturerName` varchar(255) **immutable** | ✅ | 충분 |
| 약품규격 + 포장형태 + 제품총수량 | `specification` text | ✅(조합) | "500mg×30정/병" 형태 생성 가능 |
| 제형구분 | `tags` jsonb / (DrugExtension.dosageForm) | ✅ | Master엔 dosageForm 전용 컬럼 없음 → tags 또는 확장 |
| 품목기준코드 | `mfdsProductId` varchar(100) **immutable, UNIQUE** | ⚠ | UNIQUE라 동일 품목기준코드의 여러 표준코드 행을 1 Master로 못 넣음(§11) |
| ATC | (Master 직접 없음) | — | ProductIdentifier/DrugExtension로 |

**관찰(중요)**: `ProductMaster.mfds_product_id` 가 **UNIQUE** 다(`uq_product_masters_mfds_product_id`). 만약 품목기준코드를 mfds_product_id 로 매핑하면, **동일 품목기준코드 + 여러 표준코드(포장)** 행들이 UNIQUE 충돌을 일으킨다. → 약가마스터 1행(=표준코드 1개=포장단위)을 ProductMaster 1건으로 보려면 mfds_product_id 에 품목기준코드를 그대로 쓰면 안 되고, **표준코드 기반 합성 id** 또는 품목기준코드는 DrugExtension/ProductIdentifier 로 이동해야 한다.

**판단**: 약가마스터 **1행 = 표준코드 1개 = 포장단위 = ProductMaster 1건 후보**로 보는 것은 grain상 정합(IR §5 "barcode 1건=ProductMaster 1건"). 단 식별자 슬롯 매핑은 위 충돌 회피 필요.

## 8. representative_products 매핑 후보

- 신규 테이블 `representative_products` 는 **코드/엔티티/migration 어디에도 없음**(grep 결과 docs만) — IR §6 그대로 미구현 확인.
- 매핑 후보:
  | representative_products 필드 | 약가마스터/묶음 출처 | 비고 |
  |---|---|---|
  | `display_name` (NOT NULL) | 묶음의약품 대표 제품명 또는 한글상품명 | 유일 필수 |
  | `product_group` | 품목기준코드 / 대표코드 / 묶음 대표코드 | 그룹핑 키 |
  | `manufacturer_name` | 멤버 업체명 파생 | 여러 업체 섞이면 주의(§13) |
  | `thumbnail_image_id` | (없음) | 멤버 primary image fallback |
- 그룹핑 키 3후보: ① **품목기준코드**(허가 품목 = 동일제품 다른포장에 가장 근접) ② 약가마스터 **대표코드** ③ 묶음의약품 **대표 품목기준코드**(성분 유사까지 포함 → 과대묶음 위험).

## 9. ProductIdentifier 매핑 후보 (실 enum 대조)

실 enum `ProductIdentifierType` 확인값: `GTIN | EAN13 | UPC | JAN | INTERNAL_O4O | SUPPLIER_SKU | PHARMACY_LOCAL | STORE_LOCAL | KOREA_DRUG_CODE | KOREA_INSURANCE_CODE | ATC_CODE | MFDS_CODE | UNKNOWN`

| 약가마스터 컬럼 | ProductIdentifier.identifierType | 가능 |
|---|---|---|
| 표준코드(13자리) | **`KOREA_DRUG_CODE`** | ✅ (전용 enum 존재) |
| 품목기준코드 | **`MFDS_CODE`** | ✅ (※IR이 적은 `MFDS_ITEM_CODE` 는 미존재 — `MFDS_CODE` 사용) |
| ATC | **`ATC_CODE`** | ✅ |
| (보험코드 있으면) | `KOREA_INSURANCE_CODE` | ✅ |

- `ProductIdentifier` 는 **전역 UNIQUE 없음**, 중복방지는 `(master_id, type, normalized_value)` partial unique 뿐 → **표준코드 중복/충돌 수용 구조가 이미 존재**. `verificationStatus='imported'`, `sourceType='import'` 로 출처 표기 가능.
- **IR의 enum 명칭 정정**: IR §매핑표의 `ProductIdentifier.MFDS_ITEM_CODE` 는 실제 코드엔 없음. 실값은 `MFDS_CODE`. 또한 `ATC_CODE`/`KOREA_DRUG_CODE` 는 정확.

## 10. 전수 분석 (실측 — 305,522행 전체 CSV 파싱)

> 등급 E → 실측 확정. 표본이 아니라 **전 305,522행을 Python `csv` 파서로 전수 집계**함(따옴표 인용 반영).

| 지표 | 실측값 |
|---|---|
| 총 데이터 행 | 305,522 |
| **표준코드 결측률** | **0.000%** (0건) |
| **표준코드 형식이상(13자리 아님)** | **0.000%** (0건) — 전 행 정확히 13자리 숫자 |
| **표준코드 중복률** | **0.000%** — distinct 305,522 = 전 행 **유일**(표준코드 1개 = 행 1개 = 포장단위 1개 grain 완전 성립) |
| **포장형태 결측률** | **35.799%** (109,374건) — 결측 큼(한약재·원료·일부 허가건에서 공란) |
| 취소일자 nonempty(허가취소/양도양수 종결 추정) | 24.443% (74,680건) → active(취소일자 공란) = 230,842행(75.56%) |
| 품목기준코드 distinct(표준코드 1개 이상 보유) | 96,236 |
| 한글상품명 distinct | 107,988 |

**핵심 함의**: 표준코드는 **결측 0 / 형식이상 0 / 중복 0** 인 13자리 안정 유일키 → `ProductIdentifier(KOREA_DRUG_CODE)` 의 `normalized_value` 로 **무가공 적재 가능**(정제 불필요). 약가마스터 1행 = 표준코드 1개 = 포장단위(ProductMaster) 1건 grain이 데이터로 입증됨.

> 참고: 표준코드·품목기준코드 값에는 **trailing space** 가 흔함(예 `"8800628000107 "`) → import 시 trim 필수.

## 11. 동일 품목기준코드 / 여러 표준코드 (다포장) — 실측

- **다포장 빈도(실측)**: 품목기준코드 96,236개 중 **79,316개(82.418%)** 가 2개 이상의 표준코드를 보유 → **다포장이 정상/지배적 형태**.
- 품목기준코드당 표준코드 수 분포(실측): `1개=16,920 / 2개=26,796 / 3개=24,603 / 4개=12,573 / 5개=5,933 / 6개=3,813 / 7개=1,690 / 8개=1,209 / 9개=589 / 10개=395 / 11개=332 / 12개=396 ...` **최대 487개**.
- 실 예시(품목기준코드 `199905709` 대효갈근 / (유)대효제약):
  - `표준=8800628000107 규격=없음 총수량=0`
  - `표준=8800628000114 규격=500그램 총수량=1 포장=기타`
  - `표준=8800628000121 규격=1000그램 총수량=1 포장=기타`
- 함의: **품목기준코드 = 대표상품 그룹핑 키**, **표준코드 = 포장단위(ProductMaster) 키** 라는 IR 2계층 모델이 데이터로 확정됨.
- 단 §7의 `mfds_product_id` UNIQUE 충돌 때문에, 품목기준코드를 ProductMaster의 UNIQUE 컬럼에 그대로 넣으면 안 됨(다포장 82%가 충돌) → 품목기준코드는 representative_products.product_group / DrugExtension.mfdsCode / ProductIdentifier(MFDS_CODE) 로.

## 12. 동일 상품명 / 여러 제품총수량 (다총수량) — 실측

- **빈도(실측)**: 한글상품명 107,988개 중 **80,398개** 가 2개 이상의 서로 다른 제품총수량 값을 가짐(동일 상품명에 다양한 포장규모 공존).
- 실 예시(`레스타시스점안액0.05%(사이클로스포린)` / (유)삼일엘러간, 품목 `200510968`):
  - `표준=8806920000500 총수량=0 규격=0.4밀리리터`
  - `표준=8806920000517 총수량=1 포장=튜브`
  - `표준=8806920000524 총수량=32 포장=튜브`
  - `표준=8806920000531 총수량=30 포장=튜브`
- → ProductMaster 여러 건 + 동일 representative_products 1건으로 묶는 모델과 정합.
- **상품명+업체명+약품규격+포장형태+제품총수량** 조합으로 "레스타시스점안액 0.4mL 30개입 (삼일엘러간)" 식 사람이 이해할 포장단위명 생성 가능. 단 §10대로 **포장형태 35.8% 결측·총수량 0 다수** → 포장단위명 생성 시 fallback 규칙 필요.

## 13. 묶음의약품 대표 품목기준코드 검토

- 묶음의약품(15063908)은 **대표 품목기준코드 + 멤버 품목** 구조 → 대표상품 그룹핑 시드로 형태상 적합.
- **위험(IR §16 유보2 재확인)**: 묶음 기준이 **"성분 유사"** 이면 O4O 대표상품("동일제품-다른포장")보다 **넓게 묶임**. 성분유사 = 다른 브랜드/다른 제조사까지 한 묶음에 들어올 수 있음.
- **여러 제조사 섞이는 묶음** = 발생 가능 → 이를 하나의 representative_products(단일 manufacturer_name 가정)로 묶으면 **manufacturer_name 파생이 깨지고 소비자 안내가 부정확**해짐. → 묶음의약품 대표코드는 **자동 대표상품 생성에 직접 쓰면 위험**, **품목기준코드(허가 단위) 기준이 더 안전**.

### 13.1 다제조사 혼입 빈도 — 약가마스터 자체 실측 (중요)

묶음의약품(15063908) 본문은 본 CHECK 범위 밖이나, **약가마스터 품목기준코드 그룹핑 자체**에서 이미 다제조사 혼입이 측정된다(주로 양도양수=license transfer):

| 기준 | 품목기준코드 수 | 다제조사(>1 업체) | 비율 |
|---|---|---|---|
| **전체 행** | 96,236 | 6,839 | **7.106%** |
| **active만(취소일자 공란)** | 64,672 | 5,101 | **7.887%** |

- **핵심**: active 필터로도 다제조사 혼입이 **사라지지 않는다(오히려 7.9%로 소폭 상승)**. 즉 동일 품목기준코드에 현재형으로 여러 제조사가 공존하는 상태가 실재한다.
- 실 예시(품목 `200805356` 간포트점안액 — **현재 4개 업체**): (유)삼일엘러간 / 삼일제약(주) / 한국애브비(주) / 한국엘러간(주) — 양도양수 이력으로 동일 품목기준코드에 4사 표준코드 공존.
- **결론(파생 안전성)**: 품목기준코드 그룹핑으로 representative_products 를 만들 때 **약 7~8%(≈5,100~6,800 그룹)에서 manufacturer_name 단일 파생이 부정확**해진다. → `manufacturer_name` 자동 단일 파생은 **다제조사 감지 시 비우거나 검토 플래그** 필수(§16). 무조건 첫 업체 채택 금지.

## 14. ProductMaster.barcode 직접저장 가능성 판단

- `product_masters.barcode` = **varchar(14), 전역 UNIQUE(`uq_product_masters_barcode`), immutable, GTIN 슬롯**(8/12/13/14 check digit 포함).
- 표준코드(13자리 KD코드)는 GTIN-13의 근간이긴 하나 **GTIN과 동일 보장 없음**(KD코드 ≠ 실제 유통 바코드인 경우 존재). 표준코드를 barcode에 직접 박으면:
  - 전역 UNIQUE라 **동일 표준코드 중복행 / 향후 실제 GTIN 입력과 충돌** 위험.
  - immutable이라 정정 불가.
- **판단: 표준코드 → `barcode` 직접저장은 보류. `ProductIdentifier(KOREA_DRUG_CODE)` 부착이 안전.** barcode는 미입력 시 O4O 내부 GTIN 자동생성(prefix 200, `INTERNAL_O4O`) 경로가 이미 있음 → import 후보는 barcode 비우고 표준코드는 identifier로.

## 15. candidate/draft 경유 필요성 판단

- **이미 구현됨(중요 발견)**: `ProductCandidate` 엔티티 + `ProductCandidateService`(WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1) 존재.
  - `sourceType` enum에 **`csv_import` / `operator_import` / `external_api`** 포함 → 약가마스터 CSV import의 정확한 진입점.
  - 원칙이 코드 주석에 명문화: *"미검증 데이터를 ProductMaster 에 직접 저장하지 않는다"*, *"자동으로 ProductMaster 를 생성하지 않는다"*, exact match라도 status는 `matched`(approved 아님).
  - `candidate_name/brand/manufacturer/spec/unit/image_url/price` + `raw_payload`(jsonb) 보유 → 약가마스터 1행을 그대로 수용 가능.
  - Identifier Core 매칭 입력(`identifierType/identifierValue/normalizedIdentifierValue`) 보유 → 표준코드로 기존 Master 매칭 가능.
- **판단: candidate/draft 경유는 필요하고, 그 계층은 이미 존재한다.** 약가마스터 import 는 `ProductCandidate(csv_import)` 로 적재 → 운영자 검토 → 승격이 정합. ProductMaster 직접 적재는 금지(Core 동결 + 미검증 데이터).

## 16. 대표상품 스키마에 반영할 점

- `representative_products` 는 아직 **미생성** → FOUNDATION WO에서 신설.
- 반영할 점:
  - 그룹핑 키는 **품목기준코드 우선**(허가 단위), 묶음의약품 대표코드는 **검토 보조**로만.
  - `manufacturer_name` 은 멤버 파생이되 **다제조사 묶음 감지 시 비우거나 검토 플래그**(§13).
  - `display_name` 출처 = 묶음 대표 제품명 또는 한글상품명.
  - 표준코드/품목기준코드/ATC는 representative가 아니라 **포장단위(ProductMaster)의 ProductIdentifier** 에 귀속(대표는 그룹핑 키만 product_group으로 보유).

## 17. 위험 요소

1. ~~bulk CSV 차단~~ → **해소(§4). 본문 1회 실확보 완료.** 게이트는 인증이 아니라 usage-flow AJAX 1회 구동(브라우저 자동화로 통과). 단 **재확보 시에도 stale atchFileId 주의**(반드시 `selectFileDataDownload.do` 로 fresh atchFileId 취득).
2. ~~인코딩 미확정~~ → **확정: EUC-KR/CP949(§5). `iconv -f cp949 -t utf-8` 필수**(strict EUC-KR은 CP949 전용문자에서 깨짐). UTF-8 가정 금지.
3. **`mfds_product_id` UNIQUE 충돌** — 품목기준코드를 Master UNIQUE 컬럼에 직접 넣으면 다포장 행 충돌. **실측상 다포장이 82.4%(§11)** 라 충돌이 광범위 → 품목기준코드는 Master UNIQUE에 금지.
4. **표준코드≠GTIN** — barcode 직접저장 시 UNIQUE/immutable 충돌(§14). (표준코드 자체는 결측0·중복0·13자리100% 안정 — §10.)
5. **다제조사 혼입 — 실측 7~8%(§13.1)** — 품목기준코드 그룹핑 시 active 기준으로도 5,101 그룹에서 manufacturer 단일 파생 불가. 자동 단일 파생 금지(검토 플래그).
6. **포장형태 35.8% 결측 / 제품총수량 0 다수(§10·§12)** — 포장단위명 자동 생성 시 fallback 규칙 없으면 빈/무의미 라벨 양산.
7. **trailing space** — 표준코드/품목기준코드 값 끝 공백 흔함 → import 시 trim 필수(§10).
8. **Core 동결(CLAUDE.md §3)** — `product_masters` 컬럼 추가(representative_product_id)는 명시적 WO + 소비처 전수 영향평가 필수.
9. **IR enum 명칭 오차** — `MFDS_ITEM_CODE` 미존재, 실값 `MFDS_CODE`(§9). 후속 WO 매핑표 정정 필요.

## 18. 결론

### A~E 분류

| 대상 | 등급 | 근거 |
|---|---|---|
| 약가마스터 CSV 자체 | **A** | (B→A) 본문 1회 실확보 완료, 인코딩·행수·헤더 실측 확정. usage-flow 경로 규명됨 |
| 표준코드 | **A** | 13자리 안정 + **실측 결측0·형식이상0·중복0(100% 유일)**, ProductIdentifier(KOREA_DRUG_CODE) 무가공 매핑 |
| 품목기준코드 | **A** | 대표 그룹핑 키 + ProductIdentifier(MFDS_CODE) |
| 한글상품명 | **A** | name + display_name 직매핑 |
| 업체명 | **A** | manufacturer_name 직매핑 |
| 약품규격 | **B** | specification 조합 입력(정제 필요) |
| 제품총수량 | **B** | 전용 컬럼 부재 → specification/DrugExtension.packageQuantity 정제 |
| 포장형태 | **B** | 코드값/표기 정규화 필요(DrugExtension.packageUnit) |
| 제형구분 | **B** | tags 또는 DrugExtension.dosageForm 정제 |
| ATC | **A** | ProductIdentifier(ATC_CODE) |
| 포장형태 | **B** | (실측 35.8% 결측) 정규화 + 결측 fallback 필요(DrugExtension.packageUnit) |
| 묶음의약품 대표코드 | **C** | 성분유사·다제조사 위험 → 참고/보조만 |
| ProductMaster 직접생성 가능성 | **D(제외)** | Core 동결 + 미검증 데이터 직접 적재 금지 → candidate 경유 |
| representative_products 자동생성 가능성 | **C** | 키는 있으나 **실측 다제조사 7~8%** + 과대묶음 위험 → 운영자 검토 전제 |
| ProductIdentifier 부착 가능성 | **A** | enum·구조·중복수용 모두 준비됨 |
| CSV 인코딩 확정 / 실 행 통계 | **A** | (E→A) EUC-KR/CP949 확정 · 305,522행 전수 통계 산출 완료(§4·§10~§13) |

### 최종 판단 (필수 답변)

1. **약가마스터 1행 = ProductMaster 후보?** → **YES**(1행=표준코드=포장단위=barcode grain 1건, IR §5 정합). 단 식별자 슬롯 충돌 회피 필요.
2. **품목기준코드/묶음 대표코드 = representative_products 후보?** → **품목기준코드 = YES(우선)**. 묶음 대표코드 = 보조만(성분유사·다제조사 위험).
3. **대표상품 자동생성 가능 vs 운영자 검토?** → **운영자 검토 필요.** 자동생성은 다제조사·과대묶음 위험으로 금지. candidate 큐 경유 후 승격.
4. **표준코드 = barcode 직접저장 vs ProductIdentifier?** → **ProductIdentifier(KOREA_DRUG_CODE) 우선.** barcode 직접저장 보류(UNIQUE/immutable/≠GTIN).
5. **ProductMaster Core 전 candidate/draft 필요?** → **필요. 그리고 이미 구현됨**(`ProductCandidate` + `csv_import` source). 약가마스터는 candidate로 적재.
6. **FOUNDATION WO 바로 vs candidate import 설계 IR 선행?** → **`representative_products` FOUNDATION WO(테이블+nullable FK)는 진행 가능**(candidate 계층이 이미 있어 import는 별개로 안전). 단 **약가마스터 candidate import 설계는 별도 IR/WO 선행 권장** — 인코딩 확정·표준코드/품목기준코드 식별자 매핑 규칙·다제조사 묶음 정제 규칙(§13,§17)을 확정한 뒤 import. 즉 **FOUNDATION(스키마)과 DRUG-CANDIDATE-IMPORT(데이터)를 분리**하면 둘 다 안전하게 병행 가능.

## 19. 후속 WO / IR 제안

- **WO-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1** (IR §15 그대로) — `representative_products` 신설 + `product_masters.representative_product_id` nullable FK. Core 동결 → 명시적 WO + 소비처 전수 영향평가. candidate 계층이 이미 있으므로 import와 독립 진행 가능.
- **IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1** (신규 제안) — 약가마스터 CSV → `ProductCandidate(csv_import)` 적재 설계. 실측 확정사항 반영:
  - ① 확보 경로 = `fileData.do` usage-flow(§4.1) 또는 OpenAPI 운영키. ② 인코딩 = **CP949 고정**(`iconv -f cp949`). ③ 매핑: 표준코드→KOREA_DRUG_CODE / 품목기준코드→MFDS_CODE / ATC→ATC_CODE. ④ 품목기준코드 그룹핑 시 **다제조사 7~8% 감지→manufacturer 단일파생 금지(검토 플래그)**. ⑤ active 판정 = 취소일자 공란(75.56%). ⑥ **CSV 따옴표 인용 필드 파서 필수**(단순 split 금지) + **표준/품목 코드 trailing-space trim**. ⑦ 포장형태 35.8% 결측 → 포장단위명 fallback 규칙.
- ~~CHECK 재실행(E 해소)~~ → **본 갱신으로 완료**(2025-10-31 기준 파일 1회 실확보·전수 통계). 차기 갱신(2026-11-30) 이후 재측정만 권장.
- (정정) FOUNDATION/후속 WO 매핑표의 `MFDS_ITEM_CODE` → **`MFDS_CODE`** 로 표기 정정.

---

**작성:** O4O Platform CHECK · 2026-06-30 (갱신: 본문 1회 실확보·전수 실측 반영)
**성격:** read-only 데이터 검증 — 코드/DB/import/migration 변경 없음. **bulk CSV 본문 1회 실확보 완료**(2025-10-31 기준, 54.88MB, EUC-KR/CP949, 305,522행). 인코딩·행수·결측/중복/다포장/다제조사 통계 전수 실측. 등급 E 전부 해소. 원본 CSV는 repo 미커밋(스크래치 분석), 300행 샘플만 `docs/checks/artifacts/`(커밋 제외).

> 출처표시: 본 문서가 참조한 약가마스터 데이터 = 건강보험심사평가원_약가마스터_의약품표준코드 (공공데이터포털 15067462, 공공저작물 제1유형).
