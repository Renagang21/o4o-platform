# CHECK-O4O-PUBLIC-DATA-API-SAMPLE-RESPONSE-V1

> data.go.kr 공공데이터 API 5종 샘플 응답 read-only 검증
> 작성일: 2026-07-02 · 상태: read-only 검증 완료 · 코드 변경/커밋 없음

---

## 1. 목적

O4O `ProductCandidate` / `ProductMaster` 파이프라인에 활용할 수 있는지 판단하기 위해,
data.go.kr 식약처(기관코드 `1471000`) 계열 공공데이터 API 5종의 실제 엔드포인트를
확인하고 샘플 응답을 read-only 로 검증한다. 다음을 확인한다.

- 정확한 요청 엔드포인트(경로 + 필수/선택 파라미터)
- serviceKey 인증 통과 여부
- JSON 응답 지원 여부 (`type=json`)
- 페이징(`pageNo`/`numOfRows`), `totalCount`, `items` 구조
- 주요 응답 필드명
- `ProductCandidate.rawPayload` 적재 적합성
- `ProductMaster` 승격 필요 필드 커버리지

---

## 2. 검증 방법 (키 마스킹 명시)

- 인증키는 `apps/api-server/.env` 의 `MFDS_API_KEY` (= `PUBLIC_DATA_SERVICE_KEY`, 동일 값)를
  **셸 변수로만** 사용했다. 값은 출력/기록/커밋하지 않았다. 본 문서·명령·로그 어디에도 serviceKey 원문은 없다.
- curl 로 각 API 를 **1건(`numOfRows=1`)씩만** 호출했다. 대량 호출 없음.
- 엔드포인트 경로는 data.go.kr 상세페이지(국문/영문 명세) 및 오픈API 문서에서 확인했다(추측 아님).
- 코드 변경·운영 DB 적재·git commit/push 없음.

### 키 형식 관측
- 길이 64자, 영숫자만(`%`, `+`, `/`, `=` 없음) → **Encoding 키와 Decoding 키가 동일**한 "클린 키".
  즉 URL-encode/decode 이슈는 발생하지 않는다(`--data-urlencode` vs raw append 결과 동일).

### data.go.kr 게이트웨이 응답코드 해석 (실측으로 확정)

동일 게이트웨이에서 응답코드가 **의미별로 다르게** 나온다는 것을 실측으로 구분했다.

| HTTP | 본문 | 의미 (실측 근거) |
|---|---|---|
| 401 | `Unauthorized` | serviceKey 자체가 인식 안 됨 (garbage/empty 키 투입 시) |
| 403 | `Forbidden` | **키는 유효하나 해당 API 에 대한 활용신청(구독)이 승인 안 됨** |
| 404 | `API not found` | 오퍼레이션 경로(getXxx) 오타 |
| 500 | `Unexpected errors` | 경로는 라우팅되나 백엔드 오류(폐기된 서비스/필수 파라미터 문제 등) |

> **핵심 판별**: 같은 대상 엔드포인트에 대해 garbage 키 → **401**, 실제 키 → **403**.
> 이 401↔403 차이는 "**실제 키는 유효(인식됨)하지만, 이 API 를 쓸 권한이 없다**"를 명확히 증명한다.
> 즉 5종 모두 **키 미구독(활용신청 미승인)** 상태이며, 키 자체 무효가 아니다.

---

## 3. API별 결과

> 5종 **모두 실제 키로 403 Forbidden** = 구독 미승인. 라이브 샘플 응답(JSON 본문/필드/totalCount)은
> **캡처 불가**. 따라서 응답 구조·필드는 data.go.kr 공식 명세 기준(unverified-live)으로 기록한다.
> 엔드포인트 경로 자체는 확인됨(경로 오류 시 404 가 나오는데, 5종 모두 404 가 아니라 403 이었다 = 경로는 정확).

### 3.1 의약품 제품 허가정보 (data ID 15095677)
- **엔드포인트(경로)**: `apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07`
- **인증**: 실제 키 → **403 Forbidden (구독 미승인)** / garbage 키 → 401 (경로/키 판별 확인)
- **JSON**: 명세상 지원(`type=json`|`xml`). 라이브 미검증.
- **페이징**: `pageNo`, `numOfRows` 지원(명세)
- **선택 파라미터**: `induty`, `spclty_pblc`, `prdlst_Stdr_code`, `entp_name`, `prduct_prmisn_no`,
  `item_name`, `entp_seq`, `entp_no`, `edi_code`, `item_ingr_name`, `bizrno`
- **totalCount**: 명세상 `header`/`body` 구조에 존재(표준 data.go.kr 포맷). 라이브 미검증.
- **items**: 표준 `body.items.item[]` 래핑 예상
- **주요 필드(명세/기존코드 매핑 기준)**: `ITEM_NAME`(제품명), `ENTP_NAME`(업체명),
  `ITEM_SEQ`(품목일련번호), `ITEM_PERMIT_NO`(허가번호), `PRDUCT_TYPE`(분류),
  `ITEM_INGR_NAME`(주성분), `CANCEL_NAME`(허가/취하 상태), `PERMIT_KIND_NAME`, `EDI_CODE`(보험코드), `BAR_CODE`
- **rawPayload 적합성**: 평면 JSON(중첩 없음) 예상 → 적합
- **승격 필드**: 상품명/업체명/식별코드(ITEM_SEQ)/허가번호/허가상태 모두 존재 → 커버리지 높음

### 3.2 의약외품 제품 허가정보 (data ID 15095679)
- **엔드포인트(경로)**: `apis.data.go.kr/1471000/QdrgPrdtPrmsnInfoService03/getQdrgPrdtPrmsnInfoInq03`
- **인증**: 실제 키 → **403 (구독 미승인)**
- **JSON**: 명세상 지원(`type=json`|`xml`). 라이브 미검증.
- **페이징**: `pageNo`, `numOfRows` 지원(명세)
- **선택 파라미터**: `item_seq`, `item_name`, `class_no`, `entp_name`, `entp_no`, `entp_seq`, `bizrno`
- **totalCount / items**: 표준 `header`/`body.items.item[]` 예상. 라이브 미검증.
- **주요 필드(명세 기준)**: `ITEM_NAME`(제품명), `ENTP_NAME`(업체명), `ITEM_SEQ`(품목일련번호),
  `ITEM_PERMIT_NO`(허가번호), `CLASS_NO`(품목코드), 효능효과/용법용량/사용상주의 텍스트 필드
- **rawPayload 적합성**: 평면 JSON 예상 → 적합
- **승격 필드**: 상품명/업체명/식별코드/허가번호 존재 → 커버리지 높음(허가상태 필드 확인은 라이브 필요)

### 3.3 건강기능식품정보 (data ID 15056760)
- **엔드포인트(경로)**: `apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01`
- **인증**: 실제 키 → **403 (구독 미승인)**
- **JSON**: 명세상 지원(`type=json`|`xml`, 기본 xml). 라이브 미검증.
- **페이징**: `pageNo`, `numOfRows` 지원(명세)
- **선택 파라미터**: `STTEMNT_NO`(품목제조신고번호), `Prduct`(제품명)
- **totalCount / items**: 표준 `header`/`body.items.item[]` 예상. 라이브 미검증.
- **주요 필드(명세 기준)**: 업체명(`ENTRPS`/`BSSH_NM` 계열), 제품명(`PRDUCT`/`PRDLST_NM`),
  품목제조관리번호(`STTEMNT_NO`), 성상/섭취방법/유통기한/주의사항 텍스트
- **rawPayload 적합성**: 평면 JSON 예상 → 적합
- **승격 필드**: 상품명/업체명/식별번호(STTEMNT_NO) 존재. **허가상태·바코드 부재 가능** → 보조 정보 성격 강함

### 3.4 의료기기 표준코드별 제품정보 (data ID 15073875)
- **엔드포인트(경로)**: `apis.data.go.kr/1471000/MdeqStdCdPrdtInfoService03/getMdeqStdCdPrdtInfoInq03`
- **인증**: 실제 키 → **403 (구독 미승인)** (param 유무·`type`/`_type` 무관하게 일관 403 → 경로 아님, 구독 문제 확정)
- **JSON**: 명세상 지원. 라이브 미검증.
- **페이징**: `pageNo`, `numOfRows` 지원(명세)
- **totalCount / items**: 표준 `header`/`body.items.item[]` 예상. 라이브 미검증.
- **주요 필드(명세 기준)**: UDI-DI 코드(표준코드), 제품명, 분류번호, 등급, 품목허가번호, 허가일자,
  모델명, 제조/수입업체명, 이식형/일회용/추적관리 여부, 멸균방법, 보관조건 등
- **rawPayload 적합성**: 평면 JSON 예상 → 적합
- **승격 필드**: 상품명/업체명/**표준코드(UDI-DI, 강한 식별자)**/허가번호 존재 → 커버리지 높음.
  UDI-DI 는 바코드성 식별자로 ProductIdentifier 후보

### 3.5 기능성화장품 보고품목정보 (data ID 15095680)
- **엔드포인트(경로)**: `apis.data.go.kr/1471000/FtnltCosmRptPrdlstInfoService/getRptPrdlstInq`
- **인증**: 실제 키 → **403 (구독 미승인)**
- **JSON**: 명세상 지원. 라이브 미검증.
- **페이징**: `pageNo`, `numOfRows` 지원(명세)
- **totalCount / items**: 표준 `header`/`body.items.item[]` 예상. 라이브 미검증.
- **주요 필드(명세 기준)**: 제품명, 제조사/책임판매사 정보, 책임판매업 등록번호,
  보고일련번호(식별자), 보고일자
- **rawPayload 적합성**: 평면 JSON 예상 → 적합
- **승격 필드**: 상품명/업체명/보고일련번호(식별자) 존재. **허가/승인 상태 개념은 '보고' 기반** →
  허가상태 필드 성격 상이. 바코드 부재 가능 → 보조 검색 성격

---

## 4. API 요약표

| API | data ID | 엔드포인트(경로만) | 인증 | JSON | 페이징 | totalCount | 주요필드 | rawPayload적합 | 승격필드 | 등급 |
|---|---|---|---|---|---|---|---|---|---|---|
| 의약품 제품 허가정보 | 15095677 | `1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07` | 403(미구독)* | 명세O | 명세O | 명세O(미검증) | ITEM_NAME/ENTP_NAME/ITEM_SEQ/ITEM_PERMIT_NO/CANCEL_NAME | 적합(예상) | 상품·업체·식별·허가·상태 | B* |
| 의약외품 제품 허가정보 | 15095679 | `1471000/QdrgPrdtPrmsnInfoService03/getQdrgPrdtPrmsnInfoInq03` | 403(미구독)* | 명세O | 명세O | 명세O(미검증) | ITEM_NAME/ENTP_NAME/ITEM_SEQ/ITEM_PERMIT_NO/CLASS_NO | 적합(예상) | 상품·업체·식별·허가 | B* |
| 건강기능식품정보 | 15056760 | `1471000/HtfsInfoService03/getHtfsItem01` | 403(미구독)* | 명세O | 명세O | 명세O(미검증) | 제품명/업체명/STTEMNT_NO | 적합(예상) | 상품·업체·식별(허가상태·바코드 약함) | C* |
| 의료기기 표준코드별 제품정보 | 15073875 | `1471000/MdeqStdCdPrdtInfoService03/getMdeqStdCdPrdtInfoInq03` | 403(미구독)* | 명세O | 명세O | 명세O(미검증) | UDI-DI/제품명/허가번호/업체명/등급 | 적합(예상) | 상품·업체·**UDI-DI(강)**·허가 | B* |
| 기능성화장품 보고품목정보 | 15095680 | `1471000/FtnltCosmRptPrdlstInfoService/getRptPrdlstInq` | 403(미구독)* | 명세O | 명세O | 명세O(미검증) | 제품명/책임판매사/보고번호/보고일자 | 적합(예상) | 상품·업체·식별(허가=보고, 바코드 약함) | C* |

\* **`*` 표시 = 라이브 미검증**. 구독 미승인(403)으로 실제 응답 캡처 불가. 등급은 명세 기준 잠정.
경로는 확정(404 아님). 구독 승인 후 재검증 필요.

---

## 5. JSON vs XML 지원 비교

| API | JSON(`type=json`) | XML | 라이브 확인 |
|---|:---:|:---:|:---:|
| 의약품 제품 허가정보 | 명세 O | O | ✗(403) |
| 의약외품 제품 허가정보 | 명세 O | O | ✗(403) |
| 건강기능식품정보 | 명세 O(기본 XML) | O | ✗(403) |
| 의료기기 표준코드별 제품정보 | 명세 O | O | ✗(403) |
| 기능성화장품 보고품목정보 | 명세 O | O | ✗(403) |

- 5종 모두 data.go.kr 표준 REST 로 **JSON+XML 양쪽 명세상 지원**. 별도 `_type=json` 도 시도했으나
  구독 미승인으로 응답 자체가 없어 JSON↔XML 실차이는 라이브에서 재확인 필요.
- 참고: 건강기능식품(HtfsInfoService03)은 파라미터명이 `ServiceKey`/`Prduct`(대문자 혼용)로 명세되어 있어
  라이브 검증 시 파라미터 케이싱 주의 필요.

---

## 6. ProductCandidate 적재 적합성 등급 (A~E)

기준: A=바로 적재/승격 가능, B=적재 가능(라이브 확인/일부 필드 보강 필요), C=보조 검색용,
D=구조 부적합, E=엔드포인트/접근 불가.

| 등급 | 정의 | 해당 API |
|---|---|---|
| A | 확정 적재+승격 | (없음 — 라이브 미검증으로 A 부여 불가) |
| B | 적재 가능(구독+라이브 확인 후) | 의약품, 의약외품, 의료기기 |
| C | 보조 검색/보강용(식별·상태 약함) | 건강기능식품, 기능성화장품 |
| D | 구조 부적합 | (없음 — 5종 모두 평면 JSON 예상) |
| E | 접근 불가 | (현재는 5종 모두 **접근 불가 상태**지만 원인=구독 미승인이지 경로/구조 문제 아님) |

> **현 시점 실질 등급**: 5종 전부 "**E(접근 불가, 사유=구독 미승인)**". 구독 승인 시 위 B/C 로 상향 예상.

---

## 7. ProductMaster 승격 필드 커버리지 (명세 기준 예상)

| 승격 필드 | 의약품 | 의약외품 | 건기식 | 의료기기 | 기능성화장품 |
|---|:---:|:---:|:---:|:---:|:---:|
| 상품명 | O | O | O | O | O |
| 업체명 | O | O | O | O | O |
| 식별코드 | ITEM_SEQ | ITEM_SEQ | STTEMNT_NO | **UDI-DI(강)** | 보고번호 |
| 허가/승인번호 | O | O | △(제조신고) | O | △(보고) |
| 허가/승인상태 | CANCEL_NAME | △ | ✗ | △ | ✗(보고제) |
| 바코드 | △(BAR_CODE 가능) | ✗ | ✗ | △(UDI 계열) | ✗ |

- 의약품/의약외품/의료기기: 승격 핵심 필드(상품·업체·식별·허가) 커버 → **승격 매퍼 제작 현실적**.
- 건기식/기능성화장품: 상태·바코드 약함 → 승격보다 **후보풀 보강/보조 검색** 성격.

---

## 8. ProductIdentifier type 추가 필요 여부

- 의료기기 **UDI-DI(표준코드)**: 바코드/GTIN 과 별개의 강한 식별자 → **`UDI_DI` (또는 `MFDS_UDI`) type 신규 필요 가능성 높음**.
- 의약품 **ITEM_SEQ(품목일련번호)** / 의약외품 ITEM_SEQ / 건기식 STTEMNT_NO / 기능성화장품 보고번호:
  식약처 내부 품목 식별자 → **`MFDS_ITEM_SEQ` 계열 type 추가 검토 권장**(허가번호와 구분).
- 허가번호(ITEM_PERMIT_NO)는 기존 permitNumber 로 수용 가능.
- 결론: **최소 UDI-DI 용 type 1종 추가 필요**, 품목일련번호 계열 type 1종 추가 권장(라이브 필드 확정 후 결정).

---

## 9. 위험 / 한계

1. **라이브 응답 0건 캡처**: 5종 모두 serviceKey 구독 미승인(403)으로 실제 JSON 본문/필드/totalCount 미검증.
   본 문서의 필드·구조는 **data.go.kr 공식 명세 + 기존 코드 매핑 기준 예상치**이며, 구독 승인 후 재검증 필수.
2. **기존 코드 barcode API 폐기 정황**: 현행 `mfds.service.ts` 가 쓰는
   `MdcinBardInfoService01`, `HlthFoodBardInfoService` 는 valid 키+정상 param 으로도 **500(Unexpected errors)** 반환
   → 폐기/변경 정황. 별도 확인 필요(이번 5종과 무관하나 회귀 위험).
3. **파라미터 케이싱**: 건기식 API 는 `ServiceKey`/`Prduct` 등 케이싱이 표준과 다르게 명세됨 → 라이브 검증 시 주의.
4. **구독 대상 확인**: 각 API 는 data.go.kr 에서 **개별 활용신청/승인**이 필요. 5종 각각 신청해야 함.

---

## 10. 결론 및 다음 결정

### 요청서 5개 질문 답변
1. **ProductCandidate 에 바로 쓸 수 있는 API**: 현재 **없음**(전부 구독 미승인 403). 구독 승인 시
   **의약품·의약외품·의료기기**가 후보(상품·업체·식별·허가 필드 명세상 충족).
2. **필드 부족으로 보조 검색만 해야 하는 API**: **건강기능식품, 기능성화장품**
   (허가상태/바코드 약함, 식별자는 내부 번호 위주).
3. **JSON 기준 매퍼 제작 가능 여부**: 5종 모두 명세상 JSON 지원 → **JSON 매퍼 제작 방향 타당**.
   단 **라이브 응답 미확보 상태에서 매퍼 확정 금지** — 구독 승인 후 실제 필드명/래핑(`body.items.item[]`)
   확인 뒤 매퍼 작성 권장.
4. **XML 비교가 필요한 API**: 라이브 검증이 막혀 현재 판정 불가. 구독 후 JSON 우선 시도하고,
   JSON 이 비거나 필드 누락 시 **건강기능식품(기본 XML 명세)** 을 1순위 XML 비교 대상으로 둔다.
5. **ProductIdentifier type 추가 필요 여부**: **필요**. 최소 의료기기 **UDI-DI** 용 type 1종,
   그리고 식약처 품목일련번호(ITEM_SEQ/STTEMNT_NO/보고번호) 계열 type 1종 추가 권장(라이브 확정 후).

### 다음 결정 (권장)
- **선결 조건**: data.go.kr 에서 5종 각 API **활용신청→승인** 확보(현 키는 유효하나 미구독).
  승인 후 본 CHECK 를 라이브로 재실행하여 등급을 E→B/C 로 확정.
- 승인 후: 의약품/의약외품/의료기기 우선으로 JSON 매퍼 + ProductIdentifier type 설계 WO 착수.
- 병행: 기존 `mfds.service.ts` barcode API 500 정황 별도 조사(회귀 방지).
