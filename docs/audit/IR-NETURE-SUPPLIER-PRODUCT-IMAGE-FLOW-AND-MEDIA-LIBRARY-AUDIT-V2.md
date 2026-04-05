# IR-NETURE-SUPPLIER-PRODUCT-IMAGE-FLOW-AND-MEDIA-LIBRARY-AUDIT-V2

**작성일:** 2026-04-05
**상태:** 조사 완료
**조사 대상:** Neture 개별 상품 등록 이미지 흐름 + 공용 미디어 라이브러리 연동

---

## 확정 전제 (정책)

- 개별 상품 등록 화면은 **미디어 라이브러리 선택을 지원해야 한다**
- 사용자는 기존에 업로드한 이미지를 **재사용할 수 있어야 한다**
- 라이브러리 선택이 없거나 불완전하면 **구현 누락/버그/정합성 문제**로 판단

---

## 1. 전체 판정

**구현 누락 다수 확인.** 미디어 라이브러리 선택은 일부 화면/이미지 타입에만 연결되어 있고, 나머지는 파일 업로드만 가능. 이미지 분류 체계가 product_images와 media_assets 사이에 독립적으로 운영되어 라이브러리에서 이미지가 "기타"로만 보이는 정합성 문제 존재. 에디터 팝업 중첩 문제도 확인됨.

---

## 2. 재현된 문제 목록

| # | 문제 | 재현 위치 | 판정 |
|---|------|----------|------|
| 1 | 상세/성분 이미지에서 라이브러리 선택 불가 | Create 페이지 Step 3 | 구현 누락 |
| 2 | 미디어 라이브러리에 모든 이미지가 "기타 이미지"로 표시 | MediaPickerModal 라이브러리 탭 | 정합성 문제 |
| 3 | 에디터 이미지 팝업 중첩 | Drawer 편집 모드 (B2C 간이+상세) | 상태 관리 문제 |
| 4 | Create 페이지 에디터에 이미지 삽입 기능 없음 | Create 페이지 Step 3 RichTextEditor | 구현 누락 |
| 5 | SupplierProductsPage 이미지 모달에 라이브러리 미연동 | 상품 목록 페이지 ImageUploadModal | 구현 누락 |

---

## 3. 화면별/에디터별 이미지 등록 구조

### 3-1. SupplierProductCreatePage (`/supplier/products/new`) — Step 3

| 이미지 구역 | 컴포넌트 | 파일 업로드 | 라이브러리 선택 | 판정 |
|------------|---------|:---------:|:------------:|------|
| **대표 이미지 (썸네일)** | `<input type="file">` + `MediaPickerModal` | O | O | 정상 |
| **상세 이미지 (detail)** | `<input type="file" multiple>` | O | **X** | **누락** |
| **성분/라벨 이미지 (content)** | `<input type="file" multiple>` | O | **X** | **누락** |
| **간이 설명 에디터** | `RichTextEditor` (onImageUpload 없음) | **X** | **X** | **누락** |
| **상세 설명 에디터** | `RichTextEditor` (onImageUpload 없음) | **X** | **X** | **누락** |

**코드 근거:**
- 썸네일: line 602-609 — `setShowThumbnailPicker(true)` → `MediaPickerModal` (line 775-780)
- 상세: line 629-635 — `<input type="file" multiple>` only, 라이브러리 버튼 없음
- 성분: line 654-660 — `<input type="file" multiple>` only, 라이브러리 버튼 없음
- 간이 에디터: line 673-678 — `onImageUpload` 미전달, `onMediaLibraryPick` 미전달
- 상세 에디터: line 683-698 — `onImageUpload` 미전달, `onMediaLibraryPick` 미전달

### 3-2. ProductDetailDrawer (수정 모드)

| 이미지 구역 | 컴포넌트 | 파일 업로드 | 라이브러리 선택 | 판정 |
|------------|---------|:---------:|:------------:|------|
| **이미지 섹션 (all types)** | `<input type="file">` + `MediaPickerModal` | O | O | 정상 |
| **B2C 간이 에디터** | `RichTextEditor` (onImageUpload + onMediaLibraryPick) | O | O | 정상 |
| **B2C 상세 에디터** | `RichTextEditor` (onImageUpload + onMediaLibraryPick) | O | O | 정상 |
| **B2B 간이 에디터** | `RichTextEditor` (onImageUpload + onMediaLibraryPick) | O | O | 정상 |
| **B2B 상세 에디터** | `RichTextEditor` (onImageUpload + onMediaLibraryPick) | O | O | 정상 |

**코드 근거:**
- 이미지 섹션: line 1016-1061 — uploadType select + file input + "라이브러리" 버튼 → `setShowImagePicker(true)` (line 1042)
- 에디터: line 843-876 — `onImageUpload={editorImageUpload}`, `onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}`
- 두 개의 MediaPickerModal 인스턴스: line 1619-1634

### 3-3. SupplierProductsPage (ImageUploadModal)

| 이미지 구역 | 컴포넌트 | 파일 업로드 | 라이브러리 선택 | 판정 |
|------------|---------|:---------:|:------------:|------|
| **이미지 업로드 모달** | `ImageUploadModal` (자체 구현) | O | **X** | **누락** |

**코드 근거:**
- line 74-165 — 독립 모달, `<input type="file">` + type selector (thumbnail/detail/content)
- `MediaPickerModal` import/사용 없음
- `productApi.uploadProductImage()` 만 호출 (file upload only)

---

## 4. 미디어 라이브러리 연동 누락 지점

### 누락 지점 요약

| # | 위치 | 이미지 타입 | 현재 | 필요 |
|---|------|-----------|------|------|
| N1 | Create 페이지 — 상세 이미지 | detail | 파일 업로드만 | + 라이브러리 선택 |
| N2 | Create 페이지 — 성분/라벨 이미지 | content | 파일 업로드만 | + 라이브러리 선택 |
| N3 | Create 페이지 — 간이 설명 에디터 | inline | 이미지 기능 없음 | + onImageUpload + onMediaLibraryPick |
| N4 | Create 페이지 — 상세 설명 에디터 | inline | 이미지 기능 없음 | + onImageUpload + onMediaLibraryPick |
| N5 | 상품 목록 — ImageUploadModal | all | 파일 업로드만 | + 라이브러리 선택 또는 MediaPickerModal 교체 |

### 근본 원인

1. **단계별 구현**: 라이브러리 통합이 WO별로 점진적으로 추가됨
   - `WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1` — 대표 이미지만 라이브러리 연동
   - `WO-NETURE-DESCRIPTION-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1` — Drawer 에디터에 라이브러리 연동
   - Create 페이지의 상세/성분 이미지와 에디터는 후속 WO 대상에서 누락

2. **Create vs Drawer 비대칭**: Drawer는 기존 상품 수정이므로 모든 기능이 완비되었으나, Create 페이지는 최초 등록 흐름이라 후순위로 밀림

3. **ImageUploadModal 독립 구현**: SupplierProductsPage의 이미지 모달은 `MediaPickerModal`을 사용하지 않는 별도 구현체

---

## 5. 이미지 분류 저장/조회 정합성 결과

### 두 개의 독립 분류 체계

| 구분 | 테이블 | 분류 필드 | 값 | 용도 |
|------|--------|---------|-----|------|
| **상품 이미지** | `product_images` | `type` | `thumbnail`, `detail`, `content` | 상품에 직접 연결된 이미지 |
| **미디어 라이브러리** | `media_assets` | `folder` | `product-thumbnail`, `description`, `banner`, `brand`, `general` | 공용 미디어 자산 카탈로그 |

### 분류 매핑 관계 — **없음**

- `product_images.type`과 `media_assets.folder`는 **완전히 독립적**
- 상품 이미지 업로드(`POST /neture/products/:masterId/images`)는 `product_images`에 저장 → `media_assets`와 무관
- 미디어 라이브러리 업로드(`POST /platform/media-library/upload`)는 `media_assets`에 저장 → `product_images`와 무관
- 라이브러리에서 선택 후 상품 이미지 등록(`POST /neture/products/:masterId/images/from-url`)은 URL만 복사 → cross-reference 없음

### "기타 이미지" 문제의 원인

1. **업로드 시 folder 기본값**: `MediaPickerModal`에서 업로드 시 folder 선택 UI는 있지만, 기본값이 `general` (기타)
2. **defaultFolder 미전달**: Create 페이지의 `MediaPickerModal` (line 775-780)에 `defaultFolder` prop 미전달
3. **Drawer의 MediaPickerModal** (line 1619-1634)에도 `defaultFolder` prop 미전달
4. **결과**: 사용자가 수동으로 폴더를 변경하지 않으면 모든 업로드가 `general` → "기타 이미지"로 분류

### 상품 이미지 → 라이브러리 연동 부재

상품 이미지(`product_images`)로 직접 업로드한 이미지는 미디어 라이브러리(`media_assets`)에 나타나지 않음. 역방향도 마찬가지 — 라이브러리에서 선택하면 URL만 product_images에 복사되지, 두 테이블 간 참조 관계는 없음.

---

## 6. 팝업 중첩 원인

### 재현 시나리오

**ProductDetailDrawer** 편집 모드에서:
1. B2C 간이 설명 에디터 → 도구모음 "이미지" 클릭 → 에디터 자체 이미지 드롭다운 열림 (Toolbar `showImageInput=true`)
2. B2C 상세 설명 에디터 → 도구모음 "이미지" 클릭 → 다른 에디터 인스턴스의 드롭다운 열림
3. **첫 번째 드롭다운이 닫히지 않음** → 두 개의 드롭다운이 화면에 동시 표시

### 원인

- 각 `RichTextEditor` 인스턴스는 자체 `Toolbar` 컴포넌트를 보유
- 각 `Toolbar`는 독립적인 `showImageInput` 상태를 관리
- **에디터 간 상태 공유/조율 메커니즘이 없음**
- 하나를 열어도 다른 에디터의 드롭다운은 닫히지 않음

### 영향 범위

| 화면 | 에디터 수 | 중첩 가능성 |
|------|----------|-----------|
| Create 페이지 (Step 3) | 2개 (간이 + 상세) | 이미지 기능 미연결이므로 현재 미발생 |
| Drawer B2C 모드 | 2개 (간이 + 상세) | **발생** |
| Drawer B2B 모드 | 2개 (간이 + 상세) | **발생** |
| Drawer B2C + 보조 B2B | 최대 4개 | **발생** |

### MediaPickerModal은 안전

`mediaPickerTarget`은 단일 state 변수 → 새로운 값으로 교체되므로 MediaPickerModal 자체는 중첩 없음. 중첩 문제는 에디터 자체의 Toolbar 드롭다운에서 발생.

---

## 7. 등록 완료 후 이미지 연결 흐름

### SupplierProductCreatePage 등록 흐름

```
supplierApi.createProduct({...})
  ↓ success → masterId 획득
  ↓
thumbnailSource.kind === 'file'
  → productApi.uploadProductImage(masterId, file, 'thumbnail')
thumbnailSource.kind === 'library'
  → productApi.registerImageFromUrl(masterId, url, 'thumbnail')
  ↓
for each detailFile:
  → productApi.uploadProductImage(masterId, file, 'detail')     ← 순차 실행
  ↓
for each contentFile:
  → productApi.uploadProductImage(masterId, file, 'content')    ← 순차 실행
  ↓
navigate('/supplier/products')
```

### 확인된 문제

1. **에러 미처리**: 개별 이미지 업로드 실패 시 사용자에게 피드백 없음. 상품은 이미 생성되었으나 이미지가 누락될 수 있음.
2. **순차 업로드**: 여러 이미지를 순차적으로 업로드하므로 이미지가 많으면 완료까지 시간 소요. 진행 표시 없음.
3. **Create vs Drawer 차이**: Create 에서는 라이브러리 선택이 thumbnailSource에만 적용. Drawer 에서는 모든 타입에 적용.

### ProductDetailDrawer 이미지 업로드 흐름

```
파일 업로드:
  productApi.uploadProductImage(masterId, file, uploadType)
  → 성공 시: productApi.getProductImages(masterId) → setImages(updated)

라이브러리 선택:
  productApi.registerImageFromUrl(masterId, asset.url, uploadType)
  → 성공 시: productApi.getProductImages(masterId) → setImages(updated)
```

Drawer는 즉시 반영(re-fetch) 패턴으로 정상.

---

## 8. 수정 필요 항목 (P0/P1/P2)

### P0 — 정책 위반 (라이브러리 선택 누락)

| # | 대상 | 현재 상태 | 수정 내용 |
|---|------|----------|----------|
| P0-1 | Create 페이지 — 상세 이미지 | 파일 업로드만 | MediaPickerModal 연동 (라이브러리 선택 + from-url 등록) |
| P0-2 | Create 페이지 — 성분/라벨 이미지 | 파일 업로드만 | MediaPickerModal 연동 (라이브러리 선택 + from-url 등록) |

### P1 — 기능 누락 / UX 정합성

| # | 대상 | 현재 상태 | 수정 내용 |
|---|------|----------|----------|
| P1-1 | Create 페이지 — 간이/상세 에디터 | 이미지 기능 없음 | `onImageUpload` + `onMediaLibraryPick` + `existingImages` 연결 |
| P1-2 | SupplierProductsPage — ImageUploadModal | 파일 업로드만 | MediaPickerModal 교체 또는 라이브러리 탭 추가 |
| P1-3 | MediaPickerModal — defaultFolder 미전달 | 모든 호출에서 folder 기본값 `general` | 용도별 defaultFolder 전달 (예: `product-thumbnail`, `description`) |
| P1-4 | 에디터 팝업 중첩 | 독립 Toolbar state | 부모에서 activeEditorId 관리, 하나 열리면 나머지 닫기 |

### P2 — 개선 권장

| # | 대상 | 현재 상태 | 수정 내용 |
|---|------|----------|----------|
| P2-1 | Create 페이지 이미지 업로드 에러 처리 | 실패 시 무시 | 실패 이미지 사용자 피드백 + 재시도 안내 |
| P2-2 | product_images.type ↔ media_assets.folder 매핑 | 독립 체계 | 향후 연동 필요 시 매핑 테이블 또는 공통 분류 체계 검토 (현재는 P2) |

---

## 핵심 파일 목록

| 파일 | 역할 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | 상품 등록 3-Step (P0, P1 수정 대상) |
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | 상품 수정 Drawer (참조 구현, P1-4) |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 상품 목록 + ImageUploadModal (P1-2) |
| `services/web-neture/src/components/common/MediaPickerModal.tsx` | 공용 미디어 선택기 (P1-3) |
| `services/web-neture/src/lib/api/product.ts` | 상품 이미지 API (registerImageFromUrl) |
| `services/web-neture/src/lib/api/media.ts` | 미디어 라이브러리 API |
| `packages/content-editor/src/components/Toolbar.tsx` | RichTextEditor 이미지 Toolbar (P1-4) |
| `apps/api-server/src/modules/neture/controllers/admin.controller.ts` | 상품 이미지 업로드 엔드포인트 |
| `apps/api-server/src/modules/media/entities/MediaAsset.entity.ts` | 미디어 자산 엔티티 (folder 필드) |
| `apps/api-server/src/modules/neture/entities/ProductImage.entity.ts` | 상품 이미지 엔티티 (type 필드) |

---

## 예상 후속 WO 구조

| WO | 범위 | 수정 대상 |
|----|------|----------|
| **WO-1: Create 페이지 이미지 라이브러리 정렬** | P0-1, P0-2, P1-1 | `SupplierProductCreatePage.tsx` |
| **WO-2: 이미지 분류/folder 매핑 수정** | P1-3, P2-2 | `MediaPickerModal.tsx`, 호출부 defaultFolder 전달 |
| **WO-3: 에디터 이미지 팝업 단일화** | P1-4 | `ProductDetailDrawer.tsx`, `SupplierProductCreatePage.tsx` (부모 상태 관리) |
| *(선택)* WO-4: ImageUploadModal 교체 | P1-2 | `SupplierProductsPage.tsx` |

---

*조사 종료. Core 변경, 구조 재설계, API 계약 수정이 필요한 항목 없음.*
