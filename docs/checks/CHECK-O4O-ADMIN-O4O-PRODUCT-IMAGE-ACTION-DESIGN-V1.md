# CHECK-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-DESIGN-V1

Status: DONE — ProductMaster 이미지 action 설계 (2026-07-07). **설계 문서 전용 — 코드/DB write 0**
WO: `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-DESIGN-V1`
선행: `CHECK-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-ACTION-DESIGN-V1`(R2 이미지) · 이미지 상태 뷰 · R1 메모 · R0 작업 이력

Scope: 이미지 추가/대표지정/숨김/교체 action 을 안전하게 열기 위한 DB·미디어저장소·권한·감사·rollback·UI 설계. **구현 없음**(업로드/삭제/교체 실행 0, ProductMaster 본문 무변경).

---

## 1. 현재 스키마 (product_images)

`ProductImage.entity.ts` / migration `20260307210000-CreateProductImages` + `20260325000001-AddTypeToProductImages`.

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| id | uuid PK | |
| master_id | uuid NOT NULL FK→product_masters ON DELETE CASCADE | |
| image_url | text | public URL |
| gcs_path | text | GCS object 경로(삭제/복원 키) |
| sort_order | int default 0 | |
| is_primary | boolean default false | 대표 |
| type | varchar(16) default 'detail' | 'detail' / 'thumbnail' 등 |
| created_at / updated_at | timestamp | |

**부재(중요):** `deleted_at` / `deleted_by` / `created_by` / `updated_by` / `metadata` / `source` 없음.

**인덱스:** `idx_product_images_master_id (master_id)`, `idx_product_images_primary (master_id, is_primary) WHERE is_primary=true` — **filtered index(비-UNIQUE)**. 즉 DB 는 "master 당 대표 1개" 를 **강제하지 않는다**(현재는 app 로직 + 데이터 특성으로 유지: 2,790 master 각 1 이미지·1 primary).

현황(2026-07-07 이미지상태 뷰): 이미지 보유 2,790(전부 primary 1장, e약은요 사본)·없음 195,599·대표없음 0.

---

## 2. 기존 업로드 경로 / 미디어 저장소

| 요소 | 내용 |
| --- | --- |
| **GCS 버킷** | `o4o-media-library`(공개 read). 제품 이미지는 `products/{masterId}/{type}/{uuid}.ext` prefix 로 namespace 분리 |
| **업로드 서비스(백엔드)** | `ImageStorageService.uploadImage(masterId, buffer, ...) → {url, gcsPath}` · `deleteImage(gcsPath)` 존재 |
| **기존 write 패턴** | `easy-drug-image-copy.service`: GCS upload → INSERT product_images(type='thumbnail', is_primary=true, sort_order=0) → representative_products.thumbnail_image_id UPDATE. **배치 잡**(인터랙티브 admin 업로드 엔드포인트 없음) |
| **admin 프론트 재사용 후보** | `media-library.api.ts` · `MediaSelector`/`FileSelector`(에디터) · `MediaLibraryAdmin`. 단 이들은 **generic media-library 업로드**(products/ namespace·product_images row 아님) |

**결론:** 제품 이미지 add 는 **product 전용 업로드 엔드포인트**(ImageStorageService 재사용, products/ namespace + product_images INSERT)가 canonical. MediaPicker(media-library)는 "기존 미디어 선택" 대안으로만 옵션.

---

## 3. action 설계

### A. 이미지 추가 (image_added)
- multipart 파일 업로드 → `ImageStorageService.uploadImage` → INSERT product_images(type='detail' 기본, created_by=actor, sort_order=max+1).
- 기존 primary 없으면 **첫 이미지를 자동 primary** 허용(옵션, 정책 확정 필요). 있으면 is_primary=false.
- source(옵션 컬럼): 'admin_upload' 로 e약은요 사본과 구분.

### B. 대표 이미지 지정 (image_primary_changed)
- **트랜잭션**: 같은 master_id 활성 이미지 중 기존 primary → false, 대상 → true.
- **partial UNIQUE index 필수**(§4): `(master_id) WHERE is_primary=true AND deleted_at IS NULL`.
- display 정합: representative_products.thumbnail_image_id 를 쓰는 경로가 있으면 **동기화**(e약은요 copy 가 이 링크를 세팅함) — 설계 시 sync 여부 확정.

### C. 이미지 숨김/삭제 (image_hidden)
- **hard delete 금지.** soft delete(deleted_at/deleted_by) — deleted_at 컬럼 신설(migration).
- **GCS 원본 삭제 안 함**(gcs_path 보존 → restore 가능). deleteImage 는 R3+ 별도.
- 대표 이미지를 숨기면 대표 공백 → 정책: 다음 이미지 자동 승격 or 대표 공백 허용(확정 필요).

### D. 이미지 교체 (image_replaced)
- **덮어쓰기 금지.** 권장 흐름 = 새 이미지 add → 새 이미지 primary 지정 → 기존 이미지 soft delete. (rollback 유리: 원본 GCS·row 보존)

---

## 4. 필요한 migration (impl WO)

```sql
-- 1) soft delete + actor 귀속 (additive)
ALTER TABLE product_images
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID,
  ADD COLUMN created_by UUID,
  ADD COLUMN updated_by UUID,
  ADD COLUMN source VARCHAR(32);   -- 선택: 'admin_upload' | 'mfds_easy_drug' 등

-- 2) 대표 1개 강제(partial UNIQUE). 기존 데이터 안전(각 master 1 primary)
DROP INDEX IF EXISTS idx_product_images_primary;
CREATE UNIQUE INDEX uniq_product_images_primary
  ON product_images (master_id) WHERE is_primary = true AND deleted_at IS NULL;

-- 3) 조회 인덱스 soft-delete 인지
CREATE INDEX IF NOT EXISTS idx_product_images_master_active
  ON product_images (master_id, sort_order) WHERE deleted_at IS NULL;
```
- **불변 보장**: product_masters / 기존 product_images 데이터 변경 없음(컬럼 추가·인덱스 교체만). 백필 없음.

---

## 5. audit log 설계

기존 조사: 공통 `audit_logs`(entityType/entityId/action/userId/changes jsonb/createdAt) **존재하나 ProductMaster 이벤트 미기록**(R0 작업이력 뷰의 gap). 이미지 action 을 **audit_logs 의 첫 ProductMaster writer** 로 삼는다.

| action | changes(jsonb) |
| --- | --- |
| image_added | { imageId, isPrimary } |
| image_primary_changed | { imageId, previousPrimaryImageId, newPrimaryImageId } |
| image_hidden | { imageId } |
| image_restored (선택) | { imageId } |

- 기록: `entityType='product_master'`, `entityId=masterId`, `userId=actor`, `createdAt`.
- **R0 작업 이력 뷰 확장**: `product-master-audit-log.service` 에 audit_logs source 추가(현재 gap 'common_audit_log' 해소). image_added 는 product_images.created_at 로도 잡히나 **audit_logs 가 actor 포함 권위 소스**.

---

## 6. 권한

- **write = admin / super_admin + 서비스 admin**(콘솔 read 컨트롤러와 동일 ADMIN_ROLES). R2 이지만 데이터 파괴 없음(soft/additive)이라 콘솔 admin 범위 유지.
- **operator write 개방 = 보류**(판단만). 필요 시 별도 롤 게이트.
- 모든 action actor 기록(created_by / audit_logs.userId). ProductMaster 본문 변경 0.

---

## 7. rollback 기준

| action | rollback |
| --- | --- |
| image_added | 해당 이미지 soft delete(GCS 보존) |
| image_primary_changed | audit_logs.changes.previousPrimaryImageId 로 대표 원복(트랜잭션) |
| image_hidden | deleted_at=NULL 복원(gcs_path 보존이라 즉시 가능) |
| image_replaced | 새 이미지 soft delete + 기존 이미지 복원 + 대표 원복 |

- **GCS 원본 파괴 없음** → 전 action 가역. hard delete(GCS deleteImage)는 R3+ 별도 승인.

---

## 8. UI 설계 (구현은 후속 WO)

기본상품 상세 이미지 섹션(현재 read-only + 이미지상태 링크)에 상태별 action:

| 상태 | action |
| --- | --- |
| 이미지 없음 | `[이미지 추가]` |
| 이미지 1+ | 각 이미지 `[대표로 지정]`(비대표) · `[숨김]` / 섹션 `[이미지 추가]` · `[이미지 교체]` |
| 업로드 중/실패 | 진행 표시 / 실패 재시도 |
| 권한 없음 | action 버튼 숨김(read-only 안내 유지) |

- 현재 "이미지 업로드/교체/보강은 후속 WO" 안내 → 권한 있을 때 action 노출로 전환.
- MediaPicker(media-library) 재사용은 "기존 미디어 선택" 보조 경로.

---

## 9. 위험도 / 확정 사항

| 항목 | 확정 |
| --- | --- |
| image add/primary/hide/replace | **R2**(가역·비파괴) |
| GCS hard delete | **R3+**(이번·다음 impl 범위 밖) |
| migration 필요 | **예**(deleted_at/actor 컬럼 + partial UNIQUE) |
| MediaPicker/o4o-media-library 재사용 | ImageStorageService(product 전용) canonical + MediaPicker 보조 |
| audit 방식 | 공통 audit_logs(ProductMaster 첫 writer) + R0 뷰 확장 |
| hard delete 금지 | 문서화 완료(soft only, GCS 보존) |

**미결정(impl WO 착수 전 확정):** ① 첫 이미지 자동 primary 여부 ② 대표 숨김 시 자동 승격/공백 ③ representative_products.thumbnail_image_id 동기화 여부 ④ source 컬럼 채택 여부 ⑤ operator write 개방.

---

## 10. write 0 확인

| 항목 | 결과 |
| --- | --- |
| DB write / migration | **0**(설계만) |
| 이미지 업로드/삭제/교체 실행 | 0 |
| ProductMaster / product_images 변경 | 0 |
| 코드 변경 | 0(문서만) |
| git diff --check | 통과 |
| 산출물 | 본 CHECK 1건 |

---

## 11. 후속 WO

**`WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1`** — 최소 단위 구현. 권장 Phase 분리:
- **Phase 1**: migration(컬럼+partial UNIQUE) + `POST /masters/:id/images`(업로드) + `PATCH /masters/:id/images/:imageId/primary` + audit_logs write + **R0 작업이력 뷰에 audit_logs source 추가**.
- **Phase 2**: `DELETE(soft) /masters/:id/images/:imageId`(숨김) + 복원 + 교체 흐름.
- Phase 3(별도 승인): GCS hard delete / 대량 이미지 보강.

> 실제 이미지 수집/대량 보강은 admin action 이 아니라 별도 데이터 트랙.
