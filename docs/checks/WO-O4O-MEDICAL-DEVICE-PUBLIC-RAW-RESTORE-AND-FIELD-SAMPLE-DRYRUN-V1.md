# WO-O4O-MEDICAL-DEVICE-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1

> 작업 성격: read-only field/sample dry-run. 코드 변경, DB write, migration, Cloud Run Job, ProductCandidate/ProductMaster/ProductIdentifier apply 없음.
> 작성일: 2026-07-04
> 선행 문서: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-PUBLIC-SEED-MAPPING-V1.md`
> 기준선: `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md`

---

## 0. 실행 환경 및 raw 복원 결과

선행 CHECK 문서는 Linux 작업공간에서 raw 파일을 찾지 못했다. 이번 WO는 **집 PC(Windows, `C:\Users\sohae\o4o-platform`)** 에서 수행했고, raw 파일을 실제로 복원해 실측했다.

| 항목 | 값 |
|---|---|
| raw 파일 | `G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl` |
| 크기 | 18.26 MB |
| 수집 시각 | `fetchedAt` = 2026-07-02T06:36:25Z (파일 mtime 2026-07-02) |
| 총 row 수 | **20,000** (표본 capped. 원천 totalCount 2,656,054 아님) |
| 형식 | JSONL. 각 line = `{ sourceDataset, fetchedAt, pageNo, rowIndex, item }` wrapper. 실제 필드는 `item` 하위 |

같은 폴더에서 확인된 형제 raw:

```text
mfds-drug-master-standard-code.csv          52.34 MB
mfds-easy-drug-info-raw.jsonl               12.35 MB
mfds-medical-device-standard-code-raw.jsonl 18.26 MB  ← 이번 대상
mfds-quasi-drug-permit-raw.jsonl            53.72 MB
```

**중요: 아래 모든 수치는 20,000 표본 기준이다.** 전량(2.65M) 분포는 후속 Gate A 재수집 시 재계산해야 한다.

---

## 1. 실제 item 필드 전량 (20개)

표본 20,000건 모두 동일한 20개 키를 가진다.

```text
UDIDI_CD, PRDLST_NM, MDEQ_CLSF_NO, CLSF_NO_GRAD_CD, PERMIT_NO, PRMSN_YMD,
FOML_INFO, PRDT_NM_INFO, HMBD_TRSPT_MDEQ_YN, DSPSBL_MDEQ_YN, TRCK_MNG_TRGT_YN,
TOTAL_DEV, CMBNMD_YN, USE_BEFORE_STRLZT_NEED_YN, STERILIZATION_METHOD_NM,
USE_PURPS_CONT, STRG_CND_INFO, CIRC_CND_INFO, MNFT_IPRT_ENTP_NM, RCPRSLRY_TRGT_YN
```

선행 CHECK 문서에 없던 필드가 추가로 확인되었다: `HMBD_TRSPT_MDEQ_YN`(인체이식 추정), `DSPSBL_MDEQ_YN`(일회용), `TRCK_MNG_TRGT_YN`(추적관리대상), `TOTAL_DEV`, `CMBNMD_YN`(조합의료기기), `USE_BEFORE_STRLZT_NEED_YN`(사용 전 멸균 필요), `STERILIZATION_METHOD_NM`(멸균방법), `CIRC_CND_INFO`(유통조건), `RCPRSLRY_TRGT_YN`.

### 1.1 필드 존재율 (non-empty / 20,000)

| 필드 | 존재율 | 비고 |
|---|---:|---|
| `UDIDI_CD` | 100.0% | 결측 0 |
| `PRDLST_NM` | 100.0% | 결측 0 |
| `PERMIT_NO` | 100.0% | 결측 0 |
| `PRMSN_YMD` | 100.0% | 허가일자 전건 존재 |
| `MDEQ_CLSF_NO` | 100.0% | 분류번호 전건 |
| `CLSF_NO_GRAD_CD` | 100.0% | 등급 전건 |
| `FOML_INFO` | 100.0% | 모델/형명 전건 |
| `USE_PURPS_CONT` | 100.0% | 사용목적 전건 |
| `MNFT_IPRT_ENTP_NM` | ~100.0% | 결측 6건 |
| `PRDT_NM_INFO` | 73.6% | 제품명정보 결측 다수 → `PRDLST_NM` 우선 근거 |
| `STRG_CND_INFO` | 41.5% | 보관조건 절반 이상 결측 |
| `CIRC_CND_INFO` | 34.3% | 유통조건 다수 결측 |
| `STERILIZATION_METHOD_NM` | 23.1% | 멸균방법 대부분 결측 |
| Y/N 플래그류 | 99.8~100% | 아래 §5 |

`candidateName`은 `PRDLST_NM`(100%)을 1순위로 쓰는 것이 옳다. `PRDT_NM_INFO`는 73.6%만 존재하므로 보조/폴백.

---

## 2. UDIDI_CD 형식 분포 — 선행 문서 정정

**이번 dry-run의 핵심 정정 사항이다.**

| 구분 | 건수 | 비율 | 판단 |
|---|---:|---:|---|
| 결측/공백 | 0 | 0.00% | 없음 |
| 순수 숫자 14자리 | 19,055 | 95.27% | GTIN-14 후보 |
| 순수 숫자 13자리 | 790 | 3.95% | **GTIN-13 후보** (전량 length=13) |
| 비숫자 (`+` prefix, HIBCC) | 155 | 0.77% | HIBCC 계열. barcode 부적합 |
| 합계 | 20,000 | 100% | |

### 정정 포인트

선행 CHECK 문서는 `UDIDI_CD`를 **"순수 14자리 숫자 19,055 (95%) / 비숫자·HIBCC 945 (5%)"** 로 이분했다. 실측 결과 이 "945"는 사실 **두 종류의 혼합**이었다:

```text
945 = 숫자 13자리 790  +  비숫자 HIBCC 155
```

즉 **790건은 비숫자가 아니라 정상 숫자형(GTIN-13 후보)** 이고, 진짜 비-GTIN(HIBCC `+` prefix)은 155건(0.77%)뿐이다. 선행 문서의 "약 5% 비숫자/HIBCC"는 과대 표현이며, 실제 비숫자는 0.77%다.

### 비숫자 155건 prefix 분포

전량 `+` 로 시작(HIBCC 표준):

```text
+J0  80    +E2  26    +B1  21    +ES  18    +DV  4
+D6   3    +EK   1    +D9   1    +G3   1
```

---

## 3. GTIN check-digit 결과

| 대상 | 결과 |
|---|---|
| 숫자 14자리 19,055건 | **GTIN-14 check-digit 전량 PASS. fail 0** |
| 숫자 13자리 790건 | 별도. GTIN-13(EAN-13) 자체는 유효 형식이나 `ProductMaster.barcode`(len 14) 저장 시 zero-pad 정책 결정 필요 |

선행 문서는 "숫자14는 GTIN check-digit 검증 필요"로 유보했으나, **표본 전량이 check-digit을 통과**했다. 이는 숫자14 subset의 barcode 승격 신뢰도를 높인다.

> 주의: 이는 20,000 표본 결과다. 전량(2.65M)에서 fail이 0이라고 단정할 수 없으므로 Gate B dry-run에서 전량 재검증한다.

---

## 4. 중복 / 1:N 구조 — 신규 강한 발견

### 4.1 UDIDI_CD 중복 (primary key 부적합 근거)

| 지표 | 값 |
|---|---:|
| distinct `UDIDI_CD` | 19,874 |
| 2회 이상 등장한 `UDIDI_CD` | 126 |
| 중복에 얽힌 row | 252 |

여기서 중요한 것은 **중복의 성격**이다. 126개 중복 키를 signature(`PRDLST_NM~FOML_INFO~PERMIT_NO~MNFT_IPRT_ENTP_NM~MDEQ_CLSF_NO`)로 비교하면:

| 구분 | 건수 |
|---|---:|
| 완전 동일 row 반복 | 4 |
| **서로 다른 제품/허가/업체인데 같은 UDIDI_CD** | **122** |

즉 중복의 절대다수(122/126)는 단순 반복이 아니라 **동일 UDIDI_CD가 실제로 다른 제조사·허가번호·모델을 가리키는 충돌**이다. 실제 사례:

```text
UDIDI_CD=07615208437799
  심미수복용 복합레진 / 755752AN / 수인 26-4313 호 / 신원덴탈(주)
  심미수복용 복합레진 / 755752AN / 수인 26-4335 호 / 오스템임플란트(주)   ← 다른 업체·허가

UDIDI_CD=08800367279345
  추간체 유합 보형재 / M2B.16030  / 제허 26-140 호 / (주)오스테오닉
  추간체 유합 보형재 / N2B.16030S / 제허 26-140 호 / (주)오스테오닉        ← 다른 모델
```

**함의: `UDIDI_CD`를 무조건 global unique primary/barcode로 승격하면 안 된다.** OEM·유통사 재표기 또는 원천 데이터 정합성 이슈로 보이며, Gate B 승격 전 반드시 충돌 해소 규칙(우선순위·병합·격리)이 선행되어야 한다.

### 4.2 PERMIT_NO → UDI-DI (1:N 확정)

| 지표 | 값 |
|---|---:|
| distinct `PERMIT_NO` | 786 |
| UDI-DI 2개 이상 보유 `PERMIT_NO` | 450 (57%) |
| 한 `PERMIT_NO` 아래 최대 UDI-DI 수 | **4,980** |
| `PERMIT_NO` 결측 | 0 |

선행 문서의 "허가번호 1개 → 다수 UDI-DI 가능성"이 **실측으로 확정**됐다. 허가 단위는 grain이 될 수 없다.

### 4.3 PERMIT_NO + FOML_INFO → UDI-DI

| 지표 | 값 |
|---|---:|
| (허가+모델) 조합 중 UDI-DI 2개 이상 | 872 |
| 한 (허가+모델) 아래 최대 UDI-DI 수 | 423 |

허가+모델로 좁혀도 여전히 1:N이다. 모델명 단독으로도 유일키가 아니다. **grain은 여전히 UDI-DI row 단위가 가장 안전**하다.

---

## 5. 상태값(active/cancelled) 확인 — 여전히 미확정

표본의 20개 필드 어디에도 **취소/폐기/영업정지/취하** 같은 lifecycle 상태 필드가 없다. `PRMSN_YMD`(허가일자)는 있으나 종료·취소 필드는 없다.

Y/N 플래그류는 상태가 아니라 **제품 속성 메타**임을 값 분포로 확인:

| 필드 | 값 분포 (표본) | 성격 |
|---|---|---|
| `DSPSBL_MDEQ_YN` | 예 14,987 / 아니오 5,013 | 일회용 여부 |
| `HMBD_TRSPT_MDEQ_YN` | 아니오 17,716 / 예 2,284 | 인체이식(추정) 여부 |
| `TRCK_MNG_TRGT_YN` | 아니오 19,888 / 예 112 | 추적관리대상 여부 |
| `TOTAL_DEV` | 아니오 19,455 / 예 545 | (조합/일체형 추정) |
| `CMBNMD_YN` | 아니오 19,857 / 예 143 | 조합의료기기 여부 |
| `USE_BEFORE_STRLZT_NEED_YN` | N 16,892 / Y 3,069 / 공백 39 | 사용 전 멸균 필요 |
| `RCPRSLRY_TRGT_YN` | N 16,420 / Y 3,580 | (회수 관련 추정 — 미확정) |

**결론: 표준코드별 제품정보(15073875) 단독으로는 상태 판정 불가.** 선행 CHECK §11 판단 유지. 상태는 품목허가 정보(`15057456`) 또는 UDI/EDI 정보(`15138675`)에서 확보해야 한다. 상태 미확정 row는 Gate A(Candidate) 적재는 가능하나 Gate B(ProductMaster 승격)는 보류가 안전하다.

---

## 6. 선행 CHECK 문서 대비 변경 요약

| 항목 | 선행 CHECK 문서 | 이번 dry-run 실측 |
|---|---|---|
| UDIDI_CD 이분류 | 숫자14 95% / 비숫자·HIBCC 5%(945) | 숫자14 95.27% / **숫자13 3.95%(790)** / HIBCC 0.77%(155) |
| 숫자14 check-digit | "검증 필요"(유보) | **전량 PASS, fail 0** |
| 숫자13 존재 | 미인지 | **790건 GTIN-13 후보로 신규 식별** |
| UDIDI_CD 중복 성격 | 미실측 | **126 중복 중 122가 다른 업체/허가/모델 = 실제 충돌** |
| PERMIT_NO 1:N | "가능성" | **실측 확정: 최대 4,980 UDI-DI/permit** |
| 추가 속성 필드 | 미인지 | 일회용·추적관리·조합·멸균 등 7개 Y/N 메타 확인 |
| 상태 필드 | 미확정 | **미확정 재확인**(lifecycle 상태 필드 부재) |

---

## 7. Candidate 매핑 초안 반영 (변경분)

선행 CHECK §8 매핑을 유지하되 다음을 반영한다.

| ProductCandidate 필드 | 조정 |
|---|---|
| `identifierType` | 숫자14 → `GTIN`(check-digit pass 확인됨) / 숫자13 → `GTIN`(GTIN-13, zero-pad 정책 필요) / HIBCC → `UDI_DI`(후속 type) 또는 `MFDS_CODE`/`UNKNOWN` |
| `candidateName` | `PRDLST_NM`(100%) 1순위, `PRDT_NM_INFO`(73.6%)는 폴백 |

`rawPayload.reviewFlags` 보강:

| flag | 조건 | 표본 규모 |
|---|---|---|
| `UDI_DI_NON_GTIN` | HIBCC(`+`) | 155 |
| `UDI_DI_GTIN13` | 숫자 13자리 (신규) | 790 |
| `UDI_DI_GTIN14_CHECKDIGIT_PASS` | 숫자14 통과 | 19,055 |
| `UDI_DI_DUP_CONFLICT` | 동일 UDIDI_CD가 다른 업체/허가/모델 (신규) | ~122 keys / 244 rows |
| `MULTI_UDI_PER_PERMIT` | PERMIT_NO 1:N | 450 permit |
| `STATUS_UNCONFIRMED` | lifecycle 상태 필드 부재 | 전건 |

---

## 8. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate/ProductMaster/ProductIdentifier apply | 0 |
| DB write | 0 |
| migration 작성 | 0 |
| Cloud Run Job 실행 | 0 |
| 대량 API 호출 | 0 (기존 로컬 raw만 읽음) |
| raw 대용량 파일 커밋 | 0 (raw는 repo 밖 G: 드라이브) |
| serviceKey/secret 기록 | 0 |
| 코드 변경 | 0 (분석 스크립트는 세션 scratchpad에만 존재) |

이번 변경은 CHECK 리포트 문서 추가 1건뿐이다.

---

## 9. 다음 단계

이 dry-run으로 선행 CHECK의 WO 1이 표본 범위에서 완료됐다. 남은 것:

1. **전량 재수집/재계산** — 20,000 표본이 아닌 원천 2.65M에서 §2·§3·§4 분포 재산출 (serviceKey 비노출 수집).
2. **UDI-DI 충돌 해소 규칙 확정** — §4.1 다-업체 동일 UDIDI_CD 122건에 대한 우선순위/병합/격리 정책 (Gate B 선행 필수).
3. **GTIN-13(790건) 저장 정책** — `ProductMaster.barcode`(len14) zero-pad vs 별도 처리 결정.
4. **상태 소스 확보** — 품목허가 정보(`15057456`) endpoint 확정 후 취소/폐기/영업정지 join (선행 CHECK WO 참조).
5. WO 2(`UDI_DI` identifier type 정책), WO 3(Gate A Candidate 적재)는 선행 CHECK 순서 유지.

**최종: 의료기기 표본 raw는 read-only로 완전 실측됐다. Gate A(Candidate) 후보 판단 근거는 강화됐고, Gate B(ProductMaster 승격)는 UDI-DI 충돌(§4.1)과 상태 미확정(§5) 때문에 여전히 보류가 안전하다.**
