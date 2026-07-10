# IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1

> **조사 전용 (Investigation-only).** DB write 0 · 코드 변경 0 · migration 0 · apply 실행 0.
> 본 문서는 `/admin/o4o-product-db/maintenance` (데이터 정비) 메뉴의 첫 기능 후보 —
> "공공데이터 후보에는 있으나 아직 O4O 기본상품(ProductMaster)으로 등록되지 않은 항목을 등록"
> 기능의 **구현 착수 가능 여부**를 판정하기 위한 사전 조사다.

- 작성일: 2026-07-11
- 검증 채널: Cloud SQL Auth Proxy v2 (read-only SELECT, 프로덕션 `o4o_platform`)
- 관련 Freeze: F12 Product Resource Architecture / O4O-PRODUCT-CORE-BASELINE-V1
- 후속 WO(예정, 본 IR 범위 외): `WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-MAINTENANCE-ACTIONS-V1`

---

## 0. 요약 (Executive Summary)

**판정: 후보 기능 D + 부분적 B.** 지금 "등록 전 후보 일괄 기본상품 등록" 기능을 그대로 만들면 위험하다. 이유:

1. **"등록 전 = 미등록"이 아니다.** 등록 전(`pending`) 126,897건과 별개로, **`approved_new_master` 상태이면서 master 링크가 끊긴 고아 후보가 53,428건** 존재한다. 이들은 이미 등록됐다가 **의도적으로 삭제된 drug_unspecified master**의 잔재(FK `ON DELETE SET NULL`)다. "master 없는 후보"를 미등록으로 간주해 재등록하면 **삭제한 상품을 되살린다.** → §6.

2. **트랙별 승격 정책이 이미 확정되어 있고, 트랙마다 다르다.** 드럭만 admin API로 재사용 가능한 승격 엔진이 있고, 의료기기는 CLI 전용 별도 엔진, **의약외품·건강기능식품·e약은요는 승격 경로가 아예 없다.** HFF는 문서상 **HOLD/등급 C**(바코드 원천 부재 + 유효상태 원천 부재)로 승격 금지다. → §8, §9.

3. **드럭 단건 승격은 이미 UI에 존재한다.** `POST /:id/promote-master` + `CandidateConflictDrawer` 의 "신규 기본상품으로 등록" 버튼. 정비 메뉴가 새로 발명할 필요가 없다. 다만 **일괄(bulk) 승격은 net-new**이며, 위 1·2 때문에 트랙 무관 일괄은 금지. → §11.

**첫 기능으로 안전한 것:** (C) 고아/충돌 후보 **가시화·분리 대시보드**(읽기 전용 진단) → 그 다음에야 (B) **드럭 한 트랙 한정** bulk dry-run + 게이트 승격. HFF/의약외품/의료기기 일괄 등록은 선행 조건(§12) 충족 전 금지.

---

## 1. 조사 목적

`/admin/o4o-product-db/maintenance` 는 현재 "준비중" 스텁이다. 여기에 정비 기능을 하나씩 붙이려 하며, 첫 후보는 "미등록 후보를 기본상품으로 등록"이다. 본 조사는 구현 전에 다음을 확정한다.

1. 등록 전 후보가 실제 어떤 상태로 존재하는지
2. `source_type`/`source_label`(=요청서의 sourceKind/sourceLabel) 별 분포
3. 등록 전/등록 완료/제외 상태 매핑이 실제 DB와 맞는지
4. candidate→ProductMaster 승격 로직이 어디에 있고 재사용 가능한지
5. `source_label`(트랙)별 ProductMaster 등록 정책이 이미 확정돼 있는지
6. 충돌/중복/필수필드 부족 후보 규모
7. 정비 메뉴 첫 기능의 최소 안전 단위 제안

---

## 2. ⚠️ 요청서 가정 컬럼명 정정 (선행 사실)

요청서(IR 초안)의 컬럼 가정이 실제 스키마와 다르다. 정비 기능 설계 시 **실제 컬럼명**을 기준으로 한다.

| 요청서 가정 | 실제 컬럼 (`product_candidates`) | 비고 |
|---|---|---|
| `status` | **`candidate_status`** | varchar union (DB enum 아님) |
| `sourceKind` / `source_kind` | **`source_type`** | union: supplier_web/pharmacy_web/store_web/mobile_draft/csv_import/xlsx_import/operator_import/external_api/unknown |
| `matchStatus` (엔티티 필드) | **엔티티에서 제거됨** — 물리 컬럼 `match_status`는 **잔존** | 아래 §3 |
| `matchedProductMasterId` | `matched_product_master_id` (uuid, `ON DELETE SET NULL`) | §6 고아 원인 |
| `identifier_value`, `normalized_identifier_value` | 동일 | — |

- 엔티티: `apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts`
- `candidate_status` union 값: `pending / reviewing / revision_requested / matched / linked / approved_new_master / rejected / merged / archived` (9종, 코드상 정의)
- `source_type` 는 유입 채널 유형, `source_label` 은 트랙/배치 라벨(예: `mfds-drug-master-standard-code_2025-10-31`). 요청서의 "sourceKind"는 실무상 **`source_label`** 로 봐야 트랙 구분이 된다.

---

## 3. `match_status` — 폐기 예정이나 물리 컬럼 잔존 (오해 주의)

- 엔티티에서 `match_status`/`matched_identifier_id`/`confidence_score` 는 제거(LEGACY-MASTER-MATCHING-REMOVAL-V1). migration `20261229000000-DropLegacyMatchColumnsFromProductCandidates.ts` 은 뒤 둘만 DROP하고 **`match_status` 컬럼은 의도적으로 남겼다**(import 원천 신호로 raw SQL이 계속 기록).
- 여전히 기록: 모든 import 서비스 + 배치 승격의 `BufferingPromotionApplyStore.flush()`(`match_status='exact_identifier_match'`).
- **불일치 주의:** 단건 admin 승격(`DbPromotionMasterStore.markCandidatePromoted`)은 `match_status`를 쓰지 않는다. → 같은 논리 결과라도 단건 API와 배치 Job이 `match_status`를 다른 상태로 남긴다. **정비 기능은 `match_status`를 진실의 근거로 삼지 말 것**(비신뢰 legacy 신호).

**실측 `match_status` 분포 (active):** exact_identifier_match 247,989 / unmatched 146,262 / conflict 244.

---

## 4. 현재 후보 상태 분포 (실측, active = `deleted_at IS NULL`)

soft-deleted 후보는 **0건**.

### 4-1. `candidate_status` 분포

| candidate_status | count |
|---|---:|
| approved_new_master | 250,817 |
| pending | 126,897 |
| archived | 15,779 |
| matched | 1,000 |
| rejected | 2 |
| **합계** | **394,495** |

> 실제 활성 데이터에는 `reviewing / linked / merged / revision_requested` 값이 **존재하지 않는다**(코드 union에는 있음). 즉 운영 UI가 다루는 실제 상태는 5종.

### 4-2. `source_type` × `source_label` 분포

| source_type | source_label (트랙) | count |
|---|---|---:|
| csv_import | mfds-drug-master-standard-code_2025-10-31 (드럭) | 305,522 |
| external_api | MFDS_HEALTH_FUNCTIONAL_FOOD (건강기능식품) | 41,261 |
| external_api | MFDS_QUASI_DRUG_PERMIT (의약외품) | 22,953 |
| external_api | MFDS_MEDICAL_DEVICE_STANDARD_CODE (의료기기) | 19,996 |
| external_api | MFDS_EASY_DRUG_INFO (e약은요) | 4,757 |
| store_web | kpa-store-product-request | 4 |
| operator_import | phase5/6-smoke | 2 |

---

## 5. "등록 전"(before_registration) 후보 분포 = pending 126,897

운영 UI 그룹 매핑(백엔드 `GROUPED_STATUS_MAP`, `product-candidate.controller.ts`)은 실측과 일치한다:

- **등록 전** `before_registration` → `pending`, `reviewing`
- **등록 완료** `registered` → `matched`, `linked`, `approved_new_master`
- **제외** `rejected` → `rejected`, `merged`, `archived`
- **매칭 필터**는 UI에서 제거됨(SOURCE-UI-HIDE / FILTER-MINIMAL-CLEANUP) — API 파라미터만 호환용 잔존. ⇒ 최종 방향(전체/등록 전/등록 완료/제외 + 매칭 제거)은 이미 코드에 반영됨.

### 5-1. 등록 전(pending) 트랙별 규모 · 필수필드 충족

| 트랙(source_label) | pending | name | mfr | identifier_value | norm_identifier | raw_payload | already_linked |
|---|---:|---:|---:|---:|---:|---:|---:|
| 드럭 (mfds-drug-master-standard-code) | 74,681 | 100% | 100% | 100% | 100% | 100% | 0 |
| 건강기능식품 (HFF) | 41,261 | 100% | 100% | 100% | 100% | 100% | 0 |
| 의약외품 (QUASI_DRUG_PERMIT) | 5,805 | 100% | 100% | 100% | 100% | 100% | 0 |
| e약은요 (EASY_DRUG_INFO) | 4,757 | 100% | 100% | 100% | 100% | 100% | 0 |
| 의료기기 (MEDICAL_DEVICE) | 393 | 100% | 387/393 | **0** | **0** | 100% | 0 |
| **합계** | **126,897** | | | | | | |

- 드럭 pending 74,681 은 **전부 13자리 숫자 표준코드**(barcode-형) 이나 여전히 pending. (원 apply에서 제외된 취소/무효/drug_unspecified 계열로 추정 — 즉 "모양은 적격이나 의도적으로 보류된" 집합. **일괄 승격 시 §6 삭제분을 되살릴 위험**.)
- 의료기기 pending 393 은 `identifier_value` 가 **0** — HIBCC/충돌 holdout(match_status conflict 243 + unmatched 150). 문서상 HOLD 394와 일치. **승격 부적격.**

---

## 6. ⚠️ 등록 완료 ↔ ProductMaster 연결 정합성 (핵심 발견)

### 6-1. 상태별 master 링크 정합성 (실측)

| candidate_status | total | has_master | **no_master** |
|---|---:|---:|---:|
| approved_new_master | 250,817 | 197,608 | **53,209** |
| pending | 126,897 | 0 | 126,897 (정상) |
| archived | 15,779 | 0 | 15,779 (정상) |
| matched | 1,000 | 781 | **219** |
| rejected | 2 | 0 | 2 |

### 6-2. 이상치 확정: "등록 완료인데 master 없음" = **53,428건**

- approved_new_master no-master **53,209** + matched no-master **219** = **53,428**.
- **전부 드럭 트랙**(`mfds-drug-master-standard-code`)이며 `reviewed_at` 은 2026-07-03(승격 시점).
- **원인 확정:** 드럭 승격은 master 230,841건을 생성했으나(문서·§8), 이후 `drug_unspecified` 정리에서 **53,428 master를 삭제**했다. `matched_product_master_id` 는 `ON DELETE SET NULL` 이므로, master 삭제 시 후보의 링크만 NULL로 끊기고 **`candidate_status` 는 `approved_new_master`로 그대로 남았다.**
- 교차검증: 현재 DRUG master = **177,413**. 230,841 − 177,413 = **53,428** (정확히 일치).
- 재등록 안전성: 이 고아 후보들의 `normalized_identifier_value` 가 **현재 살아있는 master 바코드와 충돌하는 건수 = 0**. 즉 master가 병합된 게 아니라 **삭제되어 사라진 것**이 맞다.

> **함의(가장 중요):** 정비 기능이 "미등록 = matched_product_master_id 없음"으로 대상을 잡으면 이 **53,428건을 재승격**해 **의도적으로 삭제한 drug_unspecified 상품을 되살린다.** 반드시 `candidate_status IN ('pending')` 로만 대상을 좁히고, `approved_new_master`/`matched` 는 링크 유무와 무관하게 **제외**해야 한다. (별도로 이 고아 상태의 정합화 — archived 또는 rejected 전환 — 는 §12 선행 과제.)

### 6-3. 부수 이상치

- `approved_new_master` 53,209 + `matched` 219 = 링크 없는 "등록 완료". 위 원인.
- `candidate_status IN ('pending','reviewing')` 인데 master 링크 보유 = **0건** (정상, 역방향 오염 없음).

---

## 7. 트랙별 raw_payload / 필수필드 샘플

- 드럭 pending 74,681: `raw_payload.source.rxOtc` 경로 값은 74,681건 모두 `(none)` — rx/otc 분류는 이 JSON 경로가 아닌 다른 원천 키에 있음(승격 엔진 `promotionFieldsFromCandidate` 가 한글 키를 읽음). **정비 UI가 raw_payload 임의 경로로 분류를 재계산하면 안 됨** → 반드시 기존 매퍼 재사용.
- 고아 approved_new_master 샘플(마스킹): 경희한약오공 / 대효갈근 / 대효가자 등 — 전형적 한약제제(drug_unspecified 계열), `normalized_identifier` = 13자리(8800…), `matched_product_master_id` = NULL, reviewed_at = 2026-07-03. §6 원인과 정확히 부합.
- 의료기기 pending 393: identifier 없음 → 별도 취급.

---

## 8. 기존 승격 로직 · 스크립트 (재사용성)

### 8-1. 승격 경로 (코드)

| 트랙 | 엔진 | Admin API | CLI | Cloud Run Job | 비고 |
|---|---|:--:|:--:|:--:|---|
| **드럭** | `promoteOne` (순수) + `approveAsNewProductMaster`(TX) — `drug-master-promotion-apply.service.ts` / `.db.ts` | ✅ `POST /:id/promote-master` | ✅ | ✅ | **동일 엔진 3면 공유. 재사용 가능(A).** |
| **의료기기** | 별도 엔진 `medical-device-gate-b-promotion.service.ts` (`buildPromotionPlan`/`groupIntoMasters`/`executePromotion`) | ❌ | ✅ | ❌ | **CLI 전용(B). promoteOne 미재사용.** |
| **의약외품** | 없음 (import-only) | ❌ | ❌ | ❌ | 과거 apply는 내부바코드 방식(§9) |
| **HFF/e약은요** | 없음 (import-only) | ❌ | ❌ | ❌ | 승격 경로 부재 |

- 드럭 admin 단건 승격 게이트(`evaluatePromotable`, `product-candidate.service.ts`): `source_label` 이 `mfds-drug-master-standard-code…` 로 시작 + `candidate_status ∈ {pending,reviewing}` + 미링크. 그 외 트랙은 `NOT_DRUG_SOURCE` 로 거부.
- 드럭 dedup(`promoteOne`): barcode / mfdsProductId / (type,normalized) 조회 → 충돌 시 **무write conflict**, 불변필드 미덮어씀, 4-outcome(create/link/conflict/skip). 게이트/트랜잭션/batchId·source trace 모두 존재.
- **일괄 승격 API는 없음.** `POST /bulk-action` 은 archive/ignore/manual_review 뿐(master write 없음).

### 8-2. 정책 문서 (트랙별 게이트)

- 표준 프로세스: `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md` (Gate 0→A→B→C, 상위 게이트 승인은 하위 불포함, 식별자 충돌 시 무write).
- 기반: `docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md`, `docs/checks/CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1.md`, `…-CANDIDATE-REVIEW-QUEUE-V1.md`(auto master 생성 금지 — exact match도 `matched`까지만), `…-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1.md`(합성 내부바코드 생성 중단, barcode nullable, 결정론적 dedup만).
- 승격 결과 CHECK 존재 트랙: **드럭**(230,841 master), **의료기기**(Gate B +19,602 master/+39,204 identifier, HOLD 394), **의약외품**(내부바코드 방식 +17,148 master/+34,296 identifier, 취소/노이즈 5,805 HOLD). **HFF는 apply 없음(ProductMaster 0, 설계상)**.

---

## 9. 트랙별 승격 가능성 평가

| 트랙 | pending | 문서상 정책 | 승격 가능성 | 판정 근거 |
|---|---:|---|---|---|
| **드럭** | 74,681 | 재사용 엔진 + 게이트 존재 | **조건부 가능(B)** | 13자리 표준코드=barcode·checkdigit 게이트. **단, pending 74,681은 원 apply에서 제외된 보류분** — §6 삭제분과 겹칠 위험. 일괄 승격 전 "왜 pending인지" 코호트 분석 필수 |
| **의료기기** | 393 | Gate B 완료, holdout 정책 | **불가(현 pending은 HOLD)** | pending 393 = identifier 0 (HIBCC/충돌). 문서 HOLD 394. 승격 엔진도 CLI 전용 |
| **의약외품** | 5,805 | 취소/노이즈 HOLD | **불가(전량 HOLD)** | pending 5,805 = 폐업/행정취소/취하 등. 승격 경로 없음. 과거 내부바코드 방식은 BARCODE-NULLABLE(2026-07-10) 이후 **금지** |
| **HFF** | 41,261 | **HOLD / 등급 C** | **금지** | 바코드/GTIN/SKU 원천 부재 + 유효상태 원천 부재. 내부바코드 조작 명시적 금지. 승격 경로 없음 |
| **e약은요** | 4,757 | 설명서(DrugExtension) 트랙 | **비대상** | ProductMaster 승격 아님(drug master에 확장 붙이는 트랙, 별도 설계 문서) |

---

## 10. 충돌 / 중복 위험 (실측)

- **드럭 pending vs 살아있는 master 바코드 충돌: 0건.** (pending 74,681의 normalized_identifier가 기존 master.barcode와 겹치는 건 없음 — 재승격 시 link가 아닌 create가 됨 = 삭제분 부활 위험 확인.)
- **pending 내부 normalized_identifier 중복 그룹: 0건.** (트랙 내 자기충돌 없음.)
- **고아 approved_new_master(53,428)의 normalized_identifier vs 살아있는 master: 0건 충돌.** → master가 병합이 아니라 삭제됐음을 재확인.
- 의료기기 pending 243 = `match_status='conflict'`(UDI-DI 충돌 격리). 승격 부적격.

---

## 11. 데이터 정비 메뉴 첫 기능 추천

### 채택: (C) → (B) 단계적

**1단계 — 후보 기능 C: 미등록/고아/충돌 가시화 대시보드 (읽기 전용)**
- 트랙별 pending 수, `approved_new_master` 고아 53,428, 의료기기 conflict, HFF HOLD 규모를 **한 화면에서 진단만** 한다(write 0).
- 기존 GET 엔드포인트(`GET /`, `/:id`, `/:id/conflict-info`)로 구현 가능. 신규 write 없음 = 가장 안전한 첫 삽.
- 목적: "등록 전"과 "삭제되어 미등록으로 보이는 것"을 운영자가 눈으로 구분하게 함.

**2단계 — 후보 기능 B: 드럭 트랙 한정 bulk dry-run + 게이트 승격**
- 대상 엄격 제한: `source_label LIKE 'mfds-drug-master-standard-code%' AND candidate_status = 'pending'` 만.
- **반드시 `evaluatePromotable` + `promoteOne` 기존 엔진 재사용**(새 매퍼 금지). dry-run 우선, apply는 이중 가드.
- 선행: §6 고아 코호트와 §5-1 pending 74,681 의 "왜 보류인가" 분류가 끝난 뒤에만.

### 비채택
- (A) 트랙 무관 "등록 전 전부 dry-run": HFF/의약외품/의료기기 섞여 위험(§9).
- (D)는 "정비 메뉴 착수 불가"가 아니라 **일괄 승격 착수 전 선행 정리가 필요**하다는 의미 — §12로 흡수.

---

## 12. 구현 전 선행 조건

1. **고아 53,428 정합화 결정** — `approved_new_master`(링크 없음) 를 `archived`/`rejected` 중 무엇으로 볼지 정책 확정. 정합화 전에는 어떤 "미등록" 정의도 이들을 오분류한다. (변경은 별도 승인·청크 UPDATE — 대량삭제/대량UPDATE는 단일TX migration 금지, `reference_large_delete_migration_limit` 참조.)
2. **드럭 pending 74,681 코호트 분석** — 취소/무효/drug_unspecified/신규 유입 중 무엇인지 read-only 분류. §6 삭제분과 중복 여부 확정 전 일괄 승격 금지.
3. **트랙 스코프 하드코딩** — 정비 승격 API/화면에 `source_label` 화이트리스트(드럭만) 강제. HFF/의약외품/의료기기 승격 버튼 자체를 노출하지 않음.
4. **`match_status` 비의존 확정** — 정비 로직은 legacy `match_status` 를 근거로 쓰지 않음(§3).
5. **일괄 승격 시 청크·게이트·감사** — bulk는 net-new이므로 청크 처리 + dry-run 선행 + batchId trace + 이중 가드 env.

---

## 13. 금지 / 주의 사항 (정비 기능 설계 불변식)

- ❌ "master 링크 없음" = 미등록으로 간주 금지 → §6 고아 53,428 재승격 위험.
- ❌ 트랙 무관 일괄 승격 금지 (HFF/의약외품/의료기기 pending 승격 금지).
- ❌ 합성/내부 바코드 재생성 금지 (BARCODE-NULLABLE, `generateInternalBarcode` 제거됨).
- ❌ raw_payload 임의 경로로 분류·필드 재계산 금지 → 기존 매퍼(`promotionFieldsFromCandidate`) 재사용.
- ❌ auto-create/auto-approve 금지 (exact match도 `matched`까지). Seed가 Offer/Listing/StoreLocalProduct/Order 자동생성 금지.
- ❌ 식별자 충돌 시 덮어쓰기 금지 → conflict 격리, 불변필드 유지.
- ❌ 대량 삭제/UPDATE를 단일 TX migration으로 금지 (startup probe 초과·락 경합).
- ✅ 정비 첫 기능은 read-only 진단부터. write는 드럭 단일 트랙 dry-run 통과 후.

---

## 부록 A. 실행 조사 SQL (read-only)

`scratchpad/ir_audit.sql`, `ir_audit2.sql` — candidate_status/match_status/source 분포, 상태×master 링크 정합성, pending 트랙별 필수필드, 바코드 충돌, 고아 원인 확정 쿼리. 전부 SELECT, DB write 0.

## 부록 B. 핵심 코드 위치

- 엔티티: `apps/api-server/src/modules/neture/entities/{ProductCandidate,ProductMaster,ProductIdentifier}.entity.ts`
- 드럭 승격 엔진: `apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.{service,db}.ts`
- 단건 승격 게이트/서비스: `apps/api-server/src/modules/neture/services/product-candidate.service.ts` (`evaluatePromotable`, `approveAsNewProductMaster`)
- Admin 라우트: `product-candidate.controller.ts` (`/api/v1/operator/product-candidates`)
- 의료기기 Gate B(CLI): `apps/api-server/src/modules/neture/drug-import/medical-device-gate-b-promotion.service.ts`
- 정비 스텁 UI: `apps/admin-dashboard/src/pages/o4o-product-db/ProductDbMaintenancePage.tsx`
- 후보 UI/드로어: `ProductCandidatesPage.tsx`, `CandidateConflictDrawer.tsx`

---

*Status: Investigation complete — DB write 0 / code change 0 / migration 0 / apply 0.*
