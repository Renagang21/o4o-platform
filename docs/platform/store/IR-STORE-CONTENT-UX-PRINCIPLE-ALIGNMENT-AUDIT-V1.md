# IR-STORE-CONTENT-UX-PRINCIPLE-ALIGNMENT-AUDIT-V1

> **문서 유형:** Investigation Report (현 상태 조사 및 평가)  
> **기준 문서:** `docs/rules/STORE-CONTENT-DIRECT-SOURCE-UX-PRINCIPLE-V1.md`  
> **작성일:** 2026-04-20  
> **상태:** 완료  
> **코드 수정:** 없음 (조사 전용)

---

## 1. 조사 개요

매장 콘텐츠 작업 5개 기능이 "공용 자료 직접 불러오기 기반 UX 원칙"에 얼마나 부합하는지를 코드 수준에서 조사하였다.

**평가 기준:**
1. 작업 시작 전 "내 매장으로 가져오기"가 필수 단계인지
2. 작업 화면에서 공용 자료를 직접 불러올 수 있는지
3. 저장이 선행 조건인지, 결과 단계의 선택인지

---

## 2. 기능별 상세 분석

---

### 2-1. QR-code 생성

#### 현재 UX 흐름
```
Step 1. POST /pharmacy/qr → QR 생성 (제목, 설명, 랜딩 타입 입력)
Step 2. 랜딩 타입 설정: product | promotion | page | link
Step 3. 선택적으로 StoreLibraryItem 연결 (libraryItemId)
Step 4. GET /pharmacy/qr/:id/image → QR 이미지 다운로드
```

#### 관련 Route / 컴포넌트
- **Backend:** `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`
- **Services:** `apps/api-server/src/services/qr-print.service.ts`, `qr-flyer.service.ts`
- **Frontend Route:** 별도 Admin 화면 없음 (API-only)

#### 공용 자료 접근 방식
- QR 코드 자체는 독립 생성 가능 (공용 자료 의존 없음)
- 제품 정보 연결 시 `StoreLibraryItem` (매장 내부 자료) 참조
- `StoreLibraryItem`은 공용 자료실이 아닌 **매장 전용 자료**

#### 데이터 흐름
- QR 생성: 복사 없음, 직접 생성 (참조 기반)
- 제품 연결: 매장 내 `StoreLibraryItem` 참조 (참조 기반)
- 스캔 이벤트: `StoreQrScanEvent` 별도 기록

#### 저장 시점
- 즉시 저장 (POST /qr 호출 시)
- 이미지 다운로드는 저장 없음 (on-demand 생성)

#### 문제 지점
- QR 단독 생성은 원칙 적합
- 그러나 "제품 정보를 담은 QR"을 생성하려면 `StoreLibraryItem`이 먼저 존재해야 함
- `StoreLibraryItem`에 공용 공급자 자료를 직접 참조하는 경로가 없음 (매장이 직접 파일 업로드 또는 수동 입력)
- 즉, **공급자 제품 정보 → QR 연결**의 직접 경로가 없고, 매장이 중간 복사 후 사용

#### 원칙 대비 평가
| 기준 | 평가 |
|------|------|
| 가져오기 선행 필수? | 제품 연결 시 StoreLibraryItem 선행 필요 (조건부 필수) |
| 직접 불러오기 가능? | QR 자체는 가능, 제품 정보 직접 연결 불가 |
| 저장 선행 조건? | 아니오 (결과 저장) |

**원칙 적합성: 중간**

---

### 2-2. POP 제작

#### 현재 UX 흐름
```
Step 1. StoreLibraryItem 사전 등록 (필수 선행 조건)
Step 2. POST /pharmacy/pop/generate → libraryItemIds[] 배열 전달
Step 3. API가 StoreLibraryItem에서 title, description, fileUrl 조회
Step 4. PDF 생성 후 binary 반환 (저장 없음)
Step 5. 사용자가 다운로드/인쇄
```

#### 관련 Route / 컴포넌트
- **Backend:** `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts`
- **Service:** `apps/api-server/src/services/pop-generator.service.ts`
- **Entity:** `StoreLibraryItem` (organization 범위)
- **Frontend Route:** 별도 Admin 화면 없음 (API-only)

#### 공용 자료 접근 방식
- **직접 공용 자료 접근 없음**
- POP 생성에 필요한 모든 자료는 `StoreLibraryItem` (매장 내부 자료)에서만 조회
- 공급자 자료(`neture_supplier_library_items`)를 POP에서 직접 참조하는 API 없음

#### 데이터 흐름
- `StoreLibraryItem` → POP PDF (복사 기반이 아닌 조회 기반이나, 공용 자료 직접 접근 불가)
- 생성된 PDF는 저장되지 않음 (on-demand)

#### 저장 시점
- **선행 저장 강제:** `StoreLibraryItem`이 POST /library로 먼저 저장되어야 POP 생성 가능
- POP 결과물(PDF)은 저장 없음

#### 문제 지점
- `libraryItemIds`는 **필수(required)** 파라미터이며, 이 값이 없으면 POP 생성 불가
- 공급자가 공개한 제품 자료(`neture_supplier_library_items.is_public = true`)가 있어도 POP에서 직접 참조 불가
- 매장 담당자가 직접 `StoreLibraryItem`에 파일 업로드 + 정보 입력 후 POP 생성 → **중간 복사 구조 확인**
- Neture 공급자 자료실(public)과 Store Library 간의 자동 연결 경로 없음

#### 원칙 대비 평가
| 기준 | 평가 |
|------|------|
| 가져오기 선행 필수? | **예** — StoreLibraryItem 사전 등록 강제 |
| 직접 불러오기 가능? | **아니오** — 공급자 자료 직접 참조 경로 없음 |
| 저장 선행 조건? | **예** — libraryItem 선행 저장 필수 |

**원칙 적합성: 낮음**

---

### 2-3. 디지털 사이니지

#### 현재 UX 흐름
```
[HUB 콘텐츠 → 내 대시보드로 복사]
Step 1. /admin/digital-signage/v2/hq → HQ 콘텐츠 탐색
Step 2. POST /api/v1/dashboard/assets/copy → signage_playlist / signage_media 복사
         (sourceType, sourceId, targetDashboardId 필수)
Step 3. 복사된 미디어/플레이리스트가 내 라이브러리에 등장

[플레이리스트 편성]
Step 4. POST /api/signage/:serviceKey/playlists → 빈 플레이리스트 생성 (선행 저장)
Step 5. /admin/digital-signage/v2/playlists/:id → PlaylistEditor 진입
Step 6. POST /playlists/:id/items → 아이템 추가 (건별 즉시 저장)
Step 7. PATCH /playlists/:id → 메타데이터 저장
Step 8. 스케줄 등록: POST /schedules → 채널에 플레이리스트 배정
```

#### 관련 Route / 컴포넌트
- **Frontend:** `/admin/digital-signage/v2/*`
- **주요 컴포넌트:** `PlaylistEditor.tsx`, `ChannelEditor.tsx`, `HQContentManager.tsx`, `MediaLibrary.tsx`
- **Backend Copy API:** `apps/api-server/src/routes/dashboard/dashboard-assets.copy-handlers.ts`
- **Copy 지원 타입:** `content | signage_media | signage_playlist | hub_content`

#### 공용 자료 접근 방식
- **HUB 콘텐츠:** `asset-snapshot` 모듈을 통해 복사 (`o4o_asset_snapshots` 테이블에 스냅샷 저장)
- **미디어:** `owner_type = 'platform'` 미디어는 조회 가능하나, 플레이리스트 편성 전 복사 흐름이 기본 UI
- **플랫폼 템플릿:** 시스템 전체 공유, 직접 참조 가능

#### 데이터 흐름
- **복사 기반:** HUB 플레이리스트/미디어를 organization으로 복사
- 복사 후 `organization_id`가 부여된 독립 자산이 됨
- 원본 업데이트 시 복사본에 자동 반영 없음

#### 저장 시점
- **선행 저장 강제 (2단계):**
  1. HUB 자료 복사 (POST /copy)
  2. 빈 플레이리스트 생성 (POST /playlists)
- 이후 편집 시 아이템별 즉시 저장

#### 문제 지점
- `POST /api/v1/dashboard/assets/copy` — 명시적 "내 대시보드로 복사" API가 존재하며 이것이 기본 흐름
- 동일 조직이 같은 원본을 중복 복사 시 에러 처리 존재 (`중복 복사` 방어) → 복사 구조가 의도적으로 설계됨
- HUB 미디어를 플레이리스트에 직접 편성하는 경로(복사 없이 참조만)가 현재 없음
- 플레이리스트 편집 전에 **빈 플레이리스트를 먼저 저장**해야 하는 pre-save 구조

#### 원칙 대비 평가
| 기준 | 평가 |
|------|------|
| 가져오기 선행 필수? | **예** — `POST /copy` 명시적 복사 단계 존재 |
| 직접 불러오기 가능? | **부분** — 플랫폼 템플릿은 직접 참조, HUB 미디어/플레이리스트는 복사 필수 |
| 저장 선행 조건? | **예** — 빈 플레이리스트 pre-save 구조 |

**원칙 적합성: 낮음**

---

### 2-4. 블로그 글 작성

#### 현재 UX 흐름
```
Step 1. /posts/new 또는 /forum/posts/new 진입
Step 2. 제목, 본문(에디터), 카테고리 선택
Step 3. 저장 버튼 → POST /forum/posts 또는 POST /posts
Step 4. 상태: draft 또는 published로 즉시 저장
```

#### 관련 Route / 컴포넌트
- **Frontend:** `/posts`, `/forum/posts/new`, `/forum/posts/:id/edit`, `/editor/posts/new`, `/editor/posts/:id`
- **주요 컴포넌트:** `Posts.tsx`, `ForumPostForm.tsx`, `StandaloneEditor.tsx`
- **Backend:** `POST /forum/posts`, `GET/PUT /forum/posts/:id`

#### 공용 자료 접근 방식
- 카테고리: 공용 목록에서 직접 선택
- 미디어: 에디터에서 직접 삽입 (embed/link)
- 공용 자료 참조 기능: 에디터 블록을 통해 직접 삽입 가능

#### 데이터 흐름
- **참조 기반:** 조직별 독립 생성, 별도 공용 자료 복사 없음
- 글 자체가 결과물, 초안/발행 상태 관리

#### 저장 시점
- 작성 후 "저장" 버튼 클릭 시 저장 (결과 저장)
- 선행 저장 없음

#### 문제 지점
- **없음** — 직접 작성 후 저장하는 구조로 원칙에 부합
- 공용 제품 정보·공급자 자료를 글 에디터에 직접 삽입하는 전용 블록이 없음 (개선 여지이나 구조 문제는 아님)

#### 원칙 대비 평가
| 기준 | 평가 |
|------|------|
| 가져오기 선행 필수? | **아니오** |
| 직접 불러오기 가능? | **예** |
| 저장 선행 조건? | **아니오** (결과 단계 저장) |

**원칙 적합성: 높음**

---

### 2-5. 타블렛/전자상거래용 상품 정보

#### 현재 UX 흐름
```
[상품 진열 설정 (사전 단계)]
Step 1. supplier_product_offers에 상품 존재 (공급자 등록)
Step 2. organization_product_listings에 매장 진열 등록 (링크 생성)
Step 3. POST /organization-product-channels → TABLET 채널에 상품 가시성 링크
Step 4. organization_channels.status = 'APPROVED' 설정

[타블렛 화면 실행]
Step 5. GET /stores/:slug/tablet/products → 진열 상품 목록 (supplier 원본 데이터 참조)
Step 6. 고객이 상품 탐색
Step 7. POST /stores/:slug/tablet/requests → 관심 요청 제출
Step 8. PATCH /stores/:slug/tablet/staff/requests/:id → 스태프 처리
```

#### 관련 Route / 컴포넌트
- **Frontend:** 전용 Admin 화면 없음 (공개 URL 기반 태블릿 화면)
- **Public API:** `GET /stores/:slug/tablet/products`, `POST /tablet/requests`
- **Staff API:** `GET/PATCH /stores/:slug/tablet/staff/requests`
- **Backend:** `apps/api-server/src/routes/o4o-store/controllers/tablet.controller.ts`

#### 공용 자료 접근 방식
- **참조 기반:** 태블릿 상품 조회는 `supplier_product_offers` → `product_masters`를 직접 JOIN
- 상품 데이터는 복사되지 않고 공급자 원본을 참조
- `organization_product_channels`는 링크(가시성 설정)이며 복사본이 아님

#### 데이터 흐름
- **참조 기반 (원칙 부합):** 공급자 상품 원본을 JOIN으로 직접 조회
- 단, 채널 가시성 링크(`organization_product_channels`) 생성은 선행 작업

#### 저장 시점
- 채널 링크 생성 (POST /organization-product-channels): 선행 저장 필요
- 요청 처리 (POST /tablet/requests): 결과 저장

#### 문제 지점
- 태블릿 화면 자체는 공급자 원본 데이터 직접 참조 → **원칙 부합**
- 그러나 상품을 태블릿 채널에 노출하려면 `organization_product_listings` + `organization_product_channels` 2단계 선행 설정이 필요
- 이 설정 화면(Admin)이 명확히 존재하지 않고, 설정 방법이 API-only로 되어 있음
- `StoreLocalProduct` (매장 독자 상품)는 supplier와 완전히 분리된 별도 엔티티 — 이쪽은 복사 없이 매장 자체 생성

#### 원칙 대비 평가
| 기준 | 평가 |
|------|------|
| 가져오기 선행 필수? | **부분** — 채널 링크 설정 필요 (복사 아닌 링크) |
| 직접 불러오기 가능? | **예** — 태블릿 화면은 원본 데이터 직접 참조 |
| 저장 선행 조건? | **부분** — 채널 설정은 선행 필요하나, 상품 데이터 자체는 복사 없음 |

**원칙 적합성: 중간**

---

## 3. 기능 비교 요약 표

| 기능 | 현재 구조 | 공용 자료 접근 방식 | 저장 방식 | 원칙 적합성 | 판단 |
|------|-----------|-------------------|-----------|------------|------|
| **QR-code** | 직접 생성 (API-only) | 매장 LibraryItem 참조 (공용 자료 직접 접근 없음) | 결과 저장 | **중간** | 부분 변경 |
| **POP** | StoreLibraryItem 필수 선행 | 공급자 자료 직접 참조 불가, 매장 Library만 사용 | 선행 저장 강제 | **낮음** | 구조 변경 |
| **디지털 사이니지** | HUB → Copy → 편성 | `POST /copy` 명시적 복사 단계 | 선행 저장 2단계 | **낮음** | 구조 변경 |
| **블로그 글** | 직접 작성 후 저장 | 에디터 직접 삽입 | 결과 저장 | **높음** | 유지 |
| **타블렛/상품 정보** | 채널 링크 + 원본 참조 | supplier 원본 직접 참조 | 링크 선행 + 결과 저장 | **중간** | 부분 변경 |

---

## 4. 핵심 문제 패턴

### 패턴 A — StoreLibraryItem 선행 복사 강제 구조 (POP)
POP 제작은 `StoreLibraryItem`이 반드시 선행 존재해야 한다.  
공급자가 공개한 제품 자료(`neture_supplier_library_items`)를 POP에서 직접 참조하는 경로가 없다.  
매장 담당자가 공급자 자료를 직접 파일 업로드 또는 수동 입력으로 `StoreLibraryItem`에 등록한 후에야 POP 생성 가능 → **중간 복사 구조**

### 패턴 B — 명시적 "내 대시보드로 복사" API 중심 설계 (디지털 사이니지)
`POST /api/v1/dashboard/assets/copy` API가 HUB → 매장 흐름의 기본 경로로 설계되어 있다.  
HUB 미디어/플레이리스트를 복사 없이 직접 참조하여 편성하는 경로가 없다.  
원본 업데이트 시 복사본에 자동 반영되지 않는다.

### 패턴 C — 플레이리스트 pre-save 구조 (디지털 사이니지)
플레이리스트 편집을 시작하기 전에 빈 플레이리스트를 먼저 POST로 생성해야 한다.  
편집 중 각 아이템 추가가 건별로 즉시 저장된다.  
"작업 완료 후 저장"이 아닌 "저장 후 작업"의 흐름.

### 패턴 D — QR/POP 공용 자료 연결 경로 부재
공급자 제품 정보를 QR 랜딩 또는 POP에 직접 연결하는 단일 경로가 없다.  
현재는: 공급자 자료 탐색 → 수동 다운로드 → StoreLibraryItem 등록 → QR/POP 생성.

---

## 5. 변경 필요 기능 목록

### 5-1. 구조 변경 대상 (흐름 재설계 필요)

| 기능 | 핵심 변경 방향 |
|------|--------------|
| **POP 제작** | 공급자 자료(`neture_supplier_library_items`)를 POP 생성 시 직접 참조할 수 있도록 API 확장. StoreLibraryItem 선행 없이 POP 생성 가능하도록 변경. |
| **디지털 사이니지** | HUB 미디어/콘텐츠를 복사 없이 플레이리스트에 직접 편성할 수 있는 "참조 아이템" 타입 추가. `POST /copy`는 "내 자산으로 저장" 선택지로 유지. |

### 5-2. 부분 변경 대상 (UX 개선 수준)

| 기능 | 핵심 변경 방향 |
|------|--------------|
| **QR-code** | 공급자 제품 정보를 QR 랜딩에 직접 연결하는 경로 추가. StoreLibraryItem 없이도 제품 직접 연결 가능하도록 선택지 확장. |
| **타블렛/상품 정보** | 채널 링크 설정을 위한 Admin 화면(Operator UI) 구현. API-only 설정을 UI 기반으로 노출하여 접근성 개선. |

### 5-3. 유지 대상

| 기능 | 이유 |
|------|------|
| **블로그 글 작성** | 직접 작성 → 결과 저장 흐름으로 원칙에 완전 부합. 공급자 자료 삽입 블록 추가는 선택적 개선 사항으로 별도 WO에서 검토. |

---

## 6. 후속 작업 권고

이 IR을 기반으로 다음 순서로 WO를 구성하는 것을 권고한다.

1. **WO-STORE-POP-DIRECT-SOURCE-V1** — POP 제작 구조 변경 (공급자 자료 직접 참조)
2. **WO-SIGNAGE-DIRECT-REFERENCE-ITEM-V1** — 사이니지 플레이리스트 직접 참조 아이템 타입 추가
3. **WO-STORE-QR-PRODUCT-DIRECT-LINK-V1** — QR 랜딩에 공급자 제품 직접 연결
4. **WO-TABLET-OPERATOR-UI-V1** — 타블렛 채널 설정 Operator UI 구현

---

*Version: 1.0 | 코드 수정 없음, 조사 전용*  
*기준 문서: `docs/rules/STORE-CONTENT-DIRECT-SOURCE-UX-PRINCIPLE-V1.md`*
