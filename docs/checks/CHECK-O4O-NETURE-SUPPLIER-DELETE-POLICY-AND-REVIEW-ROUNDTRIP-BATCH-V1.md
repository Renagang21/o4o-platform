# CHECK-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1

- **WO**: `WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1`
- **작성일**: 2026-08-12
- **전체 판정**: **PASS** (확정 결함 1건 수정 · smoke 전 단계 통과 · HOLD 0)

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `c7d4d89af` |
| 수정 commit | `d866faa08` |
| 배포 headSha | `6ad94a498` (다른 세션의 후속 commit, 본 변경 포함) |

작업 시작 시 `git status --short` = clean (다른 세션 미추적 문서 2건은 미접촉).

---

## 2. 공급자 상품 삭제 정책 조사 결과

| 항목 | 조사 전 (결함) | 수정 후 |
|---|---|---|
| `bulkDeleteOffers` 구현 | `offerRepo.remove()` — **hard delete** | 가드 후 `softDelete()` |
| FK 영향 | `supplier_product_offers` 참조 5개가 전부 `ON DELETE CASCADE` (`offer_service_approvals`, `offer_service_prices`, `organization_product_listings`, `product_approvals`, `service_products`) → 매장 진열·승인 이력까지 소실 | CASCADE 미발동 |
| 공급자 목록 조회 | 이미 `deleted_at IS NULL` 필터 사용 (soft delete 전제) | 계약 일치 |
| operator 정책 | `operator-product-cleanup.controller.ts` = soft-delete / recycle-bin / restore / hard-delete(409 `HARD_DELETE_BLOCKED`) — **soft delete 가 canonical** | 공급자 삭제가 동일 계약으로 정렬 |

**수정 내용**

- `apps/api-server/src/modules/neture/services/offer.service.ts`
  - 삭제 전 가드: 활성 `organization_product_listings` 또는 `service_products` 가 있으면 삭제하지 않고 실패 사유 반환
  - 통과 시 `isActive=false` + `deletedBy` + `deleteReason='SUPPLIER_DELETE'` 기록 후 `softDelete()`
- `apps/api-server/src/modules/neture/constants/offer-error-code.ts` — `HAS_ACTIVE_LISTINGS`, `HAS_SERVICE_PRODUCTS` 추가
- `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` — 삭제 실행자(`req.user?.id`) 전달
- `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` — 실패 사유 라벨 매핑 + 모달 문구 정정
  - "삭제하면 목록에서 사라지고 판매가 중지됩니다. 기록은 남으므로 복구가 필요하면 운영자에게 요청하세요."
  - "매장에 진열 중이거나 서비스에 연결된 상품은 삭제되지 않습니다."

`deleted_at` / `deleted_by` / `delete_reason` 컬럼은 기존 존재 → **migration 없음** (§3 준수).

---

## 3. ProductMaster orphan 판정

- 공급자가 offer 를 삭제해도 `product_masters` row 는 남는다.
- soft delete 상태에서는 offer 가 여전히 master 를 FK 로 참조하므로 orphan 이 아니다.
- operator 가 휴지통에서 **완전 삭제**하면 master 는 참조 없는 상태로 남는다.
- **판정: 자동 삭제하지 않는다** (WO §6-C). 근거
  - master hard delete 는 `shared_product_descriptions` CASCADE 를 유발 → 설명서 이력 소실
  - offer 가 없는 master 는 공급자 목록·HUB·매장 어느 경로에도 노출되지 않음 (노출·참조 위험 0)
  - 정리가 필요하면 운영자가 `/admin/masters` 에서 판단해 수행

---

## 4. 수정요청·재요청 왕복 smoke 결과 (실브라우저 · 프로덕션)

대상: SPD `aceddc36-678b-4346-92c1-2994ec745c84` / master `28d5caa1-…` / supplier `91169739-…`

| # | 단계 | 결과 |
|---|---|---|
| 1 | 공급자 상품 생성 (`[SMOKE] 삭제·검수왕복 테스트상품`, 공급가 10,000) | PASS |
| 2 | 인라인 수정 12,000 저장 | PASS |
| 3 | 매장용 설명서 draft 작성 | PASS |
| 4 | 검수 요청 → `needs_review`, `submitted_at 02:55:42` | PASS |
| 5 | operator 검수 화면에서 요청 확인 | PASS |
| 6 | operator 수정 요청 전송 → `revision_requested`, `revision_requested_at 02:59:24`, `revision_due_at 2026-09-11 02:59:24` (+30일), `review_note` 저장 | PASS |
| 7 | 공급자 화면에서 사유·기한 확인 ("운영자가 수정을 요청했습니다 · 2026. 09. 11.까지 재요청 / 사유: …") + "다시 검수 요청" CTA | PASS |
| 8 | 수정 후 재요청 → `needs_review`, `submitted_at 03:00:07`, `revision_requested_at`·`revision_due_at`·`review_note` 전부 NULL 초기화 | PASS |
| 9 | store-materials-status 카운터 변화 (검수 대기 1 → 수정 요청 1 / 검수 대기 0 → 재요청 후 복귀) | PASS |
| 10 | 승인 또는 철회 → **철회 선택** | PASS |
| 11 | 테스트 데이터 정리 | PASS (§7) |
| 12 | 카운터 복귀 (수정 요청 0 / 검수 대기 0 / 게시 중 0 / 작성 중 0) | PASS |

> §8-10 의 "승인 또는 철회" 중 **철회**를 선택했다. 승인은 `canonical` 승격이며 운영 HUB·매장 노출을 발생시키므로 smoke 목적으로 실행하지 않는다.

---

## 5. 설명서 철회 · soft delete 상태 정합

- 철회 실행 → `deleted_at 03:00:38` 기록, `status` 는 `needs_review` 로 잔존.
- **판정: 정합.** 노출 여부의 SSOT 는 `deleted_at` 이며 조회 경로는 모두 `deleted_at IS NULL` 로 거른다. `status` 는 철회 시점의 이력 값으로 남기는 것이 의도된 동작이다.
- canonical 유니크 제약 `uniq_shared_product_descriptions_canonical_per_master_type_lang` 도 `deleted_at IS NULL` 조건부이므로 재작성 충돌 없음.

---

## 6. store-materials-status 반영 결과

`/supplier/store-materials-status` 카운터가 각 상태 전이마다 즉시 반영됨을 화면에서 확인.

| 시점 | 작성 중 | 검수 대기 | 수정 요청 | 게시 중 |
|---|---:|---:|---:|---:|
| 검수 요청 후 | 0 | 1 | 0 | 0 |
| operator 수정 요청 후 | 0 | 0 | 1 | 0 |
| 재요청 후 | 0 | 1 | 0 | 0 |
| 철회 후 | 0 | 0 | 0 | 0 |

---

## 7. 삭제 정책 smoke + 테스트 데이터 정리

| # | 단계 | 결과 |
|---|---|---|
| 1 | 공급자 화면에서 테스트 상품 삭제 실행 (새 모달 문구 2줄 그대로 노출) | PASS |
| 2 | 결과 = **soft delete** — `deleted_at 2026-08-12 03:03:49+00`, `deleted_by 6967ebe0-…`, `delete_reason 'SUPPLIER_DELETE'`, `is_active=false` | PASS |
| 3 | ProductMaster orphan 여부 — row 잔존, §6-C 에 따라 자동 삭제하지 않음 | PASS |
| 4 | 노출 0 확인 — listings 0 / service_products 0 / offer_service_approvals 0 / offer_service_prices 0 / product_approvals 0 / spot_price_policies 0 / live SPD 0 | PASS |
| 5 | 정리 가능성 — operator `/admin/product-cleanup` → 휴지통에 삭제 상품 1건 표시(삭제자·사유 포함), **복구 / 완전 삭제** 모두 사용 가능 | PASS |

**정리 결과** (2026-08-12)

- 휴지통에서 **완전 삭제** 실행 → `supplier_product_offers` row 0 (휴지통 "비어 있습니다")
- 잔존: `product_masters` 1건(`[SMOKE] …`, 노출 경로 0) · `shared_product_descriptions` 1건(soft delete, `deleted_at` 기록됨)
- 두 잔존 row 는 §3 (DB schema/직접 write 금지) 및 §6-C 원칙에 따라 DB 직접 삭제하지 않았다. 필요 시 운영자가 `/admin/masters` 에서 정리한다.

---

## 8. HOLD

**HOLD 0건.** WO §7 의 7개 조건 어디에도 해당하지 않았다.

---

## 9. 검증 · 배포 결과

| 항목 | 결과 |
|---|---|
| api-server targeted test | PASS — 신규 `supplier-bulk-delete-soft-delete-contract.test.ts` 6 케이스 포함 13/13 |
| api-server typecheck | PASS |
| web-neture 타입 검사 | PASS — `build` (`tsc && vite build`) |
| Deploy API Server / Web Services / Admin Dashboard / CodeQL | 전부 성공 (headSha `6ad94a498`) |
| 실브라우저 smoke | PASS (§4·§7) |

> **정정**: 직전 WO 의 "web-neture typecheck PASS" 기록은 무효다. `services/web-neture` 에는 `typecheck` 스크립트가 없어 해당 명령은 no-op 이었다. 실제 타입 검사는 `build` 이며, 본 WO 는 `build` 로 검증했다.

---

## 10. commit SHA

| commit | 내용 |
|---|---|
| `d866faa08` | fix(neture): 공급자 상품 삭제를 soft delete 로 정합화 |
| (본 문서) | docs(check): 삭제 정책·검수 왕복 배치 CHECK 기록 |

---

## 11. push 결과

`d866faa08` push 완료 · 배포 성공 확인. 본 CHECK 문서 커밋 후 `HEAD == origin/main` 재확인.
