# CHECK-O4O-ADMIN-PRODUCT-CANDIDATE-UNMATCHED-ACTIONS-V1

Status: 코드 완료 + typecheck/build 통과 → 프로덕션 smoke 진행 (2026-07-08)
WO: `WO-O4O-ADMIN-PRODUCT-CANDIDATE-UNMATCHED-ACTIONS-V1`
선행: `WO-...-CANDIDATE-CONFLICT-ACTIONS-V1`(conflict 드로어·bulk-action·manual-match)

Scope: `/admin/o4o-product-db/candidates?candidateStatus=pending&matchStatus=unmatched` 후보의 운영자 수동 처리. 기존 ProductMaster 수동 매칭(재사용) + **신규 ProductMaster 승격(1건씩, drug 소스만)** + bulk reviewing/reject/archive(재사용). **hard delete·rawPayload 제거·기존 master 수정·대량승격 없음.**

---

## 1. 조사 — 승격 서비스 (§12 중단체크의 핵심)

**기존 승격 서비스 `approveAsNewProductMaster`(product-candidate.service.ts:744) = `promoteOne`(drug-master-promotion-apply) 재사용.** 안전성 확인:
- **transaction** + `DbPromotionMasterStore`. dedup: findMasterByBarcode / findMasterIdsByIdentifier(KOREA_DRUG_CODE) / findMasterByMfdsProductId. 충돌 시 write 안 함(outcome=conflict). eligibility gate(GTIN 검증 등). outcome ∈ create/link/conflict/skip. `markCandidatePromoted`=candidate 상태만 갱신(matched/approved_new_master).
- **⚠️ 결정적 제약**: `buildMasterPreview` 가 **`regulatoryType:'DRUG'` 하드코딩** + KOREA_DRUG_CODE/GTIN/`DRUG_` mfdsProductId + tags `import:hira-drug-master`. **= 의약품 표준코드 전용 파이프라인.**

**unmatched(pending) 분포 (prod read-only 2026-07-08)**:
| source_label | count | 승격 |
| --- | --- | --- |
| `mfds-drug-master-standard-code_*` | **74,681** | ✅ drug(파이프라인 대상) |
| MFDS_HEALTH_FUNCTIONAL_FOOD | 41,261 | ❌ 건기식 |
| MFDS_QUASI_DRUG_PERMIT | 5,805 | ❌ 의약외품 |
| MFDS_EASY_DRUG_INFO | 4,757 | ❌(표준코드 아님) |
| MFDS_MEDICAL_DEVICE_STANDARD_CODE | 150 | ❌ 의료기기 |

→ **§12 결정**: 비-drug 후보를 이 파이프라인으로 승격하면 잘못된 `regulatoryType=DRUG` master 생성(§5.3 의료기기 금지 위반). **promote 를 drug 표준코드 소스로 게이트**하고, 비-drug 는 **승격 비활성 + "별도 트랙" 안내**(후속 WO). §5 "기존 승격 로직 재사용" + §5.3/§12 동시 충족.

---

## 2. 백엔드 (api-server) — 신규 2 + 재사용

mount `/api/v1/operator/product-candidates` (guard OPERATOR_ROLES).

| 엔드포인트 | 역할 |
| --- | --- |
| `GET /:id/conflict-info`(확장) | **`promotable:{eligible, reason}` 추가**(additive). eligible = sourceLabel `mfds-drug-master-standard-code*` + status pending/reviewing + unmatched + 미연결. reason=NOT_DRUG_SOURCE/STATUS_.../ALREADY_MATCHED/LINKED |
| **`POST /:id/promote-master`**(신규) | `promoteMasterFromCandidate` → `evaluatePromotable` 게이트 통과 시에만 `approveAsNewProductMaster`(TX+dedup) 호출. 게이트 실패=`NOT_PROMOTABLE_{reason}` 400. outcome=create/link/conflict/skip 반환 |
| `POST /:id/manual-match`(재사용) | 기존 conflict WO |
| `POST /bulk-action`(재사용) | reviewing/reject/archive(archive/ignore/manual_review) |

`evaluatePromotable`/`promoteMasterFromCandidate` service 추가. **ProductMaster/Identifier 생성은 approveAsNewProductMaster(=promoteOne) 내부·트랜잭션에서만.**

---

## 3. 프론트 (admin-dashboard)

- api client: `promotable` 필드 추가 + `promoteCandidateToMaster(id)`.
- `CandidateConflictDrawer`(conflict WO 재사용·확장): **"신규 기본상품 승격" 섹션** 추가.
  - `promotable.eligible` → **`신규 기본상품으로 승격` 버튼** → **ConfirmActionDialog(생성될 정보 preview: 상품명/제조/식별자/규격 + "ProductMaster·Identifier 생성, rawPayload 삭제 없음, 기본상품 무변경")** → `promoteCandidateToMaster` → outcome별 toast(create/link/conflict/skip) → 목록 갱신.
  - 비-eligible → **비활성 안내**("의료기기·의약외품·건기식·e약은요 등은 승격 미지원 — 별도 트랙. 수동매칭/보류/제외/archive 로 처리").
- 기존 드로어 기능(기본정보/원천값/충돌근거/수동매칭 검색/rawPayload/archive·ignore·manual_review) 유지. unmatched·conflict 공통 사용.

---

## 4. 안전 / 제외 (WO §9 준수)

- hard delete·rawPayload 삭제·기존 master 수정 **없음**. ProductIdentifier 무조건 생성 안 함(promoteOne 의 조건부 생성만). StoreLocalProduct/Listing/Offer 생성 **없음**.
- **일괄 신규 승격 금지**(promote 는 상세 개별 1건만). source 자동 승격·의료기기 Gate B apply **없음**.
- 의료기기 방어: promote 게이트에서 비-drug 전면 차단(파이프라인 자체가 device 미지원).
- promote 자격: sourceLabel drug표준코드 + status pending/reviewing + unmatched + 미연결. 중복 barcode/identifier=promoteOne dedup→conflict.

---

## 5. 검증

| 항목 | 결과 |
| --- | --- |
| api-server typecheck | **에러 0** |
| admin-dashboard typecheck | **에러 0** |
| admin/api build | **EXIT 0** |
| 변경 파일 | 백엔드 2(controller/service) + 프론트 2(api client/CandidateConflictDrawer) |
| ProductMaster/Identifier 생성 | promote-master(=approveAsNewProductMaster) 트랜잭션 내부에서만 |
| 프로덕션 smoke | 진행 (배포 후): unmatched 진입 → 드로어 → drug 후보=승격 preview·비-drug=비활성 안내 → 승격 outcome / 수동매칭 / bulk / Console Error 없음 |

---

## 6. 상태·승격 매핑 (CHECK 필수)

| 액션 | 결과 |
| --- | --- |
| 수동 매칭 | candidateStatus=matched, matchStatus=manually_matched, matchedProductMasterId |
| 신규 승격(create) | ProductMaster 생성 + Identifier + candidateStatus=approved_new_master, matchStatus=exact_identifier_match (markCandidatePromoted) |
| 신규 승격(link) | 동일 barcode master 연결 + candidateStatus=matched |
| 신규 승격(conflict) | **write 없음** (identifier/mfds 충돌) |
| 신규 승격(skip) | **write 없음** (GTIN/필수필드 미달) |
| bulk archive/ignore/manual_review | candidateStatus=archived/rejected/reviewing (matchStatus 미변경) |

---

## 7. 남은 제한 / 후속 (§12)

- **비-drug 승격(건기식/의약외품/의료기기/e약은요) 미지원** — 각 유형별 regulatoryType/Identifier 정책 필요 → **별도 WO**. 의료기기는 Gate B(UDI/GTIN/permit) 정책과 정합 필요.
- 일괄 신규 승격·source 자동 승격 = 범위 밖.
- promote preview 는 candidate 필드 기반(서버 buildMasterPreview 는 DRUG 강제) — 비-drug 차단으로 오생성 방지.
