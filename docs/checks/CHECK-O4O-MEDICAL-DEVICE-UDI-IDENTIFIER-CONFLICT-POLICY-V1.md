# CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1

> 작업 성격: 정책 결정 CHECK (read-only). 코드 변경, DB write, migration, apply 없음. `UDI_DI` type 추가/충돌 처리/GTIN-13/Gate 자격은 **결정만 문서화**하며 구현은 후속 WO.
> 작성일: 2026-07-04
> 선행: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-PUBLIC-SEED-MAPPING-V1.md`, `docs/checks/WO-O4O-MEDICAL-DEVICE-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1.md`
> 기준선: `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md`

---

## 1. 결론 (정책 요약)

Gate A 적재 전에 아래 4개를 확정한다. 모두 **검증된 실제 스키마**(§2)에 근거한다.

| # | 결정 | 요지 |
|---|---|---|
| D1 | UDIDI_CD 충돌 처리 | 완전 동일 row는 dedup. **동일 UDIDI_CD·다른 업체/허가/모델은 ProductMaster 자동 승격 금지, Candidate `conflict` 격리** |
| D2 | GTIN-13 790건 | **barcode 컬럼이 8/12/13/14 허용 → zero-pad 불필요.** 13·14자리 모두 GTIN check-digit 전량 pass → barcode 승격 자격 있음(상태 확인 별개) |
| D3 | `UDI_DI` identifier type | **추가 채택.** varchar(40) union 확장이라 migration 불필요. GTIN형·HIBCC형 UDI-DI 모두 UDI 맥락 보존 |
| D4 | Gate A 적재 상태 | 전건 Candidate 적재 가능. reviewFlags 필수 보존. **ProductMaster 승격은 계속 보류**(상태 미확정 + 충돌 미해소) |

---

## 2. 검증된 스키마 사실 (근거)

이 정책은 추정이 아니라 아래 실제 코드/마이그레이션 확인에 근거한다.

### 2.1 `ProductMaster.barcode` — [ProductMaster.entity.ts:37-39](../../apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts#L37-L39)

```text
@Column({ type: 'varchar', length: 14 }) barcode: string;
주석: "GTIN barcode (8/12/13/14자리, check digit 포함) — immutable"
```

- migration [20260301100000-ProductMasterCoreReset.ts:53,66](../../apps/api-server/src/database/migrations/20260301100000-ProductMasterCoreReset.ts#L53):
  `barcode VARCHAR(14) NOT NULL`, `CONSTRAINT uq_product_masters_barcode UNIQUE (barcode)`
- **핵심 1**: 컬럼이 명시적으로 8/12/13/14 GTIN을 허용 → **GTIN-13은 zero-pad 없이 그대로 저장 가능**.
- **핵심 2**: barcode에 **UNIQUE 제약** → 동일 barcode 2건 물리적 불가. 이것이 UDIDI_CD 충돌을 자동 승격할 수 없는 기전.

### 2.2 `ProductIdentifier` — [ProductIdentifier.entity.ts:51-64](../../apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts#L51-L64)

- `identifier_type` = `varchar(40)` + application union. 현재 값:
  `GTIN, EAN13, UPC, JAN, INTERNAL_O4O, SUPPLIER_SKU, PHARMACY_LOCAL, STORE_LOCAL, KOREA_DRUG_CODE, KOREA_INSURANCE_CODE, ATC_CODE, MFDS_CODE, UNKNOWN` → **`UDI_DI` 없음**.
- `verification_status` union에 **`conflict`, `deprecated` 이미 존재** → 충돌 표기에 신규 상태 불필요.
- 전역 UNIQUE(normalized_value) **없음**. 중복 방지는 `(product_master_id, identifier_type, normalized_value, deleted_at IS NULL)` partial unique만 → **동일 UDI-DI 값을 서로 다른 master에 conflict로 보존 가능**.
- `identifier_value`/`normalized_value` = `varchar(128)` → HIBCC(`+...`) 코드 저장에 길이 여유 충분.

### 2.3 `ProductCandidate` — [ProductCandidate.entity.ts](../../apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts)

- `identifier_type` = `varchar(40)` nullable → 후보 단계에서도 `UDI_DI` 표기 가능.
- `match_status` union에 **`conflict` 존재** → 충돌 후보 표기 가능.
- `raw_payload` = `jsonb` → `reviewFlags` 보존 위치 확정.
- 전역 UNIQUE 없음(후보 큐). 중복 방지는 service logic.

---

## 3. D1 — UDIDI_CD 충돌 처리

실측(dry-run §4.1): 중복 UDIDI_CD 126 키 중 **4건은 완전 동일 row 반복**, **122건은 다른 업체/허가/모델**.

| 유형 | 처리 |
|---|---|
| 완전 동일 row 반복 (4) | import 단계 dedup. Candidate 1건으로 수렴 (rawPayload에 원본 다건 기록 가능) |
| 동일 UDIDI_CD + 다른 업체/허가/모델 (122) | **ProductMaster 자동 승격 금지.** 관련 Candidate 전부 적재하되 `match_status='conflict'` + `reviewFlags: [UDI_DI_DUP_CONFLICT]`. 운영자 판정 전 barcode 승격 대상에서 제외 |

승격 시점(Gate B) 규칙:

```text
동일 UDIDI_CD 를 가진 서로 다른 제품 후보가 존재하면
  → 어느 것도 자동으로 ProductMaster.barcode 로 승격하지 않는다.
  → barcode UNIQUE 제약상 최대 1건만 물리적으로 가능하므로,
     운영자가 대표/정본을 판정한 뒤에만 1건 승격.
  → 나머지 충돌 후보는:
     - Candidate 에 conflict 로 유지, 또는
     - 별도 master 로 승격 시 그 UDI-DI 는 ProductIdentifier(UDI_DI)에
       verification_status='conflict' 로 보존 (barcode 컬럼에는 넣지 않음)
```

> 주: 이 충돌은 OEM/유통사 재표기 가능성이 크다(예: 같은 코드가 신원덴탈 ↔ 오스템임플란트). 원인 규명은 품목허가 정보 join(§6, 선행 CHECK WO) 후 재판단.

---

## 4. D2 — GTIN-13 790건 처리

| 사실 | 값 |
|---|---|
| 13자리 숫자 UDI-DI | 790건 (표본 3.95%) |
| EAN-13/GTIN-13 check-digit | **전량 pass (fail 0)** |
| barcode 컬럼 수용 | 8/12/13/14 명시 허용 → **13자리 그대로 저장 가능** |

**결정:**

```text
UDIDI_CD 13자리 숫자 + check-digit pass
  → barcode 승격 자격 있음 (zero-pad 하지 않음, 원형 13자리 유지)
  → ProductMaster.barcode = UDIDI_CD (13자리)
  → ProductIdentifier: identifierType='GTIN' (barcode mirror) + 'UDI_DI'(맥락 보존)
```

이는 선행 dry-run 리포트(§7)의 "GTIN-13은 zero-pad 정책 필요" 유보를 **정정**한다. 컬럼이 13자리를 원형 수용하므로 zero-pad는 불필요하며, 오히려 zero-pad는 원본 코드 변형이므로 금지한다.

> 단 barcode 승격 자체는 D1 충돌·§5 상태 조건을 모두 통과해야 한다. "형식상 자격 있음"과 "실제 승격"은 다르다.

---

## 5. D3 — `UDI_DI` identifier type 추가 (채택)

**결정: `ProductIdentifierType` union에 `UDI_DI` 추가.** ProductCandidate.identifier_type(varchar40)에서도 동일 사용.

근거:

1. GTIN형 UDI-DI(19,845)와 HIBCC형 UDI-DI(155)는 모두 **"의료기기 UDI-DI"라는 동일 제도권 식별자**다. `GTIN`만 쓰면 UDI 맥락이 사라지고, `MFDS_CODE/UNKNOWN`은 의미가 흐려진다.
2. `identifier_type`은 DB enum이 아니라 varchar(40) + application union → **migration 없이 코드 union 확장**만으로 처리(§2.2 확인).
3. HIBCC형 UDI-DI는 barcode(GTIN 전제) 부적합이지만, `UDI_DI` type이면 ProductIdentifier에 정상 보존 가능(값 길이 128 여유).

저장 규칙:

| UDI-DI 형태 | ProductMaster.barcode | ProductIdentifier |
|---|---|---|
| 숫자 14 (check pass) | 가능 (승격 조건 통과 시) | `GTIN`(primary/barcode mirror) + `UDI_DI` |
| 숫자 13 (check pass) | 가능 (원형 13, 승격 조건 통과 시) | `GTIN` + `UDI_DI` |
| HIBCC `+...` (155) | **금지** | `UDI_DI`만 (barcode 없이 Candidate/Identifier 보조) |

> 실제 union 추가·저장 로직 구현은 후속 WO(`WO-O4O-PRODUCT-IDENTIFIER-MEDICAL-DEVICE-UDI-TYPE-POLICY-V1`). 이 CHECK는 채택 결정과 저장 규칙까지만 확정.

---

## 6. D4 — Gate A 적재 상태 및 reviewFlags

Gate A(ProductCandidate 적재)는 **전건 가능**. 단 아래 reviewFlags를 rawPayload에 필수 보존한다.

| flag | 조건 | 표본 규모 |
|---|---|---|
| `UDI_DI_GTIN14_CHECKDIGIT_PASS` | 숫자14 pass | 19,055 |
| `UDI_DI_GTIN13_CHECKDIGIT_PASS` | 숫자13 pass | 790 |
| `UDI_DI_NON_GTIN` | HIBCC(`+`) | 155 |
| `UDI_DI_DUP_CONFLICT` | 동일 UDIDI_CD 다른 업체/허가/모델 | ~122 keys / 244 rows |
| `MULTI_UDI_PER_PERMIT` | PERMIT_NO 1:N | 450 permit |
| `STATUS_UNCONFIRMED` | lifecycle 상태 필드 부재 | 전건 |

Candidate 필드 매핑(확정):

| Candidate 필드 | 값 |
|---|---|
| `sourceType` | `external_api` |
| `sourceLabel` | `MFDS_MEDICAL_DEVICE_STANDARD_CODE_15073875` |
| `identifierType` | 숫자13/14 → `GTIN`, HIBCC → `UDI_DI` |
| `identifierValue` | `UDIDI_CD` (원형) |
| `normalizedIdentifierValue` | 숫자형은 숫자만, HIBCC는 trim+uppercase |
| `candidateName` | `PRDLST_NM`(100%) 1순위, `PRDT_NM_INFO`(73.6%) 폴백 |
| `candidateManufacturer` | `MNFT_IPRT_ENTP_NM` |
| `candidateCategory` | `MDEQ_CLSF_NO` + `CLSF_NO_GRAD_CD` |
| `candidateSpec` | `FOML_INFO` |
| `matchStatus` | 충돌 후보 `conflict`, 그 외 `unmatched` |
| `rawPayload` | 원본 item 전체 + sourceDatasetId + collectedAt + pageNo/rowIndex + reviewFlags |

---

## 7. Gate B(ProductMaster 승격) 자격 재정의

정책 확정 후 승격 자격은 다음으로 좁혀진다.

```text
1. UDIDI_CD 존재
2. 숫자 13 또는 14 자리 (barcode 컬럼이 둘 다 허용)
3. GTIN check-digit pass (표본상 숫자형 전량 pass)
4. PRDLST_NM 또는 PRDT_NM_INFO 존재
5. MNFT_IPRT_ENTP_NM 존재
6. UDI_DI_DUP_CONFLICT 아님 (동일 코드에 단일 제품만)
7. 기존 barcode/identifier 와 DB 충돌 없음
8. lifecycle 상태 active (미확정 → 현재 전건 보류)
```

**현 시점 결론: 조건 8(상태) 때문에 Gate B는 여전히 전면 보류.** 조건 1~7을 통과하는 "형식상 승격 가능 풀"은 존재하지만(숫자형 19,845에서 충돌·결측 제외), 상태 소스(품목허가 정보 `15057456`) 확보 전에는 실제 승격을 하지 않는다.

---

## 8. 선행 문서 정정 반영

| 항목 | 이전 표현 | 이 CHECK 확정 |
|---|---|---|
| GTIN-13 저장 | "zero-pad 정책 필요"(dry-run §7) | barcode가 13자리 원형 허용 → **zero-pad 금지, 원형 저장** |
| 숫자13 유효성 | check-digit 미검증 | **전량 pass** |
| `UDI_DI` type | "권장, 미결정" | **채택 결정** (varchar union 확장, migration 불필요 확인) |
| 충돌 처리 상태값 | 신규 필요 여부 불명 | 기존 `conflict`/`deprecated` 재사용으로 충분 |

---

## 9. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductMaster/Identifier/Candidate apply | 0 |
| DB write / migration / Cloud Run Job | 0 |
| 코드 변경 (union 추가 등) | 0 (결정 문서화만) |
| 대량 API 호출 / raw 커밋 / secret 기록 | 0 |

이번 변경은 정책 CHECK 문서 추가 1건뿐이다.

---

## 10. 다음 단계

1. **품목허가 정보 `15057456` endpoint 확보** — 상태(취소/폐기/영업정지) join 근거. Gate B 조건 8 해소의 유일 경로.
2. **전량 2.65M 재수집/재계산** — 정책 확정됐으므로 이제 진행해도 해석 기준이 흔들리지 않음. 숫자13/14 비율·check-digit·충돌 분포를 전량에서 재산출.
3. **`WO-O4O-PRODUCT-IDENTIFIER-MEDICAL-DEVICE-UDI-TYPE-POLICY-V1`** — D3 구현(union에 `UDI_DI` 추가 + 저장 로직).
4. **`WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-GATE-A-V1`** — D4 기반 Candidate 적재(ProductMaster 승격 금지).
5. Gate B는 1·2 완료 후 별도 dry-run 문서에서 승격 수/보류 수/충돌 수 산출 후 승인.

**최종: 충돌(D1)·GTIN-13(D2)·UDI_DI type(D3)·Gate A(D4) 정책을 검증된 스키마 위에서 확정했다. Gate A는 진행 가능, Gate B는 상태 소스 확보 전까지 보류 유지.**
