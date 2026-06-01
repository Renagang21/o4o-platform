# FIRSTMALL-IMPORT-TEST-RESULT-V1

> Firstmall Import Pipeline 검증 결과
> Date: 2026-03-06
> WO: WO-O4O-FIRSTMALL-IMPORT-VALIDATION-V1
> Status: **ALL PHASES PASSED** (1건 버그 수정 포함)

---

## Executive Summary

Firstmall 상품 Import Pipeline의 6개 Phase를 프로덕션 환경에서 검증 완료.
**전체 파이프라인이 정상 동작**하며, 발견된 버그 1건은 즉시 수정/배포됨.

### 검증 결과 요약

| Phase | 항목 | 결과 | 비고 |
|-------|------|------|------|
| 1 | Firstmall Excel 구조 조사 | **PASS** | 감사 보고서(IR-V1)로 완료 |
| 2 | NetureSupplier 생성 | **PASS** | slug: `firstmall`, ACTIVE |
| 3 | ProductMaster 생성 (3건) | **PASS** | manualData 경로 정상 |
| 4 | CSV Import 테스트 | **PASS** | 3건 LINK_EXISTING → Offer 생성 |
| 5 | Approval Flow 검증 | **PASS** | APPROVE/REJECT 정상 |
| 6 | 이미지 Import 가능성 조사 | **완료** | ProductMaster에 이미지 필드 없음 |

---

## Phase 1: Firstmall Excel 구조 조사

> 상세: `docs/audit/IR-O4O-FIRSTMALL-PRODUCT-IMPORT-AUDIT-V1.md`

### 핵심 결론
- Firstmall Excel Export 지원 (관리자 페이지)
- 주요 필드: 상품명, 바코드(Code39/Code128), 브랜드, 제조사, 판매가
- GTIN 비호환 바코드는 `manualData` 경로로 우회 가능

---

## Phase 2: NetureSupplier 생성

### 실행 결과

```json
{
  "id": "5d888132-c4f0-47be-a962-a630a7476e58",
  "name": "Firstmall Test Store",
  "slug": "firstmall",
  "status": "ACTIVE",
  "contactEmail": "admin-neture@o4o.com",
  "userId": "0ff81df7-9a72-4de5-9433-4981230773e1"
}
```

### 실행 경로
1. `POST /api/v1/neture/supplier/register` → PENDING 상태로 생성
2. `POST /api/v1/neture/admin/suppliers/:id/approve` → ACTIVE 승인

### 검증 포인트
- [x] Supplier 등록 API 정상 동작
- [x] slug 유니크 검증 동작
- [x] Admin 승인 후 ACTIVE 전환

---

## Phase 3: 테스트 ProductMaster 생성

### 생성된 ProductMaster (3건)

| # | Barcode (GTIN-13) | Marketing Name | Manufacturer | ID |
|---|-------------------|----------------|-------------|-----|
| 1 | 8801234567893 | 프리미엄 비타민C 1000mg | 테스트제약 | 5216e46c-... |
| 2 | 8809876543213 | 순수 오메가3 피쉬오일 | 건강식품제조 | 197ba352-... |
| 3 | 8801111222334 | 장건강 프로바이오틱스 100억 | 바이오텍코리아 | ebf73f18-... |

### 실행 경로
- `POST /api/v1/neture/admin/masters/resolve` with `manualData`
- GTIN 체크디짓 검증 통과
- `isMfdsVerified: false` (MFDS 스텁 → manualData 경로)

### 검증 포인트
- [x] GTIN-13 바코드 검증 정상
- [x] manualData 우회 경로 정상 (MFDS 스텁 환경)
- [x] ProductMaster 중복 방지 (barcode UNIQUE)
- [x] 모든 필수 필드 저장 확인 (regulatoryName, manufacturerName)

---

## Phase 4: CSV Import 테스트

### 테스트 CSV 내용

```csv
barcode,supplier_sku,supply_price,distribution_type
8801234567893,FM-VIT-C001,25000,PRIVATE
8809876543213,FM-OMG-3001,35000,PRIVATE
8801111222334,FM-PRO-B001,28000,PRIVATE
```

### Phase 4-1: Upload + Validate

```json
{
  "batchId": "ce3c7e8e-a2a4-47f1-bb32-75704061c8e5",
  "status": "READY",
  "totalRows": 3,
  "validRows": 3,
  "rejectedRows": 0,
  "rows": [
    { "barcode": "8801234567893", "validationStatus": "VALID", "actionType": "LINK_EXISTING" },
    { "barcode": "8809876543213", "validationStatus": "VALID", "actionType": "LINK_EXISTING" },
    { "barcode": "8801111222334", "validationStatus": "VALID", "actionType": "LINK_EXISTING" }
  ]
}
```

- 모든 행 `LINK_EXISTING` — Phase 3에서 생성한 Master와 매칭

### Phase 4-2: Apply Batch

```json
{
  "appliedOffers": 3,
  "createdMasters": 0
}
```

- 3건 SupplierProductOffer UPSERT 성공
- Master 추가 생성 없음 (이미 존재)

### 검증 포인트
- [x] CSV 파싱 정상 (헤더 인식, 데이터 추출)
- [x] GTIN 검증 통과
- [x] 기존 Master 매칭 (LINK_EXISTING)
- [x] 2-Phase Pipeline 정상 (upload → apply)
- [x] SupplierProductOffer 생성 (approval_status=PENDING, is_active=false)

### 발견된 버그 (수정 완료)

**BUG: `getSupplierByUserId()` relation name mismatch**

| 위치 | 버그 | 수정 |
|------|------|------|
| `neture.service.ts:129` | `relations: ['products']` | `relations: ['offers']` |
| `neture.service.ts:806` | `relations: ['products']` | `relations: ['offers']` |

- NetureSupplier 엔티티의 `@OneToMany` 관계명은 `offers`이나, 서비스에서 `products`로 조회
- TypeORM 에러 → catch 블록에서 null 반환 → `requireActiveSupplier` 미들웨어 `NO_SUPPLIER`
- **수정 커밋**: `354130203` (`fix(neture): supplier relation name 'products' → 'offers'`)
- **배포 완료 후 CSV Import 정상 동작 확인**

---

## Phase 5: Approval Flow 검증

### 테스트 결과

| Offer | Product | Action | Result |
|-------|---------|--------|--------|
| 4b218490-... | 비타민C 1000mg | **APPROVE** | `isActive: true`, `approvalStatus: APPROVED` |
| 2dfaa373-... | 오메가3 피쉬오일 | **REJECT** | `isActive: false`, `approvalStatus: REJECTED` |
| ed41e8b4-... | 프로바이오틱스 100억 | (미처리) | `approvalStatus: PENDING` |

### 검증 포인트
- [x] Admin Approve 정상 (PENDING → APPROVED, isActive → true)
- [x] Admin Reject 정상 (PENDING → REJECTED, isActive 유지 false)
- [x] PRIVATE distribution → autoListedCount = 0 (PUBLIC만 자동 확장)
- [x] 미처리 offer는 PENDING 유지

### Approval Flow 구조 (코드 검증)

```
CSV Import
  ↓
SupplierProductOffer (PENDING, isActive=false)
  ↓ Admin Approve
SupplierProductOffer (APPROVED, isActive=true)
  ↓ (PUBLIC만) autoExpandPublicProduct → 전 조직 자동 Listing
  ↓ (PRIVATE) 별도 ProductApproval 요청 필요
  ↓ (SERVICE) 별도 ServiceApproval 요청 필요
```

---

## Phase 6: 이미지 Import 가능성 조사

### 핵심 결론

**ProductMaster와 SupplierProductOffer에 이미지 필드가 없다.**

| Entity | Image Field | Storage |
|--------|------------|---------|
| ProductMaster | **없음** | - |
| SupplierProductOffer | **없음** | - |
| NetureProduct (domain) | **있음** | JSONB `{ url, alt, is_primary, order }[]` |
| GlycopharmProduct | **있음** | JSONB 동일 구조 |
| CosmeticsProduct | **있음** | JSONB 동일 구조 |
| StoreLocalProduct | **있음** | JSONB `string[]` + thumbnailUrl |

### 인프라 현황

| 구성요소 | 상태 |
|---------|------|
| Upload Middleware (Multer) | **구현됨** — 10MB, jpeg/png/gif/webp/svg |
| Image Processing (Sharp) | **구현됨** — 리사이즈, 포맷 변환 |
| URL → Buffer Download (axios) | **구현됨** — `fetchImage()` in pop-generator |
| Cloud Storage (GCS/S3) | **미구현** |
| Local File Storage | **구현됨** — `/public/uploads/` |

### 이미지 Import 전략 권고

1. **Phase 1 (즉시 가능)**: Firstmall 이미지 URL을 도메인 상품 엔티티의 JSONB에 직접 저장
2. **Phase 2 (마이그레이션 필요)**: ProductMaster에 `image_url` 컬럼 추가
3. **Phase 3 (인프라 필요)**: GCS 통합 후 이미지 복사/영구 저장

---

## 발견된 이슈 및 수정 사항

### BUG-1: Supplier Relation Name Mismatch (수정 완료)

| 항목 | 내용 |
|------|------|
| 심각도 | **HIGH** — 모든 supplier-level API 차단 |
| 원인 | `getSupplierByUserId/BySlug`에서 `relations: ['products']` 사용 |
| 실제 관계명 | `offers` (NetureSupplier.entity.ts) |
| 영향 | `requireActiveSupplier` 미들웨어 항상 `NO_SUPPLIER` 반환 |
| 수정 | `'products'` → `'offers'` (2곳) |
| 커밋 | `354130203` |
| 배포 | Cloud Run 자동 배포 완료 |

### NOTE-1: Supplier Products 엔드포인트 에러

- `GET /supplier/products` → `INTERNAL_ERROR: Failed to fetch supplier products`
- 관련 서비스 코드에 추가 `relations: ['products']` 패턴이 있을 수 있음
- 이번 WO 범위 외 — 별도 조사 필요

---

## 테스트 데이터 현황 (프로덕션)

### 생성된 엔티티

| Entity | Count | IDs |
|--------|-------|-----|
| NetureSupplier | 1 | `5d888132-...` (Firstmall Test Store) |
| ProductMaster | 3 | `5216e46c`, `197ba352`, `ebf73f18` |
| SupplierProductOffer | 3 | `4b218490` (APPROVED), `2dfaa373` (REJECTED), `ed41e8b4` (PENDING) |

### 사용된 계정

| Account | Role | Purpose |
|---------|------|---------|
| admin-neture@o4o.com | neture:admin | Admin 작업 + Supplier 등록 |

---

## 결론

### Firstmall Import Pipeline: **검증 완료**

전체 파이프라인이 프로덕션 환경에서 정상 동작 확인됨:

```
Firstmall Excel Export
  → CSV 변환
  → ProductMaster 수동 생성 (manualData)
  → CSV Upload + Validate (2-Phase)
  → Batch Apply (Offer UPSERT)
  → Admin Approve/Reject
  → (후속) Organization Listing/Channel 배포
```

### 즉시 실행 가능한 다음 단계

1. 대표님 Firstmall에서 실제 상품 Excel Export
2. 바코드 포맷 확인 (GTIN 호환 여부)
3. Excel → CSV 변환 (필드 매핑)
4. 실상품 Import 실행
5. `GET /supplier/products` 엔드포인트 에러 추가 조사 (NOTE-1)

---

*Test completed: 2026-03-06*
*Tester: Claude Code (AI)*
*Bug fix deployed: commit 354130203*
