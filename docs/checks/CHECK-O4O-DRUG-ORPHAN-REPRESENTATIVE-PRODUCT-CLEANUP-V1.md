# CHECK-O4O-DRUG-ORPHAN-REPRESENTATIVE-PRODUCT-CLEANUP-V1

Status: INVESTIGATION DONE — 정리 판단 완료, apply(write)는 승인 대기
Date: 2026-07-06
Scope: `drug_unspecified` master 삭제로 생긴 member 0 RepresentativeProduct 16,571건의 정리 여부/방식 판단. read-only 조사만 수행, DB write 없음.

Related:

- `docs/checks/CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1.md` (§3.1 orphan 발견)
- `docs/work-orders/WO-O4O-DRUG-O4O-DB-APPLY-HANDOFF-V1.md` (완료 종결)
- `docs/investigations/PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md` (결정 4 anchorType)

---

## 0. 배경

CHECK-A 실측에서 `representative_products` 64,672건 중 **member(ProductMaster) 0개인 orphan 16,571건**을 발견했다. 원인 가설은 `drug_unspecified` master 53,428건 삭제(commit 3914b5400)로 그 대표상품이 member를 잃은 것이다.

HFF도 앞으로 `RepresentativeProduct`를 master-less anchor로 쓸 가능성이 있어(PROPOSAL 결정 4), member 없는 drug 잔재가 섞여 있으면 이후 anchor 공간이 오염된다. 따라서 정리 판단이 필요하다.

**단, 바로 삭제하지 않고 먼저 조사한다.**

---

## 1. 조사 결과 (2026-07-06 · read-only)

프로덕션 read-only SELECT로 확인.

### 1.1 orphan 구성

| 항목 | 값 |
| --- | --- |
| 전체 `representative_products` | 64,672 |
| orphan (member 0) | **16,571** |
| orphan 중 `metadata.groupKey LIKE 'MFDS_CODE:%'` | **16,571 (100%)** |
| orphan 중 `metadata.source = 'WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1'` | **16,571 (100%)** |

→ **orphan 전건이 의약품 그룹핑 잔재.** 다른 성격(HFF/수동/운영자)의 orphan은 0. 정리 대상 경계가 깨끗하다.

### 1.2 자산/참조 흔적

| 항목 | 값 | 판단 |
| --- | --- | --- |
| thumbnail_image_id 보유 | **0** | 연결 이미지 없음 |
| manufacturer_name 보유 | 16,369 | 그룹핑 시 파생값(고아와 무관) |
| metadata NULL | 0 | 전건 metadata 보유(groupKey/source/memberMasterCount) |
| `reviewFlags.multiManufacturer=true` | 202 | 소수 |
| `metadata.memberMasterCount` | 2~3 (stale) | 삭제 전 카운트. 실제 member=0 |

### 1.3 외부 참조면 (FK blast radius)

`representative_product_id`를 참조하는 컬럼은 **`product_masters.representative_product_id` 단 하나**(information_schema 확인). orphan은 정의상 이 참조가 0이다.

→ **SharedProductDescription·이미지·기타 테이블에서 orphan을 참조하는 경로가 구조적으로 없다.** (SharedProductDescription은 `master_id` 앵커라 rep을 직접 참조하지 않음. orphan은 master가 없으므로 간접 연결도 0.)

---

## 2. 판단

### 2.1 정리 대상 확정

정리 대상 = **member 0 + `metadata.source='WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1'` + `groupKey LIKE 'MFDS_CODE:%'`**. 이 조건이 곧 orphan 전건(16,571)과 일치하므로 안전하게 좁혀진다. (HFF anchor가 생기기 전이라 오염 위험도 없음.)

### 2.2 hard delete vs soft 처리

구조 사실: **`RepresentativeProduct` 엔티티에는 `deleted_at`(soft delete)도 `status` 컬럼도 없다.** 따라서:

| 방식 | 가능 여부 | 평가 |
| --- | --- | --- |
| `deleted_at` soft delete | ❌ 컬럼 없음 → migration 필요 | 이 잔재 하나 때문에 스키마 확장은 과함 |
| metadata flag (`archivedReason`) | ✅ jsonb라 가능 | **그러나 rep 목록/집계 쿼리에서 여전히 조회됨** → 오염 해소 안 됨 |
| **hard delete** | ✅ 가능 | 외부 참조 0 + member 0 → 물리 삭제가 오염을 실제로 제거 |

**권고: hard delete.** 이유:
1. orphan은 외부 참조가 구조적으로 0이라 삭제 부작용면이 없다(FK는 product_masters뿐, 그마저 `ON DELETE SET NULL` + member 0).
2. metadata flag만으로는 "member 0 rep이 anchor 공간에 남는" 오염이 해소되지 않는다(여전히 목록·집계에 잡힘).
3. 단, **가역성 확보를 위해 삭제 전 16,571행을 백업(GCS/테이블 export)** 하고, 삭제는 위 3조건 AND로만 수행한다.

### 2.3 잔여 293 `drug_unspecified` master

CHECK-A에서 확인된 잔여 `drug_unspecified` master 293건은 본 CHECK 범위 밖(별도 후처리). 이 293건이 살아있는 동안은 그 대표상품이 orphan이 아니므로 위 16,571에 포함되지 않는다.

---

## 3. 후속 apply (승인 대기 — 별도 실행)

정리 apply는 DB write이므로 **사용자 승인 + 백업 후** 별도 실행한다.

```text
-- 백업 (승인 후)
CREATE TABLE _bak_orphan_representative_products_20260706 AS
SELECT rp.* FROM representative_products rp
WHERE NOT EXISTS (SELECT 1 FROM product_masters pm WHERE pm.representative_product_id = rp.id)
  AND rp.metadata->>'source' = 'WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1'
  AND rp.metadata->>'groupKey' LIKE 'MFDS_CODE:%';

-- 삭제 (승인 후, 위 백업 count = 16,571 확인 뒤)
DELETE FROM representative_products rp
WHERE NOT EXISTS (SELECT 1 FROM product_masters pm WHERE pm.representative_product_id = rp.id)
  AND rp.metadata->>'source' = 'WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1'
  AND rp.metadata->>'groupKey' LIKE 'MFDS_CODE:%';
```

검증: 삭제 후 `representative_products` 총수 = 64,672 − 16,571 = **48,101**(전건 drug member 보유) 예상.

**추가 권고:** 그룹핑 서비스(`WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1`)가 이후 재실행될 경우, master 삭제 시 member 0 rep을 남기지 않도록 **삭제/재그룹핑 cascade 정책**을 그룹핑 WO에 추가할지 별도 판단(재발 방지).

---

## 4. read-only 준수 증거

| 항목 | 결과 |
| --- | --- |
| 코드 변경 | 0 |
| DB write / migration | **0** (전부 SELECT) |
| 삭제 실행 | **0** (승인 대기 §3) |
