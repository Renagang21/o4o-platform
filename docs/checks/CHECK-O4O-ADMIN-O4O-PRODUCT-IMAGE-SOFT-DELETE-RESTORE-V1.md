# CHECK-O4O-ADMIN-O4O-PRODUCT-IMAGE-SOFT-DELETE-RESTORE-V1

WO: `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-SOFT-DELETE-RESTORE-V1` (이미지 action Phase 2)
기반: `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1` (Phase 1 — 추가/대표 지정)

## 0. 범위

ProductMaster 이미지의 **숨김(soft delete) / 복원**. hard delete·GCS 삭제·교체는 범위 밖.
product_images 에만 write. ProductMaster 본문/설명/후보 무변경.

## 1. 구현 요약

| 항목 | 내용 |
|---|---|
| 숨김 | `DELETE /api/v1/admin/o4o-product-db/masters/:id/images/:imageId` → `deleted_at`/`deleted_by` set, `is_primary=false`. GCS 원본 보존(`gcs_path` 유지). |
| 복원 | `POST .../images/:imageId/restore` → `deleted_at`/`deleted_by` null. |
| 목록(admin) | `GET .../images` → 숨김 포함(active 먼저, 숨김 뒤). 공유 상세(`/neture/products/library/:id`)는 active 만. |
| audit | `image_hidden` / `image_restored` (+ 자동 승계 시 `image_primary_changed(auto)`) → `audit_logs`, 작업이력 UNION + 프론트 badge. |

## 2. 정책 결정 (사용자 확정)

1. **대표 자동 승계 (WO §7)** — 채택.
   - 숨김: 대표를 숨기면 남은 active 중 `sortOrder ASC, createdAt ASC` 다음 이미지를 **자동 대표 승계**. 남은 active 없으면 대표 0.
   - 복원: 복원 시 active 대표가 없으면 **복원 이미지를 대표로 자동 지정**.
   - (WIP 초안의 "자동 승계 없음"에서 WO §7 스펙으로 정렬.)
   - 승계는 트랜잭션 내 처리(active-primary partial UNIQUE `uq_product_images_active_primary` 와 호환: clear→set 순서).
2. **`deleted_at` 필터 커버리지 = 개별 후속 WO 로 분리.**
   - 표시 핵심(primary image_url 조회 `WHERE is_primary=true`)은 **본질적으로 안전** — 숨김이 `is_primary=false` 로 만들기 때문에 대표 조회에서 자동 제외.
   - 이번 WO 는 detail(`product-library`) / store(`store-product-library`) / OCR(`product-ocr`) 3개 표시 경로에 `deleted_at IS NULL` 필터 적용.
   - 잔여: 이미지 count/EXISTS("보유" 체크) 및 비대표 갤러리(POP-PDF, offer 갤러리 등) ~12 경로는 숨김 포함 → **`WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-HIDDEN-FILTER-COVERAGE-V1`(후속)** 로 분리.

## 3. 마이그레이션

**신규 마이그레이션 없음.** `deleted_at`/`deleted_by` 컬럼은 Phase 1 마이그레이션
`20261220000000-AddProductImageActionColumnsAndAuditLogTable` 에서 이미 추가됨(프로덕션 적용 확인).

## 4. 안전 요건 확인

- [x] hard delete 없음 (row 삭제 없음, soft delete 만)
- [x] GCS delete 없음 (`imageStorageService.deleteImage` 미호출)
- [x] ProductMaster 본문 무변경 (`product_masters` write 없음)
- [x] active-primary UNIQUE 제약 유지(숨김/복원/승계 트랜잭션)
- [x] 권한 ADMIN_ROLES (operator scope 없음)

## 5. 로컬 검증

| 검증 | 결과 |
|---|---|
| `apps/admin-dashboard type-check` | PASS |
| `apps/api-server type-check` | 내 파일 clean (실패는 병렬 세션 `src/scripts/drug-otc-nutrition-combo-*` 만 — 범위 밖, tsconfig.build 는 `src/scripts/**` 제외) |
| `apps/api-server build` | PASS |
| `apps/admin-dashboard build:prod` | PASS |
| `git diff --check` | clean |

## 6. 프로덕션 smoke

(배포 후 기록 — 아래 시나리오)

1. active 이미지 2장 이상 상품에서 **대표 숨김** → 남은 active 다음이 자동 대표 승계 확인
2. 작업이력 `image_hidden` + `image_primary_changed(auto)` 표시
3. 숨김 이미지 **복원** → active 대표 있으면 비대표 복원 / 없으면 자동 대표
4. 작업이력 `image_restored` (+ 필요 시 `image_primary_changed`)
5. active-primary count 항상 ≤ 1 (DB 확인)
6. 마지막 active 대표 숨김 → 대표 0 확인
7. 공유 상세/store 목록에 숨김 이미지 미노출
8. ProductMaster `updated_at` 불변 / 설명·후보 mutation 0
9. 허용 mutation: images DELETE / restore POST / set-primary POST / auth-login. GCS delete·row hard delete 0

### smoke 결과

> _(배포 후 채움)_

## 7. 커밋

- 코드 7파일 + 본 CHECK (path-specific stage). `tmp/` 백업·병렬 drug-OTC untracked 는 커밋 제외.
