# CHECK-O4O-QUASI-DRUG-CURRENT-STATE-AUDIT-V1

> 작업 성격: **read-only current-state audit.** `WO-O4O-QUASI-DRUG-CURRENT-STATE-AUDIT-AND-GATE-A-DRYRUN-V1` 수행 결과.
> 작성일: 2026-07-07
> 금지 준수: 운영 DB write 0, ProductMaster/ProductIdentifier/ProductImage/SharedProductDescription 생성 0, 후보 삭제/보관 0, 배포 0, secret 원문 기록 0
> 채널: `cloud-sql-proxy` (netureyoutube:asia-northeast3:o4o-platform-db, port 5434) → `psql` read-only SELECT. 방화벽 변경 없음. DB secret 미출력.

---

## 0. 한 줄 결론

**의약외품 트랙은 이미 Gate A(ProductCandidate 적재)를 넘어 완료된 상태다.** 본 WO 가 "준비"하려던 Gate A dry-run 은 2026-07-04 에 dry-run → apply 까지 실행되어, **운영 DB `product_candidates` 에 의약외품 22,953 건이 이미 적재**되어 있다(전량 pending/unmatched). `product_masters` 승격은 **0** (Gate B HOLD 유지). 따라서 본 WO 의 §2 "현재까지 확인된 결론" 표는 **최신 실측이 아니라 트랙 초기(Gate 0 CHECK) 기록**이며, 아래 §2 에서 실측으로 정정한다.

---

## 1. 본 WO 5개 목표 대비 실측 결과

| # | WO 목표 | 실측 결과 |
|---|---|---|
| 1 | 원천 데이터 확보 범위 | **전량 22,953 행 확보 완료** (`mfds-quasi-drug-permit-raw-full.jsonl`, 64.8 MB, Google Drive). "20,000 capped / 2,949 미수집" 은 **과거 기록** — 이미 잔여 보강 완료(commit `1d3804fc3`) |
| 2 | product_candidates / product_masters 실존 실측 | candidates = **22,953** (실측), masters = **0** (실측). §2 참조 |
| 3 | 기존 문서 수치 = 최신 실측 vs 과거 기록 분리 | 본 WO §2 표 = **과거 Gate 0 CHECK 기록**. 최신 실측은 본 문서 §2 |
| 4 | ProductCandidate 후보 적재 재확정 (ProductMaster 직접 승격 아님) | **재확정.** 이미 Candidate-only 로 적재됨. Gate B(master 승격) 는 barcode/SKU 원천 부재로 HOLD |
| 5 | 다음 WO 입력·SQL 확정 | **불필요(moot).** 다음 WO 로 지정된 `...-CANDIDATE-IMPORT-DRYRUN-V1` 은 이미 존재·실행·apply 완료. §5 참조 |

---

## 2. 최신 실측 (2026-07-07, read-only)

> `product_candidates` jsonb 필터는 인덱스 미사용 → B 지표 count ~2:17 소요(정상). 전부 SELECT.

| 지표 | 실측값 (2026-07-07) | 기대/판정 |
|---|---:|---|
| B. `MFDS_QUASI_DRUG_PERMIT` candidates (`sourceKind=quasi_drug_permit`, `deleted_at IS NULL`) | **22,953** | ✅ Gate A apply(2026-07-04, `5130497ca`)와 일치 |
| C. distinct `normalized_identifier_value` (ITEM_SEQ) | **22,953** | ✅ 전량 유일 |
| F. candidate_status | **pending = 22,953** | ✅ 전량 pending/unmatched |
| quasi in product_masters (`drug_category='quasi_drug'`) | **0** | ✅ Gate B HOLD — master 승격 없음 |
| G. product_masters (전체) | **181,241** | ⚠ 참조: 아래 주1 |
| G. product_identifiers (전체) | **604,132** | ⚠ 참조: 아래 주1 |

**주1 — masters/identifiers 전체 count 변동은 의약외품과 무관.** apply runbook §9 의 baseline(2026-07-04)은 masters 230,843 / identifiers 703,483 이었으나, 현재 181,241 / 604,132 로 감소했다. 이는 **병렬 의약품(DRUG) 트랙의 DB 구조 정비**(Gate B 승격 + `drug_unspecified` 삭제 + orphan RepresentativeProduct 정리 등, 2026-07-06)에 의한 것으로, **의약외품 트랙과 무관**하다. 의약외품이 masters 에 기여한 건수는 **0**(`quasi_in_masters=0`)으로 확인 — runbook §9 의 "candidate-only write(masters 불변)" 불변식은 의약외품 apply 시점 기준으로 이미 검증되었고, 이후 전체 count 이동은 다른 트랙의 정상적 변경이다.

---

## 3. ProductCandidate vs ProductMaster 재확정

| 조건 | 상태 | 판정 |
|---|---|---|
| grain = 품목/허가 단위 (ITEM_SEQ) | 확인 | ProductCandidate 적합 |
| barcode / GTIN / 표준코드 / 포장(SKU) 축 | **부재** | ProductMaster 승격 불가 |
| 허가상태 (CANCEL_CODE_NAME) | 보유 | 상태 축은 잠금 요인 아님 |
| Gate B 재판정 결과 | **HOLD** (`8439541e9`, `CHECK-...-BARCODE-REGISTRY-VERIFY-V1`) | 유일 후보 = 2024 의약외품 바코드 등록(공개 API·ITEM_SEQ 조인 미확인) |

**결론: ProductCandidate 후보 적재가 맞다는 판단은 유효하며, 이미 그 형태로 적재 완료.** ProductMaster 직접 승격은 V1 보류 유지.

---

## 4. 트랙 전체 타임라인 (git 실측)

| commit | 내용 | 결과 |
|---|---|---|
| `f5a5fc82b` | raw field/sample dry-run + CHECK §1.2 raw 위치 확정 | raw 실측 |
| `66ee3eedd` | Gate A ProductCandidate import dry-run (offline) | dry-run |
| `1d3804fc3` | 잔여 raw 보강 → 전량 22,953 Gate A dry-run 재산출 | 전량 dry-run |
| `24e137727` | mapper/service/CLI/test 구현 (apply 미실행) | 코드 |
| `b3e059a07` | Gate A candidate apply runbook | 문서 |
| `4bb8dd1ce` | apply runbook baseline pre-snapshot (2026-07-04) | 실측 baseline |
| **`5130497ca`** | **Gate A candidate apply 완료 로그 (created 22,953)** | **apply 완료** |
| `52d3e4e2a` | EE/UD/NB XML 공식설명 파서 + 전량 파싱 dry-run | 파서 |
| `8439541e9` | SKU/barcode 원천 audit + Gate B 재판정 (HOLD 유지) | Gate B HOLD |

---

## 5. 다음 단계 (WO 원 §5 "다음 WO 입력·SQL 확정" 대체)

본 WO 가 준비하려던 `WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1` 은 **이미 존재·실행·apply 완료**되었다. 따라서 신규 dry-run 입력/SQL 확정은 **불필요**하다. 실제 남은 후속은 다음 뿐이며, 전부 **선행 조건 대기** 상태다.

| 후속 | 상태 | 선행 조건 |
|---|---|---|
| SharedProductDescription 파생 (EE/UD/NB 공식설명 → SPD) | **이연** | ProductMaster(Gate B) 필요 — 현재 master 0 → 파생 대상 부재 |
| Gate B (ProductMaster 승격) 재판정 | **HOLD** | 2024 의약외품 바코드 등록의 (a)공개 API (b)ITEM_SEQ 조인 (c)GTIN 형식·커버리지 verify WO 선행 |
| candidate → master 자동매칭 | 미착수 | `MFDS_CODE` 공유 네임스페이스 → `sourceKind` 스코프 필수 (현재 전량 pending 이라 무영향) |

**재검증용 SQL (필요 시, read-only):**
```sql
-- 의약외품 candidate 적재 확인 (= 22,953)
SELECT count(*) FROM product_candidates
 WHERE source_type='external_api' AND source_label='MFDS_QUASI_DRUG_PERMIT'
   AND raw_payload->>'sourceKind'='quasi_drug_permit' AND deleted_at IS NULL;
-- 의약외품 master 승격 여부 (= 0, Gate B HOLD 확인)
SELECT count(*) FROM product_masters WHERE drug_category='quasi_drug';
```

---

## 6. 준수 확인

| 항목 | 결과 |
|---|---|
| 운영 DB write | 0 (SELECT only) |
| ProductMaster/Identifier/Image/SPD 생성 | 0 |
| 후보 삭제/보관 | 0 |
| 방화벽 변경 | 0 (cloud-sql-proxy 채널) |
| 배포 / migration | 0 |
| raw 대량 파일 커밋 | 0 |
| DB secret 원문 기록 | 0 (변수명·길이만) |

**최종: 의약외품은 Gate A(ProductCandidate 22,953 적재)를 이미 완료했고, 본 WO 의 "현재까지 확인된 결론" 표는 트랙 초기 기록이었다. 최신 실측으로 정정 완료. ProductMaster 승격은 Gate B HOLD 유지. 신규 dry-run 준비는 불필요.**
