# IR-O4O-RESOURCE-LIBRARY-CURRENT-STATE-AUDIT-V1

> **Read-Only Audit Report** | 2026-03-11
> O4O 플랫폼 자료실(Resource Library) 현재 상태 조사

---

## 1. Executive Summary

| 질문 | 답변 |
|------|------|
| 자료실 기능이 존재하는가? | **YES** — 4개 독립 시스템 존재 |
| 어느 서비스에서 사용되는가? | KPA Society, Neture, 전 서비스(Store) |
| 카테고리 구조가 있는가? | **YES** — 각 시스템별 단순 `category` varchar 필드 |
| 파일 저장 방식은? | **외부 URL 기반** (직접 업로드 없음, URL 등록 방식) |
| CMS와 어떤 관계인가? | **별개** — CMS는 콘텐츠 발행, 자료실은 파일/문서 관리 |
| Operator가 관리하는가? | Branch Admin(KPA), Supplier(Neture), Store Owner(매장) |

### 핵심 발견

```
4개 자료실 시스템이 서로 다른 도메인에 독립적으로 존재
KPA 메인 자료실 API는 PLACEHOLDER (빈 배열 반환)
통합된 "플랫폼 자료실"은 없음
```

---

## 2. 자료실 관련 코드 위치 — 전체 맵

| # | 시스템 | 테이블 | Boundary Key | 상태 |
|---|--------|--------|:------------:|:----:|
| **A** | Store Library | `store_library_items` | `organizationId` | **운영 중** |
| **B** | Neture Supplier Library | `neture_supplier_library_items` | `supplierId` | **운영 중** |
| **C** | KPA Branch Docs | `kpa_branch_docs` | `organization_id` | **운영 중** |
| **D** | KPA 메인 자료실 | *(테이블 없음)* | — | **Placeholder** |
| **E** | Content Assets | `cms_media` (읽기 전용 투영) | `organizationId` | **읽기 전용** |
| **F** | KYC Documents | `kyc_documents` | `userId` | **운영 중** (인증용) |

---

## 3. 시스템 A: Store Library (매장 자료실)

### 3-1. 데이터 모델

**Entity**: `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts`
**Table**: `store_library_items`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organization_id | UUID FK | 매장(조직) 격리 |
| title | varchar(300) | 자료 제목 |
| description | text | 설명 |
| file_url | varchar(1000) | 파일 URL |
| file_name | varchar(500) | 파일명 |
| file_size | int | 크기 (bytes) |
| mime_type | varchar(200) | MIME 타입 |
| category | varchar(100) | 카테고리 (자유 입력) |
| is_active | boolean | 활성 여부 |
| created_at, updated_at | timestamp | |

### 3-2. API

**Routes**: `apps/api-server/src/modules/store/store-library.routes.ts`
**Service**: `apps/api-server/src/modules/store/store-library.service.ts`

| Method | Endpoint | Guard | 설명 |
|--------|----------|-------|------|
| GET | `/library` | Auth + Store Owner | 매장 자료 목록 |
| POST | `/library` | Auth + Store Owner | 자료 등록 |
| PATCH | `/library/:id` | Auth + Store Owner | 자료 수정 |
| DELETE | `/library/:id` | Auth + Store Owner | 자료 삭제 (hard) |

### 3-3. Frontend

| 파일 | 경로 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryPage.tsx` | `/pharmacy/library` |
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryDetailPage.tsx` | `/pharmacy/library/:id` |
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryNewPage.tsx` | `/pharmacy/library/new` |
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryEditPage.tsx` | `/pharmacy/library/:id/edit` |

### 3-4. 특성

- 매장(organization) 단위 격리
- Commerce Object 아님 (Checkout 연결 금지)
- HUB/Signage 자동 노출 없음
- 카드 그리드 UI, 검색, 카테고리 필터링

---

## 4. 시스템 B: Neture Supplier Library (공급자 자료실)

### 4-1. 데이터 모델

**Entity**: `apps/api-server/src/modules/neture/entities/NetureSupplierLibraryItem.entity.ts`
**Table**: `neture_supplier_library_items`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| supplier_id | UUID FK | 공급자 격리 |
| title | varchar(200) | 자료 제목 |
| description | text | 설명 |
| file_url | text | 파일 URL (외부) |
| file_name | varchar(255) | 파일명 |
| file_size | bigint | 크기 |
| mime_type | varchar(100) | MIME 타입 |
| category | varchar(100) | 카테고리 |
| is_public | boolean | 공개/비공개 |
| created_at, updated_at | timestamp | |

### 4-2. API

**Routes**: `apps/api-server/src/modules/neture/neture-library.routes.ts`
**Service**: `apps/api-server/src/modules/neture/services/neture-library.service.ts`

| Method | Endpoint | Guard | 설명 |
|--------|----------|-------|------|
| GET | `/library/public` | 없음 | 공개 자료 목록 |
| GET | `/library` | Auth + Active Supplier | 내 자료 목록 |
| POST | `/library` | Auth + Active Supplier | 자료 등록 |
| PATCH | `/library/:id` | Auth + Active Supplier | 자료 수정 |
| DELETE | `/library/:id` | Auth + Active Supplier | 자료 삭제 |

### 4-3. 특성

- 공급자(supplier) 단위 격리
- `is_public` 플래그로 공개/비공개 전환
- 페이지네이션 (기본 20건, 최대 100건)
- 외부 URL 기반 (S3 업로드 없음)

---

## 5. 시스템 C: KPA Branch Docs (분회 자료실)

### 5-1. 데이터 모델

**Entity**: `apps/api-server/src/routes/kpa/entities/kpa-branch-doc.entity.ts`
**Table**: `kpa_branch_docs`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organization_id | UUID FK | 분회(조직) 격리 |
| title | varchar(300) | 자료 제목 |
| description | text | 설명 |
| category | varchar(50) | `general` / `regulation` / `form` / `guide` |
| file_url | varchar(500) | 파일 URL |
| file_name | varchar(200) | 파일명 |
| file_size | bigint | 크기 |
| is_public | boolean | 공개 여부 |
| download_count | int | 다운로드 횟수 |
| is_deleted | boolean | Soft delete |
| uploaded_by | UUID | 업로더 |
| created_at, updated_at | timestamp | |

### 5-2. API

**Controller**: `apps/api-server/src/routes/kpa/controllers/branch-admin-dashboard.controller.ts`

| Method | Endpoint | Guard | 설명 |
|--------|----------|-------|------|
| GET | `/branch-admin/docs` | Auth + Branch Admin | 분회 자료 목록 |
| POST | `/branch-admin/docs` | Auth + Branch Admin | 자료 등록 |
| PATCH | `/branch-admin/docs/:id` | Auth + Branch Admin | 자료 수정 |
| DELETE | `/branch-admin/docs/:id` | Auth + Branch Admin | 자료 삭제 (soft) |
| GET | `/branches/:branchId/docs` | Public | 공개 자료 조회 |

### 5-3. Frontend

| 파일 | 역할 |
|------|------|
| `services/web-kpa-society/src/pages/admin-branch/DocsPage.tsx` | 관리자 자료 관리 |
| `services/web-kpa-society/src/pages/branch/BranchDocsPage.tsx` | 공개 자료 열람 |

### 5-4. 특성

- 분회(organization) 단위 격리
- 카테고리: 일반/규정/서식/가이드
- 다운로드 추적 (`download_count`)
- Soft delete 패턴
- 감사 로깅 지원

---

## 6. 시스템 D: KPA 메인 자료실 — PLACEHOLDER

### 6-1. 현재 상태

**Backend**: `apps/api-server/src/routes/kpa/kpa.routes.ts` (line 724-748)

```typescript
// Resources Routes - /api/v1/kpa/resources/*
// Placeholder: Returns mock data until file management integration
const resourcesRouter = Router();
resourcesRouter.get('/', optionalAuth, (req, res) => {
  res.json({
    success: true,
    data: [],                    // ← 항상 빈 배열
    pagination: { page, limit, total: 0, totalPages: 0 },
    message: 'Resources API - Integration pending'
  });
});
```

**Frontend**: 페이지는 존재하나 데이터 없음

| 파일 | 라우트 | 설명 |
|------|--------|------|
| `services/web-kpa-society/src/pages/resources/ResourcesHomePage.tsx` | `/docs` | 콘텐츠 자산 보관·공유 공간 |
| `services/web-kpa-society/src/pages/resources/ResourcesListPage.tsx` | `/docs/list`, `/docs/forms` 등 | 카테고리별 목록 |
| `services/web-kpa-society/src/api/resources.ts` | — | API 클라이언트 |

**Type 정의**: `services/web-kpa-society/src/types/index.ts` (line 318-333)

```typescript
export interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  file?: Attachment;
  fileUrl?: string;
  fileType?: string;
  fileSize?: string;
  downloadCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6-2. 분석

- 프론트엔드 페이지 + 타입 + API 클라이언트 **모두 구현됨**
- 백엔드 API는 **Placeholder** — 빈 배열만 반환
- 테이블 미존재
- 카테고리 구조: `forms`(서식/양식), `guidelines`(가이드라인), `policies`(규정/정관)
- **대표님이 말하는 "카테고리 기반 자료실"의 가장 유력한 후보**

---

## 7. 시스템 E: Content Assets (CMS 미디어 읽기 전용)

### 7-1. 구조

**Routes**: `apps/api-server/src/routes/content/content-assets.routes.ts`

CMS의 `cms_media` 테이블을 Content Core 타입으로 변환하여 읽기 전용 제공.

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/content/assets` | 에셋 목록 (필터) |
| GET | `/content/assets/stats` | 통계 |
| GET | `/content/assets/:id` | 상세 |
| POST | `/content/assets/:id/copy` | 에셋 복사 (예외적 쓰기) |

### 7-2. 특성

- `cms_media` → Content Core 타입 매핑 (VIDEO, IMAGE, DOCUMENT, BLOCK)
- 자료실 기능이 아닌 **콘텐츠 에셋 조회** 용도
- 직접 INSERT/UPDATE/DELETE 불가

---

## 8. 시스템 F: KYC Documents (인증 서류)

**Entity**: `apps/api-server/src/entities/KycDocument.ts`
**Table**: `kyc_documents`

- 역할 신청 시 제출하는 인증 서류 (사업자등록증, 신분증 등)
- 검증 워크플로우: PENDING → VERIFIED / REJECTED
- **자료실과 성격 다름** — 인증/KYC 전용

---

## 9. 카테고리 구조 분석

| 시스템 | 카테고리 방식 | 카테고리 값 |
|--------|:------------:|------------|
| Store Library | varchar(100) 자유 입력 | 사용자 정의 |
| Neture Library | varchar(100) 자유 입력 | 사용자 정의 |
| KPA Branch Docs | varchar(50) 고정 | general, regulation, form, guide |
| KPA 메인 자료실 | 라우트 기반 | forms, guidelines, policies |

**별도 카테고리 테이블 없음** — 모든 시스템이 단순 varchar 필드 또는 라우트 분기 사용.

---

## 10. 파일 저장 방식

### 10-1. 현재 방식

| 시스템 | 저장 방식 |
|--------|----------|
| Store Library | `file_url` varchar — 외부 URL 등록 |
| Neture Library | `file_url` text — 외부 URL 등록 |
| KPA Branch Docs | `file_url` varchar — 외부 URL 등록 |
| CMS Media | GCS 업로드 (multer + Cloud Storage) |

### 10-2. 파일 업로드 인프라

**존재하지만 자료실과 미연결:**

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| Upload Middleware | `apps/api-server/src/middleware/upload.middleware.ts` | multer 기반, 파일 타입/크기 검증 |
| Media Upload Controller | `apps/api-server/src/controllers/media/mediaUploadController.ts` | CMS 미디어 업로드 |
| Image Storage Service | `apps/api-server/src/modules/neture/services/image-storage.service.ts` | GCS 연동 (상품 이미지용) |

**지원 파일 타입**: 이미지, 동영상, 오디오, PDF, Office 문서 (doc/xls/ppt)
**크기 제한**: 이미지 10MB, 동영상 100MB, 오디오 50MB, 문서 25MB

### 10-3. 결론

```
자료실 시스템 3개 → 모두 URL 등록 방식 (직접 업로드 없음)
파일 업로드 인프라 → 존재하지만 CMS/상품 이미지 전용
```

---

## 11. 서비스별 사용 현황

| 서비스 | 자료실 시스템 | 용도 |
|--------|:------------:|------|
| **KPA Society** | Branch Docs + 메인(Placeholder) + Store Library | 분회 문서, 약국 자료 |
| **Neture** | Supplier Library | 공급자 문서/파일 관리 |
| **GlycoPharm** | Store Library (공유) | 약국 자료 (KPA와 동일 테이블) |
| **K-Cosmetics** | Store Library (공유) | 매장 자료 |
| **GlucoseView** | 없음 | — |

---

## 12. CMS와의 관계

```
CMS (cms_contents, cms_media)
  = 콘텐츠 발행 시스템 (뉴스, 공지, 배너, 교육 자료)
  = 서비스별 serviceKey 기반 멀티테넌트

자료실 (store_library_items, neture_supplier_library_items, kpa_branch_docs)
  = 파일/문서 관리 시스템
  = 조직/공급자 단위 격리

Content Assets API
  = CMS 미디어의 읽기 전용 투영
  = 에셋 탐색/복사 용도
```

**관계: 완전 독립.** CMS는 발행(publish), 자료실은 보관(archive). 교차 참조 없음.

---

## 13. Operator 관리 여부

| 시스템 | 관리 주체 | Operator 관리? |
|--------|----------|:--------------:|
| Store Library | Store Owner (매장 대표) | **NO** — 매장 자체 관리 |
| Neture Library | Supplier (공급자) | **NO** — 공급자 자체 관리 |
| KPA Branch Docs | Branch Admin (분회장) | **NO** — 분회 자체 관리 |
| KPA 메인 자료실 | (미구현) | **미정** |
| CMS Media | Operator | **YES** — CMS 콘텐츠 관리 |

**현재 Operator Console에서 직접 관리하는 자료실은 없음.**

---

## 14. 향후 구조 정리 제안

### 14-1. 현재 상태 진단

```
문제 1: KPA 메인 자료실(/docs)이 Placeholder — 프론트는 있지만 백엔드 미구현
문제 2: 3개 자료실 시스템이 독립적 — 공통 패턴 없음
문제 3: 파일 업로드 없음 — 모든 자료실이 URL 등록 방식
문제 4: Operator 관리 도구 없음
```

### 14-2. 가능한 방향

**Option A: KPA 메인 자료실 백엔드 구현**
- 기존 `Resource` 타입에 맞는 테이블 + CRUD API 생성
- 기존 프론트엔드 페이지 활용
- 최소 변경으로 자료실 기능 완성

**Option B: 통합 Resource Library Core**
- `@o4o/resource-library-core` 패키지 신설
- 공통 Entity + Service + API 패턴
- Store Library / Neture Library / Branch Docs를 점진적 통합
- 카테고리 테이블 별도 생성

**Option C: CMS 확장**
- CMS Content에 `resource` 타입 추가
- 기존 CMS 인프라(업로드, 카테고리, 검색) 활용
- Content Assets API로 자연스럽게 연결

### 14-3. 권장

대표님 정의("카테고리 기반 자료 관리")에 가장 부합하는 것은 **Option A**.
KPA 메인 자료실의 백엔드만 구현하면 즉시 동작하는 자료실 완성.

---

## 15. 파일/테이블 인벤토리

### Backend

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts` | Store Library Entity |
| `apps/api-server/src/modules/store/store-library.routes.ts` | Store Library API |
| `apps/api-server/src/modules/store/store-library.service.ts` | Store Library Service |
| `apps/api-server/src/modules/neture/entities/NetureSupplierLibraryItem.entity.ts` | Neture Library Entity |
| `apps/api-server/src/modules/neture/neture-library.routes.ts` | Neture Library API |
| `apps/api-server/src/modules/neture/services/neture-library.service.ts` | Neture Library Service |
| `apps/api-server/src/routes/kpa/entities/kpa-branch-doc.entity.ts` | KPA Branch Docs Entity |
| `apps/api-server/src/routes/kpa/controllers/branch-admin-dashboard.controller.ts` | KPA Branch Docs API |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` (line 724-748) | KPA Resources **Placeholder** |
| `apps/api-server/src/routes/content/content-assets.routes.ts` | Content Assets (읽기 전용) |
| `apps/api-server/src/entities/KycDocument.ts` | KYC Documents Entity |
| `apps/api-server/src/middleware/upload.middleware.ts` | File Upload Middleware |
| `apps/api-server/src/controllers/media/mediaUploadController.ts` | CMS Media Upload |

### Frontend (KPA Society)

| 파일 | 라우트 |
|------|--------|
| `pages/resources/ResourcesHomePage.tsx` | `/docs` |
| `pages/resources/ResourcesListPage.tsx` | `/docs/list`, `/docs/forms` 등 |
| `pages/pharmacy/StoreLibraryPage.tsx` | `/pharmacy/library` |
| `pages/pharmacy/StoreLibraryDetailPage.tsx` | `/pharmacy/library/:id` |
| `pages/pharmacy/StoreLibraryNewPage.tsx` | `/pharmacy/library/new` |
| `pages/pharmacy/StoreLibraryEditPage.tsx` | `/pharmacy/library/:id/edit` |
| `pages/admin-branch/DocsPage.tsx` | 분회 관리자 자료 관리 |
| `pages/branch/BranchDocsPage.tsx` | 분회 공개 자료 열람 |
| `api/resources.ts` | KPA Resources API 클라이언트 |
| `types/index.ts` (line 318-333) | `Resource` 타입 정의 |

### Database Tables

| 테이블 | Migration |
|--------|-----------|
| `store_library_items` | `20260304100000-CreateStoreLibraryItems.ts` |
| `neture_supplier_library_items` | (Neture migration) |
| `kpa_branch_docs` | (KPA migration) |
| `kyc_documents` | (Auth migration) |

---

*Audit Date: 2026-03-11*
*Method: Code path analysis (READ-ONLY)*
*Status: Complete*
