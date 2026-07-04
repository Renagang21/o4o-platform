# CHECK-O4O-MEDICAL-DEVICE-PERMIT-INFO-ENDPOINT-DISCOVERY-V1

> 작업 성격: read-only endpoint discovery. DB write / apply / migration / Cloud Run Job / 대량 API 호출 / raw 대용량 커밋 / serviceKey 원문 기록 없음. 샘플 호출은 소량(numOfRows=1~5, 상태분포 확인용 1회 100건).
> 작성일: 2026-07-04
> 선행: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-PUBLIC-SEED-MAPPING-V1.md`, `docs/checks/WO-O4O-MEDICAL-DEVICE-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1.md`, `docs/checks/CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1.md`
> WO: `WO-O4O-MEDICAL-DEVICE-PERMIT-INFO-ENDPOINT-DISCOVERY-V1`

---

## 1. 결론

의료기기 품목허가 정보(`15057456`)의 **정확한 endpoint를 확보**했고, **lifecycle 상태 필드가 존재**하며, **`PERMIT_NO` 기준 exact join이 성립**함을 라이브로 확인했다.

이로써 선행 정책 CHECK가 지목한 **Gate B 잠금 사유(상태 미확정)의 해소 경로가 확보**되었다.

| 질문 | 답 |
|---|---|
| endpoint 확보? | **성공**. `MdlpPrdlstPrmisnInfoService05/getMdlpPrdlstPrmisnList04` |
| JSON 응답? | 가능 (`type=json`, resultCode=00) |
| 상태 필드 존재? | **있음**. `PRMISN_STTEMNT`(허가상태) + `RTRCN_DSCTN_DIVS_CD`/`RTRCN_DSCTN_DT`(취하/폐지 구분·일자) |
| `PERMIT_NO` join 가능? | **가능(exact)**. `PRDUCT_PRMISN_NO` == 표준코드 `PERMIT_NO` 문자열 완전 일치 |
| Gate B 잠금 해제 가능? | **가능**. 단 상태 코드표(코드→라벨) 확정과 전량 join coverage 확인이 선행 |

---

## 2. 확보한 endpoint

| 항목 | 값 |
|---|---|
| 서비스 | `MdlpPrdlstPrmisnInfoService05` |
| operation(목록) | `getMdlpPrdlstPrmisnList04` |
| 전체 URL | `https://apis.data.go.kr/1471000/MdlpPrdlstPrmisnInfoService05/getMdlpPrdlstPrmisnList04` |
| 상세 operation | `getMdlpPrdlstPrmisnItem02` / `getMdlpPrdlstPrmisnItem04` (단건 상세, 이번 미사용) |
| 응답 형식 | JSON(`type=json`) / XML |
| totalCount | **211,148** (허가 단위. 표준코드 UDI-DI 2.65M보다 훨씬 적음) |
| 명명 규칙 | `Mdlp`(의료기기) + `Prdlst`(품목) + `Prmisn`(허가). 15057xxx 구형 계열은 `Service0N`/`Prmisn` 철자 사용 — Mdeq 계열(15073xxx)과 다름 |

### 2.1 요청 파라미터 (임베디드 Swagger 기준)

| 파라미터 | 의미 | 비고 |
|---|---|---|
| `serviceKey` | 인증키 | 필수 |
| `type` | 응답형식 | `json`/`xml` |
| `pageNo` / `numOfRows` | 페이징 | |
| `entrps` | 업체명 | 부분검색(예: `메드니스` → 15건) |
| `prduct` | 품목명 | |
| `prductPrmisnNo` | **의료기기품목허가번호** | **join 필터. 출력 필드 `PRDUCT_PRMISN_NO`와 이름 다름(camelCase)** |

> 주의: 출력 필드는 UPPER_SNAKE(`PRDUCT_PRMISN_NO`)지만 요청 파라미터는 camelCase(`prductPrmisnNo`)다. UPPER_SNAKE로 필터를 걸면 무시되고 전체(211,148)가 반환된다(초기 오검 사례).

### 2.2 응답 필드 (라이브 확인, 11개)

```text
ENTRPS, PRDUCT, PRMISN_STTEMNT, PRDUCT_PRMISN_NO, PRMISN_DT,
RTRCN_DSCTN_DIVS_CD, RTRCN_DSCTN_DT, MDEQ_PRDLST_SN, TRCK_MNG_TRGT_YN,
MANUF_NM, CHG_DT
```

| 필드 | 의미 | O4O 용도 |
|---|---|---|
| `PRDUCT_PRMISN_NO` | 품목허가번호 | **join key ↔ 표준코드 `PERMIT_NO`** |
| `PRMISN_STTEMNT` | 허가상태(코드) | lifecycle 상태 1차 |
| `RTRCN_DSCTN_DIVS_CD` | 취하/폐지 구분코드 | lifecycle 상태 2차(취소/취하/폐지) |
| `RTRCN_DSCTN_DT` | 취하/폐지 일자 | 상태 확정일 |
| `PRMISN_DT` | 허가일자 | 표준코드 `PRMSN_YMD` 대응 |
| `CHG_DT` | 변경일자 | 신선도/갱신 |
| `ENTRPS` | 업체명(신청) | 표준코드 `MNFT_IPRT_ENTP_NM` 교차검증 |
| `MANUF_NM` | 제조사명 | null 다수 |
| `PRDUCT` | 품목명 | 표준코드 `PRDLST_NM` 교차검증 |
| `MDEQ_PRDLST_SN` | 품목 일련번호 | 보조 |
| `TRCK_MNG_TRGT_YN` | 추적관리대상 | 메타 |

---

## 3. 상태 필드 확인 (Gate B 핵심)

표준코드별 제품정보(15073875)에 없던 lifecycle 상태를 이 데이터셋이 **보유**한다.

단일 100건 표본(1 request) 분포:

| 필드 | 값 분포 |
|---|---|
| `PRMISN_STTEMNT` (허가상태 코드) | `1`=65, `2`=30, `4`=5 |
| `RTRCN_DSCTN_DIVS_CD` (취하/폐지 구분) | non-null **88/100** — `1`=29, `2`=56, `5`=3 |

관찰:

- `RTRCN_DSCTN_DIVS_CD`는 **실제로 채워지는 필드**이며 복수 코드(1/2/5)를 가진다 → 취하/폐지/취소 신호가 데이터에 존재.
- active 예시(`제인 26-4585 호`, `PRMISN_STTEMNT=4`)는 `RTRCN_DSCTN_DIVS_CD=null`, `RTRCN_DSCTN_DT=null` → **null = 유효(active) 추정**.
- 두 필드(`PRMISN_STTEMNT` + `RTRCN_*`)가 함께 lifecycle을 인코딩한다.

> **미확정: 코드→라벨 매핑.** `PRMISN_STTEMNT` 1/2/4, `RTRCN_DSCTN_DIVS_CD` 1/2/5의 정확한 의미는 spec 코드표로 확정해야 한다(후속). 현 단계 안전 규칙: `RTRCN_DSCTN_DIVS_CD IS NOT NULL` → 승격 제외 후보.

---

## 4. Join 검증 (exact)

필터 `prductPrmisnNo`로 표준코드 raw의 실제 `PERMIT_NO`를 조회한 결과:

| 표준코드 `PERMIT_NO` | 허가 API 결과 |
|---|---|
| `제인 26-4585 호` | totalCount=1, `PRDUCT_PRMISN_NO`="제인 26-4585 호"(완전일치), `ENTRPS`="(주)에이디에이", `PRMISN_STTEMNT`=4, `RTRCN`=null, `PRMISN_DT`=20260630 |

교차검증: 이 허가는 표준코드 raw **첫 행**(UDIDI `08800158900007`, 품목 "치과 주조용 준귀금속 합금", 업체 "(주)에이디에이", `PRMSN_YMD` 2026-06-30)과 **제품·업체·허가일 모두 일치**.

결론:

- `PRDUCT_PRMISN_NO` == `PERMIT_NO`는 **문자열 exact match**. 정규화 불필요.
- 선행 우려("서울" 등 지역 prefix로 포맷 불일치)는 기우. 허가 데이터셋에 구형(지역 prefix 포함)과 신형이 공존하며, 의료기기 표준코드와 매칭되는 허가는 동일 포맷을 쓴다.
- **grain**: 허가(211,148) 1건 → UDI-DI(2.65M) 다수. 상태는 **허가 단위**이며, 동일 `PERMIT_NO`를 공유하는 모든 UDI-DI row에 전파된다(선행 dry-run §4.2: 한 PERMIT_NO 아래 최대 4,980 UDI-DI와 정합).

> **미확정: 전량 join coverage.** 표본 몇 건이 exact match됨을 확인했을 뿐, 표준코드 전체 `PERMIT_NO`가 허가 데이터셋에 모두 존재하는지(고아 비율)는 전량 대사 후속 필요.

---

## 5. serviceKey 처리

| 항목 | 값 |
|---|---|
| 출처 | `G:\내 드라이브\자료실\public-data-api-samples\.env.public-data` (repo 밖) |
| `PUBLIC_DATA_SERVICE_KEY` | present, length 64, 특수문자 없음(raw==encoded), raw logged: **no** |
| known endpoint 검증 | 표준코드 endpoint rc=00/HTTP 200 → 키 유효 |
| 원문 출력/커밋 | 0 (스크립트 내부 변수로만 사용, 로그·문서 마스킹) |

---

## 6. 앞선 500 오류의 원인

선행 문서들이 기록한 "후보 엔드포인트 다수 HTTP 500"은 **서비스 경로 자체가 존재하지 않아서**였다(키·인코딩 문제 아님). data.go.kr은 1471000 하위 미존재 서비스 경로에 500을 반환한다. Mdeq 계열 명명(`MdeqPrdtPrmsnInfoService03` 등)으로 추측했으나 실제는 `Mdlp`+`Prdlst`+`Prmisn` 구형 명명이었다. 정확명은 openapi.do 상세 페이지 HTML에 임베드된 Swagger 스펙에서 확보했다.

---

## 7. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate/Master/Identifier apply | 0 |
| DB write / migration / Cloud Run Job | 0 |
| 대량 API 호출 | 0 (샘플 소량 + 상태분포 1회 100건 단일 요청) |
| raw 대용량 파일 커밋 | 0 |
| serviceKey 원문 출력/문서화/커밋 | 0 |
| 코드 변경 | 0 (probe 스크립트는 세션 scratchpad에만 존재) |

이번 변경은 CHECK 문서 추가 1건뿐이다.

---

## 8. Gate B 영향

선행 정책 CHECK §7의 Gate B 승격 조건 8("lifecycle 상태 active")의 **소스가 확보**되었다.

```text
Gate B 조건 8 (상태 active) 판정 경로 (확정):
  표준코드 PERMIT_NO
   → 허가 API getMdlpPrdlstPrmisnList04?prductPrmisnNo=<PERMIT_NO>
   → RTRCN_DSCTN_DIVS_CD IS NULL  AND  PRMISN_STTEMNT ∈ {active 코드}
   → 승격 후보 유지, 그 외 승격 제외
```

단, 실제 승격 전 아래 2가지가 남는다(§3·§4 미확정):

1. `PRMISN_STTEMNT` / `RTRCN_DSCTN_DIVS_CD` **코드표 확정**(어느 코드가 active/취소/취하/폐지인지).
2. **전량 join coverage** — 표준코드 PERMIT_NO 중 허가 데이터셋에 없는 고아 비율.

이 둘은 endpoint discovery 범위 밖이며 후속 WO에서 소량·전량 대사로 확정한다.

---

## 9. 다음 단계

1. **`WO-O4O-MEDICAL-DEVICE-PERMIT-STATUS-CODE-TABLE-AND-JOIN-COVERAGE-V1`** — 코드표(STTEMNT/RTRCN divs 의미) 확정 + 표준코드 PERMIT_NO 전량 대비 허가 매칭률(고아율) 산출. read-only.
2. 확정 후 Gate B 제한 승격 dry-run(선행 정책 CHECK 조건 1~10 + 상태 필터)으로 승격/보류/충돌 수 산출.
3. 전량 2.65M 표준코드 재수집·재계산은 이 상태 소스와 함께 묶으면 해석이 선명해진다.

**최종: 의료기기 품목허가 endpoint(`MdlpPrdlstPrmisnInfoService05/getMdlpPrdlstPrmisnList04`)를 확보하고, 상태 필드 존재·`PERMIT_NO` exact join·허가 grain(211,148)을 라이브로 확인했다. Gate B 잠금의 상태 소스는 확보됐으며, 남은 것은 코드표 확정과 전량 join coverage다.**
