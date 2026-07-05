# CHECK-O4O-MEDICAL-DEVICE-FULL-SCALE-SEED-EXPANSION-RUNBOOK-V1

> 작업 성격: **전량 확장 runbook 작성 CHECK (문서 전용).** DB write 0, 전량 fetch 0, apply 0, 코드 변경 0.
> 작성일: 2026-07-05
> 산출: `docs/runbooks/O4O-MEDICAL-DEVICE-FULL-SCALE-SEED-EXPANSION-RUNBOOK-V1.md` + 본 CHECK.

---

## 1. 결론

의료기기 전량 ~2,656,054건 재수집 → Gate A → Gate B 확장 실행 runbook 을 작성했다. **이 WO 에서 fetch/apply/DB write 는 0.** 실행은 후속 승인 WO.

---

## 2. 범위와 비범위

| 구분 | 내용 |
|---|---|
| 범위(이번) | 전량 확장 runbook + 검증 SQL 세트 + 예상치 산식 + batch/resume/rollback 기준 + 승인 게이트 문구 + 본 CHECK |
| 비범위 | 전량 fetch 실행 / Gate A import apply / Gate B promotion apply / Offer·Listing·StoreLocal 생성 / 설명·이미지 / Neture·Store 노출 정책 / admin UI / 코드 변경 |

---

## 3. 기준 문서 (checkout 실측)

전부 **존재** 확인 (WO 원본이 참조한 `docs/work-orders/` 는 오류 — 실제는 `docs/checks/` · `docs/investigations/`):

| 문서 | 실제 경로 | 상태 |
|---|---|---|
| Gate B apply 결과 | `docs/checks/CHECK-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-RESULT-V1.md` | OK |
| Gate B apply runbook | `docs/checks/WO-O4O-MEDICAL-DEVICE-GATE-B-APPLY-RUNBOOK-V1.md` | OK (docs/work-orders 아님) |
| Gate B promotion apply 구현 | `docs/checks/WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-IMPLEMENTATION-V1.md` | OK (docs/work-orders 아님) |
| seed mapping | `docs/checks/CHECK-O4O-MEDICAL-DEVICE-PUBLIC-SEED-MAPPING-V1.md` | OK |
| bulk fetch sample | `docs/checks/CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1.md` | OK |
| seed 표준 절차 IR | `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md` | OK |

preflight: HEAD=`d83aa5785`(Gate B 결과 커밋, 표본 apply 반영됨). CLI/service/parser/mapper 6파일 전부 존재. `docs/runbooks/` 는 신규 생성.

---

## 4. 표본 트랙 완료 요약 (baseline)

| 테이블 | 값 (Gate B apply 후) |
|---|---|
| product_masters | 250,445 (+19,602) |
| product_identifiers | 742,687 (+39,204) |
| product_candidates(의료기기) | approved_new_master 19,602 + pending 394 |
| Offer/Listing/StoreLocal | 0/0/35 (불변) |

승격률 98.03%. 보류 394(HIBCC 155/conflict 220/orphan 10/inactive 3/required 6). 추적 `mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'`.

---

## 5. 전량 재수집 계획 (요지)

endpoint `MdeqStdCdPrdtInfoService03/getMdeqStdCdPrdtInfoInq03`, serviceKey=env `PUBLIC_DATA_SERVICE_KEY`, numOfRows 500(권장, ~5,313 page), concurrency 2~4, retry 3+backoff, failed-pages 재시도, manifest(totalCount start/end) + resume. raw 는 repo 밖 `G:\...\full-fetch\medical-device\{RUN_ID}\`, checksum, sample-head/tail 만 참조. **raw commit 금지 / serviceKey 기록 금지.**

---

## 6. raw 저장/manifest 계획

RUN_ID(`md-full-YYYYMMDD-HHMMSS`) 디렉터리에 raw.jsonl/manifest.json/failed-pages.jsonl/checksums.txt/sample. wrapper 구조는 표본과 동일(`{sourceDataset,fetchedAt,pageNo,rowIndex,item}`).

---

## 7. Gate A import 계획 (요지)

전량 raw → product_candidates upsert(dedup=rowSignature). sourceLabel/sourceKind 유지 + rawPayload.fetchRunId 추가.
- **baseline 보호(필수 코드 가드, 후속 WO):** UPDATE 경로에 `AND candidate_status NOT IN ('approved_new_master','merged')` 또는 approved/merged SKIP. approved candidate 의 match_status/raw_payload 덮어쓰기·pending 원복·matched_product_master_id null 금지.
- dry-run: 기존 CLI `--dry-run [--use-db]` 재사용.

---

## 8. Gate B promotion 계획 (요지)

전량 dry-run: candidateInput/promotable/wouldCreateMasters/identifiers/dbConflict/holdBreakdown. status map=**전량 distinct PERMIT_NO** 필요 → 별도 build WO(대량 API, batch/resume). active=`RTRCN_DSCTN_DIVS_CD IS NULL`, PRMISN_STTEMNT 단독 금지. write=master/identifier INSERT + candidate UPDATE만.

---

## 9. batch/resume/rollback 계획 (요지)

- **batch-commit**(전량은 단일 트랜잭션 불가): 예 1,000 master/commit, batch 내 원자성(master→identifier→candidate), 실패 batch만 재시도, 이미 commit분은 idempotency(barcode/mfds_product_id 존재)로 skip, checkpoint(batch seq/last barcode) resume. → 현 `executePromotion`(단일 트랜잭션 전제) 을 **batch-commit executor 로 확장**(코드 후속 WO).
- rollback: run_id/batch_id 로 전량분만. ProductIdentifier soft-delete(deleted_at 존재) → candidate 원복 → ProductMaster **hard-delete**(deleted_at 없음). 표본 19,602 baseline 은 run_id 로 보호.

---

## 10. 예상치 산정 방식

```text
expected_new_masters = full_promotable_distinct_gtin_barcode
   - existing_barcode_conflict(표본 19,602 포함, 자동 제외) - already_promoted
expected_new_identifiers = expected_new_masters * 2
```
단순 외삽(≈2.6M master / ≈5.2M identifier)은 참고치. **전량 dry-run 우선.** 규모 함의: identifier 742k→최대 ~6M → batch-commit 필수. 표본 19,602 중복생성 0, barcode/identifier 중복 0 유지.

---

## 11. 리스크와 완화 (요지)

rate limit(concurrency↓/backoff/failed 재시도) · totalCount 변동(manifest/재검증) · raw 대용량(repo 밖/checksum) · Gate A 장시간(batch/resume) · Gate B 대량(batch-commit/checkpoint) · DB 부하(batch commit/저부하시간) · 표본 중복훼손(conflict precheck+baseline 가드+run_id) · rollback(run_id/trace key) · 방화벽 clobber(Auth Proxy, authorized-networks 회피, 포트 5433 잔여 proxy 정리) · **Auth Proxy 토큰 1h 만료(batch 경계 재기동).**

---

## 12. 다음 실행 WO

```text
1. WO-...-FULL-SCALE-RAW-FETCH-AND-GATE-A-IMPORT-DRYRUN-V1 (fetch+manifest+Gate A dry-run, baseline 가드 코드)
2. WO-...-FULL-SCALE-GATE-A-IMPORT-APPLY-V1 (candidate upsert, approved 보호, 승인 후)
3. WO-...-FULL-SCALE-PERMIT-STATUS-MAP-BUILD-V1 (전량 permit status map, batch/resume)
4. WO-...-FULL-SCALE-GATE-B-PROMOTION-DRYRUN-V1 (batch-commit executor + 전량 dry-run)
5. 사용자 승인 → WO-...-FULL-SCALE-GATE-B-PROMOTION-APPLY-V1 (batch-commit 승격 + run_id)
6. 결과 CHECK
```

다음 WO 사용자 승인 문구:
```text
의료기기 전량 Gate A/B apply 승인.
범위: ProductCandidate upsert + ProductMaster/ProductIdentifier 승격 + candidate status update.
금지: Offer/Listing/StoreLocal/설명/이미지/노출 write.
```

---

## 13. 준수 확인 (이 WO)

| 항목 | 결과 |
|---|---|
| DB write | **0** |
| 전량 fetch | **0** |
| Gate A/B apply | **0** |
| 코드 변경 | **0** (필수 옵션 누락=baseline 가드/batch-commit executor 는 후속 WO 로 분리 명시) |
| 네트워크/API 호출 | 0 (기존 문서·코드·표본 결과 기반) |
| serviceKey/DB secret 기록 | 0 (변수명·env 경로만) |
| checkout 없는 기준 문서 | 없음(전부 존재, 경로만 정정) |
| 표본 완료 수치 기록 | 있음(§4) |
| 다음 WO 승인 문구 | 있음(§12) |

이번 변경 = runbook 문서 1 + CHECK 문서 1.

**최종: 전량 확장 runbook + CHECK 작성 완료. fetch/apply/write 0. 핵심 후속 코드 2건(Gate A baseline 가드, Gate B batch-commit executor + 전량 status map build)을 후속 WO 로 분리 명시. 다음은 전량 fetch + Gate A dry-run WO(사용자 승인 게이트 하).**
