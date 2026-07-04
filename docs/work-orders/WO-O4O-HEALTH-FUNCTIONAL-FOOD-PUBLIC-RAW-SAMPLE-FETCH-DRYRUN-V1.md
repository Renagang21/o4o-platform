# WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-RAW-SAMPLE-FETCH-DRYRUN-V1

> 식약처 건강기능식품정보 API 100건 raw sample fetch dry-run 결과 고정
> 작성일: 2026-07-04 · 상태: dry-run 완료 (read-only 수집) · raw commit 없음 / DB write 없음
> 트랙: **건강기능식품 전용** (타 트랙 혼입 없음)
> 선행: [`CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1`](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md)

---

## 1. 목적

live 200 확정([선행 CHECK](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md)) 이후,
소량(100건) 실수집으로 **응답 파싱·필드 존재율·식별자 중복 여부**를 검증하고 후속 매퍼 설계 근거를
repo 기준선으로 고정한다. 전량 수집·매퍼 확정·적재는 본 WO 범위가 아니다.

---

## 2. 수집 파라미터

```
endpoint: https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01
ServiceKey=<repo 밖 .env.public-data 에서 읽음, 미출력>
type=json
pageNo=1
numOfRows=100
```

- HTTP 200, `header.resultCode=00 (NORMAL SERVICE.)`
- **totalCount: 44,885** (수집 범위 100건 = pageNo=1 첫 페이지)

### raw 저장 위치 (repo 밖)
```
G:\내 드라이브\자료실\public-data-api-samples\mfds-health-functional-food-info-raw.jsonl
```
- repo 밖 canonical 저장소. **raw commit 없음.**
- 저장 형식: `body.items[].item` 을 flatten 하여 **1 라인 = 1 item(최상위 필드)** JSONL. (타 트랙 raw의 `.item` 래핑과 다름 — 이 파일은 flatten 됨.)

---

## 3. dry-run 결과

### 3.1 파싱
| 항목 | 값 |
|---|---|
| 응답 구조 | `body.items[]` → 각 원소 `{ item: {...} }` (이중 래핑) |
| flatten 대상 | `body.items[].item` |
| flatten 건수 | 100 |
| **flatten 오류** | **0** |
| JSONL 기록 라인 | 100 |
| unexpected field (11개 외) | **0** |

### 3.2 필드 존재율 (non-empty / 100)
| 필드 | 존재율 |
|---|---|
| `ENTRPS` (업체명) | 100% |
| `PRDUCT` (제품명) | 100% |
| `STTEMNT_NO` (품목제조신고번호) | 100% |
| `REGIST_DT` (등록일자) | 100% |
| `DISTB_PD` (유통기한) | 100% |
| `SUNGSANG` (성상) | 100% |
| `SRV_USE` (섭취방법/용도) | 100% |
| `MAIN_FNCTN` (주된 기능성) | 100% |
| `BASE_STANDARD` (기준·규격) | 100% |
| `PRSRV_PD` (보관조건) | **99%** |
| `INTAKE_HINT1` (섭취 시 주의사항) | **94%** |

→ 핵심 필드(상품명·업체명·식별번호)는 100%. `PRSRV_PD`/`INTAKE_HINT1` 만 결측 존재 → **선택 필드로 취급(NOT NULL 금지)**.

### 3.3 식별자 / 정제
| 항목 | 값 | 함의 |
|---|---|---|
| `STTEMNT_NO` distinct | 100 / 100 | **중복 0** — 배치 내 식별자 유일 |
| `STTEMNT_NO` duplicate | 0 | 후보 dedup 키로 사용 가능(전량 수집 시 재확인) |
| `PRDUCT` 선행 공백 | **38 / 100 (38%)** | 데이터 전반 패턴 → **적재 시 trim 필수** |

---

## 4. 판단 (유지)

- **ProductCandidate 후보 가능**: 상품명·업체명·식별번호 안정적, 평면 JSON → 적재 적합.
- **ProductMaster 승격 — V1 보류 유지**. 사유: barcode / GTIN / 포장단위 / 허가상태 부재. 등급 C(보조/보강).
- 매퍼 설계 시 필수 정규화: `PRDUCT` trim, `PRSRV_PD`/`INTAKE_HINT1` nullable 허용.

---

## 5. 준수 확인 (WO 계약)

| 항목 | 상태 |
|---|---|
| 키 원문 출력/기록/커밋 | **0 (미출력)** |
| DB write | **0** |
| ProductCandidate apply | **0** |
| ProductMaster / ProductIdentifier 생성 | **0** |
| raw commit | **0** (repo 밖 저장만) |
| 이번 커밋 범위 | **문서만** |
| 타 트랙(의료기기/의약외품 등) 혼입 | **없음** |

---

## 6. 다음 단계 후보 (문서화 이후 판단)

1. ProductCandidate import dry-run 설계 (승격 없이 후보 적재 경로 검증)
2. 전량(44,885) 수집 여부 판단 (페이징 44,885/numOfRows)
3. 건강기능식품 V1 조사 종료

> 승격은 계속 보류. 본 트랙은 후보풀 / 보조 검색 성격 유지.
