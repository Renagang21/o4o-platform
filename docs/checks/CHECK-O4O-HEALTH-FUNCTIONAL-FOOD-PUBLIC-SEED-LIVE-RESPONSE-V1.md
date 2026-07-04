# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1

> 식약처 건강기능식품정보 API 라이브 응답(HTTP 200) read-only 검증
> 작성일: 2026-07-04 · 상태: 샘플 1건 라이브 검증 완료 · 코드 변경/DB write/커밋(문서 외) 없음
> 트랙: **건강기능식품 전용** (의료기기 / 의약외품 / 약가마스터 등 타 트랙과 분리)

---

## 1. 목적

기존 `CHECK-O4O-PUBLIC-DATA-API-SAMPLE-RESPONSE-V1` 에서 식약처 건강기능식품정보 API 는
serviceKey 구독 미승인으로 **HTTP 403 (Forbidden)** 이었고 라이브 응답을 캡처하지 못했다.
본 CHECK 는 활용신청 승인 반영 이후 **HTTP 200 라이브 응답을 실제로 확보**한 기준점을 고정한다.

- 샘플 1건(`numOfRows=1`) 호출로 접근 가능 상태 전환(403 → 200) 확정
- 실제 응답 구조(`body.items[].item` 이중 래핑) 및 `totalCount` 확정
- item 실제 필드명 확정 (명세 예상 → 라이브 확정)
- ProductCandidate 후보 적합성 판단, ProductMaster 승격 보류 근거 기록

> 이 문서는 **사실 고정용**이다. raw 대량 수집·매퍼 확정은 후속 WO 범위이며 본 문서에서 하지 않는다.

---

## 2. 검증 방법 (키 마스킹 명시)

- 인증키는 repo 밖 canonical env `G:\내 드라이브\자료실\public-data-api-samples\.env.public-data` 의
  `PUBLIC_DATA_SERVICE_KEY` (= `MFDS_API_KEY`, 동일 값) 를 **셸 변수로만** 사용했다.
  값은 출력/기록/커밋하지 않았다. 본 문서·명령·로그 어디에도 serviceKey 원문은 없다.
- 키 길이 관측: 64자(클린 키, `%`/`+`/`/`/`=` 미포함) → Encoding/Decoding 구분 무의미.
- curl 로 **1건(`numOfRows=1`)만** 호출. 대량 호출 없음.
- 코드 변경·운영 DB 적재·git commit/push(문서 외) 없음.

### 호출 파라미터
```
endpoint: https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01
ServiceKey=<env에서 읽은 값, 미출력>
type=json
pageNo=1
numOfRows=1
```

---

## 3. 라이브 결과

### 3.1 접근 상태 전환
| 시점 | HTTP | 의미 |
|---|---|---|
| 기존 CHECK (2026-07-02) | 403 Forbidden | 키 유효하나 활용신청 미승인 |
| **본 CHECK (2026-07-04)** | **200** | **활용신청 승인 반영 완료, 라이브 응답 정상** |

- `header.resultCode = "00"`, `header.resultMsg = "NORMAL SERVICE."`
- **`totalCount = 44,885`**

### 3.2 응답 구조 (라이브 확정)
```
header.resultCode / resultMsg
body.pageNo / numOfRows / totalCount
body.items[]  ← 배열. 각 원소가 { "item": { ...필드 } } 형태 (이중 래핑)
```

> ⚠️ **파싱 주의**: 표준 `body.items.item[]` 이 아니라 **`body.items[].item`** 이다.
> `items` 가 이미 배열이고 각 원소 안에 `item` 키가 한 번 더 있다.
> JSONL 적재 시 `body.items[].item` 을 평탄화해야 한다.

### 3.3 item 실제 필드 (라이브 확정)
| 필드 | 의미 | 비고 |
|---|---|---|
| `ENTRPS` | 업체명 | |
| `PRDUCT` | 제품명 | **선행 공백 있음 → trim 필요** |
| `STTEMNT_NO` | 품목제조신고번호 | 식별자 (`MFDS_STTEMNT_NO` 후보) |
| `REGIST_DT` | 등록일자 | |
| `DISTB_PD` | 유통기한 | 텍스트 |
| `SUNGSANG` | 성상 | 텍스트 |
| `SRV_USE` | 섭취방법/용도 | 텍스트 |
| `PRSRV_PD` | 보관조건 | 텍스트 |
| `INTAKE_HINT1` | 섭취 시 주의사항 | 개행 포함 |
| `MAIN_FNCTN` | 주된 기능성 | 텍스트 |
| `BASE_STANDARD` | 기준·규격 | 개행 포함 |

---

## 4. 판단

### 4.1 ProductCandidate 후보 적합성
- 상품명(`PRDUCT`)·업체명(`ENTRPS`)·식별번호(`STTEMNT_NO`) 존재 → **ProductCandidate 후보 가능**.
- `rawPayload` 는 평면 JSON(item 단위) → 적재 적합.

### 4.2 ProductMaster 승격 — **V1 보류**
- **사유**: barcode / GTIN / 포장단위 / 허가상태 필드 부재.
- 식별자는 식약처 내부 품목제조신고번호(`STTEMNT_NO`) 위주로, 유통 식별자(바코드) 부재.
- 등급: **C (보조 검색 / 후보풀 보강 성격)** — 기존 CHECK 예상과 일치.

### 4.3 XML 비교 — 불필요
- **사유**: `type=json` 정상 동작 확인(200, 정상 JSON 본문). XML fallback 검증 불요.

---

## 5. 준수 확인 (WO 계약)

| 항목 | 상태 |
|---|---|
| 키 원문 출력/기록/커밋 | **0 (미출력)** |
| DB write | **0** |
| ProductCandidate apply | **0** |
| ProductMaster / ProductIdentifier 생성 | **0** |
| raw 대량 fetch / commit | **0** (샘플 1건만 호출) |
| 이번 커밋 범위 | **문서만** |
| 타 트랙(의료기기/의약외품 등) 혼입 | **없음** |

---

## 6. 다음 단계 (후속 WO)

- **WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-RAW-SAMPLE-FETCH-DRYRUN-V1**
  - 범위: `numOfRows=100` 정도만 fetch
  - 저장(repo 밖): `G:\내 드라이브\자료실\public-data-api-samples\mfds-health-functional-food-info-raw.jsonl`
  - 확인 항목: parse 오류 / `body.items[].item` flatten / 필드 존재율 / `STTEMNT_NO` 중복 여부
- 이후: 필드 존재율 확정 시 매퍼 설계 여부 판단(승격은 계속 보류, 후보풀/보조 검색 성격 유지).
