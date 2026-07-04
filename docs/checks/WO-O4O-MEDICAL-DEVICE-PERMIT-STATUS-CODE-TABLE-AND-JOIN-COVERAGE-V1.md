# WO-O4O-MEDICAL-DEVICE-PERMIT-STATUS-CODE-TABLE-AND-JOIN-COVERAGE-V1

> 작업 성격: read-only 분석 + 코드 상관 추론. DB write / apply / migration / Cloud Run Job / raw 대용량 커밋 / serviceKey 원문 기록 / Gate B apply 없음. 허가 API 조회는 표준코드 표본의 distinct PERMIT_NO(786) 대상 targeted lookup(전량 211k 수집 아님).
> 작성일: 2026-07-04
> 선행: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-PERMIT-INFO-ENDPOINT-DISCOVERY-V1.md`, `docs/checks/CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1.md`, `docs/checks/WO-O4O-MEDICAL-DEVICE-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1.md`

---

## 1. 결론

의료기기 표준코드(15073875) → 품목허가(15057456) join과 lifecycle 상태 판정이 **실측으로 확정**되었다.

| 질문 | 답 |
|---|---|
| PERMIT_NO join coverage? | **매우 높음**. matched raw rows **19,990/20,000 (99.95%)**, distinct PERMIT_NO 783/786 (99.62%) |
| 진짜 고아? | 3 PERMIT_NO / 10 rows (0.05%) |
| active 판정 신호? | **`RTRCN_DSCTN_DIVS_CD IS NULL` = active** (현행 유통품 780/781이 null) |
| `PRMISN_STTEMNT`로 active 판정? | **불가**. 코드 1/2/4가 active 제품에 모두 공존 → lifecycle 판별자 아님(허가 종류/구분 추정) |
| 코드→라벨 공식표? | S11 등 공식 코드표는 공개 명세/웹에서 미확보. 필드명 의미 + 실측 상관으로 추론 |
| Gate B 제한 승격 dry-run 진입? | **가능**. active 판정식 확정됨 |

---

## 2. Join coverage (표준코드 20k 표본)

표준코드 raw의 distinct PERMIT_NO 786개를 허가 API `prductPrmisnNo` 필터로 exact 조회.

| 지표 | 값 |
|---|---:|
| distinct PERMIT_NO | 786 |
| matched PERMIT_NO | **783 (99.62%)** |
| 진짜 orphan PERMIT_NO | 3 |
| 총 raw rows | 20,000 |
| matched raw rows | **19,990 (99.95%)** |
| orphan raw rows | 10 (0.05%) |

> 보정 주: 1차 배치에서 orphan 5건 중 2건(`수신 26-767 호`, `제인 26-4352 호`)은 **전송 오류(transient)** 였고 재조회 시 정상 매칭(active)됐다. 진짜 고아는 3건이다.

진짜 orphan 3건:

```text
수인 26-4384 호  (1 row)
제허 26-413 호   (8 rows)
제인 26-4493 호  (1 row)
```

- 모두 최근 번호(26-xxxx)로 매칭 건과 동일 세대다 → 허가 데이터셋 스냅샷 시점 격차 또는 소량 데이터 불일치로 추정.
- Gate B 정책: orphan PERMIT_NO row는 `PERMIT_NOT_FOUND_IN_PERMIT_DATASET` reviewFlag로 승격 보류(상태 미확인).

---

## 3. Lifecycle 상태 판정 (코드 상관 실측)

표준코드 raw 허가(= **현행 유통 제품**, UDI-DI 보유) 781건의 상태 필드 분포:

| 필드 | 분포 |
|---|---|
| `PRMISN_STTEMNT` | code `1`=95, `2`=372, `4`=314 |
| `RTRCN_DSCTN_DIVS_CD` | **null=780, non-null=1** |

Crosstab (`PRMISN_STTEMNT` × `RTRCN_DSCTN_DIVS_CD`):

```text
STTEMNT=1 | RTRCN=null : 95
STTEMNT=2 | RTRCN=null : 371
STTEMNT=2 | RTRCN=2    : 1     ← 유일한 취하/폐지 건
STTEMNT=4 | RTRCN=null : 314
```

대조군 — 허가 API 무필터 page-1 100건(과거/취하 편향 표본): `RTRCN` non-null **88/100**.

### 3.1 판정

- **`RTRCN_DSCTN_DIVS_CD` null 여부가 깨끗한 active/inactive 신호다.** 현행 유통품은 780/781(99.87%)이 null이고, 과거 편향 표본은 88%가 non-null이다.
- `RTRCN_DSCTN_DT`는 divs가 non-null일 때 채워진다(divs=2 표본 dt 1/1) → 취하/폐지 확정일.
- **`PRMISN_STTEMNT`(1/2/4)는 lifecycle 판별자가 아니다.** 세 값이 모두 active 제품에 공존한다. 필드명은 "허가상태코드_S11"이나, 실측상 허가 종류/구분(제조·수입·인증 유형 등)으로 추정된다. **active 게이트에 단독 사용 금지.**

### 3.2 확정된 active 판정식

```text
active   := RTRCN_DSCTN_DIVS_CD IS NULL
inactive := RTRCN_DSCTN_DIVS_CD IS NOT NULL   (취하/폐지/취소, RTRCN_DSCTN_DT 채워짐)
```

> **미확정(공식표 필요, 안전에는 무관):** `PRMISN_STTEMNT` 1/2/4와 `RTRCN_DSCTN_DIVS_CD` 1/2/5의 정확한 라벨. 공식 S11 코드표는 명세/웹에서 미확보. 다만 Gate B 안전 규칙(non-null=승격 제외)은 라벨 없이도 성립한다. 필드명 근거: `RTRCN`=취하, `DSCTN`=폐지, `DIVS_CD`=구분코드.

---

## 4. 표본 편향 주의

선행 endpoint discovery의 "page-1 100건 RTRCN non-null 88%"는 **전체 active/inactive 비율이 아니다.** 무필터 page-1은 과거/취하 허가로 정렬 편향돼 있다. 실제 현행 유통 제품(표준코드 join) 기준 inactive는 0.13%(1/781)에 불과하다. 전량 비율은 층화 표본/전량 대사에서 재확인해야 하나, **Gate B 대상은 "표준코드에 존재하는(=유통 중) 제품"이므로 현행 유통품 기준(inactive 극소수)이 실무상 정확**하다.

---

## 5. Gate B 판정식 (통합)

선행 정책 CHECK §7 조건 + 이번 상태 판정식 통합:

```text
Gate B 승격 후보 (의료기기):
  1. UDIDI_CD 존재 AND 숫자 13/14 AND GTIN check-digit pass
  2. PRDLST_NM 또는 PRDT_NM_INFO 존재
  3. MNFT_IPRT_ENTP_NM 존재
  4. UDI_DI_DUP_CONFLICT 아님 (동일 코드 단일 제품)
  5. 기존 barcode/identifier DB 충돌 없음
  6. PERMIT_NO 가 허가 데이터셋에 존재 (PERMIT_NOT_FOUND 아님)
  7. 허가 상태 active: RTRCN_DSCTN_DIVS_CD IS NULL
  → 위 전부 충족 시에만 ProductMaster.barcode 승격
```

이 판정식으로 실제 승격/보류/충돌 수를 산출하는 것이 다음 Gate B dry-run이다.

---

## 6. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate/Master/Identifier apply | 0 |
| DB write / migration / Cloud Run Job | 0 |
| 대량 API 호출(211k 전량 수집) | 0 (distinct PERMIT_NO 786 + 재조회 5 targeted lookup만) |
| raw 대용량 파일 커밋 | 0 |
| serviceKey 원문 출력/문서화 | 0 (env 변수, 마스킹) |
| 코드 변경 | 0 (분석 스크립트는 세션 scratchpad에만 존재) |

이번 변경은 CHECK 문서 추가 1건뿐이다.

---

## 7. 다음 단계

1. **`WO-O4O-MEDICAL-DEVICE-GTIN-UDI-PROMOTION-DRYRUN-GATE-B-V1`** — §5 판정식으로 표준코드 표본(또는 전량) 대상 승격 dry-run. 산출: 승격 가능 수 / 보류 수(비-GTIN·충돌·orphan·inactive) / 기존 DB 충돌 수. apply 금지, 수치만.
2. Gate B dry-run은 status를 위해 PERMIT_NO별 허가 조회가 필요하므로, 표본(20k) 우선 → 전량(2.65M)은 별도 대량-수집 승인 후.
3. `UDI_DI` identifier type 구현 WO(선행 정책 D3)는 실제 apply(Gate A/B) 직전에 착수.

**최종: PERMIT_NO join은 현행 유통품 기준 99.95% 커버되고, active 판정식은 `RTRCN_DSCTN_DIVS_CD IS NULL`로 확정됐다. `PRMISN_STTEMNT`는 lifecycle 판별자가 아니다. Gate B 제한 승격 dry-run 진입 준비 완료.**
