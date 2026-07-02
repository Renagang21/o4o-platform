# CHECK-O4O-EASY-DRUG-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1

> WO: **WO-O4O-EASY-DRUG-INFO-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1**
> 성격: **오프라인(DB 없이) 파일 기반 매칭 시뮬레이션** — 실 DB write 0, ProductCandidate/ProductMaster/SharedProductDescription/ProductImage 미생성.
> 선행 기준선: 표준상품 설계 (commit `06e007fb1`), `CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1`.

---

## 0. 요약 (한눈에)

- 약가마스터 전체 CSV **재다운로드 성공** (54,880,067 bytes = 이전 실측과 byte 일치, 305,522 데이터행).
- e약은요 `itemSeq` ↔ 약가마스터 `품목기준코드` 오프라인 exact 매칭:
  - **매칭률 100%** (matchedItemSeq 4,757 / distinctItemSeq 4,757, unmatched 0).
  - 약가마스터 품목기준코드 커버리지 4.94% (e약은요는 96,236개 품목 중 4,757개만 다룸).
- **설명 1벌 → 평균 4.08개 SKU(표준코드), 중앙값 3, 최대 114** 에 연결됨. → "설명 1벌 → N ProductMaster 파생" 구조가 데이터로 실증됨.
- 다제조사 itemSeq 476개(10%), 매칭+이미지 보유 itemSeq 2,789개(59%).

---

## 1. 목적

설계 기준선(`06e007fb1`)의 grain 관계 —
- **ProductMaster = 포장단위/SKU** (grain = 약가마스터 **표준코드**)
- **e약은요 itemSeq = 품목·설명 단위** (grain = **품목기준코드**)
- 설명 원천 = `ProductCandidate.rawPayload.officialConsumerText`, 파생 = master별 `SharedProductDescription`

이 관계에서 **"설명 1벌이 실제 몇 개 SKU에 연결되는지"** 규모를 실 DB 없이 파일로 추정한다. SharedProductDescription 파생 WO / ProductMaster 승격 설계 / 이미지 복사 WO 의 진행 가부·기대효과를 데이터로 판단하는 것이 목적이다.

---

## 2. 입력 파일 / 다운로드 결과

| 파일 | 경로 (repo 밖) | 크기 | 행수 | 인코딩 |
|---|---|---|---|---|
| 약가마스터 CSV (재다운로드) | `C:\Users\home\coding\o4o-public-data-samples\mfds-drug-master-standard-code.csv` | 54,880,067 B | 305,522 (헤더 제외) | CP949 |
| e약은요 raw JSONL (기존) | `C:\Users\home\coding\o4o-public-data-samples\mfds-easy-drug-info-raw.jsonl` | ~12.9 MB | 4,774 line (blank 1) | UTF-8 |
| 매칭 리포트 (산출) | `C:\Users\home\coding\o4o-public-data-samples\easy-drug-master-match-report.json` | ~8 KB | — | UTF-8 |

> raw CSV(54MB)·리포트 JSON 은 **repo 밖**이며 git 미추적. 본 CHECK 문서와 코드(시뮬레이터/CLI/테스트)만 커밋한다.

### 2.1 다운로드 절차 (실증, 로그인/캡차 불필요)

1. Playwright MCP 로 `https://www.data.go.kr/data/15067462/fileData.do` 로드.
2. in-browser `fetch` 로 **POST `/tcs/dss/selectFileDataDownload.do`** (body `publicDataPk=15067462&publicDataDetailPk=uddi:456729a5-28ed-494d-b5a8-ba5000eb6bab`) 실행 → JSON 응답 최상위 **`atchFileId=FILE_000000003550228`**, `fileDetailSn=1`, `dataNm=건강보험심사평가원_약가마스터_의약품표준코드_20251031` 수신.
   - ⚠️ 정적 HTML 의 atchFileId 는 stale — 반드시 이 AJAX 로 fresh 값을 받아야 함(선행 CHECK §4.1 규명).
3. 동일 세션 `JSESSIONID` 쿠키를 curl 에 전달, `/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003550228&fileDetailSn=1&dataNm=<encoded>` 로 본문 수신.
   - 결과: `HTTP=200`, `content-type: application/octet-stream`, `size_download=54880067`.
4. 검증: 첫 바이트 `c7 d1` = "한"(CP949), `iconv -f cp949` 헤더 22컬럼 전량 일치, `wc -l` = 305,523 line(= 305,522 데이터행 + 헤더).

---

## 3. 매칭 축 / 방법

- **매칭 축**: e약은요 `item.itemSeq` ↔ 약가마스터 `품목기준코드` (둘 다 MFDS_CODE = 동일 식별 체계).
- **정규화**: `trim()` 후 exact string match, 빈문자열 → null(미매칭).
- **표준코드(SKU grain)**: 13자리 숫자(`/^\d{13}$/`) 형식검증 통과분만 SKU 로 카운트(requireValidStandardCode 기본 true).
- 순수 함수(DB/네트워크/파일 무관): `easy-drug-to-master-offline-match.simulator.ts`. 파싱은 기존 `drug-master-csv.parser.ts` / `easy-drug-info-jsonl.parser.ts` 재사용.

---

## 4. 지표 (전량)

### 4.1 e약은요

| 지표 | 값 |
|---|---:|
| totalRows | 4,774 |
| distinctItemSeq | 4,757 |
| missingItemSeqRows | 0 |
| duplicateItemSeqCount | 14 |
| itemSeqWithImage | 2,789 |
| itemSeqWithOfficialText | 4,757 (100%) |

### 4.2 약가마스터

| 지표 | 값 |
|---|---:|
| totalRows | 305,522 |
| distinctMfdsCode (품목기준코드) | 96,236 |
| distinctStandardCode (표준코드=SKU) | 305,522 (표준코드는 row당 유일) |
| invalidStandardCodeRows | 0 |
| missingMfdsCodeRows | 0 |
| cancelledRows (취소일자 존재) | 74,680 |

### 4.3 매칭

| 지표 | 값 |
|---|---:|
| matchedItemSeq | 4,757 |
| unmatchedEasyDrugItemSeq | **0** |
| matchedStandardCodeRows | 19,431 |
| matchedDistinctStandardCode | 19,431 |
| **matchedItemSeqCoveragePercent** | **100%** |
| matchedMfdsCodeCoveragePercent | 4.94% |
| drugMasterOnlyMfdsCode (약가마스터에만) | 91,479 |

> 해석: e약은요의 모든 품목이 약가마스터 품목기준코드에 존재(100% 매칭). 반대로 약가마스터 96,236 품목 중 e약은요가 다루는 것은 4.94%뿐 — e약은요는 소비자용 개요가 있는 일부 품목만 커버.

---

## 5. 분포표 (설명 1벌 → N SKU)

### 5.1 standardCodesPerItemSeq (= 매칭 itemSeq 1개당 distinct 표준코드/SKU 개수)

- min **2** / max **114** / mean **4.08** / median **3** / 대상 itemSeq 4,757.
- (invalidStandardCode 0, 표준코드 row당 유일 → packagesPerItemSeq 와 동일 분포)

| SKU 개수 | itemSeq 수 | 누적 % |
|---:|---:|---:|
| 2 | 1,550 | 32.6% |
| 3 | 1,207 | 58.0% |
| 4 | 740 | 73.5% |
| 5 | 387 | 81.6% |
| 6 | 301 | 88.0% |
| 7 | 163 | 91.4% |
| 8 | 125 | 94.0% |
| 9 | 75 | 95.6% |
| 10 | 62 | 96.9% |
| 11 | 38 | 97.7% |
| 12 | 23 | 98.2% |
| 13 | 15 | 98.5% |
| 14 | 15 | 98.8% |
| 15 | 8 | 99.0% |
| 16–20 | 23 | 99.5% |
| 21–30 | 19 | 99.8% |
| 31–114 (long tail) | ~11 | 100.0% |

> **모든 매칭 itemSeq 가 최소 2개 SKU** 에 연결(1:1 은 없음). 74%가 2~4개, 88%가 6개 이하. 극단값(SKU 114 = 큐앤큐바셀린윤나거즈, 86, 66 …)은 거즈/탈지면/점안액 등 포장·규격 변형이 많은 품목.

### 5.2 manufacturersPerItemSeq (매칭 itemSeq 1개당 distinct 업체명)

| 제조사 수 | itemSeq 수 |
|---:|---:|
| 1 | 4,281 (90.0%) |
| 2 | 387 |
| 3 | 75 |
| 4 | 11 |
| 5 | 3 |

- mean 1.12 / max 5. 대부분(90%) 단일 제조사. 다제조사 476건은 위탁제조/양도양수/수출명 병기 등.

### 5.3 상위 파생 itemSeq 샘플

| itemSeq | itemName | SKU | 제조사 |
|---|---|---:|---:|
| 200800378 | 큐앤큐바셀린윤나거즈 | 114 | 1 |
| 201606592 | 큐앤큐헥시코올탈지면액 | 86 | 1 |
| 199600561 | 케펜텍플라스타(케토프로펜) | 66 | 2 |
| 200713754 | 큐앤큐포비돈탈지면볼(소) | 55 | 1 |
| 200801407 | 디알프레쉬점안액(1회용) | 43 | 1 |

---

## 6. 리스크 지표

| 지표 | 값 | 비고 |
|---|---:|---|
| multiManufacturerItemSeqCount | 476 (10.0%) | 설명↔제조사 불일치 주의 대상 |
| itemSeqWithManyPackagesCount (SKU>5) | 873 (18.4%) | 대량 파생 품목 |
| **itemSeqWithImageAndMatchCount** | **2,789 (58.6%)** | 이미지 복사 WO 기대효과 모수 |
| itemSeqWithoutImageButMatchedCount | 1,968 (41.4%) | 매칭됐으나 이미지 없음 |
| itemSeqWithOfficialTextAndMatchCount | 4,757 (100%) | SharedProductDescription 파생 모수 = 전량 |

---

## 7. 결론 (WO 필수 판단 5)

### 7-1. e약은요 설명이 약가마스터 SKU에 어느 정도 연결되는가
**완전 연결.** 매칭률 **100%** (4,757/4,757, unmatched 0). 매칭된 itemSeq 는 약가마스터 표준코드(SKU) **19,431개** 에 연결된다. 반대 방향 커버리지는 4.94%(e약은요가 전체 96,236 품목 중 일부만 다룸)이나, 이는 e약은요가 소비자용 개요 보유 품목만 제공하기 때문으로 설명 파생 관점에서는 문제 아님.

### 7-2. 설명 1벌 → N개 ProductMaster 파생 구조가 현실적인가
**현실적이며 데이터로 실증됨.** 평균 4.08 / 중앙값 3 / 최대 114 SKU. **모든 매칭 품목이 1:N (N≥2)** 이므로, 설계의 "설명 단위(itemSeq) ↔ SKU 단위(표준코드) 분리 + master별 SharedProductDescription 파생" 구조가 정확히 요구된다. 1:1 저장 모델이었다면 설명 중복이 대량 발생했을 것 — 분리 설계가 옳음을 재확인.

### 7-3. SharedProductDescription 파생 WO를 바로 진행해도 되는가
**진행 가능(모수·품질 확보).** 매칭 100% + 공식설명 보유 100%(4,757 전량). 다만 **선행 조건 있음**: 파생 대상 master 가 존재해야 하므로 7-4 의 ProductMaster 승격이 선행/병행되어야 한다. 파생 로직 자체(itemSeq→master들→description 1벌 복사) 설계는 지금 착수 가능.

### 7-4. 먼저 약가마스터 ProductCandidate apply / ProductMaster 승격 설계가 필요한가
**필요하며 선행되어야 한다.** SharedProductDescription 은 master 를 참조하므로, 약가마스터 표준코드 → ProductMaster(SKU) 승격이 없으면 설명을 붙일 대상이 없다. 승격 설계 시 반드시 반영할 점:
- 취소일자 존재 row **74,680개(24.4%)** → active/cancelled 필터 정책 필요(설명은 active SKU 에만).
- 품목기준코드(대표) ↔ 표준코드(SKU) 그룹핑 = representative_products(미구현) 그룹키.
- **결론: ProductMaster 승격 설계 → SharedProductDescription 파생** 순서 권장.

### 7-5. 이미지 복사 WO 기대효과 (matched + 이미지 있는 itemSeq 규모)
매칭 + 이미지 보유 itemSeq = **2,789개 (58.6%)**. 이미지는 itemSeq(품목) 단위 1장이나 평균 4.08 SKU 에 파생되므로, 실제 이미지가 붙는 SKU 규모는 대략 2,789 × 평균파생 ≈ **1만+ SKU** 수준. 나머지 41.4%(1,968)는 이미지 부재 → 이미지 복사 WO 는 유효하나 커버리지 60% 상한을 전제로 설계.

---

## 8. 구현 산출물 (커밋 대상)

| 유형 | 경로 |
|---|---|
| 시뮬레이터 (PURE) | `apps/api-server/src/modules/neture/drug-import/easy-drug-to-master-offline-match.simulator.ts` |
| CLI | `apps/api-server/src/scripts/easy-drug-to-master-offline-match.ts` (`pnpm --filter @o4o/api-server easy-drug-match:simulate`) |
| 단위테스트 (6 케이스, DB·파일 불필요) | `apps/api-server/src/modules/neture/drug-import/__tests__/easy-drug-to-master-offline-match.test.ts` |
| 본 CHECK 문서 | `docs/checks/CHECK-O4O-EASY-DRUG-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1.md` |

**커밋 제외(대용량·raw, repo 밖)**: CSV / 리포트 JSON / e약은요 JSONL.

## 9. 검증

- 단위테스트 `jest` 6/6 PASS.
- `npx tsc --noEmit` PASS (에러 0).
- 실 전체파일 시뮬레이션 1회 실행 → 리포트 생성(§4~7 수치).
