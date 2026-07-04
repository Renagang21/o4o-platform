# WO-O4O-MEDICAL-DEVICE-GATE-B-DB-COLLISION-CHECK-V1

> 작업 성격: **read-only 프로덕션 DB 대조.** DB write 0, apply 0, migration 0, Cloud Run Job 0, ProductMaster/Identifier/Candidate 생성 0. SELECT(count/EXISTS)만 수행.
> 작성일: 2026-07-04
> 범위 고정: **의료기기 트랙 전용.** 표본 20,000 기반 PROMOTABLE 후보.
> 선행: `docs/checks/WO-O4O-MEDICAL-DEVICE-GTIN-UDI-PROMOTION-DRYRUN-GATE-B-V1.md`(PROMOTABLE_PRE_DB_CHECK 산출), `docs/checks/CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1.md`

---

## 1. 결론

PROMOTABLE_PRE_DB_CHECK 후보의 barcode가 기존 O4O DB(`product_masters.barcode`, `product_identifiers.normalized_value`)와 **충돌 0건**임을 프로덕션 read-only로 확인했다.

| 컬럼 | 값 |
|---|---:|
| INPUT_PROMOTABLE_PRE_DB_CHECK (rows) | 19,606 |
| INPUT distinct barcode | 19,602 |
| DB_CONFLICT_PRODUCT_MASTER_BARCODE | **0** |
| DB_CONFLICT_PRODUCT_IDENTIFIER_VALUE | **0** |
| DB_CONFLICT_BOTH | **0** |
| DB_CONFLICT_TOTAL_DISTINCT | **0** |
| zero-pad(13→14) 추가 충돌 | 0 |
| **PROMOTABLE_AFTER_DB_CHECK (rows)** | **19,606** (distinct barcode 19,602) |

DB 충돌로 인한 차감은 없다. Gate B 표본 최종 승격 후보는 pre-check와 동일하다.

---

## 2. 대조 방법 (채널)

프로덕션 DB는 방화벽으로 로컬 직접 TCP 차단(CLAUDE.md §0). 안정적 read 채널로 **Cloud SQL Auth Proxy v2 + `gcloud auth print-access-token`(--token)** 을 사용했다.

| 항목 | 값 |
|---|---|
| proxy | `cloud-sql-proxy v2.14.3` (`bin/cloud-sql-proxy-v2.exe`, git 미추적) |
| instance | `netureyoutube:asia-northeast3:o4o-platform-db` |
| 인증 | gcloud 사용자 OAuth 토큰(`--token`). ADC/SA key 불필요, IP whitelist 불필요 |
| 로컬 바인드 | `127.0.0.1:5433` (로컬 5432는 PostgreSQL 점유) |
| 쿼리 방식 | psql `-f`, VALUES CTE 19,602 barcode를 EXISTS 대조 (temp table/write 없음) |

> gotcha: `gcloud sql connect`는 이 환경에서 egress IP 불일치로 간헐 hang(연결 timeout) 발생. Auth Proxy + token 방식이 안정적이다. serviceKey/DB secret 원문은 기록하지 않음(env 변수만).

---

## 3. 기존 DB 구성 (왜 충돌 0인가)

### 3.1 `product_masters` (230,843건)

| barcode 길이 | count |
|---:|---:|
| 13 | 230,843 |

**전량 13자리.** 14자리 barcode는 0건. 기존 승격분은 전부 한국 약가 표준코드(KD코드, 13자리)다.

### 3.2 `product_identifiers` (활성 703,483건) — type 분포

| identifier_type | count |
|---|---:|
| KOREA_DRUG_CODE | 230,841 |
| MFDS_CODE | 230,841 |
| ATC_CODE | 177,056 |
| KOREA_INSURANCE_CODE | 64,745 |

**`GTIN`/`EAN13`/`UDI_DI` type은 아직 없음.** 의약품 코드 체계(약가·보험·ATC)만 존재.

### 3.3 disjoint 근거

- 의료기기 promotable barcode: 14자리 GTIN 18,816 + 13자리 GTIN 786.
- 기존 DB barcode: 전량 13자리 약가 KD코드.
- 14자리 medical device GTIN은 길이부터 기존과 겹치지 않는다.
- 13자리 medical device GTIN 786건도 기존 13자리 약가 코드와 값이 겹치지 않는다(코드 발급 체계 상이). 실측 pm/pi 충돌 0으로 확인.
- zero-pad(13→14) 변형 786건도 기존과 충돌 0.

→ **의료기기 UDI GTIN 공간과 기존 약가 코드 공간은 disjoint.** 충돌 0은 우연이 아니라 구조적이다.

---

## 4. 대표 충돌 샘플

```text
conflicting_barcode | pm_regulatory_type
(0 rows)
```

충돌이 0건이므로 대표 샘플 없음. (barcode 원문 대량 기록 없음 — 정책 준수)

---

## 5. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| DB write / apply / migration | 0 (SELECT·EXISTS만) |
| ProductMaster/Identifier/Candidate 생성 | 0 |
| temp table 생성 | 0 (VALUES CTE 사용) |
| Cloud Run Job | 0 |
| DB secret / serviceKey 원문 기록 | 0 (env 변수만) |
| barcode 대량 원문 문서 기록 | 0 (충돌 0건, 샘플 없음) |
| 코드 변경 | 0 (스크립트·proxy 바이너리는 세션/미추적) |

이번 변경은 CHECK 문서 추가 1건뿐이다.

---

## 6. Gate B 표본 최종 수치 (통합)

| 그룹 | rows |
|---|---:|
| 총 표본 | 20,000 |
| PROMOTABLE_AFTER_DB_CHECK | **19,606** (distinct barcode 19,602) |
| HOLD non-GTIN/HIBCC (identifier-only) | 155 |
| HOLD dup-conflict | 220 |
| HOLD permit-not-found | 10 |
| HOLD inactive | 3 |
| HOLD required-field-missing | 6 |
| HOLD checkdigit-fail | 0 |
| **DB conflict 차감** | **0** |

표본 20,000 기준 Gate B 최종 승격 후보 = **19,606 rows (19,602 distinct barcode)**, 승격률 98.03%. DB 충돌 차감 없음.

---

## 7. 다음 단계

1. **`UDI_DI` identifier type 구현 WO**(선행 정책 D3) — union 확장(varchar40, migration 불필요). apply 전 선행.
2. **Gate A Candidate import**(선행 정책 D4) — 20,000 전건 적재. ProductMaster 승격 금지. runbook + 승인 게이트.
3. **Gate B apply runbook** — §6 최종 후보 기준. pre-snapshot → dry-run → apply → 검증. **사용자 명시 승인 게이트** 하에서만.
4. **전량 2.65M** — 표본 수치 확정됐으므로 별도 WO로 전량 재수집·재대조(DB disjoint 근거상 충돌 위험 낮으나 재확인). API 호출량·수집 전략 상이하여 분리.

**최종: PROMOTABLE_AFTER_DB_CHECK = 19,606 rows (distinct barcode 19,602). 기존 DB는 전량 13자리 약가 코드라 의료기기 GTIN 공간과 disjoint → barcode/identifier 충돌 0. Gate B 표본 최종 승격 후보가 DB 충돌 차감 없이 확정됐다. apply는 UDI_DI type 구현 + Gate A import 이후 사용자 승인 하에서만.**
