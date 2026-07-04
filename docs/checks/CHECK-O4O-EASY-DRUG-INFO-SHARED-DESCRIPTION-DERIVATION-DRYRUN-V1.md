# CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1

> **작업명**: WO-O4O-EASY-DRUG-INFO-CANDIDATE-APPLY-AND-SHARED-DESCRIPTION-DERIVATION-V1 (조사·dry-run 단계)
> **일자**: 2026-07-04 · **성격**: read-only 조사 CHECK — 코드/DB/migration/import/git write 0. 산출물 = 본 문서 1개.
> **선행**: `CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-TO-MASTER-DRUGEXTENSION-DESIGN-V1`(설계), `CHECK-O4O-EASY-DRUG-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1`, `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1 §12`(ProductMaster 230,841 완주), `IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1`.
> **목적**: 이미 생성된 ProductMaster 230,841건에 **e약은요 공식 소비자 설명을 연결**(itemSeq=MFDS_CODE 기준 SharedProductDescription 파생)하기 위한 **운영 DB 실측 dry-run** + 게이트 계획 고정. **e약은요로 ProductMaster 재생성 아님.**

---

## 1. 한 줄 결론

**e약은요 4,757 품목(itemSeq) 은 운영 active ProductMaster 와 100% 매칭되며, master별 SharedProductDescription 파생 후보는 정확히 19,431행이다.** 단, e약은요 ProductCandidate 는 **운영 DB 에 아직 0건**이므로 파생 전에 **Gate A(candidate apply)** 가 선행돼야 한다. raw 소스는 확보돼 있다.

---

## 2. 운영 DB 실측 (read-only, 2026-07-04)

> 채널: `gcloud sql` authorized-network 임시 등록 → psql read-only → 즉시 원복. 민감데이터 없음(공공 약가/설명 데이터).

| 확인 | 결과 |
|---|---:|
| e약은요 ProductCandidate (`source_type='external_api'` + `identifier_type='MFDS_CODE'` + `raw_payload->>'sourceKind'='easy_drug_info'`) | **0건** |
| `shared_product_descriptions` (전체) | **0건** |
| ProductMaster (HIRA, §12 완주) | 230,841 |
| ProductIdentifier `MFDS_CODE` 행 / distinct 품목기준코드 | 230,841 / **64,672** |
| 품목기준코드당 master 수 (전체) | min 1 / max 487 / avg 3.57 (multi 61,113 · >5개 7,650) |

**→ candidate 미적재. 파생 저장소도 비어 있음. Gate A 선행 필요.**

---

## 3. raw 소스 가용성

| 자산 | 위치 | 상태 |
|---|---|---|
| `mfds-easy-drug-info-raw.jsonl` | Google Drive `자료실/public-data-api-samples/` (12,955,034 B, 4,774행) | ✅ 확보 |
| `easy-drug-master-match-report.json` | 동 폴더 (오프라인 매칭 리포트, 2026-07-02) | ✅ 확보 |
| GCS `gs://o4o-media-library/data-seed/` | drug CSV 만 존재 | ⚠ e약은요 JSONL **미업로드** |
| Cloud Run Job (e약은요 candidate import) | — | ⚠ **미생성** (drug-seed 계열 2개만 존재). local tsx script `easy-drug-info-candidate-import.ts` 는 존재 |

**→ Gate A 실행 가능**(소스 확보). 단 채널(GCS 업로드+신규 Job vs local tsx+cloud-sql-proxy)은 §6 결정 필요.

---

## 4. 매칭 dry-run — 운영 active master 기준 (정밀 실측)

> JSONL 에서 distinct itemSeq **4,757** 추출(파일내 중복 17 제외, missing 0) → 운영 `product_identifiers(MFDS_CODE)` 와 대조.

| 지표 | 값 |
|---|---:|
| e약은요 distinct itemSeq | 4,757 |
| **active master 와 매칭된 itemSeq** | **4,757 (100%)** |
| active master 소실(취소로 0건) itemSeq | **0** |
| **파생 SharedProductDescription 후보 (master 1개당 1행)** | **19,431** |
| 매칭 itemSeq당 master 수 | min 2 / max 114 / **avg 4.08** |
| master 5개 초과 itemSeq | 873 |
| officialConsumerText 보유 itemSeq | **4,757 (100%)** → 전량 파생 가능 |
| 이미지 보유 itemSeq | 2,789 (이미지 사본은 Gate C 별도) |
| 다제조사(2+) itemSeq — 설명↔제조사 불일치 위험 플래그 | 476 |

**핵심**: 취소 SKU 74,680 을 승격에서 제외했음에도 e약은요 대상 품목의 active master 는 전부 유지되어, 오프라인 상한(19,431)과 운영 실측이 **동일(19,431)**. 즉 파생 규모는 확정적이다.

**grain 관계 재확인**: e약은요 itemSeq = 품목(설명) 단위, ProductMaster = SKU(포장) 단위. **설명 1벌 → 평균 4.08 master 파생**. 설명의 진실은 원천 1벌(candidate.raw_payload.officialConsumerText)에서 흐르고, master별 SharedProductDescription 은 그 파생이다(설계 CHECK §4·§10).

---

## 5. 생성 대상 / 금지 (WO 경계)

**생성 대상 (최소):**
```
ProductCandidate            (Gate A — 이미 있으면 재사용, 없으므로 신규 apply)
SharedProductDescription    (Gate C — 매칭 master별 파생, status='needs_review')
```

**생성 금지 (재확인):**
```
ProductMaster / ProductIdentifier / RepresentativeProduct / ProductDrugExtension /
ProductImage / SupplierProductOffer / OrganizationProductListing / StoreLocalProduct
```

---

## 6. 게이트 계획

| 게이트 | 내용 | write 대상 | 상태 |
|---|---|---|---|
| **Gate 0** | raw JSONL 확보 (+ GCS 업로드 여부 결정) | 없음 | ✅ 소스 확보. GCS 업로드는 채널 결정에 종속 |
| **Gate A** | e약은요 → `product_candidates` apply (idempotent, dedup=external_api+MFDS_CODE+itemSeq+sourceKind) | `product_candidates` ~4,757 INSERT | ⏸ **승인 + 채널 결정 필요** |
| **Gate B** | itemSeq=MFDS_CODE 매칭 dry-run (본 문서에서 prod 실측 완료 = 19,431) | 없음 | ✅ 완료(재실행 가능) |
| **Gate C** | 매칭 master별 SharedProductDescription 파생 apply | `shared_product_descriptions` ~19,431 INSERT | ⏸ **파생 서비스 신규 구현 + 승인 필요** |

**미결 결정 (사용자):**
1. **candidate apply 채널** — (a) e약은요 candidate import Cloud Run Job 신설(drug-seed 패턴: src-root Job entry + GCS 다운로드) vs (b) local tsx `easy-drug-info-candidate-import.ts` + cloud-sql-proxy `--apply`.
2. **파생 설명 source_type** — 기존 union 재사용(`'drug_extension'`) vs 신규 `'mfds_easy_drug'` 추가(provenance 명확, varchar union 이라 migration 불필요하나 중앙 리뷰 대상 — `IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1 §8·§13`).
3. **파생 status** — 설계 권장 `'needs_review'`(공식 설명 법적 검수 전제) 유지 여부.

**미구현 코드 (Gate C 선행)**: `shared-product-description.service` 에 e약은요 candidate→master 파생 함수 **부재**. `createCandidate`/`seedFromExistingSources`/`seedFromDrugExtension` 은 존재하나 e약은요 전용 경로 없음 → 신규 구현 필요(설계 CHECK §12 의 `WO-...-DESCRIPTION-LINK-V1` 에 해당).

---

## 7. 리스크 / 주의

- **19,431 파생 = 대량 write** → drug promotion 과 동일하게 batch(청크 multi-row INSERT) + Cloud Run Job/timeout/사전 백업 세트 권장(런북 §12 교훈).
- **sanitize-on-write**: `createCandidate` 는 jsdom+DOMPurify sanitize 후 저장. e약은요 officialConsumerText 는 개행 위주 평문 → HTML 조합 시 sanitize 결과 빈 값 방지(빈 candidate 미생성 계약).
- **다제조사 476 itemSeq**: 같은 itemSeq 설명이 제조사 다른 여러 master 에 붙음 → 설명 내용은 성분/효능 기준이라 대체로 무해하나, 큐레이션 시 제조사 특정 문구 존재 여부 플래그.
- **canonical 자동 승격 금지**: 파생은 `candidate`/`needs_review` 까지만. master당 canonical 1개는 운영자 큐레이션(setCanonical) 후속.
- **재실행 멱등성**: candidate dedup(§3), SPD dedup=(master_id, source_type, source_ref_id) → 재파생 skip. source_ref_id 설계 필요(예: candidate.id 또는 itemSeq).

---

## 8. 완료 기준 자기점검

- ✅ 운영 DB e약은요 candidate 존재 여부 실측: **0건**
- ✅ raw 소스 가용성 확인: Drive 확보 / GCS·Job 미비
- ✅ itemSeq=MFDS_CODE 매칭 dry-run **운영 실측**: 4,757/4,757(100%), 파생 **19,431**
- ✅ 게이트 A/B/C 계획 + 미결 결정 3건 명시
- ✅ apply 미실행(기본 금지 준수). 코드/DB/migration write 0
- ✅ raw 파일·secret·설명 원문 미커밋 (aggregate 수치만)

---

**작성**: O4O Platform 조사 CHECK · 2026-07-04 · read-only(조사 §1~§8). serviceKey·비밀·raw 원문 미출력.

---

## 9. Gate A 실행 로그 (2026-07-04) — **candidate apply 완료**

> 채널: Cloud Run Job 신설(사용자 결정). drug-seed 패턴 미러링 — src 루트 Job entry `easy-drug-seed-candidate-import-job.ts`(commit `d8749a645`) + tsup/Dockerfile/.dockerignore 등록. GCS `gs://o4o-media-library/data-seed/mfds-easy-drug-info-raw.jsonl` 업로드 후 다운로드 처리.

| 항목 | 값 |
|---|---|
| 사전 백업 | 기존 id **1783079396967** (§12 이후 read-only만 발생 → 현 상태 커버) |
| Cloud Run Job | `o4o-easy-drug-seed-candidate-import` (region asia-northeast3, cpu2/2Gi, cloudsql gen2) |
| APPLY 이중가드 | `EASY_DRUG_APPLY=true` + `DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` |
| dry-run (exec n5dm4) | created=4,757 / updated=0 / skipped=17(파일내 중복) / errored=0, officialText 100% |
| **apply (exec tjzpr)** | **created=4,757 / updated=0 / skipped=17 / errored=0** |
| 검증 SQL (read-only) | easy_candidates **4,757**(distinct itemSeq 4,757, 전량 pending) · 매칭 itemSeq 4,757 → **derivable_masters 19,431** |

**→ Gate A 완료.** e약은요 4,757 품목이 `product_candidates`(external_api/MFDS_CODE/easy_drug_info)로 적재됨. ProductMaster/Identifier 등 다른 테이블 미생성. **Gate C(SharedProductDescription 19,431 파생)는 별도 게이트 — 파생 서비스 신규 구현 + 승인 후 진행.**

**Gate C 결정(사용자 확정)**: source_type=**`mfds_easy_drug`**(신규, union 추가) · status=**`needs_review`** · 채널=Cloud Run Job(파생 apply).

---

## 10. Gate C 실행 로그 (2026-07-04) — **SharedProductDescription 파생 완료**

> 채널: Cloud Run Job `o4o-easy-drug-shared-description-derive`. 파생 서비스 `easy-drug-shared-description-derive.service.ts`(raw batch INSERT + `sanitizeDescriptionHtml`) + Job entry(commit `2889c92d6`). union `mfds_easy_drug` 추가(additive). e약은요 candidate `raw_payload.officialConsumerText` → 매칭 master별 `<p><strong>섹션</strong>…</p>` 조합 → 청크 multi-row INSERT.

| 항목 | 값 |
|---|---|
| 사전 백업 (Gate C) | ✅ id **1783144286700** (SUCCESSFUL, `pre-easy-drug-shared-description-derive-20260704`) |
| Cloud Run Job | `o4o-easy-drug-shared-description-derive` (cpu2/2Gi, cloudsql gen2, timeout 3600) |
| APPLY 이중가드 | `EASY_DRUG_DERIVE_APPLY=true` + `DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` |
| dry-run (exec qhtft) | matched 4,757 / unmatched 0 / emptyContent 0 · created 19,431 / errored 0 |
| **apply (exec pqr65)** | **created 19,431 / errored 0** (39s) |
| 검증 SQL (read-only) | mfds_easy_drug **19,431행**(status=needs_review 전량), distinct master **19,431** / candidate **4,757**, empty_content **0**, dup_pair **0**, canonical **0** |

**해소 이슈**: 초기 파생 Job 이 `SharedProductDescriptionService`(repository) 경유 → `SharedProductDescription.master` ManyToOne('ProductMaster') 메타 미등록으로 DataSource init 실패. → drug promotion 과 동일하게 **raw ds.query + sanitizeDescriptionHtml 직접 호출 + 청크 INSERT**(entities:[]) 로 전환하여 해소.

**→ Gate C 완료. WO 종결.** e약은요 4,757 품목의 공식 소비자 설명이 매칭 ProductMaster 19,431건에 `shared_product_descriptions`(source_type=`mfds_easy_drug`, status=`needs_review`)로 파생됨. 다른 테이블 미생성.

**후속(별도 WO)**: (1) 운영자 큐레이션 → master당 canonical 승격(`setCanonical`). (2) e약은요 이미지 GCS 사본 → ProductImage(2,789 itemSeq 보유). (3) RepresentativeProduct 품목 그룹핑. (4) 다제조사 476 itemSeq 큐레이션 플래그.
