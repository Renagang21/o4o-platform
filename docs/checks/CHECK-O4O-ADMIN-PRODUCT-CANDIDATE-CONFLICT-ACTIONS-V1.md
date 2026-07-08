# CHECK-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1

Status: DONE — 코드 완료 + typecheck/build 통과 + 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1`

Scope: `/admin/o4o-product-db/candidates` conflict(및 일반) 후보를 **안전하게 검토·정리**. 충돌 근거 표시 + 상세 drawer + 일괄 처리(archive/ignore/manual_review) + 기존 ProductMaster 수동 매칭. **hard delete·rawPayload 제거·ProductMaster/Identifier 변경 없음.**

---

## 1. 조사 — 상태 매핑 (중단 기준 §10 통과)

`product_candidates` 는 **DB enum 아님 — varchar + application union**(확장 시 migration 불필요). 기존 상태값에 매핑 가능:

| WO 액션 | 기존 상태/엔드포인트 | 신규 여부 |
| --- | --- | --- |
| archive | candidateStatus `archived` (POST `/:id/archive` 존재) | 기존 |
| ignore | candidateStatus `rejected` (POST `/:id/reject` 존재) | 기존 매핑 |
| manual_review | candidateStatus `reviewing` | 신규 엔드포인트 필요 |
| matched | matchStatus `manually_matched` + `matchedProductMasterId` (POST `/:id/manual-match` 존재) | 기존 |

기존 write 서비스(archiveCandidate/rejectCandidate/manuallyMatchCandidate) **전수 확인 — 모두 product_candidates 만 갱신, ProductMaster/Identifier 무변경, hard delete 없음, rawPayload 보존**. → §10 중단 트리거 없음.

- **conflictReason 전용 필드 없음** → 계산으로 대체(§4.1 우선순위: 계산 근거 제시).

---

## 2. 백엔드 (api-server) — 신규 2 + 재사용

mount `/api/v1/operator/product-candidates` (guard = OPERATOR_ROLES: platform/neture/glycopharm/cosmetics/kpa admin+operator).

| 엔드포인트 | 역할 |
| --- | --- |
| **GET `/:id/conflict-info`** (신규) | read-only 충돌 근거: 동일 `normalized_identifier_value`(없으면 identifier_value) 공유 다른 후보 최대 50 + 식별자(barcode) 일치 ProductMaster 최대 50 + rawPayload scalar 요약(최대 20). repository + parameter binding(Boundary 준수). 무변경 |
| **POST `/bulk-action`** (신규) | `{ids[], action}` — archive→archived / ignore→rejected / manual_review→reviewing. **ids ≤ 100**, reviewedBy 기록, `repo.update` 로 product_candidates 만 갱신. **matchStatus 미변경**(기존 archiveCandidate 와 일관 — 매칭 신호 보존). hard delete 없음 |
| POST `/:id/manual-match` (기존 재사용) | `{productMasterId}` → matchStatus=manually_matched + matchedProductMasterId. candidate 만 갱신 |

서비스: `getConflictInfo` / `bulkAction` / `summarizeRawPayload`(private) 추가. `In`/`Not` import.

---

## 3. 프론트 (admin-dashboard)

### API 클라이언트 (`o4o-product-db.api.ts`)
`getCandidateConflictInfo` / `bulkCandidateAction(ids, action)` / `manualMatchCandidate(id, masterId)` 추가.

### `CandidateConflictDrawer.tsx` (신규) — `BaseDetailDrawer` + `ConfirmActionDialog` (@o4o/ui)
- **A. 후보 기본 정보**: 상품명/제조·업체/분류/source·label/후보상태/매칭상태/생성일.
- **B. 주요 원천값**: 식별자 유형·값·정규화 + rawPayload 요약 12.
- **C. 충돌 정보**: 동일 식별자 다른 후보(MiniTable) + 식별자 일치 기본상품(각 행 `매칭` 버튼).
- **D. 처리 액션**(footer): archive / 제외(ignored) / 보류(manual_review) — 각 ConfirmActionDialog.
- **수동 매칭**: 기존 ProductMaster 검색(debounce, `listProductMasters` 재사용) → `매칭` → 확인 → `manualMatchCandidate`.
- **rawPayload 전체**: `<details>` 접힘(원천 보존 안내).

### `ProductCandidatesPage.tsx`
- 행 클릭/`상세·충돌 검토` → 드로어 오픈(기존 detail route navigate 대체).
- 선택 시 **ActionBar 일괄 버튼**: archive/제외/보류 — 각 `confirm` config(ActionBar 내장 ConfirmActionDialog) → `bulkCandidateAction(selectedIds, action)` → 선택 해제 + 목록/카운트 갱신.
- 안내 문구: "원천 데이터 삭제 없음, 기존 상품 매칭은 상세에서".

---

## 4. 안전장치 / 제외 (WO §6·§7 준수)

- 모든 쓰기 액션 **확인 모달**(ConfirmActionDialog, 문구에 "원천 데이터 삭제 없음/기본상품 변경 없음" 명시).
- **matched 는 상세 drawer 개별 처리만**(일괄 매칭 금지 — 기존 master 선택 필요).
- 미포함: hard delete / ProductMaster 대량 생성 / ProductIdentifier 생성 / Gate B 승격 / rawPayload 삭제 / 자동 병합 / 스키마 대규모 변경 — **무접촉**.
- bulk ids ≤ 100, 권한 admin/operator.

---

## 5. 검증

| 항목 | 결과 |
| --- | --- |
| api-server typecheck | **에러 0**(변경 파일, 잔여는 병렬 drug-otc scripts=build 제외) |
| admin-dashboard typecheck | **에러 0** |
| admin build / api build | **EXIT 0** |
| 변경 파일 | 백엔드 2(controller/service) + 프론트 3(api client/ProductCandidatesPage/CandidateConflictDrawer 신규) |
| hard delete | **없음**(repo.update/save 만) |
| rawPayload 보존 | ✅(요약만 계산, 원본 무변경) |
| ProductMaster/Identifier 변경 | **없음**(manual-match=candidate 만 갱신) |
| 프로덕션 smoke | **PASS** (admin.neture.co.kr, 2026-07-08, 서철환 admin, API+Admin 배포 성공) |

**smoke 상세 (PASS):**
- conflict 필터 진입 → **총 244건**(심미수복용 복합레진 등 pending/conflict).
- 행 클릭 → **드로어 렌더**: 후보 기본정보 / 주요 원천값(sourceKind=medical_device_standard_code, rawPayload 요약) / **동일 식별자 다른 후보(0) — §4.1 fallback 안내**("동일 식별자 후보 없음 → rawPayload 확인") / 식별자 일치 기본상품(0) / 수동 매칭 검색 / rawPayload 접힘 / footer archive·제외·보류.
- **archive** → **ConfirmActionDialog**("원천 데이터(rawPayload)는 삭제되지 않으며… 계속할까요?") → 확인 → 처리 → 드로어 닫힘 + 목록 갱신.
- **네트워크**: `GET /:id/conflict-info` **200** · `POST /bulk-action` **200** · 목록 갱신 GET 200. 쓰기 POST = login + bulk-action 뿐 → **hard delete/ProductMaster write 없음**. Console Error 없음.
- (수동 매칭 검색 UI 구조 존재, 엔드포인트=기존 manual-match 재사용.)

---

## 6. 상태값 매핑 명시 (CHECK 필수)

| UI 액션 | candidateStatus | matchStatus |
| --- | --- | --- |
| archive | `archived` | (미변경) |
| ignore | `rejected` | (미변경) |
| manual_review | `reviewing` | (미변경) |
| 수동 매칭 | `matched` | `manually_matched` (+matchedProductMasterId) |

> conflict 후보를 archive/ignore 해도 matchStatus 는 `conflict` 유지(매칭 신호 보존). "정리된 후보"는 candidateStatus 로 구분되며, conflict 필터 + candidateStatus=pending 필터로 잔여 큐 확인 가능. matchStatus 를 리뷰 결정으로 덮어쓰지 않음(설계 결정).

---

## 7. 남은 제한 / 후속

- 충돌 근거는 **동일 식별자 + barcode 일치**로 계산(전용 conflictReason 필드 없음). 근거가 부족한 후보는 "동일 식별자 후보 없음 → rawPayload 확인" 안내.
- matched 일괄 처리·ProductIdentifier 부착·신규 승격 = 별도 WO.
