# CHECK-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-APPLY-RESULT-V1

> 작업 성격: **Gate A ProductCandidate apply 실행 결과 기록.** 사용자 "의료기기 Gate A apply 승인" 후 실행. write 범위 = `product_candidates` INSERT 만. ProductMaster/ProductIdentifier 생성 0.
> 작성일: 2026-07-05
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC).
> 선행 runbook: `WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1`
> 구현: `WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1` (commit f6c39286b) + 배치/SSL 개선 (commit f5c12cec7)

---

## 1. 결론

의료기기 표준코드 ProductCandidate **19,996건**(표본 20,000)을 프로덕션 `product_candidates` 에 적재 완료했다. **ProductMaster/ProductIdentifier 승격 0, 검증 §4 A~H 전부 통과.**

---

## 2. 실행 정보

| 항목 | 값 |
|---|---|
| 승인 | 사용자 "의료기기 Gate A apply 승인" |
| 범위 | raw 20,000 표본, ProductCandidate 적재만 |
| 채널 | local + Cloud SQL Auth Proxy v2 (127.0.0.1:5433, gcloud token) |
| env gate | `MEDICAL_DEVICE_IMPORT_ALLOW_APPLY=I_UNDERSTAND` |
| 명령 | `... --apply --use-db` (DB_HOST=127.0.0.1) |
| write 방식 | 단일 트랜잭션 + 다중행 배치 INSERT (500/batch) |

---

## 3. apply 리포트

| 지표 | 값 |
|---|---:|
| mode | apply |
| totalRows | 20,000 |
| createdExpected | **19,996** |
| updatedExpected | 0 |
| skipped | 4 (완전 동일 rowSignature) |
| errored | 0 |
| identifierType (mapped 전체) | GTIN 19,845 / UDI_DI 155 |
| dupConflict | 122 key / 244 row |
| dedupChecked(DB) | true |

---

## 4. 검증 (§4 A~H, apply 직후)

| # | 지표 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| A | product_candidates 전체 | +19,996 | 378,119 → **398,115** | ✓ |
| B | 의료기기 count | 19,996 | **19,996** | ✓ |
| C | identifier_type | GTIN 19,841 / UDI_DI 155 | GTIN 19,841 / UDI_DI 155 | ✓ |
| D | status / match | pending 19,996 (unmatched 19,752 + conflict 244) | 동일 | ✓ |
| E | conflict 보존 | match=flag=244 | 244 / 244 | ✓ |
| F | rawPayload/signature 결측 | 0 / 0 | 0 / 0 (status_unjoined 19,996) | ✓ |
| G | ProductMaster / Identifier | 230,843 / 703,483 불변 | **230,843 / 703,483** | ✓ 승격 0 |
| H | rowSignature 중복 | 0 | **0** | ✓ idempotency |

### C의 GTIN 19,841 (dry-run 19,845와 −4)
dry-run `identifierTypeCounts` 는 20,000행 전체 기준(GTIN 19,845). DB 는 완전 동일 4행을 dedup 한 19,996행이며, **그 skip 4행이 GTIN** 이므로 DB GTIN = 19,845 − 4 = 19,841. 완전 정합.

---

## 5. 완료 기준 대조 (사용자 요구)

```text
created = 19,996                     ✓
skipped = 4                          ✓
errored = 0                          ✓
ProductCandidate 증가 = created 일치  ✓ (+19,996)
ProductMaster 증가 = 0               ✓ (230,843 불변)
ProductIdentifier 증가 = 0           ✓ (703,483 불변)
identifierType GTIN = 19,845(mapped) ✓ / DB 19,841(−4 skip)
identifierType UDI_DI = 155          ✓
conflict rows = 244 보존             ✓
rowSignature duplicate = 0           ✓
```

---

## 6. 준수/경계

| 항목 | 결과 |
|---|---|
| write 범위 | `product_candidates` INSERT 19,996 only |
| ProductMaster/Identifier 생성 | 0 (G 불변 확인) |
| SupplierProductOffer/Listing/StoreLocalProduct | 0 |
| migration / Cloud Run Job | 0 |
| DB secret 원문 기록 | 0 |
| 트랙 격리 키 | `sourceKind='medical_device_standard_code'` |

**Gate A 완료 = ProductCandidate 적재 완료. Gate B 승격 아님.** 허가 상태 미조인(전건 STATUS_UNCHECKED). Gate B 는 status map 조인 + 별도 runbook + 사용자 명시 승인 후에만.

---

## 7. 다음 단계

1. **Gate B apply runbook** — status map(15057456 `RTRCN_DSCTN_DIVS_CD IS NULL`) 조인 + PROMOTABLE 19,606 승격. HIBCC 155 는 UDI_DI만. 사용자 승인 게이트.
2. **전량 2.65M 재수집/재계산 WO** — 표본 적재 완료됐으므로 별도 진행(배치 apply 로 확장 가능).
3. rollback 필요 시: `UPDATE product_candidates SET deleted_at=NOW() WHERE ... sourceKind='medical_device_standard_code'` (runbook §6, 타 트랙 무영향).

**최종: 의료기기 Gate A apply 완료 — product_candidates +19,996(GTIN 19,841 / UDI_DI 155, conflict 244 보존), ProductMaster/Identifier 불변, idempotency 확인. Gate B 는 별도 승인.**
